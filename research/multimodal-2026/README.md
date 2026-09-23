# 多模态与新一代开源大模型调研(2026-09-21)

> 6 篇新论文教程的事实底稿。所有数据核对自 arXiv HTML 一手来源与官方模型卡/博客。

## 1. Qwen3-VL(2025-09-23,无独立 arXiv 技术报告)
- 信源:官方博客 qwen.ai/blog?id=qwen3-vl + HF 模型卡(Qwen/Qwen3-VL-235B-A22B-Instruct/Thinking, Apache 2.0)
- 系列:2B/4B/8B/32B Dense + 30B-A3B/235B-A22B MoE,均含 Instruct 与 Thinking
- 旗舰 235B-A22B:Instruct 在多项视觉感知评测达到/超过 Gemini 2.5 Pro;Thinking 在多模态推理基准 SOTA(开源)
- 架构三点:① Interleaved-MRoPE(t/h/w 交错全频率覆盖,提升长视频理解);② DeepStack(ViT 多层特征注入 LLM 多层,替代单层注入);③ Text-Timestamp Alignment(时间戳-视频帧交错输入,替代 T-RoPE,原生支持秒与 HMS 输出)
- 能力:视觉 Agent(操作 PC/手机 GUI,OSWorld 顶尖)、视觉 Coding(图→Draw.io/HTML/CSS/JS)、2D 相对坐标 + 3D grounding、原生 256K 上下文可扩 1M、视频大海捞针 256K 100% / 1M 99.5%(约 2 小时视频)、OCR 从 10 语言扩到 32 种(39 语言测试集 32 种 >70%)
- 纯文本能力与 Qwen3-235B-A22B-2507 不相上下(预训练早期即混合文本视觉协同训练)
- 本地图:public/papers/qwen3-vl/{fig-1-arc.jpg(能力雷达), fig-2-benchmarks.jpg(Thinking 多模态基准表), fig-3-thinking-with-image.jpg(带图推理示意), fig-4-haystack.jpg(视频大海捞针)}
- 引用论文:Qwen3 TR arXiv:2505.09388、Qwen2.5-VL TR arXiv:2502.13923

## 2. InternVL3.5(arXiv:2508.18265,上海 AI Lab,2025-08)
- 系列:1B/2B/4B/8B/14B/38B Dense + 9B/12B/30B-A3B/78B-A7B/241B-A28B MoE(InternVL3.5-Flash)
- 三大创新:① Cascade RL(两阶段:离线 difficulty-driven replay + 在线 off-policy);② Visual Resolution Router(按任务动态分配视觉 token 预算);③ DvD(Decoupled Vision-Language Deployment,视觉语言解耦部署,4.05× 部署加速)
- 数字:+16% 多模态推理提升(对比 InternVL3);241B-A28B 在 OpenCompass 等综合榜超越 Qwen3-235B、GPT-5、Gemini 2.5 Pro
- 训练三阶段:原生多模态预训练 → 监督微调 → Cascade RL;沿用 ViT–MLP–LLM 架构、参数随机初始化(非从 InternVL3 继承)
- 本地图:public/papers/internvl35/{fig-1-teaser.png(能力对比), fig-2-architecture.png(架构), fig-3-training.png(训练流程), fig-4-dvd.svg(DvD), fig-5-cascade-rl.svg(Cascade RL 消融)}

## 3. DeepSeek-OCR(arXiv:2510.18234,2025-10)
- 核心概念:Contexts Optical Compression(上下文光学压缩)——OCR 不仅是识别,更是把图像信息无损压缩进文本
- 架构:DeepEncoder(SamuraiVision-S 400M + 11 层 Transformer,374M) + DeepSeek3B-MoE-A570M(总 940M);MoE 解码器 64 专家激活 6
- 关键结论:<10× 压缩 OCR 精度 97%,20× 时 60%;「deep parsing」模式输出统一 Markdown(标题/公式/化学式/几何图都能转)
- 训练:预训练 OCR 数据(2020 版生产系统蒸馏 + 400M 中文 + 690M 英文行级数据)→ deep parsing 微调(3.7M 样本)
- MIT 协议开源;定位:给 VLM 提供「压缩视觉上下文」的前置模块
- 本地图:public/papers/deepseek-ocr/{fig-2-encoders.png(常见视觉编码器对比), fig-3-architecture.png(架构), fig-4-compression.png(压缩比实验)}

## 4. UI-TARS-2(arXiv:2509.02544,字节跳动,2025-09)
- 主题:GUI Agent 的多轮强化学习(native GUI agent:截图输入 → action 输出)
- 关键设计:多轮(multi-turn)交互式 RL——整个任务轨迹(多步操作)作为训练单元,而非单步;沙箱环境(browser sandbox 容器、Android/游戏模拟器)
- 数据飞轮(Data Flywheel):self-reinforcing loop,交互式标注平台(四层架构)
- 训练动力学:reward/entropy/step-think-length 曲线;PPO 与多轮 RL 对比
- Inference-time scaling:OSWorld 与游戏基准上,推理时多次尝试 + self-critic 投票显著提升
- 基准:OSWorld、AndroidWorld、WebArena 等 GUI 基准 SOTA(开源)
- 本地图:public/papers/ui-tars-2/{fig-3-data-flywheel.png, fig-6-multiturn-rl.png, fig-11-inference-scaling.png}

