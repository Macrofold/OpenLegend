# Batch 06 — Rivals and contested ground

| Status      | Current progress                                                                                                                        | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | One assignment covers all five work parts; required earlier implementations are on local main, and all runtime acceptance remains open. | 2026-10-08   |

## Purpose and planning horizon

Make venturing out create conflict worth engaging with: an opponent wants something, the player can read and counter an attack, a companion can make an independent choice, and winning an objective changes a later visit. This is proposed batch **06**, after [batch 05](parallel-batch-05-adventure-defense-and-home-feature-spec.md). Earlier allocations already have numbers; none needs renaming.

At Mike's request, **assume all previously suggested assignments are delivered when deciding what to select next**. That is a planning horizon, not evidence that their branches have merged. The [dependency ledger](parallel-batch-06-rivals-and-contested-ground-tech-design.md#open-prerequisites) records actual readiness separately. No previous task is marked complete by this allocation.

The request authorizes planning documents and future implementation prompts, not implementation or task dispatch. The mechanics below are proposals, not current behavior. The owner consolidated the five interdependent assignments into one implementation assignment on October 8. CF01–CF05 retain their complete scope and acceptance as internal work parts, not separate workers or design-only substitutes.

## Why this batch

After the earlier batches, the game would offer a dangerous animal, shields, usable equipment, rewarding exploration, fishing, a home, practice, barter and voluntary outings. Another food source or maintenance chore adds less than an opponent who contests what the player wants. We should develop conflict through reusable actions and real people, not a scripted battle whose conclusion ignores the world.

The selection follows [gameplay priorities](../repertoires/gameplay-priorities.md) and [whole-game coverage](../repertoires/coverage.md). Core entries are alternatives to combine into worthwhile play, not a requirement to implement every weapon or every opponent. The five work parts deliberately concentrate on conflict; they now form one cohesive assignment rather than a staffing quota.

| Work part                                        | Intended experience                                                                                                                       | Repertoire priority and scope                                                                                                                          | Why now / burden                                                                                                                                                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CF01 — Armed opponents with their own purpose    | Meet a speaking opponent who values a position or prize and can fight, withdraw or refuse cooperation using real equipment and knowledge. | **Core:** CR-122 defender, CR-123 ranged opponent, RSH-144 genuinely hostile rival; CB-112 is inspiration, not mandatory lore or a copied character.   | Distinct human opposition follows the animal encounter. Uses the accepted NPC participation policy and supplied ordinary character decisions; a biography alone is insufficient.                                                       |
| CF02 — Aim, projectiles and real cover           | Aim without firing, release one finite projectile, and hit or miss because of its actual path, moving target and obstacles.               | **Core:** CR-001, CR-002, CR-061, CR-242; bounded straight projectile flight, not every ballistic behavior.                                            | Current ranged attacks only target animals and resolve an accuracy draw directly into injury. Real flight and cover supply counterplay to future ranged opponents. Higher mechanical and persistence cost than another weapon variant. |
| CF03 — Evade and exploit an opening              | Make a deliberate short movement out of an attack and choose a normal attack, guard or escape during the opponent's visible recovery.     | **Core:** CR-047, CR-057; complements batch 05's CR-046 shield.                                                                                        | Provides an active answer other than receiving damage or walking away. No invulnerability frame, new stamina meter or compulsory reflex tutorial.                                                                                      |
| CF04 — A companion who can help in a fight       | Ask a willing companion for help, see them choose what to do, and permit them to refuse or withdraw.                                      | **Complete:** CR-058 and RSH-148's independent helper; no forced formation or taking another actor's turn.                                             | Makes the earlier shared outing matter under pressure. NPC lethality is accepted; voluntary help adds real risk, with refusal and withdrawal preserved.                                                                                |
| CF05 — A contested ruin and a victory that lasts | Approach an occupied destination by different routes, obtain a finite useful reward, leave, and return to the actual aftermath.           | **Core:** AD-062, AD-181, CR-213, CR-225; **Complete** AD-233 and CR-134 are candidates for later witnessed consequences, not automatic extra systems. | Converts combat improvements into a complete activity. Two mortal occupants, finite equipment and a physical reward give the encounter persistent consequences. No respawning prize or automatic erasure of victory.                   |

