// Pyodide 执行 Worker —— 在独立线程加载 CPython(WASM),不阻塞 UI。
// 通过 postMessage 与主线程通信。每条执行请求带 id,结果与流式输出都按 id 回传。
//
// 关键设计:
// - 串行队列:Pyodide 单解释器无法真正并发,多个 run 请求排队依次执行。
// - stdout/stderr 带 currentRunId:把输出精确归属到当前正在执行的那次运行,
//   避免并发点击时输出串台(修复了主线程「归到最近一次」的近似做法)。

const PYODIDE_VERSION = "0.27.2";
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

importScripts(`${INDEX_URL}pyodide.js`);

let pyodideReadyPromise = null;
let currentRunId = null; // 正在执行的运行 id,用于给 stdout/stderr 打标
const queue = []; // 待执行队列:{ id, code, packages }
let draining = false;

async function initPyodide() {
  const pyodide = await loadPyodide({ indexURL: INDEX_URL });

  // 把 Python 的 stdout / stderr 重定向回主线程,带上当前运行 id 以精确路由。
  pyodide.setStdout({
    batched: (text) =>
      self.postMessage({ type: "stdout", id: currentRunId, text }),
  });
  pyodide.setStderr({
    batched: (text) =>
      self.postMessage({ type: "stderr", id: currentRunId, text }),
  });

  // Worker 里没有 document/canvas,matplotlib 默认后端会报错。
  // 强制 AGG(离屏渲染)后端:plt.show() 变成无害的空操作,图形仍可被 savefig 捕获。
  // setdefault 不影响未用 matplotlib 的代码(此时该环境变量从不被读取)。
  await pyodide.runPythonAsync(
    `import os\nos.environ.setdefault("MPLBACKEND", "AGG")`
  );

  return pyodide;
}

// 用户代码跑完后执行:若用过 matplotlib,把所有打开的图形导出为 base64 PNG。
// 仅当 matplotlib 已被 import 时才有开销(否则只查一次 sys.modules)。
const CAPTURE_FIGURES = `
import sys as _sys, json as _json
if "matplotlib.pyplot" in _sys.modules:
    import matplotlib.pyplot as _plt
    import io as _io, base64 as _b64
    _imgs = []
    for _n in _plt.get_fignums():
        _buf = _io.BytesIO()
        _plt.figure(_n).savefig(_buf, format="png", bbox_inches="tight", dpi=96)
        _imgs.append(_b64.b64encode(_buf.getvalue()).decode())
    _plt.close("all")
    _out = _json.dumps(_imgs)
else:
    _out = "[]"
_out
`;

// 依次执行队列里的请求,保证串行,避免输出交错。
async function drainQueue() {
  if (draining) return;
  draining = true;

  let pyodide;
  try {
    pyodide = await pyodideReadyPromise;
  } catch (err) {
    // 初始化失败:把队列里所有请求都以错误结束。
    while (queue.length) {
      const { id } = queue.shift();
      self.postMessage({ type: "result", id, error: `Pyodide 初始化失败: ${err}` });
    }
    draining = false;
    return;
  }

  while (queue.length) {
    const { id, code, packages } = queue.shift();
    currentRunId = id;
    try {
      // 自动安装代码里 import 的、可由 loadPackagesFromImports 解析的包。
      await pyodide.loadPackagesFromImports(code);

      // 显式声明的额外包(如教程指定 scikit-learn)。
      if (packages && packages.length) {
        await pyodide.loadPackage(packages);
      }

      const result = await pyodide.runPythonAsync(code);

      // 捕获 matplotlib 图形(若有)。失败不影响正常结果。
      let images = [];
      try {
        const imgsJson = await pyodide.runPythonAsync(CAPTURE_FIGURES);
        images = JSON.parse(imgsJson || "[]");
      } catch {
        images = [];
      }

      self.postMessage({
        type: "result",
        id,
        result: result === undefined ? null : String(result),
        images,
      });
    } catch (err) {
      self.postMessage({ type: "result", id, error: String(err) });
    } finally {
      currentRunId = null;
    }
  }

  draining = false;
}

self.onmessage = async (event) => {
  const { type, id, code, packages } = event.data;

  if (type === "init") {
    if (!pyodideReadyPromise) pyodideReadyPromise = initPyodide();
    try {
      await pyodideReadyPromise;
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "init-error", error: String(err) });
    }
    return;
  }

  if (type === "run") {
    if (!pyodideReadyPromise) pyodideReadyPromise = initPyodide();
    queue.push({ id, code, packages });
    drainQueue();
  }
};
