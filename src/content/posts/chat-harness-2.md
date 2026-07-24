---
title: "Chat Harness 2.0：Agent 长任务需要怎样的运行底座"
description: "从事件流、上下文预算、持久化和工具审批出发，拆解一个可恢复 Agent Harness 的工程边界。"
publishDate: 2026-07-22
category: agent
tags: [Agent, Context, Runtime]
featured: true
draft: false
visibility: public
publish: true
---

Agent 能调用工具，并不等于它能稳定完成长任务。真正困难的是：当上下文不断增长、工具产生副作用、网络发生中断时，系统能否解释现在在哪里，并从可靠状态继续。

## Harness 负责什么

模型负责生成下一步意图，Harness 负责把意图变成受控执行。一个可用的 Harness 至少要处理：

- 消息与工具事件的稳定协议；
- 上下文投影、预算和压缩；
- 工作记忆与持久化状态；
- 文件、Shell、Git 等工具权限；
- 审批、取消、重试和恢复；
- 用量、Artifact 与执行证据。

这些能力如果散落在 UI、API 和工具实现里，任何一次协议调整都会造成跨层回归。

## Timeline 不是聊天记录

普通聊天记录只保存可见文本。Agent timeline 还需要保存计划、推理阶段、工具调用、审批、结果摘要、错误和 checkpoint。

事件应该先持久化，再转换成前端视图与模型上下文。这样 UI 可以恢复，模型上下文也可以按预算重新投影，而不必把全部历史原样塞回窗口。

```python
class RunEvent:
    event_id: str
    session_id: str
    stage: str
    payload: dict
    created_at: datetime
```

事件模型的重点不是字段数量，而是让运行状态拥有稳定身份。重试、断线重连和多端观察才有明确依据。

## 压缩必须可验证

上下文压缩不是简单摘要。摘要需要说明覆盖范围、保留的决策、未完成事项和与原始记录的对应关系。旧事件仍应保存在持久层，摘要只是下一轮上下文投影的一部分。

这也是 SAGE 把 Compaction Store、Session Event Journal 和 Tool Result Store 分开的原因：运行历史、上下文视图和大型工具结果有不同的生命周期。

## 最终目标

优秀的 Harness 不追求让 Agent 看起来“更自主”，而是让每一次自主行为都更容易观察、限制、恢复和验证。这是从 Demo 走向工程系统的分界线。
