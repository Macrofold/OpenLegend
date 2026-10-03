# Base-world typed-request wording

The Character panel's action box and NPC proposals first try a free, non-AI reading of typed requests. The engine owns that reader's grammar (splitting "A then B", amounts, pronouns, negations, questions and speech) and its phrasing for the engine's own action families. This page owns the bundled world's words that the reader uses; they live in [`worlds/base/typed-requests.ts`](../../../packages/domain/src/worlds/base/typed-requests.ts) and reach engine code only through `typedRequestVocabulary(world)`. Named stopping times are owned by [time](time.md#named-clock-times).

## Words for things

- **Heat sources:** "fire" and "campfire" name any visible heat source, whatever its own name, so "cook the meat at the fire" finds the banked campfire.
- **Beings:** the bundled species (human, deer, hare, construct, bird) plus "person", "people", "animal" and "being". A request that names one of these when none is in view gets a plain "not in view" answer; other unknown words go to AI interpretation instead of being refused.

## Requests without an action

- **Giving:** "give", "hand", "pass" and "offer" are not refused here; they reach ordinary grounding, which binds them to [offers](social.md#offering-and-accepting-possessions) the recipient must accept.
- **Tending a fire:** single requests such as "feed", "fuel" or "stoke the fire", "light the fire" or "put the fire out" ground to [fire care](survival.md#tending-the-campfire). The separately chosen [finite watch](camp-routines.md) now supports repeated care within explicit supply, time and fuel bounds; it is not indefinite tending. **Current integration defect:** the older typed vocabulary for "tend", "keep" or "mind" the fire still calls repeated fuelling unavailable. Until a named time it offers staying nearby as a disclosed revision; without a time it refuses. That is stale wording/routing, not the current capability boundary. [AC03.6](../../maintainers/action-capabilities.md#ac03--bounded-action-grounding) owns reconciliation with the installed activity compiler and required parameters. Do not infer a watch’s supply/budget, silently substitute passive waiting or add another executor.

## Examples

The Character panel shows "gather wood until I have 6", "follow the deer behind at 4 m" and "cook the meat at the fire then eat it", with the placeholder "Pick up 2 stones, or follow the deer". Examples that name stopping times would restate the world's clock names, so the placeholder avoids them.

Another world supplies its own list; the engine has no default wording of its own. There is no external world loader yet: the bundled list is the only one, and the accessor is the seam an installed world package would use.
