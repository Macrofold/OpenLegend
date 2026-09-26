import { appraisePerceivedEvent, appraisalPin, type AppraisalPolicy } from '../../appraisals.js';
import type { WorldEvent, WorldState } from '../../types.js';

/** Fictional, opt-in vocabulary. Only compatibility damage reactions run by default;
 * kinship or descriptive personality prose never enrolls an actor in a feeling. */
export const BASE_APPRAISAL_POLICY: AppraisalPolicy = {
  definitions: [
    ...(['fear', 'discomfort'] as const).map((label) => ({
      id: `wilderness:${label}`,
      version: 1,
      implementation: 'appraisal-v1' as const,
      label,
      causes: ['perceived-event' as const],
      stacking: 'target' as const,
      value: { kind: 'scaled' as const, min: 0, max: 1 },
      lifetime: { kind: 'decays' as const, perHour: 0.25, bands: [0.5, 0.2, 0] },
      reflection: false,
    })),
    {
      id: 'wilderness:grief',
      version: 1,
      implementation: 'appraisal-v1',
      label: 'grief',
      causes: ['perceived-event', 'remembered'],
      stacking: 'cause',
      value: { kind: 'qualitative' },
      lifetime: { kind: 'persistent' },
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
      reflection: false,
    },
  ],
};

/** Preserve the bundled damage mapping, magnitude and explicit decay without new RNG
 * or duplicate evidence. This mapping is a wilderness rule, not a universal emotion law. */
export function appraiseEvent(world: WorldState, event: WorldEvent): void {
  if (!event.targetId || !world.entities[event.targetId]?.actor) return;
  const damage =
    event.type === 'shot' || event.type === 'struck'
      ? event.data?.['damage']
      : event.type === 'body-effect'
        ? -Number(event.data?.['healthDelta'] ?? 0)
        : 0;
  if (typeof damage !== 'number' || !Number.isFinite(damage) || damage <= 0) return;
  const label = event.type === 'shot' || event.type === 'struck' ? 'fear' : 'discomfort';
  const definition = world.moduleManifest.appraisals?.definitions.find(
    (entry) => entry.id === `wilderness:${label}`,
  );
  if (!definition) return;
  appraisePerceivedEvent(
    world,
    event,
    event.targetId,
    event.actorId ?? event.targetId,
    appraisalPin(definition),
    {
      kind: 'scaled',
      value: Math.min(1, damage / (world.entities[event.targetId]!.actor!.body?.maxHealth ?? 100)),
    },
  );
}
