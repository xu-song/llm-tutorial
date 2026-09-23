# 知识蒸馏中通过「数据规模 / 数据合成 / Teacher 集成 / 训练量」让 Student 超越 Teacher

> 「student 超越 teacher」问题系列研究 · 路线三：改变训练配置（数据规模、数据合成、teacher 集成、训练量、蒸馏后再 RL），而非蒸馏机制本身。
> 本文所有结论均核对自一手来源（arXiv 原文 / 官方技术报告 / 官方 blog），无二手转述。

---

## 0. 导读：这条路线的统一逻辑

本路线的所有工作可以概括成一句话：**teacher 不是天花板，teacher 只是一个「数据/信号生成器」**。当你改变蒸馏的资源配置——更多合成数据、更多蒸馏 epoch、更强的 teacher（或 teacher 集成）、蒸馏后再 RL——student 的性能上限就不再被单个 teacher 的单次前向输出所钉死。

具体来说，这条脉络上有四个可操作变量：

1. **蒸馏数据量 $D_S$**：student 见过的 teacher 输出越多，越接近「教师分布在整个数据流形上的行为」（Distillation Scaling Laws 的核心变量）；
2. **Teacher 信号质量**：ensemble 平均多个 teacher 的预测，可以去掉个体误差、保留共同结构（Hinton 2015 的原始动机；Ba & Caruana 2014 的 ECNN）；
3. **数据本身**：teacher 生成的海量「textbook-quality」合成数据改变了 student 的学习问题，student 学的是「被 teacher 清洗/浓缩过的世界」而非原始噪声数据（Phi 系列、TinyStories、Orca）；
4. **蒸馏后训练**：蒸馏只负责「把 teacher 的推理模式注入 student」，进一步的 RL 负责突破（gpt-oss、Qwen3 的 distill + RL pipeline）。

一个贯穿全篇的统一解释框架（DSL 论文 E.7 节）：**student 超越 teacher 发生在「有限蒸馏数据区间」（finite distillation data regime）**。当 $N_S > N_T$（student 更大）且蒸馏数据充足但未饱和时，student 包含 teacher 为其假设空间中的一个函数，蒸馏在足够的数据流形上展示 teacher 的行为后，student 可以外推到 teacher 本身无法覆盖的区域——即 weak-to-strong（此处准确说是 student 大于 teacher 的强-弱蒸馏方向）泛化。但 DSL 论文同时警告：**当蒸馏 token 数足够大时，student 的交叉熵会回升，最终收敛到 teacher 的交叉熵**——student 超越 teacher 是一个「窗口」，不是无条件的。

另一个贯穿性框架来自 Lopez-Paz et al. (2016)（DSL 引用）与 GKD 论文的综述部分：蒸馏 ≈ 在 teacher 提供的软标签上做加权经验风险最小化，student 的泛化界取决于 teacher 蒸馏信号的质量。这解释了为何 teacher 集成、更强的 teacher、蒸馏后再 RL 都有效——它们都在提升「student 端可学习信号的质量」。

---

## 1. 数据规模扩展与训练量：distillation scaling laws

### 1.1 Buciluǎ et al. 2006 – Model Compression（最早的源头）

- **论文**：Model Compression. Cristian Buciluǎ, Rich Caruana, Alexandru Niculescu-Mizil (Cornell)。KDD 2006。
- **链接**：https://dl.acm.org/doi/10.1145/1150402.1150464 （PDF：https://www.cs.cornell.edu/~caruana/compression.kdd06.pdf ）
- **动机与问题设定**：当时部署学到的复杂模型（如大 ensemble）成本过高。Caruana 团队此前在 90 年代已证明「一个中等规模的单模型可以模仿大 ensemble」；2006 年这篇是第一次系统化：**train a compact model to approximate the function learned by a larger, more complex model**——通过把大量无标注数据喂给大模型收集其输出打分，用这些合成标签训练 mimic 模型。
- **核心机制**：把 ensemble 的知识压缩进单模型——"the small neural nets contained 1000 times fewer parameters, often they were just as accurate as the ensembles they were trained to mimic"（Ba & Caruana 2014 对该工作的转述）。**关键设计：mimic model 不是在原始标签上训练，而是训练去拟合大模型学到的函数。**
- **student 超越 teacher 的证据**：这篇论文的定位更接近「保平」——压缩后的单模型达到与 ensemble 相当的精度。但在实践中发现的更重要的是下一个发现（由 Ba & Caruana 2014 明确化）：**"model compression works best when the unlabeled set is much larger than the train set"**（合成数据规模决定 mimic 效果）。这是「数据规模 → student 表现」的最早表述。

### 1.2 Ba & Caruana 2014 – Do Deep Nets Really Need to Be Deep?

- **论文**：Do Deep Nets Really Need to Be Deep?. Lei Jimmy Ba (Toronto), Rich Caruana (Microsoft Research). NIPS 2014 Deep Learning Workshop（arXiv:1312.6184，2013 年 12 月首挂）。
- **链接**：https://arxiv.org/abs/1312.6184
- **研究动机与问题设定**：挑战「深度是必需的」这一共识。开场设定极其具体："You are given a training set with 1M labeled points. When you train a shallow neural net ... you obtain 86% accuracy ... When you train a deeper neural net ... you obtain 91% accuracy"（86% vs 91%）。
- **方法细节**：蒸馏目标不是 softmax 概率，而是 **logits 上的 L2 回归**（"we train the shallow mimic models ... instead of being trained with cross-entropy on the 183 p values ... regress on logits z"）。teacher 是 **ECNN：9 个深 CNN 的 ensemble**（"We used this very accurate model, ECNN, as the teacher model to label the data used to train the shallow mimic nets ... the logits (log probability of the predicted values) from each CNN in the ECNN model are averaged"）。
- **实验设置与具体数字（TIMIT 音素识别，核心表 Table 1）**：

| 模型 | 参数量 | PER (test) |
|---|---|---|
| SNN-8k（浅层，原始数据） | ~12M | 23.1% |
| SNN-400k（浅层，原始数据） | ~180M | 23.6% |
| DNN 2k-2k-2k（深） | ~12M | 21.9% |
| CNN（深） | ~13M | 19.5% |
| **ECNN（9-CNN ensemble, teacher）** | ~125M | **18.5%** |
| **SNN-MIMIC-8k（浅层 mimic，~12M 参数）** | ~12M | **21.6%** |
| **SNN-MIMIC-400k（浅层 mimic，无卷积/池化）** | ~180M | **20.0%** |

  - 单隐藏层的 SNN-MIMIC-8k 追平了同参数量级的 DNN（21.6% vs 21.9%）；SNN-MIMIC-400k 达到 CNN 的水平（20.0% vs 19.5%），且**没有卷积与池化层**。
  - 反直觉发现："We see little evidence that shallow models have limited capacity or representational power. Instead, the main limitation appears to be the learning and regularization procedures used to train the shallow models."（浅层网络缺的不是容量，而是好的学习/正则化算法。）
