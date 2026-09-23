"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";
import { makeRng } from "@/lib/prng";
import { BANDIT_TRUE, BANDIT_BEST, BANDIT_K as K, betaSample } from "@/lib/bandit";

// 累积后悔值曲线:同一 4 臂问题 [0.2,0.5,0.75,0.4],跨 6 个种子取平均
// (单种子噪声大,平均后曲线形状稳定)。每隔若干步采样一次「累积后悔」,绘制三条曲线。
//   - ε-贪心(ε=0.1,常数):后悔斜率恒定 → 线性增长 O(T),始终按 ε/K 浪费固定比例的尝试
//   - UCB(c=2):次优臂随采样收敛被逐渐抛弃 → 斜率递减,呈对数形 O(log T)
//   - Thompson(Beta 后验):同样斜率递减,无需探索参数
// 后悔 = Σ_t (μ* − μ_{a_t})。拖大 T,ε-贪心保持直线,UCB/Thompson 越拉越缓,差距随之拉开。
// 渲染期无随机(种子固定),SSR 安全。

const EPS = 0.1;
const C_UCB = 2.0;
const SEEDS = [11, 23, 37, 53, 71, 97]; // 6 个种子取平均,降噪
const SAMPLE_EVERY = 5; // 每 5 步采一个点

// 单次策略重放,返回后悔采样点 [{t, regret}, ...]
type Point = { t: number; r: number };

function runEpsGreedy(T: number, rng: () => number): Point[] {
  const Q = [0.5, 0.5, 0.5, 0.5];
  const N = [0, 0, 0, 0];
  const pts: Point[] = [];
  let reg = 0;
  for (let t = 1; t <= T; t++) {
    const a = rng() < EPS ? Math.floor(rng() * K) : Q.indexOf(Math.max(...Q));
    const r = rng() < BANDIT_TRUE[a] ? 1 : 0;
    N[a]++; Q[a] += (r - Q[a]) / N[a];
    reg += BANDIT_TRUE[BANDIT_BEST] - BANDIT_TRUE[a];
    if (t % SAMPLE_EVERY === 0) pts.push({ t, r: reg });
  }
  return pts;
}

function runUCB(T: number, rng: () => number): Point[] {
  const Q = [0, 0, 0, 0];
  const N = [0, 0, 0, 0];
  const pts: Point[] = [];
  let reg = 0;
  const init = Math.min(K, T);
  for (let a = 0; a < init; a++) {
    const r = rng() < BANDIT_TRUE[a] ? 1 : 0;
    N[a]++; Q[a] += (r - Q[a]) / N[a];
    reg += BANDIT_TRUE[BANDIT_BEST] - BANDIT_TRUE[a];
  }
  for (let t = init + 1; t <= T; t++) {
    let a = 0; let best = -Infinity;
    for (let i = 0; i < K; i++) {
      const u = Q[i] + C_UCB * Math.sqrt(Math.log(t) / N[i]);
      if (u > best) { best = u; a = i; }
    }
    const r = rng() < BANDIT_TRUE[a] ? 1 : 0;
    N[a]++; Q[a] += (r - Q[a]) / N[a];
    reg += BANDIT_TRUE[BANDIT_BEST] - BANDIT_TRUE[a];
    if (t % SAMPLE_EVERY === 0) pts.push({ t, r: reg });
  }
  return pts;
}

function runThompson(T: number, rng: () => number): Point[] {
  const al = [1, 1, 1, 1];
  const be = [1, 1, 1, 1];
  const N = [0, 0, 0, 0];
  const pts: Point[] = [];
  let reg = 0;
  for (let t = 1; t <= T; t++) {
    const s = [betaSample(al[0], be[0], rng), betaSample(al[1], be[1], rng), betaSample(al[2], be[2], rng), betaSample(al[3], be[3], rng)];
    let a = 0; for (let i = 1; i < K; i++) if (s[i] > s[a]) a = i;
    const r = rng() < BANDIT_TRUE[a] ? 1 : 0;
    N[a]++;
    if (r) al[a]++; else be[a]++;
    reg += BANDIT_TRUE[BANDIT_BEST] - BANDIT_TRUE[a];
    if (t % SAMPLE_EVERY === 0) pts.push({ t, r: reg });
  }
  return pts;
}

const STRATS = [
  { name: "ε-贪心", sub: "ε=0.1 · 线性 O(T)", run: runEpsGreedy, color: "#0ea5e9" },
  { name: "UCB", sub: "c=2 · 对数 O(log T)", run: runUCB, color: "#8b5cf6" },
  { name: "Thompson", sub: "Beta · 对数 O(log T)", run: runThompson, color: "#f59e0b" },
];

const W = 460;
const H = 240;
const PADL = 38;
const PADR = 12;
const PADT = 16;
const PADB = 34;

