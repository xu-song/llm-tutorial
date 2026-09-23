"use client";

import { useState, useMemo } from "react";

// 3 类分类:真实分布是 one-hot(真实类别为「类 0」)。
// 用户调整模型的预测分布,观察交叉熵 / KL 散度变化。
const TRUE = [1, 0, 0];
const LABELS = ["类 0(真实)", "类 1", "类 2"];
const COLORS = ["#059669", "#0ea5e9", "#f59e0b"];

const BAR_W = 280;
const BAR_H = 28;

/** 交叉熵浏览器:拖动模型对 3 个类别的预测概率,看交叉熵损失如何随预测变化。 */
export default function CrossEntropyExplorer() {
  // 预测分布的原始权重(会归一化为概率)
  const [raw, setRaw] = useState([0.6, 0.25, 0.15]);

  const pred = useMemo(() => {
    const sum = raw.reduce((a, b) => a + b, 0) || 1;
    return raw.map((v) => v / sum);
  }, [raw]);

  const { crossEntropy, kl, trueEntropy } = useMemo(() => {
    const eps = 1e-12;
    // 交叉熵 H(P,Q) = -Σ P(i) log Q(i)
    let ce = 0;
    let h = 0;
    for (let i = 0; i < 3; i++) {
      ce += -TRUE[i] * Math.log2(pred[i] + eps);
      h += TRUE[i] > 0 ? -TRUE[i] * Math.log2(TRUE[i] + eps) : 0;
    }
    return { crossEntropy: ce, kl: ce - h, trueEntropy: h };
  }, [pred]);

  const setOne = (i: number, v: number) => {
    setRaw((prev) => prev.map((x, j) => (j === i ? v : x)));
  };

  // 预测对类 0 越自信,损失越低
  const quality = Math.max(0, Math.min(1, 1 - crossEntropy / 4));
  const ceColor = `hsl(${quality * 130}, 70%, 42%)`;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-5 sm:grid-cols-[1fr_200px]">
        <div className="space-y-3">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            真实类别是 <span className="font-medium text-emerald-700">类 0</span>。
            调整模型对每个类的预测概率(自动归一化):
          </div>
          {LABELS.map((label, i) => (
            <div key={i}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
                <span className="font-mono" style={{ color: COLORS[i] }}>
                  {(pred[i] * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={raw[i]}
                  onChange={(e) => setOne(i, parseFloat(e.target.value))}
                  className="w-32 accent-emerald-600"
                />
                {/* 概率条 */}
                <svg width={BAR_W} height={BAR_H} className="rounded bg-chart-surface">
                  <rect
                    x={0}
                    y={4}
                    width={pred[i] * BAR_W}
                    height={BAR_H - 8}
                    fill={COLORS[i]}
                    rx={3}
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col justify-center gap-3">
          <div className="rounded-lg bg-chart-surface p-3 text-center shadow-sm">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">交叉熵损失</div>
            <div className="font-mono text-2xl font-bold" style={{ color: ceColor }}>
              {crossEntropy.toFixed(3)}
            </div>
          </div>
          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">真实分布熵</span><span className="font-mono">{trueEntropy.toFixed(3)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">KL 散度</span><span className="font-mono">{kl.toFixed(3)}</span></div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            把「类 0」的概率拉高,损失趋近 0;模型越「自信地错」,损失越大。
          </p>
        </div>
      </div>
    </div>
  );
}
