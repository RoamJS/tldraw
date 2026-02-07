import React from "react";
import { Button } from "@blueprintjs/core";
import openBlockInSidebar from "roamjs-components/writes/openBlockInSidebar";
import {
  BaseBoxShapeUtil,
  HTMLContainer,
  StateNode,
  T,
  TLBaseShape,
  TLStateNodeConstructor,
  createShapeId,
  toDomPrecision,
} from "tldraw";

export type DefaultNodeType = "page-node" | "blck-node";

type RoamNodeShapeProps = {
  w: number;
  h: number;
  uid: string;
  title: string;
};

export type RoamNodeShape = TLBaseShape<DefaultNodeType, RoamNodeShapeProps>;

export type SearchResult = {
  uid: string;
  title: string;
  editTime: number;
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const searchPages = ({
  query,
}: {
  query: string;
}): Promise<SearchResult[]> => {
  const pattern = escapeRegex(query.trim());
  return ((
    pattern
      ? window.roamAlphaAPI.data.async.q(
          `[:find ?uid ?title ?time
            :where
              [?e :node/title ?title]
              [?e :block/uid ?uid]
              [(get-else $ ?e :edit/time 0) ?time]
              [(re-pattern "(?i)${pattern}") ?re]
              [(re-find ?re ?title)]]`,
        )
      : window.roamAlphaAPI.data.async.q(
          `[:find ?uid ?title ?time
            :where
              [?e :node/title ?title]
              [?e :block/uid ?uid]
              [(get-else $ ?e :edit/time 0) ?time]]`,
        )
  ) as Promise<[string, string, number][]>).then((rows) =>
    rows
      .map(([uid, title, editTime]) => ({
        uid,
        title,
        editTime: editTime || 0,
      }))
      .sort((a, b) => b.editTime - a.editTime),
  );
};

export const searchBlocks = ({
  query,
}: {
  query: string;
}): Promise<SearchResult[]> => {
  const pattern = escapeRegex(query.trim());
  return ((
    pattern
      ? window.roamAlphaAPI.data.async.q(
          `[:find ?uid ?text ?time
            :where
              [?e :block/string ?text]
              [?e :block/uid ?uid]
              [(get-else $ ?e :edit/time 0) ?time]
              [(re-pattern "(?i)${pattern}") ?re]
              [(re-find ?re ?text)]]`,
        )
      : window.roamAlphaAPI.data.async.q(
          `[:find ?uid ?text ?time
            :where
              [?e :block/string ?text]
              [?e :block/uid ?uid]
              [(get-else $ ?e :edit/time 0) ?time]]`,
        )
  ) as Promise<[string, string, number][]>).then((rows) =>
    rows
      .map(([uid, title, editTime]) => ({
        uid,
        title,
        editTime: editTime || 0,
      }))
      .sort((a, b) => b.editTime - a.editTime),
  );
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

class BaseRoamNodeShapeUtil extends BaseBoxShapeUtil<RoamNodeShape> {
  static override props = {
    w: T.number,
    h: T.number,
    uid: T.string,
    title: T.string,
  };

  override canEdit = () => false;
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
    const isConfigured = Boolean(shape.props.uid);
    const emptyLabel =
      shape.type === "page-node" ? "Click to set page" : "Click to set block";
    const openInMainWindow = (): void => {
      if (!shape.props.uid) return;
      const isPage = Boolean(
        window.roamAlphaAPI.pull("[:node/title]", [":block/uid", shape.props.uid])?.[
          ":node/title"
        ],
      );
      if (isPage) {
        void window.roamAlphaAPI.ui.mainWindow.openPage({
          page: { uid: shape.props.uid },
        });
        return;
      }
      void window.roamAlphaAPI.ui.mainWindow.openBlock({
        block: { uid: shape.props.uid },
      });
    };
    return (
      <HTMLContainer
        className="roamjs-tldraw-node pointer-events-auto group flex h-full w-full overflow-hidden rounded-2xl"
        style={{
          backgroundColor: style.bg,
          color: style.color,
        }}
      >
        <div
          className="relative flex h-full w-full items-center justify-center px-4 text-center text-sm font-medium"
          style={{ pointerEvents: "all" }}
        >
          {isConfigured && (
            <div className="pointer-events-auto absolute left-1 top-1 z-50 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                minimal
                small
                icon="document-open"
                onClick={(e: React.MouseEvent<HTMLElement>) => {
                  e.stopPropagation();
                  openInMainWindow();
                }}
                onPointerDown={(e: React.PointerEvent<HTMLElement>) =>
                  e.stopPropagation()
                }
                onPointerUp={(e: React.PointerEvent<HTMLElement>) =>
                  e.stopPropagation()
                }
                style={{ color: style.color, opacity: 0.85 }}
                title="Open"
              />
              <Button
                minimal
                small
                icon="panel-stats"
                onClick={(e: React.MouseEvent<HTMLElement>) => {
                  e.stopPropagation();
                  void openBlockInSidebar(shape.props.uid);
                }}
                onPointerDown={(e: React.PointerEvent<HTMLElement>) =>
                  e.stopPropagation()
                }
                onPointerUp={(e: React.PointerEvent<HTMLElement>) =>
                  e.stopPropagation()
                }
                style={{ color: style.color, opacity: 0.85 }}
                title="Open in sidebar"
              />
            </div>
          )}
          <div className="line-clamp-3 w-full overflow-hidden text-ellipsis">
            {shape.props.title || emptyLabel}
          </div>
        </div>
      </HTMLContainer>
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
          this.editor.createShape<RoamNodeShape>({
            id: shapeId,
            type: this.shapeType,
            x: currentPagePoint.x,
            y: currentPagePoint.y,
            props: {
              uid: "",
              title: "",
              w: 260,
              h: 120,
            },
          });
          this.editor.select(shapeId);
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
