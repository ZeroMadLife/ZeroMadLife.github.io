import type { ProfileConfig } from "../types/config";

// 个人资料配置
export const profileConfig: ProfileConfig = {
	avatar: "/images/avatar.webp", // 相对于 /src 目录。如果以 '/' 开头，则相对于 /public 目录
	name: "ZeroMadLife",
	bio: "把问题整理成知识，把知识带回实践",
	typewriter: {
		enable: true, // 启用个人简介打字机效果
		speed: 80, // 打字速度（毫秒）
	},
	links: [
		{
			name: "GitHub",
			icon: "fa7-brands:github",
			url: "https://github.com/ZeroMadLife",
		},
		{
			name: "SAGE",
			icon: "material-symbols:psychology",
			url: "https://sagecompanion.top",
		},
	],
};
