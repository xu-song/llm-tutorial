"use client";

import { useMemo, useState } from "react";
import Slider from "./Slider";
import { makeRng } from "@/lib/prng";

// Bootstrapped DQN 的「深度探索」可视化 —— 配合 dqn 篇「探索深化」小节。
//
// 设定:5 状态 × 3 动作,真值 Q*(s,a) = 0.3·s·a(故 s≥1 时最优动作是 a=2)。
//   K 个 head,每个 head 只见过 ~coverage 比例的 (s,a) 样本(二元 mask),其余回退到 0。
//   各 head 用带噪样本估计 Q → 不同 head 在「数据稀疏的 (s,a)」上分歧大。
//
// 左半:选中状态的 K 个 head 各自的 Q(s,a) 散点(每动作一列),分歧越大 = 不确定性越高。
// 右半:该状态各动作的「跨 head Q std」柱状图 = 探索 bonus(Bootstrapped 的不确定性度量)。
//       同时叠加 mean-Q 柱(半透明),看「分歧大的动作是否恰好是均值高的」。
//
// 交互:切状态、调 coverage(数据覆盖率)与 noise。coverage↓/noise↑ → std↑ → 探索 bonus↑。
// 渲染期无 Math.random,全部用 makeRng(seed) 确定性重放,SSR 安全。

const S = 5;
const A = 3;
const Q_TRUE: number[][] = Array.from({ length: S }, (_, s) =>
  Array.from({ length: A }, (_, a) => 0.3 * s * a)
);

