import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import NavBar from "@/components/NavBar";
import { SITE_URL } from "@/lib/tutorials";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "机器学习交互式教程",
    template: "%s · 机器学习交互式教程",
  },
  description: "可在浏览器中运行 Python 的机器学习入门教程",
  openGraph: {
    siteName: "机器学习交互式教程",
    type: "website",
  },
};

// 在页面渲染前同步设置主题 class,避免暗色模式下的「白屏闪烁」(FOUC)。
const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
