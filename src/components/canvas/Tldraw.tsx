import React, { useMemo, useRef } from "react";
import { OnloadArgs } from "roamjs-components/types";
import renderWithUnmount from "roamjs-components/util/renderWithUnmount";
import getPageUidByPageTitle from "roamjs-components/queries/getPageUidByPageTitle";
import {
  Box,
  Editor,
  TLPointerEventInfo,
  Tldraw,
  defaultHandleExternalTextContent,
  defaultShapeTools,
  defaultShapeUtils,
  defaultTools,
} from "tldraw";
import openBlockInSidebar from "roamjs-components/writes/openBlockInSidebar";
import "tldraw/tldraw.css";
import { useRoamStore } from "./useRoamStore";
import {
  createDefaultNodeShapeTools,
  createDefaultNodeShapeUtils,
  getNodeTypeFromRoamRefText,
} from "./DefaultNodeUtil";
import {
  CANVAS_MAXIMIZE_HOTKEY_KEY,
  createUiComponents,
  createUiOverrides,
} from "./uiOverrides";
import tldrawStyles from "./tldrawStyles";

const createShapeId = (): string =>
  `shape:${window.roamAlphaAPI.util.generateUID()}`;

const TldrawCanvas = ({
  title,
  extensionAPI,
}: {
  title: string;
  extensionAPI: OnloadArgs["extensionAPI"];
}) => {
  const pageUid = getPageUidByPageTitle(title);
  const appRef = useRef<Editor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const shapeUtils = useMemo(
    () => [...defaultShapeUtils, ...createDefaultNodeShapeUtils()],
    [],
  );
  const tools = useMemo(
    () => [
      ...defaultTools,
      ...defaultShapeTools,
      ...createDefaultNodeShapeTools(),
    ],
    [],
  );

  const { store } = useRoamStore({
    customShapeUtils: shapeUtils,
    pageUid: pageUid || "",
  });

  const updateViewportBounds = () => {
    if (!containerRef.current || !appRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    appRef.current.updateViewportScreenBounds(
      new Box(rect.left, rect.top, rect.width, rect.height),
      true,
    );
  };

  const toggleMaximized = () => {
    // Direct DOM manipulation to avoid React re-renders
    if (!containerRef.current) return;
    const tldrawEl = containerRef.current;
    const wrapper = tldrawEl.closest(".roam-article, .rm-sidebar-outline");
    if (tldrawEl.classList.contains("relative")) {
      // Going to fullscreen
      if (wrapper) wrapper.classList.add("rjs-tldraw-maximized");
      tldrawEl.classList.add("absolute", "inset-0");
      tldrawEl.classList.remove("relative");
    } else {
      // Going back to normal
      if (wrapper) wrapper.classList.remove("rjs-tldraw-maximized");
      tldrawEl.classList.add("relative");
      tldrawEl.classList.remove("absolute", "inset-0");
    }
    requestAnimationFrame(updateViewportBounds);
  };

  const maximizeKbd =
    (extensionAPI.settings.get(CANVAS_MAXIMIZE_HOTKEY_KEY) as string) || "!3";
  const uiOverrides = useMemo(
    () => createUiOverrides({ toggleMaximized, maximizeKbd }),
    [maximizeKbd],
  );
  const uiComponents = useMemo(() => createUiComponents(), []);

  if (!pageUid) return null;

  return (
    <div
      className="roamjs-tldraw-canvas-container relative z-10 h-full w-full overflow-hidden rounded-md border border-gray-300 bg-white"
      ref={containerRef}
      tabIndex={-1}
    >
      <style>{tldrawStyles}</style>
      <Tldraw
        store={store}
        shapeUtils={shapeUtils}
        tools={tools}
        overrides={uiOverrides}
        components={uiComponents}
        initialState="select"
        onMount={(editor) => {
          appRef.current = editor;
          editor.on("event", (event) => {
            const e = event as TLPointerEventInfo;
            const validModifier = e.shiftKey || e.ctrlKey;
            if (!(e.name === "pointer_up" && validModifier)) return;

            const shape = editor.getShapeAtPoint(
              editor.inputs.currentPagePoint,
            ) as { props?: { uid?: string } } | undefined;
            const shapeUid = shape?.props?.uid;
            if (!shapeUid) return;

            if (e.shiftKey) {
              if (editor.getSelectedShapes().length > 1) return;
              void openBlockInSidebar(shapeUid);
              editor.selectNone();
              return;
            }

            if (e.ctrlKey) {
              const isPage = !!window.roamAlphaAPI.pull("[:node/title]", [
                ":block/uid",
                shapeUid,
              ])?.[":node/title"];
              if (isPage) {
                void window.roamAlphaAPI.ui.mainWindow.openPage({
                  page: { uid: shapeUid },
                });
              } else {
                void window.roamAlphaAPI.ui.mainWindow.openBlock({
                  block: { uid: shapeUid },
                });
              }
            }
          });

          editor.registerExternalContentHandler("text", async (content) => {
            if (content.type !== "text") return;
            const match = getNodeTypeFromRoamRefText(content.text.trim());
            if (!match) {
              await defaultHandleExternalTextContent(editor, {
                point: content.point,
                text: content.text,
              });
              return;
            }
            const point =
              content.point ?? editor.getViewportPageBounds().center;
            editor.createShape({
              id: createShapeId(),
              type: match.type as any,
              x: point.x,
              y: point.y,
              props: {
                uid: match.uid,
                title: match.title,
                w: 220,
                h: 92,
              },
            });
          });
        }}
      />
    </div>
  );
};

const renderTldrawCanvasHelper = ({
  title,
  onloadArgs,
  h1,
  rootSelector,
  minHeight,
  height,
}: {
  title: string;
  onloadArgs: OnloadArgs;
  h1: HTMLHeadingElement;
  rootSelector: string;
  minHeight: string;
  height: string;
}) => {
  const rootElement = h1.closest(rootSelector) as HTMLDivElement | null;
  if (!rootElement) return () => {};

  const childFromRoot =
    rootElement.querySelector<HTMLDivElement>(".rm-block-children");
  if (!childFromRoot?.parentElement) return () => {};

  const parentEl = childFromRoot.parentElement;
  if (parentEl.querySelector(".roamjs-tldraw-canvas-container"))
    return () => {};

  const canvasWrapperEl = document.createElement("div");
  parentEl.appendChild(canvasWrapperEl);
  canvasWrapperEl.style.minHeight = minHeight;
  canvasWrapperEl.style.height = height;

  const unmount = renderWithUnmount(
    <TldrawCanvas title={title} extensionAPI={onloadArgs.extensionAPI} />,
    canvasWrapperEl,
  );

  return () => {
    unmount();
    canvasWrapperEl.remove();
  };
};

export const renderTldrawCanvas = ({
  title,
  onloadArgs,
  h1,
}: {
  title: string;
  onloadArgs: OnloadArgs;
  h1: HTMLHeadingElement;
}) =>
  renderTldrawCanvasHelper({
    title,
    onloadArgs,
    h1,
    rootSelector: ".roam-article",
    minHeight: "500px",
    height: "70vh",
  });

export const renderTldrawCanvasInSidebar = ({
  title,
  onloadArgs,
  h1,
}: {
  title: string;
  onloadArgs: OnloadArgs;
  h1: HTMLHeadingElement;
}) =>
  renderTldrawCanvasHelper({
    title,
    onloadArgs,
    h1,
    rootSelector: ".rm-sidebar-outline",
    minHeight: "400px",
    height: "60vh",
  });
