"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Slider from "./Slider";

// 大数定律收敛动画:逐个抽样本,左图散点(样本逐个落下)、右图运行均值曲线,
// 同一动画时钟驱动两个联动子图。样本均值收敛到真值,并画 ±1/√n 置信带。
// RNG 用可复现的 LCG(纯函数),避免 Math.random 的不可复现与 SSR 隐患。

type DistKind = "bernoulli" | "uniform" | "normal";

const DISTS: Record<
  DistKind,
  { label: string; mean: number; lo: number; hi: number; sd: number }
> = {
  // 伯努利 p=0.3:真值 0.3,取值 {0,1}
  bernoulli: { label: "伯努利 p=0.3", mean: 0.3, lo: -0.15, hi: 1.15, sd: Math.sqrt(0.3 * 0.7) },
  // 均匀 [0,1]:真值 0.5
  uniform: { label: "均匀 [0,1]", mean: 0.5, lo: -0.05, hi: 1.05, sd: 1 / Math.sqrt(12) },
  // 正态 N(0.5, 0.2²):真值 0.5
  normal: { label: "正态 N(0.5, 0.2²)", mean: 0.5, lo: -0.15, hi: 1.15, sd: 0.2 },
};

const MAX_N = 200;

// 可复现 LCG:给定 seed 生成 [0,1) 序列
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 用两次 uniform 生成一个标准正态(Box–Muller)
function drawSample(kind: DistKind, rng: () => number): number {
  if (kind === "bernoulli") return rng() < 0.3 ? 1 : 0;
  if (kind === "uniform") return rng();
  // normal
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return 0.5 + 0.2 * z;
}

// 预生成一整条样本序列(定长 MAX_N),动画只是逐步“揭示”前 n 个
function makeSamples(kind: DistKind, seed: number): number[] {
  const rng = lcg(seed);
  return Array.from({ length: MAX_N }, () => drawSample(kind, rng));
}

const W = 300;
const H = 240;
const PAD = 34;

