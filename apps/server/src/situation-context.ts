import { z } from 'zod';
import {
  captureEvidenceCut,
  canonicalJson,
  PERSONAL_EVIDENCE_PREPARATION,
  captureTemporalReceiptPrefix,
  temporalReceiptWithinPrefix,
  evidenceCutEligible,
  currentDetailedAttention,
  currentAttentionCues,
  observationFactKey,
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
  type ObservationContribution,
} from '@open-legend/domain';
import {
  entityHandle,
  evidenceSourceHandle,
  receivedSubjectHandle,
  permittedSourceHandle,
  projectEntityMarkers,
  historicalAccountText,
} from './entity-references.js';
import {
  facetValueForModel,
  modelFacetMetadata,
  observationForModel,
} from './experience-context.js';
import type { TemporalHistoryPage } from './temporal-storage.js';
import {
  presentedSpatialSubject,
  RECEIVED_HISTORY_INSTRUCTIONS,
  receivedMeasurementDescription,
  captureModelSpatialFrame,
  modelObservationFrame,
  modelObservedLocation,
  modelSpatialBounds,
  modelSpatialPoint,
  modelSpatialVector,
  modelFrameTable,
  type ModelSpatialFrame,
} from './perceived-context.js';

function readableMeasurement(
  anchorFacts: Parameters<typeof presentedSpatialSubject>[0],
  measurement: Parameters<typeof receivedMeasurementDescription>[1],
  otherFacts?: Parameters<typeof presentedSpatialSubject>[0],
  boundaryReference?: string,
): { description?: string; support?: string[] } {
  const anchor = presentedSpatialSubject(anchorFacts);
  const other = otherFacts && presentedSpatialSubject(otherFacts);
  const description = receivedMeasurementDescription(anchor.label, measurement, other?.label);
  return description
    ? {
        description,
        support: [
          ...new Set([
            ...anchor.support,
            ...(other?.support ?? []),
            ...(boundaryReference ? [boundaryReference] : []),
          ]),
        ],
      }
    : {};
}

const reference = z.string().min(1).max(120);
// Each branch already has an exclusive literal kind. The ordinary union emits
// provider-supported anyOf while retaining the same strict native validation.
export const situationQuerySchema = z
  .union([
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
  ])
  .describe(
    'near, separation and boundaries use supplied current-body references: Received situation bodies, returned query bodies, or References rows marked currentBody:true. expand uses a supplied broad-region reference. history and historical-spatial use supplied received-subject or current-body references. A communication-only person reference grants no current spatial position.',
  );
export type SituationQuery = z.infer<typeof situationQuerySchema>;

interface SuppliedModelFact {
  source: string;
  ordinal: number;
  encodedValue: string;
}
type SuppliedModelFacts = ReadonlyMap<string, SuppliedModelFact>;
const inlineFrame = (value: object, frame: unknown) => ({ ...value, frame });

export function temporalHistoryForModel(
  world: WorldState,
  actorId: string,
  selection: TemporalHistorySelection,
  frame = captureModelSpatialFrame(world, actorId),
) {
  return prepareTemporalHistoryForModel(world, actorId, selection, frame).model;
}
function prepareTemporalHistoryForModel(
  world: WorldState,
  actorId: string,
  selection: TemporalHistorySelection,
  frame: ModelSpatialFrame,
  suppliedFacts?: SuppliedModelFacts,
) {
  const frames = modelFrameTable();
  // Newest rows allocate dictionary entries first. Any selected newest suffix
  // therefore owns a complete dictionary prefix, with no dangling frame IDs or
  // repeated full-packet serialization while fitting the byte allowance.
  const rows = [...selection.entries].reverse().map(({ receipt, values }) => {
    const metadata = modelFacetMetadata(receipt.facets);
    const row = {
      reference: permittedSourceHandle(world, actorId, [
        'receipt',
        receipt.physicalLife,
        receipt.epoch,
        receipt.ordinal,
      ]),
      subject: receivedSubjectHandle(world, actorId, receipt.subject),
      ...(receipt.contextSubjects?.length
        ? {
            contextFor: receipt.contextSubjects.map((subject) =>
              receivedSubjectHandle(world, actorId, subject),
            ),
          }
        : {}),
      acquiredAt: receipt.at,
      change: receipt.change,
      facetDefaults: metadata.defaults,
      facts: values.map((value, index) => {
        const original = receipt.facets[index]?.original;
        const supplied = original && suppliedFacts?.get(canonicalJson(original));
        // An onset key can also accompany a later resolved variant. Only the
        // complete equal value in this exact decision frame may reuse its body.
        const same =
          supplied &&
          supplied.encodedValue ===
            canonicalJson(
              temporalValueForModel(
                world,
                actorId,
                value,
                [receipt.epoch, receipt.ordinal],
                frame,
                inlineFrame,
              ),
            );
        return {
          ...metadata.overrides[index],
          value: same
            ? { kind: 'supplied-fact', source: supplied.source, ordinal: supplied.ordinal }
            : temporalValueForModel(
                world,
                actorId,
                value,
                [receipt.epoch, receipt.ordinal],
                frame,
                frames.indexed,
              ),
        };
      }),
    };
    return { row, throughFrame: frames.frames.length };
  });
  return {
    throughFrames: rows.map(({ throughFrame }) => throughFrame).reverse(),
    model: {
      coverage: selection.incomplete ? 'partial' : 'selected-retained',
      frames: frames.frames,
      entries: rows.map(({ row }) => row).reverse(),
    },
  };
}
/** The model allowance counts its encoded rows, not native proof/receipt storage.
 * Hydration has its independent working-set bound; only emitted rows grant sources. */
