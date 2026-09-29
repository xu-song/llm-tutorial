// 论文注册表 —— 单一数据源。
// 导航栏、侧边栏、落地页、上一篇/下一篇都从这里读取，避免多处维护不一致。
// 论文是多维的：一篇大模型论文往往同时涉及架构、数据、训练、RL、推理……
// 单一「方向 → 主题」分组装不下，所以改用 tags 多标签模型——
// 每篇论文可打多个 tag，点击 tag 展示同 tag 的所有论文。

import { SITE_URL } from "@/lib/tutorials";
import { getTagIcon } from "@/lib/paper-tags";

export interface Paper {
  slug: string;
  /** 阅读笔记标题（通常为中文概括） */
  title: string;
  /** 导航栏(侧边栏/移动端抽屉)展示的短标题；不填则导航与正文共用 title */
  navTitle?: string;
  /** 论文原标题（英文，可选，用于头部展示） */
  paperTitle?: string;
  /** 一句话总结(用于卡片 / metadata) */
  desc: string;
  /** 阅读动机：前人工作的问题与本文要解决的核心矛盾 */
  motivation?: string;
  /**
   * 关键词标签（多选），引用 @/lib/paper-tags 的 KEYWORDS。一篇论文可同时属于多个 tag，
   * 如 DeepSeek-V3 同时是「MoE 架构」「注意力机制」「高效训练」。
   */
  tags: string[];
  /** 图标（emoji），用于列表与侧边栏视觉区分 */
  icon: string;
  // —— 论文元信息（教程不需要这些） ——
  authors: string[];
  venue?: string;
  year: number;
  /** 发表年月（YYYY-MM）。有 arXiv 编号的论文可省略（从编号解析），无编号资料（官方博客等）必填 */
  date?: string;
  arxivUrl?: string;
  pdfUrl?: string;
  codeUrl?: string;
  abstract?: string;
}

