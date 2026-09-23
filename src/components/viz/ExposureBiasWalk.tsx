"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Slider from "./Slider";

// 暴露偏差动画:6 格走格子玩具(沿用页面首个 CodeRunner 的设定)。
// 老师 teacher_p 全 1.0 —— 永远 0→5 直达;学生 student_p [0.9,0.9,0.9,0.5,0.4,1.0] —— 会卡在 3/4 格。
// 一个定时器逐 tick 推进预生成的学生轨迹,同时累积访问计数热力条;老师轨迹恒定 [0,1,2,3,4,5]。
// 用可复现 LCG(借鉴 LLNConvergenceViz),避免 Math.random 的 SSR 隐患。

const N = 6; // 格子数 0..5
const TEACHER_P = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
const STUDENT_P = [0.9, 0.9, 0.9, 0.5, 0.4, 1.0];
const ROLLOUT_LEN = 28; // 学生轨迹长度(足够卡几次后到终点)

// 可复现 LCG
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 预生成一条确定性的学生轨迹(从 0 走到 5,中间可能卡住)
function makeRollout(seed: number): number[] {
  const rng = lcg(seed);
  const path: number[] = [];
  let s = 0;
  for (let i = 0; i < ROLLOUT_LEN; i++) {
    path.push(s);
    if (s === N - 1) break;
    if (rng() < STUDENT_P[s]) s = Math.min(s + 1, N - 1);
  }
  return path;
}

const W = 480;
const H = 250;
const CELL = 56; // 单格宽度
const ROW_GAP = 18;
const TOP_Y = 36; // 老师行 y
const BOT_Y = TOP_Y + CELL + ROW_GAP; // 学生行 y
const HEAT_Y = BOT_Y + CELL + 14; // 热力条起始 y
const LEFT_X = (W - CELL * N) / 2;

// 格子中心 x
const cellCx = (s: number) => LEFT_X + s * CELL + CELL / 2;

