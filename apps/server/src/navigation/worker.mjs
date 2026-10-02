// The server runs TypeScript through tsx too; do not inherit provider keys or parent loader flags.
// Startup attribution begins before the loader and runtimes (worker.ts reports it once); static
// imports would run before this statement, so the loader is imported dynamically.
globalThis.navigationWorkerStartedAt = performance.now();
const { register } = await import('tsx/esm/api');
register();
await import('./worker.ts');
