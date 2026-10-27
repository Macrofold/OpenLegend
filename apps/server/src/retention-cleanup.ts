import {
  experienceIndividualIds,
  selectedPruneObserverIndividuals,
  selectedRetainedIndividualEvidenceKeys,
  temporalReceiptId,
  selectedRecognitionSupportSourceIds,
  releaseTemporalSupport,
  temporalReceiptAliases,
  temporalReceiptIndividualIds,
  updateWorld,
  type ExperienceEntry,
} from '@open-legend/domain';
import type { SavedWorld, SqlDatabase } from './store.js';

/** Resolve a batch as relations, rather than rescanning the same actor rows for
 * every alias. Sparse-proof release deliberately omits recent-history ownership.
 * docs/performance.md#storage-execution */
async function retainedSourceAliases(
  db: SqlDatabase,
  worldId: string,
  actorId: string,
  aliases: readonly string[],
  removedAccounts: readonly string[],
  removedChunks?: readonly string[],
): Promise<string[]> {
  const rows = await db
    .prepare(
      `WITH requested AS MATERIALIZED (SELECT unnest(?::text[]) AS id),
      retained_accounts AS MATERIALIZED (
        SELECT world_id,actor_id,id,source_kind,event_id FROM recall_sources
        WHERE world_id=? AND actor_id=? AND memory_kind IS DISTINCT FROM 'impression' AND record_id<>ALL(?::text[]))
      ${removedChunks === undefined ? '' : `SELECT q.id FROM requested q JOIN mind_temporal_chunks c ON c.world_id=? AND c.actor_id=? AND c.source_ids @> ARRAY[q.id]::text[] WHERE c.id<>ALL(?::text[]) UNION`}
      SELECT q.id FROM requested q JOIN retained_accounts r ON r.id=q.id
      UNION SELECT q.id FROM requested q JOIN retained_accounts r ON r.event_id=q.id
      UNION SELECT q.id FROM requested q JOIN mind_source_dependencies d ON d.world_id=? AND d.actor_id=? AND d.source_id=q.id
        JOIN retained_accounts r ON r.world_id=d.world_id AND r.actor_id=d.actor_id AND r.source_kind=d.derived_kind AND r.id=d.derived_id
      UNION SELECT q.id FROM requested q JOIN mind_source_dependencies d ON d.world_id=? AND d.actor_id=? AND d.alias_id=q.id
        JOIN retained_accounts r ON r.world_id=d.world_id AND r.actor_id=d.actor_id AND r.source_kind=d.derived_kind AND r.id=d.derived_id`,
    )
    .all(
      aliases,
      worldId,
      actorId,
      removedAccounts,
      ...(removedChunks === undefined ? [] : [worldId, actorId, removedChunks]),
      worldId,
      actorId,
      worldId,
      actorId,
    );
  return rows.map((row) => String(row['id']));
}

/** Proof is owned by an actual retained name/profile/note/place or mechanical
 * grant. Dropping a profile cannot leave its old sparse proof charged forever. */
export async function releaseUnusedTemporalSupports(
  db: SqlDatabase,
  state: SavedWorld,
  actorId: string,
  complete = false,
  removedAccounts: readonly string[] = [],
): Promise<{ state: SavedWorld; ids: string[] }> {
  const supports = state.world.experience?.temporal?.actors[actorId]?.supports;
  if (!supports || !Object.keys(supports).length) return { state, ids: [] };
  const keys: string[] = [];
  keys.push(...selectedRetainedIndividualEvidenceKeys(state.world, actorId));
  for (const document of Object.values(state.world.actorKnowledge?.[actorId] ?? {}))
    keys.push(...document.evidenceIds);
  for (const record of state.world.knowledge[actorId] ?? []) {
    keys.push(record.evidenceId);
    if (record.sourceReceipt) keys.push(temporalReceiptId(record.sourceReceipt));
  }
  const held = new Set([...keys, ...selectedRecognitionSupportSourceIds(state.world, keys)]);
  const candidates = Object.values(supports).filter(
    (capsule) =>
      !capsule.required &&
      !capsule.values.some(
        (value) => value.kind === 'encounter-exposure' && value.exposure.kind === 'place',
      ) &&
      ![capsule.receipt.id, ...capsule.receipt.sourceIds].some((id) => held.has(id)),
  );
  if (!candidates.length) return { state, ids: [] };
  const aliases = [
    ...new Set(candidates.flatMap((capsule) => [capsule.receipt.id, ...capsule.receipt.sourceIds])),
  ];
  const retained = new Set<string>();
  if (!complete)
    for (let offset = 0; offset < aliases.length; offset += 800) {
      const batch = aliases.slice(offset, offset + 800);
      for (const id of await retainedSourceAliases(
        db,
        state.world.id,
        actorId,
        batch,
        removedAccounts,
      ))
        retained.add(id);
    }
  const ids = candidates
    .filter(
      (capsule) =>
        ![capsule.receipt.id, ...capsule.receipt.sourceIds].some((id) => retained.has(id)),
    )
    .map((capsule) => capsule.receipt.id);
  if (!ids.length) return { state, ids };
  return {
    state: {
      ...state,
      world: updateWorld(state.world, (draft) => {
        for (const id of ids) releaseTemporalSupport(draft, actorId, id);
      }),
    },
    ids: ids.map((id) =>
      JSON.stringify(['world', 'experience', 'temporal', 'actors', actorId, 'supports', id]),
    ),
  };
}

