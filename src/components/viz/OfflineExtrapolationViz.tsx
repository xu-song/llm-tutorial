"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";
import { makeRng } from "@/lib/prng";
import { softmax } from "@/lib/mathx";

// 离线 RL 的核心病灶:分布偏移 → 外推误差。
// 玩具设定:单状态 s,5 个动作,真实 Q* = [0.2,0.5,0.8,0.6,0.1]。
// 行为策略只采动作 {0,1,2}(永远不碰 3,4)→ 数据集 D 只覆盖这 3 个动作。
// 两个学习器都用同一份 D:
//   · Naive(朴素离线 Q-learning):乐观初始化 Q=1,TD 只更新被采样的动作;
//     OOD 动作 3,4 从未被奖励信号纠正 → 卡在乐观初值 1.0 → 严重高估 → 策略选错。
//   · CQL:在朴素 TD 之外加「压低所有动作(logsumexp)+ 抬高数据动作」的正则项,
//     OOD 动作被往下推 → 悲观估计 → 策略回到数据支持集内。
// 切换两个学习器,调 CQL 的保守权重 α,看 Q 估计(柱)相对真值(虚线阶梯)如何变化。
// 渲染期无随机(种子固定),SSR 安全。

const Q_STAR = [0.2, 0.5, 0.8, 0.6, 0.1];
const N_ACTIONS = 5;
const BEH_ACTIONS = [0, 1, 2]; // 行为策略只覆盖的动作
const SEED = 0;
const N_SAMPLES = 200;
const ALPHA_TD = 0.05; // TD 学习率
const Q_INIT = 1.0; // 乐观初始化(神经网络常见的乐观偏置)

// 跑一遍学习器,返回最终 Q 估计。naive=true 朴素离线;naive=false 走 CQL。
function runLearner(cqlAlpha: number, naive: boolean, rng: () => number): number[] {
  // 构造数据集:从 BEH_ACTIONS 采样,奖励 = Q* + 噪声
  const acts: number[] = [];
  const rews: number[] = [];
  for (let i = 0; i < N_SAMPLES; i++) {
    const a = BEH_ACTIONS[Math.floor(rng() * BEH_ACTIONS.length)];
    acts.push(a);
    rews.push(Q_STAR[a] + (rng() - 0.5) * 0.1);
  }
  const Q = new Array(N_ACTIONS).fill(Q_INIT);
  for (let k = 0; k < acts.length; k++) {
    const a = acts[k];
    const r = rews[k];
    // TD 梯度(终态,无 bootstrap):d/dQ[a] 0.5*(r - Q[a])^2 = -(r - Q[a])
    const gradBellman = new Array(N_ACTIONS).fill(0);
    gradBellman[a] = -(r - Q[a]);
    let grad = gradBellman;
    if (!naive) {
      // CQL 正则:d/dQ[k] [α·logsumexp(Q) - α·Q[a]] = α·softmax(Q)[k] - α·[k==a]
      const sm = softmax(Q);
      const gradCql = sm.map((v, k) => (cqlAlpha * v) - (k === a ? cqlAlpha : 0));
      grad = grad.map((v, k) => v + gradCql[k]);
    }
    for (let k = 0; k < N_ACTIONS; k++) Q[k] -= ALPHA_TD * grad[k];
  }
  return Q;
}

const W = 520;
const H = 280;
const PADL = 36;
const PADR = 16;
const PADT = 28;
const PADB = 46;
const PLOT_W = W - PADL - PADR;
const PLOT_H = H - PADT - PADB;
const QMAX = 1.1; // y 轴上限

