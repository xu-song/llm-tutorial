"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 资格迹(eligibility traces)与 TD(λ) 可视化。
//
// 设定:一条 5 状态轨迹 s0→s1→s2→s3→s4,末步拿到奖励 r=1,其余 0。
// 资格迹 e_t(s) = γλ·e_{t-1}(s) + 1[S_t=s] 是状态访问的衰减记录。
// TD(λ) 把末步的奖励信号 δ 按资格迹倒推分配给之前访问过的状态。
//
// 交互:拖 λ 看「信用分配范围」从一步(λ=0,只更新末状态)到全轨迹(λ=1,MC 式平摊)。
// 上图:每个状态在轨迹结束时累积的资格迹高度(γλ 的几何衰减)。
// 下图:对应每个状态收到的更新幅度(= 末步 δ × 资格迹)。
// 渲染期无随机,SSR 安全。

const GAMMA = 0.9;
const NSTEPS = 5;

const W = 460;
const H = 300;
const PADL = 36;
const PADR = 12;
const PADT = 16;
const PADB = 38;
const PLOTW = W - PADL - PADR;

const SPLIT = 150; // 上图底部 y
const TOP_H = SPLIT - PADT;
const BOT_T = SPLIT + 24;
const BOT_H = H - PADB - BOT_T;

