import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import test from "node:test";
import matter from "gray-matter";
import { parse } from "node-html-parser";
import sharp from "sharp";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
const postsDirectory = join(root, "src", "content", "posts");

const postSlugs = [
	"agent-environment-interface-misalignment",
	"agent-eval-harness-containment",
	"agent-evaluation-four-layers",
	"agent-memory-boundaries",
	"chat-harness-2",
	"claude-5-stateless-mcp",
	"java-to-agent-engineering",
	"loop-to-graph-engineering",
	"rag-tradeoffs-restraint",
	"sage-from-question-to-growth",
];

function readGeneratedText() {
	const textExtensions = new Set([
		".css",
		".html",
		".js",
		".json",
		".mjs",
		".xml",
	]);
	const files = [];
	const visit = (directory) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) {
				visit(path);
			} else if (
				[...textExtensions].some((extension) => entry.name.endsWith(extension))
			) {
				files.push(readFileSync(path, "utf8"));
			}
		}
	};
	visit(dist);
	return files.join("\n");
}

test("the public article URLs remain available", () => {
	for (const slug of postSlugs) {
		assert.ok(
			existsSync(join(dist, "posts", slug, "index.html")),
			"missing /posts/" + slug + "/",
		);
	}
});

test("a post main image has one source and one rendered img", () => {
	for (const file of readdirSync(postsDirectory)) {
		if (!file.endsWith(".md")) continue;

		const source = readFileSync(join(postsDirectory, file), "utf8");
		const { data, content } = matter(source);
		if (!data.image) continue;
		if (file === "agent-environment-interface-misalignment.md") {
			assert.equal(
				data.imageAlt,
				"同一个 Agent 在模糊与对齐反馈下的环境接口评测流程示意图",
			);
		}

		assert.ok(
			!content.includes(data.image),
			`${file} repeats its frontmatter image in the Markdown body`,
		);

		if (data.publish !== true || data.visibility !== "public" || data.draft) {
			continue;
		}

		const slug = basename(file, extname(file));
		const html = readFileSync(join(dist, "posts", slug, "index.html"), "utf8");
		const matchingImages = parse(html)
			.querySelectorAll("img")
			.filter((image) => image.getAttribute("src") === data.image);

		assert.equal(
			matchingImages.length,
			1,
			`${file} must render its frontmatter image exactly once`,
		);
		if (file === "agent-environment-interface-misalignment.md") {
			assert.equal(
				matchingImages[0].getAttribute("alt"),
				data.imageAlt,
				`${file} must render the configured image alt text`,
			);
		}
	}
});

test("the knowledge-blog entry routes are statically generated", () => {
	const routes = [
		"index.html",
		"404.html",
		"about/index.html",
		"archive/index.html",
		"skills/index.html",
		"posts/index.html",
		"posts/page/2/index.html",
		"sage/index.html",
		"growth/index.html",
		"category/agent/index.html",
		"category/backend/index.html",
		"category/growth/index.html",
		"rss.xml",
		"sitemap-index.xml",
	];

	for (const route of routes) {
		assert.ok(existsSync(join(dist, route)), "missing /" + route);
	}
});

