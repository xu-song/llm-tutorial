"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

const W = 440;
const H = 300;
const PAD = 36;

const X_MIN = 0;
const X_MAX = 1;

// 真实规律:一条平滑曲线
const trueFn = (x: number) => 0.5 + 0.35 * Math.sin(2 * Math.PI * x);

// 确定性伪随机(按 学习器索引 + 点索引 生成),避免渲染期调用 Math.random 导致水合不一致。
// 返回 [-1, 1] 附近的可复现「噪声」。
function noise(seed: number) {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

const sx = (x: number) => PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD);
const sy = (y: number) => H - PAD - y * (H - 2 * PAD); // y ∈ [0,1]

const NPTS = 40; // 每条曲线采样点数

/**
 * 集成学习浏览器:每棵「树」是对真实曲线的一个带噪声的粗糙估计(高方差)。
 * 把 N 棵树的预测平均,方差被抵消,平均曲线越来越贴近真实 —— 这就是 bagging/随机森林的核心。
 */
export default function EnsembleExplorer() {
  const [n, setN] = useState(1);

  const { treePaths, avgPath, avgErr } = useMemo(() => {
    const xs = Array.from({ length: NPTS }, (_, i) => X_MIN + (i / (NPTS - 1)) * (X_MAX - X_MIN));

    // 每棵树:真实值 + 该树特有的噪声(用阶梯式扰动模拟决策树的高方差)
    const trees: number[][] = [];
    for (let t = 0; t < n; t++) {
      const preds = xs.map((x, i) => {
        // 阶梯扰动:同一「区间」内共享噪声,模拟树的分段常数预测
        const bucket = Math.floor(x * 6);
        const eps = noise(t * 100 + bucket * 7 + 1) * 0.28;
        return Math.max(0.02, Math.min(0.98, trueFn(x) + eps));
      });
      trees.push(preds);
    }

    // 平均预测
    const avg = xs.map((_, i) => trees.reduce((s, tr) => s + tr[i], 0) / n);

    const toPath = (ys: number[]) =>
      "M" + xs.map((x, i) => `${sx(x)},${sy(ys[i])}`).join(" L");

    // 平均曲线与真实曲线的均方根误差
    const err = Math.sqrt(
      xs.reduce((s, x, i) => s + (avg[i] - trueFn(x)) ** 2, 0) / NPTS
    );

    // 最多画 12 条细灰线,避免太乱
    const shown = trees.slice(0, 12);
    return {
      treePaths: shown.map(toPath),
      avgPath: toPath(avg),
      avgErr: err,
    };
  }, [n]);

  const truePath =
    "M" +
    Array.from({ length: NPTS }, (_, i) => {
      const x = X_MIN + (i / (NPTS - 1)) * (X_MAX - X_MIN);
      return `${sx(x)},${sy(trueFn(x))}`;
    }).join(" L");

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[440px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          {/* 单棵树:细灰线(高方差) */}
          {treePaths.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="var(--chart-muted)" strokeWidth={1} opacity={0.35} />
          ))}
          {/* 真实曲线:橙虚线 */}
          <path d={truePath} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" />
          {/* 集成平均:粗绿线 */}
          <path d={avgPath} fill="none" stroke="#059669" strokeWidth={2.75} />
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="树的数量 N" value={n} min={1} max={100} step={1} onChange={setN} decimals={0} />
          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="mb-2 flex flex-col gap-1 text-xs">
              <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-zinc-400" />单棵树(高方差)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4" style={{ background: "#f59e0b" }} />真实规律</span>
              <span className="flex items-center gap-1"><span className="inline-block h-1 w-4" style={{ background: "#059669" }} />集成平均</span>
            </div>
            <div className="text-center">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">平均曲线 vs 真实的误差</div>
              <div className="font-mono text-2xl font-bold text-emerald-700">{avgErr.toFixed(4)}</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {n === 1 ? "只有 1 棵树:抖动剧烈" : avgErr < 0.03 ? "误差很小 —— 众树成林,方差被抹平!" : "增大 N,平均曲线更平滑"}
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            每棵树都是粗糙、带噪声的估计(高方差),但它们的<span className="font-semibold text-emerald-600">平均</span>会抵消随机误差,逼近真实规律。这就是随机森林「众树成林」的威力。
          </p>
        </div>
      </div>
    </div>
  );
}
