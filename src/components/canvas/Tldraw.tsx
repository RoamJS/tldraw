import React, { useEffect, useMemo, useState, useRef } from "react";
import { OnloadArgs } from "roamjs-components/types";
import renderWithUnmount from "roamjs-components/util/renderWithUnmount";
import getPageUidByPageTitle from "roamjs-components/queries/getPageUidByPageTitle";
import getUids from "roamjs-components/dom/getUids";
import {
  Box,
  Editor,
  TLPointerEventInfo,
  Tldraw,
  createShapeId,
  defaultHandleExternalTextContent,
  defaultShapeTools,
  defaultShapeUtils,
  defaultTools,
} from "tldraw";
import openBlockInSidebar from "roamjs-components/writes/openBlockInSidebar";
import {
  Button,
  FocusStyleManager,
  InputGroup,
  Menu,
  MenuItem,
  Spinner,
} from "@blueprintjs/core";
import "tldraw/tldraw.css";
import { useRoamStore } from "./useRoamStore";
import {
  createDefaultNodeShapeTools,
  createDefaultNodeShapeUtils,
  DefaultNodeType,
  getNodeTypeFromRoamRefText,
  RoamNodeShape,
  searchBlocks,
  searchPages,
  SearchResult,
} from "./DefaultNodeUtil";
import {
  CANVAS_MAXIMIZE_HOTKEY_KEY,
  customAssetUrls,
  createUiComponents,
  createUiOverrides,
} from "./uiOverrides";
import tldrawStyles from "./tldrawStyles";

type InspectorTarget = {
  id: RoamNodeShape["id"];
  type: DefaultNodeType;
  uid: string;
  title: string;
  w: number;
  h: number;
};

