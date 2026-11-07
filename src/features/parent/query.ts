// The child shown in the parent space comes from ?enfant=<id>. It is only a request: the API
// checks that this child is linked to the signed-in parent before returning anything.

export const CHILD_PARAM = "enfant";

type Params = Record<string, string | string[] | undefined>;

/** The child asked for in the URL, or null for the default (first) child. Never trusted as is. */
export function childParam(params: Params): string | null {
  const value = params[CHILD_PARAM];
  if (value === undefined) return null;
  // ?enfant=a&enfant=b is not something our links produce: refuse it rather than guess.
  if (typeof value !== "string") return "\u0000";
  return value === "" ? null : value.slice(0, 80);
}

/** `path` (with an optional #hash) keeping the child asked for in the URL, when there is one. */
export function withChild(path: string, child: string | null): string {
  if (!child) return path;
  const [base, hash] = path.split("#");
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${CHILD_PARAM}=${encodeURIComponent(child)}${hash ? `#${hash}` : ""}`;
}