export default function ExposureBiasWalk() {
  const [seed, setSeed] = useState(3);
  const [tick, setTick] = useState(0); // 已揭示的步数(0..path.length)
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const path = useMemo(() => makeRollout(seed), [seed]);
  // 老师轨迹:前 tick 步(min(tick, N-1) 个不同格子) —— 永远是 0,1,2,...,min(tick,5)
  const teacherPos = Math.min(tick, N - 1);
  const studentPos = path[Math.min(tick, path.length - 1)] ?? 0;

  // 累积访问计数(到当前 tick 为止)
  const visits = useMemo(() => {
    const c = new Array(N).fill(0);
    for (let i = 0; i <= tick && i < path.length; i++) c[path[i]]++;
    return c;
  }, [tick, path]);
  const maxVisits = Math.max(1, ...visits);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
  };
  const reset = () => {
    stop();
    setTick(0);
  };
  const play = () => {
    if (running) return stop();
    if (tick >= path.length - 1) setTick(0);
    setRunning(true);
    timer.current = setInterval(() => {
      setTick((cur) => {
        if (cur >= path.length - 1) {
          if (timer.current) clearInterval(timer.current);
          timer.current = null;
          setRunning(false);
          return cur;
        }
        return cur + 1;
      });
    }, 450);
  };
  // 卸载清理
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);
  // 换种子重置
  useEffect(() => reset(), [seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const stuck = tick > 0 && path[tick] === path[Math.max(0, tick - 1)] && path[tick] !== N - 1;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />老师(每格必前进)</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />学生(会卡在 3/4 格)</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
        role="img"
        aria-label="暴露偏差:老师直达终点,学生卡在中间格"
      >
        {/* 老师行格子 */}
        <text x={LEFT_X - 8} y={TOP_Y + CELL / 2 + 4} textAnchor="end" fontSize={10} fill="var(--chart-muted)">老师</text>
        {Array.from({ length: N }, (_, s) => (
          <g key={`t-cell-${s}`}>
            <rect
              x={LEFT_X + s * CELL}
              y={TOP_Y}
              width={CELL}
              height={CELL}
              rx={6}
              fill="var(--chart-surface)"
              stroke="var(--chart-grid)"
              strokeWidth={1}
            />
            <text x={cellCx(s)} y={TOP_Y + CELL / 2 + 4} textAnchor="middle" fontSize={13} fill="var(--chart-muted)">{s}</text>
          </g>
        ))}
        {/* 老师当前位置(绿圆) */}
        <circle data-smooth cx={cellCx(teacherPos)} cy={TOP_Y + CELL / 2} r={13} fill="#10b981" opacity={0.95} />

        {/* 学生行格子 */}
        <text x={LEFT_X - 8} y={BOT_Y + CELL / 2 + 4} textAnchor="end" fontSize={10} fill="var(--chart-muted)">学生</text>
        {Array.from({ length: N }, (_, s) => (
          <g key={`s-cell-${s}`}>
            <rect
              x={LEFT_X + s * CELL}
              y={BOT_Y}
              width={CELL}
              height={CELL}
              rx={6}
              fill="var(--chart-surface)"
              stroke={s === 3 || s === 4 ? "#fca5a5" : "var(--chart-grid)"}
              strokeWidth={s === 3 || s === 4 ? 1.5 : 1}
              strokeDasharray={s === 3 || s === 4 ? "3 3" : undefined}
            />
            <text x={cellCx(s)} y={BOT_Y + CELL / 2 + 4} textAnchor="middle" fontSize={13} fill="var(--chart-muted)">{s}</text>
          </g>
        ))}
        {/* 学生当前位置(粉圆)+ 卡住脉冲 */}
        {stuck && (
          <circle data-smooth cx={cellCx(studentPos)} cy={BOT_Y + CELL / 2} r={18} fill="none" stroke="#fb7185" strokeWidth={2} opacity={0.6} />
        )}
        <circle data-smooth cx={cellCx(studentPos)} cy={BOT_Y + CELL / 2} r={13} fill="#e11d48" opacity={0.95} />

        {/* 访问计数热力条(到当前 tick 为止) */}
        <text x={LEFT_X - 8} y={HEAT_Y + 4} textAnchor="end" fontSize={9} fill="var(--chart-muted)">访问</text>
        {visits.map((v, s) => {
          const h = (v / maxVisits) * 26;
          return (
            <g key={`heat-${s}`}>
              <rect x={LEFT_X + s * CELL + CELL / 2 - 10} y={HEAT_Y} width={20} height={28} rx={2} fill="var(--chart-grid)" opacity={0.4} />
              <rect
                data-smooth
                x={LEFT_X + s * CELL + CELL / 2 - 10}
                y={HEAT_Y + 28 - h}
                width={20}
                height={h}
                rx={2}
                fill={s === 3 || s === 4 ? "#e11d48" : "#f59e0b"}
                opacity={0.85}
              />
              <text x={cellCx(s)} y={HEAT_Y + 42} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">{v}</text>
            </g>
          );
        })}
      </svg>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-3">
          <Slider label="步数" value={tick} min={0} max={path.length - 1} step={1} onChange={(v) => { stop(); setTick(Math.round(v)); }} decimals={0} />
          <Slider label="随机种子" value={seed} min={1} max={40} step={1} onChange={(v) => setSeed(Math.round(v))} decimals={0} />
        </div>
        <div className="flex items-start gap-2">
          <button onClick={play} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">
            {running ? "⏸ 暂停" : "▶ 逐步走"}
          </button>
          <button onClick={reset} className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
            重置
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
        老师每格必前进、一路 0→5 直达;学生却大量<b className="text-rose-600 dark:text-rose-400">卡在格子 3、4</b>(虚线框=没学好的格子),
        留下很高的访问计数。这两格正是<b>老师从不去</b>的地方——离线蒸馏(用老师轨迹训练)在这里没有监督。
        换种子看不同轨迹,但「卡在中间」的现象稳定出现。
      </p>
    </div>
  );
}
