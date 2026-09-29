"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getTutorialsNav } from "@/lib/tutorials";
import {
  getPapersNav,
  getPapersNavByDate,
  getPapersNavFlat,
} from "@/lib/papers";
import type { NavTree, NavLeaf } from "@/components/Sidebar";

/**
 * 移动端导航抽屉。
 * 桌面端(≥lg)侧边栏始终可见,故本组件仅在 < lg 显示一个汉堡按钮 +
 * 从左侧滑入的抽屉,让手机/平板用户也能在内容「之间」跳转。
 * 根据当前路径自动切换教程树 / 论文树;
 * 论文树支持 列表 / 关键词 / 时间 三种组织方式(与桌面侧边栏一致)。
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"flat" | "keywords" | "date">("flat");
  const pathname = usePathname();

  const isPapers = pathname.startsWith("/papers");
  const tree: NavTree<NavLeaf>[] = isPapers
    ? mode === "flat"
      ? getPapersNavFlat()
      : mode === "keywords"
        ? getPapersNav()
        : getPapersNavByDate()
    : getTutorialsNav();
  const basePath = isPapers ? "/papers" : "/tutorials";
  const heading = isPapers ? "全部论文" : "全部教程";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      {/* 汉堡按钮 */}
      <button
        onClick={() => setOpen(true)}
        aria-label="打开菜单"
        className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* 遮罩 + 抽屉 */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <nav className="absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col overflow-y-auto bg-white p-5 shadow-xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">
                {heading}
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="关闭菜单"
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>

            {isPapers && (
              <div
                role="tablist"
                className="mb-4 flex gap-0.5 rounded-full bg-zinc-100 p-0.5 text-xs dark:bg-zinc-800/80"
              >
                {([
                  ["flat", "列表"],
                  ["keywords", "关键词"],
                  ["date", "时间"],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={mode === v}
                    onClick={() => setMode(v)}
                    className={`flex-1 rounded-full px-3 py-1.5 transition-all duration-200 ${
                      mode === v
                        ? "bg-white font-medium text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                        : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-6 text-sm">
              {tree.map((dir) => (
                <div key={dir.name}>
                  <div className="mb-2 flex items-center gap-1.5 text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
                    <span>{dir.icon}</span>
                    <span>{dir.name}</span>
                  </div>
                  <div className="space-y-3">
                    {dir.topics.map((topic) => (
                      <div key={topic.name ?? "__flat__"}>
                        {topic.name && (
                          <div className="mb-1 px-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                            {topic.name}
                          </div>
                        )}
                        <ul
                          className={`space-y-0.5 ${
                            topic.name
                              ? "border-l border-zinc-200 pl-2 dark:border-zinc-800"
                              : ""
                          }`}
                        >
                          {topic.leaves.map((leaf) => {
                            const href = `${basePath}/${leaf.slug}`;
                            const active = pathname === href;
                            return (
                              <li key={`${dir.name}::${topic.name ?? "__"}::${leaf.slug}`}>
                                <Link
                                  href={href}
                                  aria-current={active ? "page" : undefined}
                                  className={`flex items-center gap-2 rounded-md border-l-2 px-2 py-2 text-[13px] leading-snug transition ${
                                    active
                                      ? "border-emerald-500 bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                                      : "border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                  }`}
                                >
                                  <span className="text-base">{leaf.icon}</span>
                                  <span className="flex-1 truncate" title={leaf.title}>
                                    {leaf.navTitle ?? leaf.title}
                                  </span>
                                  {leaf.hint && (
                                    <span className="shrink-0 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                                      {leaf.hint}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
