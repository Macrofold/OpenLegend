# Useful places in the base world

The current authored world names two useful places over its existing physical objects. [The authored definitions](../../../packages/domain/src/worlds/base/places.ts) are the source for their identity, wording, supported point, arrival condition, memory importance and story nomination. Engine layers consume those definitions rather than naming the world's sites themselves.

A character learns the **Camp hearth** by arriving near the campfire and seeing it. The learned description explains that a lit fire can cook raw meat and suggests inspecting it before choosing to cook or add fuel. A character learns **Riverside reeds** by reaching the reed patch and seeing it. Its description suggests gathering fibers, preparing them for cord/crafting, and inspecting the patch for remaining supply. Neither description asserts unseen current fuel or stock, and neither starts work.

Useful place observations use the existing protected memory importance so routine hourly consolidation retains a practical destination. Their separate authored story nomination makes them eligible for an introduction under the world's current selector. Eligibility does not guarantee a passage: existing frequency, source, capacity and age admission still apply. Continued presence produces no repeated observation; leaving and returning can refresh observed information while the admitted introduction stays deduplicated.

The native knife and supported family-compiled items also carry authored story nominations. Learning an item's description requires its exact permitted inventory inspection. A plain material, an inventory list refresh and an inaccessible bag's contents do not automatically earn an introduction. Individual objects retain individual identity; familiar homogeneous lots share their definition's introduction milestone while keeping exact lot identity in the evidence and action controls.

## Maintained records

- Implementation: [PX03](../../maintainers/parallel-batch-04-expeditions-and-exchange.md#px03--useful-discoveries-and-known-places), with [native and browser evidence](../../verification/useful-discoveries.md).
- Limits and constraints: [SP08](../../limits/spatial.md#sp08--static-named-places-and-private-known-places) owns static scope and read bounds; [CG15](../../limits/cognition.md#cg15--learned-places-from-retained-experience) owns the scoped retention choice; [story policy](../../narration-and-conversations.md#replaceable-story-selection) owns introduction admission.
- Related contracts: [physical place and Known places](../../spatial-world.md#static-named-places-and-known-places), [private evidence and forgetting](../../memory-architecture.md#personal-perspective-and-acquisition), and [items](items.md).
