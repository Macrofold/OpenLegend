# First playable — delivery and player validation

| Status      | Current progress                                                                                                                                                                                          | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The complete Main implementation and recorded full local build/check pass are available; integrated gameplay/performance, independent-character/invention and real-participant qualification remain open. | 2026-10-24   |

**Start here:** [complete design map](../projects/first-playable-world-feature-spec.md#complete-design-map) → [required scenario](../worlds/base/playable-openings.md#first-playable-game-target) → [playtest plan](../projects/first-playable-playtest-plan.md) → the tasks below. This is the coordination owner for **DG03 / ND26**. The world document owns the experience; [gameplay priorities](../repertoires/gameplay-priorities.md) owns selection; subsystem trackers own detailed delivery. [CO01](commercial-offers.md) owns commercial adoption independently of ordinary playtesting.

Current animal delivery uses sequential escape and entity-local path waits; the
[October 22 evidence](../verification/first-playable-world/2026/2026-10-24-final-controls-and-continuation.md#sequential-escape-local-path-waits-and-hunting--october-22)
records current native/SQL continuation, a four-shot cooperative deer kill and
harvest/share, and actual 100/500 all-alarm server measurements. Those populations
have no throughput target; both remain overloaded. Ordinary-world performance,
independent character/invention behavior and participant acceptance are not closed
by these controlled cases. Reuse unchanged browser/material/shelter evidence.

The [October 23 performance campaign](../verification/performance/2026-10/animal-reductions.md)
implements all eighteen reductions through shared spatial, native, storage and
projection owners, including bounded geometry execution. Short
ordinary-speed server runs cover 10/20/50 added alarmed animals; 50 remains slow,
so 100/200/500 were not repeated. Required whole-world performance and human gates
remain open; these diagnostic counts are not population requirements. Requested
review reproduced and fixed the simulation TypeError: stopping an old escape to
wait for another route now refreshes its movement forecast. The captured failing
scenario continues through 252 game seconds after the fix. Historical failures
and current verification are retained in the campaign record.

## Required capability and owner map

Use this map to establish readiness on the actual working revision. The [complete design map](../projects/first-playable-world-feature-spec.md#complete-design-map) supplies SV/SH/CP/RW/FPW implementation owners; all former selected mechanic-design gaps are now designed. Its gaps describe required qualification, not a fresh audit of runtime behavior. Reuse valid component evidence and check only changed assumptions. A supplied opening or a completed component does not establish the combined experience.

| Required experience                                                                                              | Existing owners                                                                                                                                                                                                         | Remaining qualification                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Survive from nothing](../worlds/base/playable-openings.md#survival-first-arrival)                               | [Openings/OC](parallel-batch-07-playable-world-creation.md), [base world](base-world.md), [actions](action-capabilities.md)                                                                                             | Hand-accessible food/materials and a noncircular tool/fire/meal chain from the actual empty-handed start, with fair learning time and a viable continuation after mistakes.                                                      |
| [Resources and known crafting](../worlds/base/playable-openings.md#natural-resources-and-known-crafting)         | [INV](inventions-and-world-evolution.md), [objects/custody](persistent-objects.md), actions and base world                                                                                                              | Findable complementary materials, discoverable useful recipes, adequate stock and a real invented alternative that can be made and reused.                                                                                       |
| [Defensible home](../worlds/base/playable-openings.md#a-camp-the-player-can-defend-and-call-home)                | [SH01–SH06](editable-shelters.md), [shelter feature spec](../projects/editable-shelters-feature-spec.md), [technical design](../projects/editable-shelters-tech-design.md), [spatial work](spatial-world.md), PO/INV/BW | Implement and qualify the completed SH07–SH12 natural wall/gate/breach/recovery design through actual geometry and ordinary controls.                                                                                            |
| [Distinct friendly cast](../worlds/base/playable-openings.md#four-or-five-differentiated-non-hostile-characters) | [CE01–CE05](character-experience.md), [character feature spec](../projects/compelling-characters-feature-spec.md), [technical design](../projects/compelling-characters-tech-design.md), ACT/AG/CR                      | Four or five existing/authored identities with distinguishable aims, preferences, boundaries and independent conduct, including observable consequences beyond conversation.                                                     |
| [Cooperation and exchange](../worlds/base/playable-openings.md#things-to-do-together)                            | [Social contract](../worlds/base/social.md), [PX02/PX04](parallel-batch-04-expeditions-and-exchange.md), [CF04](parallel-batch-06-rivals-and-contested-ground.md), AG/CE/INV                                            | Small alliances, grounded guidance, an actual joint hunt and sharing/trade; qualify consent, refusal, departure and actual proceeds/custody without formal institutions.                                                         |
| [Predators and dark travel](../worlds/base/playable-openings.md#wildlife-darkness-and-predators)                 | Base world, [first threat](../worlds/base/first-threat-encounter.md), AC/AG and spatial perception/light owners                                                                                                         | Selected roaming predator/group behavior, readable danger, real defenses and escape. Stag evidence alone does not qualify wolves or packs.                                                                                       |
| [Roaming hostile people](../worlds/base/playable-openings.md#distant-hostile-people-and-unscripted-camp-contact) | CF01–CF05 and their existing design pair, AG/CE and social                                                                                                                                                              | Resource/hunt/exploration purposes leading through real travel and perception to camp discovery; meaningful fight, de-escalation, trade and flight opportunities. Qualify reachability and ordinary encounter pacing separately. |
| [Adventure and continuing consequence](../worlds/base/playable-openings.md#full-experience-acceptance-and-scope) | [Expeditions/rewards](parallel-batch-04-expeditions-and-exchange.md), [save/load](save-and-load.md), knowledge/custody/history owners and [verification](../verification.md)                                            | A worthwhile destination/challenge, useful reward or improvement, and another activity where it matters; coherent camp, stock and observed relationship consequences on return.                                                  |
| Participant access                                                                                               | [PD01–PD10](production-deployment.md), enabled MP/privacy/accounting owners                                                                                                                                             | Qualify the actual supervised or hosted test arrangement. Adult audience and browser delivery are selected; broader service and payment acceptance remain separate.                                                              |

## Immediate sequence

FPV01 selects a meaningful testable activity and identifies its actual gaps. Complete its necessary design under FPV02, integrate under FPV03 and qualify the session under FPV04. Repeat this cycle as useful evidence arrives; **finishing every scenario subsystem is not a prerequisite for an honest partial playtest**. FPV09 retains the complete first-playable target.

Prepare audience material and investigate offers alongside game work. Outreach, participant access and spending require the applicable authorization and readiness. Work packages with unfinished shared prerequisites are sequential, not independent parallel assignments.

For the combined implementation assignment, follow the [single-AI combat → speech → world sequence](../projects/first-playable-world-tech-design.md#implementation-order-and-independent-task-boundaries). Run the existing early combat/hunting and usable-subset checks within those phases, then the linked shared-owner cases after integration. All subsystem runtime work belongs to that assignment; human participants and authorization for outreach remain actual external requirements. Complete available technical work and session preparation, but keep unperformed human acceptance open.

## FPV01 — Baseline and requirement coverage

- [x] Pin the available build/branch and map each required experience to its implementation task, applicable evidence and remaining design, delivery or player-evidence gap.
- [x] Select the next activity by player value and the uncertainty it can resolve. State what the player can do, choose, gain or lose, why the activity is worthwhile, and which full-scenario requirements it does not cover.

**Exit:** one build/readiness record with the selected activity, prerequisites, missing coverage and next decision. Keep it here until actual findings warrant the focused verification report; do not create a second backlog.

### October 17 design source baseline

Local `main` and `origin/main` at `0543f9ec61301240c5c4ec3cd007063f4f1c25d6` in `https://github.com/Macrofold/OpenLegend.git` were inspected for this design. The [source table](../projects/first-playable-world-tech-design.md#scope-and-current-source-baseline) records supplied-player/empty-berry, open-shelter, wandering-animal and existing social/creation behavior against the required changes. This is not an executed build/readiness record and does not close FPV01's actual-build checks. Within the combined sequence, world implementation begins after combat/speech with the shared bundle/authority contract and a complete bare-hand food/tool/material route; no new player-evidence report is created for design-only work.

### Active build and requirement coverage

The concise [remaining-work inventory](../projects/first-playable-world-tech-design.md#remaining-work-inventory) distinguishes missing runtime, demonstrated failures, required verification and unavailable participant/external evidence. The owner permits overlapping final checks to be consolidated after implementation stabilizes; immediate authority/privacy/storage checks and every final obligation remain required.

Implementation branch: `codex/implement-complete-first-playable`, starting at
`19a0c303a89d3cb278db1cbbbe5b95e2e6e26fe1` (local `main` and freshly fetched
`origin/main`, `https://github.com/Macrofold/OpenLegend.git`, October 18, 2026).
`pnpm typecheck` and `pnpm build` pass on that starting revision. The build reports
existing browser externalization and large-bundle warnings; this is static/build
evidence, not an executed gameplay or performance pass.

| Required world experience                          | Delivered software and evidence                                                                                                                                                                                                                                                                                                                                   | Remaining acceptance                                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Empty-handed survival, tools, fire and recovery    | Ordinary Main reaches food, a tool, fire, finite work and a complete camp; [the connected journey](../verification/first-playable-world/2026/2026-10-24-residents-and-cooperation.md#complete-main-and-personal-agreement-integration) retains actual sources and consequences.                                                                                   | Remaining lifecycle/scale checks and uncoached usefulness.                                              |
| Walls, gates, shelter, storage and physical breach | Small, ordinary and supplied-component maximum layouts, real barriers/damage/repair, rain and baskets are installed. [Final construction review](../verification/first-playable-world/2026/2026-10-24-construction-and-movement-review.md#final-construction-review-and-completion-audit--october-21) covers exact grant selection and capacity refusal.          | Wider SH12 lifecycle/UI/scale matrix and player experience.                                             |
| Four distinct residents and voluntary cooperation  | Exact exchange, finite guide/help/hunt and revocable agreements are installed; [mixed work/restoration](../verification/first-playable-world/2026/2026-10-24-control-and-recovery-review.md#mixed-cooperative-work-and-idle-restoration--october-20) preserves independent and committed work.                                                                    | Independent willingness/usefulness is blocked by unresolved provider execution; wider CP qualification. |
| Wildlife and independent human roaming             | One native controller supports feeding, moving contact, pack approaches and existing territorial encounters; [current barrier cases](../verification/first-playable-world/2026/2026-10-24-construction-and-movement-review.md#current-barrier-navigation-and-resident-review--october-21) include wolf/bear contact, lost pack sight and seven pack-policy cases. | Ordinary pacing, independent human supply travel/discovery and wider lifecycle/scale.                   |
| Physical conflict and speech during work           | Contact, personal danger, complete choices while busy, speech/recognition and exact memory are connected. [Combined cases](../verification/first-playable-world/2026/2026-10-24-connected-world-qualification.md#combined-busy-work-and-alternate-world-contracts--october-20) cover repeated assault during craft and shared animal evidence.                    | Ada's preserved 0/12 counterattack gate, remaining CTR/SPK matrices and complete reaction performance.  |
| Useful geography and complete ordinary opening     | The shared initializer selects reconciled 128 × 112 Main; ordinary browser entry, gathering, meals and fresh-world recovery pass in [the connected control journey](../verification/first-playable-world/2026/2026-10-24-connected-world-qualification.md#connected-control-and-recovery-qualification--october-20-2026).                                         | Wider controls/layout coverage and uncoached discovery/pacing.                                          |
| Useful invention, exploration and reuse            | A genuinely live-generated sling is admitted, manufactured, fired, reused and reaches hunt-to-meal consequences; [invention evidence](../verification/first-playable-world/2026/2026-10-24-connected-world-qualification.md#connected-invention-and-decision-preparation--october-20-2026) distinguishes it from installed authored methods.                      | Best-known-alternative/player-value comparison and independent invention choice.                        |
| Return, consequences, privacy and player learning  | Current-format checkpoints, exact grants/receipts, personal evidence and protected committed effects have native/PostgreSQL/browser evidence in [the complete review](../verification/first-playable-world/2026/2026-10-24-integrated-implementation-review.md#requested-complete-implementation-review--october-20).                                             | Remaining combined continuation/disclosure matrix, full-path performance and actual learning.           |
| Real-player experience                             | The [supervised session packet](../projects/first-playable-playtest-plan.md#supervised-session-handoff-for-the-complete-main) is prepared.                                                                                                                                                                                                                        | Actual participants, comprehension, usefulness, enjoyment and return evidence are unavailable.          |

Current retained source `d4b62732e` passes the complete configured `pnpm check`:
**833/833 tests across 58 files** in 676.02 seconds, all static stages and the
production build/asset guard. The preceding recipe-retrieval deadline passed in
isolation after host load changed; no code or deadline change was needed.
[Current review evidence](../verification/first-playable-world/2026/2026-10-24-repair-survival-and-restoration.md#bare-hand-recovery-and-food-source-review--october-22)
records source/order/collision/feeding corrections and exact consumer coverage.
Blocked-travel and map-publication corrections also pass their focused native
checks and [current complete-outcome comparisons](../verification/first-playable-world/2026/2026-10-24-repair-survival-and-restoration.md#final-movement-and-geometry-corrections--october-22).
Wider matrices, failed complete-path speed, independent conduct, Ada's preserved
0/12 gate and actual participant acceptance remain open. The unresolved provider
execution blocks its live follow-up.

The completed source review reuses the ordinary Main food/work/camp/recovery
journey and its checkpoints; remaining qualification is scoped by the table above. The [integration evidence](../verification/first-playable-world/2026/2026-10-24-residents-and-cooperation.md#complete-main-and-personal-agreement-integration)
records actual results and failed gates. Software correctness, independent AI
behavior and participant experience remain separate acceptance obligations.
The [active implementation plan](../projects/first-playable-world-tech-design.md#active-implementation-plan)
owns the full sequence and cross-layer risk. FPV01 closes build/coverage selection only: the selected activity is the empty-handed Main food → useful crafting → camp → recovery journey, with actual outcomes, failures and explicit independent/human gaps recorded. FPV03/FPV04/FPV09 retain full integration, operating readiness and experience acceptance; failed performance and remaining qualification gates are not waived.

## FPV02 — Finish the necessary detailed design in existing owners

**Completed design, October 17, 2026; runtime/evidence remain open.**

- [x] **Survival and recipes:** [SV feature/technical pair](../projects/first-playable-survival-feature-spec.md), [exact resources/recipes](../worlds/base/first-playable-survival.md) and [SV tasks](first-playable-survival.md) settle starting condition, noncircular collection/processing, quantities/work, discoverability, invention and loss/depletion recovery.
- [x] **Camp walls and entrance:** [extended shelter pair](../projects/editable-shelters-feature-spec.md), [world rules](../worlds/base/editable-shelters.md) and [SH07–SH12](editable-shelters.md) settle natural inputs, actual layout/clearance, partial work, grants, gate/bar, damage/repair/reclaim and continuation.
- [x] **Cast and cooperation:** [CP pair](../projects/first-playable-cooperation-feature-spec.md), [people](../worlds/base/first-playable-people.md) and [CP tasks](first-playable-cooperation.md) settle four existing identities, exact help/guide/hunt/alliances, consent/withdrawal and actual resource custody.
- [x] **Animal and human roaming:** [RW pair](../projects/first-playable-roaming-feature-spec.md), [authored profile](../worlds/base/first-playable-roaming.md) and [RW tasks](first-playable-roaming.md) settle finite feeding, local pack hunting, distant human opportunities/travel/discovery, lost contact, failures and alternatives to fighting.
- [x] **Whole-world integration:** [shared pair](../projects/first-playable-world-feature-spec.md), [layout](../worlds/base/first-playable-layout.md), [limits](../limits/first-playable-world.md) and [FPW tasks](first-playable-world.md) settle typed YAML/native boundaries, complete consumer paths, atomic material/site authority, useful-content union, ordinary controls, dependencies and acceptance.

**Exit met for design only:** selected mechanics have adequate paired definitions, world-owned rules, limits and implementation exits. Source review, paper scenarios and document checks do not establish a running first-playable world. CTR/SPK and existing foundation qualification retain their own tasks. Broader ND/DG umbrellas remain separate.

## FPV03 — Deliver and integrate the selected experience

- [x] Deliver authorized missing slices in their subsystem owners; link exact task/commit evidence rather than copying their checklists here.
- [x] Integrate through the shared main-world initializer and ordinary player controls, permissions, knowledge and resources. Known crafting and live useful invention retain their distinct identities.
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

- [ ] Observe the selected journey without unrecorded coaching, using the [plan's observation questions](../projects/first-playable-playtest-plan.md#step-4--observe-distinct-player-journeys): expectations, confusion, meaningful choices, effort/payoff, food/tool/camp progress and stopping reasons.
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
