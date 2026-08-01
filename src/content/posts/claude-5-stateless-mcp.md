---
title: "当模型不再需要手把手：Claude 5 与无状态 MCP 带来的 Agent 工程变化"
description: "Claude Code 为新模型删掉了 80% 以上的系统提示词，MCP 也从有状态双向协议转向无状态请求。解释 round-robin、JSON-RPC、SSE 与 MRTR，并讨论 Agent 工程的复杂性究竟去了哪里。"
published: 2026-08-01
image: "/images/posts/claude-5-stateless-mcp.webp"
category: agent
tags: [Agent 工程, Harness]
featured: false
draft: false
visibility: public
publish: true
---

最近有两次更新放在一起看很有意思。

第一件事来自 Claude Code 团队。Thariq 在 2026 年 7 月 25 日写道，他们为 Claude Opus 5、Claude Fable 5 等新模型删掉了 Claude Code 系统提示词中超过 80% 的内容，在内部编码评测里没有观察到可测量的能力损失。

第二件事来自 MCP。2026-07-28 版规范把协议核心从有状态、双向交互改成了无状态的请求与响应，移除了初始化握手和协议级 Session，让普通的 HTTP 基础设施也能更自然地承载 MCP 服务。

一边在删提示词，一边在删协议状态。它们表面上是两件事，背后其实是同一个工程方向：**减少隐藏在全局上下文和连接里的隐式复杂性，把真正需要的约束放到更明确的位置。**

<figure class="article-figure">
  <img src="/images/posts/claude-5-stateless-mcp.webp" alt="逐渐精简的指令材料经过接口后，独立请求被均匀分发到三个服务模块" width="2048" height="1152" loading="eager" />
  <figcaption>提示词在变薄，协议在变轻，但复杂性没有消失，而是被放回工具、接口、状态和验证系统。</figcaption>
</figure>

## 先别急着得出“提示词没用了”

Thariq 的原文标题是《The new rules of context engineering for Claude 5 models》。文章给出的数字很醒目：Claude Code 为新模型删除了 80% 以上的系统提示词，编码评测没有明显退步。

但它不是在说系统提示词已经没有价值。

系统提示词仍然要告诉模型：它处于什么产品中、可以做什么、有哪些不能越过的边界。改变的是那些为了补偿旧模型判断力不足而积累起来的微观规则。规则越积越多之后，经常会互相冲突：一个地方要求“适当补充文档”，另一个地方又写着“不要添加注释”。模型不得不先解决规则冲突，才能开始解决用户的问题。

Claude Code 团队总结出的变化可以压缩成下面几组：

| 过去常见的做法 | 新模型上的做法 |
| --- | --- |
| 给模型大量绝对规则 | 描述目标和边界，让模型结合上下文判断 |
| 为工具调用列出许多示例 | 把工具接口、参数和状态设计清楚 |
| 把所有知识一次性塞进系统提示词 | 使用 Skills 和渐进式加载，按需获取上下文 |
| 在系统提示词和工具描述里重复同一规则 | 让一条规则只保留一个权威位置 |
| 用 `CLAUDE.md` 保存所有记忆 | 只记录仓库特有的坑，其余交给记忆和引用系统 |
| 只提供文字规格 | 提供代码、测试、HTML 原型和 rubric 等高保真参考 |

原文里有一个很好的例子。旧提示词会直接规定“默认不要写注释”“不要写多段文档字符串”。新版本只保留一句更高层的要求：

> 写出符合当前代码库的代码，遵循它已有的注释密度、命名方式和惯用写法。

旧规则试图替模型完成每一种局部判断，新规则只规定判断依据。

## 从 Prompt Engineering 到 Context Engineering

Prompt 通常是用户这一次发出的任务；Context 则是模型在执行任务时能看到的全部信息，包括系统提示词、Skills、项目说明、记忆、工具定义、代码和当前运行状态。

所以“提示词变短”并不等于“上下文不重要”。更准确的变化是：**不要把所有上下文都写进一份永久生效的总指令。**

例如，代码评审流程并不是每次任务都需要。如果把完整检查表放在系统提示词里，它会在写文档、查资料、改一个错字时照样占用上下文。把它拆成一个 Code Review Skill 后，Agent 只在评审任务中加载它。这就是渐进式披露：先提供索引和触发条件，真正用到时再加载细节。

