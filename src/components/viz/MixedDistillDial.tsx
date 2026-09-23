"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 混合蒸馏的 λ 旋钮:on-policy 比例从 0(纯离线/老师样本)到 1(纯在线/学生样本)。
// 三条响应条:
//   - 老师在线开销(amber)  = λ              —— 学生样本越多,越要老师当场打分,在线开销线性涨
//   - 暴露偏差残留(rose)   = (1-λ)          —— 学生样本越多,越覆盖自己的状态分布,偏差线性降
//   - 有效覆盖(sky)        = 1 - 0.8*(1-λ)  —— 质量代理:从 0.2(纯离线只覆盖老师状态)饱和到 1.0
// 纯 useState + useMemo,无定时器、无随机 —— SSR 安全。

const W = 460;
const H = 260;
const PAD = 40;

type Bar = { name: string; value: number; color: string; label: string };

export default function MixedDistillDial() {
  const [lambda, setLambda] = useState(0.5);

  const bars: Bar[] = useMemo(() => {
    const cost = lambda;                          // 老师在线开销
    const bias = 1 - lambda;                      // 暴露偏差残留
    const coverage = 1 - 0.8 * (1 - lambda);      // 有效覆盖(0.2 → 1.0)
    return [
      { name: "老师在线开销", value: cost, color: "#f59e0b", label: `${(cost * 100).toFixed(0)}%` },
      { name: "暴露偏差残留", value: bias, color: "#e11d48", label: `${(bias * 100).toFixed(0)}%` },
      { name: "有效覆盖", value: coverage, color: "#0ea5e9", label: `${(coverage * 100).toFixed(0)}%` },
    ];
  }, [lambda]);

  const bw = (W - 2 * PAD) / (bars.length * 2 + 1);

  const verdict =
    lambda < 0.33
      ? { t: "λ 低 → 便宜但有暴露偏差", c: "#f59e0b" }
      : lambda > 0.67
        ? { t: "λ 高 → 覆盖好但老师在线贵", c: "#e11d48" }
        : { t: "λ 中 → 成本与覆盖的折中", c: "#0ea5e9" };

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[1fr_220px] sm:items-center">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="混合蒸馏的 on-policy 比例 λ 与成本/覆盖权衡"
        >
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--chart-axis)" />
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line
                x1={PAD}
                y1={H - PAD - g * (H - 2 * PAD)}
                x2={W - PAD}
                y2={H - PAD - g * (H - 2 * PAD)}
                stroke="var(--chart-grid)"
                strokeDasharray="2 3"
              />
              <text
                x={PAD - 6}
                y={H - PAD - g * (H - 2 * PAD) + 4}
                textAnchor="end"
                fontSize={9}
                fill="var(--chart-muted)"
              >
                {g === 1 ? "满" : g === 0.5 ? "中" : "0"}
              </text>
            </g>
          ))}

          {bars.map((b, i) => {
            const x = PAD + i * bw * 2 + bw;
            const h = b.value * (H - 2 * PAD);
            return (
              <g key={b.name}>
                <rect
                  data-smooth
                  x={x + bw * 0.15}
                  y={H - PAD - h}
                  width={bw * 0.7}
                  height={Math.max(h, 0.5)}
                  rx={3}
                  fill={b.color}
                  opacity={0.9}
                  style={{ transformOrigin: `${x + bw * 0.5}px ${H - PAD}px` }}
                />
                <text
                  x={x + bw / 2}
                  y={H - PAD - h - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--chart-muted)"
                >
                  {b.label}
                </text>
                <text
                  x={x + bw / 2}
                  y={H - PAD + 14}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--chart-muted)"
                >
                  {b.name}
                </text>
              </g>
            );
          })}

          <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={10} fontWeight={600} fill={verdict.c}>
            {verdict.t}
          </text>
        </svg>

        <div className="space-y-4">
          <Slider
            label="on-policy 比例 λ"
            value={lambda}
            min={0}
            max={1}
            step={0.05}
            onChange={setLambda}
            decimals={2}
          />
          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            λ=0 纯离线(老师样本,便宜但有<a className="underline" href="/tutorials/on-policy-distillation#离线蒸馏的病暴露偏差">暴露偏差</a>);
            λ=1 纯 on-policy(学生样本,覆盖好但<a className="underline" href="/tutorials/on-policy-distillation#-实践细节--实现注意">老师在线</a>贵)。
            工业流水线常取 λ∈[0.3, 0.7] 做折中。
          </p>
        </div>
      </div>
    </div>
  );
}
