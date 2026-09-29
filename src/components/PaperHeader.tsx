import Link from "next/link";
import { getPaper } from "@/lib/papers";
import { getTagHint, getTagIcon } from "@/lib/paper-tags";

export default function PaperHeader({ slug }: { slug: string }) {
  const p = getPaper(slug);
  if (!p) return null;

  const venueYear = [p.venue, p.year].filter(Boolean).join(" · ");
  const motivation = splitMotivation(p.motivation);

  const links: { label: string; href: string; emoji: string }[] = [];
  if (p.arxivUrl) links.push({ label: "arXiv", href: p.arxivUrl, emoji: "📄" });
  if (p.pdfUrl) links.push({ label: "PDF", href: p.pdfUrl, emoji: "📑" });
  if (p.codeUrl) links.push({ label: "代码", href: p.codeUrl, emoji: "💻" });

  return (
    <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
      {/* 论文原标题(英文) */}
      {p.paperTitle && (
        <p className="mb-2 text-sm italic text-zinc-500 dark:text-zinc-400">
          {p.paperTitle}
        </p>
      )}

      {/* 作者 + 会议·年份 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {p.authors.length > 0 && <span>✍️ {p.authors.join(", ")}</span>}
        {venueYear && (
          <>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <span>{venueYear}</span>
          </>
        )}
      </div>

      {/* 关键词标签:点击跳到对应筛选 */}
      {p.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {p.tags.map((t) => (
            <Link
              key={t}
              href={`/papers?tag=${encodeURIComponent(t)}`}
              title={getTagHint(t)}
              className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 transition hover:bg-emerald-100 hover:text-emerald-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-emerald-950 dark:hover:text-emerald-400"
            >
              {getTagIcon(t)} {t}
            </Link>
          ))}
        </div>
      )}

      {/* 外链 */}
      {links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
            >
              <span>{l.emoji}</span>
              {l.label}
            </a>
          ))}
        </div>
      )}

      {motivation && (
        <section className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="space-y-1.5">
            <p className="leading-6 text-zinc-700 dark:text-zinc-300">
              <span className="mr-2 font-semibold text-red-600 dark:text-red-300">痛点</span>
              {motivation.problem}
            </p>
            <p className="leading-6 text-zinc-700 dark:text-zinc-300">
              <span className="mr-2 font-semibold text-emerald-600 dark:text-emerald-300">突破</span>
              {motivation.solution}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function splitMotivation(motivation?: string) {
  if (!motivation) return null;
  const match = /^(.*?。)(.*)$/.exec(motivation);
  if (!match) {
    return {
      problem: motivation,
      solution: "继续往下看这篇论文如何拆解并解决这个问题。",
    };
  }
  return {
    problem: match[1],
    solution:
      match[2].trim() || "继续往下看这篇论文如何拆解并解决这个问题。",
  };
}
