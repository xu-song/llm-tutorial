"use client";

import { useState, useMemo } from "react";
import { makeRng } from "@/lib/prng";

// ORM vs PRM 打分差异可视化:
// 采样 N 条 4 步推理解,每步独立有正误;最终答对 = 全部步骤都对(ORM 只看这个标量)。
//   ORM 评分:final_ok ? 1 : 0  —— 把所有答错的解同等打成 0,无法区分「只错一步」与「步步都错」。
//   PRM 评分:做对的步数 / 总步数  —— 能区分,「只错一步」的近乎正确的解拿高分。
// 高亮 ORM-best 与 PRM-best,直观看到 PRM 能挑出「几乎全对」的解(哪怕最终答错)。
// 重新采样按钮触发(用户交互),渲染期用确定性 PRNG(seed 由按钮递增),SSR/水合安全。

const N_SOL = 8; // 采样 8 条解
const N_STEP = 4; // 每条 4 步
const STEP_OK_PROB = 0.55; // 每步独立做对的概率(使 final_ok 稀疏,约 9% 答对)

const W = 460;
const H = 260;
const PADL = 44;
const PADR = 14;
const PADT = 16;
const PADB = 38;
const ROW_H = (H - PADT - PADB) / N_SOL;

function sampleSolutions(seed: number) {
  const rng = makeRng(seed * 7919 + 13);
  const sols = [];
  for (let i = 0; i < N_SOL; i++) {
    const steps: boolean[] = [];
    for (let s = 0; s < N_STEP; s++) steps.push(rng() < STEP_OK_PROB);
    const finalOk = steps.every(Boolean);
    const prmScore = steps.filter(Boolean).length / N_STEP;
    const ormScore = finalOk ? 1 : 0;
    sols.push({ steps, finalOk, prmScore, ormScore });
  }
  return sols;
}

