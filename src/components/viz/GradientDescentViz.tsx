"use client";

import { useState, useRef, useEffect } from "react";
import Slider from "./Slider";

// 损失函数 L(w) = (w - 3)^2 + 1,最小值在 w = 3。
const loss = (w: number) => (w - 3) ** 2 + 1;
const grad = (w: number) => 2 * (w - 3);

const W = 440;
const H = 300;
const PAD = 40;
const W_MIN = -2;
const W_MAX = 8;
const L_MAX = 26;

const sx = (w: number) => PAD + ((w - W_MIN) / (W_MAX - W_MIN)) * (W - 2 * PAD);
const sy = (l: number) => H - PAD - (l / L_MAX) * (H - 2 * PAD);

// 预生成损失曲线路径
const CURVE = (() => {
  const pts: string[] = [];
  for (let w = W_MIN; w <= W_MAX; w += 0.1) {
    pts.push(`${sx(w)},${sy(Math.min(loss(w), L_MAX))}`);
  }
  return "M" + pts.join(" L");
})();

/** 梯度下降动画:从起点逐步走向谷底,学习率可调(过大时发散)。 */
export default function GradientDescentViz() {
  const [lr, setLr] = useState(0.1);
  const [start, setStart] = useState(7);
  const [w, setW] = useState(7);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = () => {
    stop();
    setW(start);
    setStep(0);
  };

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
  };

  const play = () => {
    if (running) return stop();
    setRunning(true);
    timer.current = setInterval(() => {
      setW((cur) => {
        const next = cur - lr * grad(cur);
        // 发散保护
        if (Math.abs(next) > 1e4) return cur;
        return next;
      });
      setStep((s) => s + 1);
    }, 400);
  };

  // 卸载时清理定时器
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const diverging = Math.abs(w - 3) > Math.abs(start - 3) + 0.5;
  const converged = Math.abs(grad(w)) < 0.05;
  const clampedL = Math.min(loss(w), L_MAX);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[440px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          {/* 损失曲线 */}
          <path d={CURVE} fill="none" stroke="#a1a1aa" strokeWidth={2} />
          {/* 最小值参考线 */}
          <line x1={sx(3)} y1={PAD} x2={sx(3)} y2={H - PAD} stroke="#34d399" strokeDasharray="4 3" />
          <text x={sx(3) + 4} y={PAD + 12} fontSize={11} fill="#059669">最优 w=3</text>

          {/* 当前点 */}
          <circle cx={sx(w)} cy={sy(clampedL)} r={7} fill="#ef4444" />
          {/* 梯度方向箭头 */}
          <line
            x1={sx(w)}
            y1={sy(clampedL)}
            x2={sx(w - Math.sign(grad(w)) * 0.8)}
            y2={sy(clampedL)}
            stroke="#ef4444"
            strokeWidth={2}
            markerEnd="url(#arrow)"
          />
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
            </marker>
          </defs>
        </svg>

        <div className="flex flex-col justify-center gap-4">
          <Slider label="学习率 η" value={lr} min={0.01} max={1.1} step={0.01} onChange={(v) => { reset(); setLr(v); }} decimals={2} />
          <Slider label="起点 w₀" value={start} min={-1} max={7.5} step={0.5} onChange={(v) => { stop(); setStart(v); setW(v); setStep(0); }} decimals={1} />

          <div className="flex gap-2">
            <button onClick={play} className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">
              {running ? "暂停" : "▶ 开始下降"}
            </button>
            <button onClick={reset} className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100">
              重置
            </button>
          </div>

          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">迭代步数</span><span className="font-mono">{step}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">当前 w</span><span className="font-mono">{w.toFixed(3)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">当前损失</span><span className="font-mono">{loss(w).toFixed(3)}</span></div>
            {converged && <div className="mt-1 text-emerald-600">✓ 已收敛到最优!</div>}
            {diverging && lr > 1 && <div className="mt-1 text-red-500">⚠ 学习率过大,正在发散!</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
