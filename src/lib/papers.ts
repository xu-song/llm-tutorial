// 论文注册表 —— 单一数据源。
// 导航栏、侧边栏、落地页、上一篇/下一篇都从这里读取,避免多处维护不一致。
// 论文是多维的:一篇大模型论文往往同时涉及架构、数据、训练、RL、推理……
// 单一「方向 → 主题」分组装不下,所以改用 tags 多标签模型——
// 每篇论文可打多个 tag,点击 tag 展示同 tag 的所有论文。

import { SITE_URL } from "@/lib/tutorials";
import { getTagIcon } from "@/lib/paper-tags";

export interface Paper {
  slug: string;
  /** 阅读笔记标题(通常为中文概括) */
  title: string;
  /** 论文原标题(英文,可选,用于头部展示) */
  paperTitle?: string;
  /** 一句话总结(用于卡片 / metadata) */
  desc: string;
  /**
   * 关键词标签(多选),引用 @/lib/paper-tags 的 KEYWORDS。一篇论文可同时属于多个 tag,
   * 如 DeepSeek-V3 同时是「MoE 架构」「注意力机制」「高效训练」。
   */
  tags: string[];
  /** 图标(emoji),用于列表与侧边栏视觉区分 */
  icon: string;
  // —— 论文元信息(教程不需要这些) ——
  authors: string[];
  venue?: string;
  year: number;
  arxivUrl?: string;
  pdfUrl?: string;
  codeUrl?: string;
  abstract?: string;
}

