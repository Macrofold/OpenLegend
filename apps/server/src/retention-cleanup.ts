import {
  experienceIndividualIds,
  selectedPruneObserverIndividuals,
  selectedRetainedIndividualEvidenceKeys,
  temporalReceiptId,
  selectedRecognitionSupportSourceIds,
  releaseTemporalSupport,
  temporalSupportAliases,
  temporalEntryMetadataReader,
  updateWorld,
  type ExperienceEntry,
} from '@open-legend/domain';
import type { SavedWorld } from './store.js';
import type { RetentionMetadataView } from './retention-metadata.js';

/** Proof is owned by an actual retained name/profile/note/place or mechanical
 * grant. Dropping a profile cannot leave its old sparse proof charged forever. */
export function releaseUnusedTemporalSupports(
  state: SavedWorld,
  actorId: string,
  metadata: RetentionMetadataView,
  removedAccounts: readonly string[] = [],
): { state: SavedWorld; ids: string[] } {
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
  const candidates = Object.values(supports)
    .map((capsule) => ({ capsule, aliases: temporalSupportAliases(capsule, state.world) }))
    .filter(
      ({ capsule, aliases }) =>
        !capsule.required &&
        !capsule.values.some(
          (value) => value.kind === 'encounter-exposure' && value.exposure.kind === 'place',
        ) &&
        !aliases.some((id) => held.has(id)),
    );
  if (!candidates.length) return { state, ids: [] };
  const aliases = [...new Set(candidates.flatMap(({ aliases }) => aliases))];
  const retained = new Set<string>();
  {
    const removed = new Map(
      ['mind_awareness', 'mind_memories', 'mind_summaries'].map((table) => [
        table,
        removedAccounts,
      ]),
    );
    const current = metadata.excluding(removed);
    for (const id of aliases) if (current.hasAlias(actorId, id, false)) retained.add(id);
  }
  const ids = candidates
    .filter(({ aliases }) => !aliases.some((id) => retained.has(id)))
    .map(({ capsule }) => capsule.receipt.id);
  if (!ids.length) return { state, ids };
  return {
    state: {
      ...state,
      world: updateWorld(
        state.world,
        (draft) => {
          for (const id of ids) releaseTemporalSupport(draft, actorId, id);
        },
        { retainNativeValues: true },
      ),
    },
    ids: ids.map((id) =>
      JSON.stringify(['world', 'experience', 'temporal', 'actors', actorId, 'supports', id]),
    ),
  };
}

/** Only an actual retirement batch pays for these exact reverse-membership reads.
 * Remaining cold accounts and sparse exact proofs can independently retain a person. */
export function cleanupRetiredIndividuals(
  before: SavedWorld,
  after: SavedWorld,
  rows: ReadonlyMap<string, readonly string[]>,
  metadata: RetentionMetadataView,
): SavedWorld {
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
    for (const id of ids) {
      const row = metadata.prior(table, id);
      if (!row) continue;
      const value = actor(row.actorId);
      value.sources.add(String(row.columns['source_id']));
      for (const id of row.columns['individual_ids'] as string[]) value.individuals.add(id);
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
        for (const id of temporalSupportAliases(capsule, before.world)) value.sources.add(id);
        if (capsule.receipt.subjectIdentity?.kind === 'individual')
          value.individuals.add(capsule.receipt.subjectIdentity.individualId);
        for (const facet of capsule.values)
          if (facet.kind === 'association' && facet.subject.kind === 'individual')
            value.individuals.add(facet.subject.individualId);
      }
  if (retiredChunks.length) {
    for (const chunkId of retiredChunks)
      for (const row of metadata.priorSegments(chunkId)) {
        const value = actor(row.actorId);
        for (const id of row.columns['occurrence_source_ids'] as string[]) value.sources.add(id);
        for (const id of row.columns['occurrence_individual_ids'] as string[])
          value.individuals.add(id);
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
  for (const [actorId, candidate] of affected) {
    const retained = new Set<string>(),
      individuals = new Set<string>();
    const history = world.experience?.temporal?.actors[actorId],
      sources = world.receivedValues?.sources ?? {};
    for (const capsule of Object.values(history?.supports ?? {})) {
      for (const id of temporalSupportAliases(capsule, world)) retained.add(id);
      if (capsule.receipt.subjectIdentity?.kind === 'individual')
        individuals.add(capsule.receipt.subjectIdentity.individualId);
      for (const value of capsule.values)
        if (value.kind === 'association' && value.subject.kind === 'individual')
          individuals.add(value.subject.individualId);
    }
    for (const chunk of history?.chunks ?? []) {
      // This membership is owned by actual occurrences. Reconstruction checkpoints
      // and later confirmations must not prolong an otherwise forgotten person.
      const metadata = temporalEntryMetadataReader(chunk, { world, sources })(
        chunk.entries.filter((entry) => entry.kind === 'change'),
      );
      for (const id of metadata.sourceIds) retained.add(id);
      for (const id of metadata.individualIds) individuals.add(id);
    }
    const aliases = [...candidate.sources],
      ids = [...candidate.individuals];
    {
      const kept = metadata.excluding(rows);
      for (const id of aliases) if (kept.hasAlias(actorId, id, true)) retained.add(id);
      for (const id of ids) if (kept.hasIndividual(actorId, id)) individuals.add(id);
    }
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
    world = updateWorld(
      world,
      (draft) => {
        selectedPruneObserverIndividuals(draft, actorId, {
          releasedSourceIds: released,
          retainedIndividualIds: individuals,
        });
      },
      { retainNativeValues: true },
    );
  }
  return world === after.world ? after : { ...after, world };
}
