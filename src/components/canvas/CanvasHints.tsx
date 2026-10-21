import type { ReactNode } from "react";
import { useShortcutStore } from "../../store/useShortcutStore";
import { useCanvasHintStore } from "../../store/useCanvasHintStore";
import { shortcutKey } from "../../lib/shortcuts";
import { formatShortcut } from "../../lib/shortcut-utils";
import { SHORTCUT_ACTIONS, type ShortcutMap } from "../../lib/defaults/shortcuts";
import { hintRowLimit, visibleLabelHints } from "../../lib/canvas-hints";
import { HINT_TEXT as text } from "../../i18n/canvas-hints.zh-CN";
import { SHORTCUT_ZH_CN as shortcutText } from "../../i18n/shortcuts.zh-CN";
import type { LabelConfig } from "../../types/annotation";
import { INTERACTION_MODE_HELP, type InteractionMode } from "./types";
import type { OverlayCorner } from "./CanvasChrome";

function HintPanel({
  corner,
  title,
  omitted,
  children,
}: {
  corner: OverlayCorner;
  title: string;
  omitted: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{ maxWidth: "min(320px, calc((100% - 36px) / 2))" }}
      className={`canvas-floating-panel pointer-events-none absolute z-10 rounded-lg border border-slate-700/70 bg-slate-950/75 px-3 py-2 text-xs leading-5 text-slate-200 shadow-lg ${corner.startsWith("top") ? "canvas-floating-panel-top" : "canvas-floating-panel-bottom"} ${corner.endsWith("left") ? "left-3" : "right-3"}`}
    >
      <div className="truncate font-medium text-sky-200">{title}</div>
      {children}
      {omitted > 0 && <div className="truncate text-slate-400">{text.more(omitted)}</div>}
    </div>
  );
}

export function ModeHelpOverlay({
  corner,
  mode,
  shortcuts,
  height = 768,
}: {
  corner: OverlayCorner;
  mode: InteractionMode;
  shortcuts: ShortcutMap;
  height?: number;
}) {
  const help = INTERACTION_MODE_HELP[mode];
  const handlers = useShortcutStore((state) => state.handlers);
  const maximum = useCanvasHintStore((state) => state.operationLimit);
  const rows = [
    ...help.tips.map((tip) => ({ id: tip, content: tip, available: true })),
    ...SHORTCUT_ACTIONS.map((action) => ({
      id: action.id,
      content: `${formatShortcut(shortcutKey(action, shortcuts))}：${action.label}${handlers[action.id] ? "" : `（${shortcutText.unavailable}）`}`,
      available: !!handlers[action.id],
    })),
  ];
  const visible = rows.slice(0, hintRowLimit(maximum, height));
  return (
    <HintPanel corner={corner} title={help.title} omitted={rows.length - visible.length}>
      {visible.map((row) => (
        <div key={row.id} className={`truncate ${row.available ? "" : "text-slate-500"}`}>
          {row.content}
        </div>
      ))}
    </HintPanel>
  );
}

export function LabelShortcutOverlay({
  currentLabelId,
  corner,
  labels,
  height = 768,
}: {
  currentLabelId: string;
  corner: OverlayCorner;
  labels: LabelConfig[];
  height?: number;
}) {
  const maximum = useCanvasHintStore((state) => state.labelLimit);
  const { visible, omitted } = visibleLabelHints(
    labels,
    currentLabelId,
    hintRowLimit(maximum, height),
  );
  if (!visible.length) return null;
  return (
    <HintPanel corner={corner} title={text.labels} omitted={omitted}>
      {visible.map((label) => (
        <div
          key={label.id}
          className={`flex min-w-0 gap-2 rounded px-1 ${label.id === currentLabelId ? "bg-sky-500/25 text-sky-100" : ""}`}
        >
          <span className="shrink-0 text-slate-400">
            {label.shortcut ? formatShortcut(label.shortcut) : text.unbound}
          </span>
          <span className="truncate">{label.name}</span>
        </div>
      ))}
    </HintPanel>
  );
}
