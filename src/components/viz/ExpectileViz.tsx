"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";
import { clamp } from "@/lib/mathx";

// IQL 的 expectile 回归可视化。
// 给定一组"数据动作的 Q 值"(离散点),expectile m_tau 是不对称 L2 的加权平衡点:
//   m_tau = argmin_m E[ |tau - 1(X<m)| (X-m)^2 ]
// tau=0.5 -> 均值;tau->1 -> 支撑集上确界(≈max)。IQL 用它把 V 推向"数据动作 Q 的上尾"
//   ≈ max_{a in data} Q(s,a),从而在"从不查询 OOD 动作"的前提下近似 Q-learning 的 max。
// 纯解析(定点迭代求 expectile),渲染期无随机,SSR 安全。

// 固定一组 Q 值(数据里出现过的动作的 Q 估计),刻意右偏一点看上尾效应
// 值之间留足间距,避免点标签在 x 轴上互相重叠
const Q_VALUES = [1.0, 2.0, 3.0, 4.0, 5.5, 7.0, 9.0];
const X_MIN = 0;
const X_MAX = 10;

const W = 480;
const H = 240;
const PADL = 20;
const PADR = 20;
const PADT = 46;
const PADB = 40;
const PLOT_W = W - PADL - PADR;
const AXIS_Y = H - PADB;

// 定点迭代解 expectile:m <- (sum w_i x_i)/(sum w_i),w_i = tau if x_i>=m else 1-tau
function expectile(xs: number[], tau: number): number {
  let m = xs.reduce((s, x) => s + x, 0) / xs.length;
  for (let it = 0; it < 100; it++) {
    let wsum = 0;
    let wx = 0;
    for (const x of xs) {
      const w = x >= m ? tau : 1 - tau;
      wsum += w;
      wx += w * x;
    }
    const next = wx / wsum;
    if (Math.abs(next - m) < 1e-9) break;
    m = next;
  }
  return m;
}

/** IQL 的 expectile:拖 τ 看加权平衡点如何从均值(τ=0.5)滑向数据支持集的 max(τ→1)。 */
export default function ExpectileViz() {
  const [tau, setTau] = useState(0.9);

  const mean = useMemo(() => Q_VALUES.reduce((s, x) => s + x, 0) / Q_VALUES.length, []);
  const maxV = useMemo(() => Math.max(...Q_VALUES), []);
  const mTau = useMemo(() => expectile(Q_VALUES, tau), [tau]);

  const xToPx = (v: number) => PADL + ((v - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;

  // expectile 落在 max 与 mean 之间的相对位置(用于文字提示)
  const frac = (mTau - mean) / (maxV - mean);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="viz-smooth mx-auto h-auto w-full max-w-full rounded-lg bg-chart-surface shadow-sm"
        role="img"
        aria-label={`数据动作 Q 值的 τ=${tau.toFixed(2)} expectile = ${mTau.toFixed(
          2,
        )},均值 ${mean.toFixed(2)},最大值 ${maxV.toFixed(2)}`}
      >
        {/* 均值参考线 */}
        <line x1={xToPx(mean)} y1={PADT - 8} x2={xToPx(mean)} y2={AXIS_Y} stroke="var(--chart-grid)" strokeWidth={1} strokeDasharray="3 3" />
        <text x={xToPx(mean)} y={PADT - 12} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
          均值 τ=0.5
        </text>
        {/* max 参考线 */}
        <line x1={xToPx(maxV)} y1={PADT - 8} x2={xToPx(maxV)} y2={AXIS_Y} stroke="#f43f5e" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
        <text x={xToPx(maxV)} y={PADT - 12} textAnchor="middle" fontSize={10} fill="#f43f5e">
          max τ→1
        </text>

        {/* expectile 竖线(随 τ 平滑移动) */}
        <line x1={xToPx(mTau)} y1={PADT - 2} x2={xToPx(mTau)} y2={AXIS_Y + 6} stroke="var(--chart-accent)" strokeWidth={2.5} data-smooth />
        {(() => {
          // 徽标 x 夹在绘图区内,避免 m_τ 接近端点时标签溢出左右边界
          const bx = clamp(xToPx(mTau), PADL + 30, W - PADR - 30);
          return (
            <>
              <rect x={bx - 30} y={PADT - 4} width={60} height={16} rx={3} fill="var(--chart-accent)" data-smooth opacity={0.92} />
              <text x={bx} y={PADT + 8} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={700} data-smooth>
                m_τ={mTau.toFixed(2)}
              </text>
            </>
          );
        })()}

        {/* 数据点:高于/低于 m_τ 用不同颜色(体现不对称权重 τ vs 1−τ) */}
        {Q_VALUES.map((x, i) => {
          const above = x >= mTau;
          return (
            <g key={i}>
              <circle
                cx={xToPx(x)}
                cy={AXIS_Y - 26}
                r={6}
                data-smooth
                fill={above ? "#10b981" : "#94a3b8"}
                opacity={above ? 0.9 : 0.65}
              />
              <text x={xToPx(x)} y={AXIS_Y - 40} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">
                {x.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* x 轴 */}
        <line x1={PADL} y1={AXIS_Y} x2={W - PADR} y2={AXIS_Y} stroke="var(--chart-grid)" strokeWidth={1} />
        {[0, 2, 4, 6, 8, 10].map((t) => (
          <text key={t} x={xToPx(t)} y={AXIS_Y + 16} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            {t}
          </text>
        ))}
        <text x={PADL + PLOT_W / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
          数据动作的 Q 值(绿:高于 m_τ,权重 τ;灰:低于,权重 1−τ)
        </text>
      </svg>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col justify-center">
          <Slider label="τ(expectile 分位,IQL 常用 0.7~0.9)" value={tau} min={0.5} max={0.99} step={0.01} onChange={setTau} decimals={2} />
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            expectile 是<b>不对称 L₂</b> 的加权平衡点:高于 <span className="font-mono">m_τ</span> 的点权重 <span className="font-mono">τ</span>、
            低于的权重 <span className="font-mono">1−τ</span>。<span className="font-mono">τ=0.5</span> 两边等权 → 退化为<b>均值</b>;
            <span className="font-mono">τ→1</span> 时右侧权重趋 0,平衡点被拉向数据的<b>上确界(≈max)</b>。IQL 用它把
            <span className="font-mono"> V(s)</span> 推向「数据动作 Q 的上尾」——只用<b>数据里出现过</b>的动作近似 <span className="font-mono">max_a Q</span>,
            于是既拿到 Q-learning 的「朝好动作偏」,又<b>从不查询 OOD 动作</b>。
          </p>
        </div>
        <div className="grid grid-cols-2 items-center gap-x-3 gap-y-1 self-start rounded-md bg-chart-surface p-3 text-sm shadow-sm">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">均值</span>
          <span className="text-right font-mono">{mean.toFixed(2)}</span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">最大值</span>
          <span className="text-right font-mono text-rose-600 dark:text-rose-400">{maxV.toFixed(2)}</span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">m_τ</span>
          <span className="text-right font-mono font-bold" style={{ color: "var(--chart-accent)" }}>{mTau.toFixed(2)}</span>
          <span className="col-span-2 mt-1 border-t border-zinc-200 pt-1 text-center text-[10px] text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            已从均值移向 max 的 {(frac * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
