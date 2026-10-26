import { z } from 'zod';
import {
  captureEvidenceCut, evidenceCutEligible, currentDetailedAttention, captureAttentionPresentation,
  currentObservedFacets, currentReceivedGeometry, receivedScene, receivedNear, receivedSeparation, selectedAttentionPolicy,
  type WorldState, type TemporalHistorySelection, type TemporalValue, type TemporalReceiptLocator,
} from '@open-legend/domain';
import { entityHandle, permittedSourceHandle, projectEntityMarkers } from './entity-references.js';
import { currentFacetForModel, facetValueForModel, observationForModel } from './experience-context.js';
import type { BoundsQueryCursor } from '@open-legend/spatial';

const reference = z.string().min(1).max(120);
export const situationQuerySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('near'), anchor: reference, radius: z.number().finite().min(0).max(100), cursor: reference.nullable() }).strict(),
  z.object({ kind: z.literal('separation'), first: reference, second: reference }).strict(),
  z.object({ kind: z.literal('boundaries'), anchor: reference, cursor: reference.nullable() }).strict(),
  z.object({ kind: z.literal('history'), subject: reference.nullable(), from: z.number().finite().min(0), through: z.number().finite().min(0), cursor: reference.nullable() }).strict(),
  z.object({ kind: z.literal('expand'), region: reference, cursor: reference.nullable() }).strict(),
]);
export type SituationQuery = z.infer<typeof situationQuerySchema>;

export function temporalHistoryForModel(world: WorldState, actorId: string, selection: TemporalHistorySelection) {
  return {
    coverage: selection.incomplete ? 'partial' : 'selected-retained',
    entries: selection.entries.map(({ receipt, values }) => ({
      reference: permittedSourceHandle(world, actorId, ['receipt', receipt.physicalLife, receipt.epoch, receipt.ordinal]),
      subject: permittedSourceHandle(world, actorId, ['received-subject', receipt.subject]),
      acquiredAt: receipt.at, change: receipt.change,
      facts: values.map((value, index) => {
        const fact = receipt.facets[index]!;
        return { role: fact.role, asOf: fact.asOf, measuredFrom: fact.measuredFrom, measuredThrough: fact.measuredThrough,
          acquiredAt: fact.acquiredAt, value: temporalValueForModel(world, actorId, value, [receipt.epoch, receipt.ordinal]) };
      }),
    })),
  };
}
function temporalValueForModel(world: WorldState, actorId: string, value: TemporalValue, scope: unknown): unknown {
  if (value.kind === 'personal-account')
    return { kind: value.kind, text: projectEntityMarkers(value.text, world, actorId), eventType: value.eventType };
  if (value.kind === 'received-motion') return {
    kind: value.kind,
    earlier: { location: value.earlier.location, frame: value.earlier.frame,
      measuredFrom: value.earlier.measuredFrom, measuredThrough: value.earlier.measuredThrough, acquiredAt: value.earlier.acquiredAt },
    later: { location: value.later.location, frame: value.later.frame,
      measuredFrom: value.later.measuredFrom, measuredThrough: value.later.measuredThrough, acquiredAt: value.later.acquiredAt },
    correspondence: value.correspondence,
  };
  return facetValueForModel(world, actorId, value, scope);
}

