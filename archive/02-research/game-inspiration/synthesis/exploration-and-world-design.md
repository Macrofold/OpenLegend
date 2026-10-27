# Exploration, discovery and world design

**Status: In progress — two scoped game contributions. Topic: EXPLORE.** Sea of Stars was incorporated October 18, 2026; Elden Ring was incorporated October 25, 2026 using sources through October 24. Wider source comparison remains open.

[Topic map](README.md) · [Coverage tracker](coverage.csv) · Assessments: [Sea of Stars](assessment-records.md#sea-of-stars-focused-incorporation--october-18-2026), [Elden Ring](assessment-records.md#explore--elden-ring) · Dossiers: [Sea of Stars](../dossiers/sea-of-stars.md), [Elden Ring](../dossiers/elden-ring.md)

## Scope and questions

What makes a place invite curiosity, orientation and a worthwhile journey?

- Compare landmarks, routes, secrets, biome identity, encounter placement, density and environmental opportunities.
- How do authored and procedural places support discovery without repetitive filler or unreadable randomness?
- What should be signposted, mapped, gated or left unknown, and how do discoveries change later choices?
- How can visual novelty arise from a place's ecology, materials, history and use rather than from unrelated asset accumulation?

## Ownership boundary

EXPLORE owns the arrangement and discovery of places. Moving through them belongs to TRAVEL, interpreting clues to KNOW, their history to LORE, and their final visual execution to PRESENT. A beautiful landmark does not grant traversal, knowledge or a mechanical interaction by itself.

<a id="focused-evidence--sea-of-stars"></a>

## Focused comparison

Sea of Stars repeatedly gives regions recognizable large forms, routes and material identities, then connects exploration to authored tools, puzzles, side activities and later revisits. The [G178 dossier](../dossiers/sea-of-stars.md) documents climbing, swimming, grappling, wind-driven object movement, shrines, fishing, Mirth, Wheels, artifacts and late-world access. The [art study](../../../../art-direction/research/sea-of-stars/README.md) shows how distinctive roots, coastlines, water, structures and light help those places remain recognizable.

The useful evidence is not “make every region fantastical.” The game is heavily authored and sometimes compressed for navigation. OpenLegend needs physically coherent scale and persistent world state. The transfer is the relationship between recognizable form, a plausible local cause, and something worth doing there. Elden Ring extends this comparison through the route choices, local dungeon rules and consequential discoveries below; both games' authored spaces leave procedural construction unproven.

## Consolidated lessons and tradeoffs

<a id="explore-l001"></a>

### EXPLORE-L001 — A memorable feature should also orient or explain the place

A large root, unusual watercourse, ruined work site or distinctive shelter can be a landmark, route clue and environmental story at once. Novelty is strongest when the player can understand how the feature relates to terrain, growth, weather or use.

OpenLegend should prefer such relationships to isolated decorative landmarks. The world owner still decides whether the feature is climbable, harvestable, dangerous or merely visible.

Elden Ring adds a spatial test: its Erdtree, partial map information and layered entrances let players form intentions before receiving a task. Stormveil's front gate and side breach make architecture communicate different preparations and risks. The expansion's visible but indirectly accessible plateaus can make finding a connection rewarding; apparent proximity becomes frustrating when the route cannot be inferred or remembered. See the [landmark and route cases](../dossiers/elden-ring/02-world-exploration-and-narrative.md#2-landscape-as-an-information-system) and [expansion comparison](../dossiers/elden-ring/02-world-exploration-and-narrative.md#3-the-expansions-different-spatial-problem). For OpenLegend, follow the attraction through the usable entrance: what invites investigation, what suggests an approach, and what remains an interesting question?

<a id="explore-l002"></a>

### EXPLORE-L002 — Variety comes from relationships, not asset count

Sea of Stars' regions feel different through combinations of landform, palette, materials, traversal, inhabitants and activity. The same principle can serve a systemic world without giving every location a unique prop library.

For OpenLegend, regional identity should survive reuse: wet versus dry ground, open versus sheltered vegetation, settlement adaptations, resources, routes and histories can recombine common families. Repetition is less harmful when the relationship changes; unrelated novelty everywhere can make the world incoherent and expensive.

Elden Ring's [local dungeon rules](../dossiers/elden-ring/02-world-exploration-and-narrative.md#26-repeated-architecture-can-support-different-rules) test this sharply: Sainted Hero's Grave makes drawing enemies into light decisive; Leyndell Catacombs turns similar-looking rooms into an orientation puzzle and fire pillars into lifts. Familiar architecture supports different decisions. This does not cancel repetition complaints: a new rule can also demand more attention than its payoff earns. OpenLegend should ask whether supported cover, hazards, inhabitants and uses change the journey, without promising a special mechanic for every ruin.

<a id="explore-l003"></a>

### EXPLORE-L003 — Discovery is stronger when it changes another worthwhile activity

Sea of Stars links exploration to new combinations, services, recipes, lore, traversal and settlement facilities. That makes a discovery more than a completion counter. Its true-ending structure also supplies a counterexample: optional activities can feel compulsory when narrative closure is placed behind broad collection requirements.

OpenLegend should name what a discovery lets the player understand, attempt, obtain, revisit or change. A peaceful beautiful place can remain its own reward; not every destination needs combat loot. When progression is attached, it should add a useful option rather than merely inflate a checklist.

Elden Ring makes [exploration an alternative response to difficulty](../dossiers/elden-ring/02-world-exploration-and-narrative.md#1-the-central-design-achievement): leave an obstacle, acquire capability or understanding elsewhere, and return with a changed plan. That freedom weakens when another destination offers only an irrelevant reward or familiar repetition. Its [object and relationship cases](../dossiers/elden-ring/02-world-exploration-and-narrative.md#5-quest-case-studies-what-the-player-actually-does), including Alexander and Jar-Bairn's inheritance, also show how an acquisition can matter to another person. The attraction can be practical expression, attachment or a changed understanding of a place; a discovery need not become a repeatable grind to justify the trip.

## Current OpenLegend baseline and existing design owners

[Gameplay priorities](../../../../docs/repertoires/gameplay-priorities.md) already require worthwhile destinations, useful consequences and reasons for another session. [ND18](../../../../docs/maintainers/needs-design.md#nd18--first-encounter-narration-for-places-and-inventory-items) owns broader first-encounter narration/discovery families. Spatial behavior, knowledge, authored world content and 3D presentation retain their existing owners.

These two contributions sharpen existing destinations without creating a separate exploration project. [AV01](../../../../docs/maintainers/parallel-batch-05-adventure-defense-and-home.md#av01--rewarding-expeditions) delivers physical clues, finite rewards, spear use, exact method learning and subsequent manufacture/use with real materials. Uncoached enjoyment, balance and the final player-facing equipment comparison remain unqualified. [CF05](../../../../docs/maintainers/parallel-batch-06-rivals-and-contested-ground.md#cf05--a-contested-ruin-and-a-victory-that-lasts) supplies two routes, real cover, finite stock and persistent aftermath; its separate qualified episodes do not establish the full ordinary visual encounter with independent opposition and willing help.

Use those journeys to observe whether players choose to use a discovery, attempt another approach or return for their own reason. The [discoverable-history authoring guide](../../../../docs/narrative/authoring-discoverable-history.md) connects place, object and encounter while preserving uncertain history and legible present actions. A later visitor can find shelter, traces or changed relationships after the original reward has gone; shared custody must remain real. The [Elden Ring transfer chapter](../dossiers/elden-ring/05-design-synthesis-and-openlegend.md) retains the broader proposals and their limits.

## Complete situations and cross-topic consequences

| Situation | Discovery value | Boundary |
| --- | --- | --- |
| The player sees a huge fallen tree across a river | It orients the route and makes the local ecology memorable before inspection. | Art cannot silently make the trunk climbable or reveal hidden occupants. |
| A fishing place is found near a settlement | The place can supply food, knowledge, leisure or later services if those systems actually exist. | A completion counter alone does not make the place worthwhile. |
| An old artifact points toward a destination | The object can connect LORE and KNOW to a new journey. | Possessing the object does not grant knowledge the character has not inspected or learned. |
| The player returns after people changed the site | Familiar materials and landmarks preserve identity while actual construction, damage or use show history. | Decorative variation cannot claim a world event occurred. |

## Open questions and missing evidence

These scoped contributions do not establish procedural exploration quality, very large persistent-map behavior, multiplayer discovery races or autonomous settlement change. Those need other sources and OpenLegend runtime evidence.

The useful next research comparisons are already in the candidate routes: Outer Wilds for knowledge-driven access, Subnautica for environment/capability progression, and Breath of the Wild for systemic traversal. No new implementation project follows merely from this focused incorporation.

## Design subtopics

No new EXPLORE-specific design ID is needed from these contributions. The actionable consequences route to existing ND18, gameplay priorities, world/spatial owners and the art-production specifications.