Entry owners: [combat](../repertoires/combat-rescue.md), [adventure](../repertoires/adventure-discovery.md), [relationships](../repertoires/relationships.md), [characters](../repertoires/characters-backstories.md). The [toll tower](../repertoires/combinations.md#the-toll-tower-at-dawn) is an existing combined example, not permission to add regional government, destruction or a tribute system to this batch.

### Alternatives considered

- **Another predator or another ordinary weapon:** viable, but the earlier stag and shield/weapon work already represent that first loop. Different intent and tactical responses add more than another health pool.
- **Tolls, surrender, raids on homes and nonlethal capture:** attractive conflict, but introduce payment-for-service, custody, property or indirect-harm choices not settled by existing barter or player death. Do not quietly include them in an enemy task. DIP-034 remains Core but is not a prerequisite for the selected combat/occupied-site increment.
- **Recent DG12 invention reuse:** worthwhile, but a library round trip does not directly add opposition. Existing admitted inventions should work through CF02; portable publication is separate.
- **DG13 shelter and DG14 competence:** already selected in batch 05, assumed delivered for this choice. Do not repeat them or require grinding before fighting.
- **DG15 story perspective and DG11 optional study:** do not beat a new playable activity for this request. Their unresolved adoption/qualification remains with their owners.
- **Medical rescue, ghosts or general NPC revival:** retain existing death and recovery requirements. These expansions need their own decisions and are not disguised prerequisites of every attack.
- **Established-system defects and scale:** the first-threat report retains a dense-scene capacity failure. New enemy work must address regressions it causes and measure its selected encounter, without claiming a small fight qualifies populated worlds or allocating a speculative performance rewrite. No newly reproduced integrity defect was found in this documentation investigation; this is not a repository-wide bug audit.

## Accepted NPC participation decision

On October 6, Mike answered **yes**: hostile NPCs may kill other NPCs, including Ada, under the existing death rules. [Lifecycle and player protection](../worlds/base/lifecycle-and-protection.md#npc-combat-participation) owns the accepted target policy; the [decision register](../../archive/05-project/open-decisions.md#batch-06--npc-combat-participation) records the answer. No further developer decision blocks this allocation.

This removes the planning gate, not any runtime guard by itself. CF01 implements the common target eligibility needed by the new opponents. The stag keeps its separately authored player-targeting behavior; its existing resident exclusion is not a universal rule for humanoid combat. Direct player-versus-player harm remains denied, inactive humans remain protected, and a human's potentially lethal attack still requires its exact review. Ordinary NPC choices need no human confirmation. NPC death is persistent without automatic return; difficult revival and ghosts are not supplied by this batch. No home raids, property damage or new indirect harm is implied.

## CF01 — Armed opponents with their own purpose

Meet two speaking people who regard a stock of equipment as theirs and want to keep it. One favors close combat with a knife and shield; the other has a bow and finite arrows. They use ordinary possessions, bodily limits, observed surroundings, freeform goals and the same action choices as other supported characters. Their authored starting purpose establishes why they are here; it does not choose every action, fabricate a memory or prove an autonomously invented goal.

They can warn, refuse, attack, seek a useful firing position, guard, evade, retreat or abandon their purpose when their own decisions select supported actions. No biography contains a hidden combat algorithm. They cannot know the player's hidden position, follow an unseen target indefinitely, produce ammunition, reset damage or return after death. A warning is normal witnessed speech, not a cutscene that freezes the player or guarantees safety.

The player's choices include fighting, using cover, leaving, talking without a guaranteed negotiation outcome, or approaching another route. Targets show only permitted identity, distance, health, equipment and preparation. A purposeful ranged opponent must actually select a supported shot; a deterministic script firing on proximity is insufficient. A human who deliberately selects a potentially lethal attack sees the existing review. Ada and the opponents receive the same ordinary NPC death consequences.

**Completion:** demonstrate a genuinely selected attack with each loadout, an observation-grounded pursuit that stops using lost information, changed behavior after a meaningful adverse result, finite ammunition, retreat/refusal, a different compatible weapon, and actual NPC-to-NPC injury/death with no replay or revival. Demonstrate the existing human death/review/protection boundaries. Native scenarios establish safety; separate live character runs establish actual choices and their limitations. CF01 supplies character content and common attack eligibility; CF05 owns where these people and their supplies start. [Technical scope](parallel-batch-06-rivals-and-contested-ground-tech-design.md#cf01--purposeful-opponents-through-ordinary-agency).

## CF02 — Aim, projectiles and real cover

The player selects a currently perceived permitted target and exact compatible ranged tool/ammunition. **Aim** begins preparation without spending ammunition; after preparation, **Shoot** releases one shot, and **Cancel aim** stops without firing. Ordinary **Shoot once** and animal-facing **Hunt with …** remain understandable ways to choose the same finite aim/release sequence. Holding aim never fires automatically. Selection discloses automatic approach, preparation, projectile cost, range, observed target health and the effect of current cover; unknown facts remain unknown.

The shot locks the last permitted aim point at release. Its travel intersects actual geometry and the selected physical target; it does not follow that target around a corner. A hit commits the ordinary body effect once. A wall stops the shot. Another body stops it without becoming an implicitly authorized damage target. Direct PvP remains forbidden. This deliberate first-flight scope does not implement collateral harm, ricochet, piercing, gravity arcs, homing or recoverable ammunition.

An already released projectile continues after the shooter cancels or moves, and its ammunition stays spent. A target leaving the line can be missed. Losing current sight before release prevents firing at secretly refreshed coordinates. The interface must distinguish aiming, released, stopped, missed and hit, and never report a kill at release. Save/load preserves an in-flight shot and cannot return its ammunition or land it twice.

Animal targeting remains a useful mechanical case, but projectile mechanics and scoped presentation must not encode animal-only assumptions. Implement CF01's accepted NPC eligibility extension first within this assignment, then qualify CF02 against both animal and humanoid targets.

**Completion:** exercise aim/cancel, finite release, moving target miss, real cover and intervening body, stale equipment/life/review, departure protection, shield consumption after AV02, current-format restore and unchanged hunting/competence callers. Demonstrate the ordinary player path; distinguish native correctness from model choice and enjoyment. Detailed contracts and existing source entrypoints are in [CF02](parallel-batch-06-rivals-and-contested-ground-tech-design.md#cf02--one-ranged-execution-owner).

## CF03 — Evade and exploit an opening

The player chooses **Evade to …** with a short, grounded destination. Preview shows distance, movement duration, when another evasion can start, and any known blocker. It is an actual swept movement: walls, occupied space, unsupported ground and the continuing attack path can defeat it. It does not teleport, push another actor or turn damage off.

Choosing evasion can abandon a preparing attack or guard through existing interruption rules; it cannot erase committed ammunition, an attack's recovery or an already received hit. Ordinary movement remains available during evasion cooldown. The observed opponent's recovery is readable while perception permits it, allowing a normal counterattack, retreat or another action. There is no guaranteed counter-hit, global enemy timing feed or separate damage multiplier.

Use the existing stag as the first complete opponent. This work adds no new target class; it consumes CF01 eligibility when combined with humanoid encounters. Later humanoids consume the same motion and public attack phases. AI characters can choose evasion when it is supported and relevant; native code does not automatically dodge on their behalf.

**Completion:** evade a committed stag attack, fail to evade through a wall/occupied destination, preserve recovery when canceling, avoid duplicate displacement, preserve current-format motion/cooldown, retain normal walking, and make a genuine recovery opening visible without revealing a hidden attacker. AV02's shield implementation is already available; its coexistence with evasion remains required integration in this assignment. [CF03 technical definition](parallel-batch-06-rivals-and-contested-ground-tech-design.md#cf03--evasion-through-authoritative-movement) owns mechanics.

## CF04 — A companion who can help in a fight

Ask a nearby person for help against a specifically identified, currently perceived opponent. Traveling together does not already grant combat consent. The request describes helping against that person, the risk of death and the right to stop. The recipient may accept or decline using their ordinary decision context. Acceptance supplies a revocable purpose, not remote control, an order to kill, access to private thoughts or a guaranteed combat outcome.

A willing Ada chooses her own useful movement, attack, guard, evasion or speech from current capabilities and knowledge. Her shield protects her own body; this increment does not add magical protection for the player or compulsory interception. Either participant may end the request. Withdrawal stops only unfinished work belonging to that help activity, preserves already committed consequences, and makes no promise that the opponent stops fighting. The companion may independently defend herself afterward. She can die permanently under the accepted policy.

Pending, accepted, helping and ended states appear beside the existing activity display, with **Stop helping** or **Cancel request** reachable. Known refusals/outcomes say what actually happened. The UI does not expose an unseen companion's live health or position. Returning to an outing requires a supported fresh choice; ending combat must not silently restart a trip or previous attack.

**Completion:** show independent acceptance and refusal, one actual useful combat action by an accepting companion, interruption and withdrawal under danger, exact selected-opponent/life changes, death, hidden-position privacy, duplicate acceptance and current-format restoration. Include a second ordinary character to establish that this is not an Ada exception. [Technical scope](parallel-batch-06-rivals-and-contested-ground-tech-design.md#cf04--voluntary-help-against-one-known-opponent).

## CF05 — A contested ruin and a victory that lasts

Add the **Broken Watchpost**, an optional ground-level destination away from essential food and starter safety. Two occupants contest a finite cache. A direct approach makes their presence legible; a longer supported route uses actual broken-wall cover. Neither route is a secret scripted immunity zone, and reaching the cache never requires a prearranged victory flag.

The useful prize is physical equipment: a usable bow and its arrows can be taken only through their actual custody, while the cache offers a field-sling method and finite making supplies. Obtaining the bow introduces a different range/power choice; a player who already knows the sling method still benefits from supplies. The [world content definition](../worlds/base/contested-watchpost.md) owns exact stock and loadouts. No generated treasure, new regional toll service or unique quest inventory is needed.

The player can retreat, take an opportunity to reach the cache, fight, or arrive with a willing companion. Opponents may choose to defend, leave or use their own equipment. Actual blocked sight and travel govern access. Losing uses ordinary death/corpse/return rules. Winning leaves the people dead or displaced and the actual items where they were taken or dropped. Returning after a save/load shows that aftermath; it never restores the encounter automatically. Another visitor can take the remaining stock.

**Completion:** ordinary entry/discovery, both traversable routes, useful cover, real opposition, optional exit, actual finite reward use, player loss/return, NPC loss, and a later visit with preserved custody and no duplicate reward. Also show an outcome without killing both occupants; no guaranteed peaceful bargain is required. CF05 covers the combined encounter qualification after this same assignment implements CF01–CF04, reusing the already available earlier foundations. [Technical scope](parallel-batch-06-rivals-and-contested-ground-tech-design.md#cf05--one-physical-destination-and-persistent-aftermath).

## Presentation and combined experience

Extend the current action picker, target inspection and current-action display. Target/tool names and decisive cost/blocker stay on the row; optional detail stays in the existing disclosure. Aiming uses a compact persistent action strip with explicit Shoot/Cancel, not a modal that blocks movement or swallows the chat draft. Only current permitted target/trajectory information is shown; a camera angle does not grant knowledge.

Use ordinary responsive panels and design-system spacing, wrapping long names and preserving usable controls in narrow/short layouts and at enlarged text. Details scroll, but active cancellation remains reachable. Keyboard, reduced motion and text outcomes carry the same information as animation. Preserve final-blow modal focus and all explicit-send/chat shortcut boundaries. The same assignment owns usable controls across all five work parts and their combined experience; no separate UI or integration worker is implied.

The combined walkthrough enters the watchpost, identifies the two occupants from permitted evidence, chooses an approach, uses real ranged cover/evasion, optionally requests voluntary help, obtains and uses a physical reward, leaves and revisits. A contrasting loss/withdrawal run preserves real consequences. All five work definitions remain required. The consolidated assignment can start on the documented local-main base without another developer answer or another Batch 06 agent delivering work.

## Estimates and sequencing

These are rough implementation ranges, including callers, UI, current-format persistence, relevant qualification and documentation. They are not a staffing promise or an AI speed multiplier. Existing prerequisite delivery is excluded; if those contracts change, re-estimate their consumers.

| Work part | Changed production logic lines | Engineer-days | Order inside the one assignment                                                                  |
| --------- | ------------------------------ | ------------- | ------------------------------------------------------------------------------------------------ |
| CF01      | 1,200–2,200                    | 5–8           | Attack permissions and melee first; finish ranged/evasive character choices after CF02/CF03.     |
| CF02      | 1,600–2,800                    | 6–10          | Follow common attack permissions; integrate already available equipment, guard and practice.     |
| CF03      | 650–1,150                      | 3–5           | Follow flight for complete shot-evasion acceptance; reuse existing movement and guard.           |
| CF04      | 900–1,600                      | 4–7           | Extend existing voluntary consent after combat and opponent choices work together.               |
| CF05      | 500–900                        | 3–5           | Compose the site and finite rewards, then qualify the complete encounter and persistent revisit. |

The prior estimates total roughly **4,850–8,650 production logic lines and 21–35 engineer-days** for the full scope; consolidating responsibility does not remove work or promise a duration. Reassess against the actual base under AGENTS.md. This is intentionally one ambitious assignment on `codex/rivals-and-contested-ground`, replacing five partial-start branches. Implement the permission part of CF01, then CF02, CF03, the remaining CF01 choices, CF04 and CF05. All integrations and acceptance are owned by the same task; no intermediate handoff, peer message or wait for another Batch 06 worker is required. The existing modular code responsibilities remain separate even though staffing is combined.

The priority hypothesis is that readable opposition and persistent stakes earn another expedition. Evidence that would change the recommendation includes opponents requiring constant author rescue, controls that prevent timely choices, rewards that are not useful, or repeated permanent losses overwhelming the attraction. Small successful native scenarios cannot establish fun or autonomous decision quality.

## Maintained records

- Implementation and open gates: [CF01–CF05](../maintainers/parallel-batch-06-rivals-and-contested-ground.md).
- Limits and constraints: [batch 06 inventory](../limits/parallel-batch-06-rivals-and-contested-ground.md).
- Mechanisms and dependencies: [technical design](parallel-batch-06-rivals-and-contested-ground-tech-design.md).
- One complete implementation prompt: [prompt document](parallel-batch-06-rivals-and-contested-ground-prompts.md).
