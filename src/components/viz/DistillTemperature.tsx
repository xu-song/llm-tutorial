"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 知识蒸馏「温度」可视化。
// 一组固定 logits 经带温度的 softmax:q_i = softmax(z_i / T)。
// T=1 是普通 softmax(尖锐);T 越大分布越软,次高类的概率被「点亮」——
// 这些非最大类之间的相对大小就是老师传给学生的「暗知识」。

const LOGITS = [4.0, 2.0, 1.2, 0.3, -0.6];
const LABELS = ["猫", "狗", "狐狸", "汽车", "飞机"];
const COLORS = ["#059669", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444"];

const W = 420;
const H = 240;
const PAD = 36;

function softmaxT(logits: number[], T: number): number[] {
  const z = logits.map((v) => v / T);
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

/** 蒸馏温度浏览器:拖动温度 T,看老师的软标签如何从「尖锐 one-hot 样」变得柔和、点亮暗知识。 */
export default function DistillTemperature() {
  const [T, setT] = useState(1);
  const probs = useMemo(() => softmaxT(LOGITS, T), [T]);

  const n = LOGITS.length;
  const bw = (W - 2 * PAD) / n;
  const baseY = H - PAD;
  const barMaxH = H - 2 * PAD;

  // 次高类概率,用来量化「暗知识被点亮多少」
  const sorted = [...probs].sort((a, b) => b - a);
  const runnerUp = sorted[1];

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[420px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="不同温度下老师软标签的概率分布"
        >
          <line x1={PAD} y1={baseY} x2={W - PAD} y2={baseY} stroke="var(--chart-axis)" />
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line x1={PAD} y1={baseY - g * barMaxH} x2={W - PAD} y2={baseY - g * barMaxH} stroke="var(--chart-grid)" strokeDasharray="2 3" />
              <text x={PAD - 6} y={baseY - g * barMaxH + 4} textAnchor="end" fontSize={10} fill="var(--chart-muted)">
                {g.toFixed(1)}
              </text>
            </g>
          ))}
          {probs.map((p, i) => {
            const x = PAD + i * bw;
            const h = p * barMaxH;
            return (
              <g key={i}>
                <rect x={x + bw * 0.15} y={baseY - h} width={bw * 0.7} height={h} rx={3} fill={COLORS[i]} />
                <text x={x + bw / 2} y={baseY - h - 5} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
                  {(p * 100).toFixed(0)}%
                </text>
                <text x={x + bw / 2} y={baseY + 15} textAnchor="middle" fontSize={11} fill="var(--chart-muted)">
                  {LABELS[i]}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col justify-center gap-4">
          <Slider label="温度 T" value={T} min={0.5} max={8} step={0.1} onChange={setT} decimals={1} />
          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">最高类概率</span>
              <span className="font-mono">{(sorted[0] * 100).toFixed(1)}%</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">次高类概率</span>
              <span className="font-mono text-sky-600 dark:text-sky-400">{(runnerUp * 100).toFixed(1)}%</span>
            </div>
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
              {T <= 1.1
                ? "T≈1:分布尖锐,几乎只有最高类——接近硬标签,暗知识被压没了。"
                : T >= 5
                  ? "T 很大:分布很软,「猫像狗、不像飞机」的相对关系清晰可见——暗知识充分暴露。"
                  : "T 增大:次高类被逐渐「点亮」,老师开始透露类别间的相似结构。"}
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            同一组 logits,只改温度 T。学生要模仿的正是这条软化后的曲线——
            「猫」的图里「狗」也有不小概率,这种<b>类间相似度</b>就是硬标签给不了的暗知识。
          </p>
        </div>
      </div>
    </div>
  );
}
