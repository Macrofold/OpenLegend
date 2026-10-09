# Batch 06 — Rivals and contested ground implementation prompts

| Status      | Current progress                                                                                                                               | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | Five prompts separate useful partial starts from actual waits on other tasks; completed dependencies are documented outside the blocker lists. | 2026-10-08   |

These prompts are future assignments, not authorization for the planning agent to execute them. [Priority and scope](parallel-batch-06-rivals-and-contested-ground-feature-spec.md), [technical definitions](parallel-batch-06-rivals-and-contested-ground-tech-design.md), [tracker](../maintainers/parallel-batch-06-rivals-and-contested-ground.md). Readiness was refreshed on October 7 against local main `fe86301a3` and the specific prerequisite branches recorded in the technical design. **Open prerequisites lists only work another task must supply before a named part can proceed.** A partial start is useful work now, not an uninterrupted route to full completion. Known places (PX03), voluntary outings (PX04) and ordinary resident decisions (PG02) are already available; they are reuse references, not open prerequisites.

## Allocation and branch names

| Assignment                                       | Planned new branch                  | Start readiness / actual waits                                                                                                             |
| ------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| CF01 — Armed opponents with their own purpose    | `codex/purposeful-armed-opponents`  | Partial start: attack permissions and current melee choices. Ranged/evasive behavior waits for CF02 and CF03; AV02 equipment is available. |
| CF02 — Aim, projectiles and real cover           | `codex/aim-projectiles-and-cover`   | Partial start: aiming and animal-target flight. Practice/humanoid integration waits for AV03 and CF01's permissions; AV02 is available.    |
| CF03 — Evade and exploit an opening              | `codex/evasion-and-counterplay`     | Partial start: evading the stag. Projectile integration waits for CF02; AV02 shield/equipment is available.                                |
| CF04 — A companion who can help in a fight       | `codex/voluntary-combat-companions` | Partial start: help requests and independent consent. Armed helping waits for CF01–CF03; AV02 equipment is available.                      |
| CF05 — A contested ruin and a victory that lasts | `codex/contested-ruin-aftermath`    | Partial start: location, routes and ordinary supplies. Reward-learning and complete encounter wait for AV01 and CF01–CF04.                 |

These branch names were not present in inspected local/remote refs. No branch is created by this document. The owner supplies prerequisite revisions; each assignment has its own responsibility rather than an instruction to negotiate with another chat.

## CF01 — Armed opponents with their own purpose

