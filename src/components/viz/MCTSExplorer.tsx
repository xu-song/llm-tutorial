"use client";

import { useState, useMemo, useCallback } from "react";
import Slider from "./Slider";

// MCTS(蒙特卡洛树搜索)可视化 —— 展示「选-展-滚-传」四步循环与 UCT 选择。
//
// 设定:一棵预置的小博弈树(根 + 两层子节点)。每个节点存:
//   N = 访问次数(被传过几次),V = 累计价值(传上来的胜负之和),V̄ = V/N 平均价值。
// UCT 选择公式(在父节点选哪个子节点往下走):
//   UCT_i = V̄_i + c · sqrt(ln N_parent / N_i)
//   第一项 exploitation(价值高的优先),第二项 exploration(访问少的优先)。
// c 是探索参数:理论值 √2,实践中经验调;c→0 退化为纯贪心(只选当前最优),c 大则强探索。
//
// 交互:点「运行一次 MCTS 迭代」执行 选(UCT 下行)→ 展(加叶)→ 滚(随机 rollout)
//   → 传(沿路径回传价值);拖 c 看 UCT 选择路径如何变化。节点颜色按 V̄(蓝→红)、
//   粗细按 N。渲染期无随机(rollout 用按种子确定的伪随机),SSR 安全。

// 树结构:节点 0=根,1-3=根的子,4-9=叶。预置形状让 viz 聚焦 MCTS 过程本身。
type Node = {
  id: number;
  parent: number | null;
  children: number[];
  N: number;
  V: number;
  // 叶节点的「真值」(rollout 终局):rollout 结果围绕它采样
  truth: number;
  x: number;
  y: number;
};

const TRUTH = [0.0, 0.6, -0.3, 0.2, 0.7, 0.55, -0.4, -0.25, 0.15, 0.3];

function buildTree(): Node[] {
  // 坐标:根居中,二层三个子,叶层六个
  const nodes: Node[] = [
    { id: 0, parent: null, children: [1, 2, 3], N: 0, V: 0, truth: TRUTH[0], x: 230, y: 24 },
    { id: 1, parent: 0, children: [4, 5], N: 0, V: 0, truth: TRUTH[1], x: 110, y: 110 },
    { id: 2, parent: 0, children: [6, 7], N: 0, V: 0, truth: TRUTH[2], x: 230, y: 110 },
    { id: 3, parent: 0, children: [8, 9], N: 0, V: 0, truth: TRUTH[3], x: 350, y: 110 },
    { id: 4, parent: 1, children: [], N: 0, V: 0, truth: TRUTH[4], x: 70, y: 196 },
    { id: 5, parent: 1, children: [], N: 0, V: 0, truth: TRUTH[5], x: 150, y: 196 },
    { id: 6, parent: 2, children: [], N: 0, V: 0, truth: TRUTH[6], x: 200, y: 196 },
    { id: 7, parent: 2, children: [], N: 0, V: 0, truth: TRUTH[7], x: 280, y: 196 },
    { id: 8, parent: 3, children: [], N: 0, V: 0, truth: TRUTH[8], x: 320, y: 196 },
    { id: 9, parent: 3, children: [], N: 0, V: 0, truth: TRUTH[9], x: 400, y: 196 },
  ];
  return nodes;
}

const W = 460;
const H = 250;
const R = 16;

// UCT 值
function uct(node: Node, parentN: number, c: number): number {
  if (node.N === 0) return Infinity; // 未访问的子节点优先选(展开)
  const exploit = node.V / node.N;
  const explore = c * Math.sqrt(Math.log(parentN) / node.N);
  return exploit + explore;
}

// 确定性伪随机 rollout:围绕 truth 做有偏采样,种子由路径决定
function rolloutValue(truth: number, seed: number): number {
  // 简单 LCG 伪随机
  let s = seed * 1103515245 + 12345;
  const r = ((s >>> 16) & 0x7fff) / 0x7fff; // [0,1)
  // 采样值 = truth + 噪声,裁到 [-1,1]
  return Math.max(-1, Math.min(1, truth + (r - 0.5) * 0.6));
}

