"use client";

import { useState, useMemo } from "react";

// VDN 加法分解的表达力边界:2 智能体 × 2 动作的合作任务。
// 真实联合价值 Q*(a1,a2) 是 2×2 矩阵;VDN 假设 Q_tot = q1(a1) + q2(a2)(可加)。
// 用最小二乘拟合最优的 (q1,q2),看:
//   · 可加任务:VDN 精确拟合,去中心化各自 argmax q_i 拼出全局最优 (IGM 成立);
//   · 协同任务:增量依赖对方 → 不可加 → VDN 必有误差,去中心化贪婪可能选到最差格。
// 这就是 VDN→QMIX 的动机:QMIX 用"单调混合"扩表达力,但仍受单调性约束。
// 纯解析(闭式最小二乘),渲染期无随机,SSR 安全。

type Task = { name: string; Q: number[][]; note: string };
const TASKS: Task[] = [
  {
    name: "可加任务",
    Q: [
      [1, 2],
      [3, 4],
    ],
    note: "增量与对方无关 → VDN 可精确表达",
  },
  {
    name: "协同任务",
    Q: [
      [0, 4],
      [4, 1],
    ],
    note: "一方该 0 一方该 1(增量依赖对方)→ VDN 拟合失败",
  },
  {
    name: "错位协同",
    Q: [
      [1, 5],
      [5, 2],
    ],
    note: "两人须选不同动作才高分 → 加法摊平,贪婪反选到都选同动作",
  },
];

// VDN 最优可加拟合:固定 q1[0]=0,最小二乘解 q1[1],q2[0],q2[1]
function vdnFit(Q: number[][]): { q1: number[]; q2: number[]; Qtot: number[][] } {
  // 参数 p=[q1_1, q2_0, q2_1];设计矩阵行对应 (i,j)
  // Qtot[i][j] = (i==1? q1_1:0) + (j==0? q2_0: q2_1)
  // 用正规方程解 3×3(样本少,直接手写)
  const rows: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const r = [i === 1 ? 1 : 0, j === 0 ? 1 : 0, j === 1 ? 1 : 0];
      rows.push(r);
      y.push(Q[i][j]);
    }
  }
  // 正规方程 AᵀA p = Aᵀy
  const AtA = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const Aty = [0, 0, 0];
  for (let k = 0; k < rows.length; k++) {
    for (let a = 0; a < 3; a++) {
      Aty[a] += rows[k][a] * y[k];
      for (let b = 0; b < 3; b++) AtA[a][b] += rows[k][a] * rows[k][b];
    }
  }
  const p = solve3(AtA, Aty);
  const q1 = [0, p[0]];
  const q2 = [p[1], p[2]];
  const Qtot = [
    [q1[0] + q2[0], q1[0] + q2[1]],
    [q1[1] + q2[0], q1[1] + q2[1]],
  ];
  return { q1, q2, Qtot };
}

// 3×3 线性方程组高斯消元(带部分主元)
function solve3(A: number[][], b: number[]): number[] {
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < 3; c++) {
    let piv = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c] || 1e-9;
    for (let j = c; j < 4; j++) M[c][j] /= d;
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = M[r][c];
      for (let j = c; j < 4; j++) M[r][j] -= f * M[c][j];
    }
  }
  return [M[0][3], M[1][3], M[2][3]];
}

const W = 460;
const H = 210;
const CELL = 62;
const GAP = 8;

