import { readConfig } from '../apps/server/src/config.js';
import { provisionCognitionLab } from '../apps/server/src/cognition-lab-setup.js';

try {
  await provisionCognitionLab(readConfig());
  console.log(
    'Cognition Lab database and directory are ready. Game data and AI defaults are unchanged.',
  );
} catch (error) {
  // Driver failures can contain connection details. Expose only our actionable configuration errors.
  const message =
    error instanceof Error && !('code' in error)
      ? error.message
      : 'Local lab database setup failed. Check PostgreSQL access and the configured separate lab database.';
  console.error(message);
  process.exitCode = 1;
}