export default function LLNConvergenceViz() {
  const [kind, setKind] = useState<DistKind>("bernoulli");
  const [seed, setSeed] = useState(7);
  const [n, setN] = useState(1); // 当前已揭示的样本数
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const dist = DISTS[kind];
  const samples = useMemo(() => makeSamples(kind, seed), [kind, seed]);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
  };
  const reset = () => {
    stop();
    setN(1);
  };
  const play = () => {
    if (running) return stop();
    if (n >= MAX_N) setN(1);
    setRunning(true);
    timer.current = setInterval(() => {
      setN((cur) => {
        if (cur >= MAX_N) {
          if (timer.current) clearInterval(timer.current);
          timer.current = null;
          setRunning(false);
          return cur;
        }
        return cur + 1;
      });
    }, 60);
  };

  // 卸载清理
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);
  // 切分布/种子时重置
  useEffect(() => reset(), [kind, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  // 运行均值序列
  const runningMean = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (let i = 0; i < samples.length; i++) {
      acc += samples[i];
      out.push(acc / (i + 1));
    }
    return out;
  }, [samples]);

  const curMean = runningMean[n - 1];

  // --- 左图:散点(x=样本序号, y=样本值) ---
  const sxL = (i: number) => PAD + (i / (MAX_N - 1)) * (W - 2 * PAD);
  const syVal = (v: number) =>
    H - PAD - ((v - dist.lo) / (dist.hi - dist.lo)) * (H - 2 * PAD);

  // --- 右图:运行均值曲线 + 置信带,y 轴聚焦真值附近 ---
  const yLo = dist.mean - 4 * dist.sd;
  const yHi = dist.mean + 4 * dist.sd;
  const sxR = (i: number) => PAD + (i / (MAX_N - 1)) * (W - 2 * PAD);
  const syMean = (v: number) =>
    H - PAD - ((v - yLo) / (yHi - yLo)) * (H - 2 * PAD);

  const meanPath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i < n; i++) pts.push(`${sxR(i)},${syMean(runningMean[i])}`);
    return pts.length ? "M" + pts.join(" L") : "";
  }, [n, runningMean]); // eslint-disable-line react-hooks/exhaustive-deps

  // ±1/√n 置信带(以真值为中心,乘以分布 sd 得到标准误 sd/√n)
  const bandPath = useMemo(() => {
    const upper: string[] = [];
    const lower: string[] = [];
    for (let i = 0; i < MAX_N; i++) {
      const se = dist.sd / Math.sqrt(i + 1);
      upper.push(`${sxR(i)},${syMean(dist.mean + se)}`);
      lower.push(`${sxR(i)},${syMean(dist.mean - se)}`);
    }
    return "M" + upper.join(" L") + " L" + lower.reverse().join(" L") + " Z";
  }, [dist]); // eslint-disable-line react-hooks/exhaustive-deps

  const converged = n >= MAX_N && Math.abs(curMean - dist.mean) < 2 * dist.sd / Math.sqrt(MAX_N);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* 分布选择 */}
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(DISTS) as DistKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              kind === k
                ? "bg-emerald-600 text-white"
                : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {DISTS[k].label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 左图:样本散点 */}
        <div>
          <div className="mb-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
            逐个抽出的样本(真值 = 红线)
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-lg bg-chart-surface shadow-sm">
            {/* 真值线 */}
            <line x1={PAD} y1={syVal(dist.mean)} x2={W - PAD} y2={syVal(dist.mean)} stroke="#ef4444" strokeDasharray="4 3" />
            <text x={W - PAD} y={syVal(dist.mean) - 4} fontSize={10} fill="#ef4444" textAnchor="end">
              真值 {dist.mean}
            </text>
            {/* 样本散点(已揭示的前 n 个) */}
            {samples.slice(0, n).map((v, i) => (
              <circle key={i} cx={sxL(i)} cy={syVal(v)} r={2.2} fill="#10b981" opacity={0.55} />
            ))}
            {/* 当前最新样本高亮 */}
            {n > 0 && <circle cx={sxL(n - 1)} cy={syVal(samples[n - 1])} r={4} fill="#059669" />}
          </svg>
        </div>

        {/* 右图:运行均值 + 置信带 */}
        <div>
          <div className="mb-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
            运行均值 → 真值(阴影 = ±1/√n 标准误带)
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-lg bg-chart-surface shadow-sm">
            {/* 置信带 */}
            <path d={bandPath} fill="#34d399" opacity={0.15} />
            {/* 真值线 */}
            <line x1={PAD} y1={syMean(dist.mean)} x2={W - PAD} y2={syMean(dist.mean)} stroke="#ef4444" strokeDasharray="4 3" />
            {/* 运行均值曲线 */}
            <path d={meanPath} fill="none" stroke="#059669" strokeWidth={2} />
            {/* 当前点 */}
            {n > 0 && <circle cx={sxR(n - 1)} cy={syMean(curMean)} r={4} fill="#059669" />}
          </svg>
        </div>
      </div>

      {/* 控件 */}
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-3">
          <Slider label="样本数 n" value={n} min={1} max={MAX_N} step={1} onChange={(v) => { stop(); setN(Math.round(v)); }} decimals={0} />
          <Slider label="随机种子" value={seed} min={1} max={40} step={1} onChange={(v) => setSeed(Math.round(v))} decimals={0} />
        </div>
        <div className="flex items-start gap-2">
          <button onClick={play} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">
            {running ? "暂停" : "▶ 逐样本抽"}
          </button>
          <button onClick={reset} className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
            重置
          </button>
        </div>
      </div>

      {/* 数值面板 */}
      <div className="mt-3 rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">当前样本数 n</span><span className="font-mono">{n}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">运行均值 x̄ₙ</span><span className="font-mono">{curMean?.toFixed(4)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">与真值之差</span><span className="font-mono">{(curMean - dist.mean >= 0 ? "+" : "") + (curMean - dist.mean).toFixed(4)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">标准误 σ/√n</span><span className="font-mono">{(dist.sd / Math.sqrt(n)).toFixed(4)}</span></div>
        {converged && <div className="mt-1 text-emerald-600">✓ 均值已落进 ±2 标准误内——大数定律生效</div>}
      </div>
    </div>
  );
}