- **数据规模的机制**：本文脚注/正文明确指出压缩效果的边界："model compression works best when the unlabeled set is much larger than the train set, and when the unlabeled samples do not fall on train points where the teacher model is more likely to have overfit"（合成数据需要比训练集大得多、且避开 teacher 过拟合的点）。**「student 用更多（合成）数据训练可超越仅用原始数据的浅层基线」的最早系统表述即在此**。
- **局限与批评**：作者自陈 "final revision coming soon"（arXiv comment），为 workshop 论文；蒸馏进浅层网络仅在 TIMIT/CIFAR-10 上验证，未触及 NLP 或更广任务；且其 shallow mimic 未超过 deep teacher 本身（只是追平 CNN、明显超过浅层基线），「超越 teacher」在这篇里体现为「超越浅层原始训练基线 + 追平深模型」。
- **后续工作脉络**：Hinton 2015（软标签 + 温度，在更广任务上压缩 ensemble）→ FitNets → BANs（2018，同架构自蒸馏超越）→ LLM 时代 Distillation Scaling Laws（2025）。

### 1.3 Distillation Scaling Laws (Busbridge et al., Apple, ICML 2025)

- **论文**：Distillation Scaling Laws. Dan Busbridge, Amitis Shidani (Oxford, intern), Floris Weers, Jason Ramapuram, Etai Littwin, Russ Webb (Apple). ICML 2025（69 页，54 图）。
- **链接**：https://arxiv.org/abs/2502.08606
- **研究动机与问题设定**：此前的共识来自 supervised scaling laws（Kaplan 2020 / Chinchilla / Hoffmann 2022）：给定算力，存在最优的模型规模/数据量配置。但**蒸馏没有一个可预测的理论**——什么时候该蒸馏、teacher 该多大、蒸馏数据该多少？此前的实证共识（如「capacity gap」诅咒：teacher 越大不一定 student 越好）只有零散经验。这篇论文要给蒸馏建立 Chinchilla 级别的可预测性。
- **方法细节（核心公式）**：
  - 蒸馏的目标量是 student 的验证交叉熵 $L_S$，它由 student 规模 $N_S$、蒸馏数据量 $D_S$ 与 teacher 质量 $L_T$ 决定：$L_S \approx L_S(N_S, D_S, L_T)$。关键简化：**teacher 的影响只通过其交叉熵 $L_T = L_T(N_T, D_T)$ 进入**（论文发现 2）。
  - **Distillation Scaling Law（Equation 8，LaTeX 原文）**：

$$
L_{S}(N_{S},D_{S},L_{T})=L_{T}+\frac{1}{L_{T}^{c_{0}}}\left(1+\left(\frac{L_{T}}{\widetilde{L}_{S}d_{1}}\right)^{1/f_{1}}\right)^{-c_{1}f_{1}}\left(\frac{A^{\prime}}{N_{S}^{\alpha^{\prime}}}+\frac{B^{\prime}}{D_{S}^{\beta^{\prime}}}\right)^{\gamma^{\prime}}
$$

  其中 $\widetilde{L}_{S} = L(N_S, D_S)$ 是同尺寸 student 用监督学习能到达的交叉熵（Chinchilla 形式 $L(N,D)=E+(A/N^{\alpha}+B/D^{\beta})^{\gamma}$ 的监督基线）。结构解读：第一项 $L_T$ 是「student 的下界由 teacher 决定」；第二项是「student 模仿 teacher 的能力」，由 student 容量项 $\frac{A'}{N_S^{\alpha'}}$、蒸馏数据项 $\frac{B'}{D_S^{\beta'}}$、以及一个随 $L_T$ 变化的 capacity-gap 修正（$\left(1+(L_T/(\widetilde{L}_S d_1))^{1/f_1}\right)^{-c_1 f_1}$）构成。
  - **Compute-optimal 配置（Equation 10）**：

$$
D_{S}^{*},N_{T}^{*},D_{T}^{*}=\operatorname*{argmin}_{D_{S},N_{T},D_{T}}L_{S}(N_{S},D_{S},N_{T},D_{T})\quad\mathrm{s.t.}\quad\mathrm{FLOPs}=C
$$

  FLOPs 会计（Equation 9）区分四种场景（best case 只算 student 训练、teacher 推理成本 $\delta_T^{\mathrm{Lgt}}$、teacher 预训练成本 $\delta_T^{\mathrm{Pre}}$）：

$$
\mathrm{FLOPs}\approx 3F(N_{S})D_{S}+F(N_{T})(\delta_{T}^{\mathrm{Lgt}}D_{S}+\delta_{T}^{\mathrm{Pre}}\cdot 3D_{T})
$$

- **实验设置**：在 LM 上做大规模 IsoFLOP 网格（teacher 和 student 各自的规模×数据量扫描），拟合上述 scaling law 并外推验证。
- **student 超越 teacher 的关键证据**：
  1. "As shown, a student can also outperform its teacher (see Figures 2, 3, and 41)." —— 且给出发生条件："for weaker teachers ($N_T \le 2.72B$), for students larger than the teacher ($N_S > N_T$) and for sufficiently large compute budgets, the student is able to outperform the teacher"。论文把这称为 weak-to-strong 泛化（引用 Burns et al. 2024）。
  2. **反直觉发现**：student 超越 teacher **只发生在有限蒸馏数据区间**——"Strong-to-weak generalization occurs ... only in the finite distillation data regime, and when the number of tokens is sufficiently large, the student cross-entropy increases again, eventually matching the teacher cross-entropy."。机制解释：i) student 更大时，teacher 的函数包含在 student 的假设空间里；ii) student 在足够多的数据流形上看到 teacher 的输出后，最终在**整个**数据流形上复现 teacher 的行为（包括 teacher 的错误），于是失去超越。**这是一个「窗口」而非「永久超越」**。
  3. 另一个反直觉结论：**蒸馏优于监督学习只发生在「弱 student」+「强 teacher」的特定配置**。"Supervised learning always outperforms distillation given enough student compute or tokens"（无限数据下蒸馏无法超越最优监督学习——因为监督学习能找到 model size 允许的最优解，蒸馏则受限于 teacher 信号 $L_T^*$）；但在 teacher 已存在或要蒸馏很多 student 的场景，"distillation outperforms supervised learning up to a compute level that scales predictably with student size"。
  4. **Capacity gap 的定量化**：确认了「curse of capacity gap」——teacher 存在最优规模 $N_T^*$（student 表现对 teacher 规模呈 U 型），且 "As a result, there exists an optimal teacher size along the scaling trajectory that maximizes student performance."。capacity gap 不仅取决于 teacher 大小，还取决于其训练量。
  5. 与 Beyer et al. 2022（patient teacher）表面矛盾的处理（D.1 节）：DSL 的设置自动满足 consistency（无数据增广），二者不矛盾，主因是监督基线不同。
- **局限与批评（论文自陈 + 我方分析）**：scaling law 的系数不是 universal 的（"the coefficients we observe are specific to our architecture and dataset choices and are not guaranteed to generalize"）；只在 cross-entropy 与少量下游指标上拟合；teacher 与 student 的 domain gap 未建模。
- **后续工作脉络**：DeepSeek-R1 论文直接引用 Busbridge et al. 2025 支撑其蒸馏选择（"corroborating prior findings on the efficacy of distillation"）；工业界蒸馏管线（Qwen3、gpt-oss）与本文结论方向一致（蒸馏 + 可选 RL）。

### 1.4 Born-Again Networks（同配置训练量路线的早期证据）

