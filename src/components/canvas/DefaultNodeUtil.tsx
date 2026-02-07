import React from "react";
import {
  BaseBoxShapeUtil,
  HTMLContainer,
  StateNode,
  T,
  TLStateNodeConstructor,
  toDomPrecision,
} from "tldraw";
import getPageUidByPageTitle from "roamjs-components/queries/getPageUidByPageTitle";

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

const createShapeId = (): string =>
  `shape:${window.roamAlphaAPI.util.generateUID()}`;

const TYPE_STYLES: Record<DefaultNodeType, { bg: string; color: string }> = {
  "page-node": { bg: "#111827", color: "#f9fafb" },
  "blck-node": { bg: "#334155", color: "#f8fafc" },
};

const DEFAULT_TITLES: Record<DefaultNodeType, string> = {
  "page-node": "Page",
  "blck-node": "Block",
};

export const DEFAULT_NODE_TOOLS: {
  id: DefaultNodeType;
  label: string;
  kbd: string;
}[] = [
  { id: "page-node", label: "Page", kbd: "p" },
  { id: "blck-node", label: "Block", kbd: "b" },
];

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
      w: 220,
      h: 92,
      uid: window.roamAlphaAPI.util.generateUID(),
      title: "Node",
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
    const style = TYPE_STYLES[shape.type as DefaultNodeType];
    return (
      <HTMLContainer
        className="roamjs-tldraw-node flex h-full w-full items-center justify-center overflow-hidden rounded-2xl px-4 text-center text-sm font-medium"
        style={{
          backgroundColor: style.bg,
          color: style.color,
        }}
      >
        <div className="line-clamp-3 w-full overflow-hidden text-ellipsis">
          {shape.props.title}
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
          this.editor.createShape({
            id: createShapeId(),
            type: this.shapeType as any,
            x: currentPagePoint.x,
            y: currentPagePoint.y,
            props: {
              title: DEFAULT_TITLES[this.shapeType],
              uid: window.roamAlphaAPI.util.generateUID(),
              w: 220,
              h: 92,
            },
          });
          this.editor.setCurrentTool("select");
        };
      },
  );

export const createDefaultNodeShapeUtils = () => {
  class PageNodeUtil extends BaseRoamNodeShapeUtil {
    static override type = "page-node";
    override getDefaultProps(): RoamNodeShape["props"] {
      return {
        ...super.getDefaultProps(),
        title: "Page",
      };
    }
  }

  class BlockNodeUtil extends BaseRoamNodeShapeUtil {
    static override type = "blck-node";
    override getDefaultProps(): RoamNodeShape["props"] {
      return {
        ...super.getDefaultProps(),
        title: "Block",
      };
    }
  }

  return [PageNodeUtil, BlockNodeUtil];
};

export const getNodeTypeFromRoamRefText = (
  text: string,
): { type: DefaultNodeType; uid: string; title: string } | null => {
  const pageMatch = text.match(/^\[\[(.+)\]\]$/);
  if (pageMatch?.[1]) {
    const title = pageMatch[1].trim();
    const uid = getPageUidByPageTitle(title);
    if (!uid) return null;
    return { type: "page-node", uid, title };
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
