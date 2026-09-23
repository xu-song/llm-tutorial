"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 固定一组样本(造数据规律约为 y = 2x + 0)
const DATA: [number, number][] = [
  [1, 2.1],
  [2, 3.9],
  [3, 6.2],
  [4, 7.8],
  [5, 10.1],
];

const W = 420;
const H = 300;
const PAD = 40;
const X_MAX = 6;
const Y_MAX = 12;

const sx = (x: number) => PAD + (x / X_MAX) * (W - 2 * PAD);
const sy = (y: number) => H - PAD - (y / Y_MAX) * (H - 2 * PAD);

/** 拖动 w、b 实时观察回归线拟合与 MSE 变化、残差线段。 */
export default function LinePlayground() {
  const [w, setW] = useState(1);
  const [b, setB] = useState(1);

  const { mse, residuals } = useMemo(() => {
    let sum = 0;
    const res = DATA.map(([x, y]) => {
      const pred = w * x + b;
      sum += (y - pred) ** 2;
      return { x, y, pred };
    });
    return { mse: sum / DATA.length, residuals: res };
  }, [w, b]);

  // 拟合直线的两端点
  const x1 = 0;
  const x2 = X_MAX;
  const y1 = w * x1 + b;
  const y2 = w * x2 + b;

  // MSE 颜色:越小越绿,越大越红
  const quality = Math.max(0, Math.min(1, 1 - mse / 10));
  const mseColor = `hsl(${quality * 130}, 70%, 42%)`;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[420px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          {/* 坐标轴 */}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--chart-axis)" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--chart-axis)" />

          {/* 残差线段(预测与真实之间的误差) */}
          {residuals.map((r, i) => (
            <line
              key={`res-${i}`}
              x1={sx(r.x)}
              y1={sy(r.y)}
              x2={sx(r.x)}
              y2={sy(r.pred)}
              stroke="#f87171"
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
          ))}

          {/* 拟合直线 */}
          <line
            x1={sx(x1)}
            y1={sy(y1)}
            x2={sx(x2)}
            y2={sy(y2)}
            stroke="#059669"
            strokeWidth={2.5}
          />

          {/* 样本点 */}
          {DATA.map(([x, y], i) => (
            <circle key={`pt-${i}`} cx={sx(x)} cy={sy(y)} r={5} fill="#0ea5e9" />
          ))}
        </svg>

        <div className="flex flex-col justify-center gap-4">
          <Slider label="权重 w(斜率)" value={w} min={-1} max={4} step={0.1} onChange={setW} decimals={1} />
          <Slider label="偏置 b(截距)" value={b} min={-3} max={5} step={0.1} onChange={setB} decimals={1} />
          <div className="rounded-lg bg-chart-surface p-3 text-center shadow-sm">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">均方误差 MSE</div>
            <div className="font-mono text-2xl font-bold" style={{ color: mseColor }}>
              {mse.toFixed(3)}
            </div>
            <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              红色虚线 = 预测误差,目标是让它们尽量短
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
