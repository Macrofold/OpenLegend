# First playable — delivery and player validation

| Status      | Current progress                                                                                                                              | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Required experience and test procedure are specified. Integrated-build readiness, remaining mechanic delivery and player acceptance are open. | 2026-10-17   |

**Start here:** [required scenario](../worlds/base/playable-openings.md#first-playable-game-target) → [playtest plan](../projects/first-playable-playtest-plan.md) → the tasks below. This is the coordination owner for **DG03 / ND26**. The world document owns the experience; [gameplay priorities](../repertoires/gameplay-priorities.md) owns selection; subsystem trackers own detailed delivery. [CO01](commercial-offers.md) owns commercial adoption independently of ordinary playtesting.

## Required capability and owner map

Use this map to establish readiness on the actual working revision. Its gaps describe required qualification, not a fresh audit of runtime behavior. Reuse valid component evidence and check only changed assumptions. A supplied opening or a completed component does not establish the combined experience.

| Required experience                                                                                              | Existing owners                                                                                                                                                                                                         | Remaining qualification                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Survive from nothing](../worlds/base/playable-openings.md#survival-first-arrival)                               | [Openings/OC](parallel-batch-07-playable-world-creation.md), [base world](base-world.md), [actions](action-capabilities.md)                                                                                             | Hand-accessible food/materials and a noncircular tool/fire/meal chain from the actual empty-handed start, with fair learning time and a viable continuation after mistakes.                                                      |
| [Resources and known crafting](../worlds/base/playable-openings.md#natural-resources-and-known-crafting)         | [INV](inventions-and-world-evolution.md), [objects/custody](persistent-objects.md), actions and base world                                                                                                              | Findable complementary materials, discoverable useful recipes, adequate stock and a real invented alternative that can be made and reused.                                                                                       |
| [Defensible home](../worlds/base/playable-openings.md#a-camp-the-player-can-defend-and-call-home)                | [SH01–SH06](editable-shelters.md), [shelter feature spec](../projects/editable-shelters-feature-spec.md), [technical design](../projects/editable-shelters-tech-design.md), [spatial work](spatial-world.md), PO/INV/BW | Extend the selected canopy/lean-to foundation for walls, ordinary entrances, production from natural materials and meaningful defensive geometry; settle supported breach/damage and recovery behavior in those owners.          |
| [Distinct friendly cast](../worlds/base/playable-openings.md#four-or-five-differentiated-non-hostile-characters) | [CE01–CE05](character-experience.md), [character feature spec](../projects/compelling-characters-feature-spec.md), [technical design](../projects/compelling-characters-tech-design.md), ACT/AG/CR                      | Four or five existing/authored identities with distinguishable aims, preferences, boundaries and independent conduct, including observable consequences beyond conversation.                                                     |
| [Cooperation and exchange](../worlds/base/playable-openings.md#things-to-do-together)                            | [Social contract](../worlds/base/social.md), [PX02/PX04](parallel-batch-04-expeditions-and-exchange.md), [CF04](parallel-batch-06-rivals-and-contested-ground.md), AG/CE/INV                                            | Small alliances, grounded guidance, an actual joint hunt and sharing/trade; qualify consent, refusal, departure and actual proceeds/custody without formal institutions.                                                         |
| [Predators and dark travel](../worlds/base/playable-openings.md#wildlife-darkness-and-predators)                 | Base world, [first threat](../worlds/base/first-threat-encounter.md), AC/AG and spatial perception/light owners                                                                                                         | Selected roaming predator/group behavior, readable danger, real defenses and escape. Stag evidence alone does not qualify wolves or packs.                                                                                       |
| [Roaming hostile people](../worlds/base/playable-openings.md#distant-hostile-people-and-unscripted-camp-contact) | CF01–CF05 and their existing design pair, AG/CE and social                                                                                                                                                              | Resource/hunt/exploration purposes leading through real travel and perception to camp discovery; meaningful fight, de-escalation, trade and flight opportunities. Qualify reachability and ordinary encounter pacing separately. |
| [Adventure and continuing consequence](../worlds/base/playable-openings.md#full-experience-acceptance-and-scope) | [Expeditions/rewards](parallel-batch-04-expeditions-and-exchange.md), [save/load](save-and-load.md), knowledge/custody/history owners and [verification](../verification.md)                                            | A worthwhile destination/challenge, useful reward or improvement, and another activity where it matters; coherent camp, stock and observed relationship consequences on return.                                                  |
| Participant access                                                                                               | [PD01–PD10](production-deployment.md), enabled MP/privacy/accounting owners                                                                                                                                             | Qualify the actual supervised or hosted test arrangement. Adult audience and browser delivery are selected; broader service and payment acceptance remain separate.                                                              |

## Immediate sequence

FPV01 selects a meaningful testable activity and identifies its actual gaps. Complete its necessary design under FPV02, integrate under FPV03 and qualify the session under FPV04. Repeat this cycle as useful evidence arrives; **finishing every scenario subsystem is not a prerequisite for an honest partial playtest**. FPV09 retains the complete first-playable target.

Prepare audience material and investigate offers alongside game work. Outreach, participant access and spending require the applicable authorization and readiness. Work packages with unfinished shared prerequisites are sequential, not independent parallel assignments.

## FPV01 — Baseline and requirement coverage

- [ ] Pin the available build/branch and map each required experience to its implementation task, applicable evidence and remaining design, delivery or player-evidence gap.
- [ ] Select the next activity by player value and the uncertainty it can resolve. State what the player can do, choose, gain or lose, why the activity is worthwhile, and which full-scenario requirements it does not cover.

**Exit:** one build/readiness record with the selected activity, prerequisites, missing coverage and next decision. Keep it here until actual findings warrant the focused verification report; do not create a second backlog.

## FPV02 — Finish the necessary detailed design in existing owners

- [ ] **Survival and recipes:** select natural sources, starting condition, collection/processing dependencies and known camp recipes. Check the complete chain, discoverability, resource sufficiency and recovery from foreseeable loss or depletion; resolve quantities/costs in existing inventories.
- [ ] **Camp walls and entrance:** extend the shelter pair/world profile for real inputs/work, placement, permissions, partial building, alteration/reclaim, blocking/cover, any selected damage/breach and save/recovery.
- [ ] **Cast and cooperation:** reconcile existing identities and define the selected alliance/hunt/help journeys, knowledge-grounded advice, refusal/withdrawal and actual resource custody.
- [ ] **Animal and human roaming:** extend threat/rivals/agency owners for supported perception, group behavior, independent destinations, route failure, lost contact, discovery and alternatives to fighting. Scope useful opportunities without a guaranteed raid day.

**Exit:** adequate paired definitions, world-owned rules and limits for the selected missing mechanics. Reuse already adequate foundations; do not redesign a component merely because combined acceptance remains open.

## FPV03 — Deliver and integrate the selected experience

- [ ] Deliver authorized missing slices in their subsystem owners; link exact task/commit evidence rather than copying their checklists here.
- [ ] Integrate through the shared main-world initializer and ordinary player controls, permissions, knowledge and resources. Known crafting and live useful invention retain their distinct identities.
- [ ] Qualify affected baseline behavior, disclosure, accounting, cancellation, responsiveness and current-format continuation; retain explicitly unrun wider coverage.

**Exit:** a reproducible build supports the selected activity through the real player path. Labeled technical fixtures may qualify components, not player-made survival or independent choice.

## FPV04 — Session operations and release readiness

- [ ] Record the operator, invitation permission, adult-participant criteria, browser/access arrangement, consent, support, applicable authorized time/spend and stopping conditions.
- [ ] Run relevant existing checks on the offered configuration, including meaningful failures and separately authorized live-provider work where required.
- [ ] Choose supervised/disposable testing or a qualified hosted invitation service and satisfy the applicable PD/MP requirements. Resolve any needed owner decision on real-user continuity before promising retained progress.

**Exit:** the disclosed session can run safely within its actual operating envelope. Supervised learning does not certify a public service.

## FPV05 — Audience materials and recruitment

- [ ] Prepare truthful gameplay material, a concise invitation, a real access/contact destination and a manually checked relevant contact shortlist using existing marketing owners.
- [ ] Invite participants after authorization/readiness; record recruitment source and distinguish survival-adventure players, authoring/developer interest and supporters.

**Exit:** an appropriate invited group with clear consent/support expectations. Recruitment volume follows the learning question and operator capacity, not a fixed posting or contact quota.

## FPV06 — Observe survival, building and character choice

- [ ] Observe the selected journey without unrecorded coaching: expectations, confusion, meaningful choices, effort/payoff, food/tool/camp progress and stopping reasons.
- [ ] Observe character preferences and useful voluntary cooperation; distinguish independent refusal from broken service or expired requests.
- [ ] Record failed/unsupported invention, waits, cost and interventions alongside successful activity and enjoyment.

**Exit:** findings identify the build, participant source, denominator, session setup and missing coverage. Follow the [plan's evidence distinctions](../projects/first-playable-playtest-plan.md#step-5--separate-the-questions-being-answered).

## FPV07 — Danger, unscripted contact and returning play

- [ ] Qualify predator danger, camp defenses and escape/failure through actual geometry and valid choices; distinguish authored test setup from naturally encountered events.
- [ ] Establish independent camp contact from the originating purpose through known/perceived destination, travel and discovery, without hidden player tracking or manually directing the encounter.
- [ ] Observe whether ordinary resource trips, exploration and camp use expose understandable, worthwhile opportunities. Technical reachability alone does not establish good pacing; legitimate avoidance need not be a defect.
- [ ] Cover applicable fight, de-escalation, exchange and retreat outcomes across suitable sessions. Observe optional return play with coherent camp/resources and consequences; separate voluntary return from a requested QA revisit.

**Exit:** the covered journeys have appropriate technical/behavioral evidence and bounded human observations, with missing outcomes stated explicitly.

## FPV08 — Diagnose, fix and retest

- [ ] Record consequential findings in the focused verification report when actual results exist; route corrections to existing subsystem/marketing owners.
- [ ] Address the dominant experience failure, whether comprehension, reliability, pacing, repetition, payoff or missing capability. Retest clarity with fresh people where practical and continuing value with appropriate return sessions.
- [ ] Update the operating decision with evidence, competing explanation, next experiment and commitment limit; keep raw private data and generated traces out of Git.

**Exit:** an evidenced advance/rework/pause decision, with unresolved requirements still open.

## FPV09 — Complete first-playable and next commitment decision

- [ ] Account for every [full-scenario requirement](../worlds/base/playable-openings.md#full-experience-acceptance-and-scope), not only the easiest demonstrated subset.
- [ ] Distinguish correctness, real invention/independent choices, uncoached understanding/enjoyment, repeat value, broader demand and delivery cost. Commercial preference/payment remains CO01/CO05 work.
- [ ] Recommend the next justified commitment: necessary game work, broader relevant outreach, scoped help or a separately qualified commercial test.

**Exit:** the whole target is supported by identified evidence and remaining uncertainty, and the next commitment fits the actual operating envelope. Public release and payment retain their own approvals.

## Evidence and maintenance

The [playtest plan](../projects/first-playable-playtest-plan.md) owns procedure. Existing subsystem reports own their results. Create `docs/verification/first-playable-experience.md` only for actual integrated/player findings and link it from [verification](../verification.md) and here. Record revision, environment, setup, observed outcomes, costs and unrun coverage; keep participant identities, raw recordings and private traces outside the repository.

Maintain task status once, in its owning tracker. The [execution brief](../../archive/02-research/indie-launch-commercials/execution-brief.md) is a navigation and decision aid, not a parallel backlog.
