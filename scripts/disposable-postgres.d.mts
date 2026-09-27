export function createDisposableDatabase(connectionString: string | undefined): Promise<{
  url: string;
  details: { adapter: string; topology: string; version: string; database: string };
  close(): Promise<void>;
}>;
