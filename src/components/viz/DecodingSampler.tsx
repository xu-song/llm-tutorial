"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// 大模型解码可视化:固定一组 next-token logits,用温度 + top-k + top-p 三个旋钮
// 展示「候选词的概率如何变化、哪些词被保留进采样池」。
// 保留的词用彩色高亮,被截掉的词变灰。渲染期无随机,SSR/水合安全。

const VOCAB = ["猫", "狗", "在", "睡", "跑", "吃", "。", "的"];
const LOGITS = [3.2, 2.8, 1.0, 0.5, 0.3, 0.1, -0.5, -1.0];
const COLORS = ["#059669", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#f97316"];

const W = 460;
const H = 250;
const PAD = 36;

function softmaxT(logits: number[], T: number): number[] {
  const z = logits.map((v) => v / T);
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

/** 解码采样浏览器:调温度 / top-k / top-p,看候选词概率与「采样池」如何变化。 */
export default function DecodingSampler() {
  const [T, setT] = useState(1.0);
  const [k, setK] = useState(8); // top-k;=词表大小时相当于不裁剪
  const [p, setP] = useState(1.0); // top-p;=1 时不裁剪

  const { probs, kept } = useMemo(() => {
    const probs = softmaxT(LOGITS, T);
    // 按概率降序的下标
    const order = [...probs.keys()].sort((a, b) => probs[b] - probs[a]);
    // top-k:只留前 k 个
    const kSet = new Set(order.slice(0, k));
    // top-p(核采样):按降序累加,累计概率刚超过 p 时停
    const pSet = new Set<number>();
    let cum = 0;
    for (const i of order) {
      pSet.add(i);
      cum += probs[i];
      if (cum >= p) break;
    }
    // 同时满足 top-k 与 top-p 才保留
    const kept = new Set([...kSet].filter((i) => pSet.has(i)));
    return { probs, kept };
  }, [T, k, p]);

  const n = VOCAB.length;
  const bw = (W - 2 * PAD) / n;
  const baseY = H - PAD;
  const barMaxH = H - 2 * PAD;
  const maxP = Math.max(...probs);

  // 重新归一化后的采样概率(仅保留池内)
  const keptMass = [...kept].reduce((s, i) => s + probs[i], 0);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="解码时各候选词的概率与采样池"
        >
          <line x1={PAD} y1={baseY} x2={W - PAD} y2={baseY} stroke="var(--chart-axis)" />
          {probs.map((pr, i) => {
            const x = PAD + i * bw;
            const h = (pr / maxP) * barMaxH * 0.9;
            const inPool = kept.has(i);
            return (
              <g key={i}>
                <rect
                  x={x + bw * 0.15}
                  y={baseY - h}
                  width={bw * 0.7}
                  height={h}
                  rx={3}
                  fill={inPool ? COLORS[i] : "var(--chart-grid)"}
                  opacity={inPool ? 1 : 0.5}
                />
                <text x={x + bw / 2} y={baseY - h - 5} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                  {(pr * 100).toFixed(0)}%
                </text>
                <text
                  x={x + bw / 2}
                  y={baseY + 15}
                  textAnchor="middle"
                  fontSize={12}
                  fill={inPool ? "currentColor" : "var(--chart-muted)"}
                  className={inPool ? "text-zinc-900 dark:text-zinc-100" : ""}
                  fontWeight={inPool ? 600 : 400}
                >
                  {VOCAB[i]}
                </text>
              </g>
            );
          })}
          <text x={W - PAD} y={PAD - 14} textAnchor="end" fontSize={10} fill="var(--chart-muted)">
            彩色 = 采样池内 · 灰色 = 被裁掉
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-2.5">
          <Slider label="温度 T" value={T} min={0.1} max={2} step={0.1} onChange={setT} decimals={1} />
          <Slider label="top-k(保留前 k 个)" value={k} min={1} max={8} step={1} onChange={(v) => setK(Math.round(v))} decimals={0} />
          <Slider label="top-p(核采样)" value={p} min={0.1} max={1} step={0.05} onChange={setP} decimals={2} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">采样池大小</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {kept.size} / {n} 个词
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">池内概率之和</span>
              <span className="font-mono">{(keptMass * 100).toFixed(1)}%</span>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            T 越高分布越平(更随机);top-k / top-p 把长尾的低概率词<span className="font-semibold">踢出采样池</span>,防止偶尔蹦出离谱的词。三者可叠加使用。
          </p>
        </div>
      </div>
    </div>
  );
}
