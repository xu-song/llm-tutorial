"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

const N = 12; // 样本数
const W = 420;
const ROW_H = 30;
const PAD_X = 36;
const PAD_TOP = 28;

const cellW = (W - 2 * PAD_X) / N;

/** K 折交叉验证可视化:调 K,看每一轮哪一折当验证集(橙)、其余当训练集(绿),每个样本恰好当一次验证。 */
export default function KFoldExplorer() {
  const [k, setK] = useState(4);

  // 把 N 个样本尽量均匀分成 k 折,返回每个样本所属折号
  const foldOf = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < N; i++) arr.push(Math.floor((i * k) / N));
    return arr;
  }, [k]);

  const H = PAD_TOP + k * ROW_H + 16;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[420px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          <text x={W / 2} y={16} fontSize={11} textAnchor="middle" fill="var(--chart-muted)">
            {N} 个样本 · 每一行是一轮训练
          </text>
          {Array.from({ length: k }).map((_, round) => (
            <g key={round}>
              <text x={PAD_X - 8} y={PAD_TOP + round * ROW_H + ROW_H / 2 + 4} fontSize={10} textAnchor="end" fill="var(--chart-muted)">
                第{round + 1}轮
              </text>
              {Array.from({ length: N }).map((_, i) => {
                const isVal = foldOf[i] === round;
                return (
                  <rect
                    key={i}
                    x={PAD_X + i * cellW + 1}
                    y={PAD_TOP + round * ROW_H + 2}
                    width={cellW - 2}
                    height={ROW_H - 4}
                    rx={3}
                    fill={isVal ? "#f59e0b" : "#10b981"}
                    opacity={isVal ? 0.9 : 0.35}
                  />
                );
              })}
            </g>
          ))}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="折数 K" value={k} min={2} max={6} step={1} onChange={setK} decimals={0} />
          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-[#f59e0b]" />验证集</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-[#10b981] opacity-40" />训练集</span>
            </div>
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
              共 <span className="font-bold">{k}</span> 轮,每轮用 <span className="font-bold">{k - 1}/{k}</span> 数据训练、<span className="font-bold">1/{k}</span> 验证。最终成绩取 {k} 轮的平均。
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            注意:橙色块沿对角线移动,<span className="font-semibold text-emerald-600">每个样本都恰好当一次验证集</span> —— 数据被充分利用,评估也更稳定。
          </p>
        </div>
      </div>
    </div>
  );
}
