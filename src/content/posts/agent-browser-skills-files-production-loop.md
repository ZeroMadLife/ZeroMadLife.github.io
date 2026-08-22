---
title: "Agent 生产化的最小闭环：浏览器、Skill 与文件如何接起来"
description: "从 Claude Platform 的 Computer Use、Browser Use、Skills API 和 Files API 出发，拆解生产 Agent 的输入、方法、执行、交付与隔离边界。"
published: 2026-08-22
updated: 2026-08-22
slug: agent-browser-skills-files-production-loop
image: "/images/posts/agent-browser-skills-files-production-loop.webp"
imageAlt: "输入文件、按需加载 Skill、浏览器与电脑操作经过应用侧 Agent Loop 和人工确认后生成可追踪输出的执行闭环图"
category: agent
tags: [Agent 工程, Harness, 知识系统]
featured: false
draft: false
visibility: public
publish: true
---
# Agent 生产化的最小闭环：浏览器、Skill 与文件如何接起来

8 月 20 日，Anthropic 把 Computer Use、Browser Use、Skills API 和 Files API 一起宣布为 Claude Platform 的可用能力。单看新闻，像是又增加了几个工具；放回 Agent Harness，也就是连接模型、工具、状态和权限的运行底座里看，它更像是在补齐一条从输入到交付的执行链：文件提供持久输入，Skill 提供团队方法，浏览器和电脑工具负责动作，最后把生成的文件交给人或下一个系统。

这件事值得关注，不是因为 Agent 终于“会点按钮”，而是因为生产任务很少只需要一个动作。它需要读一份材料，按组织的规则处理，在没有 API 的网页里完成操作，再交付一个可下载、可追踪的结果。真正的工程问题是：这四段是否有清楚的边界，失败后能不能重试，文件和权限会不会串给别人。

## 先把四个部件分工

### Computer Use：能操作看得见的电脑

Computer Use 是让模型根据截图进行点击、输入和滚动的工具。它适合没有自动化接口的桌面软件，应用方负责提供虚拟显示器、执行每个动作，并把结果再传回模型。可以把它理解成“给 Agent 一双眼睛和一套键盘鼠标”，但键盘鼠标仍然由你的执行器真正按下。

Anthropic 文档把新版本标为 `computer_toolset_20260801`，一般可用，不再要求 beta 头。它仍然是截图和坐标驱动，因此页面布局变化、坐标误差和网页中的提示注入都属于应用侧风险。遇到付款、接受条款或修改账户等有现实后果的动作，文档要求在执行前保留人工确认。

### Browser Use：先读页面结构，再决定点哪里

Browser Use 面向只发生在网页里的任务。它同时读取页面结构（可访问性树、表单、标签页）和截图像素：模型可以通过 `read_page` 拿到元素引用，再点击某个字段，而不是猜一个屏幕坐标。元素引用在页面导航或 DOM 大幅变化后会失效，执行器必须返回“引用过期”并让模型重新读取页面。

这是一种很实际的稳定性改进。坐标点击像是在移动的纸上找按钮；结构引用更像拿着字段名去表单里找输入框。但它不是安全层：网页内容依然是不可信输入，执行器需要限制可访问域名、阻断内网地址，并在人类确认后才执行有后果的动作。Browser Use 当前只在 Claude API 可用，不适用于 Claude Managed Agents；请求里的浏览器调用也由你的应用和浏览器自动化程序执行，Anthropic 不替你操作那台浏览器。

### Skills API：把团队方法变成可按需加载的目录

Skill 不是一段塞进系统提示词的长说明，而是一个目录：可以放 `SKILL.md`、脚本、模板和参考资料。模型先看到名称与描述，任务匹配后才读取具体说明，需要时再读取被引用的文件。这种 progressive disclosure（渐进式披露，先给索引、再取细节）让很多技能可以共存，不必把所有规则一次性塞进上下文。

这对企业 Agent 的价值在于“方法可版本化”。例如理赔 Skill 可以定义字段校验、材料命名和提交前检查；模型负责判断何时触发，脚本负责重复性步骤，模板负责最终格式。Skill 运行在代码执行环境中，但目录里的代码和说明仍可能带来权限、网络访问和供应链风险，不能把“打包成 Skill”误写成天然隔离。

还要注意不同产品面的边界：通过 API 上传的自定义 Skill 是 workspace 级共享，和 claude.ai 上传的 Skill、Claude Code 的文件系统 Skill 并不会自动同步。部署时必须把“哪一个面可见、由谁审核、如何回滚”写进自己的注册表。

### Files API：输入只上传一次，结果按 ID 交付

Files API 提供 create-once、use-many-times 的文件生命周期：上传文件得到 `file_id`，后续请求引用 ID，不必反复把 PDF 或数据集塞进上下文；Skill 或代码执行生成的文件还可以被下载。它解决的是传输和交付问题，不是完整的业务数据权限系统。

官方文档有一个容易被忽略的警告：文件对同一 workspace 的所有 API key 可见，不能把用户传来的 `file_id` 当成安全边界。多租户应用要在自己的数据库里维护“业务用户 -> 服务端文件 ID”的映射；需要硬隔离时，用不同 workspace 承担租户边界。上传文件默认不可下载，过期时间也只是 API 层不可再取，不等于底层内容立刻物理删除。