```text
Implement CF01: speaking opponents pursue their own authored starting purposes through ordinary character decisions, actual equipment and shared combat rules. They can choose to fight, refuse, withdraw or change their approach; a scripted proximity attacker or behavior prescribed inside a biography is not completion. Follow AGENTS.md and applicable repository guidance.

After selecting and refreshing the development base under AGENTS.md, create and switch to the new branch codex/purposeful-armed-opponents. The starting branch must include the batch 06 planning documents referenced below. AV02 compatible equipment and contact shield defense are available on local main from the October 8 merge of codex/av02-shield-defense at 0884679cd; reuse that implementation.

The owner answered yes to hostile NPCs killing other NPCs, including Ada, under existing death rules. No further policy question blocks this scope. Direct PvP, inactive-human protection, exact human lethal review and existing death/remains/recovery remain controlling; ghosts, ordinary revival, collateral harm and home raids are outside this assignment.

Start readiness: Partial start only. Attack permissions and ordinary melee/character decisions can start now; finishing the equipped ranged/evasive opponents waits on the other tasks below.

Open prerequisites:
- CF02 — Aim, projectiles and real cover. Not implemented. Blocks ranged-opponent execution and choice qualification; CF02 needs only this task's independently deliverable target-permission change before its humanoid-target checks, not this whole task completed.
- CF03 — Evasion and counterplay. Not implemented. Blocks the opponents' evasive-choice integration and qualification. Both CF task definitions are in docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md.

Reuse and ownership: PG02's ordinary decisions and personal outcome evidence are already on main. Reuse them and the existing agency/memory owners. CF05 will place the watchpost; it does not block this task, which supplies reusable character definitions and qualifies them in disposable scenes. Do not implement another projectile or movement owner.

Read in this order:
1. docs/projects/parallel-batch-06-rivals-and-contested-ground-feature-spec.md: accepted decision, CF01, presentation, estimates/sequencing.
2. docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md: baseline, open prerequisites, shared ownership/delivery order, complete CF01 and documentation/parent reconciliation.
3. docs/worlds/base/lifecycle-and-protection.md#npc-combat-participation; docs/worlds/base/contested-watchpost.md: target policy, exact people, explicitly seeded goals and finite loadouts.
4. docs/projects/compelling-characters-feature-spec.md#character-authorship-and-changing-personality and its technical design; docs/engine-and-world-boundaries.md#preserve-precise-history-and-solve-the-general-cause: ordinary minds, evidence and authorship constraints.
5. docs/targeted-actions.md; docs/action-capabilities.md#action-availability-and-temporary-execution; docs/worlds/base/player-danger.md; docs/maintainers/parallel-batch-06-rivals-and-contested-ground.md#cf01--armed-opponents-with-their-own-purpose; docs/limits/parallel-batch-06-rivals-and-contested-ground.md.

Trace the technical design's domain body/combat/agency/participation owners and base-world definitions, then server action-catalogue, action-grounding, typed-actions, decision-context, activity-context, shared context/recall and scoped view. One common permission result must serve player, model, plan, temporary and restored attack callers. Permission is not a command to attack. Replace animal-only launcher eligibility at the world source while retaining Hunt for meat only for genuine prey. Preserve direct-command issuer attribution and stale life/review rejection.

Deliver the stated ordinary-character context, triggers and bounded selected continuation, exact finite equipment, understandable permitted attack facts, and the two authored personalities without special actor-ID rules. Native steps execute deterministically; independently selected goals/actions and changed responses need actual character-choice evidence, not a seeded strike or a copied stag controller. Complete the design's permission/death/replay/restore/privacy cases and the contrasting peaceful character, weapon and lost-sight/adverse-outcome cases using supplied consumers. Verification and any test authoring follow AGENTS.md.

Reconcile only delivered scope in lifecycle/protection, combat and authored world content; AC02/AC09/AC10/AC11; BW14/DG07; character experience, agent agency and action experience/recall; launcher target restrictions and relevant limits; and CF01's tracker. Retain broader PvP/indirect-harm, ghosts/revival, whole-afternoon personality and scale gaps. Update implemented summaries only for actually delivered behavior; preserve explicit open dependencies and evidence limits.
```

## CF02 — Aim, projectiles and real cover

