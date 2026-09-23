"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 优势估计的「偏差-方差权衡」可视化,对应 n-step return / GAE 谱系。
//
// 设定:真值 V*(s)=0;每步奖励 r ~ N(0, σ_r);Critic 估计 V_hat 有系统偏差 b 和噪声 σ_v。
//   n-step 优势估计 A^(n) = Σ_{l=0}^{n-1} γ^l r_{t+l} + γ^n V_hat(s_{t+n}) − V_hat(s_t)
//   作为「真实优势」的估计,其统计量(相对真值 V*=0):
//     偏差 = E[G^(n)] − V* = γ^n · b     (自举项 γ^n·V_hat 传播了 Critic 的系统偏差;n 越大,自举权重越小,偏差越小)
//     方差 = Σ_{l=0}^{n-1} γ^{2l}·σ_r² + γ^{2n}·σ_v²   (累积奖励噪声随 n 上升,自举噪声随 n 下降)
//   n=1 → 纯 TD(0):方差最小、偏差最大(γ·b);n→∞ → 蒙特卡洛:无偏、方差最大。
//   这正是 GAE(λ) 用 (γλ)^l 在两端连续插值的同一权衡 —— n-step 是 GAE 的离散对应。
//
// 拖动 n(1..30)看偏差↓/方差↑此消彼长;σ_v、b 滑块联动 Critic 质量。
// 渲染期无随机(SSR 安全);所有曲线为解析公式,非采样。

const GAMMA = 0.95;
const SIGMA_R = 1.0; // 奖励噪声固定,聚焦 n 与 Critic 质量的影响
const N_MAX = 30;

const W = 460;
const H = 280;
const PADL = 42;
const PADR = 14;
const PADT = 16;
const PADB = 38;

/** n-step 偏差 = γ^n · b */
function biasAt(n: number, b: number) {
  return Math.pow(GAMMA, n) * b;
}

/** n-step 方差 = Σ_{l=0}^{n-1} γ^{2l} σ_r² + γ^{2n} σ_v² */
function varianceAt(n: number, sv: number) {
  const g2 = GAMMA * GAMMA;
  // Σ_{l=0}^{n-1} g2^l = (1 - g2^n) / (1 - g2)
  const sumR = (1 - Math.pow(g2, n)) / (1 - g2) * SIGMA_R * SIGMA_R;
  const boot = Math.pow(g2, n) * sv * sv;
  return sumR + boot;
}

