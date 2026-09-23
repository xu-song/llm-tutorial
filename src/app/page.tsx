import Link from "next/link";
import {
  getCategoriesNested,
  getFirstTutorial,
  getTutorialOrder,
  tutorials,
  type Tutorial,
} from "@/lib/tutorials";

function TutorialCard({ t }: { t: Tutorial }) {
  const order = getTutorialOrder(t.slug);
  return (
    <Link
      href={`/tutorials/${t.slug}`}
      className="group flex h-full flex-col rounded-xl border border-zinc-200 p-5 transition hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:hover:border-emerald-500"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-emerald-950 dark:group-hover:text-emerald-400">
          {order}
        </span>
        <span className="text-2xl">{t.icon}</span>
        <span className="font-medium text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-400">
          {t.title}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t.desc}</p>
    </Link>
  );
}

export default function Home() {
  const categories = getCategoriesNested();
  const first = getFirstTutorial();

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-16">
      <div className="text-center">
        <div className="text-5xl">🤖</div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          大模型与机器学习教程
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          从机器学习基础到强化学习、大模型对齐与论文精读,用交互图表和可运行代码建立直觉。
          <br />
          按学习路径循序渐进,也可以直接跳到感兴趣的专题。
        </p>

        {/* 概览统计 */}
        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="text-base">📚</span>
            {tutorials.length} 篇教程
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-base">🐍</span>
            浏览器内 Python
          </span>
        </div>

        {/* 开始学习 CTA */}
        <Link
          href={`/tutorials/${first.slug}`}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          🚀 从头开始学
          <span className="text-emerald-200">·</span>
          <span className="font-normal text-emerald-100">{first.title}</span>
        </Link>
      </div>

      <div className="mt-16 space-y-10">
        {categories.map((cat) => (
          <section key={cat.name}>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </h2>
            <div className="space-y-6">
              {cat.topics.map((topic) => (
                <div key={topic.name ?? "__flat__"}>
                  {topic.name && (
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                      <span className="h-3 w-0.5 rounded-full bg-emerald-500" />
                      {topic.name}
                    </h3>
                  )}
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {topic.tutorials.map((t) => (
                      <li key={t.slug}>
                        <TutorialCard t={t} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 rounded-2xl bg-zinc-50 p-6 text-center text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
        技术栈:Next.js · MDX · KaTeX · CodeMirror · Pyodide(浏览器内 Python)
      </div>
    </main>
  );
}
