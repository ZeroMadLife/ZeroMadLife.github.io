import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const API_BASE = "https://aihot.virxact.com/api/v1";
const API_HOST = "aihot.virxact.com";
const USER_AGENT = "ZeroMadLife-blog-radar/1.0 (+https://blog.sagecompanion.top)";
const TOPICS = [
	{ label: "Agent", query: "Agent" },
	{ label: "大模型", query: "大模型" },
	{ label: "RAG", query: "RAG" },
	{ label: "Harness", query: "Harness" },
	{ label: "后端系统", query: "后端" },
];
const TOPIC_LABELS = TOPICS.map((topic) => topic.label);
const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const defaultRadarDir = path.resolve(
	process.env.OBSIDIAN_KB_ROOT || path.resolve(repoRoot, "../Obsidian-Knowledge-Base"),
	"00_收件箱",
	"AI选题雷达",
);
const cacheFilename = ".aihot-cache.json";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeText(value, maxLength = 1200) {
	return String(value ?? "")
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, maxLength);
}

function markdownText(value) {
	return normalizeText(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replace(/[\\`*_[\]#]/g, "\\$&");
}

function markdownUrl(value) {
	return new URL(value).href.replaceAll("(", "%28").replaceAll(")", "%29");
}

function isHttpsUrl(value, hostname = null) {
	try {
		const url = new URL(value);
		return url.protocol === "https:" && (!hostname || url.hostname === hostname);
	} catch {
		return false;
	}
}

function isItem(value) {
	return (
		value &&
		typeof value === "object" &&
		typeof value.id === "string" &&
		typeof value.title === "string" &&
		typeof value.summary === "string" &&
		value.source &&
		typeof value.source.name === "string" &&
		value.links &&
		isHttpsUrl(value.links.aihot, API_HOST) &&
		isHttpsUrl(value.links.original) &&
		typeof value.discoveredAt === "string"
	);
}

function matchedTopics(item) {
	const text = `${item.title} ${item.summary}`.toLowerCase();
	return TOPIC_LABELS.filter((topic) => {
		const aliases = {
			Agent: ["agent", "智能体"],
			大模型: ["大模型", "模型", "llm", "openai", "anthropic", "claude", "gemini", "glm", "deepseek", "qwen", "kimi", "minimax"],
			RAG: ["rag", "retrieval augmented", "检索", "知识库", "bm25", "rerank", "embedding"],
			Harness: ["harness", "运行底座", "长任务"],
			后端系统: ["后端", "backend", "api", "数据库", "分布式", "基础设施", "sandbox", "沙箱", "安全隔离", "可观测"],
		}[topic];
		return aliases.some((alias) => text.includes(alias.toLowerCase()));
	});
}

function whyImportant(topics) {
	if (topics.includes("Harness")) return "它直接涉及长任务的编排、恢复、工具边界或工程控制面。";
	if (topics.includes("RAG")) return "它可能改变检索质量、上下文成本或知识系统的评测基线。";
	if (topics.includes("后端系统")) return "它提醒 Agent 能力最终仍受基础设施、安全边界和生产可靠性约束。";
	if (topics.includes("大模型")) return "模型能力或成本变化可能影响 Provider 选择与既有评测结论。";
	return "它提供了一个观察 Agent 产品形态、能力边界或落地方式的新样本。";
}

function sageRelation(topics) {
	if (topics.includes("RAG")) return "可联系 SAGE 的检索、来源、引用与默认门禁。";
	if (topics.includes("Harness")) {
		return "可联系 SAGE Harness 的工具调用、审批、恢复与运行证据。";
	}
	if (topics.includes("后端系统")) return "可联系后端协议、状态、可靠性与可观测性如何进入 Agent 系统。";
	if (topics.includes("大模型")) return "可联系模型能力变化如何影响 SAGE 的 Provider、Context 与评测边界。";
	return "可联系 Agent Runtime、Context、Memory 与评测边界。";
}

function evidenceLevel(sourceName) {
	const source = sourceName.toLowerCase();
	if (/官方|openai|anthropic|google|microsoft|hugging face|github|api 更新日志|：blog/.test(source)) {
		return "官方发布或官方渠道；仍需回到原文核验";
	}
	if (/(^|[\s（(])x[:：]|twitter|微博|reddit/.test(source)) return "单一社交来源；先补充官方或多源证据";
	return "AI HOT 精选信源；发布前核验原始来源";
}

function candidateFor(item, queryTopics) {
	const topics = matchedTopics(item);
	if (topics.length === 0) return null;
	return {
		...item,
		topics,
		importance: whyImportant(topics),
		relation: sageRelation(topics),
		evidence: evidenceLevel(item.source.name),
		angle: `工程分析：${topics.length ? topics.join(" / ") : "AI 工程"} 这条动态对系统设计、验证或交付有什么实际影响？`,
		recommendation: "继续观察：先核验原文，再决定写成教程、分析、复盘或放弃。",
	};
}

function formatBeijingTime(iso) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "时间待核验";
	return new Intl.DateTimeFormat("zh-CN", {
		timeZone: "Asia/Shanghai",
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

export function selectUniqueItems(responses) {
	const unique = new Map();
	const queues = responses.map((response) =>
		(response.items || [])
			.filter(isItem)
			.map((item) => candidateFor(item, response.queryTopics || []))
			.filter(
				(candidate) =>
					candidate && response.queryTopics.some((topic) => candidate.topics.includes(topic)),
			),
	);
	const longest = Math.max(0, ...queues.map((queue) => queue.length));
	for (let index = 0; index < longest; index += 1) {
		for (const queue of queues) {
			const candidate = queue[index];
			if (!candidate) continue;
			const previous = unique.get(candidate.id);
			if (previous) {
				previous.topics = [...new Set([...previous.topics, ...candidate.topics])];
				previous.relation = sageRelation(previous.topics);
			} else {
				unique.set(candidate.id, candidate);
			}
		}
	}
	return [...unique.values()];
}

export function buildRadarMarkdown({ generatedAt, responses, items }) {
	const counts = responses.reduce((sum, response) => sum + (response.items?.length || 0), 0);
	const failures = responses.filter((response) => response.mode === "error");
	const lines = [
		"---",
		"type: aihot-radar",
		"status: inbox",
		`generated_at: ${generatedAt}`,
		"source: https://aihot.virxact.com",
		"visibility: private",
		"publish: false",
		"---",
		"# AI 选题雷达",
		"",
		`> 生成时间：${formatBeijingTime(generatedAt)}。AI HOT 负责发现，官方原文负责核验，SAGE 实践负责形成观点。`,
		"> 这是一份私有候选清单，不会自动进入博客公开文章。",
		"",
		`本轮主题：${TOPIC_LABELS.join("、")}；API 返回候选 ${counts} 条；相关性复核与去重后 ${items.length} 条。`,
		"",
	];
	if (failures.length) {
		lines.push(
			`> 查询失败：${failures.map((response) => response.queryTopics.map(markdownText).join("、")).join("、")}。未使用其它来源补写结果。`,
			"",
		);
	}

	if (items.length === 0) {
		lines.push("## 暂无候选", "", "本轮没有返回可核验的候选。稍后重试，不扩大查询范围冒充有结果。", "");
	}

	for (const [index, item] of items.entries()) {
		lines.push(
			`## ${index + 1}. [${markdownText(item.title)}](${markdownUrl(item.links.aihot)})`,
			"",
			`- **来源**：${markdownText(item.source.name)}`,
			`- **时间**：${formatBeijingTime(item.publishedAt || item.discoveredAt)}`,
			`- **事件摘要**：${markdownText(item.summary)}`,
			`- **为什么值得看**：${markdownText(item.importance)}`,
			`- **SAGE 关联**：${markdownText(item.relation)}`,
			`- **可写角度**：${markdownText(item.angle)}`,
			`- **证据等级**：${markdownText(item.evidence)}`,
			`- **原始来源**：[打开原文](${markdownUrl(item.links.original)})`,
			`- **发布建议**：${markdownText(item.recommendation)}`,
			`- **匹配主题**：${item.topics.map(markdownText).join("、") || "待人工归类"}`,
			"",
		);
	}

	lines.push(
		"## 人工处理",
		"",
		"- [ ] 回到官方原文核验标题、数字、时间和上下文",
		"- [ ] 判断是否与 SAGE 当前代码、评测或工程取舍有真实关联",
		"- [ ] 选择：写文章 / 继续观察 / 放弃",
		"- [ ] 通过 `pnpm new-post` 创建公开草稿，并完成人工 Diff 审核",
		"",
		"数据来源：[AI HOT](https://aihot.virxact.com/)。",
		"",
	);
	return lines.join("\n");
}

async function fetchJson(url, { retries = 2, cache = {} } = {}) {
	let lastError;
	for (let attempt = 0; attempt <= retries; attempt += 1) {
		try {
			const headers = { Accept: "application/json", "User-Agent": USER_AGENT };
			if (cache[url]?.etag) headers["If-None-Match"] = cache[url].etag;
			const response = await fetch(url, {
				headers,
				signal: AbortSignal.timeout(20_000),
			});
			if (response.status === 304 && cache[url]?.body) return cache[url].body;
			if (response.ok) {
				const body = await response.json();
				cache[url] = { etag: response.headers.get("etag"), body };
				return body;
			}
			if (response.status === 429) {
				const retryAfter = Number(response.headers.get("retry-after"));
				lastError = new Error("AI HOT HTTP 429");
				if (attempt < retries) {
					const retryDelay = Number.isFinite(retryAfter)
						? Math.min(Math.max(retryAfter * 1000, 0), 60_000)
						: 60_000;
					await sleep(retryDelay);
					continue;
				}
				throw lastError;
			}
			if (response.status >= 500 && attempt < retries) {
				lastError = new Error(`AI HOT HTTP ${response.status}`);
				await sleep(2 ** attempt * 1000);
				continue;
			}
			const error = new Error(`AI HOT HTTP ${response.status}`);
			error.retryable = false;
			throw error;
		} catch (error) {
			lastError = error;
			if (error.retryable !== false && attempt < retries) {
				await sleep(2 ** attempt * 1000);
				continue;
			}
			break;
		}
	}
	throw lastError;
}

async function fetchTopic(topic, cache) {
	const query = new URLSearchParams({ mode: "selected", window: "7d", q: topic.query, limit: "8" });
	const selectedUrl = `${API_BASE}/items?${query}`;
	try {
		const selected = await fetchJson(selectedUrl, { cache });
		if (!Array.isArray(selected.items)) throw new Error("AI HOT items response is invalid");
		if (selected.items.length > 0) return { queryTopics: [topic.label], items: selected.items, mode: "selected" };
		const all = await fetchJson(`${API_BASE}/items?${new URLSearchParams({ ...Object.fromEntries(query), mode: "all" })}`, { cache });
		if (!Array.isArray(all.items)) throw new Error("AI HOT items response is invalid");
		return { queryTopics: [topic.label], items: all.items || [], mode: "all" };
	} catch (error) {
		return { queryTopics: [topic.label], items: [], mode: "error", error: error.message };
	}
}

async function loadCache(directory) {
	try {
		const raw = await fs.readFile(path.join(directory, cacheFilename), "utf8");
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch (error) {
		if (error.code === "ENOENT" || error instanceof SyntaxError) return {};
		throw error;
	}
}

async function saveCache(directory, cache) {
	await fs.mkdir(directory, { recursive: true, mode: 0o700 });
	const target = path.join(directory, cacheFilename);
	const temporary = path.join(directory, `${cacheFilename}.${process.pid}.tmp`);
	await fs.writeFile(temporary, `${JSON.stringify(cache)}\n`, { encoding: "utf8", mode: 0o600 });
	await fs.rename(temporary, target);
}

async function writeWithoutOverwrite(directory, date, content) {
	await fs.mkdir(directory, { recursive: true, mode: 0o700 });
	const base = `AI选题雷达-${date}`;
	for (let suffix = 0; suffix < 100; suffix += 1) {
		const filename = `${base}${suffix ? `-${suffix + 1}` : ""}.md`;
		const target = path.join(directory, filename);
		try {
			await fs.writeFile(target, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
			return target;
		} catch (error) {
			if (error.code !== "EEXIST") throw error;
		}
	}
	throw new Error("AI HOT 雷达文件数量超过安全上限");
}

export async function runRadar({ outputDir = defaultRadarDir, now = new Date() } = {}) {
	const cache = await loadCache(outputDir);
	const responses = [];
	for (const topic of TOPICS) responses.push(await fetchTopic(topic, cache));
	await saveCache(outputDir, cache);
	if (responses.every((response) => response.mode === "error")) {
		throw new Error("AI HOT 所有主题查询均失败，请稍后重试");
	}
	const items = selectUniqueItems(responses).slice(0, 12);
	const generatedAt = now.toISOString();
	const content = buildRadarMarkdown({ generatedAt, responses, items });
	const date = generatedAt.slice(0, 10);
	const target = await writeWithoutOverwrite(outputDir, date, content);
	return { target, items, responses };
}

if (import.meta.url === `file://${process.argv[1]}`) {
	runRadar()
		.then(({ target, items, responses }) => {
			const failed = responses.filter((response) => response.mode === "error");
			console.log(`AI HOT 雷达已写入：${target}`);
			console.log(`去重候选：${items.length} 条；成功主题：${responses.length - failed.length}/${responses.length}`);
			if (failed.length) console.warn(`失败主题：${failed.map((response) => response.queryTopics.join("、")).join("、")}`);
		})
		.catch((error) => {
			console.error(`AI HOT 雷达失败：${error.message}`);
			process.exitCode = 1;
		});
}
