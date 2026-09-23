"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 连续动作离散化的维度灾难可视化:动作 D 维、每维切 K 格,
// 离散动作总数 = K^D 指数爆炸。拖 D、K 看总数,并用点阵直观展示 1D/2D 情形。
// 纯派生、渲染期无随机,SSR 安全。

const W = 300;
const H = 300;
const PAD = 24;

function fmt(n: number): string {
  if (n < 1e4) return n.toLocaleString("en-US");
  if (n < 1e6) return (n / 1e3).toFixed(1) + " 千";
  if (n < 1e8) return (n / 1e4).toFixed(1) + " 万";
  if (n < 1e12) return (n / 1e8).toFixed(2) + " 亿";
  return n.toExponential(2);
}

/** 离散化维度灾难:拖动动作维度 D 与每维格数 K,看离散动作总数 K^D 爆炸。 */
export default function ActionDiscretizationViz() {
  const [dims, setDims] = useState(2);
  const [k, setK] = useState(7);

  const total = useMemo(() => Math.pow(k, dims), [k, dims]);

  // 点阵:仅在 D=1/2 时画出全部格点(D≥3 用文字说明)
  const dots = useMemo(() => {
    const inner = W - 2 * PAD;
    if (dims === 1) {
      const step = inner / Math.max(1, k - 1);
      return Array.from({ length: k }, (_, i) => ({ x: PAD + i * step, y: H / 2 }));
    }
    if (dims === 2) {
      const step = inner / Math.max(1, k - 1);
      const pts: { x: number; y: number }[] = [];
      for (let r = 0; r < k; r++)
        for (let c = 0; c < k; c++)
          pts.push({ x: PAD + c * step, y: PAD + r * step });
      return pts;
    }
    return [];
  }, [dims, k]);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[300px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto w-full max-w-[300px] rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`动作 ${dims} 维、每维 ${k} 格时的离散动作点阵`}
        >
          {dims <= 2 ? (
            <>
              {dots.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={dims === 1 ? 5 : Math.max(1.5, 7 - k * 0.15)} data-smooth fill="#0ea5e9" opacity={0.8} />
              ))}
              <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--chart-muted)">
                {dims} 维动作空间 · 共 {dots.length} 个格点
              </text>
            </>
          ) : (
            <>
              <text x={W / 2} y={H / 2 - 18} textAnchor="middle" fontSize={40}>💥</text>
              <text x={W / 2} y={H / 2 + 24} textAnchor="middle" fontSize={13} data-smooth fill="var(--chart-accent)" fontWeight={700}>
                {fmt(total)} 个动作
              </text>
              <text x={W / 2} y={H / 2 + 46} textAnchor="middle" fontSize={11} fill="var(--chart-muted)">
                {dims} 维 · 无法画出、更无法枚举
              </text>
            </>
          )}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="动作维度 D" value={dims} min={1} max={7} step={1} onChange={(v) => setDims(Math.round(v))} decimals={0} />
          <Slider label="每维格数 K" value={k} min={2} max={21} step={1} onChange={(v) => setK(Math.round(v))} decimals={0} />
          <div className="rounded-md bg-chart-surface p-2.5 text-sm shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">离散动作总数 K^D</span>
              <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">{k}^{dims}</span>
            </div>
            <div className="mt-1 text-right font-mono text-lg font-bold" style={{ color: "var(--chart-accent)" }}>
              {total.toLocaleString("en-US")}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            把连续动作切成网格当离散动作:每维 K 格、D 维,总数就是 <span className="font-mono">K^D</span>——
            随维度<b>指数爆炸</b>。一个 7 关节机械臂即使每维只切 11 格,也有近 <b>2000 万</b>个动作,
            DQN 的 argmax 根本扛不住。这正是连续控制要<b>直接在实数空间优化</b>的原因。
          </p>
        </div>
      </div>
    </div>
  );
}