// 顺序即阅读顺序;同时决定上一篇 / 下一篇。
export const papers: Paper[] = [
  {
    slug: "ppo-schulman",
    title: "PPO:信赖域的工程化妥协",
    paperTitle: "Proximal Policy Optimization Algorithms",
    desc: "把 TRPO 的 KL 信赖域硬约束换成概率比的一阶裁剪 min(rA, clip(r,1-ε,1+ε)A),十几行代码换训练稳定。ε=0.2 + GAE λ=0.95 几乎跨任务通用;后成为 RLHF 主力,也是 GRPO 演进链的起点。",
    tags: ["强化学习与 RLVR", "对齐与偏好优化", "基础架构"],
    icon: "✂️",
    authors: ["John Schulman", "Filip Wolski", "Prafulla Dhariwal", "Alec Radford", "Oleg Klimov"],
    venue: "arXiv",
    year: 2017,
    arxivUrl: "https://arxiv.org/abs/1707.06347",
    abstract:
      "我们提出近端策略优化(PPO):一族用一阶优化即可实现、兼具 trust region 方法稳定性与实现简洁性的策略梯度算法。核心是裁剪替代目标 L^CLIP=E[min(rÂ, clip(r,1-ε,1+ε)Â)]:对新旧策略概率比 r 做非对称裁剪,移除把 r 推出区间的激励。配合价值损失与熵奖励,同一批数据可多 epoch minibatch 复用。MuJoCo 7 环境上裁剪 ε=0.2 平均 0.82 优于 KL 惩罚变体;Atari 49 游戏 4 千万帧训练平均奖励赢 30 场。PPO 后成为 RLHF 的 RL 阶段标准算法。",
  },
  {
    slug: "grpo-deepseek-r1",
    title: "GRPO 与 DeepSeek-R1:训练会推理的大模型",
    paperTitle: "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning",
    desc: "DeepSeek-R1 靠什么学会一步步推理?GRPO 砍掉 PPO 的 critic,用同题一组采样、组内均值当基线;RLVR 用「答案对不对」的规则判分取代奖励模型。",
    tags: ["强化学习与 RLVR", "蒸馏与数据"],
    icon: "🧠",
    authors: ["DeepSeek-AI"],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2501.12948",
    codeUrl: "https://github.com/deepseek-ai/DeepSeek-R1",
    abstract:
      "我们通过纯强化学习(RL)激发大语言模型的推理能力,无需监督微调(SFT)冷启动。提出 Group Relative Policy Optimization(GRPO):省去 PPO 中的价值网络,对同一道题采样一组回答,用组内回报的均值与标准差归一化作为优势。配合可验证奖励(RLVR)——用规则判分(数学题验算、代码题跑测试)取代奖励模型——训练出 DeepSeek-R1-Zero。再以多阶段 SFT+RL 流水线得到 DeepSeek-R1,性能比肩 OpenAI-o1。",
  },
  {
    slug: "dpo-rafailov",
    title: "DPO:无需奖励模型的偏好对齐",
    paperTitle: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
    desc: "跳过显式奖励模型与 RL,直接从偏好数据用闭式目标对齐语言模型。把 RLHF 的隐式奖励一步到位参数化进策略。",
    tags: ["对齐与偏好优化"],
    icon: "🎯",
    authors: ["Rafael Rafailov", "et al."],
    venue: "NeurIPS",
    year: 2023,
    arxivUrl: "https://arxiv.org/abs/2305.18290",
    abstract:
      "现有的 RLHF 流水线先用偏好数据拟合一个奖励模型,再用 RL(如 PPO)优化策略,流程复杂且不稳定。我们提出直接偏好优化(DPO):利用奖励与最优策略的闭式关系,把奖励函数直接表示为策略的对数比,从而用一个简单的交叉熵目标从偏好对直接优化策略——无需奖励模型、无需 RL、无需 RL 训练阶段的在线采样。理论上 DPO 等价于 Bradley-Terry 偏好模型下的最大似然,实验上对齐效果与 PPO 相当甚至更优。",
  },
  {
    slug: "kimi-k15",
    title: "Kimi K1.5:多模态长上下文扩展的 RL 推理",
    paperTitle: "Kimi k1.5: Scaling Reinforcement Learning with LLMs",
    desc: "与 R1 同期的另一条 RL 推理路线:把 RL 上下文窗口拉到 128k 替代长 CoT 蒸馏,在线镜像下降 + 长度惩罚 + 课程采样,不用 MCTS/价值网络/PRM,文本视觉联合训练比肩 o1。",
    tags: ["强化学习与 RLVR", "长上下文", "多模态"],
    icon: "🌗",
    authors: ["Kimi Team"],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2501.12599",
    abstract:
      "Kimi k1.5 是月之暗面用 RL 训练的多模态推理模型:通过长上下文扩展(128k + partial rollout)与改进的策略优化(在线镜像下降、长度惩罚、课程采样),建立不依赖 MCTS、价值函数与过程奖励模型的极简 RL 框架。AIME 77.5、MATH-500 96.2、Codeforces 94 百分位、MathVista 74.9,比肩 OpenAI o1;long2short 方法把长 CoT 能力迁移到短 CoT 模型,以平均 3.3k token 在 AIME 拿到 60.8,领先 GPT-4o 等短 CoT 模型最多 +550%。",
  },
  {
    slug: "kimi-k2",
    title: "Kimi K2:1T 参数 MoE 的 Agentic 训练",
    paperTitle: "Kimi K2: Open Agentic Intelligence",
    desc: "1.04T 总参/32B 激活的超稀疏 MoE。MuonClip 优化器(Muon + QK-Clip)让 15.5T token 预训练零 loss spike;三步 agentic 数据合成管线 + 可验证奖励与 self-critique rubric 的 joint RL,non-thinking 模式下 SWE-bench Verified 65.8、Tau2-Bench 66.1。",
    tags: ["MoE 架构", "Agentic 训练", "数据合成", "高效训练", "强化学习与 RLVR"],
    icon: "⚡",
    authors: ["Kimi Team"],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2507.20534",
    codeUrl: "https://huggingface.co/moonshotai/Kimi-K2-Instruct",
    abstract:
      "Kimi K2 是 1.04T 总参、32B 激活的开源 MoE 模型,面向 agentic intelligence。提出 MuonClip 优化器:在 token 高效的 Muon 上加 QK-Clip 钳制 attention logit,使 15.5T token 预训练全程零 loss spike。后训练以大规模 agentic 数据合成管线(2 万+ 合成工具与带 rubric 的多轮轨迹)与 joint RL(可验证奖励 + self-critique rubric)为核心。non-thinking 模式下取得 Tau2-Bench 66.1、SWE-bench Verified 65.8、AIME 2025 49.5,为开源 non-thinking 模型中的最强 agentic 能力,权重已开放。",
  },
  {
    slug: "glm-45",
    title: "GLM-4.5:Mixture-of-Experts 的 Agentic 智能体训练",
    paperTitle: "GLM-4.5: Agentic, Reasoning, and Coding (ARC) Foundation Models",
    desc: "355B 总参只激活 32B 的深窄 MoE。后训练走「专家模型迭代」:三个领域专家各自冷启动 SFT + 可验证奖励 RL,再自蒸馏成 thinking/non-thinking 双模式模型;agentic 数据四步合成 + 无 KL 的 GRPO。",
    tags: ["MoE 架构", "Agentic 训练", "数据合成", "蒸馏与数据", "强化学习与 RLVR"],
    icon: "🧬",
    authors: ["GLM-4.5 Team"],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2508.06471",
    codeUrl: "https://github.com/zai-org/GLM-4.5",
    abstract:
      "GLM-4.5 是 355B 总参、32B 激活的开源 MoE 基础模型,支持思考与直接应答两种混合推理模式。架构刻意做得深而窄(89 层 MoE、160 专家选 8+1 共享、96 注意力头),在 23T token 上多阶段预训练。后训练采用两阶段专家模型迭代:先并行训练推理、Agent、通用对话三个领域专家(各自冷启动 SFT + 领域 RL),再用自蒸馏统一为一个模型。最终 TAU-Bench 70.1、AIME 24 91.0、SWE-bench Verified 64.2,以远小于竞品的参数量在 12 项基准综合排名第三、agentic 排名第二,MIT 协议开源。",
  },
  {
    slug: "attention-transformer",
    title: "Transformer:注意力就是你所需要的一切",
    paperTitle: "Attention Is All You Need",
    desc: "2017 奠基论文:扔掉 RNN 与卷积,只用缩放点积注意力。顺序操作 O(n)→O(1)、任意两 token 路径长度 O(1),GPU 并行性首次在序列建模上完全释放;多头、位置编码、残差+LayerNorm 构成此后所有大模型的骨架。",
    tags: ["基础架构", "注意力机制"],
    icon: "🔁",
    authors: ["Ashish Vaswani", "et al."],
    venue: "NeurIPS",
    year: 2017,
    arxivUrl: "https://arxiv.org/abs/1706.03762",
    abstract:
      "我们提出 Transformer:摒弃循环与卷积、完全基于注意力的序列转换架构。核心是缩放点积注意力 softmax(QK^T/√d_k)V(除以 √d_k 抵消点积方差随维度线性增长、防 softmax 饱和)与多头机制(8 个 64 维子空间并行)。顺序操作数与最大路径长度均为 O(1),训练高度并行。WMT 2014 英德翻译 28.4 BLEU、英法 41.8 BLEU 双双刷新单模型纪录,base 模型 8 张 P100 仅 12 小时;架构零改动迁移到句法分析同样有竞争力。",
  },
  {
    slug: "deepseek-v3",
    title: "DeepSeek-V3:671B MoE 的极致性价比",
    paperTitle: "DeepSeek-V3 Technical Report",
    desc: "671B 参数、每 token 激活 37B,2.788M GPU 小时训完 14.8T token。MLA 把 KV cache 压掉 57 倍,无辅助损失的 bias 负载均衡,首个超大规模 FP8 训练。",
    tags: ["MoE 架构", "注意力机制", "高效训练", "蒸馏与数据", "推理优化"],
    icon: "🏗️",
    authors: ["DeepSeek-AI"],
    venue: "arXiv",
    year: 2024,
    arxivUrl: "https://arxiv.org/abs/2412.19437",
    codeUrl: "https://github.com/deepseek-ai/DeepSeek-V3",
    abstract:
      "DeepSeek-V3 是 671B 总参数、37B 激活的 MoE 语言模型,采用 MLA 注意力与 DeepSeekMoE 架构,首创无辅助损失的负载均衡策略与多 token 预测训练目标。模型在 14.8T token 上预训练,仅用 2.788M H800 GPU 小时(约 557 万美元)完成全部训练,过程无不可恢复的 loss 尖峰。后训练从 R1 系列蒸馏推理数据并做 GRPO 强化学习,数学与代码基准超越 Qwen2.5-72B 和 Llama-3.1-405B。",
  },
  {
    slug: "deepseek-v3-2",
    title: "DeepSeek-V3.2:稀疏注意力与可扩展的 RL 后训练",
    paperTitle: "DeepSeek-V3.2: Pushing the Frontier of Open Large Language Models",
    desc: "DSA 稀疏注意力把主注意力复杂度从 O(L²) 降到 O(Lk);GRPO 规模化稳定配方支撑起超预训练 10% 的 RL 算力;85K 合成任务把思考装进工具调用。",
    tags: ["注意力机制", "强化学习与 RLVR", "数据合成", "Agentic 训练", "推理优化", "长上下文"],
    icon: "🔬",
    authors: ["DeepSeek-AI"],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2512.02556",
    codeUrl: "https://huggingface.co/deepseek-ai/DeepSeek-V3.2",
    abstract:
      "DeepSeek-V3.2 通过三大突破追平闭源前沿:DSA 稀疏注意力(轻量索引器 + top-k 选择,主注意力 O(L²)→O(Lk))在保持长上下文性能的同时大幅降低计算成本;稳定可扩展的 GRPO 配方(无偏 KL 估计、离轨掩码、Keep Routing 等)将后训练算力提升至预训练的 10% 以上,推理性能比肩 GPT-5;大规模智能体任务合成管线(1800+ 环境、85K 指令)把思考能力融入工具调用。高算力变体 V3.2-Speciale 在 IMO 2025 与 IOI 2025 均获金牌。",
  },
  {
    slug: "qwen3-vl",
    title: "Qwen3-VL:看懂、想清、做得出",
    paperTitle: "Qwen3-VL",
    desc: "阿里新一代视觉语言模型:Interleaved-MRoPE 全频率位置编码、DeepStack 多层视觉注入、文本-时间戳对齐三项架构更新;原生 256K 上下文可扩 1M,视频大海捞针 1M token 保持 99.5%;视觉 Agent 操作手机电脑 GUI,Instruct 版视觉感知比肩 Gemini 2.5 Pro。",
    tags: ["多模态", "长上下文", "Agentic 训练", "注意力机制", "基础架构"],
    icon: "👁️",
    authors: ["Qwen Team"],
    venue: "官方博客",
    year: 2025,
    codeUrl: "https://huggingface.co/Qwen/Qwen3-VL-235B-A22B-Instruct",
    abstract:
      "Qwen3-VL 是 Qwen 系列迄今最强的视觉语言模型,2B 到 235B-A22B 全系开源(Apache 2.0,Instruct 与 Thinking 双版本)。架构三更新:Interleaved-MRoPE(t/h/w 交错分布实现全频率覆盖,提升长视频理解)、DeepStack(ViT 多层特征注入 LLM 多层,提升细节捕捉与图文对齐)、文本时间戳对齐(时间戳-视频帧交错输入,秒级视频定位)。原生 256K 上下文可扩展至 1M,视频大海捞针 256K 100%、1M 99.5%;OCR 语言从 10 种扩到 32 种;视觉 Agent 能操作 PC 与手机 GUI;纯文本能力与 Qwen3-235B-A22B-2507 不相上下。",
  },
  {
    slug: "internvl35",
    title: "InternVL3.5:级联 RL 与视觉分辨率路由",
    paperTitle: "InternVL3.5: Advancing Open-Source Multimodal Models in Versatility, Reasoning, and Efficiency",
    desc: "上海 AI Lab 的开源多模态模型(1B–241B-A28B):Cascade RL 两阶段(难度驱动重放 + 在线 off-policy)、Visual Resolution Router 按任务动态分配视觉 token 预算、DvD 视觉语言解耦部署 4.05× 加速;多模态推理较上代 +16%。",
    tags: ["多模态", "强化学习与 RLVR", "推理优化", "高效训练"],
    icon: "🌟",
    authors: ["Weiyun Wang", "et al."],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2508.18265",
    codeUrl: "https://github.com/OpenGVLab/InternVL",
    abstract:
      "InternVL3.5 系列覆盖 1B 到 241B-A28B(Flash 系列 MoE),在通用能力、推理与效率三个方向推进开源多模态:推理上提出 Cascade RL——两阶段强化学习(离线难度驱动重放 + 在线 off-policy 训练),多模态推理较 InternVL3 提升 16%;效率上提出 Visual Resolution Router,按任务难度动态分配视觉 token 预算,省算力不降精度;部署上提出 DvD(Decoupled Vision-Language Deployment),视觉语言解耦部署带来 4.05× 加速。241B-A28B 在 OpenCompass 等综合榜单超越 Qwen3-235B、GPT-5 与 Gemini 2.5 Pro。",
  },
  {
    slug: "deepseek-ocr",
    title: "DeepSeek-OCR:上下文光学压缩",
    paperTitle: "DeepSeek-OCR: Contexts Optical Compression",
    desc: "不到 1B 激活参数:DeepEncoder(80M SAM-base 感知 + 2 层卷积压缩 16× + 300M CLIP-large 知识,共约 380M)+ DeepSeek-3B-MoE(激活约 570M)。OCR 被重新定义为「上下文光学压缩」——把图像信息压进文本;<10× 压缩精度约 97%,20× 约 60%;deep parsing 输出统一 Markdown,OmniDocBench 以 1/9 token 数超 MinerU2.0。MIT 开源。",
    tags: ["多模态", "MoE 架构", "推理优化", "蒸馏与数据"],
    icon: "📃",
    authors: ["Haoran Wei", "Yaofeng Sun", "Yukun Li"],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2510.18234",
    codeUrl: "https://github.com/deepseek-ai/DeepSeek-OCR",
    abstract:
      "DeepSeek-OCR 把 OCR 重新定义为「上下文光学压缩」(Contexts Optical Compression):识别文字只是手段,把图像承载的全部信息(标题、公式、化学式、几何图)尽可能无损压缩进文本才是目的。编码器 DeepEncoder 约 380M,三段串联:SAM-base(80M)前半段 window attention 负责高分辨率感知,2 层 stride-2 卷积把 token 数压掉 16×,CLIP-large(300M)在压缩后的短序列上做全局知识提取。解码器为 DeepSeek-3B-MoE(12 层,64 路由专家激活 6 + 2 共享,激活约 570M)。压缩比小于 10× 时 OCR 精度约 97%,20× 时约 60%;deep parsing 模式可将文档/论文/报告转为统一 Markdown 结构,OmniDocBench 上以 1/9 的 token 数超越 MinerU2.0。MIT 协议开源,可作为 VLM 的前置压缩模块。",
  },
  {
    slug: "ui-tars-2",
    title: "UI-TARS-2:GUI Agent 的多轮强化学习",
    paperTitle: "UI-TARS-2 Technical Report: Advancing GUI Agent with Multi-Turn Reinforcement Learning",
    desc: "字节跳动的原生 GUI Agent(截图进 → 动作出):多轮交互式 RL 把整个任务轨迹当训练单元,浏览器沙箱/安卓/游戏环境提供可验证 reward;PPO(明确胜过 GRPO)+ Length-Adaptive GAE;数据飞轮 + 交互式标注平台;推理时放大交互步数预算持续涨分。",
    tags: ["Agentic 训练", "强化学习与 RLVR", "多模态", "数据合成"],
    icon: "🖥️",
    authors: ["Haoming Wang", "et al."],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2509.02544",
    codeUrl: "https://github.com/bytedance/ui-tars",
    abstract:
      "UI-TARS-2 是字节跳动 Seed 团队的原生 GUI Agent:直接以截图为输入、以界面动作为输出,不依赖 DOM 等底层信息,底座为 Seed1.6(532M 视觉编码器 + 230B 总参/23B 激活 MoE)。核心是多轮(multi-turn)强化学习——把「观察-思考-行动」的完整任务轨迹作为训练单元而非单步动作,在浏览器沙箱容器、Android 模拟器与游戏环境中以可验证 reward 训练,算法选 PPO(论文明确胜过 GRPO),配 Length-Adaptive GAE、Value Pretraining 与 Clip Higher;配套数据飞轮(self-reinforcing loop)与四层交互式标注平台。推理时扩展采取放大允许交互步数的朴素形态,在 OSWorld 与游戏基准上随步数预算单调涨分。在 OSWorld、AndroidWorld 等 GUI 基准上取得开源 SOTA。",
  },
  {
    slug: "kimi-k3",
    title: "Kimi K3:开源 3T 的混合注意力与 LatentMoE",
    paperTitle: "Kimi K3: Open Frontier Intelligence",
    desc: "世界首个开源 3T 级:2.78T 总参/104B 激活。93 层 = 69 层 KDA 线性注意力 + 24 层 Gated MLA;AttnRes 让每层选择性关注所有前层;Stable LatentMoE 896 专家激活 16(sparsity 56)。相对 K2 提升约 2.5× scaling efficiency,1M 上下文,原生多模态。",
    tags: ["MoE 架构", "注意力机制", "多模态", "Agentic 训练", "长上下文", "高效训练", "强化学习与 RLVR", "蒸馏与数据"],
    icon: "🌌",
    authors: ["Kimi Team"],
    venue: "arXiv",
    year: 2026,
    arxivUrl: "https://arxiv.org/abs/2607.24653",
    codeUrl: "https://huggingface.co/moonshotai/Kimi-K3",
    abstract:
      "Kimi K3 是 2.78T 总参、104B 激活的原生多模态 MoE,1M token 上下文,世界首个开源 3T 级模型。三大架构创新:KDA(Kimi Delta Attention)线性注意力以 delta rule 在写入前擦除旧状态(S_t=M_t·S_{t-1}+β_t·k_t·v_t^T),与 Gated MLA 周期交错;AttnRes(Attention Residuals)把注意力方法论搬到深度方向,每层可选择性检索所有前层表示;Stable LatentMoE 把路由专家放入 3584 维潜空间,896 专家激活 16,用 RMSNorm + SiTU-GLU + Quantile Balancing 在极端稀疏下稳住优化。以上合计较 K2 提升约 2.5× scaling efficiency。后训练以 Reasoning Effort RL(按题 token 预算 + τ 退火,3 域×3 强度=9 专家)+ 多教师 on-policy 蒸馏为核心,支持百万 token agentic RL(持久 rollout 与沙箱状态)。GPQA Diamond 93.5、BrowseComp 91.2、SWE-Marathon 42.0,整体仅次于 Claude Fable 5 与 GPT-5.6 Sol,为开源最强。",
  },
  {
    slug: "minimax-m3",
    title: "MiniMax-M3:块稀疏注意力与原生多模态",
    paperTitle: "MiniMax Sparse Attention",
    desc: "428B/23B 激活、1M 上下文的原生多模态模型。MSA 用单 KV 头的 Index Branch 给 KV 块打分,每个 GQA 组独立 Top-k 选块、Main Branch 只做稀疏精确注意力;每 query 固定 2048 KV token,1M 上下文下注意力 FLOPs 降为 1/28.4,prefill 提速 14.2×、decode 7.6×。",
    tags: ["注意力机制", "多模态", "长上下文", "MoE 架构"],
    icon: "🪶",
    authors: ["Xunhao Lai", "et al."],
    venue: "arXiv",
    year: 2026,
    arxivUrl: "https://arxiv.org/abs/2606.13392",
    codeUrl: "https://huggingface.co/MiniMaxAI/MiniMax-M3",
    abstract:
      "MiniMax-M3(约 428B 总参/23B 激活)提出 MiniMax Sparse Attention(MSA):基于 GQA 的块稀疏注意力——轻量 Index Branch(单 KV 头因果注意力)对全上下文 KV 块打分,每个 GQA 组独立 Top-k 选择,Main Branch 只在选中块上做精确注意力。部署配置下每 query 固定 2,048 KV token 预算,1M 上下文较 M2 prefill 提速 14.2×、decode 提速 7.6×、每 token 注意力计算量降至 1/28.4。无需预训练知识,可从既有 checkpoint 直接续训。模型原生多模态(从头混合模态训练)、1M 上下文、三种思考模式(thinking 参数:enabled/adaptive/禁用)。",
  },
];

