"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";
import Scrubber from "./Scrubber";

// 重要性采样:普通 IS vs 加权 IS,用 scrubber 拖动查看「看过前 k 条轨迹」时两种估计如何演化。
// 上图:每条轨迹的重要性权重 ρ 柱状(少数轨迹权重爆炸 → 直观解释「方差可无限」);
// 下图:ordinary IS 与 weighted IS 的运行估计轨迹,scrubber 高亮当前步。
// 全程确定性(LCG),可复现、SSR 安全。

const N = 120; // 轨迹条数
const TRUE_VALUE = 1.0; // 目标策略下回报的真值(构造使其 = 1)

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 构造 N 条轨迹:每条给出 重要性比率 ρ 与回报 G。
// gap 越大,行为策略与目标策略越不同 → ρ 的长尾越重(偶发极大权重)。
function makeData(gap: number, seed: number) {
  const rng = lcg(seed);
  const rhos: number[] = [];
  const returns: number[] = [];
  for (let i = 0; i < N; i++) {
    // 轨迹长度 5~10;每步比率 = 目标/行为,受 gap 调制
    const T = 5 + Math.floor(rng() * 6);
    let rho = 1;
    for (let t = 0; t < T; t++) {
      // 行为策略选了某动作,目标策略在该动作上的相对概率:
      // 多数步 ~1,偶尔出现 (1+gap) 的放大 → 连乘产生重尾
      const spike = rng() < 0.25 ? 1 + gap : 1 / (1 + gap * 0.4);
      rho *= spike;
    }
    rhos.push(rho);
    // 回报:围绕真值的带噪值(与 ρ 独立,便于看估计器行为)
    returns.push(TRUE_VALUE + (rng() - 0.5) * 0.4);
  }
  return { rhos, returns };
}

// 运行估计:ordinary = mean(ρ·G);weighted = Σρ·G / Σρ
function runningEstimates(rhos: number[], returns: number[]) {
  const ordinary: number[] = [];
  const weighted: number[] = [];
  let sumRG = 0;
  let sumR = 0;
  for (let i = 0; i < rhos.length; i++) {
    sumRG += rhos[i] * returns[i];
    sumR += rhos[i];
    ordinary.push(sumRG / (i + 1));
    weighted.push(sumR > 0 ? sumRG / sumR : 0);
  }
  return { ordinary, weighted };
}

const W = 560;
const H_TOP = 130;
const H_BOT = 200;
const PAD = 40;

