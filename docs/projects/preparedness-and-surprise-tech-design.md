# Preparedness and surprise — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | F's contracts, algorithms and paper acceptance are designed; SUR01–SUR09 implementation and integration qualification remain open. | 2026-10-22 |

## Authority and delivery boundary

This document owns specialist F's consumer/producer contract, exact surprise evaluation and integration into existing combat. [Feature behavior](preparedness-and-surprise-feature-spec.md), [base-world policy](../worlds/base/combat.md#preparedness-policy), [SUR tasks](../maintainers/preparedness-and-surprise.md) and [limits](../limits/preparedness-and-surprise.md) have distinct purposes. It completes the selected [ND11](../maintainers/needs-design.md#nd11--human-conflictrecovery-and-npc-ghost-continuity) design only.

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

## SUR-C01 — World policy and protected mechanism

The world owns qualification families, registration/lead durations, warning scope/retention, quiet settling and multiplier. Engine integrity owns exact life/reference validity, permitted evidence, native ordering, complete preparation, harm permission and once-only effects.

Extend BodyPolicy.combat.encounters in packages/domain/src/body-policy.ts and its existing validateBodyPolicy path; the selected source is BASE_BODY_POLICY.combat.encounters in packages/domain/src/worlds/base/body-policy.ts. The existing bodyPolicyPin/definition owner supplies its pin. combat-encounters.ts already reads bodyPolicy(world)?.combat?.encounters. Its current recentSeconds is CTR's contextual grace and must remain separate.

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

## SUR-C02 — Producer and consumer contracts