- **论文**：Born Again Neural Networks. Tommaso Furlanello, Zachary C. Lipton, Michael Tschannen, Laurent Itti, Anima Anandkumar. ICML 2018。
- **链接**：https://arxiv.org/abs/1805.04770
- **动机**：此前的共识是 KD 用于「压缩」——teacher 大、student 小。这篇挑战设定：**student 与 teacher 参数完全相同**会怎样？
- **机制**：从随机初始化重新训练（born-again），用 teacher 的软标签监督。
- **关键证据**：摘要原话——"Surprisingly, these Born-Again Networks (BANs), outperform their teachers significantly, both on computer vision and language modeling tasks. Our experiments with BANs based on DenseNets demonstrate state-of-the-art performance on the CIFAR-10 (3.5%) and CIFAR-100 (15.5%) datasets, by validation error."。**这里不涉及数据规模或 ensemble，纯粹「再训练一轮」就超越 teacher**——说明「改变训练配置（重新初始化 + 蒸馏）」本身即可以让 student 超越 teacher，是「训练量路线」的最干净证据。
- **局限**：student 容量与 teacher 相同，不回答压缩问题；主要在 CV 与语言建模上验证。

---

## 2. Teacher 集成路线：ensemble → 单模型

### 2.1 Hinton, Vinyals & Dean 2015 – Distilling the Knowledge in a Neural Network

- **论文**：Distilling the Knowledge in a Neural Network. Geoffrey Hinton, Oriol Vinyals, Jeff Dean (Google). NIPS 2014 Deep Learning Workshop。
- **链接**：https://arxiv.org/abs/1503.02531
- **研究动机与问题设定**：开篇即点明 ensemble 视角："A very simple way to improve the performance of almost any machine learning algorithm is to train many different models on the same data and then to average their predictions. Unfortunately, making predictions using a whole ensemble ... is cumbersome ... Caruana and his collaborators have shown that it is possible to compress the knowledge in an ensemble into a single model"——本文把 Caruana 系工作（Buciluǎ 2006 / Ba & Caruana 2014）推广为温度软标签蒸馏。
- **方法细节**：蒸馏损失 $\mathcal{L} = T^2 \, \mathrm{KL}(q_T \| p_T^{\text{student}}) + \text{CE}(\text{hard labels})$（软目标在温度 $T$ 下产生，$T^2$ 因子补偿梯度量级；实验中 $T \in \{1, 2, 5, 10\}$，最优 $T=2$，硬目标权重 0.5）。软标签相对于 hard 标签多出的信息即 "dark knowledge"——类间相似度的结构。
- **实验设置与具体数字**：
  - **MNIST（Section 3 preliminary）**：大 ensemble teacher（权重共享的指数级 ensemble + 2-pixel jitter）达到 **67 test errors**；无正则小网络 146 errors；**小网络仅用软目标正则（T=20）即达 74 errors**——"soft targets can transfer a great deal of knowledge to the distilled model"。
  - **ASR（Section 4，Google 语音搜索声学模型，~2000 小时英语，700M 训练样本）**：训练 10 个独立同架构模型做 ensemble。Table 1 结论原话："**the distilled single model performs about as well as the averaged predictions of 10 models** that were used to create the soft targets"；且 "**More than 80% of the improvement in frame classification accuracy achieved by using an ensemble of 10 models is transferred to the distilled model**"。基线单模型 frame accuracy 58.9% / WER 10.9%，蒸馏单模型基本复现 10-model ensemble 的增益。
  - **JFT（Section 5，specialist ensemble）**：generalist + specialists 蒸馏，把 ensemble 部署成本压缩进单模型。
- **student 超越 teacher 的关键证据**：注意这里的 teacher 是「单模型」，而蒸馏源是 ensemble：
  1. distilled 单模型 ≈ 10-model ensemble（ASR）＞ 任何单个 teacher 成员；
  2. MNIST 上 74 vs 146 errors——**软标签正则的小网络大幅超越同一架构硬标签训练的自己**（即 Born-Again 现象的前身）。
- **反直觉发现**："We achieve some surprising results on MNIST"——蒸馏出的单模型可以超过生成软目标的任何单个模型（as well as a much larger ensemble 在某些设置下）。
- **局限与批评**：MNIST 结果是 "preliminary experiments"（正文未给完整表）；ASR 的 WER 增益小于 frame accuracy 增益（目标失配）；论文为 workshop 论文（4 页正文 + 附录）。
- **后续工作脉络**：ensemble distillation 成为独立方向（"Distilling Ensembles" / multi-teacher KD 综述见后续）；「软标签作为正则化器」的视角后来被 BAN 与 label smoothing 文献深化。

### 2.2 该路线的现代表述：teacher 集成为什么有效

Hinton 论文中的理论视角（Section 7）值得单独强调，因为它直接解释「student 超越单个 teacher」：ensemble 平均相当于在 logit 空间对多个模型的预测取（几何）平均，去除了各成员的独立误差，保留了共同的结构性知识。当 student 用软标签训练时，它拟合的是这个「去噪后的目标函数」，因而可以超过任何单个成员。Ba & Caruana 的 ECNN（9 个 CNN 的 logit 平均）与 Distillation Scaling Laws 中「更强 teacher 信号（更低的 $L_T$）产生更强 student」是同一逻辑的定量化。

---

## 3. 合成数据视角：student 学的是「teacher 清洗过的世界」

### 3.1 TinyStories (Eldan & Li, Microsoft, 2023)

- **论文**：TinyStories: How Small Can Language Models Be and Still Speak Coherent English?. Ronen Eldan, Yuanzhi Li. 2023。
- **链接**：https://arxiv.org/abs/2305.07759
- **动机与问题设定**：挑战「连贯英语需要大模型+全局注意力」的共识——GPT-Neo small / GPT-2 small（125M）"can rarely generate coherent and consistent English text beyond a few words even after extensive training"。
- **方法**：用 GPT-3.5 和 GPT-4 生成**仅含 3-4 岁儿童词汇的短故事**（合成数据），在合成数据上训练小模型。
- **关键证据**：**10M 参数以下**（低于 GPT-2 small 的 1/10）或**只有一个 transformer block** 的模型即可产出流畅、多样、语法几近完美的故事，并展现推理能力。同时提出用 GPT-4 评估的 new evaluation paradigm（点击模型与内容一致性）。
- **student 超越 teacher 的关键证据**：这里 teacher 是 GPT-3.5/GPT-4，student 是 10M 小模型——**超越体现在「同尺寸对比」**：同尺寸模型在自然数据上训练无法产出连贯文本，而在 teacher 生成的合成数据上训练可以；且小模型在受限领域（简单故事）的流畅度可以接近大模型在该领域的表现。严格说这不是「student 超过 teacher 本身的基准分」，而是「teacher 的合成数据让 student 突破了同尺寸自然数据训练的性能天花板」。
- **后续**：直接催生 Phi 系列（同一批作者）。

### 3.2 Phi 系列（Microsoft，Textbooks Are All You Need / phi-1.5 / Phi-2 / Phi-3）

