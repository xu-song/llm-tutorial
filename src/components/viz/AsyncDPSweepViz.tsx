"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 异步 DP 对比:在同一 4×4 网格上,把「优先扫描」逐次 backup 重放出来,
// 用颜色显示每格被 backup 的次数(算力都花在了哪),并高亮当前正在更新的格子(波前),
// 与「同步全表扫描」的固定开销做对比。纯确定性派生,渲染期无随机,SSR 安全。

const N = 4;
const GOAL = 15;
const PIT = 9;
const START = 0;
const GAMMA = 0.9;
const TERM = new Set([GOAL, PIT]);
const TOL = 1e-4;

const CELL = 74;
const PAD = 8;
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

function nxt(s: number, a: number): number {
  const { r, c } = rc(s);
  const nr = r + ACTIONS[a].dy;
  const nc = c + ACTIONS[a].dx;
  if (nr < 0 || nr >= N || nc < 0 || nc >= N) return s;
  return idx(nr, nc);
}

function reward(s: number): number {
  if (s === GOAL) return 1;
  if (s === PIT) return -1;
  return -0.02;
}

function backup(V: number[], s: number): number {
  let best = -Infinity;
  for (let a = 0; a < 4; a++) {
    const ns = nxt(s, a);
    const q = reward(ns) + (TERM.has(ns) ? 0 : GAMMA * V[ns]);
    if (q > best) best = q;
  }
  return best;
}

function bellmanError(V: number[], s: number): number {
  if (TERM.has(s)) return 0;
  return Math.abs(backup(V, s) - V[s]);
}

// 前驱表:pred[s2] = 能一步转移到 s2 的状态集合
function buildPredecessors(): number[][] {
  const pred: number[][] = Array.from({ length: N * N }, () => []);
  for (let s = 0; s < N * N; s++) {
    for (let a = 0; a < 4; a++) {
      const ns = nxt(s, a);
      if (!pred[ns].includes(s)) pred[ns].push(s);
    }
  }
  return pred;
}

// 一次「优先扫描」记录:每一步 backup 哪个格子,以及该步之前各格累计被 backup 的次数。
type Step = { cell: number; countsBefore: number[] };

// 用简单数组当优先队列(状态空间小,线性扫足够);确定性,无随机。
function prioritizedTrace(): Step[] {
  const pred = buildPredecessors();
  const V = new Array(N * N).fill(0);
  const counts = new Array(N * N).fill(0);
  // 优先级 = 贝尔曼误差,初始化所有非终止态
  const pri = new Array(N * N).fill(0);
  for (let s = 0; s < N * N; s++) if (!TERM.has(s)) pri[s] = bellmanError(V, s);

  const steps: Step[] = [];
  for (let guard = 0; guard < 500; guard++) {
    // 取当前误差最大的格子(平局取更小索引,确定性)
    let best = -1;
    let bestE = TOL;
    for (let s = 0; s < N * N; s++) {
      if (pri[s] > bestE) {
        bestE = pri[s];
        best = s;
      }
    }
    if (best < 0) break;
    steps.push({ cell: best, countsBefore: counts.slice() });
    V[best] = backup(V, best);
    counts[best]++;
    pri[best] = 0;
    for (const p of pred[best]) {
      if (TERM.has(p)) continue;
      pri[p] = bellmanError(V, p);
    }
  }
  return steps;
}

// 同步(Jacobi 式全表扫描)收敛所需 backup 总数,作为对照基线。
function syncBackupCount(): number {
  let V = new Array(N * N).fill(0);
  let total = 0;
  for (let k = 0; k < 200; k++) {
    const nV = V.slice();
    let d = 0;
    for (let s = 0; s < N * N; s++) {
      if (TERM.has(s)) continue;
      nV[s] = backup(V, s);
      total++;
      d = Math.max(d, Math.abs(nV[s] - V[s]));
    }
    V = nV;
    if (d < TOL) break;
  }
  return total;
}

const TRACE = prioritizedTrace();
const SYNC_TOTAL = syncBackupCount();
const MAX_STEP = TRACE.length;

