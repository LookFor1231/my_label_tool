import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LabelPicker } from "./LabelPicker";
import { useOverlayStore } from "../store/useOverlayStore";
import { useOperations } from "../store/useOperations";
import { LABEL_PICKER_TEXT as text } from "../i18n/label-picker.zh-CN";
const api = vi.hoisted(() => ({ listImageFiles: vi.fn(), previewLabelSample: vi.fn() }));
vi.mock("../lib/tauri-api", () => api);
const labels = Array.from({ length: 50 }, (_, i) => ({
  id: String(i),
  name: `标签 ${i}`,
  color: "#38bdf8",
  shapeType: i === 1 ? ("point" as const) : ("rect" as const),
}));
let host: HTMLDivElement, root: Root;
const select = vi.fn(),
  close = vi.fn();
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  useOperations.setState({ operations: [] });
  vi.clearAllMocks();
  api.listImageFiles.mockResolvedValue([]);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
async function render(selectedShapeType?: "rect") {
  await act(async () =>
    root.render(
      <LabelPicker
        labels={labels}
        currentId="0"
        folder="C:/test"
        openKey="F2"
        selectedShapeType={selectedShapeType}
        onSelect={select}
        onClose={close}
      />,
    ),
  );
  return document.querySelector<HTMLInputElement>("input")!;
}
function key(target: HTMLElement, key: string, extra: KeyboardEventInit = {}) {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...extra }),
    );
  });
}
function search(input: HTMLInputElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
it("focuses search, gates the canvas, searches 50 labels and selects only on confirmation", async () => {
  const input = await render();
  expect(document.activeElement).toBe(input);
  expect(useOverlayStore.getState().hasBlocking()).toBe(true);
  expect(document.querySelectorAll('[role="option"]')).toHaveLength(50);
  key(input, "ArrowDown");
  expect(select).not.toHaveBeenCalled();
  search(input, "49");
  expect(document.querySelectorAll('[role="option"]')).toHaveLength(1);
  key(input, "Enter");
  expect(select).toHaveBeenCalledWith("49");
  expect(close).toHaveBeenCalledOnce();
});
it("reports empty searches and supports toggle/Escape cancellation without editing", async () => {
  const input = await render();
  search(input, "not-found");
  expect(document.body.textContent).toContain(text.empty);
  key(input, "Enter");
  key(input, "F2", { repeat: true });
  expect(close).not.toHaveBeenCalled();
  key(input, "F2", { isComposing: true });
  expect(close).not.toHaveBeenCalled();
  key(input, "F2");
  expect(close).toHaveBeenCalledOnce();
  key(input, "Escape");
  expect(close).toHaveBeenCalledTimes(2);
  expect(select).not.toHaveBeenCalled();
});
it("disables incompatible labels and busy writes while keeping all choices visible", async () => {
  const input = await render("rect");
  expect(document.body.textContent).toContain(text.relabel);
  key(input, "ArrowDown");
  key(input, "Enter");
  expect(select).not.toHaveBeenCalled();
  const rows = document.querySelectorAll<HTMLButtonElement>('[role="option"]');
  act(() => rows[1].click());
  expect(select).not.toHaveBeenCalled();
  act(() => rows[2].click());
  expect(select).toHaveBeenCalledWith("2");
  select.mockClear();
  let finish: (() => void) | undefined;
  act(() => {
    finish = useOperations.getState().begin({ label: "busy", resource: "project-annotations" }).complete;
  });
  act(() => rows[2].click());
  expect(select).not.toHaveBeenCalled();
  act(() => finish?.());
});
it("isolates failed sample previews from successful rows", async () => {
  api.listImageFiles.mockResolvedValue([
    { name: "标签 0.png", path: "bad" },
    { name: "标签 2.jpg", path: "good" },
  ]);
  api.previewLabelSample.mockImplementation((path: string) =>
    path === "bad"
      ? Promise.reject(new Error("bad"))
      : Promise.resolve("data:image/png;base64,eA=="),
  );
  await render();
  expect(document.body.textContent).toContain(text.sampleFailed);
  expect(document.querySelector("img")?.src).toContain("data:image/png");
  expect(document.querySelectorAll('[role="option"]')).toHaveLength(50);
});
