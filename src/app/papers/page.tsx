"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getAllTags,
  getFirstPaper,
  getPapersByDate,
  getPapersByTag,
  papers,
  type Paper,
} from "@/lib/papers";
import { getTagHint, getTagIcon } from "@/lib/paper-tags";

function TagChips({ p }: { p: Paper }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {p.tags.map((t) => (
        <span
          key={t}
          title={getTagHint(t)}
          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function PaperCard({ p }: { p: Paper }) {
  return (
    <Link
      href={`/papers/${p.slug}`}
      className="group flex h-full flex-col rounded-xl border border-zinc-200 p-5 transition hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:hover:border-emerald-500"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{p.icon}</span>
        <span className="font-medium text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400">
          {p.title}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{p.desc}</p>
      <TagChips p={p} />
      {(p.venue || p.year) && (
        <div className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          {[p.venue, p.year].filter(Boolean).join(" · ")}
        </div>
      )}
    </Link>
  );
}

/** 紧凑列表行:图标 + 标题 + 描述单行截断 + 关键词 + 年份。 */
function PaperRow({ p }: { p: Paper }) {
  return (
    <Link
      href={`/papers/${p.slug}`}
      className="group flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 transition hover:border-emerald-400 hover:shadow-sm dark:border-zinc-800 dark:hover:border-emerald-500"
    >
      <span className="shrink-0 text-xl">{p.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400">
            {p.title}
          </span>
          <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
            {[p.venue, p.year].filter(Boolean).join(" · ")}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
          {p.desc}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {p.tags.map((t) => (
            <span
              key={t}
              title={getTagHint(t)}
              className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

// 客户端组件读 URL query(静态导出不支持服务端 searchParams)。
// Suspense 包一层满足 useSearchParams 的 CSR bailout 约束(见 page.tsx 尾部)。
function PapersHomeInner() {
  const sp = useSearchParams();
  const selected = sp.get("tag") ?? undefined;
  const view = sp.get("view") === "list" ? "list" : "cards";
  const tags = getAllTags();
  const valid = selected !== undefined && tags.includes(selected);
  const first = getFirstPaper();
  // 列表视图默认按发表时间倒序;卡片视图保持阅读顺序。
  const base = view === "list" ? getPapersByDate() : papers;
  const shown = valid ? base.filter((p) => p.tags.includes(selected)) : base;
  const qs = (patch: { tag?: string | null; view?: string }) => {
    const params = new URLSearchParams();
    const tag = patch.tag === undefined ? selected : patch.tag;
    const v = patch.view === undefined ? view : patch.view;
    if (tag) params.set("tag", tag);
    if (v === "list") params.set("view", "list");
    return `/papers${params.size ? `?${params}` : ""}`;
  };

  return (
    <div>
      <div className="text-center">
        <div className="text-4xl">📚</div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">论文阅读</h1>
        <p className="mx-auto mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
          按关键词追踪前沿论文——一篇大模型论文往往横跨架构、数据、训练、RL
          等多个维度,点击关键词即可查看同主题的所有论文。
        </p>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="text-base">📄</span>
            {papers.length} 篇论文
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-base">🏷️</span>
            {tags.length} 个关键词
          </span>
        </div>
        {!valid && first && (
          <Link
            href={`/papers/${first.slug}`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            🚀 开始阅读
            <span className="text-emerald-200">·</span>
            <span className="font-normal text-emerald-100">{first.title}</span>
          </Link>
        )}
      </div>

      {/* 关键词筛选条 */}
      <nav className="mt-10 flex flex-wrap items-center justify-center gap-2">
        <Link
          href={qs({ tag: null })}
          aria-current={!valid ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 text-sm transition ${
            !valid
              ? "bg-emerald-600 font-medium text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          }`}
        >
          全部 {papers.length}
        </Link>
        {tags.map((t) => {
          const n = getPapersByTag(t).length;
          const active = valid && selected === t;
          return (
            <Link
              key={t}
              href={qs({ tag: t })}
              title={getTagHint(t)}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-emerald-600 font-medium text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {getTagIcon(t)} {t} {n}
            </Link>
          );
        })}
      </nav>

      {/* 当前筛选说明 + 视图切换 */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-center gap-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            {valid ? (
              <>
                <span>{getTagIcon(selected)}</span>
                <span>{selected}</span>
                <span className="text-sm font-normal text-zinc-400">
                  · {shown.length} 篇
                </span>
              </>
            ) : (
              <>
                <span>📖</span>
                <span>全部论文</span>
                <span className="text-sm font-normal text-zinc-400">
                  · {view === "list" ? "按发表时间" : "按阅读顺序"}
                </span>
              </>
            )}
          </h2>
          {valid && (
            <Link
              href={qs({ tag: null })}
              className="text-sm text-emerald-600 underline dark:text-emerald-400"
            >
              清除筛选 ✕
            </Link>
          )}
          <span className="ml-2 flex items-center rounded-lg border border-zinc-200 p-0.5 text-xs dark:border-zinc-700">
            <Link
              href={qs({ view: "cards" })}
              aria-current={view === "cards" ? "true" : undefined}
              className={`rounded-md px-2.5 py-1 transition ${
                view === "cards"
                  ? "bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              ▦ 卡片
            </Link>
            <Link
              href={qs({ view: "list" })}
              aria-current={view === "list" ? "true" : undefined}
              className={`rounded-md px-2.5 py-1 transition ${
                view === "list"
                  ? "bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              ☰ 列表
            </Link>
          </span>
        </div>

        {view === "list" ? (
          <ul className="space-y-2">
            {shown.map((p) => (
              <li key={p.slug}>
                <PaperRow p={p} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {shown.map((p) => (
              <li key={p.slug}>
                <PaperCard p={p} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function PapersHome() {
  return (
    <Suspense fallback={null}>
      <PapersHomeInner />
    </Suspense>
  );
}
