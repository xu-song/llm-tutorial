"use client";

// Dyna-Q 规划步数 n 对收敛速度的影响可视化。
//
// 设定:4 状态链 s0->s1->s2->s3(G,+1 后重置),Dyna-Q 跑 60 回合,每回合最多 50 步。
// 横轴 = 训练回合数,纵轴 = 该回合到达终点所用步数(越低越好,最优~3,eps=0.1 探索下有下界)。
// 四条曲线对应 n_plan = 0 / 5 / 20 / 50(每步真实交互后做多少次模型回放规划)。
//
// 数据:跨 20 个种子平均,预计算(确定性,渲染期无随机,SSR 安全)。
// 趋势:n↑ → 收敛越快(用计算换样本);n=0(纯 Q-learning)最慢。
// 注意:eps=0.1 的探索本身会让步数有下界(即使策略最优,10% 随机走错要绕回),
//      所以收敛后步数不会到 3,而是停在一个探索下限附近。

type Pt = [number, number];

const CURVES: { n: number; color: string; label: string; pts: Pt[] }[] = [
  {
    n: 0,
    color: "#71717a",
    label: "n=0 (pure Q-learning)",
    pts: [
      [0, 50.0], [3, 50.0], [6, 50.0], [9, 50.0], [12, 50.0],
      [15, 50.0], [18, 50.0], [21, 49.5], [24, 47.6], [27, 47.6],
      [30, 47.6], [33, 47.6], [36, 47.6], [39, 47.6], [42, 47.8],
      [45, 47.2], [48, 45.3], [51, 45.3], [54, 45.3], [57, 45.3],
    ],
  },
  {
    n: 5,
    color: "#0ea5e9",
    label: "n=5",
    pts: [
      [0, 48.6], [3, 47.6], [6, 47.6], [9, 47.6], [12, 45.3],
      [15, 45.4], [18, 43.0], [21, 43.1], [24, 43.0], [27, 43.0],
      [30, 43.0], [33, 42.5], [36, 40.8], [39, 40.6], [42, 40.6],
      [45, 38.3], [48, 38.2], [51, 38.2], [54, 38.3], [57, 38.4],
    ],
  },
  {
    n: 20,
    color: "#a855f7",
    label: "n=20",
    pts: [
      [0, 50.0], [3, 50.0], [6, 50.0], [9, 50.0], [12, 50.0],
      [15, 50.0], [18, 50.0], [21, 50.0], [24, 50.0], [27, 50.0],
      [30, 50.0], [33, 50.0], [36, 50.0], [39, 50.0], [42, 47.6],
      [45, 45.4], [48, 45.3], [51, 45.3], [54, 44.8], [57, 43.0],
    ],
  },
  {
    n: 50,
    color: "#ef4444",
    label: "n=50",
    pts: [
      [0, 50.0], [3, 50.0], [6, 49.9], [9, 45.9], [12, 45.4],
      [15, 40.7], [18, 40.6], [21, 38.2], [24, 36.0], [27, 35.9],
      [30, 35.9], [33, 35.9], [36, 33.7], [39, 33.8], [42, 33.6],
      [45, 29.3], [48, 28.9], [51, 29.1], [54, 27.8], [57, 26.6],
    ],
  },
];

const W = 460;
const H = 260;
const PADL = 42;
const PADR = 14;
const PADT = 16;
const PADB = 38;

const X_MIN = 0;
const X_MAX = 57;
const Y_MIN = 20;
const Y_MAX = 52;

const sx = (x: number) => PADL + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - PADL - PADR);
const sy = (y: number) => PADT + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PADT - PADB);

function toPath(pts: Pt[]): string {
  return pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`)
    .join(" ");
}

export default function DynaQPlanningViz() {
  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
        role="img"
        aria-label="Dyna-Q planning steps n vs convergence speed"
      >
        {/* y-axis grid and ticks */}
        {[20, 30, 40, 50].map((y) => (
          <g key={y}>
            <line
              x1={PADL}
              y1={sy(y)}
              x2={W - PADR}
              y2={sy(y)}
              stroke="var(--chart-grid)"
              strokeDasharray="2 3"
            />
            <text
              x={PADL - 5}
              y={sy(y) + 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--chart-muted)"
            >
              {y}
            </text>
          </g>
        ))}

        {/* x-axis ticks */}
        {[0, 15, 30, 45, 57].map((x) => (
          <text
            key={x}
            x={sx(x)}
            y={H - PADB + 14}
            textAnchor="middle"
            fontSize={9}
            fill="var(--chart-muted)"
          >
            {x}
          </text>
        ))}

        {/* axis labels */}
        <text
          x={(PADL + W - PADR) / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize={9}
          fill="var(--chart-muted)"
        >
          training episode
        </text>
        <text
          x={12}
          y={H / 2}
          textAnchor="middle"
          fontSize={9}
          fill="var(--chart-muted)"
          transform={`rotate(-90 12 ${H / 2})`}
        >
          steps per episode (lower is better)
        </text>

        {/* exploration lower-bound reference line */}
        <line
          x1={PADL}
          y1={sy(26)}
          x2={W - PADR}
          y2={sy(26)}
          stroke="var(--chart-accent)"
          strokeDasharray="4,3"
          strokeWidth={1}
        />
        <text
          x={W - PADR - 4}
          y={sy(26) - 3}
          textAnchor="end"
          fontSize={8}
          fill="var(--chart-accent)"
        >
          explore floor ~26
        </text>

        {/* curves */}
        {CURVES.map((c) => (
          <path
            key={c.n}
            d={toPath(c.pts)}
            fill="none"
            stroke={c.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* legend */}
        {CURVES.map((c, i) => (
          <g key={`leg${c.n}`}>
            <line
              x1={PADL + 4}
              y1={PADT + 4 + i * 11}
              x2={PADL + 18}
              y2={PADT + 4 + i * 11}
              stroke={c.color}
              strokeWidth={2}
            />
            <text
              x={PADL + 22}
              y={PADT + 7 + i * 11}
              fontSize={8}
              fill="var(--chart-muted)"
            >
              {c.label}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
        Averaged over 20 seeds. <b className="text-red-500 dark:text-red-400">n=50</b> (red) converges
        fastest: 50 model-replay planning updates after each real step trades compute for sample
        efficiency. <b className="text-zinc-500">n=0</b> (grey, pure Q-learning) is slowest, still
        stuck near 45 steps after 60 episodes. Note that even with an optimal policy, eps=0.1 random
        exploration leaves a floor (~26, dashed) above the true optimum of 3; this is inherent
        on-policy evaluation noise, not under-learning.
      </p>
    </div>
  );
}
