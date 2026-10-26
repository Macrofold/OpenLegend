import { z } from 'zod';
import {
  captureEvidenceCut,
  evidenceCutEligible,
  currentDetailedAttention,
  captureAttentionPresentation,
  currentObservedFacets,
  currentReceivedGeometry,
  receivedScene,
  receivedNear,
  receivedSeparation,
  receivedBoundarySeparation,
  selectedAttentionPolicy,
  type WorldState,
  type TemporalHistorySelection,
  type TemporalValue,
  type TemporalReceiptLocator,
} from '@open-legend/domain';
import {
  entityHandle,
  evidenceSourceHandle,
  permittedSourceHandle,
  projectEntityMarkers,
} from './entity-references.js';
import {
  currentFacetForModel,
  facetValueForModel,
  observationForModel,
} from './experience-context.js';
import type { BoundsQueryCursor } from '@open-legend/spatial';

const reference = z.string().min(1).max(120);
export const situationQuerySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('near'),
      anchor: reference,
      radius: z.number().finite().min(0).max(100),
      cursor: reference.nullable(),
    })
    .strict(),
  z.object({ kind: z.literal('separation'), first: reference, second: reference }).strict(),
  z
    .object({ kind: z.literal('boundaries'), anchor: reference, cursor: reference.nullable() })
    .strict(),
  z
    .object({
      kind: z.literal('history'),
      subject: reference.nullable(),
      from: z.number().finite().min(0),
      through: z.number().finite().min(0),
      cursor: reference.nullable(),
    })
    .strict(),
  z.object({ kind: z.literal('expand'), region: reference, cursor: reference.nullable() }).strict(),
]);
export type SituationQuery = z.infer<typeof situationQuerySchema>;

export function temporalHistoryForModel(
  world: WorldState,
  actorId: string,
  selection: TemporalHistorySelection,
) {
  return {
    coverage: selection.incomplete ? 'partial' : 'selected-retained',
    entries: selection.entries.map(({ receipt, values }) => ({
      reference: permittedSourceHandle(world, actorId, [
        'receipt',
        receipt.physicalLife,
        receipt.epoch,
        receipt.ordinal,
      ]),
      subject: permittedSourceHandle(world, actorId, ['received-subject', receipt.subject]),
      acquiredAt: receipt.at,
      change: receipt.change,
      facts: values.map((value, index) => {
        const fact = receipt.facets[index]!;
        return {
          role: fact.role,
          asOf: fact.asOf,
          measuredFrom: fact.measuredFrom,
          measuredThrough: fact.measuredThrough,
          acquiredAt: fact.acquiredAt,
          value: temporalValueForModel(world, actorId, value, [receipt.epoch, receipt.ordinal]),
        };
      }),
    })),
  };
}
function temporalValueForModel(
  world: WorldState,
  actorId: string,
  value: TemporalValue,
  scope: unknown,
): unknown {
  if (value.kind === 'personal-account')
    return {
      kind: value.kind,
      text: projectEntityMarkers(value.text, world, actorId),
      eventType: value.eventType,
    };
  if (value.kind === 'received-motion')
    return {
      kind: value.kind,
      earlier: {
        location: value.earlier.location,
        frame: value.earlier.frame,
        measuredFrom: value.earlier.measuredFrom,
        measuredThrough: value.earlier.measuredThrough,
        acquiredAt: value.earlier.acquiredAt,
      },
      later: {
        location: value.later.location,
        frame: value.later.frame,
        measuredFrom: value.later.measuredFrom,
        measuredThrough: value.later.measuredThrough,
        acquiredAt: value.later.acquiredAt,
      },
      correspondence: value.correspondence,
    };
  return facetValueForModel(world, actorId, value, scope);
}