export function boundedTemporalHistoryForModel(
  world: WorldState,
  actorId: string,
  selection: TemporalHistorySelection,
  maxBytes: number,
  frame = captureModelSpatialFrame(world, actorId),
  suppliedFacts?: SuppliedModelFacts,
) {
  const { model, throughFrames } = prepareTemporalHistoryForModel(
    world,
    actorId,
    selection,
    frame,
    suppliedFacts,
  );
  let bytes = Buffer.byteLength(
    JSON.stringify({ ...model, coverage: 'selected-retained', entries: [], frames: [] }),
  );
  let first = model.entries.length;
  let frameCount = 0;
  for (let index = model.entries.length - 1; index >= 0; index--) {
    let size =
      Buffer.byteLength(JSON.stringify(model.entries[index])) +
      (first < model.entries.length ? 1 : 0);
    const through = throughFrames[index]!;
    for (let id = frameCount; id < through; id++)
      size += Buffer.byteLength(JSON.stringify(model.frames[id])) + (id ? 1 : 0);
    if (bytes + size > maxBytes) break;
    bytes += size;
    first = index;
    frameCount = through;
  }
  const incomplete = selection.incomplete || first > 0;
  model.entries = model.entries.slice(first);
  model.frames = model.frames.slice(0, frameCount);
  model.coverage = incomplete ? 'partial' : 'selected-retained';
  return {
    model,
    selection: { ...selection, entries: selection.entries.slice(first), incomplete },
  };
}
function temporalValueForModel(
  world: WorldState,
  actorId: string,
  value: TemporalValue,
  scope: unknown,
  frame: ModelSpatialFrame,
  indexedFrame: ReturnType<typeof modelFrameTable>['indexed'],
): unknown {
  if (value.kind === 'personal-account')
    return {
      kind: value.kind,
      text: historicalAccountText(value.text),
      ...(value.eventType !== undefined ? { eventType: value.eventType } : {}),
    };
  if (value.kind === 'received-motion')
    return {
      kind: value.kind,
      earlier: indexedFrame(
        {
          location: modelObservedLocation(frame, value.earlier.location),
          measuredFrom: value.earlier.measuredFrom,
          measuredThrough: value.earlier.measuredThrough,
          acquiredAt: value.earlier.acquiredAt,
        },
        modelObservationFrame(frame, value.earlier.frame),
      ),
      later: indexedFrame(
        {
          location: modelObservedLocation(frame, value.later.location),
          measuredFrom: value.later.measuredFrom,
          measuredThrough: value.later.measuredThrough,
          acquiredAt: value.later.acquiredAt,
        },
        modelObservationFrame(frame, value.later.frame),
      ),
      correspondence: value.correspondence,
    };
  if (value.kind === 'location')
    return indexedFrame(
      { kind: value.kind, location: modelObservedLocation(frame, value.location) },
      modelObservationFrame(frame, value.frame),
    );
  if (value.kind === 'surface-patch')
    return {
      kind: value.kind,
      patch: indexedFrame(
        {
          ...value.patch,
          vertices: value.patch.vertices.map((point) => modelSpatialPoint(frame, point)),
          normal: modelSpatialVector(frame, value.patch.normal),
        },
        modelObservationFrame(frame, value.patch.frame),
      ),
    };
  return facetValueForModel(world, actorId, value, scope, frame);
}

