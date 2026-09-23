"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";
import { makeRng } from "@/lib/prng";
import { BANDIT_TRUE, BANDIT_BEST, BANDIT_COLORS, betaSample } from "@/lib/bandit";

// 三种探索策略对比:同一 4 臂问题 [0.2,0.5,0.75,0.4],同一随机种子,
// 跑 T 步后并排展示各自的臂选择分布(被选次数占比)。
//   - ε-greedy(ε=0.1):发现最优就贪心,但浪费 ε/4 在差臂上
//   - UCB(c=2):越没把握越想试,早期探索最积极、分布最匀
//   - Thompson:从 Beta 后验采样,后验未收敛时不敢太集中
// 拖动 T 看三者的「探索→利用」风格差异。渲染期无随机(种子固定),SSR 安全。

const K = BANDIT_TRUE.length; // 4
const EPS = 0.1;
const C_UCB = 2.0;
const SEED = 1;

type Strat = (T: number, rng: () => number) => number[]; // 返回各臂被选次数

const runEpsGreedy: Strat = (T, rng) => {
  const Q = [0.5, 0.5, 0.5, 0.5];
  const N = [0, 0, 0, 0];
  for (let t = 0; t < T; t++) {
    const a = rng() < EPS ? Math.floor(rng() * K) : Q.indexOf(Math.max(...Q));
    const r = rng() < BANDIT_TRUE[a] ? 1 : 0;
    N[a]++; Q[a] += (r - Q[a]) / N[a];
  }
  return N;
};

const runUCB: Strat = (T, rng) => {
  const Q = [0, 0, 0, 0];
  const N = [0, 0, 0, 0];
  const init = Math.min(K, T);
  for (let a = 0; a < init; a++) {
    const r = rng() < BANDIT_TRUE[a] ? 1 : 0;
    N[a]++; Q[a] += (r - Q[a]) / N[a];
  }
  for (let t = init; t < T; t++) {
    let a = 0;
    let best = -Infinity;
    for (let i = 0; i < K; i++) {
      const u = Q[i] + C_UCB * Math.sqrt(Math.log(t + 1) / N[i]);
      if (u > best) { best = u; a = i; }
    }
    const r = rng() < BANDIT_TRUE[a] ? 1 : 0;
    N[a]++; Q[a] += (r - Q[a]) / N[a];
  }
  return N;
};

const runThompson: Strat = (T, rng) => {
  const al = [1, 1, 1, 1];
  const be = [1, 1, 1, 1];
  const N = [0, 0, 0, 0];
  for (let t = 0; t < T; t++) {
    const s = [betaSample(al[0], be[0], rng), betaSample(al[1], be[1], rng), betaSample(al[2], be[2], rng), betaSample(al[3], be[3], rng)];
    let a = 0; for (let i = 1; i < K; i++) if (s[i] > s[a]) a = i;
    const r = rng() < BANDIT_TRUE[a] ? 1 : 0;
    N[a]++;
    if (r) al[a]++; else be[a]++;
  }
  return N;
};

const STRATS: { name: string; sub: string; run: Strat; color: string }[] = [
  { name: "ε-贪心", sub: "ε=0.1", run: runEpsGreedy, color: "#0ea5e9" },
  { name: "UCB", sub: "c=2.0", run: runUCB, color: "#8b5cf6" },
  { name: "Thompson", sub: "Beta 后验", run: runThompson, color: "#f59e0b" },
];

// 单图尺寸
const SUB_W = 132;
const W = SUB_W * STRATS.length + 16; // 3 × 132 + 16
const H = 230;
const PADT = 30;
const PADB = 40;
const PLOT_H = H - PADT - PADB;

export default function BanditStrategyCompare() {
  const [steps, setSteps] = useState(100);

  const results = useMemo(() => {
    return STRATS.map((s) => {
      const N = s.run(steps, makeRng(SEED));
      const total = N.reduce((a, b) => a + b, 0) || 1;
      return N.map((n) => n / total); // 占比 [0,1]
    });
  }, [steps]);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`三种探索策略在 ${steps} 步后的臂选择分布对比`}
        >
          {/* y 轴刻度(0/50/100%)横跨全图 */}
          {[0, 0.5, 1].map((g) => {
            const y = PADT + (1 - g) * PLOT_H;
            return (
              <g key={g}>
                <line x1={0} y1={y} x2={W} y2={y} stroke="var(--chart-grid)" strokeDasharray="2 3" />
                <text x={3} y={y - 2} fontSize={8} fill="var(--chart-muted)">{Math.round(g * 100)}%</text>
              </g>
            );
          })}
          {STRATS.map((s, si) => {
            const x0 = si * SUB_W + 8;
            const dist = results[si];
            const barW = (SUB_W - 16) / K * 0.7;
            const slot = (SUB_W - 16) / K;
            const dominant = dist.indexOf(Math.max(...dist)); // 该策略拉得最多的臂
            return (
              <g key={s.name}>
                {/* 策略名 */}
                <text x={x0 + (SUB_W - 16) / 2} y={14} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--chart-muted)">
                  {s.name}
                </text>
                <text x={x0 + (SUB_W - 16) / 2} y={26} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">
                  {s.sub}
                </text>
                {/* 柱 */}
                {dist.map((p, i) => {
                  const bx = x0 + i * slot + (slot - barW) / 2;
                  const bh = p * PLOT_H;
                  const by = PADT + PLOT_H - bh;
                  const isBest = i === BANDIT_BEST;
                  const isDom = i === dominant;
                  return (
                    <g key={i}>
                      <rect
                        x={bx}
                        y={by}
                        width={barW}
                        height={bh}
                        rx={1.5}
                        fill={BANDIT_COLORS[i]}
                        opacity={isDom ? 1 : 0.55}
                      />
                      {/* 最优臂标记 */}
                      {isBest && (
                        <text x={bx + barW / 2} y={PADT + PLOT_H + 12} textAnchor="middle" fontSize={8} fill="var(--chart-accent)" fontWeight={700}>
                          ★
                        </text>
                      )}
                      <text x={bx + barW / 2} y={PADT + PLOT_H + 24} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">
                        臂{i}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="步数 T" value={steps} min={10} max={500} step={10} onChange={(v) => setSteps(Math.round(v))} decimals={0} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            {STRATS.map((s, i) => {
              const pBest = results[i][BANDIT_BEST];
              return (
                <div key={s.name} className="flex justify-between">
                  <span style={{ color: s.color }} className="font-semibold">{s.name}</span>
                  <span className="font-mono">最优臂 {(pBest * 100).toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            同一 4 臂问题(真实中奖率 <span className="font-mono">{BANDIT_TRUE.join("/")}</span>,★=最优臂2)、同一随机种子。
            <b className="text-sky-600 dark:text-sky-400">ε-贪心</b>早早就贪心押最优、但总浪费 ε 在差臂;
            <b className="text-violet-600 dark:text-violet-400">UCB</b>早期最敢试新(分布最匀);
            <b className="text-amber-600 dark:text-amber-500">Thompson</b>后验未收敛时不冒进。拖大 T,三者都收敛到最优臂,但路径不同。
          </p>
        </div>
      </div>
    </div>
  );
}
