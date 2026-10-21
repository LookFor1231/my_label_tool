import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useHintPlacement } from "./useHintPlacement";
import type { HintPoint } from "../lib/hint-placement";

it("measures layout, delays recovery, and keeps pointer events transparent", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  const host = document.createElement("div");
  Object.defineProperties(host, { clientWidth: { value: 500 }, clientHeight: { value: 300 } });
  const root = createRoot(host);
  const dimensions = [
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(200),
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(180),
  ];
  function Panel({ pointer }: { pointer: HintPoint | null }) {
    const { ref, edge, faded } = useHintPlacement("left", pointer);
    return (
      <div ref={ref} data-edge={edge} style={{ opacity: faded ? 0 : 1, pointerEvents: "none" }} />
    );
  }
  try {
    act(() => root.render(<Panel pointer={{ x: 40, y: 140 }} />));
    expect((host.firstChild as HTMLElement).style.opacity).toBe("0");
    act(() => root.render(<Panel pointer={null} />));
    expect((host.firstChild as HTMLElement).style.opacity).toBe("0");
    await act(async () => vi.advanceTimersByTimeAsync(199));
    expect((host.firstChild as HTMLElement).style.opacity).toBe("0");
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect((host.firstChild as HTMLElement).style.opacity).toBe("1");
    expect((host.firstChild as HTMLElement).style.pointerEvents).toBe("none");
  } finally {
    act(() => root.unmount());
    dimensions.forEach((spy) => spy.mockRestore());
    vi.useRealTimers();
  }
});
