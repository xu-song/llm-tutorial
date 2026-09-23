"use client";

import { useState, useMemo } from "react";
import { makeRng } from "@/lib/prng";

// 网格世界 Q-learning 可视化。
// 4×4 网格:S 起点(左上),G 目标(+1,右下),X 陷阱(-1)。
// 每格显示学到的最优动作箭头,颜色深浅表示该格的状态价值 max_a Q(s,a)。
// 训练用固定种子的伪随机(渲染期无 Math.random),SSR/水合安全。

const N = 4; // 网格边长
const GOAL = 15; // 右下
const PIT = 9; // 一个陷阱
const START = 0;
const CELL = 74;
const PAD = 8;
const SIZE = N * CELL + 2 * PAD;

// 动作:上、右、下、左
const ACTIONS = [
  { dx: 0, dy: -1, name: "↑" },
  { dx: 1, dy: 0, name: "→" },
  { dx: 0, dy: 1, name: "↓" },
  { dx: -1, dy: 0, name: "←" },
];

const rc = (s: number) => ({ r: Math.floor(s / N), c: s % N });
const idx = (r: number, c: number) => r * N + c;

// 状态转移:撞墙则留在原地
function step(s: number, a: number): number {
  const { r, c } = rc(s);
  const nr = r + ACTIONS[a].dy;
  const nc = c + ACTIONS[a].dx;
  if (nr < 0 || nr >= N || nc < 0 || nc >= N) return s;
  return idx(nr, nc);
}

function reward(s: number): number {
  if (s === GOAL) return 1;
  if (s === PIT) return -1;
  return -0.02; // 每走一步小惩罚,鼓励尽快到达
}

// 固定种子的线性同余 PRNG —— 保证训练可复现、渲染期确定
// 跑 episodes 轮 Q-learning,返回 Q 表(展平:state*4 + action)
function trainQ(episodes: number): number[] {
  const Q = new Array(N * N * 4).fill(0);
  const rng = makeRng(42);
  const alpha = 0.5; // 学习率
  const gamma = 0.9; // 折扣
  for (let ep = 0; ep < episodes; ep++) {
    let s = START;
    const eps = Math.max(0.05, 0.5 - ep / (episodes * 2)); // ε 逐步衰减
    for (let t = 0; t < 60; t++) {
      if (s === GOAL || s === PIT) break;
      // ε-greedy 选动作
      let a: number;
      if (rng() < eps) {
        a = Math.floor(rng() * 4);
      } else {
        a = 0;
        for (let k = 1; k < 4; k++) if (Q[s * 4 + k] > Q[s * 4 + a]) a = k;
      }
      const ns = step(s, a);
      const r = reward(ns);
      const maxNext = Math.max(Q[ns * 4], Q[ns * 4 + 1], Q[ns * 4 + 2], Q[ns * 4 + 3]);
      const done = ns === GOAL || ns === PIT;
      Q[s * 4 + a] += alpha * (r + (done ? 0 : gamma * maxNext) - Q[s * 4 + a]);
      s = ns;
    }
  }
  return Q;
}

/** 网格世界 Q-learning:点击「多训练」看智能体从乱走到学出通往目标的最优策略。 */
export default function RLGridWorld() {
  const [episodes, setEpisodes] = useState(0);

  const { Q, values, bestA } = useMemo(() => {
    const Q = trainQ(episodes);
    const values: number[] = [];
    const bestA: number[] = [];
    for (let s = 0; s < N * N; s++) {
      let ba = 0;
      for (let k = 1; k < 4; k++) if (Q[s * 4 + k] > Q[s * 4 + ba]) ba = k;
      bestA.push(ba);
      values.push(Math.max(Q[s * 4], Q[s * 4 + 1], Q[s * 4 + 2], Q[s * 4 + 3]));
    }
    return { Q, values, bestA };
  }, [episodes]);

  // 从起点按贪心策略走出的路径(供高亮)
  const path = useMemo(() => {
    if (episodes === 0) return [];
    const seen = new Set<number>();
    const p: number[] = [START];
    let s = START;
    for (let t = 0; t < 20; t++) {
      if (s === GOAL || s === PIT || seen.has(s)) break;
      seen.add(s);
      s = step(s, bestA[s]);
      p.push(s);
    }
    return p;
  }, [episodes, bestA]);

  const maxV = Math.max(0.01, ...values.map((v) => Math.abs(v)));

  const cellFill = (s: number) => {
    if (s === GOAL) return "#059669";
    if (s === PIT) return "#dc2626";
    const v = values[s];
    if (episodes === 0 || v === 0) return "var(--chart-surface)";
    // 正价值→绿,负→红,深浅按幅度
    const t = Math.min(1, Math.abs(v) / maxV);
    return v > 0
      ? `rgba(16, 185, 129, ${0.12 + 0.5 * t})`
      : `rgba(239, 68, 68, ${0.12 + 0.5 * t})`;
  };

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`网格世界 Q-learning:训练 ${episodes} 回合后,各格子的状态价值(绿正红负)与学到的贪心路径(橙色高亮,从 S 通往 🏁 绕开 🕳️)`}
        >
          {Array.from({ length: N * N }, (_, s) => {
            const { r, c } = rc(s);
            const x = PAD + c * CELL;
            const y = PAD + r * CELL;
            const onPath = path.includes(s);
            return (
              <g key={s}>
                <rect
                  x={x + 2}
                  y={y + 2}
                  width={CELL - 4}
                  height={CELL - 4}
                  rx={6}
                  data-smooth
                  fill={cellFill(s)}
                  stroke={onPath ? "var(--chart-accent)" : "var(--chart-grid)"}
                  strokeWidth={onPath ? 3 : 1}
                />
                {/* 特殊格标签 */}
                {s === GOAL && (
                  <text x={x + CELL / 2} y={y + CELL / 2 + 6} textAnchor="middle" fontSize={20} fill="#fff">🏁</text>
                )}
                {s === PIT && (
                  <text x={x + CELL / 2} y={y + CELL / 2 + 6} textAnchor="middle" fontSize={20} fill="#fff">🕳️</text>
                )}
                {s === START && (
                  <text x={x + 6} y={y + 16} fontSize={11} fill="var(--chart-muted)">S</text>
                )}
                {/* 最优动作箭头(仅普通格、已训练) */}
                {episodes > 0 && s !== GOAL && s !== PIT && values[s] !== 0 && (
                  <text
                    x={x + CELL / 2}
                    y={y + CELL / 2 + 7}
                    textAnchor="middle"
                    fontSize={22}
                    fill="var(--chart-fg)"
                  >
                    {ACTIONS[bestA[s]].name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col justify-center gap-4">
          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">已训练回合</span>
              <span className="font-mono">{episodes}</span>
            </div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-300">
              {episodes === 0
                ? "还没训练,策略是空的"
                : path[path.length - 1] === GOAL
                  ? "✓ 已学会通往 🏁 的路径(橙色高亮)"
                  : "策略还在成形,继续训练…"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEpisodes((n) => n + 20)}
              className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              训练 20 回合 →
            </button>
            <button
              onClick={() => setEpisodes((n) => n + 200)}
              className="flex-1 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
            >
              +200 回合
            </button>
            <button
              onClick={() => setEpisodes(0)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
            >
              重置
            </button>
          </div>

          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            🏁 目标(+1)、🕳️ 陷阱(−1)、S 起点。箭头是每格学到的最优动作,
            格子越绿表示价值越高。反复训练,智能体会自己摸索出一条避开陷阱、通往目标的路。
          </p>
        </div>
      </div>
    </div>
  );
}
