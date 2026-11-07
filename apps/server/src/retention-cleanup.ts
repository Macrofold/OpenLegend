import {
  experienceIndividualIds,
  selectedPruneObserverIndividuals,
  selectedRetainedIndividualEvidenceKeys,
  temporalReceiptId,
  selectedRecognitionSupportSourceIds,
  releaseTemporalSupport,
  temporalSupportAliases,
  updateWorld,
  type ExperienceEntry,
  type TemporalActorHistory,
  type WorldState,
} from '@open-legend/domain';
import type { SavedWorld, SqlDatabase } from './store.js';
import type { RetentionMetadataView } from './retention-metadata.js';
import { maximumTemporalPreparationRows } from './temporal-storage.js';

type Support = NonNullable<TemporalActorHistory['supports']>[string];
export interface SupportCleanupGroup {
  actorId: string;
  candidates: Array<{ capsule: Support; aliases: string[] }>;
}
export type ReadSupportMembership = (
  requests: readonly {
    actorId: string;
    aliases: readonly string[];
    individualIds: readonly string[];
    includeRecent: false;
  }[],
) => Promise<Array<{ aliases: Set<string>; individuals: Set<string> }>>;

/** These native owners can change while a cold membership read is pending. */
export function locallyHeldSupportAliases(world: WorldState, actorId: string): Set<string> {
  const keys = [...selectedRetainedIndividualEvidenceKeys(world, actorId)];
  for (const document of Object.values(world.actorKnowledge?.[actorId] ?? {}))
    keys.push(...document.evidenceIds);
  for (const record of world.knowledge[actorId] ?? []) {
    keys.push(record.evidenceId);
    if (record.sourceReceipt) keys.push(temporalReceiptId(record.sourceReceipt));
  }
  return new Set([...keys, ...selectedRecognitionSupportSourceIds(world, keys)]);
}

export function supportLocallyRequired(
  capsule: Support,
  aliases: readonly string[],
  held: ReadonlySet<string>,
): boolean {
  return (
    capsule.required ||
    capsule.values.some(
      (value) => value.kind === 'encounter-exposure' && value.exposure.kind === 'place',
    ) ||
    aliases.some((id) => held.has(id))
  );
}

/** One whole quota-bounded native selection, independent of the cold account plan. */
export function unusedSupportCandidates(
  world: WorldState,
  actorIds: readonly string[],
): SupportCleanupGroup[] {
  return actorIds.flatMap((actorId) => {
    const supports = world.experience?.temporal?.actors[actorId]?.supports;
    const capsules = Object.values(supports ?? {});
    if (!capsules.length) return [];
    const held = locallyHeldSupportAliases(world, actorId);
    const candidates = capsules
      .map((capsule) => ({ capsule, aliases: temporalSupportAliases(capsule, world) }))
      .filter(({ capsule, aliases }) => !supportLocallyRequired(capsule, aliases, held));
    return candidates.length ? [{ actorId, candidates }] : [];
  });
}

/** Split a large actor's membership question and union all answers before deciding
 * absence. No fixed prefix can repeatedly hide a later releasable capsule. */
export async function unreferencedSupports(
  groups: readonly SupportCleanupGroup[],
  read: ReadSupportMembership,
): Promise<SupportCleanupGroup[]> {
  const requests: Parameters<ReadSupportMembership>[0][number][] = [];
  for (const { actorId, candidates } of groups) {
    const aliases = [...new Set(candidates.flatMap((candidate) => candidate.aliases))];
    const request = () => ({
      actorId,
      aliases: [] as string[],
      individualIds: [] as string[],
      includeRecent: false as const,
    });
    let pending = request();
    const overhead = Buffer.byteLength(JSON.stringify(pending));
    let bytes = overhead;
    for (const alias of aliases) {
      const size = Buffer.byteLength(JSON.stringify(alias));
      if (overhead + size + 3 > 4 * 1024 * 1024)
        throw new Error('One personal support alias exceeds bounded preparation.');
      if (
        pending.aliases.length === maximumTemporalPreparationRows ||
        bytes + size + 3 > 4 * 1024 * 1024
      ) {
        requests.push(pending);
        pending = request();
        bytes = overhead;
      }
      bytes += size + Number(pending.aliases.length > 0);
      pending.aliases.push(alias);
    }
    if (pending.aliases.length) requests.push(pending);
  }
  const retained = new Map<string, Set<string>>();
  // The metadata owner packs actual expanded SQL requests inside one captured
  // transaction. Separate callback invocations would reopen the durable cut.
  const results = requests.length ? await read(requests) : [];
  for (const [index, request] of requests.entries()) {
    let aliases = retained.get(request.actorId);
    if (!aliases) retained.set(request.actorId, (aliases = new Set()));
    for (const id of results[index]!.aliases) aliases.add(id);
  }
  return groups.map(({ actorId, candidates }) => ({
    actorId,
    candidates: candidates.filter(
      (candidate) => !candidate.aliases.some((id) => retained.get(actorId)?.has(id)),
    ),
  }));
}

