"use client";

import { useState } from "react";

// 玩具语言模型的「语法图」:节点是词,箭头是「可能的下一个词」。
// 老师(绿色实线)语法严格,只有 4 条从 <s> 到「。」的路径;
// 学生(红色虚线)语法没学透,多出一堆「回头 / 重复」的错误转移。
// 切换查看老师 / 学生,直观看到「学生会走到老师根本不产生的上文」。

const W = 540;
const H = 300;

// 节点坐标(按语法位置分列)
const NODES: Record<string, { x: number; y: number }> = {
  "<s>": { x: 46, y: 150 },
  猫: { x: 165, y: 78 },
  狗: { x: 165, y: 222 },
  在: { x: 285, y: 150 },
  睡觉: { x: 405, y: 78 },
  跑: { x: 405, y: 222 },
  "。": { x: 500, y: 150 },
};

// 老师的合法转移(严格语法)
const TEACHER: [string, string][] = [
  ["<s>", "猫"], ["<s>", "狗"],
  ["猫", "在"], ["狗", "在"],
  ["在", "睡觉"], ["在", "跑"],
  ["睡觉", "。"], ["跑", "。"],
];

// 学生额外冒出的错误转移(从 bigram 统计里最高频的几条)
const STUDENT_WRONG: [string, string][] = [
  ["在", "猫"], ["在", "狗"], // 本该往前走,却回头蹦名词
  ["猫", "猫"], // 重复
  ["睡觉", "在"], // 句子该结束了却继续
];

const R = 22; // 节点半径

// 从圆心到圆心的连线,裁到圆边缘,返回起点/终点
function edgePoints(a: string, b: string, curve = 0) {
  const p = NODES[a];
  const q = NODES[b];
  if (a === b) {
    // 自环(重复):画在节点上方
    return null;
  }
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: p.x + ux * R,
    y1: p.y + uy * R,
    x2: q.x - ux * R,
    y2: q.y - uy * R,
    curve,
  };
}

/** 语法图:切换老师 / 学生,看老师只有 4 条合法路径,学生却多出一堆错误转移。 */
export default function GrammarGraph() {
  const [showStudent, setShowStudent] = useState(false);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* 切换按钮 */}
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setShowStudent(false)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            !showStudent
              ? "bg-emerald-600 text-white"
              : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
          }`}
        >
          老师(合法语法)
        </button>
        <button
          onClick={() => setShowStudent(true)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            showStudent
              ? "bg-rose-600 text-white"
              : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
          }`}
        >
          学生(会跑偏)
        </button>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
        role="img"
        aria-label="玩具语言模型的语法转移图"
      >
        <defs>
          <marker id="arrow-teacher" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#059669" />
          </marker>
          <marker id="arrow-student" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#e11d48" />
          </marker>
        </defs>

        {/* 老师的合法转移(始终显示,绿色实线) */}
        {TEACHER.map(([a, b], i) => {
          const e = edgePoints(a, b);
          if (!e) return null;
          return (
            <line
              key={`t-${i}`}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke="#059669"
              strokeWidth={2}
              markerEnd="url(#arrow-teacher)"
              opacity={showStudent ? 0.3 : 1}
            />
          );
        })}

        {/* 学生的错误转移(红色虚线,含回头箭头与自环) */}
        {showStudent &&
          STUDENT_WRONG.map(([a, b], i) => {
            if (a === b) {
              // 自环:节点上方画一个小圈(重复词,如 猫→猫)
              const p = NODES[a];
              return (
                <g key={`s-${i}`}>
                  <path
                    d={`M ${p.x - 8} ${p.y - R} C ${p.x - 26} ${p.y - R - 34}, ${p.x + 26} ${p.y - R - 34}, ${p.x + 8} ${p.y - R}`}
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    markerEnd="url(#arrow-student)"
                  />
                </g>
              );
            }
            const e = edgePoints(a, b);
            if (!e) return null;
            // 回头的边(x 变小)用曲线,避免和绿线重叠
            const mx = (e.x1 + e.x2) / 2;
            const my = (e.y1 + e.y2) / 2 - 34;
            return (
              <path
                key={`s-${i}`}
                d={`M ${e.x1} ${e.y1} Q ${mx} ${my} ${e.x2} ${e.y2}`}
                fill="none"
                stroke="#e11d48"
                strokeWidth={2}
                strokeDasharray="5 3"
                markerEnd="url(#arrow-student)"
              />
            );
          })}

        {/* 节点 */}
        {Object.entries(NODES).map(([tok, p]) => {
          const special = tok === "<s>" || tok === "。";
          return (
            <g key={tok}>
              <circle
                cx={p.x}
                cy={p.y}
                r={R}
                fill={special ? "var(--chart-surface)" : "#0ea5e9"}
                stroke={special ? "var(--chart-muted)" : "#0284c7"}
                strokeWidth={2}
                opacity={special ? 1 : 0.9}
              />
              <text
                x={p.x}
                y={p.y + 5}
                textAnchor="middle"
                fontSize={tok.length > 1 ? 12 : 14}
                fontWeight={600}
                fill={special ? "var(--chart-muted)" : "#fff"}
              >
                {tok}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {showStudent ? (
          <>
            <span className="font-semibold text-rose-600 dark:text-rose-400">红色虚线</span>是学生多出的错误转移:
            「在→猫」「在→狗」往回蹦名词,「猫→猫」重复,「睡觉→在」该结束却继续——
            这些上文<b>老师从不产生</b>,离线蒸馏里没有它们的监督。
          </>
        ) : (
          <>
            老师语法严格:每个岔路口只有少数合法选择。从 <b>&lt;s&gt;</b> 到 <b>。</b> 一共只有
            <span className="font-semibold text-emerald-600 dark:text-emerald-400"> 2×2 = 4 条路径</span>,
            对应 4 个句子(见下)。点「学生」看它会怎么跑偏。
          </>
        )}
      </p>
    </div>
  );
}
