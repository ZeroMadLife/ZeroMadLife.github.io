import type { FullscreenWallpaperConfig } from "../types/config";

export const fullscreenWallpaperConfig: FullscreenWallpaperConfig = {
	enable: true,
	src: {
		desktop: [
			"/assets/desktop-banner/fanren-mulan-character-01.webp",
			"/assets/desktop-banner/fanren-mulan-character-02.webp",
			"/assets/desktop-banner/fanren-mulan-character-03.webp",
			"/assets/desktop-banner/fanren-mulan-character-04.webp",
			"/assets/desktop-banner/fanren-mulan-character-05.webp",
		],
		mobile: [
			"/assets/desktop-banner/fanren-mulan-character-01.webp",
			"/assets/desktop-banner/fanren-mulan-character-02.webp",
			"/assets/desktop-banner/fanren-mulan-character-03.webp",
			"/assets/desktop-banner/fanren-mulan-character-04.webp",
			"/assets/desktop-banner/fanren-mulan-character-05.webp",
		],
	},
	position: "top",
	carousel: {
		enable: true,
		interval: 12,
	},
	zIndex: 0,
	opacity: 0.8,
	blur: 0,
	switchable: true,
	overlay: {
		opacity: 0.8, // 壁纸不透明度，0-1
		blur: 0, // 背景模糊半径（px）
		cardOpacity: 0.8, // 卡片不透明度，0-1
		switchable: {
			opacity: true,
			blur: true,
			cardOpacity: true,
		},
	},
	fullscreen: {
		switchable: {
			opacity: true,
			blur: true,
		},
	},
};
