"use client";

import { useState, useMemo } from "react";

// 朴素贝叶斯垃圾邮件分类:切换邮件中是否出现某些关键词,
// 看后验概率 P(垃圾|词) 如何随「证据」累积更新。
// 后验 ∝ 先验 × ∏ P(词|类)(假设各词条件独立 —— 这正是「朴素」之处)。

const PRIOR_SPAM = 0.4; // 先验:40% 邮件是垃圾

interface Word {
  label: string;
  pSpam: number; // P(出现该词 | 垃圾)
  pHam: number; // P(出现该词 | 正常)
}
const WORDS: Word[] = [
  { label: "免费", pSpam: 0.7, pHam: 0.05 },
  { label: "中奖", pSpam: 0.6, pHam: 0.02 },
  { label: "会议", pSpam: 0.05, pHam: 0.4 },
  { label: "点击链接", pSpam: 0.65, pHam: 0.1 },
  { label: "附件", pSpam: 0.2, pHam: 0.35 },
];

export default function NaiveBayesExplorer() {
  const [present, setPresent] = useState<boolean[]>(WORDS.map(() => false));

  const toggle = (i: number) =>
    setPresent((prev) => prev.map((v, j) => (j === i ? !v : v)));

  const { posterior, spamScore, hamScore } = useMemo(() => {
    // 只对「出现的词」累乘似然(简化的伯努利朴素贝叶斯)
    let spam = PRIOR_SPAM;
    let ham = 1 - PRIOR_SPAM;
    WORDS.forEach((w, i) => {
      if (present[i]) {
        spam *= w.pSpam;
        ham *= w.pHam;
      }
    });
    const posterior = spam / (spam + ham);
    return { posterior, spamScore: spam, hamScore: ham };
  }, [present]);

  const pct = (posterior * 100).toFixed(1);
  const verdict = posterior >= 0.5 ? "判为垃圾邮件 🚫" : "判为正常邮件 ✅";
  const anyPresent = present.some(Boolean);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            邮件里出现了哪些词?(点击切换)
          </div>
          {WORDS.map((w, i) => (
            <button
              key={w.label}
              onClick={() => toggle(i)}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
                present[i]
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="font-medium">「{w.label}」{present[i] ? "✓" : ""}</span>
              <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
                垃圾{w.pSpam} / 正常{w.pHam}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col justify-center gap-3">
          <div className="rounded-lg bg-chart-surface p-3 text-center shadow-sm">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">P(垃圾邮件 | 这些词)</div>
            <div className="font-mono text-3xl font-bold" style={{ color: posterior >= 0.5 ? "#ef4444" : "#059669" }}>
              {anyPresent ? `${pct}%` : `${(PRIOR_SPAM * 100).toFixed(0)}%`}
            </div>
            {/* 概率条 */}
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div className="h-full rounded-full transition-all" style={{ width: `${posterior * 100}%`, background: posterior >= 0.5 ? "#ef4444" : "#059669" }} />
            </div>
            <div className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {anyPresent ? verdict : `先验:未看任何词时 = ${(PRIOR_SPAM * 100).toFixed(0)}%`}
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            每选一个词,就把它的似然乘进去(<span className="font-semibold">假设词之间相互独立</span> —— 这就是「朴素」)。「免费」「中奖」把概率推高,「会议」把它拉低。
          </p>
        </div>
      </div>
    </div>
  );
}
