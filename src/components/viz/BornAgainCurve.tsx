"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";

// Born-Again Networks 多代蒸馏可视化。
// 左:序列蒸馏(teacher → BAN-1 → BAN-2 → BAN-3)的测试误差——逐代下降但饱和(有限度的正则化);
// 右:多代集成 BANE(平均各代预测)持续增益。
// 数据来自 BAN 论文 Table(DenseNet 系列,CIFAR-100 测试误差 %)。

type Config = {
  name: string;
  seq: number[]; // 逐代误差:teacher, BAN-1, BAN-2, BAN-3
  ens: number[]; // 集成误差:单模型(teacher), Ens×2, Ens×3
};

const CONFIGS: Config[] = [
  {
    name: "DenseNet-112-33",
    seq: [18.25, 17.61, 17.22, 16.59],
    ens: [18.25, 15.77, 15.68],
  },
  {
    name: "DenseNet-90-60",
    seq: [17.69, 16.62, 16.44, 16.72],
    ens: [17.69, 15.39, 15.74],
  },
  {
    name: "DenseNet-80-80",
    seq: [17.16, 16.26, 16.3, 15.5],
    ens: [17.16, 15.46, 15.14],
  },
  {
    name: "DenseNet-80-120",
    seq: [16.87, 16.13, 16.13, NaN],
    ens: [16.87, 15.13, 14.9],
  },
];

const W = 440;
const H = 260;
const PAD_L = 40;
const PAD_R = 14;
const PAD_T = 18;
const PAD_B = 42;

export default function BornAgainCurve() {
  const [ci, setCi] = useState(2);
  const cfg = CONFIGS[ci];

  const all = useMemo(
    () =>
      [...cfg.seq.filter(Number.isFinite), ...cfg.ens].filter(Number.isFinite),
    [cfg]
  );
  const yMin = Math.floor(Math.min(...all) - 0.4);
  const yMax = Math.ceil(Math.max(...all) + 0.3);

  const x = (gen: number, n: number) =>
    PAD_L + (gen / (n - 1)) * (W - PAD_L - PAD_R);
  const y = (err: number) =>
    PAD_T + (1 - (err - yMin) / (yMax - yMin)) * (H - PAD_T - PAD_B);

  const seqPts = cfg.seq
    .map((e, i) => (Number.isFinite(e) ? `${x(i, cfg.seq.length)},${y(e)}` : null))
    .filter(Boolean)
    .join(" ");
  const ensPts = cfg.ens.map((e, i) => `${x(i, cfg.ens.length)},${y(e)}`).join(" ");

  const firstGain = cfg.seq[0] - cfg.seq[1];
  const lastGain =
    cfg.seq.length >= 3 && Number.isFinite(cfg.seq[3])
      ? cfg.seq[2] - cfg.seq[3]
      : NaN;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {CONFIGS.map((c, i) => (
          <button
            key={c.name}
            onClick={() => setCi(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              i === ci
                ? "bg-emerald-600 text-white"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-[440px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="多代蒸馏与集成的测试误差"
        >
          {[0, 0.5, 1].map((g) => {
            const ey = PAD_T + g * (H - PAD_T - PAD_B);
            const ev = yMax - g * (yMax - yMin);
            return (
              <g key={g}>
                <line x1={PAD_L} y1={ey} x2={W - PAD_R} y2={ey} stroke="var(--chart-grid)" strokeDasharray="2 3" />
                <text x={PAD_L - 6} y={ey + 4} textAnchor="end" fontSize={10} fill="var(--chart-muted)">
                  {ev.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* teacher 基准线 */}
          <line x1={PAD_L} y1={y(cfg.seq[0])} x2={W - PAD_R} y2={y(cfg.seq[0])} stroke="var(--chart-muted)" strokeDasharray="4 4" />
          <text x={W - PAD_R - 2} y={y(cfg.seq[0]) - 5} textAnchor="end" fontSize={10} fill="var(--chart-muted)">
            teacher {cfg.seq[0].toFixed(2)}
          </text>

          {/* 集成线 */}
          <polyline points={ensPts} fill="none" stroke="#0ea5e9" strokeWidth={2} />
          {cfg.ens.map((e, i) => (
            <g key={`e${i}`}>
              <circle cx={x(i, cfg.ens.length)} cy={y(e)} r={4} fill="#0ea5e9" />
              <text x={x(i, cfg.ens.length)} y={y(e) - 8} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                {e.toFixed(2)}
              </text>
            </g>
          ))}

          {/* 序列蒸馏线 */}
          <polyline points={seqPts} fill="none" stroke="#059669" strokeWidth={2} />
          {cfg.seq.map((e, i) =>
            Number.isFinite(e) ? (
              <g key={`s${i}`}>
                <circle cx={x(i, cfg.seq.length)} cy={y(e)} r={4} fill="#059669" />
                <text x={x(i, cfg.seq.length)} y={y(e) + 16} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                  {e.toFixed(2)}
                </text>
              </g>
            ) : null
          )}

          <text x={PAD_L + (W - PAD_L - PAD_R) / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--chart-muted)">
            代数(左:序列蒸馏) / 集成规模(右:集成)
          </text>
          <text x={PAD_L + 10} y={H - 24} fontSize={10} fill="#059669">
            ▬ 逐代蒸馏(teacher→BAN-1→2→3)
          </text>
          <text x={PAD_L + 10} y={H - 36} fontSize={10} fill="#0ea5e9">
            ▬ 多代集成 BANE(平均各代)
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3 text-sm">
          <div className="rounded-lg bg-chart-surface p-3 shadow-sm">
            <div className="mb-1 font-medium">观察</div>
            <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              <li>
                第一代增益最大:<b>{firstGain.toFixed(2)}</b> 个百分点,之后逐代递减
                {Number.isFinite(lastGain) && (
                  <> 到 <b>{lastGain.toFixed(2)}</b></>
                )}
                ,甚至回升——<b>饱和而非持续改进</b>。
              </li>
              <li>
                每一代 student 都在超越上一代 teacher:增益不来自新信息,来自<b>软标签的正则化</b>。
              </li>
              <li>
                平均各代预测(BANE,蓝线)持续下降且始终更低——集成是「可累积」的那部分。
              </li>
            </ul>
          </div>
          <div className="rounded-lg bg-chart-surface p-3 text-[13px] leading-relaxed text-zinc-600 shadow-sm dark:text-zinc-400">
            若蒸馏真是「知识搬运」,同架构同数据的 student 顶多追平 teacher;
            逐代超越 + 饱和的形状,正是<b>有限度的正则化</b>的签名。
          </div>
        </div>
      </div>
    </div>
  );
}
