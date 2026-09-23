"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

const W = 440;
const H = 260;
const PAD = 40;

// 真实概率 p(正面),用户可调。用「累计翻硬币」演示大数定律:
// 频率(正面次数 / 总次数)随样本增多收敛到 p。
// 注意:随机只在用户点击时发生,渲染期不调用 Math.random(),避免 SSR/水合不一致。

const sx = (n: number, total: number) => PAD + (n / total) * (W - 2 * PAD);
const sy = (f: number) => H - PAD - f * (H - 2 * PAD); // 频率 0..1

export default function ProbabilityExplorer() {
  const [p, setP] = useState(0.5);
  // 累计的频率轨迹:每个元素是「第 i 次后的正面频率」
  const [trace, setTrace] = useState<number[]>([]);
  const [heads, setHeads] = useState(0);

  const total = trace.length;
  const freq = total > 0 ? heads / total : 0;

  // 追加 n 次翻硬币(仅在点击时执行随机)
  const flip = (n: number) => {
    let h = heads;
    const next = trace.slice();
    for (let i = 0; i < n; i++) {
      if (Math.random() < p) h++;
      next.push(h / (total + i + 1));
    }
    setHeads(h);
    setTrace(next);
  };

  const reset = () => {
    setTrace([]);
    setHeads(0);
  };

  const path = useMemo(() => {
    if (trace.length === 0) return "";
    const cap = Math.max(trace.length, 50);
    return (
      "M" +
      trace
        .map((f, i) => `${sx(i + 1, cap)},${sy(f)}`)
        .join(" L")
    );
  }, [trace]);

  const cap = Math.max(trace.length, 50);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[440px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          {/* 坐标轴 */}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--chart-axis)" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--chart-axis)" />
          {/* 真实概率 p 的水平参考线 */}
          <line x1={PAD} y1={sy(p)} x2={W - PAD} y2={sy(p)} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5} />
          <text x={W - PAD} y={sy(p) - 5} fontSize={10} textAnchor="end" fill="#f59e0b">真实概率 p={p.toFixed(2)}</text>
          {/* y 刻度 */}
          <text x={PAD - 6} y={sy(1) + 4} fontSize={10} textAnchor="end" fill="var(--chart-muted)">1</text>
          <text x={PAD - 6} y={sy(0.5) + 4} fontSize={10} textAnchor="end" fill="var(--chart-muted)">0.5</text>
          <text x={PAD - 6} y={sy(0) + 4} fontSize={10} textAnchor="end" fill="var(--chart-muted)">0</text>
          <text x={W / 2} y={H - 10} fontSize={11} textAnchor="middle" fill="var(--chart-muted)">翻硬币次数 →</text>

          {/* 频率轨迹 */}
          {path && <path d={path} fill="none" stroke="#059669" strokeWidth={2} />}
          {total > 0 && <circle cx={sx(total, cap)} cy={sy(freq)} r={4} fill="#059669" />}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="真实正面概率 p" value={p} min={0.05} max={0.95} step={0.05} onChange={(v) => { setP(v); reset(); }} decimals={2} />
          <div className="flex gap-2">
            <button onClick={() => flip(1)} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500">+1 次</button>
            <button onClick={() => flip(20)} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500">+20 次</button>
            <button onClick={() => flip(200)} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500">+200 次</button>
            <button onClick={reset} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">重置</button>
          </div>
          <div className="rounded-lg bg-chart-surface p-3 text-center text-sm shadow-sm">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">已翻 {total} 次 · 正面 {heads} 次</div>
            <div className="font-mono text-2xl font-bold text-emerald-700">{total > 0 ? freq.toFixed(3) : "—"}</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              当前频率{total > 0 && Math.abs(freq - p) < 0.03 ? " —— 已很接近 p!" : ""}
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            <span className="font-semibold text-emerald-600">大数定律</span>:次数越多,正面频率(绿线)越向真实概率 p(橙虚线)靠拢。少量样本时会剧烈抖动。
          </p>
        </div>
      </div>
    </div>
  );
}
