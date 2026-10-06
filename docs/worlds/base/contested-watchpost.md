# Broken Watchpost: occupants, equipment and aftermath

**Proposed content for batch 06, October 6, 2026; not implemented.** The [NPC combat participation rule](lifecycle-and-protection.md#npc-combat-participation) is owner-approved. This specific encounter composes that rule with ordinary people, items, knowledge and geometry. [CF01](../../maintainers/parallel-batch-06-rivals-and-contested-ground.md#cf01--armed-opponents-with-their-own-purpose) supplies character definitions and their decision consumers; [CF05](../../maintainers/parallel-batch-06-rivals-and-contested-ground.md#cf05--a-contested-ruin-and-a-victory-that-lasts) owns placement, finite stock and combined delivery.

## Optional place and two approaches

Broken Watchpost is a ruined, roofless ground-level store outside the starter clearing and essential food routes. Select its actual position against the existing supported landscape, separated from the first stag's encounter so entry does not require winning both fights together. It need not introduce a new landscape region. Use ordinary static solids with real occlusion and collision, visible broken walls and a normal ground container. No elevated floor, climb-only entrance, unmodeled water crossing or invisible arena boundary.

A direct entrance exposes the cache and its occupants to each other's ordinary sight. A longer side approach passes behind solid wall segments and reaches a separate walkable opening. Place at least one full-body cover segment against the supported actor/shot geometry, with clear space for movement and evasion on either side; visual wall height alone is insufficient proof. Both routes permit a living character to leave. Neither prevents an independently moving opponent from reaching the same location. The player can see the distinction from actual geometry without a minimap of hidden occupants.

An inspectable physical note at the earlier workshop describes the watchpost's position and reports that two people keep a store there. That is attributed authored information, not a live guarantee that they remain alive, present or fully stocked. PX03 owns actually learning the place; AV01 owns physical notes/method records. Exact positions, named references and stock have one source in the bundled-world authoring; server/model/client read that content.

## Occupants and motives

Use normal living biped bodies, ordinary needs/health and the usual NPC controller. Neither gets extra lives, privileged perception, scripted damage resistance or an uninterruptible combat turn. These new identities are separate from Ada and existing residents. Their stable authored backgrounds are personal information, not automatically public labels. Introduce them through ordinary perception and conversation.

- **Kest:** formerly traveled with a small supply caravan and now regards the watchpost stock as the remaining security from that life. Proud, blunt and possessive; values self-reliance and resents people treating another person's work as free supplies. Has experience using ordinary hand tools and a shield. This history does not instruct when to attack or mandate a refusal. Explicit starting goal: **“Keep our watchpost supplies available for Orin and me.”**
- **Orin:** traveled with Kest after losing a previous home; prizes independence and practical skill, dislikes feeling trapped, and takes pride in using a bow. Does not share Kest's attachment to the building itself. Explicit starting goal: **“Keep our equipment and our chance to make a life here.”** No hidden instruction to flee at a particular health value or to fire on every visitor.

Record those goals as authored scenario starting state, not as memories of events that the running world never produced or evidence of spontaneously generated motivations. Known equipment, acquired method knowledge, relationships and initial scene facts use their own authored sources; do not repeat them as engine prompt instructions. They can share a stated history without automatically reading each other's thoughts or pooling inventory.

Neither receives a hard-coded “enemy” decision routine. Ordinary context makes their actual goal, the perceived visitor/cache interaction, own body/equipment and feasible actions relevant. They may speak, attack, guard, evade, move or leave. No guaranteed pre-attack dialogue, forced peace after conversation, automatic revenge or attack-on-distance rule is selected. They must be capable of a genuinely hostile choice without making cruelty universal for every character.

## Finite equipment and reward

Install each physical item only once in a new authored start, through normal definitions/custody:

| Location/person | Initial contents                                                                                                       | Existing owner / purpose                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Kest            | One ordinary knife, one wooden shield, two prepared meals                                                              | Current knife and prepared food definitions; AV02's exact shield/compatible attachment. No copy of its stats here.                           |
| Orin            | One field bow, six compatible arrows, one ordinary knife, two prepared meals                                           | Admitted flex-launcher and arrow families. Bow occupies both hands under AV02; the knife is an ordinary carried alternative.                 |
| Ground cache    | One physical record of AV01's field-sling method, two cord, one prepared fiber, four stones and four compatible arrows | Reuse the exact already-authored method, its making supplies and AV01's learning action. A known method still leaves useful finite supplies. |

The **field bow** is an authored definition admitted through the existing flex-launcher family: 18 injury, 8-metre range, 0.75 base aim steadiness, with ordinary compatible arrows adding no bonus injury. Use [ranged counterplay](ranged-counterplay.md) for preparation, flight and release error, and the existing launcher recovery owner. Do not add another timing profile in encounter code. This is a known authored tool, not a claimed live invention. It must work after being taken by another actor and alongside a differently admitted compatible launcher.

The finite cache arrows make a recovered bow usable even if Orin spent his carried arrows; they are ordinary stock that another visitor may take first.

The bow offers reach and injury beyond the initial knife and AV01 field sling, at the cost of finite arrows and both hands. It is not a guaranteed drop separate from Orin's equipment: custody remains his until an ordinary transfer/drop/death changes it. Fired arrows stay spent. An empty bow is still the same physical tool; the interface must disclose the ammunition requirement and any genuinely known way to obtain it. This batch does not invent an automatic replenishment or purchase service.

The cache is physically reachable stock, not a quest reward gated by a kill count. Taking its contents follows ordinary custody and claims. Perceived taking may matter to the occupants' goals; it does not introduce a universal theft crime, reputation meter or automatic worldwide accusation. Guarding a place is a chosen use of existing actions, not a magic ownership force field.

## Defeat, withdrawal and return

All combat uses [lifecycle and protection](lifecycle-and-protection.md): Ada and these NPCs can die with persistent identity/remains and no automatic return. Human loss retains the existing corpse partition, return and scars. The player may leave; no door closes to require a fight. Losing a target means ordinary lost sight and remembered positions, not a pursuit leash that gives hidden coordinates.

If people withdraw, they retain actual bodies, possessions, goals and memories. If they die, the existing death/remains owner handles their possessions once. The destination remains changed after a save/load or player reincarnation. Do not recreate a dead occupant, refill a container, reset health or teleport a survivor home. Another visitor encounters what physically remains. No `victory` variable replaces those facts, and no successful encounter automatically changes relationships or schedules a camp raid.

## Maintained records

- [Feature journey](../../projects/parallel-batch-06-rivals-and-contested-ground-feature-spec.md#cf05--a-contested-ruin-and-a-victory-that-lasts) and [technical responsibilities](../../projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md#cf05--one-physical-destination-and-persistent-aftermath).
- [CF01–CF05 delivery](../../maintainers/parallel-batch-06-rivals-and-contested-ground.md) and [RC05/RC07 constraints](../../limits/parallel-batch-06-rivals-and-contested-ground.md#rc05--mortal-npcs-and-voluntary-help).
- Reused [rewarding expeditions](rewarding-expeditions.md), [shield defense](shield-defense.md), [combat](combat.md) and [player danger](player-danger.md) remain their rules' owners.