/** Proof is owned by an actual retained name/profile/note/place or mechanical
 * grant. Dropping a profile cannot leave its old sparse proof charged forever. */
export async function releaseUnusedTemporalSupports(
  state: SavedWorld,
  actorIds: readonly string[],
  metadata: RetentionMetadataView,
  db: SqlDatabase,
  removedAccounts: readonly string[] = [],
): Promise<{ state: SavedWorld; ids: string[] }> {
  const groups = unusedSupportCandidates(state.world, actorIds);
  if (!groups.length) return { state, ids: [] };
  const removed = new Map(
    ['mind_awareness', 'mind_memories', 'mind_summaries'].map((table) => [table, removedAccounts]),
  );
  const unreferenced = await unreferencedSupports(groups, (requests) =>
    metadata.excluding(removed).survivingMembershipBatch(db, state.world.id, requests, state.world),
  );
  const releases = unreferenced.flatMap((group) =>
    group.candidates.map((candidate) => ({
      actorId: group.actorId,
      id: candidate.capsule.receipt.id,
    })),
  );
  if (!releases.length) return { state, ids: [] };
  const world = updateWorld(
    state.world,
    (draft) => {
      for (const release of releases) releaseTemporalSupport(draft, release.actorId, release.id);
    },
    { retainNativeValues: true },
  );
  return {
    state: { ...state, world },
    ids: releases.map((release) =>
      JSON.stringify([
        'world',
        'experience',
        'temporal',
        'actors',
        release.actorId,
        'supports',
        release.id,
      ]),
    ),
  };
}

/** Only an actual retirement batch pays for these exact reverse-membership reads.
 * Remaining cold accounts and sparse exact proofs can independently retain a person. */
export async function cleanupRetiredIndividuals(
  before: SavedWorld,
  after: SavedWorld,
  rows: ReadonlyMap<string, readonly string[]>,
  metadata: RetentionMetadataView,
  db: SqlDatabase,
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
    const ids = new Set(rows.get(table) ?? []);
    if (!ids.size) continue;
    for (const id of ids) {
      const row = metadata.get(table, id);
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
        if (!ids.has(key)) continue;
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
  const retiredChunks = new Set(rows.get('mind_temporal_pages') ?? []);
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
  if (retiredChunks.size) {
    for (const pageId of retiredChunks) {
      const row = metadata.get('mind_temporal_pages', pageId);
      if (!row) continue;
      const value = actor(row.actorId);
      for (const id of row.columns['source_ids'] as string[]) value.sources.add(id);
      for (const id of row.columns['individual_ids'] as string[]) value.individuals.add(id);
    }
    const temporal = before.world.experience?.temporal;
    for (const [actorId, history] of Object.entries(temporal?.actors ?? {}))
      for (const chunk of history.pages) {
        if (
          !retiredChunks.has(
            JSON.stringify([
              'world',
              'experience',
              'temporal',
              'actors',
              actorId,
              'pages',
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
  const candidates: Array<{
    actorId: string;
    aliases: string[];
    ids: string[];
    retained: Set<string>;
    individuals: Set<string>;
  }> = [];
  for (const [actorId, candidate] of affected) {
    const retained = new Set<string>(),
      individuals = new Set<string>();
    const history = world.experience?.temporal?.actors[actorId];
    for (const capsule of Object.values(history?.supports ?? {})) {
      for (const id of temporalSupportAliases(capsule, world)) retained.add(id);
      if (capsule.receipt.subjectIdentity?.kind === 'individual')
        individuals.add(capsule.receipt.subjectIdentity.individualId);
      for (const value of capsule.values)
        if (value.kind === 'association' && value.subject.kind === 'individual')
          individuals.add(value.subject.individualId);
    }
    // Recent warm and cold membership share the exact age/member frontier in
    // survivingMembershipBatch; a physical block's coarse arrays are not proof.
    const aliases = [...candidate.sources],
      ids = [...candidate.individuals];
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
    candidates.push({ actorId, aliases, ids, retained, individuals });
  }
  const surviving = await metadata.excluding(rows).survivingMembershipBatch(
    db,
    world.id,
    candidates.map((candidate) => ({
      actorId: candidate.actorId,
      aliases: candidate.aliases.filter((id) => !candidate.retained.has(id)),
      individualIds: candidate.ids.filter((id) => !candidate.individuals.has(id)),
      includeRecent: true,
    })),
    after.world,
  );
  for (const [index, candidate] of candidates.entries()) {
    const { actorId, aliases, retained, individuals } = candidate;
    for (const id of surviving[index]!.aliases) retained.add(id);
    for (const id of surviving[index]!.individuals) individuals.add(id);
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
