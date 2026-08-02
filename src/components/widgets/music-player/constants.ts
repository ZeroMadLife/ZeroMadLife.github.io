import type { Song } from "./types";

export const STORAGE_KEY_VOLUME = "music-player-volume-v2";

export const DEFAULT_VOLUME = 0.2;

export const LOCAL_PLAYLIST: Song[] = [
	{
		id: 1465288702,
		title: "不凡",
		artist: "王铮亮",
		cover:
			"https://p1.music.126.net/lvfb_64QYmbib7ccHgDNJA==/109951165165604312.jpg",
		url: "https://meting.mysqil.com/api?server=netease&type=url&id=1465288702",
		duration: 0,
	},
	{
		id: 1971054019,
		title: "归期",
		artist: "钱润玉",
		cover:
			"https://p2.music.126.net/3vJuHBF8RZ6mQ6dhRZwOpQ==/109951169771325066.jpg",
		url: "https://meting.mysqil.com/api?server=netease&type=url&id=1971054019",
		duration: 0,
	},
];

export const DEFAULT_SONG: Song = LOCAL_PLAYLIST[0];

export const DEFAULT_METING_API =
	"https://meting.mysqil.com/api?server=:server&type=:type&id=:id&auth=:auth&r=:r";
export const DEFAULT_METING_ID = "14164869977";
export const DEFAULT_METING_SERVER = "netease";
export const DEFAULT_METING_TYPE = "playlist";

export const ERROR_DISPLAY_DURATION = 3000;
export const SKIP_ERROR_DELAY = 1000;
