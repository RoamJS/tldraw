import React from "react";
import {
  DefaultToolbar,
  DefaultToolbarContent,
  TLUiComponents,
  TLUiOverrides,
  TLUiTranslationKey,
  TldrawUiMenuItem,
  useIsToolSelected,
  useTools,
} from "tldraw";
import { DEFAULT_NODE_TOOLS } from "./DefaultNodeUtil";

export const CANVAS_MAXIMIZE_HOTKEY_KEY = "canvas-maximize-hotkey";

export const createUiOverrides = ({
  toggleMaximized,
  maximizeKbd,
}: {
  toggleMaximized: () => void;
  maximizeKbd: string;
}): TLUiOverrides => ({
  tools: (editor, tools) => {
    DEFAULT_NODE_TOOLS.forEach((tool) => {
      tools[tool.id] = {
        id: tool.id,
        icon: "tool-text",
        label: `tool.${tool.id}` as TLUiTranslationKey,
        kbd: tool.kbd,
        onSelect: () => editor.setCurrentTool(tool.id),
        readonlyOk: true,
      };
    });
    return tools;
  },
  actions: (_editor, actions) => {
    actions["toggle-full-screen"] = {
      id: "toggle-full-screen",
      label: "action.toggle-full-screen" as TLUiTranslationKey,
      kbd: maximizeKbd,
      onSelect: () => toggleMaximized(),
      readonlyOk: true,
    };
    return actions;
  },
  translations: {
    en: {
      "tool.page-node": "Page",
      "tool.blck-node": "Block",
      "action.toggle-full-screen": "Toggle Full Screen",
    },
  },
});

export const createUiComponents = (): TLUiComponents => ({
  Toolbar: () => {
    const tools = useTools();
    return (
      <DefaultToolbar>
        {DEFAULT_NODE_TOOLS.map((tool) => (
          <TldrawUiMenuItem
            key={tool.id}
            {...tools[tool.id]}
            isSelected={useIsToolSelected(tools[tool.id])}
          />
        ))}
        <DefaultToolbarContent />
      </DefaultToolbar>
    );
  },
});
