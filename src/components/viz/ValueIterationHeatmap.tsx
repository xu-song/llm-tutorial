"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 价值迭代热力图:在 4×4 网格上逐 sweep 重放贝尔曼最优备份,
// 用颜色深浅显示 V(s) 如何从目标「倒灌」回起点,并画出当前贪心策略箭头。
// 纯确定性派生,渲染期无随机,SSR 安全。

const N = 4;
const GOAL = 15;
const PIT = 9;
const START = 0;
const GAMMA = 0.9;
const TERM = new Set([GOAL, PIT]);

const CELL = 74;
const PAD = 8;
const SIZE = N * CELL + 2 * PAD;

// 动作:上 右 下 左
const ACTIONS = [
  { dx: 0, dy: -1, name: "↑" },
  { dx: 1, dy: 0, name: "→" },
  { dx: 0, dy: 1, name: "↓" },
  { dx: -1, dy: 0, name: "←" },
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

// 价值迭代:返回每个 sweep 结束时的 V 快照(含 sweep 0 = 全 0)
function valueIterationSnapshots(maxSweeps: number): number[][] {
  let V = new Array(N * N).fill(0);
  const snaps: number[][] = [V.slice()];
  for (let k = 0; k < maxSweeps; k++) {
    const nV = V.slice();
    for (let s = 0; s < N * N; s++) {
      if (TERM.has(s)) continue;
      let best = -Infinity;
      for (let a = 0; a < 4; a++) {
        const ns = nxt(s, a);
        const q = reward(ns) + (TERM.has(ns) ? 0 : GAMMA * V[ns]);
        if (q > best) best = q;
      }
      nV[s] = best;
    }
    V = nV;
    snaps.push(V.slice());
  }
  return snaps;
}

const MAX_SWEEPS = 7; // 该网格 7 次 sweep 收敛
const SNAPS = valueIterationSnapshots(MAX_SWEEPS);

/** 价值迭代热力图:拖 sweep 看 V(s) 从目标倒灌回起点。 */
export default function ValueIterationHeatmap() {
  const [sweep, setSweep] = useState(0);
  const V = SNAPS[sweep];

  // 当前 V 下的贪心动作(用于箭头)
  const bestA = useMemo(() => {
    return Array.from({ length: N * N }, (_, s) => {
      if (TERM.has(s)) return -1;
      let ba = 0;
      let best = -Infinity;
      for (let a = 0; a < 4; a++) {
        const ns = nxt(s, a);
        const q = reward(ns) + (TERM.has(ns) ? 0 : GAMMA * V[ns]);
        if (q > best) {
          best = q;
          ba = a;
        }
      }
      return ba;
    });
  }, [V]);

  const maxAbs = Math.max(0.01, ...V.map((v) => Math.abs(v)));

  const cellFill = (s: number) => {
    if (s === GOAL) return "#059669";
    if (s === PIT) return "#dc2626";
    const v = V[s];
    if (v === 0) return "var(--chart-surface)";
    const t = Math.min(1, Math.abs(v) / maxAbs);
    return v > 0
      ? `rgba(16, 185, 129, ${0.12 + 0.55 * t})`
      : `rgba(239, 68, 68, ${0.12 + 0.55 * t})`;
  };

  const converged = sweep >= MAX_SWEEPS;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto h-auto w-full max-w-[300px] rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`价值迭代第 ${sweep} 次 sweep 的状态价值热力图`}
        >
          {Array.from({ length: N * N }, (_, s) => {
            const { r, c } = rc(s);
            const x = PAD + c * CELL;
            const y = PAD + r * CELL;
            return (
              <g key={s}>
                <rect
                  x={x + 2}
                  y={y + 2}
                  width={CELL - 4}
                  height={CELL - 4}
                  rx={6}
                  fill={cellFill(s)}
                  stroke="var(--chart-grid)"
                  strokeWidth={1}
                />
                {s === GOAL && (
                  <text x={x + CELL / 2} y={y + 26} textAnchor="middle" fontSize={20} fill="#fff">🏁</text>
                )}
                {s === PIT && (
                  <text x={x + CELL / 2} y={y + 26} textAnchor="middle" fontSize={20} fill="#fff">🕳️</text>
                )}
                {s === START && (
                  <text x={x + 6} y={y + 15} fontSize={10} fill="var(--chart-muted)">S</text>
                )}
                {/* 价值数字 */}
                {!TERM.has(s) && V[s] !== 0 && (
                  <text
                    x={x + CELL / 2}
                    y={y + CELL - 22}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill="var(--chart-muted)"
                  >
                    {V[s].toFixed(2)}
                  </text>
                )}
                {/* 贪心箭头(有价值后才显示) */}
                {!TERM.has(s) && V[s] !== 0 && (
                  <text
                    x={x + CELL / 2}
                    y={y + CELL - 6}
                    textAnchor="middle"
                    fontSize={16}
                    fill="var(--chart-accent)"
                  >
                    {ACTIONS[bestA[s]].name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider
            label="价值迭代 sweep"
            value={sweep}
            min={0}
            max={MAX_SWEEPS}
            step={1}
            onChange={(v) => setSweep(Math.round(v))}
            decimals={0}
          />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">当前 sweep</span>
              <span className="font-mono font-semibold">{sweep} / {MAX_SWEEPS}</span>
            </div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-300">
              {sweep === 0
                ? "初始 V 全为 0,还没有任何信息"
                : converged
                  ? "✓ 已收敛:V 不再变化,箭头即最优策略"
                  : "价值正从 🏁 一圈圈「倒灌」回起点…"}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            每次 sweep 对每格做一次贝尔曼最优备份。信息从目标 🏁
            出发,<b>每轮向外扩散一圈</b>——第 k 次 sweep 后,距目标 k 步内的格子才「知道」该往哪走。
            绿色越深价值越高,<span style={{ color: "var(--chart-accent)" }} className="font-semibold">箭头</span>是当前贪心策略。
            约 {MAX_SWEEPS} 轮后价值稳定,箭头就是最优路径。
          </p>
        </div>
      </div>
    </div>
  );
}
