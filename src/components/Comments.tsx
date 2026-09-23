"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { GISCUS, commentsReady } from "@/lib/comments";

/**
 * 页尾评论区(giscus,GitHub Discussions 后端)。
 * - 评论按 pathname 映射到 discussion thread(giscus 的 pathname 映射模式)
 * - 主题跟随站点的 class 策略暗色模式:监听 <html> 的 class 变化,
 *   通过 postMessage 把 light/dark 告诉 giscus iframe
 * - 未配置 GISCUS(见 src/lib/comments.ts)时渲染为空
 */
export default function Comments() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const readTheme = () =>
      setTheme(root.classList.contains("dark") ? "dark" : "light");
    readTheme();
    const observer = new MutationObserver(readTheme);
    observer.observe(root, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!commentsReady() || !containerRef.current) return;
    // 路由切换时 giscus 不会自动跟随,整块重挂:先清空再重建 script
    containerRef.current.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "giscus";
    containerRef.current.appendChild(wrapper);

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    Object.entries({
      "data-repo": GISCUS.repo,
      "data-repo-id": GISCUS.repoId,
      "data-category": GISCUS.category,
      "data-category-id": GISCUS.categoryId,
      "data-mapping": "pathname",
      "data-strict": "1",
      "data-reactions-enabled": "1",
      "data-emit-metadata": "0",
      "data-input-position": "top",
      "data-theme": theme,
      "data-lang": "zh-CN",
      "data-loading": "lazy",
    }).forEach(([k, v]) => script.setAttribute(k, v));
    containerRef.current.appendChild(script);
  }, [pathname, theme]);

  if (!commentsReady()) return null;

  return (
    <section className="mt-14 border-t border-zinc-200 pt-6 dark:border-zinc-800">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        <span>💬</span>
        <span>评论</span>
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {GISCUS.intro}
      </p>
      <div ref={containerRef} className="mt-4" />
    </section>
  );
}
