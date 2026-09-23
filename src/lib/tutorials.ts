// 教程注册表 —— 单一数据源。
// 导航栏、侧边栏、首页、上一篇/下一篇都从这里读取,避免多处维护不一致。

export interface Tutorial {
  slug: string;
  title: string;
  desc: string;
  /** 章节分组(领域) */
  category: string;
  /**
   * 板块(领域内的知识主题)。可选:不填的教程直接挂在领域下。
   * 同一领域内,板块顺序由首次出现决定。
   */
  topic?: string;
  /** 图标(emoji),用于列表与侧边栏视觉区分 */
  icon: string;
}

/** 领域内的一个板块:name 为 null 表示「无板块」(教程直接挂领域下)。 */
export interface Topic {
  name: string | null;
  tutorials: Tutorial[];
}

export interface Category {
  name: string;
  icon: string;
  tutorials: Tutorial[];
}

/** 三级结构:领域 → 板块 → 教程 */
export interface NestedCategory {
  name: string;
  icon: string;
  topics: Topic[];
}

// 顺序即学习路径顺序;同时决定上一篇/下一篇。
export const tutorials: Tutorial[] = [
  {
    slug: "python-numpy-basics",
    title: "Python 与 NumPy 基础",
    desc: "零基础起步:变量、列表、循环、函数,以及机器学习离不开的 NumPy 数组运算。边读边运行。",
    category: "编程基础",
    icon: "🐍",
  },
  {
    slug: "pandas-basics",
    title: "Pandas 数据处理",
    desc: "真实数据都是表格。用 Pandas 读取、筛选、分组、清洗——机器学习的第一步从这里开始。",
    category: "编程基础",
    icon: "🐼",
  },
  {
    slug: "probability-basics",
    title: "概率论基础",
    desc: "随机、条件概率、贝叶斯、期望与方差——机器学习的语言。翻硬币亲眼看大数定律。",
    category: "基础理论",
    icon: "🎲",
  },
  {
    slug: "numerical-computing",
    title: "数值计算与稳定性",
    desc: "为什么 softmax 会算出 NaN?交叉熵会变 inf?一网打尽上溢下溢、log-sum-exp、灾难性抵消等实战数值陷阱与修复技巧。",
    category: "基础理论",
    icon: "🔢",
  },
  {
    slug: "information-theory",
    title: "熵与信息",
    desc: "香农如何量化「信息」?自信息、熵、联合熵、条件熵、互信息——机器学习不确定性的度量基础。拖动滑块看钟形熵曲线。",
    category: "基础理论",
    topic: "信息论",
    icon: "📊",
  },
  {
    slug: "cross-entropy-kl",
    title: "交叉熵与 KL 散度",
    desc: "用「错误的信念」编码真相要付多少代价?交叉熵、KL 散度、前向 vs 反向 KL——分类损失与 VAE/RLHF 的共同根基。",
    category: "基础理论",
    topic: "信息论",
    icon: "📐",
  },
  {
    slug: "ce-kl-nll-equivalence",
    title: "一个恒等式:交叉熵 = KL = NLL",
    desc: "one-hot 标签下,交叉熵、KL 散度、负对数似然三个量为何完全相等?四步推导讲清塌缩的原因,以及软标签时为什么又分道扬镳。",
    category: "基础理论",
    topic: "信息论",
    icon: "🟰",
  },
  {
    slug: "forward-reverse-kl",
    title: "前向 KL vs 反向 KL",
    desc: "KL 不对称,朝哪个方向优化会学出完全不同的模型:前向「铺得广、覆盖所有峰」,反向「抓得准、择一收窄」。VAE、RLHF、知识蒸馏的分水岭。",
    category: "基础理论",
    topic: "信息论",
    icon: "↔️",
  },
  {
    slug: "ml-losses",
    title: "实战:分类与语言模型的损失",
    desc: "同一个交叉熵的三种面孔:二分类 BCE、多分类 CE、GPT 的下一个词预测与困惑度。理论如何落进真实模型。",
    category: "基础理论",
    topic: "信息论",
    icon: "🎯",
  },
  {
    slug: "linear-regression",
    title: "线性回归入门",
    desc: "从损失函数到 scikit-learn 自动拟合,边读边改代码运行。",
    category: "监督学习",
    topic: "线性模型",
    icon: "📈",
  },
  {
    slug: "gradient-descent",
    title: "梯度下降",
    desc: "理解模型如何「自己」找到最优参数,动手拖动学习率观察收敛。",
    category: "监督学习",
    topic: "线性模型",
    icon: "⛰️",
  },
  {
    slug: "logistic-regression",
    title: "逻辑回归",
    desc: "线性模型 + Sigmoid + 交叉熵——把前面所学串成一个真正的分类器。拖动看 S 形概率曲线。",
    category: "监督学习",
    topic: "线性模型",
    icon: "🚦",
  },
  {
    slug: "knn-classification",
    title: "K 近邻分类",
    desc: "最直观的分类算法:看你周围的邻居是谁。交互式调整 K 值看决策边界。",
    category: "监督学习",
    topic: "经典分类器",
    icon: "🎯",
  },
  {
    slug: "svm",
    title: "支持向量机(SVM)",
    desc: "找那条「最宽街道」把两类分开。拖动分隔线看间隔与支持向量,再用核技巧搞定非线性。",
    category: "监督学习",
    topic: "经典分类器",
    icon: "🛣️",
  },
  {
    slug: "naive-bayes",
    title: "朴素贝叶斯",
    desc: "用贝叶斯定理做分类,垃圾邮件过滤的经典武器。点选关键词看垃圾概率如何累积更新。",
    category: "监督学习",
    topic: "经典分类器",
    icon: "📧",
  },
  {
    slug: "decision-tree",
    title: "决策树",
    desc: "像玩「20 个问题」一样分类:用信息增益挑选最佳切分。拖动阈值看熵如何下降。",
    category: "监督学习",
    topic: "树与集成",
    icon: "🌳",
  },
  {
    slug: "ensemble-learning",
    title: "集成学习:随机森林与提升",
    desc: "三个臭皮匠顶个诸葛亮。拖动树的数量,看众多高方差的树如何平均成一条精准曲线。",
    category: "监督学习",
    topic: "树与集成",
    icon: "🌲",
  },
  {
    slug: "model-evaluation",
    title: "模型评估",
    desc: "准确率会骗人!精确率、召回率、F1、混淆矩阵——拖动阈值看指标如何此消彼长。",
    category: "评估与调优",
    icon: "📋",
  },
  {
    slug: "overfitting-regularization",
    title: "过拟合与正则化",
    desc: "模型为什么会「死记硬背」?调多项式阶数看训练/测试误差分道扬镳,再用正则化驯服它。",
    category: "评估与调优",
    icon: "🎚️",
  },
  {
    slug: "cross-validation",
    title: "交叉验证",
    desc: "只切一次训练/测试集靠谱吗?K 折交叉验证让每个样本都当一次验证,评估更稳、调参更准。",
    category: "评估与调优",
    icon: "🔁",
  },
  {
    slug: "kmeans-clustering",
    title: "K-means 聚类",
    desc: "无监督学习入门:让算法自己发现数据中的分组。逐步观看簇心移动。",
    category: "无监督学习",
    icon: "🌀",
  },
  {
    slug: "pca-dimensionality-reduction",
    title: "PCA 降维",
    desc: "把高维数据压成几个「主成分」,保留最多信息。旋转投影方向看方差如何变化。",
    category: "无监督学习",
    icon: "📐",
  },
  {
    slug: "neural-network",
    title: "神经网络入门",
    desc: "把逻辑回归堆成层,就成了神经网络。点击输入,看激活值逐层传播解出 XOR。",
    category: "深度学习",
    icon: "🧠",
  },
  {
    slug: "multi-armed-bandit",
    title: "多臂老虎机:探索与利用",
    desc: "RL 的最小问题:面前 K 台机器、中奖率未知,每步只能拉一台。没有状态转移、没有折扣,只剩一个核心矛盾——该利用已知最好的,还是探索没试够的?ε-贪心、UCB、Thompson 采样、后悔值曲线,从这儿读懂整个 RL 的探索逻辑。",
    category: "强化学习",
    topic: "价值方法",
    icon: "🎰",
  },
  {
    slug: "reinforcement-learning",
    title: "强化学习入门",
    desc: "没有标准答案,只有奖励信号。马尔可夫决策过程、策略与价值、Q-learning——让智能体在网格世界里自己摸索出最优路径。",
    category: "强化学习",
    topic: "价值方法",
    icon: "🕹️",
  },
  {
    slug: "dynamic-programming",
    title: "动态规划:精确求解 MDP",
    desc: "如果环境规则完全已知,根本不用试错——贝尔曼方程 + 价值迭代/策略迭代直接把最优策略算出来。这是 Q-learning、DQN 都在近似的理论地基。",
    category: "强化学习",
    topic: "价值方法",
    icon: "📐",
  },
  {
    slug: "monte-carlo",
    title: "蒙特卡洛方法:用经验说话",
    desc: "不知道模型怎么办?反复跑回合、把真实回报平均起来——价值就是经验回报的均值。首次/每次访问、ε-软控制、重要性采样,以及它为何是 REINFORCE 拿 Gₜ 当梯度的根源。",
    category: "强化学习",
    topic: "价值方法",
    icon: "🎲",
  },
  {
    slug: "temporal-difference",
    title: "时序差分学习:边走边学",
    desc: "模型未知怎么办?TD 融合动态规划的自举与蒙特卡洛的免模型,走一步就学一步。随机游走里看它如何击败 MC,以及它为何是 Q-learning、Actor-Critic 的共同内核。",
    category: "强化学习",
    topic: "价值方法",
    icon: "⏱️",
  },
  {
    slug: "dqn",
    title: "DQN:用神经网络逼近 Q 表",
    desc: "状态太多、Q 表存不下?用神经网络逼近 Q 值,再靠经验回放 + 目标网络稳住训练。DeepMind 用它仅凭像素玩通 Atari,深度强化学习就此起飞。",
    category: "强化学习",
    topic: "价值方法",
    icon: "👾",
  },
  {
    slug: "policy-gradient",
    title: "策略梯度:直接学策略",
    desc: "跳过价值表,直接把策略参数化用梯度上升优化。REINFORCE、基线降方差、Actor-Critic 的优势函数,到 PPO 裁剪目标——通往 RLHF 的必经之路。",
    category: "强化学习",
    topic: "策略与对齐",
    icon: "🎢",
  },
  {
    slug: "continuous-control",
    title: "连续控制:DDPG 到 SAC",
    desc: "机器人关节、方向盘转角是连续实数,没法对动作取 argmax。确定性 actor 替代 max(DDPG)、孪生 critic 治高估(TD3)、最大熵强探索(SAC)——机器人与自动驾驶的 RL 主力。",
    category: "强化学习",
    topic: "策略与对齐",
    icon: "🤖",
  },
  {
    slug: "rlhf",
    title: "从 RL 到 RLHF:对齐大模型",
    desc: "ChatGPT 为何「听话」?奖励模型 + PPO/DPO + 反向 KL 约束,把语言模型对齐到人类偏好。强化学习在大模型时代的杀手级应用。",
    category: "强化学习",
    topic: "策略与对齐",
    icon: "🎀",
  },
  {
    slug: "grpo-rlvr",
    title: "GRPO 与可验证奖励:训练会推理的大模型",
    desc: "DeepSeek-R1 靠什么学会一步步推理?GRPO 砍掉 PPO 的 critic,用同一道题采样一组回答、组内均值当基线;RLVR 用「答案对不对」的规则判分取代奖励模型。再看长度偏置、难度偏置两大陷阱,以及 Dr.GRPO / DAPO 的修法。",
    category: "强化学习",
    topic: "策略与对齐",
    icon: "🧠",
  },
  {
    slug: "offline-rl",
    title: "离线强化学习:从别人的日志里学策略",
    desc: "医疗、自动驾驶、推荐——这些场景不能试错,却囤着海量历史日志。离线 RL 只用固定数据集学策略,拦路虎是分布偏移导致的 Q 值外推高估;BCQ 约束策略、CQL 保守压低、IQL 干脆不问 OOD 动作,三招殊途同归。",
    category: "强化学习",
    icon: "📦",
  },
  {
    slug: "imitation-learning",
    title: "模仿学习:从示范中学习",
    desc: "没有奖励信号、只有专家示范,怎么学策略?行为克隆把它当监督学习,却栽在「级联误差」上;DAgger 边走边问、用学习者轨迹纠偏;逆向强化学习(IRL)从示范反推奖励;GAIL 把 IRL+RL 映射到 GAN,判别器即隐式奖励——免显式奖励、免内层 RL 循环。",
    category: "强化学习",
    icon: "🎓",
  },
  {
    slug: "model-based-rl",
    title: "基于模型的强化学习:学会规划",
    desc: "免模型 RL 省心却费样本——能不能顺便把环境也学了,在脑子里「想象」着规划?Dyna-Q 边学 Q 表边学环境模型、n 步规划加速收敛;MCTS 用 UCT 在博弈树上「选-展-滚-传」;AlphaZero 用神经网络替掉随机 rollout;世界模型(Dreamer)干脆在潜空间里做梦训练。",
    category: "强化学习",
    icon: "🗺️",
  },
  {
    slug: "hierarchical-rl",
    title: "分层强化学习:选项与时间抽象",
    desc: "走一步学一步太慢——能不能把「去门口」这种跨多步的子目标打包成一个动作?选项框架(option = 起始集 + 内部策略 + 终止函数)把时间延伸动作塞进 SMDP 贝尔曼方程 $Q(s,o)=\\mathbb E[R+\\gamma^k Q(s',o')]$,时间抽象缩短有效视野。MAXQ/Feudal/HAM 三框架、FeUdal Networks 的 manager-worker、h-DQN 目标分层、option-critic 自动发现选项——分层是 RL 对付长程信用分配的主干。",
    category: "强化学习",
    icon: "🏗️",
  },
  {
    slug: "multi-agent-rl",
    title: "多智能体强化学习:从博弈到合作",
    desc: "多个智能体同时学习会怎样?每个智能体把别人当环境,可别人也在学——环境就不再平稳,马尔可夫性被破坏。MARL 从随机博弈形式化出发,经独立 Q-learning 的非平稳困境,到 CTDE(集中训练分布执行)范式:价值分解(VDN/QMIX 单调混合)解决合作协同,策略梯度(MADDPG 集中 critic、COMA 反事实基线、MAPPO)应对混合博弈。再到自博弈的 autocurriculum 与社交困境——RL 从单智能体走向多智能体的主干。",
    category: "强化学习",
    icon: "🤝",
  },
  {
    slug: "knowledge-distillation",
    title: "知识蒸馏",
    desc: "大模型当老师,小模型当学生。用温度软化的软标签 + KL 损失,把大模型的「暗知识」压进小模型——手机端小模型的幕后功臣。",
    category: "前沿与对齐",
    topic: "知识蒸馏",
    icon: "🧪",
  },
  {
    slug: "on-policy-distillation",
    title: "在线蒸馏(on-policy distillation)",
    desc: "离线蒸馏让学生「一步错步步错」。让学生自己生成、老师逐 token 打分,用反向 KL 在学生自己的轨迹上学——比 RL 省 10 倍算力的大模型蒸馏当红方案。",
    category: "前沿与对齐",
    topic: "知识蒸馏",
    icon: "🎬",
  },
  {
    slug: "mixed-distillation",
    title: "混合蒸馏:off-policy 的成本 + on-policy 的覆盖",
    desc: "纯离线有暴露偏差,纯在线太贵——能不能各取所长?GKD 的 mixed 模式、Speculative KD 的交错采样、DistiLLM 的样本复用,把老师样本与学生样本按比例混合,用 off-policy 的成本买 on-policy 的覆盖。工业流水线最实际的折中。",
    category: "前沿与对齐",
    topic: "知识蒸馏",
    icon: "🌀",
  },
  {
    slug: "student-beats-teacher",
    title: "学生超越老师",
    desc: "同架构、同数据,student 为什么能赢 teacher?Born-Again 的反直觉消融(DKPP 打乱暗知识不掉点)、自蒸馏的正则化理论、弱到强泛化的 misfit 定理,加上 Qwen3/R1/Phi-4 的工业证据——超越的从来不是知识,是 teacher 没吃满的正则化红利。",
    category: "前沿与对齐",
    topic: "知识蒸馏",
    icon: "🏆",
  },
  {
    slug: "llm-decoding",
    title: "大模型解码:如何生成文字",
    desc: "训练学的是概率,生成靠的是解码。贪心、温度、top-k、top-p 核采样——同一个模型,如何在「稳妥」与「有创意」之间调出千变万化的文字。",
    category: "前沿与对齐",
    icon: "✍️",
  },
];