export default function EligibilityTraceViz() {
  const [lam, setLam] = useState(0.7);

  // 资格迹:状态 i 在轨迹结束时累积的 e 值 = (γλ)^(NSTEPS-1-i)
  const traces = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < NSTEPS; i++) {
      out.push(Math.pow(GAMMA * lam, NSTEPS - 1 - i));
    }
    return out;
  }, [lam]);

  // 更新幅度:末步 δ=1(奖励信号),按资格迹分配
  const updates = traces;

  const barW = (PLOTW / NSTEPS) * 0.6;
  const gap = PLOTW / NSTEPS;

  const topSy = (v: number) => SPLIT - v * TOP_H;

  const isTD0 = lam === 0;
  const isMC = lam === 1;

  // 信用分配范围:更新幅度 >= 阈值的最左/最右状态索引(可视化「λ 控制信用回溯多远」)
  const THR = 0.02;
  let loIdx = NSTEPS - 1;
  let hiIdx = 0;
  for (let i = 0; i < NSTEPS; i++) {
    if (updates[i] >= THR) {
      loIdx = Math.min(loIdx, i);
      hiIdx = Math.max(hiIdx, i);
    }
  }
  const rangeX1 = PADL + loIdx * gap + (gap - barW) / 2;
  const rangeX2 = PADL + hiIdx * gap + (gap - barW) / 2 + barW;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`λ=${lam.toFixed(2)} 时的资格迹与信用分配`}
        >
          {/* ===== 上图:资格迹 ===== */}
          <text x={PADL} y={PADT + 2} fontSize={10} fill="var(--chart-muted)">
            资格迹 e(s) = (γλ)^{`{步数差}`}
          </text>
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line
                x1={PADL}
                y1={topSy(g)}
                x2={W - PADR}
                y2={topSy(g)}
                stroke="var(--chart-grid)"
                strokeDasharray="2 3"
              />
              <text x={PADL - 4} y={topSy(g) + 3} textAnchor="end" fontSize={8} fill="var(--chart-muted)">
                {g.toFixed(1)}
              </text>
            </g>
          ))}
          <line x1={PADL} y1={SPLIT} x2={W - PADR} y2={SPLIT} stroke="var(--chart-axis)" />
          {traces.map((e, i) => {
            const x = PADL + i * gap + (gap - barW) / 2;
            // 用 transform: scaleY 而非改 height,使 viz-smooth 的 transform 过渡生效
            // (SVG 几何属性 height/y 在多数浏览器不能 CSS transition,见 globals.css 注释)
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={SPLIT - TOP_H}
                  width={barW}
                  height={TOP_H}
                  data-smooth
                  rx={1.5}
                  fill="#0ea5e9"
                  opacity={0.8}
                  style={{ transform: `scaleY(${e})`, transformOrigin: `${x + barW / 2}px ${SPLIT}px` }}
                />
                <text x={x + barW / 2} y={SPLIT + 12} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                  s{i}
                </text>
                {e > 0.03 && (
                  <text x={x + barW / 2} y={SPLIT - e * TOP_H - 3} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">
                    {e.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
          <text x={PADL + PLOTW / 2} y={SPLIT + 26} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            状态(轨迹 s0 → s1 → s2 → s3 → s4,末步拿奖励)
          </text>

          {/* ===== 下图:更新幅度 = δ × 资格迹 ===== */}
          <text x={PADL} y={BOT_T - 6} fontSize={10} fill="var(--chart-muted)">
            末步奖励信号 δ 按资格迹倒推分配
          </text>
          <rect x={PADL} y={BOT_T} width={PLOTW} height={BOT_H} fill="none" stroke="var(--chart-grid)" />
          {updates.map((u, i) => {
            const x = PADL + i * gap + (gap - barW) / 2;
            return (
              <rect
                key={i}
                x={x}
                y={BOT_T}
                width={barW}
                height={BOT_H}
                data-smooth
                fill="#f59e0b"
                opacity={0.85}
                style={{ transform: `scaleY(${u})`, transformOrigin: `${x + barW / 2}px ${BOT_T + BOT_H}px` }}
              />
            );
          })}

          {/* 信用分配范围括号:λ 控制奖励信号回溯多远 */}
          {loIdx < hiIdx && (
            <g data-smooth>
              <line x1={rangeX1} y1={BOT_T + BOT_H + 2} x2={rangeX2} y2={BOT_T + BOT_H + 2} stroke="#dc2626" strokeWidth={1.2} />
              <line x1={rangeX1} y1={BOT_T + BOT_H} x2={rangeX1} y2={BOT_T + BOT_H + 5} stroke="#dc2626" strokeWidth={1.2} />
              <line x1={rangeX2} y1={BOT_T + BOT_H} x2={rangeX2} y2={BOT_T + BOT_H + 5} stroke="#dc2626" strokeWidth={1.2} />
              <text x={(rangeX1 + rangeX2) / 2} y={BOT_T + BOT_H + 13} textAnchor="middle" fontSize={8} fill="#dc2626">
                信用分配范围: s{loIdx}→s{hiIdx}（{hiIdx - loIdx + 1} 个状态）
              </text>
            </g>
          )}
          <text x={PADL + PLOTW / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            各状态收到的更新幅度
          </text>

          {/* 图例:置于上图右侧,避开左上标题与纵轴刻度 */}
          <rect x={W - PADR - 86} y={PADT + 2} width={8} height={8} rx={1} fill="#0ea5e9" opacity={0.8} />
          <text x={W - PADR - 75} y={PADT + 9} fontSize={8} fill="var(--chart-muted)">
            资格迹
          </text>
          <rect x={W - PADR - 44} y={PADT + 2} width={8} height={8} rx={1} fill="#f59e0b" opacity={0.85} />
          <text x={W - PADR - 33} y={PADT + 9} fontSize={8} fill="var(--chart-muted)">
            更新幅度
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="迹衰减 λ" value={lam} min={0} max={1} step={0.05} onChange={setLam} decimals={2} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">衰减因子 γλ</span>
              <span className="font-mono">{(GAMMA * lam).toFixed(3)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">s0 分到的信用</span>
              <span className="font-mono">{traces[0].toFixed(4)}</span>
            </div>
            <div className="mt-1.5 border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
              {isTD0 ? (
                <span className="text-sky-600 dark:text-sky-400">
                  λ=0:只有末状态 s4 被更新 → 退化为一步 TD(0),方差小但偏差大
                </span>
              ) : isMC ? (
                <span className="text-amber-600 dark:text-amber-500">
                  λ=1:所有状态均分信用 → 退化为蒙特卡洛,无偏但方差大
                </span>
              ) : (
                <span className="text-zinc-600 dark:text-zinc-300">
                  λ 居中:奖励信号按 (γλ) 的几何衰减倒推,近处状态分得多、远处少——在偏差与方差间权衡
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            <span className="font-mono">e_t(s)=γλ·e_{'{t-1}'}(s)+1[S_t=s]</span>。每次访问一个状态,它的「资格」就
            <b>跳到 1</b>,之后每步按 <span className="font-mono">γλ</span> 衰减。末步的奖励信号 δ 顺着这条衰减的迹
            <b>倒推</b>分配——这就是 TD(λ) 的信用分配。它与 GAE([策略梯度篇](/tutorials/policy-gradient#常见问题-faq))的 λ 同源:
            都是在「一步 TD」与「全轨迹 MC」之间连续插值。
          </p>
        </div>
      </div>
    </div>
  );
}
