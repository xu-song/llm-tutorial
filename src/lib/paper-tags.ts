// 论文关键词注册表 —— 单一数据源。
// 所有 keyword 的名称、图标、说明集中在这里维护;
// papers.ts 只描述论文本身,tag 字符串须与本文 KEYWORDS 的 name 一一对应。
// (papers.ts 由 getAllTags() 动态收集 tag 字符串,漏配 KEYWORDS 条目只会丢失图标/说明,不会报错——
//  新增 tag 时记得同步这里。)

export interface PaperTag {
  /** keyword 名称;papers.ts 的 Paper.tags 数组引用此名称 */
  name: string;
  /** 图标(emoji),用于筛选条、卡片、侧边栏 */
  icon: string;
  /** 一句话说明,用于悬浮提示与理解词义 */
  hint?: string;
}

/**
 * 全部关键词。顺序即落地页筛选条与侧边栏的展示顺序。
 */
export const KEYWORDS: PaperTag[] = [
  {
    name: "注意力机制",
    icon: "🎯",
    hint: "Transformer 的核心:稀疏化、线性化、分组查询等注意力结构的演进",
  },
  {
    name: "MoE 架构",
    icon: "🧩",
    hint: "混合专家:用极低激活比换超大总参数,路由与负载均衡是关键难题",
  },
  {
    name: "强化学习与 RLVR",
    icon: "🕹️",
    hint: "RLVR = Reinforcement Learning with Verifiable Rewards(可验证奖励的强化学习):用规则判分(数学验算、代码跑测试)取代奖励模型",
  },
  {
    name: "对齐与偏好优化",
    icon: "⚖️",
    hint: "RLHF / DPO 等:让模型输出符合人类偏好",
  },
  {
    name: "高效训练",
    icon: "⚡",
    hint: "优化器、数值精度、并行策略——同样的算力训出更强的模型",
  },
  {
    name: "长上下文",
    icon: "📏",
    hint: "把上下文窗口推到 256K–1M 并保持检索精度",
  },
  {
    name: "多模态",
    icon: "👁️",
    hint: "视觉-语言联合建模:看懂图像与视频,而不只是文本",
  },
  {
    name: "Agentic 训练",
    icon: "🤖",
    hint: "把多步工具调用、环境交互的完整轨迹作为训练单元",
  },
  {
    name: "数据合成",
    icon: "🛠️",
    hint: "程序化生成训练环境与任务,突破人工标注的规模与多样性上限",
  },
  {
    name: "蒸馏与数据",
    icon: "💧",
    hint: "把强模型的能力(推理链、知识)迁移到目标模型",
  },
  {
    name: "推理优化",
    icon: "🚀",
    hint: "部署侧提速降本:量化、投机解码、稀疏计算、KV cache 压缩",
  },
  {
    name: "基础架构",
    icon: "🧱",
    hint: "奠基性工作:此后所有模型的共同骨架",
  },
];

/** name → PaperTag 的索引。 */
const BY_NAME = new Map(KEYWORDS.map((k) => [k.name, k]));

/** 全部 keyword 名称(注册表顺序)。 */
export function getAllKeywords(): string[] {
  return KEYWORDS.map((k) => k.name);
}

/** keyword 的图标;未注册的名称回退默认 🏷️。 */
export function getTagIcon(tag: string): string {
  return BY_NAME.get(tag)?.icon ?? "🏷️";
}

/** keyword 的一句话说明;未注册返回 undefined。 */
export function getTagHint(tag: string): string | undefined {
  return BY_NAME.get(tag)?.hint;
}
