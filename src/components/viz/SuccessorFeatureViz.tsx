"use client";

import { useState, useMemo } from "react";
import { makeRng } from "@/lib/prng";

// successor features 零样本任务迁移可视化 —— 配合 dqn 篇「UVF 与 successor features」小节。
//
// 核心:psi_pi(s,a) 只依赖动力学(任务无关),Q(s,a) = psi(s,a) . w。
// 切换任务(换 w)立刻得到新 Q、新贪婪策略,不重学 psi。
//
// 设定:4 状态链 s=0..3,两端吸收,2 动作(0=左,1=右),gamma=0.9。
//   特征 phi(s,a) = [向左指示, 向右指示, 中间状态指示] in R^3。
//   两个任务同动力学、只奖励变:
//     w_A = [0, 1, 0.1]  偏右 + 中间小奖
//     w_B = [1, 0, 0.1]  偏左 + 中间小奖
//   psi 用均匀行为策略 TD 学得(固定种子,SSR 安全,渲染期无 Math.random)。
//
// 交互:切换任务 A/B,看 Q 条形与贪婪箭头随之翻转,而 psi 面板纹丝不动。

const N = 4;
const GAMMA = 0.9;

function step(s: number, a: number): number {
  if (s === 0 || s === N - 1) return s;
  return a === 0 ? Math.max(0, s - 1) : Math.min(N - 1, s + 1);
}

function phi(s: number, a: number): [number, number, number] {
  return [a === 0 ? 1 : 0, a === 1 ? 1 : 0, 0 < s && s < N - 1 ? 1 : 0];
}

// 确定性学 psi(任务无关)。固定种子,服务端/客户端一致。
function learnPsi(): number[][][] {
  const rng = makeRng(20260702);
  const psi: number[][][] = Array.from({ length: N }, () =>
    Array.from({ length: 2 }, () => [0, 0, 0])
  );
  const alpha = 0.05;
  for (let ep = 0; ep < 20000; ep++) {
    let s = Math.floor(rng() * N);
    for (let _t = 0; _t < 50; _t++) {
      const a = Math.floor(rng() * 2);
      const ns = step(s, a);
      const ph = phi(s, a);
      // psi[s,a] += alpha * (phi + gamma * mean_a' psi[ns,a'] - psi[s,a])
      const meanNext = [0, 0, 0];
      for (const pa of psi[ns]) for (let d = 0; d < 3; d++) meanNext[d] += pa[d] / 2;
      for (let d = 0; d < 3; d++) {
        psi[s][a][d] += alpha * (ph[d] + GAMMA * meanNext[d] - psi[s][a][d]);
      }
      s = ns;
      if (s === 0 || s === N - 1) break;
    }
  }
  return psi;
}

const PSI = learnPsi();

const TASKS = {
  A: { w: [0.0, 1.0, 0.1], name: "任务 A", desc: "w=[0,1,0.1] 偏右 + 中间小奖" },
  B: { w: [1.0, 0.0, 0.1], name: "任务 B", desc: "w=[1,0,0.1] 偏左 + 中间小奖" },
} as const;

type TaskKey = keyof typeof TASKS;

// 几何
const W = 480;
const H = 250;
const PADL = 36;
const PADR = 16;
const PADT = 28;
const PADB = 30;
const stateX = (s: number) =>
  PADL + (s + 0.5) * ((W - PADL - PADR) / N);

