"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";
import { makeRng, gaussian } from "@/lib/prng";

// 行为克隆(BC)的协变量偏移 / 级联误差可视化。
// 玩具设定:专家策略每步走 +1(笔直前进),共 T 步,末态 = T-1。
//   · BC:学习器每步动作 = 专家动作 + 高斯噪声。一旦状态偏离专家分布,
//     后续在"未见状态"上决策,偏差沿步数累加 → 末态偏离随噪声线性增长(级联)。
//   · DAgger:每步以 correct_rate 概率"问专家"——动作取专家的 +1(把学习器拉回
//     专家分布内);否则才用带噪动作。问专家即"训练分布逼近部署分布"的纠偏。
// 拖动噪声 std 与(DAgger 模式下)问专家概率,看末态偏离如何变化。
// 渲染期无随机(种子固定),SSR 安全。

const T = 30;
const EXPERT_END = T - 1; // = 29
const SEED = 0;

// Box-Muller 标准正态由 @/lib/prng 的 gaussian 提供(与 python3 复算对齐)

type Mode = "bc" | "dagger";

function rollout(mode: Mode, noiseStd: number, correctRate: number): {
  traj: number[];
  dev: number[];
} {
  const rnd = makeRng(SEED);
  let pos = 0.0;
  const traj = [pos];
  const dev = [0.0];
  for (let t = 0; t < T - 1; t++) {
    let a: number;
    if (mode === "dagger" && rnd() < correctRate) {
      a = 1.0; // 问专家:动作取专家的 +1,把状态拉回专家分布
    } else {
      a = 1.0 + noiseStd * gaussian(rnd);
    }
    pos += a;
    traj.push(pos);
    dev.push(Math.abs(pos - (traj.length - 1)));
  }
  return { traj, dev };
}

const W = 540;
const H = 300;
const PADL = 40;
const PADR = 16;
const PADT = 24;
const PADB = 40;
const PLOT_W = W - PADL - PADR;
const PLOT_H = H - PADT - PADB;

// x 轴:步数 0..T-1;y 轴:位置(专家位置 = 步数,范围约 -12..30)
const X_MIN = 0;
const X_MAX = T - 1;
const Y_MIN = -12;
const Y_MAX = 30;

const sx = (x: number) => PADL + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
const sy = (y: number) => PADT + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H;

export default function CovariateShiftViz() {
  const [mode, setMode] = useState<Mode>("bc");
  const [noiseStd, setNoiseStd] = useState(0.6);
  const [correctRate, setCorrectRate] = useState(0.5);

  const { traj, dev } = useMemo(
    () => rollout(mode, noiseStd, correctRate),
    [mode, noiseStd, correctRate],
  );

  const endDev = dev[dev.length - 1];
  const maxDev = Math.max(...dev);
  const learnerColor = mode === "bc" ? "#ef4444" : "#10b981";
  const endPos = traj[traj.length - 1];

  // 专家轨迹折线点(笔直 y=x)
  const expertPath = Array.from({ length: T }, (_, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(i)}`).join(" ");
  // 学习者轨迹折线点
  const learnerPath = traj.map((y, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(y)}`).join(" ");
  // 偏离面积:学习者轨迹 + 回到专家末态闭合,填充示意级联误差
  const devArea = `${learnerPath} L ${sx(T - 1)} ${sy(EXPERT_END)} Z`;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`模仿学习中${mode === "bc" ? "行为克隆(BC)" : "DAgger"}的轨迹偏离对比,动作噪声 ${noiseStd.toFixed(2)}${mode === "dagger" ? `,问专家概率 ${correctRate.toFixed(2)}` : ""},末态偏离 ${endDev.toFixed(2)}`}
        >
          {/* y 轴刻度(位置) */}
          {[-10, 0, 10, 20, 29].map((g) => {
            const y = sy(g);
            return (
              <g key={g}>
                <line x1={PADL} y1={y} x2={W - PADR} y2={y} stroke="var(--chart-grid)" strokeDasharray="2 3" />
                <text x={4} y={y + 3} fontSize={8} fill="var(--chart-muted)">{g}</text>
              </g>
            );
          })}
          {/* x 轴刻度(步数) */}
          {[0, 10, 20, 29].map((g) => (
            <text key={g} x={sx(g)} y={PADT + PLOT_H + 14} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">{g}</text>
          ))}
          <text x={(PADL + W - PADR) / 2} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">步数 t</text>

          {/* 偏离面积(级联误差可视化) */}
          {/* 偏离面积(级联误差可视化,跟随学习者颜色) */}
          <path d={devArea} fill={learnerColor} opacity={0.12} />

          {/* 专家轨迹(笔直,虚线) */}
          <path d={expertPath} fill="none" stroke="var(--chart-accent)" strokeWidth={1.8} strokeDasharray="5 3" />
          <text x={sx(29) - 2} y={sy(29) - 6} textAnchor="end" fontSize={8} fill="var(--chart-accent)">专家 y=x</text>

          {/* 学习者轨迹(实线) */}
          <path
            d={learnerPath}
            fill="none"
            stroke={learnerColor}
            strokeWidth={2}
            data-smooth
          />
          {/* 末端点 */}
          <circle
            cx={sx(T - 1)}
            cy={sy(endPos)}
            r={3.5}
            fill={learnerColor}
            data-smooth
          />
          <text
            x={sx(T - 1) - 6}
            y={sy(endPos) - 8}
            textAnchor="end"
            fontSize={8}
            fill={learnerColor}
            fontWeight={600}
          >
            末态 {endPos.toFixed(1)}
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setMode("bc")}
              aria-pressed={mode === "bc"}
              className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${mode === "bc" ? "bg-red-500 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"}`}
            >
              行为克隆 BC
            </button>
            <button
              type="button"
              onClick={() => setMode("dagger")}
              aria-pressed={mode === "dagger"}
              className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${mode === "dagger" ? "bg-emerald-500 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"}`}
            >
              DAgger
            </button>
          </div>

          <Slider label="动作噪声 std" value={noiseStd} min={0} max={1.2} step={0.05} onChange={setNoiseStd} decimals={2} />
          {mode === "dagger" && (
            <Slider label="问专家概率" value={correctRate} min={0} max={1} step={0.05} onChange={setCorrectRate} decimals={2} />
          )}

          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="mb-1 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">末态偏离</span>
              <span className={`font-mono font-semibold ${endDev > 2 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {endDev.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">最大偏离</span>
              <span className="font-mono">{maxDev.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">专家末态</span>
              <span className="font-mono">{EXPERT_END}</span>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            <b className="text-red-600 dark:text-red-400">BC</b>:噪声让状态偏离专家分布,后续在未见状态上决策 → 偏差沿步数累加(级联),噪声越大末态偏离越狠。
            <b className="text-emerald-600 dark:text-emerald-500">DAgger</b>:每步以一定概率问专家(动作取 +1),把学习者拉回专家分布内 → 偏差被钳住,不再级联。调高问专家概率,看偏离如何塌缩。
          </p>
        </div>
      </div>
    </div>
  );
}