这也解释了为什么工具接口开始比工具示例更重要。一个工具如果把状态限制为 `pending`、`in_progress`、`completed`，并明确同一时间只能有一个任务处于 `in_progress`，模型从接口本身就能理解正确用法。相比在提示词里放五段调用示例，结构化接口更短，也更难产生歧义。

## MCP 不是“从 WebSocket 改成 RPC”

另一条更新很容易被转述成“MCP 不再使用 WebSocket，改用 RPC”。这个说法抓住了方向，但技术上不准确。

MCP 一直使用 **JSON-RPC 2.0** 编码消息。RPC 是 Remote Procedure Call，也就是“远程过程调用”：客户端像调用本地函数一样，向远端发送方法名和参数，再收到结果。例如一次工具调用可以抽象成：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search",
    "arguments": { "q": "MCP stateless" }
  }
}
```

JSON-RPC 规定的是消息长什么样；HTTP、SSE、WebSocket 规定的是消息怎么传。它们不在同一层。

MCP 官方此前的远程传输也不是标准 WebSocket，而是 Streamable HTTP：客户端使用 HTTP POST 发送消息，服务端需要流式返回时使用 SSE。SSE 全称 Server-Sent Events，可以理解为服务端沿着一条 HTTP 响应持续向客户端推送进度和结果。

因此这次真正的变化不是“WebSocket 换成 RPC”，而是：**JSON-RPC 消息继续保留，承载它的远程协议从依赖会话和双向通道，转向彼此独立、自带上下文的 HTTP 请求。**

## 旧 MCP 为什么不容易横向扩容

2025-11-25 版 MCP 有初始化握手和协议级 Session。客户端第一次连接时交换版本与能力，服务端可能返回 `Mcp-Session-Id`；后面的请求都带着这个 Session ID。

如果 Session 状态只保存在某一台服务实例的内存里，后续请求就必须继续交给同一台实例。这叫 sticky session，也就是“粘性会话”。它不一定有问题，但会提高扩容和故障恢复的成本。

2026-07-28 版删除了 `initialize/initialized` 握手和协议级 Session。每个请求都带上协议版本、客户端身份和能力信息；需要提前了解服务端能力时，可以选择调用新的 `server/discover` RPC，但它不是必需步骤。

这样一来，任意请求都可以落到任意一台实例上。

## round-robin 到底是什么

`round-robin` 通常翻译成轮询。可以把它想成大厅里有三个办事窗口：

```text
请求 1 -> 窗口 A
请求 2 -> 窗口 B
请求 3 -> 窗口 C
请求 4 -> 窗口 A
```

负载均衡器按顺序把新请求分给各个实例。它不需要先理解这个用户之前去了哪个窗口，也不需要检查哪台机器保存了对应的 Session。

在旧的有状态方式下，如果请求 1 在窗口 A 建立了会话，请求 4 可能还必须回到 A。A 一旦故障，会话状态也可能一起丢失。或者团队需要把 Session 存进 Redis 等共享存储，让 B、C 也能继续处理，这又增加了一套基础设施。

无状态 MCP 让普通 round-robin 可以直接工作：

| 有状态 MCP | 无状态 MCP |
| --- | --- |
| 请求依赖初始化阶段保存的信息 | 每个请求携带处理所需的协议信息 |
| 常常需要 sticky session | 任意实例都能处理任意请求 |
| 扩容时要复制或共享 Session | 可以直接增加服务实例 |
| 实例故障可能带走协议会话 | 单次请求失败后可以由其他实例继续接收新请求 |

这里的“无状态”只指协议层。业务仍然可以有状态，例如一次长任务可以返回显式的 `task_id`，下一次调用再把它作为参数传回来。区别在于状态不再偷偷绑定在某条连接或某台机器上，而是成为应用能够看见、存储和审计的对象。

## MRTR 如何替代一直挂着的双向请求

旧协议允许服务端在处理工具调用的过程中，沿着保持打开的流反过来向客户端请求信息。例如工具准备执行删除操作，需要用户再确认一次。服务端发出 `elicitation/create`，然后保持现场等待客户端回答。

新规范使用 **Multi Round-Trip Requests，简称 MRTR**。它把交互改成多个完整的请求与响应：

```text
客户端调用工具
  -> 服务端返回 input_required，并说明还需要什么
  -> 客户端询问用户或模型
  -> 客户端带着 inputResponses 重新提交原请求
  -> 服务端继续执行并返回结果
