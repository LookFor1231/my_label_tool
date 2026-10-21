import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { LabelSettings } from "./LabelSettings";
import { useShortcutStore } from "../../store/useShortcutStore";
import { DEFAULT_SHORTCUTS } from "../../lib/defaults/shortcuts";
import { LABEL_SHORTCUT_TEXT as text } from "../../i18n/label-shortcuts.zh-CN";
import type { LabelConfig } from "../../types/annotation";

it("records, displays and clears combinations, rejects Ctrl+S, and exposes loaded conflicts", () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  useShortcutStore.getState().configure(DEFAULT_SHORTCUTS);
  const save = vi.fn(),
    openActions = vi.fn();
  function Harness() {
    const [labels, setLabels] = useState<LabelConfig[]>([
      { id: "one", name: "测试", color: "#38bdf8", shapeType: "any", shortcut: "Ctrl+s" },
    ]);
    return (
      <LabelSettings
        labels={labels}
        templates={[]}
        pluginTemplateSources={new Map()}
        selectedTemplateId="user-test"
        isDirty
        canSaveTemplate
        canDeleteTemplate
        usedLabelIds={new Set()}
        onChangeLabels={setLabels}
        onSaveTemplate={() => save(labels)}
        onOpenShortcutSettings={openActions}
        onCancelChanges={vi.fn()}
        onDeleteTemplate={vi.fn()}
        onNewTemplate={vi.fn()}
        onSaveAndUpdateTemplate={vi.fn()}
        onSaveTemplateAs={vi.fn()}
        onSelectTemplate={vi.fn()}
      />
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(<Harness />));
  const button = (name: string) =>
    [...document.querySelectorAll("button")].find((item) => item.textContent === name)!;
  try {
    expect(document.body.textContent).toContain(text.conflictHelp);
    act(() => button(text.fixActions).click());
    expect(openActions).toHaveBeenCalledOnce();
    act(() => button(text.fixLabels).click());
    expect(button("保存").disabled).toBe(true);
    const input = document.querySelector<HTMLInputElement>('[aria-label="测试 快捷键"]')!;
    for (const event of [
      { key: "a" },
      { key: "A", ctrlKey: true },
      { key: "1", altKey: true },
      { key: "!", code: "Digit1", shiftKey: true },
    ]) {
      act(() =>
        input.dispatchEvent(
          new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...event }),
        ),
      );
    }
    expect(input.value).toBe("Shift+1");
    act(() =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true }),
      ),
    );
    expect(input.value).toBe("Shift+1");
    expect(document.body.textContent).toContain("同时绑定");
    act(() => button("保存").click());
    expect(save).toHaveBeenCalledWith([expect.objectContaining({ shortcut: "Shift+1" })]);
    act(() =>
      document.querySelector<HTMLButtonElement>(`[aria-label="测试：${text.clear}"]`)!.click(),
    );
    expect(input.value).toBe("");
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
