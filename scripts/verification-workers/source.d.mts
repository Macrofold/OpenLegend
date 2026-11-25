export function verifySnapshot(
  root: string,
  manifest: unknown,
): Promise<{
  status: 'captured';
  head: string;
  branch: string;
  files: number;
  sha256: string;
  capturedAt: string;
}>;
export function sourceFiles(root: string): Promise<string[]>;

export interface PackedArchive {
  sha256: string;
  files: Record<string, { bytes: number; sha256: string }>;
  archive: string;
  archiveSha256: string;
  archiveBytes: number;
}
export interface PackedSource extends PackedArchive {
  commit: string;
  dirty?: boolean;
  base?: string;
  selected?: string[];
}
export function pack(root: string, commit: string, directory: string): Promise<PackedSource>;
export function packInputs(
  root: string,
  selected: string[],
  directory: string,
): Promise<PackedArchive>;
export function verifyFiles(root: string, manifest: unknown): Promise<void>;
export function snapshot(
  root: string,
  directory: string,
  selected: string[],
): Promise<PackedSource>;
