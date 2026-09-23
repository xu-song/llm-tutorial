"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 分布强化学习(distributional RL)的 C51 类别投影可视化。
//
// 核心:标准 DQN 学标量 Q(s,a)=E[R];分布 RL 学返回值的整个分布 Z(s,a)。
// 一步分布贝尔曼:Z(s,a) ≜ R + γ·Z(s',a*)。分布被平移(R)与缩放(γ),
// 但 C51 的支撑 {z_0..z_{N-1}} 固定,故需把平移后的目标分布「投影」回支撑:
// 每个目标原子 tz_j = r + γ·z_j 的质量,按比例分配给最近的两个支撑原子。
//
// 交互:拖动奖励 r 与折扣 γ,看下一状态分布(固定双峰)经 Bellman 平移后
// 如何被投影回固定支撑(蓝色 = 下一状态分布,橙色 = 投影后的目标分布)。
// 渲染期无随机,SSR 安全。

const N = 51;
const VMIN = -10;
const VMAX = 10;
const DZ = (VMAX - VMIN) / (N - 1);
const SUPPORT = Array.from({ length: N }, (_, i) => VMIN + i * DZ);

const W = 460;
const H = 280;
const PADL = 36;
const PADR = 12;
const PADT = 16;
const PADB = 34;
const PLOTW = W - PADL - PADR;
const PLOTH = H - PADT - PADB;

/** 下一状态的返回值分布:一个固定的双峰(模拟多模态返回值,正是分布 RL 的强项)。 */
function nextDist(): number[] {
  const p = new Array(N).fill(0);
  // 双峰:z≈-4 与 z≈3,各 0.5 质量(加一点高斯扩散让投影更直观)
  const peaks = [-4, 3];
  for (let j = 0; j < N; j++) {
    let mass = 0;
    for (const m of peaks) {
      const d = (SUPPORT[j] - m) / 1.2;
      mass += 0.5 * Math.exp(-0.5 * d * d);
    }
    p[j] = mass;
  }
  const s = p.reduce((a, b) => a + b, 0);
  return p.map((x) => x / s);
}

/** C51 投影:把 next_dist 经一步 Bellman(tz = r + γ·z_j)投影回固定支撑。 */
function project(next: number[], r: number, gamma: number): number[] {
  const out = new Array(N).fill(0);
  for (let j = 0; j < N; j++) {
    if (next[j] === 0) continue;
    let tz = r + gamma * SUPPORT[j];
    if (tz <= VMIN) {
      out[0] += next[j];
    } else if (tz >= VMAX) {
      out[N - 1] += next[j];
    } else {
      const b = (tz - VMIN) / DZ;
      const lo = Math.floor(b);
      const hi = Math.ceil(b);
      if (lo === hi) {
        out[lo] += next[j];
      } else {
        out[lo] += next[j] * (hi - b);
        out[hi] += next[j] * (b - lo);
      }
    }
  }
  return out;
}

