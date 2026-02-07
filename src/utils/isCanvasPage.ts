import type { OnloadArgs } from "roamjs-components/types";

export const DEFAULT_CANVAS_PAGE_PATTERNS = "Canvas/*";
export const CANVAS_PAGE_PATTERNS_KEY = "canvas-page-patterns";

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePatterns = (raw: string): string[] =>
  raw
    .split(/[\n,]/)
    .map((p) => p.trim())
    .filter(Boolean);

const patternToRegex = (pattern: string): RegExp => {
  const escaped = escapeRegex(pattern).replace(/\\\*/g, ".+");
  return new RegExp(`^${escaped}$`);
};

export const getCanvasPatterns = ({
  extensionAPI,
}: {
  extensionAPI: OnloadArgs["extensionAPI"];
}): string[] => {
  const configured = extensionAPI.settings.get(CANVAS_PAGE_PATTERNS_KEY);
  const raw =
    typeof configured === "string" && configured.trim()
      ? configured
      : DEFAULT_CANVAS_PAGE_PATTERNS;
  return parsePatterns(raw);
};

export const isCanvasPage = ({
  title,
  extensionAPI,
}: {
  title: string;
  extensionAPI: OnloadArgs["extensionAPI"];
}): boolean =>
  getCanvasPatterns({ extensionAPI }).some((pattern) =>
    patternToRegex(pattern).test(title),
  );

export const isCurrentPageCanvas = ({
  title,
  h1,
  extensionAPI,
}: {
  title: string;
  h1: HTMLHeadingElement;
  extensionAPI: OnloadArgs["extensionAPI"];
}): boolean =>
  isCanvasPage({ title, extensionAPI }) && !!h1.closest(".roam-article");

export const isSidebarCanvas = ({
  title,
  h1,
  extensionAPI,
}: {
  title: string;
  h1: HTMLHeadingElement;
  extensionAPI: OnloadArgs["extensionAPI"];
}): boolean =>
  isCanvasPage({ title, extensionAPI }) && !!h1.closest(".rm-sidebar-outline");
