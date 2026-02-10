import {
  createHTMLObserver,
  getPageTitleValueByHtmlElement,
} from "roamjs-components/dom";
import runExtension from "roamjs-components/util/runExtension";
import {
  DEFAULT_CANVAS_PAGE_PATTERNS,
  CANVAS_PAGE_PATTERNS_KEY,
  isCurrentPageCanvas,
  isSidebarCanvas,
} from "~/utils/isCanvasPage";
import {
  renderTldrawCanvas,
  renderTldrawCanvasInSidebar,
} from "~/components/canvas/Tldraw";
import { CANVAS_MAXIMIZE_HOTKEY_KEY } from "~/components/canvas/uiOverrides";

export default runExtension(async (onloadArgs) => {
  const { extensionAPI } = onloadArgs;
  extensionAPI.settings.panel.create({
    tabTitle: "tldraw",
    settings: [
      {
        id: CANVAS_PAGE_PATTERNS_KEY,
        name: "Canvas Page Patterns",
        description:
          "Comma/newline-separated wildcard patterns. Example: Canvas/*, Whiteboard/*",
        action: { type: "input", placeholder: DEFAULT_CANVAS_PAGE_PATTERNS },
      },
      {
        id: CANVAS_MAXIMIZE_HOTKEY_KEY,
        name: "Maximize Hotkey",
        description: "tldraw keybinding syntax. Example: !3 for Alt+3",
        action: { type: "input", placeholder: "!3" },
      },
    ],
  });

  const pageTitleObserver = createHTMLObserver({
    tag: "H1",
    className: "rm-title-display",
    callback: (element) => {
      const h1 = element as HTMLHeadingElement;
      const title = getPageTitleValueByHtmlElement(h1);
      if (!title) return;
      if (isCurrentPageCanvas({ title, h1, extensionAPI })) {
        renderTldrawCanvas({ title, onloadArgs, h1 });
      } else if (isSidebarCanvas({ title, h1, extensionAPI })) {
        renderTldrawCanvasInSidebar({ title, onloadArgs, h1 });
      }
    },
  });

  return {
    observers: [pageTitleObserver].filter((o): o is MutationObserver => !!o),
    unload: () => {
      // TODO: Add migration/import from `roamjs-query-builder.tldraw` to `roamjs-tldraw`.
      // @ts-expect-error tldraw warns on multiple loads without resetting signia symbol.
      delete window[Symbol.for("__signia__")];
    },
  };
});
