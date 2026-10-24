# Stealth and awareness — design and implementation dependencies

## Status and ownership

**Shared and A–G specialist design deliverables complete; final design integration, runtime implementation and gameplay qualification remain open.** This tracker owns the cross-project dependency graph and acceptance state for [the feature specification](../projects/stealth-awareness-feature-spec.md) and [shared technical design](../projects/stealth-awareness-tech-design.md). It does not duplicate SPK speech, CTR combat, CE character experience, EPR observation, CL continuing-lives, action, clock or save tasks.

The shared baseline is **design-only** at `Macrofold/OpenLegend:codex/design-stealth-00-contracts`, commit `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e`. The seven specialist branches are merged into `codex/design-stealth-08-integration` with their history preserved. Existing runtime behavior remains the inspected baseline; no runtime feature, executable test, deployment or gameplay qualification is delivered by design integration.

The shared scope completes only selected architecture within [ND11](needs-design.md#nd11--human-conflictrecovery-and-npc-ghost-continuity), [ND13](needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization), [ND16](needs-design.md#nd16--hearing-and-communication-beyond-direct-path-speech) and [ND19](needs-design.md#nd19--older-memory-transformation-and-dream-reinterpretation). Their broader designs and delivery remain with those owners. Checked design work never closes a runtime or player-acceptance checkbox.

## SA00 — Shared contracts and source-grounded feature design

**Status: Completed — shared design only, 2026-10-19.** Owner: shared-contract design agent. Dependencies: pinned source inspection and accepted task decisions. Output: the exact feature/technical paths above, this tracker, directly affected owner reconciliation and topical repertoire integration.

- [x] Inspect root/applicable repository instructions, canonical owners and actual source behavior; distinguish implemented foundations from accepted targets.
- [x] Define representative complete player/NPC/native journeys, meaningful failure and the ordinary-route benefit/burden.
- [x] Define the world fact → physical signal → observer evidence → remembered knowledge → cognition/player-view pipeline, source association and per-fact freshness.
- [x] Assign A–G owners, existing mutation/query/scheduling boundaries and exact source/life/episode/time/provenance meanings.
- [x] Define immutable attacker and actual-victim evidence cuts, preparation versus awareness, and contact/startle ordering.
- [x] Preserve normal-speed-second authoring, shared simulation-clock authority, pause/speed/save semantics and creator-only controls.
- [x] Separate native bodily startle, private interpreted emotions, effective mechanics and finite internally due reconsideration.
- [x] Keep SA-D01 explicitly unresolved with viable alternatives, conditional recommendation and a bounded dependency.
- [x] Inventory all repertoire file scopes and relevant entries; improve selected topical entries without changing central priorities/indexes.
- [x] Complete directly affected persistent-owner, limits, design-register and decision reconciliation.
- [x] Review the full resulting documentation diff; resolve cross-module inconsistencies and verify new/changed links and status.
- [x] Commit every task-owned documentation change to the remote branch and confirm that the branch contains only documentation changes relative to the selected base.

**Exit:** shared meanings are complete, internally consistent, assigned and reviewable; every downstream specialist can start design with one contract for each shared responsibility. SA-D01 remains an open product choice. Specialist review also identifies the explicitly recorded integration gates below; design completion does not resolve them or establish runtime behavior, measurements or play acceptance.

## Specialist design ownership

The table identifies each specialist's paired feature/technical design and focused task owner. All seven paired specialist designs and focused trackers are present. Specialist design completion is not an implementation claim. Each focused tracker owns its detailed implementation work, linking the SAI row here. Shared design owns interfaces; specialists own their internal policy/algorithm choices and acceptance through the existing speech, combat, memory and effects owners.

| Design ID | Specialty and project documents | Required output | Coordination and existing owners |
| --- | --- | --- | --- |
| **SAD-A** | Observer evidence and recognition: [perspective-perception feature](../projects/perspective-perception-feature-spec.md) / [technical design](../projects/perspective-perception-tech-design.md) | Selected typed facts, uncertainty, local individuals, learned recognition and independent names, immutable original facts/current confirmation, exact cuts, lossless retention/correction, bounded work and consumer acceptance. | [PP00–PP07](perspective-perception.md); EPR; SPK; knowledge/identity/memory; ND16/ND19's designed A slices. SA-D02 gates only dependent revision representation. |
| **SAD-B** | Vision, gaze, light and concealment: [feature](../projects/vision-and-gaze-feature-spec.md) / [technical design](../projects/vision-and-gaze-tech-design.md) | Supported sensory/body orientation, physical light/concealment evaluation, conservative candidates and temporal crossing/dependency invalidation; alternate body/sense case. Detailed work: [VG00–VG08](vision-and-gaze.md). | A/C/E/F/G; spatial/action owners; actual guard-facing and movement-heading callers. ND03/ND05/ND06/ND08/ND13/ND16 selected visual scopes. |
| **SAD-C** | General acoustic stealth: [feature](../projects/acoustic-stealth-feature-spec.md), [technical design](../projects/acoustic-stealth-tech-design.md) and [ACS tracker](acoustic-stealth.md) | **Completed — design only.** Supported quiet movement/posture, displacement/contact/action sources, material/equipment effects, weak cues, physical overlap, uncertainty, native reception, bounded work and current-format lifecycle. | A/B/E/F/G; hearing and SPK; body/spatial/action owners. Narrow ND13/ND16 slices designed; runtime remains open. |
| **SAD-D** | General emotional physiology and adaptive review: `docs/projects/emotional-physiology-{feature-spec,tech-design}.md` | Native body effect, exact cause/life/stacking, complete effective mechanics, narrow numeric modifier support, causal reappraisal operation and finite policy; NPC design plus bounded SA-D01 alternatives. | F for parameter sampling/composition; E for intake; appraisals/status/contributions/CL/CE/CTR06. ND11/ND19. |
| **SAD-E** | Attention, investigation and watch: `docs/projects/attention-and-investigation-{feature-spec,tech-design}.md` | Chosen look/listen/investigate/watch, useful finite commitments and social handoffs, appropriate native animals and reasoning people, ordinary interruption and complete work accounting. | A/B/C/D/F; ActorWork, existing agency/actions and native controller; EPR/CTR/SPK/attention designs. ND13/ND16 and DG02. |
| **SAD-F** | Threat preparedness and surprise: [feature](../projects/preparedness-and-surprise-feature-spec.md), [technical](../projects/preparedness-and-surprise-tech-design.md), [SUR tracker](preparedness-and-surprise.md) | Exact relevant-warning/preparation predicates, unknown/region scope, preparation lead time, engagement/disengagement, attacker/victim snapshots, world multiplier/armor/rounding and D mechanic integration. | A/D/E; existing personal encounters/contact/guard/ranged/evasion; CTR01–CTR02/CTR06–CTR10. ND11. |
| **SAD-G** | Controls and permitted presentation: `docs/projects/stealth-player-experience-{feature-spec,tech-design}.md` | Complete ordinary controls, accepted/pending/refused pose feedback, per-fact DTOs and explicit historical views, all leak surfaces, creator separation and accessibility/reconnect behavior. | A/B/C/D/E/F; server view/protocol/client camera and interaction owners; CTR09, UIUX and multiplayer. ND13. |

**SAD-A–G: Done — specialist designs present; integrated semantic review remains in progress under SAD-I.** All runtime implementation and qualification remain open in the focused trackers and SAI-A–SAI-I.

### SAD-I — Final design integration

**Status: Not started.** Owner: final integration agent. Dependencies: SAD-A–SAD-G and any adopted answer needed for a claimed controlled-player psychological producer.

- [ ] Reconcile specialist interfaces against SC01–SC14; remove duplicate state, competing thresholds/units and incompatible temporal/disclosure assumptions.
- [ ] Resolve concrete A↔B/C sensory/pose, D↔F mechanics, E↔F active-preparation and A↔G projection seams through their shared owners.
- [ ] Walk J01–J11 and the shared failure matrix across complete specialist designs, including an alternate body/reality and a meaningful failure for each new action.
- [ ] Ensure each selected world value has one authored owner and every operational/retention limit has an inventory entry and overflow behavior.
- [ ] Reconcile central repertoire README/coverage/selection/navigation and gameplay-priorities **only in this final integration role**, using the precise follow-through below; preserve useful existing entries and IDs.
- [ ] Reconcile central design registers, existing task owners and acceptance without closing implementation by design completion.
- [ ] Publish exact implementation-ready scope, remaining bounded decisions and affected current source base. Source changes since SA00 require a targeted owner recheck, not an assumed unchanged implementation.

**Exit:** the combined feature is ready for separately authorized implementation of the identified slices. SA-D01 may remain explicitly excluded/open without obstructing the other slices, but any controlled-player psychological acquisition or retained-appraisal applicability claim requires its actual selection and design.

## Future implementation dependency graph

These are **unstarted implementation tasks**. Detailed task bodies stay with the existing subsystem tracker where one already owns the work; the rows below own cross-project coordination and new shared acceptance. Completion requires real integration and evidence, not just adding a record/type or passing an isolated helper check.

| ID | Dependencies | Required slice and completion evidence |
| --- | --- | --- |
| **SAI-A** | SAD-A/PP00; relevant SAD-I interface review; SA-D02 disposition for PP01 representation | Unstarted [PP01–PP07](perspective-perception.md#execution-order) extend existing observation/identity/experience/projection owners together: structured facts, learned local subjects, current-format retention, exact cuts, memoryless reception and correction/forgetting. The A technical acceptance matrices own detailed evidence; coordinate SPK's shared producers/consumers. |
| **SAI-B** | SAD-B; SAI-A contracts; joint B/C pose design | [VG01–VG08](vision-and-gaze.md#implementation-sequence) owns the detailed unstarted slices: actual supported orientation/light/concealment; movement/guard and temporal/candidate reconciliation; save/authoring; moving/looking and fleeting/partial exposure through native progression and safe A/G projection. |
| **SAI-C** | SAD-C; SAI-A; compatible SAI-B pose owner | Deliver the [ACS01–ACS08](acoustic-stealth.md) physical crouch/quiet movement, clearance/standing refusal, selected action/contact sound and shared native/linguistic reception. Preserve actual source origin, distinct causes and sample-independent weak exposure; exercise terrain/cargo/obstacles, actual overlapping sources and a memoryless animal. |
| **SAI-D** | SAD-D; SAI-A; D/F parameter agreement | [EP01–EP09](emotional-physiology.md) extend body/status/contribution/appraisal owners for life-bound startle, complete numeric mechanical composition and bounded causal reappraisal. Exercise 1×/3×/8×/pause, repeated cause, no provider, stale/corrected sources, partial restore and source/target loss. Controlled-player psychological acquisition additionally requires SA-D01. |
| **SAI-E** | SAD-E; relevant SAI-A/B/C; existing agency/CTR/SPK owners | [ATI01–ATI08](attention-and-investigation.md) owns voluntary investigation/watch/guard/handoffs, native choices and typed preparation production through existing action/controller/intake, with actual purpose, finite stopping and no hidden live pursuit. Exercise heard/ignored/declined/blocked/interrupted and accepted-watch cases. |
| **SAI-F** | SAD-F; SAI-A/D and relevant SAI-B/C/E preparation | [SUR01–SUR09](preparedness-and-surprise.md) owns the detailed F delta. Add preparedness/surprise only through personal encounters and attack/contact owners; consume complete current mechanics and exact attacker/actual-victim cuts. Exercise warned-unseen, visible betrayal, collateral victim, continuous fight, same-time order and no same-impact shock feedback. Preserve CTR's independent-player/NPC and contact acceptance. |
| **SAI-G** | SAD-G; SAI-A and each exposed mechanic | [SPX01–SPX07](stealth-player-experience.md) owns ordinary controls and information-shaped full/patch/history DTOs with current-versus-historical feedback. Qualify camera/reveal/shadow/audio/tooltip/target/late-load surfaces, creator-to-player transitions, source revocation, body/control change and accessibility. No sensor feature is released with an ordinary client leak while waiting for this slice. |
| **SAI-I** | Applicable SAI-A–SAI-G; completed specialist integration | Exercise J01–J11 and shared failure cases through actual native/server/client/storage paths; measure bounded workloads and separately assess uncoached enjoyment/usefulness. Resolve introduced issues and update existing gates. No claim of a fully implemented controlled-player fear producer while SA-D01 is open. |

Implementation should form useful end-to-end increments. First introduce compatible evidence/current-view semantics through current channels; then integrate the physical pose/sense/sound behavior with its safe projection. Native shock and active preparation may build against those shared owners in parallel where dependencies permit. Surprise waits for its actual evidence, preparation and effect consumers. Current-format producers and consumers change together; legacy aliases, parallel APIs or compatibility-only stores are not an integration strategy.

## Repertoire coverage and final-integration follow-through

The source audit inventories all **42** files under `docs/repertoires/`, totaling **6,220,041 bytes** at the pinned source. It covers every file's scope, relevant entries and surrounding sections, all 25 complete combination scenes, and the four world profiles' scope/systems/opening arcs. It is not a claim to have reread every word of all 8,257 unrelated proposals or completed another source-game research ledger.

The nine topical documents reconcile actual selected relationships: mechanics, actions, psychology, traits, bodies/species, combat/rescue, languages/knowledge, ecology/weather and combinations. Existing catalogue IDs, ordering, priorities, levels and scene headings remain. The [repertoire review](../projects/stealth-awareness-repertoire-review.md) owns the detailed coverage and concrete connections; it is not a second gameplay-priority register.

Module A's [repertoire scope](../projects/perspective-perception-feature-spec.md#repertoire-scope) connects useful partial evidence, earned familiarity and attributed knowledge to the existing worlds. [PP00](perspective-perception.md#pp00--complete-the-selected-design-and-reconcile-its-owners) records its review evidence. Final integration owns central navigation and priority reconciliation.

B's additional [42-file vision review](vision-and-gaze.md#complete-repertoire-review-coverage) records its own scope and topical connections without closing the final integration steps below.

The final integration agent must:

1. Link the completed shared/specialist owners from central repertoire navigation without duplicating contracts or inflating catalogue counts.
2. Reconcile `coverage.md`'s broad Psychology **3 Depth** description with the selected native-startle, bounded consequential-fear and preparedness baseline. Keep broader optional appraisal/belief/identity expansion distinct; do not promote the entire catalogue family.
3. Keep `gameplay-priorities.md`'s empty-handed survival, camp/entrance, differentiated inhabitants, cooperation, useful invention and roaming danger coherent. Stealth improves those journeys; it does not replace the starting playable world with a stealth demonstration.
4. Use existing quiet cargo, decoys, watch handoffs, historical evidence and independent-sense examples before adding overlapping rows. Revisit selection/scale guidance only for actually selected specialist limits or new supported families.
5. Preserve central source-atlas/research/reading-ledger evidence and the four optional world profiles unless the combined specialist designs make a specific authored selection requiring reconciliation.

## Open product decision and bounded blockers

**SA-D01 — psychological fear for controlled characters** is recorded in [open decisions](../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters). Alternatives are authored native interpretation, opt-in bounded AI interpretation, or native-body-only initial player scope. The general emotion design recommends native-body-only initially, while authored native interpretation remains the conditional recommendation if persistent player fear is selected. The same explicit authority choice applies to other interpreted families; no option is adopted. Only the corresponding interpreted-emotion producer/application policy, handling of retained appraisals during direct control, disclosure, revocation/control transfer, and controlled-player acceptance depend on the answer.

Specialist thresholds, body freedoms, signal laws, reappraisal bounds, fear coefficients, preparedness lead time and controls now have selected designs in the local canonical documents. SAD-I must reconcile **SA-D02** (SC02: family-preserving evidence revisions), **SA-D03** (SC06/SC11: actual maintained-method start time) and **G-I01–G-I08** at the [integration register](../projects/stealth-player-experience-tech-design.md#contradictions-and-integration-recommendations). These are unresolved technical seams, not permission to create client mechanics or silently amend the shared types. Preserve no omniscient association/live update, no unlimited vigilance, no compulsory inference, no missing-evidence-as-zero and no parallel writable authority.

## Verification and handoff requirements

SA00 uses source inspection, full documentation diff review, consistency and link/status checks. Runtime execution, game tests, live inference, browser play and scale claims are outside this design-only task. Detailed later verification belongs to SAI-I and each existing affected owner; do not author executable tests during shared design.

The design handoff reports exact remote branch and commit, three required document paths, accepted shared contracts, unresolved cross-module blockers and precise readiness for A–G. Keep durable selected architecture in the documents and execution history in Git. No editing diary or repeated per-pass narrative belongs in these owners.

## Maintained records

- Behavior and journeys: [Feature specification](../projects/stealth-awareness-feature-spec.md).
- Shared architecture and source audit: [Technical design](../projects/stealth-awareness-tech-design.md).
- Limits: [Stealth/awareness inventory](../limits/stealth-awareness.md).
- Related implementation: [EPR](events-perception-and-reactions.md), [SPK](speech-and-social-perception.md), [CTR](combat-and-threat-responses.md), [character experience](character-experience.md), [agency](agent-agency.md), [action capabilities](action-capabilities.md), [state contributions](state-contributions.md), [time](simulation-time.md) and [save/load](save-and-load.md).

