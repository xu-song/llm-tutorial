"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// FeUdal Networks(FuN)的方向性内在奖励可视化。
// Manager 在低时间分辨率上输出一个"目标方向" g(潜在空间里的方向向量);
// Worker 在原语层移动,产生一个状态位移方向 Δs。
// Worker 的内在奖励 = 位移方向与目标方向的余弦相似度 d_cos(Δs, g):
//   对齐(同向)→ +1,正交 → 0,反向 → −1。
// 这就是 FuN「Manager 只给方向、Worker 学怎么走到」的核心机制——目标是方向而非绝对坐标,
// 天然平移不变、且用 cosine 而非欧氏距离让 Worker 关注"往哪走"而非"走多远"。
// 纯解析(cosine),渲染期无随机,SSR 安全。

const W = 320;
const H = 320;
const CX = W / 2;
const CY = H / 2;
const R = 118; // 方向圆半径

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(a), y: CY - radius * Math.sin(a) }; // y 轴向上为正
}

/** FuN 的方向性内在奖励:拖 Manager 目标方向与 Worker 移动方向,看余弦对齐奖励。 */
export default function FeudalGoalViz() {
  const [goalDeg, setGoalDeg] = useState(30);
  const [workerDeg, setWorkerDeg] = useState(80);

  const { dcos, goalPt, workerPt } = useMemo(() => {
    const diff = ((goalDeg - workerDeg) * Math.PI) / 180;
    return {
      dcos: Math.cos(diff),
      goalPt: polar(goalDeg, R),
      workerPt: polar(workerDeg, R * 0.82),
    };
  }, [goalDeg, workerDeg]);

  // 奖励色:正向绿、反向红
  const rewardColor = dcos >= 0 ? "#10b981" : "#ef4444";

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[320px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto w-full max-w-[320px] rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`Manager 目标方向 ${goalDeg} 度,Worker 移动方向 ${workerDeg} 度,方向余弦对齐奖励 ${dcos.toFixed(2)}`}
        >
          {/* 方向圆 */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--chart-grid)" strokeWidth={1} />
          <circle cx={CX} cy={CY} r={R * 0.5} fill="none" stroke="var(--chart-grid)" strokeWidth={0.5} strokeDasharray="2 3" />
          {/* 坐标轴 */}
          <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="var(--chart-grid)" strokeWidth={0.5} />
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="var(--chart-grid)" strokeWidth={0.5} />

          {/* 夹角提示:两方向之间的浅色填充由两条箭头本身表达,此处画一条连接弧的弦以示夹角 */}
          <line
            x1={polar(goalDeg, R * 0.5).x}
            y1={polar(goalDeg, R * 0.5).y}
            x2={polar(workerDeg, R * 0.5).x}
            y2={polar(workerDeg, R * 0.5).y}
            stroke={rewardColor}
            strokeWidth={1}
            strokeDasharray="3 2"
            opacity={0.5}
            data-smooth
          />

          {/* Manager 目标方向箭头 */}
          <line x1={CX} y1={CY} x2={goalPt.x} y2={goalPt.y} stroke="var(--chart-accent)" strokeWidth={3} data-smooth markerEnd="url(#arrowG)" />
          {/* Worker 移动方向箭头 */}
          <line x1={CX} y1={CY} x2={workerPt.x} y2={workerPt.y} stroke={rewardColor} strokeWidth={3} data-smooth markerEnd="url(#arrowW)" />

          <defs>
            <marker id="arrowG" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--chart-accent)" />
            </marker>
            <marker id="arrowW" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill={rewardColor} />
            </marker>
          </defs>

          {/* 标签 */}
          <text x={goalPt.x} y={goalPt.y - 8} textAnchor="middle" fontSize={10} fill="var(--chart-accent)" fontWeight={700} data-smooth>
            Manager 目标 g
          </text>
          <text x={workerPt.x} y={workerPt.y + 16} textAnchor="middle" fontSize={10} fill={rewardColor} fontWeight={700} data-smooth>
            Worker Δs
          </text>

          {/* 中心奖励读数 */}
          <text x={CX} y={CY + R + 24} textAnchor="middle" fontSize={13} fontWeight={700} fill={rewardColor} data-smooth>
            内在奖励 d_cos = {dcos.toFixed(2)}
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="Manager 目标方向 g(度)" value={goalDeg} min={0} max={360} step={5} onChange={(v) => setGoalDeg(Math.round(v))} decimals={0} suffix="°" />
          <Slider label="Worker 移动方向 Δs(度)" value={workerDeg} min={0} max={360} step={5} onChange={(v) => setWorkerDeg(Math.round(v))} decimals={0} suffix="°" />
          <div className="rounded-md bg-chart-surface p-2.5 text-sm shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">方向余弦对齐</span>
              <span className="font-mono font-bold" style={{ color: rewardColor }}>{dcos.toFixed(3)}</span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              {dcos > 0.7 ? "高度对齐 → Worker 拿满内在奖励" : dcos > 0 ? "部分对齐 → 部分奖励" : dcos > -0.7 ? "偏离目标 → 奖励为负" : "背道而驰 → 强负奖励"}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            FuN 里 Manager 只下达<b>方向</b> <span className="font-mono">g</span>(潜在空间的目标向量),不给绝对坐标;
            Worker 的内在奖励 <span className="font-mono">rᵢ = d_cos(Δs, g)</span> 只看位移<b>方向</b>是否对齐——
            用<b>余弦</b>而非欧氏距离,让 Worker 关注「往哪走」而非「走多远」,且目标<b>平移不变</b>。
            Manager 在低时间分辨率(每 <span className="font-mono">c</span> 步)更新方向,把长时程信用分配交给它。
          </p>
        </div>
      </div>
    </div>
  );
}
