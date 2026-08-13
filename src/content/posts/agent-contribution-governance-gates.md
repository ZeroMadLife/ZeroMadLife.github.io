---
title: "Agent 贡献不该只靠一份说明书：把规则变成合并门禁"
description: "从 AutoGPT 的维护实践理解 AGENTS.md、Skill、PR、CI 与人工决策的职责边界，以及如何把 Agent 贡献变成可追溯交付。"
published: 2026-08-13
updated: 2026-08-13
slug: agent-contribution-governance-gates
image: "/images/posts/agent-contribution-governance-gates.webp"
imageAlt: "Agent 和人类提交经过局部 AGENTS.md、PR 测试计划、CI 与人工决定，并由 Skill 约束重复浏览器动作的治理图"
category: agent
tags: [Agent 工程, Harness, 评测]
featured: false
draft: false
visibility: public
publish: true
---
# Agent 贡献不该只靠一份说明书：把规则变成合并门禁

代码 Agent 能生成 diff、补测试、回复评审，甚至持续盯着 CI。但这不等于仓库已经具备接收 Agent 贡献的能力。真正拖垮维护者的，往往不是某一段代码写错，而是每个 PR 都要重新解释范围、测试方法、评审回复是否完成，以及谁对合并后的长期维护负责。

GitHub 在 2026 年 8 月 12 日发布了一篇对 AutoGPT 工程师 Nicholas Tindle 的访谈。它最值得借鉴的不是“让 Agent 多干活”，而是一个转换：**把只写在文档里的期待，拆成 Agent 能发现的局部指令、能填写的变更证据、能自动检查的门槛，以及不能外包的人类决定。**

这四层都在，Agent 贡献才可能从“看起来合理”变成“可以按同一把尺子审查”。

## `AGENTS.md` 管局部工程约束

`AGENTS.md` 可以理解为放在代码旁的施工说明：进入一个目录时，告诉 Agent 这里有哪些模块、怎样格式化、该跑什么测试、PR 要满足什么约定。

AutoGPT 当前公开仓库的根 `AGENTS.md` 就为 `autogpt_platform` 写明了路径、格式化与测试命令、PR 模板和提交格式。这个文件能影响“下一步怎么做”，但不能证明“已经正确做完”。菜谱能要求称重和试味，却不能替代温度计，也不能替代最后决定是否端上桌的人。

局部性同样重要。根目录应该放全局约束；进入后端、前端或测试目录后，再由离代码更近的说明补充局部规范。规则太少，Agent 不知道该看什么；规则到处复制，又会把无关内容塞进上下文。追求的不是最长的 `AGENTS.md`，而是**在任务发生的位置放最少但足够的工程规则**。

它适合约束的是当前代码范围中的命令、结构、测试入口和风险边界，不适合承载所有会反复执行的操作流程，更不能代替权限系统。自然语言说明可以影响 Agent 想做什么，真正允许什么仍由运行环境、工具权限和交付门禁决定。

## Skill 管重复、触发明确的动作流程

Skill 解决的是另一类问题：有些动作会反复出现，触发条件明确，而且每一步都应当指向准确。

例如做浏览器盯盘时，可以把以下动作封装成一个 Skill：

```text
观察页面状态
  -> 点击指定控件
  -> 输入文本
  -> 选择下拉项
  -> 发起查询
  -> 再次观察变化
```

Skill 不只是把“点击、输入、查询”写成命令列表。它还要规定何时加载、如何定位目标、每次动作后观察什么、页面没有变化时是否重试，以及出现登录、验证码或高风险操作时如何停止。

这类流程的共同特征是：重复性高、动作边界清楚、成功信号可观察。它们适合被复用，也适合被测试。相比之下，“这个需求是否符合产品路线”“这次重构是否值得承担兼容风险”没有固定动作序列，不应该强行塞进 Skill 让它自动决定。

因此可以先记住一个实用分工：

| 工件 | 主要回答的问题 |
| --- | --- |
| `AGENTS.md` | 在这个仓库、这个目录里，工程工作应遵守什么局部规则 |
| Skill | 遇到某类重复任务时，按什么动作流程执行和观察 |
| CI / PR / 人工审批 | 这次具体变更是否有足够证据被合并 |

## 把一次贡献拆成四道门

### 1. 指令门：规则必须在正确的位置被发现

目录旁的 `AGENTS.md` 负责稳定的仓库事实。对经常重复、需要按任务触发的工作，Skill 更合适。GitHub 访谈中的例子是为 PR 测试、评审回复准备专门 Skill；AutoGPT 的公开目录也能看到 `pr-test`、`pr-review` 和 `pr-address`。

关键不是文件扩展名，而是触发条件明确：遇到评审意见时加载“如何把意见处理到可验证完成”的流程，而不是希望一份通用说明被正确联想出来。

### 2. 证据门：PR 要说明“我如何确认”

当前 AutoGPT PR 模板要求作者说明 Why / What / How，并列出 Changes、test plan 和按计划测试的勾选项。这是低成本的结构化接口：评审者不用先从 diff 猜动机，Agent 也不能只留下一句“已完成”。

但模板本身不是证明。勾选“已测试”不会让测试自动发生。正确做法是要求贡献者写明改了哪条接口、覆盖哪个失败分支、运行什么命令、预期与实际结果是什么，再由 CI、评审或复现把声明变成证据。

