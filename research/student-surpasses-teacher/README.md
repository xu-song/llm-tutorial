# Student 超越 Teacher:调研档案

> 调研日期:2026-09-21。问题:知识蒸馏中 student model 怎样超越 teacher model,主要方案与论文。

## 文件

| 文件 | 路线 | 状态 |
|---|---|---|
| [01-distillation-mechanism.md](01-distillation-mechanism.md) | 蒸馏/自蒸馏机制本身(Born-Again、Self-Distillation、理论解释) | ✅ 完成 |
| 02-weak-to-strong.md | 弱到强泛化(OpenAI W2S、self-improvement、on-policy 蒸馏) | ⏳ 调研中 |
| 03-scale-and-data.md | 规模与数据(scaling laws、teacher 集成、合成数据、reverse KL) | ⏳ 调研中 |

## 三条路线的划分

1. **蒸馏机制本身**:不改训练配置,蒸馏/自蒸馏就是增益(Born-Again Networks 等)。核心结论:增益来自正则化与隐式集成,而非「知识搬运」。
2. **弱到强泛化**:弱 teacher 监督强 student,student 泛化超越 teacher(OpenAI superalignment 核心问题)。
3. **规模与数据**:student 用更多数据/更多 epoch/teacher 集成/合成数据训练,在配置上超越 teacher 的训练条件。

## 与现有教程的关系

- 现有「知识蒸馏」topic 三篇(offline → on-policy → mixed)聚焦「怎么蒸馏」;
- 本调研聚焦「student 何时、为何能超越 teacher」,是三篇教程共同的开放问题(知识蒸馏篇反思第 2 问直接讨论过);
- 落点候选:新增第四篇教程(如 `born-again-and-beyond`)或扩充知识蒸馏篇的展望/FAQ。