/** 领域 → 图标。新增领域记得在这里加一条。 */
const CATEGORY_ICONS: Record<string, string> = {
  编程基础: "🐍",
  基础理论: "🧮",
  监督学习: "🧭",
  评估与调优: "🎯",
  无监督学习: "🔍",
  深度学习: "🧠",
  强化学习: "🕹️",
  前沿与对齐: "🚀",
};

/** 按分类分组(两级:领域 → 教程),保持注册表中的出现顺序。 */
export function getCategories(): Category[] {
  const order: string[] = [];
  const map = new Map<string, Tutorial[]>();
  for (const t of tutorials) {
    if (!map.has(t.category)) {
      map.set(t.category, []);
      order.push(t.category);
    }
    map.get(t.category)!.push(t);
  }
  return order.map((name) => ({
    name,
    icon: CATEGORY_ICONS[name] ?? "📚",
    tutorials: map.get(name)!,
  }));
}

/**
 * 按三级结构分组:领域 → 板块 → 教程。
 * 领域与板块的顺序都由在注册表中首次出现的位置决定。
 * 没有 topic 的教程归入一个 name 为 null 的板块(渲染时直接挂领域下)。
 */
export function getCategoriesNested(): NestedCategory[] {
  const catOrder: string[] = [];
  // category → (topicKey → Topic),用 Map 保序
  const cats = new Map<string, Map<string, Topic>>();
  const NO_TOPIC = " "; // 无板块的占位键

  for (const t of tutorials) {
    if (!cats.has(t.category)) {
      cats.set(t.category, new Map());
      catOrder.push(t.category);
    }
    const topics = cats.get(t.category)!;
    const key = t.topic ?? NO_TOPIC;
    if (!topics.has(key)) {
      topics.set(key, { name: t.topic ?? null, tutorials: [] });
    }
    topics.get(key)!.tutorials.push(t);
  }

  return catOrder.map((name) => ({
    name,
    icon: CATEGORY_ICONS[name] ?? "📚",
    topics: [...cats.get(name)!.values()],
  }));
}

