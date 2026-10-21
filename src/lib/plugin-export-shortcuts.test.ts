import { expect, it, vi } from "vitest";
import Ajv2020 from "ajv/dist/2020";
import schema from "../../docs/plugin-exporter.schema.json";
import { projectPluginExportV1 } from "./plugin-export-shortcuts";
import type { ExportData } from "../types/export";
const invoke = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke,
  Channel: class {},
  convertFileSrc: (path: string) => path,
}));
const validate = new Ajv2020().compile({
  $id: schema.$id,
  $defs: schema.$defs,
  $ref: "#/$defs/exportData",
});
const data: ExportData = {
  labels: ["a", "Ctrl+a", undefined, "a+b"].map((shortcut, i) => ({
    id: String(i),
    name: `标签${i}`,
    color: "#38bdf8",
    shapeType: "any",
    shortcut,
  })),
  images: [],
};
it("keeps single keys, omits host combinations, satisfies unchanged v1 schema and does not mutate the project", () => {
  const before = JSON.stringify(data);
  expect(validate(data)).toBe(false);
  const projected = projectPluginExportV1(data);
  expect(validate(projected)).toBe(true);
  expect(projected.labels[0].shortcut).toBe("a");
  expect(projected.labels.slice(1).every((label) => !("shortcut" in label))).toBe(true);
  expect(JSON.stringify(data)).toBe(before);
});
it("applies projection at the actual Tauri plugin export boundary", async () => {
  const { runPluginExport } = await import("./tauri-api");
  await runPluginExport(
    "dev.test.export",
    "test",
    data,
    {},
    "annotations",
    "C:/out",
    "run",
    () => {},
  );
  expect(invoke).toHaveBeenCalledWith(
    "run_plugin_export",
    expect.objectContaining({
      request: expect.objectContaining({ exportData: projectPluginExportV1(data) }),
    }),
  );
});
