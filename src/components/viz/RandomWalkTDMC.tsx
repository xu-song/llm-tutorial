"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";
import { makeRng } from "@/lib/prng";

// 随机游走 TD(0) vs 蒙特卡洛对比:5 个非终点状态 B..F(链 A-B-C-D-E-F-G,A/G 终点)。
// 拖动「回合数」,用固定种子重放两种方法,展示各自估计如何逼近真实价值(阶梯 1/6..5/6),
// 以及 RMSE 谁降得更快。渲染期无随机(种子固定),SSR 安全。

const TRUE = [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6]; // B..F 真值
const LABELS = ["B", "C", "D", "E", "F"];
const ALPHA_TD = 0.1;
const ALPHA_MC = 0.02;
const SEED = 12345;

const W = 460;
const H = 240;
const PADL = 40;
const PADR = 14;
const PADT = 20;
const PADB = 40;

// 重放 n 个回合,返回 TD 与 MC 对 B..F 的估计
function simulate(episodes: number) {
  const rng = makeRng(SEED);
  const Vtd = [0, 0.5, 0.5, 0.5, 0.5, 0.5, 0];
  const Vmc = [0, 0.5, 0.5, 0.5, 0.5, 0.5, 0];
  for (let e = 0; e < episodes; e++) {
    // 同一条轨迹喂给两种方法(公平对比)
    let s = 3;
    const traj: [number, number, number][] = [];
    while (s !== 0 && s !== 6) {
      const ns = s + (rng() < 0.5 ? -1 : 1);
      const r = ns === 6 ? 1 : 0;
      traj.push([s, r, ns]);
      s = ns;
    }
    // TD(0):每步自举
    for (const [st, r, ns] of traj) Vtd[st] += ALPHA_TD * (r + Vtd[ns] - Vtd[st]);
    // MC:用整条回报(终点奖励)更新沿途所有状态
    const G = traj[traj.length - 1][1];
    for (const [st] of traj) Vmc[st] += ALPHA_MC * (G - Vmc[st]);
  }
  return { td: Vtd.slice(1, 6), mc: Vmc.slice(1, 6) };
}

function rmse(est: number[]) {
  return Math.sqrt(est.reduce((a, v, i) => a + (v - TRUE[i]) ** 2, 0) / est.length);
}

/** 随机游走 TD vs MC:拖回合数看谁更快逼近真值。 */
export default function RandomWalkTDMC() {
  const [episodes, setEpisodes] = useState(10);
  const { td, mc } = useMemo(() => simulate(episodes), [episodes]);

  const n = TRUE.length;
  const groupW = (W - PADL - PADR) / n;
  const baseY = H - PADB;
  const plotH = H - PADT - PADB;
  const sy = (v: number) => baseY - v * plotH; // 价值范围 [0,1]

  const tdErr = rmse(td);
  const mcErr = rmse(mc);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`随机游走 TD 与蒙特卡洛在 ${episodes} 回合后的价值估计对比`}
        >
          {/* y 轴刻度 */}
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line x1={PADL} y1={sy(g)} x2={W - PADR} y2={sy(g)} stroke="var(--chart-grid)" strokeDasharray="2 3" />
              <text x={PADL - 6} y={sy(g) + 4} textAnchor="end" fontSize={9} fill="var(--chart-muted)">
                {g.toFixed(1)}
              </text>
            </g>
          ))}
          <line x1={PADL} y1={baseY} x2={W - PADR} y2={baseY} stroke="var(--chart-axis)" />

          {LABELS.map((lab, i) => {
            const x0 = PADL + i * groupW;
            const bw = groupW * 0.3;
            const tdX = x0 + groupW * 0.15;
            const mcX = x0 + groupW * 0.52;
            return (
              <g key={lab}>
                {/* 真值:横线标记 */}
                <line
                  x1={x0 + groupW * 0.1}
                  y1={sy(TRUE[i])}
                  x2={x0 + groupW * 0.9}
                  y2={sy(TRUE[i])}
                  stroke="var(--chart-muted)"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
                {/* TD 柱 */}
                <rect x={tdX} y={sy(td[i])} width={bw} height={baseY - sy(td[i])} rx={2} fill="#0ea5e9" opacity={0.85} />
                {/* MC 柱 */}
                <rect x={mcX} y={sy(mc[i])} width={bw} height={baseY - sy(mc[i])} rx={2} fill="#f59e0b" opacity={0.85} />
                <text x={x0 + groupW / 2} y={baseY + 14} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
                  {lab}
                </text>
              </g>
            );
          })}
          {/* 图例 */}
          <g>
            <rect x={PADL + 4} y={PADT - 12} width={9} height={9} rx={2} fill="#0ea5e9" />
            <text x={PADL + 16} y={PADT - 4} fontSize={9} fill="var(--chart-muted)">TD(0)</text>
            <rect x={PADL + 58} y={PADT - 12} width={9} height={9} rx={2} fill="#f59e0b" />
            <text x={PADL + 70} y={PADT - 4} fontSize={9} fill="var(--chart-muted)">MC</text>
            <line x1={PADL + 104} y1={PADT - 7} x2={PADL + 118} y2={PADT - 7} stroke="var(--chart-muted)" strokeWidth={1.5} strokeDasharray="4 2" />
            <text x={PADL + 122} y={PADT - 4} fontSize={9} fill="var(--chart-muted)">真值</text>
          </g>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="回合数" value={episodes} min={0} max={200} step={1} onChange={(v) => setEpisodes(Math.round(v))} decimals={0} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="font-semibold text-sky-600 dark:text-sky-400">TD(0) RMSE</span>
              <span className="font-mono">{tdErr.toFixed(4)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="font-semibold text-amber-600 dark:text-amber-500">MC RMSE</span>
              <span className="font-mono">{mcErr.toFixed(4)}</span>
            </div>
            <div className="mt-1.5 border-t border-zinc-200 pt-1.5 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              {episodes === 0
                ? "都从 0.5 起步,还没学"
                : tdErr < mcErr
                  ? "TD 当前更接近真值 ✓"
                  : "此刻 MC 反超(小回合数偶发)"}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            链 A–B–C–D–E–F–G,从 D 出发 50/50 左右走,到 G 得 1、到 A 得 0。真实价值是阶梯
            <span className="font-mono"> 1/6…5/6</span>(虚线)。两种方法喂同一批轨迹,拖动回合数——
            <span className="font-semibold text-sky-600 dark:text-sky-400">TD</span> 通常比
            <span className="font-semibold text-amber-600 dark:text-amber-500">MC</span> 更快压低 RMSE、更稳。
          </p>
        </div>
      </div>
    </div>
  );
}
