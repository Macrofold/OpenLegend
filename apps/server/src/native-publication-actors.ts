import type { NativePublication } from './native-operation.js';
import { RECORD_ACTOR_PATHS } from './world-record-schema.js';

export function nativeRecordActor(table: string, identity: string): string | undefined {
  const path = JSON.parse(identity) as string[];
  const owner = RECORD_ACTOR_PATHS.get(table);
  return owner !== undefined ? path[owner] : path[1] === 'entities' ? path[2] : undefined;
}

/** Accepted sparse canonical owners identify scheduling work. Reading these
 * identities grants no source body or new permission to a consumer. */
export function nativePublicationActors(
  publication: NativePublication,
  population: Iterable<string>,
): Set<string> {
  const changed = new Set<string>();
  for (const [table, rows] of Object.entries(publication.records.writes)) {
    const owner = RECORD_ACTOR_PATHS.get(table);
    for (const row of rows) {
      const id = nativeRecordActor(table, row.id);
      if (id) changed.add(id);
    }
    if (owner === undefined && table.startsWith('config_'))
      for (const id of population) changed.add(id);
  }
  for (const [table, ids] of Object.entries(publication.records.deletes)) {
    for (const identity of ids) {
      const id = nativeRecordActor(table, identity);
      if (id) changed.add(id);
    }
  }
  return changed;
}
