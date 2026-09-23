"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";
import { makeRng } from "@/lib/prng";
import { softmax } from "@/lib/mathx";
import { BANDIT_TRUE as TRUE, BANDIT_BEST as BEST, BANDIT_COLORS as COLORS, BANDIT_K as K } from "@/lib/bandit";

// 策略梯度(REINFORCE)可视化:4 臂,真实中奖率固定。
// 拖动「训练步数」,用固定种子重放 REINFORCE,展示策略概率 π(a) 如何从
// 均匀分布逐步集中到最优臂。渲染期无随机(种子固定),SSR 安全。
// 臂设定与 BanditExplorer 共用 @/lib/bandit,保证并排看时一致。

const W = 420;
const H = 210;
const PAD = 34;

// 采样一个下标(按概率 p)
function sample(p: number[], u: number) {
  let acc = 0;
  for (let i = 0; i < p.length; i++) {
    acc += p[i];
    if (u < acc) return i;
  }
  return p.length - 1;
}

// 重放 n 步 REINFORCE,返回最终策略概率
function simulate(n: number) {
  const rng = makeRng(3);
  const theta = new Array(K).fill(0);
  const lr = 0.1;
  const baseline = 0.5;
  for (let t = 0; t < n; t++) {
    const p = softmax(theta);
    const a = sample(p, rng());
    const r = rng() < TRUE[a] ? 1 : 0;
    // theta += lr * (r - baseline) * dlogpi;  dlogpi[i] = (i==a) - p[i]
    for (let i = 0; i < K; i++) {
      const grad = (i === a ? 1 : 0) - p[i];
      theta[i] += lr * (r - baseline) * grad;
    }
  }
  return softmax(theta);
}

/** 策略梯度可视化:拖动训练步数,看策略概率从均匀集中到最优臂。 */
export default function PolicyGradientViz() {
  const [steps, setSteps] = useState(0);
  const probs = useMemo(() => simulate(steps), [steps]);

  const bw = (W - 2 * PAD) / K;
  const baseY = H - PAD;
  const barMaxH = H - 2 * PAD;
  const top = probs.indexOf(Math.max(...probs));

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[420px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="策略梯度下各臂的选取概率"
        >
          <line x1={PAD} y1={baseY} x2={W - PAD} y2={baseY} stroke="var(--chart-axis)" />
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line x1={PAD} y1={baseY - g * barMaxH} x2={W - PAD} y2={baseY - g * barMaxH} stroke="var(--chart-grid)" strokeDasharray="2 3" />
              <text x={PAD - 6} y={baseY - g * barMaxH + 4} textAnchor="end" fontSize={9} fill="var(--chart-muted)">{g.toFixed(1)}</text>
            </g>
          ))}
          {probs.map((pr, i) => {
            const x = PAD + i * bw;
            const h = pr * barMaxH;
            return (
              <g key={i}>
                <rect x={x + bw * 0.2} y={baseY - h} width={bw * 0.6} height={h} rx={3} fill={COLORS[i]} opacity={i === BEST ? 1 : 0.7} />
                <text x={x + bw / 2} y={baseY - h - 5} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">{(pr * 100).toFixed(0)}%</text>
                <text x={x + bw / 2} y={baseY + 15} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
                  {i === BEST ? "★" : ""}臂{i}
                </text>
              </g>
            );
          })}
          <text x={W - PAD} y={PAD - 12} textAnchor="end" fontSize={9} fill="var(--chart-muted)">柱高 = 策略选该臂的概率 π(a)</text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="训练步数" value={steps} min={0} max={3000} step={50} onChange={(v) => setSteps(Math.round(v))} decimals={0} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">当前最爱的臂</span>
              <span className="font-mono font-semibold" style={{ color: COLORS[top] }}>
                臂 {top} {top === BEST ? "✓ 最优" : ""}
              </span>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            步数 = 0 时策略是<b>均匀</b>的(各 25%);随着训练,高回报动作的概率被梯度一点点推高,
            最终几乎全押在 <span className="font-semibold text-emerald-600 dark:text-emerald-400">★ 臂 {BEST}</span>。
            注意它<b>不学价值表</b>,而是直接调「选各臂的概率」。
          </p>
        </div>
      </div>
    </div>
  );
}
