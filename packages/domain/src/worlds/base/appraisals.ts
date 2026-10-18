import { entityGet } from '../../entity-collection.js';
import { appraisePerceivedEvent, appraisalPin, type AppraisalPolicy } from '../../appraisals.js';
import type { WorldEvent, WorldState } from '../../types.js';

/** Fictional vocabulary. Fear/anger are personal interpretations; discomfort retains
 * its native bodily cause. Descriptive personality never installs a feeling. */
export const BASE_APPRAISAL_POLICY: AppraisalPolicy = {
  definitions: [
    ...(['fear', 'anger'] as const).map((label) => ({
      id: `wilderness:${label}`,
      version: label === 'fear' ? 2 : 1,
      implementation: 'appraisal-v1' as const,
      label,
      causes: ['perceived-event' as const, 'remembered' as const],
      stacking: 'target' as const,
      value: { kind: 'scaled' as const, min: 0, max: 1 },
      lifetime: {
        kind: 'decays' as const,
        perHour: label === 'fear' ? 0.25 : 0.125,
        bands: [0.5, 0.2, 0],
      },
      decision: true,
      reflection: true,
    })),
    {
      id: 'wilderness:discomfort',
      version: 1,
      implementation: 'appraisal-v1',
      label: 'discomfort',
      causes: ['perceived-event'],
      stacking: 'target',
      value: { kind: 'scaled', min: 0, max: 1 },
      lifetime: { kind: 'decays', perHour: 0.25, bands: [0.5, 0.2, 0] },
      decision: false,
      reflection: false,
    },
    {
      id: 'wilderness:grief',
      version: 1,
      implementation: 'appraisal-v1',
      label: 'grief',
      causes: ['perceived-event', 'remembered'],
      stacking: 'cause',
      value: { kind: 'qualitative' },
      lifetime: { kind: 'persistent' },
      decision: false,
      reflection: true,
    },
    // Separate admission policy preserves existing experience-linked grief pins.
    {
      id: 'wilderness:authored-grief',
      version: 1,
      implementation: 'appraisal-v1',
      label: 'grief',
      causes: ['authored'],
      stacking: 'cause',
      value: { kind: 'qualitative' },
      lifetime: { kind: 'persistent' },
      decision: false,
      reflection: false,
    },
    {
      id: 'wilderness:restlessness',
      version: 1,
      implementation: 'appraisal-v1',
      label: 'restlessness',
      causes: ['condition'],
      stacking: 'cause',
      value: { kind: 'qualitative' },
      lifetime: { kind: 'condition-sustained' },
      decision: false,
      reflection: false,
    },
    {
      id: 'wilderness:calm',
      version: 1,
      implementation: 'appraisal-v1',
      label: 'calm',
      causes: ['disposition'],
      stacking: 'cause',
      value: { kind: 'qualitative' },
      lifetime: { kind: 'expires', seconds: 30 },
      decision: false,
      reflection: false,
    },
  ],
};

/** Bodily discomfort is immediate. Fear/anger wait for personal interpretation;
 * ordinary contact evidence and urgency never wait for that judgment. */
export function appraiseEvent(world: WorldState, event: WorldEvent): void {
  if (
    event.type !== 'body-effect' ||
    !event.targetId ||
    !entityGet(world.entities, event.targetId)?.actor
  )
    return;
  const damage = -Number(event.data?.['healthDelta'] ?? 0);
  if (typeof damage !== 'number' || !Number.isFinite(damage) || damage <= 0) return;
  const definition = world.moduleManifest.appraisals?.definitions.find(
    (entry) => entry.id === 'wilderness:discomfort',
  );
  if (!definition) return;
  const subject = event.actorId ?? event.targetId;
  appraisePerceivedEvent(world, event, event.targetId, subject, appraisalPin(definition), {
    kind: 'scaled',
    value: Math.min(
      1,
      damage / (entityGet(world.entities, event.targetId)!.actor!.body?.maxHealth ?? 100),
    ),
  });
}
