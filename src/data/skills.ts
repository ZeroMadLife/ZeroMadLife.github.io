// Public capability map for the knowledge-base site. Keep this list about
// topics readers can verify from the published notes, not private credentials.
export interface Skill {
	id: string;
	name: string;
	description: string;
	icon: string;
	category: "frontend" | "backend" | "database" | "tools" | "other";
	level: "beginner" | "intermediate" | "advanced" | "expert";
	experience: { years: number; months: number };
	projects?: string[];
	color?: string;
}

export const skillsData: Skill[] = [
	{
		id: "agent-engineering",
		name: "Agent Engineering",
		description: "围绕 Context、Memory、RAG、Harness 和 Graph 的可恢复 Agent 系统设计。",
		icon: "material-symbols:psychology",
		category: "other",
		level: "advanced",
		experience: { years: 1, months: 0 },
		projects: ["sage-knowledge-loop"],
		color: "#0f766e",
	},
	{
		id: "java-backend",
		name: "Java 后端",
		description: "面向协议、状态、权限、超时、重试和可观测性的后端工程基础。",
		icon: "logos:java",
		category: "backend",
		level: "intermediate",
		experience: { years: 3, months: 0 },
		projects: ["sage-knowledge-loop"],
		color: "#b45309",
	},
	{
		id: "postgresql",
		name: "PostgreSQL / pgvector",
		description: "全文检索、向量检索、RRF 融合和可审计评测数据集。",
		icon: "logos:postgresql",
		category: "database",
		level: "intermediate",
		experience: { years: 2, months: 0 },
		projects: ["sage-knowledge-loop"],
		color: "#2563eb",
	},
	{
		id: "astro-mizuki",
		name: "Astro / Mizuki",
		description: "静态内容建模、Markdown/MDX 写作、页面搜索与自托管部署。",
		icon: "logos:astro-icon",
		category: "frontend",
		level: "advanced",
		experience: { years: 1, months: 0 },
		projects: ["knowledge-blog"],
		color: "#c2410c",
	},
	{
		id: "evaluation",
		name: "评测与证据",
		description: "把能力、控制、来源和失败原因拆开测量，让工程决策可复盘。",
		icon: "material-symbols:fact-check",
		category: "tools",
		level: "advanced",
		experience: { years: 1, months: 0 },
		projects: ["sage-knowledge-loop"],
		color: "#7c3aed",
	},
];
