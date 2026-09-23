"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

interface Pt {
  x: number;
  y: number;
  cls: 0 | 1;
}

// 两类训练点
const POINTS: Pt[] = [
  { x: 1.5, y: 2, cls: 0 }, { x: 2, y: 3, cls: 0 }, { x: 1, y: 3.5, cls: 0 },
  { x: 2.5, y: 1.5, cls: 0 }, { x: 1.8, y: 4, cls: 0 }, { x: 3, y: 2.8, cls: 0 },
  { x: 6, y: 6, cls: 1 }, { x: 6.5, y: 5, cls: 1 }, { x: 7, y: 6.5, cls: 1 },
  { x: 5.5, y: 7, cls: 1 }, { x: 6.8, y: 7.2, cls: 1 }, { x: 7.5, y: 5.5, cls: 1 },
];

const W = 360;
const H = 360;
const PAD = 30;
const AXIS = 8;

const sx = (x: number) => PAD + (x / AXIS) * (W - 2 * PAD);
const sy = (y: number) => H - PAD - (y / AXIS) * (H - 2 * PAD);
const inv = (px: number, py: number) => ({
  x: ((px - PAD) / (W - 2 * PAD)) * AXIS,
  y: ((H - PAD - py) / (H - 2 * PAD)) * AXIS,
});

const CLASS_COLOR = ["#0ea5e9", "#f59e0b"];

/** KNN 分类:点击放置查询点,调整 K,看最近的 K 个邻居投票决定类别。 */
export default function ScatterClassifier() {
  const [k, setK] = useState(3);
  const [query, setQuery] = useState<{ x: number; y: number } | null>({ x: 4, y: 4 });

  const { neighbors, predicted } = useMemo(() => {
    if (!query) return { neighbors: [] as number[], predicted: null as number | null };
    const sorted = POINTS.map((p, i) => ({
      i,
      d: Math.hypot(p.x - query.x, p.y - query.y),
    })).sort((a, b) => a.d - b.d);
    const top = sorted.slice(0, k);
    let votes0 = 0;
    top.forEach((n) => (POINTS[n.i].cls === 0 ? votes0++ : 0));
    const pred = votes0 > top.length / 2 ? 0 : 1;
    return { neighbors: top.map((n) => n.i), predicted: pred };
  }, [k, query]);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // SVG 通过 CSS 缩放(viewBox + max-w-full),需把点击坐标换算回 viewBox 坐标系
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const { x, y } = inv(px, py);
    if (x >= 0 && x <= AXIS && y >= 0 && y <= AXIS) setQuery({ x, y });
  };

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[360px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          onClick={handleClick}
          className="mx-auto h-auto max-w-full cursor-crosshair rounded-lg bg-chart-surface shadow-sm"
        >
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--chart-grid)" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--chart-grid)" />

          {/* 连接查询点到 K 个邻居的连线 */}
          {query &&
            neighbors.map((i) => (
              <line
                key={`ln-${i}`}
                x1={sx(query.x)}
                y1={sy(query.y)}
                x2={sx(POINTS[i].x)}
                y2={sy(POINTS[i].y)}
                stroke="#a1a1aa"
                strokeWidth={1}
                strokeDasharray="3 2"
              />
            ))}

          {/* 训练点 */}
          {POINTS.map((p, i) => (
            <circle
              key={`p-${i}`}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={neighbors.includes(i) ? 8 : 5}
              fill={CLASS_COLOR[p.cls]}
              stroke={neighbors.includes(i) ? "var(--foreground)" : "none"}
              strokeWidth={1.5}
            />
          ))}

          {/* 查询点 */}
          {query && predicted !== null && (
            <g>
              <circle cx={sx(query.x)} cy={sy(query.y)} r={9} fill={CLASS_COLOR[predicted]} opacity={0.5} />
              <circle cx={sx(query.x)} cy={sy(query.y)} r={9} fill="none" stroke="var(--foreground)" strokeWidth={2} strokeDasharray="3 2" />
              <text x={sx(query.x)} y={sy(query.y) - 14} fontSize={11} textAnchor="middle" fill="var(--foreground)">?</text>
            </g>
          )}
        </svg>

        <div className="flex flex-col justify-center gap-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">👆 点击图中任意位置放置一个待分类的点</p>
          <Slider label="邻居数 K" value={k} min={1} max={11} step={2} onChange={setK} decimals={0} />
          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="mb-2 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: CLASS_COLOR[0] }} />A 类</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: CLASS_COLOR[1] }} />B 类</span>
            </div>
            {predicted !== null && (
              <div>
                查询点被分类为{" "}
                <span className="font-bold" style={{ color: CLASS_COLOR[predicted] }}>
                  {predicted === 0 ? "A 类" : "B 类"}
                </span>
                <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">由最近的 {k} 个邻居投票决定</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
