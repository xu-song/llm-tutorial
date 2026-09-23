"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

const W = 380;
const H = 300;
const PAD = 36;

const X_MIN = 0;
const X_MAX = 1;

// 真实规律:一条平滑曲线。训练/测试点 = 真实曲线 + 噪声(固定,保证可复现)。
const trueFn = (x: number) => 0.5 + 0.4 * Math.sin(2.2 * Math.PI * x);

// 固定训练点(带噪声)
const TRAIN: { x: number; y: number }[] = [
  { x: 0.03, y: 0.55 }, { x: 0.12, y: 0.95 }, { x: 0.21, y: 1.02 },
  { x: 0.32, y: 0.78 }, { x: 0.41, y: 0.42 }, { x: 0.52, y: 0.18 },
  { x: 0.63, y: 0.05 }, { x: 0.71, y: 0.22 }, { x: 0.82, y: 0.55 },
  { x: 0.93, y: 0.92 },
];
// 固定测试点(不同位置,同一规律 + 噪声)
const TEST: { x: number; y: number }[] = [
  { x: 0.08, y: 0.78 }, { x: 0.27, y: 0.96 }, { x: 0.46, y: 0.3 },
  { x: 0.58, y: 0.08 }, { x: 0.77, y: 0.38 }, { x: 0.88, y: 0.74 },
];

const sx = (x: number) => PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD);
const sy = (y: number) => H - PAD - ((y - -0.3) / (1.3 - -0.3)) * (H - 2 * PAD);

// ---- 多项式最小二乘拟合(正规方程 + 高斯消元)----
function polyfit(pts: { x: number; y: number }[], degree: number): number[] {
  const n = degree + 1;
  // 设计矩阵的法方程 A c = b,A[j][k] = Σ x^(j+k), b[j] = Σ y x^j
  const A: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const b: number[] = Array(n).fill(0);
  for (const { x, y } of pts) {
    const pows: number[] = [1];
    for (let p = 1; p <= 2 * degree; p++) pows.push(pows[p - 1] * x);
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) A[j][k] += pows[j + k];
      b[j] += y * pows[j];
    }
  }
  // 高斯消元解 A c = b
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    [A[i], A[piv]] = [A[piv], A[i]];
    [b[i], b[piv]] = [b[piv], b[i]];
    const d = A[i][i] || 1e-9;
    for (let k = i; k < n; k++) A[i][k] /= d;
    b[i] /= d;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = A[r][i];
      for (let k = i; k < n; k++) A[r][k] -= f * A[i][k];
      b[r] -= f * b[i];
    }
  }
  return b;
}

const evalPoly = (c: number[], x: number) =>
  c.reduce((s, ci, i) => s + ci * x ** i, 0);

const rmse = (c: number[], pts: { x: number; y: number }[]) =>
  Math.sqrt(pts.reduce((s, p) => s + (evalPoly(c, p.x) - p.y) ** 2, 0) / pts.length);

/** 过拟合浏览器:调多项式阶数,看拟合曲线从欠拟合→刚好→过拟合,训练误差一直降但测试误差先降后升。 */
export default function OverfittingExplorer() {
  const [degree, setDegree] = useState(3);

  const { coef, trainErr, testErr, curve } = useMemo(() => {
    const coef = polyfit(TRAIN, degree);
    const trainErr = rmse(coef, TRAIN);
    const testErr = rmse(coef, TEST);
    const pts: string[] = [];
    for (let x = X_MIN; x <= X_MAX + 1e-6; x += 0.01) {
      pts.push(`${sx(x)},${sy(evalPoly(coef, x))}`);
    }
    return { coef, trainErr, testErr, curve: "M" + pts.join(" L") };
  }, [degree]);

  const verdict =
    degree <= 1 ? "欠拟合:太简单,抓不住规律" :
    testErr > trainErr * 2.2 ? "过拟合:死记训练点,测试崩了" :
    "刚刚好:抓住了真实趋势";

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[380px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          <line x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} stroke="var(--chart-grid)" />
          {/* 真实曲线(灰虚线) */}
          <path
            d={"M" + Array.from({ length: 101 }, (_, i) => {
              const x = i / 100;
              return `${sx(x)},${sy(trueFn(x))}`;
            }).join(" L")}
            fill="none" stroke="var(--chart-muted)" strokeWidth={1.5} strokeDasharray="4 4"
          />
          {/* 拟合曲线(绿) */}
          <path d={curve} fill="none" stroke="#059669" strokeWidth={2.5} />
          {/* 训练点(蓝) */}
          {TRAIN.map((p, i) => (
            <circle key={`tr-${i}`} cx={sx(p.x)} cy={sy(p.y)} r={5} fill="#0ea5e9" />
          ))}
          {/* 测试点(橙空心) */}
          {TEST.map((p, i) => (
            <circle key={`te-${i}`} cx={sx(p.x)} cy={sy(p.y)} r={5} fill="none" stroke="#f59e0b" strokeWidth={2} />
          ))}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="多项式阶数" value={degree} min={1} max={9} step={1} onChange={setDegree} decimals={0} />
          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="mb-2 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-[#0ea5e9]" />训练点</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full border-2 border-[#f59e0b]" />测试点</span>
              <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-zinc-400" />真实</span>
            </div>
            <div className="space-y-0.5 font-mono text-xs">
              <div>训练误差:<span className="font-bold text-sky-600">{trainErr.toFixed(3)}</span></div>
              <div>测试误差:<span className="font-bold text-amber-600">{testErr.toFixed(3)}</span></div>
            </div>
            <div className="mt-2 border-t border-zinc-200 pt-2 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
              {verdict}
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            阶数越高,训练误差一路下降;但测试误差<span className="font-semibold text-amber-600">先降后升</span> —— 高阶曲线扭曲着穿过每个训练点,却偏离了真实趋势。
          </p>
        </div>
      </div>
    </div>
  );
}
