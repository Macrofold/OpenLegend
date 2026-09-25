import {
  BASE_ITEM_HANDLING,
  definitionPin,
  DEFAULT_STATUS_EFFECT_POLICY,
  DEFAULT_COGNITION_POLICY,
 */
export function upgradeWorldState(world: WorldState): void {
  // Correct the retired detector in place; preserve authored bindings and historical evidence.
  // docs/spatial-world.md#physical-contact
  const retired = new Set<string>();
  for (const sense of world.moduleManifest?.senses ?? []) {
    if ((sense.implementation as string) !== 'contact-proximity-v1') continue;
    retired.add(sense.id);
    sense.implementation = 'body-contact-v1';
    sense.radius = 0;
  }
  if (retired.size) {
    world.moduleManifest!.revision++;
    world.moduleManifest!.sensePins = world.moduleManifest!.senses.map(definitionPin);
    for (const entity of Object.values(world.entities)) {
      if (!entity.actor?.contacts) continue;
      for (const [id, contact] of Object.entries(entity.actor.contacts))
        if (retired.has(contact.senseId)) delete entity.actor.contacts[id];
    }
  }

  // Earlier pending requests had no explicit target/mode scope. Preserve the request;
  // a stored alternative retains its mode, otherwise queueing grants no replace authority.
