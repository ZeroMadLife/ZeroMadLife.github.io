import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function formatDate(date) {
	return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function parseArguments(args) {
	const slug = args[0];
	const titleIndex = args.indexOf("--title");
	const title = titleIndex >= 0 ? args[titleIndex + 1] : slug;
	if (!slug || !title) {
		throw new Error('Usage: pnpm new-post -- <slug> --title "文章标题"');
	}
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.mdx?)?$/i.test(slug)) {
		throw new Error("Slug 只能包含英文字母、数字和连字符，不能包含目录或路径字符");
	}
	return { slug: /\.mdx?$/i.test(slug) ? slug : `${slug}.md`, title };
}

export function createPost({ args, targetDir, now = new Date() }) {
	const { slug, title } = parseArguments(args);
	const outputDir = path.resolve(targetDir || process.env.BLOG_POSTS_DIR || path.join(repoRoot, "src/content/posts"));
	const fullPath = path.join(outputDir, slug);
	if (path.dirname(fullPath) !== outputDir) throw new Error("目标文件必须位于文章目录内");
	fs.mkdirSync(outputDir, { recursive: true });
	const content = `---
title: ${JSON.stringify(title)}
published: ${formatDate(now)}
description: ""
image: ""
tags: []
category: ""
draft: true
visibility: public
publish: true
lang: zh_CN
---

# ${title}
`;
	fs.writeFileSync(fullPath, content, { encoding: "utf8", flag: "wx" });
	return fullPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		console.log(`Draft created: ${createPost({ args: process.argv.slice(2) })}`);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exitCode = 1;
	}
}
