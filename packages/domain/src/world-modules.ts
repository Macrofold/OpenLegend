  return typeof value === 'number' && Number.isFinite(value);
}
export function validateModuleManifest(manifest: WorldModuleManifest): void {
  object(manifest, [
    manifest.revision < 1 ||
    !Array.isArray(manifest.definitions) ||
    manifest.definitions.length > 32 ||
    !Array.isArray(manifest.pins) ||
    manifest.pins.length !== manifest.definitions.length
  )
    throw new Error('Unsupported or unbounded world module manifest.');
  if (
    !Array.isArray(manifest.senses) ||
    manifest.senses.length > 8 ||
    !Array.isArray(manifest.sensePins) ||
    manifest.sensePins.length !== manifest.senses.length ||
      !SENSE_IMPLEMENTATIONS.includes(sense.implementation) ||
      !finite(sense.radius) ||
      sense.radius <= 0 ||
      sense.radius > (sense.implementation === 'contact-proximity-v1' ? 1 : 32)
    )
      throw new Error('Unsupported sense definition.');
      !Array.isArray(d.schema.choices) ||
      d.schema.choices.length < 1 ||
      d.schema.choices.length > 16 ||
      d.schema.choices.some((c) => !boundedText(c, 64)) ||
      new Set(d.schema.choices).size !== d.schema.choices.length ||
    if (
      e.actor?.senses &&
      (e.actor.senses.length > 8 ||
        new Set(e.actor.senses).size !== e.actor.senses.length ||
        e.actor.senses.some((id) => !world.moduleManifest!.senses.some((s) => s.id === id)))
    )
      throw new Error('Missing actor sense binding.');
    if (Object.keys(e.actor?.contacts ?? {}).length > 32)
      throw new Error('Too many active contacts.');
    for (const contact of Object.values(e.actor?.contacts ?? {})) {
      object(contact, ['id', 'senseId', 'detail', 'enteredAt', 'changedAt']);
        !boundedText(contact.id, 100) ||
        !world.moduleManifest.senses.some(
          (s) => s.id === contact.senseId && s.implementation === 'contact-proximity-v1',
        ) ||
        !['present', 'moving'].includes(contact.detail) ||
        throw new Error('Invalid saved contact episode.');
    }
    if (e.actor?.attributes && Object.keys(e.actor.attributes).length > 32)
      throw new Error('Too many actor attributes.');
    for (const [id, state] of Object.entries(e.actor?.attributes ?? {})) {
      const d = attributeDefinition(world, id);