export default function DistributionalReturnViz() {
  const [r, setR] = useState(2);
  const [gamma, setGamma] = useState(0.9);

  const next = useMemo(() => nextDist(), []);
  const target = useMemo(() => project(next, r, gamma), [next, r, gamma]);

  const maxP = useMemo(() => {
    let m = 0;
    for (const v of next) m = Math.max(m, v);
    for (const v of target) m = Math.max(m, v);
    return m;
  }, [next, target]);

  const barW = (PLOTW / N) * 0.42;
  const gap = PLOTW / N;
  const sy = (v: number) => PADT + PLOTH - v * PLOTH;

  const nextMean = useMemo(() => next.reduce((a, b, i) => a + b * SUPPORT[i], 0), [next]);
  const targetMean = useMemo(() => target.reduce((a, b, i) => a + b * SUPPORT[i], 0), [target]);
  const sxMean = (m: number) => PADL + ((m - VMIN) / (VMAX - VMIN)) * PLOTW;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`奖励 r=${r.toFixed(1)}、折扣 γ=${gamma.toFixed(2)} 时的 C51 投影分布`}
        >
          {/* y 轴刻度 */}
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line
                x1={PADL}
                y1={sy(g * maxP)}
                x2={W - PADR}
                y2={sy(g * maxP)}
                stroke="var(--chart-grid)"
                strokeDasharray="2 3"
              />
              <text x={PADL - 4} y={sy(g * maxP) + 3} textAnchor="end" fontSize={8} fill="var(--chart-muted)">
                {(g * maxP).toFixed(2)}
              </text>
            </g>
          ))}
          <line x1={PADL} y1={PADT + PLOTH} x2={W - PADR} y2={PADT + PLOTH} stroke="var(--chart-axis)" />

          {/* 下一状态分布(蓝,左半柱) */}
          {next.map((p, j) => {
            const x = PADL + j * gap;
            const h = (p / maxP) * PLOTH;
            return (
              <rect
                key={`n${j}`}
                x={x}
                y={sy(p / maxP)}
                width={barW}
                height={h}
                data-smooth
                fill="#0ea5e9"
                opacity={0.65}
              />
            );
          })}
          {/* 投影后目标分布(橙,右半柱) */}
          {target.map((p, j) => {
            const x = PADL + j * gap + barW;
            const h = (p / maxP) * PLOTH;
            return (
              <rect
                key={`t${j}`}
                x={x}
                y={sy(p / maxP)}
                width={barW}
                height={h}
                data-smooth
                fill="#f59e0b"
                opacity={0.85}
              />
            );
          })}

          {/* 均值竖线:下一状态(蓝虚线) vs 目标(橙实线) */}
          <line
            x1={sxMean(nextMean)}
            y1={PADT}
            x2={sxMean(nextMean)}
            y2={PADT + PLOTH}
            data-smooth
            stroke="#0ea5e9"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
          <line
            x1={sxMean(targetMean)}
            y1={PADT}
            x2={sxMean(targetMean)}
            y2={PADT + PLOTH}
            data-smooth
            stroke="#f59e0b"
            strokeWidth={2}
          />

          {/* x 轴刻度:-10/-5/0/5/10 */}
          {[-10, -5, 0, 5, 10].map((tick) => {
            const x = PADL + ((tick - VMIN) / (VMAX - VMIN)) * PLOTW;
            return (
              <g key={tick}>
                <line x1={x} y1={PADT + PLOTH} x2={x} y2={PADT + PLOTH + 3} stroke="var(--chart-axis)" />
                <text x={x} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                  {tick}
                </text>
              </g>
            );
          })}
          <text x={PADL + PLOTW / 2} y={H - 20} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            返回值支撑 z({N} 个原子)
          </text>

          {/* 图例 */}
          <rect x={PADL + 4} y={PADT + 2} width={8} height={8} fill="#0ea5e9" opacity={0.65} />
          <text x={PADL + 16} y={PADT + 9} fontSize={8} fill="var(--chart-muted)">
            下一状态 Z(s′,a*)
          </text>
          <rect x={PADL + 4} y={PADT + 14} width={8} height={8} fill="#f59e0b" opacity={0.85} />
          <text x={PADL + 16} y={PADT + 21} fontSize={8} fill="var(--chart-muted)">
            投影后目标 T·Z(橙=蓝经 r+γ·z 平移再投影)
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="单步奖励 r" value={r} min={-8} max={8} step={0.5} onChange={setR} decimals={1} />
          <Slider label="折扣 γ" value={gamma} min={0} max={1} step={0.05} onChange={setGamma} decimals={2} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">下一状态分布均值 E[Z′]</span>
              <span className="font-mono">{nextMean.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">目标分布均值 r + γ·E[Z′]</span>
              <span className="font-mono">{targetMean.toFixed(2)}</span>
            </div>
            <div className="mt-1.5 border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
              <span className="text-zinc-500 dark:text-zinc-400">
                分布被 <b>r={r.toFixed(1)}</b> 平移、<b>γ={gamma.toFixed(2)}</b> 缩放后,超出 [{VMIN},{VMAX}] 的质量堆积到边界原子(截断效应)。
              </span>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            标准 DQN 只学那个橙色均值(标量);<b>分布 RL 学整条橙色柱状</b>。多模态返回值(如本图双峰)的形状信息,
            标量 <span className="font-mono">Q</span> 完全丢失,分布 <span className="font-mono">Z</span> 却保留——这正是分布 RL 更稳、信号更丰富的根源。
          </p>
        </div>
      </div>
    </div>
  );
}
