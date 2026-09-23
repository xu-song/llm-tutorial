"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";
import { makeRng } from "@/lib/prng";

// 分层 RL / 选项框架的核心收益:时间抽象缩短有效视野。
// 10 状态链,目标在最右端(r=+1,其余每步 r=-0.01)。
//   · Primitive(原语动作):每步向左/右走 1 格,1-step 贝尔曼。
//   · Options(选项):两个选项 R/L 各走最多 `optLen` 格,k-step SMDP 贝尔曼
//     Q(s,o) = R + gamma^k * max_o' Q(s',o')。
// 切换两种学习器 + 调选项长度 optLen,看「决策点(更新次数)」与「到达目标步数」如何变化:
// 选项越长,有效视野越短、更新越少,但选项过长会越过目标、牺牲精度。
// 仿真固定种子,SSR 安全;渲染期无随机。

const N = 10;
const GOAL = N - 1;
const GAMMA = 0.99;
const ALPHA = 0.2;
const EPS = 0.3;
const N_EPS = 1500;
const SEED = 1;

function envStep(s: number, a: number): [number, number, boolean] {
  if (s === GOAL) return [s, 0, true];
  const s2 = a === 0 ? Math.min(s + 1, GOAL) : Math.max(s - 1, 0);
  const r = s2 === GOAL ? 1.0 : -0.01;
  return [s2, r, s2 === GOAL];
}

function runOption(s: number, opt: number, optLen: number): [number, number, number, boolean] {
  let k = 0, R = 0, disc = 1, cur = s, done = false;
  while (k < optLen && !done) {
    const [ns, r, d] = envStep(cur, opt);
    cur = ns; R += disc * r; disc *= GAMMA; k++; done = d;
  }
  return [cur, R, k, done];
}

function simulate(optLen: number, useOptions: boolean, seed: number) {
  const rng = makeRng(seed);
  const Q = Array.from({ length: N }, () => [0, 0]);
  let updates = 0;
  const epSteps: number[] = [];
  for (let ep = 0; ep < N_EPS; ep++) {
    let s = 0, steps = 0, done = false;
    while (!done && steps < 100) {
      const ai = rng() < EPS ? Math.floor(rng() * 2) : Q[s].indexOf(Math.max(...Q[s]));
      if (useOptions) {
        const s0 = s;
        const [s2, R, k, d] = runOption(s, ai, optLen);
        Q[s0][ai] += ALPHA * (R + (d ? 0 : Math.pow(GAMMA, k) * Math.max(...Q[s2])) - Q[s0][ai]);
        s = s2; steps += k; updates++;
        done = d;
      } else {
        const [s2, r, d] = envStep(s, ai);
        Q[s][ai] += ALPHA * (r + (d ? 0 : GAMMA * Math.max(...Q[s2])) - Q[s][ai]);
        s = s2; steps++; updates++;
        done = d;
      }
    }
    epSteps.push(steps);
  }
  // greedy rollout
  let gs = 0, gst = 0, gd = false;
  while (!gd && gst < 100) {
    const ai = Q[gs].indexOf(Math.max(...Q[gs]));
    if (useOptions) {
      const [s2, , k, d] = runOption(gs, ai, optLen);
      gs = s2; gst += k; gd = d;
    } else {
      const [s2, , d] = envStep(gs, ai);
      gs = s2; gst++; gd = d;
    }
  }
  return { updates, greedySteps: gst, first100: avg(epSteps.slice(0, 100)), last100: avg(epSteps.slice(-100)), epSteps };
}

