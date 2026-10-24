# Preparedness and surprise — technical design

| Status      | Current progress                                                                                                                   | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Integrated design is complete; SUR01–SUR09 implementation, performance and gameplay qualification remain open. | 2026-10-24 |

## Authority and delivery boundary

This document owns specialist F's consumer/producer contract, exact surprise evaluation and integration into existing combat. [Feature behavior](preparedness-and-surprise-feature-spec.md), [base-world policy](../worlds/base/combat.md#preparedness-policy), [SUR tasks](../maintainers/preparedness-and-surprise.md) and [limits](../limits/preparedness-and-surprise.md) have distinct purposes. It completes the selected [ND11](../maintainers/needs-design.md#nd11--human-conflictrecovery-and-npc-ghost-continuity) design only.

Frozen [SC02/SC08/SC10–SC14](stealth-awareness-tech-design.md#shared-contracts) remain unchanged. No new threat database, writable readiness meter, combat engine, perception algorithm, emotional reducer, action lane, NPC controller or scheduler is selected. Native registration is the missing narrow computation inside existing personal encounters. Damage uses the existing contact/body transaction. This file contains conceptual TypeScript contracts and paper cases, not executable code or tests.

## Source baseline and specialist dependencies

This design uses the integrated [perspective](perspective-perception-tech-design.md), [emotion](emotional-physiology-tech-design.md), [vision](vision-and-gaze-tech-design.md), [acoustic](acoustic-stealth-tech-design.md), and [attention](attention-and-investigation-tech-design.md) contracts. Their source audit establishes owner placement; runtime delivery and qualification remain open.

### Existing owners and required changes

| Owner                                                                                                                                                                                                  | Verified baseline / required F integration                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [combat-encounters.ts](../../packages/domain/src/combat-encounters.ts)                                                                                                                                 | PersonalEncounters owns life, known pairs, anonymous occurrences, active attack associations and deadlines. Extend those records for warning registration and finite expectation. Its current personalEncounter query requires sight and cannot answer F.               |
| [events.ts](../../packages/domain/src/events.ts), [event-observation.ts](../../packages/domain/src/event-observation.ts), [perception-frame.ts](../../packages/domain/src/perception-frame.ts)         | Native reception precedes some Awareness insertion. WorldEvent.order is allocated before nested native callbacks. Preserve actual acquired membership; neither Awareness.sequence nor timestamp-only selection proves prior warning.                                    |
| [kernel.ts](../../packages/domain/src/kernel.ts), [strikes.ts](../../packages/domain/src/strikes.ts)                                                                                                   | Both unphased natural strike completion and phased melee call shared contact. Integrate both, sharing D's common attempt resolver rather than adding a surprise-specific resolver.                                                                                      |
| [ranged.ts](../../packages/domain/src/ranged.ts)                                                                                                                                                       | Release captures injury/direction and produces saved ProjectileFlight; actual first collider and one terminal contact are authoritative. Add release-bound surprise policy and immutable release-origin geometry where needed; do not store victim surprise at release. |
| [contact-defense.ts](../../packages/domain/src/contact-defense.ts), [living.ts](../../packages/domain/src/living.ts)                                                                                   | One shield/contact calculation then commitBodyEffects owns susceptibility, scars, clamping, interruption and death. Insert once-only amplification before shield arithmetic; never write health directly. No general armor stage exists in this inspected path.         |
| [combat-consent.ts](../../packages/domain/src/combat-consent.ts)                                                                                                                                       | Permission and exact potentially lethal review precede commitment. Include maximum allowed surprise injury in review facts; never inspect private victim awareness to decide whether confirmation appears.                                                              |
| [evasion.ts](../../packages/domain/src/evasion.ts), [ranged-policy.ts](../../packages/domain/src/ranged-policy.ts)                                                                                     | Evasion is actual motion without an invulnerability roll. D modifies new permitted evasion distance and release steadiness at their own boundaries; F adds no second factor.                                                                                            |
| [native-response-controller.ts](../../packages/domain/src/native-response-controller.ts), native-response danger/exposure owners                                                                       | Memoryless animals already have a controller and perceived danger. Feed compact warning through CTR; do not duplicate their danger map, require human memory, or add movement selection.                                                                                |
| [status-effects.ts](../../packages/domain/src/status-effects.ts), [state-contributions.ts](../../packages/domain/src/state-contributions.ts), [appraisals.ts](../../packages/domain/src/appraisals.ts) | D extends these for native-body-cause receipts and complete mechanical parameters. F only supplies a validated unexpected-contact cause and consumes resolved parameters.                                                                                               |
| [simulation-time.ts](../../packages/domain/src/simulation-time.ts), [temporal-boundaries.ts](../../packages/domain/src/temporal-boundaries.ts)                                                         | Add registration/retention/settling boundaries to existing participant-owned next-deadline accounting. Preserve coherent-prefix holds and actual native ordering.                                                                                                       |
| [world-record-schema.ts](../../apps/server/src/world-record-schema.ts), current serialization/validation owners                                                                                        | Persist extension fields on their existing records, original deadlines/pins and outcomes. Rebuild derived indexes after restore. No legacy readers, migration or second schema.                                                                                         |
| [view.ts](../../apps/server/src/view.ts), protocol and current action/history projections                                                                                                              | Project only own accepted preparation, personally received warning and allowed outcome facts. F's native snapshot is never serialized wholesale.                                                                                                                        |

PersonalEncounter.episode is an observer recognition/exposure association, **not a combat episode ID**. AttackObservationReceipt deduplicates observation of the same committed preparation. The existing ten-normal-second contextual grace, native animal episode and emotional cause all have different semantics; none is reused as a surprise timer.

The inspected source already has world-enabled human PvP and actual vulnerable-collider injury. Broader CTR delivery/qualification remains open. Existing guaranteed-accuracy strike RNG behavior also differs from its accepted one-draw contract (AC09.6); F adds no random draws and does not claim to repair or qualify that separate gap.

## SUR-C01 — World policy and protected mechanism

The world owns qualification families, registration/lead durations, warning scope/retention, quiet settling and multiplier. Engine integrity owns exact life/reference validity, permitted evidence, native ordering, complete preparation, harm permission and once-only effects.

Extend BodyPolicy.combat.encounters in packages/domain/src/body-policy.ts and its existing validateBodyPolicy path; the selected source is BASE_BODY_POLICY.combat.encounters in packages/domain/src/worlds/base/body-policy.ts. The existing bodyPolicyPin/definition owner supplies its pin. combat-encounters.ts already reads bodyPolicy(world)?.combat?.encounters. Its current recentSeconds is CTR's contextual grace and must remain separate.

A narrow installed combat-policy descriptor supplies:

```ts
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
```

These are finite nonnegative durations, a finite multiplier at least one, and exact supported definition references. The selected values live only in [base combat](../worlds/base/combat.md#preparedness-policy). An installed family maps its actual native attack/physical primitives to supported danger and damage semantics; arbitrary action names, prose tags or unsupported definitions cannot qualify.

The current body approximation for registration is explicit: exact current physical life; actor alive; activelyParticipates; **not capabilityBlocked for the general perception capability**. It is not a new generic readiness capability. Do not use canNoticeInternalChange, hasMemory, cognition, available actions, locomotion, energy, guard-ready state or a blanket incapacitated check. Existing channel-specific acquisition gates still decide whether a cue was received. After receipt, source occlusion, deafness or blindness of that particular channel does not erase already acquired information while the general registration predicate remains valid. An alternate world needs an explicitly supported predicate to change this approximation; no unimplemented physiology is inferred.

No module installed means no surprise damage/reaction contribution from F. An installed but incomplete/invalid policy is not absence. A materially different supported world must qualify with, for example, touch-acquired warning, no psychological fear, a different multiplier/lead and an omitted surprise rule—not just renamed humans.

## SUR-C02 — Producer and consumer contracts

Shared SC02 ActorLifeRef, SimTime, OccurrenceRef, EvidenceRef, EvidenceCut, LocationEvidence and DefinitionPin retain their shared meanings. A supplies FactKey, SupportedSensoryFact, CapturedCurrentFacet, permitted participants and exact acquisition. E supplies its complete [CapturedPreparationState / capturePreparation port](attention-and-investigation-tech-design.md#7-exact-preparedness-evidence-interface). D supplies complete mechanics and its cause/receipt port. The following defines F-owned meanings; imported owner types are references to those contracts, not instructions to invent replacement schemas.

### Acquired warning and coverage

```ts
type PreparednessTimingBinding = Readonly<{
  policy: DefinitionPin;
  clock: ExistingAdmittedNormalClockBinding;
  registrationDuration: SimDuration;
  deliberateLeadDuration: SimDuration;
  retentionDuration: SimDuration;
  settlingDuration: SimDuration;
}>;

type MethodTimingBinding = Pick<
  PreparednessTimingBinding,
  'policy' | 'clock' | 'deliberateLeadDuration'
>;

type RetainedCoverageClip =
  | Readonly<{
      kind: 'guard-sector';
      from: Position;
      facing: number;
      coverageDegrees: number;
    }>
  | Readonly<{
      kind: 'provider-coverage';
      coverage: Extract<
        CapturedPreparationState['physical'],
        { family: 'observation' }
      >['coverage'];
    }>
  | Readonly<{ kind: 'scope' }>;

type ResolvedPreparationCoverage = Readonly<{
  observer: ActorLifeRef;
  danger: DefinitionPin;
  capturedAt: SimTime;
  scope:
    | Readonly<{
        kind: 'known-source';
        sourceLife: ActorLifeRef;
        association: EvidenceRef;
      }>
    | Readonly<{
        kind: 'approach';
        location: LocationEvidence;
        clip: RetainedCoverageClip;
      }>;
}>;

type PreparednessCredit = Readonly<{
  work: ExistingActiveWorkRef;
  family: CapturedPreparationState['physical']['family'];
  cut: EvidenceCut;
  matureAt: SimTime;
  confirmingFact: FactKey;
  confirmingAcquisition: ExistingObserverAcquisitionBoundary;
  confirmingCause: ExistingPhysicalCauseRef | null;
  timing: MethodTimingBinding;
  covered: ResolvedPreparationCoverage;
  support: readonly EvidenceRef[];
}>;

type WarningKey = Readonly<{
  fact: FactKey;
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
}>;

type CapturedWarningFact = Readonly<{
  key: WarningKey;
  observer: ActorLifeRef;
  meaning: WarningMeaning;
  coverage: ThreatCoverage;
  acquiredAt: SimTime;
  acquiredBoundary: ExistingObserverAcquisitionBoundary;
  timing: PreparednessTimingBinding;
  registrationBeganAt: SimTime;
  readyAt: SimTime;
  phase: 'registering' | 'registered';
  lastQualifiedAt: SimTime;
  retentionUntil: SimTime;
  settlingFrom: SimTime | null;
  continuousThreatThrough: SimTime | null;
  occurrence: OccurrenceRef | null;
  support: readonly EvidenceRef[];
}>;
```

PreparednessTimingBinding retains the admitted clock binding and converted durations; timing.policy is the single warning-policy pin. Renewal/restore never reconvert them using a later speed. Supported clock/policy edits follow SC13. Active methods retain only MethodTimingBinding, not warning registration/retention/settling data.

ResolvedPreparationCoverage stores the reduced comparison needed after actual preparation is confirmed. A known source needs only its permitted exact life/association. An approach matches its original LocationEvidence **and** the clip. Guard clips copy actual position/facing/profile coverage and reuse the contact owner's angular predicate and existing vertical/contact rules. Provider clips reuse E's immutable B/C coverage projections and their original frame/precision; alternatives compose as that owner defines. A scope-only clip is legal only when the adapter proves the selected scope already equals its complete fulfilled coverage. Missing geometry is incomplete, never permission to broaden coverage or use a bounding box.

Own-motion-relative scope becomes its achieved fixed world bearing at capturedAt. An observed subject becomes exact-source coverage only with a valid physical-life association, otherwise its permitted location. Never retain desired pose, unvisited sectors, hidden coordinates or mutable geometry. These are projections through existing spatial predicates, not a new coverage solver.

PreparednessCredit is **transient admission proof**. Validate exact work, physical family and confirming cut; retain only resolved coverage, earned readyAt and source/cause/work references needed for correction. Do not save the full cut, credit or E physical arm on warning continuation. Rich A/E/D captures survive only the current transaction or an already required held continuation and are released on commit/staleness.

WarningKey composes A's existing FactKey with a coverage ordinal; it does not redefine the fact's identity. Structured ordinals select real admitted coverage, not additional onsets. Reduced continuation extends PersonalEncounters' existing pair/anonymous records without copying sensory-history text or action state.

Only trusted observation/CTR adapters produce AcquiredThreatWarning. A command, client or model cannot submit this type as authority. F checks the already acquired typed evidence and allowed source meaning at its owning boundary; it never invents testimony, parses free text into hostility, generates a danger inference or revises A's signal quality.

- Direct attack evidence concerning **this observer's body**, or felt actual attack contact, can create self-assault coverage. A named attacker is unnecessary. Seeing a weapon, somebody else's attack or a private queued target cannot.
- Understood attributed warnings and admitted region-danger interpretations provide only their actual source/region/approach scope. Suspicious footsteps/movement remain possible signals until a supported warning meaning or chosen E anticipation exists. Raw subthreshold progress is never warning.
- A known-source binding requires an actually granted canonical physical-life association or own admitted exact opponent. A's rememberedSubject may be an observer-local individual; never cast it to an entity ID. Anonymous/suspected sources remain spatial/anonymous.
- Facts measured earlier but acquired after the cut cannot enter it. EvidenceOrder is not a substitute for actual membership. Original observation, acquisition and later interpretation times remain distinct.
- A's latest confirmation is copied at the cut. A later finalized continuous observation cannot backfill an earlier cut merely because its measurement interval began earlier.
- Source/revision corrections revoke derived future support through existing correction; replay/recall/publication contributes no fresh warning.

### Exact scoped claim/inference admission

The selected world deliberately treats **a current scoped danger report** as reason for minimal anticipation of ordinary physical assault from that scope. This is a protective response policy, not a claim that an attacker exists. It does not require inventing a danger-family field on A's generic danger claim.

| A input                                                                                                                        | F admission rule                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| role testimony, facet claim, claim.kind danger                                                                                 | Require A's already validated personally acquired/understood claim, strength possible or supported, presence possible or asserted, and stated-interval containing its actual native claim-admission/acquisition time. Preserve where and uncertainty. Begin registration when that complete admitted meaning is available.                                   |
| role inference, facet inference, inference.kind region-danger                                                                  | Require the actually committed current inference, strength possible or supported and complete valid basis FactKeys. Its presence possible is enough for the selected scoped precaution. Begin only at its actual native admission/acquisition boundary, never earlier formedAt or when an older basis occurred. Retain formedAt as semantic provenance only. |
| Either eligible row                                                                                                            | Map to the base world's ordinary physical-assault anticipation only within the original supported region/approach. False testimony can yield real preparation. No source identity is inferred from its location.                                                                                                                                             |
| ambiguous strength, authored/imagined role, historical recall, unspecified time, relative-words claim time, general reputation | No automatic warning admission. F does not parse words into a time/family or promote uncertain identity. The person may still choose supported E anticipation or later acquire a valid current claim.                                                                                                                                                        |

A's ClaimTime is unspecified, stated-interval, or relative-words; no new current/future-near variant or arbitrary temporal window is assumed. Approximate stated intervals retain their original bounds/precision, without expansion. A danger assertion need only be current at its real native admission/acquisition; continuation afterward follows F's finite retention rather than claiming the assertion remains true. Broad “this world is dangerous” without a valid bounded scope does not qualify.

A already owns speech understanding and the validity of quoted/reporting support. Its claim must be grounded in actually received heard segments or an admitted report. Partial speech qualifies only if the complete admitted danger meaning is supported by the received fragments. Clear delivery alone is not semantic understanding or truth. Visible talking, unintelligible audio, private event text, an unseen recipient ID or the actor's own self-speech cannot manufacture an external warning. F neither parses segments nor asks a model to rerun their interpretation.

The ordinary attack mappings above remain separate: actual native observer-permitted preparation/release/attempt toward the observer, felt contact, and an actually acquired incoming-projectile cue can support self-assault. Flight detection/location alone cannot prove direction or threat. The dedicated flight adapter must supply personally permitted approach support as specified in the integration requirements below; hidden intendedTarget, unobserved velocity or eventual collision cannot substitute.

### Active preparation and matching

Call **capturePreparation(victim, cut, completeInstalledFamilySet)** once after required physical work is settled. Its only success is complete immutable current preparation/workSupport; otherwise it returns incomplete. The family set is the descriptor-derived complete set, not a caller filter.

| E physical family | Selected F predicate and coverage                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| observation       | kind anticipation, explicit danger kinds, compatible method, maintaining fulfillment and earned lead; active focus only, intersected with actual provider/pose coverage. Ordinary observation supplies no anticipation.                               |
| shield-guard      | Exact life/profile/equipment, ready phase, coverage and earned lead from actual method start. Native shield readyAt and expiresAt remain authoritative. A head glance cannot rotate it.                                                               |
| ranged-aim        | Actual working/maintaining preparation and valid own opponent/approach, not mere approach or an unadmitted wish. Lead is measured from real method start, not the full action duration. Readiness is scoped; it does not warn of unrelated betrayal.  |
| strike            | Actual working wind-up or supported unphased work, maintaining method and exact admitted opponent. Recovery does not earn a new interval. An earlier registered warning can continue independently.                                                   |
| evasion           | Actually admitted danger/approach association and fulfilled movement/body requirements; not any ordinary move or arbitrary endpoint. Its existing duration/trajectory remains authoritative.                                                          |
| native-alert      | Actual maintained alert method, complete permitted danger scope and body constraints. Escaping/settling/blocked is not by itself proof. A stationary or route-blocked animal can remain alert; blocked locomotion does not imply failed anticipation. |

For observation and native-alert methods, readyAt = maintainedFrom + converted deliberate lead: the interval begins only when the relevant pose/sensory/body fulfillment exists. For shield-guard, ranged-aim, strike and evasion, the lead begins at the actual physical method start, and both current fulfillment and the method's own stricter readiness condition must hold at the cut. For a shield this is max(currentMethodStartedAt + converted deliberate lead, guard.readyAt), so its existing 0.25-second preparation does not incur an extra 0.20-second delay. Approaching a target is not method start. Newly accepted same-time work has zero elapsed lead. Work intervals are half-open; equality with an expiry is ended, even if an action remains in recovery. A method ending exactly when its lead completes contributes no current coverage after ending.

E's `currentMethodStartedAt: SimTime | null` is the actual physical-family anchor, preserved across preparing → maintaining and reset after a genuine break/replacement/restart. Neither `admittedAt` nor a later `maintainedFrom` substitutes for it. Null means the method has not begun. [SA-D03](../../archive/05-project/open-decisions.md#sa-d03--preparation-lead-after-native-phase-transition) is resolved by this shared port; runtime adapters must supply it without inferring elapsed preparation from action age.

No current coverage is banked from finished methods. A previously acquired actual warning keeps its own continuation; a completed guard/scan/evasion does not create a warning merely to preserve readiness. Compatible offensive work may continue to anticipate its admitted opponent across a view edge under the exact supported work/evidence binding, without tracking hidden coordinates.

**Coverage matching is a native comparison, not another observation.** It can inspect the already resolved attack's actual cause/geometry to compare with legitimately acquired preparation. It cannot use that comparison to disclose or learn a source.

| Coverage                                       | Exact match                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| self-assault                                   | Same victim life and installed ordinary physical-assault family. Current source identity, direction, range to the shooter and number of attackers do not matter.                                                                                                                                                                                                   |
| retained-prepared-approach                     | The immutable previously mature prepared scope, frozen in its actual world/body frame at the confirming occurrence, matches this incoming approach. It never rotates/follows the observer afterward. Admission required the actual acquired attack and validated credit; later evaluation uses their reduced retained scope/lineage, not the discarded full proof. |
| known-source                                   | Exact captured historical source life equals the actual committed source life and the danger family fits; support remains eligible. It grants no current targeting, position, identity disclosure or cross-exposure join.                                                                                                                                          |
| origin-region                                  | Actual immutable release/strike origin lies within the original supported 3D region under its geometry owner. No recentering with observer/source movement or use of the projectile's later position.                                                                                                                                                              |
| approach warning                               | Actual final uninterrupted incoming path intersects the captured location region/cone at its original frame and uncertainty. Use the supported region/bearing/point predicate; unsupported or incomplete geometry is not a mismatch.                                                                                                                               |
| current E region/bearing/travel-relative scope | Relevant danger kind and actual method coverage both match the incoming approach. Fixed scopes stay fixed; maintained travel-relative scope uses E's achieved current frame. A known subject uses its actual permitted exact binding, not a name.                                                                                                                  |

A bearing is its original cone, a region its supported volume and a point its admitted uncertainty volume. For an approach record, the actual contact path must enter that volume/cone **before** the contact, in the observed/maintained incoming direction; mere contact at the cone apex does not match all directions. Geometric boundaries use the existing spatial owner's inclusive boundary/tolerance, not a new F epsilon. Actual finite contact segments and the released projectile's traversed path are used, not an infinite line through walls. Interception truncates the traversed path. Solid/level separation and height remain part of existing geometry. A threat estimate never acquires hidden exact coordinates.

An origin-region warning requires a real permitted spatial basis. E's own/known-terrain selection can create active preparation without a warning FactKey; it remains E work rather than manufacturing AcquiredThreatWarning. F's typed origin-region/approach warnings require the evidence basis shown above.

### Attack commitment, outcome and damage receipt

```ts
type AttackSurpriseBinding = Readonly<{
  execution: ExistingAttackOrFlightRef;
  source: ActorLifeRef;
  intendedTarget: ActorLifeRef | null;
  policy: DefinitionPin;
  danger: DefinitionPin;
  committedAt: SimTime;
  committedOrigin: Position;
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

type CapturedMethodTiming = Readonly<{
  work: ExistingActiveWorkRef;
  family: CapturedPreparationState['physical']['family'];
  cut: EvidenceCut;
  timing: MethodTimingBinding;
  methodStartedAt: SimTime | null;
  eligibleAt: SimTime | null;
}>;

type ActualAttackOutcome = Readonly<{
  attack: AttackSurpriseBinding;
  cause: ExistingPhysicalCauseRef;
  outcomeOrdinal: number;
  victim: ActorLifeRef;
  cut: EvidenceCut;
  geometry: ResolvedThreatGeometry;
  timing: PreparednessTimingBinding;
  methodTiming: readonly CapturedMethodTiming[];
  result: 'miss' | 'contact' | 'intercepted-contact';
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
```

ResolvedThreatGeometry copies the existing spatial/contact owner's already resolved finite segments, direction, endpoint, relevant body extents and frame at the outcome boundary. A current straight projectile uses its actual traversed release-to-terminal segment; melee uses its real resolved finite attempt/contact approach, including a miss's attempted endpoint. It is not an infinite ray or a new collision solver. Required geometry missing from the owner is incomplete, never reread later through a cause reference or mutable flight. Future curved/piercing families must supply their real ordered finite segments. Geometry is private native comparison input, not an acquired observation or client payload. Outcome timing supplies the installed admitted binding for the capture; per-warning and per-method bindings retain their own exact admission conversion. At each physical family's actual lead anchor, bind MethodTimingBinding in that existing work continuation. During the coherent capture, F resolves CapturedMethodTiming for every applicable E work reference from those owner values and the E current-method start; it computes eligibleAt using the family-specific rule, with null when no eligible method exists. Match timing by (exact work, physical family, cut), with E's same owner revision. A guard and compatible head watch can share one action but have independent starts and lead times; never key their timing only by work/action ID. This is immutable consumer input alongside the unchanged SC12 snapshot, not a second preparation store or a post-capture lookup. Missing required timing returns incomplete.

Current melee and terminal flights use their existing exact execution, terminal stage and contact ordinal for once-only consumption. No group/carrier field, global counter or per-victim ledger is needed for these one-contact families. A plan ID is not an execution. Native body/cause fields are not protocol DTOs.

Preserve SC12 VictimPreparationSnapshot unchanged: victim/cut, captured warning, E preparation, acquiredSupport/workSupport, complete relevant D mechanics, policy. Evaluation consumes only those resolved immutable values and attack geometry. It never re-reads mutable evidence/work during damage application.

SurpriseDecision's surprised flag reports the informational/preparedness qualification independently of hit or slot spending. Its multiplier is the resolved applicable factor for the designated outcome: one for expected/not-designated/spent, authored multiplier for a surprised unspent designated outcome. A miss can have surprised=true and a potential multiplier but actual applied=false, injury zero. No caller should infer actual health loss from that field. For a miss, nominalInjury and amplifiedInjury are zero and applied is false. For actual contact, amplifiedInjury is the designated nominal amount after the permitted factor, before mitigation. applied is true exactly when a factor greater than one was inserted once into a positive eligible raw contact component; it does not mean additional health was lost. Zero nominal injury, multiplier one or a non-designated slot has applied=false. A later shield/body immunity or health cap can yield zero extra health loss even when applied=true; record final body outcome separately.

SurpriseDamageApplication, the complete SurpriseDecision (including cut, reason and policy linkage), and its selected warning/work provenance are retained as components of the existing contact/action/projectile outcome. It is not a second damage ledger. The contact owner requires the exact unconsumed producer stage and rejects conflicting reuse; identical receipt recovery returns the committed result. No external caller supplies a free multiplier.

### Startle producer to D

F prepares a cause only for a real unexpected physical attack contact, including intercepted contact on the victim's own held shield. Supply D's existing prepared-cause fields: original exact action/projectile contact identity, owner contact ordinal, native stage/order, actual victim life, timeline scope, contact support and installed unexpected-attack-contact rule. The cause is bound before the enclosing WorldEvent exists and committed with the contact.

Call D's **admitBodilyReaction(world, preparedCause, preparedBody, at)** through its existing status/contribution mutation path. D returns admitted, replayed, inapplicable, incomplete or conflict and owns the resulting peak, duration, curve and exact receipt. F never chooses those values. Original cause + reaction pin + target life identifies onset; struck/guarded/body-effect/contact/awareness/memory/appraisal wrappers do not.

A shield owned by someone else intercepting the projectile changes the actual victim; the protected intended person gets no phantom contact shock. Armor or zero-injury actual body/own-shield contact can still qualify. Miss, range expiry and an unseen environmental collision cannot be passed as unexpected-attack-contact. A/C may independently deliver a real personally acquired abrupt sound from the near miss under the authored qualifier; a visual flight warning alone is not a bodily-startle producer. No new noncontact F stimulus family is proposed.

## SUR-C03 — Warning lifecycle and finite expectation

### Registration

The acquisition owner synchronously supplies qualifying warning before dependent attack resolution. CTR records its original source/coverage/acquiredAt and sets readyAt = acquiredAt + bound registrationDuration, or acquiredAt when validated mature same-scope credit applies. Schedule the nearest relevant deadline through CTR.

Registration requires the selected body predicate throughout the interval; source visibility is unnecessary after receipt. At readyAt, valid registration becomes expectation. An uncredited new scope earns its own lead. Fresh matching evidence may renew still-registered expectation without creating a gap, while retaining every source's original acquisition time.

A general-perception block, observer-life end or actual participation ending retires pending and registered bodily continuation. Mere action/motion/cognition restriction or channel-specific loss after acquisition does not. Wake/return needs new post-break acquired or genuinely confirmed threat, or newly fulfilled deliberate preparation; old warning never resumes automatically. A real post-wake confirmation can register without becoming a second hostile occurrence/startle. An impact that wakes a body cannot begin registration before that contact. Transport reconnect alone is not physical departure; same-life control transfer preserves valid warning unless its actual bodily transition requires retirement. Knowledge and social preferences retain their own lifetimes.

### Preserve earned expectation across a real interaction

Ending an unused method supplies no warning. A real attack can instead confirm already earned preparation:

| Basis                                                                              | Required treatment                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Received directed preparation/release/attempt, incoming projectile or felt contact | Credit requires a mature fulfilled method covering that threat at the designated pre-consequence cut. Contact uses that victim's SC12 cut; an earlier observed cue uses its acquisition-local cut.                                                               |
| Own irreversible attempt/release                                                   | Use the actor's precommit method/cut. Mature commitment immediately preserves its exact opponent/approach; immature commitment starts ordinary registration without guessed fractional credit. Approach, proposal, cancellation and recovery alone earn nothing. |
| Testimony, inference, recall or wrapper                                            | May supply its independently valid warning meaning, but cannot mint mature-method credit.                                                                                                                                                                        |

Validate exact observer life, work plus physical family, confirming FactKey/cause/acquisition, bound policy/timing, matureAt <= cut.at, matching fulfilled coverage and uninterrupted body eligibility through acquisition. An arbitrarily older snapshot is invalid. Stage proof before guard consumption/interruption, bind it to the fact actually acquired, then discard the rich proof after reducing it to scope/readiness/lineage. Do not recapture changed work afterward.

Only the already mature copied scope registers immediately. A mature entrance guard can protect the first blow and leave expectation for another from that entrance 0.10 seconds later, while its physical shield is consumed. New broader self-assault still earns ordinary registration; an unrelated rear threat can qualify before then. The new warning keeps its real acquisition time and cannot reclassify the confirming impact. No acquired confirming fact means no credit.

Directed attack evidence with a permitted exact source supplies both broad assault and narrow source continuation; anonymous evidence can also supply its permitted approach, never a guessed identity. These are sibling coverage records of one original cause, not additional emotional onsets. Exact-opponent work may postpone only the narrow scope's settling. Thus broad expectation can expire during a long fight while the same opponent remains expected through a brief occlusion. Own committed offense has the same narrow recovery continuity, without global readiness or new hostile attribution.

Retained spatial preparation is fixed in its achieved world frame. It does not follow/rotate with the body after its method ends or preserve physical shield protection. Capture any still-current moving method separately.

### Retention and quiet settling

For each registered support:

1. lastQualifiedAt is its last genuinely fresh matching acquisition or actually confirmed ongoing-threat boundary, never the time a reader queries it.
2. retentionUntil = lastQualifiedAt + bound retentionDuration. Until then, the registered scope remains relevant.
3. Settling begins no earlier than retentionUntil, when required observation work is complete and there is no currently confirmed matching threat or qualifying same-scope method below. This is not proof that hidden danger is absent. unwaryAt = settlingFrom + bound settlingDuration; cut.at >= unwaryAt means this support has ended.
4. Fresh matching threat renews its support and clears settling. Distinct independent supports keep independent lifetimes; an unrelated warning cannot refresh them. Correction of one cannot erase another valid basis.

For source/region/approach support, a fulfilled method postpones settling only if it covers the **entire** warning scope with the same danger and permitted source association. Intersection alone is insufficient. CTR resolves this after E's complete capture; the evaluator follows no mutable work. On that method's end, settling begins at max(retentionUntil, method end). A method that resumes during settling restarts the quiet interval when it ends.

Broad self-assault is never prolonged by deliberate work alone. Only actual fresh attack evidence or genuine continuous directed-threat confirmation renews it. An aim at a deer, generic watch or offense against the original opponent supplies its own current scope, not endless all-direction expectation. Continuous confirmation comes from A's captured availability interval, not hidden attack existence, source departure or repeated publication.

With no later support/work, warning at 10.00 lasts through retention to 16.00, then quiet settling to 18.00. This is six **plus** two, not max(six elapsed, two quiet). Equivalent scopes may be coalesced only while preserving complete support/renewal lineage.

There is no victim-wide surprise-use counter or unwary Boolean. Independent attacks can qualify before registration or after genuine unwary return. Attacker/weapon swaps, exposure changes, backward steps, Speak, Stop/restart, refunds and reconnect cannot erase another body's evidence.

### Storage and episode identity

Extend existing PersonalEncounters known pairs/unknown entries with reduced continuation and exact relevant support; no historical text is needed in the hot record. WarningKey plus observer life identifies warning. Keep CTR's recognition episode, attack-observation receipts and source revisions distinct. Return to unwary closes live continuation; later real acquisition or post-break confirmation establishes its own registration. No ambush UUID or renamed perception episode is needed.

Known and anonymous inputs share the evaluator. Memoryless animals use compact native references in these same records; their danger map remains the movement-selection owner. Existing pairFor/reconciliation can replace a recognition pair, so preserve still-valid warning inside that same known/anonymous container before resetting its UI association. Never rebind an old source life or preserve a stale clickable target. Source death may leave old-source warning relevant to its released flight; observer-life ending retires bodily continuation.

Prune expired derived fields through CTR nextAt/reconciliation. Canonical evidence, correction metadata and terminal attack/reaction receipts retain their existing history/retention owners.

### Freshness without inference replay

A owns original fact roots, alias/summary resolution, correction and indexed source preparation. F consumes those canonical roots and records only whether they already supplied a particular warning meaning in existing source/CTR receipts. It does not traverse history or build another lineage registry. Match original acquisition/confirmation, facet lineage, observer life and supported danger meaning; current revisions separately establish validity.

Compute the complete permitted coverage set for an acquisition before consuming its roots. One freshness decision admits broad/narrow/credited siblings atomically with stable coverage ordinals. A sibling is neither a replay of its preceding sibling nor a new occurrence that can be added later to refresh the clock.

The first supported danger meaning may register at actual admission. Rephrasing, new inference/hash/revision, scope jitter/broadening/narrowing or another wrapper over the same consumed roots cannot advance lastQualifiedAt or reopen expiry. Changed scope can reduce/correct future eligibility, not restart time. A genuinely new relevant cue, newly heard warning or actual post-break confirmation supplies fresh support normally.

Keep that compact consumer disposition with the existing receipt while its source can still be replayed/reinterpreted. Hot-warning expiry must not delete it while leaving the source able to regenerate warning. When the source owner retires source and receipt together, unsupported recall cannot reconstruct authority. No warning-text archive or all-history impact scan is required.

## Native evaluation order

Keep the existing native coordinator, saved randomness and canonical ordering. Admission/revalidation checks permission, exact lives/tools, work/recovery and maximum-harm review. During approach, wind-up and aim, only real physical B/C evidence acquired through A can warn; a proposed/refused action or hidden stage cannot.

**Ranged release is an earlier boundary.** Complete release permission and D shooter mechanics; capture mature own-offense credit before its method ends; then commit the one release result, cost, trajectory and attack binding. A flight retains these after source loss. Victim surprise remains undecided until contact.

At an outcome boundary, distinguish selecting the physical result from committing it:

| Path                     | Preparation before consequences                                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Melee, both kernel paths | Validate the admitted exact target and finite attempt geometry. Capture victim preparedness and attacker mechanics below **before the attempt's one accuracy result**. A missing/retired target or refused attempt creates no victim outcome. |
| Projectile               | Existing swept collision selects the actual first collider and terminal time without consuming a guard, injuring a body or publishing contact. Capture that actual victim. Terrain/range termination invents no victim miss.                  |

1. **Settle the boundary.** Complete admitted motion/turns, due effect endings, preparation changes, warning deadlines and legitimately due A/B/C sensing. Stop at unresolved required work. A previous turn may have earned warning; newly admitted same-time work has no elapsed completion.
2. **Capture and preflight.** Obtain SC12's immutable acquired membership/values, CTR continuation, complete E methods with family-specific timing, and complete D mechanics. Capture melee attacker accuracy; ranged steadiness is already release-bound. Prepare required D reaction support and reserve the producer's existing cause/outcome identity. Stage mature contact/own-offense credit before guard consumption, interruption or attempt-to-recovery transition. Missing required inputs hold before a new irreversible draw, cost or harm.
3. **Evaluate expectedness.** Match exact life, danger and scope against registered warning/retained expectation or currently fulfilled mature preparation. Any valid match makes it expected; complete inputs with none make it surprising. Incomplete work is not an empty list. Read only the capture.
4. **Resolve once.** Melee performs existing reach/accuracy resolution using captured mechanics; projectiles use the selected collision and earlier release result. Surprise adds no draw, reroll, guaranteed hit, reach or recovery exception. Attach the result to the original cut as ActualAttackOutcome; do not recapture afterward.
5. **Commit coherently.** Spend the designated opportunity, multiply eligible nominal injury once, apply existing shield/body effects and record D's qualifying unexpected-contact result. Expected outcomes, misses, blocks and zero injury still spend the appropriate opportunity. This contact's new shock cannot enter its fixed mechanics.
6. **Acquire and publish consequences.** Acquire actual attempt/contact/injury cues and admit CTR warning using only staged exact credit. New warning starts at its acquisition and cannot enter this contact's earlier cut. Publish/save through existing owners; optional cognition follows the committed evidence. Retry returns the same outcome.

Required F/D preparation precedes new irreversible work. If an existing producer has already committed an attempt/release before a later hold, retain that result and stage receipt; resume without rerolling or rolling back saved randomness. Revalidation can cancel invalid future work, not create another attempt.

**Canonical order.** Ordered kernel action effects precede captured flights; flights and collider ties retain their existing ID ordering. Same timestamps preserve that order. With positive registration lead, one unanticipated impact supplies no elapsed warning for another simultaneous impact. Mature credit can preserve anticipation earned beforehand. Death, interruption and one-use guard consumption still apply. A zero-lead world may count a genuinely earlier acquired consequence at that timestamp, never the contact's own evidence. Earlier shock affects only a genuinely later parameter boundary, not a released shot or admitted evasion.

**Local contact atomicity.** commitBodyEffects changes life/incapacity and acquires nested events before commitContactImpact returns, so appending D afterward is insufficient. Stage body changes, the F result and D outcome inside the existing contact transaction before releasing dependent acquisition/publication. Reserve the existing producer's cause ordinal before mutation; an event allocated afterward cannot be its sole identity. This is a local publication fence, not a general transaction framework or scheduler.

For a fatal hit, pre-contact mechanics determine harm and the same transaction records D's terminal inapplicable/no-effect receipt for the original struck life. It creates no active shock on a corpse, ghost or replacement body and never retries waiting for that life to return. Surviving contacts use D's ordinary admitted/replayed/inapplicable result; prior effects retire through their life owner.

## Damage placement and outcome consumption

### One existing contact calculation

For eligible direct injury, B is authorized attempt/release-bound nominal injury and M is the authored multiplier when this outcome qualifies and owns its unspent opportunity, otherwise one:

**B → B × M once → existing shield reduction → body susceptibility/scars → existing rounding, clamping and life consequences.**

Keep the body's numeric representation and rounding boundary. Do not round at the new multiplication, multiply final capped health loss, or amplify both components and their total. Nominal injury 5 with 2× surprise and 50% shield reduction passes 5 to the body; without surprise it passes 2.5, before further body adjustment.

Existing [shield](../worlds/base/shield-defense.md) and [evasion](../worlds/base/ranged-counterplay.md) profiles own timing, coverage, protection and motion. A ready matching guard usually prevents surprise; physical protection still applies whenever its own predicate passes. A miss/uncovered contact does not consume the guard even though a designated melee miss spends its surprise opportunity. Stop/injury cannot erase recovery. Evasion remains actual motion, with D's adjustment sampled on new admission; F never retargets flight or reopens accuracy.

### Designated outcomes and multiple contacts

Current melee and stopping projectiles already have one terminal opportunity. Use their existing exact execution/flight and outcome receipt.

| Supported outcome                   | Consumption                                                                                                                                                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single melee attempt                | The one actual attempt against its admitted exact victim life spends the opportunity on miss, block, zero or injury. Approach failure/cancellation supplies nothing to carry into a replacement action.                      |
| Single terminal projectile          | Actual collider's pre-contact cut governs its contact, including zero injury. Terrain/range termination ends the flight; no hypothetical victim miss or banked later attack exists.                                          |
| Several components of one contact   | The family declares its direct-contact bundle. Amplify eligible nominal components once before aggregation, never the total again. Later poison, bleeding, burning, periodic/status harm and unrelated effects are excluded. |
| Independent simultaneous attacks    | Each has its own opportunity/cut. All can qualify before warning registers; ordinary order governs life, guard and interruption.                                                                                             |
| Duplicate callback/receipt recovery | Exact execution/outcome/life returns its committed result, without repeating damage, guard consumption or reaction. Wrappers are not new contacts.                                                                           |

**Future-family gate.** A sweep, burst, piercing/ricochet or persistent-volume family must define native ordered contacts, lifetime and complete harm review before opting in. Its owner must enforce first designated direct outcome per execution and actual victim life; repeated contact/re-entry cannot mint bonuses. A sweep can amplify once per distinct victim. For a multi-carrier burst, the native family designates its first released carrier before any release; only that carrier may amplify. Later releases cannot inherit a missed/blocked opportunity or mint one by splitting groups, even if they arrive first. Each actual victim has its own cut. Required consumption records survive action ending while its released contacts can still arrive. Add this bookkeeping with the real producer, not to current single-contact records.

Expected designated outcomes still spend the opportunity. A later unexpected but non-designated actual contact may supply a distinct D cause without additional amplification.

### Permission and lethal review

Extend combat-consent attack facts and exact review receipts to include the bound profile/policy and maximum allowed direct surprise injury. Compute the existing death-risk/confirmation predicate against that upper bound with the existing target susceptibility/scar and harm-policy facts; do not discount a possible shield or inspect private warning/preparation. The confirmation is therefore stable across hidden awareness changes. If a materially relevant attack policy/body/review fact changes before commitment, the existing stale-review path requires fresh review.

Both unphased and phased melee revalidate at their actual irreversible attempt boundary. Ranged revalidates at release and captures its immutable contact policy. After release, contact obeys that existing world/participant/collider contract without pausing the flight for a second PvP question. Intended-target permission never supplies the collateral victim's preparedness, and F does not invent a new immunity or permission exception.

Before any future multi-carrier or multi-contact family is admitted, its existing consent owner must review the aggregate maximum harm it can commit to each relevant reviewed victim, including ordinary later contacts. Three nominal-5 burst carriers with only the first amplified can total 20, not merely the first carrier's 10. Such unsupported families remain disabled until both consumption and aggregate review are defined.

A rejected/expired admission cannot warn solely because it was proposed. If the person visibly performed real preparation before later cancellation, observers can retain that real warning; cancellation does not erase already perceived conduct.

## Deterministic chronology examples

All **t** values below are normal-speed seconds for readability. Implementation stores their converted SimTime values; with the present clock t = 1.20 means 72 simulation seconds. The selected lead is 0.20 normal seconds, retention six and settling two. Every cut is an actual immutable acquired-membership boundary, not a database filter for dates.

| Case                                         | Actual chronology and permitted cut                                                                                                                                                                                                         | Required result                                                                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T01 — visible wind-up                        | Real visible wind-up acquired at 1.00; registration uninterrupted; melee attempt/contact cut at 1.30 includes that fact.                                                                                                                    | Expected. A failed evasion still permits ordinary damage.                                                                                                                       |
| T02 — warning just too late                  | Same acquisition at 1.00; contact cut at 1.19.                                                                                                                                                                                              | Surprising, because registration is incomplete.                                                                                                                                 |
| T03 — exact ready boundary                   | Same acquisition; native registration deadline is settled before the cut at 1.20.                                                                                                                                                           | Expected. A cut at 1.199 remains surprising; no frame-size rounding chooses the result.                                                                                         |
| T04 — unseen archer, seen arrow              | Release 1.00 unseen; genuine flight acquisition 1.10; contact 1.35.                                                                                                                                                                         | Expected without identifying/localizing the archer. Insufficient physical travel time to evade is irrelevant to qualification.                                                  |
| T05 — very fast expected arrow               | A relevant warning was registered before release at 1.00; contact 1.03.                                                                                                                                                                     | Expected even though this flight alone could not provide registration.                                                                                                          |
| T06 — same-impact evidence                   | Contact cut 2.00 has no warning; impact/sound/body event is acquired only after that cut at 2.00.                                                                                                                                           | That contact is surprising. Its newly acquired warning can mature at 2.20, never retroactively at 2.00.                                                                         |
| T07 — measured versus acquired               | Physical cue occurred/measured at 0.50, but observer actually acquires it at 1.10; contact 1.20.                                                                                                                                            | Surprising. Registration starts at acquisition, not measurement.                                                                                                                |
| T08 — delayed interpretation                 | Suspicious movement acquired at 0.50; an actually accepted danger interpretation enters at 1.10; contact 1.20.                                                                                                                              | Interpretation has insufficient lead. AI receipt or later evidence cannot backdate preparedness to 0.50.                                                                        |
| T09 — late confirmation                      | Continuous source measured from 1.00; a confirmation available only at 1.40 spans that interval. Contact cut was 1.20.                                                                                                                      | The 1.40 confirmation is excluded from the earlier cut, even if its measured interval covers 1.20.                                                                              |
| T10 — ordered events at one timestamp        | Cut K at 3.00 contains occurrence A acquired before K; occurrence B has an earlier event timestamp/order but was not yet acquired; contact C produces nested evidence after K.                                                              | Only A belongs. Awareness.sequence, event timestamps or the enclosing event's order cannot add B/C to K.                                                                        |
| T11 — guarded doorway                        | Actual shield method starts 1.00; native readyAt 1.25; E preserves the actual method start; contact 1.26 approaches inside current coverage.                                                                                         | Expected after max(1.20, 1.25). Hidden attacker identity is unnecessary. If contact occurs at 1.24 and no other warning exists, preparation is insufficient.                    |
| T12 — finite watch                           | Fulfilled anticipation of the entrance begins 1.00, lead completes 1.20, work ends 3.00. No warning was ever acquired.                                                                                                                      | Covered contact 2.99 is expected. At exactly 3.00 the ended watch contributes nothing. Looking elsewhere earlier does not bank another sector.                                  |
| T13 — changed active focus                   | Watch A fulfilled from 1.00; at 2.00 a real focus change breaks it and new focus B begins. Contact from A at 2.10, with no warning.                                                                                                         | Old A coverage is gone and B has not earned lead. If existing B/E semantics permit a continuous compatible refinement, they must prove it, not assume it from label similarity. |
| T14 — retained attack                        | Last fresh directed warning 10.00, registration complete 10.20, no more threat or preparation.                                                                                                                                              | Retained until 16.00, then settling until 18.00. Cut 17.99 expected; cut exactly 18.00 unwary.                                                                                  |
| T15 — scoped preparation interrupts settling | A scoped entrance warning last qualified at 10.00; a maintained method covering that entire same entrance scope exists 17.00–19.00.                                                                                                         | Settling restarts at 19.00 and ends 21.00. Broad self-assault warning is not extended by work; unrelated hunting or a merely overlapping sector cannot delay it.                |
| T16 — new matching warning                   | T14, plus a genuinely fresh matching attack warning at 17.50 while expectation remains registered.                                                                                                                                          | Renewal has no artificial registration gap; lastQualifiedAt becomes 17.50, final quiet reset 25.50 if nothing else happens. Original source dates remain unchanged.             |
| T17 — warning after full expiry              | T14, new warning acquired 18.10; contact 18.20.                                                                                                                                                                                             | Earlier continuation has ended; new registration is not ready until 18.30. Contact is surprising absent another method.                                                         |
| T18 — simultaneous attackers                 | Two independent actual contacts at 5.00, ordered by native owners, with no prior warning/preparation.                                                                                                                                       | Both may qualify; first impact has zero elapsed time to prepare for the second. Death/one-use guard/interruption still resolve in order.                                        |
| T19 — staggered attackers                    | First surprising contact 5.00; felt evidence acquired afterward; second contact 5.10, third 5.21. Body remains eligible.                                                                                                                    | Second can also surprise. Third is expected from registered self-assault evidence, even from an unknown opposite direction.                                                     |
| T20 — rest and wake                          | Registered warning before rest; general perception becomes blocked at 6.00. An unexpected contact at 7.00 wakes the body through ordinary injury.                                                                                           | Pre-rest continuation is retired. Waking contact is surprising; post-wake actual acquisition can begin registration, no earlier than 7.00.                                      |
| T21 — approach before actual strike work     | Strike admitted 0.00; approach ends and actual wind-up begins 2.00. The method is fulfilled but its 0.20 lead is not earned until 2.20.                                                                                                     | Admission time cannot earn the lead. A counterattack cut at 2.10 needs other valid preparedness. Current guard admission itself has no approach phase.                          |
| T22 — release before loss                    | Shot released 1.00 under policy P; shooter dies/changes control at 1.10; actual collider contact 1.50.                                                                                                                                      | Continue flight under P and its saved source life/origin. Capture actual victim at 1.50, without re-reading current shooter stats or intended-target readiness.                 |
| T23 — speed and pause                        | Cue acquired at normal-equivalent 1.00; pause at 1.10 for ten wall minutes; resume at 8× until 1.20.                                                                                                                                        | Pause adds no lead. Registration completes at the same SimTime; it takes less active wall time at 8×. Save/reload preserves it.                                                 |
| T24 — work not complete                      | Contact boundary needs a due acquisition, preparation capture or D resolution that returns incomplete.                                                                                                                                      | Do not commit a guessed ordinary/2× hit. Hold the required native continuation at its coherent prefix and resume with the same cut/identity rules.                              |
| T25 — guard consumed, expectation retained   | Mature entrance guard; covered contact and its acquired evidence at 5.00 consume guard; second same-approach contact 5.10.                                                                                                                  | Both expected. Only first receives physical guard reduction. New opposite-direction danger before broad registration at 5.20 needs its own basis.                               |
| T26 — immediate counterattack                | Mature strike against A commits 5.00, own result acquired and recovery begins; A counters 5.10.                                                                                                                                             | Finite own-offense expectation makes the counter expected; recovery may prevent defense. Unrelated B can still surprise without another warning.                                |
| T27 — prolonged fight then brief occlusion   | A's directed attack acquired 0.00 establishes broad and permitted exact-source support; mature maintained aim toward A continues through 10.00 without another committed attempt/release, then breaks as A passes behind; A contacts 10.10. | Broad support may have expired at 8.00; narrow A support's settling starts at 10.00 and ends 12.00. Same A is still expected without current sight.                             |
| T28 — repeated inference from one rustle     | First current danger meaning admitted 1.00 from root R; its continuation ends 9.00. A new equivalent inference over R is admitted 10.00.                                                                                                    | No renewed/reopened warning. New wrapper/time/region wording is not fresh physical support; a real new cue or deliberate current method can still matter.                       |

A cue acquired at exactly the contact timestamp can belong to the cut only if its real native acquisition is earlier in the canonical order. With the selected positive lead, a new uncredited warning at that timestamp still supplies no matured warning. A genuinely pre-existing registered scope can renew at that boundary. Paused UI/provider work cannot create elapsed simulated time, and delayed optional cognition does not postpone native registration.

## Save, invalidation and correction

### Current-format durable state

Extend existing owners together, preserving their save graph:

| Existing owner                                   | Authoritative extension / restore rule                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PersonalEncounters known pair or anonymous entry | WarningKey, exact observer/source life where permitted, coverage, original acquisition boundary/time, current supporting revisions, registration phase/start/ready, lastQualifiedAt, continuous confirmation boundary, retention/settling, timing policy/clock/durations, reduced credited scope and consumed-root disposition. Full admission proof is transient. No parallel threat collection. |
| Existing active action and its preparation owner | Actual current-method start/fulfillment/break per (work, physical family), admitted F policy/clock/lead, native identity and accepted orientation/plan revision. Persist or reconstruct only from committed authoritative work, never from a guessed action age. The settled SA-D03 field is required in each applicable family adapter.                                                                       |
| ProjectileFlight                                 | Existing release/collider permissions, source life and controller-at-release, attack policy pin, committedOrigin and existing terminal outcome/stage receipt. Keep trajectory, launchedAt/advancedAt, remaining range and all existing pins.                                                                                                                                                      |
| Existing attack/contact outcome                  | Frozen decision, actual arithmetic, exact victim life, cause/outcome ordinal and spent-slot receipt. Terminal publication is derived from this committed result rather than another application.                                                                                                                                                                                                  |
| D status/contribution/reaction receipt owner     | Its selected body effect and exact onset/no-effect receipt. F stores no duplicate fear value or timer.                                                                                                                                                                                                                                                                                            |
| Existing due-work indexes                        | Rebuild nearest deadlines/candidate indexes from valid authoritative records; no wall-clock deadline or serialized client readiness cache.                                                                                                                                                                                                                                                        |

The save boundary contains either the pre-contact coherent state or the committed contact/effects/receipts and required evidence continuation. It cannot contain health damage without the opportunity receipt or a spent opportunity without its real outcome. A crash/retry cannot move a contact from surprising to expected by treating its own saved event as earlier warning.

A partially advanced flight restores at its saved position/advancedAt and retains its **release origin**, not the restored current position as a replacement origin. It resumes the original carrier; no fresh launch or new action ID is minted. A saved registering warning has exactly its remaining simulated time; a saved ready/settling warning keeps its original boundaries.

No old save reader, version migration, dual record shape, compatibility alias or fallback default is selected. Current writers, readers, validators, native reconciliation and projections change together, as required by the repository contract.

### Invalidation matrix

| Change                                           | Required handling                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observer physical life ends/is replaced          | Retire its bodily warning, pending registration and active preparation. Do not transfer receipts or readiness to ghost, corpse, respawn or another body. Historical personal knowledge has its existing separate owner.                                                                                                |
| Source physical life ends                        | Existing physical flight remains bound to the original source life. Its known-source warning can match that already released attack while otherwise eligible; it cannot match a later attack from a replacement life. Self-assault/region support retains its independent finite terms.                                |
| Same-life controller changes                     | Preserve valid body consequences and registered personal warning; invalidate controller-owned queued choices/work exactly as those owners require. No bonus reset by disconnect or possession switch, and no inherited target knowledge from a different observer life.                                                |
| General perception becomes blocked/rest begins   | Retire pending and registered bodily preparedness and invalidate method fulfillment where relevant; no dormant resurrection on wake. Re-acquired current threat may register anew without a duplicate hostility event.                                                                                                 |
| Only motion/actions/cognition become unavailable | Do not erase valid registered information. E must separately report whether its physical method still fulfills. No action capability is a proxy for consciousness.                                                                                                                                                     |
| Particular sense is lost after acquisition       | That channel produces no further cue while blocked. Already registered personally acquired warning continues if the general registration predicate remains valid; a dependent active method can fail its own requirements.                                                                                             |
| Stop/expiry/work replacement/focus change        | E's current coverage ends or changes at its actual break. CTR warning remains until its own terms end. Actual new method must earn its own applicable lead.                                                                                                                                                            |
| Equipment/profile/body geometry changes          | Existing action/guard/aim owner revalidates exact constraints. Recompute current E fulfillment; do not mutate a released flight or historical warning's geometry.                                                                                                                                                      |
| Evidence correction/source revocation/forgetting | Existing owner invalidates or reduces live derived warning support prospectively. Preserve independently valid support. Never reverse an already committed injury or bodily onset merely because its explanatory evidence was later corrected.                                                                         |
| Source reinterpreted/recognized later            | A later permitted association may improve future personal knowledge; it cannot rewrite an earlier cut, retroactively identify an old attacker or extend warning duration without fresh support.                                                                                                                        |
| World definition/policy changes                  | Precommit work revalidates its exact pins. Already committed flight retains release policy. Warning continuation uses its bound acquisition policy; newly accepted work uses the installed current policy. Unsupported/missing pinned definitions return incomplete/invalid through the owner; no silent substitution. |
| Duplicate/reordered transport/reconnect          | Native acquisition and committed outcome identity remain authoritative. Re-publication cannot start registration anew, refresh retention, consume a second guard or add a second reaction.                                                                                                                             |

Policy editing during play is not a new feature of this module. The pin rules define deterministic continuation if an existing supported authoring/correction route changes a definition. A record or policy that is malformed is rejected by current validation; do not interpret invalid data as harmless absence.

## Work, latency and performance

Surprise is native and deterministic. It never awaits a model to decide whether an acquired directed attack matters. Optional interpretations can create later scoped support only after actual admission. API/provider delay therefore cannot consume or supply simulated registration time by itself.

All required acquisition, current preparation and D mechanics must be complete at the contact boundary. Use existing coherent-prefix work/hold accounting, including a stable continuation reference and source/body/policy revisions. A stale resumed result is rejected and refreshed at the proper boundary; it cannot be patched into an older cut. If the action became invalid, follow its existing cancellation/revalidation outcome rather than completing stale harm. Complete required surprise/reaction preparation before an irreversible accuracy draw or other spending. If an existing native owner has already committed a sampled attempt/release before a later continuation hold, preserve that sampled result and its stage receipt; resume without rerolling or rolling back its saved randomness. Revalidation can cancel invalid future work, not manufacture another draw.

Evaluate only the actual victim's relevant existing encounter warning entries and complete active-work set, plus native candidate evidence already required by A/B/C. Do not enumerate all characters, query hidden attackers, replay full memory, scan all projectiles for each victim or add a second SQL/indexed threat authority. Use existing pair/anonymous retention and nextAt to prune expired derived fields, while retaining source owners' required causal receipts.

There is no new arbitrary top-N warning truncation or hard-coded combat capacity in this design. If existing admitted work cannot finish, report/hold the required continuation; do not silently drop the oldest or least convenient warning. [SUR-L05](../limits/preparedness-and-surprise.md#sur-l05--growing-work-retention-and-overload) owns the tradeoff. Bound active work through existing admission/retention and complete indexes, not by false perception.

SUR08/SUR09 must record warmed and cold-path costs for one victim, many independent pairs, many attackers against one victim, crowded shared contacts, anonymous warnings, repeated correction, long-running retention and save/restore. Measure candidate warnings visited, active methods captured, source validation work, scheduled deadlines, serialized bytes and allocation/time distributions through the actual contact path. Verify no new random draw and no unbounded retained expired support. No benchmark, measured capacity, provider run or acceptance result is claimed by these paper designs.

## Permitted player feedback

The player-experience design owns ordinary controls and presentation. F supplies permitted semantics; it does not prescribe a new key binding, HUD meter, alert color or client-side combat calculation.

```ts
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
```

These are semantic DTO requirements composed from current projection families, not instructions to create an alternative protocol authority. No raw ActorLifeRef, EvidenceRef, WarningKey, cause tuple, internal definition pin, action target binding or hidden vector is directly serialized. G must map references through A's permitted subject/evidence and existing protocol identity owners.

- **Preparing** means the accepted method is genuinely underway but its physical/readiness/lead requirements are not complete. **Maintaining** means its actual current covered method meets those requirements; it promises neither a hit block nor protection outside that scope.
- **Ended** reports actual Stop, expiry, interruption or loss of fulfillment with only personally permitted reasons. A hidden attacker outside the scope is not a reason string.
- **Not enough information** means the client cannot make the requested present assertion from its permitted complete projection. Required native work being incomplete must not be displayed as “unprepared” or “safe.”
- **Noticed / registered** describes the controlled character's own actually received warning and minimal bodily anticipation. It does not identify a concealed source or promise successful defense. G chooses accessible wording; it must not display old locations as live.
- **Caught off guard** is available only after an actual personally available contact/outcome for that character. A privately classified melee miss is not shown to an unaware victim. Another observer sees only allowed physical evidence, not this private Boolean.
- A player may be told their own actual injury/body reaction, but no enemy-readiness meter, guaranteed-2× preview, private warning countdown, automatic camera turn or hidden attacker marker is derived from F. Existing own action timing may show a guard/watch's progress; it is not a remote surprise forecast.
- The attacker's permitted aftermath can report their allowed actual contact/injury information. Private victim surprise/reason is withheld unless an existing explicit disclosure rule independently permits it. Lethal confirmation uses maximum authorized risk and never changes solely with hidden readiness.
- Full view, patch, history, reconnect, tooltip, target discovery, combat log, audio and accessibility paths must follow the same boundary. Current preparation is cleared/reconciled on actual work/life/control change; saved history keeps its original time and permitted precision.

Required UX paper cases: an entrance watch still preparing, the ready guarded entrance with unseen assailant, warning registered but arrow unavoidable, interrupted/expired guard with retained expectation, own unexpected zero-injury shield contact, a completely unperceived miss, ambiguous sound with no threat assertion, stale reconnect data and creator-to-player transition. Player qualification must show usefulness and limitation without teaching a hidden readiness score.

## Acceptance scenarios

These IDs specify future coverage, not running tests or a requirement for one separate test per row. Reuse existing real-caller scenarios and group meaningful boundary variations; one scenario can cover several IDs. Add checks only for distinct uncovered behavior/failure paths, not helpers mirroring this prose. All supported families must preserve actual native order, exact lives, source pins, normal-clock conversion and complete evidence.

### Information, preparation and defense

| ID      | Scenario                                                           | Required assertion                                                                                                                                          |
| ------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SUR-T01 | No relevant warning/preparation; real direct hit                   | Surprised; one eligible 2× raw contact application; ordinary mitigation/body result and eligible D cause.                                                   |
| SUR-T02 | Rear strike during registered anticipated fight                    | No new surprise solely from angle/current sight loss. Directional shield can still fail.                                                                    |
| SUR-T03 | Known friendly person attacks without prior readable cue           | Familiarity does not prevent surprise. Do not require an enemy label or combat initiation flag.                                                             |
| SUR-T04 | Stranger visibly winds up with sufficient acquired lead            | Expected despite unfamiliar identity; preserve uncertainty about motive/name.                                                                               |
| SUR-T05 | Guarded unknown doorway                                            | Matching maintained preparation prevents surprise without a source association. Uncovered height/direction/path does not inherit protection.                |
| SUR-T06 | Guard only proposed/preparing, or another method still approaching | No completed preparation until actual method/ready/lead conditions hold. Other registered warning can independently suffice.                                |
| SUR-T07 | Guard becomes ready then expires/consumes                          | Exact half-open timing and one-use physical guard hold; registered warning can outlast it without another shield reduction.                                 |
| SUR-T08 | Turn head while shield faces elsewhere                             | Permitted vision can change; shield geometry does not rotate with head/camera. Shared guard/head-watch work retains independent family-specific lead times. |
| SUR-T09 | Footsteps remain subthreshold                                      | No warning, identity or startle fabricated from raw progress.                                                                                               |
| SUR-T10 | Weak cue crosses actual acquisition threshold                      | Admit only A's achieved fact; no fabricated hostility. Later scoped danger interpretation or chosen anticipation can matter.                                |
| SUR-T11 | Understood current scoped false alarm                              | Actual registration/preparation can prevent surprise within its scope without declaring the claim true.                                                     |
| SUR-T12 | Unintelligible/partial warning                                     | Unsupported meaning cannot count. A fully supported admitted meaning from heard fragments can count; F does not parse or inspect private full speech.       |
| SUR-T13 | General anxiety, old grudge or old reputation                      | No unbounded all-direction preparedness. D can affect its own mechanical parameters separately.                                                             |
| SUR-T14 | Cue early enough to register, too late to dodge                    | Expected ordinary hit; inadequate movement does not become informational surprise.                                                                          |
| SUR-T15 | Cue received less than registration lead before contact            | Surprising even if visually obvious at the final instant.                                                                                                   |
| SUR-T16 | Exact lead completion, expiry and work break                       | Match T03/T11/T12/T21 without tick-size-dependent off-by-one or guessed method-start time.                                                                  |
| SUR-T17 | Ordinary glance versus accepted anticipation                       | Observation alone grants no declared threat coverage. A genuinely acquired warning can still register.                                                      |
| SUR-T18 | Cycle watch through many directions                                | Only current active coverage qualifies; past sectors never accumulate. Registered real warning has its independent finite scope.                            |
| SUR-T19 | Immobilized/occupied/cognition-blocked but aware                   | Native registration can complete. Physical defense/method fulfillment follows its actual constraints.                                                       |
| SUR-T20 | Rest with general perception block                                 | Pending and registered bodily continuation retire; no sound-wake or old-warning auto-resume; waking contact cannot warn itself.                             |

### Projectile and contact arithmetic

| ID      | Scenario                                                   | Required assertion                                                                                                                                                                                                                                |
| ------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SUR-T21 | Flight acquired, archer/release unseen                     | Actual supported incoming-flight cue can register; no source identity or hidden intended-target inference.                                                                                                                                        |
| SUR-T22 | Archer seen but actual attack preparation hidden           | Mere presence/weapon/name does not count as a readable attack cue.                                                                                                                                                                                |
| SUR-T23 | Early release sound versus nonexistent whoosh              | Only an implemented authored cue actually acquired can warn. No automatic generic flight sound or sound-propagation delay is invented.                                                                                                            |
| SUR-T24 | Prepared intended target, unwary collateral victim         | Actual collider's cut governs. Intended readiness is neither copied nor shared.                                                                                                                                                                   |
| SUR-T25 | Unwary intended target, prepared interceptor               | Actual interceptor can avoid multiplier using their own work/evidence and real shield. No phantom contact shock on the protected person.                                                                                                          |
| SUR-T26 | Shooter dies/leaves/transfers control in flight            | Release pins/source life/trajectory/contact policy persist; no current shooter re-read or second confirmation.                                                                                                                                    |
| SUR-T27 | Source origin versus advancing projectile position         | Origin-region warning matches immutable release origin; approach warning uses actually traversed supported path. Save/reload preserves the difference.                                                                                            |
| SUR-T28 | First designated melee miss then repeated contact callback | Miss spends opportunity but deals no damage; replay cannot produce a later amplified hit or shock.                                                                                                                                                |
| SUR-T29 | Zero nominal injury / full body mitigation / health cap    | Slot spending, raw amplified amount, applied flag and final body health loss remain distinct and consistent.                                                                                                                                      |
| SUR-T30 | Shielded qualifying contact                                | Multiply raw eligible component before existing shield reduction; shield consumption/recovery unchanged. Zero health loss can still have an unexpected-contact cause.                                                                             |
| SUR-T31 | Multi-component contact                                    | Eligible bundle amplified once; no total-plus-component duplication or amplification of later poison/burning/bleeding.                                                                                                                            |
| SUR-T32 | Future sweep/burst/piercing owner                          | Family stays unenabled until its owner defines designation, once-per-life consumption, lifetime and aggregate review. Later carrier/group/re-entry cannot mint/inherit an opportunity; current single-contact records need no speculative fields. |
| SUR-T33 | Independent simultaneous volley                            | Independent qualifying attacks can each amplify before any warning matures; ordinary deterministic collider/death/guard ordering remains.                                                                                                         |
| SUR-T34 | Terrain stop, range expiry or wholly unseen miss           | No fictitious damage, contact startle, victim warning or enemy identity. Actual audible/visible cue follows A/C separately.                                                                                                                       |

### Continuity, emotion and agency

| ID      | Scenario                                                    | Required assertion                                                                                                                                                                                       |
| ------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SUR-T35 | Changing attackers after self-assault registration          | Finite ordinary-assault expectation covers ordinary third-party intervention without naming/targeting them.                                                                                              |
| SUR-T36 | Betrayal while already braced for ordinary assault          | No guaranteed fresh physical multiplier from changing allegiance; later emotional/social interpretation remains independent.                                                                             |
| SUR-T37 | Hunter aiming at quarry, ally attacks                       | Own scoped offensive work does not grant universal preparedness. Actual relevant warning/preparation alone can prevent surprise.                                                                         |
| SUR-T38 | Brief hide/return, camera turn, weapon swap, Speak/Stop     | None erases registered warning; stopping real preparation removes only its current coverage.                                                                                                             |
| SUR-T39 | Genuine unwary return                                       | Six plus two expire exactly; only fresh evidence/continuous confirmation renews broad self-assault, while full same-scope preparation may postpone scoped settling. New warning then needs a fresh lead. |
| SUR-T40 | Matching new warning / unrelated new warning                | First can renew registered matching scope; second cannot refresh other evidence or backdate acquisition.                                                                                                 |
| SUR-T41 | Correction of one of several supports                       | Only dependent future support invalidates; independent warning still works; committed injury/startle remains.                                                                                            |
| SUR-T42 | Current warning replayed as memory/reflection/event wrapper | No new registration, retention renewal, hostile occurrence or bodily onset.                                                                                                                              |
| SUR-T43 | Unexpected contact plus earlier abrupt cue                  | D handles real distinct causes and maximum aggregation. F adds no fear factor or same-impact feedback.                                                                                                   |
| SUR-T44 | Contact shock, same-timestamp later attack                  | It cannot alter its own completed mechanics or an earlier released shot/evasion; it may affect a genuinely later appropriate sampling boundary.                                                          |
| SUR-T45 | Generalized fear with ranged danger heuristic               | Selected conditionAdjustment none prevents accidental double penalty. Walking/running speed remains unchanged by F/D fear.                                                                               |
| SUR-T46 | Fatal surprising contact                                    | Original life receives terminal no-effect D receipt, no active shock on dead/new body; harm and outcome remain coherent without retries.                                                                 |
| SUR-T47 | Native memoryless animal                                    | Same fair warning/cut rule, compact existing CTR/native references, no AI/cognition/memory prerequisite or second danger map.                                                                            |
| SUR-T48 | Autonomous human accepts/refuses warning response           | Registration remains native; choices remain independent. No forced guard/flee/attack or interpreted emotion outside the owning accepted producer.                                                        |
| SUR-T49 | Deliberate noisy diversion                                  | Actual investigation may open an escape route; registered scoped danger may remove surprise within that scope. No forced facing or erased warning.                                                       |
| SUR-T50 | Voluntary watch handoff                                     | Incoming watcher must actually accept/fulfill/earn lead. Outgoing work ends on its own boundary; a promise does not transfer readiness to another body.                                                  |

### Persistence, fairness and adversarial work

| ID      | Scenario                                                          | Required assertion                                                                                                                                                                   |
| ------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SUR-T51 | 1×/3×/8×, pause and different native step subdivisions            | Equivalent simulated chronology yields identical qualification, slot use, harm and effect timing. No wall-clock/provider latency substitution.                                       |
| SUR-T52 | Save during registration/settling/flight                          | Restore original deadlines, release origin, pins and continuation; no extra warning time, fresh launch or slot reset.                                                                |
| SUR-T53 | Save/retry around body mutation and nested events                 | Recover exactly pre-contact or committed coherent state; never damage twice or let saved impact warn itself.                                                                         |
| SUR-T54 | Incomplete A/E/D or stale resumed work                            | Hold/reject through existing native work path; no missing-evidence-as-empty, zero fear or automatic 2×/1× fallback.                                                                  |
| SUR-T55 | Observer/body/source/controller identity substitution             | Exact life and owner revisions reject cross-life reuse. Same-life control transfer preserves physical history without inheriting another observer's private state.                   |
| SUR-T56 | Policy/equipment/body pins change before commitment               | Existing revalidation/review invalidates stale work. After release, flight remains bound to valid committed policy.                                                                  |
| SUR-T57 | Forged multiplier/preparedness/claim/target IDs from client/model | Only trusted native producers can create bindings and warning/preparation outcomes; invalid input is not silently normalized.                                                        |
| SUR-T58 | Same source/different wrappers or delimiter-collision keys        | Structured exact tuples deduplicate true repeats while preserving distinct real contacts.                                                                                            |
| SUR-T59 | PvP lethal confirmation toggled against hidden readiness          | Prompt/risk basis remains the same maximum authorized harm; no awareness oracle, forgotten 2× bound or contact-time re-prompt.                                                       |
| SUR-T60 | Many attackers/anonymous warnings/long-running corrections        | Complete local traversal and bounded existing retention; no hidden global scan or silent warning truncation. Measure real hot path, not only helper complexity.                      |
| SUR-T61 | Full/patch/history/reconnect/tooltip/audio/creator transition     | Private victim readiness and hidden source geometry never leak through any projection or stale cache.                                                                                |
| SUR-T62 | World omits F or changes supported senses/coefficients            | Clean omission gives ordinary combat; installed invalid/incomplete policy does not masquerade as omission. Alternate-body warning remains actual.                                    |
| SUR-T63 | Consent refusal/cancel before attack                              | No invented attack consequence. Actual previously observed physical preparation remains valid evidence of what occurred.                                                             |
| SUR-T64 | Spatial uncertainty / vertical separation / cone apex             | Original frame/uncertainty retained; no infinite-ray/wall shortcut or all-direction cone match at the victim's contact point.                                                        |
| SUR-T65 | Guard consumed by an expected contact                             | Acquired confirming attack carries already mature scoped anticipation; the next covered attack is expected despite no remaining shield. Unused guard expiry creates no such support. |
| SUR-T66 | Own attack enters recovery before a counter                       | Actual mature committed offense preserves finite exact-opponent expectation; unrelated betrayal remains separately surprising. Proposal/cancel grants nothing.                       |
| SUR-T67 | Long fight, expired broad warning, brief rear/occlusion           | Narrow exact-source continuation survives through its specified settling; no fresh bonus solely from current sight loss. Unrelated hunting cannot sustain it.                        |
| SUR-T68 | Repeated old-root inference or destructive pair replacement       | New inference IDs cannot refresh old roots; pair/re-exposure replacement preserves valid same-owner warning without rebinding old source life or exposing a stale target.            |

### Playability gates beyond correctness

SUR09 must observe an uncoached player using a warning, finite entrance watch, defensive handoff/interception, failed ambush-to-escape and a native-animal hunt with an ordinary useful outcome. Compare preparation's actual attention cost with the ordinary route; a useful plan is allowed to succeed decisively. Record whether players understand “expected but unavoidable” and “readiness ended,” whether repeated waiting/retargeting is burdensome, and whether recovery permits a meaningful escape.

Run **The toll tower at dawn**, **The companion who changes sides**, **The quarry that learns**, **The wolf at the school gate**, and **The household after the victory** from the repertoire as composing scenarios where their prerequisites exist. Include a refused or missed warning, an uncovered path, and an encounter that ends peacefully or by leaving with the objective. Mechanical correctness alone does not prove that 2× or the initial lead/retention is fun or fair. Tuning changes go through the authored policy/limits owner and rerun the affected boundary/scenario acceptance.

## Cross-project integration requirements

### Incoming-flight producer

A's **observed-motion** detail carries B's two actually received location samples for one permitted exposure, its sampled correspondence result, original FactKeys and captured confirmation support. Each sample retains its LocationEvidence, observation frame and ordered measurement time; current-facet `valueAcquiredAt` and acquisition-boundary membership establish when the second value really became available. The active exposure keeps at most its latest two samples; this adds no trajectory log or projectile-knowledge store. B's ordinary active-local sampling law supplies those measurements; a surprise cut only captures existing received support.

The world danger adapter classifies a possible incoming physical-object threat from that acquired motion, then F admits its warning. It does not reinterpret generic location as a velocity, request an extra contact-time sample or read hidden flight state. Preserve both location uncertainty volumes and the observer's own corresponding body poses. Require:

1. Valid received continuity without a gap, teleport or hidden canonical-identity join.
2. Conservative closing: the greatest possible current separation under the received uncertainty is smaller than the least possible previous separation.
3. At least one positive forward continuation of the **received relative-displacement cone** intersects the observer's current own-body envelope.

This establishes a personally supported **possible incoming threat**, not a prediction that a collision will actually occur. Use only received displacement and existing spatial geometry; do not read hidden intendedTarget, private canonical velocity, future path/turns or the later collider. If uncertainty cannot establish closing/continuity, produce no automatic incoming-projectile warning; an actually chosen scoped E precaution can still use the ambiguous cue. Existing spatial comparisons own tolerances. Do not add an arbitrary confidence percentage, reaction distance or F-specific motion sampling cadence.

The danger adapter retains A's real supporting FactKeys, original uncertainty and acquisition boundary. Registration begins only when the complete permitted support has actually been acquired, never at the earlier measurement time or original exposure onset. Fast/briefly seen flight may therefore be too late to prevent surprise. An arrow that later misses or strikes a wall can still have been a reasonable perceived threat; it does not create false hostility attribution.

Current ranged projectilePassage already stops at real visible pre-contact passage for eligible native animals and uses nearPassObservedLives for duplicate consumption. Reuse that producer/ordinal where it supplies the actual permitted support, but that map is not an A evidence cut or a human warning fact. Current event velocity components are not automatically fine observer knowledge. Earlier general human/animal flight warning requires this B/A adapter and complete integration.

### Ordinary spoken warning producer

A/SPK's native ordinary-warning adapter consumes actually received and understood phrase spans. The initial installed language pattern supplies attributed testimony with `strength: possible`, `claim.kind: danger` and `presence: possible`; it does not assert physical truth. A scoped place resolves only through an exact unique match to the listener's existing permitted Known place/current received-place snapshot, retaining its bounded region and source revision. No hidden current place definition or new alias registry is consulted.

The initial “now” meaning is an approximate stated interval of two normal seconds from the original utterance time, converted once through the admitted clock. The interval is half-open: `utteranceAt <= acquiredAt < utteranceAt + convertedDuration`. At exact expiry the words remain testimony without current warning coverage. Complete acquired meaning must arrive within that interval; late cognition, replay or re-publication cannot move it. F begins registration at that actual complete acquisition boundary, then applies its own finite retention. The A/SPK producer owns the pattern and time/place grounding; F never parses raw words.

Unknown words, an ambiguous/unlearned place, ungrounded “there”/“behind you”, bare “Look out!”, incomplete relevant fragments or an expired interval remain heard testimony without automatic F coverage. A complete scoped overheard warning can qualify without identifying its speaker or addressee. The person may also choose explicit E anticipation. Qualify the complete ordinary speak → hear/understand → acquired claim → registration journey; a hand-built native warning record alone is insufficient.

### Required implementation dependencies

| Dependency              | Required agreement / implementation gate                                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A and SC02              | Preserve exact source family revisions, acquisition boundary and immutable values. Implement the settled family-owned revision contract during current-format cutover; no digest-to-number coercion.                                                |
| B/C                     | Actual visible preparation/flight detail, received pose and real authored sound; no hidden action metadata, speculative travel sound or current-position overwrite of remembered geometry.                                   |
| E and SC10              | Implement the settled current-method-start port; preserve current maintaining/coverage, exact break times and lead semantics. Full six-family capture remains complete.                               |
| CTR                     | Extend existing known/anonymous encounter records, not personalEncounter's sight-gated view. Keep recognition episode, contextual grace, native animal danger selection and surprise continuation distinct.                  |
| D and SC12              | Complete mechanics at existing sampling boundaries; exact unexpected-contact causes and no-effect receipts; selected conditionAdjustment none; local contact transaction fences nested acquisition, including fatal contact. |
| Current combat          | Both melee paths, actual projectile collider, consent upper bound, one designated opportunity, immutable release origin, existing mitigation and recovery. Unsupported future contact families remain gated.                 |
| Save/work               | Current authoritative readers/writers/validators and continuation indexes change together. Required incomplete work holds before harm. No compatibility schema or second scheduler.                                          |
| G / player experience            | Own method/received-warning/allowed aftermath semantics only, all full/patch/history surfaces and accessibility/reconnect. No private readiness oracle.                                                                      |

## Implementation decomposition and completion boundary

[SUR01–SUR09](../maintainers/preparedness-and-surprise.md) owns all task bodies, dependencies and exit criteria. Deliver one complete melee interaction, then the actual ranged/warning path, before wider qualification. Each includes acquisition, preparation, permission, contact, native startle, current-format save and permitted feedback. Complete installed inputs before enabling a path; stages do not waive scope.

Recheck affected owners on the implementation base before coding. No unresolved F product choice remains. SA-D01 is D's separate controlled-character psychological choice. SA-D02/SA-D03 are resolved: source revisions retain their family-owned exact values, and E captures the actual current-method start. Their runtime adapters remain required implementation work. Tuning and enjoyment remain open qualification work.

## Maintained records

- Behavior, player journeys and repertoire findings: [Feature specification](preparedness-and-surprise-feature-spec.md).
- Implementation/qualification tasks: [SUR01–SUR09](../maintainers/preparedness-and-surprise.md).
- Authored values and policy: [Base combat](../worlds/base/combat.md#preparedness-policy).
- Limits and adjustment tradeoffs: [Preparedness inventory](../limits/preparedness-and-surprise.md).
- Cross-project integration: [SA/SAD-F/SAI-F](../maintainers/stealth-awareness.md), [CTR](../maintainers/combat-and-threat-responses.md).
- Open player decision and resolved technical decisions: [SA-D01](../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters), [SA-D02](../../archive/05-project/open-decisions.md#sa-d02--evidence-source-revision-representation), [SA-D03](../../archive/05-project/open-decisions.md#sa-d03--preparation-lead-after-native-phase-transition).
