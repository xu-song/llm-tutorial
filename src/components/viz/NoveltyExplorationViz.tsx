"use client";

import { useMemo, useState } from "react";
import Slider from "./Slider";

// 好奇心探索对比:在同一个 7×7 稀疏奖励网格上,并排重放两种探索策略的足迹热力图——
//   左:ε-贪心(盲目随机游走,面向奖励的探索在无奖励梯度时退化为随机)
//   右:基于计数的新奇性(count-based,总往"访问次数最少"的邻格走 —— 内在奖励定向探索)
// 颜色深浅 = 该格被访问次数;高亮 = 当前位置。奖励只在终点格,起点在左上、终点在右下。
// 轨迹用固定种子 LCG 预先离线生成(渲染期无 Math.random/Date),SSR 安全、可复现。
// 配合 reinforcement-learning 篇「## 内在奖励与好奇心探索 → 思路一:基于计数」。

const N = 7;
const START = 0; // 左上 (0,0)
const GOAL = N * N - 1; // 右下 (6,6)
const STEPS = 140;

const CELL = 40;
const PAD = 6;
const SIZE = N * CELL + 2 * PAD;

// 动作:上 右 下 左
const ACTIONS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

const rc = (s: number) => ({ r: Math.floor(s / N), c: s % N });
const idx = (r: number, c: number) => r * N + c;

function neighbors(s: number): number[] {
  const { r, c } = rc(s);
  const out: number[] = [];
  for (const a of ACTIONS) {
    const nr = r + a.dy;
    const nc = c + a.dx;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N) out.push(idx(nr, nc));
  }
  return out;
}

