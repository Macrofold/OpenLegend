import { BASE_APPRAISAL_POLICY } from './worlds/base/appraisals.js';
import { appraisalPin, type Appraisal } from './appraisals.js';
import { canonicalJson, contentLabel } from './events.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import type { WorldState } from './types.js';

/** Checked in-place conversion, before the current repository transaction replaces
 * positional rows. Preserve actual anchors; do not replay damage or recreate records
 * previously lost to strongest-16 retention. */
export function upgradeAppraisals(world: WorldState): void {
  world.moduleManifest.appraisals ??= structuredClone(BASE_APPRAISAL_POLICY);
  // Add the newly supported opt-in authoring policy without rewriting any existing pin.
  if (
    world.profile.id === 'grounded-wilderness' &&
    !world.moduleManifest.appraisals.definitions.some(
      (definition) => definition.id === 'wilderness:authored-grief',
    )
  ) {
    world.moduleManifest.appraisals.definitions.push(
      structuredClone(
        BASE_APPRAISAL_POLICY.definitions.find(
          (definition) => definition.id === 'wilderness:authored-grief',
        )!,
      ),
    );
    world.moduleManifest.revision++;
  }
  for (const [actorId, records] of Object.entries(world.appraisals ?? {})) {
    const entries = Object.entries(records);
    if (!Array.isArray(records) && entries.every(([id, record]) => record.id === id)) continue;
    const upgraded: Record<string, Appraisal> = {};
    for (const [position, raw] of entries) {
      const value = raw as unknown as {
        key: string;
        causeId: string;
        targetId: string;
        feeling: string;
        intensity: number;
        at: number;
        decayPerHour: number;
      };
      if (
        !hasRecordFields(value, [
          'key',
          'causeId',
          'targetId',
          'feeling',
          'intensity',
          'at',
          'decayPerHour',
        ]) ||
        !['fear', 'discomfort'].includes(value.feeling) ||
        !isSafeRecordId(value.causeId) ||
        !isSafeRecordId(value.targetId) ||
        value.key !== `${value.feeling}:${value.targetId}` ||
        !Number.isFinite(value.intensity) ||
        value.intensity < 0 ||
        value.intensity > 1 ||
        !Number.isFinite(value.at) ||
        value.at < 0 ||
        value.at > world.simTime ||
        value.decayPerHour !== 0.25
      )
        throw new Error('Cannot preserve an unknown legacy appraisal.');
      const definition = world.moduleManifest.appraisals.definitions.find(
        (entry) => entry.id === `wilderness:${value.feeling}`,
      );
      const expected = BASE_APPRAISAL_POLICY.definitions.find(
        (entry) => entry.id === definition?.id,
      );
      if (!definition || canonicalJson(definition) !== canonicalJson(expected))
        throw new Error('Legacy appraisal requires its exact compatibility definition.');
      const pin = appraisalPin(definition);
      const stackKey = canonicalJson([actorId, pin, value.targetId, null]);
      const id = `appraisal-${contentLabel(stackKey)}-${contentLabel(value.causeId)}`;
      if (upgraded[id]) throw new Error(`Legacy appraisal identity collision at ${position}.`);
      const forgotten =
        (world.experience?.forgotten[actorId] ?? []).includes(value.causeId) ||
        !!world.experience?.corrections?.[actorId]?.[value.causeId];
      const end = value.at + (value.intensity / value.decayPerHour) * 3600;
      const state = forgotten ? 'invalidated' : end <= world.simTime ? 'resolved' : 'active';
      const life = definition.lifetime;
      const nextAt =
        life.kind === 'decays'
          ? life.bands
              .map((band) => value.at + ((value.intensity - band) / value.decayPerHour) * 3600)
              .find((at) => at > world.simTime)
          : undefined;
      upgraded[id] = {
        id,
        actorId,
        revision: 1,
        definitionPin: pin,
        targetId: forgotten ? null : value.targetId,
        stackKey: forgotten ? '' : stackKey,
        state,
        cause: forgotten
          ? null
          : {
              kind: 'perceived-event',
              actorId,
              sourceId: value.causeId,
              occurrenceId: value.causeId,
              sourceVersion: `legacy:${contentLabel(canonicalJson(value))}`,
              coverage: 'retained native damage appraisal; original perspective may be cold',
              subjectIds: [value.targetId],
            },
        value: forgotten ? { kind: 'qualitative' } : { kind: 'scaled', value: value.intensity },
        lifetime: forgotten
          ? { kind: 'persistent' }
          : { kind: 'decays', anchorTime: value.at, anchorValue: value.intensity },
        createdAt: value.at,
        changedAt: value.at,
        ...(state === 'active' ? { nextAt } : {}),
        lastOperation: { id, body: '' },
        creationOperation: { id, body: '' },
      };
    }
    world.appraisals![actorId] = upgraded;
  }
}