export default function AdvantageEstimatorViz() {
  const [n, setN] = useState(1);
  const [sigmaV, setSigmaV] = useState(1.0);
  const [biasV, setBiasV] = useState(0.5);

  // 整条曲线(n=1..N_MAX),用于画静态谱系;当前 n 用竖线标记
  const curve = useMemo(() => {
    const ns = Array.from({ length: N_MAX }, (_, i) => i + 1);
    const biases = ns.map((k) => biasAt(k, biasV));
    const variances = ns.map((k) => varianceAt(k, sigmaV));
    return { ns, biases, variances };
  }, [biasV, sigmaV]);

  const { ns, biases, variances } = curve;
  const maxBias = biasAt(1, biasV) || 0.01; // n=1 时最大,= γ·b
  const maxVar = varianceAt(N_MAX, sigmaV) || 0.01; // n=N_MAX 时最大

  const plotW = W - PADL - PADR;
  const plotH = H - PADT - PADB;
  const sx = (k: number) => PADL + ((k - 1) / (N_MAX - 1)) * plotW;
  // 上半画偏差(0..maxBias),下半画方差(0..maxVar),共用 x 轴
  const MID = PADT + plotH * 0.5;
  const biasSy = (v: number) => MID - (v / maxBias) * (plotH * 0.5 - 6);
  const varSy = (v: number) => MID + (v / maxVar) * (plotH * 0.5 - 6);

  const pathBias = biases.map((v, i) => `${i === 0 ? "M" : "L"}${sx(ns[i]).toFixed(1)},${biasSy(v).toFixed(1)}`).join(" ");
  const pathVar = variances.map((v, i) => `${i === 0 ? "M" : "L"}${sx(ns[i]).toFixed(1)},${varSy(v).toFixed(1)}`).join(" ");

  const curBias = biasAt(n, biasV);
  const curVar = varianceAt(n, sigmaV);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`n-step 优势估计的偏差与方差随步数 n 的变化(n=${n})`}
        >
          {/* 中线 */}
          <line x1={PADL} y1={MID} x2={W - PADR} y2={MID} stroke="var(--chart-axis)" />
          {/* 上下区背景标签 */}
          <text x={PADL + 4} y={PADT + 10} fontSize={9} fill="var(--chart-muted)">偏差 ↑(越小越好)</text>
          <text x={PADL + 4} y={MID + 12} fontSize={9} fill="var(--chart-muted)">方差 ↑(越小越好)</text>

          {/* 图例 */}
          <rect x={W - PADR - 70} y={PADT + 2} width={8} height={8} rx={1} fill="#0ea5e9" />
          <text x={W - PADR - 58} y={PADT + 10} fontSize={8} fill="var(--chart-muted)">偏差 γⁿ·b</text>
          <rect x={W - PADR - 70} y={PADT + 16} width={8} height={8} rx={1} fill="#f59e0b" />
          <text x={W - PADR - 58} y={PADT + 24} fontSize={8} fill="var(--chart-muted)">方差 Σγ²ˡσ²</text>

          {/* y 刻度(上:偏差) */}
          {[0, 0.5, 1].map((g) => (
            <text key={`b${g}`} x={PADL - 5} y={biasSy(g * maxBias) + 3} textAnchor="end" fontSize={8} fill="var(--chart-muted)">
              {(g * maxBias).toFixed(2)}
            </text>
          ))}
          {/* y 刻度(下:方差) */}
          {[0, 0.5, 1].map((g) => (
            <text key={`v${g}`} x={PADL - 5} y={varSy(g * maxVar) + 3} textAnchor="end" fontSize={8} fill="var(--chart-muted)">
              {(g * maxVar).toFixed(1)}
            </text>
          ))}

          {/* x 刻度 */}
          {[1, 5, 10, 20, 30].map((k) => (
            <text key={k} x={sx(k)} y={H - PADB + 12} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">
              {k}
            </text>
          ))}
          <text x={(PADL + W - PADR) / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">步数 n</text>

          {/* 偏差曲线(蓝,衰减) */}
          <path d={pathBias} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {/* 方差曲线(橙,上升) */}
          <path d={pathVar} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* 当前 n 竖线 */}
          <line x1={sx(n)} y1={PADT} x2={sx(n)} y2={H - PADB} stroke="var(--chart-accent)" strokeWidth={1.5} strokeDasharray="3 3" />
          <circle cx={sx(n)} cy={biasSy(curBias)} r={3.5} fill="#0ea5e9" />
          <circle cx={sx(n)} cy={varSy(curVar)} r={3.5} fill="#f59e0b" />
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="步数 n" value={n} min={1} max={N_MAX} step={1} onChange={setN} decimals={0} />
          <Slider label="Critic 噪声 σ_v" value={sigmaV} min={0.1} max={2.0} step={0.1} onChange={setSigmaV} decimals={1} />
          <Slider label="Critic 偏差 b" value={biasV} min={0} max={1.5} step={0.1} onChange={setBiasV} decimals={1} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-sky-600 dark:text-sky-400">偏差 γⁿ·b</span>
              <span className="font-mono">{curBias.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-600 dark:text-amber-500">方差 Σγ²ˡσ_r²+γ²ⁿσ_v²</span>
              <span className="font-mono">{curVar.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            n-step 优势 <span className="font-mono">A⁽ⁿ⁾=Σγˡrₜ₊ₗ+γⁿV̂(sₜ₊ₙ)−V̂(sₜ)</span>。
            <b className="text-sky-600 dark:text-sky-400">偏差</b>来自自举项 γⁿV̂ 传播 Critic 的系统误差,n 越大权重越小、偏差越小;
            <b className="text-amber-600 dark:text-amber-500">方差</b>来自累积奖励噪声,n 越大方差越大。
            n=1 是纯 TD(0),n→∞ 是蒙特卡洛——GAE(λ) 正是用 (γλ)ˡ 把这条曲线连续插值。
          </p>
        </div>
      </div>
    </div>
  );
}