/** 把 NestedCategory(叶子字段名 tutorials)适配为 Sidebar 通用 NavTree 形状(leaves)。 */
export function getTutorialsNav() {
  return getCategoriesNested().map((cat) => ({
    name: cat.name,
    icon: cat.icon,
    topics: cat.topics.map((topic) => ({ name: topic.name, leaves: topic.tutorials })),
  }));
}

export function getTutorial(slug: string): Tutorial | undefined {
  return tutorials.find((t) => t.slug === slug);
}

/** 学习路径的第一篇,用于「开始学习」入口与导航栏「教程」链接 */
export function getFirstTutorial(): Tutorial {
  return tutorials[0];
}

/** 1 基的学习路径序号(注册表顺序);未找到返回 0 */
export function getTutorialOrder(slug: string): number {
  return tutorials.findIndex((t) => t.slug === slug) + 1;
}

/** 返回上一篇 / 下一篇,用于教程底部导航 */
export function getNeighbors(slug: string): {
  prev: Tutorial | null;
  next: Tutorial | null;
} {
  const i = tutorials.findIndex((t) => t.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? tutorials[i - 1] : null,
    next: i < tutorials.length - 1 ? tutorials[i + 1] : null,
  };
}

/**
 * 站点基础 URL。优先读环境变量,便于部署到不同域名;
 * 本地/未配置时回退到占位域名(仅影响 sitemap/OG 的绝对地址)。
 * GitHub Pages 项目站点形如 https://<user>.github.io/<repo>,
 * 由部署方通过 NEXT_PUBLIC_SITE_URL 整体传入(含子路径)。
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ml-tutorial.example.com";

/**
 * 由注册表生成单篇教程的页面 metadata(title/description/openGraph)。
 * 在各教程 page.mdx 里 `export const metadata = tutorialMetadata("<slug>")` 即可。
 */
export function tutorialMetadata(slug: string) {
  const t = getTutorial(slug);
  if (!t) return {};
  const url = `${SITE_URL}/tutorials/${slug}`;
  return {
    title: t.title,
    description: t.desc,
    alternates: { canonical: url },
    openGraph: {
      title: t.title,
      description: t.desc,
      url,
      type: "article" as const,
    },
  };
}
