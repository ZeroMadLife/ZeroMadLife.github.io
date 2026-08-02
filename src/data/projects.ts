export interface Project {
	id: string;
	title: string;
	description: string;
	image: string;
	category: "web" | "mobile" | "desktop" | "other";
	techStack: string[];
	status: "completed" | "in-progress" | "planned";
	liveDemo?: string;
	sourceCode?: string;
	visitUrl?: string;
	startDate: string;
	endDate?: string;
	featured?: boolean;
	tags?: string[];
	showImage?: boolean;
}

export const projectsData: Project[] = [
	{
		id: "knowledge-blog",
		title: "Knowledge Blog",
		description: "基于 Astro 与 Mizuki 的公开知识库，把本地 Markdown 文章发布成可检索、可归档的静态站点。",
		image: "/assets/desktop-banner/landscape-valley.webp",
		category: "web",
		techStack: ["Astro", "Mizuki", "Markdown", "Nginx"],
		status: "in-progress",
		sourceCode: "https://github.com/ZeroMadLife/ZeroMadLife.github.io",
		visitUrl: "https://blog.sagecompanion.top",
		startDate: "2026-07-18",
		featured: true,
		tags: ["Knowledge Base", "Static Site", "Self-hosted"],
	},
	{
		id: "sage-knowledge-loop",
		title: "SAGE",
		description: "让一次探索继续成为可以检索、验证和复盘的成长记录。博客中的 SAGE 系列记录其 Context、Memory、RAG 和 Harness 边界。",
		image: "/images/sage/cover.webp",
		category: "other",
		techStack: ["Agent", "RAG", "Harness", "Evidence"],
		status: "in-progress",
		visitUrl: "https://sagecompanion.top",
		startDate: "2026-07-01",
		featured: true,
		tags: ["Agent", "Learning", "Evidence"],
	},
];

export const getProjectStats = () => ({
	total: projectsData.length,
	byStatus: {
		completed: projectsData.filter((p) => p.status === "completed").length,
		inProgress: projectsData.filter((p) => p.status === "in-progress").length,
		planned: projectsData.filter((p) => p.status === "planned").length,
	},
});

export const getProjectsByCategory = (category?: string) =>
	!category || category === "all"
		? projectsData
		: projectsData.filter((p) => p.category === category);

export const getFeaturedProjects = () => projectsData.filter((p) => p.featured);

export const getAllTechStack = () =>
	Array.from(new Set(projectsData.flatMap((project) => project.techStack))).sort();
