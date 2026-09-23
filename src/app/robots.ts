import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/tutorials";

// 静态导出(output: 'export')要求 metadata 路由显式声明静态
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
