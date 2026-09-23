"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";
import { makeRng, gaussian } from "@/lib/prng";
import { clamp } from "@/lib/mathx";

// 重参数化(pathwise)梯度 vs 得分函数(score-function / REINFORCE)梯度 的方差对比。
// 目标 J(mu) = E_{a~N(mu,sigma^2)}[ f(a) ],  f(a) = -(a-c)^2。
//   得分函数估计:  g_sf = f(a) * (a-mu)/sigma^2         —— 只用 f 的取值,不看 f 的形状
//   重参数化估计:  a = mu + sigma*xi,  g_pw = f'(a) = -2(a-c)  —— 梯度"穿过"采样,用了 f 的导数
// 两者都是 dJ/dmu 的无偏估计,但 pathwise 方差通常小得多(SAC 用它的根本原因)。
// 用确定性 PRNG(按 N seed)在 useMemo 里生成样本 —— 渲染期无 Math.random,SSR 安全。

const MU = 0.5;
const SIGMA = 1.0;
const C = 1.0;
const M = 600; // 每种估计器抽多少个"梯度估计"来画分布
const TRUE_GRAD = -2 * (MU - C); // dJ/dmu = -2(mu - c) = +1.0

const W = 480;
const H = 300;
const PADL = 40;
const PADR = 14;
const PADT = 20;
const PADB = 40;
const PLOT_W = W - PADL - PADR;
const PLOT_H = H - PADT - PADB;

const BINS = 41;
const X_MIN = -7;
const X_MAX = 9;

function histogram(vals: number[]): number[] {
  const counts = new Array(BINS).fill(0);
  const span = X_MAX - X_MIN;
  for (const v of vals) {
    let b = Math.floor(((v - X_MIN) / span) * BINS);
    b = clamp(b, 0, BINS - 1);
    counts[b] += 1;
  }
  return counts;
}

