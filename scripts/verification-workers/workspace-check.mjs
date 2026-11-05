import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { workspaceBindings } = await import(
  pathToFileURL(resolve('scripts/performance/workspace-bindings.ts')).href
);
console.log(JSON.stringify(await workspaceBindings(process.cwd())));
