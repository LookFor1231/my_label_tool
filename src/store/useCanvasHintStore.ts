import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_HINT_LIMITS = { operationLimit: 8, labelLimit: 8 };
export function validHintLimit(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 50;
}
interface CanvasHintStore {
  operationLimit: number;
  labelLimit: number;
  setLimit(key: "operationLimit" | "labelLimit", value: number): void;
}
export const useCanvasHintStore = create<CanvasHintStore>()(
  persist(
    (set) => ({
      ...DEFAULT_HINT_LIMITS,
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
          operationLimit: validHintLimit(record.operationLimit)
            ? record.operationLimit
            : current.operationLimit,
          labelLimit: validHintLimit(record.labelLimit) ? record.labelLimit : current.labelLimit,
        };
      },
    },
  ),
);
