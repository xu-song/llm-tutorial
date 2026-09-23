"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 折扣因子可视化:柱高 = 第 k 步未来奖励的权重 γ^k。
// 拖动 γ,看权重如何随步数衰减,以及有效视界 1/(1-γ) 落在哪一步。
// 渲染期无随机,纯函数派生,SSR 安全。

const W = 460;
const H = 240;
const PADL = 40;
const PADR = 14;
const PADT = 18;
const PADB = 42;
const STEPS = 20; // 展示未来 0..19 步

/** 折扣因子可视化:拖动 γ 看未来奖励权重 γ^k 的衰减与有效视界。 */
export default function DiscountFactorViz() {
  const [gamma, setGamma] = useState(0.9);

  const { weights, horizon } = useMemo(() => {
    const weights = Array.from({ length: STEPS }, (_, k) => Math.pow(gamma, k));
    const horizon = gamma >= 1 ? Infinity : 1 / (1 - gamma);
    return { weights, horizon };
  }, [gamma]);

  const bw = (W - PADL - PADR) / STEPS;
  const baseY = H - PADB;
  const barMaxH = H - PADT - PADB;

  // 有效视界竖线的 x 位置(落在第 horizon 步)
  const hx = PADL + Math.min(STEPS, horizon) * bw;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`折扣权重 γ^k 随步数的衰减,当前 γ=${gamma.toFixed(2)}`}
        >
          {/* 基线 */}
          <line x1={PADL} y1={baseY} x2={W - PADR} y2={baseY} stroke="var(--chart-axis)" />
          {/* y 轴刻度 0 / 0.5 / 1 */}
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line
                x1={PADL}
                y1={baseY - g * barMaxH}
                x2={W - PADR}
                y2={baseY - g * barMaxH}
                stroke="var(--chart-grid)"
                strokeDasharray="2 3"
              />
              <text x={PADL - 6} y={baseY - g * barMaxH + 4} textAnchor="end" fontSize={9} fill="var(--chart-muted)">
                {g.toFixed(1)}
              </text>
            </g>
          ))}
          {/* γ^k 权重柱 */}
          {weights.map((wk, k) => {
            const x = PADL + k * bw;
            // 用 transform: scaleY 而非改 height/y,使 viz-smooth 的 transform 过渡生效
            // (SVG 几何属性 height/y 在多数浏览器不能 CSS transition,见 globals.css 注释)
            const inHorizon = k < horizon;
            return (
              <g key={k}>
                <rect
                  x={x + bw * 0.15}
                  y={baseY - barMaxH}
                  width={bw * 0.7}
                  height={barMaxH}
                  rx={2}
                  data-smooth
                  fill={inHorizon ? "#059669" : "var(--chart-muted)"}
                  opacity={inHorizon ? 0.85 : 0.35}
                  style={{ transform: `scaleY(${wk})`, transformOrigin: `${x + bw * 0.5}px ${baseY}px` }}
                />
                {(k % 5 === 0 || k === STEPS - 1) && (
                  <text x={x + bw / 2} y={baseY + 13} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                    {k}
                  </text>
                )}
              </g>
            );
          })}
          {/* 有效视界竖线 */}
          {Number.isFinite(horizon) && horizon <= STEPS && (
            <g>
              <line x1={hx} y1={PADT - 4} x2={hx} y2={baseY} stroke="var(--chart-accent)" strokeWidth={1.5} strokeDasharray="4 2" />
              {/* 竖线靠近左边缘时标签左对齐,避免文字越过 y 轴被裁 */}
              <text
                x={hx < PADL + 50 ? hx - 2 : hx}
                y={PADT - 7}
                textAnchor={hx < PADL + 50 ? "start" : "middle"}
                fontSize={9}
                fill="var(--chart-accent)"
              >
                有效视界 ≈ {horizon.toFixed(0)} 步
              </text>
            </g>
          )}
          {horizon > STEPS && Number.isFinite(horizon) && (
            <text x={W - PADR} y={PADT - 7} textAnchor="end" fontSize={9} fill="var(--chart-accent)">
              有效视界 ≈ {horizon.toFixed(0)} 步(超出图外)
            </text>
          )}
          {/* x 轴标题 */}
          <text x={(PADL + W - PADR) / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
            未来第 k 步(柱高 = 权重 γ^k)
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="折扣因子 γ" value={gamma} min={0.5} max={0.99} step={0.01} onChange={setGamma} decimals={2} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">有效视界 1/(1−γ)</span>
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-500">
                ≈ {horizon.toFixed(0)} 步
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">10 步后的权重 γ¹⁰</span>
              <span className="font-mono">{Math.pow(gamma, 10).toFixed(3)}</span>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            每根柱是「未来第 k 步的奖励，折算到现在还剩多少权重」。γ 越小衰减越快、
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">绿色</span>的「看得清」范围越窄(短视);
            γ 越接近 1,权重拖得越远(有远见)。<span className="font-semibold text-amber-600 dark:text-amber-500">橙色虚线</span>即有效视界
            <span className="font-mono"> 1/(1−γ)</span>——智能体大致「能看多远」。
          </p>
        </div>
      </div>
    </div>
  );
}