export default function ImportanceSamplingViz() {
  const [gap, setGap] = useState(3);
  const [seed, setSeed] = useState(3);
  const [k, setK] = useState(N - 1); // 当前 scrubber 帧 = 已看轨迹数-1

  const { rhos, returns } = useMemo(() => makeData(gap, seed), [gap, seed]);
  const { ordinary, weighted } = useMemo(
    () => runningEstimates(rhos, returns),
    [rhos, returns]
  );

  const maxRho = useMemo(() => Math.max(...rhos), [rhos]);

  // --- 上图:ρ 柱状 ---
  const bx = (i: number) => PAD + (i / (N - 1)) * (W - 2 * PAD);
  const byTop = (v: number) => H_TOP - 20 - (v / maxRho) * (H_TOP - 40);

  // --- 下图:估计轨迹,y 聚焦真值附近 ---
  const estLo = 0;
  const estHi = Math.max(2, TRUE_VALUE * 2);
  const lx = (i: number) => PAD + (i / (N - 1)) * (W - 2 * PAD);
  const ly = (v: number) =>
    H_BOT - PAD - ((Math.min(v, estHi) - estLo) / (estHi - estLo)) * (H_BOT - 2 * PAD);

  const ordPath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= k; i++) pts.push(`${lx(i)},${ly(ordinary[i])}`);
    return pts.length ? "M" + pts.join(" L") : "";
  }, [k, ordinary]); // eslint-disable-line react-hooks/exhaustive-deps

  const wPath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= k; i++) pts.push(`${lx(i)},${ly(weighted[i])}`);
    return pts.length ? "M" + pts.join(" L") : "";
  }, [k, weighted]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* 上图:重要性权重分布 */}
      <div className="mb-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
        每条轨迹的重要性权重 ρ(少数轨迹权重爆炸 = 长尾)
      </div>
      <svg viewBox={`0 0 ${W} ${H_TOP}`} className="h-auto w-full rounded-lg bg-chart-surface shadow-sm">
        {rhos.map((r, i) => (
          <line
            key={i}
            x1={bx(i)}
            y1={H_TOP - 20}
            x2={bx(i)}
            y2={byTop(r)}
            stroke={i <= k ? (r > maxRho * 0.5 ? "#ef4444" : "#10b981") : "#a1a1aa"}
            strokeWidth={2}
            opacity={i <= k ? 0.9 : 0.25}
          />
        ))}
        {/* 当前帧竖线 */}
        <line x1={bx(k)} y1={8} x2={bx(k)} y2={H_TOP - 20} stroke="#059669" strokeDasharray="3 3" opacity={0.5} />
        <text x={PAD} y={14} fontSize={10} fill="var(--chart-muted)">max ρ = {maxRho.toFixed(1)}</text>
      </svg>

      {/* 下图:两种估计随样本数的演化 */}
      <div className="mb-1 mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
        普通 IS vs 加权 IS 的运行估计(真值 = 红线)
      </div>
      <svg viewBox={`0 0 ${W} ${H_BOT}`} className="h-auto w-full rounded-lg bg-chart-surface shadow-sm">
        {/* 真值线 */}
        <line x1={PAD} y1={ly(TRUE_VALUE)} x2={W - PAD} y2={ly(TRUE_VALUE)} stroke="#ef4444" strokeDasharray="4 3" />
        <text x={W - PAD} y={ly(TRUE_VALUE) - 4} fontSize={10} fill="#ef4444" textAnchor="end">真值 {TRUE_VALUE}</text>
        {/* 普通 IS(蓝)与 加权 IS(绿) */}
        <path d={ordPath} fill="none" stroke="#3b82f6" strokeWidth={2} />
        <path d={wPath} fill="none" stroke="#059669" strokeWidth={2} />
        {/* 当前点 */}
        <circle cx={lx(k)} cy={ly(ordinary[k])} r={4} fill="#3b82f6" />
        <circle cx={lx(k)} cy={ly(weighted[k])} r={4} fill="#059669" />
        {/* 图例 */}
        <g fontSize={11}>
          <rect x={PAD} y={8} width={10} height={10} fill="#3b82f6" />
          <text x={PAD + 14} y={17} fill="var(--chart-muted)">普通 IS</text>
          <rect x={PAD + 90} y={8} width={10} height={10} fill="#059669" />
          <text x={PAD + 104} y={17} fill="var(--chart-muted)">加权 IS</text>
        </g>
      </svg>

      {/* scrubber + 控件 */}
      <div className="mt-4 flex flex-col gap-3">
        <Scrubber
          value={k}
          frames={N}
          onChange={setK}
          label="拖动查看:已用轨迹数"
          format={(v) => `${v + 1} / ${N} 条`}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Slider label="策略差异度 (gap)" value={gap} min={0.5} max={6} step={0.5} onChange={setGap} decimals={1} />
          <Slider label="随机种子" value={seed} min={1} max={30} step={1} onChange={(v) => setSeed(Math.round(v))} decimals={0} />
        </div>
      </div>

      {/* 数值面板 */}
      <div className="mt-3 rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">已用轨迹数</span><span className="font-mono">{k + 1}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">普通 IS 估计</span><span className="font-mono text-blue-500">{ordinary[k].toFixed(4)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">加权 IS 估计</span><span className="font-mono text-emerald-600">{weighted[k].toFixed(4)}</span></div>
        <div className="mt-1 text-zinc-500 dark:text-zinc-400">
          调大 gap:普通 IS 被偶发的巨大 ρ 猛地拽偏(方差爆炸),加权 IS 因分母归一化更稳——代价是有偏。
        </div>
      </div>
    </div>
  );
}