- **phi-1**：Textbooks Are All You Need. Suriya Gunasekar, Yi Zhang, Jyoti Aneja, ... Yejin Choi (Microsoft)。2023。https://arxiv.org/abs/2306.11644
  - **设定**：1.3B 代码模型，训练 4 天（8×A100）。数据 = 6B tokens 精选「textbook-quality」网络数据 + **1B tokens GPT-3.5 生成的合成教科书与习题**。
  - **关键数字**：HumanEval pass@1 **50.6%**、MBPP **55.5%**。"Despite this small scale, phi-1 attains pass@1 accuracy 50.6% on HumanEval and 55.5% on MBPP"（摘要原文）——摘要定性为 "significantly smaller size than competing models"；论文对比表中 phi-1 超过了多个数倍于它的开源代码模型（如 3B/7B/15B 级），是「小模型胜大模型」的标志性案例。phi-1-small（350M）也达 45%。
  - **反直觉**：能力主要来自数据质量而非规模或架构——训练只用了 8×A100 四天，6B 精选网络数据 + 1B 合成数据。
- **phi-1.5**：Textbooks Are All You Need II. Yuanzhi Li, Sébastien Bubeck, Ronen Eldan, ... 2023。https://arxiv.org/abs/2309.05463
  - **关键声明**：1.3B 参数，"with performance on natural language tasks comparable to models 5x larger, and surpassing most non-frontier LLMs on more complex reasoning tasks such as grade-school mathematics and basic coding"。数据完全是合成的（phi-1 教科书方法推广到常识推理）。
- **Phi-2**：Phi-2: The surprising power of small language models (Microsoft blog, 2023-12)。https://www.microsoft.com/en-us/research/blog/phi-2-the-surprising-power-of-small-language-models/
  - **关键声明**：2.7B 参数，"On complex benchmarks Phi-2 matches or outperforms models up to 25x larger"。"With only 2.7 billion parameters, Phi-2 surpasses the performance of Mistral and Llama-2 models at 7B and 13B parameters ... Notably, it achieves better performance compared to 25x larger Llama-2-70B model on multi-step reasoning tasks, i.e., coding and math."（在多步推理任务上超过 25 倍大的 Llama-2-70B。）Phi-2 没有单独的 arXiv 论文，只有官方 blog。
- **Phi-3**：Phi-3 Technical Report. Marah Abdin et al. (Microsoft)。2024。https://arxiv.org/abs/2404.14219
  - **设定**：phi-3-mini 3.8B，3.3T tokens（大规模过滤网络数据 + 合成数据）。"whose overall performance ... rivals that of models such as Mixtral 8x7B and GPT-3.5 (e.g., phi-3-mini achieves 69% on MMLU and 8.3 on MT-bench), despite being small enough to be deployed on a phone"。
  - **注意**：Phi-3 的措辞是 "rivals"（比肩）GPT-3.5/Mixtral 8x7B，不是全面超越；论文也坦承 eval 泄漏与内部测试的差异。phi-3-small (7B)/phi-3-medium (14B) 分别 MMLU 75%/78%。
- **共性机制**：student 在 teacher（GPT-3.5/4）生成的「textbook-quality」数据上训练。这里的「teacher」不是逐 token 蒸馏的 teacher，而是**数据合成器**。student 超越的对象是「同尺寸或更大尺寸的自然数据模型」。
- **批评**：Phi 系列的 benchmark 声明长期被质疑测试集污染。Phi-2 blog 自己承认："we acknowledge the current challenges with model evaluation, and that many public benchmarks might leak into the training data"（但声称做了 decontamination）。Phi-3 报告更谨慎地指出学术基准与内部测试的 gap，MMLU 69% vs 内部评估的差距（"However, the model's ability on our internally designed benchmarks that do not appear in training data in any form... reveals a reduction in performance"——即真实差距比公开基准显示的更大）。
- **后续**：Phi-3.5 系列（+MoE/Vision）、Phi-4 (2024) 进一步沿用「合成数据为主」配方。

### 3.3 Orca (Microsoft, 2023)：解释痕迹蒸馏

- **论文**：Orca: Progressive Learning from Complex Explanation Traces of GPT-4. Subhabrata Mukherjee, Arindam Mitra, Ganesh Jawahar, Sahaj Agarwal, Hamid Palangi, Arindam Chakraborty. 2023。https://arxiv.org/abs/2306.02707
- **动机**：批评此前的 imitation learning（如 Alpaca）只学到 LFM 的「风格」而非「推理过程」（"they tend to learn to imitate the style, but not the reasoning process of LFMs"），且数据规模小、同质化、评估不严格。
- **方法**：13B 模型从 GPT-4 学**解释痕迹（explanation traces）+ 逐步思维 + 复杂指令**，以 ChatGPT 作为 teacher assistance；"large-scale and diverse imitation data with judicious sampling and selection"。
- **关键数字**：**超过 Vicuna-13B 超过 100%（BBH）与 42%（AGIEval）**——"Orca surpasses conventional state-of-the-art instruction-tuned models such as Vicuna-13B by more than 100% in complex zero-shot reasoning benchmarks like Big-Bench Hard (BBH) and 42% on AGIEval. Moreover, Orca reaches parity with ChatGPT on the BBH benchmark"。即 13B student 在 BBH 上追平 ChatGPT（teacher 辈模型）、大幅超越同尺寸 instruction-tuned 基线。
- **局限**：论文自身即引入了更严格的评估（profession/academic exams）并承认 "while trailing behind GPT-4"；后续第三方评测也发现其在真实考试题上的差距回摆。
- **后续**：Orca-2 (2023, 谨慎推理 Reasoning in a small model)。

### 3.4 经典压缩案例：DistilBERT / TinyBERT / MobileBERT（student 逼近 teacher 的实证）

这三篇是 BERT 时代「student 逼近（局部超越）teacher」的标准引用，覆盖了「训练量与数据配比」路线的 BERT 实证：

- **DistilBERT**：DistilBERT, a distilled version of BERT: smaller, faster, cheaper and lighter. Victor Sanh, Lysandre Debut, Julien Chaumond, Thomas Wolf (Hugging Face). NeurIPS 2019 ENLSP workshop。https://arxiv.org/abs/1910.01108
  - **机制**：三重损失 = LM loss + **KD loss（token 级软标签）** + cosine embedding loss；在**预训练阶段**做蒸馏（而非仅下游任务）。
  - **数字**：**缩小 40%、保留 97% BERT 的语言理解能力、快 60%**。"While most prior work investigated the use of distillation for building task-specific models, we leverage knowledge distillation during the pre-training phase and show that it is possible to reduce the size of a BERT model by 40%, while retaining 97% of its language understanding capabilities and being 60% faster."
  - 定位是「逼近」不是超越：GLUE 平均保留 97%，个别任务（如 IMDb 情感）学生打平甚至略超。
- **TinyBERT**：TinyBERT: Distilling BERT for Natural Language Understanding. Xiaoqi Jiao, Yichun Yin, Lifeng Shang, Xin Jiang, Xiao Chen, Yunfang Wu (Huawei)。Findings of EMNLP 2020。arXiv:1909.10351。https://arxiv.org/abs/1909.10351
  - **机制**：Transformer-layer 蒸馏（attention matrices + hidden states 的 MSE）+ two-stage（预训练蒸馏 + 任务蒸馏，任务蒸馏阶段配合数据增强）。attention 矩阵的分布作为暗知识。
  - **数字（摘要原文）**：4 层 TinyBERT "**achieves more than 96.8% the performance of its teacher BERT_BASE on GLUE benchmark, while being 7.5x smaller and 9.4x faster on inference**"；且 "**TinyBERT with 6 layers performs on-par with its teacher BERT_BASE**"。
  - 定位：TinyBERT 的结果是「逼近 + 追平」（6 层 on-par），超越发生在对同尺寸基线的对比上（"significantly better than 4-layer state-of-the-art baselines ... with only about 28% parameters"）。
