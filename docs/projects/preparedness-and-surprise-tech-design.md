# Preparedness and surprise — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | F's contracts, algorithms and paper acceptance are designed; PS01–PS09 implementation and integration qualification remain open. | 2026-10-22 |

## Authority and delivery boundary

This document owns specialist F's consumer/producer contract, exact surprise evaluation and integration into existing combat. [Feature behavior](preparedness-and-surprise-feature-spec.md), [base-world policy](../worlds/base/combat.md#preparedness-policy), [PS tasks](../maintainers/preparedness-and-surprise.md) and [limits](../limits/preparedness-and-surprise.md) have distinct purposes. It completes the selected [ND11](../maintainers/needs-design.md#nd11--human-conflictrecovery-and-npc-ghost-continuity) design only.

Frozen [SC02/SC08/SC10–SC14](stealth-awareness-tech-design.md#shared-contracts) remain unchanged. No new threat database, writable readiness meter, combat engine, perception algorithm, emotional reducer, action lane, NPC controller or scheduler is selected. Native registration is the missing narrow computation inside existing personal encounters. Damage uses the existing contact/body transaction. This file contains conceptual TypeScript contracts and paper cases, not executable code or tests.

## Source baseline and specialist dependencies

Repository: **Macrofold/OpenLegend**. New branch: **codex/design-stealth-06-surprise**. Exact requested parent: **codex/design-stealth-00-contracts at a3d40b4d71e29d6504e9f3fcc21e76344a0a284e**. GitHub connector source reads established the following branch tips; none is merged into this branch.

| Specialty and branch | Pinned commit | Actual documents studied |
| --- | --- | --- |
| A — codex/design-stealth-01-perception | 40805523c4a19ab7c6cc455d49d51e4a122ecae0 | [Perspective feature](https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-feature-spec.md), [technical design](https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-tech-design.md) |
| D — codex/design-stealth-02-emotions | a54c13dec160d88efbde7a16abe3ea066856293a | [Emotional physiology feature](https://github.com/Macrofold/OpenLegend/blob/a54c13dec160d88efbde7a16abe3ea066856293a/docs/projects/emotional-physiology-feature-spec.md), [technical design](https://github.com/Macrofold/OpenLegend/blob/a54c13dec160d88efbde7a16abe3ea066856293a/docs/projects/emotional-physiology-tech-design.md) |
| B — codex/design-stealth-03-vision | 5837c5b30c90dbb30bd26530d196197aa311b35d | [Vision feature](https://github.com/Macrofold/OpenLegend/blob/5837c5b30c90dbb30bd26530d196197aa311b35d/docs/projects/vision-and-gaze-feature-spec.md), [technical design](https://github.com/Macrofold/OpenLegend/blob/5837c5b30c90dbb30bd26530d196197aa311b35d/docs/projects/vision-and-gaze-tech-design.md) |
| C — codex/design-stealth-04-acoustics | b242bee437f9e13801bfee77030efd309d88a35d | [Acoustic feature](https://github.com/Macrofold/OpenLegend/blob/b242bee437f9e13801bfee77030efd309d88a35d/docs/projects/acoustic-stealth-feature-spec.md), [technical design](https://github.com/Macrofold/OpenLegend/blob/b242bee437f9e13801bfee77030efd309d88a35d/docs/projects/acoustic-stealth-tech-design.md) |
| E — codex/design-stealth-05-attention | b8ee4a99d6b82b9146cd5cf86a15a69b857ab2b5 | [Attention feature](https://github.com/Macrofold/OpenLegend/blob/b8ee4a99d6b82b9146cd5cf86a15a69b857ab2b5/docs/projects/attention-and-investigation-feature-spec.md), [technical design](https://github.com/Macrofold/OpenLegend/blob/b8ee4a99d6b82b9146cd5cf86a15a69b857ab2b5/docs/projects/attention-and-investigation-tech-design.md) |

The full [CTR feature](combat-and-threat-responses-feature-spec.md), [CTR technical design](combat-and-threat-responses-tech-design.md), [base combat](../worlds/base/combat.md) and their source owners were reviewed. Source inspection establishes integration points, not native/browser/provider, capacity or player-enjoyment acceptance.

### Existing owners and required changes

| Owner | Verified baseline / required F integration |
| --- | --- |
| [combat-encounters.ts](../../packages/domain/src/combat-encounters.ts) | PersonalEncounters owns life, known pairs, anonymous occurrences, active attack associations and deadlines. Extend those records for warning registration and finite expectation. Its current personalEncounter query requires sight and cannot answer F. |
| [events.ts](../../packages/domain/src/events.ts), [event-observation.ts](../../packages/domain/src/event-observation.ts), [perception-frame.ts](../../packages/domain/src/perception-frame.ts) | Native reception precedes some Awareness insertion. WorldEvent.order is allocated before nested native callbacks. Preserve actual acquired membership; neither Awareness.sequence nor timestamp-only selection proves prior warning. |
| [kernel.ts](../../packages/domain/src/kernel.ts), [strikes.ts](../../packages/domain/src/strikes.ts) | Both unphased natural strike completion and phased melee call shared contact. Integrate both, sharing D's common attempt resolver rather than adding a surprise-specific resolver. |
| [ranged.ts](../../packages/domain/src/ranged.ts) | Release captures injury/direction and produces saved ProjectileFlight; actual first collider and one terminal contact are authoritative. Add release-bound surprise policy/group and immutable release-origin geometry where needed; do not store victim surprise at release. |
| [contact-defense.ts](../../packages/domain/src/contact-defense.ts), [living.ts](../../packages/domain/src/living.ts) | One shield/contact calculation then commitBodyEffects owns susceptibility, scars, clamping, interruption and death. Insert once-only amplification before shield arithmetic; never write health directly. No general armor stage exists in this inspected path. |
| [combat-consent.ts](../../packages/domain/src/combat-consent.ts) | Permission and exact potentially lethal review precede commitment. Include maximum allowed surprise injury in review facts; never inspect private victim awareness to decide whether confirmation appears. |
| [evasion.ts](../../packages/domain/src/evasion.ts), [ranged-policy.ts](../../packages/domain/src/ranged-policy.ts) | Evasion is actual motion without an invulnerability roll. D modifies new permitted evasion distance and release steadiness at their own boundaries; F adds no second factor. |
| [native-response-controller.ts](../../packages/domain/src/native-response-controller.ts), native-response danger/exposure owners | Memoryless animals already have a controller and perceived danger. Feed compact warning through CTR; do not duplicate their danger map, require human memory, or add movement selection. |
| [status-effects.ts](../../packages/domain/src/status-effects.ts), [state-contributions.ts](../../packages/domain/src/state-contributions.ts), [appraisals.ts](../../packages/domain/src/appraisals.ts) | D extends these for native-body-cause receipts and complete mechanical parameters. F only supplies a validated unexpected-contact cause and consumes resolved parameters. |
| [simulation-time.ts](../../packages/domain/src/simulation-time.ts), [temporal-boundaries.ts](../../packages/domain/src/temporal-boundaries.ts) | Add registration/retention/settling boundaries to existing participant-owned next-deadline accounting. Preserve coherent-prefix holds and actual native ordering. |
| [world-record-schema.ts](../../apps/server/src/world-record-schema.ts), current serialization/validation owners | Persist extension fields on their existing records, original deadlines/pins and outcomes. Rebuild derived indexes after restore. No legacy readers, migration or second schema. |
| [view.ts](../../apps/server/src/view.ts), protocol and current action/history projections | Project only own accepted preparation, personally received warning and allowed outcome facts. F's native snapshot is never serialized wholesale. |

PersonalEncounter.episode is an observer recognition/exposure association, **not a combat episode ID**. AttackObservationReceipt deduplicates observation of the same committed preparation. The existing ten-normal-second contextual grace, native animal episode and emotional cause all have different semantics; none is reused as a surprise timer.

The inspected source already has world-enabled human PvP and actual vulnerable-collider injury. Broader CTR delivery/qualification remains open. Existing guaranteed-accuracy strike RNG behavior also differs from its accepted one-draw contract (AC09.6); F adds no random draws and does not claim to repair or qualify that separate gap.

## PS-C01 — World policy and protected mechanism

The world owns qualification families, registration/lead durations, warning scope/retention, quiet settling and multiplier. Engine integrity owns exact life/reference validity, permitted evidence, native ordering, complete preparation, harm permission and once-only effects.

A narrow installed combat-policy descriptor supplies:

~~~ts
type PreparednessPolicy = Readonly<{
  pin: DefinitionPin;
  warningRegistrationSeconds: NormalSpeedSeconds;
  deliberatePreparationSeconds: NormalSpeedSeconds;
  warningRetentionSeconds: NormalSpeedSeconds;
  unwarySettleSeconds: NormalSpeedSeconds;
  surpriseDamageMultiplier: number;
  dangerFamilies: readonly DefinitionPin[];
  outcomeRule: 'first-designated-direct-outcome-per-victim';
}>;
~~~

These are finite nonnegative durations, a finite multiplier at least one, and exact supported definition references. The selected values live only in [base combat](../worlds/base/combat.md#preparedness-policy). An installed family maps its actual native attack/physical primitives to supported danger and damage semantics; arbitrary action names, prose tags or unsupported definitions cannot qualify.

The current body approximation for registration is explicit: exact current physical life; actor alive; activelyParticipates; **not capabilityBlocked for the general perception capability**. It is not a new generic readiness capability. Do not use canNoticeInternalChange, hasMemory, cognition, available actions, locomotion, energy, guard-ready state or a blanket incapacitated check. Existing channel-specific acquisition gates still decide whether a cue was received. After receipt, source occlusion, deafness or blindness of that particular channel does not erase already acquired information while the general registration predicate remains valid. An alternate world needs an explicitly supported predicate to change this approximation; no unimplemented physiology is inferred.

No module installed means no surprise damage/reaction contribution from F. An installed but incomplete/invalid policy is not absence. A materially different supported world must qualify with, for example, touch-acquired warning, no psychological fear, a different multiplier/lead and an omitted surprise rule—not just renamed humans.

## PS-C02 — Producer and consumer contracts

Shared SC02 ActorLifeRef, SimTime, OccurrenceRef, EvidenceRef, EvidenceCut, LocationEvidence and DefinitionPin retain their frozen meanings. A supplies FactKey, SupportedSensoryFact, CapturedCurrentFacet, permitted participants and exact acquisition. E supplies its complete [CapturedPreparationState / capturePreparation port](https://github.com/Macrofold/OpenLegend/blob/b8ee4a99d6b82b9146cd5cf86a15a69b857ab2b5/docs/projects/attention-and-investigation-tech-design.md#7-exact-preparedness-evidence-interface-for-prompt-6) unchanged. D supplies complete mechanics and its cause/receipt port. The following defines F-owned meanings; imported owner types are references to those contracts, not instructions to invent replacement schemas.

### Acquired warning and coverage

~~~ts
type WarningKey = Readonly<{
  source: EvidenceRef;
  factOrdinal: number;
  coverageOrdinal: number;
}>;

type ThreatCoverage =
  | Readonly<{ kind: 'self-assault'; danger: DefinitionPin }>
  | Readonly<{
      kind: 'known-source';
      sourceLife: ActorLifeRef;
      association: EvidenceRef;
      danger: DefinitionPin;
    }>
  | Readonly<{
      kind: 'origin-region';
      region: SupportedRegion;
      basis: FactKey;
      danger: DefinitionPin;
    }>
  | Readonly<{
      kind: 'approach';
      location: LocationEvidence;
      basis: FactKey;
      danger: DefinitionPin;
    }>;

type WarningMeaning =
  | 'directed-physical-preparation'
  | 'directed-release'
  | 'directed-attempt'
  | 'felt-attack-contact'
  | 'understood-warning'
  | 'supported-danger-interpretation';

type AcquiredThreatWarning = Readonly<{
  key: WarningKey;
  observer: ActorLifeRef;
  meaning: WarningMeaning;
  coverage: ThreatCoverage;
  acquiredAt: SimTime;
  occurrence: OccurrenceRef | null;
  acquiredBoundary: ExistingObserverAcquisitionBoundary;
  facts: readonly SupportedSensoryFact[];
  support: readonly EvidenceRef[];
  policy: DefinitionPin;
}>;

type CapturedWarningFact = Readonly<{
  key: WarningKey;
  observer: ActorLifeRef;
  meaning: WarningMeaning;
  coverage: ThreatCoverage;
  acquiredAt: SimTime;
  registrationBeganAt: SimTime;
  readyAt: SimTime;
  phase: 'registering' | 'registered';
  lastQualifiedAt: SimTime;
  retentionUntil: SimTime;
  settlingFrom: SimTime | null;
  continuousThreatThrough: SimTime | null;
  occurrence: OccurrenceRef | null;
  support: readonly EvidenceRef[];
  policy: DefinitionPin;
}>;
~~~

WarningKey uses a structured tuple/owning encoder, never delimiter concatenation. Ordinals select real admitted facets/coverage from one source, not extra warning onsets. These records extend the relevant known pair or anonymous entry under PersonalEncounters; they do not create a second top-level collection. Store only reduced values needed for continuation plus exact lineage, not another copy of all personal sensory history.

Only trusted observation/CTR adapters produce AcquiredThreatWarning. A command, client or model cannot submit this type as authority. F checks the already acquired typed evidence and allowed source meaning at its owning boundary; it never invents testimony, parses free text into hostility, generates a danger inference or revises A's signal quality.

- Direct attack evidence concerning **this observer's body**, or felt actual attack contact, can create self-assault coverage. A named attacker is unnecessary. Seeing a weapon, somebody else's attack or a private queued target cannot.
- Understood attributed warnings and admitted region-danger interpretations provide only their actual source/region/approach scope. Suspicious footsteps/movement remain possible signals until a supported warning meaning or chosen E anticipation exists. Raw subthreshold progress is never warning.
- A known-source binding requires an actually granted canonical physical-life association or own admitted exact opponent. A's rememberedSubject may be an observer-local individual; never cast it to an entity ID. Anonymous/suspected sources remain spatial/anonymous.
- Facts measured earlier but acquired after the cut cannot enter it. EvidenceOrder is not a substitute for actual membership. Original observation, acquisition and later interpretation times remain distinct.
- A's latest confirmation is copied at the cut. A later finalized continuous observation cannot backfill an earlier cut merely because its measurement interval began earlier.
- Source/revision corrections revoke derived future support through existing correction; replay/recall/publication contributes no fresh warning.

### Active preparation and matching

Call **capturePreparation(victim, cut, completeInstalledFamilySet)** once after required physical work is settled. Its only success is complete immutable current preparation/workSupport; otherwise it returns incomplete. The family set is the descriptor-derived complete set, not a caller filter.

| E physical family | Selected F predicate and coverage |
| --- | --- |
| observation | kind anticipation, explicit danger kinds, compatible method, maintaining fulfillment and earned lead; active focus only, intersected with actual provider/pose coverage. Ordinary observation supplies no anticipation. |
| shield-guard | Exact life/profile/equipment, ready phase, coverage and earned lead from actual fulfillment. Native shield readyAt and expiresAt remain authoritative. A head glance cannot rotate it. |
| ranged-aim | Actual working/maintaining preparation and valid own opponent/approach, not mere approach or an unadmitted wish. Lead is measured from real method start, not the full action duration. Readiness is scoped; it does not warn of unrelated betrayal. |
| strike | Actual working wind-up or supported unphased work, maintaining method and exact admitted opponent. Recovery does not earn a new interval. An earlier registered warning can continue independently. |
| evasion | Actually admitted danger/approach association and fulfilled movement/body requirements; not any ordinary move or arbitrary endpoint. Its existing duration/trajectory remains authoritative. |
| native-alert | Actual maintained alert method, complete permitted danger scope and body constraints. Escaping/settling/blocked is not by itself proof. A stationary or route-blocked animal can remain alert; blocked locomotion does not imply failed anticipation. |

For active preparation, readyAt = maintainedFrom + converted deliberate lead, and both actual fulfillment and the method's own stricter condition must hold at the cut. Newly accepted same-time work has zero elapsed lead. Work intervals are half-open; equality with an expiry is ended, even if an action remains in recovery. A method ending exactly when its lead completes contributes no current coverage after ending.

No current coverage is banked from finished methods. A previously acquired actual warning keeps its own continuation; a completed guard/scan/evasion does not create a warning merely to preserve readiness. Compatible offensive work may continue to anticipate its admitted opponent across a view edge under the exact supported work/evidence binding, without tracking hidden coordinates.

**Coverage matching is a native comparison, not another observation.** It can inspect the already resolved attack's actual cause/geometry to compare with legitimately acquired preparation. It cannot use that comparison to disclose or learn a source.

| Coverage | Exact match |
| --- | --- |
| self-assault | Same victim life and installed ordinary physical-assault family. Current source identity, direction, range to the shooter and number of attackers do not matter. |
| known-source | Exact captured historical source life equals the actual committed source life and the danger family fits; support remains eligible. It grants no current targeting, position, identity disclosure or cross-exposure join. |
| origin-region | Actual immutable release/strike origin lies within the original supported 3D region under its geometry owner. No recentering with observer/source movement or use of the projectile's later position. |
| approach warning | Actual final uninterrupted incoming path intersects the captured location region/cone at its original frame and uncertainty. Use the supported region/bearing/point predicate; unsupported or incomplete geometry is not a mismatch. |
| current E region/bearing/travel-relative scope | Relevant danger kind and actual method coverage both match the incoming approach. Fixed scopes stay fixed; maintained travel-relative scope uses E's achieved current frame. A known subject uses its actual permitted exact binding, not a name. |

A bearing is its original cone, a region its supported volume and a point its admitted uncertainty volume. For an approach record, the actual contact path must enter that volume/cone **before** the contact, in the observed/maintained incoming direction; mere contact at the cone apex does not match all directions. Geometric boundaries use the existing spatial owner's inclusive boundary/tolerance, not a new F epsilon. Actual finite contact segments and the released projectile's traversed path are used, not an infinite line through walls. Interception truncates the traversed path. Solid/level separation and height remain part of existing geometry. A threat estimate never acquires hidden exact coordinates.

An origin-region warning requires a real permitted spatial basis. E's own/known-terrain selection can create active preparation without a warning FactKey; it remains E work rather than manufacturing AcquiredThreatWarning. F's typed origin-region/approach warnings require the evidence basis shown above.

### Attack commitment, outcome and damage receipt

~~~ts
type AttackSurpriseBinding = Readonly<{
  execution: ExistingAttackOrFlightRef;
  source: ActorLifeRef;
  intendedTarget: ActorLifeRef | null;
  policy: DefinitionPin;
  danger: DefinitionPin;
  committedAt: SimTime;
  committedOrigin: Position;
  group: Readonly<{
    actionId: string;
    outcomeGroupOrdinal: number;
  }>;
  carrierOrdinal: number;
  maximumMultiplier: number;
}>;

type ActualAttackOutcome = Readonly<{
  attack: AttackSurpriseBinding;
  cause: ExistingPhysicalCauseRef;
  outcomeOrdinal: number;
  victim: ActorLifeRef;
  cut: EvidenceCut;
  result:
    | 'miss'
    | 'contact'
    | 'intercepted-contact';
  nominalContactInjury: number;
  designatedSlot: 'unconsumed' | 'already-consumed' | 'not-designated';
}>;

type SurpriseEvaluation =
  | Readonly<{
      kind: 'complete';
      decision: SurpriseDecision;
      qualifyingBasis:
        | 'registered-warning'
        | 'active-preparation'
        | 'retained-expectation'
        | 'no-relevant-preparedness';
      usedWarning: readonly WarningKey[];
      usedWork: readonly ExistingActiveWorkRef[];
    }>
  | Readonly<{ kind: 'not-installed' }>
  | Readonly<{ kind: 'incomplete'; continuation: ExistingWorkReference }>;

type SurpriseDamageApplication = Readonly<{
  attack: ExistingAttackOrFlightRef;
  cause: ExistingPhysicalCauseRef;
  victim: ActorLifeRef;
  outcomeOrdinal: number;
  slot: 'spent-now' | 'already-spent' | 'not-designated';
  multiplier: number;
  nominalInjury: number;
  amplifiedInjury: number;
  applied: boolean;
}>;
~~~

Attack/action/flight/cause references reuse their exact existing owner bindings. outcomeGroupOrdinal and outcomeOrdinal distinguish real native components where the current single-contact family uses zero; do not allocate a second global counter. A high-level plan ID is not an attack execution. The body/cause fields are native, never raw protocol DTOs.

Preserve SC12 VictimPreparationSnapshot unchanged: victim/cut, captured warning, E preparation, acquiredSupport/workSupport, complete relevant D mechanics, policy. Evaluation consumes only those resolved immutable values and attack geometry. It never re-reads mutable evidence/work during damage application.

SurpriseDecision's surprised flag reports the informational/preparedness qualification independently of hit or slot spending. Its multiplier is the resolved applicable factor for the designated outcome: one for expected/not-designated/spent, authored multiplier for a surprised unspent designated outcome. A miss can have surprised=true and a potential multiplier but actual applied=false, injury zero. No caller should infer actual health loss from that field.

SurpriseDamageApplication is retained as a component of the existing contact/action/projectile outcome. It is not a second damage ledger. The contact owner requires the exact unconsumed producer stage and rejects conflicting reuse; identical receipt recovery returns the committed result. No external caller supplies a free multiplier.

### Startle producer to D

F prepares a cause only for a real unexpected physical attack contact, including intercepted contact on the victim's own held shield. Supply D's existing prepared-cause fields: original exact action/projectile contact identity, owner contact ordinal, native stage/order, actual victim life, timeline scope, contact support and installed unexpected-attack-contact rule. The cause is bound before the enclosing WorldEvent exists and committed with the contact.

Call D's **admitBodilyReaction(world, preparedCause, preparedBody, at)** through its existing status/contribution mutation path. D returns admitted, replayed, inapplicable, incomplete or conflict and owns the resulting peak, duration, curve and exact receipt. F never chooses those values. Original cause + reaction pin + target life identifies onset; struck/guarded/body-effect/contact/awareness/memory/appraisal wrappers do not.

A shield owned by someone else intercepting the projectile changes the actual victim; the protected intended person gets no phantom contact shock. Armor or zero-injury actual body/own-shield contact can still qualify. Miss, range expiry and an unseen environmental collision cannot be passed as unexpected-attack-contact. A/C may independently deliver a real personally acquired abrupt cue/near miss. No new noncontact F stimulus family is proposed.

## PS-C03 — Warning lifecycle and finite expectation

### Registration

The observation owner hands off a qualifying acquired warning synchronously before dependent attack resolution. CTR records its exact source/coverage and original acquiredAt, sets readyAt using the pinned normal-clock conversion, and schedules only the new nearest relevant deadline.

At readyAt, native advancement verifies the registration predicate held for the entire interval. Source visibility is not required after acquisition. A new warning whose scope is not already registered starts its own interval. A genuinely fresh matching warning received while equivalent supported expectation is still registered may renew that expectation without an artificial new gap; it retains each source's original acquisition and does not rewrite old evidence dates.

At a general perception block, life end or participation ending, retire pending registration and registered bodily preparedness for that affected life through the encounter owner. Mere inability to act/move and channel-specific loss after valid acquisition are not this transition. No old record silently matures across sleep. Waking/restoring perception needs **new post-wake acquired/confirmed threat support or a newly fulfilled deliberate method**; unexpired pre-sleep preparedness does not resume. Memories/CTR social preferences retain their own lifetimes. Receiving an impact while asleep does not create a backdated interval before injury wakes the body.

A current threat actually re-observed after waking may begin new registration without falsely becoming a new hostile occurrence or a second startle from a replayed source. Use A's real post-wake acquisition/confirmation and CTR's existing dedupe meanings separately.

### Retention and quiet settling

For each registered matching support:

- lastQualifiedAt is the last **genuinely fresh matching warning acquisition** or the last actually confirmed boundary of its ongoing directed threat. It is never now merely because a read occurred.
- retentionUntil = lastQualifiedAt + converted warningRetentionSeconds.
- Before retentionUntil, the support retains its registered scope.
- Settling can begin only at or after retentionUntil, with complete required perception, no currently confirmed matching threat and no relevant fulfilled preparation.
- If there is no interruption, unwaryAt = settlingFrom + converted unwarySettleSeconds. At cut.at >= unwaryAt, that support no longer qualifies.
- A matched maintained method beginning during settling clears settlingFrom; once it actually ends, settling can start again at max(retentionUntil, method end). An unrelated method does nothing.
- A fresh matching threat updates its own support/retention and clears settling. A new unrelated warning cannot refresh another scope.
- For the ordinary no-further-work case, a warning last acquired at 10.00 normal seconds remains relevant until 18.00: six seconds retained, followed by two settled seconds. This is deliberately **six plus two**, not max(six elapsed, two quiet).
- Distinct independent supports are evaluated independently. Correcting one does not remove an independently supported other warning. Coalesce equivalent projection only when the complete eligibility/renewal lineage remains recoverable.

Continuous live confirmation comes from A's actual captured confirmation interval, not the hidden attack's continued existence. A release or source departure does not supply a hidden continuation. Current E work is captured independently; it cannot fabricate a fresh warning. For known-opponent work, relevance follows the actual source/approach binding; unrelated hunting, crafting or generic movement cannot delay settling of an old encounter.

There is no surprise-use counter on the victim. Repeated independent attacks can qualify before registration completes, or after a genuine unwary return. Their actual evidence then has its ordinary chance to register. No attacker ID/weapon swap, backward step, exposure replacement, Speak shortcut, Stop/restart, refund or reconnect clears another character's evidence.

### Storage and episode identity

Add the minimal warning continuation to existing PersonalEncounter known pairs and existing unknown entries. Keep recognition episode, original attack-observation receipt and source revisions intact. For a multi-support warning, retain the exact currently relevant bases required by acquisition/correction; no historical text is needed in the hot record.

Use the original WarningKey plus observer life as the warning identity. A new return to unwary closes the live continuation; later real warning uses its own original occurrence/acquisition or post-break confirmation and new registration boundary. Do not manufacture a universal ambush episode UUID, reuse a perception episode as a combat episode, or reset old cause identities.

Known and unknown inputs share the same evaluator. Memoryless actors can retain compact native-exposure/native-response references here; their existing native danger map remains authoritative for movement selection and is not copied. Prune expired live derived fields through CTR nextAt/reconciliation. Canonical evidence and terminal attack/reaction receipts remain in their existing history/retention owners.

## Native evaluation order

The coordinator preserves existing canonical native order. It does not replace it with packet arrival, array insertion, a new batch order or Awareness.sequence.

1. **Admission / revalidation.** Existing attack owners check permission, exact lives/tools, work/recovery, geometry and lethal review. A proposal or refusal emits no invented attack warning. The review uses maximum permissible surprise harm independently of private readiness.
2. **Actual preparation.** The action/pose owner exposes supported physical wind-up/aim/weapon trajectories to B/C. A acquires the observer-permitted result; CTR may register it. Never read a hidden action stage and label it a visible cue. Until a real physical producer exists, it supplies no such warning.
3. **Release / irreversible melee attempt.** Freeze attack-side damage, source/intended life, policy, committed origin, group/carrier and relevant mechanical values. Melee uses D attacker accuracy at this one attempt. A ranged shot uses D shooter steadiness once at release; save the resulting flight, not a victim-surprise Boolean.
4. **Advance to a physical outcome boundary.** Settle already admitted motion/turns, due effect ending, preparation changes, warning ready/retention/settling deadlines and legitimately due sensing. Complete A/B/C and required mechanical/reaction preparation. A previously admitted turn may have earned warning; a new same-time turn has no elapsed completion.
5. **Capture before mutation.** For the actual victim, obtain A's immutable acquired membership and values, CTR warning continuation, E complete current preparation and complete relevant D inputs. Take SC12 EvidenceCut before commitContactImpact or any nested body/guard result. An earlier event not acquired within the cut is absent.
6. **Evaluate expectedness.** For each applicable basis, match scope and exact life; then require registered warning/retained expectation or fulfilled current preparation with earned lead. If any valid basis passes, surprised=false. With complete inputs and none passing, surprised=true. Unsupported/incomplete required work never becomes an empty list.
7. **Resolve the ordinary physical outcome.** Existing reach/accuracy/flight collision/guard code determines miss or actual contact. Surprise does not reroll, guarantee contact or bypass recovery. A melee intended miss can have an internal classification if a real eligible attempt exists; missing/retired targets or refused attacks do not create victim outcomes. A projectile is evaluated for the actual body contacted, not every possible intended-target miss.
8. **Consume the designated slot and calculate injury.** Determine applicable shield/protection using current geometry, multiply the eligible nominal direct injury once, execute mitigation, then call the ordinary body owner. Record the slot, arithmetic and actual result in the same native transaction.
9. **Commit new reaction.** For qualifying unexpected actual contact, commit D's already prepared cause/receipt after this contact's mechanical inputs were fixed. Injury/guard/body wrappers share its cause. Required reaction preparation failure holds before step 8; damage cannot commit while silently discarding selected shock.
10. **Acquire consequences.** Publish/acquire actual contact/attempt sound and observer evidence, update CTR's warning continuation, and notify optional cognition. Its new warning starts now, never before the original cut. Later ordered outcomes see only genuinely committed preceding facts/effects.
11. **Publish and save coherently.** Existing outcome receipts, committed costs, consumed stages, effects and required observer evidence form one coherent continuation. A retry recovers that outcome without re-execution.

The existing kernel executes its ordered action effects and then captured flights, whose owner sorts by flight ID; collision ties use that owner's ordering. Preserve these choices unless the owning project explicitly changes them. Same numeric timestamp does not remove this order. A first contact's shock can affect a later melee attacker's accuracy only if that attacker is the shocked actor and its own attempt occurs later; it cannot alter a previously released projectile or an already admitted evasion.

For the selected positive registration interval, a first impact cannot give enough elapsed anticipation to prevent surprise on a second impact at the exact same simulation time. Pre-existing preparation can prevent both. Physical death, interruption and one-use guard consumption still take effect in canonical order. If an alternate world selects zero registration, a genuinely earlier acquired consequence can count for a later cut at that time, but never for its own contact.

The native action/event owner must assign or reserve each real outcome's cause ordinal before body mutation; using an event allocated afterward as the only identity would break D's atomic onset. This is a local extension to the existing producer stage, not a new globally ordered event bus.

## Damage placement and outcome consumption

### One existing contact calculation

For the selected direct-contact injury component, let **B** be the already authorized, release/attempt-bound nominal injury; **M** be the installed surprise multiplier if this outcome qualifies and owns the unspent designated slot, otherwise one; and **S** be the existing shield reduction function for this exact contact. The path is:

**nominal contact B → once-only B × M → existing shield S → existing body susceptibility/scars → existing clamping and health/life consequences.**

Keep the owner's current numeric representation, rounding, nonnegative checks and health cap. Do not round at the new multiplication stage, multiply the final capped health loss, or multiply both a component and its already amplified total. A hit with nominal injury 5, qualifying 2× surprise and the existing 50% shield reduction passes 5 onward to the body calculation; without surprise the same shield passes 2.5. This arithmetic example assumes no further body adjustment and does not prescribe a new integer health format.

An ordinary ready guard usually supplies matching preparation, so the surprising-but-shielded case needs a genuine mismatch or insufficient lead. Physical shield eligibility remains independent. The current shield takes 0.25 normal seconds to prepare, stays ready for 3, recovers for 1, covers 120° of body facing, reduces 50%, and consumes the first covered connecting contact. Its existing exact rules remain in the combat owner. An uncovered contact or miss does not consume that guard. F's opportunity, by contrast, can be spent on a designated miss. Neither rule changes the other.

Evasion is the current admitted motion (initially 2 m over 0.2 normal seconds with a 2-second repetition limit), not a surprise save, invulnerable period or extra roll. D adjusts newly admitted maximum distance while preserving the selected movement speed/trajectory rules. F never retargets a projectile, reopens a completed accuracy draw, suppresses guard recovery or increases reach.

### Designated outcomes and multiple contacts

The initial supported natural/melee execution and single projectile each have one designated direct outcome. Keep group ownership on the existing action or saved carrier; do not create a global damage ledger.

| Native family/outcome | Exact consumption rule |
| --- | --- |
| Single melee attempt | The first designated actual attempt against its admitted exact victim life spends the slot whether it misses, is blocked, deals zero or deals injury. Approach failure/cancellation before an attempt creates no outcome and no slot to carry to a replacement action. |
| Single terminal projectile | Evaluate the actual collider's life immediately before its terminal contact. That contact spends the slot even if protection makes injury zero. World/terrain termination or range expiry ends the carrier; it cannot bank a later attack. No fictitious bystander miss or warning is emitted. |
| Several injury components in one physical contact | The native family must declare the eligible direct-contact bundle. Apply M once to its designated nominal components before aggregating; never also multiply their total. Poison, later bleeding, fire, status onset and unrelated secondary harm are excluded unless a separately designed family explicitly defines them. |
| Supported sweep contacting several lives | If implemented later, the execution gets one first designated outcome per actual victim life. Re-contacting the same life cannot amplify again. The contact owner supplies stable ordered outcome ordinals and keeps its existing per-target execution receipts until terminal completion. |
| Burst or several released carriers from one action | If implemented later, only carrier ordinal zero of the declared execution/group may own surprise amplification. Later releases cannot inherit a missed or blocked first carrier's opportunity, even when they arrive first. Each actual victim of that designated carrier still needs its own cut. A later separately admitted action is a separate execution. |
| Piercing, ricochet or persistent attack volume | Not initially supported by the inspected terminal-contact flight. Before adding one, its owner must implement explicit per-life first-outcome receipts and a complete ordered carrier/group lifetime. Bouncing, changing target labels or leaving/re-entering a volume cannot mint another slot. |
| Independent simultaneous attacks | Each has its own designated opportunity and actual victim cut. There is no once-per-ambush cap; all can be surprising before any warning has had time to register. Canonical physical ordering still controls death, guard consumption and interruption. |
| Replay, duplicate event or retry | Same execution/carrier/outcome/life tuple returns the committed receipt; no second multiplication, harm, reaction or guard consumption. A wrapper event is not a new outcome. |

The sweep/burst/piercing rows constrain future owners; they do not implement those families or silently reinterpret existing single-contact actions. A future attack descriptor cannot opt into amplification until its owner supplies the complete consumption contract. A release ordinal must be allocated by the actual native producer before release; a client-supplied label is not identity. Group continuation must survive action termination while its released carriers remain alive under the existing continuation owner.

Surprise qualification and opportunity consumption are separate. A designated expected contact still spends its opportunity. An unexpected later non-designated contact can supply a distinct eligible native startle cause without gaining another damage multiplier. D still applies its own cause deduplication and aggregation.

### Permission and lethal review

Extend combat-consent attack facts and exact review receipts to include the bound profile/policy and maximum allowed direct surprise injury. Compute the existing death-risk/confirmation predicate against that upper bound with the existing target susceptibility/scar and harm-policy facts; do not discount a possible shield or inspect private warning/preparation. The confirmation is therefore stable across hidden awareness changes. If a materially relevant attack policy/body/review fact changes before commitment, the existing stale-review path requires fresh review.

Both unphased and phased melee revalidate at their actual irreversible attempt boundary. Ranged revalidates at release and captures its immutable contact policy. After release, contact obeys that existing world/participant/collider contract without pausing the flight for a second PvP question. Intended-target permission never supplies the collateral victim's preparedness, and F does not invent a new immunity or permission exception.

A rejected/expired admission cannot warn solely because it was proposed. If the person visibly performed real preparation before later cancellation, observers can retain that real warning; cancellation does not erase already perceived conduct.
