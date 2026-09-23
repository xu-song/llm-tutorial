"use client";

import { useMemo, useState } from "react";

// 探索策略谱系可视化 —— 配合 dqn 篇「### 小结:探索策略谱系」。
//
// 把散落在 bandit / reinforcement-learning / dqn 三篇的探索方法收成一张图:
//   横轴 = 时间视野(单步 → 回合 → 跨回合)
//   纵轴 = 探索方向性(无向 → 有向)
//   节点颜色 = 长程稀疏任务能力(❌ 浅 / ⚠️ 中 / ✅ 深)
//   连线 = 方法间的演进/借鉴关系
// 渲染期纯静态(无 Math.random/Date),SSR 安全。

type Horizon = "single" | "episode" | "cross";
type Directedness = "undirected" | "directed";
type LongRange = "no" | "partial" | "yes";

interface Method {
  name: string;
  short: string;
  horizon: Horizon;
  directed: Directedness;
  longRange: LongRange;
  family: string;
  note: string;
}

const METHODS: Method[] = [
  { name: "ε-greedy", short: "ε-greedy", horizon: "single", directed: "undirected", longRange: "no", family: "随机扰动", note: "以概率 ε 均匀随机选动作,与状态无关——盲目撒网。" },
  { name: "NoisyNet", short: "NoisyNet", horizon: "single", directed: "undirected", longRange: "no", family: "参数空间扰动", note: "把可学噪声注入权重,扰动经状态产生不同动作——状态条件化但仍属无向扰动。" },
  { name: "UCB", short: "UCB", horizon: "single", directed: "directed", longRange: "no", family: "乐观上界", note: "给估计值加不确定性 bonus,专挑没试够的——定向,但只在有奖励梯度时有效。" },
  { name: "Thompson 采样", short: "Thompson", horizon: "single", directed: "directed", longRange: "no", family: "后验采样", note: "从后验各采一个样本选最大,概率匹配——贝叶斯定向。" },
  { name: "count-based / 伪计数", short: "count", horizon: "single", directed: "directed", longRange: "partial", family: "新奇度", note: "少见状态发奖金,密度模型反推伪计数——局部有效,高维连续难训。" },
  { name: "ICM", short: "ICM", horizon: "single", directed: "directed", longRange: "partial", family: "新奇度", note: "逆模型特征 + 前向预测误差作内在奖励,noisy-TV 陷阱。" },
  { name: "RND", short: "RND", horizon: "single", directed: "directed", longRange: "partial", family: "新奇度", note: "固定随机目标网络的预测误差——简单稳定,仍属局部。" },
  { name: "VIME", short: "VIME", horizon: "single", directed: "directed", longRange: "partial", family: "信息增益", note: "动力学后验的 KL——模型参数不确定性驱动,部分缓解 noisy-TV。" },
  { name: "Disagreement", short: "Disag.", horizon: "single", directed: "directed", longRange: "partial", family: "集成方差", note: "多模型预测分歧,可微端到端优化——实现简单,集成训练 K 倍。" },
  { name: "Episodic Curiosity", short: "Episodic", horizon: "episode", directed: "directed", longRange: "yes", family: "可达性", note: "情景记忆 + 转移图可达性,缓解 noisy-TV——回合级。" },
  { name: "Bootstrapped DQN", short: "Boot-DQN", horizon: "episode", directed: "directed", longRange: "yes", family: "后验采样", note: "多 head 分歧 + Thompson 采样——连贯多步深度探索,整回合视野。" },
  { name: "NGU / Agent57", short: "NGU/A57", horizon: "cross", directed: "directed", longRange: "yes", family: "短+长时新奇", note: "情景记忆(短期)+ RND(长期)双时间尺度——全局长程,SOTA。" },
  { name: "Go-Explore", short: "Go-Explore", horizon: "cross", directed: "directed", longRange: "yes", family: "状态回滚", note: "存档 + 先返回后探索——把采样重构为搜索,需可回滚环境。" },
];

