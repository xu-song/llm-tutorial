"use client";

import { useState, useMemo } from "react";

// LOLA 在迭代囚徒困境涌现 tit-for-tat 的可视化 —— 配合 multi-agent-rl 篇「超越 CTDE:LOLA」小节。
//
// 策略空间:每智能体两参数 (x_C, x_T) = (对手合作时我合作概率, 对手背叛时我合作概率)。
//   - (1, 0) = tit-for-tat 以牙还牙(对手合作则合作、背叛则背叛)
//   - (0, 0) = always defect 永远背叛
//   - (1, 1) = always cooperate 永远合作
// 朴素学习者(一阶)塌缩到 (0,0) 互相背叛;LOLA(二阶穿透对手更新)收敛到 (1,0) tit-for-tat。
//
// 轨迹在模块级用 JS 复现正文 CodeRunner 算法预计算(确定性,无 Math.random,SSR 安全)。
// 交互:切「朴素 vs 朴素 / LOLA vs LOLA」,看两智能体策略点如何从中心 (0.5,0.5) 移动到各自终点。

// —— 复现正文算法(与 CodeRunner 完全一致),模块级预计算轨迹 ——
const Rr = 3.0,
  Tr = 4.0,
  Sr = 0.0,
  Pp = 1.0;
function payoff1(a1: number, a2: number) {
  if (a1 === 1 && a2 === 1) return Rr;
  if (a1 === 1 && a2 === 0) return Sr;
  if (a1 === 0 && a2 === 1) return Tr;
  return Pp;
}
function lstsq4(A: number[][], b: number[]): number[] {
  const m = 4;
  const AtA: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  const Atb = new Array(m).fill(0);
  for (let r = 0; r < A.length; r++)
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) AtA[i][j] += A[r][i] * A[r][j];
      Atb[i] += A[r][i] * b[r];
    }
  const M = AtA.map((row, i) => [...row, Atb[i]]);
  for (let col = 0; col < m; col++) {
    let piv = col;
    for (let r = col + 1; r < m; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    for (let j = col; j <= m; j++) M[col][j] /= d;
    for (let r = 0; r < m; r++) {
      if (r === col) continue;
      const f = M[r][col];
      for (let j = col; j <= m; j++) M[r][j] -= f * M[col][j];
    }
  }
  return M.map((row) => row[m]);
}
function stationary(x1c: number, x1t: number, x2c: number, x2t: number) {
  const states: [number, number][] = [
    [1, 1],
    [1, 0],
    [0, 1],
    [0, 0],
  ];
  const idx = new Map(states.map((s, i) => [s.join(","), i]));
  const M: number[][] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  for (let i = 0; i < 4; i++) {
    const [a1, a2] = states[i];
    const p1c = a2 === 1 ? x1c : x1t;
    const p2c = a1 === 1 ? x2c : x2t;
    for (const na1 of [1, 0])
      for (const na2 of [1, 0])
        M[i][idx.get([na1, na2].join(",")) as number] +=
          (na1 === 1 ? p1c : 1 - p1c) * (na2 === 1 ? p2c : 1 - p2c);
  }
  const AA: number[][] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [1, 1, 1, 1],
  ];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) AA[r][c] = M[c][r] - (r === c ? 1 : 0);
  const pi = lstsq4(AA, [0, 0, 0, 1]);
  return { pi, states };
}
function J1(x1c: number, x1t: number, x2c: number, x2t: number) {
  const { pi, states } = stationary(x1c, x1t, x2c, x2t);
  let v = 0;
  for (let i = 0; i < 4; i++) v += pi[i] * payoff1(states[i][0], states[i][1]);
  return v;
}
function J2(x1c: number, x1t: number, x2c: number, x2t: number) {
  return J1(x2c, x2t, x1c, x1t);
}
function numgrad(f: (a: number, b: number, c: number, d: number) => number, x: number[], eps = 1e-5) {
  const g = [0, 0, 0, 0];
  const call = (v: number[]) => f(v[0], v[1], v[2], v[3]);
  for (let i = 0; i < 4; i++) {
    const xp = x.slice();
    xp[i] += eps;
    const xm = x.slice();
    xm[i] -= eps;
    g[i] = (call(xp) - call(xm)) / (2 * eps);
  }
  return g;
}
const ETA = 0.1;
function naiveGrad(x: number[]) {
  const g = [0, 0, 0, 0];
  const g1 = numgrad(J1, x);
  const g2 = numgrad(J2, x);
  g[0] = g1[0];
  g[1] = g1[1];
  g[2] = g2[2];
  g[3] = g2[3];
  return g;
}
function lolaGrad(x: number[]) {
  const g = [0, 0, 0, 0];
  const dJ1 = numgrad(J1, x);
  const dJ1_dx1 = [dJ1[0], dJ1[1]];
  const dJ1_dx2 = [dJ1[2], dJ1[3]];
  const dg2: number[][] = [
    [0, 0],
    [0, 0],
  ];
  for (let j = 0; j < 2; j++) {
    const xp = x.slice();
    xp[j] += 1e-4;
    const xm = x.slice();
    xm[j] -= 1e-4;
    const gp = numgrad(J2, xp);
    const gm = numgrad(J2, xm);
    dg2[0][j] = (gp[2] - gm[2]) / 2e-4;
    dg2[1][j] = (gp[3] - gm[3]) / 2e-4;
  }
  g[0] = dJ1_dx1[0] + ETA * (dJ1_dx2[0] * dg2[0][0] + dJ1_dx2[1] * dg2[1][0]);
  g[1] = dJ1_dx1[1] + ETA * (dJ1_dx2[0] * dg2[0][1] + dJ1_dx2[1] * dg2[1][1]);
  const dJ2 = numgrad(J2, x);
  const dJ2_dx2 = [dJ2[2], dJ2[3]];
  const dJ2_dx1 = [dJ2[0], dJ2[1]];
  const dg1: number[][] = [
    [0, 0],
    [0, 0],
  ];
  for (let j = 0; j < 2; j++) {
    const xp = x.slice();
    xp[2 + j] += 1e-4;
    const xm = x.slice();
    xm[2 + j] -= 1e-4;
    const gp = numgrad(J1, xp);
    const gm = numgrad(J1, xm);
    dg1[0][j] = (gp[0] - gm[0]) / 2e-4;
    dg1[1][j] = (gp[1] - gm[1]) / 2e-4;
  }
  g[2] = dJ2_dx2[0] + ETA * (dJ2_dx1[0] * dg1[0][0] + dJ2_dx1[1] * dg1[1][0]);
  g[3] = dJ2_dx2[1] + ETA * (dJ2_dx1[0] * dg1[0][1] + dJ2_dx1[1] * dg1[1][1]);
  return g;
}
function run(gradFn: (x: number[]) => number[], steps: number) {
  let x = [0.5, 0.5, 0.5, 0.5];
  const traj1: [number, number][] = [[x[0], x[1]]];
  const traj2: [number, number][] = [[x[2], x[3]]];
  for (let t = 0; t < steps; t++) {
    const g = gradFn(x);
    for (let i = 0; i < 4; i++) x[i] = Math.max(0.01, Math.min(0.99, x[i] + ETA * g[i]));
    if ((t + 1) % 10 === 0) {
      traj1.push([x[0], x[1]]);
      traj2.push([x[2], x[3]]);
    }
  }
  return { final: x, traj1, traj2 };
}

