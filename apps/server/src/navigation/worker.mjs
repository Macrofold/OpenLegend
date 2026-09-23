// The server runs TypeScript through tsx too; do not inherit provider keys or parent loader flags.
import { register } from 'tsx/esm/api';
register();
await import('./worker.ts');
