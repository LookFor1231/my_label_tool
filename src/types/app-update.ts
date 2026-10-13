export interface AppUpdateMetadata {
  rid: number;
  currentVersion: string;
  version: string;
  body: string | null;
  rawJson: Record<string, unknown>;
}
