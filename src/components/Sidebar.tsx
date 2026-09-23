"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sidebar 渲染所需的最小叶子形状:tutorials 与 papers 都满足。 */
export interface NavLeaf {
  slug: string;
  title: string;
  icon: string;
}

export interface NavTopic<L extends NavLeaf> {
  name: string | null;
  leaves: L[];
}

export interface NavTree<L extends NavLeaf> {
  name: string;
  icon: string;
  topics: NavTopic<L>[];
}

export interface SidebarProps<L extends NavLeaf> {
  tree: NavTree<L>[];
  basePath: string;
  heading: string;
  /** 上一篇/下一篇标签里展示的「领域 · 板块」上下文 */
  contextLabel?: (leaf: L) => string;
}

/** 单个叶子链接行,侧边栏与展开的主题内复用。 */
function LeafLink<L extends NavLeaf>({
  leaf,
  active,
  basePath,
}: {
  leaf: L;
  active: boolean;
  basePath: string;
}) {
  return (
    <Link
      href={`${basePath}/${leaf.slug}`}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-[13px] leading-snug transition ${
        active
          ? "border-emerald-500 bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
          : "border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      }`}
    >
      <span className="text-base">{leaf.icon}</span>
      <span className="flex-1">{leaf.title}</span>
    </Link>
  );
}

/** 可折叠的主题(Topic)。当前叶子所在主题始终展开(即使软导航切换),其余可自由折叠。 */
function TopicGroup<L extends NavLeaf>({
  name,
  leaves,
  pathname,
  activeHere,
  basePath,
}: {
  name: string;
  leaves: L[];
  pathname: string;
  activeHere: boolean;
  basePath: string;
}) {
  const [userOpen, setUserOpen] = useState(false);
  const open = activeHere || userOpen;
  return (
    <div>
      <button
        onClick={() => setUserOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold transition ${
          activeHere
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        >
          <polyline points="9 6 15 12 9 18" />
        </svg>
        <span className="flex-1 text-left">{name}</span>
        <span className="font-normal text-zinc-400 dark:text-zinc-600">
          {leaves.length}
        </span>
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5 border-l border-zinc-200 pl-2 dark:border-zinc-800">
          {leaves.map((leaf) => (
            <li key={`${name}::${leaf.slug}`}>
              <LeafLink
                leaf={leaf}
                active={pathname === `${basePath}/${leaf.slug}`}
                basePath={basePath}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Sidebar<L extends NavLeaf>({
  tree,
  basePath,
  heading,
}: SidebarProps<L>) {
  const pathname = usePathname();

  return (
    <nav className="text-sm">
      <div className="mb-4 px-2 text-xs font-semibold text-zinc-400">
        {heading}
      </div>
      <div className="space-y-6">
        {tree.map((dir) => (
          <div key={dir.name}>
            <div className="mb-2 flex items-center gap-1.5 px-2 text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
              <span>{dir.icon}</span>
              <span>{dir.name}</span>
            </div>
            <div className="space-y-1.5">
              {dir.topics.map((topic) => {
                const activeHere = topic.leaves.some(
                  (leaf) => pathname === `${basePath}/${leaf.slug}`,
                );
                if (topic.name === null) {
                  return (
                    <ul key="__flat__" className="space-y-0.5">
                      {topic.leaves.map((leaf) => (
                        <li key={`${dir.name}::${leaf.slug}`}>
                          <LeafLink
                            leaf={leaf}
                            active={pathname === `${basePath}/${leaf.slug}`}
                            basePath={basePath}
                          />
                        </li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <TopicGroup<L>
                    key={topic.name}
                    name={topic.name}
                    leaves={topic.leaves}
                    pathname={pathname}
                    activeHere={activeHere}
                    basePath={basePath}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
