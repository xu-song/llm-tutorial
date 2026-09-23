# 教程配图与引用:Agent 共用规范

## 任务背景
ML 教程站(/tutorials,43 篇)此前只有交互组件与 matplotlib CodeRunner,没有静态图与「延伸阅读」引用。现在要给核心教程补:
1. **arXiv 原图**:从相关经典论文下载原图存 `public/tutorials/<slug>/`,以 `<figure>` 嵌入正文
2. **延伸阅读节**:每篇教程结尾加「延伸阅读」——站内论文区互链(`/papers/<slug>`)+ arXiv 经典论文外链

## 图片规范(与论文区一致)
```jsx
<figure className="my-6">
  <img src="/tutorials/<tutorial-slug>/<fig-name>.png" alt="中文详细描述图里画了什么" className="mx-auto h-auto max-w-full rounded-lg border border-zinc-200 shadow-sm dark:border-zinc-800" />
  <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
    图源:作者名, <em>论文标题</em>(arXiv:XXXX.XXXXX)Figure N
  </figcaption>
</figure>
```
- 图放正文**对应概念段落之后**,不是堆在结尾
- 大表格/大图可加 `max-w-xl` 或 `max-h-[80vh]`(参照 `src/app/papers/*/page.mdx` 现有写法)
- alt 必须具体描述图内容(中文)

## 下载 arXiv 原图的方法
arXiv 论文的源文件在 `https://arxiv.org/e-print/<arxiv-id>`(tar.gz,含 LaTeX 源与图)。
也可以先试 `https://arxiv.org/html/<arxiv-id>`(HTML 渲染版)找图的直接 URL,或从 ar5iv (`https://ar5iv.labs.arxiv.org/html/<arxiv-id>`)页面提取 `<img>` 的 src(通常是相对路径 `x1.png`,绝对地址 `https://arxiv.org/html/<id>/x1.png`)。
下载用 curl。图格式 png/jpg 直接用;eps/pdf 需转 png(可用 `sips` macOS 自带:`sips -s format png input.pdf --out output.png`,对多页 pdf 先 `sips` 会失败,可跳过换别的图)。
SVG 可以直接用(浏览器原生渲染)。

## 延伸阅读节规范
加在「## 小结」**之前**(若没有小结节则加在文末),格式:
```markdown
## 延伸阅读

- **站内论文笔记**:[PPO](/papers/ppo-schulman) —— 一句话说明与本章的关系
- **经典论文**:Cortes & Vapnik (1995). *Support-Vector Networks*. [arXiv 链接或 DOI] —— 一句话说明为什么值得读
```
- 站内互链只链真正相关的(见下方映射表,不要硬凑)
- 外链论文选 2-4 篇真正奠基性的;必须附一句话说明,不许裸链
- 若教程已有「## 参考文献」节,不要重复造「延伸阅读」——改为:①在参考文献前加「站内论文笔记」小节(只放站内互链);②确认参考文献里的 arXiv 链接格式正确

## 站内论文区可用 slug(15 篇)
ppo-schulman(PPO)、grpo-deepseek-r1(GRPO/R1)、dpo-rafailov(DPO)、kimi-k15(K1.5 多模态RL)、kimi-k2(K2 agentic)、glm-45(GLM-4.5 MoE)、attention-transformer(Transformer)、deepseek-v3(V3 MoE)、deepseek-v3-2(V3.2 DSA)、qwen3-vl(Qwen3-VL)、internvl35(InternVL3.5)、deepseek-ocr(OCR)、ui-tars-2(GUI Agent)、kimi-k3(K3)、minimax-m3(M3 稀疏注意力)

## MDX 红线(违反会 500)
- HTML 属性必须 `className`,不许 `class`
- 正文不许出现裸花括号 `{...}`(会被当 JSX 表达式解析;数学公式的 `\{` 没问题因为 KaTeX 在 $ 内)
- 图的 src 必须以 `/tutorials/<slug>/` 开头
- 编辑完 grep 自查:`grep -n 'class=' page.mdx` 应无输出(除 className)

## 完成后验证
每篇完成后:
```bash
# 图文件与引用一一对应
grep -o 'src="/tutorials/<slug>/[^"]*"' src/app/tutorials/<slug>/page.mdx
ls public/tutorials/<slug>/
# MDX 能编译(不跑 build,dev server 逐页 curl)
curl -s -o /dev/null -w '%{http_code}' http://localhost:3742/tutorials/<slug>
```
200 即通过。**不需要跑 next build**(主 Agent 统一跑)。
