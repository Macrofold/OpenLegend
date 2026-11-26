import type { ExperiencePrivacy, WorldState } from '@open-legend/domain';
import { isSafeRecordId } from '@open-legend/domain';
import { z } from 'zod';

const actor = z.string().refine(isSafeRecordId);
// Fact aliases are structured source identities, not necessarily entity IDs.
const source = z
  .string()
  .refine(
    (value) => !!value.trim() && value !== 'prototype' && !Object.hasOwn(Object.prototype, value),
  );
const schema = z
  .object({
    forgotten: z.record(actor, z.array(source)),
    corrections: z.record(actor, z.record(source, actor)),
  })
  .strict();

/** One current-format operational privacy owner, outside gameplay rewind. */
export const privacyLedgerKey = (worldId: string) => `privacy-ledger:${worldId}`;
export const readPrivacyLedger = (value: unknown): ExperiencePrivacy | undefined =>
  value === undefined ? undefined : schema.parse(value);
export const worldPrivacy = (world: WorldState): ExperiencePrivacy => ({
  forgotten: world.experience?.forgotten ?? {},
  corrections: world.experience?.corrections ?? {},
});

/** A source may acquire a newer correction or become forgotten, but a save may
 * not silently restore its eligibility. Native owners still own its actual edits. */
export function assertPrivacyPreserved(world: WorldState, privacy: ExperiencePrivacy): void {
  assertPrivacyContinuation(worldPrivacy(world), privacy);
}

/** The writer checks the captured cut's privacy facts, without loading a world. */
export function assertPrivacyContinuation(
  current: ExperiencePrivacy,
  privacy: ExperiencePrivacy,
): void {
  for (const [actorId, ids] of Object.entries(privacy.forgotten)) {
    const forgotten = new Set(current.forgotten[actorId] ?? []);
    if (ids.some((id) => !forgotten.has(id)))
      throw new Error('Restore would resurrect forgotten evidence; reapply current privacy first.');
  }
  for (const [actorId, corrections] of Object.entries(privacy.corrections)) {
    const forgotten = new Set(current.forgotten[actorId] ?? []);
    if (
      Object.keys(corrections).some(
        (id) => !forgotten.has(id) && !current.corrections[actorId]?.[id],
      )
    )
      throw new Error('Restore would resurrect corrected evidence; reapply current privacy first.');
  }
}
