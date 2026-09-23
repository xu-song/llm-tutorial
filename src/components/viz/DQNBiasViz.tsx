"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";
import { makeRng, gaussian } from "@/lib/prng";

// 过估计偏差(overestimation bias)可视化 —— 印证 DQN max 算子的统计偏差,及 Double DQN 的修正。
//
// 设定:所有动作真值 Q*(a)=0,Q 的估计为真值 + 高斯噪声 N(0,σ)。
//   - 标准 DQN 目标用 max_a Q̂(a):取一组含噪估计的 max,期望 > 0(系统性高估)。
//     动作越多、噪声越大,偏差越严重。这是 Q-learning 在函数逼近下高估价值的统计根源。
//   - Double DQN:用独立第二组估计 Q̂₂ 选 argmax,再用第一组 Q̂₁ 评该动作 →
//     E[Q̂₁(argmax Q̂₂)] = 0(选动作的噪声与评动作的噪声独立),偏差消失。
//
// 横轴扫描动作数 k(2..16),每个 k 跨 TRIALS 次取平均,画两条曲线:
//   - 标准 DQN 偏差(随 k、σ 单调上升)
//   - Double DQN 偏差(贴在 0 附近)
// 用固定种子重放(渲染期无 Math.random),SSR 安全。

const TRIALS = 4000; // 每个 k 的蒙特卡洛次数,够稳又不卡
const SEED = 20260702;

// 给定动作数 k、噪声 σ,返回 {std, dbl} 两个平均偏差
function biasAtK(k: number, sigma: number): { std: number; dbl: number } {
  const rng = makeRng(SEED + k);
  let sumStd = 0;
  let sumDbl = 0;
  for (let t = 0; t < TRIALS; t++) {
    let max1 = -Infinity;
    for (let i = 0; i < k; i++) {
      const q = sigma * gaussian(rng);
      if (q > max1) max1 = q;
    }
    sumStd += max1; // 真 max = 0,故 max1 即偏差
    // Double:第二组独立估计选 argmax,第一组评该动作
    let best2 = -Infinity;
    let argmax2 = 0;
    const q1: number[] = [];
    for (let i = 0; i < k; i++) {
      q1.push(sigma * gaussian(rng));
      const q2 = sigma * gaussian(rng);
      if (q2 > best2) {
        best2 = q2;
        argmax2 = i;
      }
    }
    sumDbl += q1[argmax2];
  }
  return { std: sumStd / TRIALS, dbl: sumDbl / TRIALS };
}

const K_MIN = 2;
const K_MAX = 16;
const KS = Array.from({ length: K_MAX - K_MIN + 1 }, (_, i) => K_MIN + i);

const W = 460;
const H = 240;
const PADL = 40;
const PADR = 12;
const PADT = 16;
const PADB = 34;

export default function DQNBiasViz() {
  const [sigma, setSigma] = useState(1.0);

  const series = useMemo(() => {
    // 同时算 std 与 dbl 两条曲线
    let maxBias = 0.01;
    const rows = KS.map((k) => {
      const b = biasAtK(k, sigma);
      if (b.std > maxBias) maxBias = b.std;
      return { k, ...b };
    });
    return { rows, maxBias };
  }, [sigma]);

  const { rows, maxBias } = series;
  const sx = (k: number) => PADL + ((k - K_MIN) / (K_MAX - K_MIN)) * (W - PADL - PADR);
  const sy = (b: number) => PADT + (1 - b / maxBias) * (H - PADT - PADB);

  const pathStd = rows.map((r, i) => `${i === 0 ? "M" : "L"}${sx(r.k).toFixed(1)},${sy(r.std).toFixed(1)}`).join(" ");
  const pathDbl = rows.map((r, i) => `${i === 0 ? "M" : "L"}${sx(r.k).toFixed(1)},${sy(r.dbl).toFixed(1)}`).join(" ");

  const stdAt10 = rows.find((r) => r.k === 10)?.std ?? 0;
  const dblAt10 = rows.find((r) => r.k === 10)?.dbl ?? 0;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="标准 DQN 与 Double DQN 的价值高估偏差随动作数的变化"
        >
          {/* y 轴刻度 */}
          {[0, 0.5, 1].map((g) => {
            const y = PADT + (1 - g) * (H - PADT - PADB);
            return (
              <g key={g}>
                <line x1={PADL} y1={y} x2={W - PADR} y2={y} stroke="var(--chart-grid)" strokeDasharray="2 3" />
                <text x={PADL - 5} y={y + 3} textAnchor="end" fontSize={9} fill="var(--chart-muted)">
                  {(g * maxBias).toFixed(1)}
                </text>
              </g>
            );
          })}
          {/* 零线 */}
          <line x1={PADL} y1={sy(0)} x2={W - PADR} y2={sy(0)} stroke="var(--chart-axis)" strokeWidth={1} />
          {/* x 轴刻度 */}
          {[2, 6, 10, 16].map((k) => (
            <text key={k} x={sx(k)} y={H - PADB + 14} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
              {k}
            </text>
          ))}
          <text x={(W + PADL) / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">动作数 k</text>
          <text x={12} y={H / 2} textAnchor="middle" fontSize={9} fill="var(--chart-muted)" transform={`rotate(-90 12 ${H / 2})`}>平均偏差 E[max Q̂]</text>

          {/* Double DQN 曲线(贴零) */}
          <path d={pathDbl} fill="none" stroke="#10b981" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {/* 标准 DQN 曲线(随 k 上升) */}
          <path d={pathStd} fill="none" stroke="#ef4444" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="估计噪声 σ" value={sigma} min={0.3} max={2.5} step={0.1} onChange={setSigma} decimals={1} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="font-semibold text-red-500 dark:text-red-400">标准 DQN @k=10</span>
              <span className="font-mono">+{stdAt10.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Double @k=10</span>
              <span className="font-mono">{dblAt10 >= 0 ? "+" : ""}{dblAt10.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            设所有动作真值 $Q^*=0$,$Q$ 估计含噪声 $N(0,\sigma)$。<b className="text-red-500 dark:text-red-400">标准 DQN</b> 的 $\max_a \hat Q(a)$ 因「取最大」而系统性<b>偏高</b>——动作越多、噪声越大,偏差越严重;这是 Q-learning 高估价值的统计根源。<b className="text-emerald-600 dark:text-emerald-400">Double DQN</b> 用独立估计选动作、再评动作,两份噪声相互抵消,偏差贴回零。
          </p>
        </div>
      </div>
    </div>
  );
}