export default function MCTSExplorer() {
  const [nodes, setNodes] = useState<Node[]>(buildTree);
  const [c, setC] = useState(Math.SQRT2);
  const [iter, setIter] = useState(0);
  const [lastPath, setLastPath] = useState<number[]>([]);

  // 选:从根用 UCT 下行到「未充分展开」的节点(有未访问子或叶)
  const selectPath = useCallback(
    (tree: Node[]): number[] => {
      const path = [0];
      let cur = 0;
      while (tree[cur].children.length > 0) {
        const children = tree[cur].children;
        // 若有未访问的子,选第一个未访问的(展开点)
        const unvisited = children.find((ch) => tree[ch].N === 0);
        if (unvisited !== undefined) {
          path.push(unvisited);
          break;
        }
        // 否则按 UCT 选最大
        let best = children[0];
        let bestU = -Infinity;
        for (const ch of children) {
          const u = uct(tree[ch], tree[cur].N, c);
          if (u > bestU) {
            bestU = u;
            best = ch;
          }
        }
        path.push(best);
        cur = best;
      }
      return path;
    },
    [c]
  );

  const stepOnce = useCallback(() => {
    setNodes((prev) => {
      const tree = prev.map((n) => ({ ...n }));
      const path = selectPath(tree);
      setLastPath(path);
      const leaf = path[path.length - 1];
      // 滚:从叶节点做 rollout(这里叶 truth 即终局近似)
      const seed = leaf * 31 + iter + 1;
      const val = rolloutValue(tree[leaf].truth, seed);
      // 传:沿路径回传(反向,负号交替模拟双人博弈;这里简化为同号传)
      for (const id of path) {
        tree[id].N += 1;
        tree[id].V += val;
      }
      return tree;
    });
    setIter((i) => i + 1);
  }, [selectPath, iter]);

  const reset = useCallback(() => {
    setNodes(buildTree());
    setIter(0);
    setLastPath([]);
  }, []);

  // 当前 UCT 推荐路径(只读展示,不改状态)
  const uctPath = useMemo(() => {
    if (iter === 0) return [];
    return selectPath(nodes);
  }, [nodes, iter, selectPath]);

  const root = nodes[0];
  const bestChild = useMemo(() => {
    if (root.N === 0) return null;
    let best = nodes[1];
    for (const ch of root.children) {
      if (nodes[ch].N > best.N) best = nodes[ch];
    }
    return best;
  }, [nodes, root]);

  // 节点颜色:按 V̄(蓝=负,红=正,灰=未访问)
  const nodeFill = (n: Node) => {
    if (n.N === 0) return "var(--chart-grid)";
    const vbar = n.V / n.N;
    // -1 → 蓝 #0ea5e9,+1 → 红 #ef4444,0 → 中性
    if (vbar >= 0) {
      return `rgb(${239},${68 + (1 - vbar) * 100},${68 + (1 - vbar) * 100})`;
    }
    return `rgb(${14 + (1 + vbar) * 100},${165},${233})`;
  };

  return (
    <div className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-[460px_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="viz-smooth mx-auto h-auto max-w-full rounded-lg bg-chart-surface shadow-sm"
          role="img"
          aria-label="蒙特卡洛树搜索(MCTS)的选-展-滚-传迭代过程"
        >
          {/* 连线 */}
          {nodes.map((n) =>
            n.parent === null
              ? null
              : (() => {
                  const p = nodes[n.parent];
                  const onPath = lastPath.includes(n.id) && lastPath.includes(p.id);
                  return (
                    <line
                      key={`e${n.id}`}
                      x1={p.x}
                      y1={p.y}
                      x2={n.x}
                      y2={n.y}
                      data-smooth
                      stroke={onPath ? "var(--chart-accent)" : "var(--chart-axis)"}
                      strokeWidth={onPath ? 2.5 : 1}
                    />
                  );
                })()
          )}
          {/* 节点 */}
          {nodes.map((n) => {
            const onPath = lastPath.includes(n.id);
            return (
              <g key={n.id}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={R}
                  data-smooth
                  fill={nodeFill(n)}
                  stroke={onPath ? "var(--chart-accent)" : "var(--chart-axis)"}
                  strokeWidth={onPath ? 2.5 : 1}
                  opacity={n.N === 0 ? 0.5 : 0.95}
                />
                <text x={n.x} y={n.y - 1} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--chart-muted)">
                  {n.N > 0 ? (n.V / n.N).toFixed(2) : "·"}
                </text>
                <text x={n.x} y={n.y + 9} textAnchor="middle" fontSize={8} fill="var(--chart-muted)">
                  N={n.N}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col justify-center gap-3">
          <Slider label="探索参数 c" value={c} min={0} max={3} step={0.1} onChange={setC} decimals={2} />
          <div className="flex gap-2">
            <button
              onClick={stepOnce}
              className="flex-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-500"
            >
              运行一次 MCTS 迭代
            </button>
            <button
              onClick={reset}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              重置
            </button>
          </div>
          <div className="rounded-md bg-chart-surface p-2.5 text-xs shadow-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">已迭代</span>
              <span className="font-mono">{iter} 次</span>
            </div>
            <div className="mt-1.5 flex justify-between border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
              <span className="text-zinc-600 dark:text-zinc-300">根访问数 N_root</span>
              <span className="font-mono">{root.N}</span>
            </div>
            {bestChild && (
              <div className="mt-1.5 flex justify-between border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
                <span className="text-zinc-600 dark:text-zinc-300">当前推荐子节点</span>
                <span className="font-mono">#{bestChild.id}(N={bestChild.N}, V̄={(bestChild.V / bestChild.N).toFixed(2)})</span>
              </div>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            <span className="font-mono">UCT = V̄ + c·√(ln N_parent / N)</span>。点「运行一次」执行:<b className="text-amber-600 dark:text-amber-500">选</b>(UCT 下行)→ <b className="text-amber-600 dark:text-amber-500">展</b>(加叶)→ <b className="text-amber-600 dark:text-amber-500">滚</b>(rollout 采样)→ <b className="text-amber-600 dark:text-amber-500">传</b>(沿路径回传 V、N)。拖 c=0 退化为纯贪心,c 越大越偏向访问少的子节点。节点颜色:红=正价值、蓝=负、灰=未访问;粗边=上次迭代路径。
          </p>
        </div>
      </div>
    </div>
  );
}
