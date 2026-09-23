"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 数值稳定性:softmax 的上溢与「减最大值」修复。
// 拖动 logits 的整体幅度 c,看 naive softmax(直接 exp)如何在 c 大时 exp 溢出成 inf/NaN,
// 而 stable softmax(先减 max)始终稳定;右侧对比两条路径每步的中间量。
// 纯确定性计算,SSR 安全。

// 固定的相对 logits 形状,整体平移由滑块 c 控制:z = base + c
const BASE = [2.0, 1.0, 0.1, -0.5];
const FLOAT_MAX = 1.7976931348623157e308; // JS Number 上限,近似 float64 溢出点

function naiveSoftmax(z: number[]): { exps: number[]; probs: number[]; overflow: boolean } {
  const exps = z.map((v) => Math.exp(v));
  const overflow = exps.some((e) => !isFinite(e));
  const sum = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / sum); // sum=inf 时得到 NaN
  return { exps, probs, overflow };
}

function stableSoftmax(z: number[]): { m: number; exps: number[]; probs: number[] } {
  const m = Math.max(...z);
  const exps = z.map((v) => Math.exp(v - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / sum);
  return { m, exps, probs };
}

const W = 260;
const H = 150;
const PAD = 30;

function ProbBars({ probs, title, broken }: { probs: number[]; title: string; broken: boolean }) {
  const n = probs.length;
  const bw = (W - 2 * PAD) / n;
  return (
    <div>
      <div className="mb-1 text-center text-xs text-zinc-500 dark:text-zinc-400">{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-lg bg-chart-surface shadow-sm">
        {/* 基线 */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--chart-axis)" />
        {broken ? (
          <text x={W / 2} y={H / 2} fontSize={14} textAnchor="middle" fill="#ef4444">
            NaN / inf ✗
          </text>
        ) : (
          probs.map((p, i) => {
            const h = (isFinite(p) ? p : 0) * (H - 2 * PAD);
            return (
              <g key={i}>
                <rect x={PAD + i * bw + 4} y={H - PAD - h} width={bw - 8} height={h} rx={2} fill="#10b981" opacity={0.85} />
                <text x={PAD + i * bw + bw / 2} y={H - PAD + 12} fontSize={10} textAnchor="middle" fill="var(--chart-muted)">
                  类{i}
                </text>
                <text x={PAD + i * bw + bw / 2} y={H - PAD - h - 4} fontSize={9} textAnchor="middle" fill="var(--chart-muted)">
                  {isFinite(p) ? p.toFixed(2) : "—"}
                </text>
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}

export default function FloatOverflowViz() {
  const [c, setC] = useState(5);

  const z = useMemo(() => BASE.map((v) => v + c), [c]);
  const naive = useMemo(() => naiveSoftmax(z), [z]);
  const stable = useMemo(() => stableSoftmax(z), [z]);

  const maxExpArg = Math.max(...z);
  // exp 在参数超过约 709 时 float64 溢出
  const overflowThreshold = 709;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-2">
        <ProbBars probs={naive.probs} title="朴素 softmax(直接 exp)" broken={naive.overflow} />
        <ProbBars probs={stable.probs} title="稳定 softmax(先减 max)" broken={false} />
      </div>

      <div className="mt-4">
        <Slider
          label="logits 整体幅度 c(z = base + c)"
          value={c}
          min={0}
          max={800}
          step={5}
          onChange={setC}
          decimals={0}
        />
      </div>

      <div className="mt-3 rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">最大 logit(= exp 的最大参数)</span>
          <span className="font-mono">{maxExpArg.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">朴素法 exp(max)</span>
          <span className={`font-mono ${naive.overflow ? "text-red-500" : ""}`}>
            {isFinite(Math.exp(maxExpArg)) ? Math.exp(maxExpArg).toExponential(2) : "inf ✗"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">稳定法 exp(max − max)</span>
          <span className="font-mono text-emerald-600">{Math.exp(0).toFixed(1)} ✓</span>
        </div>
        {maxExpArg > overflowThreshold ? (
          <div className="mt-1 text-red-500">
            ⚠ 最大 logit &gt; 709,朴素法 exp 溢出成 inf,softmax 变 NaN——训练直接崩。
          </div>
        ) : (
          <div className="mt-1 text-zinc-500 dark:text-zinc-400">
            两法此刻结果相同(减 max 不改变 softmax 的值);继续拖大 c 越过 ~709,朴素法就会崩。
          </div>
        )}
      </div>
    </div>
  );
}
