import { sendChrome } from "./ipc";

let cachedfaviconurl: string | null = null;
export function setupTitleWatcher() {
	const observer = new MutationObserver(() => {
		const title = document.querySelector("title");
		if (title) {
			sendChrome("titlechange", { title: title.textContent });
		}
		const favicon = document.querySelector(
			"link[rel='icon'], link[rel='shortcut icon']"
		);

		const loadAndSendData = async (href: string) => {
			let res = await fetch(href);
			let blob = await res.blob();
			const reader = new FileReader();
			reader.onload = () => {
				sendChrome("titlechange", { icon: reader.result as string });
			};
			reader.onabort = () => {
				console.warn("Failed to read favicon");
				cachedfaviconurl = null;
			};
			reader.readAsDataURL(blob);
		};

		if (favicon) {
			const iconhref = favicon.getAttribute("href");
			if (iconhref) {
				if (iconhref !== cachedfaviconurl) {
					cachedfaviconurl = iconhref;
					loadAndSendData(iconhref);
				}
			}
		} else {
			if (cachedfaviconurl !== "/favicon.ico") {
				// check if there's a favicon.ico
				let img = new Image();
				img.src = "/favicon.ico";
				img.onload = () => {
					if (img.width > 0 && img.height > 0) {
						// it loads, send it
						cachedfaviconurl = img.src;
						loadAndSendData(img.src);
					}
				};
				img.onerror = () => {
					// nope...
				};
			}
		}
	});
	observer.observe(document, {
		childList: true,
		subtree: true,
	});
}
