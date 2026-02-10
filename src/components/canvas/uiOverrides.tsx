import React from "react";
import {
  DefaultKeyboardShortcutsDialog,
  DefaultKeyboardShortcutsDialogContent,
  DefaultMainMenu,
  DefaultToolbar,
  DefaultToolbarContent,
  EditSubmenu,
  ExportFileContentSubMenu,
  ExtrasGroup,
  PreferencesGroup,
  TLUiAssetUrlOverrides,
  TLUiComponents,
  TLUiToolItem,
  TLUiOverrides,
  TLUiTranslationKey,
  TldrawUiMenuGroup,
  TldrawUiMenuItem,
  TldrawUiMenuSubmenu,
  ZoomTo100MenuItem,
  ZoomToFitMenuItem,
  ZoomToSelectionMenuItem,
  useActions,
  useIsToolSelected,
  useTools,
} from "tldraw";
import { DEFAULT_NODE_TOOLS } from "./DefaultNodeUtil";

export const CANVAS_MAXIMIZE_HOTKEY_KEY = "canvas-maximize-hotkey";
const PAGE_NODE_ICON =
  "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE3LjEuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAyMCAyMCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMjAgMjAiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8ZyBpZD0iZG9jdW1lbnRfM18iPgoJPGc+CgkJPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMS45OCwwaC04Yy0wLjU1LDAtMSwwLjQ1LTEsMXYxOGMwLDAuNTUsMC40NSwxLDEsMWgxM2MwLjU1LDAsMS0wLjQ1LDEtMVY2CgkJCUwxMS45OCwweiBNMTUuOTgsMThoLTExVjJoNnY1aDVWMTh6Ii8+Cgk8L2c+CjwvZz4KPC9zdmc+Cg==";
const BLOCK_NODE_ICON =
  "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE3LjEuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxNiAxNiIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMTYgMTYiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8ZyBpZD0ibGFiZWxfMl8iPgoJPGc+CgkJPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMSwySDFDMC40NSwyLDAsMi40NSwwLDN2MTBjMCwwLjU1LDAuNDUsMSwxLDFoMTRjMC41NSwwLDEtMC40NSwxLTFWN0wxMSwyegoJCQkgTTE0LDEySDJWNGg4djJIM3YxaDd2MWg0VjEyeiBNMTEsN1Y0bDMsM0gxMXogTTMsMTBoMTBWOUgzVjEweiIvPgoJPC9nPgo8L2c+Cjwvc3ZnPgo=";

export const customAssetUrls: TLUiAssetUrlOverrides = {
  icons: {
    "page-node-icon": PAGE_NODE_ICON,
    "block-node-icon": BLOCK_NODE_ICON,
  },
};

const ToolMenuItem = ({ toolItem }: { toolItem: TLUiToolItem }): JSX.Element => {
  const isSelected = useIsToolSelected(toolItem);
  return <TldrawUiMenuItem {...toolItem} isSelected={isSelected} />;
};

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
        icon: tool.id === "page-node" ? "page-node-icon" : "block-node-icon",
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
          <ToolMenuItem key={tool.id} toolItem={tools[tool.id]} />
        ))}
        <DefaultToolbarContent />
      </DefaultToolbar>
    );
  },
  KeyboardShortcutsDialog: (props) => {
    const tools = useTools();
    const actions = useActions();
    return (
      <DefaultKeyboardShortcutsDialog {...props}>
        {DEFAULT_NODE_TOOLS.map((tool) => (
          <TldrawUiMenuItem key={tool.id} {...tools[tool.id]} />
        ))}
        <TldrawUiMenuItem {...actions["toggle-full-screen"]} />
        <DefaultKeyboardShortcutsDialogContent />
      </DefaultKeyboardShortcutsDialog>
    );
  },
  MainMenu: () => {
    const ViewMenu = () => {
      const actions = useActions();
      return (
        <TldrawUiMenuSubmenu id="view" label="menu.view">
          <TldrawUiMenuGroup id="view-actions">
            <TldrawUiMenuItem {...actions["zoom-in"]} />
            <TldrawUiMenuItem {...actions["zoom-out"]} />
            <ZoomTo100MenuItem />
            <ZoomToFitMenuItem />
            <ZoomToSelectionMenuItem />
            <TldrawUiMenuItem {...actions["toggle-full-screen"]} />
          </TldrawUiMenuGroup>
        </TldrawUiMenuSubmenu>
      );
    };
    return (
      <DefaultMainMenu>
        <EditSubmenu />
        <ViewMenu />
        <ExportFileContentSubMenu />
        <ExtrasGroup />
        <PreferencesGroup />
      </DefaultMainMenu>
    );
  },
});