/** Captured permitted inputs, with private routing maps kept outside model/player text. */
export function captureSituation(world: WorldState, actorId: string, jobId: string, history: TemporalHistorySelection) {
  const policy = selectedAttentionPolicy(world).scene, scene = receivedScene(world, actorId);
  const geometry = currentReceivedGeometry(world, actorId);
  const cut = captureEvidenceCut(world, actorId, geometry.observations), entries = currentDetailedAttention(world, actorId);
  const references = new Map([...scene.bodies.keys()].map((id) => [entityHandle(world, actorId, id), id]));
  let cover = scene.index.cover(policy.maxRows - policy.staticRows - policy.discoveryRows, policy.nodeVisits);
  const regions = new Map(cover.rows.map((row) => [permittedSourceHandle(world, actorId, ['region', jobId, row.key]), row.key]));
  const detailIds = new Set(entries.map((entry) => entry.sourceId));
  const bodyFacts = (id: string) => {
    const facets = currentObservedFacets(world, actorId, id);
    const rendered = facets.filter(facet => facet.value.kind !== 'perceived-feature').map((facet) => {
      const projected = currentFacetForModel(world, actorId, facet);
      // Current motion carries exact received endpoints, not two recursively repeated accounts.
      const value = facet.value.kind === 'observed-motion' ? {
        kind: facet.value.kind, correspondence: facet.value.correspondence,
        earlier: { location: facet.value.earlier.value.location, frame: facet.value.earlier.value.frame,
          measuredFrom: facet.value.earlier.valueMeasuredFrom, measuredThrough: facet.value.earlier.valueMeasuredThrough },
        later: { location: facet.value.later.value.location, frame: facet.value.later.value.frame,
          measuredFrom: facet.value.later.valueMeasuredFrom, measuredThrough: facet.value.later.valueMeasuredThrough },
      } : projected.value;
      return { reference: permittedSourceHandle(world, actorId, ['current-fact', facet.original.id, facet.originalOrdinal]),
        value, measuredFrom: facet.valueMeasuredFrom, measuredThrough: facet.valueMeasuredThrough,
        acquiredAt: facet.valueAcquiredAt, confirmedThrough: facet.confirmedThrough, modality: facet.modality };
    });
    const defaults = rendered[0] ? { measuredFrom: rendered[0].measuredFrom, measuredThrough: rendered[0].measuredThrough,
      acquiredAt: rendered[0].acquiredAt, confirmedThrough: rendered[0].confirmedThrough, modality: rendered[0].modality } : {};
    return { defaults, facts: rendered.map(fact=>Object.fromEntries(Object.entries(fact).filter(([key,value])=>
      !(key in defaults) || value !== defaults[key as keyof typeof defaults]))) };
  };
  const detailed = entries.filter((entry) => scene.bodies.has(entry.sourceId)).map((entry) => ({
    reference: entityHandle(world, actorId, entry.sourceId),
    subject: permittedSourceHandle(world, actorId, ['received-subject', entry.exposure.episodeId]), facts: bodyFacts(entry.sourceId),
  }));
  const waiting = Object.entries(world.perceptionEvidence?.[actorId]?.attention?.candidates ?? {})
    .filter(([, candidate]) => candidate.presentedDescription !== candidate.descriptionRevision).sort((a, b) => a[1].order - b[1].order);
  const discovery: Array<{ reference: string; facts: unknown[] }> = [];
  let discoveryBytes = 0;
  const presentedKeys = entries.map((entry) => entry.key);
  for (const [key, candidate] of waiting) {
    if (detailIds.has(candidate.sourceId)) continue;
    if (discovery.length >= policy.discoveryRows) break;
    const facts = currentObservedFacets(world, actorId, candidate.sourceId)
      .filter((facet) => ['body', 'association', 'carried'].includes(facet.value.kind)).map((facet) => currentFacetForModel(world, actorId, facet));
    const row = { reference: entityHandle(world, actorId, candidate.sourceId), facts };
    const bytes = Buffer.byteLength(JSON.stringify(row));
    if (discoveryBytes + bytes > policy.discoveryBytes) continue;
    discoveryBytes += bytes; discovery.push(row); presentedKeys.push(key);
  }
  const staticRows: unknown[] = [];
  let staticBytes = 0;
  // Boundaries go first; their support references remain evidence, not disclosed world IDs.
  const staticObservations = [...geometry.observations].sort((a, b) =>
    Number(b.facets.some(f => f.value.kind === 'physical-boundary')) - Number(a.facets.some(f => f.value.kind === 'physical-boundary')));
  for (const observation of staticObservations) {
    if (staticRows.length >= policy.staticRows) break;
    const row = observationForModel(world, actorId, observation), size = Buffer.byteLength(JSON.stringify(row));
    if (staticBytes + size > policy.staticBytes) continue;
    staticRows.push(row); staticBytes += size;
  }
  const attentionReferences = Object.fromEntries(Object.entries(world.perceptionEvidence?.[actorId]?.attention?.candidates ?? {})
    .filter(([, candidate]) => references.has(entityHandle(world, actorId, candidate.sourceId)))
    .map(([key, candidate]) => [entityHandle(world, actorId, candidate.sourceId), key]));
  const retentionReferences: Record<string, TemporalReceiptLocator> = {};
  const bindHistory = (selection: TemporalHistorySelection) => {
    for (const {receipt} of selection.entries) retentionReferences[permittedSourceHandle(world, actorId, ['receipt', receipt.physicalLife, receipt.epoch, receipt.ordinal])] =
      { actorId, physicalLife: receipt.physicalLife, epoch: receipt.epoch, ordinal: receipt.ordinal };
  };
  bindHistory(history);
  const packet = {
    measuredAt: world.simTime, units: { space: 'metres', time: 'simulation-seconds', frame: 'received-world-Y-up' },
    broad: cover.rows.map((row) => ({ reference: permittedSourceHandle(world, actorId, ['region', jobId, row.key]), count: row.count, bounds: row.bounds, detail: 'unexpanded' })),
    nonlocalized: { count: scene.nonlocalized, detail: 'not-spatially-localized' },
    static: { facts: staticRows, coverage: geometry.complete && staticRows.length === geometry.observations.length ? 'complete-received' : 'partial' },
    detailed, discovery, recent: temporalHistoryForModel(world, actorId, history),
    coverage: { bodies: scene.bodies.size, broadRows: cover.rows.length, hierarchyVisits: cover.visited,
      unconsideredDescriptions: Math.max(0, waiting.length - presentedKeys.length), omittedOptionalFacets:0, discoveryRows:discovery.length },
  };
  const currentBytes = () => Buffer.byteLength(JSON.stringify({ ...packet, recent: undefined }));
  // Presence stays complete while optional expansion is narrowed. A larger authored
  // description cannot make an ordinary crowded scene impossible to consider.
  while (currentBytes() > policy.maxBytes && packet.discovery.length) {
    const removed=packet.discovery.pop()!;
    const key=attentionReferences[removed.reference];
    const index=key ? presentedKeys.indexOf(key) : -1;
    if(index>=0) presentedKeys.splice(index,1);
  }
  for(let rows=Math.floor(packet.broad.length/2);currentBytes()>policy.maxBytes && rows>=1;rows=Math.floor(rows/2)) {
    cover=scene.index.cover(rows,policy.nodeVisits);
    packet.broad=cover.rows.map(row=>({reference:permittedSourceHandle(world,actorId,['region',jobId,row.key]),count:row.count,bounds:row.bounds,detail:'unexpanded'}));
  }
  let omittedFacets=0;
  for(const row of [...packet.detailed].reverse()) {
    for(let i=row.facts.facts.length-1;currentBytes()>policy.maxBytes && i>=0;i--) {
      const fact=row.facts.facts[i]!;
      const value=fact['value'] as {kind:string};
      if(['body','location','association'].includes(value.kind)) continue;
      row.facts.facts.splice(i,1); omittedFacets++;
      const key=attentionReferences[row.reference], at=key ? presentedKeys.indexOf(key) : -1;
      if(at>=0) presentedKeys.splice(at,1);
    }
  }
  Object.assign(packet.coverage,{omittedOptionalFacets:omittedFacets,discoveryRows:packet.discovery.length});
  if(currentBytes()>policy.maxBytes) throw new Error('Received authored descriptions exceed the scene allowance.');
  regions.clear();
  for(const row of cover.rows) regions.set(permittedSourceHandle(world,actorId,['region',jobId,row.key]),row.key);
  packet.coverage.broadRows=cover.rows.length;
  packet.coverage.hierarchyVisits=cover.visited;
  const presented = captureAttentionPresentation(world, actorId, presentedKeys);
  const cursors = new Map<string, { signature: string; cursor: BoundsQueryCursor }>();
  let cursorSequence = 0;
  const queryBodies = (input: Extract<SituationQuery, { kind: 'near' | 'separation' | 'expand' }>, visits: number) => {
    if (input.kind === 'separation') {
      const a = references.get(input.first), b = references.get(input.second);
      return a && b ? { result: receivedSeparation(scene.bodies.get(a)!, scene.bodies.get(b)!), visited: 0 } : { result: { status: 'unavailable' }, visited: 0 };
    }
    const id = input.kind === 'near' ? references.get(input.anchor) : undefined;
    const anchor = id ? scene.bodies.get(id) : undefined;
    const region = input.kind === 'expand' ? regions.get(input.region) : undefined;
    const signature = JSON.stringify({...input, cursor: undefined});
    const continuation = input.cursor ? cursors.get(input.cursor) : undefined;
    if ((input.cursor && continuation?.signature !== signature) || (input.kind === 'near' ? !anchor : region === undefined))
      return { result: { status: 'unavailable' }, visited: 0 };
    const found = input.kind === 'near' ? receivedNear(scene, anchor!, input.radius, visits, continuation?.cursor) : scene.index.region(region!, visits, continuation?.cursor);
    const cursor = found.cursor ? permittedSourceHandle(world, actorId, ['query-cursor', jobId, cursorSequence++]) : undefined;
    if (cursor && found.cursor) cursors.set(cursor, {signature, cursor: found.cursor});
    return { result: { status: found.status, ...(cursor ? {cursor} : {}), bodies: found.values.map((body) => ({ reference: entityHandle(world, actorId, body.sourceId),
      ...(anchor ? { separation: receivedSeparation(anchor, body) } : {}), facts: bodyFacts(body.sourceId) })) }, visited: found.visited };
  };
  return { world, actorId, jobId, packet, history, cut, scene, geometry, policy, references, regions, presented, attentionReferences, retentionReferences, bindHistory, bodyFacts, queryBodies,
    valid: (current: WorldState) => evidenceCutEligible(current, cut) };
}
export type CapturedSituation = ReturnType<typeof captureSituation>;

