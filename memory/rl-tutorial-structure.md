# RL 教程目录结构档(板块地图)

> 「🕹️ 强化学习」域的地图:篇目清单、topic 分组、prev/next 链、学习路径、缺口清单。
> **本档是一份不超过 2000 字的精炼快照,不是逐轮日志**——每轮步骤 2 通读并**重新组织、完善、订正**它本身,让它始终反映最新最优结构,而非追加流水账。逐轮明细写进 `rl-loop-progress.md`,不写这里。
> 单一数据源是 `src/lib/tutorials.ts`(注册表);本档是它的镜像与规划,不是数据源本身。

## 当前结构总览(14 篇 = 2 topic + 5 flat)

```
🕹️ 强化学习
├── 价值方法 (6)     bandit → MDP → DP → MC → TD → DQN
│   ├── multi-armed-bandit       多臂老虎机:探索与利用
│   ├── reinforcement-learning   强化学习入门
│   ├── dynamic-programming      动态规划:精确求解 MDP
│   ├── monte-carlo              蒙特卡洛方法:用经验说话
│   ├── temporal-difference      时序差分学习:边走边学
│   └── dqn                      DQN:用神经网络逼近 Q 表
├── 策略与对齐 (3)   PG → 连续控制 → RLHF
│   ├── policy-gradient          策略梯度:直接学策略
│   ├── continuous-control       连续控制:DDPG 到 SAC
│   └── rlhf                     从 RL 到 RLHF:对齐大模型
└── (flat, 无 topic)  进阶范式,均挂在域下且彼此相邻
    ├── offline-rl               离线强化学习:从别人的日志里学策略
    ├── imitation-learning       模仿学习:从示范中学习
    ├── model-based-rl           基于模型的强化学习:学会规划
    ├── hierarchical-rl          分层强化学习:选项与时间抽象
    └── multi-agent-rl           多智能体强化学习:从博弈到合作
```

注册表顺序 = 学习路径顺序 = prev/next 链。所有 14 篇 `page.mdx` 均存在,注册表 / 文件系统 / 本档三处一致。

## topic 分组与紧邻性

- **价值方法**(6):bandit 放最前(无状态单步 RL,先吃透探索-利用),再进 MDP/DP/MC/TD/DQN 加时间维度。数组中紧邻 ✅
- **策略与对齐**(3):policy-gradient → continuous-control → rlhf。紧邻 ✅
- **flat**(5):offline-rl → imitation-learning → model-based-rl → hierarchical-rl → multi-agent-rl。无 topic,位于板块末尾且彼此相邻 ✅
- ⚠️ 约束:同 topic 篇目必须连续;flat 篇目必须彼此相邻,否则侧栏虚拟板块(`name: null`)与 prev/next 链错位。遵循 CLAUDE.md「每 topic ≥2 篇,否则宁可 flat」。

## prev/next 链与跨域衔接

链首 multi-armed-bandit,prev 跨域指向 `neural-network`(深度学习);链尾 multi-agent-rl,next 跨域指向 `knowledge-distillation`(前沿与对齐)。中间按上方总览顺序首尾相接。RL 板块夹在 `深度学习` 与 `前沿与对齐` 之间。

## 学习路径递进核对

期望主线:`bandit(探索-利用最小例子) → MDP → 价值/策略 → TD/Q-learning → 策略梯度 → 深度 RL → RLHF → 进阶范式`

- 探索-利用:multi-armed-bandit(后悔值、ε-greedy/UCB/Thompson、梯度/上下文/对抗 bandit)✅
- MDP 与精确解:reinforcement-learning(MDP/策略/价值/Q-learning/奖励塑造/好奇心)→ dynamic-programming(贝尔曼 + 价值/策略迭代)✅
- 免模型价值法:monte-carlo(IS/Blackjack)→ temporal-difference(TD(λ)/资格迹)→ dqn(Double/Dueling/PER/分布 RL/致命三态/Rainbow/SF)✅
- 策略法:policy-gradient(REINFORCE/Actor-Critic/PPO/safe RL)→ continuous-control(DDPG/TD3/SAC)✅
- 对齐:rlhf(PPO/DPO/GRPO/RLVR + 反向 KL)✅
- 进阶(不靠逐时刻在线试错):offline-rl(分布偏移/BCQ/CQL/IQL/DT)→ imitation-learning(BC/DAgger/IRL/GAIL)→ model-based-rl(Dyna-Q/MCTS/AlphaZero/世界模型)→ hierarchical-rl(option/SMDP/option-critic)→ multi-agent-rl(随机博弈/CTDE/价值分解/minimax-Q/mean-field/通信)✅

## 缺口清单(候选新增/扩充)

**已覆盖(就地深化,不拆专篇)**:contextual bandit/LinUCB、neural bandit、actor-critic(并入 PG)、PPO/TRPO、GAE、reward shaping、credit assignment、DPO、GRPO/RLVR、self-play/AlphaZero、DQN 家族(含分布 RL/NoisyNet)、deadly triad、HER、UVF/successor features、constrained MDP/safe RL/CPO、prioritized sweeping、mean-field MARL、emergent communication、Decision Transformer。

**待补/可深化(低优先级)**:PRM 过程奖励模型独立展开、MuZero 深化、offline-to-online 微调(AWAC/IQL 衔接)、RLVR 现代实践纵深。dynamic-programming 已补异步 DP(Gauss-Seidel / 优先扫描 / RTDP,§4.5)。

> 缺口清单随每轮步骤 1 侦察滚动更新;新主题建成后从此清单移除、总览补一行。

## 维护约定

1. 新建教程:`tutorials.ts` 加条目 → 建 `page.mdx` → 本档「总览」+「缺口清单」同步 → build。
2. 重命名/调 topic:注册表 / 本档 /(必要时)文件目录三处同步。
3. **本档保持精炼(≤2000 字)**:每轮重新组织而非追加;结构无变化时只订正过时表述、更新核对时间。
4. 每轮步骤 2 核对后更新文末「最近核对时间」;结构有变则在 `rl-loop-progress.md` 当轮记一笔「结构档变更:…」。

## 最近核对时间

2026-07-11(第 5 轮:offline-rl 篇新增两个交互 viz——`ExpectileViz`(IQL 的 expectile 平衡点随 τ 从均值滑向 max)与 `DoublyRobustViz`(OPE 三估计器 DM/IPS/DR 的偏差²+方差堆叠 MSE 对比),均已注册 mdx-components,复用既有参考文献 [10]/[12]。另新建 `src/lib/mathx.ts` 抽出共享 softmax/clamp。篇目清单/topic/prev-next 无变化,注册表 14 篇 = 2 topic + 5 flat,文件系统 / 大纲档三处一致)。
