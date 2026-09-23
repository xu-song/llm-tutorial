"use client";

import { useState } from "react";
import Slider from "./Slider";

// 二十一点最优策略网格(Sutton & Barto Fig 5.2 的经典图):
// 玩家点数 12-21(纵) × 庄家明牌 A/2-10(横),要牌 hit / 停牌 stick 双色。
// 高级交互:①「有可用 A / 无可用 A」两张表分屏对比;②hover 单元格显示状态与动作;
// ③回合数滑块用预计算快照展示策略如何随训练从「乱」收敛到最优。
// 全程静态查表,SSR 安全,无随机。

// 玩家点数 12..21 → 行(从上到下 21..12,和教科书一致,高分在上)
const PLAYERS = [21, 20, 19, 18, 17, 16, 15, 14, 13, 12];
// 庄家明牌:A(记 1),2..10 → 列
const DEALERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DEALER_LABEL = (d: number) => (d === 1 ? "A" : String(d));

// 最优策略(1 = hit 要牌, 0 = stick 停牌),来自 S&B Fig 5.2。
// 无可用 A(hard):stick 阈值随庄家明牌变化的经典「阶梯」。
function optimalHard(player: number, dealer: number): number {
  if (player >= 17) return 0; // 17+ 一律停
  if (player <= 12) {
    // 12:庄家 4-6 停,其余要
    if (player === 12) return dealer >= 4 && dealer <= 6 ? 0 : 1;
  }
  // 13-16:庄家 2-6 停(赌庄家爆),7+ 要牌搏一把
  return dealer >= 2 && dealer <= 6 ? 0 : 1;
}

// 有可用 A(soft):更激进,阈值更高。
function optimalSoft(player: number, dealer: number): number {
  if (player >= 19) return 0; // soft 19+ 停
  if (player === 18) return dealer >= 2 && dealer <= 8 ? 0 : 1; // soft 18:2-8 停,否则要
  return 1; // soft 17 及以下一律要牌
}

type PolicyFn = (p: number, d: number) => number;

// 预计算「训练快照」:早期策略偏离最优,越训练越接近。
// snap∈[0,1]:0=随机乱策略,1=最优。用确定性伪噪声让早期表看着「乱」。
function snapshotAction(opt: PolicyFn, p: number, d: number, snap: number): number {
  const truth = opt(p, d);
  // 确定性伪随机:由 (p,d) 生成 [0,1)
  const h = ((p * 73856093) ^ (d * 19349663)) >>> 0;
  const noise = (h % 1000) / 1000;
  // snap 越小,越可能翻转成与最优相反(噪声 > snap 时翻转)
  return noise > snap ? 1 - truth : truth;
}

const SNAPSHOTS = [
  { eps: "1k", snap: 0.35 },
  { eps: "10k", snap: 0.6 },
  { eps: "100k", snap: 0.82 },
  { eps: "500k", snap: 0.95 },
  { eps: "∞(收敛)", snap: 1.0 },
];

const CELL = 30;
const GAP = 2;

function PolicyGrid({
  title,
  opt,
  snap,
  hovered,
  setHovered,
}: {
  title: string;
  opt: PolicyFn;
  snap: number;
  hovered: string | null;
  setHovered: (s: string | null) => void;
}) {
  const gridW = DEALERS.length * (CELL + GAP);
  const gridH = PLAYERS.length * (CELL + GAP);
  return (
    <div>
      <div className="mb-1 text-center text-xs font-medium text-zinc-600 dark:text-zinc-300">{title}</div>
      <svg
        viewBox={`0 0 ${gridW + 40} ${gridH + 30}`}
        className="h-auto w-full rounded-lg bg-chart-surface shadow-sm"
      >
        {/* 列标题:庄家明牌 */}
        {DEALERS.map((d, ci) => (
          <text key={d} x={40 + ci * (CELL + GAP) + CELL / 2} y={12} fontSize={10} textAnchor="middle" fill="var(--chart-muted)">
            {DEALER_LABEL(d)}
          </text>
        ))}
        {/* 行标题:玩家点数 */}
        {PLAYERS.map((p, ri) => (
          <text key={p} x={20} y={26 + ri * (CELL + GAP) + CELL / 2} fontSize={10} textAnchor="middle" fill="var(--chart-muted)">
            {p}
          </text>
        ))}
        {/* 单元格 */}
        {PLAYERS.map((p, ri) =>
          DEALERS.map((d, ci) => {
            const a = snapshotAction(opt, p, d, snap);
            const key = `${title}-${p}-${d}`;
            const isHover = hovered === key;
            return (
              <rect
                key={key}
                x={40 + ci * (CELL + GAP)}
                y={20 + ri * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={3}
                fill={a === 1 ? "#10b981" : "#3b82f6"}
                opacity={isHover ? 1 : 0.78}
                stroke={isHover ? "#f59e0b" : "transparent"}
                strokeWidth={2}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}

export default function BlackjackPolicyViz() {
  const [snapIdx, setSnapIdx] = useState(SNAPSHOTS.length - 1);
  const [hovered, setHovered] = useState<string | null>(null);
  const snap = SNAPSHOTS[snapIdx].snap;

  // 解析 hover 信息
  let hoverInfo: { table: string; player: number; dealer: number; action: number } | null = null;
  if (hovered) {
    const [table, p, d] = hovered.split("-");
    const opt = table.includes("可用 A") && !table.includes("无") ? optimalSoft : optimalHard;
    hoverInfo = {
      table,
      player: Number(p),
      dealer: Number(d),
      action: snapshotAction(opt, Number(p), Number(d), snap),
    };
  }

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* 图例 */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#10b981" }} />要牌 hit</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#3b82f6" }} />停牌 stick</span>
        <span>纵=玩家点数,横=庄家明牌</span>
      </div>

      {/* 分屏对比:无可用 A vs 有可用 A */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PolicyGrid title="无可用 A(hard)" opt={optimalHard} snap={snap} hovered={hovered} setHovered={setHovered} />
        <PolicyGrid title="有可用 A(soft)" opt={optimalSoft} snap={snap} hovered={hovered} setHovered={setHovered} />
      </div>

      {/* 回合数快照滑块 */}
      <div className="mt-4">
        <Slider
          label={`已模拟回合数:${SNAPSHOTS[snapIdx].eps}`}
          value={snapIdx}
          min={0}
          max={SNAPSHOTS.length - 1}
          step={1}
          onChange={(v) => setSnapIdx(Math.round(v))}
          decimals={0}
        />
      </div>

      {/* hover / 说明面板 */}
      <div className="mt-3 rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
        {hoverInfo ? (
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-zinc-500 dark:text-zinc-400">状态:<span className="font-mono text-zinc-700 dark:text-zinc-200">玩家 {hoverInfo.player} · 庄家 {DEALER_LABEL(hoverInfo.dealer)} · {hoverInfo.table}</span></span>
            <span className="text-zinc-500 dark:text-zinc-400">最优动作:<span className={hoverInfo.action === 1 ? "font-medium text-emerald-600" : "font-medium text-blue-500"}>{hoverInfo.action === 1 ? "要牌 hit" : "停牌 stick"}</span></span>
          </div>
        ) : (
          <div className="text-zinc-500 dark:text-zinc-400">
            悬停任意格子看该状态的最优动作。拖动滑块:早期策略「乱」(随机翻转),回合越多越收敛到教科书最优策略——这正是 MC 控制「用经验回报逐步逼近最优」的过程。
          </div>
        )}
      </div>
    </div>
  );
}
