import type { CurrentFacetValue, ObservedBody, ObservedBodyDetails } from '@open-legend/domain';
import type { EntityView } from '@open-legend/protocol';
import { permittedSourceHandle, type PersonalReferenceScope } from './entity-references.js';

export function projectObservedAppearance(
  kind: EntityView['kind'],
  detail: ObservedBodyDetails,
  description: string | undefined,
  directDescription: boolean,
  actor: boolean,
  portrait: EntityView['portrait'],
) {
  return {
    kind,
    detail: {
      ...detail,
      ...(description !== undefined && directDescription ? { description } : {}),
    },
    status: detail.outward.filter(Boolean).join(', '),
    ...(actor ? { portrait } : {}),
  };
}

export interface ObservedBodyViewInput {
  body: ObservedBody;
  kind: EntityView['kind'];
  portrait: EntityView['portrait'];
  status: string;
  bodySize: EntityView['bodySize'];
  facets: readonly CurrentFacetValue[];
  observedMoving: boolean;
  observationId: string;
  observerId: string;
  referenceScope: PersonalReferenceScope;
  sightConfirmedThrough: number | null;
  resourceArt: EntityView['art'];
  storage: EntityView['storage'];
}

/** The same received body reaches both runtime implementations' real player
 * view. Every input is an already permitted field or an operational reference;
 * this formatter cannot ask a physical world to fill an observation gap. */
export function projectObservedBody(input: ObservedBodyViewInput) {
  const { body, facets } = input;
  const pile = facets.find((facet) => facet.value.kind === 'pile-contents');
  const carried = facets.find((facet) => facet.value.kind === 'carried');
  const publicAttributes = facets.find((facet) => facet.value.kind === 'public-attributes');
  const health =
    publicAttributes?.value.kind === 'public-attributes'
      ? publicAttributes.value.attributes.find((attribute) => attribute.bodyHealth)?.value
      : undefined;
  const detailTime = (at: number) => (at === input.sightConfirmedThrough ? undefined : at);
  return {
    kind: input.kind,
    subtype: body.subtype ?? body.kind,
    ...(body.icon ? { icon: body.icon } : {}),
    ...(body.kind === 'resource' && body.subtype ? { art: input.resourceArt } : {}),
    ...(body.bodyPlan ? { bodyPlan: body.bodyPlan } : {}),
    statusEffects: body.effects ?? [],
    observedMoving: input.observedMoving,
    position: body.position,
    supportSurfaceId: body.supportSurfaceId,
    heading: body.heading,
    appearance: body.appearance,
    ...(input.portrait ? { portrait: input.portrait } : {}),
    radius: body.radius,
    bodySize: input.bodySize,
    actionAnimation: body.animation
      ? {
          ...body.animation,
          id: permittedSourceHandle(input.referenceScope, input.observerId, [
            'outward-action',
            input.observationId,
            body.animation.id,
          ]),
        }
      : null,
    status: input.status,
    ...(body.description ? { description: body.description } : {}),
    ...(publicAttributes?.value.kind === 'public-attributes'
      ? {
          attributes: publicAttributes.value.attributes,
          ...(typeof health === 'number' ? { health } : {}),
        }
      : {}),
    ...(body.quantity !== undefined ? { quantity: body.quantity } : {}),
    ...(body.heatLit !== undefined ? { heat: { lit: body.heatLit } } : {}),
    ...(body.remainsPhase === 'fresh' || body.remainsPhase === 'rotting'
      ? { bodyState: body.remainsPhase === 'fresh' ? ('dead' as const) : ('rotting' as const) }
      : {}),
    ...(pile?.value.kind === 'pile-contents' ? { contents: pile.value.items } : {}),
    storage: input.storage,
    ...(carried?.value.kind === 'carried'
      ? {
          observedCarried: {
            items: carried.value.items,
            measurementAt: detailTime(carried.valueMeasuredThrough),
            confirmedThrough: detailTime(carried.confirmedThrough),
          },
        }
      : {}),
  };
}
