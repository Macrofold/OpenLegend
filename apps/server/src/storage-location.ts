import { resolve } from 'node:path';

/** Read the operator's PostgreSQL and checkpoint locations without opening
 * either one. Offline recovery needs no gameplay listener or provider settings. */
export function readStorageLocation(env: NodeJS.ProcessEnv = process.env) {
  const databaseUrl = env['OPEN_LEGEND_DATABASE_URL']?.trim() ?? '';
  try {
    const url = databaseUrl ? new URL(databaseUrl) : undefined;
    if (
      !url ||
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    )
      throw new Error();
  } catch {
    throw new Error('OPEN_LEGEND_DATABASE_URL is required and must be a PostgreSQL URL.');
  }
  return { databaseUrl, dataDirectory: resolve(env['OPEN_LEGEND_DATA_DIR'] ?? '.data') };
}