```text
Implement CF02: a character can aim without firing, release one finite projectile, and hit or miss through real target movement, cover and shield contact. Follow AGENTS.md and the applicable repository guidance.

After selecting and refreshing the development base under AGENTS.md, create and switch to the new branch codex/aim-projectiles-and-cover. The starting branch must include the batch 06 planning documents referenced below. AV02 compatible equipment and contact shield defense are available on local main from the October 8 merge of codex/av02-shield-defense at 0884679cd; reuse that implementation.

Start readiness: Partial start only. Aim and projectile flight against currently permitted animals can start now; finishing practice and humanoid-target integration waits on the other tasks below.

Open prerequisites:
- AV03 — Sling-use progression and coaching. Required runtime reported delivered on codex/av03-practical-competence at 659029347; not merged into inspected main. Blocks integrating actual projectile release with existing practice/progress.
- CF01 — Common NPC attack permissions. Not implemented. Blocks final humanoid-target integration. Only its independently deliverable permission change is required, not completion of its later ranged-opponent demonstration.
For exact scope and branch evidence, see docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md#open-prerequisites; AV task definitions are in docs/maintainers/parallel-batch-05-adventure-defense-and-home.md.

Reuse and ownership: PG02's personal outcome evidence and ordinary decisions are already on main. Use the existing memory/perspective owner. Preserve accepted NPC lethality, direct PvP denial, inactive protection and exact human final-blow review. This task implements flight and extends the supplied shield/practice consumers; do not create another equipment, defense or skill-progression store.

Read in this order:
1. docs/projects/parallel-batch-06-rivals-and-contested-ground-feature-spec.md: “CF02 — Aim, projectiles and real cover” and “Presentation and combined experience.”
2. docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md: “Baseline and evidence,” “Open prerequisites,” “Shared ownership and delivery order,” the complete “CF02 — One ranged execution owner,” and “Documentation and parent reconciliation.”
3. docs/worlds/base/ranged-counterplay.md and docs/limits/parallel-batch-06-rivals-and-contested-ground.md: exact proposed world tuning, limits and changes to accuracy/fleeing interpretation.
4. docs/targeted-actions.md; docs/action-capabilities.md#action-availability-and-temporary-execution; docs/worlds/base/player-danger.md; docs/worlds/base/lifecycle-and-protection.md: existing execution, review and participation authority.
5. docs/maintainers/parallel-batch-06-rivals-and-contested-ground.md#cf02--aim-projectiles-and-real-cover: complete task scope and remaining acceptance.

Start source tracing at packages/domain/src/kernel.ts (hunt admission/completion), strikes.ts, combat-consent.ts, body-state.ts, participation.ts, action-experience.ts, spatial.ts and temporal-boundaries.ts. Trace base-world actions, action-views and recipe-families, plus server action-catalogue/typed-actions/decision-context/world-service/view and current protocol/client consumers. Use the source map in the technical design; confirm names and supplied prerequisite changes on your actual base.

Deliver one ranged owner shared by explicit Aim/Shoot and one-shot hunting composition. Preparation and canceled aim spend no ammunition; committed release spends once, locks the permitted aim point and persists a real flight. Swept collision must account for the interval's moving bodies, not just end positions. Another body intercepts without becoming a new damage target. Reuse one injury/review/guard owner, retain stale/replaced-life and changed-lethality protection, and never refund a released shot on cancellation. Keep authored language/tuning in the world and update all current schemas/callers together without old-format compatibility paths.

Complete the feature/design acceptance, including ordinary player controls, blocked/stale/replay/restore/privacy cases, a different compatible invented launcher, AV02 guard interception once and AV03 release evidence once. Report actual movement/flight and model-choice evidence separately. Verification and whether to author tests follow AGENTS.md.

Keep documentation synchronized: targeted actions, base-world survival/actions and ranged-counterplay; AC02/AC09/AC10/AC11; action experience; INV-3/INV-6 launcher scope; SW04/SW07/SW15/SW16; AV02 and AV03/practical-competence consumers; the CF02 tracker and affected limit inventories. Update Architecture/current implementation summaries only for delivered behavior. Mark only satisfied scoped criteria, preserving broad projectile, indirect-harm, learning and scale gaps. The exact parent map is in the technical design.
```

## CF03 — Evade and exploit an opening

