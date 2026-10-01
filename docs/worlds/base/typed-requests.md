# Base-world typed-request wording

The Character panel's action box and NPC proposals first try a free, non-AI reading of typed requests. The engine owns that reader's grammar (splitting "A then B", amounts, pronouns, negations, questions and speech) and its phrasing for the engine's own action families. This page owns the bundled world's words that the reader uses; they live in [`worlds/base/typed-requests.ts`](../../../packages/domain/src/worlds/base/typed-requests.ts) and reach engine code only through `typedRequestVocabulary(world)`. Named stopping times are owned by [time](time.md#named-clock-times).

## Words for things

- **Heat sources:** "fire" and "campfire" name any visible heat source, whatever its own name, so "cook the meat at the fire" finds the banked campfire.
- **Beings:** the bundled species (human, deer, hare, construct, bird) plus "person", "people", "animal" and "being". A request that names one of these when none is in view gets a plain "not in view" answer; other unknown words go to AI interpretation instead of being refused.

## Requests without an action

- **Giving:** "give", "hand", "pass" and "offer" are refused with "Handing things to someone else is not an action in this world yet; you can drop them nearby instead."
- **Tending a fire:** "tend", "feed", "fuel", "stoke", "keep" or "mind" the fire (optionally "burning", "going", "lit" or "alive") until a named time becomes a disclosed revision, staying by the heat source until that time, because no fuelling action exists yet (AC09). The player sees the omission "keep the fire fuelled: No action adds fuel to a fire in this world yet." and must accept it. Without a time it is refused with "Adding fuel to a fire is not an action in this world yet; nothing was started."

## Examples

The Character panel shows "gather wood until I have 6", "follow the deer behind at 4 m" and "cook the meat at the fire then eat it", with the placeholder "Pick up 2 stones, or follow the deer". Examples that name stopping times would restate the world's clock names, so the placeholder avoids them.

Another world supplies its own list; the engine has no default wording of its own. There is no external world loader yet: the bundled list is the only one, and the accessor is the seam an installed world package would use.
