import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import PrevNext from "@/components/PrevNext";
import TableOfContents from "@/components/TableOfContents";
import Comments from "@/components/Comments";
import {
  getPapersNav,
  getPapersNavByDate,
  getPapersNavFlat,
} from "@/lib/papers";

// 论文区三栏布局,镜像 tutorials/layout.tsx:
//   左 = 论文「之间」的导航(全部论文列表,默认不分组按时间正序;关键词 / 时间分组可切换)
//   中 = 正文(PaperHeader + 阅读笔记 MDX)
//   右 = 论文「之内」的章节目录(本页 h2/h3,带滚动高亮)
export default function PaperLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-8">
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <Sidebar
            tree={getPapersNavFlat()}
            basePath="/papers"
            heading="全部论文"
            treeLabel="列表"
            altTree={getPapersNav()}
            altLabel="关键词"
            altTree2={getPapersNavByDate()}
            altLabel2="时间"
            showLeafIcons={false}
          />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <article
          className="
            [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-6 [&_h1]:mt-2 [&_h1]:dark:text-zinc-50
            [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:scroll-mt-20 [&_h2]:dark:text-zinc-100
            [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:scroll-mt-20 [&_h3]:dark:text-zinc-100
            [&_p]:leading-7 [&_p]:my-4 [&_p]:text-zinc-700 [&_p]:dark:text-zinc-300
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_li]:my-1 [&_li]:text-zinc-700 [&_li]:dark:text-zinc-300
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4
            [&_a]:text-emerald-600 [&_a]:underline [&_a]:dark:text-emerald-400
            [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-zinc-100 [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-sm [&_:not(pre)>code]:text-pink-600 [&_:not(pre)>code]:dark:bg-zinc-800 [&_:not(pre)>code]:dark:text-pink-400
            [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-zinc-200 [&_pre]:bg-zinc-50 [&_pre]:p-3 [&_pre]:text-sm [&_pre]:leading-6 [&_pre]:dark:border-zinc-800 [&_pre]:dark:bg-zinc-900
            [&_strong]:font-semibold [&_strong]:text-zinc-900 [&_strong]:dark:text-zinc-100
            [&_table]:my-4 [&_table]:w-full [&_table]:text-sm [&_th]:border [&_th]:border-zinc-200 [&_th]:dark:border-zinc-700 [&_th]:bg-zinc-50 [&_th]:dark:bg-zinc-800 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-zinc-200 [&_td]:dark:border-zinc-700 [&_td]:px-3 [&_td]:py-2 [&_td]:text-zinc-700 [&_td]:dark:text-zinc-300
            [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-300 [&_blockquote]:bg-emerald-50 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:rounded-r-lg [&_blockquote]:my-4 [&_blockquote_p]:my-1 [&_blockquote_p]:text-zinc-700 [&_blockquote]:dark:border-emerald-700 [&_blockquote]:dark:bg-emerald-950/40 [&_blockquote_p]:dark:text-zinc-300
            [&_figcaption]:!mt-3 [&_figcaption]:mx-auto [&_figcaption]:max-w-2xl [&_figcaption]:text-center [&_figcaption]:text-zinc-500 [&_figcaption]:dark:text-zinc-500 [&_.figure-caption-main]:block [&_.figure-caption-main]:!text-[13px] [&_.figure-caption-main]:!leading-5 [&_.figure-caption-main]:text-zinc-500 [&_.figure-caption-main]:dark:text-zinc-500 [&_.figure-caption-source]:mt-1 [&_.figure-caption-source]:block [&_.figure-caption-source]:!text-[11px] [&_.figure-caption-source]:!leading-4 [&_.figure-caption-source]:text-zinc-400 [&_.figure-caption-source]:dark:text-zinc-600
          "
        >
          {children}
        </article>
        <Comments />
        <PrevNext basePath="/papers" />
      </main>

      <aside className="hidden w-52 shrink-0 xl:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <TableOfContents />
        </div>
      </aside>
    </div>
  );
}