对于 Agent 来说，测试计划还有一层价值：它把“把功能写出来”改写为“写完后必须让某个可观察结果成立”。这是从生成代码转向交付变更的最小约束。

### 3. 机器门：让可量化要求真的失败

格式化、类型检查、单元测试、集成测试、许可扫描和改动行覆盖率，更适合由 CI 作为合并前的客观信号。

AutoGPT 固定快照的 `codecov.yml` 为后端改动行设置 80% patch target、前端设置 70% patch target。它说明团队把“改动是否被测试碰到”写成了可计算对象；它**不能**证明每个 target 在当前分支都一定是阻塞检查，尤其配置中有 informational 状态。

| 问题 | 应由谁回答 |
| --- | --- |
| 代码是否格式正确、测试是否通过、覆盖率是否达到配置目标 | CI 和可重复命令 |
| 需求是否该做、实现是否符合路线图、风险是否值得接受 | 人类维护者 |

把第二类问题假装成自动化分数，会得到“检查全绿但方向错误”的 PR；把第一类问题全交给人工，又会让评审时间被机械检查吞掉。

### 4. 追责门：评审线程不能靠“已读”关闭

最容易出现的假完成，是 Agent 把评审线程标成 resolved，却没有对应修复。AutoGPT 当前 `pr-address` Skill 把顺序写得明确：修复 -> commit -> push -> inline reply -> resolve；若不需要改代码，也必须给出具体技术理由。

本质是建立关联：**一条评审意见必须能追到一个真实 diff，或追到一个可反驳、可复查的理由。** “收到”“后续处理”不是解决，只是把待办移出视线。

最终合并决定仍应由人保留。Agent 可以收集证据、修复确定问题、重复运行验证；范围取舍、维护成本、产品优先级和例外批准，需要对仓库长期负责的主体承担。

## 把贡献链做成状态机

如果把 Agent 写代码看成一个 Harness，稳妥设计不是“给它更长的 prompt”，而是定义可审计状态：

```text
任务已澄清
  -> 局部规则已加载
  -> 适用 Skill 已触发
  -> 变更已生成
  -> 测试计划已声明
  -> 自动检查通过
  -> 评审意见有证据回应
  -> 人工批准或拒绝
```

每次状态迁移都应有证据指针：加载了哪份规则和 Skill、跑了哪组测试、CI 链接是什么、哪一个 commit 回应了哪条评论、谁作出最终决定。出现回归时，团队才能区分是 Agent 没读到规则、Skill 动作不准确、检查没有覆盖，还是人类主动接受了风险。

这与模型是否足够强无关。更强的模型也会在没有触发条件时跳过局部规范，在没有失败信号时把“看起来成功”当成成功。好的 Harness 不是替模型思考，而是把不能依赖记忆和自觉的责任放到确定性流程里。

## 不该照搬的地方

不要把每条经验都升级为硬门禁。覆盖率、模板字段和评审回复规则都可能有例外，规则本身需要版本化，并定期检查是否只是在制造填表劳动。

不要把 CLA、OAuth 或浏览器操作当成可靠的安全认证。GitHub 访谈把它们作为让人类重新参与的门槛案例，但身份、授权和供应链信任仍需独立设计。

不要把 Agent PR 数量、星标数、成本或“几乎不会有不能运行的 PR”当成自己的收益预测。它们来自一次官方访谈中的受访者经验，本文没有独立复现。

## 结尾

Agent 时代的仓库治理，不是把文档改名为 `AGENTS.md` 就结束。`AGENTS.md` 负责局部工程规则，Skill 负责重复且指向明确的动作流程，PR 模板索取声明，CI 验证可量化事实，评审链把意见和修复绑在一起，人类负责方向与例外。

当这几层彼此补位时，Agent 才不是一台不断提交 diff 的机器，而是进入一条能失败、能回滚、能解释、也能拒绝的工程交付链。对维护者而言，最有价值的结果不是收到更多 PR，而是每一个被合并的变更都知道自己为什么能被信任。

## References / 公开来源

- GitHub Blog. [*Your contributors are AI-first now. Is your project?*](https://github.blog/open-source/maintainers/your-contributors-are-ai-first-now-is-your-project/)，2026-08-12。对 AutoGPT 工程师 Nicholas Tindle 的访谈；本文将其中的规模和效果叙述视为受访者经验。
- Significant-Gravitas/AutoGPT. [*AGENTS.md*](https://github.com/Significant-Gravitas/AutoGPT/blob/3b05496c1ec819b08b829c186f7cc9ad3c5b4376/AGENTS.md)，固定提交 `3b05496`，2026-08-10 快照。
- Significant-Gravitas/AutoGPT. [*Pull request template*](https://github.com/Significant-Gravitas/AutoGPT/blob/3b05496c1ec819b08b829c186f7cc9ad3c5b4376/.github/PULL_REQUEST_TEMPLATE.md)，固定提交 `3b05496`。
- Significant-Gravitas/AutoGPT. [*pr-address Skill*](https://github.com/Significant-Gravitas/AutoGPT/blob/3b05496c1ec819b08b829c186f7cc9ad3c5b4376/.claude/skills/pr-address/SKILL.md)，固定提交 `3b05496`。
- Significant-Gravitas/AutoGPT. [*codecov.yml*](https://github.com/Significant-Gravitas/AutoGPT/blob/3b05496c1ec819b08b829c186f7cc9ad3c5b4376/codecov.yml)，固定提交 `3b05496`。
