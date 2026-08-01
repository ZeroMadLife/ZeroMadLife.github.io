import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");

const postSlugs = [
  "agent-evaluation-four-layers",
  "agent-memory-boundaries",
  "chat-harness-2",
  "java-to-agent-engineering",
  "loop-to-graph-engineering",
  "rag-tradeoffs-restraint",
  "sage-from-question-to-growth",
];

function readGeneratedText() {
  const textExtensions = new Set([".css", ".html", ".js", ".json", ".mjs", ".xml"]);
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if ([...textExtensions].some((extension) => entry.name.endsWith(extension))) {
        files.push(readFileSync(path, "utf8"));
      }
    }
  };
  visit(dist);
  return files.join("\n");
}

test("the seven public article URLs remain available", () => {
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
    "data-post-list-layout-enabled=\"true\"",
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
    html.indexOf("Chat Harness 2.0：Agent 长任务需要怎样的运行底座") < firstRegularPost,
    "featured Harness article must lead regular posts",
  );
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
  assert.equal(existsSync(join(root, "CNAME")), false);
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

  const nginx = readFileSync(join(root, "deploy", "nginx", "blog.conf"), "utf8");
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
  assert.match(workflow, /mkdir -p \/var\/www\/blog\.sagecompanion\.top\/releases\/\$\{GITHUB_SHA\}/);
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
