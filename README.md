# ZeroMadLife Blog

个人技术博客，记录 SAGE、AI Agent 工程、后端系统与持续成长。

- Production: <https://blog.sagecompanion.top>
- SAGE: <https://sagecompanion.top>
- GitHub: <https://github.com/ZeroMadLife>

## Development

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

站点由 Astro 静态生成，当前生产环境通过 GitHub Pages 发布；仓库同时保留可回滚的自托管服务器与 Nginx 配置。两种部署方式都只发布静态文件，不需要常驻 Node.js、数据库或 CMS。公开文章必须在 frontmatter 中同时设置：

```yaml
visibility: public
publish: true
```

原始面试记录和私有知识不进入本仓库。

服务器迁移配置与首次上线步骤见 [`docs/deployment-server.md`](docs/deployment-server.md)。
