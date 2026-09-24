import { readFileSync, writeFileSync } from 'node:fs';
const path = new URL('./review-smoke.mjs', import.meta.url);
// Fixture builders receive Immer drafts; materialize their JSON rather than cloning a Proxy.
const source = readFileSync(path, 'utf8')
  .replaceAll('structuredClone(w.entities[NPC_ID])', 'JSON.parse(JSON.stringify(w.entities[NPC_ID]))')
  .replaceAll('structuredClone(w.entities[PLAYER_ID])', 'JSON.parse(JSON.stringify(w.entities[PLAYER_ID]))');
writeFileSync(path, source);
await import('./review-smoke.mjs');