const INSPECTOR_DOM_RESULT_LIMIT = 50;
const INSPECTOR_SEARCH_DEBOUNCE_MS = 250;
const ROAM_URL_UID_REGEX = /(?:\/page\/|\/block\/)([\w\d_-]{9,10})/i;

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
  const inspectorInputRef = useRef<HTMLInputElement | null>(null);
  const searchRequestIdRef = useRef(0);
  const lastSearchTargetIdRef = useRef<RoamNodeShape["id"] | null>(null);
  const [inspectorTarget, setInspectorTarget] =
    useState<InspectorTarget | null>(null);
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedUid, setSelectedUid] = useState<string>("");
  const [isLoadingResults, setIsLoadingResults] = useState<boolean>(false);
  const [isInspectorMaximized, setIsInspectorMaximized] =
    useState<boolean>(false);

  const getBlockUidFromBullet = (bulletEl: HTMLElement): string | undefined => {
    try {
      const uidFromTarget = getUids(bulletEl as HTMLDivElement).blockUid;
      if (uidFromTarget) return uidFromTarget;
    } catch {
      // continue to DOM fallback
    }
    const blockMain =
      bulletEl.closest(".rm-block-main") || bulletEl.closest(".rm-block__self");
    if (!blockMain) return undefined;
    const blockInput = blockMain.querySelector(".rm-block__input");
    if (!blockInput) return undefined;
    return getUids(blockInput as HTMLDivElement).blockUid;
  };

  const getUidFromDroppedText = ({ text }: { text: string }): string => {
    const trimmed = text.trim();
    const blockRefMatch = trimmed.match(/^\(\(([\w\d_-]{9,10})\)\)$/);
    if (blockRefMatch?.[1]) return blockRefMatch[1];

    const markdownLinkMatch = trimmed.match(
      /^\[[^\]]*\]\((https?:\/\/[^\s)]+)\)$/i,
    );
    const urlCandidate = markdownLinkMatch?.[1] || trimmed;
    const urlMatch = urlCandidate.match(ROAM_URL_UID_REGEX);
    if (urlMatch?.[1]) return urlMatch[1];

    return "";
  };

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

  useEffect(() => {
    if (!inspectorTarget) {
      setQuery("");
      setResults([]);
      setSelectedUid("");
      setIsLoadingResults(false);
      setIsInspectorMaximized(false);
      lastSearchTargetIdRef.current = null;
      return;
    }
    setQuery(inspectorTarget.title || "");
    setSelectedUid("");
  }, [inspectorTarget?.id]);

  useEffect(() => {
    if (!inspectorTarget) return;
    const requestId = ++searchRequestIdRef.current;
    let cancelled = false;
    const isNewTarget = lastSearchTargetIdRef.current !== inspectorTarget.id;
    lastSearchTargetIdRef.current = inspectorTarget.id;
    if (isNewTarget) {
      setIsLoadingResults(true);
    }
    const timeout = window.setTimeout(() => {
      if (!isNewTarget) {
        setIsLoadingResults(true);
      }
      const promise =
        inspectorTarget.type === "page-node"
          ? searchPages({ query })
          : searchBlocks({ query });
      void promise
        .then((r) => {
          if (cancelled || requestId !== searchRequestIdRef.current) {
            return;
          }
          setResults(r);
          setIsLoadingResults(false);
        })
        .catch(() => {
          if (cancelled || requestId !== searchRequestIdRef.current) {
            return;
          }
          setResults([]);
          setIsLoadingResults(false);
        });
    }, INSPECTOR_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [inspectorTarget?.id, inspectorTarget?.type, query]);

  const visibleResults = useMemo(
    () => results.slice(0, INSPECTOR_DOM_RESULT_LIMIT),
    [results],
  );

  useEffect(() => {
    if (!visibleResults.length) {
      setSelectedUid("");
      return;
    }
    if (!selectedUid || !visibleResults.some((r) => r.uid === selectedUid)) {
      setSelectedUid(visibleResults[0].uid);
    }
  }, [visibleResults, selectedUid]);

  useEffect(() => {
    if (!inspectorTarget) return;
    FocusStyleManager.onlyShowFocusOnTabs();
    return () => {
      FocusStyleManager.alwaysShowFocus();
    };
  }, [inspectorTarget]);

  useEffect(() => {
    if (!inspectorTarget) return;
    const timeout = window.setTimeout(() => {
      inspectorInputRef.current?.focus();
      inspectorInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [inspectorTarget?.id]);

  useEffect(() => {
    const handleDragStart = (e: DragEvent): void => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const uid = getBlockUidFromBullet(target);
      if (uid) {
        e.dataTransfer?.setData("application/x-roam-uid", uid);
        e.dataTransfer?.setData("text/x-roam-uid", uid);
      }
    };
    document.addEventListener("dragstart", handleDragStart);
    return () => document.removeEventListener("dragstart", handleDragStart);
  }, []);

  const handleDropPayload = ({
    dataTransfer,
    clientX,
    clientY,
  }: {
    dataTransfer: DataTransfer;
    clientX: number;
    clientY: number;
  }): void => {
    const editor = appRef.current;
    if (!editor) return;
    const dropPoint = editor.screenToPage({ x: clientX, y: clientY });
    const droppedText = dataTransfer.getData("text/plain") || "";
    const appUid = dataTransfer.getData("application/x-roam-uid");
    const textUid = dataTransfer.getData("text/x-roam-uid");
    const parsedUid = getUidFromDroppedText({ text: droppedText });
    const uid = appUid || textUid || parsedUid;
    if (uid) {
      const match = getNodeTypeFromRoamRefText(`((${uid}))`);
      if (match) {
        editor.createShape<RoamNodeShape>({
          id: createShapeId(),
          type: match.type,
          x: dropPoint.x,
          y: dropPoint.y,
          props: {
            uid: match.uid,
            title: match.title,
            w: 220,
            h: 92,
          },
        });
      }
      return;
    }

    void editor.putExternalContent({
      type: "text",
      text: droppedText,
      point: dropPoint,
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onDragOverNative = (e: DragEvent): void => {
      const target = e.target as Node | null;
      if (!target || !container.contains(target)) return;
      e.preventDefault();
    };

    const onDropNative = (e: DragEvent): void => {
      const target = e.target as Node | null;
      if (!target || !container.contains(target)) return;
      e.preventDefault();
      e.stopPropagation();
      (e as Event).stopImmediatePropagation?.();
      if (!e.dataTransfer) return;
      handleDropPayload({
        dataTransfer: e.dataTransfer,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    };

    container.addEventListener("dragover", onDragOverNative, true);
    container.addEventListener("drop", onDropNative, true);
    return () => {
      container.removeEventListener("dragover", onDragOverNative, true);
      container.removeEventListener("drop", onDropNative, true);
    };
  }, []);

  const cancelInspector = (): void => {
    const editor = appRef.current;
    if (!editor || !inspectorTarget) {
      setInspectorTarget(null);
      return;
    }
    if (!inspectorTarget.uid) {
      editor.deleteShapes([inspectorTarget.id]);
    }
    editor.selectNone();
    setInspectorTarget(null);
  };

  const selectedResult =
    visibleResults.find((r) => r.uid === selectedUid) || null;

  const moveSelection = (delta: 1 | -1): void => {
    if (!visibleResults.length) return;
    const currentIndex = visibleResults.findIndex((r) => r.uid === selectedUid);
    const nextIndex =
      currentIndex < 0
        ? delta === 1
          ? 0
          : visibleResults.length - 1
        : (currentIndex + delta + visibleResults.length) %
          visibleResults.length;
    setSelectedUid(visibleResults[nextIndex].uid);
  };

  const applyInspectorResult = (result: SearchResult): void => {
    const editor = appRef.current;
    if (!editor || !inspectorTarget) return;
    editor.updateShapes([
      {
        id: inspectorTarget.id,
        type: inspectorTarget.type,
        props: {
          uid: result.uid,
          title: result.title,
          w: inspectorTarget.w,
          h: inspectorTarget.h,
        },
      },
    ]);
    setInspectorTarget(null);
  };

  const applyInspector = (): void => {
    if (!selectedResult) return;
    applyInspectorResult(selectedResult);
  };

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
        assetUrls={customAssetUrls}
        initialState="select"
        onMount={(editor) => {
          appRef.current = editor;
          const refreshInspectorTarget = (): void => {
            const selected = editor.getOnlySelectedShape() as
              | {
                  id: RoamNodeShape["id"];
                  type: string;
                  props?: {
                    uid?: string;
                    title?: string;
                    w?: number;
                    h?: number;
                  };
                }
              | undefined;
            setInspectorTarget((prev) => {
              if (
                !selected ||
                (selected.type !== "page-node" &&
                  selected.type !== "blck-node") ||
                selected.props?.uid
              ) {
                return prev ? null : prev;
              }

              const nextTarget: InspectorTarget = {
                id: selected.id,
                type: selected.type as DefaultNodeType,
                uid: selected.props?.uid || "",
                title: selected.props?.title || "",
                w: selected.props?.w || 260,
                h: selected.props?.h || 120,
              };

              if (
                prev &&
                prev.id === nextTarget.id &&
                prev.type === nextTarget.type &&
                prev.uid === nextTarget.uid &&
                prev.title === nextTarget.title &&
                prev.w === nextTarget.w &&
                prev.h === nextTarget.h
              ) {
                return prev;
              }

              return nextTarget;
            });
          };

          editor.on("event", (event) => {
            const e = event as TLPointerEventInfo;
            refreshInspectorTarget();
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
            const trimmedText = content.text.trim();
            const match = getNodeTypeFromRoamRefText(trimmedText);
            if (!match) {
              await defaultHandleExternalTextContent(editor, {
                point: content.point,
                text: content.text,
              });
              return;
            }
            const point =
              content.point ?? editor.getViewportPageBounds().center;
            editor.createShape<RoamNodeShape>({
              id: createShapeId(),
              type: match.type,
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
      {inspectorTarget && (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.2)" }}
        />
      )}
      {inspectorTarget && (
        <div
          className={`roamjs-node-inspector pointer-events-auto absolute bottom-10 left-1 flex flex-col rounded-lg bg-white ${
            isInspectorMaximized ? "right-1" : "w-80"
          }`}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            zIndex: 300,
            top: "3.25rem",
            height: "calc(100% - 50px)",
            boxShadow:
              "0px 0px 2px hsl(0, 0%, 0%, 16%), 0px 2px 3px hsl(0, 0%, 0%, 24%), 0px 2px 6px hsl(0, 0%, 0%, 0.1), inset 0px 0px 0px 1px hsl(0, 0%, 100%)",
          }}
        >
          <div
            className="flex max-h-10 flex-shrink-0 items-center rounded-t-lg bg-white pl-3 pr-1"
            style={{ minHeight: "35px" }}
          >
            <div className="flex w-full items-center">
              <div className="flex min-w-0 items-center gap-1">
                <div className="m-0 text-left text-sm font-semibold leading-tight">
                  {inspectorTarget.type === "page-node"
                    ? "Select Page"
                    : "Select Block"}
                </div>
                <Button
                  minimal
                  small
                  icon={isInspectorMaximized ? "minimize" : "maximize"}
                  onClick={() => setIsInspectorMaximized((v) => !v)}
                  title={
                    isInspectorMaximized
                      ? "Restore panel size"
                      : "Maximize panel"
                  }
                />
              </div>
              <div className="ml-auto flex flex-shrink-0 items-center justify-end gap-1">
                <Button
                  minimal
                  small
                  icon="cross"
                  onClick={cancelInspector}
                  title="Cancel"
                />
                <Button
                  minimal
                  small
                  intent="primary"
                  icon="tick"
                  disabled={!selectedResult}
                  onClick={applyInspector}
                  title="Apply"
                />
              </div>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            <InputGroup
              autoFocus
              inputRef={inspectorInputRef}
              placeholder={
                inspectorTarget.type === "page-node"
                  ? "Search pages ..."
                  : "Search blocks ..."
              }
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelInspector();
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  moveSelection(1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  moveSelection(-1);
                } else if (e.key === "Enter" && selectedResult) {
                  e.preventDefault();
                  applyInspector();
                }
              }}
            />
            <div className="mt-2 min-h-0 flex-1 overflow-auto">
              {isLoadingResults ? (
                <div className="flex h-full min-h-20 items-center justify-center">
                  <Spinner size={18} />
                </div>
              ) : (
                <Menu>
                  {visibleResults.map((result) => (
                    <MenuItem
                      key={`${result.uid}-${result.title}`}
                      text={result.title}
                      active={selectedUid === result.uid}
                      onClick={(e: React.MouseEvent<HTMLElement>) => {
                        setSelectedUid(result.uid);
                        if (e.detail === 2) {
                          applyInspectorResult(result);
                        }
                      }}
                    />
                  ))}
                </Menu>
              )}
            </div>
          </div>
        </div>
      )}
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