// 高斯(Box-Muller,确定性,喂 makeRng 的均匀噪声)
function gauss(rng: () => number): number {
  let u = rng();
  if (u < 1e-12) u = 1e-12;
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// 给定 coverage/noise/seed,生成 K 个 head 的 Q 表(K×S×A)
function buildHeads(K: number, coverage: number, noise: number, seed: number): number[][][] {
  const rng = makeRng(seed);
  const heads: number[][][] = [];
  for (let k = 0; k < K; k++) {
    const Qk: number[][] = [];
    for (let s = 0; s < S; s++) {
      const row: number[] = [];
      for (let a = 0; a < A; a++) {
        if (rng() < coverage) {
          row.push(Q_TRUE[s][a] + noise * gauss(rng));
        } else {
          row.push(0); // 没数据回退 0
        }
      }
      Qk.push(row);
    }
    heads.push(Qk);
  }
  return heads;
}

const K = 8;
const SEED = 20260702;

const W = 460;
const H = 300;
const PADL = 34;
const PADR = 14;
const PADT = 16;
const PADB = 38;
const PLOTW = W - PADL - PADR;
const PLOTH = H - PADT - PADB;
const SPLIT_X = PADL + PLOTW * 0.52; // 左:散点;右:std/mean 柱

export default function BootstrappedDqnViz() {
  const [sState, setSState] = useState(2);
  const [coverage, setCoverage] = useState(0.55);
  const [noise, setNoise] = useState(0.4);

  const heads = useMemo(
    () => buildHeads(K, coverage, noise, SEED),
    [coverage, noise]
  );

  // 选中状态的统计
  const stats = useMemo(() => {
    const perAction: { mean: number; std: number; samples: number[]; covered: number }[] = [];
    for (let a = 0; a < A; a++) {
      const samples: number[] = [];
      let covered = 0;
      for (let k = 0; k < K; k++) {
        const v = heads[k][sState][a];
        samples.push(v);
        if (v !== 0) covered++;
      }
      const mean = samples.reduce((x, y) => x + y, 0) / K;
      const variance = samples.reduce((x, y) => x + (y - mean) ** 2, 0) / K;
      perAction.push({ mean, std: Math.sqrt(variance), samples, covered });
    }
    const maxAbs = Math.max(
      0.5,
      ...perAction.flatMap((p) => p.samples.map((v) => Math.abs(v)))
    );
    const maxStd = Math.max(0.05, ...perAction.map((p) => p.std));
    const maxMean = Math.max(0.05, ...perAction.map((p) => Math.abs(p.mean)));
    return { perAction, maxAbs, maxStd, maxMean };
  }, [heads, sState]);

  const { perAction, maxAbs, maxStd } = stats;

  // 左半散点 y:把 Q 值 [-maxAbs, maxAbs] 映到 [PADB 区]
  const scatterY = (v: number) =>
    PADT + (1 - (v + maxAbs) / (2 * maxAbs)) * PLOTH;
  // 散点 x:动作 a 的列中心
  const colW = (SPLIT_X - PADL) / A;
  const colX = (a: number) => PADL + a * colW + colW / 2;
  const dotR = 3.2;

  // 右半柱:std 与 mean 并排。每动作一格,格内两根细柱(std 暗色 / mean 亮色半透)
  const rightW = W - PADR - SPLIT_X;
  const cellW = rightW / A;
  const cellX = (a: number) => SPLIT_X + a * cellW + cellW / 2;
  const barW = cellW * 0.28;
  // std 柱:0..maxStd 映到 PLOTH;mean 柱:|mean|/maxMean 映到 PLOTH(可正可负,从零线起)
  const stdH = (v: number) => (v / maxStd) * PLOTH;
  const meanH = (v: number) => (Math.abs(v) / stats.maxMean) * (PLOTH * 0.7);
  const baseY = H - PADB; // 柱底
  const zeroY = PADT + PLOTH / 2; // 散点零线(右半 mean 也以此为基)

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`状态 s=${sState} 下 ${K} 个 head 的 Q 值散点与跨 head 分歧`}
        >
          {/* ===== 左半:K 个 head 的散点(每动作一列) ===== */}
          <text x={PADL} y={PADT + 2} fontSize={10} fill="var(--chart-muted)">
            {K} 个 head 的 Q(s={sState}, a)
          </text>
          {/* 散点零线 */}
          <line x1={PADL} y1={zeroY} x2={SPLIT_X - 4} y2={zeroY} stroke="var(--chart-grid)" strokeDasharray="2 3" />
          <text x={PADL - 3} y={zeroY + 3} textAnchor="end" fontSize={8} fill="var(--chart-muted)">0</text>
          {/* 每动作一列散点 */}
          {perAction.map((p, a) => (
            <g key={`scat-${a}`}>
              {p.samples.map((v, k) => (
                <circle
                  key={k}
                  data-smooth
                  cx={colX(a) + ((k % 4) - 1.5) * (dotR + 0.5)}
                  cy={scatterY(v)}
                  r={dotR}
                  fill={v === 0 ? "var(--chart-grid)" : "#0ea5e9"}
                  opacity={v === 0 ? 0.4 : 0.8}
                />
              ))}
              <text x={colX(a)} y={H - PADB + 12} textAnchor="middle" fontSize={8.5} fill="var(--chart-muted)">
                a={a}
              </text>
              <text x={colX(a)} y={H - PADB + 24} textAnchor="middle" fontSize={7.5} fill="var(--chart-muted)">
                {p.covered}/{K} 有数据
              </text>
            </g>
          ))}
          {/* 真值标记:每列真值 Q* 的虚线 */}
          {Array.from({ length: A }, (_, a) => (
            <line
              key={`true-${a}`}
              x1={colX(a) - colW * 0.3}
              y1={scatterY(Q_TRUE[sState][a])}
              x2={colX(a) + colW * 0.3}
              y2={scatterY(Q_TRUE[sState][a])}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
          ))}

          {/* 分隔线 */}
          <line x1={SPLIT_X} y1={PADT} x2={SPLIT_X} y2={H - PADB} stroke="var(--chart-grid)" strokeDasharray="3 3" />

          {/* ===== 右半:std(不确定性=探索 bonus)与 mean 柱 ===== */}
          <text x={SPLIT_X + 4} y={PADT + 2} fontSize={10} fill="var(--chart-muted)">
            跨 head 分歧 → 探索 bonus
          </text>
          {/* std 柱(暗色,基线=底) */}
          {perAction.map((p, a) => (
            <g key={`bar-${a}`}>
              <rect
                x={cellX(a) - cellW * 0.32}
                y={baseY - stdH(p.std)}
                width={barW}
                height={stdH(p.std)}
                data-smooth
                rx={1.5}
                fill="#6366f1"
                opacity={0.85}
                style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
              />
              <rect
                x={cellX(a) - cellW * 0.32 + barW + 1}
                y={zeroY - (p.mean >= 0 ? meanH(p.mean) : 0)}
                width={barW}
                height={meanH(p.mean)}
                data-smooth
                rx={1.5}
                fill="#0ea5e9"
                opacity={0.4}
              />
              <text x={cellX(a)} y={H - PADB + 12} textAnchor="middle" fontSize={8.5} fill="var(--chart-muted)">
                a={a}
              </text>
              <text x={cellX(a)} y={baseY - stdH(p.std) - 3} textAnchor="middle" fontSize={7.5} fill="#6366f1">
                {p.std.toFixed(2)}
              </text>
            </g>
          ))}
          <line x1={SPLIT_X} y1={baseY} x2={W - PADR} y2={baseY} stroke="var(--chart-axis)" />

          {/* 图例 */}
          <circle cx={W - PADR - 92} cy={PADT + 6} r={dotR} fill="#0ea5e9" opacity={0.8} />
          <text x={W - PADR - 84} y={PADT + 9} fontSize={8} fill="var(--chart-muted)">head 的 Q</text>
          <line x1={W - PADR - 52} y1={PADT + 6} x2={W - PADR - 42} y2={PADT + 6} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 2" />
          <text x={W - PADR - 40} y={PADT + 9} fontSize={8} fill="var(--chart-muted)">真值 Q*</text>
          <rect x={W - PADR - 16} y={PADT + 2} width={8} height={8} rx={1} fill="#6366f1" opacity={0.85} />
          <text x={W - PADR - 6} y={PADT + 9} fontSize={8} fill="var(--chart-muted)">std</text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="状态 s" value={sState} min={0} max={S - 1} step={1} onChange={setSState} decimals={0} />
          <Slider label="数据覆盖率 coverage" value={coverage} min={0.2} max={0.95} step={0.05} onChange={setCoverage} decimals={2} />
          <Slider label="样本噪声 σ" value={noise} min={0.1} max={0.8} step={0.05} onChange={setNoise} decimals={2} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">mean-Q argmax</span>
              <span className="font-mono">a={perAction.reduce((best, p, a) => (p.mean > perAction[best].mean ? a : best), 0)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">真值 argmax</span>
              <span className="font-mono">a={Q_TRUE[sState].reduce((best, v, a) => (v > Q_TRUE[sState][best] ? a : best), 0)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">最大分歧动作(std↑)</span>
              <span className="font-mono">
                a={perAction.reduce((best, p, a) => (p.std > perAction[best].std ? a : best), 0)} (std={Math.max(...perAction.map((p) => p.std)).toFixed(2)})
              </span>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            左:{K} 个 head 在选中状态各自估的 Q 值散点(空心=该 head 没数据,回退 0),橙虚线是真值 Q*。右:<b className="text-indigo-500 dark:text-indigo-400">紫柱=跨 head 的 Q 标准差</b>——分歧越大说明这个 (s,a) 越没被多个 head 一致地学过,正是<b>该探索</b>的方向;蓝半透柱是 mean-Q。调低 coverage 看 std 柱如何涨高——数据稀疏处不确定性自然变大,这就是 Bootstrapped DQN 用「head 间分歧」量化不确定性的机制。
          </p>
        </div>
      </div>
    </div>
  );
}
