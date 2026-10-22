# Stealth and awareness — limits and constraints

This inventory owns new discretionary constraints for the shared stealth design. [Feature behavior](../projects/stealth-awareness-feature-spec.md), [shared contracts](../projects/stealth-awareness-tech-design.md) and [SA/SAD/SAI delivery](../maintainers/stealth-awareness.md) own their different purposes. These are accepted design targets with specialist tuning and runtime qualification still open. Source baseline is `86a21ce50aa0633d81b38a430b7727c0c543017e`.

Privacy, valid life/source references, truthful evidence, atomic effects and no duplicate execution are correctness obligations, not adjustable gameplay limits. Existing hearing, memory, cognition, combat, spatial and native-work inventories remain the sole owners of their current shared limits.

## SA-L01 — Initial startle duration and susceptibility

**Status: Proposed — accepted provisional base-world target; not implemented. Restrictiveness: Medium.** An unmodified eligible startle initially lasts three normal-speed real seconds. Under the current normal ratio this is 180 simulation seconds; at 1×/3×/8× it takes 3/1/0.375 wall seconds, with pause freezing progress. [Base psychological reactions](../worlds/base/psychological-reactions.md) owns the world choice; [SC13](../projects/stealth-awareness-tech-design.md#time-and-lifecycle) owns conversion and continuation.

The short duration gives a sudden event an immediate mechanical consequence while allowing ordinary action to continue after recovery. Three seconds is not a measured optimum. Supported traits, physiology and conditions may reduce effect or duration; D's completed [pinned design](https://github.com/Macrofold/OpenLegend/blob/a54c13dec160d88efbde7a16abe3ea066856293a/docs/projects/emotional-physiology-tech-design.md) selects modifiers, aggregation and retrigger behavior; shared implementation/qualification remains open. Duplicate cause/life delivery never restarts the duration. A distinct new cause follows the selected authored rule rather than an invented global immunity cooldown. Review the duration using J06/J08 and uncoached play once the integrated mechanics exist.

## SA-L02 — Initial surprise damage multiplier

**Status: Proposed — accepted provisional base-world target; not implemented. Restrictiveness: Medium.** The initial qualifying surprise damage multiplier is 2×, authored by [base combat](../worlds/base/combat.md#preparedness-policy), not an engine constant. F's completed [technical design](../projects/preparedness-and-surprise-tech-design.md) selects exact applicability, one designated outcome and pre-shield/body placement; [SUR-L01–SUR-L05](preparedness-and-surprise.md) owns its detailed limits and adjustment points. Shared preparedness and evidence-cut requirements remain SC11–SC12.

The intended payoff is a consequential genuinely unexpected attack, balanced against the defender's ability to perceive warning and prepare. This is not a guaranteed hit, a universal rear/crouch bonus or a second multiplier layered onto another stealth rule. Temporary loss of sight in an anticipated fight does not reset eligibility. Actual balance and repeat-attack outcomes remain unqualified; review through warned-unseen, betrayal, collateral and disengagement journeys.

## SA-L03 — Familiarity-based source recognition

**Status: Proposed — selected replacement of the earlier first-hearing target; not implemented. Restrictiveness: Medium.** An unfamiliar first-heard voice alone supplies no reliable canonical voice association. The selected base world uses prior familiarity, evidence quality and Perception; reusable engines accept the installed policy without requiring that named attribute. Recognition, name, location, classification and intelligibility remain independent. [Knowledge](../knowledge.md#subject-binding), [base knowledge](../worlds/base/knowledge.md), [SPK](../maintainers/speech-and-social-perception.md) and SAD-A own delivery.

This preserves uncertain hearing, meaningful acquaintance and checking a suspected source. It makes some first encounters less conveniently attributed. Existing reliable-recognition limit descriptions are reconciled in their hearing/memory owners; this entry records the new selected boundary without becoming a second recognition registry. A's completed [pinned design](https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-tech-design.md) owns exact familiarity/evidence laws and retention; shared implementation remains open. There is no invented fixed number of conversations or mandatory biometric voice model.

## SA-L04 — Supported physical pose and channel scope

**Status: Proposed — selected initial scope. Restrictiveness: Safe.** Deliver actual crouch/quiet movement and independent looking while walking for the supported base-world bodies, through existing spatial/action owners. Do not infer arbitrary simultaneous limbs, unrestricted rotation, every sense or complete acoustics from those capabilities. B/C select actual compatible pose freedoms, source/channel laws and authoring bounds; unsupported combinations refuse before effects.

This keeps the first feature implementable without making a human anatomy or a single sense universal. A materially different body/channel must fit the shared message contract, but implementing every repertoire organism is outside this stage. Existing [spatial limits](spatial.md), [action admission and delivery](../action-capabilities.md) and [hearing limits](hearing-and-speech.md) retain their own current envelopes.

## SA-L05 — Emotion-specific reconsideration allowance

**Status: Proposed — required finite policy; numerical values selected in SAD-D's pinned design; integration and qualification open. Restrictiveness: Safe once admitted; current new-feature values unqualified.** Each enabled policy must supply positive simulation-time spacing, finite opportunities/attempts for unchanged causal support, supported intensity/lifetime change and a dormant/terminal/native-continuation outcome at exhaustion. There is at most one current owned opportunity for the same appraisal/cause; ActorWork coalesces its wake with other reasons.

The reason is to permit quiet reconsideration without per-frame AI calls or infinite same-cause renewal. New wording, recall, a request ID or a successful model answer cannot refill the allowance. Genuine new eligible evidence can be admitted under the appraisal owner's explicit episode rule. Unsupported, unavailable or no-change outcomes retain native state/lifetime and do not trigger automatic paid retries. [SC09](../projects/stealth-awareness-tech-design.md#sc09--adaptive-reconsideration-of-an-existing-cause) and existing [cognition limits](cognition.md) own the boundary. No universal emotion cadence or spending increase is selected.

## SA-L06 — Bounded watch and preparedness scope

**Status: Proposed — finite authored commitments and threat relevance selected; F predicates designed, E/F integration and runtime qualification open. Restrictiveness: Medium.** Watch/guard/investigation must have actual active work, meaningful coverage, interruption and ending/review conditions. Warnings can cover unknown or regional threats without exact attacker identity; a generic intention to remain alert does not grant perpetual all-direction preparation.

Finite scope gives positioning, warnings and watch handoffs practical meaning while avoiding a global awareness score. Existing combat shortcut grace is not a new surprise-immunity duration. F's [canonical policy](../worlds/base/combat.md#preparedness-policy) selects lead, readiness and finite continuity through personal encounters and E's actual work. Real confirming contact/own offense can preserve earned scoped anticipation, but unused watch expiry creates none. Broad assault and narrow opponent continuation stay distinct. E's completed pinned design and proposed SA-D03 port extension are linked from [SUR](../maintainers/preparedness-and-surprise.md); ordinary usefulness remains unqualified. [Combat limits](combat-and-threat-responses.md) retains its existing world rules.

## SA-L07 — Operational bounds and overload

**Status: Proposed — new-feature dimensions unqualified; no independent numerical caps selected here. Restrictiveness: Too liberal until each specialist supplies and qualifies its bounded admission/continuation.** This is an explicit design gate, not a claim that current runtime has infinite work or that arbitrary lossy caps are desirable.

| Growth dimension                                                  | Existing protection and required specialist treatment                                                                                                                                                                                                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nearby emitter/receiver/channel pairs and exact spatial samples   | Conservative existing spatial selection, shared immutable preparation and native work charging. A/B/C define admitted work and cold/warm invalidation; dense legitimate local pairs may still be costly. No N² whole-world per-frame scan or nearest-N loss of required recipients. |
| Weak exposure progress and retained source/observer relationships | Sparse existing EPR episodes, meaningful transitions and ending/retention policy. A/C bound active continuation and compact state; replayed samples cannot add progress.                                                                                                            |
| Physical emissions and required observation awaiting commit       | Existing ordered native work and coherent-prefix/backpressure. C preserves distinct actual occurrences; optional wake coalescing cannot erase emitted evidence.                                                                                                                     |
| Active mechanical appraisals/effects and source proof             | Existing active mechanical residency and indexed source selection. D/F require complete relevant reads, bound preparation and never treat a hot history page as complete.                                                                                                           |
| Reappraisal due records, queue age and external attempts          | Existing appraisal/process ownership, finite same-cause allowance and ActorWork/cognition admission. D/E specify active growth and cancellation; no per-actor mandatory inference loop.                                                                                             |
| Private history/presentation detail and cached historical people  | Existing actor-scoped selection before hydration, projection fences and bounded renderer ownership. A/G inventory actual requested/retained size and eviction behavior without deleting canonical memory to fit a display.                                                          |

Required incomplete work retains coherent state and owed simulation time under [native-work](native-work.md) and [performance](../performance.md). It cannot fabricate no detection, safety, zero fear or surprise. Optional cognition may be skipped/deferred under its existing policy. A result-page size, per-record cap or prompt limit does not bound preselection work, total retained bytes or dense recipients.

The applicable SAI row cannot begin with an unowned bound for new recurring work. Measure complete callers, cold restoration and concentrated invalidation as well as warm reuse; record actual scale evidence separately from native-only timings and player enjoyment. This selected implementation gate already has a focused owner, so it needs no duplicate generic limits-audit task.

## SA-L08 — Controlled-player psychological acquisition

**Status: Proposed — decision open. Restrictiveness: Not yet rated.** [SA-D01](../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters) owns authored native interpretation, opt-in AI interpretation and native-startle-only initial scope. No option is assumed. The choice bounds only the controlled-player psychological producer and its specific acceptance; native startle, NPC emotion, effective mechanics and other shared contracts remain independently designable.

## Shared inventories

- [Hearing and speech](hearing-and-speech.md), [memory](memory.md) and [cognition](cognition.md) own existing retention, context, hearing and scheduling limits.
- [Combat and threat responses](combat-and-threat-responses.md), [spatial](spatial.md), [native work](native-work.md) and [state effects](state-effects.md) own their existing mechanical envelopes.
- [SA/SAD/SAI](../maintainers/stealth-awareness.md) owns concrete design and implementation gates; [the shared technical design](../projects/stealth-awareness-tech-design.md) owns correctness and integration semantics.
