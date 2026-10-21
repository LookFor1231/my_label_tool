import type { LabelConfig } from "../types/annotation";
import type { ShortcutMap } from "./defaults/shortcuts";
import { normalizeLabelShortcut } from "./shortcut-utils";
import { detectConflicts } from "./shortcuts";
import { LABEL_SHORTCUT_TEXT as text } from "../i18n/label-shortcuts.zh-CN";

export function normalizeLabelBindings(labels: LabelConfig[]): LabelConfig[] {
  return labels.map((label) =>
    label.shortcut
      ? { ...label, shortcut: normalizeLabelShortcut(label.shortcut) ?? label.shortcut }
      : label,
  );
}
export function labelShortcutIssues(labels: LabelConfig[], shortcuts: ShortcutMap): string[] {
  return [
    ...detectConflicts(shortcuts, labels).map((conflict) => conflict.message),
    ...labels
      .filter((label) => label.shortcut && normalizeLabelShortcut(label.shortcut) === null)
      .map((label) => text.invalidExisting(label.name, label.shortcut!)),
  ];
}