// 顺序即阅读顺序；同时决定上一篇 / 下一篇。
export const papers: Paper[] = [
  {
    slug: "ppo-schulman",
    title: "PPO：信赖域的工程化妥协",
    navTitle: "PPO",
    paperTitle: "Proximal Policy Optimization Algorithms",
    desc: "把 TRPO 的 KL 信赖域硬约束换成概率比的一阶裁剪 min(rA, clip(r,1-ε,1+ε)A)，十几行代码换训练稳定。ε=0.2 + GAE λ=0.95 几乎跨任务通用；后成为 RLHF 主力，也是 GRPO 演进链的起点。",
    motivation: "TRPO 理论上用 KL 信赖域保护策略更新，但二阶优化和约束求解太重，很难成为通用工程配方。PPO 要解决的是：能不能保留“别一步更新太远”的稳定性，同时把算法降到普通一阶优化、可多 epoch 复用数据，让 RLHF 和大规模策略训练真正跑得起来。",
    tags: ["强化学习", "对齐与偏好优化", "基础架构"],
    icon: "✂️",
    authors: ["John Schulman", "Filip Wolski", "Prafulla Dhariwal", "Alec Radford", "Oleg Klimov"],
    venue: "arXiv",
    year: 2017,
    arxivUrl: "https://arxiv.org/abs/1707.06347",
    abstract:
      "我们提出近端策略优化（PPO）：一族用一阶优化即可实现、兼具 trust region 方法稳定性与实现简洁性的策略梯度算法。核心是裁剪替代目标 L^CLIP=E[min(rÂ, clip(r,1-ε,1+ε)Â)]：对新旧策略概率比 r 做非对称裁剪，移除把 r 推出区间的激励。配合价值损失与熵奖励，同一批数据可多 epoch minibatch 复用。MuJoCo 7 环境上裁剪 ε=0.2 平均 0.82 优于 KL 惩罚变体；Atari 49 游戏 4 千万帧训练平均奖励赢 30 场。PPO 后成为 RLHF 的 RL 阶段标准算法。",
  },
  {
    slug: "grpo-deepseek-r1",
    title: "GRPO 与 DeepSeek-R1：训练会推理的大模型",
    navTitle: "GRPO 与 DeepSeek-R1",
    paperTitle: "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning",
    desc: "DeepSeek-R1 靠什么学会一步步推理？GRPO 砍掉 PPO 的 critic，用同题一组采样、组内均值当基线；RLVR 用「答案对不对」的规则判分取代奖励模型。",
    motivation: "PPO 做大模型推理 RL 时最大的问题是 critic 昂贵又不稳定，奖励模型也容易把训练变成主观偏好拟合。DeepSeek-R1/GRPO 想回答的是：如果题目答案可以被规则验证，能不能去掉价值网络和奖励模型，直接用同题多样本的相对好坏把推理能力逼出来。",
    tags: ["DeepSeek 系列", "强化学习", "蒸馏与数据"],
    icon: "🧠",
    authors: ["DeepSeek-AI"],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2501.12948",
    codeUrl: "https://github.com/deepseek-ai/DeepSeek-R1",
    abstract:
      "我们通过纯强化学习（RL）激发大语言模型的推理能力，无需监督微调（SFT）冷启动。提出 Group Relative Policy Optimization（GRPO）：省去 PPO 中的价值网络，对同一道题采样一组回答，用组内回报的均值与标准差归一化作为优势。配合可验证奖励（RLVR）——用规则判分（数学题验算、代码题跑测试）取代奖励模型——训练出 DeepSeek-R1-Zero。再以多阶段 SFT+RL 流水线得到 DeepSeek-R1，性能比肩 OpenAI-o1。",
  },
  {
    slug: "opd-agarwal",
    title: "OPD：学生自己犯错，老师逐步纠正",
    navTitle: "OPD / GKD",
    paperTitle: "On-policy Distillation of Language Models: Learning from Self-Generated Mistakes",
    desc: "把蒸馏从老师轨迹搬到学生 rollout：GKD 用 teacher top-k 前向 KL 做分布级监督，PG OPD 把反向 KL 变成 token reward，MOPD 再用 routing 合并多个领域老师。",
    motivation: "离线蒸馏只在老师或固定数据轨迹上训练，学生一旦生成时跑偏，就会进入训练集中没见过的状态。OPD 要解决的是把老师的逐 token 稠密信号施加到学生自己访问的 on-policy 状态上，兼得 RL 的状态覆盖与蒸馏的高信用分配效率。",
    tags: ["在线蒸馏", "蒸馏与数据", "强化学习", "对齐与偏好优化"],
    icon: "🎬",
    authors: ["Rishabh Agarwal", "et al."],
    venue: "ICLR",
    year: 2024,
    arxivUrl: "https://arxiv.org/abs/2306.13649",
    abstract:
      "On-Policy Distillation 让学生模型先用当前策略生成轨迹，再由冻结 teacher 在这些 student-visited states 上提供逐 token logprob 或 top-k 分布信号，从而缓解离线蒸馏的 exposure bias。GKD 把 teacher/student 数据来源和 KL 方向统一到 generalized distillation 框架；后续 MiniLLM、Thinking Machines OPD 与 verl 实现进一步把反向 KL 写成 policy-gradient reward，并扩展到多教师 MOPD。该路线在数学推理与多域专家合并中显示出比继续 SFT 或稀疏 RL 更高的信用分配效率。",
  },
  {
    slug: "minillm-gu",
    title: "MiniLLM：用反向 KL 做在线蒸馏",
    navTitle: "MiniLLM",
    paperTitle: "MiniLLM: On-Policy Distillation of Large Language Models",
    desc: "早期 OPD 代表：把 LLM 蒸馏从 forward KL 改成 reverse KL，让学生在自己的生成分布上学习老师认可的高概率模式，缓解长文本暴露偏差。",
    motivation: "传统知识蒸馏常用 forward KL 覆盖老师分布，但生成式 LLM 的长尾 token 会让小模型变得发散，长文本里暴露偏差不断累积。MiniLLM 要解决的是用 reverse KL 和 on-policy 优化，让学生只在自己会生成的轨迹上学习老师真正认可的模式。",
    tags: ["在线蒸馏", "蒸馏与数据", "对齐与偏好优化"],
    icon: "🪶",
    authors: ["Yuxian Gu", "Li Dong", "Furu Wei", "Minlie Huang"],
    venue: "ICLR",
    year: 2024,
    arxivUrl: "https://arxiv.org/abs/2306.08543",
    abstract:
      "MiniLLM 面向白盒大语言模型蒸馏，指出标准 forward KL 容易让学生高估老师低概率区域，导致生成发散与长文本退化。论文改用 reverse KL，并推导 on-policy 优化方式：学生先生成自己的序列，老师在同一前缀上提供概率信号，学生在自身分布下更新。实验覆盖 120M 到 13B 参数和多模型家族，在指令跟随、长文本生成、校准和暴露偏差指标上优于基线。",
  },
  {
    slug: "tml-opd",
    title: "Thinking Machines OPD：高效复制推理能力",
    navTitle: "TML OPD",
    paperTitle: "On-Policy Distillation",
    desc: "把 reverse-KL OPD 工程化成 RL 风格训练循环：学生 rollout，老师逐 token 打分，negative reverse KL 作 advantage；数学推理上相对继续 SFT/RL 显示 9—30× 成本优势。",
    motivation: "RL 虽然 on-policy，但数学推理奖励通常只在最终答案处出现；SFT 和离线蒸馏虽然每个 token 都有监督，却只覆盖老师或固定数据轨迹。Thinking Machines OPD 要解决的是把学生真实状态和老师逐 token 稠密反馈结合起来，用更低成本复制已有强策略。",
    tags: ["在线蒸馏", "蒸馏与数据", "强化学习", "对齐与偏好优化"],
    icon: "⚗️",
    authors: ["Kevin Lu", "Thinking Machines Lab"],
    venue: "技术博客",
    year: 2025,
    date: "2025-10",
    abstract:
      "Thinking Machines Lab 的 OPD 博客把学生 rollout + teacher logprob 写成清晰的工程 recipe：对学生采样 token 计算 reverse KL，将其负值作为逐 token advantage，并复用 importance-sampling / policy-gradient loss 更新。Qwen3 数学实验中，从 400K SFT checkpoint 出发，OPD 约 150 steps 达到 AIME’24 70%；Qwen3 报告中 OPD 以约 1,800 GPU hours 达到 AIME’24 74.4，高于 17,920 GPU hours 的 RL 结果。博客还展示自蒸馏和个性化场景，说明 OPD 可用于低成本复制 RL 策略与恢复后训练行为。",
  },
  {
    slug: "qwen3",
    title: "Qwen3：混合推理与在线蒸馏",
    navTitle: "Qwen3",
    paperTitle: "Qwen3 Technical Report",
    desc: "Qwen3 把 thinking / non-thinking 混合推理、off-policy 蒸馏、RL 与 on-policy distillation 放进同一条后训练流水线。Qwen3 报告中 OPD 以约 1,800 GPU hours 在 AIME’24 达到 74.4，高于继续 RL 约 17,920 GPU hours 的 67.6。",
    motivation: "推理模型后训练既需要 RL 探索高质量解法，又需要把强老师的过程偏好稳定压进小模型；离线蒸馏有状态错配，纯 RL 又稀疏且昂贵。Qwen3 的动机是把思考模式、离线蒸馏、在线蒸馏和 RL 组合成可规模化的后训练 recipe，在成本可控的前提下复制强推理策略。",
    tags: ["在线蒸馏", "蒸馏与数据", "强化学习", "对齐与偏好优化", "高效训练", "MoE 架构"],
    icon: "🧭",
    authors: ["An Yang", "et al."],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2505.09388",
    abstract:
      "Qwen3 Technical Report 系统介绍 Qwen3 系列 dense 与 MoE 模型、thinking / non-thinking 混合推理模式，以及多阶段后训练。报告中的 strong-to-weak 蒸馏先用 off-policy data 学老师轨迹，再让 student 生成 on-policy sequences，由 Qwen3-32B 或 Qwen3-235B-A22B 在学生状态上提供 logits 分布并最小化 KL。表 21 显示，相比继续 RL 约 17,920 GPU hours、AIME’24 67.6，on-policy distillation 约 1,800 GPU hours 达到 AIME’24 74.4，成为 OPD 工业落地的关键证据。",
  },
  {
    slug: "mimo-v2-flash",
    title: "MiMo-v2-Flash：多教师在线蒸馏出的高效推理模型",
    navTitle: "MiMo-v2-Flash",
    paperTitle: "MiMo-v2-Flash Technical Report",
    desc: "309B 总参 / 15B 激活 MoE，用 128-token SWA + 全局注意力混合、MTP 投机解码和 MOPD 后训练，把多领域强老师的 dense token-level 信号压进 Flash 部署模型。",
    motivation: "强推理模型可以靠更大模型和更长采样堆性能，但线上部署关心的是延迟、吞吐和成本。MiMo-v2-Flash 要解决的是如何让小激活 Flash 模型继承多领域强老师的策略，同时保留可验证奖励带来的任务正确性。",
    tags: ["在线蒸馏", "蒸馏与数据", "强化学习", "高效训练", "推理优化", "MoE 架构", "长上下文"],
    icon: "⚡",
    authors: ["Bangjun Xiao", "et al."],
    venue: "arXiv",
    year: 2026,
    arxivUrl: "https://arxiv.org/abs/2601.02780",
    abstract:
      "MiMo-v2-Flash 是 309B 总参数、15B 激活参数的高效 MoE 推理模型。架构上结合 128-token sliding window attention 与全局注意力，并用 multi-token prediction 作为 draft model 实现约 3.6 accepted length、2.6× 推理加速；训练上以 27T token 预训练、32K 原生上下文并扩展到 256K。后训练采用 Multi-Teacher On-Policy Distillation：先训练领域专门老师，再在学生 rollout 上结合老师提供的 dense token-level rewards 与可验证 outcome reward，使 Flash 模型吸收多领域强策略。",
  },
  {
    slug: "nemotron-cascade-2",
    title: "Nemotron-Cascade 2：Cascade RL 与多域 OPD",
    navTitle: "Nemotron-Cascade 2",
    paperTitle: "Nemotron-Cascade 2: Post-Training LLMs with Cascade RL and Multi-Domain On-Policy Distillation",
    desc: "30B MoE / 3B 激活的高智能密度后训练模型：SFT 后扩展 Cascade RL 覆盖推理与智能体任务，再用 MOPD 从多领域中间老师恢复回退 benchmark。",
    motivation: "多阶段 RL 往往会在某些 benchmark 上涨分、同时让其他能力回退；小激活 MoE 还必须把每一点后训练收益压缩得足够高效。Nemotron-Cascade 2 要解决的是用 Cascade RL 拉高多域能力，再用多域在策略蒸馏把各阶段最强能力稳定合回一个开放模型。",
    tags: ["在线蒸馏", "强化学习", "蒸馏与数据", "Agentic 训练", "MoE 架构"],
    icon: "⛓️",
    authors: ["Zhuolin Yang", "et al."],
    venue: "arXiv",
    year: 2026,
    arxivUrl: "https://arxiv.org/abs/2603.19220",
    abstract:
      "Nemotron-Cascade 2 是开放 30B MoE、3B 激活模型，后训练由 curated SFT、扩展版 Cascade RL 和 Multi-Domain On-Policy Distillation 组成。Cascade RL 覆盖更广的 reasoning 与 agentic domains；MOPD 从各领域最强中间 teacher models 中学习，用于恢复 benchmark regression 并保持增益。论文称模型在 2025 IMO、IOI、ICPC World Finals 达到金牌级表现，是 DeepSeek-V3.2-Speciale 之后又一个达到该级别的开放权重 LLM，但激活/参数规模显著更小。",
  },
  {
    slug: "rethinking-opd",
    title: "Rethinking OPD：强老师为何也会教失败",
    navTitle: "Rethinking OPD",
    paperTitle: "Rethinking On-Policy Distillation of Large Language Models: Phenomenology, Mechanism, and Recipe",
    desc: "系统解释 OPD 成败：teacher 和 student 要有兼容思考模式，teacher 还必须提供 student 未见过的新能力；有效信号集中在高概率 token，失败可用 cold start 与 teacher-aligned prompt selection 修复。",
    motivation: "OPD 很容易被理解成“更强老师逐 token 打分，小学生自然变强”，但实践中更大 teacher 也可能没有收益。Rethinking OPD 要解决的是解释这种失败：什么条件下 teacher signal 是可吸收的新信息，什么情况下只是昂贵的噪声。",
    tags: ["在线蒸馏", "蒸馏与数据", "对齐与偏好优化", "强化学习"],
    icon: "🔍",
    authors: ["Yaxuan Li", "et al."],
    venue: "arXiv",
    year: 2026,
    arxivUrl: "https://arxiv.org/abs/2604.13016",
    codeUrl: "https://github.com/thunlp/OPD",
    abstract:
      "Rethinking OPD 从现象、机制和 recipe 三层分析大语言模型 on-policy distillation。论文指出 OPD 成功依赖两个条件：student 与 teacher 的 thinking pattern 兼容；teacher 必须提供 student 未见过的新能力。token-level 分析显示，有效对齐集中在 high-probability tokens，一个很小的共享 token 集合可覆盖约 97%—99% 概率质量。论文提出 off-policy cold start 与 teacher-aligned prompt selection 来修复失败 OPD，并提醒 OPD 不是强 teacher 自动提升弱 student 的万能方法。",
  },
  {
    slug: "dpo-rafailov",
    title: "DPO：无需奖励模型的偏好对齐",
    navTitle: "DPO",
    paperTitle: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
    desc: "跳过显式奖励模型与 RL，直接从偏好数据用闭式目标对齐语言模型。把 RLHF 的隐式奖励一步到位参数化进策略。",
    motivation: "经典 RLHF 要先训奖励模型，再用 PPO 做在线 RL，流程长、超参多、训练也容易不稳。DPO 的动机是把“偏好对齐”从强化学习问题改写成一个直接的监督目标：既然最优策略和隐式奖励有闭式关系，能不能跳过奖励模型和 RL 阶段，直接从 chosen/rejected 数据更新语言模型。",
    tags: ["对齐与偏好优化"],
    icon: "🎯",
    authors: ["Rafael Rafailov", "et al."],
    venue: "NeurIPS",
    year: 2023,
    arxivUrl: "https://arxiv.org/abs/2305.18290",
    abstract:
      "现有的 RLHF 流水线先用偏好数据拟合一个奖励模型，再用 RL（如 PPO）优化策略，流程复杂且不稳定。我们提出直接偏好优化（DPO）：利用奖励与最优策略的闭式关系，把奖励函数直接表示为策略的对数比，从而用一个简单的交叉熵目标从偏好对直接优化策略——无需奖励模型、无需 RL、无需 RL 训练阶段的在线采样。理论上 DPO 等价于 Bradley-Terry 偏好模型下的最大似然，实验上对齐效果与 PPO 相当甚至更优。",
  },
  {
    slug: "kimi-k15",
    title: "Kimi K1.5：多模态长上下文扩展的 RL 推理",
    navTitle: "Kimi K1.5",
    paperTitle: "Kimi k1.5: Scaling Reinforcement Learning with LLMs",
    desc: "与 R1 同期的另一条 RL 推理路线：把 RL 上下文窗口拉到 128k 替代长 CoT 蒸馏，在线镜像下降 + 长度惩罚 + 课程采样，不用 MCTS/价值网络/PRM，文本视觉联合训练比肩 o1。",
    motivation: "R1 证明 RL 能激发推理，但很多路线依赖长 CoT 蒸馏、复杂搜索或过程奖励，成本高且难扩到多模态长上下文。Kimi K1.5 的问题意识是：只靠可扩展的长上下文 RL 和简单策略优化，能否在文本与视觉任务上同时学出强推理，并把长思维再压缩成短输出能力。",
    tags: ["Kimi 系列", "强化学习", "长上下文", "多模态"],
    icon: "🌗",
    authors: ["Kimi Team"],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2501.12599",
    abstract:
      "Kimi k1.5 是月之暗面用 RL 训练的多模态推理模型：通过长上下文扩展（128k + partial rollout）与改进的策略优化（在线镜像下降、长度惩罚、课程采样），建立不依赖 MCTS、价值函数与过程奖励模型的极简 RL 框架。AIME 77.5、MATH-500 96.2、Codeforces 94 百分位、MathVista 74.9，比肩 OpenAI o1；long2short 方法把长 CoT 能力迁移到短 CoT 模型，以平均 3.3k token 在 AIME 拿到 60.8，领先 GPT-4o 等短 CoT 模型最多 +550%。",
  },
  {
    slug: "kimi-k2",
    title: "Kimi K2：1T 参数 MoE 的 Agentic 训练",
    navTitle: "Kimi K2",
    paperTitle: "Kimi K2: Open Agentic Intelligence",
    desc: "1.04T 总参/32B 激活的超稀疏 MoE。MuonClip 优化器（Muon + QK-Clip）让 15.5T token 预训练零 loss spike；三步 agentic 数据合成管线 + 可验证奖励与 self-critique rubric 的 joint RL,non-thinking 模式下 SWE-bench Verified 65.8、Tau2-Bench 66.1。",
    motivation: "超大 MoE 要做 agent，首先卡在两件事：预训练容易 loss spike，后训练缺少可验证、多轮、工具化的数据闭环。Kimi K2 的动机是把“稳定训练 1T 级 MoE”和“训练会用工具的非思考模型”放到同一条流水线里解决，让开源模型不仅会答题，还会执行任务。",
    tags: ["Kimi 系列", "MoE 架构", "Agentic 训练", "数据合成", "高效训练", "强化学习"],
    icon: "⚡",
    authors: ["Kimi Team"],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2507.20534",
    codeUrl: "https://huggingface.co/moonshotai/Kimi-K2-Instruct",
    abstract:
      "Kimi K2 是 1.04T 总参、32B 激活的开源 MoE 模型，面向 agentic intelligence。提出 MuonClip 优化器：在 token 高效的 Muon 上加 QK-Clip 钳制 attention logit，使 15.5T token 预训练全程零 loss spike。后训练以大规模 agentic 数据合成管线（2 万+ 合成工具与带 rubric 的多轮轨迹）与 joint RL（可验证奖励 + self-critique rubric）为核心。non-thinking 模式下取得 Tau2-Bench 66.1、SWE-bench Verified 65.8、AIME 2025 49.5，为开源 non-thinking 模型中的最强 agentic 能力，权重已开放。",
  },
  {
    slug: "glm-45",
    title: "GLM-4.5：Mixture-of-Experts 的 Agentic 智能体训练",
    navTitle: "GLM-4.5",
    paperTitle: "GLM-4.5: Agentic, Reasoning, and Coding (ARC) Foundation Models",
    desc: "355B 总参只激活 32B 的深窄 MoE。后训练走「专家模型迭代」：三个领域专家各自冷启动 SFT + 可验证奖励 RL，再自蒸馏成 thinking/non-thinking 双模式模型；agentic 数据四步合成 + 无 KL 的 GRPO。",
    motivation: "通用大模型在推理、代码、工具调用之间常常顾此失彼：单一路线很难同时补齐 ARC 能力，直接混训又容易互相干扰。GLM-4.5 要解决的是如何用专家模型迭代和自蒸馏，把不同领域的强能力汇总进一个支持 thinking/non-thinking 的 MoE 模型。",
    tags: ["GLM 系列", "MoE 架构", "Agentic 训练", "数据合成", "蒸馏与数据", "强化学习"],
    icon: "🧬",
    authors: ["GLM-4.5 Team"],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2508.06471",
    codeUrl: "https://github.com/zai-org/GLM-4.5",
    abstract:
      "GLM-4.5 是 355B 总参、32B 激活的开源 MoE 基础模型，支持思考与直接应答两种混合推理模式。架构刻意做得深而窄（89 层 MoE、160 专家选 8+1 共享、96 注意力头），在 23T token 上多阶段预训练。后训练采用两阶段专家模型迭代：先并行训练推理、Agent、通用对话三个领域专家（各自冷启动 SFT + 领域 RL），再用自蒸馏统一为一个模型。最终 TAU-Bench 70.1、AIME 24 91.0、SWE-bench Verified 64.2，以远小于竞品的参数量在 12 项基准综合排名第三、agentic 排名第二，MIT 协议开源。",
  },
  {
    slug: "glm-5",
    title: "GLM-5：从 Vibe Coding 到 Agentic Engineering",
    navTitle: "GLM-5",
    paperTitle: "GLM-5: from Vibe Coding to Agentic Engineering",
    desc: "744B 总参/40B 激活，从 GLM-4.5 的 ARC 路线升级到长程工程智能体。预训练扩到 28.5T token，集成 DSA 降低长上下文成本，用 slime 异步 RL 基础设施把生成与训练解耦，面向复杂系统工程与长期 agentic 任务。",
    motivation: "上一代 agentic 模型已经能完成短程编码和工具调用，但真实软件工程需要长上下文、长周期规划、终端/浏览器协作和持续 RL 基础设施。GLM-5 的动机是把“会写片段代码”的 vibe coding 推向“能推进复杂工程任务”的 agentic engineering。",
    tags: ["GLM 系列", "在线蒸馏", "MoE 架构", "注意力机制", "Agentic 训练", "强化学习", "长上下文", "推理优化", "高效训练"],
    icon: "🛠️",
    authors: ["GLM-5-Team"],
    venue: "arXiv",
    year: 2026,
    arxivUrl: "https://arxiv.org/abs/2602.15763",
    pdfUrl: "https://arxiv.org/pdf/2602.15763",
    codeUrl: "https://github.com/zai-org/GLM-5",
    abstract:
      "GLM-5 面向从 vibe coding 走向 agentic engineering 的长程软件工程智能体。模型从 GLM-4.5 的 355B/32B 扩到 744B/40B，预训练数据从 23T 增至 28.5T token，并集成 DeepSeek Sparse Attention（DSA）以降低长上下文训练与推理成本。后训练侧引入 slime 异步 RL 基础设施，把 rollout 生成与策略训练解耦，支撑更细粒度、更高吞吐的 agent RL 迭代。报告宣称 GLM-5 在推理、代码、浏览器/终端工具使用与长程真实任务上达到开源前沿。",
  },
  {
    slug: "attention-transformer",
    title: "Transformer：注意力就是你所需要的一切",
    navTitle: "Transformer",
    paperTitle: "Attention Is All You Need",
    desc: "2017 奠基论文：扔掉 RNN 与卷积，只用缩放点积注意力。顺序操作 O(n)→O(1)、任意两 token 路径长度 O(1)，GPU 并行性首次在序列建模上完全释放；多头、位置编码、残差+LayerNorm 构成此后所有大模型的骨架。",
    motivation: "RNN/CNN 时代的序列模型很难同时做到长距离依赖、短路径信息流和高并行训练。Transformer 的核心问题是：能不能完全抛开循环和卷积，只用注意力把任意 token 直接连起来，从而让序列建模真正吃满 GPU 并行性。",
    tags: ["基础架构", "注意力机制"],
    icon: "🔁",
    authors: ["Ashish Vaswani", "et al."],
    venue: "NeurIPS",
    year: 2017,
    arxivUrl: "https://arxiv.org/abs/1706.03762",
    abstract:
      "我们提出 Transformer：摒弃循环与卷积、完全基于注意力的序列转换架构。核心是缩放点积注意力 softmax(QK^T/√d_k)V（除以 √d_k 抵消点积方差随维度线性增长、防 softmax 饱和）与多头机制（8 个 64 维子空间并行）。顺序操作数与最大路径长度均为 O(1)，训练高度并行。WMT 2014 英德翻译 28.4 BLEU、英法 41.8 BLEU 双双刷新单模型纪录，base 模型 8 张 P100 仅 12 小时；架构零改动迁移到句法分析同样有竞争力。",
  },
  {
    slug: "deepseek-v3",
    title: "DeepSeek-V3：671B MoE 的极致性价比",
    navTitle: "DeepSeek-V3",
    paperTitle: "DeepSeek-V3 Technical Report",
    desc: "671B 参数、每 token 激活 37B，2.788M GPU 小时训完 14.8T token。MLA 把 KV cache 压掉 57 倍，无辅助损失的 bias 负载均衡，首个超大规模 FP8 训练。",
    motivation: "大模型继续放大时，算力成本、KV cache、MoE 负载不均和低精度训练稳定性都会成为瓶颈。DeepSeek-V3 的动机是证明一套更高性价比的工程组合——MLA、无辅助损失负载均衡、FP8 和多 token 预测——可以把 671B MoE 训练到强性能而不把成本拉爆。",
    tags: ["DeepSeek 系列", "MoE 架构", "注意力机制", "高效训练", "蒸馏与数据", "推理优化"],
    icon: "🏗️",
    authors: ["DeepSeek-AI"],
    venue: "arXiv",
    year: 2024,
    arxivUrl: "https://arxiv.org/abs/2412.19437",
    codeUrl: "https://github.com/deepseek-ai/DeepSeek-V3",
    abstract:
      "DeepSeek-V3 是 671B 总参数、37B 激活的 MoE 语言模型，采用 MLA 注意力与 DeepSeekMoE 架构，首创无辅助损失的负载均衡策略与多 token 预测训练目标。模型在 14.8T token 上预训练，仅用 2.788M H800 GPU 小时（约 557 万美元）完成全部训练，过程无不可恢复的 loss 尖峰。后训练从 R1 系列蒸馏推理数据并做 GRPO 强化学习，数学与代码基准超越 Qwen2.5-72B 和 Llama-3.1-405B。",
  },
  {
    slug: "deepseek-v3-2",
    title: "DeepSeek-V3.2：稀疏注意力与可扩展的 RL 后训练",
    navTitle: "DeepSeek-V3.2",
    paperTitle: "DeepSeek-V3.2: Pushing the Frontier of Open Large Language Models",
    desc: "DSA 稀疏注意力把主注意力复杂度从 O(L²) 降到 O(Lk)；GRPO 规模化稳定配方支撑起超预训练 10% 的 RL 算力；85K 合成任务把思考装进工具调用。",
    motivation: "长上下文和大规模 RL 后训练都很贵：标准注意力随长度平方增长，而推理 RL 又容易受 KL 偏差、离轨样本和路由不稳影响。DeepSeek-V3.2 关注的是如何同时降低长上下文注意力成本、稳定放大 GRPO，并把工具调用任务中的“思考”系统化合成出来。",
    tags: ["DeepSeek 系列", "注意力机制", "强化学习", "数据合成", "Agentic 训练", "推理优化", "长上下文"],
    icon: "🔬",
    authors: ["DeepSeek-AI"],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2512.02556",
    codeUrl: "https://huggingface.co/deepseek-ai/DeepSeek-V3.2",
    abstract:
      "DeepSeek-V3.2 通过三大突破追平闭源前沿：DSA 稀疏注意力（轻量索引器 + top-k 选择，主注意力 O(L²）→O(Lk))在保持长上下文性能的同时大幅降低计算成本；稳定可扩展的 GRPO 配方（无偏 KL 估计、离轨掩码、Keep Routing 等）将后训练算力提升至预训练的 10% 以上，推理性能比肩 GPT-5；大规模智能体任务合成管线（1800+ 环境、85K 指令）把思考能力融入工具调用。高算力变体 V3.2-Speciale 在 IMO 2025 与 IOI 2025 均获金牌。",
  },
  {
    slug: "deepseek-v4",
    title: "DeepSeek-V4：高效百万上下文智能",
    navTitle: "DeepSeek-V4",
    paperTitle: "DeepSeek-V4: Towards Highly Efficient Million-Token Context Intelligence",
    desc: "DeepSeek-V4 把百万 token 上下文做成效率问题：V4-Pro 1.6T/49B、V4-Flash 284B/13B，结合 CSA + HCA 混合注意力、mHC 与 Muon；后训练用 full-vocabulary OPD 替换 mixed RL 阶段。",
    motivation: "百万上下文模型的瓶颈不只是窗口长度，而是 prefill、KV cache、长程训练和后训练 rollout 的综合成本。DeepSeek-V4 的动机是用架构、优化器和在线蒸馏一起降低长上下文智能的单位成本，把多个老师的长程能力稳定迁移到可部署模型。",
    tags: ["DeepSeek 系列", "在线蒸馏", "蒸馏与数据", "长上下文", "注意力机制", "推理优化", "高效训练", "MoE 架构", "强化学习"],
    icon: "🌊",
    authors: ["DeepSeek-AI"],
    venue: "arXiv",
    year: 2026,
    arxivUrl: "https://arxiv.org/abs/2606.19348",
    pdfUrl: "https://arxiv.org/pdf/2606.19348",
    abstract:
      "DeepSeek-V4 面向高效百万 token 上下文智能，提供 V4-Pro（1.6T 总参、49B 激活）与 V4-Flash（284B 总参、13B 激活）两种模型，均支持 1M 上下文。论文称 V4-Pro 在 1M context 下相对 V3.2 只需约 27% single-token inference FLOPs 和 10% KV cache。架构侧引入 CSA + HCA 混合注意力、mHC 与 Muon 优化；后训练侧明确用 On-Policy Distillation 完全替换 mixed RL 阶段，并提出 full-vocabulary OPD 的 efficient teacher scheduling。",
  },
  {
    slug: "qwen3-vl",
    title: "Qwen3-VL：看懂、想清、做得出",
    navTitle: "Qwen3-VL",
    paperTitle: "Qwen3-VL",
    desc: "阿里新一代视觉语言模型：Interleaved-MRoPE 全频率位置编码、DeepStack 多层视觉注入、文本-时间戳对齐三项架构更新；原生 256K 上下文可扩 1M，视频大海捞针 1M token 保持 99.5%；视觉 Agent 操作手机电脑 GUI，Instruct 版视觉感知比肩 Gemini 2.5 Pro。",
    motivation: "上一代 VLM 往往在长视频、细粒度 OCR、GUI 操作和纯文本能力之间取舍，视觉 token 多了贵，少了又看不清。Qwen3-VL 的动机是用位置编码、深层视觉注入和时间戳对齐重做多模态接口，让模型既能长上下文看视频，又能在真实界面里执行任务。",
    tags: ["多模态", "长上下文", "Agentic 训练", "注意力机制", "基础架构"],
    icon: "👁️",
    authors: ["Qwen Team"],
    venue: "官方博客",
    year: 2025,
    date: "2025-09",
    codeUrl: "https://huggingface.co/Qwen/Qwen3-VL-235B-A22B-Instruct",
    abstract:
      "Qwen3-VL 是 Qwen 系列迄今最强的视觉语言模型，2B 到 235B-A22B 全系开源（Apache 2.0，Instruct 与 Thinking 双版本）。架构三更新：Interleaved-MRoPE(t/h/w 交错分布实现全频率覆盖，提升长视频理解)、DeepStack（ViT 多层特征注入 LLM 多层，提升细节捕捉与图文对齐）、文本时间戳对齐（时间戳-视频帧交错输入，秒级视频定位）。原生 256K 上下文可扩展至 1M，视频大海捞针 256K 100%、1M 99.5%；OCR 语言从 10 种扩到 32 种；视觉 Agent 能操作 PC 与手机 GUI；纯文本能力与 Qwen3-235B-A22B-2507 不相上下。",
  },
  {
    slug: "internvl35",
    title: "InternVL3.5：级联 RL 与视觉分辨率路由",
    navTitle: "InternVL3.5",
    paperTitle: "InternVL3.5: Advancing Open-Source Multimodal Models in Versatility, Reasoning, and Efficiency",
    desc: "上海 AI Lab 的开源多模态模型（1B–241B-A28B）：Cascade RL 两阶段（难度驱动重放 + 在线 off-policy）、Visual Resolution Router 按任务动态分配视觉 token 预算、DvD 视觉语言解耦部署 4.05× 加速；多模态推理较上代 +16%。",
    motivation: "开源多模态模型提升推理能力时常靠更大模型和更多视觉 token，但推理、效率和部署成本会同时恶化。InternVL3.5 想解决的是：如何用级联 RL 提升复杂多模态推理，再用分辨率路由和视觉语言解耦把推理成本降下来。",
    tags: ["多模态", "强化学习", "推理优化", "高效训练"],
    icon: "🌟",
    authors: ["Weiyun Wang", "et al."],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2508.18265",
    codeUrl: "https://github.com/OpenGVLab/InternVL",
    abstract:
      "InternVL3.5 系列覆盖 1B 到 241B-A28B（Flash 系列 MoE），在通用能力、推理与效率三个方向推进开源多模态：推理上提出 Cascade RL——两阶段强化学习（离线难度驱动重放 + 在线 off-policy 训练），多模态推理较 InternVL3 提升 16%；效率上提出 Visual Resolution Router，按任务难度动态分配视觉 token 预算，省算力不降精度；部署上提出 DvD（Decoupled Vision-Language Deployment），视觉语言解耦部署带来 4.05× 加速。241B-A28B 在 OpenCompass 等综合榜单超越 Qwen3-235B、GPT-5 与 Gemini 2.5 Pro。",
  },
  {
    slug: "deepseek-ocr",
    title: "DeepSeek-OCR：上下文光学压缩",
    navTitle: "DeepSeek-OCR",
    paperTitle: "DeepSeek-OCR: Contexts Optical Compression",
    desc: "不到 1B 激活参数：DeepEncoder（80M SAM-base 感知 + 2 层卷积压缩 16× + 300M CLIP-large 知识，共约 380M）+ DeepSeek-3B-MoE（激活约 570M）。OCR 被重新定义为「上下文光学压缩」——把图像信息压进文本；<10× 压缩精度约 97%，20× 约 60%；deep parsing 输出统一 Markdown,OmniDocBench 以 1/9 token 数超 MinerU2.0。MIT 开源。",
    motivation: "长文档、论文和报告直接喂给 VLM 会消耗巨量视觉 token，传统 OCR 又只抽文字，丢掉版面、公式和图表结构。DeepSeek-OCR 的动机是把 OCR 重新定义为上下文压缩：用小激活模型把图像里的有效信息压成结构化文本，为后续大模型节省上下文预算。",
    tags: ["DeepSeek 系列", "多模态", "MoE 架构", "推理优化", "蒸馏与数据"],
    icon: "📃",
    authors: ["Haoran Wei", "Yaofeng Sun", "Yukun Li"],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2510.18234",
    codeUrl: "https://github.com/deepseek-ai/DeepSeek-OCR",
    abstract:
      "DeepSeek-OCR 把 OCR 重新定义为「上下文光学压缩」（Contexts Optical Compression）：识别文字只是手段，把图像承载的全部信息（标题、公式、化学式、几何图）尽可能无损压缩进文本才是目的。编码器 DeepEncoder 约 380M，三段串联：SAM-base（80M）前半段 window attention 负责高分辨率感知，2 层 stride-2 卷积把 token 数压掉 16×，CLIP-large（300M）在压缩后的短序列上做全局知识提取。解码器为 DeepSeek-3B-MoE（12 层，64 路由专家激活 6 + 2 共享，激活约 570M）。压缩比小于 10× 时 OCR 精度约 97%，20× 时约 60%；deep parsing 模式可将文档/论文/报告转为统一 Markdown 结构，OmniDocBench 上以 1/9 的 token 数超越 MinerU2.0。MIT 协议开源，可作为 VLM 的前置压缩模块。",
  },
  {
    slug: "ui-tars-2",
    title: "UI-TARS-2：GUI Agent 的多轮强化学习",
    navTitle: "UI-TARS-2",
    paperTitle: "UI-TARS-2 Technical Report: Advancing GUI Agent with Multi-Turn Reinforcement Learning",
    desc: "字节跳动的原生 GUI Agent（截图进 → 动作出）：多轮交互式 RL 把整个任务轨迹当训练单元，浏览器沙箱/安卓/游戏环境提供可验证 reward；PPO（明确胜过 GRPO）+ Length-Adaptive GAE；数据飞轮 + 交互式标注平台；推理时放大交互步数预算持续涨分。",
    motivation: "GUI Agent 不能只学单步点击：真实任务需要多轮观察、纠错和跨应用操作，而 DOM/接口依赖也限制了泛化。UI-TARS-2 的问题意识是把整个交互轨迹作为 RL 训练单元，用可验证环境奖励训练一个只看截图也能持续行动的通用 GUI 智能体。",
    tags: ["Agentic 训练", "强化学习", "多模态", "数据合成"],
    icon: "🖥️",
    authors: ["Haoming Wang", "et al."],
    venue: "arXiv",
    year: 2025,
    arxivUrl: "https://arxiv.org/abs/2509.02544",
    codeUrl: "https://github.com/bytedance/ui-tars",
    abstract:
      "UI-TARS-2 是字节跳动 Seed 团队的原生 GUI Agent：直接以截图为输入、以界面动作为输出，不依赖 DOM 等底层信息，底座为 Seed1.6(532M 视觉编码器 + 230B 总参/23B 激活 MoE)。核心是多轮（multi-turn）强化学习——把「观察-思考-行动」的完整任务轨迹作为训练单元而非单步动作，在浏览器沙箱容器、Android 模拟器与游戏环境中以可验证 reward 训练，算法选 PPO（论文明确胜过 GRPO），配 Length-Adaptive GAE、Value Pretraining 与 Clip Higher；配套数据飞轮（self-reinforcing loop）与四层交互式标注平台。推理时扩展采取放大允许交互步数的朴素形态，在 OSWorld 与游戏基准上随步数预算单调涨分。在 OSWorld、AndroidWorld 等 GUI 基准上取得开源 SOTA。",
  },
  {
    slug: "kimi-k3",
    title: "Kimi K3：开源 3T 的混合注意力与 LatentMoE",
    navTitle: "Kimi K3",
    paperTitle: "Kimi K3: Open Frontier Intelligence",
    desc: "世界首个开源 3T 级：2.78T 总参/104B 激活。93 层 = 69 层 KDA 线性注意力 + 24 层 Gated MLA；AttnRes 让每层选择性关注所有前层；Stable LatentMoE 896 专家激活 16（sparsity 56）。相对 K2 提升约 2.5× scaling efficiency，1M 上下文，原生多模态。",
    motivation: "K2 之后，继续扩大 MoE 会遇到注意力成本、极端稀疏路由稳定性和百万上下文 agentic RL 的三重瓶颈。Kimi K3 的动机是用混合线性/MLA 注意力、LatentMoE 和分强度推理 RL，探索开源 3T 级模型如何在规模、效率和智能体能力之间取得新平衡。",
    tags: ["Kimi 系列", "在线蒸馏", "MoE 架构", "注意力机制", "多模态", "Agentic 训练", "长上下文", "高效训练", "强化学习", "蒸馏与数据"],
    icon: "🌌",
    authors: ["Kimi Team"],
    venue: "arXiv",
    year: 2026,
    arxivUrl: "https://arxiv.org/abs/2607.24653",
    codeUrl: "https://huggingface.co/moonshotai/Kimi-K3",
    abstract:
      "Kimi K3 是 2.78T 总参、104B 激活的原生多模态 MoE，1M token 上下文，世界首个开源 3T 级模型。三大架构创新：KDA（Kimi Delta Attention）线性注意力以 delta rule 在写入前擦除旧状态(S_t=M_t·S_{t-1}+β_t·k_t·v_t^T)，与 Gated MLA 周期交错；AttnRes（Attention Residuals）把注意力方法论搬到深度方向，每层可选择性检索所有前层表示；Stable LatentMoE 把路由专家放入 3584 维潜空间，896 专家激活 16，用 RMSNorm + SiTU-GLU + Quantile Balancing 在极端稀疏下稳住优化。以上合计较 K2 提升约 2.5× scaling efficiency。后训练以 Reasoning Effort RL(按题 token 预算 + τ 退火，3 域×3 强度=9 专家)+ 多教师 on-policy 蒸馏为核心，支持百万 token agentic RL（持久 rollout 与沙箱状态）。GPQA Diamond 93.5、BrowseComp 91.2、SWE-Marathon 42.0，整体仅次于 Claude Fable 5 与 GPT-5.6 Sol，为开源最强。",
  },
  {
    slug: "minimax-m3",
    title: "MiniMax-M3：块稀疏注意力与原生多模态",
    navTitle: "MiniMax-M3",
    paperTitle: "MiniMax Sparse Attention",
    desc: "428B/23B 激活、1M 上下文的原生多模态模型。MSA 用单 KV 头的 Index Branch 给 KV 块打分，每个 GQA 组独立 Top-k 选块、Main Branch 只做稀疏精确注意力；每 query 固定 2048 KV token，1M 上下文下注意力 FLOPs 降为 1/28.4，prefill 提速 14.2×、decode 7.6×。",
    motivation: "百万上下文多模态模型最大的拦路虎是注意力成本：全量精确注意力在长输入下几乎不可承受，但粗糙稀疏又可能损伤效果。MiniMax-M3 的动机是让模型先学会“挑哪些 KV 块值得看”，再只在关键块上做精确注意力，把长上下文从能跑变成跑得起。",
    tags: ["MiniMax 系列", "注意力机制", "多模态", "长上下文", "MoE 架构"],
    icon: "🪶",
    authors: ["Xunhao Lai", "et al."],
    venue: "arXiv",
    year: 2026,
    arxivUrl: "https://arxiv.org/abs/2606.13392",
    codeUrl: "https://huggingface.co/MiniMaxAI/MiniMax-M3",
    abstract:
      "MiniMax-M3(约 428B 总参/23B 激活)提出 MiniMax Sparse Attention（MSA）：基于 GQA 的块稀疏注意力——轻量 Index Branch（单 KV 头因果注意力）对全上下文 KV 块打分，每个 GQA 组独立 Top-k 选择，Main Branch 只在选中块上做精确注意力。部署配置下每 query 固定 2,048 KV token 预算，1M 上下文较 M2 prefill 提速 14.2×、decode 提速 7.6×、每 token 注意力计算量降至 1/28.4。无需预训练知识，可从既有 checkpoint 直接续训。模型原生多模态（从头混合模态训练）、1M 上下文、三种思考模式(thinking 参数：enabled/adaptive/禁用)。",
  },
];

