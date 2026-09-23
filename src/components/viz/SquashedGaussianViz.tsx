"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// Squashed Gaussian(SAC 的策略):u ~ N(mu, sigma^2),动作 a = tanh(u) 被压到 (-1,1)。
// 上图:pre-tanh 高斯密度 p_u(u)。
// 下图:压扁后的动作密度 p_a(a) = p_u(atanh(a)) / (1 - a^2) —— 换元公式,分母 (1-a^2) 就是
//       Jacobian 修正项 sech^2(u) 的另一写法。mu 越偏、sigma 越大,概率质量越往 ±1 边界"堆积"。
// 纯解析,渲染期无随机,SSR 安全。

const W = 460;
const H = 330;
const PADL = 40;
const PADR = 14;
const PADT = 18;
const PADB = 26;

const SPLIT = 168; // 上下两块分界 y
const TOP_H = SPLIT - PADT - 22; // 上图高度(留标题)
const BOT_T = SPLIT + 20;
const BOT_H = H - PADB - BOT_T;
const PLOT_W = W - PADL - PADR;

const U_MIN = -4;
const U_MAX = 4;
const NPT = 160;

function normPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/** SAC 的 squashed Gaussian:拖 μ、σ 看 tanh 如何把高斯压进 (-1,1) 并在边界堆积概率质量。 */
export default function SquashedGaussianViz() {
  const [mu, setMu] = useState(0.8);
  const [sigma, setSigma] = useState(1.0);

  // 上图:pre-tanh 高斯
  const uCurve = useMemo(() => {
    const pts: { u: number; p: number }[] = [];
    for (let i = 0; i <= NPT; i++) {
      const u = U_MIN + ((U_MAX - U_MIN) * i) / NPT;
      pts.push({ u, p: normPdf(u, mu, sigma) });
    }
    return pts;
  }, [mu, sigma]);
  const uMaxP = Math.max(...uCurve.map((d) => d.p), 1e-6);

  // 下图:压扁后动作密度 p_a(a) = p_u(atanh(a)) / (1 - a^2)
  const aCurve = useMemo(() => {
    const pts: { a: number; p: number }[] = [];
    const lo = -0.995;
    const hi = 0.995;
    for (let i = 0; i <= NPT; i++) {
      const a = lo + ((hi - lo) * i) / NPT;
      const u = Math.atanh(a);
      const p = normPdf(u, mu, sigma) / (1 - a * a);
      pts.push({ a, p });
    }
    return pts;
  }, [mu, sigma]);
  const aMaxP = Math.max(...aCurve.map((d) => d.p), 1e-6);

  // 边界堆积占比:落在 |a|>0.9 的概率质量(= |u|>atanh(0.9)=1.472 那一侧)
  const edgeMass = useMemo(() => {
    // 数值积分下图密度中 |a|>0.9 的部分
    let edge = 0;
    let total = 0;
    const lo = -0.995;
    const hi = 0.995;
    const step = (hi - lo) / NPT;
    for (let i = 0; i <= NPT; i++) {
      const a = lo + step * i;
      const u = Math.atanh(a);
      const p = normPdf(u, mu, sigma) / (1 - a * a);
      const w = i === 0 || i === NPT ? 0.5 : 1;
      total += p * w * step;
      if (Math.abs(a) > 0.9) edge += p * w * step;
    }
    return total > 0 ? edge / total : 0;
  }, [mu, sigma]);

  const uToPx = (u: number) => PADL + ((u - U_MIN) / (U_MAX - U_MIN)) * PLOT_W;
  const aToPx = (a: number) => PADL + ((a + 1) / 2) * PLOT_W;

  const uPath = uCurve
    .map((d, i) => `${i === 0 ? "M" : "L"}${uToPx(d.u).toFixed(1)},${(PADT + TOP_H - (d.p / uMaxP) * TOP_H).toFixed(1)}`)
    .join(" ");
  const uArea = `${uPath} L${uToPx(U_MAX)},${PADT + TOP_H} L${uToPx(U_MIN)},${PADT + TOP_H} Z`;

  const aPath = aCurve
    .map((d, i) => `${i === 0 ? "M" : "L"}${aToPx(d.a).toFixed(1)},${(BOT_T + BOT_H - (d.p / aMaxP) * BOT_H).toFixed(1)}`)
    .join(" ");
  const aArea = `${aPath} L${aToPx(0.995)},${BOT_T + BOT_H} L${aToPx(-0.995)},${BOT_T + BOT_H} Z`;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="viz-smooth mx-auto h-auto w-full max-w-full rounded-lg bg-chart-surface shadow-sm"
        role="img"
        aria-label={`pre-tanh 高斯 N(${mu.toFixed(1)}, ${sigma.toFixed(
          1,
        )}) 经 tanh 压扁后的动作密度,边界(|a|>0.9)概率质量占 ${(edgeMass * 100).toFixed(0)}%`}
      >
        {/* ===== 上图:pre-tanh 高斯 ===== */}
        <text x={PADL} y={PADT - 4} fontSize={11} fill="var(--chart-muted)" fontWeight={600}>
          ① pre-tanh 高斯 p_u(u), u~N(μ, σ²)
        </text>
        <path d={uArea} data-smooth fill="#6366f1" opacity={0.16} />
        <path d={uPath} data-smooth fill="none" stroke="#6366f1" strokeWidth={2} />
        <line x1={uToPx(0)} y1={PADT} x2={uToPx(0)} y2={PADT + TOP_H} stroke="var(--chart-grid)" strokeWidth={0.75} />
        <line
          x1={PADL}
          y1={PADT + TOP_H}
          x2={PADL + PLOT_W}
          y2={PADT + TOP_H}
          stroke="var(--chart-grid)"
          strokeWidth={1}
        />
        {[-4, -2, 0, 2, 4].map((t) => (
          <text key={t} x={uToPx(t)} y={PADT + TOP_H + 12} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            {t}
          </text>
        ))}

        {/* ===== 下图:squashed 动作密度 ===== */}
        <text x={PADL} y={BOT_T - 6} fontSize={11} fill="var(--chart-muted)" fontWeight={600}>
          ② 压扁后 a = tanh(u): p_a(a) = p_u(atanh a) / (1 − a²)
        </text>
        {/* |a|>0.9 边界带 */}
        <rect x={aToPx(0.9)} y={BOT_T} width={aToPx(0.995) - aToPx(0.9)} height={BOT_H} fill="#f43f5e" opacity={0.08} />
        <rect x={aToPx(-0.995)} y={BOT_T} width={aToPx(-0.9) - aToPx(-0.995)} height={BOT_H} fill="#f43f5e" opacity={0.08} />
        <path d={aArea} data-smooth fill="#10b981" opacity={0.18} />
        <path d={aPath} data-smooth fill="none" stroke="#10b981" strokeWidth={2} />
        {/* ±1 边界墙 */}
        {[-1, 1].map((b) => (
          <line
            key={b}
            x1={aToPx(b)}
            y1={BOT_T}
            x2={aToPx(b)}
            y2={BOT_T + BOT_H}
            stroke="#f43f5e"
            strokeWidth={1.5}
            strokeDasharray="3 2"
            opacity={0.7}
          />
        ))}
        <line
          x1={PADL}
          y1={BOT_T + BOT_H}
          x2={PADL + PLOT_W}
          y2={BOT_T + BOT_H}
          stroke="var(--chart-grid)"
          strokeWidth={1}
        />
        {[-1, -0.5, 0, 0.5, 1].map((t) => (
          <text key={t} x={aToPx(t)} y={BOT_T + BOT_H + 14} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            {t}
          </text>
        ))}
        <text x={PADL + PLOT_W / 2} y={BOT_T + BOT_H + 24} textAnchor="middle" fontSize={9} fill="#f43f5e">
          ← 越靠 ±1 边界,密度被 1/(1−a²) 放得越大 →
        </text>
      </svg>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col justify-center gap-2">
          <Slider label="μ(pre-tanh 均值)" value={mu} min={-2.5} max={2.5} step={0.1} onChange={setMu} decimals={1} />
          <Slider label="σ(pre-tanh 标准差)" value={sigma} min={0.3} max={2.5} step={0.1} onChange={setSigma} decimals={1} />
          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            分母 <span className="font-mono">(1−a²)</span> 就是 tanh 的 Jacobian —— 越靠近 ±1,
            <span className="font-mono">1−a²→0</span>,密度被<b>放大</b>。μ 偏离 0 或 σ 增大,
            概率质量就往边界<b>堆积</b>(红带)。这就是为什么 SAC 的 <span className="font-mono">log π</span>
            必须减去 <span className="font-mono">Σᵢ log(1−aᵢ²)</span>:不修正就把边界的密度算错、熵项失准。
          </p>
        </div>
        <div className="self-start rounded-md bg-chart-surface p-3 text-sm shadow-sm">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">边界质量 |a|&gt;0.9</div>
          <div className="mt-0.5 text-right font-mono text-lg font-bold" style={{ color: "var(--chart-accent)" }}>
            {(edgeMass * 100).toFixed(0)}%
          </div>
          <div className="mt-1 max-w-[8rem] text-[10px] leading-tight text-zinc-400 dark:text-zinc-500">
            动作被推到 ±1 附近的概率——饱和越重,梯度越易消失
          </div>
        </div>
      </div>
    </div>
  );
}
