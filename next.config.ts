import type { NextConfig } from "next";
import createMDX from "@next/mdx";

// GitHub Pages 项目站点部署在子路径(如 /llm-tutorial)。
// basePath 通过环境变量注入:CI 构建时设 NEXT_PUBLIC_BASE_PATH=/llm-tutorial,
// 本地 dev / 普通构建不设则为根路径,两套环境共用同一份源码。
// 注意:basePath 只重写 Next 托管的资源(_next、<Link>);MDX 里的 <img>、
// public 下的 Worker 等静态引用须自行适配 —— 图片走相对路径(trailingSlash 下
// 页面 URL 与同名图目录同级),Worker 路径在 src/lib/pyodide.ts 里显式拼接。
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // 纯静态导出:next build 产物在 out/,可托管到任何静态服务器
  output: "export",
  // 页面 URL 带尾斜杠(输出 <slug>/index.html),让 MDX 里的相对图片引用
  // (./fig.png)能解析到同名的图片目录
  trailingSlash: true,
  basePath: BASE_PATH,
  // 让 .mdx 文件可作为页面/路由
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
};

const withMDX = createMDX({
  options: {
    // Turbopack 需要可序列化配置:插件用字符串名而非导入的函数
    remarkPlugins: [["remark-gfm"], ["remark-math"]],
    // rehype-slug 给每个标题生成 id 锚点,供「本页目录」跳转
    // rehype-highlight 给 ```python 等代码块加语法高亮(highlight.js)
    rehypePlugins: [["rehype-slug"], ["rehype-katex", { strict: false }], ["rehype-highlight"]],
  },
});

export default withMDX(nextConfig);