/** Only an actual retirement batch pays for these exact reverse-membership reads.
 * Remaining cold accounts and sparse exact proofs can independently retain a person. */
export async function cleanupRetiredIndividuals(
  db: SqlDatabase,
  before: SavedWorld,
  after: SavedWorld,
  rows: ReadonlyMap<string, readonly string[]>,
  complete = false,
): Promise<SavedWorld> {
  if (!rows.size) return after;
  const affected = new Map<string, { sources: Set<string>; individuals: Set<string> }>();
  const actor = (id: string) => {
    let value = affected.get(id);
    if (!value) affected.set(id, (value = { sources: new Set(), individuals: new Set() }));
    return value;
  };
  const tables = ['mind_awareness', 'mind_memories', 'mind_summaries'] as const;
  for (const table of tables) {
    const ids = rows.get(table) ?? [];
    if (!ids.length) continue;
    if (!complete)
      for (const row of await db
        .prepare(
          `SELECT actor_id,source_id,individual_ids FROM ${table} WHERE world_id=? AND id=ANY(?::text[])`,
        )
        .all(before.world.id, ids)) {
        const value = actor(String(row['actor_id']));
        value.sources.add(String(row['source_id']));
        for (const id of row['individual_ids'] as string[]) value.individuals.add(id);
      }
    for (const [actorId, entries] of Object.entries(
      table === 'mind_awareness'
        ? (before.world.experience?.awareness ?? {})
        : table === 'mind_summaries'
          ? (before.world.experience?.summaries ?? {})
          : before.world.memories,
    ))
      for (const value of entries) {
        const id =
          table === 'mind_awareness'
            ? (value as { eventId: string }).eventId
            : (value as { id: string }).id;
        const key = JSON.stringify(
          table === 'mind_memories'
            ? ['world', 'memories', actorId, id]
            : [
                'world',
                'experience',
                table === 'mind_awareness' ? 'awareness' : 'summaries',
                actorId,
                id,
              ],
        );
        if (!ids.includes(key)) continue;
        const selected = actor(actorId);
        selected.sources.add(id);
        const entry = {
          source:
            table === 'mind_awareness'
              ? 'awareness'
              : table === 'mind_summaries'
                ? 'summary'
                : 'memory',
          value,
        } as ExperienceEntry;
        for (const individual of experienceIndividualIds(entry))
          selected.individuals.add(individual);
      }
  }
  const retiredChunks = rows.get('mind_temporal_chunks') ?? [];
  const retiredSupports = new Set(rows.get('mind_temporal_supports') ?? []);
  for (const [actorId, history] of Object.entries(before.world.experience?.temporal?.actors ?? {}))
    for (const capsule of Object.values(history.supports ?? {}))
      if (
        retiredSupports.has(
          JSON.stringify([
            'world',
            'experience',
            'temporal',
            'actors',
            actorId,
            'supports',
            capsule.receipt.id,
          ]),
        )
      ) {
        const value = actor(actorId);
        for (const id of [capsule.receipt.id, ...capsule.receipt.sourceIds]) value.sources.add(id);
        if (capsule.receipt.subjectIdentity?.kind === 'individual')
          value.individuals.add(capsule.receipt.subjectIdentity.individualId);
        for (const facet of capsule.values)
          if (facet.kind === 'association' && facet.subject.kind === 'individual')
            value.individuals.add(facet.subject.individualId);
      }
  if (retiredChunks.length) {
    if (!complete)
      for (const row of await db
        .prepare(
          'SELECT actor_id,source_ids,individual_ids FROM mind_temporal_chunks WHERE world_id=? AND id=ANY(?::text[])',
        )
        .all(before.world.id, retiredChunks)) {
        const value = actor(String(row['actor_id']));
        for (const id of row['source_ids'] as string[]) value.sources.add(id);
        for (const id of row['individual_ids'] as string[]) value.individuals.add(id);
      }
    const temporal = before.world.experience?.temporal;
    for (const [actorId, history] of Object.entries(temporal?.actors ?? {}))
      for (const chunk of history.chunks) {
        if (
          !retiredChunks.includes(
            JSON.stringify([
              'world',
              'experience',
              'temporal',
              'actors',
              actorId,
              'chunks',
              chunk.id,
            ]),
          )
        )
          continue;
        const value = actor(actorId);
        for (const id of chunk.sourceIds) value.sources.add(id);
        for (const id of chunk.individualIds) value.individuals.add(id);
      }
  }
  let world = after.world;
  const removedAccounts = tables.flatMap((table) => rows.get(table) ?? []);
  const individualTables = [...tables, 'mind_temporal_chunks'];
  const individualMembership = individualTables
    .map(
      (table) =>
        `SELECT individual_ids FROM ${table} WHERE world_id=? AND actor_id=? AND individual_ids && ?::text[] AND id<>ALL(?::text[])`,
    )
    .join(' UNION ALL ');
  for (const [actorId, candidate] of affected) {
    const retained = new Set<string>(),
      individuals = new Set<string>();
    const history = world.experience?.temporal?.actors[actorId],
      sources = world.experience?.temporal?.sources ?? {};
    for (const capsule of Object.values(history?.supports ?? {})) {
      for (const id of capsule.receipt.sourceIds) retained.add(id);
      retained.add(capsule.receipt.id);
      if (capsule.receipt.subjectIdentity?.kind === 'individual')
        individuals.add(capsule.receipt.subjectIdentity.individualId);
      for (const value of capsule.values)
        if (value.kind === 'association' && value.subject.kind === 'individual')
          individuals.add(value.subject.individualId);
    }
    for (const chunk of history?.chunks ?? [])
      for (const receipt of chunk.receipts) {
        for (const id of temporalReceiptAliases(receipt, sources, world)) retained.add(id);
        for (const id of temporalReceiptIndividualIds(receipt, sources)) individuals.add(id);
      }
    const aliases = [...candidate.sources],
      ids = [...candidate.individuals];
    if (!complete && aliases.length) {
      for (const id of await retainedSourceAliases(
        db,
        world.id,
        actorId,
        aliases,
        removedAccounts,
        retiredChunks,
      ))
        retained.add(id);
    }
    if (!complete && ids.length)
      for (const row of await db
        .prepare(individualMembership)
        .all(
          ...individualTables.flatMap((table) => [world.id, actorId, ids, rows.get(table) ?? []]),
        ))
        for (const id of row['individual_ids'] as string[]) individuals.add(id);
    for (const [source, entries] of [
      ['awareness', world.experience?.awareness[actorId] ?? []],
      ['memory', world.memories[actorId] ?? []],
      ['summary', world.experience?.summaries[actorId] ?? []],
    ] as const)
      for (const value of entries) {
        const entry = { source, value } as ExperienceEntry;
        for (const id of experienceIndividualIds(entry)) individuals.add(id);
        retained.add(
          source === 'awareness'
            ? (value as { eventId: string }).eventId
            : (value as { id: string }).id,
        );
      }
    const released = aliases.filter((id) => !retained.has(id));
    world = updateWorld(world, (draft) => {
      selectedPruneObserverIndividuals(draft, actorId, {
        releasedSourceIds: released,
        retainedIndividualIds: individuals,
      });
    });
  }
  return world === after.world ? after : { ...after, world };
}
