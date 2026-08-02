import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");

const postSlugs = [
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

test("the knowledge-blog entry routes are statically generated", () => {
  const routes = [
    "index.html",
    "404.html",
    "about/index.html",
    "archive/index.html",
    "skills/index.html",
    "posts/index.html",
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

  const firstRegularPost = html.indexOf("指标变好了，但默认没开");
  assert.ok(firstRegularPost > -1, "missing regular home-page article");
  assert.ok(
    html.indexOf("SAGE：让问题成为可以持续生长的证据") < firstRegularPost,
    "featured SAGE article must lead regular posts",
  );
  assert.ok(
    html.indexOf("Chat Harness 2.0：Agent 长任务需要怎样的运行底座") <
      firstRegularPost,
    "featured Harness article must lead regular posts",
  );
});

test("the home page avoids blocking fonts and eager hidden background images", () => {
  const html = readFileSync(join(dist, "index.html"), "utf8");
  const carouselHtml = html.match(
    /id="banner-carousel"[\s\S]*?<!-- Ken Burns/,
  )?.[0];

  assert.doesNotMatch(html, /ZenMaruGothic|Loli-|\.ttf/i);
  assert.doesNotMatch(html, /<img[^>]+(?:desktop|mobile) wallpaper/i);
  assert.ok(carouselHtml, "missing banner carousel markup");
  assert.doesNotMatch(
    carouselHtml,
    /<img[^>]+\ssrc="\/assets\/desktop-banner\/landscape-(?:mountain|valley|ridge)\.webp"/,
  );
  assert.match(
    carouselHtml,
    /data-banner-src="\/assets\/desktop-banner\/landscape-mountain\.webp"/,
  );
  assert.doesNotMatch(
    html,
    /assets\/desktop-banner\/landscape-(?:mountain|valley|ridge)\.jpg/,
  );

  const banners = [
    "landscape-mountain.webp",
    "landscape-valley.webp",
    "landscape-ridge.webp",
  ];
  for (const banner of banners) {
    assert.ok(
      existsSync(join(dist, "assets", "desktop-banner", banner)),
      `missing optimized banner ${banner}`,
    );
  }
  for (const banner of [
    "landscape-mountain.jpg",
    "landscape-valley.jpg",
    "landscape-ridge.jpg",
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
  for (const file of readdirSync(join(root, "src/content/posts"))) {
    const source = readFileSync(join(root, "src/content/posts", file), "utf8");
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
    /twikoo|giscus\.app|bilibili\.uno|music-sidebar|music-player|password-protection|sakura\.webp/i,
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