export default function OfflineExtrapolationViz() {
  const [cqlAlpha, setCqlAlpha] = useState(0.5);
  const [naive, setNaive] = useState(true);

  const Q = useMemo(() => runLearner(cqlAlpha, naive, makeRng(SEED)), [cqlAlpha, naive]);

  const slot = PLOT_W / N_ACTIONS;
  const barW = slot * 0.55;
  const sx = (i: number) => PADL + i * slot + (slot - barW) / 2;
  const sy = (q: number) => PADT + (1 - q / QMAX) * PLOT_H;

  // 数据覆盖区域底色(行为策略覆盖的动作 0,1,2)
  const covX0 = sx(0) - (slot - barW) / 2;
  const covX1 = sx(BEH_ACTIONS.length - 1) + (slot - barW) / 2 + barW + (slot - barW) / 2;

  // 朴素法下选 argmax(展示灾难性后果)
  const argmaxA = Q.indexOf(Math.max(...Q));
  const ood = argmaxA >= BEH_ACTIONS.length; // 选了数据未覆盖的动作?

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`离线 RL 中朴素法 vs CQL 的 Q 值估计对比,当前为${naive ? "朴素离线 Q-learning" : `CQL α=${cqlAlpha.toFixed(1)}`}`}
        >
          {/* 数据覆盖区域底色 */}
          <rect x={covX0} y={PADT} width={covX1 - covX0} height={PLOT_H} fill="var(--chart-grid)" opacity={0.4} />
          <text x={(covX0 + covX1) / 2} y={PADT - 8} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            数据覆盖(行为策略采过)
          </text>

          {/* y 轴刻度 */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((g) => {
            const y = sy(g);
            return (
              <g key={g}>
                <line x1={PADL} y1={y} x2={W - PADR} y2={y} stroke="var(--chart-grid)" strokeDasharray="2 3" />
                <text x={4} y={y + 3} fontSize={8} fill="var(--chart-muted)">{g.toFixed(2)}</text>
              </g>
            );
          })}

          {/* 真值阶梯(虚线) */}
          {Q_STAR.map((q, i) => {
            const x0 = PADL + i * slot;
            const x1 = PADL + (i + 1) * slot;
            const y = sy(q);
            return (
              <g key={`true-${i}`}>
                <line x1={x0} y1={y} x2={x1} y2={y} stroke="var(--chart-accent)" strokeWidth={1.5} strokeDasharray="4 2" />
                {i < N_ACTIONS - 1 && (
                  <line x1={x1} y1={y} x2={x1} y2={sy(Q_STAR[i + 1])} stroke="var(--chart-accent)" strokeWidth={1.5} strokeDasharray="4 2" />
                )}
              </g>
            );
          })}
          <text x={W - PADR} y={sy(0.6) - 4} textAnchor="end" fontSize={8} fill="var(--chart-accent)">真值 Q*</text>

          {/* Q 估计柱 */}
          {Q.map((q, i) => {
            const x = sx(i);
            const isOOD = i >= BEH_ACTIONS.length;
            const isArgmax = i === argmaxA;
            const color = naive
              ? (isOOD ? "#ef4444" : "#0ea5e9") // 朴素:OOD 红、数据内蓝
              : (isOOD ? "#f59e0b" : "#0ea5e9"); // CQL:OOD 被压成橙(悲观)、数据内蓝
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={sy(Math.max(q, 0))}
                  width={barW}
                  height={Math.abs(q) / QMAX * PLOT_H}
                  rx={1.5}
                  fill={color}
                  opacity={isArgmax ? 1 : 0.7}
                  stroke={isArgmax ? "#000" : "none"}
                  strokeWidth={0.8}
                  strokeOpacity={0.4}
                />
                <text x={x + barW / 2} y={PADT + PLOT_H + 14} textAnchor="middle" fontSize={9} fill={isOOD ? "#ef4444" : "var(--chart-muted)"} fontWeight={isOOD ? 600 : 400}>
                  a{i}{isOOD ? " OOD" : ""}
                </text>
                <text x={x + barW / 2} y={sy(Math.max(q, 0)) - 3} textAnchor="middle" fontSize={8} fill="var(--chart-muted)" fontWeight={600}>
                  {q.toFixed(2)}
                </text>
                {isArgmax && (
                  <text x={x + barW / 2} y={PADT + PLOT_H + 26} textAnchor="middle" fontSize={9} fill="var(--chart-accent)" fontWeight={700}>▼ argmax</text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setNaive(true)}
              aria-pressed={naive}
              className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${naive ? "bg-red-500 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"}`}
            >
              朴素离线
            </button>
            <button
              type="button"
              onClick={() => setNaive(false)}
              aria-pressed={!naive}
              className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${!naive ? "bg-amber-500 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"}`}
            >
              CQL 保守
            </button>
          </div>
          {!naive && (
            <Slider label="保守权重 α" value={cqlAlpha} min={0} max={1.5} step={0.1} onChange={setCqlAlpha} decimals={1} />
          )}
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="mb-1 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">argmax 选了</span>
              <span className={`font-mono font-semibold ${ood ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                a{argmaxA}{ood ? " (OOD!)" : " ✓"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">真最优</span>
              <span className="font-mono">a2 (Q*=0.8)</span>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            5 个动作真值 <span className="font-mono">{Q_STAR.join("/")}</span>,但行为策略只采过 a0–a2(a3、a4 是 OOD)。
            <b className="text-red-600 dark:text-red-400">朴素法</b>把 OOD 动作卡在乐观初值 1.0 → 高估 → 错选 a3/a4;
            <b className="text-amber-600 dark:text-amber-500">CQL</b>用 logsumexp 把 OOD 往下压 → 悲观 → 回到数据支持集内选 a2。调大 α,OOD 被压得越狠。
          </p>
        </div>
      </div>
    </div>
  );
}