/** Captured permitted inputs, with private routing maps kept outside model/player text. */
export function captureSituation(
  world: WorldState,
  actorId: string,
  jobId: string,
  history: TemporalHistorySelection,
) {
  const policy = selectedAttentionPolicy(world).scene,
    scene = receivedScene(world, actorId);
  const geometry = currentReceivedGeometry(world, actorId);
  const cut = captureEvidenceCut(world, actorId, geometry.observations),
    entries = currentDetailedAttention(world, actorId);
  const references = new Map(
    [...scene.bodies.keys()].map((id) => [entityHandle(world, actorId, id), id]),
  );
  let cover = scene.index.cover(
    policy.maxRows - policy.staticRows - policy.discoveryRows,
    policy.nodeVisits,
  );
  const regions = new Map(
    cover.rows.map((row) => [
      permittedSourceHandle(world, actorId, ['region', jobId, row.key]),
      row.key,
    ]),
  );
  const frames: unknown[] = [];
  const frameIds = new Map<string, number>();
  const frameReference = (frame: unknown) => {
    const key = JSON.stringify(frame);
    let id = frameIds.get(key);
    if (id === undefined) {
      id = frames.length;
      frameIds.set(key, id);
      frames.push(frame);
    }
    return id;
  };
  // Only frames referenced by emitted facts occupy the packet. Later expansion
  // appends frames to this table; omitted rows cannot consume its byte allowance.
  const compactFrames = (value: unknown, start: number) => {
    const used = new Set<number>();
    const visit = (node: unknown, rewrite?: Map<number, number>): void => {
      if (Array.isArray(node)) {
        node.forEach((child) => visit(child, rewrite));
        return;
      }
      if (!node || typeof node !== 'object') return;
      for (const [key, child] of Object.entries(node)) {
        if (key === 'frame' && typeof child === 'number' && child >= start) {
          if (rewrite) (node as Record<string, unknown>)[key] = rewrite.get(child)!;
          else used.add(child);
        } else visit(child, rewrite);
      }
    };
    visit(value);
    const kept = [...used].sort((a, b) => a - b),
      mapping = new Map(kept.map((id, index) => [id, start + index]));
    const values = kept.map((id) => frames[id]);
    visit(value, mapping);
    frames.splice(start, frames.length - start, ...values);
    frameIds.clear();
    frames.forEach((frame, id) => frameIds.set(JSON.stringify(frame), id));
  };
  const detailIds = new Set(entries.map((entry) => entry.sourceId));
  const bodyFacts = (id: string) => {
    const facets = currentObservedFacets(world, actorId, id);
    const rendered = facets
      .filter((facet) => facet.value.kind !== 'perceived-feature')
      .map((facet) => {
        // Current motion carries exact received endpoints, not two recursively repeated accounts.
        const value =
          facet.value.kind === 'observed-motion'
            ? {
                kind: facet.value.kind,
                correspondence: facet.value.correspondence,
                earlier: {
                  location: facet.value.earlier.value.location,
                  frame: frameReference(facet.value.earlier.value.frame),
                  measuredFrom: facet.value.earlier.valueMeasuredFrom,
                  measuredThrough: facet.value.earlier.valueMeasuredThrough,
                },
                later: {
                  location: facet.value.later.value.location,
                  frame: frameReference(facet.value.later.value.frame),
                  measuredFrom: facet.value.later.valueMeasuredFrom,
                  measuredThrough: facet.value.later.valueMeasuredThrough,
                },
              }
            : facet.value.kind === 'location'
              ? { ...facet.value, frame: frameReference(facet.value.frame) }
              : facetValueForModel(world, actorId, facet.value, facet.original.id);
        return {
          reference: permittedSourceHandle(world, actorId, [
            'current-fact',
            facet.original.id,
            facet.originalOrdinal,
          ]),
          value,
          measuredFrom: facet.valueMeasuredFrom,
          measuredThrough: facet.valueMeasuredThrough,
          acquiredAt: facet.valueAcquiredAt,
          confirmedThrough: facet.confirmedThrough,
          modality: facet.modality,
        };
      });
    const defaults = rendered[0]
      ? {
          measuredFrom: rendered[0].measuredFrom,
          measuredThrough: rendered[0].measuredThrough,
          acquiredAt: rendered[0].acquiredAt,
          confirmedThrough: rendered[0].confirmedThrough,
          modality: rendered[0].modality,
        }
      : {};
    return {
      defaults,
      facts: rendered.map((fact) =>
        Object.fromEntries(
          Object.entries(fact).filter(
            ([key, value]) =>
              !(key in defaults) || value !== defaults[key as keyof typeof defaults],
          ),
        ),
      ),
    };
  };
  const detailed = entries
    .filter((entry) => scene.bodies.has(entry.sourceId))
    .map((entry) => ({
      reference: entityHandle(world, actorId, entry.sourceId),
      subject: permittedSourceHandle(world, actorId, [
        'received-subject',
        entry.exposure.episodeId,
      ]),
      facts: bodyFacts(entry.sourceId),
    }));
  const waiting = Object.entries(world.perceptionEvidence?.[actorId]?.attention?.candidates ?? {})
    .filter(([, candidate]) => candidate.presentedDescription !== candidate.descriptionRevision)
    .sort((a, b) => a[1].order - b[1].order);
  const discovery: Array<{ reference: string; facts: unknown[] }> = [];
  let discoveryBytes = 0;
  const presentedKeys = entries.map((entry) => entry.key);
  for (const [key, candidate] of waiting) {
    if (detailIds.has(candidate.sourceId)) continue;
    if (discovery.length >= policy.discoveryRows) break;
    const facts = currentObservedFacets(world, actorId, candidate.sourceId)
      .filter((facet) => ['body', 'association', 'carried'].includes(facet.value.kind))
      .map((facet) => currentFacetForModel(world, actorId, facet));
    const row = { reference: entityHandle(world, actorId, candidate.sourceId), facts };
    const bytes = Buffer.byteLength(JSON.stringify(row));
    if (discoveryBytes + bytes > policy.discoveryBytes) continue;
    discoveryBytes += bytes;
    discovery.push(row);
    presentedKeys.push(key);
  }
  const staticRows: unknown[] = [];
  const observationReferences: Record<
    string,
    import('@open-legend/domain').ObservationContribution
  > = {};
  let staticBytes = 0;
  // Boundaries go first; their support references remain evidence, not disclosed world IDs.
  const staticObservations = [...geometry.observations].sort(
    (a, b) =>
      Number(b.facets.some((f) => f.value.kind === 'physical-boundary')) -
      Number(a.facets.some((f) => f.value.kind === 'physical-boundary')),
  );
  for (const observation of staticObservations) {
    if (staticRows.length >= policy.staticRows) break;
    const row = observationForModel(world, actorId, observation),
      size = Buffer.byteLength(JSON.stringify(row));
    if (staticBytes + size > policy.staticBytes) continue;
    staticRows.push(row);
    staticBytes += size;
    observationReferences[row.source] = observation;
  }
  const allAttentionReferences = Object.fromEntries(
    Object.entries(world.perceptionEvidence?.[actorId]?.attention?.candidates ?? {})
      .filter(([, candidate]) => references.has(entityHandle(world, actorId, candidate.sourceId)))
      .map(([key, candidate]) => [entityHandle(world, actorId, candidate.sourceId), key]),
  );
  const attentionReferences = Object.fromEntries(
    [...detailed, ...discovery]
      .map((row) => [row.reference, allAttentionReferences[row.reference]!])
      .filter(([, key]) => key !== undefined),
  );
  const retentionReferences: Record<string, TemporalReceiptLocator> = {};
  const receiptDetails: Record<string, TemporalHistorySelection['entries'][number]> = {};
  const bindHistory = (selection: TemporalHistorySelection) => {
    for (const entry of selection.entries) {
      const receipt = entry.receipt,
        handle = permittedSourceHandle(world, actorId, [
          'receipt',
          receipt.physicalLife,
          receipt.epoch,
          receipt.ordinal,
        ]);
      retentionReferences[handle] = {
        actorId,
        physicalLife: receipt.physicalLife,
        epoch: receipt.epoch,
        ordinal: receipt.ordinal,
      };
      receiptDetails[handle] = entry;
    }
  };
  bindHistory(history);
  const boundaries = geometry.observations.flatMap((observation) =>
    observation.facets.flatMap((facet) =>
      facet.value.kind === 'physical-boundary'
        ? [{ observation, boundary: facet.value.boundary }]
        : [],
    ),
  );
  let initialVisits = 0;
  const relations = entries.flatMap((entry, index) => {
    const anchor = scene.bodies.get(entry.sourceId);
    if (!anchor) return [];
    const allowance = Math.min(
      policy.perAnchorVisits,
      Math.floor((policy.initialVisits - initialVisits) / (entries.length - index)),
    );
    const nearby = receivedNear(
      scene,
      anchor,
      selectedAttentionPolicy(world).relation.body.clear,
      Math.floor(allowance / 2),
    );
    initialVisits += nearby.visited;
    const bodies = nearby.values
      .map((body) => ({
        reference: entityHandle(world, actorId, body.sourceId),
        ...receivedSeparation(anchor, body),
      }))
      .sort((a, b) => (a.lower ?? Infinity) - (b.lower ?? Infinity))
      .slice(0, 2);
    const remaining = Math.max(0, allowance - nearby.visited),
      candidates = boundaries.slice(0, remaining);
    initialVisits += candidates.length;
    const edges = candidates
      .map(({ observation, boundary }) => ({
        reference: evidenceSourceHandle(world, actorId, {
          family: 'native-exposure',
          observer: observation.observer,
          id: observation.id,
          revision: observation.revision,
        }),
        ...receivedBoundarySeparation(anchor, boundary, {
          from: observation.acquiredAt,
          through: geometry.supportedThrough,
        }),
      }))
      .sort((a, b) => (a.lower ?? Infinity) - (b.lower ?? Infinity))
      .slice(0, 2);
    return [
      {
        anchor: entityHandle(world, actorId, entry.sourceId),
        bodies,
        boundaries: edges,
        coverage:
          nearby.status === 'complete' &&
          candidates.length === boundaries.length &&
          geometry.complete
            ? 'complete-received'
            : 'partial',
      },
    ];
  });
  const packet = {
    measuredAt: world.simTime,
    frames,
    frameEncoding:
      'Location/motion frame is an index into frames; coordinates remain received world positions.',
    units: { space: 'metres', time: 'simulation-seconds', frame: 'received-world-Y-up' },
    broad: cover.rows.map((row) => ({
      reference: permittedSourceHandle(world, actorId, ['region', jobId, row.key]),
      count: row.count,
      bounds: row.bounds,
      detail: 'unexpanded',
    })),
    nonlocalized: { count: scene.nonlocalized, detail: 'not-spatially-localized' },
    static: {
      facts: staticRows,
      coverage:
        geometry.complete && staticRows.length === geometry.observations.length
          ? 'complete-received'
          : 'partial',
    },
    detailed,
    relations,
    discovery,
    recent: temporalHistoryForModel(world, actorId, history),
    coverage: {
      bodies: scene.bodies.size,
      broadRows: cover.rows.length,
      hierarchyVisits: cover.visited,
      relationVisits: initialVisits,
      unconsideredDescriptions: Math.max(0, waiting.length - presentedKeys.length),
      omittedOptionalFacets: 0,
      omittedDetailedSubjects: 0,
      relationRows: relations.length,
      discoveryRows: discovery.length,
    },
  };
  const currentBytes = () => {
    compactFrames(packet, 0);
    return Buffer.byteLength(JSON.stringify({ ...packet, recent: undefined }));
  };
  // Presence stays complete while optional expansion is narrowed. A larger authored
  // description cannot make an ordinary crowded scene impossible to consider.
  for (
    let rows = Math.floor(packet.broad.length / 2);
    currentBytes() > policy.maxBytes && rows >= 1;
    rows = Math.floor(rows / 2)
  ) {
    cover = scene.index.cover(rows, policy.nodeVisits);
    packet.broad = cover.rows.map((row) => ({
      reference: permittedSourceHandle(world, actorId, ['region', jobId, row.key]),
      count: row.count,
      bounds: row.bounds,
      detail: 'unexpanded',
    }));
  }
  while (currentBytes() > policy.maxBytes && packet.relations.length) packet.relations.pop();
  let omittedDetailedSubjects = 0;
  let omittedFacets = 0;
  for (const row of [...packet.detailed].reverse()) {
    for (let i = row.facts.facts.length - 1; currentBytes() > policy.maxBytes && i >= 0; i--) {
      const fact = row.facts.facts[i]!;
      const value = fact['value'] as { kind: string };
      if (['body', 'location', 'association'].includes(value.kind)) continue;
      row.facts.facts.splice(i, 1);
      omittedFacets++;
      const key = attentionReferences[row.reference],
        at = key ? presentedKeys.indexOf(key) : -1;
      if (at >= 0) presentedKeys.splice(at, 1);
    }
  }
  while (currentBytes() > policy.maxBytes && packet.detailed.length) {
    // Keep the discovery lane; unfamiliar quiet content must not lose its reserved turn.
    let index = packet.detailed.length - 1;
    while (
      index >= 0 &&
      entries.find((entry) => entry.sourceId === references.get(packet.detailed[index]!.reference))
        ?.basis === 'discovery'
    )
      index--;
    const [removed] = packet.detailed.splice(index < 0 ? packet.detailed.length - 1 : index, 1);
    const key = removed && attentionReferences[removed.reference];
    if (removed) delete attentionReferences[removed.reference];
    const at = key ? presentedKeys.indexOf(key) : -1;
    if (at >= 0) presentedKeys.splice(at, 1);
    omittedDetailedSubjects++;
  }
  Object.assign(packet.coverage, {
    omittedOptionalFacets: omittedFacets,
    omittedDetailedSubjects,
    relationRows: packet.relations.length,
    discoveryRows: packet.discovery.length,
  });
  if (currentBytes() > policy.maxBytes)
    throw new Error('Reserved received context exceeds the scene allowance.');
  for (const relation of packet.relations)
    for (const edge of relation.boundaries) {
      const observation = boundaries.find(
        ({ observation }) =>
          evidenceSourceHandle(world, actorId, {
            family: 'native-exposure',
            observer: observation.observer,
            id: observation.id,
            revision: observation.revision,
          }) === edge.reference,
      )?.observation;
      if (observation) observationReferences[edge.reference] = observation;
    }
  regions.clear();
  for (const row of cover.rows)
    regions.set(permittedSourceHandle(world, actorId, ['region', jobId, row.key]), row.key);
  packet.coverage.broadRows = cover.rows.length;
  packet.coverage.hierarchyVisits = cover.visited;
  const presented = captureAttentionPresentation(world, actorId, presentedKeys);
  const expansionCursors = new Map<
    string,
    {
      signature: string;
      offset?: number;
      before?: { epoch: string; ordinal: number; at: number; order: number };
    }
  >();
  const cursors = new Map<
    string,
    { signature: string; cursor?: BoundsQueryCursor; pending?: string[] }
  >();
  let cursorSequence = 0;
  const queryBodies = (
    input: Extract<SituationQuery, { kind: 'near' | 'separation' | 'expand' }>,
    visits: number,
  ) => {
    if (input.kind === 'separation') {
      const a = references.get(input.first),
        b = references.get(input.second);
      return a && b
        ? { result: receivedSeparation(scene.bodies.get(a)!, scene.bodies.get(b)!), visited: 0 }
        : { result: { status: 'unavailable' }, visited: 0 };
    }
    const id = input.kind === 'near' ? references.get(input.anchor) : undefined;
    const anchor = id ? scene.bodies.get(id) : undefined;
    const region = input.kind === 'expand' ? regions.get(input.region) : undefined;
    const signature = JSON.stringify({ ...input, cursor: undefined });
    const continuation = input.cursor ? cursors.get(input.cursor) : undefined;
    if (
      (input.cursor && continuation?.signature !== signature) ||
      (input.kind === 'near' ? !anchor : region === undefined)
    )
      return { result: { status: 'unavailable' }, visited: 0 };
    const found = continuation?.pending?.length
      ? {
          values: continuation.pending.map((id) => scene.bodies.get(id)!),
          visited: 0,
          status: continuation.cursor ? ('partial' as const) : ('complete' as const),
          cursor: continuation.cursor,
        }
      : input.kind === 'near'
        ? receivedNear(scene, anchor!, input.radius, visits, continuation?.cursor)
        : scene.index.region(region!, visits, continuation?.cursor);
    const result = {
      status: found.status,
      bodies: found.values.map((body) => ({
        reference: entityHandle(world, actorId, body.sourceId),
        ...(anchor ? { separation: receivedSeparation(anchor, body) } : {}),
        facts: bodyFacts(body.sourceId),
      })),
    } as {
      status: 'complete' | 'partial';
      cursor?: string;
      bodies: Array<{ reference: string; facts: ReturnType<typeof bodyFacts> }>;
    };
    // A byte-shortened page keeps its undisclosed IDs before the tree cursor.
    // Reusing the tree cursor alone would silently skip those received bodies.
    const token = permittedSourceHandle(world, actorId, ['query-cursor', jobId, cursorSequence++]);
    const paginate = () => {
      const pending = found.values.slice(result.bodies.length).map((body) => body.sourceId);
      if (pending.length || found.cursor) {
        cursors.set(token, {
          signature,
          ...(found.cursor ? { cursor: found.cursor } : {}),
          ...(pending.length ? { pending } : {}),
        });
        result.cursor = token;
        result.status = 'partial';
      } else delete result.cursor;
    };
    paginate();
    return { result, visited: found.visited, paginate };
  };
  return {
    world,
    actorId,
    jobId,
    packet,
    history,
    cut,
    frames,
    compactFrames,
    privacyRevision: world.experience?.privacyRevisions?.[actorId] ?? 0,
    scene,
    geometry,
    policy,
    references,
    regions,
    presented,
    attentionReferences,
    retentionReferences,
    receiptDetails,
    observationReferences,
    bindHistory,
    bodyFacts,
    queryBodies,
    expansionCursors,
    allAttentionReferences,
    valid: (current: WorldState) => evidenceCutEligible(current, cut),
  };
}
export type CapturedSituation = ReturnType<typeof captureSituation>;