/** Captured permitted inputs, with private routing maps kept outside model/player text. */
export function captureSituation(
  world: WorldState,
  actorId: string,
  jobId: string,
  retainedHistory: TemporalHistorySelection,
  representedObservations: readonly ObservationContribution[] = [],
) {
  const policy = selectedAttentionPolicy(world).scene,
    scene = receivedScene(world, actorId),
    frame = captureModelSpatialFrame(world, actorId);
  const geometry = currentReceivedGeometry(world, actorId);
  const cut = captureEvidenceCut(world, actorId, geometry.observations),
    entries = currentDetailedAttention(world, actorId);
  const staticRows: unknown[] = [];
  const suppliedFacts = new Map<string, SuppliedModelFact>();
  // Exact required observations are already rendered by their owning context;
  // they need no duplicate history row, but retain their supplied source grant.
  const observationReferences: Record<string, ObservationContribution> = Object.fromEntries(
    representedObservations.map((observation) => [
      evidenceSourceHandle(world, actorId, observationFactKey(observation, 0).source),
      observation,
    ]),
  );
  let staticBytes = 0;
  // Boundaries go first; their support references remain evidence, not disclosed world IDs.
  const staticObservations = [...geometry.observations].sort(
    (a, b) =>
      Number(b.facets.some((f) => f.value.kind === 'physical-boundary')) -
      Number(a.facets.some((f) => f.value.kind === 'physical-boundary')),
  );
  for (const observation of staticObservations) {
    if (staticRows.length >= policy.staticRows) break;
    const row = observationForModel(world, actorId, observation, frame),
      size = Buffer.byteLength(JSON.stringify(row));
    if (staticBytes + size > policy.staticBytes) continue;
    staticRows.push(row);
    staticBytes += size;
    observationReferences[row.source] = observation;
    for (const facet of row.facets)
      suppliedFacts.set(canonicalJson(observationFactKey(observation, facet.ordinal)), {
        source: row.source,
        ordinal: facet.ordinal,
        encodedValue: canonicalJson(facet.value),
      });
  }
  const receiptPrefix = captureTemporalReceiptPrefix(world, actorId);
  const representedFacts = new Map(
    representedObservations.flatMap((observation) =>
      observation.facets.map(
        (facet) => [canonicalJson(observationFactKey(observation, facet.ordinal)), facet] as const,
      ),
    ),
  );
  const alreadyRepresented = ({ receipt, values }: TemporalHistorySelection['entries'][number]) =>
    receipt.change === 'occurrence' &&
    receipt.facets.every((facet, index) => {
      const original = facet.original && representedFacts.get(canonicalJson(facet.original));
      return (
        original &&
        facet.role === original.role &&
        facet.asOf === original.asOf &&
        facet.measuredFrom === original.measuredFrom &&
        facet.measuredThrough === original.measuredThrough &&
        facet.acquiredAt === original.acquiredAt &&
        facet.confirmedThrough === undefined &&
        canonicalJson(values[index]) === canonicalJson(original.value)
      );
    });
  const historyEntries = retainedHistory.entries.filter(
    (entry) =>
      temporalReceiptWithinPrefix(entry.receipt, receiptPrefix) && !alreadyRepresented(entry),
  );
  const boundedHistory = boundedTemporalHistoryForModel(
    world,
    actorId,
    {
      ...retainedHistory,
      entries: historyEntries,
      incomplete:
        retainedHistory.incomplete ||
        retainedHistory.entries.some(
          ({ receipt }) => !temporalReceiptWithinPrefix(receipt, receiptPrefix),
        ),
    },
    policy.historyBytes,
    frame,
    suppliedFacts,
  );
  const history = boundedHistory.selection;
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
  const { frames, indexed: indexedFrame, compact: compactFrames } = modelFrameTable();
  const allCurrentReferences: Record<string, CapturedCurrentFacet> = {};
  const activeCues = currentAttentionCues(world, actorId);
  const cueAnchors = new Set(activeCues.map((cue) => entityHandle(world, actorId, cue.sourceId)));
  const prioritizedDetails = new Set([
    ...cueAnchors,
    ...entries
      .filter((entry) => ['explicit', 'work', 'direct'].includes(entry.basis))
      .map((entry) => entityHandle(world, actorId, entry.sourceId)),
  ]);
  const cueFacts = new Set(
    activeCues.flatMap((cue) => cue.proof.map((fact) => canonicalJson(fact))),
  );
  const supportsCue = (sample: Pick<CapturedCurrentFacet, 'original' | 'originalOrdinal'>) =>
    cueFacts.has(canonicalJson(observationFactKey(sample.original, sample.originalOrdinal)));
  const entryBySource = new Map(entries.map((entry) => [entry.sourceId, entry]));
  const salientFacts = new Set<string>();
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
        const entry = entryBySource.get(id);
        const candidate =
          entry && world.perceptionEvidence?.[actorId]?.attention?.candidates[entry.key];
        if (
          supportsCue(facet) ||
          (facet.value.kind === 'observed-motion' &&
            [facet.value.earlier, facet.value.later].some(supportsCue)) ||
          (entry &&
            candidate?.presentedChange !== candidate?.changeRevision &&
            facet.original.acquiredAt > entry.startedAt)
        )
          salientFacts.add(reference);

        // Current motion carries exact received endpoints, not two recursively repeated accounts.
        const value =
          facet.value.kind === 'observed-motion'
            ? {
                kind: facet.value.kind,
                correspondence: facet.value.correspondence,
                earlier: indexedFrame(
                  {
                    location: modelObservedLocation(frame, facet.value.earlier.value.location),
                    measuredFrom: facet.value.earlier.valueMeasuredFrom,
                    measuredThrough: facet.value.earlier.valueMeasuredThrough,
                  },
                  modelObservationFrame(frame, facet.value.earlier.value.frame),
                ),
                later: indexedFrame(
                  {
                    location: modelObservedLocation(frame, facet.value.later.value.location),
                    measuredFrom: facet.value.later.valueMeasuredFrom,
                    measuredThrough: facet.value.later.valueMeasuredThrough,
                  },
                  modelObservationFrame(frame, facet.value.later.value.frame),
                ),
              }
            : facet.value.kind === 'location'
              ? indexedFrame(
                  {
                    kind: facet.value.kind,
                    location: modelObservedLocation(frame, facet.value.location),
                  },
                  modelObservationFrame(frame, facet.value.frame),
                )
              : facetValueForModel(world, actorId, facet.value, facet.original.id, frame);
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
      subject: receivedSubjectHandle(world, actorId, entry.exposure.episodeId),
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
      .map(
        (
          body,
        ): { reference: string } & ReturnType<typeof receivedSeparation> &
          ReturnType<typeof readableMeasurement> => ({
          reference: entityHandle(world, actorId, body.sourceId),
          ...receivedSeparation(anchor, body),
        }),
      )
      .sort((a, b) => (a.lower ?? Infinity) - (b.lower ?? Infinity))
      .slice(0, 2);
    const remaining = Math.max(0, allowance - nearby.visited),
      candidates = boundaries.slice(0, remaining);
    initialVisits += candidates.length;
    const edges = candidates
      .map(
        ({
          observation,
          boundary,
        }): { reference: string } & ReturnType<typeof receivedBoundarySeparation> &
          ReturnType<typeof readableMeasurement> => ({
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
        }),
      )
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
    historyEncoding: RECEIVED_HISTORY_INSTRUCTIONS,
    frames,
    frameEncoding:
      'Spatial components are metres right, above and forward from my position and facing at this decision cut, not learned global coordinates. Detailed location/motion acquisition frames are indices into frames; all original measurement times remain independent. Bounds conservatively enclose distinct received membership groups and can overlap after rotation.',
    measurementEncoding:
      'Relation lower/upper conservatively bound body separation or boundary clearance in metres. Positive decreaseLower is the minimum supported decrease between measured endpoints, not a continuous path, speed or intent. dropLower is the minimum received vertical drop beyond the observed boundary; it proves neither crossing nor danger. Partial coverage is not absence.',
    units: { space: 'metres', time: 'simulation-seconds', frame: 'decision-relative' },
    broad: cover.rows.map((row) => ({
      reference: permittedSourceHandle(world, actorId, ['region', jobId, row.key]),
      count: row.count,
      bounds: modelSpatialBounds(frame, row.bounds),
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
    recent: boundedHistory.model,
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
  let emittedRows = new Map<string, ReturnType<typeof bodyFacts>['facts']>();
  const emittedFacts = (reference: string) => emittedRows.get(reference) ?? [];
  const currentBytes = () => {
    // Narrowing can remove an association or entire row. Re-render from only
    // the kept facts so a name/description cannot outlive its disclosed proof.
    emittedRows = new Map(
      [...packet.detailed, ...packet.discovery].map((row) => [row.reference, row.facts.facts]),
    );
    for (const relation of packet.relations) {
      const anchor = emittedFacts(relation.anchor);
      for (const body of relation.bodies)
        Object.assign(body, readableMeasurement(anchor, body, emittedFacts(body.reference)));
      for (const edge of relation.boundaries)
        Object.assign(edge, readableMeasurement(anchor, edge, undefined, edge.reference));
    }
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
      bounds: modelSpatialBounds(frame, row.bounds),
      detail: 'unexpanded',
    }));
  }
  let omittedDetailedSubjects = 0;
  let omittedFacets = 0;
  for (const row of [...packet.detailed].reverse()) {
    for (let i = row.facts.facts.length - 1; currentBytes() > policy.maxBytes && i >= 0; i--) {
      const fact = row.facts.facts[i]!;
      const value = fact['value'] as { kind: string };
      if (
        ['body', 'location', 'association'].includes(value.kind) ||
        salientFacts.has(fact['reference'] as string)
      )
        continue;
      row.facts.facts.splice(i, 1);
      omittedFacets++;
      const key = attentionReferences[row.reference],
        at = key ? presentedKeys.indexOf(key) : -1;
      if (at >= 0) presentedKeys.splice(at, 1);
    }
  }
  // Source-backed change and active cue measurements precede unchanged optional
  // equipment/meters. Narrow the derived read, never the acquired evidence or
  // native reaction; broad presence and all original quotas stay unchanged.
  while (currentBytes() > policy.maxBytes && packet.relations.length) {
    let index = packet.relations.length - 1;
    while (index >= 0 && cueAnchors.has(packet.relations[index]!.anchor)) index--;
    if (index < 0) break;
    packet.relations.splice(index, 1);
  }
  const omitDetailed = (index: number) => {
    const [removed] = packet.detailed.splice(index, 1);
    const key = removed && attentionReferences[removed.reference];
    if (removed) delete attentionReferences[removed.reference];
    const at = key ? presentedKeys.indexOf(key) : -1;
    if (at >= 0) presentedKeys.splice(at, 1);
    omittedDetailedSubjects++;
  };
  while (currentBytes() > policy.maxBytes && packet.detailed.length) {
    let index = packet.detailed.length - 1;
    while (index >= 0) {
      const row = packet.detailed[index]!;
      const entry = entryBySource.get(references.get(row.reference)!);
      if (
        entry?.basis !== 'discovery' &&
        !prioritizedDetails.has(row.reference) &&
        !row.facts.facts.some((fact) => salientFacts.has(fact['reference'] as string))
      )
        break;
      index--;
    }
    if (index < 0) break;
    omitDetailed(index);
  }
  // Finite input cannot guarantee every selected detail. If even prioritized
  // sources exceed the allowance, retain honest partial coverage without changing
  // the character's ongoing attention or any already committed native outcome.
  // Chosen focus, current work and direct address precede incidental routine
  // changes, as they already do in the native attention selection.
  while (currentBytes() > policy.maxBytes && packet.relations.length) packet.relations.pop();
  while (currentBytes() > policy.maxBytes && packet.detailed.length) {
    let index = packet.detailed.length - 1;
    while (
      index >= 0 &&
      (prioritizedDetails.has(packet.detailed[index]!.reference) ||
        entryBySource.get(references.get(packet.detailed[index]!.reference)!)?.basis ===
          'discovery')
    )
      index--;
    omitDetailed(index < 0 ? packet.detailed.length - 1 : index);
  }
  Object.assign(packet.coverage, {
    unconsideredDescriptions: waiting.filter(([key]) => !presentedKeys.includes(key)).length,
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
      if (!a || !b) return { result: { status: 'unavailable' }, visited: 0 };
      const measurement = receivedSeparation(scene.bodies.get(a)!, scene.bodies.get(b)!);
      return {
        result: {
          ...measurement,
          ...readableMeasurement(
            emittedFacts(input.first),
            measurement,
            emittedFacts(input.second),
          ),
        },
        visited: 0,
      };
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
      bodies: found.values.map((body) => {
        const facts = bodyFacts(body.sourceId);
        const measurement = anchor && receivedSeparation(anchor, body);
        return {
          reference: entityHandle(world, actorId, body.sourceId),
          ...(measurement
            ? {
                separation: {
                  ...measurement,
                  ...readableMeasurement(
                    emittedFacts(input.kind === 'near' ? input.anchor : ''),
                    measurement,
                    facts.facts,
                  ),
                },
              }
            : {}),
          facts,
        };
      }),
    } as {
      status: 'complete' | 'partial';
      bodies: Array<{ reference: string; facts: ReturnType<typeof bodyFacts> }>;
    };
    return { result, visited: found.visited };
  };
  return {
    world,
    frame,
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
    suppliedFacts,
    bindHistory,
    bodyFacts,
    emittedFacts,
    queryBodies,
    allAttentionReferences,
    allCurrentReferences,
    currentReferences,
    valid: (current: WorldState) => evidenceCutEligible(current, cut),
  };
}
export type CapturedSituation = ReturnType<typeof captureSituation>;