function avg(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

const W = 520;
const H = 300;
const PADL = 40;
const PADR = 16;
const PADT = 26;
const PADB = 44;
const PLOT_W = W - PADL - PADR;
const PLOT_H = H - PADT - PADB;

export default function OptionsHorizonViz() {
  const [optLen, setOptLen] = useState(3);
  const [useOptions, setUseOptions] = useState(true);

  const prim = useMemo(() => simulate(optLen, false, SEED), [optLen]);
  const opt = useMemo(() => simulate(optLen, true, SEED), [optLen]);

  // 学习曲线:复用 simulate 产出的每回合步数,做 30 回合滑动平均
  const curvePrim = useMemo(() => smooth(prim.epSteps, 30), [prim]);
  const curveOpt = useMemo(() => smooth(opt.epSteps, 30), [opt]);

  const maxY = 60;
  const sx = (i: number) => PADL + (i / (curvePrim.length - 1)) * PLOT_W;
  const sy = (y: number) => PADT + (1 - Math.min(y, maxY) / maxY) * PLOT_H;
  const path = (curve: number[]) =>
    curve.map((y, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(y).toFixed(1)}`).join(" ");

  const reduction = prim.updates / Math.max(opt.updates, 1);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">10 状态链 → 目标在最右</span>
        <div className="ml-auto grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setUseOptions(false)}
            aria-pressed={!useOptions}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${!useOptions ? "bg-sky-500 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"}`}
          >
            原语动作(1-step)
          </button>
          <button
            type="button"
            onClick={() => setUseOptions(true)}
            aria-pressed={useOptions}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${useOptions ? "bg-violet-500 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"}`}
          >
            选项(k-step SMDP)
          </button>
        </div>
      </div>

      {useOptions && (
        <div className="mb-3 max-w-xs">
          <Slider label="选项长度(每选项最多走几格)" value={optLen} min={1} max={6} step={1} onChange={setOptLen} decimals={0} />
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
        role="img"
        aria-label={`10 状态链上原语动作(1-step 贝尔曼)与选项(k-step SMDP 贝尔曼)的学习曲线对比。横轴为训练回合数(滑动平均),纵轴为每回合步数。原语曲线(蓝)用约 ${prim.updates} 次决策更新收敛到贪心 9 步;当前显示${useOptions ? `选项(长度${optLen},紫色高亮),用约 ${opt.updates} 次更新达到同样收敛,更新减少约 ${(reduction).toFixed(1)} 倍` : "原语动作(蓝色高亮)"}。选项越长,有效视野越短、决策更新越少,但过长会越过目标牺牲精度。`}
      >
        {[0, 15, 30, 45, 60].map((g) => {
          const y = sy(g);
          return (
            <g key={g}>
              <line x1={PADL} y1={y} x2={W - PADR} y2={y} stroke="var(--chart-grid)" strokeDasharray="2 3" />
              <text x={4} y={y + 3} fontSize={8} fill="var(--chart-muted)">{g}</text>
            </g>
          );
        })}
        <text x={4} y={PADT - 8} fontSize={8} fill="var(--chart-muted)">回合步数</text>

        {/* 原语曲线(参考,淡色) */}
        <path d={path(curvePrim)} fill="none" stroke="#0ea5e9" strokeWidth={1.5} opacity={useOptions ? 0.35 : 1} style={{ transition: "opacity 250ms ease-out" }} />
        {!useOptions && <text x={sx(curvePrim.length - 1) - 4} y={sy(curvePrim[curvePrim.length - 1]) - 4} textAnchor="end" fontSize={8} fill="#0ea5e9" fontWeight={600}>原语</text>}

        {/* 选项曲线(高亮) */}
        {useOptions && (
          <>
            <path d={path(curveOpt)} fill="none" stroke="#8b5cf6" strokeWidth={2} style={{ opacity: 0, animation: "rl-fade-in 300ms ease-out forwards" }} />
            <text x={sx(curveOpt.length - 1) - 4} y={sy(curveOpt[curveOpt.length - 1]) - 4} textAnchor="end" fontSize={8} fill="#8b5cf6" fontWeight={600} style={{ opacity: 0, animation: "rl-fade-in 300ms ease-out forwards" }}>选项</text>
          </>
        )}

        <text x={PADL + PLOT_W / 2} y={H - 10} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">训练回合数(滑动平均)→</text>
      </svg>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-chart-surface p-2 shadow-sm">
          <div className="text-zinc-500 dark:text-zinc-400">决策更新次数</div>
          <div className="font-mono font-semibold text-zinc-700 dark:text-zinc-200">
            {useOptions ? opt.updates : prim.updates}
          </div>
        </div>
        <div className="rounded-md bg-chart-surface p-2 shadow-sm">
          <div className="text-zinc-500 dark:text-zinc-400">贪心走到目标</div>
          <div className="font-mono font-semibold text-zinc-700 dark:text-zinc-200">
            {useOptions ? opt.greedySteps : prim.greedySteps} 步
          </div>
        </div>
        <div className="rounded-md bg-chart-surface p-2 shadow-sm">
          <div className="text-zinc-500 dark:text-zinc-400">更新减少倍数</div>
          <div className={`font-mono font-semibold ${useOptions ? "text-violet-600 dark:text-violet-400" : "text-zinc-700 dark:text-zinc-200"}`}>
            {useOptions ? `${reduction.toFixed(1)}×` : "1.0×"}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
        原语(蓝)每步都做一次贝尔曼更新,10 状态链要把奖励从右端逐格传到左端,需大量回合;选项(紫)把「连走 {optLen} 格」打包成一次 k-step 更新 <span className="font-mono">Q(s,o)=R+γ^k·max Q(s′,o′)</span>,奖励跨越多格直接传播,**有效视野缩短**——同样的最优路径,决策更新减少约 <b className="text-violet-600 dark:text-violet-400">{reduction.toFixed(1)}×</b>。但选项过长会越过目标(步数反弹),时间抽象以精度换效率。
      </p>
    </div>
  );
}

function smooth(xs: number[], win: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    const lo = Math.max(0, i - Math.floor(win / 2));
    const hi = Math.min(xs.length, i + Math.ceil(win / 2));
    const slice = xs.slice(lo, hi);
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}