```

服务端不需要为了等用户操作而长期保留一次双向 RPC 的运行现场。任何实例收到第二次请求，都可以根据请求中的信息恢复处理。

这不是没有成本。MRTR 会增加一次或多次网络往返，服务端也要把可恢复状态设计清楚。它换来的，是更容易放进负载均衡、Serverless 和多实例部署中的运行方式。

## 长连接没有彻底消失

新 MCP 仍然保留 SSE，只是把它的用途收窄了：

- 一个 HTTP POST 如果需要持续返回进度，可以使用只属于该请求的 SSE 响应流；
- 客户端如果需要监听工具列表或资源变化，可以调用 `subscriptions/listen`，建立明确的订阅流；
- 普通请求不再依赖一个长期存在的通用 GET 流；
- 服务端不能在无关的后台时刻随意向客户端发起 Sampling、Elicitation 或 Roots 请求。

所以“更省资源”也要说清楚。节省的主要是协议级 Session、粘性路由、共享会话存储以及长期双向连接的管理成本，不代表每一次工具调用都会更快、更省带宽。需要流式进度和实时订阅时，连接仍然存在。

## 两次更新真正相同的地方

Claude 5 的提示词变化，是把判断从密集的全局规则移回模型、工具接口和按需上下文；MCP 的变化，是把状态从隐式连接移到显式请求和应用对象。

两者都没有消灭复杂性，只是把复杂性放回了更适合的位置：

| 隐式复杂性 | 更明确的归属 |
| --- | --- |
| 系统提示词里的大量微观规则 | 模型判断、仓库惯例与专用 Skill |
| 重复的工具调用示例 | 参数 Schema、工具描述和返回类型 |
| 永久占用上下文的工作流 | 按需加载的渐进式说明 |
| 连接中隐藏的客户端能力 | 每次请求携带的元数据 |
| 服务实例内存中的协议会话 | 显式 task handle 或业务状态 |
| 长期双向通道中的等待现场 | 可恢复的 MRTR 请求 |

这也是我理解的 Agent 工程成熟过程：不是不断往 Prompt 和 Runtime 里堆补丁，而是持续判断一条约束究竟属于模型、工具、协议、应用状态，还是验证系统。

## 我们自己的规则应该怎么改

看完 Anthropic 的经验后，最危险的动作就是立刻删掉自己 80% 的规则。这个比例来自 Claude Code 针对特定新模型的编码评测，不是一条通用公式。更合理的做法是逐类检查：

1. 删除模型从代码和目录就能直接看出来的常识。
2. 合并在系统提示词、项目说明和工具描述中重复出现的要求。
3. 把测试、评审、部署等只在特定任务触发的流程拆成 Skills。
4. 用 Schema、权限和确定性检查替代反复强调的自然语言提醒。
5. 每次替换模型后重新跑评测，不把旧模型上的经验直接继承给新模型。

但下面这些内容仍然应该保留，而且要写得清楚：

- 隐私与数据边界；
- 权限范围和破坏性操作限制；
- 凭据处理规则；
- 发布、付款、删除等不可逆动作的审批门禁；
- 仓库里无法从代码直接发现的特殊约束；
- 最终结果必须通过的测试和验收标准。

模型能力变强，可以减少“手把手教它怎么做”；系统风险并不会因此消失。对高风险动作来说，最可靠的约束也不应该只写在提示词里，而要落到权限、工具实现和自动化验证中。

## 最后

Claude Code 删除大部分系统提示词，不代表 Prompt Engineering 结束了。它说明新模型开始能够在更高层的原则下做局部判断，我们应该少写互相冲突的微观命令，多设计清晰的工具、上下文入口和验收系统。

MCP 变成无状态协议，也不代表实时连接和业务状态消失了。它只是把会话从传输层拿出来，让每个请求可以独立路由，让需要延续的状态以明确对象存在。

如果要把两次更新压成一句话，我会这样理解：**能力增强之后，好的 Agent 工程不是继续增加脚手架，而是删除已经过时的脚手架，同时把真正不能丢的边界做得更硬。**

## References / 相关链接

- [Thariq：The new rules of context engineering for Claude 5 models（2026-07-25）](https://x.com/trq212/status/2080710971228918066)
- [Anthropic：Effective context engineering for AI agents（2025-09-29）](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic：Harness design for long-running application development（2026-03-24）](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [MCP：The 2026-07-28 Specification（2026-07-28）](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [MCP 2026-07-28 Streamable HTTP 规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [MCP：Exploring the Future of MCP Transports（2025-12-19）](https://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/)
