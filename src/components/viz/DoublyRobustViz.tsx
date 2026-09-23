"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 离线策略评估(OPE)三估计器的偏差-方差对比:直接法(DM)/ 重要性采样(IPS)/ 双重稳健(DR)。
// 单状态玩具:2 动作,真实奖励 r=[0.2,1.0]。行为策略 μ 与目标策略 π 随"分布偏移"参数张开。
//   · DM:  v̂ = Σ_a π(a) r̂(a)               —— 纯模型,方差≈0,但模型错就有偏
//   · IPS: v̂ = ρ·r,  ρ=π/μ                 —— 无偏,但 ρ 大时方差爆炸
//   · DR:  v̂ = ρ(r−r̂) + Σ_a π(a) r̂(a)      —— 模型对或 IS 对都无偏,方差按残差缩放
// 用解析的偏差/方差公式(单状态期望),渲染期无随机,SSR 安全。

const R = [0.2, 1.0];
const SIG2 = 0.01; // 奖励观测噪声方差

const W = 480;
const H = 260;
const PADL = 44;
const PADR = 16;
const PADT = 20;
const PADB = 52;
const PLOT_W = W - PADL - PADR;
const PLOT_H = H - PADT - PADB;

type Stat = { bias: number; variance: number; mse: number };

function computeStats(shift: number, modelErr: number): {
  v: number;
  dm: Stat;
  ips: Stat;
  dr: Stat;
} {
  // shift∈[0,1]:越大,π 越偏好稀有动作 a=1、μ 越少采它 → ρ 越大
  const mu = [0.5 + 0.4 * shift, 0.5 - 0.4 * shift];
  const pi = [0.5 - 0.4 * shift, 0.5 + 0.4 * shift];
  const rhat = [R[0] + modelErr, R[1] + modelErr]; // 有偏模型(整体平移 modelErr)
  const v = pi[0] * R[0] + pi[1] * R[1];

  // DM:常数 Σ π r̂,方差 0,偏差 = Σπr̂ − v
  const dmMean = pi[0] * rhat[0] + pi[1] * rhat[1];
  const dm: Stat = { bias: dmMean - v, variance: 0, mse: (dmMean - v) ** 2 };

  // IPS:无偏,Var = Σ π²/μ (r²+σ²) − v²
  const ipsVar =
    (pi[0] ** 2 / mu[0]) * (R[0] ** 2 + SIG2) +
    (pi[1] ** 2 / mu[1]) * (R[1] ** 2 + SIG2) -
    v * v;
  const ips: Stat = { bias: 0, variance: ipsVar, mse: ipsVar };

  // DR:无偏(ρ 精确),Var = Σ π²/μ (resid²+σ²) − (Σ π resid)²
  const resid = [R[0] - rhat[0], R[1] - rhat[1]];
  const drVar =
    (pi[0] ** 2 / mu[0]) * (resid[0] ** 2 + SIG2) +
    (pi[1] ** 2 / mu[1]) * (resid[1] ** 2 + SIG2) -
    (pi[0] * resid[0] + pi[1] * resid[1]) ** 2;
  const dr: Stat = { bias: 0, variance: drVar, mse: drVar };

  return { v, dm, ips, dr };
}

const EST = [
  { key: "dm", label: "DM 直接法", color: "#f59e0b" },
  { key: "ips", label: "IPS 重要性采样", color: "#ef4444" },
  { key: "dr", label: "DR 双重稳健", color: "#10b981" },
] as const;

