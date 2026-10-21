import { IMAGE_DELETION_ZH_CN as imageDeletionText } from "../i18n/image-deletion.zh-CN";

export function normalizeShortcutKey(key: string): string {
  const labelKey = normalizeLabelShortcut(key);
  if (labelKey !== null) return labelKey;
  return key.length === 1 ? key.toLowerCase() : key;
}

/** A label binding is exactly one letter/digit plus a set of modifiers. */
export function normalizeLabelShortcut(value: string): string | null {
  const parts = value
    .trim()
    .toLowerCase()
    .split("+")
    .map((part) => part.trim());
  const key = parts.pop();
  if (!key || !/^[a-z0-9]$/.test(key)) return null;
  if (
    new Set(parts).size !== parts.length ||
    parts.some((part) => !["ctrl", "alt", "shift"].includes(part))
  )
    return null;
  return [
    ...["Ctrl", "Alt", "Shift"].filter((modifier) => parts.includes(modifier.toLowerCase())),
    key,
  ].join("+");
}

export function formatShortcut(shortcut: string): string {
  if (shortcut === "") return imageDeletionText.unassignedShortcut;
  if (shortcut === " ") {
    return "Space";
  }
  if (shortcut === "\t" || shortcut === "Tab") {
    return "Tab";
  }
  if (shortcut === "ArrowLeft") {
    return "←";
  }
  if (shortcut === "ArrowRight") {
    return "→";
  }
  return shortcut.trim() ? shortcut.toUpperCase() : JSON.stringify(shortcut);
}
