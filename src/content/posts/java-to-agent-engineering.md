---
title: "从 Java 后端到 Agent 工程：哪些能力可以直接迁移"
description: "Agent 工程不是抛弃后端基础，而是把协议、状态、权限和可观测性带进模型驱动系统。"
published: 2026-07-18
category: backend
tags: [Java 后端, Agent 工程]
featured: false
draft: false
visibility: public
publish: true
---

从 Java 后端转向 Agent 工程时，很容易被新的框架和名词淹没。实际项目中，最难的问题仍然来自状态、协议、边界和故障恢复。

## 可以直接迁移的能力

后端工程训练提供了几项关键基础：

- 用领域边界拆分职责，而不是把所有逻辑塞进一个 Agent；
- 用状态机和事件处理长任务生命周期；
- 为外部调用设计超时、重试、幂等和熔断；
- 对输入、权限和副作用设置明确门禁；
- 用日志、指标和 Trace 解释一次运行；
- 用测试与发布流程限制回归。

在 Agent 系统里，工具调用类似外部服务请求，只是请求参数来自概率模型。参数越不确定，执行边界越应该严格。

## 需要补齐的部分

新的学习重点包括：

1. Token、上下文窗口与 Prompt Cache；
2. Tool Calling 和结构化输出；
3. RAG、重排、引用与评测；
4. Memory 和 Context Engineering；
5. Model Provider 差异与推理强度；
6. Agent Harness、Skills、MCP 与 Sandbox。

这些能力应该在真实项目中被验证，而不是只停留在概念清单。

## 用项目建立证据

SAGE 是我的主要实践场。每次加入能力时，我会同时关注协议、持久化、前端事件、测试和生产边界。博客则记录设计取舍、失败路径和可复用结论。

转型不是把旧技术栈清空重来，而是重新解释已有能力，并补齐模型系统特有的不确定性。
