"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

const W = 440;
const H = 220;
const PAD = 44;

const X_MIN = 0;
const X_MAX = 10;

// 一维数据:每个点有位置 x 和类别 cls。两类大致可分但有重叠。
interface Pt {
  x: number;
  cls: 0 | 1;
}
const POINTS: Pt[] = [
  { x: 1, cls: 0 }, { x: 1.8, cls: 0 }, { x: 2.4, cls: 0 }, { x: 3, cls: 0 },
  { x: 3.6, cls: 0 }, { x: 4.2, cls: 1 }, { x: 4.8, cls: 0 }, { x: 5.4, cls: 1 },
  { x: 6, cls: 1 }, { x: 6.6, cls: 0 }, { x: 7.2, cls: 1 }, { x: 7.8, cls: 1 },
  { x: 8.4, cls: 1 }, { x: 9, cls: 1 },
];

const CLASS_COLOR = ["#0ea5e9", "#f59e0b"];

const sx = (x: number) => PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD);

// 二元熵(以 2 为底),输入正类比例 p
const entropy = (p: number) => {
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
};

const ratio = (pts: Pt[]) =>
  pts.length === 0 ? 0 : pts.filter((p) => p.cls === 1).length / pts.length;

/** 信息增益浏览器:拖动阈值切分一维数据,实时看父/子节点的熵与信息增益。呼应信息论一章。 */
export default function SplitGainExplorer() {
  const [threshold, setThreshold] = useState(5);

  const stats = useMemo(() => {
    const left = POINTS.filter((p) => p.x < threshold);
    const right = POINTS.filter((p) => p.x >= threshold);
    const n = POINTS.length;

    const parentH = entropy(ratio(POINTS));
    const leftH = entropy(ratio(left));
    const rightH = entropy(ratio(right));
    // 加权子节点熵
    const childH = (left.length / n) * leftH + (right.length / n) * rightH;
    const gain = parentH - childH;
    return { left, right, parentH, leftH, rightH, childH, gain };
  }, [threshold]);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[440px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          {/* 数轴 */}
          <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="var(--chart-axis)" />
          {/* 左右区域底色 */}
          <rect x={PAD} y={PAD} width={sx(threshold) - PAD} height={H - 2 * PAD} fill="#0ea5e9" opacity={0.04} />
          <rect x={sx(threshold)} y={PAD} width={W - PAD - sx(threshold)} height={H - 2 * PAD} fill="#f59e0b" opacity={0.04} />

          {/* 阈值竖线 */}
          <line x1={sx(threshold)} y1={PAD - 6} x2={sx(threshold)} y2={H - PAD + 6} stroke="#ef4444" strokeWidth={2} />
          <text x={sx(threshold)} y={PAD - 12} fontSize={11} textAnchor="middle" fill="#ef4444">
            x = {threshold.toFixed(1)}
          </text>

          {/* 数据点 */}
          {POINTS.map((p, i) => (
            <circle key={i} cx={sx(p.x)} cy={H / 2} r={6} fill={CLASS_COLOR[p.cls]} stroke="var(--chart-surface)" strokeWidth={1.5} />
          ))}

          {/* 左右子集标注 */}
          <text x={(PAD + sx(threshold)) / 2} y={H - 14} fontSize={10} textAnchor="middle" fill="var(--chart-muted)">
            左:{stats.left.length} 个
          </text>
          <text x={(sx(threshold) + W - PAD) / 2} y={H - 14} fontSize={10} textAnchor="middle" fill="var(--chart-muted)">
            右:{stats.right.length} 个
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="切分阈值" value={threshold} min={0.5} max={9.5} step={0.1} onChange={setThreshold} decimals={1} />
          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="mb-2 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: CLASS_COLOR[0] }} />A 类</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: CLASS_COLOR[1] }} />B 类</span>
            </div>
            <div className="space-y-0.5 font-mono text-xs text-zinc-600 dark:text-zinc-300">
              <div>父节点熵:{stats.parentH.toFixed(3)}</div>
              <div>左子熵 :{stats.leftH.toFixed(3)} &nbsp; 右子熵:{stats.rightH.toFixed(3)}</div>
              <div>加权子熵:{stats.childH.toFixed(3)}</div>
            </div>
            <div className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">信息增益</span>
              <span className="ml-2 font-mono text-lg font-bold text-emerald-700">{stats.gain.toFixed(3)}</span>
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            决策树会选信息增益<span className="font-semibold text-emerald-600">最大</span>的阈值切分。拖动红线找让增益最大的位置 —— 那里左右两边最「纯」。
          </p>
        </div>
      </div>
    </div>
  );
}
