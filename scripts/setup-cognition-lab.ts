import { readStorageLocation } from '../apps/server/src/storage-location.js';
import { provisionCognitionLab } from '../apps/server/src/cognition-lab-setup.js';
import { localLabEnvironment } from './lab-environment.mjs';

try {
  const game = readStorageLocation();
  const lab = localLabEnvironment(process.env);
  await provisionCognitionLab(
    game.databaseUrl,
    lab.OPEN_LEGEND_LAB_DATABASE_URL!,
    game.dataDirectory,
    lab.OPEN_LEGEND_LAB_DATA_DIR!,
  );
  console.log('The local Cognition Lab database and checkpoint directory are ready.');
} catch (error) {
  console.error(
    error instanceof Error && !('code' in error) && !(error instanceof TypeError)
      ? error.message
      : 'Check the local PostgreSQL connection and separate Lab locations.',
  );
  process.exitCode = 1;
}
