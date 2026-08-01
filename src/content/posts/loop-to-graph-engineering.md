---
title: "Loop 没有死：从 DeerFlow 到 SAGE 理解 Graph Engineering"
description: "Loop 负责节点内部的执行闭环，Graph 负责节点之间的依赖、并行与恢复。结合 DeerFlow 和 SAGE，讨论复杂 Agent 任务真正需要的工程边界。"
published: 2026-07-25
category: agent
tags: [Agent 工程, Graph Engineering, SAGE]
featured: false
draft: false
visibility: public
publish: true
---

小林coding 的文章《[Loop Engineering 已死，Graph Engineering 永生](https://mp.weixin.qq.com/s/EEr4ErhWHwcs57-xgSC7uQ)》提出了一个很直观的区分：Loop 解决单个 Agent 如何持续思考、调用工具和修正结果；Graph 解决多个执行单元如何拆分、并行、汇合与返工。

这个判断值得继续往工程里推一步。Loop 并没有被 Graph 替代，它只是从“系统的全部”退回到“节点内部的执行方式”。真正变化的是：当任务变长、角色变多、失败成本变高之后，我们不能再把所有状态都塞进一段对话，让一个 Agent 从头跑到尾。

<figure class="article-figure">
  <img src="/images/posts/loop-graph-engineering.webp" alt="节点内部的循环通过门控节点分成两条并行路径，最终汇合到验证节点" width="2048" height="1152" loading="eager" />
  <figcaption>Loop 运行在节点内部；Graph 负责节点之间的分支、汇合与验证。</figcaption>
</figure>

## 两种工程，解决两层问题

一个可用的 Agent Loop 通常包含这样的闭环：

```text
读取上下文 -> 模型决定下一步 -> 调用工具 -> 接收结果 -> 更新上下文 -> 继续或结束
```

Loop Engineering 关心的是这个闭环能否稳定运行：

- 工具调用有没有权限和参数校验；
- 上下文过长时如何压缩，而不是直接丢历史；
- 重复调用、超时和预算耗尽时怎样停止；
- 工具失败后能否修正，而不是在错误状态上继续；
- 每一轮发生了什么，能否被观察和复盘。

Graph Engineering 则把视角移到执行单元之间。一个节点可以是 Agent，也可以是确定性代码、数据库查询、测试程序或人工审批。Graph 关心的是：

- 哪些节点有前后依赖；
- 哪些工作可以 fan-out 并行；
- 多个分支在哪里 fan-in 汇合；
- 哪些边由固定规则决定，哪些边需要模型判断；
- 失败后只重试当前节点，还是回到上游重新规划；
- 状态如何保存，让任务可以暂停、恢复和审计。

因此更准确的关系不是 Loop 对 Graph，而是：

| 层次 | 主要问题 | 典型机制 |
| --- | --- | --- |
| 节点内部 | 这一步怎样可靠完成 | model/tool loop、上下文管理、工具策略、预算与终止条件 |
| 节点之间 | 多个步骤怎样可靠协作 | 节点、边、状态、并行、条件分支、checkpoint 与审批 |

一个 Graph 节点内部仍然可以运行 Loop。反过来，只有 Loop 而没有外部调度时，复杂任务最终会退化成一条越来越长的串行对话。

## Graph 的核心不是画图，而是状态

节点和边很容易理解，真正决定 Graph 能否进入工程的是 State。

假设后端、前端和测试三个节点并行执行，只画三条线并不能解决问题。系统还需要知道每个分支的状态、产物、错误、资源消耗和重试次数，并在汇合前验证契约是否一致。

```text
plan
  ├─> backend ─┐
  ├─> frontend ├─> integrate -> verify -> approval
  └─> tests ───┘                    └─失败-> rework
```

如果状态只存在聊天记录里，所谓 Graph 仍然只是展示层。可恢复的 Graph 至少需要：

1. **结构化状态**：节点读写有明确字段，不能靠自然语言猜进度。
2. **Checkpoint**：完成关键节点后保存状态，中断后从最近位置继续。
3. **幂等边界**：重试节点时不能重复产生不可逆副作用。
4. **人工节点**：发布、写入长期知识等高风险动作能够暂停等待确认。
5. **证据与观测**：节点输入、输出、耗时、错误和 token 消耗可以追踪。

LangGraph 提供了 StateGraph、条件边和 checkpointer 等实现原语，但 Graph Engineering 是设计方法，不等于必须使用某个框架。

## DeerFlow：Loop 之上长出的动态执行图

[DeerFlow 2.0](https://github.com/bytedance/deer-flow) 将自己定义为一个 Super Agent Harness。它不是把所有业务预先写成一张固定流程图，而是让 Lead Agent 在运行时按需要调用 `task`，把工作委派给拥有独立上下文的 Subagent。

从源码看，这套设计同时覆盖了 Loop 和 Graph 两层：

- Lead Agent 由 `create_agent` 装配模型、工具和中间件；中间件处理动态上下文、摘要、Todo、Memory、MCP 路由、Subagent 限流、循环检测和 token 预算。[查看实现](https://github.com/bytedance/deer-flow/blob/0f0955bf7b2ae64ecb5099551b86049c2091a80a/backend/packages/harness/deerflow/agents/lead_agent/agent.py#L256-L435)
- `task` 工具把任务交给独立 Subagent，继承父运行的身份与策略边界，但不允许 Subagent 再递归创建下一层 Subagent。[查看实现](https://github.com/bytedance/deer-flow/blob/0f0955bf7b2ae64ecb5099551b86049c2091a80a/backend/packages/harness/deerflow/tools/builtins/task_tool.py#L231-L430)
- Subagent 使用自己的 Agent Loop 和精简中间件链，隔离大量中间上下文，只把结果交回主运行。[查看实现](https://github.com/bytedance/deer-flow/blob/0f0955bf7b2ae64ecb5099551b86049c2091a80a/backend/packages/harness/deerflow/subagents/executor.py#L491-L546)
- Checkpointer 可以落在内存、SQLite 或 PostgreSQL，为线程状态和长任务恢复提供持久化底座。[查看实现](https://github.com/bytedance/deer-flow/blob/0f0955bf7b2ae64ecb5099551b86049c2091a80a/backend/packages/harness/deerflow/runtime/checkpointer/async_provider.py#L91-L202)

这里的 Graph 不一定在执行前完整可见。Lead Agent 可能根据当前结果继续委派、等待、汇总或停止，执行拓扑是在运行过程中逐步展开的。Graph Engineering 的价值，也不只是“同时启动多个 Agent”，而是让每个执行单元拥有独立上下文、权限、预算和状态。

## 为什么 SAGE 天然适合这条路线

[SAGE](https://sagecompanion.top) 从一开始就不是只做一次问答。它要把探索、知识、实践和证据组织成可持续的学习过程，因此天然需要 Loop 与 Graph 两层能力。

### 1. 已经存在显式任务图

SAGE 的旅游任务使用真正的 LangGraph `StateGraph`：信息与推荐节点从 START 并行执行，在 Memory 或 Planning 节点汇合，随后进入预算节点，并通过条件边决定结束还是回到 Planning 重新规划。[查看源码](https://github.com/ZeroMadLife/sage-agent/blob/577a7444e2578f7b58d2ffedda72942d039bf50c/agents/graph.py#L49-L88)

这已经包含 Graph Engineering 的基本结构：节点、并行边、汇合、共享状态和条件返工。

### 2. 节点内部有受控 Loop

SAGE 的执行引擎不是无限循环。模型调用和工具调用受最大步数约束，也会检测重复工具调用、处理参数错误、停止信号和上下文紧急状态。[查看源码](https://github.com/ZeroMadLife/sage-agent/blob/577a7444e2578f7b58d2ffedda72942d039bf50c/core/coding/engine/engine.py#L140-L245)

这意味着 Graph 中的节点不是不可观察的黑盒，而是具备预算和终止语义的执行单元。

### 3. Harness 已经具备 Graph 的状态底座

SAGE 的新 Harness 使用 `create_agent` 装配 middleware、结构化线程状态和 checkpointer。[Agent 工厂](https://github.com/ZeroMadLife/sage-agent/blob/577a7444e2578f7b58d2ffedda72942d039bf50c/packages/sage_harness/sage_harness/agents/factory.py#L23-L53)负责框架装配；运行管理器支持 `Command(resume=...)`，并把 graph state、message 和 custom event 以确定顺序投影出来。[运行管理器](https://github.com/ZeroMadLife/sage-agent/blob/577a7444e2578f7b58d2ffedda72942d039bf50c/packages/sage_harness/sage_harness/runtime/manager.py#L74-L103)

Checkpoint 还会校验 owner、workspace、thread 和路径绑定，避免恢复到不属于当前运行的状态。[查看源码](https://github.com/ZeroMadLife/sage-agent/blob/577a7444e2578f7b58d2ffedda72942d039bf50c/packages/sage_harness/sage_harness/runtime/checkpoint.py#L21-L90)

### 4. 子任务不是一句 Prompt，而是受限执行单元

SAGE 的 `task` 工具为子任务分配独立 run id、工具范围、token 预算、步骤上限、超时和 evidence refs；子任务不能自行扩大工具与预算，也不能继续递归委派。[查看源码](https://github.com/ZeroMadLife/sage-agent/blob/577a7444e2578f7b58d2ffedda72942d039bf50c/packages/sage_harness/sage_harness/subagents/tool.py#L301-L440)

这些约束使 Subagent 有资格成为 Graph 节点，而不是主 Agent 随手发出的一段不可追踪 Prompt。

## “天然支持”不等于“已经全部完成”

SAGE 已经具备三类重要基础：显式 LangGraph 任务图、可恢复 Harness、受限 Subagent。这让它不需要推翻现有架构，就能继续扩展 Graph Engineering。

但目前仍要区分已实现能力与演进方向：

- 旅游任务的并行、汇合和条件返工已经是实际 Graph；
- Harness 的 checkpoint、resume、approval、sandbox、timeline 和子任务账本已经构成通用底座；
- 更通用的动态多 Agent fan-out/fan-in、跨节点契约校验和可视化调度仍在演进；
- 不能因为用了 LangGraph，就默认获得可靠恢复、权限隔离和业务幂等，这些仍需要产品层负责。

所以我的判断不是“SAGE 已经完成了任意任务的 Graph 编排”，而是：**SAGE 的状态、权限和证据边界，与 Graph Engineering 需要的运行底座高度一致。下一步是在这套底座上扩展调度能力，而不是再造一套系统。**

## 什么时候不要上 Graph

Graph 会增加状态模型、错误路径、并发控制和调试成本。下面这些任务通常保留单 Agent Loop 更合适：

- 步骤少，依赖关系固定；
- 不需要并行，串行耗时可以接受；
- 中断后从头执行成本很低；
- 没有人工审批或高风险副作用；
- 一个上下文足以容纳全部必要信息。

只有当任务能够拆成独立分支、不同节点需要不同权限或模型、执行时间较长、需要暂停恢复，或者必须持续观察每个分支的状态时，Graph 的收益才会超过复杂度。

而且顺序不能反：先让每个节点能稳定完成一件事，再讨论如何编排更多节点。把多个不可靠的 Loop 连起来，只会得到一张更难定位问题的 Graph。

## 最后

“Loop Engineering 已死”是一个适合传播的说法，但工程上更准确的结论是：Loop 仍然是 Agent 的执行内核，Graph 是复杂任务的协作结构，Harness 则负责状态、权限、恢复和证据。

DeerFlow 展示了 Lead Agent 如何通过 Subagent 和中间件动态展开执行图；SAGE 则已经在任务图与学习 Harness 两侧积累了对应基础。真正值得长期投入的，不是追逐下一个新术语，而是让节点可替换、边可解释、状态可恢复、风险动作可审批、结果可验证。

## References / 相关链接

- [小林coding：Loop Engineering 已死，Graph Engineering 永生](https://mp.weixin.qq.com/s/EEr4ErhWHwcs57-xgSC7uQ)
- [小林coding：图解 Loop Engineering](https://mp.weixin.qq.com/s?__biz=MzUxODAzNDg4NQ==&mid=2247558717&idx=1&sn=1b7e118a44b39ff3fff33c392f784897&scene=21#wechat_redirect)
- [DeerFlow 官方网站](https://deerflow.tech)
- [DeerFlow GitHub 仓库](https://github.com/bytedance/deer-flow)
- [LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [SAGE 在线站点](https://sagecompanion.top)
- [SAGE GitHub 仓库](https://github.com/ZeroMadLife/sage-agent)
