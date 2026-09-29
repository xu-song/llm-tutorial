import type { Metadata } from "next";
import Link from "next/link";
import { getFirstTutorial } from "@/lib/tutorials";

export const metadata: Metadata = {
  title: "关于",
  description: "关于大模型与机器学习教程的内容定位、学习方式和技术实现",
};

export default function AboutPage() {
  const first = getFirstTutorial();

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-16">
      <div className="text-center">
        <div className="text-5xl">🤖</div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">关于这个教程</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          这是一个面向中文读者的大模型与机器学习教程站，目标是把抽象概念讲清楚，
          把公式、代码和直觉放在同一个学习路径里。
        </p>
      </div>

      <div className="mt-12 space-y-10">
        <section>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">内容定位</h2>
          <p className="mt-4 leading-7 text-zinc-700 dark:text-zinc-300">
            站点覆盖机器学习基础、深度学习、强化学习、大模型对齐和论文精读。每篇内容尽量从问题动机出发，
            解释方法为什么被提出、解决了什么限制，以及它和其他方法之间的关系。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">学习方式</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              ["循序渐进", "按教程顺序从基础概念一路学到强化学习与大模型专题。"],
              ["动手验证", "通过交互图表和浏览器内 Python，把关键公式变成可观察的现象。"],
              ["论文导读", "用中文拆解重要论文的动机、方法、实验和局限。"],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">技术实现</h2>
          <p className="mt-4 leading-7 text-zinc-700 dark:text-zinc-300">
            本站基于 Next.js、MDX、KaTeX、CodeMirror 和 Pyodide 构建。MDX 用来组织长文内容，
            KaTeX 负责公式排版，交互示例尽量在浏览器内完成，减少本地环境配置成本。
          </p>
        </section>
      </div>

      <div className="mt-12 flex flex-wrap justify-center gap-3">
        <Link
          href={`/tutorials/${first.slug}`}
          className="rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md dark:hover:bg-emerald-500"
        >
          从头开始学
        </Link>
        <Link
          href="/papers"
          className="rounded-xl border border-zinc-200 px-6 py-3 font-medium text-zinc-700 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
        >
          查看论文精读
        </Link>
      </div>
    </main>
  );
}
