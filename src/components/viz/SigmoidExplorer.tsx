"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

const W = 440;
const H = 300;
const PAD = 44;

// x 轴范围固定为 [-10, 10]
const X_MIN = -10;
const X_MAX = 10;

// sigmoid: σ(z) = 1 / (1 + e^-z),其中 z = w·x + b
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

const sx = (x: number) => PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD);
const sy = (y: number) => H - PAD - y * (H - 2 * PAD); // y ∈ [0,1]

/** Sigmoid 浏览器:拖动权重 w 和偏置 b,观察 S 形曲线如何变陡、平移,以及某点 x 被判为正类的概率。 */
export default function SigmoidExplorer() {
  const [w, setW] = useState(1);
  const [b, setB] = useState(0);
  const [x, setX] = useState(2);

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let xi = X_MIN; xi <= X_MAX + 0.001; xi += 0.2) {
      pts.push(`${sx(xi)},${sy(sigmoid(w * xi + b))}`);
    }
    return "M" + pts.join(" L");
  }, [w, b]);

  const prob = useMemo(() => sigmoid(w * x + b), [w, b, x]);
  const cls = prob >= 0.5 ? 1 : 0;
  // 决策边界:w·x + b = 0  →  x = -b/w
  const boundary = w !== 0 ? -b / w : null;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[440px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          {/* 网格线 y=0.5 */}
          <line x1={PAD} y1={sy(0.5)} x2={W - PAD} y2={sy(0.5)} stroke="var(--chart-grid)" strokeDasharray="4 4" />
          {/* 坐标轴 */}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--chart-axis)" />
          <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} stroke="var(--chart-axis)" />
          {/* 轴标签 */}
          <text x={W - PAD} y={H - PAD + 16} fontSize={10} textAnchor="end" fill="var(--chart-muted)">z = wx + b</text>
          <text x={14} y={H / 2} fontSize={11} textAnchor="middle" fill="var(--chart-muted)" transform={`rotate(-90 14 ${H / 2})`}>概率 σ(z)</text>
          {/* y 刻度 */}
          <text x={PAD - 8} y={sy(1) + 4} fontSize={10} textAnchor="end" fill="var(--chart-muted)">1</text>
          <text x={PAD - 8} y={sy(0.5) + 4} fontSize={10} textAnchor="end" fill="var(--chart-muted)">0.5</text>
          <text x={PAD - 8} y={sy(0) + 4} fontSize={10} textAnchor="end" fill="var(--chart-muted)">0</text>

          {/* 决策边界竖线 */}
          {boundary !== null && boundary > X_MIN && boundary < X_MAX && (
            <line x1={sx(boundary)} y1={PAD} x2={sx(boundary)} y2={H - PAD} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1.5} />
          )}

          {/* sigmoid 曲线 */}
          <path d={curve} fill="none" stroke="#059669" strokeWidth={2.5} />

          {/* 当前查询点 x 的引导线 */}
          <line x1={sx(x)} y1={H - PAD} x2={sx(x)} y2={sy(prob)} stroke="#f59e0b" strokeDasharray="3 3" />
          <line x1={PAD} y1={sy(prob)} x2={sx(x)} y2={sy(prob)} stroke="#f59e0b" strokeDasharray="3 3" />
          <circle cx={sx(x)} cy={sy(prob)} r={6} fill="#f59e0b" />
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="权重 w(陡峭程度)" value={w} min={-3} max={3} step={0.1} onChange={setW} decimals={1} />
          <Slider label="偏置 b(左右平移)" value={b} min={-5} max={5} step={0.1} onChange={setB} decimals={1} />
          <Slider label="查询点 x" value={x} min={X_MIN} max={X_MAX} step={0.1} onChange={setX} decimals={1} />
          <div className="rounded-lg bg-chart-surface p-3 text-center shadow-sm">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">P(正类 | x={x.toFixed(1)})</div>
            <div className="font-mono text-2xl font-bold text-emerald-700">{prob.toFixed(3)}</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              判为 <span className={cls === 1 ? "font-semibold text-emerald-600" : "font-semibold text-blue-500"}>{cls === 1 ? "正类(1)" : "负类(0)"}</span>
              {boundary !== null && <>,决策边界 x = {boundary.toFixed(2)}</>}
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            |w| 越大曲线越陡(分类越「果断」);b 让曲线左右平移。蓝色虚线是概率=0.5 的决策边界。
          </p>
        </div>
      </div>
    </div>
  );
}
