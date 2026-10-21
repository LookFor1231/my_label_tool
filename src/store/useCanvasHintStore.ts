import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SHORTCUT_ACTIONS, type ShortcutActionId } from "../lib/defaults/shortcuts";

export const DEFAULT_HINT_VISIBILITY = Object.fromEntries(
  SHORTCUT_ACTIONS.map(({ id }) => [id, !["undo", "redo", "save"].includes(id)]),
) as Record<ShortcutActionId, boolean>;

export const DEFAULT_HINT_LIMITS = { operationLimit: 8, labelLimit: 8 };
export function validHintLimit(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 50;
}
interface CanvasHintStore {
  visibleActions: Record<ShortcutActionId, boolean>;
  setActionVisible(id: ShortcutActionId, visible: boolean): void;
  restoreVisibility(): void;
  operationLimit: number;
  labelLimit: number;
  setLimit(key: "operationLimit" | "labelLimit", value: number): void;
}
export const useCanvasHintStore = create<CanvasHintStore>()(
  persist(
    (set) => ({
      ...DEFAULT_HINT_LIMITS,
      visibleActions: DEFAULT_HINT_VISIBILITY,
      setActionVisible: (id, visible) =>
        set((state) => ({ visibleActions: { ...state.visibleActions, [id]: visible } })),
      restoreVisibility: () => set({ visibleActions: DEFAULT_HINT_VISIBILITY }),
      setLimit: (key, value) => {
        if (validHintLimit(value)) set({ [key]: value });
      },
    }),
    {
      name: "my-label-tool.canvas-hints",
      merge: (saved, current) => {
        const record = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
        return {
          ...current,
          visibleActions: Object.fromEntries(
            SHORTCUT_ACTIONS.map(({ id }) => {
              const savedVisibility = record.visibleActions;
              const value =
                savedVisibility && typeof savedVisibility === "object"
                  ? (savedVisibility as Record<string, unknown>)[id]
                  : undefined;
              return [id, typeof value === "boolean" ? value : DEFAULT_HINT_VISIBILITY[id]];
            }),
          ) as Record<ShortcutActionId, boolean>,
          operationLimit: validHintLimit(record.operationLimit)
            ? record.operationLimit
            : current.operationLimit,
          labelLimit: validHintLimit(record.labelLimit) ? record.labelLimit : current.labelLimit,
        };
      },
    },
  ),
);