// Q 条形:每状态两根(左/右),归一化到本任务最大绝对值
export default function SuccessorFeatureViz() {
  const [task, setTask] = useState<TaskKey>("A");

  const { Q, maxAbs, greedy } = useMemo(() => {
    const w = TASKS[task].w;
    const q: number[][] = PSI.map((psis) => psis.map((p) => p[0] * w[0] + p[1] * w[1] + p[2] * w[2]));
    let ma = 1e-6;
    for (const row of q) for (const v of row) ma = Math.max(ma, Math.abs(v));
    const g = q.map((row) => (row[0] >= row[1] ? 0 : 1));
    return { Q: q, maxAbs: ma, greedy: g };
  }, [task]);

  const barW = ((W - PADL - PADR) / N) * 0.28;
  const qTop = PADT;
  const qBot = H - PADB - 44; // 条形区域底
  const qMid = (qTop + qBot) / 2;
  const qScale = (qBot - qTop) / 2 / maxAbs;
  const sy = (v: number) => qMid - v * qScale;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-600 dark:text-zinc-300">切换任务(只换 w,不重学 ψ):</span>
        {(Object.keys(TASKS) as TaskKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTask(k)}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              task === k
                ? "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
            aria-pressed={task === k}
          >
            {TASKS[k].name}
          </button>
        ))}
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{TASKS[task].desc}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <svg
          viewBox={`0  0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`successor features 任务迁移演示:当前 ${TASKS[task].name},Q(s,a)=ψ·w,贪婪策略随 w 切换而翻转,ψ 不变`}
        >
          {/* 零线 */}
          <line x1={PADL} y1={qMid} x2={W - PADR} y2={qMid} stroke="var(--chart-axis)" strokeWidth={1} />
          {/* 状态分隔 + 标签 */}
          {Array.from({ length: N }, (_, s) => (
            <text key={`sl-${s}`} x={stateX(s)} y={qTop - 8} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
              s={s}
            </text>
          ))}

          {/* Q 条形:每状态 [左, 右] */}
          {Q.map((row, s) => {
            const cx = stateX(s);
            const xL = cx - barW - 1;
            const xR = cx + 1;
            const greedyA = greedy[s];
            return (
              <g key={`q-${s}`}>
                {/* 左动作条 */}
                <rect
                  data-smooth
                  x={xL}
                  y={Math.min(qMid, sy(row[0]))}
                  width={barW}
                  height={Math.abs(sy(row[0]) - qMid)}
                  fill={greedyA === 0 ? "#3b82f6" : "var(--chart-grid)"}
                  opacity={greedyA === 0 ? 0.95 : 0.5}
                />
                {/* 右动作条 */}
                <rect
                  data-smooth
                  x={xR}
                  y={Math.min(qMid, sy(row[1]))}
                  width={barW}
                  height={Math.abs(sy(row[1]) - qMid)}
                  fill={greedyA === 1 ? "#10b981" : "var(--chart-grid)"}
                  opacity={greedyA === 1 ? 0.95 : 0.5}
                />
              </g>
            );
          })}

          {/* 贪婪策略箭头:每状态指向下一步 */}
          {greedy.map((a, s) => {
            if (s === 0 || s === N - 1) return null; // 吸收态不画
            const ns = step(s, a);
            const x0 = stateX(s);
            const x1 = stateX(ns);
            const y = qBot + 22;
            const color = a === 1 ? "#10b981" : "#3b82f6";
            const dir = x1 > x0 ? 1 : -1;
            const ah = 5;
            return (
              <g key={`ar-${s}`}>
                <line data-smooth x1={x0} y1={y} x2={x1 - dir * 6} y2={y} stroke={color} strokeWidth={2} strokeLinecap="round" />
                <polygon
                  data-smooth
                  points={`${x1},${y} ${x1 - dir * ah},${y - ah} ${x1 - dir * ah},${y + ah}`}
                  fill={color}
                />
              </g>
            );
          })}
          <text x={(W + PADL) / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            蓝条 = Q(s,左),绿条 = Q(s,右);高亮者为贪婪动作,箭头示贪婪策略
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-2 text-xs">
          <div className="rounded-md bg-chart-surface p-2.5 shadow-sm">
            <div className="mb-1 font-semibold text-zinc-700 dark:text-zinc-200">任务权重 w</div>
            {(Object.keys(TASKS) as TaskKey[]).map((k) => (
              <div
                key={k}
                className={`font-mono text-[11px] transition-opacity ${
                  task === k ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-400 opacity-50 dark:text-zinc-500"
                }`}
              >
                {TASKS[k].name}: [{TASKS[k].w.map((v) => v.toFixed(1)).join(", ")}]
              </div>
            ))}
          </div>
          <div className="rounded-md bg-chart-surface p-2.5 shadow-sm">
            <div className="mb-1 font-semibold text-zinc-700 dark:text-zinc-200">ψ(s,a) <span className="font-sans text-zinc-400">(任务无关,不变)</span></div>
            {PSI.map((row, s) => (
              <div key={`p-${s}`} className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                s={s}: L[{row[0].map((v) => v.toFixed(2)).join(",")}] R[{row[1].map((v) => v.toFixed(2)).join(",")}]
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            切任务只换 <span className="font-mono">w</span>,<span className="font-mono">ψ</span> 面板纹丝不动——这就是 <b className="text-zinc-600 dark:text-zinc-300">零样本迁移</b>:动力学不变的新任务,拿已有 ψ 点乘新 w 立刻得正确 Q,不重学。
          </p>
        </div>
      </div>
    </div>
  );
}
