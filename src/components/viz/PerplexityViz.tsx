"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 语言模型困惑度:下一个词预测。模型对词表输出概率分布,真实下一词固定为「猫」。
// 拖「模型对正确词的信心」,看 NLL = -log P(正确词) 与 困惑度 perplexity = exp(NLL) 如何联动。
// 困惑度的直觉:相当于「模型在多少个等可能选项里犹豫」。纯确定性,SSR 安全。

const VOCAB = ["猫", "狗", "鱼", "鸟", "车"]; // 玩具词表,真实下一词 = 猫(index 0)
const TRUE_IDX = 0;

// 给定对正确词的信心 conf,把剩余质量按固定比例分给其它词
function makeDist(conf: number): number[] {
  const rest = 1 - conf;
  const w = [0, 0.35, 0.25, 0.22, 0.18]; // 其它词的相对权重(index0 占位)
  const wsum = w.reduce((a, b) => a + b, 0);
  return VOCAB.map((_, i) => (i === TRUE_IDX ? conf : rest * (w[i] / wsum)));
}

const W = 360;
const H = 170;
const PAD = 34;

export default function PerplexityViz() {
  const [conf, setConf] = useState(0.5);

  const dist = useMemo(() => makeDist(conf), [conf]);
  const pTrue = dist[TRUE_IDX];
  const nll = -Math.log(pTrue);
  const perplexity = Math.exp(nll); // = 1/pTrue

  const bw = (W - 2 * PAD) / VOCAB.length;
  const maxv = 1;

  // 困惑度直觉:等价「在 PP 个等可能选项里挑」——画一排灰格,数量 = round(PP)
  const equivN = Math.min(Math.round(perplexity), VOCAB.length * 4);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
        模型对下一个词的预测分布(真实词 = <span className="font-medium text-emerald-600">猫</span>)
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-lg bg-chart-surface shadow-sm">
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--chart-axis)" />
        {dist.map((p, i) => {
          const h = (p / maxv) * (H - 2 * PAD);
          const isTrue = i === TRUE_IDX;
          return (
            <g key={i}>
              <rect
                x={PAD + i * bw + 6}
                y={H - PAD - h}
                width={bw - 12}
                height={h}
                rx={2}
                fill={isTrue ? "#10b981" : "#94a3b8"}
                opacity={isTrue ? 0.95 : 0.6}
              />
              <text x={PAD + i * bw + bw / 2} y={H - PAD + 13} fontSize={11} textAnchor="middle" fill={isTrue ? "#059669" : "var(--chart-muted)"}>
                {VOCAB[i]}
              </text>
              <text x={PAD + i * bw + bw / 2} y={H - PAD - h - 4} fontSize={9} textAnchor="middle" fill="var(--chart-muted)">
                {p.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-4">
        <Slider label="模型对正确词「猫」的信心 P" value={conf} min={0.05} max={0.99} step={0.01} onChange={setConf} decimals={2} />
      </div>

      {/* 数值 + 困惑度直觉 */}
      <div className="mt-3 rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">P(正确词)</span><span className="font-mono text-emerald-600">{pTrue.toFixed(3)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">NLL = −log P</span><span className="font-mono">{nll.toFixed(3)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">困惑度 = exp(NLL) = 1/P</span><span className="font-mono text-amber-600">{perplexity.toFixed(2)}</span></div>
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">困惑度直觉:相当于在 ≈{equivN} 个等可能选项里犹豫 ↓</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {Array.from({ length: equivN }).map((_, i) => (
            <span key={i} className="inline-block h-3 w-3 rounded-sm bg-amber-400/70" />
          ))}
        </div>
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          信心越低 → NLL 越大 → 困惑度指数级上升。P=1 时困惑度=1(笃定);P=1/5 时困惑度=5(等于在 5 个词里瞎猜)。
        </div>
      </div>
    </div>
  );
}
