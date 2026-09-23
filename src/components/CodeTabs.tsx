"use client";

import { Children, isValidElement, useState, type ReactNode } from "react";

interface CodeTabsProps {
  /** 每个标签页的标题,顺序与 children 一一对应 */
  labels: string[];
  children: ReactNode;
}

/**
 * 标签页容器:在多个面板(通常是 CodeRunner)之间切换。
 * 所有面板始终挂载、仅用 CSS 隐藏非激活项——这样每个 CodeRunner 里
 * 编辑过的代码和运行输出在来回切换时都不会丢失。
 */
export default function CodeTabs({ labels, children }: CodeTabsProps) {
  const [active, setActive] = useState(0);
  const panels = Children.toArray(children).filter(isValidElement);

  return (
    <div className="my-6">
      {/* 标签按钮行 */}
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {labels.map((label, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-selected={active === i}
            role="tab"
            className={`-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition ${
              active === i
                ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 面板:全部挂载,非激活的用 hidden 隐藏以保留各自状态 */}
      {panels.map((panel, i) => (
        <div key={i} hidden={active !== i} role="tabpanel">
          {panel}
        </div>
      ))}
    </div>
  );
}
