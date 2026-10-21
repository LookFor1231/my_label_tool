import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { placeHint, type HintEdge, type HintPoint, type HintSize } from "../lib/hint-placement";

export function useHintPlacement(side: "left" | "right", pointer: HintPoint | null) {
  const ref = useRef<HTMLDivElement>(null);
  const [measurements, setMeasurements] = useState<{ size: HintSize; viewport: HintSize } | null>(
    null,
  );
  const [edge, setEdge] = useState<HintEdge>("top");
  const [faded, setFaded] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    const parent = element?.parentElement;
    if (!element || !parent) return;
    const measure = () =>
      setMeasurements({
        size: { width: element.offsetWidth, height: element.offsetHeight },
        viewport: { width: parent.clientWidth, height: parent.clientHeight },
      });
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    observer?.observe(parent);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const placement = measurements
    ? placeHint(edge, side, measurements.size, measurements.viewport, pointer)
    : { edge, faded: false };
  useLayoutEffect(() => {
    setEdge(placement.edge);
  }, [placement.edge]);
  useEffect(() => {
    if (placement.faded) {
      setFaded(true);
      return;
    }
    const timeout = window.setTimeout(() => setFaded(false), 200);
    return () => window.clearTimeout(timeout);
  }, [placement.faded]);
  return { ref, edge: placement.edge, faded: placement.faded || faded };
}
