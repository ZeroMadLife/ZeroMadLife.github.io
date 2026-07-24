#!/usr/bin/env node
// 新建文章脚手架：npm run new "文章标题" [-- --category backend --slug my-slug]
// 生成 src/content/posts/<slug>.md，带合规 frontmatter（visibility: public / publish: true）。
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const CATEGORIES = ['agent', 'backend', 'growth'];

const argv = process.argv.slice(2);
const positional = [];
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const key = argv[i].slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    flags[key] = val;
  } else {
    positional.push(argv[i]);
  }
}

const title = positional.join(' ').trim();
if (!title) {
  console.error('用法: npm run new "文章标题" [-- --category agent|backend|growth --slug 自定义-slug --draft]');
  process.exit(1);
}

const category = flags.category || 'agent';
if (!CATEGORIES.includes(category)) {
  console.error(`category 只能是: ${CATEGORIES.join(' / ')}（收到 "${category}"）`);
  process.exit(1);
}

// slug: 优先 --slug；否则从标题生成（保留中文，空白与符号转连字符）
function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
const slug = flags.slug ? slugify(flags.slug) : slugify(title);
if (!slug) {
  console.error('无法从标题生成 slug，请用 --slug 指定英文文件名。');
  process.exit(1);
}

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

mkdirSync(POSTS_DIR, { recursive: true });
const filePath = join(POSTS_DIR, `${slug}.md`);
if (existsSync(filePath)) {
  console.error(`文件已存在，换个 --slug: ${filePath}`);
  process.exit(1);
}

const draft = flags.draft === 'true' || flags.draft === '' ? true : false;
const escaped = title.replace(/"/g, '\\"');

const content = `---
title: "${escaped}"
description: "一句话摘要，用来做列表副标题、SEO 描述和 RSS 摘要。"
publishDate: ${date}
category: ${category}
tags: []
featured: false
draft: ${draft}
visibility: public
publish: true
---

正文从这里开始。

## 小标题

用清晰的二级、三级标题组织内容，方便阅读和 SEO。
`;

writeFileSync(filePath, content, 'utf8');
console.log(`已创建: src/content/posts/${slug}.md`);
console.log(`访问路径: /posts/${slug}/`);
console.log(`分类: ${category}${draft ? '  (draft: 暂不上线)' : ''}`);
console.log('用 Typora / Obsidian / VS Code 打开写正文，记得补 description 和 tags。');
