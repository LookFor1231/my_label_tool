import { expect, it } from "vitest";
import { placeHint } from "./hint-placement";
const panel = { width: 200, height: 180 },
  viewport = { width: 1000, height: 700 };
it("moves only when the actual panel covers the pointer and stays at its new edge", () => {
  expect(placeHint("top", "left", panel, viewport, { x: 310, y: 100 })).toEqual({
    edge: "top",
    faded: false,
  });
  expect(placeHint("top", "left", panel, viewport, { x: 40, y: 100 })).toEqual({
    edge: "bottom",
    faded: false,
  });
  expect(placeHint("bottom", "left", panel, viewport, { x: 400, y: 400 })).toEqual({
    edge: "bottom",
    faded: false,
  });
  expect(placeHint("bottom", "left", panel, viewport, { x: 40, y: 600 })).toEqual({
    edge: "top",
    faded: false,
  });
});
it("fades the whole panel when both edges obstruct, including resized layouts", () => {
  expect(
    placeHint("top", "right", panel, { width: 500, height: 300 }, { x: 450, y: 140 }).faded,
  ).toBe(true);
  expect(placeHint("top", "right", panel, viewport, { x: 940, y: 100 }).edge).toBe("bottom");
  expect(placeHint("bottom", "left", panel, viewport, null).faded).toBe(false);
  expect(placeHint("top", "left", panel, { width: 200, height: 180 }, null).faded).toBe(true);
});
