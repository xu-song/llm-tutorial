"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

const W = 360;
const H = 360;
const PAD = 30;
const AXIS = 10; // 数据坐标范围 [-5, 5] 映射到 [0, AXIS]

// 一团沿对角线方向相关的二维点(中心化在原点附近)
const RAW: { x: number; y: number }[] = [
  { x: -3.5, y: -3 }, { x: -2.8, y: -2.2 }, { x: -2.5, y: -1.6 }, { x: -2, y: -2.4 },
  { x: -1.5, y: -0.8 }, { x: -1, y: -1.4 }, { x: -0.6, y: 0.2 }, { x: -0.2, y: -0.6 },
  { x: 0.3, y: 0.8 }, { x: 0.8, y: 0.1 }, { x: 1.2, y: 1.6 }, { x: 1.6, y: 0.9 },
  { x: 2.1, y: 2.4 }, { x: 2.6, y: 1.7 }, { x: 3, y: 2.9 }, { x: 3.6, y: 3.2 },
];

// 中心化(减均值),PCA 的前置步骤
const meanX = RAW.reduce((s, p) => s + p.x, 0) / RAW.length;
const meanY = RAW.reduce((s, p) => s + p.y, 0) / RAW.length;
const POINTS = RAW.map((p) => ({ x: p.x - meanX, y: p.y - meanY }));

// 总方差(各点到原点距离平方和的均值)—— 投影方差的上界参考
const totalVar =
  POINTS.reduce((s, p) => s + p.x * p.x + p.y * p.y, 0) / POINTS.length;

// 数据坐标 → 像素(中心在画布中央)
const sx = (x: number) => W / 2 + (x / AXIS) * (W - 2 * PAD);
const sy = (y: number) => H / 2 - (y / AXIS) * (H - 2 * PAD);

/** PCA 浏览器:旋转投影方向,观察投影后保留的方差占比,在主成分(PC1)方向达到最大。 */
export default function PCAExplorer() {
  const [angleDeg, setAngleDeg] = useState(20);

  const { ux, uy, projVarPct, projected } = useMemo(() => {
    const a = (angleDeg * Math.PI) / 180;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    // 每个点在单位方向 u 上的投影标量 t = p·u
    const ts = POINTS.map((p) => p.x * ux + p.y * uy);
    const projVar = ts.reduce((s, t) => s + t * t, 0) / ts.length;
    const projected = POINTS.map((p, i) => ({
      px: ts[i] * ux,
      py: ts[i] * uy,
      orig: p,
    }));
    return { ux, uy, projVarPct: (projVar / totalVar) * 100, projected };
  }, [angleDeg]);

  // 投影轴端点(画到画布边缘)
  const L = AXIS * 0.7;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[360px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          {/* 坐标轴 */}
          <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="var(--chart-grid)" />
          <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} stroke="var(--chart-grid)" />

          {/* 投影方向轴(红色) */}
          <line
            x1={sx(-L * ux)} y1={sy(-L * uy)}
            x2={sx(L * ux)} y2={sy(L * uy)}
            stroke="#ef4444" strokeWidth={2}
          />

          {/* 每个点到投影轴的垂线 + 投影点 */}
          {projected.map((p, i) => (
            <g key={i}>
              <line x1={sx(p.orig.x)} y1={sy(p.orig.y)} x2={sx(p.px)} y2={sy(p.py)} stroke="var(--chart-muted)" strokeWidth={0.75} strokeDasharray="2 2" opacity={0.6} />
              <circle cx={sx(p.px)} cy={sy(p.py)} r={3} fill="#ef4444" />
            </g>
          ))}

          {/* 原始数据点(蓝) */}
          {POINTS.map((p, i) => (
            <circle key={`o-${i}`} cx={sx(p.x)} cy={sy(p.y)} r={5} fill="#0ea5e9" />
          ))}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="投影方向(角度)" value={angleDeg} min={0} max={180} step={1} onChange={setAngleDeg} decimals={0} suffix="°" />
          <div className="rounded-lg bg-chart-surface p-3 text-center shadow-sm">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">投影后保留的方差占比</div>
            <div className="font-mono text-2xl font-bold text-emerald-700">{projVarPct.toFixed(1)}%</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {projVarPct > 95 ? "接近主成分 PC1 —— 信息保留最多!" : projVarPct < 30 ? "几乎垂直于数据方向 —— 损失惨重" : "继续旋转找最大值"}
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            蓝点是原始二维数据,红点是它们投影到红线上的位置。旋转红线找让保留方差<span className="font-semibold text-emerald-600">最大</span>的方向 —— 那就是第一主成分。
          </p>
        </div>
      </div>
    </div>
  );
}