/** 所有出现过的 keyword(保持注册表中的出现顺序)。 */
export function getAllTags(): string[] {
  const seen: string[] = [];
  for (const p of papers) {
    for (const t of p.tags) {
      if (!seen.includes(t)) seen.push(t);
    }
  }
  return seen;
}

/** 按发表时间倒序的论文列表(年份相同按注册表顺序)。 */
export function getPapersByDate(): Paper[] {
  return [...papers].sort((a, b) => b.year - a.year);
}

/** 某 tag 下的论文(注册表顺序)。tag 不存在时返回空数组。 */
export function getPapersByTag(tag: string): Paper[] {
  return papers.filter((p) => p.tags.includes(tag));
}

/**
 * 侧边栏导航树:单个「按关键词」分组,每个 tag 是一个可折叠主题。
 * 当前论文所属的 tag 自动展开(一篇论文有多个 tag,会同时展开多个)。
 */
export function getPapersNav() {
  return [
    {
      name: "按关键词",
      icon: "🏷️",
      topics: getAllTags().map((tag) => ({
        name: tag,
        leaves: getPapersByTag(tag),
      })),
    },
  ];
}

export function getPaper(slug: string): Paper | undefined {
  return papers.find((p) => p.slug === slug);
}

/** 第一篇,用于「开始阅读」入口与导航栏「论文」链接 */
export function getFirstPaper(): Paper {
  return papers[0];
}

/** 1 基的阅读序号(注册表顺序);未找到返回 0 */
export function getPaperOrder(slug: string): number {
  return papers.findIndex((p) => p.slug === slug) + 1;
}

/** 返回上一篇 / 下一篇,用于论文底部导航 */
export function getPaperNeighbors(slug: string): {
  prev: Paper | null;
  next: Paper | null;
} {
  const i = papers.findIndex((p) => p.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? papers[i - 1] : null,
    next: i < papers.length - 1 ? papers[i + 1] : null,
  };
}

/**
 * 由注册表生成单篇论文的页面 metadata(title/description/openGraph)。
 * 在各论文 page.mdx 里 `export const metadata = paperMetadata("<slug>")` 即可。
 */
export function paperMetadata(slug: string) {
  const p = getPaper(slug);
  if (!p) return {};
  const url = `${SITE_URL}/papers/${slug}`;
  return {
    title: p.title,
    description: p.desc,
    alternates: { canonical: url },
    openGraph: {
      title: p.title,
      description: p.desc,
      url,
      type: "article" as const,
    },
  };
}
