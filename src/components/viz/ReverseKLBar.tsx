"use client";

import { useState, useMemo } from "react";
import Slider from "./Slider";
import { softmax } from "@/lib/mathx";

// 逐 token 反向 KL 交互可视化(把页面第 3 个 CodeRunner 做成可拖动版)。
// 复用语法玩具的词表(猫/狗/在/睡觉/跑/。),提供 4 个「当前 token」上文预设。
// 拖动 studentShift 滑块:把学生的质量在「老师的 mode(token 0)」和「错误 token(token 1)」之间挪动,
// 实时看反向 KL 飙升 / 下降,以及哪个 token 被罚最狠。
// 渲染期无随机 —— SSR 安全。

const VOCAB = ["猫", "狗", "在", "睡觉", "跑"];
const V = VOCAB.length;

// 4 个上文预设:每个给出「老师 logits」和「学生 base logits」(shift 之前)
// 老师在某 token 上很确定(高 logit),学生则把质量摊开。
type Preset = { ctx: string; teacher: number[]; studentBase: number[] };
const PRESETS: Preset[] = [
  { ctx: "开头 <s> →", teacher: [4.0, 3.5, -9, -9, -9], studentBase: [1.0, 0.5, -1, -1, -1] },
  { ctx: "猫 →", teacher: [-9, -9, 4.5, 0.0, 0.0], studentBase: [0.5, -1, 2.5, 1.0, 0.8] },
  { ctx: "在 →", teacher: [-9, -9, -9, 4.0, 3.5], studentBase: [1.0, 1.0, -1, 2.0, 1.5] },
  { ctx: "睡觉 →", teacher: [-9, -9, -9, -9, 5.0], studentBase: [0.0, 0.0, 1.0, -1, 2.5] },
];

const W = 440;
const H = 260;
const PAD = 36;
const EPS = 1e-12;

export default function ReverseKLBar() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [shift, setShift] = useState(1.5); // 学生在 token1 加、token0 减的偏移量
  const [showFwd, setShowFwd] = useState(false);

  const preset = PRESETS[presetIdx];

  const { teacher, student, rkl, fwdKL, penalty } = useMemo(() => {
    const t = softmax(preset.teacher);
    // 学生:在 base 上把 shift 加到 token1、从 token0 减掉
    const sLogits = preset.studentBase.map((v, i) => {
      if (i === 0) return v - shift;
      if (i === 1) return v + shift;
      return v;
    });
    const s = softmax(sLogits);
    let rev = 0;
    let fwd = 0;
    const pen = s.map((q, i) => q * (Math.log(q + EPS) - Math.log(t[i] + EPS)));
    for (let i = 0; i < V; i++) {
      rev += pen[i];
      fwd += t[i] * (Math.log(t[i] + EPS) - Math.log(s[i] + EPS));
    }
    return { teacher: t, student: s, rkl: Math.max(0, rev), fwdKL: Math.max(0, fwd), penalty: pen };
  }, [preset, shift]);

  const bw = (W - 2 * PAD) / V;
  const baseY = H - PAD;
  const barMaxH = H - 2 * PAD;
  const maxPen = Math.max(0.001, ...penalty.map(Math.abs));

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* 上文切换 */}
      <div className="mb-3 flex flex-wrap gap-1">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => setPresetIdx(i)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              presetIdx === i
                ? "bg-emerald-600 text-white"
                : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {p.ctx}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-[440px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="逐 token 反向 KL:老师 vs 学生概率分布"
        >
          <line x1={PAD} y1={baseY} x2={W - PAD} y2={baseY} stroke="var(--chart-axis)" />
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line x1={PAD} y1={baseY - g * barMaxH} x2={W - PAD} y2={baseY - g * barMaxH} stroke="var(--chart-grid)" strokeDasharray="2 3" />
              <text x={PAD - 6} y={baseY - g * barMaxH + 4} textAnchor="end" fontSize={10} fill="var(--chart-muted)">{g.toFixed(1)}</text>
            </g>
          ))}

          {/* 每组:老师条 + 学生条 */}
          {teacher.map((_, i) => {
            const x = PAD + i * bw;
            const halfW = bw * 0.32;
            const th = teacher[i] * barMaxH;
            const sh = student[i] * barMaxH;
            const isWorst = i === penalty.indexOf(Math.max(...penalty)) && rkl > 0.01;
            return (
              <g key={i}>
                {/* 被罚最狠的高亮框 */}
                {isWorst && (
                  <rect
                    data-smooth
                    x={x + bw * 0.1}
                    y={baseY - barMaxH}
                    width={bw * 0.8}
                    height={barMaxH}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    rx={3}
                  />
                )}
                {/* 老师条(左) */}
                <rect data-smooth x={x + bw * 0.15} y={baseY - th} width={halfW} height={th} rx={2} fill="#0ea5e9" opacity={0.9} />
                {/* 学生条(右) */}
                <rect data-smooth x={x + bw * 0.15 + halfW + 2} y={baseY - sh} width={halfW} height={sh} rx={2} fill="#e11d48" opacity={0.9} />
                {/* 概率数字 */}
                <text x={x + bw * 0.15 + halfW / 2} y={baseY - th - 4} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                  {(teacher[i] * 100).toFixed(0)}
                </text>
                <text x={x + bw * 0.15 + halfW + 2 + halfW / 2} y={baseY - sh - 4} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                  {(student[i] * 100).toFixed(0)}
                </text>
                {/* token 标签 */}
                <text x={x + bw / 2} y={baseY + 15} textAnchor="middle" fontSize={11} fill="var(--chart-muted)">{VOCAB[i]}</text>
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="学生偏移(往 token「狗」挪)" value={shift} min={-1} max={5} step={0.1} onChange={setShift} decimals={1} />

          <div className="rounded-lg bg-chart-surface p-3 text-sm shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">反向 KL D(π_θ ‖ π_T)</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{rkl.toFixed(3)}</span>
            </div>
            {showFwd && (
              <div className="mt-1 flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">前向 KL D(π_T ‖ π_θ)</span>
                <span className="font-mono text-sky-600 dark:text-sky-400">{fwdKL.toFixed(3)}</span>
              </div>
            )}
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
              {rkl < 0.05
                ? "学生对齐老师 → KL≈0。学生学会了这一步。"
                : shift >= 2.5
                  ? "学生把质量堆到老师低概率处 → 反向 KL 重罚(mode-seeking:逼学生收回质量)。"
                  : "学生偏离老师 → KL 上升。红色虚线框=被罚最狠的 token。"}
            </div>
          </div>

          <button
            onClick={() => setShowFwd((v) => !v)}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {showFwd ? "隐藏前向 KL" : "对比前向 KL"}
          </button>

          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            <b className="text-sky-600 dark:text-sky-400">蓝=老师</b>,<b className="text-rose-600 dark:text-rose-400">粉=学生</b>。
            反向 KL 在<b>学生分布</b>下取期望:学生把质量放到老师低概率处会招致重罚(zero-forcing),所以学生必须收回——这就是 mode-seeking。
            详见<a className="text-emerald-600 underline dark:text-emerald-400" href="/tutorials/forward-reverse-kl">前向 vs 反向 KL</a>。
          </p>
        </div>
      </div>
    </div>
  );
}
