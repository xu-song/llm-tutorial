"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 蒸馏增益的「隐式样本重加权」可视化(BAN 梯度分解)。
// KD 梯度 = p*·∇L_CE + (1-p*)·∇L_dark:teacher 置信度 p* 低的样本,监督梯度被压低。
// 交互:一组样本按 teacher 置信度排列,拖动「重加权强度」观察各样本的有效梯度量级。
// 对比硬标签训练:难样本全量梯度 → 常带噪声/错标 → 过拟合;KD 自动降权。

const SAMPLES = [
  { id: 1, conf: 0.99, label: "典型样本" },
  { id: 2, conf: 0.93, label: "典型样本" },
  { id: 3, conf: 0.81, label: "边缘样本" },
  { id: 4, conf: 0.62, label: "难样本" },
  { id: 5, conf: 0.45, label: "难样本" },
  { id: 6, conf: 0.28, label: "疑似错标" },
  { id: 7, conf: 0.15, label: "疑似错标" },
];

const W = 460;
const H = 250;

export default function ConfidenceReweightViz() {
  const [useKD, setUseKD] = useState(true);

  const rows = useMemo(
    () =>
      SAMPLES.map((s) => ({
        ...s,
        hard: 1.0,
        kd: s.conf,
      })),
    []
  );

  const barW = (W - 90) / SAMPLES.length - 14;
  const baseY = H - 58;
  const maxH = baseY - 26;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="teacher 置信度对各样本有效梯度量级的重加权"
        >
          {/* 参考线 */}
          <line x1={40} y1={baseY} x2={W - 30} y2={baseY} stroke="var(--chart-axis)" />
          <line x1={40} y1={baseY - maxH} x2={W - 30} y2={baseY - maxH} stroke="var(--chart-grid)" strokeDasharray="2 3" />
          <text x={36} y={baseY - maxH + 4} textAnchor="end" fontSize={10} fill="var(--chart-muted)">
            1.0
          </text>
          <text x={36} y={baseY + 4} textAnchor="end" fontSize={10} fill="var(--chart-muted)">
            0
          </text>

          {rows.map((r, i) => {
            const x = 48 + i * (barW + 14);
            const hHard = r.hard * maxH;
            const hKD = r.kd * maxH;
            return (
              <g key={r.id}>
                {/* 硬标签:满量级(虚影) */}
                <rect
                  x={x}
                  y={baseY - hHard}
                  width={barW}
                  height={hHard}
                  rx={3}
                  fill="#94a3b8"
                  opacity={0.25}
                />
                {/* KD 有效量级 */}
                <rect
                  x={x}
                  y={baseY - hKD}
                  width={barW}
                  height={hKD}
                  rx={3}
                  fill={useKD ? "#059669" : "#94a3b8"}
                  opacity={useKD ? 0.95 : 0.5}
                />
                {/* teacher 置信度标注 */}
                <text x={x + barW / 2} y={baseY + 16} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                  p*={r.conf.toFixed(2)}
                </text>
                <text x={x + barW / 2} y={baseY + 30} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                  {r.label}
                </text>
              </g>
            );
          })}

          <text x={48} y={16} fontSize={10} fill="#94a3b8">
            ▩ 灰影:硬标签训练(所有样本等量梯度)
          </text>
          <text x={48} y={30} fontSize={10} fill="#059669">
            ▬ 蒸馏:有效梯度 ≈ p* × 监督梯度
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseKD(!useKD)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                useKD
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {useKD ? "蒸馏梯度:开" : "蒸馏梯度:关(硬标签)"}
            </button>
          </div>
          <div className="rounded-lg bg-chart-surface p-3 text-[13px] leading-relaxed text-zinc-600 shadow-sm dark:text-zinc-400">
            BAN 的梯度分解:∇L<sub>KD</sub> = p*·∇L<sub>CE</sub> + (1−p*)·∇L<sub>dark</sub>
            <br />
            teacher 自信的样本(p* → 1)退化为普通监督;teacher 不确定的样本梯度被压低。
          </div>
          <div className="rounded-lg bg-chart-surface p-3 text-[13px] leading-relaxed text-zinc-600 shadow-sm dark:text-zinc-400">
            这解释了蒸馏增益的一部分来源:<b>自动降权难样本/疑似错标样本</b>——
            不需要任何额外机制,软目标自带「课程」。消融实验(CWTM)证明仅这一项就能带来超越 teacher 的部分增益。
          </div>
        </div>
      </div>
    </div>
  );
}
