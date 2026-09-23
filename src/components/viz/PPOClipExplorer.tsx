"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// PPO 裁剪目标可视化:横轴为概率比 r = π_θ/π_old,纵轴为单样本目标
//   L = min( r·A , clip(r, 1-ε, 1+ε)·A )
// 分优势 A>0 / A<0 两种情形,叠加未裁剪(虚线)与裁剪后(实线),
// 高亮 [1-ε, 1+ε] 的「信任区间」。渲染期无随机,SSR 安全。

const W = 440;
const H = 260;
const PADL = 44;
const PADR = 16;
const PADT = 18;
const PADB = 40;

const R_MIN = 0;
const R_MAX = 2;

const clip = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** PPO 裁剪目标曲线:拖动 ε、切换优势正负,看裁剪如何为策略更新「封顶」。 */
export default function PPOClipExplorer() {
  const [eps, setEps] = useState(0.2);
  const [advPositive, setAdvPositive] = useState(true);

  const A = advPositive ? 1 : -1;

  // y 轴范围:目标值域大致 [-(1+ε), (1+ε)]
  const yMax = 1 + eps + 0.15;
  const yMin = -(1 + eps + 0.15);

  const sx = (r: number) => PADL + ((r - R_MIN) / (R_MAX - R_MIN)) * (W - PADL - PADR);
  const sy = (y: number) => PADT + ((yMax - y) / (yMax - yMin)) * (H - PADT - PADB);

  const { unclipped, clipped } = useMemo(() => {
    const uc: [number, number][] = [];
    const cp: [number, number][] = [];
    const STEP = (R_MAX - R_MIN) / 120;
    for (let r = R_MIN; r <= R_MAX + 1e-9; r += STEP) {
      const u = r * A;
      const c = Math.min(r * A, clip(r, 1 - eps, 1 + eps) * A);
      uc.push([r, u]);
      cp.push([r, c]);
    }
    return { unclipped: uc, clipped: cp };
  }, [eps, A]);

  const toPath = (pts: [number, number][]) =>
    pts.map(([r, y], i) => `${i === 0 ? "M" : "L"}${sx(r).toFixed(1)},${sy(y).toFixed(1)}`).join(" ");

  const y0 = sy(0);
  const rLo = 1 - eps;
  const rHi = 1 + eps;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[440px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="PPO 裁剪目标随概率比变化的曲线"
        >
          {/* 把曲线裁在绘图区内:未裁剪目标 r·A 在 r=2 处达 ±2,会冲出 y 轴范围盖住下方标签 */}
          <defs>
            <clipPath id="ppo-plot">
              <rect x={PADL} y={PADT} width={W - PADL - PADR} height={H - PADT - PADB} />
            </clipPath>
          </defs>
          {/* 信任区间 [1-ε, 1+ε] 阴影 */}
          <rect
            x={sx(rLo)}
            y={PADT}
            width={sx(rHi) - sx(rLo)}
            height={H - PADT - PADB}
            data-smooth
            fill="var(--chart-muted)"
            opacity={0.1}
          />
          {/* 坐标轴 */}
          <line x1={PADL} y1={y0} x2={W - PADR} y2={y0} stroke="var(--chart-axis)" />
          <line x1={PADL} y1={PADT} x2={PADL} y2={H - PADB} stroke="var(--chart-axis)" />
          {/* r=1 参考线 */}
          <line x1={sx(1)} y1={PADT} x2={sx(1)} y2={H - PADB} stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <text x={sx(1)} y={H - PADB + 14} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            r=1
          </text>
          {/* 裁剪边界竖线:标签向两侧外推,避免小 ε 时与 r=1 挤在一起 */}
          {[rLo, rHi].map((rb, k) => (
            <g key={rb}>
              <line x1={sx(rb)} y1={PADT} x2={sx(rb)} y2={H - PADB} stroke="var(--chart-grid)" strokeDasharray="2 3" />
              <text
                x={sx(rb) + (k === 0 ? -3 : 3)}
                y={H - PADB + 14}
                textAnchor={k === 0 ? "end" : "start"}
                fontSize={9}
                fill="var(--chart-muted)"
              >
                {rb.toFixed(2)}
              </text>
            </g>
          ))}
          {/* x 轴标签 */}
          <text x={(PADL + W - PADR) / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
            概率比 r = π_θ / π_old
          </text>
          {/* y 轴刻度 */}
          {[yMin + 0.15, 0, yMax - 0.15].map((yv) => (
            <text key={yv} x={PADL - 6} y={sy(yv) + 3} textAnchor="end" fontSize={9} fill="var(--chart-muted)">
              {yv.toFixed(1)}
            </text>
          ))}
          {/* 未裁剪目标:虚线 */}
          <path d={toPath(unclipped)} data-smooth clipPath="url(#ppo-plot)" fill="none" stroke="var(--chart-muted)" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.7} />
          {/* 裁剪后目标:实线(优势正→绿,负→红) */}
          <path
            d={toPath(clipped)}
            data-smooth
            clipPath="url(#ppo-plot)"
            fill="none"
            stroke={advPositive ? "#059669" : "#dc2626"}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <text x={W - PADR} y={PADT + 4} textAnchor="end" fontSize={9} fill="var(--chart-muted)">
            虚线=未裁剪 · 实线=裁剪后
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="裁剪范围 ε" value={eps} min={0.05} max={0.5} step={0.05} onChange={setEps} decimals={2} />
          <div className="flex gap-2">
            <button
              onClick={() => setAdvPositive(true)}
              aria-pressed={advPositive}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                advPositive
                  ? "bg-emerald-600 text-white"
                  : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              优势 A &gt; 0(好动作)
            </button>
            <button
              onClick={() => setAdvPositive(false)}
              aria-pressed={!advPositive}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                !advPositive
                  ? "bg-red-600 text-white"
                  : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              优势 A &lt; 0(坏动作)
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            阴影是「信任区间」<span className="font-mono">[1−ε, 1+ε]</span>。
            {advPositive ? (
              <>
                好动作想<b>提高</b>概率(r 往右),但一旦 r 超过 <span className="font-mono">1+ε</span>,目标就<b>封顶变平</b>——
                梯度归零,不再奖励「一步迈太大」。
              </>
            ) : (
              <>
                坏动作想<b>压低</b>概率(r 往左),一旦 r 低于 <span className="font-mono">1−ε</span> 目标就封顶变平;
                但注意<b>另一侧不封顶</b>——r 反向变大(把坏动作越推越高)时仍按未裁剪重罚,防止走错方向。
              </>
            )}
            这就是 PPO 用<b>裁剪</b>把每步更新拴在旧策略附近的机制。
          </p>
        </div>
      </div>
    </div>
  );
}
