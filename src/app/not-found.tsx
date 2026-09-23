import Link from "next/link";
import { getFirstTutorial } from "@/lib/tutorials";

// 自定义 404 页:替换 Next 默认的英文「This page could not be found」,
// 与站点风格一致,并给出回首页 / 从头学的出口。
export default function NotFound() {
  const first = getFirstTutorial();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-5 py-24 text-center">
      <div className="text-6xl">🧭</div>
      <h1 className="mt-6 text-4xl font-bold tracking-tight">404 · 页面走丢了</h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        这里没有你要找的内容 —— 也许链接过期,或地址拼错了。
        <br />
        不如回到起点,继续学习之旅?
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md dark:hover:bg-emerald-500"
        >
          🏠 回首页
        </Link>
        <Link
          href={`/tutorials/${first.slug}`}
          className="rounded-xl border border-zinc-200 px-6 py-3 font-medium text-zinc-700 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
        >
          🚀 从头开始学
        </Link>
      </div>
    </main>
  );
}
