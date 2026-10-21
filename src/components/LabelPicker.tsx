import { useEffect, useId, useRef, useState } from "react";
import { Overlay } from "./overlay/Overlay";
import { LABEL_PICKER_TEXT as text } from "../i18n/label-picker.zh-CN";
import {
  isLabelCompatibleWithShape,
  type AnnotationShapeType,
  type LabelConfig,
} from "../types/annotation";
import { eventShortcut } from "../lib/shortcuts";
import { normalizeShortcutKey, formatShortcut } from "../lib/shortcut-utils";
import { listImageFiles, previewLabelSample } from "../lib/tauri-api";
import { joinPath } from "../lib/app-utils";
import { sampleFileStem } from "../lib/label-samples";
import { useOperations } from "../store/useOperations";

interface Props {
  labels: LabelConfig[];
  currentId: string;
  selectedShapeType?: AnnotationShapeType;
  folder: string;
  openKey: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function LabelPicker({
  labels,
  currentId,
  selectedShapeType,
  folder,
  openKey,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(currentId);
  const [samples, setSamples] = useState<Record<string, string>>({});
  const [sampleError, setSampleError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const activeRow = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const matches = labels.filter((label) =>
    label.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const active = matches.find((label) => label.id === activeId) ?? matches[0];
  const compatible = (label: LabelConfig) =>
    !selectedShapeType || isLabelCompatibleWithShape(label, selectedShapeType);
  const busy = useOperations((state) => !state.canEditAnnotations());
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    activeRow.current?.scrollIntoView?.({ block: "nearest" });
  }, [active?.id]);
  useEffect(() => {
    let cancelled = false;
    setSamples({});
    setSampleError(false);
    if (folder)
      void listImageFiles(joinPath(folder, "icon"))
        .then((files) => {
          if (!cancelled)
            setSamples(
              Object.fromEntries(
                files.map((file) => [file.name.replace(/\.[^.]+$/, "").toLowerCase(), file.path]),
              ),
            );
        })
        .catch(() => {
          if (!cancelled) setSampleError(true);
        });
    return () => {
      cancelled = true;
    };
  }, [folder]);
  function confirm(label: LabelConfig) {
    if (!compatible(label) || !useOperations.getState().canEditAnnotations()) return;
    onSelect(label.id);
    onClose();
  }
  return (
    <Overlay label={text.title} onClose={onClose} size="lg">
      <section
        className="flex max-h-[min(650px,85dvh)] flex-col rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
        onKeyDownCapture={(event) => {
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (eventShortcut(event) === normalizeShortcutKey(openKey)) {
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) onClose();
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const index = matches.findIndex((label) => label.id === active?.id);
            const next =
              matches[
                Math.max(
                  0,
                  Math.min(matches.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)),
                )
              ];
            if (next) setActiveId(next.id);
            input.current?.focus();
          } else if (event.key === "Enter" && event.target === input.current) {
            event.preventDefault();
            if (active && !event.repeat) confirm(active);
          }
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{text.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={text.close}
            className="rounded border border-slate-600 px-2 py-1 text-sm"
          >
            ×
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          {selectedShapeType ? text.relabel : text.drawing} {text.description}
        </p>
        <input
          ref={input}
          role="combobox"
          aria-label={text.search}
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={active ? `${listId}-${active.id}` : undefined}
          placeholder={text.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-400"
        />
        {sampleError && <p className="mb-2 text-xs text-slate-500">{text.sampleListFailed}</p>}
        <div
          id={listId}
          role="listbox"
          aria-label={text.title}
          className="scrollbar-dark min-h-0 overflow-y-auto"
        >
          {!matches.length && (
            <p role="status" className="p-6 text-center text-sm text-slate-400">
              {text.empty}
            </p>
          )}
          {matches.map((label) => (
            <button
              key={label.id}
              id={`${listId}-${label.id}`}
              ref={label.id === active?.id ? activeRow : undefined}
              role="option"
              aria-selected={label.id === currentId}
              aria-disabled={!compatible(label) || busy}
              type="button"
              onClick={() => confirm(label)}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg border p-2 text-left ${label.id === active?.id ? "border-sky-400 bg-sky-500/10" : "border-transparent hover:bg-slate-800"} ${!compatible(label) ? "opacity-50" : ""}`}
            >
              <SamplePreview
                key={samples[sampleFileStem(label.name).toLowerCase()] ?? label.id}
                path={samples[sampleFileStem(label.name).toLowerCase()]}
              />
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm" title={label.name}>
                  {label.name}
                </span>
                {!compatible(label) && (
                  <span className="text-xs text-amber-300">{text.incompatible}</span>
                )}
              </span>
              {label.id === currentId && (
                <span className="shrink-0 text-xs text-sky-300">{text.current}</span>
              )}
              {label.shortcut && (
                <kbd className="max-w-[35%] shrink-0 truncate rounded bg-slate-950 px-2 py-1 text-xs text-slate-400">
                  {formatShortcut(label.shortcut)}
                </kbd>
              )}
            </button>
          ))}
        </div>
      </section>
    </Overlay>
  );
}

function SamplePreview({ path }: { path?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!ref.current || !path) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [path]);
  useEffect(() => {
    let cancelled = false;
    if (visible && path)
      void previewLabelSample(path)
        .then((preview) => {
          if (!cancelled) setSrc(preview);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    return () => {
      cancelled = true;
    };
  }, [path, visible]);
  return (
    <span
      ref={ref}
      className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-950 text-center text-[10px] text-slate-500"
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : failed ? (
        text.sampleFailed
      ) : (
        text.noSample
      )}
    </span>
  );
}
