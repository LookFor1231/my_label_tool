import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { DEFAULT_SHORTCUTS } from "../lib/defaults/shortcuts";
import { useOverlayStore } from "../store/useOverlayStore";
import { useOperations } from "../store/useOperations";

it("uses exact label combinations and blocks repeated, composed, editable, overlay and conflicting input", () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  useOperations.setState({ operations: [], mcpControlled: false });
  const change = vi.fn(),
    save = vi.fn(),
    conflict = vi.fn();
  function Owner() {
    useKeyboardShortcuts({
      labels: ["a", "Ctrl+a", "Shift+1", "Ctrl+s"].map((shortcut, i) => ({
        id: String(i),
        name: `标签${i}`,
        color: "#ffffff",
        shapeType: "any",
        shortcut,
      })),
      selectedPath: "a.png",
      selectedShapeId: null,
      shortcuts: DEFAULT_SHORTCUTS,
      changeCurrentLabel: change,
      save,
      onShortcutConflict: conflict,
      deleteCurrentImage: vi.fn(),
      deleteSelectedShape: vi.fn(),
      redo: vi.fn(),
      undo: vi.fn(),
      selectAdjacentImage: vi.fn(),
      selectShapeType: vi.fn(),
      zoomFromKeyboard: vi.fn(),
    });
    return <input />;
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(<Owner />));
  const press = (event: KeyboardEventInit, target: EventTarget = window) =>
    act(() => {
      target.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...event }),
      );
    });
  try {
    press({ key: "a" });
    press({ key: "a", ctrlKey: true });
    press({ key: "!", code: "Digit1", shiftKey: true });
    expect(change.mock.calls).toEqual([["0"], ["1"], ["2"]]);
    change.mockClear();
    press({ key: "a", repeat: true });
    press({ key: "a", isComposing: true });
    press({ key: "a" }, host.querySelector("input")!);
    useOverlayStore.getState().register({ id: "test", parentId: null, kind: "blocking" });
    press({ key: "a", ctrlKey: true });
    useOverlayStore.getState().unregister("test");
    expect(change).not.toHaveBeenCalled();
    press({ key: "s", ctrlKey: true });
    expect(save).not.toHaveBeenCalled();
    expect(conflict).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event("blur"));
    press({ key: "a" });
    expect(change).toHaveBeenCalledExactlyOnceWith("0");
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
