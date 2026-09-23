"use client";

import { useMemo, useState } from "react";
import Slider from "./Slider";

// 信用分配的可视化:TD(0) vs TD(λ) 在 5 状态链上 1 回合后的价值传播。
// 配合 reinforcement-learning 入门篇「信用分配」小节的 5 状态链 CodeRunner。
//
// 设定:链 s0→s1→s2→s3→s4(终端,r=+1,奖励延迟 4 步),γ=0.9,α=0.5。
//   - 真值 V*(s) = γ^(距终端步数) = [0.9^4, 0.9^3, 0.9^2, 0.9^1, 0]
//   - TD(0) 1 回合:每步 V(s) ← V(s)+α(r+γV(s')−V(s)),奖励只传到紧邻 s3,s0/s1/s2 全 0
//   - TD(λ) 1 回合:资格迹 E 沿链累积,δ 一次性回灌给所有近期状态,s0/s1/s2 立刻非 0
//
// 交互:拖 λ(0→1)看右半区「s0 的 1 回合价值」从 0(TD(0),慢传)爬向真值(λ 大,快传);
//   左半区柱状图同时显示 TD(0) 与 TD(λ) 的全链价值对比 + 真值参考线。
// 渲染期无随机,所有数据 useMemo 派生,SSR 安全。

const N = 5; // 状态数 s0..s4
const GAMMA = 0.9;
const ALPHA = 0.5;
const TRUE_V: number[] = (() => {
  const out: number[] = [];
  for (let s = 0; s < N - 1; s++) out.push(Math.pow(GAMMA, N - 1 - s));
  out.push(0); // s4 终端
  return out;
})();

// 单回合 TD(0):返回 1 回合后各状态价值(从全 0 起)
function td0OneEpisode(): number[] {
  const V = new Array(N).fill(0);
  for (let s = 0; s < N - 1; s++) {
    const r = s + 1 === N - 1 ? 1 : 0;
    V[s] += ALPHA * (r + GAMMA * V[s + 1] - V[s]);
  }
  return V;
}

// 单回合 TD(λ):资格迹回灌
function tdLambdaOneEpisode(lam: number): number[] {
  const V = new Array(N).fill(0);
  const E = new Array(N).fill(0);
  for (let s = 0; s < N - 1; s++) {
    E[s] += 1; // 到访留痕
    const r = s + 1 === N - 1 ? 1 : 0;
    const delta = r + GAMMA * V[s + 1] - V[s];
    for (let i = 0; i < N; i++) V[i] += ALPHA * delta * E[i]; // δ 按痕迹回灌
    for (let i = 0; i < N; i++) E[i] *= GAMMA * lam; // 痕迹衰减
  }
  return V;
}

const TD0_V = td0OneEpisode(); // λ 无关,模块级预计算
const VMAX = Math.max(...TRUE_V); // 0.9^4=0.6561,用于 y 轴归一化

// λ 曲线采样(右半区 s0 价值随 λ)
const LAM_SAMPLES: number[] = [];
for (let i = 0; i <= 40; i++) LAM_SAMPLES.push(i / 40);

const W = 480;
const H = 320;
const PADL = 38;
const PADR = 14;
const PADT = 18;
const PADB = 42;
const PLOTW = W - PADL - PADR;
const PLOTH = H - PADT - PADB;
const SPLIT_X = PADL + PLOTW * 0.56; // 左半区宽一点(5 状态双柱)

const syTop = (v: number) => H - PADB - (v / VMAX) * PLOTH * 0.92; // 顶部留 8% 余量给标注

// 左半区:5 状态双柱(TD0 蓝 + TDλ 橙),每组占 (SPLIT_X-PADL)/5 宽
const GROUP_W = (SPLIT_X - PADL) / N;
const BAR_W = GROUP_W * 0.32;

// 右半区:λ 曲线 x 映射
const curveX = (lam: number) => SPLIT_X + lam * (W - PADR - SPLIT_X);
const curveY = (v: number) => syTop(v);