/** 异步 DP:逐步重放优先扫描的 backup 序列,看算力如何聚焦在「波前」。 */
export default function AsyncDPSweepViz() {
  const [step, setStep] = useState(0);

  // step 步之后各格累计 backup 次数,以及当前正在更新的格子
  const { counts, current, done } = useMemo(() => {
    if (step >= MAX_STEP) {
      // 全部完成:用最后一步的 countsBefore + 最后一次 backup
      const last = TRACE[MAX_STEP - 1];
      const c = last.countsBefore.slice();
      c[last.cell]++;
      return { counts: c, current: -1, done: true };
    }
    const s = TRACE[step];
    return { counts: s.countsBefore, current: s.cell, done: false };
  }, [step]);

  const totalSoFar = counts.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...counts);

  const cellFill = (s: number) => {
    if (s === GOAL) return "#059669";
    if (s === PIT) return "#dc2626";
    const c = counts[s];
    if (c === 0) return "var(--chart-surface)";
    const t = Math.min(1, c / maxCount);
    return `rgba(59, 130, 246, ${0.12 + 0.6 * t})`; // 蓝:被 backup 越多越深
  };

  const savingsPct = Math.round((1 - MAX_STEP / SYNC_TOTAL) * 100);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto h-auto w-full max-w-[300px] rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`优先扫描第 ${step} 步的 backup 分布热力图`}
        >
          {Array.from({ length: N * N }, (_, s) => {
            const { r, c } = rc(s);
            const x = PAD + c * CELL;
            const y = PAD + r * CELL;
            const isCurrent = s === current;
            return (
              <g key={s}>
                <rect
                  x={x + 2}
                  y={y + 2}
                  width={CELL - 4}
                  height={CELL - 4}
                  rx={6}
                  fill={cellFill(s)}
                  stroke={isCurrent ? "var(--chart-accent)" : "var(--chart-grid)"}
                  strokeWidth={isCurrent ? 3 : 1}
                  style={{ transition: "fill 200ms ease-out, stroke-width 150ms ease-out" }}
                />
                {s === GOAL && (
                  <text x={x + CELL / 2} y={y + 30} textAnchor="middle" fontSize={20} fill="#fff">🏁</text>
                )}
                {s === PIT && (
                  <text x={x + CELL / 2} y={y + 30} textAnchor="middle" fontSize={20} fill="#fff">🕳️</text>
                )}
                {s === START && (
                  <text x={x + 6} y={y + 15} fontSize={10} fill="var(--chart-muted)">S</text>
                )}
                {/* 累计 backup 次数 */}
                {!TERM.has(s) && counts[s] > 0 && (
                  <text
                    x={x + CELL / 2}
                    y={y + CELL / 2 + 6}
                    textAnchor="middle"
                    fontSize={16}
                    fontWeight={700}
                    fill="var(--chart-muted)"
                  >
                    {counts[s]}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider
            label="优先扫描 backup 步"
            value={step}
            min={0}
            max={MAX_STEP}
            step={1}
            onChange={(v) => setStep(Math.round(v))}
            decimals={0}
          />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">优先扫描已用 backup</span>
              <span className="font-mono font-semibold">{totalSoFar}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">同步扫描收敛需</span>
              <span className="font-mono font-semibold">{SYNC_TOTAL}</span>
            </div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-300">
              {done
                ? `✓ 优先扫描收敛:共 ${MAX_STEP} 次 backup,比同步省约 ${savingsPct}%`
                : current >= 0
                  ? `正在 backup 格子 #${current}(当前贝尔曼误差最大)…`
                  : "初始:所有非终止格误差相等,从最接近 🏁 的波前起步"}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            颜色越<span className="font-semibold text-blue-500">蓝</span>,该格被 backup 的次数越多。优先扫描
            <b>永远先更新贝尔曼误差最大的格子</b>(<span style={{ color: "var(--chart-accent)" }} className="font-semibold">高亮边框</span>),
            并沿前驱把误差回传——算力自动聚焦在「价值正在变化的波前」,靠近 🏁
            的格子反复更新,远处早收敛的格子几乎不碰。同步扫描则不管误差大小、每轮把
            {N * N - 2} 个格子全扫一遍,做了大量无用功。
          </p>
        </div>
      </div>
    </div>
  );
}