/** 所有出现过的 keyword（保持注册表中的出现顺序）。 */
export function getAllTags(): string[] {
  const seen: string[] = [];
  for (const p of papers) {
    for (const t of p.tags) {
      if (!seen.includes(t)) seen.push(t);
    }
  }
  return seen;
}

/** 按发表时间倒序的论文列表（年份相同按注册表顺序）。 */
export function getPapersByDate(): Paper[] {
  return [...papers].sort((a, b) => b.year - a.year);
}

/** 某 tag 下的论文（注册表顺序）。tag 不存在时返回空数组。 */
export function getPapersByTag(tag: string): Paper[] {
  return papers.filter((p) => p.tags.includes(tag));
}

/** 发表年月（YYYY-MM）：优先 date 字段；否则从 arXiv 编号解析；都不行回退 `${year}-01`。 */
export function paperDate(p: Paper): string {
  if (p.date) return p.date;
  const m = p.arxivUrl && /\/(\d{2})(\d{2})\.\d+$/.exec(p.arxivUrl);
  return m ? `20${m[1]}-${m[2]}` : `${p.year}-01`;
}

/**
 * 侧边栏导航树之一：按关键词分组，每个 tag 是一个可折叠主题。
 * 当前论文所属的 tag 自动展开（一篇论文有多个 tag，只展开最靠前的一个）。
 */