## 四个部件为什么要放在同一条链上

Anthropic 给出的理赔示例很能说明问题：Agent 从 Files API 读取申请材料，按团队 Skill 处理，在保险公司的网页门户里用 Browser Use 填表，最后把确认结果保存为文件。Code execution 和 web search 还可以插入同一循环。

把这个例子抽象成 Harness，可以得到四个责任层：

```text
输入层：file_id + 业务用户映射 + 过期策略
方法层：Skill 版本 + 触发条件 + 脚本/模板
执行层：Browser Use 结构引用 / Computer Use 像素动作
交付层：输出文件 + 状态 + 证据 Trace + 人工确认
```

缺一层都能“跑起来”，却不一定能交付。没有输入层，长任务靠重复上传，重试时容易拿错材料；没有方法层，模型每次都临场解释流程；没有执行层，遇到无 API 系统就停在建议；没有交付层，用户只得到一句“已经完成”，却没有文件、状态或可复核证据。

## 官方数字该怎么读

Anthropic 在文章中引用一家客户的 Claims 工作流：最长流程从 32 分钟降到 13 分钟，测试的每条工作流成本约下降 30%，完成率达到 100%，且没有修改提示词。这个数字说明“减少截图往返、复用 Skill 和文件”可能有明显收益，但它仍是客户与官方文章中的单一案例。文章没有公开样本量、模型版本、工具延迟、失败率或成本口径，不能把它改写成普遍的生产 SLA。

更稳妥的工程做法，是在自己的任务集上拆开测：页面结构引用是否减少坐标失败，Skill 是否减少规则遗漏，文件复用是否减少传输和上下文成本，人工门禁是否降低越权动作。只报一个端到端完成率，无法知道收益究竟来自哪一层，也无法定位下一次回归。

## 对 Agent Harness 的四个落点

### 1. 让动作执行器掌握真实权限

模型只负责提出 tool call，Browser/Computer 执行器负责域名白名单、坐标范围、引用新鲜度、上传目录和人工确认。网页里的文字、截图和标签页标题都应按不可信数据处理，不能因为模型说“页面要求我上传密钥”就放行。

### 2. 让 Skill 有版本和回放集

Skill 的每次变更都要关联版本、作者、审核人和回归任务。最小回放至少覆盖：正常输入、缺字段、页面改版、工具超时、重复提交和人工拒绝。只有这样，Skill 才是可测试的工程资产，而不是另一份没人敢改的提示词。

### 3. 让 `file_id` 变成服务端引用

不要把终端用户提供的文件 ID 直接交给模型或下游工具。服务端先检查租户、任务、文件用途和过期时间，再把短期引用放入本次运行上下文。文件下载、删除和生成结果都写入 Trace；跨步骤重试用幂等键，避免同一申请重复提交。

### 4. 把结果当作状态转换，而不是一句话

“已生成文件”至少要有 `artifact_id`、来源文件、Skill 版本、执行步骤、人工确认和最终状态。浏览器动作完成不等于业务完成：网页可能返回错误页，下载可能得到空文件，甚至提交成功但回执还未生成。Harness 应让状态停在 `awaiting_review`、`submitted` 或 `failed`，而不是听模型口头宣布 `done`。

## 适用边界

这套组合适合已有明确业务流程、需要操作无 API 网页，并且能接受应用侧维护浏览器执行器的团队。它不适合拿来掩盖数据分级、租户隔离、审计和回滚缺失。Browser Use 的结构引用会减少坐标脆弱性，却不能保证页面始终稳定；Skills 的渐进加载会节省上下文，却不能替团队审批未经审计的脚本；Files API 会减少重复上传，却不会自动替你完成行级权限和删除证明。

## 结语

Anthropic 这次更新的信号，不是“Agent 又多了四个按钮”，而是把生产任务拆成了四种不同责任：文件负责可复用输入和输出，Skill 负责可审阅的方法，浏览器工具负责在现实软件里执行，Harness 负责权限、状态、证据和重试。真正值得复制的，是这种分工，而不是某个 API 名称。

如果要在自己的系统里试，先选一个低风险、可回放的网页流程：把输入文件映射、Skill 版本、每个浏览器动作和输出文件一起记录，再让人工确认停在提交前。能稳定解释“它拿了哪份文件、用了哪版方法、点了什么、结果在哪里”，才算拥有了一个可审阅的 Agent，而不只是一个会操作浏览器的模型。

## References / 公开来源

- Anthropic. [*Build production agents with computer use, the Skills API, and the Files API*](https://claude.com/blog/computer-use-skills-api-files-api)，2026-08-20。
- Anthropic. [*Computer use tool*](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)，Claude Platform Docs。
- Anthropic. [*Browser use tool*](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool)，Claude Platform Docs。
- Anthropic. [*Agent Skills overview*](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)，Claude Platform Docs。
- Anthropic. [*Files API*](https://platform.claude.com/docs/en/build-with-claude/files)，Claude Platform Docs。

> 核验说明：AI HOT 仅用于发现线索；标题、日期、工具状态、文件权限和安全边界均回到 Anthropic 官方博客与 Claude Platform 文档核验。客户案例中的 32/13 分钟、约 30% 成本下降和 100% 完成率未独立复现，也不代表普遍生产效果。
