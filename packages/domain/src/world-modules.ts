  return typeof value === 'number' && Number.isFinite(value);
}
// Validate supported definitions and their dependencies, not a small collection-count quota.
// docs/architecture.md#content-counts-and-request-limits
export function validateModuleManifest(manifest: WorldModuleManifest): void {
  object(manifest, [
    manifest.revision < 1 ||
    !Array.isArray(manifest.definitions) ||
    !Array.isArray(manifest.pins) ||
    manifest.pins.length !== manifest.definitions.length
  )
    throw new Error('Unsupported world module manifest.');
  if (
    !Array.isArray(manifest.senses) ||
    !Array.isArray(manifest.sensePins) ||
    manifest.sensePins.length !== manifest.senses.length ||
      !SENSE_IMPLEMENTATIONS.includes(sense.implementation) ||
      !finite(sense.radius) ||
      (sense.implementation === 'body-contact-v1'
        ? sense.radius !== 0
        : sense.radius <= 0 || sense.radius > 32)
    )
      throw new Error('Unsupported sense definition.');
      !Array.isArray(d.schema.choices) ||
      d.schema.choices.length < 1 ||
      d.schema.choices.some((c) => !boundedText(c, 64)) ||
      new Set(d.schema.choices).size !== d.schema.choices.length ||
    if (
      e.actor?.senses &&
      (new Set(e.actor.senses).size !== e.actor.senses.length ||
        e.actor.senses.some((id) => !world.moduleManifest!.senses.some((s) => s.id === id)))
    )
      throw new Error('Missing actor sense binding.');
    for (const contact of Object.values(e.actor?.contacts ?? {})) {
      object(contact, ['id', 'senseId', 'detail', 'enteredAt', 'changedAt']);
        !boundedText(contact.id, 100) ||
        !world.moduleManifest.senses.some(
          (s) => s.id === contact.senseId && s.implementation === 'body-contact-v1',
        ) ||
        !['present', 'moving'].includes(contact.detail) ||
        throw new Error('Invalid saved contact episode.');
    }
    for (const [id, state] of Object.entries(e.actor?.attributes ?? {})) {
      const d = attributeDefinition(world, id);