export function getPapersNav() {
  return [
    {
      name: "按关键词",
      icon: "🏷️",
      topics: getAllTags().map((tag) => ({
        name: tag,
        leaves: getPapersByTag(tag).map(withHint),
      })),
    },
  ];
}

/** 侧边栏导航树之二：按发表年份分组（新→旧），年内按时间倒序。 */
export function getPapersNavByDate() {
  const byYear = new Map<string, Paper[]>();
  for (const p of getPapersByDate()) {
    const key = paperDate(p).slice(0, 4);
    if (!byYear.has(key)) byYear.set(key, []);
    byYear.get(key)!.push(p);
  }
  return [
    {
      name: "按时间",
      icon: "📅",
      topics: [...byYear.entries()].map(([year, ps]) => ({
        name: `${year} 年`,
        leaves: ps.map(withHint),
      })),
    },
  ];
}

/** 侧边栏导航树之三（默认）：不分组，按时间正序（旧→新）的平铺列表。 */
export function getPapersNavFlat() {
  return [
    {
      name: "全部论文",
      icon: "📚",
      topics: [
        {
          name: null,
          leaves: [...papers]
            .sort((a, b) => paperDate(a).localeCompare(paperDate(b)))
            .map(withHint),
        },
      ],
    },
  ];
}

/** 给叶子补上导航栏展示的发表年月（YYYY-MM）。 */
function withHint(p: Paper): Paper & { hint: string } {
  return { ...p, hint: paperDate(p) };
}

export function getPaper(slug: string): Paper | undefined {
  return papers.find((p) => p.slug === slug);
}

/** 第一篇，用于「开始阅读」入口与导航栏「论文」链接 */
export function getFirstPaper(): Paper {
  return papers[0];
}

/** 1 基的阅读序号（注册表顺序）；未找到返回 0 */
export function getPaperOrder(slug: string): number {
  return papers.findIndex((p) => p.slug === slug) + 1;
}

/** 返回上一篇 / 下一篇，用于论文底部导航 */
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
