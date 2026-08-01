## 这里是什么

这是 ZeroMadLife 的公开知识库，记录 Agent 工程、Java 后端、检索系统和长期成长中的判断过程。

它不是个人生活档案，也不是把 Obsidian 私有笔记整库同步到网上。公开文章只保留可以对外解释、引用和复盘的内容；个人信息、内部项目细节、凭证与未审阅草稿留在本地边界内。

## 怎么维护

- 文章以 Markdown/MDX 存放在本地仓库。
- 只有 `visibility: public`、`publish: true` 且 `draft: false` 的文章会进入构建产物。
- Astro 生成纯静态文件，服务器只需要 Nginx 或其他静态文件服务。
- Pagefind 提供本地搜索，RSS、Sitemap 和文章归档随构建自动更新。

## 内容方向

### Agent 工程

Context、Memory、RAG、Harness、Graph Engineering、评测和证据链。

### 后端基础

Java、状态机、协议、权限、可靠性、可观测性和故障恢复。

### 实践复盘

把一次真实的实现、取舍和失败边界写成下一次可以复用的材料。

## 关于主题

站点使用 [Mizuki](https://github.com/LyraVoid/Mizuki) 作为 Astro 主题基础，并保留其响应式导航、搜索、主题色、壁纸、目录、列表/网格切换、RSS、Sitemap 和图片灯箱能力。横幅图片使用本地景观素材，不复制参考站的品牌图案。
