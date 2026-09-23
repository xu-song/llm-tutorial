"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import MobileNav from "./MobileNav";
import { getFirstTutorial } from "@/lib/tutorials";

export default function NavBar() {
  const pathname = usePathname();
  const link = (href: string, label: string, matchPrefix?: string) => {
    const active = matchPrefix
      ? pathname === href || pathname.startsWith(matchPrefix)
      : pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          active
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <MobileNav />
        <Link href="/" className="mr-2 flex items-center gap-2 font-semibold">
          <span className="text-xl">🤖</span>
          <span>机器学习交互式教程</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {link("/", "首页")}
          {link(`/tutorials/${getFirstTutorial().slug}`, "教程", "/tutorials/")}
          {link("/papers", "论文", "/papers/")}
          <a
            href="https://pyodide.org"
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            关于
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
