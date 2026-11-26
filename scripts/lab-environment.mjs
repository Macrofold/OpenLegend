import { resolve } from 'node:path';

/** Local launch and setup use the same independent Lab locations. The Rust host
 * also checks actual database and directory identities before opening a Lab. */
export function localLabEnvironment(env) {
  if (!env.OPEN_LEGEND_DATABASE_URL) return {};
  const game = new URL(env.OPEN_LEGEND_DATABASE_URL);
  const lab = new URL(game);
  const gameDirectory = resolve(env.OPEN_LEGEND_DATA_DIR || '.data');
  lab.pathname += '_cognition_lab';
  return {
    OPEN_LEGEND_LAB_DATABASE_URL: env.OPEN_LEGEND_LAB_DATABASE_URL?.trim() || lab.href,
    OPEN_LEGEND_LAB_DATA_DIR: resolve(
      env.OPEN_LEGEND_LAB_DATA_DIR || gameDirectory + '-cognition-lab',
    ),
  };
}
