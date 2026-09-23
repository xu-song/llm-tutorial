"use client";

import { useMemo, useState } from "react";
import Slider from "./Slider";

// λ-return = n-step 回报的几何加权混合 —— 配合 temporal-difference 篇「前向视角:λ-return」小节。
//
// 设定:5 步轨迹,每步奖励 r=1,γ=0.9,末端自举 V=0(故末项 G_0 即完整 MC 回报)。
//   - n 步回报 G_{0:n} = Σ_{k=0}^{n-1} γ^k r_{k+1}(n=1..4 带自举,n=5 是完整 MC)
//   - λ-return = (1-λ)·Σ_{n=1}^{T-1} λ^{n-1} G_{0:n}  +  λ^{T-1}·G_0   (末项全权重)
//
// 交互:拖 λ 看 n-step 权重 (1-λ)λ^{n-1} 的柱状分布如何从「全在第 1 项」(λ=0,TD(0))
//   渐变到「全在末项」(λ=1,MC);右侧曲线显示 λ-return 值随 λ 单调从 TD(0) 升到 MC。
// 渲染期无随机,所有数据模块级预计算,SSR 安全。

const GAMMA = 0.9;
const REWARDS = [1, 1, 1, 1, 1];
const T = REWARDS.length; // 5:轨迹长度,故 n=1..4 为中间项,n=5 为末项(完整 MC)
const NSTEP = T; // 柱子数:n=1..5(末柱 = MC,全权重)

// n 步回报 G_{0:n}(n=1..5);n<T 带自举 V=0,n=T 即完整 MC 回报 G_0
const NSTEP_RETURNS: number[] = (() => {
  const out: number[] = [];
  for (let n = 1; n <= T; n++) {
    let g = 0;
    for (let k = 0; k < n; k++) g += Math.pow(GAMMA, k) * REWARDS[k];
    // n<T 时自举 V=0,不改变 g;n==T 时 g 即完整回报,无自举
    out.push(g);
  }
  return out;
})();

// λ-return:G^λ = (1-λ)·Σ_{n=1}^{T-1} λ^{n-1} G_{0:n} + λ^{T-1}·G_0(末项全权重)
function lambdaReturn(lam: number): number {
  let s = 0;
  for (let n = 1; n < T; n++) s += Math.pow(lam, n - 1) * NSTEP_RETURNS[n - 1];
  return (1 - lam) * s + Math.pow(lam, T - 1) * NSTEP_RETURNS[T - 1];
}

// λ 曲线采样点(模块级预计算,SSR 安全;渲染只读)
const LAM_CURVE: number[] = [];
for (let i = 0; i <= 40; i++) LAM_CURVE.push(i / 40);

const W = 460;
const H = 300;
const PADL = 36;
const PADR = 14;
const PADT = 16;
const PADB = 38;
const PLOTW = W - PADL - PADR;
const PLOTH = H - PADT - PADB;

// 左半区:柱状图(n-step 权重);右半区:λ-return 曲线
const SPLIT_X = PADL + PLOTW * 0.5;
const BAR_W = (SPLIT_X - PADL) / NSTEP;

// y 轴:权重/归一化值 0..1(权重 ≤ 1,λ-return 归一化到 [TD0, MC] 区间方便叠加)
const TD0 = NSTEP_RETURNS[0]; // = G_{0:1} = 1.0
const MC = NSTEP_RETURNS[T - 1]; // = G_0 = 4.0951
const syTop = (v: number) => H - PADB - v * PLOTH;

// λ 曲线 x 映射(右半区)
const curveX = (lam: number) => SPLIT_X + lam * (W - PADR - SPLIT_X);
// λ-return 归一化到 0..1 再映射到 y
const curveY = (val: number) => syTop((val - TD0) / (MC - TD0));