```text
Implement CF03: deliberate short evasive movement that can avoid an attack through actual position, with readable observed recovery that the player or character may choose to exploit. Follow AGENTS.md and applicable repository guidance.

After selecting and refreshing the development base under AGENTS.md, create and switch to the new branch codex/evasion-and-counterplay. The starting branch must include the batch 06 planning documents referenced below. AV02 compatible equipment and contact shield defense are available on local main from the October 8 merge of codex/av02-shield-defense at 0884679cd; reuse that implementation.

Start readiness: Partial start only. Ordinary evasion and feedback against the existing stag can start now; finishing shield interruption and moving-projectile qualification waits on the other tasks below.

Open prerequisites:
- CF02 — Aim, projectiles and real cover. Not implemented. Blocks only the combined check that evasion moves a target out of an actual released shot. See docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md#cf02--one-ranged-execution-owner.

Reuse and ownership: this task implements evasion through existing movement; do not duplicate projectile flight. CF05's later humanoid encounter consumes these movement rules, but does not block this assignment. NPC target policy, PvP, indirect harm and revival remain with their existing owners.

Read in this order:
1. docs/projects/parallel-batch-06-rivals-and-contested-ground-feature-spec.md: “CF03 — Evade and exploit an opening” and “Presentation and combined experience.”
2. docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md: “Open prerequisites,” “Shared ownership and delivery order,” the complete “CF03 — Evasion through authoritative movement,” and “Documentation and parent reconciliation.”
3. docs/worlds/base/ranged-counterplay.md#evasion and docs/limits/parallel-batch-06-rivals-and-contested-ground.md: proposed exact distance, duration, cooldown and no-immunity boundary.
4. docs/action-capabilities.md#action-availability-and-temporary-execution; docs/targeted-actions.md; docs/worlds/base/first-threat-encounter.md; docs/spatial-world.md: existing movement, attack, perception and collision responsibilities.
5. docs/maintainers/parallel-batch-06-rivals-and-contested-ground.md#cf03--evade-and-exploit-an-opening: task and full completion scope.

Trace packages/domain/src/kernel.ts, action-capabilities.ts, strikes.ts, spatial.ts, spatial-mutations.ts, motion-boundaries.ts and native-work.ts, then the server action-catalogue/decision-context, protocol intentions and current player action controls. Reuse actual movement/support/collision and the one physical-action lane. World definitions own action wording, supported bodies and numeric tuning.

Deliver exact point selection plus an accessible directional alternative, shared read-only prerequisites, committed swept motion and a saved readiness deadline. Obstructions stop at real valid positions; no teleporting, pushing or immunity. Canceling a preparing attack/guard follows its owner and preserves committed costs and recovery. Evasion cooldown must not disable ordinary walking. No automatic dodge, counterattack, new stamina meter or bonus-damage system.

Expose observable preparation/miss/recovery through current scoped action information and result-triggered reconsideration. Do not project hidden opponents or refresh an unseen countdown. Complete the stag success/too-late/blocked/occupied/interrupted/repeated-command/restore cases, normal walking during cooldown, AV02 coexistence and CF02 combined shot evasion. Qualify ordinary player interaction and a second supported movement profile; distinguish native execution from actual autonomous choice. Verification and test authoring follow AGENTS.md.

Reconcile targeted actions, world ranged-counterplay, AC04/AC08/AC09/AC10/AC11, SW05/SW06/SW07/SW15/SW16, BW23, AG07's result-trigger consumer, AV02's guard consumer, the CF03 tracker and affected limits. Preserve broader NPC-quality, body/terrain, parry/rescue and large-scale qualification. Update current behavior summaries only with delivered and actually verified scope; partial integration is not completion.
```

## CF04 — A companion who can help in a fight

