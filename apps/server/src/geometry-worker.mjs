// Geometry workers receive only physical queries, without provider credentials.
const { register } = await import('tsx/esm/api');
register();
await import('./geometry-worker.ts');
