import { afterAll } from 'vitest';
import { closeTestDatabases } from './fixtures/database.js';
import { initializeCollisionRuntime } from '../packages/spatial/src/rapier.js';

// The test process composes the same native geometry dependency as the application.
// Keep initialization outside the deterministic domain and do not substitute a geometry mock.
await initializeCollisionRuntime();

afterAll(closeTestDatabases);
