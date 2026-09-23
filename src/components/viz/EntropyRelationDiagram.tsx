"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 熵关系图(information diagram):把 H(X)、H(Y)、H(X,Y)、条件熵、互信息
// 画成一条可对齐的「区间条」——三段拼接:H(X|Y) | I(X;Y) | H(Y|X)。
// 上方括号 H(X) 罩住前两段,下方括号 H(Y) 罩住后两段,重叠部分正是互信息 I。
// 沿用「天气/带伞」联合分布;渲染期无随机,SSR/水合安全。

const W = 480;
const H = 240;
const LP = 18; // 左边距
const SCALE = (W - 2 * LP) / 2; // 2 bit 铺满可用宽度
const BAR_Y = 92;
const BAR_H = 44;

const COL = {
  hxgy: "#0ea5e9", // H(X|Y) 蓝
  mi: "#059669", // I(X;Y) 绿
  hygx: "#f59e0b", // H(Y|X) 橙
};

function entropy(arr: number[]) {
  let s = 0;
  for (const p of arr) if (p > 0) s -= p * Math.log2(p);
  return s;
}

/** 熵关系图:拖动滑块,用区间条直观看 H(X)、H(Y)、联合熵、条件熵、互信息如何拼接与重叠。 */
export default function EntropyRelationDiagram() {
  const [pRain, setPRain] = useState(0.5);
  const [c, setC] = useState(0.8);

  const m = useMemo(() => {
    const P = [
      [(1 - pRain) * c, (1 - pRain) * (1 - c)],
      [pRain * (1 - c), pRain * c],
    ];
    const Px = [P[0][0] + P[0][1], P[1][0] + P[1][1]];
    const Py = [P[0][0] + P[1][0], P[0][1] + P[1][1]];
    const HX = entropy(Px);
    const HY = entropy(Py);
    const HXY = entropy([P[0][0], P[0][1], P[1][0], P[1][1]]);
    const MI = Math.max(0, HX + HY - HXY);
    const HXgY = Math.max(0, HX - MI); // H(X|Y)
    const HYgX = Math.max(0, HY - MI); // H(Y|X)
    return { HX, HY, HXY, MI, HXgY, HYgX };
  }, [pRain, c]);

  // 三段的像素坐标:H(X|Y) | I | H(Y|X)
  const x0 = LP;
  const x1 = x0 + m.HXgY * SCALE;
  const x2 = x1 + m.MI * SCALE;
  const x3 = x2 + m.HYgX * SCALE;

  // 括号:上=H(X)(段1+2),下=H(Y)(段2+3),最上=H(X,Y)(全部)
  const bracketUp = (xa: number, xb: number, y: number, label: string, val: number, color: string) => {
    if (xb - xa < 0.5) return null;
    return (
      <g>
        <line x1={xa} y1={y} x2={xb} y2={y} stroke={color} strokeWidth={1.5} />
        <line x1={xa} y1={y} x2={xa} y2={y + 6} stroke={color} strokeWidth={1.5} />
        <line x1={xb} y1={y} x2={xb} y2={y + 6} stroke={color} strokeWidth={1.5} />
        <text x={(xa + xb) / 2} y={y - 5} textAnchor="middle" fontSize={12} fontWeight={600} fill={color}>
          {label} = {val.toFixed(2)}
        </text>
      </g>
    );
  };
  const bracketDown = (xa: number, xb: number, y: number, label: string, val: number, color: string) => {
    if (xb - xa < 0.5) return null;
    return (
      <g>
        <line x1={xa} y1={y} x2={xb} y2={y} stroke={color} strokeWidth={1.5} />
        <line x1={xa} y1={y} x2={xa} y2={y - 6} stroke={color} strokeWidth={1.5} />
        <line x1={xb} y1={y} x2={xb} y2={y - 6} stroke={color} strokeWidth={1.5} />
        <text x={(xa + xb) / 2} y={y + 15} textAnchor="middle" fontSize={12} fontWeight={600} fill={color}>
          {label} = {val.toFixed(2)}
        </text>
      </g>
    );
  };

  const seg = (xa: number, xb: number, fill: string, label: string, val: number) => {
    if (xb - xa < 0.5) return null;
    const wide = xb - xa > 42;
    return (
      <g>
        <rect x={xa} y={BAR_Y} width={xb - xa} height={BAR_H} fill={fill} opacity={0.85} />
        {wide && (
          <>
            <text x={(xa + xb) / 2} y={BAR_Y + BAR_H / 2 - 2} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">
              {label}
            </text>
            <text x={(xa + xb) / 2} y={BAR_Y + BAR_H / 2 + 13} textAnchor="middle" fontSize={11} fill="#fff">
              {val.toFixed(2)}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[1fr_210px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`熵关系区间图:互信息 ${m.MI.toFixed(2)} bit`}
        >
          {/* 最上:联合熵 H(X,Y) 罩住全部三段 */}
          {bracketUp(x0, x3, 30, "H(X,Y) 联合熵", m.HXY, "var(--chart-muted)")}
          {/* 上:H(X) 罩住 段1+段2 */}
          {bracketUp(x0, x2, 62, "H(X)", m.HX, COL.hxgy)}
          {/* 三段条 */}
          {seg(x0, x1, COL.hxgy, "H(X|Y)", m.HXgY)}
          {seg(x1, x2, COL.mi, "I(X;Y)", m.MI)}
          {seg(x2, x3, COL.hygx, "H(Y|X)", m.HYgX)}
          {/* 下:H(Y) 罩住 段2+段3 */}
          {bracketDown(x1, x3, BAR_Y + BAR_H + 20, "H(Y)", m.HY, COL.hygx)}
          {/* 互信息在最底再标一次(重叠区) */}
          {bracketDown(x1, x2, BAR_Y + BAR_H + 56, "I(X;Y) 互信息(重叠)", m.MI, COL.mi)}
        </svg>

        <div className="flex flex-col justify-center gap-2.5">
          <Slider label="下雨概率 P(雨)" value={pRain} min={0.05} max={0.95} step={0.05} onChange={setPRain} decimals={2} />
          <Slider label="相关强度" value={c} min={0.5} max={1} step={0.01} onChange={setC} decimals={2} />
          <div className="rounded-md bg-chart-surface px-3 py-2 text-[11px] leading-relaxed text-zinc-600 shadow-sm dark:text-zinc-300">
            <div className="font-mono">
              H(X,Y) = H(X|Y) + I + H(Y|X)
            </div>
            <div className="mt-1 font-mono">
              I = H(X) + H(Y) − H(X,Y)
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            相关强度 = <span className="font-mono">0.50</span> → 绿色<span className="font-semibold">互信息段消失</span>,两条完全不重叠(独立);
            → <span className="font-mono">1.00</span> → 两条几乎完全重叠,知道一个就知道另一个。
          </p>
        </div>
      </div>
    </div>
  );
}
