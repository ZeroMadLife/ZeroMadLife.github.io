import type { AnnouncementConfig } from "../types/config";

// 公告栏配置
export const announcementConfig: AnnouncementConfig = {
	title: "", // 公告标题，填空使用i18n字符串Key.announcement
	content: "这里记录 Agent 工程、后端实践与长期成长。文章以本地 Markdown/MDX 编写，构建后以纯静态文件发布。", // 公告内容
	closable: true, // 允许用户关闭公告
	link: {
		enable: true, // 启用链接
		text: "了解这个知识库", // 链接文本
		url: "/about/", // 链接 URL
		external: false, // 内部链接
	},
};
