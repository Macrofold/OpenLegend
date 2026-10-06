# Batch 06 — Rivals and contested ground

| Status  | Current progress                                                                                                                                                         | Last updated |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Blocked | Five priorities are identified and two independent assignments are specified; NPC combat participation needs the owner's answer before the other three can be finalized. | 2026-10-06   |

## Purpose and planning horizon

Make venturing out create conflict worth engaging with: an opponent wants something, the player can read and counter an attack, a companion can make an independent choice, and winning an objective changes a later visit. This is proposed batch **06**, after [batch 05](parallel-batch-05-adventure-defense-and-home-feature-spec.md). Earlier allocations already have numbers; none needs renaming.

At Mike's request, **assume all previously suggested assignments are delivered when deciding what to select next**. That is a planning horizon, not evidence that their branches have merged. The [dependency ledger](parallel-batch-06-rivals-and-contested-ground-tech-design.md#open-prerequisites) records actual readiness separately. No previous task is marked complete by this allocation.

The request authorizes planning documents and future implementation prompts, not implementation or task dispatch. The independent mechanics below are proposals, not current behavior. The three dependent assignments remain unfinished rather than becoming design-only work.

## Why this batch

After the earlier batches, the game would offer a dangerous animal, shields, usable equipment, rewarding exploration, fishing, a home, practice, barter and voluntary outings. Another food source or maintenance chore adds less than an opponent who contests what the player wants. We should develop conflict through reusable actions and real people, not a scripted battle whose conclusion ignores the world.

The selection follows [gameplay priorities](../repertoires/gameplay-priorities.md) and [whole-game coverage](../repertoires/coverage.md). Core entries are alternatives to combine into worthwhile play, not a requirement to implement every weapon or every opponent. The five assignments deliberately concentrate on conflict; the planning categories are not staffing quotas.

| Assignment                                       | Intended experience                                                                                                                       | Repertoire priority and scope                                                                                                                          | Why now / burden                                                                                                                                                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CF01 — Armed opponents with their own purpose    | Meet a speaking opponent who values a position or prize and can fight, withdraw or refuse cooperation using real equipment and knowledge. | **Core:** CR-122 defender, CR-123 ranged opponent, RSH-144 genuinely hostile rival; CB-112 is inspiration, not mandatory lore or a copied character.   | Distinct human opposition follows the animal encounter. Requires NPC participation policy and supplied ordinary character decisions; a biography alone is insufficient.                                                                |
| CF02 — Aim, projectiles and real cover           | Aim without firing, release one finite projectile, and hit or miss because of its actual path, moving target and obstacles.               | **Core:** CR-001, CR-002, CR-061, CR-242; bounded straight projectile flight, not every ballistic behavior.                                            | Current ranged attacks only target animals and resolve an accuracy draw directly into injury. Real flight and cover supply counterplay to future ranged opponents. Higher mechanical and persistence cost than another weapon variant. |
| CF03 — Evade and exploit an opening              | Make a deliberate short movement out of an attack and choose a normal attack, guard or escape during the opponent's visible recovery.     | **Core:** CR-047, CR-057; complements batch 05's CR-046 shield.                                                                                        | Provides an active answer other than receiving damage or walking away. No invulnerability frame, new stamina meter or compulsory reflex tutorial.                                                                                      |
| CF04 — A companion who can help in a fight       | Ask a willing companion for help, see them choose what to do, and permit them to refuse or withdraw.                                      | **Complete:** CR-058 and RSH-148's independent helper; no forced formation or taking another actor's turn.                                             | Makes the earlier shared outing matter under pressure. Lethality/target rules must be settled before specifying consent, protection and withdrawal.                                                                                    |
| CF05 — A contested ruin and a victory that lasts | Approach an occupied destination by different routes, obtain a finite useful reward, leave, and return to the actual aftermath.           | **Core:** AD-062, AD-181, CR-213, CR-225; **Complete** AD-233 and CR-134 are candidates for later witnessed consequences, not automatic extra systems. | Converts combat improvements into a complete activity. NPC participation determines occupants, rival consequences and acceptable encounter failure. No respawning prize or automatic erasure of victory.                               |

