import { z } from 'zod';
import {
  captureEvidenceCut,
  captureTemporalReceiptPrefix,
  temporalReceiptWithinPrefix,
  evidenceCutEligible,
  currentDetailedAttention,
  captureAttentionPresentation,
  currentObservedFacets,
  currentReceivedGeometry,
  receivedScene,
  receivedNear,
  receivedSeparation,
  receivedBoundarySeparation,
  historicalSpatialMeasurements,
  selectedAttentionPolicy,
  type WorldState,
  type TemporalHistorySelection,
  type TemporalValue,
  type TemporalReceiptLocator,
  type SituationProposalBinding,
  type CapturedCurrentFacet,
} from '@open-legend/domain';
import {
  entityHandle,
  evidenceSourceHandle,
  permittedSourceHandle,
  projectEntityMarkers,
  historicalAccountText,
} from './entity-references.js';
import { facetValueForModel, observationForModel } from './experience-context.js';
import type { TemporalHistoryPage } from './temporal-storage.js';

const reference = z.string().min(1).max(120);
// Each branch already has an exclusive literal kind. The ordinary union emits
// provider-supported anyOf while retaining the same strict native validation.
export const situationQuerySchema = z.union([
  z
    .object({
      kind: z.literal('near'),
      anchor: reference,
      radius: z.number().finite().min(0).max(100),
    })
    .strict(),
  z.object({ kind: z.literal('separation'), first: reference, second: reference }).strict(),
  z
    .object({
      kind: z.literal('historical-spatial'),
      anchor: reference,
      other: reference.nullable(),
      from: z.number().finite().nonnegative(),
      through: z.number().finite().nonnegative(),
      radius: z.number().finite().min(0).max(100),
    })
    .strict(),
  z.object({ kind: z.literal('boundaries'), anchor: reference }).strict(),
  z
    .object({
      kind: z.literal('history'),
      subject: reference.nullable(),
      from: z.number().finite().min(0),
      through: z.number().finite().min(0),
    })
    .strict(),
  z.object({ kind: z.literal('expand'), region: reference }).strict(),
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
      ...(receipt.contextSubjects?.length
        ? {
            contextFor: receipt.contextSubjects.map((subject) =>
              permittedSourceHandle(world, actorId, ['received-subject', subject]),
            ),
          }
        : {}),
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
      text: historicalAccountText(value.text),
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
  retainedHistory: TemporalHistorySelection,
) {
  const policy = selectedAttentionPolicy(world).scene,
    scene = receivedScene(world, actorId);
  const geometry = currentReceivedGeometry(world, actorId);
  const cut = captureEvidenceCut(world, actorId, geometry.observations),
    entries = currentDetailedAttention(world, actorId);
  const receiptPrefix = captureTemporalReceiptPrefix(world, actorId);
  const historyEntries = retainedHistory.entries.filter(({ receipt }) =>
    temporalReceiptWithinPrefix(receipt, receiptPrefix),
  );
  const history = {
    ...retainedHistory,
    entries: historyEntries,
    incomplete:
      retainedHistory.incomplete || historyEntries.length !== retainedHistory.entries.length,
  };
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
  const frameIndexOwners = new WeakSet<object>();
  const allCurrentReferences: Record<string, CapturedCurrentFacet> = {};
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
  const indexedFrame = (value: object, frame: unknown) => {
    const result: Record<string, unknown> = { ...value, frame: frameReference(frame) };
    frameIndexOwners.add(result);
    return result;
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
        if (
          key === 'frame' &&
          frameIndexOwners.has(node) &&
          typeof child === 'number' &&
          child >= start
        ) {
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
  const bodyFacts = (id: string, kinds?: readonly string[]) => {
    const facets = currentObservedFacets(world, actorId, id);
    const rendered = facets
      .filter(
        (facet) =>
          facet.value.kind !== 'perceived-feature' && (!kinds || kinds.includes(facet.value.kind)),
      )
      .map((facet) => {
        const reference = permittedSourceHandle(world, actorId, [
          'current-fact',
          facet.original.id,
          facet.originalOrdinal,
        ]);
        allCurrentReferences[reference] = facet;
        // Current motion carries exact received endpoints, not two recursively repeated accounts.
        const value =
          facet.value.kind === 'observed-motion'
            ? {
                kind: facet.value.kind,
                correspondence: facet.value.correspondence,
                earlier: indexedFrame(
                  {
                    location: facet.value.earlier.value.location,
                    measuredFrom: facet.value.earlier.valueMeasuredFrom,
                    measuredThrough: facet.value.earlier.valueMeasuredThrough,
                  },
                  facet.value.earlier.value.frame,
                ),
                later: indexedFrame(
                  {
                    location: facet.value.later.value.location,
                    measuredFrom: facet.value.later.valueMeasuredFrom,
                    measuredThrough: facet.value.later.valueMeasuredThrough,
                  },
                  facet.value.later.value.frame,
                ),
              }
            : facet.value.kind === 'location'
              ? indexedFrame(
                  { kind: facet.value.kind, location: facet.value.location },
                  facet.value.frame,
                )
              : facetValueForModel(world, actorId, facet.value, facet.original.id);
        return {
          reference,
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
  const discovery: Array<{ reference: string; facts: ReturnType<typeof bodyFacts> }> = [];
  let discoveryBytes = 0;
  const presentedKeys = entries.map((entry) => entry.key);
  for (const [key, candidate] of waiting) {
    if (detailIds.has(candidate.sourceId)) continue;
    if (discovery.length >= policy.discoveryRows) break;
    const facts = bodyFacts(candidate.sourceId, ['body', 'association', 'carried']);
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
      'Detailed body location/motion frames are indices into frames; other observations retain their captured frame objects. Coordinates remain received world positions.',
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
  const currentReferences = Object.fromEntries(
    [...packet.detailed, ...packet.discovery].flatMap((row) =>
      row.facts.facts.map(
        (fact) =>
          [
            fact['reference'] as string,
            allCurrentReferences[fact['reference'] as string]!,
          ] as const,
      ),
    ),
  );
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
    if (input.kind === 'near' ? !anchor : region === undefined)
      return { result: { status: 'unavailable' }, visited: 0 };
    const found =
      input.kind === 'near'
        ? receivedNear(scene, anchor!, input.radius, visits)
        : scene.index.region(region!, visits);
    const result = {
      status: found.status,
      bodies: found.values.map((body) => ({
        reference: entityHandle(world, actorId, body.sourceId),
        ...(anchor ? { separation: receivedSeparation(anchor, body) } : {}),
        facts: bodyFacts(body.sourceId),
      })),
    } as {
      status: 'complete' | 'partial';
      bodies: Array<{ reference: string; facts: ReturnType<typeof bodyFacts> }>;
    };
    return { result, visited: found.visited };
  };
  return {
    world,
    actorId,
    jobId,
    packet,
    history,
    receiptPrefix,
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
    allAttentionReferences,
    allCurrentReferences,
    currentReferences,
    valid: (current: WorldState) => evidenceCutEligible(current, cut),
  };
}
export type CapturedSituation = ReturnType<typeof captureSituation>;

/** Domain admission receives only finite granted references, never the server's
 * captured world, spatial query objects or read closures. */
export function situationProposalBinding(
  captured: Pick<
    CapturedSituation,
    | 'privacyRevision'
    | 'attentionReferences'
    | 'retentionReferences'
    | 'receiptDetails'
    | 'observationReferences'
    | 'presented'
    | 'currentReferences'
  >,
  semanticCauses?: SituationProposalBinding['semanticCauses'],
): SituationProposalBinding {
  return {
    privacyRevision: captured.privacyRevision,
    attentionReferences: captured.attentionReferences,
    retentionReferences: captured.retentionReferences,
    receiptDetails: captured.receiptDetails,
    observationReferences: captured.observationReferences,
    presented: captured.presented,
    currentReferences: captured.currentReferences,
    ...(semanticCauses ? { semanticCauses } : {}),
  };
}

/** One finite read-only query batch over this decision's captured permitted inputs.
 * This grants neither additional sensing nor a repeating interpretation loop. */
export async function expandSituation(
  captured: CapturedSituation,
  queries: readonly SituationQuery[],
  readHistory: (
    query: import('./temporal-storage.js').TemporalHistoryQuery,
  ) => Promise<TemporalHistoryPage>,
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
    for (const subject of [receipt.subject, ...(receipt.contextSubjects ?? [])])
      subjects.set(permittedSourceHandle(world, actorId, ['received-subject', subject]), subject);
  for (const query of queries) {
    const frameStart = captured.frames.length;
    let result: unknown;
    let keepNewest = false;
    if (query.kind === 'historical-spatial') {
      const anchor = subjects.get(query.anchor),
        other = query.other ? subjects.get(query.other) : undefined;
      if (!anchor || (query.other && !other) || query.from > query.through)
        result = { status: 'unavailable' };
      else {
        const history = await readHistory({
          subjects: [...new Set([anchor, ...(other ? [other] : [])])],
          measurements: { from: query.from, through: Math.min(world.simTime, query.through) },
          through: world.simTime,
          cut: captured.receiptPrefix,
          bytes: Math.max(0, policy.expansionBytes - encodedBytes()),
          limit: policy.expansionReceipts,
        });
        captured.bindHistory(history);
        const native = historicalSpatialMeasurements(
          history,
          {
            anchor,
            ...(other ? { other } : {}),
            from: query.from,
            through: Math.min(world.simTime, query.through),
            radius: query.radius,
          },
          visits,
        );
        visits -= native.visited;
        const support = (fact: import('@open-legend/domain').HistoricalSpatialFact) => {
          const entry = history.entries[fact.entry]!,
            reference = entry.receipt.facets[fact.facet]!;
          return {
            reference: permittedSourceHandle(world, actorId, [
              'receipt',
              entry.receipt.physicalLife,
              entry.receipt.epoch,
              entry.receipt.ordinal,
            ]),
            facet: reference.ordinal,
            asOf: reference.asOf,
            measuredFrom: reference.measuredFrom,
            measuredThrough: reference.measuredThrough,
            acquiredAt: reference.acquiredAt,
            ...(reference.confirmedThrough !== undefined
              ? { confirmedThrough: reference.confirmedThrough }
              : {}),
          };
        };
        result = {
          status: native.status,
          coverage: native.coverage,
          timeUnit: 'simulation-seconds',
          distanceUnit: 'metres',
          scope: 'selected-retained-evidence',
          preparedFacts: native.preparedFacts,
          samples: native.samples.map((sample) => ({
            ...sample,
            support: sample.support.map(support),
            boundaries: sample.boundaries.map((edge) => ({
              ...edge,
              support: support(edge.support),
            })),
          })),
        };
        keepNewest = true;
      }
    } else if (query.kind === 'history') {
      const subject = query.subject ? subjects.get(query.subject) : undefined;
      if ((query.subject && !subject) || query.from > query.through)
        result = { status: 'unavailable' };
      else {
        const history = await readHistory({
          ...(subject ? { subjects: [subject] } : {}),
          cut: captured.receiptPrefix,
          from: query.from,
          through: Math.min(world.simTime, query.through),
          bytes: Math.max(0, policy.expansionBytes - encodedBytes()),
          limit: policy.expansionReceipts,
        });
        captured.bindHistory(history);
        // Historical receipts stay historical; expansion never invents a current entity lease.
        result = temporalHistoryForModel(world, actorId, history);
        keepNewest = true;
      }
    } else if (query.kind === 'boundaries') {
      const id = captured.references.get(query.anchor),
        body = id ? captured.scene.bodies.get(id) : undefined;
      if (!body) result = { status: 'unavailable' };
      else {
        const facts: unknown[] = [];
        let seen = 0;
        const boundaries = captured.geometry.observations.filter((observation) =>
          observation.facets.some((f) => f.value.kind === 'physical-boundary'),
        );
        for (const observation of boundaries) {
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
        const page: { status: string; facts: unknown[] } = {
          status:
            captured.geometry.complete && facts.length === boundaries.length
              ? 'complete'
              : 'partial',
          facts,
        };
        result = page;
      }
    } else {
      const found = captured.queryBodies(query, visits);
      visits -= found.visited;
      result = found.result;
    }
    const row = { query, result };
    results.push(row);
    captured.compactFrames(result, frameStart);
    if (encodedBytes() > policy.expansionBytes && result && typeof result === 'object') {
      const record = result as Record<string, unknown>;
      const rows = record['bodies'] ?? record['facts'] ?? record['entries'] ?? record['samples'];
      if (Array.isArray(rows)) {
        record['status'] = 'partial';
        record['coverage'] = 'partial';
        while (rows.length && encodedBytes() > policy.expansionBytes) {
          if (keepNewest) rows.shift();
          else rows.pop();
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
      if (key) {
        captured.attentionReferences[row.reference] = key;
        const supplied = captureAttentionPresentation(world, actorId, [key])[0];
        if (supplied && !captured.presented.some((entry) => entry.key === key))
          captured.presented.push(supplied);
      }
    }
  }
  const disclosed = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === 'string') disclosed.add(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(results);
  for (const [key, snapshot] of Object.entries(captured.allCurrentReferences))
    if (disclosed.has(key)) captured.currentReferences[key] = snapshot;
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
