"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Slider from "./Slider";

// on-policy 蒸馏的训练循环动画。
// 四节点菱形布局(借鉴 ExpertIterationViz):① 学生采样 → ② 老师打分 → ③ 逐 token 反向 KL → ④ 梯度更新 → 回到 ①。
// 一个真实定时器循环点亮四个相位;右侧三根条:老师强度(恒定满)、学生强度(随训练步数饱和逼近老师)、
// 反向 KL(随训练递减)。所有数值用确定性饱和函数,渲染期无随机 —— SSR 安全。

const W = 460;
const H = 300;
const MAXSTEP = 100;

// 学生强度:从 0.2 饱和增长到 ~0.98(逼近老师,几乎贴上)
function studentStrength(step: number): number {
  return 0.2 + 0.78 * (1 - Math.exp(-step / 20));
}
// 老师强度:固定 1.0(老师一直「满格」)
const TEACHER_STRENGTH = 1.0;
// 反向 KL(学生 ‖ 老师):随训练递减,但留一个小残差(现实中很难归零)
function revKL(step: number): number {
  return 0.9 * Math.exp(-step / 22) + 0.02;
}

export default function OnPolicyDistillLoop() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0); // 0..3 当前激活相位
  const [step, setStep] = useState(8); // 训练步数
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const studentS = useMemo(() => studentStrength(step), [step]);
  const kl = useMemo(() => revKL(step), [step]);

  // 菱形四节点坐标
  const cx = W / 2;
  const cy = H / 2 + 4;
  const R = 80;
  const nodes = [
    { label: "1 学生采样", sub: "x ~ π_θ", x: cx, y: cy - R },
    { label: "2 老师打分", sub: "π_T(·|x_<t)", x: cx + R + 10, y: cy },
    { label: "3 逐 token 反向 KL", sub: "D_KL(π_θ ‖ π_T)", x: cx, y: cy + R },
    { label: "4 梯度更新 θ", sub: "∇θ L", x: cx - R - 10, y: cy },
  ];

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
  };
  const toggle = () => {
    if (running) return stop();
    setRunning(true);
    timer.current = setInterval(() => {
      setPhase((p) => (p + 1) % 4);
      // 每走完一圈(相位从 3 回到 0)训练步数 +1
      setStep((s) => (s >= MAXSTEP ? s : s + 1));
    }, 650);
  };
  // 卸载清理
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);
  // 手动拖 step 时停止动画
  const onStepChange = (v: number) => {
    stop();
    setStep(Math.round(v));
  };

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="on-policy 蒸馏训练循环:四相位轮流点亮"
        >
          <defs>
            <marker id="opdl-arrowN" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--chart-muted)" />
            </marker>
            <marker id="opdl-arrowA" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#dc2626" />
            </marker>
          </defs>

          {/* 四段循环弧线(顺时针) */}
          {nodes.map((_, i) => {
            const a = nodes[i];
            const b = nodes[(i + 1) % 4];
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
                markerEnd={`url(#opdl-arrow${active ? "A" : "N"})`}
              />
            );
          })}

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
            on-policy
          </text>
          <text x={cx} y={cy + 8} textAnchor="middle" fontSize={7} fill="var(--chart-muted)">
            蒸馏循环
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="训练步数" value={step} min={0} max={MAXSTEP} step={1} onChange={onStepChange} decimals={0} />

          {/* 强度对比条 */}
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="mb-1.5 font-medium text-zinc-600 dark:text-zinc-300">学生强度 vs 老师强度</div>
            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">老师 π_T</span>
                  <span className="font-mono">{TEACHER_STRENGTH.toFixed(3)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700">
                  <div data-smooth className="h-full rounded bg-amber-500" style={{ width: `${TEACHER_STRENGTH * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">学生 π_θ</span>
                  <span className="font-mono">{studentS.toFixed(3)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700">
                  <div data-smooth className="h-full rounded bg-sky-500" style={{ width: `${studentS * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="mt-2 border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">反向 KL(学生 ‖ 老师)</span>
                <span className="font-mono">{kl.toFixed(3)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700">
                <div data-smooth className="h-full rounded bg-rose-500" style={{ width: `${(kl / 0.92) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={toggle}
              className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              {running ? "⏸ 暂停循环" : "▶ 播放循环"}
            </button>
            <button
              onClick={() => { stop(); setPhase(0); setStep(0); }}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              重置
            </button>
          </div>

          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            四相位轮流点亮:<b className="text-rose-600 dark:text-rose-400">红</b>=当前激活。
            数据从<b>学生</b>流出(on-policy)、老师只做前向打分、逐 token 反向 KL 提供<b>稠密</b>信号、梯度只更新学生。
            随训练推进,<b className="text-sky-600 dark:text-sky-400">学生(蓝)</b>逼近<b className="text-amber-600 dark:text-amber-400">老师(橙)</b>,<b className="text-rose-600 dark:text-rose-400">反向 KL</b>递减——但留一小残差(现实里很难精确归零)。
          </p>
        </div>
      </div>
    </div>
  );
}
