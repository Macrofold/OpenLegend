import { namePhrase, type Named } from '@open-legend/language';
import {
  formatBodyContext,
  renderNarrationParts,
  type CapturedCurrentFacet,
  type CurrentFacetValue,
  type Entity,
  type EvidenceCut,
  type Position,
  type ObserverSubject,
} from '@open-legend/domain';
import { personalEntityHandle } from './entity-references.js';
import { formatPerceivedEntityText, formatRelativeLocation } from './perceived-context.js';

/** Native-only private binding. Canonical routing stays in the request owner;
 * character/model output receives the same opaque personal reference as Source. */
export interface NativeBodyBinding {
  readonly sourceId: string;
  readonly physicalLife: number | null;
  readonly leaseId: string;
  readonly name: Named;
  readonly actor: boolean;
  readonly talkRequiresAi: boolean;
  readonly first: number;
  readonly count: number;
  readonly identity?: { knownName?: string; nickname?: string; revision: number };
  readonly subject?: ObserverSubject;
}
export interface NativeActorPerception {
  readonly worldId: string;
  readonly actorId: string;
  readonly at: number;
  readonly sightConfirmedThrough: number | null;
  readonly bodies: readonly NativeBodyBinding[];
  readonly cut: EvidenceCut;
}
/** This packet contains only the selected actor's first-person facts. The host
 * owns operational permission and its accepted-cut/current-privacy fence. */
export interface NativeActorSelf {
  readonly worldId: string;
  readonly actorId: string;
  readonly generation: string;
  readonly at: number;
  readonly sequence: number;
  readonly identity: Named & Pick<Entity, 'id' | 'appearance'>;
  readonly position: Position;
  readonly heading: number;
  readonly attributes: Parameters<typeof formatBodyContext>[0];
  readonly actionStatusLabels: readonly string[];
  readonly action: { readonly type: string } | null;
}

/** Current capture already contains the independently composed pose/detail.
 * Selecting presentation fields retains each clock and original source; it
 * never consults physical state to renew a stale value. */
export function nativeCurrentValue(facet: CapturedCurrentFacet): CurrentFacetValue {
  return {
    id: facet.id,
    role: facet.role,
    ...(facet.availability ? { availability: facet.availability } : {}),
    valueMeasuredFrom: facet.valueMeasuredFrom,
    valueMeasuredThrough: facet.valueMeasuredThrough,
    valueAcquiredAt: facet.valueAcquiredAt,
    confirmedThrough: facet.confirmedThrough,
    ...(facet.poseSupport ? { poseSupport: facet.poseSupport } : {}),
    ...(facet.descriptionSupport ? { descriptionSupport: facet.descriptionSupport } : {}),
    source: facet.original.source,
    value: facet.value,
  };
}

export function nativeBodyContext(self: NativeActorSelf): string {
  const names = new Map([[self.actorId, self.identity]]);
  const statuses = self.actionStatusLabels.map((label) =>
    renderNarrationParts(
      {
        parts: [
          { entityId: self.actorId, role: 'subject' },
          ' ',
          { subjectId: self.actorId, verb: 'be' },
          ` ${label.toLowerCase()}.`,
        ],
      },
      { names, selfId: self.actorId },
      'first',
    ),
  );
  return formatBodyContext(self.attributes, statuses, self.action?.type);
}

/** Feed real captured values to the existing NPC surroundings formatters.
 * Bindings are kept separately for current-source validation after the await. */
export function nativePerceivedEntities(self: NativeActorSelf, perception: NativeActorPerception) {
  const bindings = new Map<string, NativeBodyBinding>();
  const entries = perception.bodies.map((binding) => {
    const facets = perception.cut.current
      .slice(binding.first, binding.first + binding.count)
      .map(nativeCurrentValue);
    const body = facets.find(
      (
        facet,
      ): facet is CurrentFacetValue & {
        value: Extract<CurrentFacetValue['value'], { kind: 'body' }>;
      } => facet.value.kind === 'body',
    );
    if (!body) throw new Error('Captured current body is unavailable.');
    const handle = personalEntityHandle(
      { id: perception.worldId },
      perception.actorId,
      binding.sourceId,
      binding.leaseId,
    );
    bindings.set(handle, binding);
    const details = ['carried', 'pile-contents'].flatMap(
      (kind) => facets.find((facet) => facet.value.kind === kind) ?? [],
    );
    return {
      handle,
      text: formatPerceivedEntityText(
        body,
        details,
        namePhrase(binding.name, 'indefinite'),
        handle,
      ),
      relativeLocation: formatRelativeLocation(self.position, self.heading, body),
    };
  });
  return { entries, bindings };
}
