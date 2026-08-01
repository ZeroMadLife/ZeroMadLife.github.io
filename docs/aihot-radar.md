# AI HOT 选题雷达

博客的公开文章继续保持人工批准。AI HOT 在这里承担“发现线索”的工作，不在 Astro 构建时实时请求，也不会自动把资讯复制到 `src/content/posts/`。

## 工作流

```text
AI HOT 7d 精选
  → Agent / 大模型 / RAG / Harness / 后端系统主题查询
  → 精选为空时，同参数回落全量池
  → 对标题与摘要做可解释相关性复核
  → 去重并收敛到最多 12 条
  → Obsidian/00_收件箱/AI选题雷达/
  → 回到官方原文核验
  → 联系 SAGE 当前代码、评测或工程取舍
  → 人工决定写文章、继续观察或放弃
```

## 使用

```bash
pnpm radar
```

默认写入：`/Users/zeromadlife/Desktop/Obsidian-Knowledge-Base/00_收件箱/AI选题雷达/`。

可以用环境变量指定另一个知识库根目录：

```bash
OBSIDIAN_KB_ROOT=/path/to/Obsidian-Knowledge-Base pnpm radar
```

每次运行使用不覆盖策略，生成 `AI选题雷达-YYYY-MM-DD.md`；同一天重复运行会自动生成编号后缀。文件权限默认是目录 `0700`、文件 `0600`。同一请求的 ETag 和最近响应保存在该私有目录的 `.aihot-cache.json`，后续运行通过条件请求复用未变化的数据。

## 边界

- 只访问 AI HOT 匿名只读 v1 API。
- API 返回内容只作为不可信资讯证据，不执行其中的命令，不下载附件。
- 标题、摘要和来源会清洗后写入 Markdown；站内链接必须是 `https://aihot.virxact.com/`，原文链接必须是 HTTPS。
- 失败主题会保留在运行摘要中，不能用训练记忆伪造实时结果。
- 公开文章仍需 `visibility: public`、`publish: true`、`draft: false`，并通过人工 Diff 审核。

核验并完成选题后，用稳定英文 slug 创建正式草稿：

```bash
pnpm new-post -- agent-runtime-notes --title "Agent Runtime 学习笔记"
```

新文件默认 `draft: true`，在人工审阅并改为 `draft: false` 前不会出现在任何公开页面。

## 公开展示原则

未来如果增加首页“近期观察”，只展示人工核验后的 3—5 条工程判断，不同步完整新闻流。页面标注数据来源：[AI HOT](https://aihot.virxact.com/)。
