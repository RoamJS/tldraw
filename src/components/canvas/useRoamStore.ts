import { TLAnyShapeUtilConstructor, createTLStore, loadSnapshot } from "tldraw";
import { useEffect, useMemo, useRef } from "react";
import getBlockProps, { JsonValue, normalizeProps } from "~/utils/getBlockProps";

const THROTTLE_MS = 350;
export const ROAM_TLDRAW_KEY = "roamjs-tldraw";

type RoamTldrawState = {
  stateId: string;
  tldraw: Parameters<typeof loadSnapshot>[1];
};

const parseRoamTldrawState = (
  value: JsonValue | undefined,
): RoamTldrawState | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const stateId = value["stateId"];
  const tldraw = value["tldraw"];
  if (typeof stateId !== "string" || !tldraw || typeof tldraw !== "object") {
    return;
  }
  return {
    stateId,
    tldraw: tldraw as Parameters<typeof loadSnapshot>[1],
  };
};

const getPageProps = (pageUid: string): Record<string, JsonValue> =>
  getBlockProps(pageUid);

const getPersistedSnapshot = (pageUid: string): RoamTldrawState | null => {
  const props = getPageProps(pageUid);
  const persisted = parseRoamTldrawState(props[ROAM_TLDRAW_KEY]);
  if (!persisted?.tldraw) return null;
  return persisted;
};

const setPersistedSnapshot = ({
  pageUid,
  state,
}: {
  pageUid: string;
  state: RoamTldrawState;
}): void => {
  const props = getPageProps(pageUid);
  void window.roamAlphaAPI.data.page.update({
    page: {
      uid: pageUid,
      props: {
        ...props,
        [ROAM_TLDRAW_KEY]: state,
      },
    },
  });
};

export const useRoamStore = ({
  customShapeUtils,
  pageUid,
}: {
  customShapeUtils: readonly TLAnyShapeUtilConstructor[];
  pageUid: string;
}) => {
  const localStateIds = useRef<Set<string>>(new Set());
  const serializeTimeout = useRef(0);
  const deserializeTimeout = useRef(0);

  const store = useMemo(() => {
    const tlStore = createTLStore({
      shapeUtils: customShapeUtils,
    });

    if (!pageUid) return tlStore;

    const persisted = getPersistedSnapshot(pageUid);
    if (persisted?.tldraw) {
      loadSnapshot(tlStore, persisted.tldraw);
    }
    return tlStore;
  }, [customShapeUtils, pageUid]);

  useEffect(() => {
    if (!pageUid) return;
    const dispose = store.listen((entry: { source: string }) => {
      if (entry.source === "remote") return;
      window.clearTimeout(serializeTimeout.current);
      serializeTimeout.current = window.setTimeout(() => {
        const stateId = window.roamAlphaAPI.util.generateUID();
        localStateIds.current.add(stateId);
        if (localStateIds.current.size > 25) {
          const first = localStateIds.current.values().next().value as
            | string
            | undefined;
          if (first) localStateIds.current.delete(first);
        }
        setPersistedSnapshot({
          pageUid,
          state: {
            stateId,
            tldraw: store.getStoreSnapshot() as Parameters<typeof loadSnapshot>[1],
          },
        });
      }, THROTTLE_MS);
    });
    return () => {
      dispose();
      window.clearTimeout(serializeTimeout.current);
    };
  }, [pageUid, store]);

  useEffect(() => {
    if (!pageUid) return;
    const pullWatchProps = [
      "[:edit/user :block/props]",
      `[:block/uid "${pageUid}"]`,
      (_before: unknown, after: Record<string, unknown> | null) => {
        const props = normalizeProps(
          ((after?.[":block/props"] || {}) as JsonValue),
        ) as Record<string, JsonValue>;
        const state = parseRoamTldrawState(props[ROAM_TLDRAW_KEY]);
        if (!state?.tldraw) return;
        if (localStateIds.current.has(state.stateId)) return;

        window.clearTimeout(deserializeTimeout.current);
        deserializeTimeout.current = window.setTimeout(() => {
          store.mergeRemoteChanges(() => {
            loadSnapshot(store, state.tldraw);
          });
        }, THROTTLE_MS);
      },
    ] as const;

    window.roamAlphaAPI.data.addPullWatch(...pullWatchProps);
    return () => {
      window.clearTimeout(deserializeTimeout.current);
      window.roamAlphaAPI.data.removePullWatch(...pullWatchProps);
    };
  }, [pageUid, store]);

  return { store };
};
