"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";
import { makeRng } from "@/lib/prng";
import { BANDIT_TRUE as TRUE, BANDIT_BEST as BEST, BANDIT_COLORS as COLORS, BANDIT_K as K } from "@/lib/bandit";

// 多臂老虎机可视化:4 台机器,真实中奖率固定。拖动「拉动次数」滑块,
// 用固定种子的 ε-贪心重放前 N 次拉动,展示:估计中奖率如何逼近真实值、
// 拉动次数如何集中到最优臂。渲染期无随机(种子固定),SSR 安全。
// 臂设定与 PolicyGradientViz 共用 @/lib/bandit,保证并排看时一致。

const W = 420;
const H = 210;
const PAD = 34;

// 重放 n 次 ε-贪心拉动,返回每臂的估计中奖率与被拉次数
function simulate(n: number) {
  const rng = makeRng(7);
  const Q = new Array(K).fill(0);
  const cnt = new Array(K).fill(0);
  for (let t = 0; t < n; t++) {
    const eps = Math.max(0.02, 1 - t / 300);
    let a: number;
    if (rng() < eps) {
      a = Math.floor(rng() * K);
    } else {
      a = 0;
      for (let i = 1; i < K; i++) if (Q[i] > Q[a]) a = i;
    }
    const r = rng() < TRUE[a] ? 1 : 0;
    cnt[a] += 1;
    Q[a] += (r - Q[a]) / cnt[a];
  }
  return { Q, cnt };
}

/** 多臂老虎机:拖动拉动次数,看估计中奖率逼近真实、选择集中到最优臂。 */
export default function BanditExplorer() {
  const [pulls, setPulls] = useState(300);
  const { Q, cnt } = useMemo(() => simulate(pulls), [pulls]);

  const n = K;
  const bw = (W - 2 * PAD) / n;
  const baseY = H - PAD;
  const barMaxH = H - 2 * PAD;
  const picked = cnt.indexOf(Math.max(...cnt));

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[420px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="多臂老虎机各臂的估计中奖率与真实值"
        >
          <line x1={PAD} y1={baseY} x2={W - PAD} y2={baseY} stroke="var(--chart-axis)" />
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line x1={PAD} y1={baseY - g * barMaxH} x2={W - PAD} y2={baseY - g * barMaxH} stroke="var(--chart-grid)" strokeDasharray="2 3" />
              <text x={PAD - 6} y={baseY - g * barMaxH + 4} textAnchor="end" fontSize={9} fill="var(--chart-muted)">{g.toFixed(1)}</text>
            </g>
          ))}
          {Q.map((est, i) => {
            const x = PAD + i * bw;
            const h = est * barMaxH;
            const trueY = baseY - TRUE[i] * barMaxH;
            return (
              <g key={i}>
                {/* 估计中奖率柱 */}
                <rect x={x + bw * 0.2} y={baseY - h} width={bw * 0.6} height={h} rx={3} fill={COLORS[i]} opacity={i === BEST ? 1 : 0.7} />
                {/* 真实中奖率:虚线横标 */}
                <line x1={x + bw * 0.12} y1={trueY} x2={x + bw * 0.88} y2={trueY} stroke="var(--chart-muted)" strokeWidth={1.5} strokeDasharray="4 2" />
                <text x={x + bw / 2} y={baseY - h - 5} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">{est.toFixed(2)}</text>
                <text x={x + bw / 2} y={baseY + 14} textAnchor="middle" fontSize={10} fill="var(--chart-muted)">
                  {i === BEST ? "★" : ""}臂{i}
                </text>
                <text x={x + bw / 2} y={baseY + 26} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">{cnt[i]} 次</text>
              </g>
            );
          })}
          <text x={W - PAD} y={PAD - 12} textAnchor="end" fontSize={9} fill="var(--chart-muted)">柱=估计 · 虚线=真实中奖率</text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="拉动次数" value={pulls} min={0} max={2000} step={20} onChange={(v) => setPulls(Math.round(v))} decimals={0} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">拉得最多的臂</span>
              {pulls === 0 ? (
                <span className="font-mono text-zinc-400 dark:text-zinc-500">还没开始</span>
              ) : (
                <span className="font-mono font-semibold" style={{ color: COLORS[picked] }}>
                  臂 {picked} {picked === BEST ? "✓ 最优" : ""}
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            拉动越多,彩色柱(估计)越贴近虚线(真实);同时选择逐渐集中到中奖率最高的
            <span className="font-semibold text-emerald-600 dark:text-emerald-400"> ★ 臂 {BEST}</span>。
            次数少时估计还很飘 —— 这就是<b>探索</b>的代价与必要。
          </p>
        </div>
      </div>
    </div>
  );
}
