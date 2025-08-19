import { createState, type Stateful } from "dreamland/core";
import { StatefulClass } from "./StatefulClass";
import { Tab, type SerializedTab } from "./Tab";
import { createDelegate } from "dreamland/core";
import type { SerializedHistoryState } from "./History";
import { HistoryState } from "./History";
import { focusOmnibox } from "./components/UrlInput";

import * as tldts from "tldts";
export const pushTab = createDelegate<Tab>();
export const popTab = createDelegate<Tab>();
export const forceScreenshot = createDelegate<Tab>();

export let browser: Browser;

export const config = createState({
	theme: {
		frame_bg: [231, 238, 245],
		toolbar_bg: [211, 218, 255],
		toolbar_button_fg: [65, 72, 76],
		toolbar_fg: [65, 72, 76],

		inactive_tab_bg: [40, 40, 40],
		inactive_tab_fg: [95, 92, 96],
		active_tab_fg: [65, 72, 76],

		button_bg: [231, 238, 0],

		ntp_bg: [231, 238, 0],
		ntp_fg: [232, 234, 237],
		ntp_link_fg: [138, 180, 248],

		omnibox_bg: [221, 228, 235],
		omnibox_fg: [227, 227, 227],

		bookmark_fg: [199, 199, 199],
	},
});

export type SerializedBrowser = {
	tabs: SerializedTab[];
	globalhistory: SerializedHistoryState[];
	activetab: number;
	bookmarks: BookmarkEntry[];
	settings: Settings;
};

export type GlobalHistoryEntry = {
	timestamp: number;
	url: string;
	title: string;
	favicon?: string;
};

export type BookmarkEntry = {
	url: string;
	title: string;
	favicon?: string;
};

export type Settings = {
	theme: "dark" | "light";
	bookmarksPinned: boolean;
};

export class Browser extends StatefulClass {
	built: boolean = false;

	tabs: Tab[] = [];
	activetab: Tab = null!;

	globalhistory: HistoryState[] = [];
	bookmarks: BookmarkEntry[] = [];

	unfocusframes: boolean = false;

	settings: Stateful<Settings> = createState({
		theme: "light",
		bookmarksPinned: false,
	});

	constructor() {
		super(createState(Object.create(Browser.prototype)));

		setInterval(saveBrowserState, 1000);
	}

	serialize(): SerializedBrowser {
		return {
			tabs: this.tabs.map((t) => t.serialize()),
			activetab: this.activetab.id,
			globalhistory: this.globalhistory.map((s) => s.serialize()),
			bookmarks: this.bookmarks,
			settings: { ...this.settings },
		};
	}
	deserialize(de: SerializedBrowser) {
		this.tabs = [];
		this.globalhistory = de.globalhistory.map((s) => {
			const state = new HistoryState();
			state.deserialize(s);
			return state;
		});
		for (let detab of de.tabs) {
			let tab = this.newTab();
			tab.deserialize(detab);
		}
		this.activetab = this.tabs[0];
		this.bookmarks = de.bookmarks;
		this.settings = createState(de.settings);
		// this.activetab = this.tabs.find((t) => t.id == de.activetab)!;
	}

	newTab(url?: URL, focusomnibox: boolean = false) {
		let tab = new Tab(url);
		pushTab(tab);
		this.tabs = [...this.tabs, tab];
		this.activetab = tab;
		if (focusomnibox) focusOmnibox();
		return tab;
	}

	newTabRight(ref: Tab, url?: URL) {
		let tab = new Tab(url);
		pushTab(tab);
		let index = this.tabs.indexOf(ref);
		this.tabs.splice(index + 1, 0, tab);
		this.tabs = this.tabs;
		this.activetab = tab;
		return tab;
	}

	destroyTab(tab: Tab) {
		this.tabs = this.tabs.filter((t) => t !== tab);
		console.log(this.tabs);
		if (this.activetab === tab) {
			this.activetab =
				this.tabs[0] || browser.newTab(new URL("puter://newtab"), true);
		}
		popTab(tab);
	}

	searchNavigate(url: string) {
		function validTld(hostname: string) {
			const res = tldts.parse(url);
			if (!res.domain) return false;
			if (res.isIp || res.isIcann) return true;
			return false;
		}

		// TODO: dejank
		if (URL.canParse(url)) {
			this.activetab.pushNavigate(new URL(url));
		} else if (
			URL.canParse("https://" + url) &&
			validTld(new URL("https://" + url).hostname)
		) {
			let fullurl = new URL("https://" + url);
			this.activetab.pushNavigate(fullurl);
		} else {
			const search = `https://google.com/search?q=${encodeURIComponent(url)}`;
			this.activetab.pushNavigate(new URL(search));
		}
	}
}

let loaded = false;
export function saveBrowserState() {
	if (!loaded) return;

	let ser = browser.serialize();

	if (import.meta.env.VITE_LOCAL) {
		localStorage["browserstate"] = JSON.stringify(ser);
	} else {
		puter.kv.set("browserstate", JSON.stringify(ser));
	}
}

export async function initBrowser() {
	browser = new Browser();

	let de;
	if (import.meta.env.VITE_LOCAL) {
		de = localStorage["browserstate"];
	} else {
		de = await puter.kv.get("browserstate");
	}
	if (de) {
		try {
			browser.deserialize(JSON.parse(de));
		} catch (e) {
			console.error(e);
			console.error("Error while loading browser state. Resetting...");

			browser = new Browser();
			let tab = browser.newTab();
			browser.activetab = tab;
		}
	} else {
		let tab = browser.newTab();
		browser.activetab = tab;
	}

	(self as any).browser = browser;
	loaded = true;
}
