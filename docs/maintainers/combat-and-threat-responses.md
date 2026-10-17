# Combat and threat responses

**Selected design complete, October 17, 2026; implementation and qualification not started.** Mike selected efficient native animal escape, world-enabled PvP and collateral, personality-grounded Ada retaliation, complete cognition choices, generalized appraisal, two-stage prepared response options, precise reconsideration and predictable contextual combat controls. The [feature specification](../projects/combat-and-threat-responses-feature-spec.md) and [technical design](../projects/combat-and-threat-responses-tech-design.md) own the complete contract. This branch changes documentation only.

## Delivery sequence

Every CTR item below is **Designed; implementation not started**. A checked design task does not satisfy a native, independent-character, interface or playability gate. Implement at the existing owners and keep each admitted path usable; avoid separately shipping a new policy while an old caller still enforces the opposite one.

| ID    | Delivery                                                     | Dependencies                                                   | Completion evidence                                                                                                                     |
| ----- | ------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| CTR01 | Authored attack permission and actual projectile contact     | Existing physical combat                                       | All admission paths honor the installed profile; actual contact injures exactly once; participation and release review remain coherent. |
| CTR02 | Personal, per-opponent encounter evidence                    | CTR01 event/contact semantics                                  | Known/unknown attribution, active/recent/own intent, separate movement changes, exact deadlines and replay/restore remain correct.      |
| CTR03 | Native animal response owner and route execution             | CTR01–CTR02 evidence seams                                     | One controller and one movement owner; complete local danger scoring, finite preparation and saved continuation.                        |
| CTR04 | Bundled animal profile and speed                             | CTR03                                                          | Every ordinary species, bird flight and territorial withdrawal consumes the selected profile without model calls.                       |
| CTR05 | Complete response context and prospective work transitions   | Existing availability/control owners; CTR02 for threat context | Busy actors retain relevant choices; rejected transitions do not interrupt or spend.                                                    |
| CTR06 | Personally interpreted threat appraisals                     | CTR02, CTR05                                                   | Supported source-linked feelings carry actual values and retain deduplication, privacy and revision semantics.                          |
| CTR07 | Prepared relevance then voluntary choice                     | CTR05–CTR06                                                    | Two accounted stages, exact purpose/subject/action bindings, finite speech and truthful unavailable/stale outcomes.                     |
| CTR08 | Meaningful reconsideration and urgent scheduling             | CTR02, CTR07                                                   | Exact transition wakes, finite commitments and isolated actor/job concurrency with no lost evidence.                                    |
| CTR09 | Existing Command-click combat continuity                     | CTR01–CTR02, CTR05 availability                                | Stable visible action/target, pair-specific grace and explicit offense/social override through the same server guard.                   |
| CTR10 | Complete qualification and delivered-document reconciliation | Delivered CTR01–CTR09 paths                                    | Native correctness, independent Ada behavior, browser journeys and measured latency/cost/playability pass separately.                   |

CTR01 and CTR05 can begin together. CTR03–CTR04 and CTR06–CTR08 can proceed independently once their shared evidence/availability contracts are installed. CTR09 consumes those shared projections rather than creating another attack catalogue. A partial implementation must retain an explicit current/selected distinction and cannot enable a half-migrated world policy.

## Completed design preparation

- [x] Trace current main at `0eb7358f251d1ab706592ccb6e9829e98c729fe9`, including the already implemented Command-click path.
- [x] Select the world policies, behavior, option catalogue, numeric tuning, ownership, persistence, refusal and meaningful failure cases.
- [x] Separate ordinary native animals from independent humanlike cognition; require actual voluntary Ada retaliation in the finite baseline.
- [x] Assign implementation modules and distinct acceptance gates; preserve broader relationship, ecology, recovery and control work.
- [x] Reconcile the selected ND11/ND13 portions and review repertoire coverage in the [review record](../projects/combat-and-threat-responses-repertoire-review.md).

## CTR01 — World permission and actual contact

