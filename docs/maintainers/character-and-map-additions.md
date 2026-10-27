# Character and map additions — implementation tracker

**Status: scope specified; Spirit composition and critical-hit interaction remain open; implementation not started.** Mike decided on 2026-10-27 that Spirit, stats, more equipment slots, map markers and nicknames should be built, with design only for now. The [feature specification](../projects/character-and-map-additions-feature-spec.md) and [technical design](../projects/character-and-map-additions-tech-design.md) own behavior and mechanisms; the [limits inventory](../limits/character-and-map-additions.md) owns bounds. Design work checks none of the boxes below. Stages are independent unless a dependency is named.

## CMA01 — Nicknames

- [ ] Add the observer's nickname beside the known name. Introductions write only the known name; the owner's editor writes the nickname; display order is nickname, known name, bare label.

**Exit:** a nickname shows wherever the player sees that person, survives that person's self-introduction and a reload, and never reaches another player or an NPC.

## CMA02 — Map, minimap, markers and place notes

- [ ] Define world map art with its world bounds; give the bundled parchment map the bounds of the plan it was drawn over.
- [ ] Draw the Map tab and the minimap from that art with position, facing, known places and markers.
- [ ] Add owner-only markers and place notes in the editable-knowledge owner, and client search.

**Exit:** markers, notes and search survive a reload; an unknown place shows no name; nothing reaches another player. **Depends on:** the Gildmoss HUD and main panel from the [overhaul](../projects/interface-art-direction-overhaul-plan.md).

## CMA03 — Equipment slots, first wearables and Armour

- [ ] Add the ten human ports with presentation icons and the figure-with-slots Character view.
- [ ] Add item armour and stat modifiers, armour in the incoming-injury path, and the six first wearables.

**Exit:** wearing, conflict stowing and a real hit reduced by armour work through ordinary controls.

## CMA04 — Stats, calculated values and carrying weight

- [ ] Install the ten stats with bases, modifiers through contributions, and the hover's source list.
- [ ] Move every consumer in the technical design onto effective stats; scars become stat modifiers at today's strength.
- [ ] Give every portable bundled item a mass; apply the carrying limit in movement and pickup.
- [ ] Show Armour, Accuracy, Persuasion and weight in the owner's view; the Perception policy reads Perception. Update every Perception consumer and authored signature-seed admission atomically to the proposed 1–20 contract; do not mix it with the existing 0–100 normalization.

**Exit:** Stiff leg shows Speed 6 with today's 20% slowdown; an over-limit pickup is refused with a reason; NPCs follow the same rules. **Depends on:** CMA03 for armour and wearable modifiers.

## CMA05 — Spirit and Inspired

- [ ] Before implementation, define the qualitative-grief and bodily-discomfort inputs, the combination of concurrent causes, and reevaluation when effective Willpower changes; preserve existing emotion-record meanings.
- [ ] Add the derived attribute and the bundled Spirit rule over feelings, with bands, the cause list and the character's own context line.
- [ ] Add Inspired with its sustained-condition trigger.

**Exit:** a real loss lowers Spirit with its cause listed, joy raises it, Inspired appears and expires, and no one else sees either. **Depends on:** joy from [emotional physiology](emotional-physiology.md); CMA04 for Willpower.

## CMA06 — Critical hits

- [ ] Add one critical draw per hit from saved randomness inside combat's maximum-harm review, and settle its interaction with surprise attacks.

**Exit:** the critical rate and multiplier shown in Attributes match real hits in a controlled case. **Depends on:** CMA04 and the [combat owner](combat-and-threat-responses.md).