/** One finite read-only query batch over this decision's captured permitted inputs.
 * This grants neither additional sensing nor a repeating interpretation loop. */
export async function expandSituation(
  captured: CapturedSituation,
  queries: readonly SituationQuery[],
  readHistory: (
    query: import('./temporal-storage.js').TemporalHistoryQuery,
  ) => Promise<TemporalHistorySelection>,
) {
  const { policy, world, actorId } = captured;
  if (queries.length > policy.maximumQueries) throw new Error('Too many situation queries.');
  const results: unknown[] = [],
    expandedIds = new Set<string>();
  const firstFrame = captured.frames.length;
  const originalRetention = new Set(Object.keys(captured.retentionReferences)),
    originalObservations = new Set(Object.keys(captured.observationReferences));
  let visits = policy.queryVisits;
  const wire = () => ({
    results,
    frames: { from: firstFrame, values: captured.frames.slice(firstFrame) },
    visited: policy.queryVisits - visits,
    coverage: results.length === queries.length ? 'requested-batch' : 'partial',
  });
  const encodedBytes = () => Buffer.byteLength(JSON.stringify(wire()));
  const subjects = new Map<string, string>();
  for (const [handle, id] of captured.references) {
    const body = captured.scene.bodies.get(id)!;
    subjects.set(handle, body.exposure);
    subjects.set(
      permittedSourceHandle(world, actorId, ['received-subject', body.exposure]),
      body.exposure,
    );
  }
  for (const { receipt } of captured.history.entries)
    subjects.set(
      permittedSourceHandle(world, actorId, ['received-subject', receipt.subject]),
      receipt.subject,
    );
  for (const query of queries) {
    const frameStart = captured.frames.length;
    let result: unknown;
    let paginate: (() => void) | undefined;
    let keepNewest = false;
    const signature = JSON.stringify({ ...query, cursor: undefined });
    const continuation =
      'cursor' in query && query.cursor ? captured.expansionCursors.get(query.cursor) : undefined;
    const nextCursor = (value: {
      offset?: number;
      before?: { epoch: string; ordinal: number; at: number; order: number };
    }) => {
      const token = permittedSourceHandle(world, actorId, [
        'expansion',
        captured.jobId,
        captured.expansionCursors.size,
      ]);
      captured.expansionCursors.set(token, { signature, ...value });
      return token;
    };
    if (query.kind === 'history') {
      const subject = query.subject ? subjects.get(query.subject) : undefined;
      if (
        (query.cursor && continuation?.signature !== signature) ||
        (query.subject && !subject) ||
        query.from > query.through
      )
        result = { status: 'unavailable' };
      else {
        const history = await readHistory({
          ...(subject ? { subject } : {}),
          from: query.from,
          through: Math.min(world.simTime, query.through),
          bytes: Math.max(0, policy.expansionBytes - encodedBytes()),
          limit: policy.expansionReceipts,
          ...(continuation?.before ? { before: continuation.before } : {}),
        });
        captured.bindHistory(history);
        // Historical receipts stay historical; expansion never invents a current entity lease.
        const page = temporalHistoryForModel(world, actorId, history) as ReturnType<
          typeof temporalHistoryForModel
        > & { cursor?: string; status?: string };
        result = page;
        keepNewest = true;
        paginate = () => {
          const oldest = history.entries[history.entries.length - page.entries.length]?.receipt;
          if (oldest && (history.hasMore || page.entries.length < history.entries.length))
            page.cursor = nextCursor({
              before: {
                epoch: oldest.epoch,
                ordinal: oldest.ordinal,
                at: oldest.at,
                order: oldest.order,
              },
            });
          else delete page.cursor;
        };
        paginate();
      }
    } else if (query.kind === 'boundaries') {
      const id = captured.references.get(query.anchor),
        body = id ? captured.scene.bodies.get(id) : undefined;
      if (!body || (query.cursor && continuation?.signature !== signature))
        result = { status: 'unavailable' };
      else {
        const facts: unknown[] = [];
        let seen = 0;
        const boundaries = captured.geometry.observations.filter((observation) =>
          observation.facets.some((f) => f.value.kind === 'physical-boundary'),
        );
        const start = continuation?.offset ?? 0;
        for (const observation of boundaries.slice(start)) {
          if (seen >= visits) break;
          seen++;
          const facet = observation.facets.find(
            (facet) => facet.value.kind === 'physical-boundary',
          );
          if (!facet || facet.value.kind !== 'physical-boundary') continue;
          const boundary = facet.value.boundary;
          captured.observationReferences[
            evidenceSourceHandle(world, actorId, {
              family: 'native-exposure',
              observer: observation.observer,
              id: observation.id,
              revision: observation.revision,
            })
          ] = observation;
          facts.push({
            observation: observationForModel(world, actorId, observation),
            ...receivedBoundarySeparation(body, boundary, {
              from: observation.acquiredAt,
              through: captured.geometry.supportedThrough,
            }),
          });
        }
        visits -= seen;
        const page: { status: string; facts: unknown[]; cursor?: string } = {
          status: 'partial',
          facts,
        };
        result = page;
        paginate = () => {
          if (start + facts.length < boundaries.length)
            page.cursor = nextCursor({ offset: start + facts.length });
          else delete page.cursor;
          page.status = captured.geometry.complete && !page.cursor ? 'complete' : 'partial';
        };
        paginate();
      }
    } else {
      const found = captured.queryBodies(query, visits);
      visits -= found.visited;
      result = found.result;
      paginate = 'paginate' in found ? found.paginate : undefined;
    }
    const row = { query, result };
    results.push(row);
    captured.compactFrames(result, frameStart);
    if (encodedBytes() > policy.expansionBytes && result && typeof result === 'object') {
      const record = result as Record<string, unknown>;
      const rows = record['bodies'] ?? record['facts'] ?? record['entries'];
      if (Array.isArray(rows)) {
        record['status'] = 'partial';
        record['coverage'] = 'partial';
        while (rows.length && encodedBytes() > policy.expansionBytes) {
          if (keepNewest) rows.shift();
          else rows.pop();
          paginate?.();
          captured.compactFrames(result, frameStart);
        }
      }
    }
    if (encodedBytes() > policy.expansionBytes) {
      results.pop();
      captured.compactFrames(undefined, frameStart);
      break;
    }
    const bodyRows = (result as { bodies?: Array<{ reference: string }> })?.bodies ?? [];
    for (const row of bodyRows) {
      const id = captured.references.get(row.reference);
      if (id) expandedIds.add(id);
      const key = captured.allAttentionReferences[row.reference];
      if (key) captured.attentionReferences[row.reference] = key;
    }
  }
  const disclosed = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === 'string') disclosed.add(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(results);
  for (const key of Object.keys(captured.retentionReferences))
    if (!originalRetention.has(key) && !disclosed.has(key)) {
      delete captured.retentionReferences[key];
      delete captured.receiptDetails[key];
    }
  for (const key of Object.keys(captured.observationReferences))
    if (!originalObservations.has(key) && !disclosed.has(key))
      delete captured.observationReferences[key];
  return { ...wire(), expandedIds };
}