const NAIVE = run(naiveGrad, 200);
const LOLA = run(lolaGrad, 200);

type Mode = "naive" | "lola";
const MODES: Record<Mode, { label: string; data: typeof NAIVE; color1: string; color2: string }> = {
  naive: {
    label: "朴素 vs 朴素",
    data: NAIVE,
    color1: "#ef4444",
    color2: "#f97316",
  },
  lola: {
    label: "LOLA vs LOLA",
    data: LOLA,
    color1: "#10b981",
    color2: "#3b82f6",
  },
};

const W = 420;
const H = 300;
const PADL = 44;
const PADR = 16;
const PADT = 18;
const PADB = 40;
const sx = (v: number) => PADL + v * (W - PADL - PADR);
const sy = (v: number) => H - PADB - v * (H - PADT - PADB);

export default function LolaTitForTatViz() {
  const [mode, setMode] = useState<Mode>("naive");
  const m = MODES[mode];
  const { data } = m;

  const payoff = useMemo(() => {
    const [a, b, c, d] = data.final;
    return {
      j1: J1(a, b, c, d),
      j2: J2(a, b, c, d),
    };
  }, [data]);

  const pathFrom = (traj: [number, number][]) =>
    traj.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`).join(" ");

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-600 dark:text-zinc-300">学习规则:</span>
        {(Object.keys(MODES) as Mode[]).map((k) => (
          <button
            key={k}
            onClick={() => setMode(k)}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              mode === k
                ? "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
            aria-pressed={mode === k}
          >
            {MODES[k].label}
          </button>
        ))}
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          策略 = (对手合作时我合作概率, 对手背叛时我合作概率)
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`迭代囚徒困境策略轨迹:${m.label},两智能体从中心 (0.5,0.5) 出发,${mode === "naive" ? "塌缩到 (0,0) 互相背叛" : "收敛到 (1,0) tit-for-tat 合作"}`}
        >
          {/* 方向箭头:轨迹从起点(中心)流向终点(角落),marker 随当前 mode 配色重渲染 */}
          <defs>
            <marker id="lola-arr1" markerWidth={7} markerHeight={7} refX={5} refY={3.5} orient="auto">
              <path d="M0,0 L6,3.5 L0,7 Z" fill={m.color1} />
            </marker>
            <marker id="lola-arr2" markerWidth={7} markerHeight={7} refX={5} refY={3.5} orient="auto">
              <path d="M0,0 L6,3.5 L0,7 Z" fill={m.color2} />
            </marker>
          </defs>
          {/* 角落标注 */}
          <text x={sx(1)} y={sy(1) - 6} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
            always cooperate
          </text>
          <text x={sx(0)} y={sy(1) - 6} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
            tit-for-tat ✦
          </text>
          <text x={sx(0)} y={sy(0) + 14} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
            always defect
          </text>
          <text x={sx(1)} y={sy(0) + 14} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
            exploit
          </text>

          {/* 坐标轴 */}
          <line x1={PADL} y1={sy(0)} x2={W - PADR} y2={sy(0)} stroke="var(--chart-axis)" strokeWidth={1} />
          <line x1={sx(0)} y1={PADT} x2={sx(0)} y2={H - PADB} stroke="var(--chart-axis)" strokeWidth={1} />
          <text x={(W + PADL) / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
            x_C(对手合作时我合作)
          </text>
          <text
            x={12}
            y={(H + PADT) / 2}
            textAnchor="middle"
            fontSize={10}
            fill="var(--chart-muted)"
            transform={`rotate(-90 12 ${(H + PADT) / 2})`}
          >
            x_T(对手背叛时我合作)
          </text>

          {/* 参考点:tit-for-tat 目标 (1,0) */}
          <circle cx={sx(1)} cy={sy(0)} r={3} fill="var(--chart-grid)" />
          <text x={sx(1) + 6} y={sy(0) - 4} fontSize={9} fill="var(--chart-muted)">
            (1,0)
          </text>

          {/* 轨迹:智能体 1(蓝/绿) */}
          <path d={pathFrom(data.traj1)} fill="none" stroke={m.color1} strokeWidth={2} strokeLinecap="round" opacity={0.85} markerEnd="url(#lola-arr1)" />
          {/* 轨迹:智能体 2(橙/蓝) */}
          <path d={pathFrom(data.traj2)} fill="none" stroke={m.color2} strokeWidth={2} strokeLinecap="round" opacity={0.85} markerEnd="url(#lola-arr2)" />

          {/* 起点 */}
          <circle data-smooth cx={sx(0.5)} cy={sy(0.5)} r={4} fill="var(--chart-muted)" opacity={0.6} />
          {/* 终点:两智能体 */}
          <circle
            data-smooth
            cx={sx(data.final[0])}
            cy={sy(data.final[1])}
            r={6}
            fill={m.color1}
            stroke="white"
            strokeWidth={1.5}
          />
          <circle
            data-smooth
            cx={sx(data.final[2])}
            cy={sy(data.final[3])}
            r={6}
            fill={m.color2}
            stroke="white"
            strokeWidth={1.5}
          />
        </svg>

        <div className="flex flex-col justify-center gap-2 text-xs">
          <div className="rounded-md bg-chart-surface p-2.5 shadow-sm">
            <div className="mb-1 font-semibold text-zinc-700 dark:text-zinc-200">最终策略</div>
            <div className="font-mono text-[11px]" style={{ color: m.color1 }}>
              P1: ({data.final[0].toFixed(2)}, {data.final[1].toFixed(2)})
            </div>
            <div className="font-mono text-[11px]" style={{ color: m.color2 }}>
              P2: ({data.final[2].toFixed(2)}, {data.final[3].toFixed(2)})
            </div>
          </div>
          <div className="rounded-md bg-chart-surface p-2.5 shadow-sm">
            <div className="mb-1 font-semibold text-zinc-700 dark:text-zinc-200">平均收益</div>
            <div className="font-mono text-[11px]" style={{ color: m.color1 }}>
              P1: {payoff.j1.toFixed(2)}
            </div>
            <div className="font-mono text-[11px]" style={{ color: m.color2 }}>
              P2: {payoff.j2.toFixed(2)}
            </div>
            <div className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
              {mode === "naive"
                ? "≈ 1 = 互相背叛 (P)"
                : payoff.j1 > 1.5
                ? "≈ 2 > 1,逃出互相惩罚"
                : ""}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            {mode === "naive" ? (
              <>
                朴素学习者只看单步收益,背叛是占优选择 → 两智能体都塌缩到 <b className="text-zinc-600 dark:text-zinc-300">(0,0)</b>,互相背叛。
              </>
            ) : (
              <>
                LOLA 二阶项让智能体意识到「我合作会引导对手也合作」→ 收敛到 <b className="text-zinc-600 dark:text-zinc-300">(1,0) = tit-for-tat</b>,从背叛逃到合作。
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