/** VDN 加法分解表达力边界:切换任务,看真实 Q* 与 VDN 拟合的差,以及去中心化贪婪落到哪格。 */
export default function QMixMonotonicViz() {
  const [taskIdx, setTaskIdx] = useState(1);
  const task = TASKS[taskIdx];

  const { q1, q2, Qtot, gA1, gA2, trueBest } = useMemo(() => {
    const { q1, q2, Qtot } = vdnFit(task.Q);
    const gA1 = q1[1] > q1[0] ? 1 : 0; // 各智能体独立 argmax
    const gA2 = q2[1] > q2[0] ? 1 : 0;
    // 真实全局最优格
    let bi = 0;
    let bj = 0;
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) if (task.Q[i][j] > task.Q[bi][bj]) [bi, bj] = [i, j];
    return { q1, q2, Qtot, gA1, gA2, trueBest: [bi, bj] as [number, number] };
  }, [task]);

  const chosenQ = task.Q[gA1][gA2];
  const bestQ = task.Q[trueBest[0]][trueBest[1]];
  const optimal = gA1 === trueBest[0] && gA2 === trueBest[1];

  // 画一个 2×2 矩阵,x0/y0 左上角
  const grid = (
    x0: number,
    y0: number,
    M: number[][],
    title: string,
    highlight: [number, number] | null,
    highlightColor: string,
  ) => {
    const cells = [];
    let lo = Infinity;
    let hi = -Infinity;
    for (const row of M) for (const v of row) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const t = hi > lo ? (M[i][j] - lo) / (hi - lo) : 0.5;
        const x = x0 + j * (CELL + GAP);
        const y = y0 + i * (CELL + GAP);
        const isHi = highlight && highlight[0] === i && highlight[1] === j;
        cells.push(
          <g key={`${i}-${j}`}>
            <rect
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx={5}
              data-smooth
              fill={`rgba(16,185,129,${0.12 + 0.55 * t})`}
              stroke={isHi ? highlightColor : "var(--chart-grid)"}
              strokeWidth={isHi ? 3 : 1}
            />
            <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--chart-fg)" data-smooth>
              {M[i][j].toFixed(1)}
            </text>
          </g>,
        );
      }
    }
    return (
      <g>
        <text x={x0 + CELL + GAP / 2} y={y0 - 20} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--chart-muted)">
          {title}
        </text>
        {/* 动作标签 */}
        <text x={x0 - 8} y={y0 + CELL / 2 + 4} textAnchor="end" fontSize={9} fill="var(--chart-muted)">a₁=0</text>
        <text x={x0 - 8} y={y0 + CELL + GAP + CELL / 2 + 4} textAnchor="end" fontSize={9} fill="var(--chart-muted)">a₁=1</text>
        <text x={x0 + CELL / 2} y={y0 - 5} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">a₂=0</text>
        <text x={x0 + CELL + GAP + CELL / 2} y={y0 - 5} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">a₂=1</text>
        {cells}
      </g>
    );
  };

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TASKS.map((t, i) => (
          <button
            key={t.name}
            type="button"
            onClick={() => setTaskIdx(i)}
            aria-pressed={taskIdx === i}
            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
              taskIdx === i
                ? "bg-emerald-600 text-white"
                : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="viz-smooth mx-auto h-auto w-full max-w-full rounded-lg bg-chart-surface shadow-sm"
        role="img"
        aria-label={`${task.name}下,真实 Q* 与 VDN 加法拟合的对比,去中心化贪婪选到 (${gA1},${gA2}),真实 Q*=${chosenQ}`}
      >
        {grid(64, 44, task.Q, "真实 Q*(a₁,a₂)", trueBest, "#f59e0b")}
        {grid(276, 44, Qtot, "VDN 拟合 q₁+q₂", [gA1, gA2], optimal ? "#10b981" : "#ef4444")}
        {/* 箭头连接 */}
        <text x={242} y={110} textAnchor="middle" fontSize={16} fill="var(--chart-muted)">→</text>
      </svg>

      <div className="mt-3 rounded-md bg-chart-surface p-3 text-sm shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-zinc-500 dark:text-zinc-400">{task.note}</span>
          <span className="font-mono text-[13px]">
            去中心化贪婪 (a₁,a₂)=({gA1},{gA2}) → 真实 Q*=
            <b className={optimal ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
              {" "}
              {chosenQ.toFixed(1)}
            </b>
            <span className="text-zinc-400"> / 全局最优 {bestQ.toFixed(1)}</span>
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
          VDN 假设 <span className="font-mono">Q_tot = q₁(a₁) + q₂(a₂)</span>(可加)。<b>可加任务</b>里它精确拟合、
          各智能体独立 <span className="font-mono">argmax qᵢ</span> 拼出全局最优(<b>IGM 成立</b>);但<b>协同任务</b>里「增量依赖对方」,
          加法分解<b>摊平</b>了矩阵——VDN 拟合值全都接近、去中心化贪婪甚至选到<b className="text-red-600 dark:text-red-400">最差格</b>。
          这正是 QMIX 用<b>单调混合</b> <span className="font-mono">f_mix(q₁,…,q_N)</span> 扩表达力的动机(非负权重保 IGM),
          但单调性本身仍表达不了<b>非单调</b>交互——QPLEX 等再放松。
        </p>
      </div>
    </div>
  );
}
