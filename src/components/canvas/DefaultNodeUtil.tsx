import React, { useEffect, useState } from "react";
import {
  BaseBoxShapeUtil,
  HTMLContainer,
  StateNode,
  T,
  TLStateNodeConstructor,
  toDomPrecision,
  useEditor,
} from "tldraw";
import { Button, Dialog, InputGroup, Menu, MenuItem } from "@blueprintjs/core";

export type DefaultNodeType = "page-node" | "blck-node";

export type RoamNodeShape = {
  id: string;
  type: DefaultNodeType;
  props: {
    w: number;
    h: number;
    uid: string;
    title: string;
  };
};

type SearchResult = {
  uid: string;
  title: string;
};

const createShapeId = (): string =>
  `shape:${window.roamAlphaAPI.util.generateUID()}`;

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchPages = ({ query }: { query: string }): SearchResult[] => {
  const pattern = escapeRegex(query.trim());
  if (!pattern) return [];
  const rows = window.roamAlphaAPI.q(
    `[:find ?uid ?title
      :where
        [?e :node/title ?title]
        [?e :block/uid ?uid]
        [(re-pattern "(?i)${pattern}") ?re]
        [(re-find ?re ?title)]]`,
  ) as [string, string][];
  return rows.map(([uid, title]) => ({ uid, title }));
};

const searchBlocks = ({ query }: { query: string }): SearchResult[] => {
  const pattern = escapeRegex(query.trim());
  if (!pattern) return [];
  const rows = window.roamAlphaAPI.q(
    `[:find ?uid ?text
      :where
        [?e :block/string ?text]
        [?e :block/uid ?uid]
        [(re-pattern "(?i)${pattern}") ?re]
        [(re-find ?re ?text)]]`,
  ) as [string, string][];
  return rows.map(([uid, title]) => ({ uid, title }));
};

const TYPE_STYLES: Record<DefaultNodeType, { bg: string; color: string }> = {
  "page-node": { bg: "#111827", color: "#f9fafb" },
  "blck-node": { bg: "#334155", color: "#f8fafc" },
};

export const DEFAULT_NODE_TOOLS: {
  id: DefaultNodeType;
  label: string;
  kbd: string;
}[] = [
  { id: "page-node", label: "Page", kbd: "p" },
  { id: "blck-node", label: "Block", kbd: "b" },
];

const NodePickerDialog = ({ shape }: { shape: RoamNodeShape }): JSX.Element => {
  const editor = useEditor();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>(shape.props.title || "");
  const [results, setResults] = useState<SearchResult[]>([]);

  const isEditing = editor.getEditingShapeId() === (shape.id as any);
  const needsSelection = !shape.props.uid;

  useEffect(() => {
    if (isEditing || needsSelection) setIsOpen(true);
  }, [isEditing, needsSelection]);

  useEffect(() => {
    if (!isOpen) return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      const r =
        shape.type === "page-node"
          ? searchPages({ query }).slice(0, 20)
          : searchBlocks({ query }).slice(0, 20);
      setResults(r);
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [isOpen, query, shape.type]);

  const closeDialog = (): void => {
    setIsOpen(false);
    editor.setEditingShape(null);
    if (!shape.props.uid) {
      editor.deleteShapes([shape.id as any]);
    }
    editor.setCurrentTool("select");
  };

  const applySelection = ({ uid, title }: SearchResult): void => {
    editor.updateShapes([
      {
        id: shape.id as any,
        type: shape.type as any,
        props: {
          ...shape.props,
          uid,
          title,
        },
      },
    ]);
    setIsOpen(false);
    editor.setEditingShape(null);
    editor.setCurrentTool("select");
  };

  return (
    <Dialog
      className="roamjs-canvas-dialog"
      isOpen={isOpen}
      title={shape.type === "page-node" ? "Select Page" : "Select Block"}
      onClose={closeDialog}
      canEscapeKeyClose
      canOutsideClickClose
      enforceFocus
      autoFocus
    >
      <div className="bp3-dialog-body">
        <InputGroup
          autoFocus
          placeholder={
            shape.type === "page-node" ? "Search pages..." : "Search blocks..."
          }
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setQuery(e.target.value)
          }
        />
        <div className="mt-2 max-h-80 overflow-auto">
          <Menu>
            {results.map((result) => (
              <MenuItem
                key={`${result.uid}-${result.title}`}
                text={result.title}
                onClick={() => applySelection(result)}
              />
            ))}
          </Menu>
        </div>
      </div>
      <div className="bp3-dialog-footer">
        <div className="bp3-dialog-footer-actions">
          <Button text="Cancel" onClick={closeDialog} />
        </div>
      </div>
    </Dialog>
  );
};