export default function LambdaReturnMixtureViz() {
  const [lam, setLam] = useState(0.5);

  // 当前 λ 下每个 n 步回报的权重:n=1..T-1 用 (1-λ)λ^{n-1};末项 n=T 用 λ^{T-1}(全权重)
  const weights = useMemo(() => {
    const out: number[] = [];
    for (let n = 1; n < T; n++) out.push((1 - lam) * Math.pow(lam, n - 1));
    out.push(Math.pow(lam, T - 1)); // 末项(MC)全权重
    return out;
  }, [lam]);

  const gl = useMemo(() => lambdaReturn(lam), [lam]);

  // 端点标注
  const isTD0 = lam === 0;
  const isMC = lam === 1;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`λ=${lam.toFixed(2)} 时的 λ-return 几何权重分布与取值曲线`}
        >
          {/* ===== 左半区:n-step 权重柱状图 ===== */}
          <text x={PADL} y={PADT + 2} fontSize={10} fill="var(--chart-muted)">
            n-step 权重 (1−λ)λⁿ⁻¹
          </text>
          {/* y 轴刻度 0/0.5/1 */}
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line x1={PADL} y1={syTop(g)} x2={SPLIT_X - 4} y2={syTop(g)} stroke="var(--chart-grid)" strokeDasharray="2 3" />
              <text x={PADL - 4} y={syTop(g) + 3} textAnchor="end" fontSize={8} fill="var(--chart-muted)">
                {g.toFixed(1)}
              </text>
            </g>
          ))}
          <line x1={PADL} y1={H - PADB} x2={SPLIT_X - 4} y2={H - PADB} stroke="var(--chart-axis)" />
          {/* 柱子:用 transform: scaleY 走 viz-smooth 过渡(见 globals.css) */}
          {weights.map((w, i) => {
            const x = PADL + i * BAR_W + (BAR_W - BAR_W * 0.62) / 2;
            const bw = BAR_W * 0.62;
            const isLast = i === NSTEP - 1;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={syTop(1)}
                  width={bw}
                  height={PLOTH}
                  data-smooth
                  rx={1.5}
                  fill={isLast ? "#f59e0b" : "#0ea5e9"}
                  opacity={0.85}
                  style={{ transform: `scaleY(${Math.max(w, 0.001)})`, transformOrigin: `${x + bw / 2}px ${H - PADB}px` }}
                />
                {w > 0.04 && (
                  <text x={x + bw / 2} y={syTop(w) - 3} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">
                    {w.toFixed(2)}
                  </text>
                )}
                <text x={x + bw / 2} y={H - PADB + 12} textAnchor="middle" fontSize={8.5} fill="var(--chart-muted)">
                  {isLast ? "MC" : `n=${i + 1}`}
                </text>
              </g>
            );
          })}
          <text x={(PADL + SPLIT_X) / 2} y={H - PADB + 26} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            {isTD0 ? "权重全在 n=1 → TD(0)" : isMC ? "权重全在末项 → MC" : "权重几何衰减"}
          </text>

          {/* 分隔线 */}
          <line x1={SPLIT_X} y1={PADT} x2={SPLIT_X} y2={H - PADB} stroke="var(--chart-grid)" strokeDasharray="3 3" />

          {/* ===== 右半区:λ-return 曲线 ===== */}
          <text x={SPLIT_X + 4} y={PADT + 2} fontSize={10} fill="var(--chart-muted)">
            λ-return Gᵗˡ 随 λ
          </text>
          {/* 网格 */}
          {[0, 0.5, 1].map((g) => (
            <line key={g} x1={SPLIT_X} y1={syTop(g)} x2={W - PADR} y2={syTop(g)} stroke="var(--chart-grid)" strokeDasharray="2 3" />
          ))}
          {/* x 轴刻度 0/0.5/1 */}
          {[0, 0.5, 1].map((g) => (
            <text key={g} x={curveX(g)} y={H - PADB + 12} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">
              {g.toFixed(1)}
            </text>
          ))}
          <line x1={SPLIT_X} y1={H - PADB} x2={W - PADR} y2={H - PADB} stroke="var(--chart-axis)" />
          {/* 曲线 */}
          <path
            d={LAM_CURVE.map((l, i) => `${i === 0 ? "M" : "L"} ${curveX(l).toFixed(1)} ${curveY(lambdaReturn(l)).toFixed(1)}`).join(" ")}
            fill="none"
            stroke="#10b981"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.9}
          />
          {/* 端点标记 + 当前点 */}
          <circle data-smooth cx={curveX(0)} cy={curveY(TD0)} r={3} fill="var(--chart-muted)" />
          <circle data-smooth cx={curveX(1)} cy={curveY(MC)} r={3} fill="var(--chart-muted)" />
          <circle data-smooth cx={curveX(lam)} cy={curveY(gl)} r={4.5} fill="#10b981" stroke="white" strokeWidth={1.5} />
          {/* 端点数值标注 */}
          <text x={curveX(0) + 4} y={curveY(TD0) - 4} fontSize={8} fill="var(--chart-muted)">
            TD(0)={TD0.toFixed(2)}
          </text>
          <text x={curveX(1) - 4} y={curveY(MC) - 6} textAnchor="end" fontSize={8} fill="var(--chart-muted)">
            MC={MC.toFixed(2)}
          </text>
          {/* 当前 λ 数值 */}
          <text x={curveX(lam)} y={curveY(gl) - 9} textAnchor="middle" fontSize={9} fontWeight={600} fill="#10b981">
            {gl.toFixed(2)}
          </text>
          <text x={(SPLIT_X + W - PADR) / 2} y={H - PADB + 26} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            λ(0→TD(0), 1→MC)
          </text>

          {/* 图例 */}
          <rect x={W - PADR - 78} y={PADT + 2} width={8} height={8} rx={1} fill="#0ea5e9" opacity={0.85} />
          <text x={W - PADR - 67} y={PADT + 9} fontSize={8} fill="var(--chart-muted)">
            n-step 权重
          </text>
          <rect x={W - PADR - 36} y={PADT + 2} width={8} height={8} rx={1} fill="#10b981" opacity={0.9} />
          <text x={W - PADR - 25} y={PADT + 9} fontSize={8} fill="var(--chart-muted)">
            Gᵗˡ
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="插值参数 λ" value={lam} min={0} max={1} step={0.05} onChange={setLam} decimals={2} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">λ-return 取值</span>
              <span className="font-mono">{gl.toFixed(3)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">权重和(应=1)</span>
              <span className="font-mono">{weights.reduce((a, b) => a + b, 0).toFixed(3)}</span>
            </div>
            <div className="mt-1.5 border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
              {isTD0 ? (
                <span className="text-sky-600 dark:text-sky-400">
                  λ=0:权重全在 n=1 → Gᵗˡ = G_{`{0:1}`} = TD(0) 目标,只看一步自举
                </span>
              ) : isMC ? (
                <span className="text-amber-600 dark:text-amber-500">
                  λ=1:权重全在末项 → Gᵗˡ = G₀ = MC 目标,看完整条轨迹
                </span>
              ) : (
                <span className="text-zinc-600 dark:text-zinc-300">
                  λ 居中:近处短步回报权重大(低方差),远处长步回报权重小(渐近无偏)——几何混合在偏差与方差间插值
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            左图:把 λ-return 拆成各 n 步回报的<b>几何加权</b>。λ=0 时只有 n=1 这一项有权重(退化为 TD(0));λ=1 时中间项全归零,只剩末项的全权重=1(退化为 MC)。右图:把这条插值画成曲线——
            λ 从 0 扫到 1,目标值从一步自举 {TD0.toFixed(2)} 单调爬升到完整回报 {MC.toFixed(2)}。<b>末项全权重</b>正是为了让 λ=1 时权重和不塌缩到 0、严格还原 MC。
          </p>
        </div>
      </div>
    </div>
  );
}
