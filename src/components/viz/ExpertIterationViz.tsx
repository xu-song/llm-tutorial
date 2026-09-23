"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 专家迭代(Expert Iteration, exIt)循环可视化:AlphaZero 的训练范式。
//
// 循环四步:① 网络提议(π_θ)→ ② MCTS 精炼(产出更强的 π_MCTS)→ ③ 自对弈产局(记录 (s,π_MCTS,z))
//         → ④ 网络学习(模仿 π_MCTS + 预测 z)→ 网络变强 → 回到 ①。
// 关键直觉:MCTS 这一步注入新信息(规则向前看),所以训练目标始终比网络当前水平高一截——
// 这是 self-play 不塌缩的根源。
//
// 交互:拖「训练迭代轮数」看网络强度条逐渐逼近 MCTS 强度条(MCTS 始终领先一小截),
// 下方「策略 KL」随训练递减(网络越来越接近 MCTS 老师)。
// 渲染期无随机,SSR 安全;强度/KL 曲线用确定性饱和函数模拟,非真实数据。

const W = 460;
const H = 300;

const MAXITER = 100;

// 网络强度:从 0.1 饱和增长到 ~0.85(逼近但永远追不上 MCTS 的领先)
function netStrength(iter: number): number {
  return 0.1 + 0.75 * (1 - Math.exp(-iter / 25));
}
// MCTS 强度:略高于网络,随网络变强也微涨(更强网络引导更深搜索)
function mctsStrength(iter: number): number {
  return Math.min(0.97, netStrength(iter) + 0.08);
}
// 策略 KL(网络 vs MCTS):随训练递减
function policyKL(iter: number): number {
  return 0.9 * Math.exp(-iter / 20) + 0.02;
}

export default function ExpertIterationViz() {
  const [iter, setIter] = useState(10);

  const netS = useMemo(() => netStrength(iter), [iter]);
  const mctsS = useMemo(() => mctsStrength(iter), [iter]);
  const kl = useMemo(() => policyKL(iter), [iter]);

  // 循环四节点坐标(菱形布局)
  const cx = W / 2;
  const cy = H / 2 + 4;
  const R = 80;
  const nodes = [
    { label: "1 网络提议", sub: "f(s) -> (v, pi)", x: cx, y: cy - R },
    { label: "2 MCTS 精炼", sub: "产出 pi_MCTS(更强)", x: cx + R + 10, y: cy },
    { label: "3 自对弈产局", sub: "记录 (s, pi_MCTS, z)", x: cx, y: cy + R },
    { label: "4 网络学习", sub: "L = (z-v)^2 - pi_MCTS log pi", x: cx - R - 10, y: cy },
  ];

  // 当前激活步骤(循环 4 相,用 iter 驱动静态展示,无动画所以 SSR 安全)
  const phase = iter % 4;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`第 ${iter} 轮训练时的专家迭代循环`}
        >
          {/* 循环箭头(四段弧线,顺时针) */}
          {nodes.map((_, i) => {
            const a = nodes[i];
            const b = nodes[(i + 1) % 4];
            // 弧线中点偏移(向外凸)
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const ox = mx - cx;
            const oy = my - cy;
            const len = Math.sqrt(ox * ox + oy * oy) || 1;
            const cpx = mx + (ox / len) * 16;
            const cpy = my + (oy / len) * 16;
            const active = i === phase;
            return (
              <path
                key={`arr${i}`}
                d={`M ${a.x} ${a.y} Q ${cpx} ${cpy} ${b.x} ${b.y}`}
                fill="none"
                data-smooth
                stroke={active ? "#dc2626" : "var(--chart-grid)"}
                strokeWidth={active ? 2.5 : 1.2}
                markerEnd={`url(#arrow${active ? "A" : "N"})`}
              />
            );
          })}

          {/* 箭头 marker 定义 */}
          <defs>
            <marker id="arrowN" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--chart-muted)" />
            </marker>
            <marker id="arrowA" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#dc2626" />
            </marker>
          </defs>

          {/* 四个节点 */}
          {nodes.map((n, i) => {
            const active = i === phase;
            return (
              <g key={`node${i}`} data-smooth>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={active ? 30 : 26}
                  fill={active ? "#fef3c7" : "var(--chart-surface)"}
                  stroke={active ? "#dc2626" : "var(--chart-axis)"}
                  strokeWidth={active ? 2 : 1}
                />
                <text x={n.x} y={n.y - 3} textAnchor="middle" fontSize={9} fontWeight={active ? 700 : 400} fill="var(--chart-axis)">
                  {n.label}
                </text>
                <text x={n.x} y={n.y + 9} textAnchor="middle" fontSize={7} fill="var(--chart-muted)">
                  {n.sub}
                </text>
              </g>
            );
          })}

          {/* 中心标注 */}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            专家迭代
          </text>
          <text x={cx} y={cy + 8} textAnchor="middle" fontSize={7} fill="var(--chart-muted)">
            exIt 循环
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="训练迭代轮数" value={iter} min={0} max={MAXITER} step={1} onChange={setIter} decimals={0} />

          {/* 强度对比条 */}
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="mb-1.5 font-medium text-zinc-600 dark:text-zinc-300">网络强度 vs MCTS 强度</div>
            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">网络 π_θ</span>
                  <span className="font-mono">{netS.toFixed(3)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700">
                  <div data-smooth className="h-full rounded bg-sky-500" style={{ width: `${netS * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">MCTS(老师)</span>
                  <span className="font-mono">{mctsS.toFixed(3)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700">
                  <div data-smooth className="h-full rounded bg-amber-500" style={{ width: `${mctsS * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="mt-2 border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">策略 KL(网络 ‖ MCTS)</span>
                <span className="font-mono">{kl.toFixed(3)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700">
                <div data-smooth className="h-full rounded bg-rose-500" style={{ width: `${(kl / 0.92) * 100}%` }} />
              </div>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            <b>网络(蓝)</b>越练越强,但始终略低于 <b>MCTS 老师(橙)</b>——因为 MCTS 每轮都靠规则搜索注入新信息、领先一截。
            <b>策略 KL(红)</b>随训练递减:网络逐渐逼近 MCTS 的走子分布。这就是 AlphaZero self-play 不塌缩的根源:
            训练目标 π_MCTS 永远比网络当前 π_θ 强,形成稳定的提升梯度。
          </p>
        </div>
      </div>
    </div>
  );
}
