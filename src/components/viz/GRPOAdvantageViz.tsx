"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// GRPO 组内相对优势可视化。
//
// 设定:对同一道题采样 G=8 个回答,可验证奖励为二元(答对 r=1 / 答错 r=0)。
// GRPO 不用 critic,直接用「这一组回答」的统计量当基线:
//   均值 μ = k/G(k 为答对数),总体标准差 σ = √(μ(1−μ))(伯努利分布)。
//   标准化优势  A_i = (r_i − μ) / σ      —— 该回答所有 token 共享这个标量。
//   Dr.GRPO 去掉 σ:  A_i = r_i − μ       —— 仅均值中心化。
//
// 两个要点一眼看清:
//   1. 无 critic:基线就是这一组的平均分,不再训练一个价值网络。
//   2. 难度偏置(difficulty bias):除以组内 σ 会放大「太简单/太难」题目的权重——
//      k=1 或 k=7 时 σ 很小,那唯一的对/错回答优势被放大到很大;
//      k=0 或 k=8 时 σ=0,全组同分 → 优势全为 0 → 没有梯度(DAPO 的 Dynamic Sampling 正是丢掉这种题)。
//
// 渲染期无随机(SSR 安全):前 k 个回答记为答对,其余答错;所有数值为解析计算。

const G = 8;

const W = 460;
const H = 280;
const PADL = 44;
const PADR = 16;
const PADT = 20;
const PADB = 42;

export default function GRPOAdvantageViz() {
  const [k, setK] = useState(3); // 组内答对数
  const [useStd, setUseStd] = useState(true); // true=GRPO(除以 σ),false=Dr.GRPO(仅中心化)

  const { rewards, mu, sigma, advs, degenerate } = useMemo(() => {
    const rewards = Array.from({ length: G }, (_, i) => (i < k ? 1 : 0));
    const mu = k / G;
    const sigma = Math.sqrt(mu * (1 - mu)); // 伯努利总体标准差
    const degenerate = sigma < 1e-9; // 全对或全错 → σ=0
    const advs = rewards.map((r) => {
      if (!useStd) return r - mu; // Dr.GRPO
      return degenerate ? 0 : (r - mu) / sigma; // GRPO;σ=0 时规约为 0(无信号)
    });
    return { rewards, mu, sigma, advs, degenerate };
  }, [k, useStd]);

  const plotW = W - PADL - PADR;
  const plotH = H - PADT - PADB;

  // y 轴:优势范围。GRPO 下 |A| 会随 σ 变小而变大,固定一个够大的范围以显出放大效应
  const yMax = useStd ? 3 : 1;
  const yMin = -yMax;
  const sy = (v: number) => PADT + ((yMax - v) / (yMax - yMin)) * plotH;

  const barW = plotW / G * 0.62;
  const bx = (i: number) => PADL + (i + 0.5) * (plotW / G);
  const y0 = sy(0);

  const maxAbs = Math.max(...advs.map((a) => Math.abs(a)), 0.01);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`GRPO 组内相对优势:${G} 个回答中 ${k} 个答对`}
        >
          {/* 零线(= 组均值基线) */}
          <line x1={PADL} y1={y0} x2={W - PADR} y2={y0} stroke="var(--chart-axis)" />
          <text x={W - PADR} y={y0 - 4} textAnchor="end" fontSize={9} fill="var(--chart-muted)">
            A=0(组均值基线 μ={mu.toFixed(2)})
          </text>
          {/* y 轴 */}
          <line x1={PADL} y1={PADT} x2={PADL} y2={H - PADB} stroke="var(--chart-axis)" />
          {[yMax, yMax / 2, 0, yMin / 2, yMin].map((v) => (
            <text key={v} x={PADL - 6} y={sy(v) + 3} textAnchor="end" fontSize={8} fill="var(--chart-muted)">
              {v.toFixed(1)}
            </text>
          ))}
          <text
            x={12}
            y={PADT + plotH / 2}
            fontSize={9}
            fill="var(--chart-muted)"
            transform={`rotate(-90 12 ${PADT + plotH / 2})`}
            textAnchor="middle"
          >
            优势 A_i
          </text>

          {/* 优势条:正=绿(答对被抬高),负=红(答错被压低) */}
          {advs.map((a, i) => {
            const h = Math.abs(sy(a) - y0);
            const top = a >= 0 ? sy(a) : y0;
            const correct = rewards[i] === 1;
            return (
              <g key={i}>
                <rect
                  x={bx(i) - barW / 2}
                  y={top}
                  width={barW}
                  height={Math.max(h, 0.5)}
                  data-smooth
                  rx={2}
                  fill={correct ? "#059669" : "#dc2626"}
                  opacity={degenerate ? 0.25 : 0.85}
                />
                {/* 优势数值 */}
                {!degenerate && (
                  <text
                    x={bx(i)}
                    y={a >= 0 ? top - 3 : top + h + 10}
                    textAnchor="middle"
                    fontSize={8}
                    fill={correct ? "#059669" : "#dc2626"}
                    className="font-mono"
                  >
                    {a.toFixed(1)}
                  </text>
                )}
                {/* 回答编号 + 对错 */}
                <text x={bx(i)} y={H - PADB + 12} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">
                  {correct ? "✓" : "✗"}
                </text>
              </g>
            );
          })}
          <text x={(PADL + W - PADR) / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            同一道题的 {G} 个采样回答(✓ 答对 / ✗ 答错)
          </text>

          {degenerate && (
            <text x={(PADL + W - PADR) / 2} y={PADT + plotH / 2} textAnchor="middle" fontSize={12} fill="var(--chart-muted)">
              σ = 0 → 全组同分 → 优势全为 0 → 无梯度
            </text>
          )}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label={`组内答对数 k(共 ${G} 个)`} value={k} min={0} max={G} step={1} onChange={setK} decimals={0} />
          <div className="flex gap-2">
            <button
              onClick={() => setUseStd(true)}
              aria-pressed={useStd}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition ${
                useStd
                  ? "bg-emerald-600 text-white"
                  : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              GRPO:(r−μ)/σ
            </button>
            <button
              onClick={() => setUseStd(false)}
              aria-pressed={!useStd}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition ${
                !useStd
                  ? "bg-emerald-600 text-white"
                  : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              Dr.GRPO:r−μ
            </button>
          </div>
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">组均值 μ</span>
              <span className="font-mono">{mu.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">组标准差 σ</span>
              <span className="font-mono">{sigma.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-600 dark:text-emerald-400">答对优势</span>
              <span className="font-mono">{degenerate ? "—" : advs[0]?.toFixed(2) ?? (1 - mu).toFixed(2)}</span>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            没有 critic:基线就是<b>这一组的平均分 μ</b>,答对的被抬高、答错的被压低。
            {useStd ? (
              <>
                {" "}GRPO 还<b>除以组内 σ</b>——把 k 拖到 <b>1 或 7</b>:σ 变小,那唯一的对/错回答优势被<b>放大到很大</b>;
                这就是<b>难度偏置</b>,太简单/太难的题被过度加权。拖到 <b>0 或 8</b>:σ=0,全组同分,<b>优势全归零、没有梯度</b>。
              </>
            ) : (
              <>
                {" "}Dr.GRPO <b>去掉除以 σ</b>:优势就是 <span className="font-mono">r−μ</span>,幅度只由「组里多少人答对」决定,
                不再被 σ 放大——难度偏置消失。对比切回 GRPO 看 k=1 时的放大效应。
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