## 5. Kimi K3(arXiv:2607.24653,月之暗面,2026-07)
- 「Kimi K3: Open Frontier Intelligence」;世界首个开源 3T 级:2.78T 总参/104.2B 激活;Kimi K3 License(商用需登记)
- 架构(对照 K2,Table 1):93 层(69 KDA + 24 Gated MLA);隐藏维 7168;LatentMoE 维 3584(0.5×);896 路由专家激活 16(sparsity 56);2 共享专家;96 注意力头;SiTU-GLU 激活;训练上下文 8K→64K→1M(8×);MoonViT-V2 视觉塔(401M,27 层,patch 14,12 头);词表 160K
- 三大架构创新:
  - KDA(Kimi Delta Attention):线性注意力状态 S_t = M_t S_{t-1} + β_t k_t v_t^T,M_t=(I−β_t k_t k_t^T)Diag(α_t);delta rule 在写入前先擦除;kappa log-decay 保证下界;KCP(KDA Context Parallelism)分解段效应
  - AttnRes(Attention Residuals):深度方向的注意力——每层可选择性关注所有前层表示,α_{i→l}=exp(q_l^T RMSNorm(k_i))/Σ;RMSNorm 防大层主导
  - Stable LatentMoE:shared 专家全宽 + routed 专家潜空间(3584);极端稀疏(896 选 16)带来两个失效模式(激活爆炸 + bias 平衡失灵),用 RMSNorm before up-projection + SiTU-GLU + Quantile Balancing(按 router-score 分位数设 bias,替代固定步长 sign 更新)解决
- 训练:Per-Head Muon + K2 的 weight clipping;cosine LR(1% warmup;scaling law 研究显示 cosine 优于 WSD);native multimodal(从头联合训练,非后接视觉编码器);NoPE 无显式位置编码(KDA 门控隐式编码位置,直接外推 1M);预训练 8K→64K,长上下文渐进扩展
- 后训练:SFT → RL(通用/推理/知识/agentic/coding,reasoning-effort levels {low, high, max});Reasoning Effort RL(per-problem token budget b_0(x),超 τ·b_0 罚 −1,τ 分域退火→产出 9 个专家(3 域×3 effort));multi-teacher on-policy distillation;Agentic Generative Reward Model(非可验证任务);MXFP4 量化感知后训练;partial rollout 扩展到 long-tail latency;百万 token agentic RL(persistent rollout + sandbox states)
- 基准(max effort):GPQA Diamond 93.5(Claude Fable 5 92.6 / GPT-5.6 Sol 94.1)、DeepSWE 67.5、Terminal-Bench 2.1 88.3、SWE-Marathon 42.0(Fable 5 35.0)、BrowseComp 91.2、OSWorld-Verified 84.8、OmniDocBench 91.1、Video-MME(w/ sub) 90.0;整体 trailing Claude Fable 5 / GPT-5.6 Sol,但超越其余开源与多数闭源
- scaling:K3 相对 K2 提升约 2.5× scaling efficiency
- 本地图:public/papers/kimi-k3/{fig-2-architecture.svg(架构), fig-5-quantile-balancing.svg(QB), fig-7-scaling-law.svg(扩展律), fig-9-task-synthesis.svg(KG 引导任务合成)}

## 6. MiniMax-M3(arXiv:2606.13392,2026-06)
- 「MiniMax Sparse Attention」技术报告;~428B 总参/~23B 激活;1M 上下文;原生多模态(从头混合模态训练);minimax-community 协议
- MSA(MiniMax Sparse Attention)核心:基于 GQA 的 blockwise 稀疏注意力
  - Index Branch:轻量索引分支(单 KV head 的因果注意力)对全上下文的 KV 块打分
  - 每个 GQA 组(8 个 query head)独立 Top-k 选择 KV 块
  - Main Branch:只在选中块上做精确注意力(保留 GQA 的 KV 共享与 sink)
  - 无需预训练知识,可从 checkpoint 直接继续训练(continue pre-train)
- 效率:1M 上下文下比 M2 prefill 提速 9×、decode 15×、每 token 计算降至 1/20
- 三种思考模式:thinking 参数(enabled 全思考/adaptive 自适应/禁用直答)
- 消融:learnable sink、selection recall、from-scratch vs continue-pretrain 训练动态
- 本地图:public/papers/minimax-m3/{fig-1-msa-arch.png(MSA 架构), fig-4-efficiency.svg(效率对比), fig-5-benchmarks.png(长上下文基准)}

## 站内互链建议
- Qwen3-VL ↔ /tutorials/attention(MRoPE/位置编码)、/papers/kimi-k15(多模态 RL 对照)、/papers/deepseek-v3(DeepStack 对照 MoE)
- InternVL3.5 ↔ /papers/grpo-deepseek-r1(Cascade RL)、/papers/attention-transformer
- DeepSeek-OCR ↔ /papers/deepseek-v3、/papers/deepseek-v3-2(同族)、/papers/attention-transformer
- UI-TARS-2 ↔ /tutorials/reinforcement-learning、/papers/grpo-deepseek-r1、/papers/kimi-k2(agentic 对照)
- Kimi K3 ↔ /papers/kimi-k2(直接前代)、/papers/kimi-k15、/papers/deepseek-v3-2(稀疏注意力对照 MSA/DSA)
- MiniMax-M3 ↔ /papers/deepseek-v3-2(DSA vs MSA)、/papers/attention-transformer、/papers/kimi-k2
