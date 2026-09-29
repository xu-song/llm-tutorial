"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sidebar 渲染所需的最小叶子形状:tutorials 与 papers 都满足。 */
export interface NavLeaf {
  slug: string;
  title: string;
  /** 导航栏(侧边栏/移动端抽屉)展示的短标题;不填则导航与正文共用 title */
  navTitle?: string;
  icon: string;
  /** 可选:叶子旁的补充信息(如论文的发表年月) */
  hint?: string;
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
  /** 备用组织方式:提供后显示树切换按钮(如 列表 ↔ 关键词 ↔ 时间) */
  altTree?: NavTree<L>[];
  altLabel?: string;
  treeLabel?: string;
  /** 第三种组织方式(可选):与 altTree 并列,再追加一个切换按钮 */
  altTree2?: NavTree<L>[];
  altLabel2?: string;
  showLeafIcons?: boolean;
}

/** 树切换按钮组(列表 ↔ 关键词 ↔ 时间)。胶囊分段控件:选中项白底浮起,带图标。 */
function TreeSwitch({
  value,
  onChange,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  labels: Array<{ key: string; label: string }>;
}) {
  return (
    <div
      role="tablist"
      className="mb-3 flex gap-0.5 rounded-full bg-zinc-100 p-0.5 dark:bg-zinc-800/80"
    >
      {labels.map((l) => {
        const selected = value === l.key;
        return (
          <button
            key={l.key}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(l.key)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1 text-xs transition-all duration-200 ${
              selected
                ? "bg-white font-medium text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <TreeSwitchIcon kind={l.key} />
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

/** 切换项的小图标:按组织方式区分。 */
function TreeSwitchIcon({ kind }: { kind: string }) {
  const common = "h-3 w-3 shrink-0";
  if (kind === "alt") {
    // 关键词分组:标签
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={common}>
        <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V4a2 2 0 0 1 2-2h8l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <circle cx="7" cy="7" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "alt2") {
    // 时间分组:日历
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
      </svg>
    );
  }
  // 不分组:三条等长横线(平铺列表)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={common}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

/** 单个叶子链接行,侧边栏与展开的主题内复用。 */
function LeafLink<L extends NavLeaf>({
  leaf,
  active,
  basePath,
  showIcon,
}: {
  leaf: L;
  active: boolean;
  basePath: string;
  showIcon: boolean;
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
      {showIcon && <span className="text-base">{leaf.icon}</span>}
      <span className="flex-1 truncate" title={leaf.title}>
        {leaf.navTitle ?? leaf.title}
      </span>
      {leaf.hint && (
        <span className="shrink-0 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
          {leaf.hint}
        </span>
      )}
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
  showLeafIcons,
}: {
  name: string;
  leaves: L[];
  pathname: string;
  activeHere: boolean;
  basePath: string;
  showLeafIcons: boolean;
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
                showIcon={showLeafIcons}
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
  altTree,
  altLabel,
  treeLabel,
  altTree2,
  altLabel2,
  showLeafIcons = true,
}: SidebarProps<L>) {
  const pathname = usePathname();
  const [which, setWhich] = useState<string>("main");

  const trees = new Map<string, NavTree<L>[]>([["main", tree]]);
  if (altTree) trees.set("alt", altTree);
  if (altTree2) trees.set("alt2", altTree2);
  const active = trees.get(which) ?? tree;

  const switchLabels = [
    { key: "main", label: treeLabel ?? "默认" },
    ...(altTree ? [{ key: "alt", label: altLabel ?? "关键词" }] : []),
    ...(altTree2 ? [{ key: "alt2", label: altLabel2 ?? "时间" }] : []),
  ];

  // 软导航切换 basePath(教程 ↔ 论文)时回到默认树,不携带另一模块的切换状态
  useEffect(() => {
    setWhich("main");
  }, [basePath]);

  return (
    <nav className="text-sm">
      <div className="mb-4 px-2 text-xs font-semibold text-zinc-400">
        {heading}
      </div>
      {switchLabels.length > 1 && (
        <TreeSwitch value={which} onChange={setWhich} labels={switchLabels} />
      )}
      <div className="space-y-6">
        {active.map((dir) => (
          <div key={dir.name}>
            <div className="mb-2 flex items-center gap-1.5 px-2 text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
              <span>{dir.icon}</span>
              <span>{dir.name}</span>
            </div>
            <div className="space-y-1.5">
              {dir.topics.map((topic) => {
                // 论文是多关键词的:当前叶子可能出现在多个分组里,
                // 只自动展开最靠前的一个,其余保持收起(可手动展开)。
                const firstActiveTopicIdx = dir.topics.findIndex((t) =>
                  t.leaves.some(
                    (leaf) => pathname === `${basePath}/${leaf.slug}`,
                  ),
                );
                const activeHere =
                  dir.topics.indexOf(topic) === firstActiveTopicIdx;
                if (topic.name === null) {
                  return (
                    <ul key="__flat__" className="space-y-0.5">
                      {topic.leaves.map((leaf) => (
                        <li key={`${dir.name}::${leaf.slug}`}>
                          <LeafLink
                            leaf={leaf}
                            active={pathname === `${basePath}/${leaf.slug}`}
                            basePath={basePath}
                            showIcon={showLeafIcons}
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
                    showLeafIcons={showLeafIcons}
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
