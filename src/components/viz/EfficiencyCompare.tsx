"use client";

import { useState, useEffect } from "react";

// 效率对比:两组对数刻度条形图。
// 左图:达到 ~70% AIME 所需算力(RL=1.0 基准、SFT≈0.5、on-policy 蒸馏≈0.1)。
// 右图:每段序列的监督信号比特数(RL≈O(1) 稀疏、SFT=稠密但 off-policy、on-policy 蒸馏=O(N) 稠密且 on-policy)。
// 挂载时条形从 0 生长(data-smooth + transform: scaleY),一次性动画,无需定时器 —— SSR 安全。

const W = 460;
const H = 240;
const PAD = 36;

type Method = { name: string; compute: number; bits: number; color: string };
const METHODS: Method[] = [
  { name: "RL", compute: 1.0, bits: 1, color: "#8b5cf6" },
  { name: "SFT(离线)", compute: 0.5, bits: 8, color: "#0ea5e9" },
  { name: "on-policy 蒸馏", compute: 0.1, bits: 9, color: "#059669" },
];

// 对数刻度:y = log10(v+1)/log10(max+1)
function logScale(v: number, max: number) {
  return Math.log10(v + 1) / Math.log10(max + 1);
}

export default function EfficiencyCompare() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const maxCompute = 1.0;
  const maxBits = 10;
  const bw = (W - 2 * PAD) / (METHODS.length * 2 + 1); // 两组,中间留间隔

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
        role="img"
        aria-label="效率对比:算力与信号密度"
      >
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--chart-axis)" />
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line x1={PAD} y1={H - PAD - g * (H - 2 * PAD)} x2={W - PAD} y2={H - PAD - g * (H - 2 * PAD)} stroke="var(--chart-grid)" strokeDasharray="2 3" />
            <text x={PAD - 6} y={H - PAD - g * (H - 2 * PAD) + 4} textAnchor="end" fontSize={9} fill="var(--chart-muted)">
              {g === 1 ? "满" : g === 0.5 ? "中" : "0"}
            </text>
          </g>
        ))}

        {/* 左半:算力 */}
        <text x={PAD + bw * 1.5} y={20} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--chart-muted)">达到 ~70% AIME 的算力</text>
        {METHODS.map((m, i) => {
          const x = PAD + i * bw;
          const h = logScale(m.compute, maxCompute) * (H - 2 * PAD) * (mounted ? 1 : 0.001);
          return (
            <g key={`c-${i}`}>
              <rect
                data-smooth
                x={x + bw * 0.15}
                y={H - PAD - h}
                width={bw * 0.7}
                height={h}
                rx={3}
                fill={m.color}
                opacity={0.9}
                style={{ transformOrigin: `${x + bw * 0.5}px ${H - PAD}px` }}
              />
              <text x={x + bw / 2} y={H - PAD - h - 4} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                {m.compute === 1.0 ? "1.0(基准)" : `~${m.compute}`}
              </text>
              <text x={x + bw / 2} y={H - PAD + 14} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">{m.name}</text>
            </g>
          );
        })}

        {/* 右半:信号密度 */}
        <text x={PAD + bw * 4.5} y={20} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--chart-muted)">每段序列的监督比特(示意)</text>
        {METHODS.map((m, i) => {
          const x = PAD + (i + 3) * bw + bw;
          const h = logScale(m.bits, maxBits) * (H - 2 * PAD) * (mounted ? 1 : 0.001);
          return (
            <g key={`b-${i}`}>
              <rect
                data-smooth
                x={x + bw * 0.15}
                y={H - PAD - h}
                width={bw * 0.7}
                height={h}
                rx={3}
                fill={m.color}
                opacity={0.9}
                style={{ transformOrigin: `${x + bw * 0.5}px ${H - PAD}px` }}
              />
              <text x={x + bw / 2} y={H - PAD - h - 4} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                {m.bits === 1 ? "O(1)" : `O(${m.bits})`}
              </text>
              <text x={x + bw / 2} y={H - PAD + 14} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">{m.name}</text>
            </g>
          );
        })}
      </svg>

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
        左:on-policy 蒸馏算力约为 <b className="text-violet-600 dark:text-violet-400">RL 的 1/10</b>(老师已知好策略,学生直接学最终策略,跳过 RL 的搜索开销)。
        右:RL 每段序列只给 <b>O(1)</b> 比特(赢/输);on-policy 蒸馏逐 token 给反向 KL,<b>O(N)</b> 比特稠密信号——所以每条样本学到的更多、收敛更快。
      </p>
    </div>
  );
}
