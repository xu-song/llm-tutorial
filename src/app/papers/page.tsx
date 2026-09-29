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

const featuredPaperResources = [
  {
    title: "Hugging Face Papers",
    href: "https://huggingface.co/papers/trending",
    tag: "趋势发现",
    desc: "Papers with Code Trending 当前会跳转到这里，适合快速扫大模型、多模态与开源模型的每日热门论文。",
  },
  {
    title: "arXiv Recent",
    href: "https://arxiv.org/list/cs.CL/recent",
    tag: "一手来源",
    desc: "预印本源头入口，可从 cs.CL、cs.LG、cs.AI 等分类追踪最新提交。",
  },
  {
    title: "Papers.cool",
    href: "https://papers.cool/",
    tag: "快速浏览",
    desc: "更适合扫标题、摘要和方向热度的 arXiv 浏览器，用来补足原站检索体验。",
  },
  {
    title: "Semantic Scholar",
    href: "https://www.semanticscholar.org/",
    tag: "引用检索",
    desc: "查作者、引用、相关论文和影响力，适合从一篇论文扩展到完整文献网络。",
  },
];

const paperResourceGroups = [
  {
    title: "读懂与讨论",
    links: [
      { title: "alphaXiv", href: "https://www.alphaxiv.org/" },
      { title: "ReadPaper", href: "https://readpaper.com/" },
      { title: "Emergent Mind", href: "https://www.emergentmind.com/" },
    ],
  },
  {
    title: "引用图谱",
    links: [
      { title: "Connected Papers", href: "https://www.connectedpapers.com/" },
      { title: "ResearchRabbit", href: "https://www.researchrabbitapp.com/" },
      { title: "Litmaps", href: "https://www.litmaps.com/" },
      { title: "Inciteful", href: "https://inciteful.xyz/" },
    ],
  },
  {
    title: "会议归档",
    links: [
      { title: "OpenReview", href: "https://openreview.net/" },
      { title: "ACL Anthology", href: "https://aclanthology.org/" },
      { title: "CVF Open Access", href: "https://openaccess.thecvf.com/" },
    ],
  },
  {
    title: "解读与趋势",
    links: [
      { title: "The Gradient", href: "https://thegradient.pub/" },
      { title: "Latent Space", href: "https://www.latent.space/" },
      { title: "Interconnects", href: "https://www.interconnects.ai/" },
      { title: "AI News", href: "https://buttondown.com/ainews" },
      { title: "机器之心", href: "https://www.jiqizhixin.com/" },
    ],
  },
];

function PaperResourceLinks() {
  return (
    <section className="relative mt-10 overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-5 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/30 dark:via-zinc-950 dark:to-cyan-950/20 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-700/20" />
      <div className="pointer-events-none absolute -bottom-24 left-12 h-48 w-48 rounded-full bg-cyan-200/40 blur-3xl dark:bg-cyan-700/20" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
            Paper Radar
          </span>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            前沿论文资源站
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            先用趋势站点发现线索，再回到论文原文、会议归档和官方代码核对关键细节。
          </p>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-900/70 dark:text-zinc-400 dark:ring-zinc-800">
          精选入口 + 扩展工具
        </span>
      </div>

      <ul className="relative mt-5 grid !list-none gap-3 !pl-0 sm:grid-cols-2">
        {featuredPaperResources.map((resource) => (
          <li key={resource.href}>
            <a
              href={resource.href}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full flex-col rounded-2xl border border-white/80 bg-white/85 p-4 !no-underline shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-emerald-700"
            >
              <span className="w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                {resource.tag}
              </span>
              <div className="mt-3 flex items-start justify-between gap-3">
                <span className="font-semibold text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400">
                  {resource.title}
                </span>
                <span className="text-sm text-emerald-600 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-emerald-400">
                  ↗
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {resource.desc}
              </p>
            </a>
          </li>
        ))}
      </ul>

      <div className="relative mt-4 grid gap-3 lg:grid-cols-4">
        {paperResourceGroups.map((group) => (
          <div
            key={group.title}
            className="rounded-2xl border border-white/70 bg-white/60 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {group.title}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600 !no-underline transition hover:border-emerald-300 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-400 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
                >
                  {link.title}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
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

      <PaperResourceLinks />

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
