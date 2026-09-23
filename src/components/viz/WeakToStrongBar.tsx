"use client";

import { useState, useMemo } from "react";

// W2S 情景可视化:弱老师 → 强学生。
// 三个对比情景(OpenAI W2S 论文的真实实验数字):
// 1. NLP 任务:GPT-4 学生 vs GPT-2 级弱老师 —— naive 微调即恢复约 50% 差距
// 2. ChatGPT reward modeling:naive 恢复 <20%,bias amplification 主导
// 3. + 辅助 confidence loss:NLP 恢复差距升至约 80%
// 条形图:0 = 弱老师水平,1 = 强上限(gold 微调)。PGR = 恢复比例。

type Scene = {
  id: string;
  title: string;
  desc: string;
  pgr: number; // weak-to-strong performance gap recovered
  note: string;
};

const SCENES: Scene[] = [
  {
    id: "nlp",
    title: "NLP 任务 · naive 微调",
    desc: "GPT-4 学生,GPT-2 级弱老师(相差 7 个数量级算力)",
    pgr: 0.5,
    note: "学生普遍超越弱老师:naive 微调即可恢复约 50% 的 weak→strong 差距。",
  },
  {
    id: "rm",
    title: "ChatGPT 奖励建模 · naive 微调",
    desc: "弱老师是人类标注员一瞥而过训练的 reward model",
    pgr: 0.15,
    note: "PGR 几乎不超 20%:学生模仿并放大了弱老师的系统性偏见(bias amplification)。",
  },
  {
    id: "aux",
    title: "NLP + 辅助损失",
    desc: "joint training with auxiliary confidence loss",
    pgr: 0.8,
    note: "辅助损失(让强学生用自己的置信度「纠偏」弱标签)把恢复比例推到约 80%。",
  },
];

const W = 460;
const H = 230;
const PAD = 44;
const BAR_W = 56;

export default function WeakToStrongBar() {
  const [si, setSi] = useState(0);
  const scene = SCENES[si];
  const pgr = scene.pgr;

  const barBaseY = H - 36;
  const barTop = 28;
  const full = barBaseY - barTop; // 0→1 的高度

  const weakH = 0.08 * full; // 弱老师只比底线高一点
  const strongH = full;
  const w2sH = pgr * full;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap gap-2">
        {SCENES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setSi(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              i === si
                ? "bg-violet-600 text-white"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="弱到强泛化:弱老师、强学生、强上限的对比"
        >
          {/* 顶部/底部参考线 */}
          <line x1={PAD - 20} y1={barTop} x2={W - 10} y2={barTop} stroke="var(--chart-grid)" strokeDasharray="2 3" />
          <text x={W - 12} y={barTop - 6} textAnchor="end" fontSize={10} fill="var(--chart-muted)">
            强上限(gold 微调)= 100%
          </text>
          <line x1={PAD - 20} y1={barBaseY} x2={W - 10} y2={barBaseY} stroke="var(--chart-axis)" />
          <text x={W - 12} y={barBaseY + 12} textAnchor="end" fontSize={10} fill="var(--chart-muted)">
            弱老师 ≈ 底线
          </text>

          {[
            { label: "弱老师", h: weakH, color: "#f59e0b", x: PAD },
            { label: "强学生", h: w2sH, color: "#8b5cf6", x: PAD + 100 },
            { label: "强上限", h: strongH, color: "#059669", x: PAD + 200 },
          ].map((b) => (
            <g key={b.label}>
              <rect x={b.x} y={barBaseY - b.h} width={BAR_W} height={b.h} rx={3} fill={b.color} />
              <text x={b.x + BAR_W / 2} y={barBaseY - b.h - 6} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
                {b.label}
              </text>
            </g>
          ))}

          {/* PGR 标注 */}
          <line
            x1={PAD + 100 + BAR_W + 6}
            y1={barBaseY - w2sH}
            x2={PAD + 200 - 6}
            y2={barBaseY - w2sH}
            stroke="#8b5cf6"
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
          <text x={PAD + 200 + BAR_W + 8} y={barBaseY - w2sH / 2 + 14} fontSize={11} fill="#8b5cf6">
            PGR
          </text>
          <text x={PAD + 200 + BAR_W + 8} y={barBaseY - w2sH / 2 + 28} fontSize={11} fontWeight="bold" fill="#8b5cf6">
            {(pgr * 100).toFixed(0)}%
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="mb-1 font-medium">{scene.title}</div>
            <div className="mb-2 text-[13px] text-zinc-500 dark:text-zinc-400">{scene.desc}</div>
            <div className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">{scene.note}</div>
          </div>
          <div className="rounded-lg bg-chart-surface p-3 text-[13px] leading-relaxed text-zinc-600 shadow-sm dark:text-zinc-400">
            PGR(Performance Gap Recovered)= 学生超出弱老师的部分 ÷ 强上限超出弱老师的部分。
            只要学生没被弱老师的错误锁死,泛化就能带它超越监督者。
          </div>
        </div>
      </div>
    </div>
  );
}