Shared SC02 ActorLifeRef, SimTime, OccurrenceRef, EvidenceRef, EvidenceCut, LocationEvidence and DefinitionPin retain their frozen meanings. A supplies FactKey, SupportedSensoryFact, CapturedCurrentFacet, permitted participants and exact acquisition. E supplies its complete [CapturedPreparationState / capturePreparation port](https://github.com/Macrofold/OpenLegend/blob/b8ee4a99d6b82b9146cd5cf86a15a69b857ab2b5/docs/projects/attention-and-investigation-tech-design.md#7-exact-preparedness-evidence-interface-for-prompt-6) unchanged. D supplies complete mechanics and its cause/receipt port. The following defines F-owned meanings; imported owner types are references to those contracts, not instructions to invent replacement schemas.

### Acquired warning and coverage

~~~ts
type PreparednessTimingBinding = Readonly<{
  policy: DefinitionPin;
  clock: ExistingAdmittedNormalClockBinding;
  registrationDuration: SimDuration;
  deliberateLeadDuration: SimDuration;
  retentionDuration: SimDuration;
  settlingDuration: SimDuration;
}>;

type PreparednessCredit = Readonly<{
  work: ExistingActiveWorkRef;
  cut: EvidenceCut;
  matureAt: SimTime;
  covered: ResolvedPreparationCoverage;
  support: readonly EvidenceRef[];
}>;

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
      kind: 'retained-prepared-approach';
      covered: ResolvedPreparationCoverage;
      preparation: ExistingActiveWorkRef;
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
  | 'incoming-projectile'
  | 'felt-attack-contact'
  | 'understood-warning'
  | 'supported-danger-interpretation'
  | 'own-committed-offense';

type AcquiredThreatWarning = Readonly<{
  key: WarningKey;
  observer: ActorLifeRef;
  meaning: WarningMeaning;
  coverage: ThreatCoverage;
  acquiredAt: SimTime;
  occurrence: OccurrenceRef | null;
  acquiredBoundary: ExistingObserverAcquisitionBoundary;
  timing: PreparednessTimingBinding;
  credit: PreparednessCredit | null;
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
  acquiredBoundary: ExistingObserverAcquisitionBoundary;
  timing: PreparednessTimingBinding;
  credit: PreparednessCredit | null;
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

PreparednessTimingBinding copies the existing admitted normal-clock binding and the four already converted simulation durations. SimDuration denotes the existing simulation-duration numeric type, not wall time. Preserve that binding through renewal, deferred settling and restore; do not convert again using the then-current speed/rate. Any supported normal-clock/policy edit follows SC13's explicit settle/revalidate/rebind path. PreparednessCredit is a copied proof of mature relevant work at an earlier cut, never a pointer to reread mutable work.

WarningKey uses a structured tuple/owning encoder, never delimiter concatenation. Ordinals select real admitted facets/coverage from one source, not extra warning onsets. These records extend the relevant known pair or anonymous entry under PersonalEncounters; they do not create a second top-level collection. Store only reduced values needed for continuation plus exact lineage, not another copy of all personal sensory history.

Only trusted observation/CTR adapters produce AcquiredThreatWarning. A command, client or model cannot submit this type as authority. F checks the already acquired typed evidence and allowed source meaning at its owning boundary; it never invents testimony, parses free text into hostility, generates a danger inference or revises A's signal quality.

- Direct attack evidence concerning **this observer's body**, or felt actual attack contact, can create self-assault coverage. A named attacker is unnecessary. Seeing a weapon, somebody else's attack or a private queued target cannot.
- Understood attributed warnings and admitted region-danger interpretations provide only their actual source/region/approach scope. Suspicious footsteps/movement remain possible signals until a supported warning meaning or chosen E anticipation exists. Raw subthreshold progress is never warning.
- A known-source binding requires an actually granted canonical physical-life association or own admitted exact opponent. A's rememberedSubject may be an observer-local individual; never cast it to an entity ID. Anonymous/suspected sources remain spatial/anonymous.
- Facts measured earlier but acquired after the cut cannot enter it. EvidenceOrder is not a substitute for actual membership. Original observation, acquisition and later interpretation times remain distinct.
- A's latest confirmation is copied at the cut. A later finalized continuous observation cannot backfill an earlier cut merely because its measurement interval began earlier.
- Source/revision corrections revoke derived future support through existing correction; replay/recall/publication contributes no fresh warning.

### Exact scoped claim/inference admission

The selected world deliberately treats **a current scoped danger report** as reason for minimal anticipation of ordinary physical assault from that scope. This is a protective response policy, not a claim that an attacker exists. It does not require inventing a danger-family field on A's generic danger claim.

| A input | F admission rule |
| --- | --- |
| role testimony, facet claim, claim.kind danger | Require A's already validated personally acquired/understood claim, strength possible or supported, presence possible or asserted, and stated-interval containing its actual native claim-admission/acquisition time. Preserve where and uncertainty. Begin registration when that complete admitted meaning is available. |
| role inference, facet inference, inference.kind region-danger | Require the actually committed current inference, strength possible or supported and complete valid basis FactKeys. Its presence possible is enough for the selected scoped precaution. Begin only at its actual native admission/acquisition boundary, never earlier formedAt or when an older basis occurred. Retain formedAt as semantic provenance only. |
| Either eligible row | Map to the base world's ordinary physical-assault anticipation only within the original supported region/approach. False testimony can yield real preparation. No source identity is inferred from its location. |
| ambiguous strength, authored/imagined role, historical recall, unspecified time, relative-words claim time, general reputation | No automatic warning admission. F does not parse words into a time/family or promote uncertain identity. The person may still choose supported E anticipation or later acquire a valid current claim. |

A's ClaimTime is unspecified, stated-interval, or relative-words; no new current/future-near variant or arbitrary temporal window is assumed. Approximate stated intervals retain their original bounds/precision, without expansion. A danger assertion need only be current at its real native admission/acquisition; continuation afterward follows F's finite retention rather than claiming the assertion remains true. Broad “this world is dangerous” without a valid bounded scope does not qualify.

A already owns speech understanding and the validity of quoted/reporting support. Its claim must be grounded in actually received heard segments or an admitted report. Partial speech qualifies only if the complete admitted danger meaning is supported by the received fragments. Clear delivery alone is not semantic understanding or truth. Visible talking, unintelligible audio, private event text, an unseen recipient ID or the actor's own self-speech cannot manufacture an external warning. F neither parses segments nor asks a model to rerun their interpretation.

The ordinary attack mappings above remain separate: actual native observer-permitted preparation/release/attempt toward the observer, felt contact, and an actually acquired incoming-projectile cue can support self-assault. Flight detection/location alone cannot prove direction or threat. The dedicated flight adapter must supply personally permitted approach support as specified in the integration requirements below; hidden intendedTarget, unobserved velocity or eventual collision cannot substitute.

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

For observation and native-alert methods, readyAt = maintainedFrom + converted deliberate lead: the interval begins only when the relevant pose/sensory/body fulfillment exists. For shield-guard, ranged-aim, strike and evasion, the lead begins at the actual physical method start, and both current fulfillment and the method's own stricter readiness condition must hold at the cut. For a shield this is max(currentMethodStartedAt + converted deliberate lead, guard.readyAt), so its existing 0.25-second preparation does not incur an extra 0.20-second delay. Approaching a target is not method start. Newly accepted same-time work has zero elapsed lead. Work intervals are half-open; equality with an expiry is ended, even if an action remains in recovery. A method ending exactly when its lead completes contributes no current coverage after ending.

**Proposed E port amendment SA-D03.** E currently exposes preparing.beganAt but its maintaining variant retains only maintainedFrom. Its admittedAt can precede approach or interruption, so neither is a safe substitute for the physical method start. Add currentMethodStartedAt: SimTime | null to E's CapturedPreparationState, copied from the existing work owner, preserved through preparing → maintaining, reset on a genuine break/replacement/restart and unchanged by a harmless plan revision. A null value means no such method has begun. This is a specific proposed extension to E, not a silent change to frozen SC02/SC10. F implementation that needs this anchor waits for joint E/F integration; it cannot infer it from duration or weaken the readiness check. The [decision record](../../archive/05-project/open-decisions.md#sa-d03--preparation-lead-after-native-phase-transition) tracks adoption.

No current coverage is banked from finished methods. A previously acquired actual warning keeps its own continuation; a completed guard/scan/evasion does not create a warning merely to preserve readiness. Compatible offensive work may continue to anticipate its admitted opponent across a view edge under the exact supported work/evidence binding, without tracking hidden coordinates.

**Coverage matching is a native comparison, not another observation.** It can inspect the already resolved attack's actual cause/geometry to compare with legitimately acquired preparation. It cannot use that comparison to disclose or learn a source.

| Coverage | Exact match |
| --- | --- |
| self-assault | Same victim life and installed ordinary physical-assault family. Current source identity, direction, range to the shooter and number of attackers do not matter. |
| retained-prepared-approach | The immutable previously mature prepared scope, frozen in its actual world/body frame at the confirming occurrence, matches this incoming approach. It never rotates/follows the observer afterward. The actual acquired attack and captured credit are both required. |
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

type ResolvedThreatGeometry = Readonly<{
  origin: Position;
  segments: readonly Readonly<{ from: Position; through: Position }>[];
  contactOrAttemptPoint: Position;
  incoming: ExistingResolvedIncomingDirection;
  victimBody: ExistingResolvedBodyGeometry;
  frame: ExistingResolvedSpatialFrame;
}>;

type ActualAttackOutcome = Readonly<{
  attack: AttackSurpriseBinding;
  cause: ExistingPhysicalCauseRef;
  outcomeOrdinal: number;
  victim: ActorLifeRef;
  cut: EvidenceCut;
  geometry: ResolvedThreatGeometry;
  timing: PreparednessTimingBinding;
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

ResolvedThreatGeometry copies the existing spatial/contact owner's already resolved finite segments, direction, endpoint, relevant body extents and frame at the outcome boundary. A current straight projectile uses its actual traversed release-to-terminal segment; melee uses its real resolved finite attempt/contact approach, including a miss's attempted endpoint. It is not an infinite ray or a new collision solver. Required geometry missing from the owner is incomplete, never reread later through a cause reference or mutable flight. Future curved/piercing families must supply their real ordered finite segments. Geometry is private native comparison input, not an acquired observation or client payload. Outcome timing supplies the installed admitted binding for the capture; per-warning and per-method bindings retain their own exact admission conversion.

Attack/action/flight/cause references reuse their exact existing owner bindings. outcomeGroupOrdinal and outcomeOrdinal distinguish real native components where the current single-contact family uses zero; do not allocate a second global counter. A high-level plan ID is not an attack execution. The body/cause fields are native, never raw protocol DTOs.

Preserve SC12 VictimPreparationSnapshot unchanged: victim/cut, captured warning, E preparation, acquiredSupport/workSupport, complete relevant D mechanics, policy. Evaluation consumes only those resolved immutable values and attack geometry. It never re-reads mutable evidence/work during damage application.

SurpriseDecision's surprised flag reports the informational/preparedness qualification independently of hit or slot spending. Its multiplier is the resolved applicable factor for the designated outcome: one for expected/not-designated/spent, authored multiplier for a surprised unspent designated outcome. A miss can have surprised=true and a potential multiplier but actual applied=false, injury zero. No caller should infer actual health loss from that field. For a miss, nominalInjury and amplifiedInjury are zero and applied is false. For actual contact, amplifiedInjury is the designated nominal amount after the permitted factor, before mitigation. applied is true exactly when a factor greater than one was inserted once into a positive eligible raw contact component; it does not mean additional health was lost. Zero nominal injury, multiplier one or a non-designated slot has applied=false. A later shield/body immunity or health cap can yield zero extra health loss even when applied=true; record final body outcome separately.

SurpriseDamageApplication, the complete SurpriseDecision (including cut, reason and policy linkage), and its selected warning/work provenance are retained as components of the existing contact/action/projectile outcome. It is not a second damage ledger. The contact owner requires the exact unconsumed producer stage and rejects conflicting reuse; identical receipt recovery returns the committed result. No external caller supplies a free multiplier.

### Startle producer to D

F prepares a cause only for a real unexpected physical attack contact, including intercepted contact on the victim's own held shield. Supply D's existing prepared-cause fields: original exact action/projectile contact identity, owner contact ordinal, native stage/order, actual victim life, timeline scope, contact support and installed unexpected-attack-contact rule. The cause is bound before the enclosing WorldEvent exists and committed with the contact.

Call D's **admitBodilyReaction(world, preparedCause, preparedBody, at)** through its existing status/contribution mutation path. D returns admitted, replayed, inapplicable, incomplete or conflict and owns the resulting peak, duration, curve and exact receipt. F never chooses those values. Original cause + reaction pin + target life identifies onset; struck/guarded/body-effect/contact/awareness/memory/appraisal wrappers do not.

A shield owned by someone else intercepting the projectile changes the actual victim; the protected intended person gets no phantom contact shock. Armor or zero-injury actual body/own-shield contact can still qualify. Miss, range expiry and an unseen environmental collision cannot be passed as unexpected-attack-contact. A/C may independently deliver a real personally acquired abrupt cue/near miss. No new noncontact F stimulus family is proposed.

## SUR-C03 — Warning lifecycle and finite expectation

### Registration

The observation owner hands off a qualifying acquired warning synchronously before dependent attack resolution. CTR records its exact source/coverage and original acquiredAt, sets readyAt = acquiredAt + its bound registrationDuration, except that validated mature same-scope credit makes readyAt = acquiredAt, and schedules only the new nearest relevant deadline.

At readyAt, native advancement verifies the registration predicate held for the entire required interval; the immediate credited case also requires the body remains eligible at acquisition and the captured work genuinely earned maturity before it. Source visibility is not required after acquisition. A new warning whose scope is not already registered starts its own interval. A genuinely fresh matching warning received while equivalent supported expectation is still registered may renew that expectation without an artificial new gap; it retains each source's original acquisition and does not rewrite old evidence dates.

At a general perception block, life end or participation ending, retire pending registration and registered bodily preparedness for that affected life through the encounter owner. Mere inability to act/move and channel-specific loss after valid acquisition are not this transition. No old record silently matures across sleep. Waking/restoring perception needs **new post-wake acquired/confirmed threat support or a newly fulfilled deliberate method**; unexpired pre-sleep preparedness does not resume. Memories/CTR social preferences retain their own lifetimes. Receiving an impact while asleep does not create a backdated interval before injury wakes the body.

A current threat actually re-observed after waking may begin new registration without falsely becoming a new hostile occurrence or a second startle from a replayed source. Use A's real post-wake acquisition/confirmation and CTR's existing dedupe meanings separately.

### Preserve earned expectation across a real interaction

A real attack interaction can preserve already earned relevant anticipation when a method ends. Ending an unused method alone never creates evidence or residual coverage.

**Prepared-scope confirmation.** When actual attack evidence is acquired, the contact/observation adapter may attach PreparednessCredit only if its pre-consequence cut proves a mature, fulfilled method covered that exact threat. Copy its scope/frame and actual maturity; do not query a guard already consumed by the hit. The new warning is immediately registered **only within that copied scope**, because that anticipation already existed. Its acquiredAt remains the real new acquisition; this is no backdating and cannot reclassify the confirming impact.

An evidence-free entrance guard therefore prevents surprise on its first covered blow. That contact consumes the physical guard but supplies a real retained-prepared-approach warning for the already anticipated entrance. A second same-approach blow 0.10 seconds later is expected even though it is no longer shielded. New broader self-assault coverage still needs normal registration; an unrelated rear threat before that completes is separately evaluated. If the guard expired before the first cut, or the contact was not actually acquired, no mature confirmation credit exists.

**Own committed offense.** An actual irreversible attempt/release supplies a finite known-opponent/approach expectation through CTR's existing own-offense owner. It is not self-assault coverage, a new hostile attribution, a command proposal or mere admission during approach. If the exact offensive method was already mature at its precommit cut, that same scoped expectation registers immediately on the actual own-attempt/release acquisition. Otherwise it starts ordinary warning registration at that boundary; no fractional lead is guessed. Recovery, a failed hit or source occlusion does not erase it. An attack that never reaches commitment supplies no such retained basis.

**Narrow continuity alongside broad assault.** An acquired directed attack with an actually permitted exact source supplies two independently scoped records: broad self-assault and known-source expectation. Anonymous evidence can additionally supply its genuinely permitted approach, never a guessed source. They share the original physical cause and distinct deterministic coverageOrdinal values, not extra emotional onsets. Current exact-opponent work can postpone the narrow source warning's settling without prolonging broad all-direction readiness. A fight lasting longer than broad retention therefore does not reopen a bonus when that same opponent briefly passes behind the defender; the narrow expectation survives the method break and its own settling.

For all these records, original source/cause/acquisition and complete scope proof are retained. Broad and narrow support do not renew one another by label association. ThreatCoverage's retained-prepared-approach copies the E scope into a fixed world-frame comparison at confirmation; travel-relative scopes do not keep following the body after work ends. Where actual current work still covers a moving relative approach, capture that work separately.

### Retention and quiet settling

For each registered matching support:

- lastQualifiedAt is the last **genuinely fresh matching warning acquisition** or the last actually confirmed boundary of its ongoing directed threat. It is never now merely because a read occurred.
- retentionUntil = lastQualifiedAt + converted warningRetentionSeconds.
- Before retentionUntil, the support retains its registered scope.
- Settling can begin only at or after retentionUntil, with complete required perception, no currently confirmed matching threat and no qualifying same-scope fulfilled preparation under the rule below.
- If there is no interruption, unwaryAt = settlingFrom + converted unwarySettleSeconds. At cut.at >= unwaryAt, that support no longer qualifies.
- For a source/region/approach warning, a maintained method can postpone settling only if its current fulfilled scope contains that warning's entire supported scope, the danger family agrees, and its source association (if any) is the same permitted exact source. A merely intersecting sector is insufficient. CTR resolves this proof into the captured settling state after E's complete work capture; the pure evaluator follows no mutable support. On that method's actual end, settling starts at max(retentionUntil, method end).
- A broad self-assault warning is never prolonged by deliberate work alone: only fresh acquired matching attack evidence or genuinely continuous directed-threat confirmation renews it. An unrelated deer aim, a generic watch or an attack on the original source cannot keep all-direction readiness alive indefinitely. Those methods still supply their own actual current scope. A fresh matching threat updates its own support/retention and clears settling. A new unrelated warning cannot refresh another scope.
- For the ordinary no-further-work case, a warning last acquired at 10.00 normal seconds remains relevant until 18.00: six seconds retained, followed by two settled seconds. This is deliberately **six plus two**, not max(six elapsed, two quiet).
- Distinct independent supports are evaluated independently. Correcting one does not remove an independently supported other warning. Coalesce equivalent projection only when the complete eligibility/renewal lineage remains recoverable.

Continuous live confirmation comes from A's actual captured confirmation interval, not the hidden attack's continued existence. A release or source departure does not supply a hidden continuation. Current E work is captured independently; it cannot fabricate a fresh warning. For known-opponent work, relevance follows the actual source/approach binding; unrelated hunting, crafting or generic movement cannot delay settling of an old encounter.

There is no surprise-use counter on the victim. Repeated independent attacks can qualify before registration completes, or after a genuine unwary return. Their actual evidence then has its ordinary chance to register. Readiness is queried per incoming threat; there is no global unwary Boolean that a single narrow method can keep true for every direction. No attacker ID/weapon swap, backward step, exposure replacement, Speak shortcut, Stop/restart, refund or reconnect clears another character's evidence.

### Storage and episode identity

Add the minimal warning continuation to existing PersonalEncounter known pairs and existing unknown entries. Keep recognition episode, original attack-observation receipt and source revisions intact. For a multi-support warning, retain the exact currently relevant bases required by acquisition/correction; no historical text is needed in the hot record.

Use the original WarningKey plus observer life as the warning identity. A new return to unwary closes the live continuation; later real warning uses its own original occurrence/acquisition or post-break confirmation and new registration boundary. Do not manufacture a universal ambush episode UUID, reuse a perception episode as a combat episode, or reset old cause identities.

Known and unknown inputs share the same evaluator. Memoryless actors can retain compact native-exposure/native-response references here; their existing native danger map remains authoritative for movement selection and is not copied. Current pairFor can replace a whole pair when its recognition/life binding changes, and reconciliation can prune it. Integration must preserve/transfer still-valid warning continuations inside the same PersonalEncounters known/anonymous container before such replacement, while resetting the ordinary UI/recognition portion. Historical source-life binding never changes to a new otherLife. Source death can leave an old-life warning relevant to an already released flight; observer life ending retires it. Do not retain a stale clickable pair merely to preserve this narrow physical continuation.

Prune expired live derived fields through CTR nextAt/reconciliation. Canonical evidence and terminal attack/reaction receipts remain in their existing history/retention owners.

### Freshness without inference replay

Before admitting or renewing a warning meaning, the existing source/CTR adapter resolves its original supporting roots through claim/inference/summary/publication wrappers. Use original native acquisition/confirmation identity plus facet lineage, observer life and supported danger meaning; keep exact current source revisions separately for validity. A new hash/revision/interpretation ID alone is not a new physical root.

The first actually admitted supported danger meaning may register at its real admission time. Repeating an equivalent meaning over the same consumed roots cannot advance lastQualifiedAt or reopen an expired continuation. Rewording, coverage jitter/broadening/narrowing or a new inference wrapper does not turn those same roots fresh: changed scope may reduce/correct future eligibility, never restart its clock. A genuinely newly acquired relevant root, an actual newly heard warning, or a real post-break current confirmation can establish fresh support under its own acquisition boundary.

Keep the consumed-root disposition with existing encounter/source receipts for as long as that source can be replayed or reinterpreted. Expiring hot warning fields must not erase this disposition while leaving the source eligible to regenerate a fresh warning. If the source owner discards the source and receipt together, later unsupported recall cannot reconstruct warning authority. This is a compact lineage/receipt extension within existing owners, not an all-history scan, new global registry or a fixed forever-growing copy of warning text.

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

For the selected positive registration interval, a first wholly unanticipated impact cannot give enough elapsed anticipation to prevent surprise on a second impact at the exact same simulation time. A previously mature same-scope method can instead bridge a real confirming interaction through the explicit credit rule above; this preserves anticipation already earned before that impact. Pre-existing preparation can prevent both. Physical death, interruption and one-use guard consumption still take effect in canonical order. If an alternate world selects zero registration, a genuinely earlier acquired consequence can count for a later cut at that time, but never for its own contact.

**Atomicity inside the current body path.** commitBodyEffects currently performs death/incapacity and nested event acquisition synchronously before commitContactImpact returns. Appending D admission afterward is therefore insufficient. Extend the existing contact/body transaction to stage required body changes, the F receipt and the D outcome, then release dependent nested acquisition/publication only after that coherent result exists. This is a local transaction/publication fence, not a second combat engine or global event scheduler. Preflight all required D support before irreversible harm. Do not publish a successful hit while its required shock remains unresolved.

For a lethal contact, first fix all attack/body mechanics using the pre-contact cut; the same atomic transaction records D's terminal inapplicable/no-effect receipt against the **original struck life** because that contact ends it. It creates no active shock curve on a corpse, ghost or replacement life and no retry loop waiting for that life to return. Surviving contacts use D's ordinary admitted/replayed/inapplicable result. Existing earlier effects still retire through the ordinary life-ending owner. D/F integration must exercise this exact terminal path rather than selecting between before-death and after-death behavior at runtime.

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
| Burst or several released carriers from one action | If implemented later, exactly one designated group and its carrier ordinal zero in the entire native execution may own surprise amplification. Additional group ordinals cannot each mint another carrier-zero opportunity. Later releases cannot inherit a missed or blocked first carrier's opportunity, even when they arrive first. Each actual victim of that designated carrier still needs its own cut. A later separately admitted action is a separate execution. |
| Piercing, ricochet or persistent attack volume | Not initially supported by the inspected terminal-contact flight. Before adding one, its owner must implement explicit per-life first-outcome receipts and a complete ordered carrier/group lifetime. Bouncing, changing target labels or leaving/re-entering a volume cannot mint another slot. |
| Independent simultaneous attacks | Each has its own designated opportunity and actual victim cut. There is no once-per-ambush cap; all can be surprising before any warning has had time to register. Canonical physical ordering still controls death, guard consumption and interruption. |
| Replay, duplicate event or retry | Same execution/carrier/outcome/life tuple returns the committed receipt; no second multiplication, harm, reaction or guard consumption. A wrapper event is not a new outcome. |

The sweep/burst/piercing rows constrain future owners; they do not implement those families or silently reinterpret existing single-contact actions. A future attack descriptor cannot opt into amplification until its owner supplies the complete consumption contract. A release ordinal must be allocated by the actual native producer before release; a client-supplied label is not identity. Group continuation must survive action termination while its released carriers remain alive under the existing continuation owner.

Surprise qualification and opportunity consumption are separate. A designated expected contact still spends its opportunity. An unexpected later non-designated contact can supply a distinct eligible native startle cause without gaining another damage multiplier. D still applies its own cause deduplication and aggregation.

### Permission and lethal review

Extend combat-consent attack facts and exact review receipts to include the bound profile/policy and maximum allowed direct surprise injury. Compute the existing death-risk/confirmation predicate against that upper bound with the existing target susceptibility/scar and harm-policy facts; do not discount a possible shield or inspect private warning/preparation. The confirmation is therefore stable across hidden awareness changes. If a materially relevant attack policy/body/review fact changes before commitment, the existing stale-review path requires fresh review.

Both unphased and phased melee revalidate at their actual irreversible attempt boundary. Ranged revalidates at release and captures its immutable contact policy. After release, contact obeys that existing world/participant/collider contract without pausing the flight for a second PvP question. Intended-target permission never supplies the collateral victim's preparedness, and F does not invent a new immunity or permission exception.

Before any future multi-carrier or multi-contact family is admitted, its existing consent owner must review the aggregate maximum harm it can commit to each relevant reviewed victim, including ordinary later contacts. Three nominal-5 burst carriers with only the first amplified can total 20, not merely the first carrier's 10. Such unsupported families remain disabled until both consumption and aggregate review are defined.

A rejected/expired admission cannot warn solely because it was proposed. If the person visibly performed real preparation before later cancellation, observers can retain that real warning; cancellation does not erase already perceived conduct.

## Deterministic chronology examples

All **t** values below are normal-speed seconds for readability. Implementation stores their converted SimTime values; with the present clock t = 1.20 means 72 simulation seconds. The selected lead is 0.20 normal seconds, retention six and settling two. Every cut is an actual immutable acquired-membership boundary, not a database filter for dates.

| Case | Actual chronology and permitted cut | Required result |
| --- | --- | --- |
| T01 — visible wind-up | Real visible wind-up acquired at 1.00; registration uninterrupted; melee attempt/contact cut at 1.30 includes that fact. | Expected. A failed evasion still permits ordinary damage. |
| T02 — warning just too late | Same acquisition at 1.00; contact cut at 1.19. | Surprising, because registration is incomplete. |
| T03 — exact ready boundary | Same acquisition; native registration deadline is settled before the cut at 1.20. | Expected. A cut at 1.199 remains surprising; no frame-size rounding chooses the result. |
| T04 — unseen archer, seen arrow | Release 1.00 unseen; genuine flight acquisition 1.10; contact 1.35. | Expected without identifying/localizing the archer. Insufficient physical travel time to evade is irrelevant to qualification. |
| T05 — very fast expected arrow | A relevant warning was registered before release at 1.00; contact 1.03. | Expected even though this flight alone could not provide registration. |
| T06 — same-impact evidence | Contact cut 2.00 has no warning; impact/sound/body event is acquired only after that cut at 2.00. | That contact is surprising. Its newly acquired warning can mature at 2.20, never retroactively at 2.00. |
| T07 — measured versus acquired | Physical cue occurred/measured at 0.50, but observer actually acquires it at 1.10; contact 1.20. | Surprising. Registration starts at acquisition, not measurement. |
| T08 — delayed interpretation | Suspicious movement acquired at 0.50; an actually accepted danger interpretation enters at 1.10; contact 1.20. | Interpretation has insufficient lead. AI receipt or later evidence cannot backdate preparedness to 0.50. |
| T09 — late confirmation | Continuous source measured from 1.00; a confirmation available only at 1.40 spans that interval. Contact cut was 1.20. | The 1.40 confirmation is excluded from the earlier cut, even if its measured interval covers 1.20. |
| T10 — ordered events at one timestamp | Cut K at 3.00 contains occurrence A acquired before K; occurrence B has an earlier event timestamp/order but was not yet acquired; contact C produces nested evidence after K. | Only A belongs. Awareness.sequence, event timestamps or the enclosing event's order cannot add B/C to K. |
| T11 — guarded doorway | Actual shield method starts 1.00; native readyAt 1.25; proposed SA-D03 preserves the method start; contact 1.26 approaches inside current coverage. | Expected after max(1.20, 1.25). Hidden attacker identity is unnecessary. If contact occurs at 1.24 and no other warning exists, preparation is insufficient. |
| T12 — finite watch | Fulfilled anticipation of the entrance begins 1.00, lead completes 1.20, work ends 3.00. No warning was ever acquired. | Covered contact 2.99 is expected. At exactly 3.00 the ended watch contributes nothing. Looking elsewhere earlier does not bank another sector. |
| T13 — changed active focus | Watch A fulfilled from 1.00; at 2.00 a real focus change breaks it and new focus B begins. Contact from A at 2.10, with no warning. | Old A coverage is gone and B has not earned lead. If existing B/E semantics permit a continuous compatible refinement, they must prove it, not assume it from label similarity. |
| T14 — retained attack | Last fresh directed warning 10.00, registration complete 10.20, no more threat or preparation. | Retained until 16.00, then settling until 18.00. Cut 17.99 expected; cut exactly 18.00 unwary. |
| T15 — scoped preparation interrupts settling | A scoped entrance warning last qualified at 10.00; a maintained method covering that entire same entrance scope exists 17.00–19.00. | Settling restarts at 19.00 and ends 21.00. Broad self-assault warning is not extended by work; unrelated hunting or a merely overlapping sector cannot delay it. |
| T16 — new matching warning | T14, plus a genuinely fresh matching attack warning at 17.50 while expectation remains registered. | Renewal has no artificial registration gap; lastQualifiedAt becomes 17.50, final quiet reset 25.50 if nothing else happens. Original source dates remain unchanged. |
| T17 — warning after full expiry | T14, new warning acquired 18.10; contact 18.20. | Earlier continuation has ended; new registration is not ready until 18.30. Contact is surprising absent another method. |
| T18 — simultaneous attackers | Two independent actual contacts at 5.00, ordered by native owners, with no prior warning/preparation. | Both may qualify; first impact has zero elapsed time to prepare for the second. Death/one-use guard/interruption still resolve in order. |
| T19 — staggered attackers | First surprising contact 5.00; felt evidence acquired afterward; second contact 5.10, third 5.21. Body remains eligible. | Second can also surprise. Third is expected from registered self-assault evidence, even from an unknown opposite direction. |
| T20 — rest and wake | Registered warning before rest; general perception becomes blocked at 6.00. An unexpected contact at 7.00 wakes the body through ordinary injury. | Pre-rest continuation is retired. Waking contact is surprising; post-wake actual acquisition can begin registration, no earlier than 7.00. |
| T21 — approach before actual strike work | Strike admitted 0.00; approach ends and actual wind-up begins 2.00. The method is fulfilled but its 0.20 lead is not earned until 2.20. | Admission time cannot earn the lead. A counterattack cut at 2.10 needs other valid preparedness. Current guard admission itself has no approach phase. |
| T22 — release before loss | Shot released 1.00 under policy P; shooter dies/changes control at 1.10; actual collider contact 1.50. | Continue flight under P and its saved source life/origin. Capture actual victim at 1.50, without re-reading current shooter stats or intended-target readiness. |
| T23 — speed and pause | Cue acquired at normal-equivalent 1.00; pause at 1.10 for ten wall minutes; resume at 8× until 1.20. | Pause adds no lead. Registration completes at the same SimTime; it takes less active wall time at 8×. Save/reload preserves it. |
| T24 — work not complete | Contact boundary needs a due acquisition, preparation capture or D resolution that returns incomplete. | Do not commit a guessed ordinary/2× hit. Hold the required native continuation at its coherent prefix and resume with the same cut/identity rules. |
| T25 — guard consumed, expectation retained | Mature entrance guard; covered contact and its acquired evidence at 5.00 consume guard; second same-approach contact 5.10. | Both expected. Only first receives physical guard reduction. New opposite-direction danger before broad registration at 5.20 needs its own basis. |
| T26 — immediate counterattack | Mature strike against A commits 5.00, own result acquired and recovery begins; A counters 5.10. | Finite own-offense expectation makes the counter expected; recovery may prevent defense. Unrelated B can still surprise without another warning. |
| T27 — prolonged fight then brief occlusion | A's directed attack acquired 0.00 establishes broad and permitted exact-source support; mature work toward A continues through 10.00, then breaks as A passes behind; A contacts 10.10. | Broad support may have expired at 8.00; narrow A support's settling starts at 10.00 and ends 12.00. Same A is still expected without current sight. |
| T28 — repeated inference from one rustle | First current danger meaning admitted 1.00 from root R; its continuation ends 9.00. A new equivalent inference over R is admitted 10.00. | No renewed/reopened warning. New wrapper/time/region wording is not fresh physical support; a real new cue or deliberate current method can still matter. |

A cue acquired at exactly the contact timestamp can belong to the cut only if its real native acquisition is earlier in the canonical order. With the selected positive lead, new receipt at that timestamp still supplies no matured warning. A genuinely pre-existing registered scope can renew at that boundary. Paused UI/provider work cannot create elapsed simulated time, and delayed optional cognition does not postpone native registration.

## Save, invalidation and correction

### Current-format durable state

Extend existing owners together, preserving their save graph:

| Existing owner | Authoritative extension / restore rule |
| --- | --- |
| PersonalEncounters known pair or anonymous entry | WarningKey, exact observer/source life where permitted, coverage, original acquisition boundary/time, current supporting revisions, registration phase/start/ready, lastQualifiedAt, continuous confirmation boundary, retention/settling, policy pin and admitted clock/conversion durations, mature scoped credit and consumed-root disposition. No parallel threat collection. |
| Existing active action and its preparation owner | Actual current-method start/fulfillment/break support; native identity and accepted orientation/plan revision. Persist or reconstruct only from committed authoritative work, never from a guessed action age. SA-D03 is required where the current port omits the start. |
| ProjectileFlight | Existing release/collider permissions, source life and controller-at-release, attack policy pin, committedOrigin, group/carrier and native outcome/consumption continuation. Keep trajectory, launchedAt/advancedAt, remaining range and all existing pins. |
| Existing attack/contact outcome | Frozen decision, actual arithmetic, exact victim life, cause/outcome ordinal and spent-slot receipt. Terminal publication is derived from this committed result rather than another application. |
| D status/contribution/reaction receipt owner | Its selected body effect and exact onset/no-effect receipt. F stores no duplicate fear value or timer. |
| Existing due-work indexes | Rebuild nearest deadlines/candidate indexes from valid authoritative records; no wall-clock deadline or serialized client readiness cache. |

The save boundary contains either the pre-contact coherent state or the committed contact/effects/receipts and required evidence continuation. It cannot contain health damage without the opportunity receipt or a spent opportunity without its real outcome. A crash/retry cannot move a contact from surprising to expected by treating its own saved event as earlier warning.

A partially advanced flight restores at its saved position/advancedAt and retains its **release origin**, not the restored current position as a replacement origin. It resumes the original carrier; no fresh launch or new action ID is minted. A saved registering warning has exactly its remaining simulated time; a saved ready/settling warning keeps its original boundaries.

No old save reader, version migration, dual record shape, compatibility alias or fallback default is selected. Current writers, readers, validators, native reconciliation and projections change together, as required by the repository contract.

### Invalidation matrix

| Change | Required handling |
| --- | --- |
| Observer physical life ends/is replaced | Retire its bodily warning, pending registration and active preparation. Do not transfer receipts or readiness to ghost, corpse, respawn or another body. Historical personal knowledge has its existing separate owner. |
| Source physical life ends | Existing physical flight remains bound to the original source life. Its known-source warning can match that already released attack while otherwise eligible; it cannot match a later attack from a replacement life. Self-assault/region support retains its independent finite terms. |
| Same-life controller changes | Preserve valid body consequences and registered personal warning; invalidate controller-owned queued choices/work exactly as those owners require. No bonus reset by disconnect or possession switch, and no inherited target knowledge from a different observer life. |
| General perception becomes blocked/rest begins | Retire pending and registered bodily preparedness and invalidate method fulfillment where relevant; no dormant resurrection on wake. Re-acquired current threat may register anew without a duplicate hostility event. |
| Only motion/actions/cognition become unavailable | Do not erase valid registered information. E must separately report whether its physical method still fulfills. No action capability is a proxy for consciousness. |
| Particular sense is lost after acquisition | That channel produces no further cue while blocked. Already registered personally acquired warning continues if the general registration predicate remains valid; a dependent active method can fail its own requirements. |
| Stop/expiry/work replacement/focus change | E's current coverage ends or changes at its actual break. CTR warning remains until its own terms end. Actual new method must earn its own applicable lead. |
| Equipment/profile/body geometry changes | Existing action/guard/aim owner revalidates exact constraints. Recompute current E fulfillment; do not mutate a released flight or historical warning's geometry. |
| Evidence correction/source revocation/forgetting | Existing owner invalidates or reduces live derived warning support prospectively. Preserve independently valid support. Never reverse an already committed injury or bodily onset merely because its explanatory evidence was later corrected. |
| Source reinterpreted/recognized later | A later permitted association may improve future personal knowledge; it cannot rewrite an earlier cut, retroactively identify an old attacker or extend warning duration without fresh support. |
| World definition/policy changes | Precommit work revalidates its exact pins. Already committed flight retains release policy. Warning continuation uses its bound acquisition policy; newly accepted work uses the installed current policy. Unsupported/missing pinned definitions return incomplete/invalid through the owner; no silent substitution. |
| Duplicate/reordered transport/reconnect | Native acquisition and committed outcome identity remain authoritative. Re-publication cannot start registration anew, refresh retention, consume a second guard or add a second reaction. |

Policy editing during play is not a new feature of this module. The pin rules define deterministic continuation if an existing supported authoring/correction route changes a definition. A record or policy that is malformed is rejected by current validation; do not interpret invalid data as harmless absence.

## Work, latency and performance

Surprise is native and deterministic. It never awaits a model to decide whether an acquired directed attack matters. Optional interpretations can create later scoped support only after actual admission. API/provider delay therefore cannot consume or supply simulated registration time by itself.

All required acquisition, current preparation and D mechanics must be complete at the contact boundary. Use existing coherent-prefix work/hold accounting, including a stable continuation reference and source/body/policy revisions. A stale resumed result is rejected and refreshed at the proper boundary; it cannot be patched into an older cut. If the action became invalid, follow its existing cancellation/revalidation outcome rather than completing stale harm.

Evaluate only the actual victim's relevant existing encounter warning entries and complete active-work set, plus native candidate evidence already required by A/B/C. Do not enumerate all characters, query hidden attackers, replay full memory, scan all projectiles for each victim or add a second SQL/indexed threat authority. Use existing pair/anonymous retention and nextAt to prune expired derived fields, while retaining source owners' required causal receipts.

There is no new arbitrary top-N warning truncation or hard-coded combat capacity in this design. If existing admitted work cannot finish, report/hold the required continuation; do not silently drop the oldest or least convenient warning. [SUR-L05](../limits/preparedness-and-surprise.md#sur-l05--growing-work-retention-and-overload) owns the tradeoff. Bound active work through existing admission/retention and complete indexes, not by false perception.

SUR08/SUR09 must record warmed and cold-path costs for one victim, many independent pairs, many attackers against one victim, crowded shared contacts, anonymous warnings, repeated correction, long-running retention and save/restore. Measure candidate warnings visited, active methods captured, source validation work, scheduled deadlines, serialized bytes and allocation/time distributions through the actual contact path. Verify no new random draw and no unbounded retained expired support. No benchmark, measured capacity, provider run or acceptance result is claimed by these paper designs.

## Prompt 7 interface

Prompt 7 owns ordinary controls and presentation. F supplies permitted semantics; it does not prescribe a new key binding, HUD meter, alert color or client-side combat calculation.

~~~ts
type OwnPreparationFeedback =
  | Readonly<{
      state: 'preparing' | 'maintaining';
      method: ExistingPermittedActionDescription;
      scope: PermittedPreparationScope;
      expectedDanger: ExistingPermittedDangerDescription;
      acceptedAt: SimTime;
      evaluatedThrough: SimTime;
      timing: ExistingPermittedActionTiming;
    }>
  | Readonly<{
      state: 'ended';
      method: ExistingPermittedActionDescription;
      endedAt: SimTime;
      reason: ExistingPermittedWorkEndReason;
    }>
  | Readonly<{
      state: 'not-enough-information';
      reason: ExistingPermittedOwnWorkReason;
    }>;

type OwnWarningFeedback = Readonly<{
  warning: ExistingObserverEvidenceReference;
  meaning: ExistingPermittedWarningDescription;
  scope: PermittedWarningLocation;
  acquiredAt: SimTime;
  knowledge: 'noticed' | 'registered';
}>;

type PermittedSurpriseAftermath = Readonly<{
  outcome: ExistingPermittedOutcomeReference;
  caughtOffGuard: true;
  occurredAt: SimTime;
  contact: ExistingPermittedContactDescription;
  injury: ExistingPermittedBodyOutcome | null;
  bodilyReaction: ExistingPermittedOwnReaction | null;
}>;
~~~

These are semantic DTO requirements composed from current projection families, not instructions to create an alternative protocol authority. No raw ActorLifeRef, EvidenceRef, WarningKey, cause tuple, internal definition pin, action target binding or hidden vector is directly serialized. G must map references through A's permitted subject/evidence and existing protocol identity owners.

- **Preparing** means the accepted method is genuinely underway but its physical/readiness/lead requirements are not complete. **Maintaining** means its actual current covered method meets those requirements; it promises neither a hit block nor protection outside that scope.
- **Ended** reports actual Stop, expiry, interruption or loss of fulfillment with only personally permitted reasons. A hidden attacker outside the scope is not a reason string.
- **Not enough information** means the client cannot make the requested present assertion from its permitted complete projection. Required native work being incomplete must not be displayed as “unprepared” or “safe.”
- **Noticed / registered** describes the controlled character's own actually received warning and minimal bodily anticipation. It does not identify a concealed source or promise successful defense. G chooses accessible wording; it must not display old locations as live.
- **Caught off guard** is available only after an actual personally available contact/outcome for that character. A privately classified melee miss is not shown to an unaware victim. Another observer sees only allowed physical evidence, not this private Boolean.
- A player may be told their own actual injury/body reaction, but no enemy-readiness meter, guaranteed-2× preview, private warning countdown, automatic camera turn or hidden attacker marker is derived from F. Existing own action timing may show a guard/watch's progress; it is not a remote surprise forecast.
- The attacker's permitted aftermath can report their allowed actual contact/injury information. Private victim surprise/reason is withheld unless an existing explicit disclosure rule independently permits it. Lethal confirmation uses maximum authorized risk and never changes solely with hidden readiness.
- Full view, patch, history, reconnect, tooltip, target discovery, combat log, audio and accessibility paths must follow the same boundary. Current preparation is cleared/reconciled on actual work/life/control change; saved history keeps its original time and permitted precision.

Required UX paper cases: an entrance watch still preparing, the ready guarded entrance with unseen assailant, warning registered but arrow unavoidable, interrupted/expired guard with retained expectation, own unexpected zero-injury shield contact, a completely unperceived miss, ambiguous sound with no threat assertion, stale reconnect data and creator-to-player transition. Prompt 7 must show usefulness and limitation without teaching a hidden readiness score.

## Acceptance scenarios

These are **specifications for future executable and gameplay qualification**, not authored/running tests. Each case must be exercised through its real existing owner, not only a helper that mirrors this prose. All supported families must preserve actual native order, exact lives, source pins, normal-clock conversion and complete evidence.

### Information, preparation and defense

| ID | Scenario | Required assertion |
| --- | --- | --- |
| SUR-T01 | No relevant warning/preparation; real direct hit | Surprised; one eligible 2× raw contact application; ordinary mitigation/body result and eligible D cause. |
| SUR-T02 | Rear strike during registered anticipated fight | No new surprise solely from angle/current sight loss. Directional shield can still fail. |
| SUR-T03 | Known friendly person attacks without prior readable cue | Familiarity does not prevent surprise. Do not require an enemy label or combat initiation flag. |
| SUR-T04 | Stranger visibly winds up with sufficient acquired lead | Expected despite unfamiliar identity; preserve uncertainty about motive/name. |
| SUR-T05 | Guarded unknown doorway | Matching maintained preparation prevents surprise without a source association. Uncovered height/direction/path does not inherit protection. |
| SUR-T06 | Guard only proposed/preparing, or another method still approaching | No completed preparation until actual method/ready/lead conditions hold. Other registered warning can independently suffice. |
| SUR-T07 | Guard becomes ready then expires/consumes | Exact half-open timing and one-use physical guard hold; registered warning can outlast it without another shield reduction. |
| SUR-T08 | Turn head while shield faces elsewhere | Permitted vision can change; shield geometry does not rotate with head/camera. |
| SUR-T09 | Footsteps remain subthreshold | No warning, identity or startle fabricated from raw progress. |
| SUR-T10 | Weak cue crosses actual acquisition threshold | Admit only A's achieved fact; no fabricated hostility. Later scoped danger interpretation or chosen anticipation can matter. |
| SUR-T11 | Understood current scoped false alarm | Actual registration/preparation can prevent surprise within its scope without declaring the claim true. |
| SUR-T12 | Unintelligible/partial warning | Unsupported meaning cannot count. A fully supported admitted meaning from heard fragments can count; F does not parse or inspect private full speech. |
| SUR-T13 | General anxiety, old grudge or old reputation | No unbounded all-direction preparedness. D can affect its own mechanical parameters separately. |
| SUR-T14 | Cue early enough to register, too late to dodge | Expected ordinary hit; inadequate movement does not become informational surprise. |
| SUR-T15 | Cue received less than registration lead before contact | Surprising even if visually obvious at the final instant. |
| SUR-T16 | Exact lead completion, expiry and work break | Match T03/T11/T12/T21 without tick-size-dependent off-by-one or guessed method-start time. |
| SUR-T17 | Ordinary glance versus accepted anticipation | Observation alone grants no declared threat coverage. A genuinely acquired warning can still register. |
| SUR-T18 | Cycle watch through many directions | Only current active coverage qualifies; past sectors never accumulate. Registered real warning has its independent finite scope. |
| SUR-T19 | Immobilized/occupied/cognition-blocked but aware | Native registration can complete. Physical defense/method fulfillment follows its actual constraints. |
| SUR-T20 | Rest with general perception block | Pending and registered bodily continuation retire; no sound-wake or old-warning auto-resume; waking contact cannot warn itself. |

### Projectile and contact arithmetic

| ID | Scenario | Required assertion |
| --- | --- | --- |
| SUR-T21 | Flight acquired, archer/release unseen | Actual supported incoming-flight cue can register; no source identity or hidden intended-target inference. |
| SUR-T22 | Archer seen but actual attack preparation hidden | Mere presence/weapon/name does not count as a readable attack cue. |
| SUR-T23 | Early release sound versus nonexistent whoosh | Only an implemented authored cue actually acquired can warn. No automatic generic flight sound or sound-propagation delay is invented. |
| SUR-T24 | Prepared intended target, unwary collateral victim | Actual collider's cut governs. Intended readiness is neither copied nor shared. |
| SUR-T25 | Unwary intended target, prepared interceptor | Actual interceptor can avoid multiplier using their own work/evidence and real shield. No phantom contact shock on the protected person. |
| SUR-T26 | Shooter dies/leaves/transfers control in flight | Release pins/source life/trajectory/contact policy persist; no current shooter re-read or second confirmation. |
| SUR-T27 | Source origin versus advancing projectile position | Origin-region warning matches immutable release origin; approach warning uses actually traversed supported path. Save/reload preserves the difference. |
| SUR-T28 | First designated melee miss then repeated contact callback | Miss spends opportunity but deals no damage; replay cannot produce a later amplified hit or shock. |
| SUR-T29 | Zero nominal injury / full body mitigation / health cap | Slot spending, raw amplified amount, applied flag and final body health loss remain distinct and consistent. |
| SUR-T30 | Shielded qualifying contact | Multiply raw eligible component before existing shield reduction; shield consumption/recovery unchanged. Zero health loss can still have an unexpected-contact cause. |
| SUR-T31 | Multi-component contact | Eligible bundle amplified once; no total-plus-component duplication or amplification of later poison/burning/bleeding. |
| SUR-T32 | Future sweep/burst/piercing owner | Family stays unenabled until complete stable group/carrier/per-life receipts and aggregate permission review exist. Later carrier/group/re-entry cannot bank/mint another opportunity. |
| SUR-T33 | Independent simultaneous volley | Independent qualifying attacks can each amplify before any warning matures; ordinary deterministic collider/death/guard ordering remains. |
| SUR-T34 | Terrain stop, range expiry or wholly unseen miss | No fictitious damage, contact startle, victim warning or enemy identity. Actual audible/visible cue follows A/C separately. |

### Continuity, emotion and agency

| ID | Scenario | Required assertion |
| --- | --- | --- |
| SUR-T35 | Changing attackers after self-assault registration | Finite ordinary-assault expectation covers ordinary third-party intervention without naming/targeting them. |
| SUR-T36 | Betrayal while already braced for ordinary assault | No guaranteed fresh physical multiplier from changing allegiance; later emotional/social interpretation remains independent. |
| SUR-T37 | Hunter aiming at quarry, ally attacks | Own scoped offensive work does not grant universal preparedness. Actual relevant warning/preparation alone can prevent surprise. |
| SUR-T38 | Brief hide/return, camera turn, weapon swap, Speak/Stop | None erases registered warning; stopping real preparation removes only its current coverage. |
| SUR-T39 | Genuine unwary return | Six plus two expire exactly; only fresh evidence/continuous confirmation renews broad self-assault, while full same-scope preparation may postpone scoped settling. New warning then needs a fresh lead. |
| SUR-T40 | Matching new warning / unrelated new warning | First can renew registered matching scope; second cannot refresh other evidence or backdate acquisition. |
| SUR-T41 | Correction of one of several supports | Only dependent future support invalidates; independent warning still works; committed injury/startle remains. |
| SUR-T42 | Current warning replayed as memory/reflection/event wrapper | No new registration, retention renewal, hostile occurrence or bodily onset. |
| SUR-T43 | Unexpected contact plus earlier abrupt cue | D handles real distinct causes and maximum aggregation. F adds no fear factor or same-impact feedback. |
| SUR-T44 | Contact shock, same-timestamp later attack | It cannot alter its own completed mechanics or an earlier released shot/evasion; it may affect a genuinely later appropriate sampling boundary. |
| SUR-T45 | Generalized fear with ranged danger heuristic | Selected conditionAdjustment none prevents accidental double penalty. Walking/running speed remains unchanged by F/D fear. |
| SUR-T46 | Fatal surprising contact | Original life receives terminal no-effect D receipt, no active shock on dead/new body; harm and outcome remain coherent without retries. |
| SUR-T47 | Native memoryless animal | Same fair warning/cut rule, compact existing CTR/native references, no AI/cognition/memory prerequisite or second danger map. |
| SUR-T48 | Autonomous human accepts/refuses warning response | Registration remains native; choices remain independent. No forced guard/flee/attack or interpreted emotion outside the owning accepted producer. |
| SUR-T49 | Deliberate noisy diversion | Actual investigation may open an escape route; registered scoped danger may remove surprise within that scope. No forced facing or erased warning. |
| SUR-T50 | Voluntary watch handoff | Incoming watcher must actually accept/fulfill/earn lead. Outgoing work ends on its own boundary; a promise does not transfer readiness to another body. |

### Persistence, fairness and adversarial work

| ID | Scenario | Required assertion |
| --- | --- | --- |
| SUR-T51 | 1×/3×/8×, pause and different native step subdivisions | Equivalent simulated chronology yields identical qualification, slot use, harm and effect timing. No wall-clock/provider latency substitution. |
| SUR-T52 | Save during registration/settling/flight | Restore original deadlines, release origin, pins and continuation; no extra warning time, fresh launch or slot reset. |
| SUR-T53 | Save/retry around body mutation and nested events | Recover exactly pre-contact or committed coherent state; never damage twice or let saved impact warn itself. |
| SUR-T54 | Incomplete A/E/D or stale resumed work | Hold/reject through existing native work path; no missing-evidence-as-empty, zero fear or automatic 2×/1× fallback. |
| SUR-T55 | Observer/body/source/controller identity substitution | Exact life and owner revisions reject cross-life reuse. Same-life control transfer preserves physical history without inheriting another observer's private state. |
| SUR-T56 | Policy/equipment/body pins change before commitment | Existing revalidation/review invalidates stale work. After release, flight remains bound to valid committed policy. |
| SUR-T57 | Forged multiplier/preparedness/claim/target IDs from client/model | Only trusted native producers can create bindings and warning/preparation outcomes; invalid input is not silently normalized. |
| SUR-T58 | Same source/different wrappers or delimiter-collision keys | Structured exact tuples deduplicate true repeats while preserving distinct real contacts. |
| SUR-T59 | PvP lethal confirmation toggled against hidden readiness | Prompt/risk basis remains the same maximum authorized harm; no awareness oracle, forgotten 2× bound or contact-time re-prompt. |
| SUR-T60 | Many attackers/anonymous warnings/long-running corrections | Complete local traversal and bounded existing retention; no hidden global scan or silent warning truncation. Measure real hot path, not only helper complexity. |
| SUR-T61 | Full/patch/history/reconnect/tooltip/audio/creator transition | Private victim readiness and hidden source geometry never leak through any projection or stale cache. |
| SUR-T62 | World omits F or changes supported senses/coefficients | Clean omission gives ordinary combat; installed invalid/incomplete policy does not masquerade as omission. Alternate-body warning remains actual. |
| SUR-T63 | Consent refusal/cancel before attack | No invented attack consequence. Actual previously observed physical preparation remains valid evidence of what occurred. |
| SUR-T64 | Spatial uncertainty / vertical separation / cone apex | Original frame/uncertainty retained; no infinite-ray/wall shortcut or all-direction cone match at the victim's contact point. |
| SUR-T65 | Guard consumed by an expected contact | Acquired confirming attack carries already mature scoped anticipation; the next covered attack is expected despite no remaining shield. Unused guard expiry creates no such support. |
| SUR-T66 | Own attack enters recovery before a counter | Actual mature committed offense preserves finite exact-opponent expectation; unrelated betrayal remains separately surprising. Proposal/cancel grants nothing. |
| SUR-T67 | Long fight, expired broad warning, brief rear/occlusion | Narrow exact-source continuation survives through its specified settling; no fresh bonus solely from current sight loss. Unrelated hunting cannot sustain it. |
| SUR-T68 | Repeated old-root inference or destructive pair replacement | New inference IDs cannot refresh old roots; pair/re-exposure replacement preserves valid same-owner warning without rebinding old source life or exposing a stale target. |

### Playability gates beyond correctness

SUR09 must observe an uncoached player using a warning, finite entrance watch, defensive handoff/interception, failed ambush-to-escape and a native-animal hunt with an ordinary useful outcome. Compare preparation's actual attention cost with the ordinary route; a useful plan is allowed to succeed decisively. Record whether players understand “expected but unavoidable” and “readiness ended,” whether repeated waiting/retargeting is burdensome, and whether recovery permits a meaningful escape.

Run **The toll tower at dawn**, **The companion who changes sides**, **The quarry that learns**, **The wolf at the school gate**, and **The household after the victory** from the repertoire as composing scenarios where their prerequisites exist. Include a refused or missed warning, an uncovered path, and an encounter that ends peacefully or by leaving with the objective. Mechanical correctness alone does not prove that 2× or the initial lead/retention is fun or fair. Tuning changes go through the authored policy/limits owner and rerun the affected boundary/scenario acceptance.

## Cross-project integration requirements

### Incoming-flight producer

B/A must install a narrow **observed incoming-projectile detail** inside their existing observed-detail/perceived-feature families. This is a required F implementation dependency, not a claim that generic location facts or the current code already supply it. It uses B's existing coarse-motion quality/precision rules; F adds no second perception threshold.

The native physical adapter needs two actually received positions at ordered measurement times under the same permitted exposure, or B's equivalent certified observed-motion interval. Preserve both location uncertainty volumes, original measurement/acquisition boundaries and the observer's own actual body poses. Require:

1. Valid received continuity without a gap, teleport or hidden canonical-identity join.
2. Conservative closing: the greatest possible current separation under the received uncertainty is smaller than the least possible previous separation.
3. At least one positive forward continuation of the **received relative-displacement cone** intersects the observer's current own-body envelope.

This establishes a personally supported **possible incoming threat**, not a prediction that a collision will actually occur. Use only received displacement and existing spatial geometry; do not read hidden intendedTarget, private canonical velocity, future path/turns or the later collider. If uncertainty cannot establish closing/continuity, produce no automatic incoming-projectile warning; an actually chosen scoped E precaution can still use the ambiguous cue. Existing spatial comparisons own tolerances. Do not add an arbitrary confidence percentage, reaction distance or F-specific motion sampling cadence.

A acquires the resulting typed detail with its real supporting FactKeys, original uncertainty and acquisition boundary. The warning's registration begins only when that complete permitted detail has actually been acquired. Fast/briefly seen flight may therefore be too late to prevent surprise. An arrow that later misses or strikes a wall can still have been a reasonable perceived threat; it does not create false hostility attribution.

Current ranged projectilePassage already stops at real visible pre-contact passage for eligible native animals and uses nearPassObservedLives for duplicate consumption. Reuse that producer/ordinal where it supplies the actual permitted support, but that map is not an A evidence cut or a human warning fact. Current event velocity components are not automatically fine observer knowledge. Earlier general human/animal flight warning requires this B/A adapter and complete integration.

### Ordinary spoken warning producer

A/SPK must demonstrate a real ordinary warning journey: one character speaks a supported current scoped warning, another actually hears and understands its complete relevant meaning, A admits the claim/current supported interpretation, and F starts registration at that actual boundary. The semantic producer must lawfully supply current meaning; F cannot turn raw relative words or “Look out!” into an invented exact interval.

An unqualified intelligible utterance is not promised automatic readiness. Unknown words, an unresolved referent needed for this warning (for example ambiguous “behind you”), an incomplete fragment or unsupported time/scope remain inadequate. A complete scoped overheard warning can qualify without identifying its speaker or addressee. The same person can still choose explicit E preparation. This dependency is part of the selected user-facing warning feature and must be closed before claiming that ordinary warnings work; a hand-built native warning record alone is insufficient acceptance.

### Other required handoffs

| Dependency | Required agreement / implementation gate |
| --- | --- |
| A and SC02 | Preserve exact source family revisions, acquisition boundary and immutable values. Resolve proposed SA-D02 before joint current-format cutover; no digest-to-number coercion. |
| B/C | Actual visible preparation/flight detail, received pose and real authored sound; no hidden action metadata, speculative travel sound or current-position overwrite of remembered geometry. |
| E and SC10 | Adopt or explicitly resolve SA-D03's missing current-method-start port; preserve current maintaining/coverage, exact break times and lead semantics. Full six-family capture remains complete. |
| CTR | Extend existing known/anonymous encounter records, not personalEncounter's sight-gated view. Keep recognition episode, contextual grace, native animal danger selection and surprise continuation distinct. |
| D and SC12 | Complete mechanics at existing sampling boundaries; exact unexpected-contact causes and no-effect receipts; selected conditionAdjustment none; local contact transaction fences nested acquisition, including fatal contact. |
| Current combat | Both melee paths, actual projectile collider, consent upper bound, one designated opportunity, immutable release origin, existing mitigation and recovery. Unsupported future contact families remain gated. |
| Save/work | Current authoritative readers/writers/validators and continuation indexes change together. Required incomplete work holds before harm. No compatibility schema or second scheduler. |
| G / Prompt 7 | Own method/received-warning/allowed aftermath semantics only, all full/patch/history surfaces and accessibility/reconnect. No private readiness oracle. |
| Final integration SAD-I | Reconcile actual A–G paths, proposed amendments, owner schemas and central repertoire pointers in one combined review. This branch studies dependencies without merging them. |

## Implementation decomposition and completion boundary

The [focused tracker](../maintainers/preparedness-and-surprise.md) owns checkboxes, acceptance and current status. This allocation keeps one implementation owner per responsibility:

| Task | Existing owners / concrete deliverable | Dependencies |
| --- | --- | --- |
| SUR01 — Authored policy and exact typed bindings | Base combat/encounter world policy; domain policy/ref validation; accepted danger mappings, one outcome rule and maximum harm facts. Resolve SA-D02/03 at shared integration. | SAD-I and exact A/E ports |
| SUR02 — Warning registration and continuity | combat-encounters plus A/native exposure adapters; compact known/anonymous support, exact acquisition, four deadlines, scoped hysteresis and correction. | SUR01; SAI-A; B/A flight and A/SPK warning producers |
| SUR03 — Preparation capture | E existing action/guard/strike/aim/evasion/native-alert adapters, method starts, fulfillment, coverage and pause/save; no second preparation store. | SUR01; SAI-E; relevant B/C |
| SUR04 — Attack/contact and permission | combat-consent, both kernel melee paths, strikes, ranged, contact-defense, living; bound attack, actual victim cut, receipt, arithmetic and publication fence. | SUR01–03; complete D interfaces |
| SUR05 — Native emotion handoff | D status/contribution/effective-parameter owners; exact cause/no-effect receipt, fatal case, no same-impact feedback/double fear. | SUR04 with SAI-D |
| SUR06 — Persistence and deterministic continuation | Existing world record/serialization/validation, temporal boundaries, encounters/actions/flights/outcomes; original pins/deadlines and coherent retry. | SUR02–05 |
| SUR07 — Permitted player feedback | Server view/protocol/client existing action/history feedback, G DTO mapping, disclosure/accessibility/reconnect. | SUR02–06; SAD-G/SAI-G |
| SUR08 — Integration and adversarial correctness | Existing domain/server/storage/native progression suites; source-world omission/alternate-body cases; SUR-T01–68 and T01–24 at real callers; complete work measurements. | SUR01–07; required SA integration |
| SUR09 — Gameplay, PvP and performance qualification | Existing independent CTR character/player/browser gates; actual warnings, watch, interception, hunt, betrayal/escape, no-provider animals; policy tuning evidence. | SUR08 plus complete composing prerequisites |

Implement useful complete paths, not disconnected state records. One natural strike and one ranged flight must each exercise real acquisition → registration/preparation → actual victim cut → permissions → shared contact → D → save/view before broader acceptance is claimed. Current source may advance after the frozen baseline; recheck affected owners before coding without redesigning settled rules silently.

No unresolved F product choice remains. **SA-D01** is the separate controlled-character psychological producer decision. **SA-D02** is A's proposed exact revision correction; **SA-D03** is F's proposed E method-start extension. Both technical proposals require shared adoption/disposition before their dependent implementation, while frozen contracts remain unchanged on this branch. Initial tuning and usefulness remain unqualified delivery work, not hidden design questions.

## Maintained records

- Behavior, player journeys and repertoire findings: [Feature specification](preparedness-and-surprise-feature-spec.md).
- Implementation/qualification tasks: [SUR01–SUR09](../maintainers/preparedness-and-surprise.md).
- Authored values and policy: [Base combat](../worlds/base/combat.md#preparedness-policy).
- Limits and adjustment tradeoffs: [Preparedness inventory](../limits/preparedness-and-surprise.md).
- Cross-project integration: [SA/SAD-F/SAI-F](../maintainers/stealth-awareness.md), [CTR](../maintainers/combat-and-threat-responses.md).
- Explicit unresolved decisions/amendments: [SA-D01](../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters), [SA-D02](../../archive/05-project/open-decisions.md#sa-d02--evidence-source-revision-representation), [SA-D03](../../archive/05-project/open-decisions.md#sa-d03--preparation-lead-after-native-phase-transition).