export default function BanditRegretViz() {
  const [steps, setSteps] = useState(500);

  const series = useMemo(() => {
    // 每个策略在 SEEDS 上各跑一遍,按点取平均
    const perSeed = SEEDS.map((seed) => STRATS.map((s) => s.run(steps, makeRng(seed))));
    // perSeed[seedIdx][stratIdx] = Point[]
    return STRATS.map((s, si) => {
      const allRuns = perSeed.map((runs) => runs[si]); // Point[][]
      const len = allRuns[0]?.length ?? 0;
      const avgPts: Point[] = [];
      for (let i = 0; i < len; i++) {
        let sum = 0;
        for (const run of allRuns) sum += run[i].r;
        avgPts.push({ t: allRuns[0][i].t, r: sum / allRuns.length });
      }
      return { ...s, pts: avgPts };
    });
  }, [steps]);

  const maxT = steps;
  const maxR = useMemo(() => {
    let m = 1;
    for (const s of series) for (const p of s.pts) if (p.r > m) m = p.r;
    return m;
  }, [series]);

  const sx = (t: number) => PADL + (t / maxT) * (W - PADL - PADR);
  const sy = (r: number) => PADT + (1 - r / maxR) * (H - PADT - PADB);

  const pathFrom = (pts: Point[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.t).toFixed(1)},${sy(p.r).toFixed(1)}`).join(" ");

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="三种探索策略的累积后悔值随步数增长曲线"
        >
          {/* y 轴刻度 */}
          {[0, 0.5, 1].map((g) => {
            const y = PADT + (1 - g) * (H - PADT - PADB);
            return (
              <g key={g}>
                <line x1={PADL} y1={y} x2={W - PADR} y2={y} stroke="var(--chart-grid)" strokeDasharray="2 3" />
                <text x={PADL - 5} y={y + 3} textAnchor="end" fontSize={9} fill="var(--chart-muted)">
                  {Math.round(g * maxR)}
                </text>
              </g>
            );
          })}
          {/* x 轴刻度 */}
          {[0, 0.5, 1].map((g) => {
            const x = PADL + g * (W - PADL - PADR);
            return (
              <text key={g} x={x} y={H - PADB + 14} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                {Math.round(g * maxT)}
              </text>
            );
          })}
          <text x={(W + PADL) / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">步数 t</text>
          <text x={11} y={H / 2} textAnchor="middle" fontSize={9} fill="var(--chart-muted)" transform={`rotate(-90 11 ${H / 2})`}>累积后悔</text>

          {/* 参考线:线性增长(ε-greedy 的理论形状) */}
          <line
            x1={sx(maxT * 0.05)}
            y1={sy(0)}
            x2={sx(maxT)}
            y2={sy(maxR * 0.97)}
            stroke="var(--chart-muted)"
            strokeWidth={1}
            strokeDasharray="1 4"
            opacity={0.6}
          />

          {/* 三条后悔曲线 + 末端直接标签(免读者来回对照侧栏色块) */}
          {series.map((s) => {
            const last = s.pts[s.pts.length - 1];
            if (!last) return null;
            const ly = sy(last.r);
            // 标签放曲线末端右侧;靠近顶/底时向中线轻偏,避免越出绘图区
            const lx = sx(last.t) + 4;
            const lyClamped = Math.max(PADT + 6, Math.min(H - PADB - 6, ly));
            return (
              <g key={s.name}>
                <path d={pathFrom(s.pts)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                <text x={lx} y={lyClamped + 3} fontSize={9} fontWeight={600} fill={s.color}>
                  {s.name}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="步数 T" value={steps} min={100} max={4000} step={50} onChange={(v) => setSteps(Math.round(v))} decimals={0} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            {series.map((s) => {
              const last = s.pts[s.pts.length - 1];
              return (
                <div key={s.name} className="flex justify-between">
                  <span style={{ color: s.color }} className="font-semibold">{s.name}</span>
                  <span className="font-mono">{last ? last.r.toFixed(0) : "—"}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            后悔 = 少拿的奖励总和(6 个种子平均)。<b className="text-sky-600 dark:text-sky-400">ε-贪心</b>的曲线近似<b>直线</b>——常数 ε 永远浪费固定比例的尝试,斜率恒定;
            <b className="text-violet-600 dark:text-violet-400">UCB</b> 与 <b className="text-amber-600 dark:text-amber-500">Thompson</b> 的曲线<b>越拉越缓</b>——次优臂随采样收敛被逐渐抛弃,呈对数形。理论渐近线上 ε-贪心 O(T) 必然追平并超过 O(log T) 的两者;拖大 T 看斜率差异如何显现(具体交叉点取决于臂间距与探索强度 c)。
          </p>
        </div>
      </div>
    </div>
  );
}