/** OPE 三估计器偏差-方差-MSE 对比:拖分布偏移与模型误差,看谁的 MSE 最低。 */
export default function DoublyRobustViz() {
  const [shift, setShift] = useState(0.7);
  const [modelErr, setModelErr] = useState(0.3);

  const { v, dm, ips, dr } = useMemo(() => computeStats(shift, modelErr), [shift, modelErr]);
  const stats = { dm, ips, dr };

  // MSE 柱状图(对数感知:直接线性,但夹住极大值防溢出)
  const maxMse = Math.max(dm.mse, ips.mse, dr.mse, 0.05);
  const barW = PLOT_W / 3;
  const yToPx = (val: number) => PADT + PLOT_H - (Math.min(val, maxMse) / maxMse) * PLOT_H;

  const best = EST.reduce((a, b) => (stats[b.key].mse < stats[a.key].mse ? b : a));

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="viz-smooth mx-auto h-auto w-full max-w-full rounded-lg bg-chart-surface shadow-sm"
        role="img"
        aria-label={`分布偏移 ${shift.toFixed(2)}、模型误差 ${modelErr.toFixed(
          2,
        )} 时,DM/IPS/DR 三估计器的均方误差对比,最低者为 ${best.label}`}
      >
        {/* y 轴与网格 */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PADT + PLOT_H - f * PLOT_H;
          return (
            <g key={f}>
              <line x1={PADL} y1={y} x2={W - PADR} y2={y} stroke="var(--chart-grid)" strokeWidth={0.75} strokeDasharray="2 3" />
              <text x={PADL - 6} y={y + 3} textAnchor="end" fontSize={8} fill="var(--chart-muted)">
                {(f * maxMse).toFixed(2)}
              </text>
            </g>
          );
        })}
        <text x={12} y={PADT + PLOT_H / 2} fontSize={10} fill="var(--chart-muted)" transform={`rotate(-90 12 ${PADT + PLOT_H / 2})`} textAnchor="middle">
          均方误差 MSE
        </text>

        {/* 三根柱:偏差²(实心底段) + 方差(半透明上段),堆叠 = MSE */}
        {EST.map((e, i) => {
          const st = stats[e.key];
          const bias2 = st.bias * st.bias;
          const cx = PADL + i * barW + barW / 2;
          const bw = barW * 0.5;
          const yBias0 = PADT + PLOT_H;
          const hBias = (Math.min(bias2, maxMse) / maxMse) * PLOT_H;
          const hVar = (Math.min(st.variance, maxMse - Math.min(bias2, maxMse)) / maxMse) * PLOT_H;
          const capped = st.mse > maxMse;
          return (
            <g key={e.key}>
              {/* 偏差² 段 */}
              <rect x={cx - bw / 2} y={yBias0 - hBias} width={bw} height={hBias} fill={e.color} data-smooth />
              {/* 方差 段 */}
              <rect x={cx - bw / 2} y={yBias0 - hBias - hVar} width={bw} height={hVar} fill={e.color} opacity={0.4} data-smooth />
              {capped && (
                <text x={cx} y={PADT - 4} textAnchor="middle" fontSize={9} fill={e.color} fontWeight={700}>
                  ↑爆表
                </text>
              )}
              <text x={cx} y={PADT + PLOT_H + 14} textAnchor="middle" fontSize={9} fill="var(--chart-muted)" fontWeight={e.key === best.key ? 700 : 400}>
                {e.label}
              </text>
              <text x={cx} y={PADT + PLOT_H + 26} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">
                MSE={st.mse.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* 图例:实心=偏差²,半透明=方差(带底衬,叠在高柱/爆表标记上也清晰) */}
        <rect x={W - PADR - 116} y={PADT - 3} width={116} height={15} rx={3} fill="var(--chart-surface)" opacity={0.85} />
        <rect x={W - PADR - 108} y={PADT} width={9} height={9} fill="#64748b" />
        <text x={W - PADR - 96} y={PADT + 8} fontSize={8} fill="var(--chart-muted)">偏差²</text>
        <rect x={W - PADR - 60} y={PADT} width={9} height={9} fill="#64748b" opacity={0.4} />
        <text x={W - PADR - 48} y={PADT + 8} fontSize={8} fill="var(--chart-muted)">方差</text>
      </svg>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col justify-center gap-2">
          <Slider label="分布偏移(π 越偏好 μ 少采的动作 → ρ 越大)" value={shift} min={0} max={0.95} step={0.05} onChange={setShift} decimals={2} />
          <Slider label="模型误差 |r̂ − r|" value={modelErr} min={0} max={0.6} step={0.05} onChange={setModelErr} decimals={2} />
          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            <b className="text-amber-600 dark:text-amber-400">DM</b> 方差≈0,但模型一错就<b>有偏</b>(黄柱底段随模型误差长高);
            <b className="text-red-600 dark:text-red-400">IPS</b> 永远无偏,但分布偏移一大 <span className="font-mono">ρ</span> 就炸、<b>方差爆表</b>;
            <b className="text-emerald-600 dark:text-emerald-400">DR</b> 把两者拼起来——模型对<b>或</b> IS 对就无偏,且方差只按<b>残差</b> <span className="font-mono">r−r̂</span> 缩放,通常 MSE 最低。
          </p>
        </div>
        <div className="self-start rounded-md bg-chart-surface p-3 text-sm shadow-sm">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">真值 v^π</div>
          <div className="text-right font-mono">{v.toFixed(3)}</div>
          <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">MSE 最低</div>
          <div className="text-right font-mono font-bold" style={{ color: best.color }}>{best.label}</div>
        </div>
      </div>
    </div>
  );
}
