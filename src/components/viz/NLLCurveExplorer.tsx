"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

const W = 440;
const H = 300;
const PAD = 44;
const Y_MAX = 5; // 损失上限(nat),超过则裁剪显示

// 单样本二元 NLL:y=1 时 -ln p;y=0 时 -ln(1-p)
const nll = (y: 0 | 1, p: number) => {
  const eps = 1e-12;
  return y === 1 ? -Math.log(p + eps) : -Math.log(1 - p + eps);
};

const sx = (p: number) => PAD + p * (W - 2 * PAD);
const sy = (l: number) => H - PAD - (Math.min(l, Y_MAX) / Y_MAX) * (H - 2 * PAD);

// 预生成两条损失曲线
const curve = (y: 0 | 1) => {
  const pts: string[] = [];
  for (let p = 0.002; p <= 0.998; p += 0.004) {
    pts.push(`${sx(p)},${sy(nll(y, p))}`);
  }
  return "M" + pts.join(" L");
};
const CURVE_POS = curve(1); // y=1
const CURVE_NEG = curve(0); // y=0

/** NLL 损失曲线浏览器:拖动预测概率 p、切换真实标签 y,观察单样本负对数似然(=二元交叉熵)如何变化。 */
export default function NLLCurveExplorer() {
  const [p, setP] = useState(0.5);
  const [y, setY] = useState<0 | 1>(1);
  const loss = useMemo(() => nll(y, p), [y, p]);

  const activeCurve = y === 1 ? CURVE_POS : CURVE_NEG;
  const activeColor = y === 1 ? "#059669" : "#dc2626";

  // 「越自信越错」的定性描述
  const wrongConfident = (y === 1 && p < 0.1) || (y === 0 && p > 0.9);
  const rightConfident = (y === 1 && p > 0.9) || (y === 0 && p < 0.1);
  const desc = wrongConfident
    ? "自信地错 —— 损失飙升"
    : rightConfident
      ? "自信且对 —— 损失趋近 0"
      : "预测不确定 —— 损失居中";

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[440px_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm">
          {/* 坐标轴 */}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--chart-axis)" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--chart-axis)" />
          {/* 轴标签 */}
          <text x={W / 2} y={H - 10} fontSize={11} textAnchor="middle" fill="var(--chart-muted)">预测正类概率 p</text>
          <text x={14} y={H / 2} fontSize={11} textAnchor="middle" fill="var(--chart-muted)" transform={`rotate(-90 14 ${H / 2})`}>损失 -log p / nat</text>
          {/* 刻度 */}
          <text x={PAD} y={H - PAD + 16} fontSize={10} textAnchor="middle" fill="var(--chart-muted)">0</text>
          <text x={sx(0.5)} y={H - PAD + 16} fontSize={10} textAnchor="middle" fill="var(--chart-muted)">0.5</text>
          <text x={sx(1)} y={H - PAD + 16} fontSize={10} textAnchor="middle" fill="var(--chart-muted)">1</text>
          <text x={PAD - 8} y={sy(Y_MAX) + 4} fontSize={10} textAnchor="end" fill="var(--chart-muted)">≥{Y_MAX}</text>
          <text x={PAD - 8} y={sy(0) + 4} fontSize={10} textAnchor="end" fill="var(--chart-muted)">0</text>

          {/* 两条曲线:当前激活的高亮,另一条淡显 */}
          <path d={y === 1 ? CURVE_NEG : CURVE_POS} fill="none" stroke="var(--chart-muted)" strokeWidth={1.5} strokeOpacity={0.35} />
          <path d={activeCurve} fill="none" stroke={activeColor} strokeWidth={2.5} />

          {/* 当前点的引导线 */}
          <line x1={sx(p)} y1={H - PAD} x2={sx(p)} y2={sy(loss)} stroke="#f59e0b" strokeDasharray="3 3" />
          <line x1={PAD} y1={sy(loss)} x2={sx(p)} y2={sy(loss)} stroke="#f59e0b" strokeDasharray="3 3" />
          <circle cx={sx(p)} cy={sy(loss)} r={6} fill="#f59e0b" />
        </svg>

        <div className="flex flex-col justify-center gap-4">
          {/* 真实标签切换 */}
          <div>
            <div className="mb-1 text-sm text-zinc-600 dark:text-zinc-300">真实标签 y</div>
            <div className="flex gap-2">
              {([1, 0] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setY(v)}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    y === v
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-zinc-300 text-zinc-600 hover:border-emerald-500 dark:border-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  y = {v}
                </button>
              ))}
            </div>
          </div>

          <Slider label="预测正类概率 p" value={p} min={0.01} max={0.99} step={0.01} onChange={setP} decimals={2} />

          <div className="rounded-lg bg-chart-surface p-3 text-center shadow-sm">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              NLL 损失 = {y === 1 ? "-log p" : "-log(1-p)"}
            </div>
            <div className="font-mono text-2xl font-bold" style={{ color: activeColor }}>
              {loss.toFixed(3)}
              <span className="ml-1 text-sm font-normal text-zinc-400 dark:text-zinc-500">nat</span>
            </div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{desc}</div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            当预测与真实标签一致且自信(p→1 且 y=1,或 p→0 且 y=0),损失趋近 0;
            方向相反且越自信,损失越大 —— 这正是「自信犯错必重罚」。
          </p>
        </div>
      </div>
    </div>
  );
}