// 演进/借鉴关系(箭头从先驱 → 后继)
const EDGES: [string, string][] = [
  ["ε-greedy", "NoisyNet"],
  ["ε-greedy", "UCB"],
  ["UCB", "count-based / 伪计数"],
  ["count-based / 伪计数", "ICM"],
  ["ICM", "RND"],
  ["ICM", "Episodic Curiosity"],
  ["RND", "NGU / Agent57"],
  ["Episodic Curiosity", "NGU / Agent57"],
  ["VIME", "Disagreement"],
  ["NoisyNet", "Bootstrapped DQN"],
  ["Thompson 采样", "Bootstrapped DQN"],
  ["Bootstrapped DQN", "NGU / Agent57"],
  ["NGU / Agent57", "Go-Explore"],
];

const HORIZON_ORDER: Horizon[] = ["single", "episode", "cross"];
const HORIZON_LABEL: Record<Horizon, string> = {
  single: "单步",
  episode: "回合",
  cross: "跨回合",
};

const W = 560;
const H = 360;
const PADL = 44;
const PADR = 16;
const PADT = 22;
const PADB = 44;
const PLOTW = W - PADL - PADR;
const PLOTH = H - PADT - PADB;

// 横轴:三档时间视野
const colX = (h: Horizon) => {
  const i = HORIZON_ORDER.indexOf(h);
  return PADL + (PLOTW * (i + 0.5)) / HORIZON_ORDER.length;
};
// 纵轴:两档方向性(无向在下、有向在上,意为「从盲目到智能」向上递进)
const rowY = (d: Directedness) =>
  d === "undirected" ? PADT + PLOTH * 0.72 : PADT + PLOTH * 0.28;

const LONG_RANGE_COLOR: Record<LongRange, string> = {
  no: "#ef4444", // 红 ❌
  partial: "#f59e0b", // 黄 ⚠️
  yes: "#10b981", // 绿 ✅
};
const LONG_RANGE_TAG: Record<LongRange, string> = { no: "❌", partial: "⚠️", yes: "✅" };