export default function CreditPropagationViz() {
  const [lam, setLam] = useState(0.8);

  const tdl_V = useMemo(() => tdLambdaOneEpisode(lam), [lam]);
  const s0_curve = useMemo(
    () => LAM_SAMPLES.map((l) => tdLambdaOneEpisode(l)[0]),
    []
  );

  const isTD0 = lam === 0;
  const isMC = lam === 1;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[480px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label={`λ=${lam.toFixed(2)} 时 TD(0) 与 TD(λ) 在 5 状态链上 1 回合后的价值传播对比`}
        >
          {/* ===== 左半区:5 状态双柱 + 真值参考线 ===== */}
          <text x={PADL} y={PADT + 2} fontSize={10} fill="var(--chart-muted)">
            1 回合后各状态价值
          </text>
          {/* y 轴网格 + 刻度 */}
          {[0, 0.2, 0.4, 0.6].map((g) => (
            <g key={g}>
              <line x1={PADL} y1={syTop(g)} x2={SPLIT_X - 4} y2={syTop(g)} stroke="var(--chart-grid)" strokeDasharray="2 3" />
              <text x={PADL - 4} y={syTop(g) + 3} textAnchor="end" fontSize={8} fill="var(--chart-muted)">
                {g.toFixed(1)}
              </text>
            </g>
          ))}
          <line x1={PADL} y1={H - PADB} x2={SPLIT_X - 4} y2={H - PADB} stroke="var(--chart-axis)" />

          {/* 真值参考虚线(每个状态) */}
          {TRUE_V.map((v, s) => {
            const gx = PADL + s * GROUP_W + GROUP_W / 2;
            return (
              <line
                key={`true-${s}`}
                x1={gx - BAR_W - 2}
                y1={syTop(v)}
                x2={gx + BAR_W + 2}
                y2={syTop(v)}
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="3 2"
                opacity={0.7}
              />
            );
          })}

          {/* 双柱:TD(0) 蓝 + TD(λ) 橙 */}
          {TD0_V.map((v0, s) => {
            const gx = PADL + s * GROUP_W + GROUP_W / 2;
            const vl = tdl_V[s];
            const h0 = (Math.max(v0, 0) / VMAX) * PLOTH * 0.92;
            const hl = (Math.max(vl, 0) / VMAX) * PLOTH * 0.92;
            return (
              <g key={s}>
                <rect
                  x={gx - BAR_W - 1}
                  y={H - PADB - h0}
                  width={BAR_W}
                  height={h0}
                  data-smooth
                  rx={1.5}
                  fill="#0ea5e9"
                  opacity={0.85}
                />
                <rect
                  x={gx + 1}
                  y={H - PADB - hl}
                  width={BAR_W}
                  height={hl}
                  data-smooth
                  rx={1.5}
                  fill="#f59e0b"
                  opacity={0.9}
                />
                <text x={gx} y={H - PADB + 12} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
                  s{s}
                </text>
                {s === N - 1 && (
                  <text x={gx} y={H - PADB + 24} textAnchor="middle" fontSize={7.5} fill="var(--chart-muted)">
                    终端
                  </text>
                )}
              </g>
            );
          })}
          <text x={(PADL + SPLIT_X) / 2} y={H - PADB + 34} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            绿虚线 = 真值 V*
          </text>

          {/* 分隔线 */}
          <line x1={SPLIT_X} y1={PADT} x2={SPLIT_X} y2={H - PADB} stroke="var(--chart-grid)" strokeDasharray="3 3" />

          {/* ===== 右半区:s0 价值随 λ 曲线 ===== */}
          <text x={SPLIT_X + 4} y={PADT + 2} fontSize={10} fill="var(--chart-muted)">
            s0 的 1 回合价值随 λ
          </text>
          {[0, 0.2, 0.4, 0.6].map((g) => (
            <line key={g} x1={SPLIT_X} y1={syTop(g)} x2={W - PADR} y2={syTop(g)} stroke="var(--chart-grid)" strokeDasharray="2 3" />
          ))}
          {/* 真值参考线 */}
          <line x1={SPLIT_X} y1={syTop(TRUE_V[0])} x2={W - PADR} y2={syTop(TRUE_V[0])} stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.7} />
          <text x={W - PADR} y={syTop(TRUE_V[0]) - 4} textAnchor="end" fontSize={8} fill="#10b981">
            真值 {TRUE_V[0].toFixed(3)}
          </text>
          {/* x 轴刻度 */}
          {[0, 0.5, 1].map((g) => (
            <text key={g} x={curveX(g)} y={H - PADB + 12} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">
              {g.toFixed(1)}
            </text>
          ))}
          <line x1={SPLIT_X} y1={H - PADB} x2={W - PADR} y2={H - PADB} stroke="var(--chart-axis)" />
          {/* TD(0) 端点参考(λ=0 时 s0=0) */}
          <circle cx={curveX(0)} cy={curveY(s0_curve[0])} r={3} fill="var(--chart-muted)" />
          <text x={curveX(0) + 4} y={curveY(s0_curve[0]) + 10} fontSize={8} fill="var(--chart-muted)">
            TD(0)
          </text>
          {/* 曲线 */}
          <path
            d={s0_curve.map((v, i) => `${i === 0 ? "M" : "L"} ${curveX(LAM_SAMPLES[i]).toFixed(1)} ${curveY(v).toFixed(1)}`).join(" ")}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.9}
          />
          {/* 当前点 */}
          <circle data-smooth cx={curveX(lam)} cy={curveY(tdl_V[0])} r={4.5} fill="#f59e0b" stroke="white" strokeWidth={1.5} />
          <text x={curveX(lam)} y={curveY(tdl_V[0]) - 9} textAnchor="middle" fontSize={9} fontWeight={600} fill="#f59e0b">
            {tdl_V[0].toFixed(3)}
          </text>
          <text x={(SPLIT_X + W - PADR) / 2} y={H - PADB + 34} textAnchor="middle" fontSize={9} fill="var(--chart-muted)">
            λ(0=慢传 → 1=快传)
          </text>

          {/* 图例 */}
          <rect x={PADL} y={PADT + 12} width={8} height={8} rx={1} fill="#0ea5e9" opacity={0.85} />
          <text x={PADL + 11} y={PADT + 19} fontSize={8} fill="var(--chart-muted)">
            TD(0)
          </text>
          <rect x={PADL + 44} y={PADT + 12} width={8} height={8} rx={1} fill="#f59e0b" opacity={0.9} />
          <text x={PADL + 55} y={PADT + 19} fontSize={8} fill="var(--chart-muted)">
            TD(λ)
          </text>
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="资格迹衰减 λ" value={lam} min={0} max={1} step={0.05} onChange={setLam} decimals={2} />
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">s0 真值 V*</span>
              <span className="font-mono">{TRUE_V[0].toFixed(3)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">TD(0) 1 回合后 s0</span>
              <span className="font-mono">{TD0_V[0].toFixed(3)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">TD(λ={lam.toFixed(2)}) 1 回合后 s0</span>
              <span className="font-mono">{tdl_V[0].toFixed(3)}</span>
            </div>
            <div className="mt-1.5 border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
              {isTD0 ? (
                <span className="text-sky-600 dark:text-sky-400">
                  λ=0:资格迹只留当前一步,终局 +1 仅传到紧邻 s3,s0/s1/s2 全 0——要约 1/(1−γ)≈10 回合才慢传到起点
                </span>
              ) : isMC ? (
                <span className="text-amber-600 dark:text-amber-500">
                  λ=1:资格迹不衰减,终局 +1 一回合内按等权回灌全链,s0 立刻拿到接近真值的估计(但有偏 + 高方差)
                </span>
              ) : (
                <span className="text-zinc-600 dark:text-zinc-300">
                  λ 居中:资格迹按 (γλ) 衰减回灌,s0 一回合内就分到非零信用——λ 越大传播越快,代价是 bootstrap 偏差与方差上升
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            左图:5 状态链 s0→s4(终端 +1),1 回合后 TD(0)(蓝)只把奖励传到 s3,TD(λ)(橙)靠资格迹一次性回灌全链。绿虚线是真值 V*=γⁿ。
            右图:把 s0 的 1 回合估计对 λ 画成曲线——λ=0 时 s0=0(慢传),λ↑ 时 s0 向真值 {TRUE_V[0].toFixed(2)} 爬升(快传)。<b>λ 就是时序信用分配的「视野旋钮」</b>:越大功劳传得越远越均匀,越小越集中在近邻。
          </p>
        </div>
      </div>
    </div>
  );
}
