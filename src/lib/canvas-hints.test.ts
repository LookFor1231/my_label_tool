import { expect, it } from "vitest";
import { hintRowLimit, visibleLabelHints } from "./canvas-hints";
import { useCanvasHintStore } from "../store/useCanvasHintStore";
const labels = Array.from({ length: 50 }, (_, i) => ({
  id: String(i),
  name: `长标签${i}`,
  color: "#ffffff",
  shapeType: "any" as const,
  ...(i === 49 ? {} : { shortcut: String(i) }),
}));
it("keeps the current unbound label within the cap and counts only eligible hints", () => {
  expect(visibleLabelHints(labels, "49", 3)).toEqual({
    visible: [labels[0], labels[1], labels[49]],
    omitted: 47,
  });
  expect(visibleLabelHints(labels, "1", 3).omitted).toBe(46);
  expect(visibleLabelHints(labels, "missing", 100).visible).toHaveLength(49);
});
it("caps rows against available height", () => {
  expect(hintRowLimit(50, 324)).toBe(10);
  expect(hintRowLimit(3, 768)).toBe(3);
  expect(hintRowLimit(8, 80)).toBe(1);
});
it("rejects invalid limits and persists valid preferences", async () => {
  const store = useCanvasHintStore;
  store.getState().setLimit("labelLimit", 5);
  for (const value of [0, 51, 1.5, NaN]) store.getState().setLimit("labelLimit", value);
  expect(store.getState().labelLimit).toBe(5);
  await store.persist.rehydrate();
  expect(store.getState().labelLimit).toBe(5);
  localStorage.setItem(
    "my-label-tool.canvas-hints",
    JSON.stringify({ state: { operationLimit: -1, labelLimit: 9 } }),
  );
  await store.persist.rehydrate();
  expect(store.getState().labelLimit).toBe(9);
  expect(store.getState().operationLimit).toBe(8);
});