- **MobileBERT**：MobileBERT: a Compact Task-Agnostic BERT for Resource-Limited Devices. Zhiqing Sun, Hongkun Yu, Xiaodan Song, Renjie Liu, Yiming Yang, Denny Zhou (Google)。ACL 2020。https://arxiv.org/abs/2004.02984  - **机制**：先训一个**专门设计的 teacher（IB-BERT，inverted-bottleneck BERT_LARGE）**，再向 thin student 转移；bottleneck 结构平衡 self-attention 与 FFN。
  - **数字**：**比 BERT_BASE 小 4.3×、快 5.5×，GLUE 77.7（仅低 0.6）**；**SQuAD v1.1/v2.0 dev F1 = 90.0/79.2，比 BERT_BASE 高 1.5/2.1**——这是「student 在下游任务上明确超越 teacher（BERT_BASE）」的干净实证："On the SQuAD v1.1/v2.0 question answering task, MobileBERT achieves a dev F1 score of 90.0/79.2 (1.5/2.1 higher than BERT_BASE)."

> 提示：BERT 时代「student 超越 teacher」的高频引用其实来自 KD + data augmentation 的组合（TinyBERT 的 two-stage）与 specialized teacher（MobileBERT 的 IB-BERT）——都属「改变训练配置」路线。

---

## 4. Reverse KL / mode-seeking 蒸馏与 on-policy 蒸馏

### 4.1 GKD – On-Policy Distillation of Language Models (Agarwal et al., Google DeepMind, ICLR 2024)

- **论文**：On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes. Rishabh Agarwal, Nino Vieillard, Yongchao Zhou, Piotr Stanczyk, Sabela Ramos, Matthieu Geist, Olivier Bachem (Google DeepMind)。ICLR 2024。
- **链接**：https://arxiv.org/abs/2306.13649
- **研究动机与问题设定**：挑战「KD 只能拟合 teacher 在固定数据集上的分布」的默认设定。两个共识被挑战：(1) supervised KD 在 teacher 输出序列上训练，但 student 推理时面对自己生成的序列——存在 **train-inference distribution mismatch**（exposure bias 的蒸馏版）；(2) 标准 KD 用 forward KL，但 student 容量不足时 forward KL 是 mean-seeking（质量守恒式地覆盖所有模式，导致在 teacher 低概率区域分配质量 → 幻觉/低质量生成）。
- **方法细节（统一框架）**：GKD (Generalized Knowledge Distillation) 的损失：

$$
\mathcal{L}(\theta) = \mathbb{E}_{x \sim \mathcal{D},\, y \sim q_\theta^{(\lambda)}(\cdot|x)}\left[ D_f\!\left( p_T(\cdot|x, y_{<n}) \,\Big\|\, q_\theta(\cdot|x, y_{<n}) \right) \right]
$$

  - $D_f$ 可为 forward KL、**reverse KL**、**generalized JSD**。generalized JSD 的定义（论文 Eq. 1）：

$$
D_{\mathrm{JSD}}^{(\beta)}(P \| Q) = \beta\, D_{\mathrm{KL}}\!\left( P \,\middle\|\, \tfrac{\beta P + (1-\beta) Q}{1} \right) + (1-\beta)\, D_{\mathrm{KL}}\!\left( Q \,\middle\|\, \tfrac{\beta P + (1-\beta) Q}{1} \right)
$$

  （更精确的原文形式：$D_{\mathrm{JSD}}^{(\beta)}(P\|Q)=\beta D_{\mathrm{KL}}\left(P\middle\|\beta P+(1-\beta)Q\right)+(1-\beta)D_{\mathrm{KL}}\left(Q\middle\|\beta P+(1-\beta)Q\right)$，且 $\lim_{\beta\to 0} D_{\mathrm{JSD}}^{(\beta)}(P\|Q)/\beta = D_{\mathrm{KL}}(P\|Q)$——$\beta$ 在 0 附近行为像 forward KL，在 1 附近像 reverse KL。）
  - **数据源混合系数 $\lambda$**：$y \sim q_\theta^{(\lambda)}$，$\lambda=1$ 为完全 on-policy（student 自生成序列），$\lambda=0$ 为 teacher/固定数据集序列。on-policy 数据由 teacher 的 token 级概率给出反馈（f-divergence 的 per-token 分解）。
  - **mode-seeking 的数学**：当 student 容量不足以表达 teacher 分布时，最小化 $D_{\mathrm{KL}}(Q\|P)$（reverse）使 $Q$ 集中质量于 $P$ 的大模式、忽略小模式——"minimizing the reverse and forward KL results in mean and mode-seeking behavior"。mode-seeking 在温度采样评估下表现更好（质量优先），forward KL 保留多样性。
  - **IS 修正/与 RL 的无缝衔接**：GKD 可以与 RLHF 结合（蒸馏与 RL 联合优化），因为 on-policy 序列上的 f-divergence 梯度与 policy gradient 同构（文中用 student-generated data + teacher 反馈替代 reward model）。论文没有独立的 "importance sampling correction" 术语，其 IS 结构隐含在 on-policy 期望与 per-token 分解中（这与 MiniLLM 的 policy gradient 推导同构，见 4.2）。
- **实验设置**：任务特定蒸馏（summarization/XSum, WMT MT, GSM8K arith）+ 任务无关蒸馏（instruction tuning, FLAN）。teacher：T5-XL (~3B)、FLAN-T5 等；student：T5-small/large 等。baselines：Supervised KD、ImitKD、f-distill、SeqKD。
- **student 超越 teacher 的关键证据**：
  1. **"GKD allows us to surpass the few-shot performance of PaLM (540B) using a 7000× smaller T5 model"**（arithmetic reasoning/GSM8K 场景）——7000 倍小的 student 超过 PaLM 540B 的 few-shot 性能。注意：PaLM 并非其直接 teacher，但这是本路线「student 超越更大模型」被引用最多的数字。
  2. **Self-distillation 超越 teacher 本身**："we consider self-distillation on GSM8K with FLAN-T5 large as the student and teacher ... As shown in Figure A.11, **self-distilled students surpass the teacher's performance on the test set**. Moreover, distillation using student-generated data outperforms supervised KD, with on-policy GKD performing the best."——同尺寸 student 蒸馏后超过 teacher。
  3. 相对增益：on-policy GKD 相对初始 student 的增益（跨 T5 sizes 平均）为 **summarization 2.1×、MT 1.7×、arithmetic reasoning 1.9×**（相比基线方法带来的提升）。
  4. **数据效率（数据规模路线的直接证据）**："on-policy GKD on the 5% subsampled dataset, without any ground-truth summaries, outperforms supervised KD and ImitKD with the entire training dataset with ground-truth summaries."——**5% 数据（且无真实标签）的 GKD > 100% 数据的 supervised KD**。
