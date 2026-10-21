import { SHORTCUT_ACTIONS, type ShortcutActionId } from "./shortcuts";

export const DEFAULT_HINT_VISIBILITY = Object.fromEntries(
  SHORTCUT_ACTIONS.map(({ id }) => [id, !["undo", "redo", "save"].includes(id)]),
) as Record<ShortcutActionId, boolean>;

export const DEFAULT_HINT_LIMITS = { operationLimit: 8, labelLimit: 8 };