```text
Implement CF04: a nearby person can voluntarily accept or refuse help against one known opponent, choose their own actions, and withdraw without the player controlling their body. Follow AGENTS.md and applicable repository guidance. Ada and other NPCs can die under the accepted rules; no companion immunity is selected.

After selecting and refreshing the development base under AGENTS.md, create and switch to the new branch codex/voluntary-combat-companions. The starting branch must include the batch 06 planning documents referenced below. AV02 compatible equipment and contact shield defense are available on local main from the October 8 merge of codex/av02-shield-defense at 0884679cd; reuse that implementation.

Start readiness: Partial start only. Help requests, consent, refusal and withdrawal can extend the already-delivered outing/request system now; finishing actual armed helping waits on the other tasks below.

Open prerequisites:
- CF01 — Common NPC attack permissions. Not implemented. Blocks admitting and qualifying NPC-to-NPC combat help; only the permission change is required to begin that integration.
- CF02 — Aim, projectiles and real cover. Not implemented. Blocks ranged-helper execution and committed-shot cancellation checks.
- CF03 — Evasion and counterplay. Not implemented. Blocks evasive-helper integration.
See docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md#open-prerequisites and its CF01–CF04 definitions; AV02 is tracked in docs/maintainers/parallel-batch-05-adventure-defense-and-home.md.

Reuse and ownership: PX04's exact invitation/consent and own-action behavior is delivered on local main at fe86301a3; PG02's ordinary decisions and personal evidence are also available. Extend those owners. Joining an outing does not grant combat consent. This task owns the new help request, not a second combat executor or character controller.

Read in this order:
1. docs/projects/parallel-batch-06-rivals-and-contested-ground-feature-spec.md: accepted NPC decision, CF04 and presentation.
2. docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md: open prerequisites, shared ownership/delivery order, complete CF04, CF01's issuer/target authority boundary and documentation reconciliation.
3. docs/projects/parallel-batch-04-expeditions-and-exchange-tech-design.md#px04--consenting-travel-companions and its feature/tracker scope: exact consent, separate activity and withdrawal semantics.
4. docs/worlds/base/lifecycle-and-protection.md#npc-combat-participation; docs/projects/compelling-characters-feature-spec.md#character-authorship-and-changing-personality; docs/action-capabilities.md#action-availability-and-temporary-execution.
5. docs/maintainers/parallel-batch-06-rivals-and-contested-ground.md#cf04--a-companion-who-can-help-in-a-fight and docs/limits/parallel-batch-06-rivals-and-contested-ground.md.

Use PX04's supplied request/consent owner, current domain agency/activity/participation and server activity-requests, activity-request-choice, activity-context, decision-context and action catalogue. Add one precise help-request family, not a party controller, telepathic channel, command to kill or obligation system. Each recipient accepts the exact terms/revision; bind participant and opponent physical lives, current perception and ordinary replacement admission. An expired/stale or duplicated acceptance cannot create new authority or a second plan. Refuse human-proposed help against another human even with an NPC helper; the request is not a PvP bypass.

Acceptance establishes a revocable purpose; the helper then selects their own supported actions. Preserve private thoughts/inventory, lost-sight uncertainty, true refusal, interruption and all committed costs/recovery/projectiles. Termination stops only unfinished work belonging to this request. Outing completion, helping completion and the helper's later self-defense are separate facts. No automatic trip resume, ally shield transfer, interposition, remote attack order or forced obedience.

Deliver clear nonblocking Accept/Decline and reachable Stop helping/Cancel request controls with the known opponent and death risk visible. Complete the design's actual willing help and refusal, alternate priority, hidden-position, changed-life/death/departure, cancellation/replay/restore and second-character cases, plus supplied combat action integration. Follow AGENTS.md for verification and any test authoring.

Reconcile CF04, PX04's combat-consent consumer, relevant agency/character experience/action experience, communication/privacy, lifecycle/BW14 and DG06/DG07 scoped criteria, persistence and affected limits. Mark only demonstrated criteria complete; general parties, remote orders, rescue/revival and unrelated social scope remain open. Update implemented behavior summaries only when delivered.
```

## CF05 — A contested ruin and a victory that lasts

