// Pyodide worker 的模块级单例管理器。
//
// 为什么是模块级单例:Pyodide 运行时约 10MB。若每个 CodeRunner 各自 new Worker(),
// 一篇有多个代码块的教程就会重复下载多份运行时。这里全站共享同一个 worker。
//
// 职责:
// - 懒加载唯一 worker,广播 status 给所有订阅者(供 UI 显示「加载中/就绪」)。
// - 按 run id 路由结果与流式输出(stdout/stderr)。
// - cancel():用 terminate + 重建打断死循环(如用户写了 while True)。

export type PyodideStatus = "idle" | "loading" | "ready" | "error";

export interface RunResult {
  /** Python 表达式的返回值(若有) */
  result: string | null;
  /** stdout + stderr 合并的输出文本 */
  output: string;
  /** 执行报错信息(若有);被取消时为「已停止」 */
  error: string | null;
  /** matplotlib 图形,base64 PNG(无图时为空数组) */
  images: string[];
}

interface PendingRun {
  resolve: (r: RunResult) => void;
  output: string;
  /** 流式输出回调,供 UI 实时显示 */
  onOutput?: (chunk: string) => void;
}

let worker: Worker | null = null;
let status: PyodideStatus = "idle";
let idCounter = 0;
const pending = new Map<string, PendingRun>();
const statusListeners = new Set<(s: PyodideStatus) => void>();

function setStatus(s: PyodideStatus) {
  status = s;
  statusListeners.forEach((fn) => fn(s));
}

function handleMessage(event: MessageEvent) {
  const data = event.data;
  switch (data.type) {
    case "ready":
      setStatus("ready");
      break;
    case "init-error":
      setStatus("error");
      break;
    case "stdout":
    case "stderr": {
      // worker 现在带上了执行 id,精确归属到对应的 run(不再「归到最近一次」)。
      const run = data.id != null ? pending.get(data.id) : undefined;
      if (run) {
        run.output += data.text + "\n";
        run.onOutput?.(data.text + "\n");
      }
      break;
    }
    case "result": {
      const run = pending.get(data.id);
      if (run) {
        run.resolve({
          result: data.result ?? null,
          output: run.output,
          error: data.error ?? null,
          images: Array.isArray(data.images) ? data.images : [],
        });
        pending.delete(data.id);
      }
      break;
    }
  }
}

function ensureWorker(): Worker {
  if (worker) return worker;
  // process.env.NEXT_PUBLIC_BASE_PATH 在构建期内联;部署在子路径
  // (GitHub Pages 项目站点)时 worker URL 也要带上 basePath
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  worker = new Worker(`${base}/pyodide-worker.js`);
  worker.onmessage = handleMessage;
  return worker;
}

/** 触发运行时加载(可在用户聚焦编辑器时预热)。重复调用安全。 */
export function load() {
  if (status !== "idle") return;
  setStatus("loading");
  ensureWorker().postMessage({ type: "init" });
}

/** 订阅 status 变化,返回取消订阅函数。 */
export function subscribeStatus(fn: (s: PyodideStatus) => void): () => void {
  statusListeners.add(fn);
  fn(status); // 立即同步当前值
  return () => statusListeners.delete(fn);
}

export function getStatus(): PyodideStatus {
  return status;
}

/** 执行一段 Python 代码。onOutput 用于流式显示输出。返回 { id, promise }。 */
export function run(
  code: string,
  packages?: string[],
  onOutput?: (chunk: string) => void
): { id: string; promise: Promise<RunResult> } {
  const w = ensureWorker();
  if (status === "idle") {
    setStatus("loading");
    w.postMessage({ type: "init" });
  }
  const id = String(idCounter++);
  const promise = new Promise<RunResult>((resolve) => {
    pending.set(id, { resolve, output: "", onOutput });
    w.postMessage({ type: "run", id, code, packages });
  });
  return { id, promise };
}

/**
 * 中断执行:Pyodide 在 worker 里同步跑 Python,死循环无法靠消息打断,
 * 只能 terminate 整个 worker 再重建。所有在途运行以「已停止」结束。
 */
export function cancel() {
  if (!worker) return;
  worker.terminate();
  worker = null;
  // 把所有在途请求标记为已停止
  pending.forEach((run) => {
    run.resolve({ result: null, output: run.output, error: "⏹ 已停止执行", images: [] });
  });
  pending.clear();
  // 回到 idle:下次 run/load 会重建 worker 并重新下载运行时
  setStatus("idle");
}