class BaseRoamNodeShapeUtil extends BaseBoxShapeUtil<any> {
  static override props = {
    w: T.number,
    h: T.number,
    uid: T.string,
    title: T.string,
  };

  override canEdit = () => true;
  override canResize = () => true;

  override getDefaultProps(): RoamNodeShape["props"] {
    return {
      w: 260,
      h: 120,
      uid: "",
      title: "",
    };
  }

  override indicator(shape: RoamNodeShape): JSX.Element {
    const { bounds } = this.editor.getShapeGeometry(shape);
    return (
      <rect
        width={toDomPrecision(bounds.width)}
        height={toDomPrecision(bounds.height)}
      />
    );
  }

  override component(shape: RoamNodeShape): JSX.Element {
    const style = TYPE_STYLES[shape.type];
    return (
      <>
        <NodePickerDialog shape={shape} />
        <HTMLContainer
          className="roamjs-tldraw-node flex h-full w-full items-center justify-center overflow-hidden rounded-2xl px-4 text-center text-sm font-medium"
          style={{
            backgroundColor: style.bg,
            color: style.color,
          }}
        >
          <div className="line-clamp-3 w-full overflow-hidden text-ellipsis">
            {shape.props.title || (shape.type === "page-node" ? "Page" : "Block")}
          </div>
        </HTMLContainer>
      </>
    );
  }
}

export const createDefaultNodeShapeTools = (): TLStateNodeConstructor[] =>
  DEFAULT_NODE_TOOLS.map(
    ({ id }) =>
      class DefaultNodeTool extends StateNode {
        static override id = id;
        static override initial = "idle";
        shapeType = id;

        override onEnter = (): void => {
          this.editor.setCursor({ type: "cross", rotation: 0 });
        };

        override onPointerDown = (): void => {
          const { currentPagePoint } = this.editor.inputs;
          const shapeId = createShapeId();
          this.editor.createShape({
            id: shapeId,
            type: this.shapeType as any,
            x: currentPagePoint.x,
            y: currentPagePoint.y,
            props: {
              uid: "",
              title: "",
              w: 260,
              h: 120,
            },
          });
          this.editor.setEditingShape(shapeId as any);
          this.editor.setCurrentTool("select");
        };
      },
  );

export const createDefaultNodeShapeUtils = () => {
  class PageNodeUtil extends BaseRoamNodeShapeUtil {
    static override type = "page-node";
  }

  class BlockNodeUtil extends BaseRoamNodeShapeUtil {
    static override type = "blck-node";
  }

  return [PageNodeUtil, BlockNodeUtil];
};

export const getNodeTypeFromRoamRefText = (
  text: string,
): { type: DefaultNodeType; uid: string; title: string } | null => {
  const pageMatch = text.match(/^\[\[(.+)\]\]$/);
  if (pageMatch?.[1]) {
    const title = pageMatch[1].trim();
    const result = window.roamAlphaAPI.q(
      `[:find ?uid . :where [?e :node/title "${title.replace(/"/g, '\\"')}"] [?e :block/uid ?uid]]`,
    ) as unknown;
    const pageUid = typeof result === "string" ? result : null;
    if (!pageUid) return null;
    return { type: "page-node", uid: pageUid, title };
  }

  const blockMatch = text.match(/^\(\(([a-zA-Z0-9_-]{9})\)\)$/);
  if (blockMatch?.[1]) {
    const uid = blockMatch[1];
    const textOrPage =
      window.roamAlphaAPI.pull("[:block/string :node/title]", [
        ":block/uid",
        uid,
      ]) || {};
    const title =
      (textOrPage[":node/title"] as string | undefined) ||
      (textOrPage[":block/string"] as string | undefined) ||
      uid;
    return { type: "blck-node", uid, title };
  }

  return null;
};