/** 重参数化 vs 得分函数梯度估计器的方差对比。拖 N 看两种估计的分布如何随批量收窄。 */
export default function ReparamGradientViz() {
  const [n, setN] = useState(4);

  const { sf, pw, sfVar, pwVar, ratio } = useMemo(() => {
    // 用固定 seed(叠加 N)保证确定性;每个"估计"是对 N 个样本取均值
    const rng = makeRng(20240 + n * 977);
    const sfEst: number[] = [];
    const pwEst: number[] = [];
    for (let m = 0; m < M; m++) {
      let gsf = 0;
      let gpw = 0;
      for (let i = 0; i < n; i++) {
        const xi = gaussian(rng);
        const a = MU + SIGMA * xi;
        const f = -(a - C) * (a - C);
        gsf += (f * (a - MU)) / (SIGMA * SIGMA); // 得分函数
        gpw += -2 * (a - C); // 重参数化(f'(a))
      }
      sfEst.push(gsf / n);
      pwEst.push(gpw / n);
    }
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const variance = (xs: number[]) => {
      const mu = mean(xs);
      return xs.reduce((s, x) => s + (x - mu) * (x - mu), 0) / xs.length;
    };
    const vSf = variance(sfEst);
    const vPw = variance(pwEst);
    return {
      sf: histogram(sfEst),
      pw: histogram(pwEst),
      sfVar: vSf,
      pwVar: vPw,
      ratio: vPw > 1e-9 ? vSf / vPw : Infinity,
    };
  }, [n]);

  const maxCount = Math.max(...sf, ...pw, 1);
  const binW = PLOT_W / BINS;
  const xToPx = (v: number) => PADL + ((v - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;

  const bars = (counts: number[], color: string, opacity: number) =>
    counts.map((cnt, i) => {
      const h = (cnt / maxCount) * PLOT_H;
      return (
        <rect
          key={i}
          x={PADL + i * binW + 0.5}
          y={PADT + PLOT_H - h}
          width={binW - 1}
          height={h}
          data-smooth
          fill={color}
          opacity={opacity}
        />
      );
    });

  const trueX = xToPx(TRUE_GRAD);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="viz-smooth mx-auto h-auto w-full max-w-full rounded-lg bg-chart-surface shadow-sm"
        role="img"
        aria-label={`批量 N=${n} 时,得分函数梯度估计的方差 ${sfVar.toFixed(
          2,
        )} vs 重参数化梯度估计的方差 ${pwVar.toFixed(2)}`}
      >
        {/* 0 轴与真梯度参考线 */}
        <line
          x1={xToPx(0)}
          y1={PADT}
          x2={xToPx(0)}
          y2={PADT + PLOT_H}
          stroke="var(--chart-grid)"
          strokeWidth={1}
        />
        <line
          x1={trueX}
          y1={PADT - 4}
          x2={trueX}
          y2={PADT + PLOT_H}
          stroke="var(--chart-accent)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <text x={trueX} y={PADT - 8} textAnchor="middle" fontSize={10} fill="var(--chart-accent)" fontWeight={700}>
          真梯度 = {TRUE_GRAD.toFixed(1)}
        </text>

        {/* 直方图:先画方差大的(得分函数),再叠方差小的(重参数化) */}
        {bars(sf, "#f59e0b", 0.55)}
        {bars(pw, "#10b981", 0.7)}

        {/* x 轴 */}
        <line
          x1={PADL}
          y1={PADT + PLOT_H}
          x2={PADL + PLOT_W}
          y2={PADT + PLOT_H}
          stroke="var(--chart-grid)"
          strokeWidth={1}
        />
        {[-6, -3, 0, 3, 6, 9].map((t) => (
          <text
            key={t}
            x={xToPx(t)}
            y={PADT + PLOT_H + 16}
            textAnchor="middle"
            fontSize={10}
            fill="var(--chart-muted)"
          >
            {t}
          </text>
        ))}
        <text
          x={PADL + PLOT_W / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize={11}
          fill="var(--chart-muted)"
        >
          单次梯度估计的取值(理想:全部堆在真梯度处)
        </text>

        {/* 图例(带半透明底衬,避免叠在直方图柱子上看不清) */}
        <rect
          x={PADL + 2}
          y={PADT + 1}
          width={148}
          height={32}
          rx={4}
          fill="var(--chart-surface)"
          opacity={0.82}
        />
        <rect x={PADL + 6} y={PADT + 4} width={11} height={11} fill="#f59e0b" opacity={0.55} />
        <text x={PADL + 21} y={PADT + 13} fontSize={10} fill="var(--chart-muted)">
          得分函数(REINFORCE 式)
        </text>
        <rect x={PADL + 6} y={PADT + 20} width={11} height={11} fill="#10b981" opacity={0.7} />
        <text x={PADL + 21} y={PADT + 29} fontSize={10} fill="var(--chart-muted)">
          重参数化(pathwise)
        </text>
      </svg>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col justify-center">
          <Slider
            label="批量 N(每个梯度估计用几个样本)"
            value={n}
            min={1}
            max={64}
            step={1}
            onChange={(v) => setN(Math.round(v))}
            decimals={0}
          />
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            目标 <span className="font-mono">J(μ)=E[f(a)]</span>,<span className="font-mono">f(a)=−(a−c)²</span>,
            <span className="font-mono">a~N(μ={MU}, σ={SIGMA})</span>。两种估计器都<b>无偏</b>(直方图都居中于真梯度),
            但得分函数只用 <span className="font-mono">f</span> 的<b>取值</b>、把「往哪调」全推给随机的
            <span className="font-mono"> (a−μ)/σ²</span> 权重,方差大;重参数化让梯度<b>穿过采样</b>直接用
            <span className="font-mono"> f′(a)</span>,方差小得多。
          </p>
        </div>
        <div className="grid grid-cols-3 items-center gap-x-3 gap-y-1 self-start rounded-md bg-chart-surface p-3 text-sm shadow-sm">
          <span className="text-zinc-400 dark:text-zinc-500" />
          <span className="text-center text-[11px] font-semibold text-amber-600 dark:text-amber-400">得分函数</span>
          <span className="text-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">重参数化</span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">方差</span>
          <span className="text-center font-mono">{sfVar.toFixed(2)}</span>
          <span className="text-center font-mono">{pwVar.toFixed(2)}</span>
          <span className="col-span-3 mt-1 border-t border-zinc-200 pt-1 text-center text-[11px] dark:border-zinc-700">
            方差比 <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{ratio.toFixed(1)}×</span>
            <span className="text-zinc-400"> (得分函数 / 重参数化)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
