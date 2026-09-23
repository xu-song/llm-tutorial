// 评论配置 —— 单一数据源。
// 后端是 giscus(https://giscus.app):评论存在 GitHub Discussions 里,
// 每个页面(按 path 映射)对应一个 discussion thread。
//
// 启用步骤(建好评论仓库后):
//   1. 仓库 Settings → General → Features 勾选 Discussions
//   2. 安装 giscus app:https://github.com/apps/giscus(只给这个仓库授权)
//   3. 打开 https://giscus.app/zh-CN 填仓库名,把页面生成的
//      data-repo-id / data-category / data-category-id 抄到下面
//   4. ENABLED 改为 true
// 之后删帖、锁定、置顶都在 GitHub Discussions 网页端管理。
//
// 未配置(ENABLED=false)时 <Comments /> 渲染为空,页面其余部分不受影响。

export interface GiscusConfig {
  /** 总开关:repo/id 配好后置 true */
  enabled: boolean;
  /** 存评论的仓库,格式 "owner/repo"(须公开且开启 Discussions) */
  repo: string;
  /** giscus.app 生成的 data-repo-id */
  repoId: string;
  /** Discussion 分类(建议建一个 "Comments" 分类、类型选 Announcements,只有维护者能开新帖) */
  category: string;
  /** giscus.app 生成的 data-category-id */
  categoryId: string;
  /** 每页评论区头部说明 */
  intro: string;
}

export const GISCUS: GiscusConfig = {
  /** 总开关:repo/id 配好后置 true */
  enabled: true,
  repo: "xu-song/llm-tutorial",
  repoId: "R_kgDOUlngTA",
  category: "Comments",
  categoryId: "DIC_kwDOUlngTM4DGKlX",
  intro: "评论通过 GitHub Discussions 承载,登录 GitHub 即可参与讨论。",
};

/** 评论是否就绪(配置完整才渲染评论区)。 */
export function commentsReady(): boolean {
  return Boolean(GISCUS.enabled) && GISCUS.repoId !== "" && GISCUS.categoryId !== "";
}
