# First-playable Main world layout

| Status                | Current progress                                                                                                                                                              | Last updated |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Partially implemented | Complete Main is selected with empty hands, preserved scenarios, relocated Watchpost/animals and finite natural supplies. Whole-camp and encounter qualification remain open. | 2026-10-19   |

This is the single authored placement/starting-condition owner for the [complete first-playable design](../../projects/first-playable-world-feature-spec.md). Ordinary startup and Main creation use this template through the same initializer. The [content manifest](../../../packages/domain/src/worlds/base/config/first-playable-manifest.generated.json) records its actual selected entities, definition pins, positions, stock and declared custody. This is fresh construction, not a save migration or a custom/solo capacity increase.

## Premise and first view

The player arrives alone with ordinary clothing and familiar elementary methods beside a used wayside clearing. Four nearby people have their own belongings, concerns and past. The river, an old lookout and a distant workshop make a legible route into a larger woodland. Making a useful camp, choosing company and discovering what the other inhabitants actually do supplies the story. There is no prophecy, settlement assignment, required speech, forced rescue or initial alliance.

Start at `(11,13)` on actual terrain, day 1 08:00, fullness 100 and energy 100, ordinary full health, no injury, no carried food/tools/weapons/construction supplies and no player-owned camp. Clothing is the existing appearance/body presentation; it does not secretly include usable construction stock. Initial known methods are the exact [survival selection](first-playable-survival.md); installed methods not in that list must be learned or invented normally. The first contextual information explains food, Inspect/Gather/Make, current work/Stop and ordinary loss/Continue without a modal tutorial sequence or fabricated character voice.

## Ground and readable places

Select a finite supported extent **128 m × 112 m**, with the existing northwest 62 × 54 m terrain/river/ford/lookout support kept in place. Extend the same admitted terrain/rise construction, seed 73, into the east/south. Retain the existing river's northwest geometry and continue it along the west boundary; no required route crosses unsupported water. Do not scale existing coordinates, physical bodies, attack distances or clock rates to fit the larger artwork.

The original lookout, ramp, river fishing reaches, Mending Clearing, Reed-side Store, workshop, stag territory/refuge/cache and bird flight corridor stay at their existing coordinates. Their native support and clear approaches are protected during seeded rock placement. Decorative trees/shrubs remain decoration: they cannot become invisible barriers or harvest sources. New physical rock formations use the same native solids and their real sight/sound/movement behavior. The ground edge is visible/inspectable as the supported world's boundary, without an invented exit destination.

Reserve the three suggested camps below before random physical blockers, with 6 × 6 m contiguous dry support and no existing object body or known flight/route obstruction. A reservation guarantees usable terrain, not ownership, material, construction or safety. A nearby marker describes each site; Build offers its name only from the character’s own retained discovery. The suggested construction origin lies one section spacing southwest of the plot center, fitting the default four-metre layout within the reserved ground. The player can choose any other physically eligible permitted site. A preview must evaluate the actual layout, adjacent gate-slider space, body access and supports; the named suggestion is not an admission bypass.

| Site center                           | Meaningful advantage                                                                        | Meaningful cost                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `(26,20)` east of the clearing        | Close to initial food and lookout/workshop directions, with room beyond the preserved rocks | More exposed approaches and a longer walk to residents; resources still require trips |
| `(17,22.5)` western supplies approach | Near the Reed-side Store and the routes to poles, stone, fiber and the river                | Shared traffic on the western approach; supplies farther south still require trips    |
| `(44,51)` south meadow plateau        | Near southern exploration and multiple resource routes, with flat room for a chosen layout  | Farther from friendly residents and recovery hearth; nearer roaming wildlife routes   |

These centers were revised during design review against the existing `landscape.ts` fixed rock cells and `spatial.ts` support planes. The former `(22,18)` reservation overlapped rocks at `(21,17)` and `(22,17)`; `(17,29)` crossed the north–south rise between `z=26` and `z=34`; `(35,51)` occupied the east–west rise between `x=32` and `x=40`. Preserve those useful terrain features instead of flattening or deleting them. The selected six-metre reservations are respectively `x=23..29, z=17..23`, `x=14..20, z=19.5..25.5` and `x=41..47, z=48..54`. They lie wholly on existing flat support planes and avoid the inspected authored objects. This source review is not runtime placement or route evidence; the candidate checks below must still validate generated blockers, complete item/body bounds and the actual selected gate orientation.