- **反直觉发现**：最优散度是任务相关的（"Our experiments indicate that optimal divergence seems to be task-dependent"）；mode-seeking 散度在温度采样（γ=1）评估时更好、greedy 采样时各散度差异不大；on-policy 并非在所有任务上最优（MT 任务上 mixed 更好）。
- **局限与批评**：主要在 T5 家族与 3B 级 teacher 上验证，未覆盖 decoder-only 巨型 teacher；on-policy 需要不断调用 teacher 打分，成本高；与 RL 的组合是概念演示（Figure 5）。
- **后续工作脉络**：MiniLLM (2023) 奠定 reverse KL + policy gradient（见下）；f-DISTILL (ACL 2023) 统一 f-divergence 框架；2024-25 年 on-policy distillation 成为小模型后训练标配（Qwen3 strong-to-weak distillation 的 on-policy 阶段即同构）。

### 4.2 MiniLLM (Gu et al., ICLR 2024)：reverse KL 的正式推导

- **论文**：MiniLLM: Knowledge Distillation of Large Language Models. Yuxian Gu, Li Dong, Furu Wei, Minlie Huang (Tsinghua, MSR)。ICLR 2024。（arXiv 题目后来改为 "MiniLLM: On-Policy Distillation of Large Language Models"。）
- **链接**：https://arxiv.org/abs/2306.08543
- **动机**：标准 KD 最小化 forward KL $D_{\mathrm{KL}}(p\|q_\theta) = \mathbb{E}_{x\sim p_x, y\sim p} \log\frac{p(y|x)}{q_\theta(y|x)}$，当 $q_\theta$ 表达力不足时会「overestimate the void regions of $p$」——在 teacher 低概率区域分配质量，自由生成时产出 teacher 认为不可能的样本。
- **方法细节（关键公式）**：MiniLLM 目标为 **reverse KLD**：

$$
\theta^* = \arg\min_\theta \mathcal{L}(\theta) = \arg\min_\theta \mathrm{KL}[q_\theta \| p] = -\mathbb{E}_{x\sim p_x,\, y\sim q_\theta}\left[ \log \frac{p(y|x)}{q_\theta(y|x)} \right]
$$

  （注意论文 Eq. 1 的期望内是 $\log \frac{p(y|x)}{q_\theta(y|x)}$，带负号对应最小化。）
  - **mode-seeking 数学**：用单 Gaussians 拟合 Gaussians mixture 的 toy 实验（Figure 2）展示 forward KLD 覆盖所有 modes（包括低概率区域）、reverse KLD 集中于主 mode。引用 Huszár 2015 等。$q_\theta$ 给 $p$ 的大 modes 高概率、忽略小 modes。
  - **policy gradient 优化（IS 结构所在）**：由于 $y \sim q_\theta$，梯度用 Policy Gradient Theorem 推导（论文 Eq. 2）：

