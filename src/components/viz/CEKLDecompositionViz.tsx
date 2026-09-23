"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 交叉熵分解:H(P,Q) = H(P) + D_KL(P‖Q)。
// 一个滑块「标签软硬度 s」把真实分布 P 从软标签(s=0)插值到 one-hot(s=1),
// 看堆叠条形里 H(P) 项如何随 s→1 收缩到 0——此时交叉熵塌缩成 = KL = NLL。
// 另一个滑块调预测 Q 的「准度」。纯确定性,SSR 安全。

const K = 3; // 三类
const SOFT_P = [0.7, 0.2, 0.1]; // 软标签起点
const ONEHOT: number[] = [1, 0, 0]; // 目标 one-hot(真实类 = 类0)

function lerp(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => v * (1 - t) + b[i] * t);
}

// 预测 Q:acc=1 时完美对齐 P 的 argmax(把大部分质量给类0),acc=0 时接近均匀
function makeQ(acc: number): number[] {
  const uniform = 1 / K;
  const confident = [0.8, 0.12, 0.08];
  return lerp(Array(K).fill(uniform), confident, acc);
}

function entropy(p: number[]): number {
  return -p.reduce((s, pi) => s + (pi > 0 ? pi * Math.log(pi) : 0), 0);
}
function crossEntropy(p: number[], q: number[]): number {
  return -p.reduce((s, pi, i) => s + pi * Math.log(q[i] + 1e-12), 0);
}
function kl(p: number[], q: number[]): number {
  return p.reduce((s, pi, i) => s + (pi > 0 ? pi * Math.log(pi / (q[i] + 1e-12)) : 0), 0);
}

const W = 340;
const H = 90;

function DistBars({ dist, title, color }: { dist: number[]; title: string; color: string }) {
  const bw = W / K;
  const maxv = 1;
  return (
    <div>
      <div className="mb-1 text-center text-xs text-zinc-500 dark:text-zinc-400">{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-lg bg-chart-surface shadow-sm">
        <line x1={0} y1={H - 20} x2={W} y2={H - 20} stroke="var(--chart-axis)" />
        {dist.map((p, i) => {
          const h = (p / maxv) * (H - 30);
          return (
            <g key={i}>
              <rect x={i * bw + 10} y={H - 20 - h} width={bw - 20} height={h} rx={2} fill={color} opacity={0.85} />
              <text x={i * bw + bw / 2} y={H - 6} fontSize={10} textAnchor="middle" fill="var(--chart-muted)">类{i}</text>
              <text x={i * bw + bw / 2} y={H - 24 - h} fontSize={9} textAnchor="middle" fill="var(--chart-muted)">{p.toFixed(2)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function CEKLDecompositionViz() {
  const [s, setS] = useState(0); // 0=软标签, 1=one-hot
  const [acc, setAcc] = useState(0.6); // 预测准度

  const P = useMemo(() => lerp(SOFT_P, ONEHOT, s), [s]);
  const Q = useMemo(() => makeQ(acc), [acc]);

  const HP = entropy(P);
  const KL = kl(P, Q);
  const CE = crossEntropy(P, Q);

  // 堆叠条:CE = HP + KL,画一条总长 CE 的横条,分两段
  const scale = 220 / Math.max(CE, 1e-6, 2.2); // 像素/nat,固定参考让缩放稳定
  const hpW = HP * scale;
  const klW = KL * scale;

  const collapsed = HP < 0.01;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-2">
        <DistBars dist={P} title={`真实分布 P（${collapsed ? "one-hot" : "软标签"}）`} color="#3b82f6" />
        <DistBars dist={Q} title="模型预测 Q" color="#10b981" />
      </div>

      {/* 分解堆叠条 */}
      <div className="mt-4 rounded-lg bg-chart-surface p-3 shadow-sm">
        <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">交叉熵 H(P,Q) 的分解:</div>
        <svg viewBox="0 0 300 44" className="h-auto w-full">
          {/* H(P) 段 */}
          <rect x={2} y={8} width={Math.max(hpW, collapsed ? 0 : 1)} height={22} rx={2} fill="#f59e0b" opacity={0.85} />
          {/* KL 段 */}
          <rect x={2 + hpW} y={8} width={Math.max(klW, 1)} height={22} rx={2} fill="#8b5cf6" opacity={0.85} />
          {hpW > 24 && <text x={2 + hpW / 2} y={23} fontSize={10} textAnchor="middle" fill="#fff">H(P)</text>}
          {klW > 20 && <text x={2 + hpW + klW / 2} y={23} fontSize={10} textAnchor="middle" fill="#fff">KL</text>}
          <text x={2} y={42} fontSize={9} fill="var(--chart-muted)">0</text>
        </svg>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#f59e0b" }} />H(P) = {HP.toFixed(3)}</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#8b5cf6" }} />D_KL = {KL.toFixed(3)}</span>
          <span className="text-zinc-500 dark:text-zinc-400">H(P,Q) = {CE.toFixed(3)}</span>
        </div>
      </div>

      {/* 控件 */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Slider label="标签软硬度（0=软 → 1=one-hot）" value={s} min={0} max={1} step={0.05} onChange={setS} decimals={2} />
        <Slider label="预测准度" value={acc} min={0} max={1} step={0.05} onChange={setAcc} decimals={2} />
      </div>

      <div className="mt-3 rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
        {collapsed ? (
          <div className="text-emerald-600">
            ✓ one-hot 下 H(P)=0 → 交叉熵**塌缩**成 H(P,Q) = D_KL = NLL,三个量完全相等。
          </div>
        ) : (
          <div className="text-zinc-500 dark:text-zinc-400">
            软标签下 H(P) &gt; 0,交叉熵 = KL + H(P) 这个常数偏移。把「软硬度」拖到 1,看 H(P) 段收缩到零、三量合一。
          </div>
        )}
        <div className="mt-1 text-zinc-500 dark:text-zinc-400">
          注意:调「预测准度」只改 KL 段;H(P) 段只由 P 自身决定,与模型无关——这正是「最小化 CE 与最小化 KL 等价」的原因。
        </div>
      </div>
    </div>
  );
}
