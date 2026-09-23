"use client";

// 悬崖行走(Cliff Walking)对比图:强化学习经典例子。
// 底边中间一排是悬崖(踩到 -100 并被送回起点)。S=起点(左下),G=终点(右下)。
// Q-learning(off-policy)学到贴着悬崖的最短路(冒险);
// SARSA(on-policy)因为评估自己带探索的策略,学到绕上方的安全路(保守)。
// 纯静态示意图(两条预设路径),无随机、SSR 安全。

const COLS = 6;
const ROWS = 4;
const CELL = 46;
const PAD = 10;
const W = COLS * CELL + 2 * PAD;
const H = ROWS * CELL + 2 * PAD + 22;

const cx = (c: number) => PAD + c * CELL;
const cy = (r: number) => PAD + r * CELL;

// 悬崖:最底行(r=3)的中间列 c=1..4
const isCliff = (r: number, c: number) => r === ROWS - 1 && c >= 1 && c <= COLS - 2;
const START: [number, number] = [ROWS - 1, 0];
const GOAL: [number, number] = [ROWS - 1, COLS - 1];

// Q-learning:贴着悬崖上沿走(第 2 行),最短但危险
const Q_PATH: [number, number][] = [
  [3, 0], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [3, 5],
];
// SARSA:绕到最上面走(第 0 行),最远离悬崖,保守
const SARSA_PATH: [number, number][] = [
  [3, 0], [2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 5], [2, 5], [3, 5],
];

function pathToLine(path: [number, number][]) {
  return path
    .map(([r, c], i) => `${i === 0 ? "M" : "L"}${cx(c) + CELL / 2},${cy(r) + CELL / 2}`)
    .join(" ");
}

function Grid({ path, color, title }: { path: [number, number][]; color: string; title: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-1 text-sm font-semibold" style={{ color }}>{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[280px] rounded-lg bg-chart-surface shadow-sm" role="img" aria-label={title}>
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => {
            const cliff = isCliff(r, c);
            return (
              <rect
                key={`${r}-${c}`}
                x={cx(c) + 1}
                y={cy(r) + 1}
                width={CELL - 2}
                height={CELL - 2}
                rx={4}
                fill={cliff ? "#ef4444" : "var(--chart-surface)"}
                fillOpacity={cliff ? 0.75 : 1}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
            );
          }),
        )}
        {/* 悬崖标注 */}
        <text x={W / 2} y={cy(ROWS - 1) + CELL / 2 + 4} textAnchor="middle" fontSize={10} fill="#fff">悬崖 −100</text>
        {/* 路径 */}
        <path d={pathToLine(path)} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
        {path.map(([r, c], i) => (
          <circle key={i} cx={cx(c) + CELL / 2} cy={cy(r) + CELL / 2} r={3.5} fill={color} />
        ))}
        {/* 起点 / 终点 */}
        <text x={cx(START[1]) + CELL / 2} y={cy(START[0]) + CELL / 2 + 5} textAnchor="middle" fontSize={16}>🧍</text>
        <text x={cx(GOAL[1]) + CELL / 2} y={cy(GOAL[0]) + CELL / 2 + 5} textAnchor="middle" fontSize={15}>🏁</text>
      </svg>
    </div>
  );
}

/** 悬崖行走对比:同一环境下 Q-learning 贴边冒险 vs SARSA 绕远保守。 */
export default function CliffCompare() {
  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-2">
        <Grid path={Q_PATH} color="#0ea5e9" title="Q-learning:贴悬崖(最短·冒险)" />
        <Grid path={SARSA_PATH} color="#059669" title="SARSA:绕上方(较远·安全)" />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        同一个悬崖环境,🧍 起点走到 🏁 终点。<span className="font-semibold text-sky-600 dark:text-sky-400">Q-learning</span> 学的是「假设下一步永远最优」的策略,敢贴着悬崖走最短路;
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">SARSA</span> 评估的是「自己带 ε 探索」的真实策略,知道贴边偶尔会失足掉崖,于是主动绕远、保平安。
        <b>这就是 off-policy 与 on-policy 最经典的行为差异。</b>
      </p>
    </div>
  );
}
