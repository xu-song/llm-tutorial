"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// GAE(λ) 偏差-方差权衡可视化。
// GAE(λ) = Σ_{l≥0} (γλ)^l δ_{t+l},λ∈[0,1] 在「一步 TD」与「蒙特卡洛」之间连续插值。
// 上图:画前 N 步的几何权重 (γλ)^l(柱状),直观展示 λ 如何控制「往后看几步」。
// 下图:偏差↓ / 方差↑ 随 λ 此消彼长的示意条(归一化,定性)。
// 渲染期无随机,SSR 安全。

const GAMMA = 0.95;
const NSTEPS = 12;

const W = 460;
const H = 300;
const PADL = 40;
const PADR = 16;
const PADT = 16;
const PADB = 38;

// 上下两块绘图区
const SPLIT = 180; // 上图底部 y
const TOP_H = SPLIT - PADT;
const BOT_T = SPLIT + 24; // 下图顶部 y(留 24 给下图标题)
const BOT_H = H - PADB - BOT_T;

/** 权重 (γλ)^l。 */
function weight(lam: number, l: number) {
  return Math.pow(GAMMA * lam, l);
}

/** 累积权重 Σ(γλ)^l = 1/(1-γλ),代表「等效步数」。 */
function effectiveSteps(lam: number) {
  return 1 / (1 - GAMMA * lam);
}

/** 方差相对值:Var ∝ Σ(γλ)^{2l} = 1/(1-(γλ)²)。归一化到 [0,1](除以 λ=1 的值)。 */
function varianceNorm(lam: number) {
  const v = 1 / (1 - (GAMMA * lam) ** 2);
  const vmax = 1 / (1 - GAMMA ** 2);
  return v / vmax;
}

/**
 * 偏差相对值:偏差来自「自举传播不完美的 V」。
 * 单步 TD(λ=0)纯自举,偏差最大;λ↑ 引入更多实际回报,自举依赖减弱,偏差↓。
 * 用 1 - varianceNorm 的镜像作定性示意(偏差与方差此消彼长是 GAE 的核心叙事),
 * 标注为「示意」避免声称精确公式。
 */
function biasNorm(lam: number) {
  return 1 - varianceNorm(lam);
}

