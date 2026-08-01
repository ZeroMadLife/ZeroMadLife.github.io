---
title: "SAGE：让问题成为可以持续生长的证据"
description: "SAGE 为什么不只是另一个聊天框，以及目标、知识、实践和证据如何形成可恢复的学习闭环。"
published: 2026-07-24
category: agent
tags: [SAGE, Harness, Knowledge]
featured: true
draft: false
visibility: public
publish: true
---

大模型可以很快给出答案，但一次回答通常不会自然变成长期能力。上下文结束后，来源、判断过程、执行证据和下一步行动很容易一起消失。

SAGE 的出发点不是“做一个更漂亮的聊天框”，而是回答另一个问题：**怎样让一次探索继续成为可以检索、验证和复盘的成长记录？**

## 从回答到闭环

SAGE 把学习过程整理为六个连续阶段：

```text
Purpose → Explore → Knowledge → Practice → Evidence → Evolve
```

- **Purpose** 明确现在要解决的问题，以及它为什么值得解决。
- **Explore** 连接网页、代码仓库、本地资料和模型能力。
- **Knowledge** 保存来源快照、提案、引用与可审阅知识。
- **Practice** 在受控工作区中阅读、修改、执行和测试。
- **Evidence** 留下 timeline、artifact、diff、citation 与 usage。
- **Evolve** 用证据复盘，并把结果带入下一轮目标。

这套链路刻意避免把“模型说过”当成“已经掌握”。只有经过真实执行、来源引用或人工批准的结果，才进入长期知识。

## 为什么需要统一 Harness

如果对话、Coding、Knowledge 和工具分别维护自己的会话状态，用户会在不同页面不断重建上下文。SAGE 使用统一 Chat Harness 管理：

1. 流式事件与可恢复 timeline；
2. 上下文预算、摘要和 checkpoint；
3. 工具调用、审批与运行证据；
4. Skills、MCP 和受限子 Agent；
5. Provider 能力与工作区边界。

Coding 因此成为 Practice Engine，而不是一个附属输入框。它必须展示计划、工具、Diff、测试和审批，让“理解”可以被验证。

## 当前边界

SAGE 仍处于受控公开 beta。公开主页只展示筛选后的项目、笔记和成长轨迹；公网问答只检索限定公开资料，不共享主对话的文件权限。

正式开放更强的公网 Harness 前，还需要完成生产 Sandbox、租户级 Knowledge 隔离和部署门禁。把边界写清楚，比提前宣称一个不存在的成熟产品更重要。

项目源码和进展记录在 [GitHub](https://github.com/ZeroMadLife/sage-agent)，公开体验位于 [sagecompanion.top](https://sagecompanion.top)。
