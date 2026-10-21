import { describe, expect, it } from "vitest";
import { normalizeLabelShortcut, normalizeShortcutKey } from "./shortcut-utils";
import { normalizeLabelBindings, labelShortcutIssues } from "./label-shortcuts";
import { detectConflicts, eventShortcut, resolveShortcut, type ShortcutContext } from "./shortcuts";
import { DEFAULT_SHORTCUTS } from "./defaults/shortcuts";
import { parseNativeJsonImport, parseProjectConfig } from "./importers";
import projectSchema from "../../docs/project-config.schema.json";
import Ajv2020 from "ajv/dist/2020";

const labels = ["a", "Ctrl+a", "Alt+1", "Shift+1", "Ctrl+Alt+Shift+a"].map((shortcut, index) => ({
  id: String(index),
  name: `标签${index}`,
  color: "#38bdf8",
  shapeType: "any" as const,
  shortcut,
}));
const ctx: ShortcutContext = {
  shortcuts: DEFAULT_SHORTCUTS,
  labelShortcuts: labels,
  available: labels.map((label) => `label:${label.id}`),
  hasBlockingOverlay: false,
  hasLightOverlay: false,
  isEditableTarget: false,
  busy: false,
};
describe("label combinations", () => {
  it.each([
    ["A", "a"],
    ["shift+CTRL+A", "Ctrl+Shift+a"],
    ["ALT+1", "Alt+1"],
    ["Ctrl+Alt+Shift+z", "Ctrl+Alt+Shift+z"],
  ])("canonicalizes %s", (input, expected) => {
    expect(normalizeLabelShortcut(input)).toBe(expected);
    expect(normalizeShortcutKey(input)).toBe(expected);
  });
  it.each(["Ctrl", "a+b", "Ctrl+Ctrl+a", "Meta+a", "Alt+F4", "", "!", "Ctrl+", "Ctrl+Alt"])(
    "rejects %s",
    (input) => expect(normalizeLabelShortcut(input)).toBeNull(),
  );
  it("matches modifiers exactly, recovers shifted digits, and ignores repeated/IME/Meta input", () => {
    const events = [
      { key: "a" },
      { key: "A", ctrlKey: true },
      { key: "1", altKey: true },
      { key: "!", code: "Digit1", shiftKey: true },
      { key: "A", ctrlKey: true, altKey: true, shiftKey: true },
    ];
    events.forEach((event, i) => {
      expect(eventShortcut(event)).toBe(labels[i].shortcut);
      expect(resolveShortcut(event, ctx)).toBe(`label:${i}`);
    });
    for (const extra of [
      { repeat: true },
      { isComposing: true },
      { keyCode: 229 },
      { metaKey: true },
      { shiftKey: true },
    ])
      expect(resolveShortcut({ key: "a", ...extra }, ctx)).toBeNull();
    for (const extra of [
      { hasBlockingOverlay: true },
      { hasLightOverlay: true },
      { isEditableTarget: true },
      { busy: true },
    ])
      expect(resolveShortcut({ key: "a" }, { ...ctx, ...extra })).toBeNull();
  });
  it("reports fixed action, label-label, and malformed legacy conflicts by name", () => {
    expect(detectConflicts(DEFAULT_SHORTCUTS, labels)).toEqual([]);
    const invalid = [
      ...labels,
      { ...labels[0], id: "save", name: "保存标签", shortcut: "ctrl+S" },
      { ...labels[0], id: "duplicate", name: "重复标签", shortcut: "A" },
      { ...labels[0], id: "bad", name: "无效标签", shortcut: "a+b" },
    ];
    const issues = labelShortcutIssues(invalid, DEFAULT_SHORTCUTS).join("\n");
    expect(issues).toContain("保存标签");
    expect(issues).toContain("重复标签");
    expect(issues).toContain("无效标签");
  });
  it("round-trips projects, native JSON and template labels without dropping invalid legacy annotations", () => {
    const normalized = normalizeLabelBindings([
      ...labels,
      { ...labels[0], shortcut: "a+b" },
      { ...labels[0], shortcut: undefined },
    ]);
    expect(normalized[5].shortcut).toBe("a+b");
    expect(normalized[6].shortcut).toBeUndefined();
    const config = {
      schemaVersion: 1,
      format: "json",
      annotationPath: "a.json",
      imageFolder: "images",
      exportedAt: "2026-10-21",
      labels,
      template: { id: "project-config", name: "项目临时配置" },
      exportOptions: { format: "json" },
    };
    expect(new Ajv2020({ strict: false }).compile(projectSchema)(config)).toBe(true);
    expect(parseProjectConfig(JSON.stringify(config)).labels).toEqual(labels);
    expect(parseNativeJsonImport(JSON.stringify({ labels, images: [] })).labels).toEqual(labels);
    const template = {
      id: "user-test",
      name: "测试",
      labels: [{ ...labels[0], shortcut: "shift+CTRL+A" }],
    };
    expect(normalizeLabelBindings(JSON.parse(JSON.stringify(template)).labels)[0].shortcut).toBe(
      "Ctrl+Shift+a",
    );
    expect(
      parseNativeJsonImport(JSON.stringify({ labels: normalized, images: [] })).labels[5].shortcut,
    ).toBe("a+b");
  });
});