export default function GAELambdaViz() {
  const [lam, setLam] = useState(0.95);

  const bars = useMemo(() => {
    const out: number[] = [];
    for (let l = 0; l < NSTEPS; l++) out.push(weight(lam, l));
    return out;
  }, [lam]);

  const maxBar = 1; // (γλ)^0 = 1 恒为最大
  const plotW = W - PADL - PADR;
  const barW = (plotW / NSTEPS) * 0.7;
  const barGap = plotW / NSTEPS;

  const topSy = (v: number) => SPLIT - v * TOP_H;
  // 下图条形:从左(λ=0)到右(λ=1)横向铺
  const botX0 = PADL;
  const botW = plotW;

  const vNorm = varianceNorm(lam);
  const bNorm = biasNorm(lam);
  const eff = effectiveSteps(lam);

  const isTD = lam === 0;
  const isMC = lam === 1;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`GAE(λ=${lam.toFixed(2)}) 的几何权重与偏差方差权衡`}
        >
          {/* ===== 上图:权重柱 (γλ)^l ===== */}
          <text x={PADL} y={PADT + 2} fontSize={10} fill="var(--chart-muted)">
            权重 (γλ)ˡ
          </text>
          {/* y 轴刻度 */}
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line x1={PADL} y1={topSy(g)} x2={W - PADR} y2={topSy(g)} stroke="var(--chart-grid)" strokeDasharray="2 3" />
              <text x={PADL - 5} y={topSy(g) + 3} textAnchor="end" fontSize={9} fill="var(--chart-muted)">
                {g.toFixed(1)}
              </text>
            </g>
          ))}
          <line x1={PADL} y1={SPLIT} x2={W - PADR} y2={SPLIT} stroke="var(--chart-axis)" />
          {/* 柱子 */}
          {bars.map((w, l) => {
            const x = PADL + l * barGap + (barGap - barW) / 2;
            const h = w * TOP_H;
            // 高亮:首根(TD 贡献)始终最显眼;λ=0 时只有首根
            const emph = l === 0;
            return (
              <g key={l}>
                <rect
                  x={x}
                  y={SPLIT - h}
                  width={barW}
                  height={h}
                  rx={1.5}
                  data-smooth
                  fill={emph ? "var(--chart-accent)" : "#0ea5e9"}
                  opacity={emph ? 0.95 : 0.7}
                />
                {(w > 0.05 || l < 2) && (
                  <text x={x + barW / 2} y={SPLIT - h - 3} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">
                    {w.toFixed(2)}
                  </text>
                )}
                <text x={x + barW / 2} y={SPLIT + 12} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                  {l}
                </text>
              </g>
            );
          })}
          <text x={(PADL + W - PADR) / 2} y={SPLIT + 26} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            步数 l(TD 误差 δₜ₊ₗ 的编号)
          </text>

          {/* ===== 下图:偏差 / 方差 此消彼长 ===== */}
          <text x={PADL} y={BOT_T - 6} fontSize={10} fill="var(--chart-muted)">
            偏差 ↓ 与 方差 ↑ 此消彼长(示意)
          </text>
          {/* 容器边框 */}
          <rect x={botX0} y={BOT_T} width={botW} height={BOT_H} fill="none" stroke="var(--chart-grid)" />
          {/* 偏差条(上半,蓝):λ=0 满、λ=1 空 */}
          <rect x={botX0} y={BOT_T} width={botW * bNorm} height={BOT_H / 2 - 1} data-smooth fill="#0ea5e9" opacity={0.7} />
          {/* 方差条(下半,橙):λ=0 空、λ=1 满 */}
          <rect x={botX0} y={BOT_T + BOT_H / 2 + 1} width={botW * vNorm} height={BOT_H / 2 - 1} data-smooth fill="#f59e0b" opacity={0.7} />
          {/* 当前 λ 竖线 */}
          <line x1={botX0 + botW * lam} y1={BOT_T} x2={botX0 + botW * lam} y2={BOT_T + BOT_H} data-smooth stroke="var(--chart-accent)" strokeWidth={2} />
          {/* 两端标签 */}
          <text x={botX0} y={BOT_T + BOT_H + 12} textAnchor="start" fontSize={9} fill="var(--chart-muted)">
            λ=0 一步 TD
          </text>
          <text x={botX0 + botW} y={BOT_T + BOT_H + 12} textAnchor="end" fontSize={9} fill="var(--chart-muted)">
            λ=1 蒙特卡洛
          </text>
          {/* 图例 */}
          <rect x={PADL + 4} y={PADT + 4} width={8} height={8} rx={1} fill="#0ea5e9" opacity={0.7} />
          <text x={PADL + 15} y={PADT + 11} fontSize={8} fill="var(--chart-muted)">偏差</text>
          <rect x={PADL + 4} y={PADT + 16} width={8} height={8} rx={1} fill="#f59e0b" opacity={0.7} />
          <text x={PADL + 15} y={PADT + 23} fontSize={8} fill="var(--chart-muted)">方差</text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="GAE 参数 λ" value={lam} min={0} max={1} step={0.05} onChange={setLam} decimals={2} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">等效步数 Σ(γλ)ˡ</span>
              <span className="font-mono">{eff.toFixed(2)}</span>
            </div>
            <div className="mt-1.5 border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
              {isTD ? (
                <span className="text-sky-600 dark:text-sky-400">λ=0:只有 δₜ 一项 → 纯自举的一步 TD,方差最小但偏差最大</span>
              ) : isMC ? (
                <span className="text-amber-600 dark:text-amber-500">λ=1:权重 = γˡ 缓慢衰减 → 退化为蒙特卡洛,无偏但方差爆炸</span>
              ) : (
                <span className="text-zinc-600 dark:text-zinc-300">
                  λ 在中间:前 {Math.min(NSTEPS, Math.ceil(eff))} 步实际回报参与,在 TD 与 MC 间权衡
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            <span className="font-mono">GAE(λ)=Σ(γλ)ˡδₜ₊ₗ</span>。
            λ 控制「往后看几步 TD 误差」:上图柱子是各步权重,λ 越大柱子衰减越慢、越多实际回报进来。
            <b className="text-sky-600 dark:text-sky-400">偏差</b>来自自举传播不完美的 V(λ 越小越严重);
            <b className="text-amber-600 dark:text-amber-500">方差</b>来自采样噪声累积(λ 越大越严重)。
            PPO 实践常用 <span className="font-mono">λ≈0.95</span>——偏向无偏端、靠裁剪压住方差。
          </p>
        </div>
      </div>
    </div>
  );
}
