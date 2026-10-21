export interface HintPoint {
  x: number;
  y: number;
}
export interface HintSize {
  width: number;
  height: number;
}
export type HintEdge = "top" | "bottom";

/** Keep the chosen edge until it blocks the pointer; this is the movement hysteresis. */
export function placeHint(
  edge: HintEdge,
  side: "left" | "right",
  size: HintSize,
  viewport: HintSize,
  pointer: HintPoint | null,
): { edge: HintEdge; faded: boolean } {
  const x = side === "left" ? 12 : viewport.width - 12 - size.width;
  const y = (candidate: HintEdge) =>
    candidate === "top" ? 60 : viewport.height - 12 - size.height;
  const blocked = (candidate: HintEdge) => {
    const top = y(candidate);
    if (top < 60 || top + size.height > viewport.height - 12) return true;
    return (
      pointer !== null &&
      pointer.x >= x - 32 &&
      pointer.x <= x + size.width + 32 &&
      pointer.y >= top - 32 &&
      pointer.y <= top + size.height + 32
    );
  };
  if (!blocked(edge)) return { edge, faded: false };
  const other = edge === "top" ? "bottom" : "top";
  return !blocked(other) ? { edge: other, faded: false } : { edge, faded: true };
}