Contract: [physical attack/contact](../projects/combat-and-threat-responses-tech-design.md#physical-attack-and-contact-contract--ctr01), [world ranged consequences](../worlds/base/ranged-counterplay.md#selected-contact-consequences), [lifecycle](../worlds/base/lifecycle-and-protection.md) and [player danger](../worlds/base/player-danger.md).

- [ ] Install base-world human PvP admission and contact response as authored definitions. Route typed, interpreted, menu, shortcut, temporary-control, plan, held-aim and automatic-release consumers through the same permission result; a different world can still deny PvP.
- [ ] Preserve release source attribution, intended target, physical effect and policy pins separately from actual contact. Apply the shared body/contact-defense effect to the earliest vulnerable contacted body, including unintended people, animals and the source after launch overlap has ended.
- [ ] Make release the final human review boundary for that released projectile; retain exact precommit review and actual material/lifecycle consequences. No target-only immunity, practice immunity, post-release target review or second physical damage path.
- [ ] Qualify intervening bodies, shields, inactive/fading players, departed/dead sources, a successor crossing the trajectory, simultaneous contacts, expiry, replay and restoration. Actual source privacy, injury/prevention, practice credit and alarm observations must match the real contact exactly once.

## CTR02 — Observer-scoped encounter evidence

Contract: [personal evidence](../projects/combat-and-threat-responses-tech-design.md#observer-scoped-encounter-evidence--ctr02) and [world encounter continuity](../worlds/base/combat.md#selected-threat-and-encounter-continuity).

- [ ] Install one exact observer-life/other-life evidence owner with admitted causes, current observed attack tokens, historical observation, own accepted offense and the selected deadline. Anonymous harm stays anonymous.
- [ ] Distinguish hostile-evidence revision from observed movement revision. Meaningful closing/withdrawal can wake cognition but cannot renew hostility or clear a deliberate Speak override. Retain the minimal pair/preference while that override remains valid even after ordinary grace expiry; retire it only under its actual invalidation/authority/life rules.
- [ ] Expose directed attack preparation consistently across existing physical methods under the [world phase/exposure table](../worlds/base/combat.md#readable-attack-cues). Keep approach/private intent undisclosed, exact targets personally exposed, and animation descriptors target-free. Reacquiring the same known preparation/aim restores observed activity without inventing hostility or clearing Speak. Supply actor-local indexes and time-bound invalidation; remove whole-world projectile scans from the contextual preference path.
- [ ] Qualify simultaneous opponents, harmless selection/approach, third-party witnessing, an archer with a hidden target, two nearly aligned potential targets, known-aim reappearance after Speak/grace expiry, fresh release, unknown attribution, exact expiry without movement, stale completion tokens, control/life loss, correction/removal, replay and current-format continuation.

## CTR03 — One native animal response owner

Contract: [native execution](../projects/combat-and-threat-responses-tech-design.md#native-animal-execution-ctr03ctr04) and [animal world profile](../worlds/base/animal-responses.md).

- [ ] Install a single native response family with explicit calm, escape, blocked/preparing and settling meanings. Intake alarm even during movement, flight or physical incapacity without bypassing physical capability.
- [ ] Evaluate the complete locally perceived danger set, bounded reachable refuge candidates and actual routes through the existing navigation/locomotion owners. Distinguish blocked, unavailable preparation, unseen/out-of-scope terrain and no danger; never call an incomplete query safe.
- [ ] Commit the chosen destination, saved weighted RNG and movement ownership together. Preserve selected route continuity, exact safety crossings and deadlines, and original last-observed uncertainty; a new impact cannot refresh an unseen source's location. A stationary route-blocked animal whose present supported position becomes clear starts the full settling interval there, without a path request or RNG draw; incomplete evidence and incapacity cannot qualify it.
- [ ] Save exact alarm causes and once-per-projectile/animal-life near-passage deduplication through the existing projectile/observation owner. Qualify interval partition, replay and restore without new random draws or new alarm events.

## CTR04 — Species profiles, sleep and special locomotion

Contract: the canonical [animal profile](../worlds/base/animal-responses.md); its concrete limitations remain in [BW12](../limits/base-world.md#bw12--remains-and-native-escape).

- [ ] Bind every existing ordinary species to authored travel/escape speeds and the selected all-danger clearance, retention, safety duration, cadence and candidate policy. Apply existing injury/scar/capability adjustments once.
- [ ] Replace routine position jumps with admitted timed movement. Integrate alarm with the existing world restorative-rest predicates while preserving actual exhaustion and incapacity.
- [ ] Integrate perched and airborne birds through one flight owner and real connected authored escape/perch corridors. Integrate the stag's existing territorial withdrawal without resetting relinquished territory or installing a second prey controller.
- [ ] Qualify the canonical animal matrix, including small bends, hidden corridors, enclosed ground, multi-human routes, physical rest/exhaustion, blocked flight and continuous safe time. Record zero animal model calls separately from native CPU/memory and playability measurements.

## CTR05 — Complete choices while working

Contract: [complete threat choices](../projects/combat-and-threat-responses-tech-design.md#complete-threat-choices-appraisal-and-voluntary-action--ctr05ctr07).

- [ ] Replace the physical-work early return in `apps/server/src/context.ts` with complete relevant preparation. Reuse actor/tool prerequisite work before target expansion; preserve exact visible methods and consequential temporary blockers.
- [ ] Extend the existing availability owner with read-only continue/replace/interrupt preparation. Report real progress, spent inputs, paused frontier, recovery, next boundary and exact subsequent action.
- [ ] Revalidate the entire transition plus action before any mutation. No throwaway cancelled-world simulation, allocated preview action, refund, recovery bypass or predictably failed action after destructive interruption.
- [ ] Qualify idle, moving, gathering, crafting, held aim, spent work, existing suspended frontier and non-interruptible recovery through both cognition and ordinary action details.

## CTR06 — Generalized personal appraisal

Contract: [interpreted threat reactions](../worlds/base/psychological-reactions.md#interpreted-threat-reactions) and [appraisal limits](../limits/feelings.md).

- [ ] Install the selected source-bound fear/anger vocabulary and amounts through the existing appraisal owner. Supply identity, uncertainty, stakes, control, capabilities, work, evidence and actual current intensity to interpretation and later choice.
- [ ] Remove both damage and projectile automatic-fear producers atomically when this world profile is installed. Keep actual harm, pain and urgent evidence native; no feeling is required before an animal flees or an injury commits.
- [ ] Use valid new-cause target replacement, receipts and exact revisions. Same-cause reuse cannot restart a decaying feeling, add intensity or spend again; rejection leaves actual prior state intact.
- [ ] Qualify source privacy, known/unknown subjects, decay, correction/removal, complete relevant record access, first-stage appraisal receipts and no recursive decision caused solely by publishing that pipeline's own appraisal.

## CTR07 — Relevance followed by independent choice

Contract: [technical stages](../projects/combat-and-threat-responses-tech-design.md#stage-one-situation-relevance-and-independent-appraisals) and the canonical [24-purpose catalogue](../worlds/base/threat-response-options.md).

- [ ] Install request-local purpose/subject/role bindings, native feasibility and source-bound appraisal questions. The first cheap Decision API call uses one existing three-option Choice question per purpose instance for uncertain/relevant/irrelevant, with the technical contract's identical insertion/canonical handle order. Do not use the binary relevance decoder, native filtering alone or a fixed top-N list; ordinary noncombat relevance stays unchanged.
- [ ] Preserve all relevant and uncertain complete bindings; expose no-change/continue and temporary blockers honestly. Qualify an explicitly uncertain subject/role surviving into the second call and exact ties agreeing through direct Jev and Macrofold. The second call sees admitted appraisal state through a valid postcommit snapshot and chooses one fully grounded response.
- [ ] Include exact finite utterances and recipients for speech options; no hidden third generation call or unsupported simultaneous speech/physical action. One offensive option authorizes one real strike, not a permanent attack loop.
- [ ] Reserve/account both stages through the existing owner. Qualify invalid/partial responses, uncertain relevance, stale source/action, accepted appraisal followed by failed choice, exact receipt recovery and changed authority after every wait.

## CTR08 — Reconsideration and prompt service

Contract: [reconsideration and concurrency](../projects/combat-and-threat-responses-tech-design.md#reconsideration-finite-continuation-and-prompt-reactions--ctr08); [CTR limits](../limits/combat-and-threat-responses.md).

- [ ] Connect each specified meaningful transition to ordinary intake with exact personal cause and evidence cut. Immediate harm/credible attack bypasses band stabilization; native prerequisite loss stops work independently of model timing.
- [ ] Retain original finite pursuit, hold, waiting, last-seen and recovery boundaries in existing plans/activities; never renew them on restore, UI grace or routine movement. Preserve later cues while an earlier snapshot is processed.
- [ ] Extend the existing director to at most two immediate pipelines per world, one per actor and at most one ordinary pipeline, within all existing funding/provider ceilings. Use actor/job-owned callbacks, cancellation and reservations; keep native commits serialized.
- [ ] Qualify punch-and-run, lost/reacquired sight, obstruction, actual strike result, changing protectee, new injury, pending cues, selected stopping and returning to life. Include two simultaneous actors, cancellation races, long ordinary work, no third slot and no free paid retry.

## CTR09 — Predictable contextual attack

Contract: [existing-path integration](../projects/combat-and-threat-responses-tech-design.md#contextual-action-integration--ctr09), [world preference rules](../worlds/base/combat.md#selected-threat-and-encounter-continuity) and existing UI owners.

- [ ] Extend the installed context-action ranking and preferred-choice guard with current/recent observed aggression and own admitted offensive preference. Use the canonical simulation-time grace and controller/pair-local explicit Speak override, admitted through exact revision-bound preference receipts. Stop only the pair's owned unfinished invocation; a late Stop cannot cancel a newer attack or unrelated work.
- [ ] Preserve berry gathering and ordinary speaking. Choose the already held compatible contact method then unarmed; disclose exact ranged/aim/release and approach meanings without silently equipping or choosing maximum damage.
- [ ] Capture exact action, target life, tool and command at pointer-down; revalidate the same gesture at commit. Changed preference becomes stale/unavailable, never an undisclosed attack or substitute action. Recovery remains visibly blocked rather than falling back to Speak.
- [ ] Qualify two opponents, hover/selection, held aim, stop attacking, deliberate Speak, time-only expiry, target death/invisibility, stale inventory, keyboard/text focus and server receipt replay through real browser input.

## CTR10 — Independent acceptance and reconciliation

- [ ] Pass the native physical, animal, evidence, prospective-transition, appraisal and scheduling matrices in the technical contract. Restore current-format active work and pending decisions without replay or authority leakage.
- [ ] Run and retain the twelve fixed ordinary Ada baselines with genuine relevance and choice, no injected goals or forced responses, and their selected 900-game-second maximum observation window. All twelve must enter actual strike preparation/contact; approach or speech alone does not pass. Retain failures. Counterfactual cases remain separate.
- [ ] Play the real-time punch-and-run and multi-danger animal journeys in the browser. Verify what the player can perceive, opportunities to react/retreat and a readable end; fluent dialogue and passing native fixtures alone do not qualify fun.
- [ ] Measure complete cold/warm reaction stages, urgent queue behavior, dense native escape, route preparation, projected bytes, source retrieval, retained work and paid calls/cost. Report actual results, workload and limitations; no provider-latency promise follows from this design.
- [ ] Resolve concrete regressions, rerun only affected evidence, update current/selected language and limits, and record runtime completion under each actual delivered CTR ID. Preserve the broader Batch 06, CE/AG/CR and ND/DG acceptance owners.

No runtime, browser or provider work has been run for this design: additional Jev cost **$0**, cumulative task total **$0**.

## Maintained records

- Scope and mechanics: [Feature specification](../projects/combat-and-threat-responses-feature-spec.md), [technical design](../projects/combat-and-threat-responses-tech-design.md), [repertoire review](../projects/combat-and-threat-responses-repertoire-review.md).
- Concrete restrictions: [Combat/threat limits](../limits/combat-and-threat-responses.md), [base world](../limits/base-world.md), [ranged/evasion](../limits/parallel-batch-06-rivals-and-contested-ground.md), [feelings](../limits/feelings.md), [UI tuning](../limits/ui-ux.md).
- Design dispositions: [ND11](needs-design.md#nd11--human-conflictrecovery-and-npc-ghost-continuity), [ND13](needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization).
- Related delivery: [Base world](base-world.md), [Batch 06](parallel-batch-06-rivals-and-contested-ground.md), [character experience](character-experience.md), [cognition](cognition-redesign.md), [UI/UX](ui-ux.md).
