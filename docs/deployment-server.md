# 自托管部署

站点构建为纯静态文件，不需要 Node.js 常驻进程、数据库或 CMS。文章在本地 `src/content/posts/` 维护，服务器只提供 `dist/`。

当前生产域名仍由 GitHub Pages 承载；本页描述的是迁移到独立服务器时使用的发布方案。完成服务器 Web 入口、TLS 和 DNS 切换前，不要移除仓库根目录与 `public/` 中的两个 `CNAME` 文件，也不要停用 Pages 工作流。

## 本地构建

```bash
pnpm install --frozen-lockfile
pnpm build
```

构建产物位于 `dist/`。本地可以使用 `pnpm preview` 查看最终静态行为。

## Nginx

将 [`deploy/nginx/blog.conf`](../deploy/nginx/blog.conf) 复制到 Nginx 配置目录，并确认 `/var/www/blog.sagecompanion.top/current` 指向最近一次 release。首次上线前，用 certbot 或服务器已有 TLS 自动化为 `blog.sagecompanion.top` 配置 HTTPS，再把 HTTP server block 改为 301 跳转。

## 手动部署

```bash
pnpm build
DEPLOY_HOST=root@example.com DEPLOY_PORT=22 ./scripts/deploy-server.sh
```

脚本采用 release 目录和 `current` 符号链接，切换失败时不会覆盖上一版本。不要把 SSH 私钥、服务器地址或密码写入仓库。

## GitHub Actions

`.github/workflows/deploy-server.yml` 只支持手动触发，并要求仓库 secrets：`DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_PORT`（可选）和 `DEPLOY_SSH_KEY`。工作流默认上传到 `/var/www/blog.sagecompanion.top/releases/<commit>`，随后原子切换 `current`。迁移验收通过后，再停用 GitHub Pages 并切换 DNS。