$$
\nabla\mathcal{L}(\theta) = -\mathbb{E}_{x\sim p_x,\, y\sim q_\theta(\cdot|x)}\left[ \sum_{t=1}^{T} (R_t - 1)\, \nabla\log q_\theta(y_t|y_{<t},x) \right]
$$

  其中 $R_t = \prod_{t'=t}^{T} \frac{p(y_{t'}|y_{<t'},x)}{q_\theta(y_{t'}|y_{<t'},x)}$（论文写作 $R_t = \prod_{t' \ge t} \log \frac{p(y_{t'}|\cdot)}{q_\theta(y_{t'}|\cdot)}$ 的连乘比——原文为 $r_{t'} = \log\frac{p}{q_\theta}$ 的指数和形式，本质是 teacher/student 概率比）。**这正是 importance sampling 权重（teacher/student 比值）在 on-policy 期望中的角色**：期望在 student 分布上取，但每个 student 样本由 teacher 与 student 的似然比加权——这就是「用 student 自己生成的数据、由 teacher 打分」的数学形式。
  - 稳定化三件套：single-step decomposition（降方差）、teacher-mixed sampling（缓解 reward hacking）、length normalization（消除长度偏好）。
- **实验设置**：instruction following（Dolly, SelfInstruct 等 5 数据集），teacher: GPT-2-1.5B / GPT-J 6B / OPT-13B；student: 120M–13B。评估：Rouge-L、GPT-4 feedback、human eval。
- **关键证据**：MiniLLM 在几乎所有设置下超过 SeqKD/FKD 等基线，"MiniLLM generates more precise responses with higher overall quality, lower exposure bias, better calibration, and higher long-text generation performance"。
- **student 超越 teacher**：论文 Table 1 中「student 超越 teacher 的分数用 * 标注」，如 **GPT-2-760M student 从 GPT-2-1.5B 蒸馏后在 GPT4 score 上打平/超过 teacher（35.5 vs 40.2*）**等（不同数据集若干个 * 号项）。这是「student 超越 teacher」的直接表格证据。
- **局限**：需要 on-policy 采样 + teacher 打分，训练成本高于 SeqKD；主要在 GPT-2/OPT 级别模型验证。
- **后续**：GKD、f-DISTILL、以及 2024 年后的 reverse-KL-on-policy 家族；Qwen3 on-policy distillation 生产化。

### 4.3 f-DISTILL (Wen et al., ACL 2023)

- **论文**：f-Divergence Minimization for Sequence-Level Knowledge Distillation. Yuqiao Wen, Zichao Li, Wenyu Du, Lili Mou。ACL 2023。https://arxiv.org/abs/2307.15190
- **方法**：把序列级 KD 统一表述为最小化广义 f-divergence，提出四个蒸馏变体，证明 SeqKD 与 ENGINE 是其特例（approximation）。推导 step-wise decomposition 把不可解的序列级散度约化为可计算的 word-level 损失。
- **关键声明**：跨四个数据集 "our methods outperform existing KD approaches, and that our symmetric distilling losses can better force the student to learn from the teacher distribution"。
- **意义**：为「散度选择」路线提供了系统框架（forward/reverse/symmetric），是 GKD 与 MiniLLM 的同期同构工作。

### 4.4 Kim & Rush 2016 – SeqKD（序列级蒸馏的起点，student 更快且更准）

- **论文**：Sequence-Level Knowledge Distillation. Yoon Kim, Alexander M. Rush (Harvard)。EMNLP 2016。
- **链接**：https://arxiv.org/abs/1606.07947
- **动机**：NMT 模型需要极大容量才能竞争。挑战点：word-level KD 之外的**序列级**蒸馏——student 直接学 teacher 的 beam search 输出（而非逐步概率）。
- **方法**：SeqKD = student 在「teacher 生成的序列 + 0/1 hard label」上做最大似然。近似于在 teacher 分布的 mode 上训练。**这就是「用 teacher 生成海量数据训练 student」的早期形态**（生成数据量 = 训练集规模）。
- **实验设置**：WMT'14 En→De。teacher: 4×1000 LSTM（221M 参数，SOTA）；student: 2×500 (84M) / 2×300 (49M)。基线：同架构原始训练、word-KD。
- **student 超越 teacher 的关键证据**（Table 3 附近）：
  - **Student 2×500 + Seq-KD 用 greedy 解码即达 18.9 BLEU，+4.2 BLEU 于同尺寸基线（14.7）；beam search 下 19.3 BLEU（+1.7）**。"Our best student model runs 10 times faster than its state-of-the-art teacher with little loss in performance. It is also significantly better than a baseline model trained without knowledge distillation: by 4.2/1.7 BLEU with greedy decoding/beam search."
  - 更重要的结构性发现：**Seq-KD student 的 greedy 解码 ≈ teacher 的 beam search**——"somewhat surprisingly, seem to eliminate the need for beam search (even when applied on the teacher model)"。teacher 必须用 beam search 才能拿到的性能，student 用 greedy 就能达到。
  - 注意：student（18.9-19.0 BLEU）没有超过 teacher（19.5-19.6 BLEU）本身，是「10 倍速、1/3 参数、接近 teacher + 超越同尺寸基线 4.2 BLEU」。**超越的是同尺寸基线与「teacher 的 greedy 版本」，而非 teacher 的最优配置**。
- **反直觉发现**：序列蒸馏数据（teacher 生成的「偏 mode」数据）训练出的 student 比在真实数据上训练的同尺寸 student 强 4.2 BLEU——**teacher 数据的 mode 集中性本身是正则化**。
- **后续**：SeqKD 成为 LLM 时代「蒸馏 = SFT on teacher outputs」的原型（R1 蒸馏即 800K 样本 SFT）。

---

## 5. RL 后训练视角：蒸馏后再 RL

### 5.1 DeepSeek-R1（2025）

- **论文**：DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning. DeepSeek-AI (Daya Guo, Dejian Yang, ... )。2025-01。https://arxiv.org/abs/2501.12948
- **设定**：R1 (660B MoE) 通过纯 RL + 多阶段管线获得推理能力；然后「蒸馏」到小模型：**"we fine-tune open-source foundation models such as Qwen and LLaMA using a curated dataset comprising 800,000 samples generated with DeepSeek-R1"**（60 万推理 + 20 万非推理）。蒸馏仅 SFT、2-3 epochs（"For distillation, we fine-tune the corresponding base model for 2–3 epochs using the 800k data"）。
- **student 超越 teacher 辈模型的关键证据**：
  1. **蒸馏优于小模型直接 RL**（Table 16）：对 Qwen2.5-32B-Base 做大规模 RL（>10K 步，Qwen2.5-32B-Zero）达到与 QwQ-32B-Preview 相当；但 "**DeepSeek-R1-Distill-Qwen-32B, which is distilled from DeepSeek-R1, performs significantly better than Qwen2.5-32B-Zero across all benchmarks**"。
  2. **结论原文**："First, distilling more powerful models into smaller ones yields excellent results, whereas smaller models relying on the large-scale RL mentioned in this paper require enormous computational power and may not even achieve the performance of distillation. Second, while distillation strategies are both economical and effective, advancing beyond the boundaries of human intelligence may still require more powerful base models and larger-scale reinforcement learning."
  3. 摘要层面的表述："the emergent reasoning patterns exhibited by these large-scale models can be systematically harnessed to guide and enhance the reasoning capabilities of smaller models."
- **蒸馏后是否做了进一步训练？** 论文明确：**没有做 RL 阶段**——"For distilled models, we apply only SFT and do not include an RL stage, even though incorporating RL could substantially boost model performance. Our primary goal here is to demonstrate the effectiveness of the distillation technique, leaving the exploration of the RL stage to the broader research community."。（附录 B.6 的语言一致性消融确实对 Distill-Qwen-7B 做过 RL 实验（"we conduct an ablation experiment on DeepSeek-R1-Distill-Qwen-7B ... during the RL process"），但其目的是研究 LC reward 而非发布更强模型。）
- **数据规模的直接证据**：论文引用 Busbridge et al. 2025 支撑「蒸馏有效」的普遍性（原文："corroborating prior findings on the efficacy of distillation (Busbridge et al., 2025)"）。R1-Distill 系列的 800K 样本 SFT 即「改变训练配置」路线的当代最大规模实践。
- **后续**：DeepSeek-R1-0528（2025-05）对 Distill 系列做了更新与进一步训练；业界大量「R1 蒸馏小模型再 RL」工作（如 Qwen3、MiniCPM 等）。

### 5.2 Qwen3（2025）：distill + RL 的生产化管线

- **论文**：Qwen3 Technical Report. An Yang, Anfeng Li, Baosong Yang, ... (Alibaba Qwen)。2025-05。https://arxiv.org/abs/2505.09388
- **设定**：旗舰模型走四阶段（Long-CoT 冷启动 → 推理 RL → 统一 SFT → 通用 RL）；**轻量模型（0.6B/1.7B/4B/8B/14B dense + 30B-A3B MoE）全部用 strong-to-weak distillation**（off-policy + on-policy 两阶段），不再走四阶段管线。
- **方法细节**：
  - **Off-policy distillation**：teacher（/think 与 /no_think 两模式）生成回复，student 在其上做 response distillation——"This helps lightweight student models develop basic reasoning skills"。
  - **On-policy distillation**：student 生成序列，"the student model is then fine-tuned by aligning its logits with those of a teacher model (Qwen3-32B or Qwen3-235B-A22B) to minimize the KL divergence"——即 GKD/MiniLLM 路线的生产级实现（logit 对齐 + KL 最小化 + student 自生成序列）。
- **student 超越 teacher 的关键证据**：
  1. 摘要级声明："Distillation from advanced teacher models significantly outperforms reinforcement learning in performance and training efficiency."（蒸馏显著优于 RL，性能与效率双杀。）
  2. **Table 21（8B，蒸馏 vs RL 对比，同起点 off-policy distilled checkpoint）**：

| 方法 | AIME'24 (pass@64) | AIME'25 (pass@64) | MATH500 | LiveCodeBench v5 | MMLU-Redux | GPQA-Diamond | GPU hours |
|---|---|---|---|---|---|---|---|
| Off-policy Distill（起点） | 55.0 (90.0) | 42.8 (83.3) | 92.4 | 42.0 | 86.4 | 55.6 | – |
| + Reinforcement Learning | 67.6 (90.0) | 55.5 (83.3) | 94.8 | 52.9 | 86.9 | 61.3 | **17,920** |
| **+ On-policy Distill** | **74.4 (93.3)** | **65.5 (86.7)** | **97.0** | **60.3** | **88.3** | **63.3** | **1,800** |

  **On-policy 蒸馏以 1/10 的 GPU 小时数全面超过 RL**（AIME'24 74.4 vs 67.6），且 pass@64 从 90.0 升至 93.3（"distillation from teacher logits enables the student model to expand its exploration space and enhance its reasoning potential ... In contrast, reinforcement learning does not lead to any improvement in pass@64 scores"）。RL 后 pass@64 无提升——**蒸馏在「扩大探索空间/提升性能上限」维度上胜过 RL**，这是反直觉的。
- **反直觉发现**：对 8B 级模型，**蒸馏 > RL**（性能+效率），尽管教条认为 RL 是性能天花板更高的路线。解释：teacher 的 logit 信号比 reward 信号信息密度高得多（dense token-level feedback vs scalar reward）。
- **局限**：蒸馏路线依赖足够强的 teacher；Qwen3-32B/235B 的四阶段训练本身极贵（只是对小模型 amortized）。
- **后续**：strong-to-weak distillation 已成为工业小模型后训练的标准管线。

### 5.3 gpt-oss（OpenAI, 2025）：distill + RL 的另一工业实现

- **来源**：gpt-oss-120b & gpt-oss-20b Model Card. OpenAI (127 位作者)。arXiv:2508.10925（2025-08-08）。https://arxiv.org/abs/2508.10925 （模型页：https://openai.com/index/gpt-oss/ ）
- **摘要原话**："We present gpt-oss-120b and gpt-oss-20b, two open-weight reasoning models ... **trained using large-scale distillation and reinforcement learning**." 官方训练配方明确包含「大规模蒸馏 + 强化学习」两级（model card 未公开二者的先后顺序与细节；结合 Qwen3 的管线，业界普遍理解为蒸馏注入能力、RL 精炼，但对 gpt-oss 应保持措辞谨慎——只能说蒸馏与 RL 均为其训练组成部分）。
- **意义**：与 Qwen3 独立地验证了「蒸馏注入能力 + RL 精炼」的工业配方，两家的「小模型不直接 RL」共同点反向印证了 R1 的发现。
- **局限**：细节多在 system card，学术粒度低于 Qwen3 报告。

---

## 6. Speculative Decoding 与蒸馏的关系（补充）

- **DistillSpec**：DistillSpec: Improving Speculative Decoding via Knowledge Distillation. Yongchao Zhou, Kaifeng Lyu, Ankit Singh Rawat, Aditya Krishna Menon et al. (Google DeepMind)。2023。https://arxiv.org/abs/2310.08461
- **关系**：speculative decoding 用小 draft 模型加速大 target 模型。**DistillSpec 用蒸馏对齐 draft 与 target**——关键设计与 GKD 相同：**on-policy data generation from the draft model**（draft 自生成数据）+ 散度函数按任务与解码策略定制。即「让 student（draft）的分布对齐 teacher（target）」是加速而非性能目的；但其中的 on-policy 蒸馏技术栈（student 采样 + teacher 打分 + 散度选择）与本路线完全同构，可与 GKD/MiniLLM 一起读作「on-policy 蒸馏」家族。值得注意的机制点：蒸馏不仅提高了接受率（加速 10-45%），且「越对齐的散度在解码温度越高时越重要」的规律与 GKD 的散度-温度结论一致。

---

## 7. 全景小结：各路线证据强度表

| 路线 | 代表论文 | student 超越 teacher 的证据强度 | 超越发生的条件 |
|---|---|---|---|
| 数据规模/训练量 | Ba & Caruana 2014; DSL 2025 | 强（DSL: $N_S>N_T$ + 有限蒸馏数据区间；BAN: 同架构重训超越） | student 容量 ≥ teacher；蒸馏数据在「窗口」内 |
| Teacher 集成 | Hinton 2015; Ba & Caruana (ECNN) | 强（distilled 单模型 ≈ ensemble > 单成员；>80% ensemble 增益转移） | teacher 为多模型平均（去噪信号） |
| 合成数据 | Phi 系列; TinyStories; Orca | 中强（超越对象是同尺寸/更大模型，非直接 teacher；存在 benchmark 污染质疑） | teacher 作为数据合成器，数据质量/多样性是关键变量 |
| Reverse KL / on-policy | GKD; MiniLLM; f-DISTILL | 强（GKD self-distill 超 teacher；5% 数据 GKD > 100% 数据 supervised KD；MiniLLM 表格 * 号） | student 自生成数据 + mode-seeking 散度 + teacher 打分 |
| RL 后训练 | R1; Qwen3; gpt-oss | 强（Qwen3 Table 21: 蒸馏 1/10 算力胜 RL；R1: distill-32B > 32B-Zero RL） | 蒸馏注入推理模式 + RL 精炼（Qwen3/gpt-oss）或纯蒸馏（R1 选择了不 RL） |

**核心结论**：在「改变训练配置」路线下，student 超越 teacher 不是异常，而是**有明确条件窗口的规律性现象**：(1) student 容量不小于 teacher（或 teacher 信号是 ensemble/去噪后的）；(2) 蒸馏数据量在「有限区间」内——太少学不会，太多 student 收敛到 teacher 的行为（DSL E.7）；(3) 蒸馏信号的信息密度（软标签/logits/解释痕迹）高于硬标签与标量 reward；(4) 蒸馏后 RL 可进一步突破（Qwen3、gpt-oss），但直接对小模型 RL 通常不如先蒸馏（R1、Qwen3 双重验证）。

---

## 附：本报告引用的一手来源清单

| 论文/报告 | 链接 |
|---|---|
| Buciluǎ et al. 2006, Model Compression (KDD) | https://www.cs.cornell.edu/~caruana/compression.kdd06.pdf |
| Ba & Caruana 2014, Do Deep Nets Really Need to Be Deep? | https://arxiv.org/abs/1312.6184 |
| Hinton et al. 2015, Distilling the Knowledge in a Neural Network | https://arxiv.org/abs/1503.02531 |
| Furlanello et al. 2018, Born Again Neural Networks (ICML) | https://arxiv.org/abs/1805.04770 |
| Kim & Rush 2016, Sequence-Level Knowledge Distillation (EMNLP) | https://arxiv.org/abs/1606.07947 |
| Sanh et al. 2019, DistilBERT | https://arxiv.org/abs/1910.01108 |
| Jiao et al. 2019, TinyBERT (Findings of EMNLP 2020) | https://arxiv.org/abs/1909.10351 |
| Sun et al. 2020, MobileBERT (ACL) | https://arxiv.org/abs/2004.02984 |
| Eldan & Li 2023, TinyStories | https://arxiv.org/abs/2305.07759 |
| Gunasekar et al. 2023, Textbooks Are All You Need (phi-1) | https://arxiv.org/abs/2306.11644 |
| Li et al. 2023, Textbooks Are All You Need II (phi-1.5) | https://arxiv.org/abs/2309.05463 |
| Microsoft 2023, Phi-2 blog | https://www.microsoft.com/en-us/research/blog/phi-2-the-surprising-power-of-small-language-models/ |
| Abdin et al. 2024, Phi-3 Technical Report | https://arxiv.org/abs/2404.14219 |
| Mukherjee et al. 2023, Orca | https://arxiv.org/abs/2306.02707 |
| Agarwal et al. 2023/2024, GKD / On-Policy Distillation (ICLR 2024) | https://arxiv.org/abs/2306.13649 |
| Gu et al. 2023/2024, MiniLLM (ICLR 2024) | https://arxiv.org/abs/2306.08543 |
| Wen et al. 2023, f-DISTILL (ACL 2023) | https://arxiv.org/abs/2307.15190 |
| Zhou et al. 2023, DistillSpec | https://arxiv.org/abs/2310.08461 |
| Busbridge et al. 2025, Distillation Scaling Laws (ICML 2025) | https://arxiv.org/abs/2502.08606 |
| DeepSeek-AI 2025, DeepSeek-R1 | https://arxiv.org/abs/2501.12948 |
| Qwen Team 2025, Qwen3 Technical Report | https://arxiv.org/abs/2505.09388 |
| OpenAI 2025, gpt-oss Model Card | https://arxiv.org/abs/2508.10925 |

（报告正文所有引号内容均为各论文/报告原文摘录。）
