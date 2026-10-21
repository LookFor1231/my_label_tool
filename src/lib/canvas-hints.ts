import type { LabelConfig } from "../types/annotation";

export function hintRowLimit(maximum: number, height: number): number {
  return Math.max(1, Math.min(maximum, Math.floor((height - 124) / 20)));
}

export function visibleLabelHints(labels: LabelConfig[], currentId: string, limit: number) {
  const candidates = labels.filter((label) => label.shortcut || label.id === currentId);
  const current = candidates.find((label) => label.id === currentId);
  const visible = candidates.slice(0, limit);
  if (current && !visible.includes(current)) visible[visible.length - 1] = current;
  return { visible, omitted: candidates.length - visible.length };
}
