# First playable — delivery and player validation

| Status | Current progress | Last updated |
|---|---|---|
| In progress | Scenario requirements and the playtest plan are documented; remaining camp, resource, cooperation and roaming-conflict design/delivery must be qualified before full player acceptance. | 2026-10-17 |

**Start here:** [required first-playable scenario](../worlds/base/playable-openings.md#first-playable-game-target) → [playtest plan](../projects/first-playable-playtest-plan.md) → the tasks below. This tracker implements the coordination portion of **DG03 / ND26**, not a new first-world specification or a second combat, construction, character or deployment backlog. [Gameplay priorities](../repertoires/gameplay-priorities.md) owns selection. [Commercial offer decisions](../projects/initial-commercial-offer-decision-brief.md) remain separate.

## Current evidence boundary

Documentation was prepared on `research/indie-launch-commercial-dossiers` from GitHub commit `8220ed913752f5a45678f4d01c82465ccebf8024`. This identifies the inspected records, not a claim that another branch's work is integrated into current local main. Existing specifications describe Main world's equipped/supplied opening, the selected canopy/lean-to construction, known activities, characters and encounter subsets. None of those alone establishes the full empty-handed camp-and-conflict experience.

A request to implement this plan must first resolve the actual working revision, reuse valid evidence and check the precise remaining dependencies. This documentation task does not create code, charge accounts, contact participants or certify an outside-player service. Checked preparation is not checked gameplay.

## Required capability and owner map

The source sections below own the full scenario. This table records remaining work and routes it; it does not reproduce every mechanical rule or close parent acceptance.

| Required experience | Existing owners and reusable work | Gap to resolve for the first-playable target |
|---|---|---|
| [Survive from nothing](../worlds/base/playable-openings.md#survival-first-arrival) | `playable-openings.md`; [world creation/OC](parallel-batch-07-playable-world-creation.md); [base world](base-world.md); native survival and existing known actions | Main/solo currently supply equipment or prepared stock. Specify and deliver hand-gatherable food/materials, noncircular tool/fire/meal progression, fair starting condition and truthful onboarding. |
| [Resources and known crafting](../worlds/base/playable-openings.md#natural-resources-and-known-crafting) | [INV material/composition and invention work](inventions-and-world-evolution.md); [objects/material custody](persistent-objects.md); [action capabilities](action-capabilities.md); [world content](base-world.md) | Select actual sources, useful properties and recipes from the broader palette. Make known survival/camp recipes accessible and useful; qualify a real invented alternative without claiming universal composition. |
| [Build a defensible home](../worlds/base/playable-openings.md#a-camp-the-player-can-defend-and-call-home) | [Editable shelters SH01–SH06](editable-shelters.md), its [feature spec](../projects/editable-shelters-feature-spec.md) / [technical design](../projects/editable-shelters-tech-design.md), [spatial work](spatial-world.md), PO/INV/BW | Reuse qualified canopy/lean-to foundations. Walls, usable entrances, material-from-nature production, defensive geometry and any selected breach/damage behavior need scoped design and delivery; a cloth roof is not a completed camp defense. |
| [Distinct friendly cast](../worlds/base/playable-openings.md#four-or-five-differentiated-non-hostile-characters) | [CE01–CE05](character-experience.md); [character feature spec](../projects/compelling-characters-feature-spec.md) / [technical design](../projects/compelling-characters-tech-design.md); ACT/AG/CR and current authored cast | Reconcile four/five initially non-hostile individuals with distinct aims, voice, values, preferences and boundaries, then demonstrate distinguishable independent behavior. Do not create duplicate identities or infer personality from names. |
| [Alliances, help, hunting and exchange](../worlds/base/playable-openings.md#things-to-do-together) | [Social world contract](../worlds/base/social.md); PX02/PX04 in [expeditions and exchange](parallel-batch-04-expeditions-and-exchange.md); CF04 in [rivals](parallel-batch-06-rivals-and-contested-ground.md); AG/CE/INV | Existing barter, travel and combat-help are reusable subsets. Complete the selected small alliance and joint-hunt journey, knowledge-grounded guidance and actual shared/traded resources. Specify consent, withdrawal and proceeds without requiring formal institutions. |
| [Predators and dark travel](../worlds/base/playable-openings.md#wildlife-darkness-and-predators) | [Base world](base-world.md), [first threat](../worlds/base/first-threat-encounter.md), AC/AG, [spatial work](spatial-world.md) and existing sight/hearing/light owners | A stag encounter does not establish roaming wolves or packs. Scope authored predator perception, movement/group decisions, readable danger, meaningful defenses and escape, with actual daylight/darkness behavior. |
| [Roaming hostile people](../worlds/base/playable-openings.md#distant-hostile-people-and-unscripted-camp-contact) | [CF01–CF05](parallel-batch-06-rivals-and-contested-ground.md), its existing design pair, AG/CE and [social](../worlds/base/social.md) | Finish applicable existing encounter qualification; add genuine resource/hunt/exploration travel and camp discovery. Demonstrate changed conduct after de-escalation/trade and valid fight/retreat outcomes, without a timer or player-position shortcut. |
| [Leave, return and use the consequences](../worlds/base/playable-openings.md#full-experience-acceptance-and-scope) | [Save/load](save-and-load.md), existing knowledge/custody and world-history owners; [verification index](../verification.md) | Qualify the integrated player's camp, resources, rewards and perceived relationship consequences through ordinary continuation. Current-format storage evidence is not human enjoyment or real-user release approval. |
| External browser testing and eventual payment | [PD01–PD10](production-deployment.md), relevant MP/privacy/accounting owners; [CO01–CO06](commercial-offers.md) for a selected offer | Qualify only the actual enabled test/release route. Browser and adult audience are already selected; actual budget, permissions, service terms and customer readiness are not. |

## Immediate sequence

**First:** FPV01 pins the real build and maps missing work. **Then:** FPV02 resolves the detailed design gaps in their existing owners; selected implementation and integration are FPV03, followed by the test-readiness decision in FPV04. Recruitment materials and offer investigation may proceed alongside design/build work, but public outreach, paid calls and user access wait for their own approval/readiness. FPV06–FPV08 produce and review actual evidence. FPV09 is the whole-experience decision, not a mandatory first-session checklist.

These are connected work packages, not independently launchable parallel coding assignments. Do not assign an agent a task that needs another concurrent worker's unfinished output without combining the work or explicitly waiting for its earlier prerequisite. The actual task performer and operator are assigned before execution; no fictional team or budget is implied.

## FPV01 — Baseline and requirement coverage

- [x] Record the first-playable requirements in the existing world and priority owners, with a linked operational playtest plan and this tracker.
- [ ] Resolve the actual integrated build and branch availability; classify each owner-map row as delivered and evidenced, implemented but unqualified, designed but undelivered, or needing scoped design.
- [ ] Select the next meaningful testable activity and record which complete-game requirements it does not cover. Identify only its real prerequisites, including spending and access decisions.

**Exit:** a named build and one honest readiness/gap record tied to existing owners. Documentation preparation alone does not satisfy this task's remaining checks.

## FPV02 — Finish the necessary detailed design in existing owners

- [ ] **Starting survival and resource/recipe chain:** under the opening/BW/INV/action owners, choose source placement, starting condition, hand collection, processing/tool dependencies and the known camp catalogue. Check that no basic action requires its own later output. Select quantities and costs only after complete-chain analysis; maintain their existing inventories.
- [ ] **Camp walls and entrance:** extend the relevant shelter feature/technical pair and world profile for the selected construction family. Define useful footprint and entrance, real materials/work, permission, partial build/reclaim, physical blocking/cover, damage/breach behavior if offered, and save/recovery. Use existing spatial and material contracts rather than a new general building engine.
- [ ] **Cast and useful cooperation:** reconcile the existing character design/authored identities; distinguish four/five non-hostile people through actual choices. Extend existing social/outing/help scope for a small alliance and real cooperative hunt, sharing/trade and grounded advice. Define optional participation, refusing/leaving and actual custody after success/failure.
- [ ] **Animal and human roaming conflict:** extend the existing threat/rivals/agency designs for supported predator/group behavior and independently motivated travel through shared resource areas. Define actual perception, lost contact, route failure, camp discovery and alternatives to fighting. No guaranteed day, scripted raid or compulsory negotiation success.

**Exit:** the selected missing mechanics have adequate cross-linked feature/technical definitions, world-owned rules and existing-limit reconciliation. A target description is not a technical design, and this task does not reopen already adequate foundations. Required camp/social/conflict coverage remains first-playable scope even while these design details are open.

## FPV03 — Deliver and integrate the selected experience

- [ ] Implement the authorized missing slices through the actual owners identified by FPV01/FPV02; keep their code and detailed completion records there and link their exact task/commit evidence here.
- [ ] Combine new and existing content through the main authored initializer. Use the real ordinary-player path, not admin equipment grants, forced NPC choices, a second copied demonstration world or a hidden canned invention.
- [ ] Requalify affected baseline behavior, privacy, material accounting, ordinary permissions, current-format continuation and context/cost preparation. Preserve explicitly unrun wider qualification.

**Exit:** a reproducible named build supports the selected activity and declares any still-missing full-game rows. Completion of individual component tasks is not complete-game acceptance.

## FPV04 — Session operations and release readiness

- [ ] Record the operator, permission to invite, adult-participant criteria, actual browser/access arrangement, disclosure/consent, support route, allowed time/spend and test end conditions.
- [ ] Run the relevant existing technical checks on what participants will receive, including meaningful failures and actual provider costs when live tests are separately approved.
- [ ] Decide supervised/disposable learning versus an externally hosted invitation service. Complete the corresponding PD/MP gates; obtain any required owner decision on real-user continuity before making promises.

**Exit:** participants can receive the actual disclosed experience safely within the authorized envelope. A native-only test must not claim live invention/character qualification; a supervised test does not qualify a public service.

## FPV05 — Audience materials and recruitment

- [ ] Prepare accurate gameplay material, concise invitation, a real access/contact destination and a manually checked relevant contact shortlist using existing marketing owners.
- [ ] After explicit outreach permission and applicable readiness, invite the selected participants; record recruitment source and avoid conflating followers, signups and actual players.
- [ ] Keep developer/authoring interest distinct from demand for the survival-building adventure; coordinate a broader demonstration only when the build and response justify it.

**Exit:** a manageable invited group and honest material, with consent and support expectations. No daily video schedule, full marketing platform or paid-ad requirement is introduced.

## FPV06 — Observe first survival, building and character choice

- [ ] Run the selected initial sessions without coaching beyond the agreed protocol; record expectations, confusion, meaningful decisions, food/tool/camp progress and reasons for stopping.
- [ ] Observe actual preferences among characters and an appropriate cooperative activity. Separate independent refusals from service failures or expired requests.
- [ ] Record waits, failed/unsupported invention, costs and operator intervention alongside enjoyment; do not treat successful narration or a completed fixture as player evidence.

**Exit:** actual findings with build, cohort, denominators and clear missing coverage, not a general declaration of validation.

## FPV07 — Danger, unscripted contact and returning play

- [ ] Qualify animal danger and camp defenses through real geometry and valid choices, including retreat or failure. Record what was set up versus encountered naturally.
- [ ] Demonstrate ordinary hostile resource/hunt/exploration choices leading through actual travel and perception to discovery of a player-created camp. Retain the goal/evidence/travel cause; do not substitute manual approach or scheduled waves.
- [ ] Exercise meaningful fight, de-escalation, mutual benefit/trade and flight opportunities across appropriate sessions; neither every response nor every arrival is guaranteed in one playthrough.
- [ ] Observe optional later sessions: the camp, materials and relationship consequences remain coherent and offer a worthwhile next activity. Record voluntary return separately from a requested QA revisit.

**Exit:** technical and behavioral coverage for those journeys plus explicitly bounded human observations. Failure to see a rare event in one session is neither proof of impossibility nor permission to force it invisibly.

## FPV08 — Diagnose, fix and retest

- [ ] Write actionable findings under the focused verification report when actual results exist; link each correction to the existing subsystem or marketing owner.
- [ ] Prioritize the dominant experience failures, not the easiest nearby technical refinement. Retest changed comprehension with fresh people and repeat value with appropriate return sessions.
- [ ] Update the operating brief with evidence, largest uncertainty, next experiment and commitment limit. Keep raw private data and generated traces out of the repository.

**Exit:** an evidenced improvement/rework/pause decision, with unresolved requirements still open. Additional broad dossier collection is not a substitute for this evidence.

## FPV09 — Complete first-playable and next commitment decision

- [ ] Reconcile every full-scenario row against actual integrated behavior and evidence; no equipped opening, prebuilt camp or isolated easy activity silently replaces the required scope.
- [ ] Distinguish technical correctness, actual independent choices, uncoached understanding/enjoyment, broader demand, payment preference and sustainable delivery. Document uncertainty rather than invent a universal score.
- [ ] Recommend the next justified commitment: further necessary game work, broader relevant outreach, scoped specialist help or the selected commercial test under CO01/PD. Do not label ten small renewals a livelihood or a subscription the only possible offer.

**Exit:** the complete first-playable scope is genuinely accounted for and the next step follows evidence. Actual public release/payment remains subject to its existing approvals and qualification.

## Evidence and maintenance

The [playtest plan](../projects/first-playable-playtest-plan.md) owns the procedure. Use the existing verification reports for subsystem results; create `docs/verification/first-playable-experience.md` only when there are real integrated/player findings. Link it from the verification index and here. Report exact revisions, setup, actual outcomes, costs, limitations and unrun coverage.

Mechanic work stays in its existing focused tracker; this document owns the one coordination task rather than duplicate status for each code change. DG03/ND26 and the maintainer index point here. The research [execution brief](../../archive/02-research/indie-launch-commercials/execution-brief.md) points into this workflow instead of maintaining a parallel backlog. Existing compatibility, permission and spending policies remain unchanged.
