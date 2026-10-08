# Batch 05 — Adventure, defense and a home

| Status      | Current progress                                                                                                                  | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | AV05’s river meal and second review are delivered and qualified; the other four assignments and combined integration remain open. | 2026-10-07   |

Current AV05 delivery: [installed preparation/cast contract](../food-preparation.md), [river profile](../worlds/base/river-fishing.md) and [native/player/live-choice evidence](../verification/river-meal.md). Other assignments retain their prerequisite and acceptance requirements.

## Purpose and selection

After the previous batches, the player should have reasons to leave camp, a choice besides attacking or running, something useful to learn, a place to make their own, and another enjoyable way to obtain food. This batch delivers those experiences through five assignments. This remains the batch’s implementation allocation; only AV05 is delivered so far. The original planning chat did not authorize executing the other prompts.

The [technical definitions](parallel-batch-05-adventure-defense-and-home-tech-design.md), [five prompts](parallel-batch-05-adventure-defense-and-home-prompts.md) and [AV01–AV05 tracker](../maintainers/parallel-batch-05-adventure-defense-and-home.md) are the handoff. Start from a revision containing this documentation and the supplied prerequisites, not a stale historical hash.

### What the audit found

Inspected local `main` and freshly fetched `origin/main` at `34233ae24365eb8911fe1995c9c232bd57f34616` on October 5. Planning uses source, trackers and recorded evidence; no new runtime or playtest claim is made.

- PG01's live invention/use journey, PG03's action presentation and scoped PG04 preview improvements have merged. Existing inventory already has exact item selection, comparison, quantities, containers and transfer controls. Another generic inventory redesign or another sling-generation demonstration would repeat delivered work.
- `codex/pg05-first-threat` at `75e8c82e` contains the territorial stag, finite cache, actual danger and owner-selected player death/reincarnation rules, with recorded qualification. It is **not yet in this inspected main**. Its contents supersede the old assumption that PG05 is only a pending design, but this allocation does not mark that branch integrated or change its parent checkboxes. PX01 must reconcile against that delivery instead of rebuilding it.
- `codex/pg02-attended-resident` at `94633971` remains separate. A worktree's presence is evidence of separate work, not proof someone is currently executing it. Batch 04 already assigns barter, known places, voluntary outings and shelter technical design. None is allocated again here.
- Current source has working prey hunting, finite harvest, meat cooking, ordinary eating, sleep, bags and item manufacture. Equipment still has one equipped-item reference; there is no shield guard consumer. The river is landscape, not a fish source. Cooking still has one raw-meat/output pair. Richer scenery alone supplies neither rewarding exploration nor another food activity.
- `ce68e678` expanded DG11–DG15 product designs. Shelter and practical competence directly support this batch's game; cross-world libraries, optional story cutaways and a well-being study are considered below, not automatically promoted.

### Priority comparison

The [current priority policy](../repertoires/gameplay-priorities.md) and [whole-game coverage](../repertoires/coverage.md) control selection. Scores describe catalogue proposals; they do not establish delivery. Specific selections deliberately take a useful portion or alternative, not every implication of an entry.

