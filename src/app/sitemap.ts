import type { MetadataRoute } from "next";
import { tutorials, SITE_URL } from "@/lib/tutorials";
import { papers } from "@/lib/papers";

// 静态导出(output: 'export')要求 metadata 路由显式声明静态
export const dynamic = "force-static";

// 由注册表自动生成站点地图 —— 新增教程 / 论文无需改动这里。
export default function sitemap(): MetadataRoute.Sitemap {
  const home = {
    url: SITE_URL,
    changeFrequency: "monthly" as const,
    priority: 1,
  };
  const about = {
    url: `${SITE_URL}/about`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  };
  const tutorialEntries = tutorials.map((t) => ({
    url: `${SITE_URL}/tutorials/${t.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));
  const paperIndex = {
    url: `${SITE_URL}/papers`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  };
  const paperEntries = papers.map((p) => ({
    url: `${SITE_URL}/papers/${p.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  return [home, about, ...tutorialEntries, paperIndex, ...paperEntries];
}
