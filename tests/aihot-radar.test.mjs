import assert from "node:assert/strict";
import test from "node:test";

import { buildRadarMarkdown, selectUniqueItems } from "../scripts/aihot-radar.mjs";

const item = (id, title, summary = "一个 Agent 工程事件。") => ({
	id,
	title,
	summary,
	source: { name: "官方博客" },
	links: {
		aihot: `https://aihot.virxact.com/items/${id}`,
		original: "https://example.com/source",
	},
	discoveredAt: "2026-08-01T01:00:00.000Z",
	publishedAt: "2026-08-01T00:00:00.000Z",
	selected: true,
});

test("radar deduplicates items while preserving matched topics", () => {
	const items = selectUniqueItems([
		{ queryTopics: ["Agent"], items: [item("one", "Agent Harness 更新")] },
		{ queryTopics: ["Harness"], items: [item("one", "Agent Harness 更新")] },
	]);

	assert.equal(items.length, 1);
	assert.deepEqual(items[0].topics, ["Agent", "Harness"]);
});

test("radar markdown contains private workflow fields and source links", () => {
	const markdown = buildRadarMarkdown({
		generatedAt: "2026-08-01T01:00:00.000Z",
		responses: [{ items: [item("one", "RAG [工程] 事件")] }],
		items: selectUniqueItems([{ queryTopics: ["RAG"], items: [item("one", "RAG [工程] 事件")] }]),
	});

	assert.match(markdown, /visibility: private/);
	assert.match(markdown, /publish: false/);
	assert.match(markdown, /事件摘要/);
	assert.match(markdown, /SAGE 关联/);
	assert.match(markdown, /原始来源/);
	assert.match(markdown, /继续观察/);
	assert.match(markdown, /RAG \\\[工程\\\]/);
	assert.match(markdown, /https:\/\/aihot\.virxact\.com\/items\/one/);
});

test("radar escapes raw HTML from untrusted API text", () => {
	const unsafe = item("unsafe", "Agent <img src=x onerror=alert(1)>", "RAG & </script>");
	unsafe.source.name = "<strong>第三方来源</strong>";
	const candidates = selectUniqueItems([{ queryTopics: ["Agent"], items: [unsafe] }]);
	const markdown = buildRadarMarkdown({
		generatedAt: "2026-08-01T01:00:00.000Z",
		responses: [{ items: [unsafe] }],
		items: candidates,
	});

	assert.doesNotMatch(markdown, /<img|<\/script>|<strong>/);
	assert.match(markdown, /&lt;img src=x onerror=alert\(1\)&gt;/);
	assert.match(markdown, /RAG &amp; &lt;\/script&gt;/);
	assert.match(markdown, /&lt;strong&gt;第三方来源&lt;\/strong&gt;/);
});

test("radar rejects malformed and non-HTTPS links without aborting the batch", () => {
	const malformed = item("bad", "损坏链接");
	malformed.links.original = "not a url";
	const insecure = item("insecure", "非安全链接");
	insecure.links.original = "http://example.com/source";

	assert.deepEqual(
		selectUniqueItems([{ queryTopics: ["Agent"], items: [malformed, insecure, item("ok", "正常条目")] }]).map(
			(candidate) => candidate.id,
		),
		["ok"],
	);
});

test("radar filters API search results without visible topic relevance", () => {
	assert.deepEqual(
		selectUniqueItems([
			{
				queryTopics: ["RAG"],
				items: [item("noise", "普通行业政策", "与人工智能工程主题没有直接关系。")],
			},
		]),
		[],
	);
});

test("radar requires an item to match the topic that retrieved it", () => {
	assert.deepEqual(
		selectUniqueItems([
			{ queryTopics: ["Harness"], items: [item("model-only", "新模型发布", "一个大模型能力更新。") ] },
		]),
		[],
	);
});

test("radar interleaves topics so one broad query cannot fill the shortlist", () => {
	const items = selectUniqueItems([
		{ queryTopics: ["Agent"], items: [item("agent-1", "Agent 一"), item("agent-2", "Agent 二")] },
		{ queryTopics: ["Harness"], items: [item("harness-1", "Harness 一")] },
	]);

	assert.deepEqual(items.map((candidate) => candidate.id), ["agent-1", "harness-1", "agent-2"]);
});
