"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

const W = 360;
const H = 360;
const PAD = 30;
const AXIS = 10;

interface Pt {
  x: number;
  y: number;
  cls: 0 | 1;
}

// 两类线性可分的点(左下 = A,右上 = B)
const POINTS: Pt[] = [
  { x: 2, y: 3, cls: 0 }, { x: 3, y: 2, cls: 0 }, { x: 2.5, y: 4.5, cls: 0 },
  { x: 1.5, y: 2, cls: 0 }, { x: 3.5, y: 3.5, cls: 0 }, { x: 2, y: 5, cls: 0 },
  { x: 7, y: 7, cls: 1 }, { x: 8, y: 6, cls: 1 }, { x: 6.5, y: 8, cls: 1 },
  { x: 8.5, y: 7.5, cls: 1 }, { x: 7.5, y: 5.5, cls: 1 }, { x: 6, y: 7, cls: 1 },
];

const CLASS_COLOR = ["#0ea5e9", "#f59e0b"];
const sx = (x: number) => PAD + (x / AXIS) * (W - 2 * PAD);
const sy = (y: number) => H - PAD - (y / AXIS) * (H - 2 * PAD);

/** SVM 最大间隔浏览器:旋转分隔方向,看间隔(margin)宽度与支持向量,在最优方向上间隔最大。 */
export default function SVMMarginExplorer() {
  const [angleDeg, setAngleDeg] = useState(30);

  const stats = useMemo(() => {
    // 法向量方向 u(垂直于分隔线)。分隔线角度 = angleDeg,法向 = angleDeg+90。
    const a = ((angleDeg + 90) * Math.PI) / 180;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    // 每个点在法向上的投影
    const proj = POINTS.map((p) => ({ p, t: p.x * ux + p.y * uy }));
    const A = proj.filter((d) => d.p.cls === 0);
    const B = proj.filter((d) => d.p.cls === 1);
    const aMax = A.reduce((m, d) => (d.t > m.t ? d : m), A[0]);
    const aMin = A.reduce((m, d) => (d.t < m.t ? d : m), A[0]);
    const bMax = B.reduce((m, d) => (d.t > m.t ? d : m), B[0]);
    const bMin = B.reduce((m, d) => (d.t < m.t ? d : m), B[0]);
    // 两种朝向的间隙,取更大的那个(与法向指向无关)
    const gapAB = bMin.t - aMax.t; // A 在下、B 在上
    const gapBA = aMin.t - bMax.t; // B 在下、A 在上
    let gap: number, mid: number, svA: Pt, svB: Pt;
    if (gapAB >= gapBA) {
      gap = gapAB;
      mid = (aMax.t + bMin.t) / 2;
      svA = aMax.p;
      svB = bMin.p;
    } else {
      gap = gapBA;
      mid = (bMax.t + aMin.t) / 2;
      svA = aMin.p;
      svB = bMax.p;
    }
    return { ux, uy, gap, mid, svA, svB };
  }, [angleDeg]);

  // 画分隔线与间隔边界:线上任意点满足 p·u = c。取中心构造两端点。
  const { ux, uy, mid, gap } = stats;
  const cx = 5, cy = 5; // 画布数据中心
  // 分隔线方向向量(垂直于 u)
  const dx = -uy, dy = ux;
  const lineAt = (c: number, span: number) => {
    // 找线 p·u = c 上离中心最近的点,再沿方向 d 延伸
    const base = cx * ux + cy * uy;
    const px = cx + (c - base) * ux;
    const py = cy + (c - base) * uy;
    return {
      x1: px - dx * span, y1: py - dy * span,
      x2: px + dx * span, y2: py + dy * span,
    };
  };
  const sep = lineAt(mid, AXIS);
  const m1 = lineAt(mid - gap / 2, AXIS);
  const m2 = lineAt(mid + gap / 2, AXIS);
  const separable = gap > 0;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[360px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--chart-grid)" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--chart-grid)" />

          {/* 间隔边界(两条虚线) */}
          {separable && (
            <>
              <line x1={sx(m1.x1)} y1={sy(m1.y1)} x2={sx(m1.x2)} y2={sy(m1.y2)} stroke="var(--chart-muted)" strokeWidth={1} strokeDasharray="4 3" />
              <line x1={sx(m2.x1)} y1={sy(m2.y1)} x2={sx(m2.x2)} y2={sy(m2.y2)} stroke="var(--chart-muted)" strokeWidth={1} strokeDasharray="4 3" />
            </>
          )}
          {/* 分隔线(实线) */}
          <line x1={sx(sep.x1)} y1={sy(sep.y1)} x2={sx(sep.x2)} y2={sy(sep.y2)} stroke={separable ? "#059669" : "#ef4444"} strokeWidth={2.5} />

          {/* 数据点;支持向量加粗描边 */}
          {POINTS.map((p, i) => {
            const isSV = p === stats.svA || p === stats.svB;
            return (
              <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={isSV ? 8 : 5}
                fill={CLASS_COLOR[p.cls]}
                stroke={isSV ? "var(--foreground)" : "none"} strokeWidth={2} />
            );
          })}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="分隔线角度" value={angleDeg} min={0} max={180} step={1} onChange={setAngleDeg} decimals={0} suffix="°" />
          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="mb-2 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: CLASS_COLOR[0] }} />A 类</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: CLASS_COLOR[1] }} />B 类</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full border-2 border-zinc-900 dark:border-zinc-100" />支持向量</span>
            </div>
            <div className="text-center">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">间隔宽度 margin</div>
              <div className="font-mono text-2xl font-bold" style={{ color: separable ? "#059669" : "#ef4444" }}>
                {separable ? stats.gap.toFixed(2) : "未分开"}
              </div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {!separable ? "这个角度分不开两类" : stats.gap > 3.5 ? "接近最大间隔 —— 最优方向!" : "继续旋转,让间隔更宽"}
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            SVM 要找让间隔<span className="font-semibold text-emerald-600">最大</span>的分隔线。带黑边的点是<span className="font-semibold">支持向量</span> —— 只有它们决定边界,其余点挪动也不影响。
          </p>
        </div>
      </div>
    </div>
  );
}
