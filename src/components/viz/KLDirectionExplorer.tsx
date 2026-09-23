"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 前向 KL vs 反向 KL:用单高斯 Q 去拟合双峰真实分布 P。
// 前向 D(P||Q) 迫使 Q「覆盖」P 的所有峰(落中间、变宽);
// 反向 D(Q||P) 迫使 Q「抓住」某一个峰(变窄、择一)。
// 所有积分用固定网格数值近似,渲染期无随机 —— SSR/水合安全。

const W = 440;
const H = 240;
const PAD = 32;

// 数据坐标范围
const XMIN = -10;
const XMAX = 10;
const YMAX = 0.32; // 纵轴上界(概率密度)

// 固定积分网格
const N = 400;
const XS: number[] = Array.from(
  { length: N },
  (_, i) => XMIN + ((XMAX - XMIN) * i) / (N - 1),
);
const DX = (XMAX - XMIN) / (N - 1);

function gauss(x: number, mu: number, s: number) {
  return Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
}

// 真实分布 P:双峰混合(峰在 ±3.5,较窄)—— 归一化到网格
const P_RAW = XS.map((x) => 0.5 * gauss(x, -3.5, 0.7) + 0.5 * gauss(x, 3.5, 0.7));
const P_NORM = (() => {
  const area = P_RAW.reduce((s, v) => s + v * DX, 0);
  return P_RAW.map((v) => v / area);
})();

const EPS = 1e-12;

// 数据坐标 → 像素
const sx = (x: number) => PAD + ((x - XMIN) / (XMAX - XMIN)) * (W - 2 * PAD);
const sy = (y: number) => H - PAD - (y / YMAX) * (H - 2 * PAD);

// 把一条密度曲线转成 SVG path
function toPath(ys: number[]) {
  return ys
    .map((y, i) => `${i === 0 ? "M" : "L"}${sx(XS[i]).toFixed(1)},${sy(y).toFixed(1)}`)
    .join(" ");
}

/** 前向 KL vs 反向 KL:拖动单高斯 Q 拟合双峰 P,观察两种散度各自偏爱的解。 */
export default function KLDirectionExplorer() {
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(3.65);

  const { qNorm, fwdKL, revKL } = useMemo(() => {
    const qRaw = XS.map((x) => gauss(x, mu, sigma));
    const area = qRaw.reduce((s, v) => s + v * DX, 0);
    const qNorm = qRaw.map((v) => v / area);
    // 前向 D(P||Q) = Σ P log(P/Q) dx
    let fwd = 0;
    let rev = 0;
    for (let i = 0; i < N; i++) {
      const p = P_NORM[i];
      const q = qNorm[i];
      fwd += p * Math.log((p + EPS) / (q + EPS)) * DX;
      rev += q * Math.log((q + EPS) / (p + EPS)) * DX;
    }
    return { qNorm, fwdKL: Math.max(0, fwd), revKL: Math.max(0, rev) };
  }, [mu, sigma]);

  const pPath = useMemo(() => toPath(P_NORM), []);
  const qPath = useMemo(() => toPath(qNorm), [qNorm]);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="前向 KL 与反向 KL 拟合双峰分布的对比图"
        >
          {/* x 轴 */}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--chart-axis)" strokeWidth={1} />
          {/* 真实分布 P(双峰,填充) */}
          <path d={`${pPath} L${sx(XMAX)},${sy(0)} L${sx(XMIN)},${sy(0)} Z`} fill="#0ea5e9" opacity={0.15} />
          <path d={pPath} fill="none" stroke="#0ea5e9" strokeWidth={2} />
          {/* 模型分布 Q(单高斯) */}
          <path d={qPath} fill="none" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 3" />
          {/* 图例 */}
          <g fontSize={11}>
            <line x1={W - PAD - 96} y1={PAD} x2={W - PAD - 78} y2={PAD} stroke="#0ea5e9" strokeWidth={2} />
            <text x={W - PAD - 72} y={PAD + 4} fill="var(--chart-muted)">P 真实(双峰)</text>
            <line x1={W - PAD - 96} y1={PAD + 16} x2={W - PAD - 78} y2={PAD + 16} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 3" />
            <text x={W - PAD - 72} y={PAD + 20} fill="var(--chart-muted)">Q 模型(单峰)</text>
          </g>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="Q 的中心 μ" value={mu} min={-5} max={5} step={0.05} onChange={setMu} decimals={2} />
          <Slider label="Q 的宽度 σ" value={sigma} min={0.4} max={4.5} step={0.05} onChange={setSigma} decimals={2} />
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-chart-surface p-2 shadow-sm">
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">前向 D(P‖Q)</div>
              <div className="font-mono text-lg font-bold text-sky-600 dark:text-sky-400">{fwdKL.toFixed(3)}</div>
            </div>
            <div className="rounded-lg bg-chart-surface p-2 shadow-sm">
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">反向 D(Q‖P)</div>
              <div className="font-mono text-lg font-bold text-rose-600 dark:text-rose-400">{revKL.toFixed(3)}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setMu(0); setSigma(3.65); }}
              className="flex-1 rounded-md border border-sky-300 bg-sky-50 px-2 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300 dark:hover:bg-sky-900"
            >
              前向最优
            </button>
            <button
              onClick={() => { setMu(-3.5); setSigma(0.7); }}
              className="flex-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
            >
              反向最优
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            点「前向最优」看 Q 摊宽<span className="font-semibold text-sky-600 dark:text-sky-400">覆盖两峰</span>;点「反向最优」看 Q 变窄<span className="font-semibold text-rose-600 dark:text-rose-400">抓住单峰</span>。
          </p>
        </div>
      </div>
    </div>
  );
}