No plot is marked 'safe'. Site tradeoffs are descriptions of real geography, never numerical bonuses. Show suggestions only through the player's known/perceived places and ordinary build preview, not unseen stock or an all-knowing risk score.

## Resource anchors

The coordinate below is a patch-group anchor. `resources.yaml` owns exact source rows, definitions, quantities, durations and local offsets. Use offsets in a deterministic small grid: first patch at anchor; successive distinct resources at `(x+1.5,z)`, `(x,z+1.5)`, `(x+1.5,z+1.5)` in the source's listed order. For more than four, advance a second 3 m-wide grid east. A compile-time source row supplies its exact offset; do not choose a new random valid place on each construction. Existing named source IDs retain their explicit positions below instead of being recreated as duplicates.

| Anchor            | x,z metres | Physical placement and disclosure                                                     |
| ----------------- | ---------- | ------------------------------------------------------------------------------------- |
| arrival           | 11,13      | Initial player; no pile of supplies                                                   |
| food-near         | 8,13       | Existing `berries-west`, now stocked according to survival                            |
| food-river        | 19,15      | Existing `berries-east`, now stocked according to survival                            |
| pole-copse        | 20,27      | Finite fallen poles/wood; decorative trees remain distinct                            |
| fiber-bank        | 9,38       | Dry supported bank; fiber and poles                                                   |
| stone-bank        | 17,31      | Stone and selected flint, not underwater                                              |
| clay-bank         | 7,43       | Flint and selected earth/binder source only if present in survival's actual catalogue |
| outer-forage-west | 20,61      | Finite second-trip food, on the same accessible bank                                  |
| outer-forage-east | 71,54      | Finite eastern food; potentially useful to residents independently                    |
| outer-fiber       | 48,72      | Additional actual fiber/poles                                                         |
| outer-materials   | 75,37      | Actual wood/stone/flint/poles; familiar to Watchpost residents                        |
| central-fiber     | 30,23      | Existing `woodland-patch-9`: 36 raw fiber; retained source, not an added stock row    |

Keep original `reeds` `(5,11)`, `reeds-east` `(19,12)`, `branches` `(8,8)` and `stones` `(5,15)` identities and finite resources per survival's table. Retain previously authored outer-wilderness patches as additional finite stock unless the survival table explicitly identifies the same existing source; do not sum an old source twice or replace unrelated resources with the new table. FPW's content manifest must distinguish retained rows, replaced quantities and new rows. Near berries become available; their previous zero quantity was an implementation setup, not a requirement to starve newcomers.

All new anchors and their offsets must be physically validated in seed 73 and in every offered seed before publication. Native route preparation must prove a dry route from arrival to both near foods, loose stone/wood/fiber, all three suggested camps and each optional destination's ordinary entrance. A pending proof remains incomplete; a failed seed is refused, not repaired by silently moving a signed-off object. Existing scenario routes remain covered by their own physical checks.

## People and distant Watchpost

Keep Ada `(13,12)`, Peacock Mercenary `(12,11)`, Mara `(9.5,13.5)` and Tavin `(9.5,18)` with exact actor identity, authored history, knowledge distinctions and their existing actual possessions. The [people profile](first-playable-people.md) selects richer identities and starting familiarity. NPCs begin at fullness/energy values selected there; do not impose the player's empty inventory on every inhabitant.

Move the **entire** Broken Watchpost cluster by `(x+56,z+5)`: its cache becomes `(104,28)`, Kest `(103,25)`, Orin `(106,26)`. Translate every wall, gap, local approach, stock placement and native place anchor together. Recompute ground/support through the ordinary initializer, and generate the old written directions from the same place definition so the document does not point to the abandoned coordinate. Keep all source names, actor identities, cache supplies, methods, shield/bow/arrows and history. Do not duplicate the two people at old and new sites.

Kest and Orin know the place and selected resource anchors as authored familiarity/reports, including the existing central fiber source at `(30,23)`, not present stock or player camp information. This supplies a useful western destination when their own making or accepted work actually needs fiber; it does not assign a visit or imply the source is currently full. [Roaming](first-playable-roaming.md) owns their opportunity inputs and independent choices. Distance creates separate lives and actual travel; it does not delay them until a staged encounter time.

## Existing starting kit: preserved content, changed custody

The former player kit is removed from **player starting custody**, as the empty-handed target requires. Preserve its useful material/definition coverage in one actual **Watchpost repair stock** ground area at `(103,29)`, with ordinary exposed material placement and exact prior definition/quantity identities in the opening manifest:

