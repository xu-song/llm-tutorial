"use client";

import { useState, useMemo } from "react";

const W = 440;
const H = 280;

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

// 一个预训练好、能解 XOR(异或)的 2-2-1 网络。
// 隐藏层 h1≈OR,h2≈AND;输出 ≈ OR AND NOT AND = XOR。
const WEIGHTS = {
  h1: { w1: 20, w2: 20, b: -10 }, // OR
  h2: { w1: 20, w2: 20, b: -30 }, // AND
  out: { w1: 20, w2: -20, b: -10 },
};

// 节点坐标
const NODES = {
  x1: { x: 60, y: 90 },
  x2: { x: 60, y: 190 },
  h1: { x: 220, y: 90 },
  h2: { x: 220, y: 190 },
  out: { x: 380, y: 140 },
};

// 正权重绿色、负权重红色,粗细表示绝对值
const edgeColor = (w: number) => (w >= 0 ? "#10b981" : "#ef4444");
const edgeWidth = (w: number) => 1 + Math.min(Math.abs(w) / 10, 4);

// 激活值映射成填充透明度
const fillFor = (a: number) => `rgba(16, 185, 129, ${(0.15 + a * 0.7).toFixed(3)})`;

/** 前馈神经网络可视化:切换两个二进制输入,看激活值逐层传播,网络算出 XOR。 */
export default function NeuralNetViz() {
  const [x1, setX1] = useState(1);
  const [x2, setX2] = useState(0);

  const { h1, h2, out } = useMemo(() => {
    const h1 = sigmoid(WEIGHTS.h1.w1 * x1 + WEIGHTS.h1.w2 * x2 + WEIGHTS.h1.b);
    const h2 = sigmoid(WEIGHTS.h2.w1 * x1 + WEIGHTS.h2.w2 * x2 + WEIGHTS.h2.b);
    const out = sigmoid(WEIGHTS.out.w1 * h1 + WEIGHTS.out.w2 * h2 + WEIGHTS.out.b);
    return { h1, h2, out };
  }, [x1, x2]);

  const prediction = out >= 0.5 ? 1 : 0;
  const truth = x1 ^ x2;

  const edges = [
    { from: NODES.x1, to: NODES.h1, w: WEIGHTS.h1.w1 },
    { from: NODES.x2, to: NODES.h1, w: WEIGHTS.h1.w2 },
    { from: NODES.x1, to: NODES.h2, w: WEIGHTS.h2.w1 },
    { from: NODES.x2, to: NODES.h2, w: WEIGHTS.h2.w2 },
    { from: NODES.h1, to: NODES.out, w: WEIGHTS.out.w1 },
    { from: NODES.h2, to: NODES.out, w: WEIGHTS.out.w2 },
  ];

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[440px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          {/* 层标签 */}
          <text x={60} y={28} fontSize={11} textAnchor="middle" fill="var(--chart-muted)">输入层</text>
          <text x={220} y={28} fontSize={11} textAnchor="middle" fill="var(--chart-muted)">隐藏层</text>
          <text x={380} y={28} fontSize={11} textAnchor="middle" fill="var(--chart-muted)">输出层</text>

          {/* 连接边 */}
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.from.x}
              y1={e.from.y}
              x2={e.to.x}
              y2={e.to.y}
              stroke={edgeColor(e.w)}
              strokeWidth={edgeWidth(e.w)}
              opacity={0.5}
            />
          ))}

          {/* 输入节点(可点击切换) */}
          {[
            { node: NODES.x1, val: x1, set: setX1, label: "x₁" },
            { node: NODES.x2, val: x2, set: setX2, label: "x₂" },
          ].map((n) => (
            <g key={n.label} onClick={() => n.set(n.val ? 0 : 1)} className="cursor-pointer">
              <circle cx={n.node.x} cy={n.node.y} r={22} fill={n.val ? fillFor(1) : "var(--chart-surface)"} stroke="var(--chart-axis)" strokeWidth={2} />
              <text x={n.node.x} y={n.node.y - 2} fontSize={16} fontWeight="bold" textAnchor="middle" fill="var(--foreground)">{n.val}</text>
              <text x={n.node.x} y={n.node.y + 13} fontSize={9} textAnchor="middle" fill="var(--chart-muted)">{n.label}</text>
            </g>
          ))}

          {/* 隐藏 / 输出节点(显示激活值) */}
          {[
            { node: NODES.h1, val: h1, label: "h₁" },
            { node: NODES.h2, val: h2, label: "h₂" },
            { node: NODES.out, val: out, label: "ŷ" },
          ].map((n) => (
            <g key={n.label}>
              <circle cx={n.node.x} cy={n.node.y} r={22} fill={fillFor(n.val)} stroke="var(--chart-axis)" strokeWidth={2} />
              <text x={n.node.x} y={n.node.y - 1} fontSize={13} fontWeight="bold" textAnchor="middle" fill="var(--foreground)">{n.val.toFixed(2)}</text>
              <text x={n.node.x} y={n.node.y + 13} fontSize={9} textAnchor="middle" fill="var(--chart-muted)">{n.label}</text>
            </g>
          ))}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">👆 点击 x₁、x₂ 节点切换 0/1,看激活值逐层传播</p>
          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="font-mono">
              输入 ({x1}, {x2}) → 输出 {out.toFixed(3)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span>网络预测:</span>
              <span className="font-bold text-emerald-700">{prediction}</span>
              <span className="text-zinc-400">/</span>
              <span>XOR 正解:</span>
              <span className="font-bold">{truth}</span>
              <span className="ml-auto">{prediction === truth ? "✅" : "❌"}</span>
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            绿边=正权重,红边=负权重,粗细表示大小。隐藏层把线性不可分的 XOR「掰弯」成可分 —— 这正是隐藏层的威力。
          </p>
        </div>
      </div>
    </div>
  );
}
