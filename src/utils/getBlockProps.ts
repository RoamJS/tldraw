export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const normalizeProps = (props: JsonValue): JsonValue =>
  typeof props === "object"
    ? props === null
      ? null
      : Array.isArray(props)
        ? props.map(normalizeProps)
        : Object.fromEntries(
            Object.entries(props).map(([key, value]) => [
              key.replace(/^:+/, ""),
              typeof value === "object" && value !== null
                ? normalizeProps(value as JsonValue)
                : value,
            ]),
          )
    : props;

export const getRawBlockProps = (uid: string): Record<string, JsonValue> =>
  ((window.roamAlphaAPI.pull("[:block/props]", [":block/uid", uid])?.[
    ":block/props"
  ] || {}) as Record<string, JsonValue>);

const getBlockProps = (uid: string): Record<string, JsonValue> =>
  normalizeProps(getRawBlockProps(uid)) as Record<string, JsonValue>;

export default getBlockProps;
