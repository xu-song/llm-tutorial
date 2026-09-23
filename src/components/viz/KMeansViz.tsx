"use client";

import { useState, useMemo } from "react";

interface Pt {
  x: number;
  y: number;
}

// 三个自然分组的散点
const POINTS: Pt[] = [
  { x: 1.5, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 2.5 }, { x: 2.5, y: 1.8 }, { x: 1.8, y: 3.2 },
  { x: 7, y: 2 }, { x: 7.5, y: 3 }, { x: 6.5, y: 2.5 }, { x: 7.2, y: 1.5 }, { x: 6.8, y: 3 },
  { x: 4, y: 7 }, { x: 4.5, y: 6.5 }, { x: 3.5, y: 7 }, { x: 4.2, y: 7.5 }, { x: 5, y: 6.8 },
];

// 固定初始簇心(不用随机,保证可复现)
const INIT_CENTROIDS: Pt[] = [
  { x: 2, y: 6 },
  { x: 3, y: 2 },
  { x: 6, y: 5 },
];

const W = 380;
const H = 380;
const PAD = 30;
const AXIS = 9;
const COLORS = ["#0ea5e9", "#f59e0b", "#a855f7"];

const sx = (x: number) => PAD + (x / AXIS) * (W - 2 * PAD);
const sy = (y: number) => H - PAD - (y / AXIS) * (H - 2 * PAD);

function assign(points: Pt[], centroids: Pt[]): number[] {
  return points.map((p) => {
    let best = 0;
    let bestD = Infinity;
    centroids.forEach((c, i) => {
      const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  });
}

function recenter(points: Pt[], labels: number[], k: number): Pt[] {
  const sums = Array.from({ length: k }, () => ({ x: 0, y: 0, n: 0 }));
  points.forEach((p, i) => {
    const c = sums[labels[i]];
    c.x += p.x;
    c.y += p.y;
    c.n += 1;
  });
  return sums.map((s, i) =>
    s.n ? { x: s.x / s.n, y: s.y / s.n } : INIT_CENTROIDS[i]
  );
}

/** K-means 逐步动画:点击「下一步」交替执行「分配」与「更新簇心」。 */
export default function KMeansViz() {
  const [centroids, setCentroids] = useState<Pt[]>(INIT_CENTROIDS);
  const [labels, setLabels] = useState<number[]>([]);
  const [phase, setPhase] = useState<"assign" | "update">("assign");
  const [iter, setIter] = useState(0);

  const stable = useMemo(() => {
    if (labels.length === 0) return false;
    const next = assign(POINTS, centroids);
    return next.every((l, i) => l === labels[i]) && phase === "assign";
  }, [labels, centroids, phase]);

  const nextStep = () => {
    if (phase === "assign") {
      setLabels(assign(POINTS, centroids));
      setPhase("update");
    } else {
      setCentroids(recenter(POINTS, labels, centroids.length));
      setPhase("assign");
      setIter((n) => n + 1);
    }
  };

  const reset = () => {
    setCentroids(INIT_CENTROIDS);
    setLabels([]);
    setPhase("assign");
    setIter(0);
  };

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[380px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--chart-grid)" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--chart-grid)" />

          {/* 数据点(按当前归属着色) */}
          {POINTS.map((p, i) => (
            <circle
              key={`p-${i}`}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={5}
              fill={labels.length ? COLORS[labels[i]] : "#d4d4d8"}
            />
          ))}

          {/* 簇心 */}
          {centroids.map((c, i) => (
            <g key={`c-${i}`}>
              <line x1={sx(c.x) - 8} y1={sy(c.y)} x2={sx(c.x) + 8} y2={sy(c.y)} stroke={COLORS[i]} strokeWidth={3} />
              <line x1={sx(c.x)} y1={sy(c.y) - 8} x2={sx(c.x)} y2={sy(c.y) + 8} stroke={COLORS[i]} strokeWidth={3} />
              <circle cx={sx(c.x)} cy={sy(c.y)} r={11} fill="none" stroke={COLORS[i]} strokeWidth={2} />
            </g>
          ))}
        </svg>

        <div className="flex flex-col justify-center gap-4">
          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">迭代轮数</span><span className="font-mono">{iter}</span></div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-300">
              下一步:
              <span className="ml-1 font-medium text-emerald-700">
                {phase === "assign" ? "① 把每个点分配给最近的簇心" : "② 把簇心移到所属点的中心"}
              </span>
            </div>
            {stable && <div className="mt-2 text-emerald-600">✓ 已收敛,簇心不再移动</div>}
          </div>

          <div className="flex gap-2">
            <button
              onClick={nextStep}
              disabled={stable}
              className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              下一步 →
            </button>
            <button onClick={reset} className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100">
              重置
            </button>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            十字 = 簇心。反复执行「分配 → 更新」,簇心会逐渐稳定到各组中心。
          </p>
        </div>
      </div>
    </div>
  );
}
