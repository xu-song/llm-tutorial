"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNeighbors, type Tutorial } from "@/lib/tutorials";
import { getPaperNeighbors, type Paper } from "@/lib/papers";

/** PrevNext 渲染所需的最小叶子形状。 */
export interface PrevNextLeaf {
  slug: string;
  title: string;
  icon: string;
  tags?: string[];
  topic?: string;
}

export interface PrevNextProps {
  /** 决定取哪套注册表的邻居与上下文标签;"/tutorials" 或 "/papers" */
  basePath: "/tutorials" | "/papers";
}

/** 根据 basePath 选数据源(函数不跨 server→client 边界,在组件内部解析)。 */
function resolve(basePath: PrevNextProps["basePath"]) {
  if (basePath === "/papers") {
    return { neighbors: (slug: string) => getPaperNeighbors(slug) };
  }
  return { neighbors: (slug: string) => getNeighbors(slug) };
}

type AnyLeaf = PrevNextLeaf & { category?: string; direction?: string };

export default function PrevNext({ basePath }: PrevNextProps) {
  const pathname = usePathname();
  const slug = pathname.replace(`${basePath}/`, "");
  const { neighbors } = resolve(basePath);
  const { prev, next } = neighbors(slug);

  if (!prev && !next) return null;

  const label = (leaf: PrevNextLeaf) => {
    const l = leaf as AnyLeaf;
    if (l.tags && l.tags.length > 0) return l.tags.slice(0, 2).join(" · ");
    const group = l.direction ?? l.category ?? "";
    return l.topic ? `${group} · ${l.topic}` : group;
  };

  const card = (leaf: PrevNextLeaf, side: "prev" | "next") => (
    <Link
      href={`${basePath}/${leaf.slug}`}
      className="group block rounded-xl border border-zinc-200 p-4 transition hover:border-emerald-400 dark:border-zinc-800 dark:hover:border-emerald-500"
    >
      <div className="text-xs text-zinc-400 dark:text-zinc-500">
        {side === "prev" ? "← 上一篇" : "下一篇 →"}
      </div>
      <div className="mt-1 font-medium text-zinc-800 group-hover:text-emerald-700 dark:text-zinc-200 dark:group-hover:text-emerald-400">
        {leaf.icon} {leaf.title}
      </div>
      <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
        {label(leaf)}
      </div>
    </Link>
  );

  return (
    <div className="mt-14 grid grid-cols-2 gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
      <div>{prev && card(prev, "prev")}</div>
      <div className="text-right">{next && card(next, "next")}</div>
    </div>
  );
}
