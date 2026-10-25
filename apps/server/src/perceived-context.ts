import { namePhrase } from '@open-legend/language';
import {
  currentBodyObservation,
  currentObservedFacets,
  observerName,
  worldPosition,
  type Entity,
  type WorldState,
} from '@open-legend/domain';
import { entityHandle } from './entity-references.js';
import type { AttentionCandidate } from './recall.js';

/** Describe exact currently permitted values. Native menu preparation can retain
 * private admission records, but none of those records are character evidence. */
export function perceivedEntityText(
  world: WorldState,
  observerId: string,
  entityId: string,
): string | undefined {
  const body = currentBodyObservation(world, observerId, entityId);
  if (!body) return undefined;
  const facts = currentObservedFacets(world, observerId, entityId);
  const label = namePhrase(observerName(world, observerId, entityId), 'indefinite');
  const received = (facet: (typeof facts)[number]) =>
    `Measured at simulation second ${facet.valueMeasuredFrom}${facet.valueMeasuredThrough !== facet.valueMeasuredFrom ? `–${facet.valueMeasuredThrough}` : ''}; received at ${facet.valueAcquiredAt}.`;
  const text = [
    `I can see ${label} (ID:${entityHandle(world, observerId, entityId)}). ${received(body)}`,
  ];
  if (body.value.body.description)
    text.push(`Observed description: ${body.value.body.description}`);
  const outward = body.value.body.outward.filter(Boolean);
  if (outward.length) text.push(`Observed outward signs: ${outward.join(', ')}.`);
  for (const facet of facts) {
    if (facet.value.kind === 'carried')
      text.push(
        `Observed carried things: ${facet.value.items.map((item) => item.itemKindAsObserved).join('; ') || 'none observed'}. ${received(facet)}`,
      );
    if (facet.value.kind === 'pile-contents')
      text.push(
        `Observed pile contents: ${facet.value.items.map((item) => `${item.quantity} × ${item.name}`).join('; ') || 'none observed'}. ${received(facet)}`,
      );
  }
  return text.join(' ');
}

/** Relative geometry uses the frozen received position and the observer's own
 * present pose. It neither polls another body nor predicts a traversable route. */
export function relativeLocation(
  world: WorldState,
  observer: Entity,
  target: Entity,
): string | undefined {
  const received = currentBodyObservation(world, observer.id, target.id);
  if (!received) return undefined;
  const position = received.value.body.position;
  const here = worldPosition(observer);
  const dx = position.x - here.x,
    dz = position.z - here.z,
    dy = position.y - here.y;
  const horizontal = Math.hypot(dx, dz);
  const directions = [
    'ahead of me',
    'ahead and to my right',
    'to my right',
    'behind and to my right',
    'behind me',
    'behind and to my left',
    'to my left',
    'ahead and to my left',
  ];
  const bearing = observer.spatial.heading - Math.atan2(dx, dz);
  const direction = directions[((Math.round(bearing / (Math.PI / 4)) % 8) + 8) % 8];
  const height =
    Math.abs(dy) < 0.1
      ? 'at roughly my elevation'
      : `about ${Math.abs(dy).toFixed(1)} m ${dy > 0 ? 'above' : 'below'} me`;
  return `${horizontal < 0.1 ? 'At my horizontal position' : `About ${horizontal.toFixed(1)} m horizontally ${direction}`}, ${height}. Position measured at simulation second ${received.valueMeasuredFrom}; received at ${received.valueAcquiredAt}.`;
}

export { describePossession as possessionText } from '@open-legend/domain';

/** The same category names reach attention and the final actor context; metadata stays server-side. */
export function contextSections(candidates: AttentionCandidate[]): Record<string, string[]> {
  const names: Record<AttentionCandidate['kind'], string> = {
    conversation: 'conversation',
    memory: 'recall',
    entity: 'surroundings',
    possession: 'possessions',
    knowledge: 'knowledge',
    action: 'actions',
  };
  const sections: Record<string, string[]> = {};
  for (const candidate of candidates) (sections[names[candidate.kind]] ??= []).push(candidate.text);
  return sections;
}