/** Both ordinary and reconsidered responses consume the same captured grants. */
export function situationResponseCapabilities(captured: CapturedSituation) {
  return {
    frame: captured.frame,
    attention: Object.keys(captured.attentionReferences),
    retention: [
      ...Object.keys(captured.retentionReferences),
      ...Object.keys(captured.observationReferences),
      ...Object.keys(captured.currentReferences),
    ],
  };
}

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
    subjects.set(receivedSubjectHandle(world, actorId, body.exposure), body.exposure);
  }
  for (const { receipt } of captured.history.entries)
    for (const subject of [receipt.subject, ...(receipt.contextSubjects ?? [])])
      subjects.set(receivedSubjectHandle(world, actorId, subject), subject);
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
          kinds: ['body', 'location', 'physical-boundary', 'surface-patch'],
          measurements: { from: query.from, through: Math.min(world.simTime, query.through) },
          through: world.simTime,
          cut: captured.receiptPrefix,
          bytes: PERSONAL_EVIDENCE_PREPARATION.bytes,
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
        const render = (value: unknown): unknown => {
          if (Array.isArray(value)) return value.map(render);
          if (!value || typeof value !== 'object') return value;
          const record = value as Record<string, unknown>;
          if (
            Object.keys(record).length === 2 &&
            typeof record['entry'] === 'number' &&
            typeof record['facet'] === 'number'
          )
            return support(
              record as unknown as import('@open-legend/domain').HistoricalSpatialFact,
            );
          return Object.fromEntries(
            Object.entries(record).map(([key, child]) => [key, render(child)]),
          );
        };
        result = {
          status: native.status,
          coverage: native.coverage,
          timeUnit: 'simulation-seconds',
          distanceUnit: 'metres',
          scope: 'selected-retained-evidence',
          preparedFacts: native.preparedFacts,
          samples: render(
            native.samples.map((sample) => ({
              ...sample,
              ...(sample.other
                ? {
                    other: {
                      ...sample.other,
                      description: receivedMeasurementDescription(
                        'the retained observed body',
                        sample.other,
                        'the other retained observed body',
                      ),
                    },
                  }
                : {}),
              boundaries: sample.boundaries.map((edge) => ({
                ...edge,
                measurement: {
                  ...edge.measurement,
                  description: receivedMeasurementDescription(
                    'the retained observed body',
                    edge.measurement,
                  ),
                },
              })),
            })),
          ),
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
          bytes: PERSONAL_EVIDENCE_PREPARATION.bytes,
          limit: policy.expansionReceipts,
        });
        // Fit this result's full envelope before choosing rows. Outer trimming
        // cannot prune the history's separate acquisition-frame dictionary.
        const envelopeBytes =
          Buffer.byteLength(JSON.stringify({ query, result: null })) -
          Buffer.byteLength('null') +
          (results.length ? 1 : 0) +
          (results.length + 1 === queries.length
            ? Buffer.byteLength('requested-batch') - Buffer.byteLength('partial')
            : 0);
        const bounded = boundedTemporalHistoryForModel(
          world,
          actorId,
          history,
          Math.max(0, policy.expansionBytes - encodedBytes() - envelopeBytes),
          captured.frame,
          captured.suppliedFacts,
        );
        captured.bindHistory(bounded.selection);
        // Historical receipts stay historical; expansion never invents a current entity lease.
        result = bounded.model;
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
          const presented = observationForModel(world, actorId, observation, captured.frame);
          const measurement = receivedBoundarySeparation(body, boundary, {
            from: observation.acquiredAt,
            through: captured.geometry.supportedThrough,
          });
          facts.push({
            observation: presented,
            ...measurement,
            ...readableMeasurement(
              captured.emittedFacts(query.anchor),
              measurement,
              undefined,
              presented.source,
            ),
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
