"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/** 应用主题到 <html> 并持久化 */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // localStorage 不可用时静默降级
  }
}

/** 浅色/暗色切换按钮。初始主题由 layout 中的内联脚本决定,避免闪烁。 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 读取内联脚本已经设好的当前状态
    const current = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    setTheme(current);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  // 挂载前渲染占位,避免服务端/客户端图标不一致导致的水合警告
  return (
    <button
      onClick={toggle}
      aria-label="切换浅色/暗色模式"
      title={theme === "dark" ? "切换到浅色" : "切换到暗色"}
      className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {!mounted ? (
        <span className="text-lg">🌓</span>
      ) : theme === "dark" ? (
        <span className="text-lg">☀️</span>
      ) : (
        <span className="text-lg">🌙</span>
      )}
    </button>
  );
}
