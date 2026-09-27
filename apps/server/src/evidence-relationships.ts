import type { MemoryRecord, WorldState } from '@open-legend/domain';
import type { RelationshipEdge, RelationshipNode, RelationshipRef } from '@open-legend/protocol';
import { fingerprint, refKey, RelationshipIndex } from './relationship-index.js';

// A record holder is not necessarily its author, witness, or the person its claim describes.
// docs/repertoire-foundation.md#5-information-artifacts
export function memoryRef(actorId: string, record: MemoryRecord): RelationshipRef {
  return {
    kind: 'memory-record',
    id: JSON.stringify([actorId, record.id]),
    version: fingerprint(record),
  };
}
export function projectMemoryRecord(
  world: WorldState,
  generation: string,
  actorId: string,
  record: MemoryRecord,
) {
  const root = memoryRef(actorId, record);
  const nodes: RelationshipNode[] = [
    { ref: root, label: record.summary, layer: 'evidence', canInspect: true },
  ];
  const edges: RelationshipEdge[] = [];
  const actor: RelationshipRef = { kind: 'actor-reference', id: actorId, version: 'identity' };
  nodes.push({
    ref: actor,
    label: world.entities[actorId]?.name ?? 'Record holder',
    layer: 'live',
    availability: 'reference-only',
  });
  const held = {
    source: root,
    target: actor,
    sourceRecord: root,
    relation: 'held_by' as const,
    assertion: 'observed' as const,
  };
  edges.push({ id: fingerprint(held), ...held });
  for (const evidence of new Set(
    [record.eventId, record.obligation?.evidenceId, record.obligation?.fulfilledBy].filter(
      (value): value is string => !!value,
    ),
  )) {
    const target = { kind: 'event-reference', id: evidence, version: 'identity' };
    nodes.push({ ref: target, label: evidence, layer: 'evidence', availability: 'reference-only' });
    const fact = {
      source: root,
      target,
      sourceRecord: root,
      relation: 'evidenced_by' as const,
      assertion: 'observed' as const,
    };
    edges.push({ id: fingerprint(fact), ...fact });
  }
  return {
    node: nodes[0]!,
    data: record,
    index: new RelationshipIndex(
      JSON.stringify([world.id, generation, refKey(root)]),
      nodes,
      edges,
      [
        'Retained memory/commitment provenance only. A stored claim is not established world truth or a mutually accepted agreement.',
        'Event references are identity-only: they require separately authorized history lookup, not invented event contents or a complete archive claim.',
      ],
    ),
  };
}