```text
Implement CF05: Broken Watchpost, an optional occupied destination with two meaningful approaches, finite useful rewards, real conflict and persistent aftermath. Follow AGENTS.md and applicable repository guidance. This is authored world content and complete gameplay integration, not a new quest engine or scripted winner.

After selecting and refreshing the development base under AGENTS.md, create and switch to the new branch codex/contested-ruin-aftermath. The starting branch must include the batch 06 planning documents referenced below. AV02 compatible equipment and contact shield defense are available on local main from the October 8 merge of codex/av02-shield-defense at 0884679cd; reuse that implementation.

Start readiness: Partial start only. Author the physical location, routes and ordinary finite supplies now; finishing reward-learning and the complete encounter waits on the other tasks below.

Open prerequisites:
- AV01 — Expedition rewards and physical method records. Required learning/content is reported delivered on codex/av01-rewarding-expeditions at 6db757618; not merged into inspected main. Blocks reuse of the workshop clue, field-sling method and physical learning action. See docs/maintainers/parallel-batch-05-adventure-defense-and-home.md#av01--rewarding-expeditions and the batch 06 dependency ledger.
- CF01 — Purposeful armed opponents. Not implemented. Blocks actual occupant definitions, permitted combat and independent hostile choices.
- CF02 — Aim, projectiles and real cover. Not implemented. Blocks real shot/cover gameplay in the encounter.
- CF03 — Evasion and counterplay. Not implemented. Blocks the encounter's evasion gameplay.
- CF04 — Voluntary combat companions. Not implemented. Blocks the optional willing-companion journey.
The four CF definitions and their own prerequisites are in docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md. The owner supplies those results; this prompt does not authorize merging them.

Reuse and ownership: PX03's known-place discovery is already on main at 699417835; use its place-memory owner. This task owns site placement and the complete encounter, not an opponent mind, weapon executor, consent system or duplicate learning action. Geometry/stock authoring does not need the later finished encounter.

Read in this order:
1. docs/projects/parallel-batch-06-rivals-and-contested-ground-feature-spec.md: CF05, presentation/combined experience and sequencing; understand the other four experiences you are combining.
2. docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md: baseline/open prerequisites, shared ownership/delivery order, complete CF05 and documentation reconciliation.
3. docs/worlds/base/contested-watchpost.md: canonical exact site, people, loadouts, finite cache, authored goal/source boundaries and persistent consequences.
4. docs/worlds/base/rewarding-expeditions.md; docs/worlds/base/shield-defense.md; docs/worlds/base/ranged-counterplay.md; docs/worlds/base/lifecycle-and-protection.md; docs/worlds/base/first-threat-encounter.md and docs/verification/first-threat-encounter.md for existing behavior and capacity limits.
5. docs/maintainers/parallel-batch-06-rivals-and-contested-ground.md#cf05--a-contested-ruin-and-a-victory-that-lasts; docs/limits/parallel-batch-06-rivals-and-contested-ground.md; supplied PX03/AV01 technical owners named in the dependency ledger.

Use base-world world/landscape/site definitions, current static geometry and ground navigation, ordinary items/containers/custody/claims, remains, scoped knowledge and the supplied discovery/learning consumers. CF01 owns reusable occupant definitions; this task installs their actual bodies/items/positions once in a new authored start. Exact coordinates have one world source. Visual cover must match real collision/occlusion, with a direct entrance, longer covered route and ordinary retreat. Keep it away from compulsory starter resources and the first stag's encounter.

Use the exact authored finite equipment/cache. A bow or shield is its actual physical item, not a duplicate victory drop; ammunition stays spent. Method learning reuses AV01. Taking the cache follows ordinary custody without a magical kill-count gate. Defeat, displacement, death, item transfer, discovered place and memories are the aftermath; do not add a second siteCleared truth, respawn schedule, refill, raid or automatic relationship change. Existing saves are not reseeded or migrated.

Own the complete combined ordinary-player walkthrough described in the feature/design pair after prerequisites are supplied: discovery and two routes, meaningful opposition, real shot/cover/evasion/guard, optional voluntary help, actual reward use, departure and persistent revisit; include loss/return, NPC death, an outcome without killing both occupants and competing visitors for remaining stock. Record actual choice/latency/usability limitations and the existing dense-scene capacity gap; a small scripted native fight is neither autonomous choice proof nor a scale/fun claim. Verification and any test authoring follow AGENTS.md.

Reconcile CF05, affected base-world content/landscape/items and limits, PX03/AV01 scoped consumers, BW/DG01/DG07, physical-object custody and the combined CF01–CF04 evidence. Keep broad adventure, property/theft, revenge, unattended settlement and world-capacity work open. When and only when all five assignments and required integration are actually complete, reconcile the batch's overall status under AGENTS.md; planning completion alone does not finish this project.
```