- Travel cloak 1, weather cloth 1, canopy posts 6, tall canopy posts 2 and cord 8 from the canopy scene.
- Stone tool 1, knife 1, prepared fiber 4, cord 3, wood 2 and stone 6 from the old ordinary player supply loop.

The combined cord is 11 actual units, not two accidental duplicate endowments. These are authored Watchpost possessions associated with Kest's current custody/ownership declaration, subject to ordinary access/transfer and the operational material-use grants. Do not put assembly materials inside an unsupported nested container. Keep enough physically clear ground for each long item; validate the exact slots alongside walls before publication.

This distant stock is an optional opportunity: a player might negotiate, receive a real gift, take an allowed physical possession with social consequences, or never reach it. There is no compulsory fight, guaranteed theft reaction or invisible quest lock. It is not necessary for the bootstrap or natural camp. Existing NPC inventories, lookout equipment case, workshop satchel, missing satchel/clues, stag cache and Watchpost's original cache remain separate and unchanged. No owner gets two copies because a stock row moved.

## Wildlife and recovery places

Preserve the original ordinary hares/deer, original flight bird and territorial stag placements. Relocate the existing three outer wolves to `(96,80)`, `(99,82)`, `(102,78)`, and two bears to `(88,96)`, `(58,94)`. Their stable entity identities remain the ones from the original initializer; the authored logical role maps resolve those IDs once. Do not create new wolves while leaving the old three active.

Wolf home anchor is `(99,82)`; familiar destinations `(71,54)`, `(48,72)`, `(75,37)` and the western pasture at `(26,36)`. The pasture is known hunting habitat, not knowledge that a particular prey animal is there. This gives real wildlife travel a reason to cross western resource routes while keeping arrival and target choice independent of player construction. Bears use homes at their initial positions and known foraging anchors `(71,54)`, `(48,72)`, `(20,61)` as physically reachable. Prey keep their existing local homes and receive the nearest two pasture anchors as authored habitat familiarity. Pasture anchors are `(26,36)`, `(50,58)`, `(81,74)`, each with the finite units defined in roaming. A familiar anchor is not a current route/stock guarantee. No animal receives a player-camp anchor.

FPW/RW qualification compares ordinary resource and habitat routes with each suggested camp's actual sight lines and approaches. Record contacts and no-contact sessions by site, the originating need/choice and the permitted evidence that led there. A connected navigation route alone does not prove that a destination is worth visiting or that an encounter happens at a good pace. Preserve legitimate quiet camps and successful avoidance; no minimum-contact quota may be satisfied by assigning an NPC the player's camp as a destination.

Retain the existing `campfire` entity at `(11,10)` as a **cold public Wayside hearth**, with zero fuel and no player ownership. Add a second cold public hearth at `(15,58)`. Both are physically present at opening, described as old rest places and usable under the existing cold-campfire Continue rule. They grant no heat, meal, stock or safe zone. A player-made hearth supplies another actual recovery option through the same rule. The [survival design](first-playable-survival.md) owns the no-usable-hearth recovery flow; there is no automatic emergency spawn.

## YAML source and content manifest

The intended `config/first-playable/opening.yaml` is versioned authored content compiled through the [shared configuration boundary](../../projects/first-playable-world-tech-design.md#authored-configuration-and-trusted-mechanics). It contains the extent/seed, exact initial actor fields, anchors, logical-role-to-identity bindings, support reservations, relative Watchpost transform, each retained/new/relocated source entry and its owner, initial learned-method references and public recovery hearths. It does not contain permission grants, imperative callbacks or action sequences.

The build produces a content manifest keyed by stable authored identity: definition pin, installer owner, actual position/support, quantity/custody when applicable and intended change classification. Installation asserts one writer per identity. Separate scenario installers consume the resolved layout rather than embedding the old coordinates or being copied into a second opening builder. Fresh Main creation and ordinary wilderness startup call the same initializer. Custom/solo and charge/touch diagnostic openings keep their deliberately selected scopes.

## Maintained records

- [FPW integration tasks](../../maintainers/first-playable-world.md), [FPV full acceptance](../../maintainers/first-playable-validation.md).
- [Feature specification](../../projects/first-playable-world-feature-spec.md), [technical design](../../projects/first-playable-world-tech-design.md), [limits](../../limits/first-playable-world.md).
- [Survival](first-playable-survival.md), [camp construction](editable-shelters.md), [people](first-playable-people.md), [roaming](first-playable-roaming.md).
