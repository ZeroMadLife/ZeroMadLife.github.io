// Public capability map for the knowledge-base site. Keep this list about
// topics readers can verify from the published notes, not private credentials.
export interface Skill {
	id: string;
	name: string;
	description: string;
	scope: string;
	icon: string;
	category: "frontend" | "backend" | "database" | "tools" | "other";
	level: "beginner" | "intermediate" | "advanced" | "expert";
	projects?: string[];
	color?: string;
}

export const skillsData: Skill[] = [
	{
		id: "agent-engineering",
		name: "Agent 工程",
		description: "围绕 Context、Memory、Tool、Harness、Graph 和恢复机制设计 Agent 系统。",
		scope: "主线方向：能结合代码、评测和运行证据做工程判断",
		icon: "material-symbols:psychology",
		category: "other",
		level: "advanced",
		projects: ["sage-knowledge-loop"],
		color: "#0f766e",
	},
	{
		id: "rag-evaluation",
		name: "RAG 与评测",
		description: "做过全文检索、向量检索、RRF、引用、版本化数据集和分层评测。",
		scope: "主线方向：结果要能解释，默认开关要有证据",
		icon: "material-symbols:fact-check",
		category: "other",
		level: "advanced",
		projects: ["sage-knowledge-loop"],
		color: "#7c3aed",
	},
	{
		id: "java-backend",
		name: "Java 后端",
		description: "熟悉 Java、集合、多线程、线程池、JVM 基础，以及 Spring Boot、Spring MVC 和 MyBatis-Plus。",
		scope: "主力方向：REST 接口、参数校验、状态流转和故障处理",
		icon: "logos:java",
		category: "backend",
		level: "advanced",
		color: "#b45309",
	},
	{
		id: "spring-cloud",
		name: "微服务与接口治理",
		description: "接触过 Spring Cloud Alibaba、Nacos、Feign，以及配置驱动的数据接入和接口交换。",
		scope: "项目实践：熟悉常见组件的职责和落地方式",
		icon: "material-symbols:hub",
		category: "backend",
		level: "intermediate",
		color: "#dc2626",
	},
	{
		id: "python-fastapi",
		name: "Python / FastAPI",
		description: "用于 AI 应用、异步解析、RQ Worker、Pydantic 数据模型和 Agent 服务。",
		scope: "项目实践：能完成 API、任务链路和验证脚本",
		icon: "logos:python",
		category: "backend",
		level: "intermediate",
		color: "#2563eb",
	},
	{
		id: "databases-caches",
		name: "数据库与缓存",
		description: "熟悉 MySQL 表结构、索引、事务和慢 SQL；有 PostgreSQL/pgvector 与 Redis 实践。",
		scope: "项目实践：缓存、队列、检索和状态持久化",
		icon: "logos:postgresql",
		category: "database",
		level: "intermediate",
		color: "#2563eb",
	},
	{
		id: "messaging-async",
		name: "消息与异步任务",
		description: "有 Redis/RQ 异步任务实践，理解 RabbitMQ 与 Kafka 的消费组、分区和消息模型。",
		scope: "熟悉范围：能读懂、接入并排查常见链路，不把了解写成主导经验",
		icon: "material-symbols:queue",
		category: "backend",
		level: "intermediate",
		color: "#0891b2",
	},
	{
		id: "linux-docker-delivery",
		name: "Linux / Docker / 交付",
		description: "熟悉 Linux、Git、Maven、Docker Compose、Nginx 和静态站点的构建发布。",
		scope: "项目实践：能把应用从本地跑到服务器，并保留回滚和验证入口",
		icon: "logos:docker-icon",
		category: "tools",
		level: "intermediate",
		color: "#0284c7",
	},
	{
		id: "kubernetes",
		name: "Kubernetes",
		description: "理解 Pod、Deployment、Service、ConfigMap、Secret、Job 和 HPA 在 Agent 部署中的作用。",
		scope: "学习与使用中：尚未主导生产级 Kubernetes 集群",
		icon: "logos:kubernetes",
		category: "tools",
		level: "beginner",
		color: "#326ce5",
	},
	{
		id: "vue-frontend",
		name: "Vue3 前端协作",
		description: "能阅读和修改 Vue3、TypeScript、Pinia 项目，也会借助 AI 完成页面和交互。",
		scope: "协作范围：以前端实现为主，不负责复杂前端架构设计",
		icon: "logos:vue",
		category: "frontend",
		level: "beginner",
		color: "#42b883",
	},
];
