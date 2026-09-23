"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * 教程内「本页章节目录」(On this page)。
 * 从正文 DOM 中读取 h2/h3 标题,点击滚动跳转,并随滚动高亮当前小节。
 * 注意:与左侧「教程之间」的 Sidebar 不同,这里只列出当前这一篇的章节。
 */
export default function TableOfContents() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    // App Router 软导航切换教程时,layout(含本组件)不重挂,只换 <article> 正文。
    // 因此必须依赖 pathname 重新扫描;否则目录会停留在上一篇。
    setActiveId("");

    let observer: IntersectionObserver | null = null;

    // 软导航时新正文可能尚未替换完成,等下一帧再读 DOM 更稳妥。
    const raf = requestAnimationFrame(() => {
      const article = document.querySelector("article");
      if (!article) return;
      const nodes = Array.from(article.querySelectorAll("h2, h3")) as HTMLElement[];
      const items = nodes
        .filter((n) => n.id)
        .map((n) => ({
          id: n.id,
          text: n.textContent ?? "",
          level: Number(n.tagName.substring(1)),
        }));
      setHeadings(items);

      if (items.length === 0) return;

      // 用 IntersectionObserver 跟踪当前可见的小节
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible.length > 0) {
            setActiveId(visible[0].target.id);
          }
        },
        // 顶部留出导航栏高度,提前一点激活
        { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
      );

      nodes.forEach((n) => n.id && observer!.observe(n));
    });

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [pathname]);

  if (headings.length === 0) return null;

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: "smooth" });
      setActiveId(id);
    }
  };

  return (
    <nav className="text-sm">
      <div className="mb-3 px-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
        本页目录
      </div>
      <ul className="space-y-0.5 border-l border-zinc-200 dark:border-zinc-800">
        {headings.map((h) => {
          const active = activeId === h.id;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => handleClick(e, h.id)}
                className={`-ml-px block border-l-2 py-1 no-underline transition ${
                  h.level === 3 ? "pl-6" : "pl-3"
                } ${
                  active
                    ? "border-emerald-500 font-medium text-emerald-700 dark:text-emerald-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