Entry owners: [combat](../repertoires/combat-rescue.md), [adventure](../repertoires/adventure-discovery.md), [relationships](../repertoires/relationships.md), [characters](../repertoires/characters-backstories.md). The [toll tower](../repertoires/combinations.md#the-toll-tower-at-dawn) is an existing combined example, not permission to add regional government, destruction or a tribute system to this batch.

### Alternatives considered

- **Another predator or another ordinary weapon:** viable, but the earlier stag and shield/weapon work already represent that first loop. Different intent and tactical responses add more than another health pool.
- **Tolls, surrender, raids on homes and nonlethal capture:** attractive conflict, but introduce payment-for-service, custody, property or indirect-harm choices not settled by existing barter or player death. Do not quietly include them in an enemy task. DIP-034 remains Core but is not a prerequisite for the selected combat/occupied-site increment.
- **Recent DG12 invention reuse:** worthwhile, but a library round trip does not directly add opposition. Existing admitted inventions should work through CF02; portable publication is separate.
- **DG13 shelter and DG14 competence:** already selected in batch 05, assumed delivered for this choice. Do not repeat them or require grinding before fighting.
- **DG15 story perspective and DG11 optional study:** do not beat a new playable activity for this request. Their unresolved adoption/qualification remains with their owners.
- **Medical rescue, ghosts or general NPC revival:** retain existing death and recovery requirements. These expansions need their own decisions and are not disguised prerequisites of every attack.
- **Established-system defects and scale:** the first-threat report retains a dense-scene capacity failure. New enemy work must address regressions it causes and measure its selected encounter, without claiming a small fight qualifies populated worlds or allocating a speculative performance rewrite. No newly reproduced integrity defect was found in this documentation investigation; this is not a repository-wide bug audit.

## Decision required before completing the allocation

**May hostile NPCs fight and permanently kill other NPCs, including Ada, under the existing death rules?** The current first-threat policy targets players and deliberately excludes residents. Existing rules permit persistent NPC death and require human review of a potentially lethal attack, but they do not settle this new opponent/companion targeting policy.

Recommendation: allow the same physical combat for eligible NPCs, preserve observable preparation and opportunities to retreat, and preserve real death without automatic revival. This makes an ally a person taking a risk rather than an invulnerable tool. The material cost is possible permanent loss of a familiar resident. The alternative is a player-only opponent policy for this increment, which limits companion combat and must be presented honestly rather than hidden inside engine anatomy checks.

This question was put to Mike during this planning task. Until answered, CF01/CF04/CF05 retain only the independent opportunity/evidence analysis above; their consequential participation, encounter and acceptance designs and copyable prompts are **not finalized**. Existing PvP denial, inactive-human protection, death review and corpse/reincarnation rules remain unchanged. The [decision register](../../archive/05-project/open-decisions.md#batch-06--npc-combat-participation) owns the pending answer.

## CF02 — Aim, projectiles and real cover

The player selects a currently perceived permitted target and exact compatible ranged tool/ammunition. **Aim** begins preparation without spending ammunition; after preparation, **Shoot** releases one shot, and **Cancel aim** stops without firing. Ordinary **Shoot once** and animal-facing **Hunt with …** remain understandable ways to choose the same finite aim/release sequence. Holding aim never fires automatically. Selection discloses automatic approach, preparation, projectile cost, range, observed target health and the effect of current cover; unknown facts remain unknown.

The shot locks the last permitted aim point at release. Its travel intersects actual geometry and the selected physical target; it does not follow that target around a corner. A hit commits the ordinary body effect once. A wall stops the shot. Another body stops it without becoming an implicitly authorized damage target. Direct PvP remains forbidden. This deliberate first-flight scope does not implement collateral harm, ricochet, piercing, gravity arcs, homing or recoverable ammunition.

An already released projectile continues after the shooter cancels or moves, and its ammunition stays spent. A target leaving the line can be missed. Losing current sight before release prevents firing at secretly refreshed coordinates. The interface must distinguish aiming, released, stopped, missed and hit, and never report a kill at release. Save/load preserves an in-flight shot and cannot return its ammunition or land it twice.

The independent assignment uses today's permitted animal targets. General projectile mechanics and scoped action presentation must not encode animal-only assumptions; CF01 owns any later change to installed combat participation. This assignment does not decide the pending NPC policy.

**Completion:** exercise aim/cancel, finite release, moving target miss, real cover and intervening body, stale equipment/life/review, departure protection, shield consumption after AV02, current-format restore and unchanged hunting/competence callers. Demonstrate the ordinary player path; distinguish native correctness from model choice and enjoyment. Detailed contracts and existing source entrypoints are in [CF02](parallel-batch-06-rivals-and-contested-ground-tech-design.md#cf02--one-ranged-execution-owner).

## CF03 — Evade and exploit an opening

The player chooses **Evade to …** with a short, grounded destination. Preview shows distance, movement duration, when another evasion can start, and any known blocker. It is an actual swept movement: walls, occupied space, unsupported ground and the continuing attack path can defeat it. It does not teleport, push another actor or turn damage off.

Choosing evasion can abandon a preparing attack or guard through existing interruption rules; it cannot erase committed ammunition, an attack's recovery or an already received hit. Ordinary movement remains available during evasion cooldown. The observed opponent's recovery is readable while perception permits it, allowing a normal counterattack, retreat or another action. There is no guaranteed counter-hit, global enemy timing feed or separate damage multiplier.

Use the existing stag as the first complete opponent. This work is independent of the NPC policy question and adds no new target class. Later humanoids consume the same motion and public attack phases. AI characters can choose evasion when it is supported and relevant; native code does not automatically dodge on their behalf.

**Completion:** evade a committed stag attack, fail to evade through a wall/occupied destination, preserve recovery when canceling, avoid duplicate displacement, preserve current-format motion/cooldown, retain normal walking, and make a genuine recovery opening visible without revealing a hidden attacker. AV02's shield coexistence is an explicit final integration prerequisite. [CF03 technical definition](parallel-batch-06-rivals-and-contested-ground-tech-design.md#cf03--evasion-through-authoritative-movement) owns mechanics.

## Presentation and combined experience

Extend the current action picker, target inspection and current-action display. Target/tool names and decisive cost/blocker stay on the row; optional detail stays in the existing disclosure. Aiming uses a compact persistent action strip with explicit Shoot/Cancel, not a modal that blocks movement or swallows the chat draft. Only current permitted target/trajectory information is shown; a camera angle does not grant knowledge.

Use ordinary responsive panels and design-system spacing, wrapping long names and preserving usable controls in narrow/short layouts and at enlarged text. Details scroll, but active cancellation remains reachable. Keyboard, reduced motion and text outcomes carry the same information as animation. Preserve final-blow modal focus and all explicit-send/chat shortcut boundaries. Each worker owns the usability of its feature; no sixth UI or integration assignment is implied.

The complete occupied-site walkthrough, counterpart refusals and irreversible-loss acceptance will be written after the pending NPC answer. Do not claim this batch is implementation-ready or ready to dispatch all five workers until that design is finished. Mechanics can be qualified now against existing lawful targets and later consumed by the completed encounter design.

## Estimates and sequencing

CF02 is approximately **1,600–2,800 changed production logic lines, 6–10 engineer-days**; CF03 **650–1,150 lines, 3–5 days**. These estimates include affected callers, UI, current-format persistence, relevant verification and documentation, not just the simulation routine. The remaining three cannot be credibly sized until their participation design is resolved. There is no inherited week/hour target or assumed AI speed multiplier.

CF02 and CF03 can develop independently through separate attack and movement owners. Their shared facts are settled in the technical design, not negotiated between workers. Existing AV02 equipment/defense remains an open final-integration dependency. The owner supplies prerequisite revisions; prompts do not grant merging or require task communication.

The priority hypothesis is that readable opposition and persistent stakes earn another expedition. Evidence that would change the recommendation includes opponents requiring constant author rescue, controls that prevent timely choices, rewards that are not useful, or repeated permanent losses overwhelming the attraction. Small successful native scenarios cannot establish fun or autonomous decision quality.

## Maintained records

- Implementation and open gates: [CF01–CF05](../maintainers/parallel-batch-06-rivals-and-contested-ground.md).
- Limits and constraints: [batch 06 inventory](../limits/parallel-batch-06-rivals-and-contested-ground.md).
- Mechanisms and dependencies: [technical design](parallel-batch-06-rivals-and-contested-ground-tech-design.md).
- Ready prompts and unfinished assignments: [prompt document](parallel-batch-06-rivals-and-contested-ground-prompts.md).