| Assignment                                                     | Player result and priority evidence                                                                                                                                                                                                                                                                                                 | Why now / departure from larger examples                                                                                                                                                                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AV01 — Discover something worth bringing home**              | Complete a short expedition, find usable equipment and learn a useful production method. Core exploration/payoff coverage; AD-106 **1 Core**, AD-032 and AD-271 **2 Complete** in [Adventure](../repertoires/adventure-discovery.md).                                                                                               | The incoming cache supplies basic materials. This adds a meaningful next destination and usable reward. It adapts the cache/recipe premise without adopting coins, bandits, vertical ruins or a quest economy.                          |
| **AV02 — Defend with a shield**                                | Equip compatible gear, face a real blow, guard, then choose whether to retaliate or escape. CBT-05 **1 Core** in [Actions](../repertoires/actions.md), CR-046 **1 Core** in [Combat](../repertoires/combat-rescue.md).                                                                                                              | Walking away remains valid; active defense adds a distinct decision against the delivered threat. Compatible equipment is the necessary foundation, not a separate inventory overhaul.                                                  |
| **AV03 — Become better through real use and willing coaching** | Improve sling handling through hunts or peaceful practice; another person can voluntarily help. Core improvement coverage; AP-049 **1 Core** in [Abilities](../repertoires/abilities-progression.md) is the comparable ranged-proficiency proposal; ITEM-089 **2 Complete** in [Objects](../repertoires/objects.md).                | Select DG14's already specified sling consumer instead of copying AP-049's bow scope or inventing a skill tree. Existing useful sling play makes the improvement assessable.                                                            |
| **AV04 — Build, use and change a small home**                  | Construct an actual canopy, shelter possessions, rest, extend it and recover the same parts. BLD-03 **1 Core** in [Actions](../repertoires/actions.md); ARC-001/ARC-025 **2 Complete** in [Architecture](../repertoires/settlements-architecture.md).                                                                               | Implements the earlier PX05 design and DG13 product scope. An open canopy is the selected first structural family; the catalogue's raised platform and full lean-to are not prerequisites.                                              |
| **AV05 — Catch and cook a river meal**                         | Make or obtain a fishing tool, choose a river reach, try a cast, bring back a real catch and cook/eat it. [Complete coverage](../repertoires/coverage.md#2-complete-make-the-game-worth-continuing) explicitly includes fishing; ECW-163 **2 Complete** in [Ecology](../repertoires/ecology-weather.md) informs finite local stock. | Hunting already supplies the first food loop. Fishing adds a peaceful destination/activity and proves food preparation can support another food. Regrowth, fish-population ecology and ITEM-285's **4 Detail** rod repair are excluded. |

These are not five equally sized projects or one assignment per task class. AV01, AV02 and AV04 address missing Core breadth; AV03 supplies tangible progression and independent social value; AV05 adds a Complete activity. Within the parallel set, integrate playable exploration/defense before spending effort on a second practice skill or additional fish species.

### Important alternatives and why they wait

- **More enemy roles and hostile people:** high value; AD-062 is Core. The first real opponent is incoming. Qualify its integrated loop, then select a second role with an actual different decision. This batch reuses that opponent's approved rules; it does not invent motives, lethal-person policy or a second AI controller to dress up a new room.
- **Useful invention and an independent resident:** remain Core, but PG01/PG02 and PX02/PX04 already own them. Coaching consumes genuine choice; it does not replace the resident work or schedule Ada's day.
- **Water, crops, illness and preservation:** do not add another depleting need before its full remedy, or turn a new activity into maintenance. Existing food/rest remain usable. Fishing is the one selected food expansion, not permission for seasons, spoilage, aquaculture or a farm economy.
- **DG12 invention libraries:** useful, substantial creator work, but a second-world transfer is less urgent than something worthwhile to do in the current world. Rights/release and destination-admission work remains with INV-8/EWF11/12; a complete proposal is not proof it should outrank missing play.
- **DG15 story perspectives and DG11 well-being evidence:** optional consumers requiring their own value/permission and operational gates. Improve actual observable activities first. Do not spend this batch producing stories about activity the game cannot yet perform.
- **Broader inventory polish, streaming and scale:** existing PW/UIUX/NC/PF owners retain unmet evidence. This audit found no new reproduced foundational bug that should displace the selected experiences. It is not a repository-wide correctness clearance. Fix concrete defects encountered in the selected owners, not unrelated historical verification lists.

## AV01 — Discover something worth bringing home

**Journey.** At a visible camp route marker, the player can inspect a clue without accepting a quest. They choose a walk to an abandoned lookout, take an actual better-reaching weapon if it remains, and follow a physical clue to a riverside workshop. There they can inspect a recipe record, learn the exact admitted method, gather its real ingredients and manufacture something useful for the next outing. Leaving with only the first discovery is still a worthwhile outcome.

The [authored expedition profile](../worlds/base/rewarding-expeditions.md) owns locations' roles, rewards, knowledge grants and tuning. Use current traversable geometry and the incoming threat's ordinary avoidance/fighting choices. Do not require killing, inventing, a particular companion or a secret correct phrase. A recipe reward is a known authored method, clearly distinct from the game's live invention route. The first live invention experience must remain available and honestly labeled.

Include two distinguishable destinations, clues grounded in actual objects, finite transferable rewards, recipe inspection and later manufacture/use. PX03 owns knowing/navigating places; this task supplies content and a physical recipe-record consumer. Reuse ordinary item custody, knowledge and manufacture. No generic quest graph, map reveal, procedural dungeon, money, lockpicking, climbing extension or replenishing chest.

**Completion:** an ordinary player can find both sites from in-world information, use the first reward and make/use the discovered method. A second visitor finds the actual remaining stock; inspecting a recipe twice does not duplicate knowledge or items. Returning after restart preserves taken rewards and permitted knowledge. An unseen visitor's choices and uninspected cache contents stay private. A route remains possible without defeating the optional threat; no success is silently reset. Record whether the second trip offers a valued new option, separately from mechanical correctness.

## AV02 — Defend with a shield

**Journey.** A player crafts a known shield from real supplies, equips it with a compatible knife, approaches an incoming threat, sees its preparation and chooses Guard. A correctly facing, timely guard reduces the actual contact injury. A late guard or blow from outside the coverage still hurts. After the guard, the player chooses attack, another defense or retreat. It is not an automatically optimal response.

The [shield profile](../worlds/base/shield-defense.md) owns body ports, equipment compatibility, guard timing, coverage, damage reduction, ordinary manufacture and descriptions. The engine owns exact equipment attachment and one authoritative damage calculation. Do not multiply independent damage reducers or preserve the old single-item reference as another writable authority.

Deliver compatible held equipment, a finite chosen guard, honest feedback and normal player/NPC action choices. A two-handed launcher conflicts with the shield; auto-equipping an offered action resolves only the declared conflicting equipment, retains the same items and shows the change. Existing knife, gathering-tool, sling and bow use must continue. A guard never consents to PvP, reveals a hidden attacker, changes a death rule or guarantees safety. No armor system, stamina meter, durability, dodge roll, parry combo or projectile interception in this slice.

**Completion:** actual incoming threat damage differs for in-time/front, late, rear and incompatible equipment cases; interrupted guard and repeated requests cannot grant lasting protection. Observers see only perceivable results. Human and NPC choices use the same admission and outcome ownership. Exact equipment and an active guard survive current-format return without duplicated items, repeated damage or restored expired protection. A player can discover and use it through the ordinary action surface, with readable non-animation feedback.

## AV03 — Become better through real use and willing coaching

Implement DG14's selected consumer, **PC02–PC06**, under the [authored stats product specification, section 16](authored-stats-feature-spec.md#16-dg14-expansion--become-more-capable-at-something-worth-doing) and [base-world competence rules](../worlds/base/practical-competence.md). Supply the missing scoped technical counterpart as part of implementation, using this batch's technical decisions. This is a delivery assignment, not a design-only substitute. The optional roof/2d6 example is excluded.

**Journey.** A capable beginner hunts or selects one sling shot at a real inert target. Actual released shots—including misses—support the finite improvement. A practiced person can agree to observe and give feedback, reducing the learner's remaining practice. A resident can decline. Neither route grants a private recipe, learned activity, personality trait or guaranteed future hit.

The canonical profile owns six independent releases or three plus one completed coaching episode, the exact miss reduction, scoped evidence, correction and voluntary participation. Include the safe inert target, inspectable private progress, actual observed-shot requirement, chosen coaching activity, interruption and no stacking. No target grind prerequisite, general XP, automatic firing, forced NPC agreement, paid teaching or absence decay.

**Completion:** compare ordinary beginner hunting, six independent releases, three plus genuine completed coaching, missing/declining coach, interrupted feedback, mixed practice/hunts, blocked release and corrected evidence. Improvement affects later shots only; ammunition, saved randomness and material outcomes remain exact. Obtain separate evidence of real NPC choice and native accounting; a fixture choosing Accept is not character-quality evidence. Do not claim the finite arithmetic proves that players appreciate the improvement.

## AV04 — Build, use and change a small home

Implement the selected DG13 canopy/two-bay profile from the [shelter product owner, section 14](editable-shelters-feature-spec.md#14-dg13-expansion--make-a-place-use-it-and-change-it) and [authored world rules](../worlds/base/editable-shelters.md), consuming PX05's completed technical design. This follows PX05; it does not redo that assignment or treat the entire broader building vision as one release.

**Journey.** An authorized builder previews a small canopy near a useful place, installs actual posts and ties the actual cloth. They rest beneath it, leave an eligible object under cover, invite someone to visit, then extend the structure or reclaim its same materials. A controlled shower makes covered and exposed material behave differently without creating sleep, health or fire penalties. The cloak can also be worn under its qualified attachment rule.

Include real geometry/clearance, phased work, builder/material permission, persistent parts, finite rain/moisture, ordinary use, alteration, cover replacement, safe light-cover support failure and reclaim. Existing spatial navigation, object custody, state contributions and rest remain the owners. The first scene has one authorized builder; visitors gain no editing or inventory rights. No private locked room, heavier roof, arbitrary building generator, farming, recurring storm chore or new wet-tinder requirement.

**Completion:** one bay and its two-bay extension work through ordinary UI, with true covered/exposed placement, rest/visitor use, an interruption between real phases and current-format restoration. Replacing or removing parts preserves identity/quantity and never teleports occupants. Invalid placement, unauthorized materials, competing edits and support removal give understandable outcomes. Intact reversible dismantling returns actual surviving parts; it does not generate a second kit. Prove the shelter is attractive/useful without imposing a new penalty to force use.

## AV05 — Catch and cook a river meal

**Journey.** A player learns an ordinary fishing-tool method, gathers its materials, crafts it and walks to one of two recognizable reaches. They inspect the location and choose one cast. The committed attempt may catch a fish or return empty. They can stop, try again or try the other reach. A catch becomes a real item; cooking at a real lit fire produces food that can be eaten, carried or offered through existing controls.

The [river-meal profile](../worlds/base/river-fishing.md) owns the tool, stock, timing, probabilities, output and food rules. Landscape color never makes an arbitrary blue surface fishable. Preserve distinction between finite authored fish supply and a simulated breeding population. Do not grant advance knowledge of a hidden roll or every reach's remaining quantity.

Deliver one compatible tool family, two real local sources, one chosen bounded cast, finite catch accounting and food-to-food transformation through the current cooking owner. Extend cooking to world-defined recipes with exact inputs, outputs, work and heat requirements; retain existing meat behavior through that same contract. No fish-only cooking handler, rod repair, bait economy, timing minigame, automatic recast, thirst, spoilage, regrowth or boats. NPCs receive relevant permitted offers, not a fishing goal or mandatory hunger response.

**Completion:** craft → approach → cast → actual catch → cook → eat and offer/carry alternatives work. An empty cast, exhausted source, unavailable tool, movement/cancellation, last-fish competition, extinguished fire, stale input and save/reopen retain truthful costs/outcomes. Another admissible recipe with different real input/output demonstrates that preparation generalization is not a fish/meat name switch. Live NPC choice is reported separately from native execution, with exact cost under current policy.

## Allocation and sequencing

Five engineers can own the five assignments. **They are not all fully startable from today's main.** No worker needs another worker's messages; the owner supplies prerequisite revisions. Source contract ownership and exact partial-start boundaries are in the technical design.

1. Integrate the already delivered threat branch and reconcile its PG05/PX01 documentation before AV02's combat integration and AV01's dangerous-route qualification. Do not re-select mortality or silently retain the obsolete recovery proposal.
2. Supply PX03 for AV01's complete discovered-place UI and AV02 for its final two-handed spear integration. AV01's physical sites, rewards and recipe-record work can proceed independently first.
3. Supply PX05's complete technical design before AV04 implementation. AV04 also consumes AV02's equipment attachment owner for cloak wearing; geometry/construction can proceed after PX05 while that smaller dependency finishes.
4. AV03 and AV05 can start on current main plus this plan. AV02 owns migration of current callers to the new equipment contract; AV03 owns accuracy progression, AV05 food preparation, AV04 construction. Their shared action/cognition/persistence entrypoints consume those owners rather than duplicate them.
5. Qualify the combined journey after integration: choose useful gear → explore → face or avoid danger → gain an improvement → catch/prepare a meal → use an altered shelter → return with the same world consequences. Participation and learning remain chosen; this is an acceptance route, not a forced player or NPC script.

## Estimates and uncertainties

Ranges include implementation, relevant checks, documentation and integration; exclude test code from logic estimates. They are planning judgments, not AI throughput promises or an inherited 400-hour target.

| Assignment | Changed logic estimate | Engineering effort | Main risk                                                                                                                 |
| ---------- | ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| AV01       | 800–1,400 lines        | 3–5 engineer-days  | Reward knowledge and route discovery accidentally grant hidden information; content depends on supplied PX03/threat work. |
| AV02       | 1,600–2,600 lines      | 5–8 engineer-days  | Equipment authority touches transfer, death, save and all attack callers; guard must affect one real resolution.          |
| AV03       | 1,200–2,100 lines      | 4–7 engineer-days  | Observation/consent/correction across actual coaching; modest progression may prove uninteresting.                        |
| AV04       | 2,500–4,000 lines      | 8–12 engineer-days | Real geometry, material authority, phased work and rain interaction; PX05 must be supplied first.                         |
| AV05       | 1,200–1,900 lines      | 4–6 engineer-days  | Finite resource/roll continuity and general preparation without a second mutation owner.                                  |

Total: roughly **24–38 engineer-days**, with the shelter task the likely critical path. Parallel execution does not make dependencies disappear. This is a substantial next allocation, not a promise that all five finish in one calendar week. Rescope with the owner if an actual staffing/time budget is imposed; do not quietly omit acceptance.

## Decisions and evidence that could change selection

No new developer policy answer is needed to compare these scopes. Existing mortality, privacy, world boundaries and no-legacy rules remain controlling. Numerical content below is explicitly proposed tuning; it is not a claim of user-approved balance. If a prerequisite reveals an unresolved developer decision, finish only independent work and ask under AGENTS.md before its dependent design or implementation.

Revisit selection if integrated play already has a rewarding second expedition, if real guard timing is unreadable at the current clock, if practice adds obligation without appreciated benefit, or if building cannot meet its useful first-family scope without a larger structural project. A proved integrity defect can preempt a feature. These are concrete reasons to reconsider, not permission to substitute minor chores or close unverified requirements.

## Maintained records

- Implementation/status: [AV01–AV05](../maintainers/parallel-batch-05-adventure-defense-and-home.md).
- Constraints: [batch 05 inventory](../limits/parallel-batch-05-adventure-defense-and-home.md), with links to canonical competence/shelter limits.
- Mechanisms: [technical design](parallel-batch-05-adventure-defense-and-home-tech-design.md); [copyable prompts](parallel-batch-05-adventure-defense-and-home-prompts.md).
- Allocation history: [numbered register](parallel-batches.md). Batches 01–04 retain their existing numbers, IDs and completion criteria.