test("the SAGE page uses the dev architecture artwork with theme-safe text", async () => {
	const html = readFileSync(join(dist, "sage", "index.html"), "utf8");
	const page = parse(html);
	const cover = page.querySelector("img.sage-cover");
	const coverPreload = page
		.querySelectorAll('link[rel="preload"][as="image"]')
		.find(
			(link) => link.getAttribute("href") === "/images/sage/architecture.webp",
		);

	assert.equal(cover?.getAttribute("src"), "/images/sage/architecture.webp");
	assert.equal(
		cover?.getAttribute("alt"),
		"SAGE Harness Engineering 核心框架架构图",
	);
	assert.equal(
		cover?.parentNode.getAttribute("href"),
		"/images/sage/architecture.webp",
	);
	assert.equal(
		cover?.parentNode.getAttribute("data-fancybox"),
		"sage-architecture",
	);
	assert.equal(cover?.getAttribute("fetchpriority"), "high");
	assert.equal(coverPreload?.getAttribute("fetchpriority"), "high");

	const coverPath = join(dist, "images", "sage", "architecture.webp");
	assert.ok(existsSync(coverPath), "missing SAGE architecture artwork");
	const metadata = await sharp(coverPath).metadata();
	assert.equal(metadata.format, "webp");
	assert.equal(metadata.width, 2048);
	assert.equal(metadata.height, 1152);

	const source = readFileSync(join(root, "src", "pages", "sage.astro"), "utf8");
	assert.doesNotMatch(source, /var\(--text-(?:50|75)\)/);
	assert.match(source, /class="[^"]*sage-lead[^"]*text-75/);
	assert.match(source, /class="[^"]*card-base[^"]*text-90/);
});

test("wallpaper modes preserve subject framing and a visible overlay fallback", () => {
	const siteConfig = readFileSync(
		join(root, "src", "config", "siteConfig.ts"),
		"utf8",
	);
	const fullscreenConfig = readFileSync(
		join(root, "src", "config", "backgroundWallpaper.ts"),
		"utf8",
	);
	const bannerCss = readFileSync(
		join(root, "src", "styles", "banner.css"),
		"utf8",
	);
	const wallpaper = readFileSync(
		join(root, "src", "components", "misc", "FullscreenWallpaper.astro"),
		"utf8",
	);

	assert.match(siteConfig, /banner:\s*\{[\s\S]*?position:\s*"top"/);
	assert.match(fullscreenConfig, /position:\s*"top"/);
	assert.match(fullscreenConfig, /zIndex:\s*0/);
	assert.doesNotMatch(
		bannerCss,
		/object-position:\s*center center\s*!important/,
	);
	assert.match(wallpaper, /--wallpaper-fallback-desktop/);
	assert.match(wallpaper, /--wallpaper-fallback-mobile/);
	assert.match(
		wallpaper,
		/background-image:\s*var\(--wallpaper-fallback-desktop\)/,
	);
	assert.match(wallpaper, /const zIndex = config\.zIndex \?\? 0/);
});

test("the article archive is paginated and ordered by published date", () => {
	const firstPage = readFileSync(join(dist, "posts", "index.html"), "utf8");
	const secondPage = readFileSync(
		join(dist, "posts", "page", "2", "index.html"),
		"utf8",
	);
	const archiveTitles = (html) =>
		parse(html)
			.querySelectorAll("#post-list-container a.font-bold")
			.map((element) => element.text.trim())
			.filter(Boolean);

	assert.deepEqual(archiveTitles(firstPage), [
		"Agent 失败，可能只是环境没把话说清楚",
		"Agent 越界不是一句提示词能拦住的",
		"当模型不再需要手把手：Claude 5 与无状态 MCP 带来的 Agent 工程变化",
		"指标变好了，但默认没开：SAGE RAG 的几个工程取舍",
		"评测不是打分：SAGE 的 Context、Memory、RAG、Harness 怎么量",
		"Loop 没有死：从 DeerFlow 到 SAGE 理解 Graph Engineering",
	]);
	assert.deepEqual(archiveTitles(secondPage), [
		"SAGE：让问题成为可以持续生长的证据",
		"Chat Harness 2.0：Agent 长任务需要怎样的运行底座",
		"Agent Memory 的工程边界：工作记忆、长期记忆与知识",
		"从 Java 后端到 Agent 工程：哪些能力可以直接迁移",
	]);
	assert.match(firstPage, /href="\/posts\/page\/2\/"/);
	assert.match(secondPage, /href="\/posts\/"/);
	assert.equal(existsSync(join(dist, "posts", "page", "1")), false);
});

test("the generated home page exposes the reference-theme controls", () => {
	const html = readFileSync(join(dist, "index.html"), "utf8");
	for (const signal of [
		"ZeroMadLife",
		"display-settings-switch",
		'data-post-list-layout-enabled="true"',
		"Search.",
		"SettingsPanel.",
		"ThemeSwitch.",
	]) {
		assert.match(html, new RegExp(signal));
	}

	const homeTitles = parse(html)
		.querySelectorAll("#post-list-container a.font-bold")
		.map((element) => element.text.trim())
		.filter(Boolean);
	assert.deepEqual(homeTitles.slice(0, 6), [
		"Agent 失败，可能只是环境没把话说清楚",
		"Agent 越界不是一句提示词能拦住的",
		"当模型不再需要手把手：Claude 5 与无状态 MCP 带来的 Agent 工程变化",
		"指标变好了，但默认没开：SAGE RAG 的几个工程取舍",
		"评测不是打分：SAGE 的 Context、Memory、RAG、Harness 怎么量",
		"Loop 没有死：从 DeerFlow 到 SAGE 理解 Graph Engineering",
	]);
});

test("the home page avoids blocking fonts and eager hidden background images", async () => {
	const html = readFileSync(join(dist, "index.html"), "utf8");
	const bannerSource = readFileSync(
		join(root, "src", "components", "layout", "Banner.astro"),
		"utf8",
	);
	const carouselHtml = html.match(
		/id="banner-carousel"[\s\S]*?<!-- Ken Burns/,
	)?.[0];

	assert.doesNotMatch(html, /ZenMaruGothic|Loli-|\.ttf/i);
	assert.doesNotMatch(html, /<img[^>]+(?:desktop|mobile) wallpaper/i);
	assert.ok(carouselHtml, "missing banner carousel markup");
	assert.match(
		html,
		/<link(?=[^>]*rel="preload")(?=[^>]*as="image")(?=[^>]*href="\/assets\/desktop-banner\/fanren-mulan-character-01\.webp")(?=[^>]*fetchpriority="high")[^>]*>/,
		"the first banner image must be discoverable from the document head",
	);
	const articleHtml = readFileSync(
		join(dist, "posts", "agent-eval-harness-containment", "index.html"),
		"utf8",
	);
	const articleBannerPreload = parse(articleHtml)
		.querySelectorAll('link[rel="preload"][as="image"]')
		.find(
			(link) =>
				link.getAttribute("href") ===
				"/assets/desktop-banner/fanren-mulan-character-01.webp",
		);
	assert.equal(
		articleBannerPreload?.getAttribute("media"),
		"(min-width: 1280px)",
		"hidden mobile article banners must not be preloaded",
	);
	assert.doesNotMatch(
		carouselHtml,
		/<img[^>]+\ssrc="\/assets\/desktop-banner\/fanren-mulan-character-\d{2}\.webp"/,
	);
	assert.match(
		carouselHtml,
		/data-banner-src="\/assets\/desktop-banner\/fanren-mulan-character-01\.webp"/,
	);
	assert.doesNotMatch(
		html,
		/assets\/desktop-banner\/fanren-mulan-character-\d{2}\.(?:jpg|png)/,
	);
	assert.match(
		bannerSource,
		/if \(!oldImage \|\| !oldImage\.complete \|\| oldImage\.naturalWidth === 0\) return;/,
	);
	assert.match(
		bannerSource,
		/nextImage\.addEventListener\('load', beginCrossfade, \{ once: true \}\)/,
	);
	assert.match(
		bannerSource,
		/nextImage\.addEventListener\('error', cancelCrossfade, \{ once: true \}\)/,
	);

	const banners = [
		"fanren-mulan-character-01.webp",
		"fanren-mulan-character-02.webp",
		"fanren-mulan-character-03.webp",
		"fanren-mulan-character-04.webp",
		"fanren-mulan-character-05.webp",
	];
	for (const banner of banners) {
		const bannerPath = join(dist, "assets", "desktop-banner", banner);
		assert.ok(existsSync(bannerPath), `missing optimized banner ${banner}`);
		const metadata = await sharp(bannerPath).metadata();
		assert.equal(metadata.format, "webp", `${banner} must be a WebP asset`);
		assert.ok(
			(metadata.width ?? 0) >= 1920 && (metadata.height ?? 0) >= 1080,
			`${banner} must stay high-resolution enough for desktop banners`,
		);
	}
	for (const banner of [
		"fanren-mulan-character-01.jpg",
		"fanren-mulan-character-02.jpg",
		"fanren-mulan-character-03.jpg",
		"fanren-mulan-character-04.jpg",
		"fanren-mulan-character-05.jpg",
	]) {
		assert.ok(
			!existsSync(join(dist, "assets", "desktop-banner", banner)),
			`obsolete banner was copied into the deployment: ${banner}`,
		);
	}

	const fontDirectory = join(dist, "_astro", "fonts");
	for (const font of readdirSync(fontDirectory)) {
		assert.ok(
			statSync(join(fontDirectory, font)).size < 100_000,
			`generated font ${font} exceeds the 100 KB performance budget`,
		);
	}
});

test("the music player exposes only the selected Fanren tracks", () => {
	const config = readFileSync(
		join(root, "src", "config", "musicConfig.ts"),
		"utf8",
	);
	const playlist = readFileSync(
		join(root, "src", "components", "widgets", "music-player", "constants.ts"),
		"utf8",
	);
	const floatingControls = readFileSync(
		join(root, "src", "components", "control", "FloatingControls.astro"),
		"utf8",
	);
	const player = readFileSync(
		join(
			root,
			"src",
			"components",
			"widgets",
			"music-player",
			"MusicPlayer.svelte",
		),
		"utf8",
	);
	const store = readFileSync(
		join(root, "src", "stores", "musicPlayerStore.ts"),
		"utf8",
	);
	const cover = readFileSync(
		join(
			root,
			"src",
			"components",
			"widgets",
			"music-player",
			"atoms",
			"CoverImage.svelte",
		),
		"utf8",
	);
	const profile = readFileSync(
		join(root, "src", "components", "widgets", "profile", "Profile.astro"),
		"utf8",
	);

	assert.match(config, /enable:\s*true/);
	assert.match(config, /showFloatingPlayer:\s*true/);
	assert.match(config, /floatingEntryMode:\s*"fab"/);
	assert.match(
		playlist,
		/id:\s*1465288702[\s\S]*title:\s*"不凡"[\s\S]*artist:\s*"王铮亮"/,
	);
	assert.match(
		playlist,
		/id:\s*1971054019[\s\S]*title:\s*"归期"[\s\S]*artist:\s*"钱润玉"/,
	);
	assert.equal((playlist.match(/type=url&id=/g) || []).length, 2);
	assert.doesNotMatch(playlist, /assets\/music\/url|\.mp3["']/);
	assert.match(playlist, /STORAGE_KEY_VOLUME\s*=\s*"music-player-volume-v2"/);
	assert.match(playlist, /DEFAULT_VOLUME\s*=\s*0\.2/);
	assert.match(playlist, /DEFAULT_SONG:\s*Song\s*=\s*LOCAL_PLAYLIST\[0\]/);
	assert.match(floatingControls, /MusicFabButton client:only="svelte"/);
	assert.match(floatingControls, /data-control-key="music"/);
	assert.match(player, /music-player-fab-anchor/);
	assert.match(store, /this\.audio\.preload\s*=\s*"none"/);
	assert.match(store, /if \(autoPlay\) \{\s*this\.audio\.load\(\);/);
	assert.match(
		store,
		/consecutiveLoadErrors\s*>=\s*this\.state\.playlist\.length/,
	);
	assert.doesNotMatch(cover, /fetchpriority="high"/);
	assert.doesNotMatch(profile, /fetchpriority="high"/);
});

test("interactive icons are bundled locally without Iconify network fallbacks", () => {
	const generated = readGeneratedText();
	assert.doesNotMatch(
		generated,
		/(?:api\.(?:iconify\.design|simplesvg\.com|unisvg\.com)|code\.iconify\.design)/i,
	);

	for (const file of readdirSync(join(root, "src", "components"), {
		recursive: true,
	})) {
		if (!file.endsWith(".svelte")) continue;
		const source = readFileSync(join(root, "src", "components", file), "utf8");
		assert.doesNotMatch(source, /from ["']@iconify\/svelte["']/);
	}

	const localIconBundle = readdirSync(join(dist, "_astro")).find((file) =>
		/^LocalIcon\..+\.js$/.test(file),
	);
	assert.ok(localIconBundle, "missing local Svelte icon bundle");
	assert.ok(
		statSync(join(dist, "_astro", localIconBundle)).size < 150_000,
		"local Svelte icon bundle exceeds the 150 KB performance budget",
	);
});

test("the lazy wallpaper can recover from interrupted initialization", () => {
	const source = readFileSync(
		join(root, "src", "components", "misc", "FullscreenWallpaper.astro"),
		"utf8",
	);
	const cleanupIndex = source.indexOf("window.__wallpaper_cleanup = cleanup");
	const readyIndex = source.indexOf(
		"container.dataset.lazyWallpaperReady = 'true'",
	);

	assert.ok(cleanupIndex > -1, "missing wallpaper cleanup registration");
	assert.ok(
		readyIndex > cleanupIndex,
		"wallpaper is marked ready before cleanup exists",
	);
	assert.match(source, /delete container\.dataset\.lazyWallpaperReady/);
	assert.match(source, /container\.style\.display = 'block'/);
});

test("the about page presents identity, current work, and a future learning path", () => {
	const html = readFileSync(join(dist, "about", "index.html"), "utf8");
	for (const signal of [
		"关于我",
		"我是林欣",
		"最近在做什么",
		"我的发展路径",
		"未来想成为什么人",
		"AI HOT",
	]) {
		assert.match(html, new RegExp(signal));
	}
	assert.doesNotMatch(
		html,
		/怎么维护|只有 visibility|关于主题|Obsidian|公开知识层/,
	);
});

test("the skills page describes the real capability boundaries", () => {
	const html = readFileSync(join(dist, "skills", "index.html"), "utf8");
	for (const signal of [
		"技术栈与能力边界",
		"Java 后端",
		"Python / FastAPI",
		"Linux / Docker / 交付",
		"尚未主导生产级 Kubernetes 集群",
		"Vue3 前端协作",
	]) {
		assert.match(html, new RegExp(signal));
	}
	assert.doesNotMatch(html, /Astro \/ Mizuki|专家级/);
});

test("public article tags use the compact canonical vocabulary", () => {
	const expected = new Set([
		"Agent 工程",
		"Harness",
		"SAGE",
		"知识系统",
		"Java 后端",
		"RAG",
		"评测",
		"Graph Engineering",
	]);
	const tags = new Set();
	for (const file of readdirSync(postsDirectory)) {
		const source = readFileSync(join(postsDirectory, file), "utf8");
		const match = source.match(/^tags:\s*\[([^\]]*)\]/m);
		assert.ok(match, `missing tags in ${file}`);
		for (const tag of match[1].split(",")) tags.add(tag.trim());
	}
	assert.deepEqual(tags, expected);
});

test("the generated site ships the dark-first theme variables", () => {
	const generated = readGeneratedText();
	const constants = readFileSync(
		join(root, "src", "constants", "constants.ts"),
		"utf8",
	);
	const siteConfig = readFileSync(
		join(root, "src", "config", "siteConfig.ts"),
		"utf8",
	);

	assert.match(generated, /--page-bg:/);
	assert.match(generated, /--card-bg:/);
	assert.match(generated, /:root\.dark\{/);
	assert.match(constants, /DEFAULT_THEME\s*=\s*DARK_MODE/);
	assert.match(siteConfig, /themeColor:\s*\{\s*hue:\s*180,/);
});

test("the static site does not ship third-party tracking", () => {
	const generated = readGeneratedText();
	assert.doesNotMatch(generated, /googletagmanager|clarity\.ms|GTM-KRX3XGVH/i);
	assert.doesNotMatch(
		generated,
		/twikoo|giscus\.app|bilibili\.uno|password-protection|sakura\.webp/i,
	);
});

test("archive filters bypass Swup so query parameters remain authoritative", () => {
	const html = readFileSync(join(dist, "archive", "index.html"), "utf8");
	assert.match(
		html,
		/<a(?=[^>]*href="\/archive\/\?category=backend")(?=[^>]*data-no-swup="true")[^>]*>/,
	);
});

test("production and self-hosted deployment contracts remain available", () => {
	assert.equal(
		readFileSync(join(root, "CNAME"), "utf8").trim(),
		"blog.sagecompanion.top",
	);
	assert.equal(
		readFileSync(join(root, "public", "CNAME"), "utf8").trim(),
		"blog.sagecompanion.top",
	);
	assert.equal(existsSync(join(root, "public", "_headers")), false);

	const pagesWorkflow = readFileSync(
		join(root, ".github", "workflows", "deploy.yml"),
		"utf8",
	);
	assert.match(pagesWorkflow, /actions\/setup-node@v7/);
	assert.match(pagesWorkflow, /actions\/deploy-pages@v5/);

	const nginx = readFileSync(
		join(root, "deploy", "nginx", "blog.conf"),
		"utf8",
	);
	assert.match(nginx, /error_page 404 \/404\.html;/);
	assert.match(nginx, /location \^~ \/_astro\//);
	assert.doesNotMatch(
		nginx,
		/location ~\* \\.\(\?:css\|js[^}]+31536000[^}]+immutable/s,
	);

	const workflow = readFileSync(
		join(root, ".github", "workflows", "deploy-server.yml"),
		"utf8",
	);
	assert.match(workflow, /actions\/setup-node@v7/);
	assert.match(
		workflow,
		/mkdir -p \/var\/www\/blog\.sagecompanion\.top\/releases\/\$\{GITHUB_SHA\}/,
	);
});

test("the AI topic radar stays outside the public build pipeline", () => {
	const packageJson = JSON.parse(
		readFileSync(join(root, "package.json"), "utf8"),
	);
	assert.equal(packageJson.scripts.radar, "node scripts/aihot-radar.mjs");
	assert.doesNotMatch(packageJson.scripts.build, /radar|aihot/i);

	const radar = readFileSync(join(root, "scripts", "aihot-radar.mjs"), "utf8");
	assert.match(radar, /00_收件箱/);
	assert.match(radar, /AI选题雷达/);
	assert.doesNotMatch(radar, /src\/content\/posts/);
});

test("content keeps the fail-closed publication gate", () => {
	const schema = readFileSync(join(root, "src/content.config.ts"), "utf8");
	assert.match(schema, /visibility:\s*z\.literal\(["']public["']\)/);
	assert.match(schema, /publish:\s*z\.literal\(true\)/);

	const files = readdirSync(join(root, "src/content/posts")).filter((name) =>
		/\.(md|mdx)$/.test(name),
	);
	assert.deepEqual(files.sort(), postSlugs.map((slug) => slug + ".md").sort());

	for (const file of files) {
		const source = readFileSync(join(root, "src/content/posts", file), "utf8");
		assert.match(source, /visibility:\s*public/);
		assert.match(source, /publish:\s*true/);
		assert.match(source, /draft:\s*false/);
	}
});