export default function ExplorationSpectrumViz() {
  const [selected, setSelected] = useState<string>("NGU / Agent57");
  const [showEdges, setShowEdges] = useState(true);

  // 节点位置(同格内多个方法按索引错开避免重叠)
  const positions = useMemo(() => {
    const byCell: Record<string, number> = {};
    const pos: Record<string, { x: number; y: number }> = {};
    for (const m of METHODS) {
      const key = `${m.horizon}-${m.directed}`;
      const idx = byCell[key] ?? 0;
      byCell[key] = idx + 1;
      const n = METHODS.filter((mm) => mm.horizon === m.horizon && mm.directed === m.directed).length;
      // 在该格内沿水平方向错开
      const spread = 58;
      const offsetX = (idx - (n - 1) / 2) * spread;
      const offsetY = (idx % 2) * 0; // 同格水平排开,不纵向叠
      pos[m.name] = { x: colX(m.horizon) + offsetX, y: rowY(m.directed) + offsetY };
    }
    return pos;
  }, []);

  const selectedMethod = METHODS.find((m) => m.name === selected) ?? METHODS[0];

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[560px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="探索策略谱系:横轴时间视野(单步→回合→跨回合),纵轴方向性(无向→有向),颜色编码长程稀疏任务能力"
        >
          {/* 横轴分隔与标签 */}
          {HORIZON_ORDER.map((h, i) => (
            <g key={`col-${h}`}>
              {i > 0 && (
                <line
                  x1={PADL + (PLOTW * i) / 3}
                  y1={PADT}
                  x2={PADL + (PLOTW * i) / 3}
                  y2={H - PADB}
                  stroke="var(--chart-grid)"
                  strokeDasharray="3 3"
                />
              )}
              <text
                x={colX(h)}
                y={H - PADB + 16}
                textAnchor="middle"
                fontSize={10}
                fill="var(--chart-muted)"
              >
                {HORIZON_LABEL[h]}
              </text>
            </g>
          ))}
          <text x={PADL + PLOTW / 2} y={H - 4} textAnchor="middle" fontSize={9.5} fill="var(--chart-muted)">
            时间视野 →
          </text>

          {/* 纵轴分隔与标签 */}
          <line
            x1={PADL}
            y1={PADT + PLOTH * 0.5}
            x2={W - PADR}
            y2={PADT + PLOTH * 0.5}
            stroke="var(--chart-grid)"
            strokeDasharray="3 3"
          />
          <text x={PADL - 6} y={rowY("undirected") + 3} textAnchor="end" fontSize={10} fill="var(--chart-muted)">
            无向
          </text>
          <text x={PADL - 6} y={rowY("directed") + 3} textAnchor="end" fontSize={10} fill="var(--chart-muted)">
            有向
          </text>
          <text x={8} y={PADT + PLOTH / 2} textAnchor="middle" fontSize={9.5} fill="var(--chart-muted)" transform={`rotate(-90 8 ${PADT + PLOTH / 2})`}>
            探索方向性 →
          </text>

          {/* 演进连线 */}
          {showEdges &&
            EDGES.map(([from, to], i) => {
              const p1 = positions[from];
              const p2 = positions[to];
              if (!p1 || !p2) return null;
              const mf = METHODS.find((m) => m.name === from)!;
              const mt = METHODS.find((m) => m.name === to)!;
              // 只在跨格时画箭头(同格内不画,避免混乱)
              if (mf.horizon === mt.horizon && mf.directed === mt.directed) return null;
              return (
                <line
                  key={`edge-${i}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="var(--chart-grid)"
                  strokeWidth={1}
                  opacity={0.6}
                  markerEnd="url(#es-arrow)"
                />
              );
            })}

          {/* 箭头 marker */}
          <defs>
            <marker id="es-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--chart-grid)" />
            </marker>
          </defs>

          {/* 节点 */}
          {METHODS.map((m) => {
            const p = positions[m.name];
            const isSel = m.name === selected;
            return (
              <g
                key={m.name}
                className="es-node"
                style={{ cursor: "pointer" }}
                onClick={() => setSelected(m.name)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={7}
                  data-smooth
                  fill={LONG_RANGE_COLOR[m.longRange]}
                  opacity={isSel ? 1 : 0.7}
                  stroke={isSel ? "var(--chart-axis)" : "none"}
                  strokeWidth={isSel ? 2 : 0}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    transform: isSel ? "scale(1.3)" : "scale(1)",
                  }}
                />
                <text
                  x={p.x}
                  y={p.y - 11}
                  textAnchor="middle"
                  fontSize={8.5}
                  fill={isSel ? "var(--chart-axis)" : "var(--chart-muted)"}
                  fontWeight={isSel ? 600 : 400}
                >
                  {m.short}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <div className="rounded-md bg-chart-surface p-3 text-xs shadow-sm">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="font-semibold text-zinc-800 dark:text-zinc-100">{selectedMethod.name}</span>
              <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                {LONG_RANGE_TAG[selectedMethod.longRange]} 长程稀疏
              </span>
            </div>
            <div className="mb-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {selectedMethod.family} · {HORIZON_LABEL[selectedMethod.horizon]}视野 · {selectedMethod.directed === "undirected" ? "无向" : "有向"}
            </div>
            <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">{selectedMethod.note}</p>
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={showEdges}
              onChange={(e) => setShowEdges(e.target.checked)}
              className="accent-sky-500"
            />
            显示演进关系连线
          </label>

          {/* 图例 */}
          <div className="rounded-md bg-chart-surface p-2.5 text-[11px] shadow-sm">
            <div className="mb-1 text-zinc-500 dark:text-zinc-400">长程稀疏任务能力</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="flex items-center gap-1"><circle cx={5} cy={5} r={5} fill={LONG_RANGE_COLOR.no} />❌ 浅探索</span>
              <span className="flex items-center gap-1"><circle cx={5} cy={5} r={5} fill={LONG_RANGE_COLOR.partial} />⚠️ 局部有效</span>
              <span className="flex items-center gap-1"><circle cx={5} cy={5} r={5} fill={LONG_RANGE_COLOR.yes} />✅ 全局长程</span>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            横轴是<b>时间视野</b>(单步 → 回合 → 跨回合),纵轴是<b>探索方向性</b>(无向盲目 → 有向定向)。颜色编码<b>长程稀疏任务能力</b>:红❌(到不了远处)→ 黄⚠️(局部有效)→ 绿✅(全局长程)。点击任一节点查看机制。核心趋势:<b>从左下到右上</b>,探索能力随「时间视野变长 + 方向性变智能」递进——ε-greedy 只能盲目试一步,NGU/Agent57/Go-Explore 能连贯多步定向探索到远处的稀疏奖励。
          </p>
        </div>
      </div>
    </div>
  );
}