/** One finite read-only query batch over this decision's captured permitted inputs.
 * This grants neither additional sensing nor a repeating interpretation loop. */
export async function expandSituation(
  captured: CapturedSituation,
  queries: readonly SituationQuery[],
  readHistory: (query: import('./temporal-storage.js').TemporalHistoryQuery) => Promise<TemporalHistorySelection>,
) {
  const { policy, world, actorId } = captured;
  if (queries.length > policy.maximumQueries) throw new Error('Too many situation queries.');
  const results: unknown[] = [], expandedIds = new Set<string>();
  let visits = policy.queryVisits, bytes = policy.expansionBytes;
  const subjects = new Map<string, string>();
  for (const [handle, id] of captured.references) {
    const body = captured.scene.bodies.get(id)!;
    subjects.set(handle, body.exposure);
    subjects.set(permittedSourceHandle(world, actorId, ['received-subject', body.exposure]), body.exposure);
  }
  for (const { receipt } of captured.history.entries)
    subjects.set(permittedSourceHandle(world, actorId, ['received-subject', receipt.subject]), receipt.subject);
  for (const query of queries) {
    let result: unknown;
    if (query.kind === 'history') {
      const subject = query.subject ? subjects.get(query.subject) : undefined;
      if (query.cursor || (query.subject && !subject) || query.from > query.through) result = {status:'unavailable'};
      else {
        const history = await readHistory({ ...(subject ? {subject} : {}), from: query.from,
          through: Math.min(world.simTime, query.through), bytes, limit: policy.expansionReceipts });
        captured.bindHistory(history);
        // Historical receipts stay historical; expansion never invents a current entity lease.
        result = temporalHistoryForModel(world, actorId, history);
      }
    } else if (query.kind === 'boundaries') {
      const id = captured.references.get(query.anchor), body = id ? captured.scene.bodies.get(id) : undefined;
      if (!body || query.cursor) result = {status:'unavailable'};
      else {
        const facts: unknown[] = [];
        let seen = 0;
        for (const observation of captured.geometry.observations) {
          if (seen >= visits) break;
          seen++;
          const facet = observation.facets.find(facet => facet.value.kind === 'physical-boundary');
          if (!facet || facet.value.kind !== 'physical-boundary') continue;
          const boundary = facet.value.boundary, p = body.body.position;
          const dx = boundary.b.x-boundary.a.x, dy=boundary.b.y-boundary.a.y, dz=boundary.b.z-boundary.a.z;
          const length = dx*dx+dy*dy+dz*dz;
          const t = length ? Math.max(0, Math.min(1, ((p.x-boundary.a.x)*dx+(p.y-boundary.a.y)*dy+(p.z-boundary.a.z)*dz)/length)) : 0;
          const distance = Math.hypot(p.x-boundary.a.x-t*dx,p.y-boundary.a.y-t*dy,p.z-boundary.a.z-t*dz);
          facts.push({ observation: observationForModel(world, actorId, observation),
            clearanceLower: Math.max(0,distance-body.body.radius-boundary.errorRadius),
            clearanceUpper: distance+boundary.errorRadius });
        }
        visits -= seen;
        result = {status: captured.geometry.complete && seen === captured.geometry.observations.length ? 'complete' : 'partial', facts};
      }
    } else {
      const found = captured.queryBodies(query, visits);
      visits -= found.visited; result = found.result;
      if ('bodies' in found.result && Array.isArray(found.result.bodies))
        for (const row of found.result.bodies) {
          const id = captured.references.get(row.reference);
          if (id) expandedIds.add(id);
        }
    }
    const encoded = Buffer.byteLength(JSON.stringify(result));
    if (encoded > bytes) {
      results.push({query, result:{status:'partial', reason:'response-byte-allowance'}});
      bytes = 0;
      break;
    }
    bytes -= encoded; results.push({query,result});
  }
  return {results, expandedIds, visited:policy.queryVisits-visits,
    coverage:results.length === queries.length ? 'requested-batch' : 'partial'};
}
