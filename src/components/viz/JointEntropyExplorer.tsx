"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 联合分布热力图:2×2 的 P(X,Y),X=天气(晴/雨),Y=带伞(不带/带)。
// 用两个滑块参数化整个联合分布,实时算出边缘分布与熵家族五个指标。
// c=0.5 → 两变量独立(互信息 0);c→1 → 完全相关(互信息达 H(X))。
// 渲染期无随机,SSR/水合安全。

const CELL = 74; // 每格边长
const GAP = 3;
const LABELW = 46; // 左/上标签留白
const MARGIN = 8;
const GRID = LABELW + 2 * CELL + GAP; // 标签 + 两列

function H(arr: number[]) {
  let s = 0;
  for (const p of arr) if (p > 0) s -= p * Math.log2(p);
  return s;
}

// 概率 → 颜色深浅(蓝),用 rgba 透明度,明暗主题都可读
function cellFill(p: number) {
  // p ∈ [0, ~0.65] 映射到 opacity 0.08~0.92
  const t = Math.min(1, p / 0.6);
  return `rgba(14, 165, 233, ${(0.1 + 0.82 * t).toFixed(3)})`;
}

/** 联合分布热力图:拖动「下雨概率」与「相关强度」,观察联合/边缘分布与熵家族指标如何联动。 */
export default function JointEntropyExplorer() {
  const [pRain, setPRain] = useState(0.5);
  const [c, setC] = useState(0.8);

  const m = useMemo(() => {
    // 行 X: 晴(0)/雨(1);列 Y: 不带伞(0)/带伞(1)
    const P = [
      [(1 - pRain) * c, (1 - pRain) * (1 - c)],
      [pRain * (1 - c), pRain * c],
    ];
    const Px = [P[0][0] + P[0][1], P[1][0] + P[1][1]];
    const Py = [P[0][0] + P[1][0], P[0][1] + P[1][1]];
    const flat = [P[0][0], P[0][1], P[1][0], P[1][1]];
    const HX = H(Px);
    const HY = H(Py);
    const HXY = H(flat);
    const HYgX = HXY - HX; // 条件熵 H(Y|X)
    const MI = HX + HY - HXY; // 互信息
    return { P, Px, Py, HX, HY, HXY, HYgX, MI: Math.max(0, MI) };
  }, [pRain, c]);

  const svgW = GRID + 2 * MARGIN + 72; // 右侧留边缘数字(P(X))足够宽度,避免裁切
  const svgH = LABELW + 2 * CELL + GAP + 2 * MARGIN + 16;

  const xLabels = ["☀️ 晴", "🌧️ 雨"];
  const yLabels = ["不带伞", "带伞"];

  const cellX = (col: number) => MARGIN + LABELW + col * (CELL + GAP);
  const cellY = (row: number) => MARGIN + LABELW + row * (CELL + GAP);

  const stat = (label: string, val: number, color: string) => (
    <div className="flex items-center justify-between rounded-md bg-chart-surface px-2.5 py-1.5 shadow-sm">
      <span className="text-xs text-zinc-600 dark:text-zinc-300">{label}</span>
      <span className="font-mono text-sm font-bold" style={{ color }}>
        {val.toFixed(3)}
      </span>
    </div>
  );

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface text-zinc-900 shadow-sm dark:text-zinc-100"
          role="img"
          aria-label={`天气与带伞的联合分布热力图,互信息 ${m.MI.toFixed(3)} bit`}
        >
          {/* 列标签(Y:带伞) —— 顶部 */}
          {yLabels.map((lb, col) => (
            <text
              key={`c-${lb}`}
              x={cellX(col) + CELL / 2}
              y={MARGIN + LABELW - 8}
              textAnchor="middle"
              fontSize={12}
              fill="var(--chart-muted)"
            >
              {lb}
            </text>
          ))}
          {/* 行标签(X:天气) —— 左侧 */}
          {xLabels.map((lb, row) => (
            <text
              key={`r-${lb}`}
              x={MARGIN + LABELW - 8}
              y={cellY(row) + CELL / 2 + 4}
              textAnchor="end"
              fontSize={12}
              fill="var(--chart-muted)"
            >
              {lb}
            </text>
          ))}
          {/* 四个格子 */}
          {m.P.map((rowArr, row) =>
            rowArr.map((p, col) => (
              <g key={`${row}-${col}`}>
                <rect
                  x={cellX(col)}
                  y={cellY(row)}
                  width={CELL}
                  height={CELL}
                  rx={6}
                  fill={cellFill(p)}
                  stroke="var(--chart-muted)"
                  strokeWidth={1}
                />
                <text
                  x={cellX(col) + CELL / 2}
                  y={cellY(row) + CELL / 2 + 5}
                  textAnchor="middle"
                  fontSize={16}
                  fontWeight={600}
                  fill="currentColor"
                >
                  {p.toFixed(2)}
                </text>
              </g>
            )),
          )}
          {/* 边缘分布 P(X) —— 最右侧 */}
          {m.Px.map((p, row) => (
            <text
              key={`px-${row}`}
              x={cellX(1) + CELL + 10}
              y={cellY(row) + CELL / 2 + 4}
              textAnchor="start"
              fontSize={11}
              fill="var(--chart-muted)"
            >
              {p.toFixed(2)}
            </text>
          ))}
          {/* 边缘分布 P(Y) —— 最底部 */}
          {m.Py.map((p, col) => (
            <text
              key={`py-${col}`}
              x={cellX(col) + CELL / 2}
              y={cellY(1) + CELL + 14}
              textAnchor="middle"
              fontSize={11}
              fill="var(--chart-muted)"
            >
              {p.toFixed(2)}
            </text>
          ))}
          <text x={cellX(1) + CELL + 10} y={MARGIN + LABELW - 8} fontSize={10} fill="var(--chart-muted)">
            P(X)
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-2.5">
          <Slider label="下雨概率 P(雨)" value={pRain} min={0.05} max={0.95} step={0.05} onChange={setPRain} decimals={2} />
          <Slider label="相关强度" value={c} min={0.5} max={1} step={0.01} onChange={setC} decimals={2} />
          {stat("H(X) 天气", m.HX, "var(--chart-axis)")}
          {stat("H(Y) 带伞", m.HY, "var(--chart-axis)")}
          {stat("H(X,Y) 联合", m.HXY, "#0ea5e9")}
          {stat("H(Y|X) 条件", m.HYgX, "#f59e0b")}
          {stat("I(X;Y) 互信息", m.MI, "#059669")}
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            把「相关强度」拖到 <span className="font-mono">0.50</span> → 两变量<span className="font-semibold">独立</span>,互信息归零;拖到 <span className="font-mono">1.00</span> → <span className="font-semibold">完全相关</span>,知道天气就完全知道带不带伞。
          </p>
        </div>
      </div>
    </div>
  );
}