/** ORM vs PRM 打分差异:点击「重新采样」看 PRM 如何挑出「几乎全对」的解。 */
export default function OrmPrmCompareViz() {
  const [seed, setSeed] = useState(1);

  const sols = useMemo(() => sampleSolutions(seed), [seed]);
  const ormBest = useMemo(() => {
    let bi = 0;
    for (let i = 1; i < N_SOL; i++) if (sols[i].ormScore > sols[bi].ormScore) bi = i;
    return bi;
  }, [sols]);
  const prmBest = useMemo(() => {
    let bi = 0;
    for (let i = 1; i < N_SOL; i++) if (sols[i].prmScore > sols[bi].prmScore) bi = i;
    return bi;
  }, [sols]);

  const regen = () => setSeed((s) => s + 1);

  const barX = PADL;
  const barW = W - PADL - PADR;
  const stepCellW = 18;
  const stepBlockW = N_STEP * stepCellW;
  const scoreX = barX + stepBlockW + 12;
  const scoreBarMax = barW - stepBlockW - 16;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="ORM(只看最终对错)与 PRM(逐步累计)对 8 条采样解的打分对比,PRM 能挑出几乎全对的解"
        >
          {/* 表头 */}
          <text x={barX} y={PADT - 6} fontSize={9} fill="var(--chart-muted)">解 #</text>
          <text x={barX + 8} y={PADT - 6} fontSize={9} fill="var(--chart-muted)">逐步正误(■=对)</text>
          <text x={scoreX} y={PADT - 6} fontSize={9} fill="var(--chart-muted)">评分条(右=满分)</text>

          {sols.map((sol, i) => {
            const y = PADT + i * ROW_H;
            const isOrm = i === ormBest;
            const isPrm = i === prmBest;
            return (
              <g key={i}>
                {/* 行底纹:ORM-best 与 PRM-best 各染一侧,两者重合时用 PRM 色 */}
                <rect
                  x={barX - 4}
                  y={y}
                  width={barW + 4}
                  height={ROW_H - 2}
                  rx={3}
                  data-smooth
                  fill={isPrm ? "rgba(245,158,11,0.16)" : isOrm ? "rgba(14,165,233,0.12)" : "transparent"}
                />
                {/* 解编号 */}
                <text x={barX} y={y + ROW_H / 2 + 3} fontSize={9} fill="var(--chart-muted)">{i + 1}</text>
                {/* 逐步正误方块 */}
                {sol.steps.map((ok, s) => (
                  <rect
                    key={s}
                    x={barX + 8 + s * stepCellW}
                    y={y + ROW_H / 2 - 6}
                    width={stepCellW - 3}
                    height={12}
                    rx={2}
                    data-smooth
                    fill={ok ? "#10b981" : "var(--chart-grid)"}
                  />
                ))}
                {/* 最终对错标记 */}
                <text
                  x={barX + stepBlockW + 2}
                  y={y + ROW_H / 2 + 3}
                  fontSize={10}
                  fill={sol.finalOk ? "#059669" : "var(--chart-muted)"}
                >
                  {sol.finalOk ? "✓" : "✗"}
                </text>
                {/* ORM 评分条(上,sky) */}
                <rect
                  x={scoreX}
                  y={y + ROW_H / 2 - 9}
                  width={sol.ormScore * scoreBarMax}
                  height={6}
                  rx={2}
                  data-smooth
                  fill="#0ea5e9"
                  opacity={0.85}
                />
                {/* PRM 评分条(下,amber) */}
                <rect
                  x={scoreX}
                  y={y + ROW_H / 2 + 2}
                  width={sol.prmScore * scoreBarMax}
                  height={6}
                  rx={2}
                  data-smooth
                  fill="#f59e0b"
                  opacity={0.9}
                />
                {/* best 标记 */}
                {isOrm && (
                  <text x={scoreX + sol.ormScore * scoreBarMax + 3} y={y + ROW_H / 2 - 4} fontSize={8} fill="#0ea5e9" fontWeight={700}>ORM</text>
                )}
                {isPrm && (
                  <text x={scoreX + sol.prmScore * scoreBarMax + 3} y={y + ROW_H / 2 + 8} fontSize={8} fill="#f59e0b" fontWeight={700}>PRM</text>
                )}
              </g>
            );
          })}
          {/* 图例 */}
          <g>
            <rect x={barX} y={H - PADB + 12} width={10} height={6} rx={1} fill="#0ea5e9" opacity={0.85} />
            <text x={barX + 14} y={H - PADB + 18} fontSize={9} fill="var(--chart-muted)">ORM(只看最终,0 或 1)</text>
            <rect x={barX + 150} y={H - PADB + 12} width={10} height={6} rx={1} fill="#f59e0b" opacity={0.9} />
            <text x={barX + 164} y={H - PADB + 18} fontSize={9} fill="var(--chart-muted)">PRM(逐步累计,0~1)</text>
          </g>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-sky-600 dark:text-sky-400 font-semibold">ORM 选</span>
              <span className="font-mono">解 #{ormBest + 1}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-amber-600 dark:text-amber-500 font-semibold">PRM 选</span>
              <span className="font-mono">解 #{prmBest + 1}</span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {ormBest === prmBest
                ? "两者选了同一条。"
                : `分歧!ORM 只挑「最终答对」的;PRM 挑了「做对步数最多」的——哪怕它最终答错。`}
            </div>
          </div>
          <button
            onClick={regen}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            重新采样 8 条解
          </button>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            每条解 4 步,绿色■=该步对。只有<b>全部对</b>才最终答对(✓)。
            <b className="text-sky-600 dark:text-sky-400">ORM</b>把所有答错的都打 0,无从区分;
            <b className="text-amber-600 dark:text-amber-500">PRM</b>按做对步数打分,能挑出「只错一步」的近乎正确的解——这就是过程监督信号更稠密的由来。
          </p>
        </div>
      </div>
    </div>
  );
}
