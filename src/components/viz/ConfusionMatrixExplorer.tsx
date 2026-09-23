"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

const W = 360;
const H = 200;
const PAD = 36;

// 一组样本:每个有真实标签(1=正类/患病, 0=负类/健康)和模型打出的分数 [0,1]。
// 设计成有一定重叠,这样调阈值能看到 TP/FP 的权衡。
interface Sample {
  score: number;
  label: 0 | 1;
}
const SAMPLES: Sample[] = [
  { score: 0.05, label: 0 }, { score: 0.12, label: 0 }, { score: 0.18, label: 0 },
  { score: 0.25, label: 0 }, { score: 0.31, label: 1 }, { score: 0.38, label: 0 },
  { score: 0.44, label: 1 }, { score: 0.49, label: 0 }, { score: 0.55, label: 1 },
  { score: 0.6, label: 0 }, { score: 0.66, label: 1 }, { score: 0.72, label: 1 },
  { score: 0.78, label: 1 }, { score: 0.85, label: 0 }, { score: 0.91, label: 1 },
  { score: 0.97, label: 1 },
];

const sx = (s: number) => PAD + s * (W - 2 * PAD);
const POS = "#10b981";
const NEG = "#0ea5e9";

/** 混淆矩阵浏览器:拖动判定阈值,实时看 TP/FP/FN/TN 与准确率/精确率/召回率/F1 如何此消彼长。 */
export default function ConfusionMatrixExplorer() {
  const [threshold, setThreshold] = useState(0.5);

  const m = useMemo(() => {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const s of SAMPLES) {
      const pred = s.score >= threshold ? 1 : 0;
      if (s.label === 1 && pred === 1) tp++;
      else if (s.label === 0 && pred === 1) fp++;
      else if (s.label === 1 && pred === 0) fn++;
      else tn++;
    }
    const acc = (tp + tn) / SAMPLES.length;
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    return { tp, fp, fn, tn, acc, precision, recall, f1 };
  }, [threshold]);

  const cell = (label: string, val: number, bg: string) => (
    <div className={`rounded-md p-2 text-center ${bg}`}>
      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="font-mono text-lg font-bold">{val}</div>
    </div>
  );

  const metric = (label: string, val: number) => (
    <div className="rounded-md bg-chart-surface p-2 text-center shadow-sm">
      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="font-mono text-base font-bold text-emerald-700">{(val * 100).toFixed(0)}%</div>
    </div>
  );

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* 分数轴 + 阈值 */}
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto block h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
        <text x={W / 2} y={20} fontSize={11} textAnchor="middle" fill="var(--chart-muted)">模型打分(右侧=更可能为正类)</text>
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="var(--chart-axis)" />
        {/* 阈值线 */}
        <line x1={sx(threshold)} y1={40} x2={sx(threshold)} y2={H - 30} stroke="#ef4444" strokeWidth={2} />
        <text x={sx(threshold)} y={H - 16} fontSize={10} textAnchor="middle" fill="#ef4444">阈值 {threshold.toFixed(2)}</text>
        {/* 样本点:上排=真实正类,下排=真实负类 */}
        {SAMPLES.map((s, i) => (
          <circle
            key={i}
            cx={sx(s.score)}
            cy={s.label === 1 ? H / 2 - 22 : H / 2 + 22}
            r={5}
            fill={s.label === 1 ? POS : NEG}
            stroke={(s.score >= threshold ? 1 : 0) === s.label ? "none" : "#ef4444"}
            strokeWidth={2}
          />
        ))}
        <text x={PAD - 6} y={H / 2 - 18} fontSize={9} textAnchor="end" fill={POS}>正</text>
        <text x={PAD - 6} y={H / 2 + 26} fontSize={9} textAnchor="end" fill={NEG}>负</text>
      </svg>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
        {/* 混淆矩阵 */}
        <div>
          <div className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">混淆矩阵</div>
          <div className="grid grid-cols-2 gap-1.5">
            {cell("TP 真正例", m.tp, "bg-emerald-100 dark:bg-emerald-950")}
            {cell("FP 假正例", m.fp, "bg-amber-100 dark:bg-amber-950")}
            {cell("FN 假负例", m.fn, "bg-amber-100 dark:bg-amber-950")}
            {cell("TN 真负例", m.tn, "bg-emerald-100 dark:bg-emerald-950")}
          </div>
        </div>
        {/* 指标 */}
        <div>
          <div className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">评估指标</div>
          <div className="grid grid-cols-2 gap-1.5">
            {metric("准确率 Acc", m.acc)}
            {metric("精确率 Prec", m.precision)}
            {metric("召回率 Recall", m.recall)}
            {metric("F1", m.f1)}
          </div>
        </div>
      </div>

      <Slider label="判定阈值" value={threshold} min={0} max={1} step={0.01} onChange={setThreshold} decimals={2} />
      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
        红圈=判错的样本。阈值调低→召回率升、精确率降(宁可错杀);调高→反之。F1 在两者间取平衡。
      </p>
    </div>
  );
}
