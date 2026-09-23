"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

const W = 440;
const H = 300;
const PAD = 44;

// 二元熵 H(p) = -p log2 p - (1-p) log2(1-p),单位 bit
const binaryEntropy = (p: number) => {
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
};

const sx = (p: number) => PAD + p * (W - 2 * PAD);
const sy = (h: number) => H - PAD - (h / 1) * (H - 2 * PAD); // H 最大为 1 bit

// 预生成熵曲线
const CURVE = (() => {
  const pts: string[] = [];
  for (let p = 0; p <= 1.0001; p += 0.01) {
    pts.push(`${sx(p)},${sy(binaryEntropy(p))}`);
  }
  return "M" + pts.join(" L");
})();

/** 二元熵浏览器:拖动「正面概率 p」,观察一枚硬币的不确定性 H(p) 如何在 p=0.5 时最大。 */
export default function EntropyExplorer() {
  const [p, setP] = useState(0.5);
  const h = useMemo(() => binaryEntropy(p), [p]);

  // 不确定性描述
  const desc =
    h > 0.95
      ? "最大不确定性 —— 完全猜不准"
      : h > 0.6
        ? "较高不确定性"
        : h > 0.2
          ? "较低不确定性"
          : "几乎确定 —— 信息量很小";

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[440px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          {/* 坐标轴 */}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--chart-axis)" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--chart-axis)" />
          {/* 轴标签 */}
          <text x={W / 2} y={H - 10} fontSize={11} textAnchor="middle" fill="var(--chart-muted)">正面概率 p</text>
          <text x={14} y={H / 2} fontSize={11} textAnchor="middle" fill="var(--chart-muted)" transform={`rotate(-90 14 ${H / 2})`}>熵 H(p) / bit</text>
          {/* 刻度 */}
          <text x={PAD} y={H - PAD + 16} fontSize={10} textAnchor="middle" fill="var(--chart-muted)">0</text>
          <text x={sx(0.5)} y={H - PAD + 16} fontSize={10} textAnchor="middle" fill="var(--chart-muted)">0.5</text>
          <text x={sx(1)} y={H - PAD + 16} fontSize={10} textAnchor="middle" fill="var(--chart-muted)">1</text>
          <text x={PAD - 8} y={sy(1) + 4} fontSize={10} textAnchor="end" fill="var(--chart-muted)">1</text>

          {/* 熵曲线 */}
          <path d={CURVE} fill="none" stroke="#059669" strokeWidth={2.5} />

          {/* 当前点的引导线 */}
          <line x1={sx(p)} y1={H - PAD} x2={sx(p)} y2={sy(h)} stroke="#f59e0b" strokeDasharray="3 3" />
          <line x1={PAD} y1={sy(h)} x2={sx(p)} y2={sy(h)} stroke="#f59e0b" strokeDasharray="3 3" />
          <circle cx={sx(p)} cy={sy(h)} r={6} fill="#f59e0b" />
        </svg>

        <div className="flex flex-col justify-center gap-4">
          <Slider label="正面概率 p" value={p} min={0} max={1} step={0.01} onChange={setP} decimals={2} />
          <div className="rounded-lg bg-chart-surface p-3 text-center shadow-sm">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">熵 H(p)</div>
            <div className="font-mono text-2xl font-bold text-emerald-700">{h.toFixed(3)}<span className="ml-1 text-sm font-normal text-zinc-400 dark:text-zinc-500">bit</span></div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{desc}</div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            把 p 拖到 0 或 1(必然结果)时熵为 0;拖到 0.5(最难预测)时熵最大,为 1 bit。
          </p>
        </div>
      </div>
    </div>
  );
}
