import { css, type Component } from "dreamland/core";
import { browser } from "../main";
import { forceScreenshot, popTab, pushTab } from "../browser";
import type { Tab } from "../Tab";
import html2canvas from "html2canvas";

export const Shell: Component<{
	tabs: Tab[];
	activetab: Tab;
}> = function (cx) {
	pushTab.listen((tab) => {
		tab.frame.frame.classList.add(cx.id);
		let devtoolsFrame: HTMLIFrameElement = (
			<iframe class:unfocus={use(browser.unfocusframes)}></iframe>
		);
		let mouseMoveListen = (e: MouseEvent) => {
			tab.devtoolsWidth = window.innerWidth - e.clientX;
		};
		cx.root.appendChild(
			<div
				class="container"
				data-tab={tab.id}
				class:active={use(this.activetab).map((t) => t === tab)}
				class:showframe={use(tab.internalpage).map((t) => !t)}
			>
				<div
					class="mainframecontainer"
					class:unfocus={use(browser.unfocusframes)}
				>
					{use(tab.internalpage)}
					{tab.frame.frame}
				</div>
				<div
					class="devtools"
					class:active={use(tab.devtoolsOpen)}
					style={use`width: ${tab.devtoolsWidth}px`}
				>
					<div
						on:mousedown={(e: MouseEvent) => {
							browser.unfocusframes = true;
							document.body.style.cursor = "ew-resize";
							window.addEventListener("mousemove", mouseMoveListen);
							window.addEventListener("mouseup", () => {
								browser.unfocusframes = false;
								window.removeEventListener("mousemove", mouseMoveListen);
								document.body.style.cursor = "";
							});
						}}
						class="divider"
					></div>
					{devtoolsFrame}
				</div>
			</div>
		);
		tab.devtoolsFrame = devtoolsFrame;
	});
	popTab.listen((tab) => {
		const container = cx.root.querySelector(`[data-tab="${tab.id}"]`);
		if (!container) throw new Error(`No container found for tab ${tab.id}`);
		container.remove();
	});
	forceScreenshot.listen(async (tab) => {
		const container = cx.root.querySelector(
			`[data-tab="${tab.id}"]`
		) as HTMLElement;
		if (!container) throw new Error(`No container found for tab ${tab.id}`);

		const canvas = await html2canvas(
			container.children[0].contentDocument.body
		);
		tab.screenshot = canvas.toDataURL();
	});

	return <div></div>;
};
Shell.style = css`
	:scope {
		flex: 1;
	}
	.unfocus {
		pointer-events: none;
	}
	.container {
		width: 100%;
		height: 100%;
		display: none;
	}
	.container.active {
		display: flex;
	}
	.container .devtools {
		position: relative;
		display: none;
		width: 20em;
	}
	.container .devtools.active {
		display: flex;
	}

	.mainframecontainer {
		display: flex;
		flex: 1;
	}

	.divider {
		position: absolute;
		top: 0;
		left: -5px;
		width: 5px;
		/* background: #ccc; */
		border-right: 1px solid #ccc;
		height: 100%;
		cursor: ew-resize;
	}

	iframe {
		flex: 1;
		height: 100%;
		width: 100%;
		border: none;
		display: none;
	}
	.showframe iframe {
		display: block;
	}
`;