// 确定性伪随机(LCG),避免渲染期 Math.random 造成水合不一致。
function makeRng(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

type Trace = {
  traj: number[]; // 每步所在格子(含起点)
  countsAt: number[][]; // countsAt[t] = 走完第 t 步后各格累计访问次数
  reachedAt: number; // 首次到达终点的步数(-1 = 未到达)
};

// ε-贪心:稀疏奖励下没有价值梯度,探索退化成均匀随机游走。
function simRandom(seed: number): Trace {
  const rng = makeRng(seed);
  const counts = new Array(N * N).fill(0);
  let s = START;
  counts[s]++;
  const traj = [s];
  const countsAt = [counts.slice()];
  let reachedAt = -1;
  for (let t = 0; t < STEPS; t++) {
    const nb = neighbors(s);
    s = nb[Math.floor(rng() * nb.length)];
    counts[s]++;
    traj.push(s);
    countsAt.push(counts.slice());
    if (s === GOAL && reachedAt < 0) reachedAt = t + 1;
  }
  return { traj, countsAt, reachedAt };
}

// 基于计数的新奇性:内在奖励 r^i ∝ 1/√N(s),等价于总往"最少访问"的邻格走。
function simNovelty(seed: number): Trace {
  const rng = makeRng(seed);
  const counts = new Array(N * N).fill(0);
  let s = START;
  counts[s]++;
  const traj = [s];
  const countsAt = [counts.slice()];
  let reachedAt = -1;
  for (let t = 0; t < STEPS; t++) {
    const nb = neighbors(s);
    let best: number[] = [];
    let bestC = Infinity;
    for (const n of nb) {
      if (counts[n] < bestC) {
        bestC = counts[n];
        best = [n];
      } else if (counts[n] === bestC) {
        best.push(n);
      }
    }
    s = best[Math.floor(rng() * best.length)];
    counts[s]++;
    traj.push(s);
    countsAt.push(counts.slice());
    if (s === GOAL && reachedAt < 0) reachedAt = t + 1;
  }
  return { traj, countsAt, reachedAt };
}

const SEED = 12345;
const RANDOM = simRandom(SEED);
const NOVELTY = simNovelty(SEED);

function coverage(counts: number[]): number {
  let n = 0;
  for (const c of counts) if (c > 0) n++;
  return n;
}

interface GridProps {
  title: string;
  subtitle: string;
  trace: Trace;
  step: number;
  accent: string;
}

function Grid({ title, subtitle, trace, step, accent }: GridProps) {
  const counts = trace.countsAt[Math.min(step, STEPS)];
  const current = trace.traj[Math.min(step, STEPS)];
  const cover = coverage(counts);
  const maxCount = Math.max(1, ...counts);
  const reached = trace.reachedAt >= 0 && step >= trace.reachedAt;

  const fill = (s: number) => {
    if (s === GOAL) return reached ? "#059669" : "var(--chart-surface)";
    const c = counts[s];
    if (c === 0) return "var(--chart-surface)";
    const t = Math.min(1, c / maxCount);
    // 越常访问越深(蓝 = 探索足迹密度)
    return `rgba(59, 130, 246, ${0.1 + 0.62 * t})`;
  };

  return (
    <div className="flex flex-col gap-2">
      <div>
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{title}</div>
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{subtitle}</div>
      </div>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full max-w-[280px] rounded-lg bg-chart-surface shadow-sm"
        role="img"
        aria-label={`${title}:第 ${step} 步的访问足迹热力图,已覆盖 ${cover} / ${N * N} 格`}
      >
        {Array.from({ length: N * N }, (_, s) => {
          const { r, c } = rc(s);
          const x = PAD + c * CELL;
          const y = PAD + r * CELL;
          const isCurrent = s === current;
          return (
            <g key={s}>
              <rect
                x={x + 1.5}
                y={y + 1.5}
                width={CELL - 3}
                height={CELL - 3}
                rx={5}
                fill={fill(s)}
                stroke={isCurrent ? accent : "var(--chart-grid)"}
                strokeWidth={isCurrent ? 3 : 1}
                style={{ transition: "fill 180ms ease-out, stroke-width 150ms ease-out" }}
              />
              {s === GOAL && (
                <text
                  x={x + CELL / 2}
                  y={y + CELL / 2 + 7}
                  textAnchor="middle"
                  fontSize={19}
                >
                  {reached ? "🏁" : "🎯"}
                </text>
              )}
              {s === START && (
                <text x={x + 5} y={y + 13} fontSize={9} fill="var(--chart-muted)">
                  S
                </text>
              )}
              {s !== GOAL && s !== START && counts[s] > 1 && (
                <text
                  x={x + CELL / 2}
                  y={y + CELL / 2 + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill="var(--chart-muted)"
                >
                  {counts[s]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="rounded-md bg-chart-surface px-2.5 py-1.5 text-xs shadow-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">已探索格子</span>
          <span className="font-mono font-semibold">
            {cover} / {N * N}
          </span>
        </div>
        <div className="mt-0.5 flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">到达终点</span>
          <span
            className={
              reached
                ? "font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                : "font-mono text-zinc-400"
            }
          >
            {reached ? `第 ${trace.reachedAt} 步 ✓` : "尚未 ✗"}
          </span>
        </div>
      </div>
    </div>
  );
}

/** 好奇心探索:盲目随机(ε-贪心)vs 基于计数的新奇性(内在奖励)的足迹对比。 */
export default function NoveltyExplorationViz() {
  const [step, setStep] = useState(40);

  const summary = useMemo(() => {
    const rCover = coverage(RANDOM.countsAt[Math.min(step, STEPS)]);
    const nCover = coverage(NOVELTY.countsAt[Math.min(step, STEPS)]);
    return { rCover, nCover };
  }, [step]);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-5 sm:grid-cols-2">
        <Grid
          title="ε-贪心:盲目随机"
          subtitle="无奖励梯度 → 均匀撒网,反复踩老路"
          trace={RANDOM}
          step={step}
          accent="#f59e0b"
        />
        <Grid
          title="基于计数:新奇即奖励"
          subtitle="r ⁱ ∝ 1/√N(s) → 定向奔向没见过的格子"
          trace={NOVELTY}
          step={step}
          accent="var(--chart-accent)"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          访问密度
          <span className="inline-block h-3 w-16 rounded bg-gradient-to-r from-[rgba(59,130,246,0.12)] to-[rgba(59,130,246,0.72)]" />
          少 → 多
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border-2 border-[var(--chart-accent)]" />
          当前位置
        </span>
        <span className="inline-flex items-center gap-1.5">🎯 稀疏奖励终点</span>
      </div>

      <div className="mt-4">
        <Slider
          label="探索步数"
          value={step}
          min={0}
          max={STEPS}
          step={1}
          onChange={(v) => setStep(Math.round(v))}
          decimals={0}
        />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        同一张 7×7 网格,奖励只在右下角 🎯(极稀疏)。左边 <b>ε-贪心</b> 在没有奖励梯度时退化成
        均匀随机游走——足迹反复堆在起点附近(格内数字 = 访问次数),{summary.rCover} 格被探索,常常
        <b>始终碰不到终点</b>。右边 <b>基于计数的新奇性</b>把内在奖励设成{" "}
        <span className="font-mono">1/√N(s)</span>,等价于总往「访问最少」的邻格走——足迹均匀铺满、
        {summary.nCover} 格被探索,很快就<b>系统地扫到终点</b>。这就是内在动机把「盲目探索」变成
        「定向探索」的核心直觉:<b>少见即新奇,新奇即奖励</b>。真实高维像素里无法直接数
        <span className="font-mono"> N(s)</span>,于是用密度模型的<b>伪计数</b> N̂(s) 代替(见下文)。
      </p>
    </div>
  );
}
