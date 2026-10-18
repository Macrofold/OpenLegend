# Exploration, discovery and world design

**Status: In progress — focused Sea of Stars pass incorporated October 18, 2026. Topic: EXPLORE.** Wider source comparison remains open.

[Topic map](README.md) · [Coverage tracker](coverage.csv) · [Assessment records](assessment-records.md#sea-of-stars-focused-incorporation--october-18-2026) · [Sea of Stars dossier](../dossiers/sea-of-stars.md)

## Scope and questions

What makes a place invite curiosity, orientation and a worthwhile journey?

- Compare landmarks, routes, secrets, biome identity, encounter placement, density and environmental opportunities.
- How do authored and procedural places support discovery without repetitive filler or unreadable randomness?
- What should be signposted, mapped, gated or left unknown, and how do discoveries change later choices?
- How can visual novelty arise from a place's ecology, materials, history and use rather than from unrelated asset accumulation?

## Ownership boundary

EXPLORE owns the arrangement and discovery of places. Moving through them belongs to TRAVEL, interpreting clues to KNOW, their history to LORE, and their final visual execution to PRESENT. A beautiful landmark does not grant traversal, knowledge or a mechanical interaction by itself.

## Focused evidence — Sea of Stars

Sea of Stars repeatedly gives regions recognizable large forms, routes and material identities, then connects exploration to authored tools, puzzles, side activities and later revisits. The [G178 dossier](../dossiers/sea-of-stars.md) documents climbing, swimming, grappling, wind-driven object movement, shrines, fishing, Mirth, Wheels, artifacts and late-world access. The [art study](../../../../art-direction/research/sea-of-stars/README.md) shows how distinctive roots, coastlines, water, structures and light help those places remain recognizable.

The useful evidence is not “make every region fantastical.” The game is heavily authored and sometimes compressed for navigation. OpenLegend needs physically coherent scale and persistent world state. The transfer is the relationship between recognizable form, a plausible local cause, and something worth doing there.

## Consolidated lessons and tradeoffs

### EXPLORE-L001 — A memorable feature should also orient or explain the place

A large root, unusual watercourse, ruined work site or distinctive shelter can be a landmark, route clue and environmental story at once. Novelty is strongest when the player can understand how the feature relates to terrain, growth, weather or use.

OpenLegend should prefer such relationships to isolated decorative landmarks. The world owner still decides whether the feature is climbable, harvestable, dangerous or merely visible.

### EXPLORE-L002 — Variety comes from relationships, not asset count

Sea of Stars' regions feel different through combinations of landform, palette, materials, traversal, inhabitants and activity. The same principle can serve a systemic world without giving every location a unique prop library.

For OpenLegend, regional identity should survive reuse: wet versus dry ground, open versus sheltered vegetation, settlement adaptations, resources, routes and histories can recombine common families. Repetition is less harmful when the relationship changes; unrelated novelty everywhere can make the world incoherent and expensive.

### EXPLORE-L003 — Discovery is stronger when it changes another worthwhile activity

Sea of Stars links exploration to new combinations, services, recipes, lore, traversal and settlement facilities. That makes a discovery more than a completion counter. Its true-ending structure also supplies a counterexample: optional activities can feel compulsory when narrative closure is placed behind broad collection requirements.

OpenLegend should name what a discovery lets the player understand, attempt, obtain, revisit or change. A peaceful beautiful place can remain its own reward; not every destination needs combat loot. When progression is attached, it should add a useful option rather than merely inflate a checklist.

## Current OpenLegend baseline and existing design owners

[Gameplay priorities](../../../../docs/repertoires/gameplay-priorities.md) already require worthwhile destinations, useful consequences and reasons for another session. [ND18](../../../../docs/maintainers/needs-design.md#nd18--first-encounter-narration-for-places-and-inventory-items) owns broader first-encounter narration/discovery families. Spatial behavior, knowledge, authored world content and 3D presentation retain their existing owners.

The Sea of Stars art preference therefore does not need a separate exploration project. It sharpens what a good destination should look and feel like while leaving mechanics with those owners.

## Complete situations and cross-topic consequences

| Situation | Discovery value | Boundary |
| --- | --- | --- |
| The player sees a huge fallen tree across a river | It orients the route and makes the local ecology memorable before inspection. | Art cannot silently make the trunk climbable or reveal hidden occupants. |
| A fishing place is found near a settlement | The place can supply food, knowledge, leisure or later services if those systems actually exist. | A completion counter alone does not make the place worthwhile. |
| An old artifact points toward a destination | The object can connect LORE and KNOW to a new journey. | Possessing the object does not grant knowledge the character has not inspected or learned. |
| The player returns after people changed the site | Familiar materials and landmarks preserve identity while actual construction, damage or use show history. | Decorative variation cannot claim a world event occurred. |

## Open questions and missing evidence

The focused pass does not compare procedural exploration, very large persistent maps, multiplayer discovery races or autonomous settlement change. Those need other sources and OpenLegend runtime evidence.

The useful next research comparisons are already in the candidate routes: Outer Wilds for knowledge-driven access, Subnautica for environment/capability progression, and Breath of the Wild for systemic traversal. No new implementation project follows merely from this focused incorporation.

## Design subtopics

No new EXPLORE-specific design ID is needed from this source. The actionable consequences route to existing ND18, gameplay priorities, world/spatial owners and the art-production specifications.
