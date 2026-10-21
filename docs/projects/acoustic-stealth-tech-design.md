# Physical sound and acoustic stealth — technical design

| Project status | Completed through | Outstanding |
| --- | --- | --- |
| In progress | Selected design and source/repertoire review; no runtime delivery claimed | ACS01–ACS08 implementation, mechanical/scale qualification and uncoached play; shared SA-D02 disposition |

## Authority and inspected baseline

This is the implementation contract for [the acoustic feature](acoustic-stealth-feature-spec.md). [Physical sound](../worlds/base/physical-sound.md) owns the bundled movement, source, hearing, feature and response values. [ACS](../maintainers/acoustic-stealth.md) owns implementation work; [the limits inventory](../limits/acoustic-stealth.md) owns restrictiveness and evidence. Read them together with the [SC01–SC14 common contracts](stealth-awareness-tech-design.md#shared-contracts). This document specifies selected behavior, not APIs or sound sources already delivered.

The exact starting point is `codex/design-stealth-00-contracts` at `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e`. The completed `codex/design-stealth-01-perception` was read at `40805523c4a19ab7c6cc455d49d51e4a122ecae0`: [feature][a-feature], [technical contract][a-tech], [world policy][a-policy], [tracker][a-work]. Those pinned links are intentional: the acoustic branch does not merge A. The available vision branch still pointed to the common base when inspected; its shared SC06 pose/clearance boundaries apply, and this design does not wait for or merge a vision branch.

The **single physical hearing owner** generalizes existing speech acoustics. Module C produces actual sound and observer-specific physical opportunities. A acquires/accumulates, classifies, recognizes and associates. E chooses attention and investigation; F decides whether acquired evidence warns; D supplies emotional effects; G presents authorized observations and ordinary controls. Physical source metadata is not an identity proof. A reasoning-capable person does not automatically turn, interrupt or ask an AI about each sound.

**Shared implementation gate:** [SA-D02][sa-d02] proposes preserving exact owner-specific revision types because common SC02's illustrative numeric `EvidenceRef.revision` cannot express existing personal-source string digests. Keep the storage family and exact numeric native revision or exact string personal revision. Do not coerce, hash again, add an acoustic revision counter or silently amend the common contract. Resolve that shared representation before dependent implementation. The acoustic decisions below are otherwise selected.

## Existing owners and exact integration points

All paths in this table refer to the inspected base. New names below describe fields/functions to introduce within these owners, not a second service or a requirement to copy every conceptual wrapper.

| Existing seam | Present behavior / gap | Required change |
| --- | --- | --- |
| [acoustics.ts](../../packages/domain/src/acoustics.ts): `AcousticPolicy`, `acousticExposure`, `acousticReach` | Finite scalar air level, distance and transmission calculation; source policy keyed by speech volume; one detection/word tier | Factor general source-level reception and competition into this owner. Keep speech levels and partial/clear words as its speech adapter. Update strict installed-policy validation in the same change. |
| [base/acoustics.ts](../../packages/domain/src/worlds/base/acoustics.ts) | Whisper/normal/shout 40/60/75, background 28, thresholds 0/6/12 | Install the selected world profiles and retain existing speech constants; no engine-hardcoded species or stealth modifier. |
| [perception.ts](../../packages/domain/src/perception.ts): `resolveSenses`, `receiverIndex`, `speechObservers`, `speechTransmission`, `physicalSpeechExposure`, `speechExposure`, `speechPerception`, `hearsEntity` | Receiver discovery excludes memoryless actors; geometry/reach is speech-shaped; current speaker must participate | Separate physiological reception from retention. Use actual sound origin and source proof. Share geometry/receptor work with speech. Preserve `hearsEntity` as clear ordinary speech, including its existing callers. |
| [geometry.ts](../../packages/spatial/src/geometry.ts): `soundTransmission`, `soundTransmissionAtLeast` | Ordered direct crossings of actual supported sound geometry | Reuse this geometry family, extend its dependency/continuous query where needed, and keep conservative early rejection distinct from incomplete calculation. Sight obstruction/camera cutaways are not sound barriers. |
| [events.ts](../../packages/domain/src/events.ts): `recordEvent`, `emit`; [event-audience.ts](../../packages/domain/src/event-audience.ts) | Speech captures its source; non-speech audiences are visual; event order precedes nested native callbacks | Add a sound contribution on the real occurrence, prepare synchronized physical reception, acquire compact evidence before consumers, and only then materialize personal history. No duplicate sound event for an existing impact or utterance. |
| [event-observation.ts](../../packages/domain/src/event-observation.ts): `observeEvent`; [speech.ts](../../packages/domain/src/speech.ts): `perceiveSpeech`, `EventEvidence`, validation/projection | Visual/felt non-speech details; speech's hearing also rejects no-memory actors; speech payload expects words | Add permitted nonlinguistic hearing facets and sound-only speech reception. Fix both memory gates. Never fall back to raw event roles or text when words/identity were not acquired. |
| [kernel.ts](../../packages/domain/src/kernel.ts): `moveAlongPath`, `advanceAction` | Actual accepted piecewise traversal, collision/partial stops; evasion/follow/travel/escape | Produce contacts from accepted pieces and persistent body phase. Prediction/admission use the same gait/posture speed. Do not hook generic position assignment. |
| [spatial-state.ts](../../packages/domain/src/spatial-state.ts): `setSpatialPosition`, `bodyProfile`, `bodySpace`; [base/spatial-definitions.ts](../../packages/domain/src/worlds/base/spatial-definitions.ts) | Numeric body/support/headings; rest approximation; no admitted crouch or gait | Add posture/locomotion to the existing body life and pose authority. Keep standing construction geometry and current accepted variant coherent; no camera-only crouch. |
| [base/actions.ts](../../packages/domain/src/worlds/base/actions.ts): `nativeMovementSpeed`, `canHandleItems`; [evasion.ts](../../packages/domain/src/evasion.ts) | Movement rate affects execution/prediction; item handling recognizes `person`; committed evasion has fixed speed/end | Preserve body capability identity through posture. Refuse pace/posture changes during committed evasion; do not cap its saved speed and violate its timing/length invariant. |
| [flight.ts](../../packages/domain/src/flight.ts): `advanceFlight`, `landingDue`, `admittedLanding`, `flightTracks` | Real takeoff/landing/fall with captured contact; visual events | Add landing sound at actual support using pre-clear relative impact velocity. No footfalls in air. Wing sounds require their own admitted profile. |
| [ranged.ts](../../packages/domain/src/ranged.ts): `advanceProjectiles`; kernel `commitContactImpact`, `struck` | Real projectile/body/terrain impact and living-target strike | Emit at actual contact even after the causal actor disappears. A missed swing has no impact sound. A future swish is a separate authored producer. General strike-stone/destruction actions are not thereby implemented. |
| Kernel `startWork`, working-stage `advanceAction`, `completeAction` | Actual preparation/manufacture and analytic stationary work | First sustained work adapter is admitted Clean fibers; source covers its actual working stage. An authored beat uses real work progress/cadence, never number of update callbacks. |
| Existing active-fire/material/heat owner | Actual lit/fuel state, no persistent acoustic source | Bind the selected fire interval to that owner and its actual end/change deadlines; source creation is not a new environment simulator. |
| [native-response-controller.ts](../../packages/domain/src/native-response-controller.ts), [native-response-navigation.ts](../../packages/domain/src/native-response-navigation.ts), [native-response-refuge.ts](../../packages/domain/src/native-response-refuge.ts) | Existing native alarm/escape/settling/blocked controller; no sound intake | Add one narrow acquired-cue intake, saved repetition/presence state and pending anonymous-sound leg within the existing episode. Preserve complete danger/refuge navigation. |
| [temporal-boundaries.ts](../../packages/domain/src/temporal-boundaries.ts): `nativeInterval`; [motion-boundaries.ts](../../packages/domain/src/motion-boundaries.ts): `nativeMotionInterval`, `physicalObservationTracks`, `sensoryCrossingBound`, `reconcileCrossings` | Existing mechanical/sensory deadline composition | Add contact, source, reception and A crossing deadlines here. No acoustic frame loop, clock or scheduler. |
| [dependencies.ts](../../packages/domain/src/dependencies.ts), [draft.ts](../../packages/domain/src/draft.ts): `sensoryDraftWrites` | Typed mutation/dependency notices and audit | Cover new source/contact/posture/equipment/sense writes and both old/new affected regions; unknown coverage rebuilds conservatively. |
| [experience.ts](../../packages/domain/src/experience.ts), [server world records](../../apps/server/src/world-records.ts), [record schema](../../apps/server/src/world-record-schema.ts) | Existing experience/source persistence and current world encoding | Retain compact native evidence independently of memory; add exact body/source/episode fields, validators, SQL/current-record bindings and continuation lifecycle together. |

The existing geometric cache of 256 sources × 256 targets is a reuse limit, not a hearing audience cap. The current `appendEvents` behavior can persist a full event whenever an audience exists; merely suppressing footstep narration would still grow history per contact. The compact retention change below is required, not an optional later optimization.

## Physical source contract

### One actual occurrence, separate performer and emitter

Reuse `WorldEvent` occurrence ID/order/time, `DefinitionPin`, exact physical-life references, spatial positions and existing action/environment provenance. Introduce an optional physical sound contribution on an existing occurrence; allocate an ordinary occurrence when a foot contact has no other event. A contact is real even if no one hears it. An evaluation/retry is not an occurrence.

| Private field | Required meaning and validation |
| --- | --- |
| Original root | Existing event occurrence for an impulse; actual action/environment/body source start and exact owner revision for an interval. Distinct real contacts have distinct occurrence roots. A relay/recording would also preserve its original learning lineage, but is not installed initially. |
| Cause | Optional existing action/result/performer reference explaining causation. It is not the emitting body's current location or public identity; a projectile may outlive its shooter. |
| Source ownership | Exact physical owner/life, producer family and profile pin, contact ordinal or activity generation. A detached occurrence remains valid after its original actor's departure. Reuse of an entity ID in a new life never continues an old gait/producer. |
| Physical origin | XYZ and contact/source anchor at the occurrence, or admitted piecewise source track over the actual interval. Include accepted support/contact and geometry revision privately where needed. Do not recompute old origins from the actor's current position. |
| Envelope | Discriminated impulse `{at, occurrence}` or interval `{startedAt, from, through, sourceRevision}`. Impulse has no duration. Interval coverage is half-open; an active unended interval must have its current valid physical segment and owner deadline, not infinity as a serialized number. |
| Emission group | Components physically combined at one co-located contact/process. Foot/gear contact at that contact forms one group for energy, features and self-exclusion. Separate simultaneous sources stay separate even if they share a performer. |
| Signal | Finite reference SPL at 1 metre, propagation medium/reference pin, scalar source feature family/value vector and surviving-feature fidelity. Optional voice-identity vector uses its separate pinned family. Values are authored physical properties, not entity-ID hashes. |
| Dependency proof | Exact definition, source/body, accepted path/support, equipment aggregate, geometry, clock conversion and lifecycle revisions used. Current cache tokens do not replace durable original source proof. |

Every reference level must satisfy the installed acoustics finite range (the present admitted range is −120 through 200 dB). Transmission and fidelity are finite `[0,1]`; vectors use their family's finite feature list and range. Required missing profiles are an install/admission error or unsupported producer, never a guessed profile based on English names. Zero transmission returns a blocked exposure with null level/quality rather than `−Infinity`. Absence of an installed emitter is not evidence that its future physical family is inherently silent.

The initial provider is scalar direct-path airborne sound with no travel delay, reverberation, frequency spectrum or fluid/structure propagation. It supports installed bodies and processes, not every physically possible source. The general source schema can be used by a future breaking transition, machinery beat or wing profile once that owner supplies real occurrence/coverage. It does not claim those actions exist now.

### Actual contact production

The locomotion/body owner stores `{profile pin, normalized cycle phase, next contact ordinal}` for the current exact body life. The phase is in `[0,1)`; ordinal is a nonnegative safe integer using the existing integer-allocation/overflow refusal rules. It is independent of `Action.motionSampleRemainingMetres` and animation. A profile has a positive finite cycle distance and one to eight ordered contact offsets in `(0,1]`; equal offsets form a single simultaneous contact group with stable contact labels.

For each accepted traversal piece:

1. Obtain the original path's actual XYZ/support segments, their accepted distance, speed and time interval. Split at turns, support/material changes, actual collisions, pace/posture changes and flight transitions. Do not replace the path with its endpoint chord.
2. Determine the next installed offset beyond the saved phase and its distance. Add that contact to `nativeInterval`/motion boundary composition. A large requested advance cannot jump over it.
3. Advance all affected bodies to that physical boundary. Record the contact origin/time on the accepted segment and combine actual sole/body/support and coupled gear contributions. At a material seam, use the support owner's existing accepted-point tie rule. No rejected distance earns phase.
4. Advance ordinal and phase once with the accepted contact transaction; retain residual phase across stops, route changes, follow updates, yielded work and compatible command replacement. Profile changes preserve normalized phase, while the next cycle uses the newly admitted distance. Do not reset just before a loud contact.
5. A new body starts immediately after its initial contact, producing no free step merely for starting an action. Teleport/editor/recovery position assignment earns no travel; it leaves phase suspended until real ground travel resumes. Ground-to-air motion stops contacts. Landing is its own actual occurrence, not a fictitious travel distance.

The first world uses grouped human/animal contacts, including a hare's bound and the small bird's ground travel. Additional legs do not imply one sound per human foot. Contact profiles can share signatures; the listener cannot identify a species from a private body key. Existing `.4 m` native wandering is processed through the same actual-distance phase, including the case where several short wanders eventually cross one contact.

Quiet pace and crouch follow the selected world law. Ordinary speed remains the underlying current effective rate; speed constraints use the most restrictive cap. Evasion's committed speed/end is pinned: changing pace/posture during that action is refused, and it keeps its admitted contact profile. Another action that locks stance supplies its own normal refusal/interruption. New posture uses the current person's capability identity, not a new incompatible body ID. Construction stores the standing living profile; accepted variant geometry is derived/validated under the same body owner and must agree on restore. Do not let repeated crouch/stand multiply already-crouched dimensions.

Posture work occupies the ordinary physical action lane. The old body remains authoritative until completion, when support/clearance and existing equipment compatibility are revalidated atomically. Refusal/cancellation retains the old posture. Actual accepted geometry invalidates route, reach, sight/ear anchors and source predictions together. C owns the posture, B the gaze/visibility consequences; preserve or clamp accepted gaze through the joint pose owner, not a camera writer. Current equipment ports have no local coordinates: accurate long-item extension clearance is not claimed by this slice.

### Equipment, impacts and interval producers

Derive one immutable movement/handling aggregate for an actual carrier from installed components, quantities, custody/attachment and admitted enclosure transmission. Reuse the ownership/possession index. Cache by those exact dependencies, never by inventory display text. Rebuild on actual equipment/custody/quantity/fastener/material/definition changes before the next contact; do not scan all world items at each step. A carrier's complete private holdings can participate physically without disclosure. A profile has separate movement and handling reference levels; initial examples set handling equal to their listed movement reference before the posture handling adjustment.

Combine the energies of coupled co-located components and use their energy-weighted physical feature vector. The contact's single group must not mask itself once per component. Self-attribution can use actual proprioceptive ownership under A's self-knowledge contract; it cannot identify another unseen carrier. An explicitly attached or contained component is not duplicated as a free-standing sound producer for the same motion.

For body/tool/projectile impact, use actual accepted contact material and origin. Capture the closing speed relative to the support along the contact normal before fall state is cleared; convert simulation-speed units once. Missing contact, dry-run action availability or canceled windup produces no impact. Existing attack/impact events carry the sound contribution, retaining their original outcome/cause and source root. A future destruction adapter must bind the actual break transition and preserve its outcome; C does not make a living-target strike into general object destruction.

An interval producer is a component of its existing action/body/environment owner: profile pin, active generation, original start, current physical segment, consumed prefix and next owner change/end. Clean fibers binds only to the admitted working stage; fire binds to actual burning state; foliage binds to actual moving overlap with an installed contact volume. Grass support under feet and a surrounding brush volume are distinct inputs and can coexist. A standing body in foliage emits no movement-rustle interval.

Starting, stopping, blocking, changing speed, leaving vegetation, losing fuel and cancellation settle the preceding interval under its old profile, then atomically change the source. A new callback is not a new interval start. A work beat has an installed phase/cadence in real accepted work progress; analytic work coarsening must preserve those actual contacts or equivalent interval coverage. Captions, synthesizer output, streamed text and remembered descriptions never create duration or masking. There is one speech occurrence and one physical group per committed utterance, through its present speech owner.

## C to A: physical opportunity, proof and permitted signal

### Three representations

1. **Private physical preparation:** complete source proof, geometry, simultaneous sources, hidden positions and exact body/item causes. Only physical/source owners and trusted validators receive this.
2. **Native A acquisition input:** opaque exact original source binding plus measured coverage, immediate/weak admission and only the received features/location that this listener can support. A's classification/recognition receives the permitted signal payload; the opaque private binding is for deduplication, correction and causal verification only.
3. **Recipient-facing evidence:** A's actual acquired `SensoryEvidence`, facets, permitted location/association and authorized speech content. Personal history, AI input and G projection receive this version. Neither source role nor source coordinates are a convenience field here.

No consumer may unwrap a private event's actor ID to call a sound “Ada,” “the hare,” “a burglar,” “metal armor” or “behind the storeroom wall.” A sound-like hypothesis is an inference from received features. Known words/names, visual body association and believed speaker identity have separate proofs. C never calls the canonical person resolver on behalf of a listener.

### Exact adapter fields

Use A's existing conceptual `ObservationResult`, `SensoryOrigin`, `ObservationFrame`, `InstalledReceivedFeatureSample`, `ExposureRef`, source lineage and current revision families. The physical adapter requires these values, whether passed as arguments or one private record:

| Field | Exact contract |
| --- | --- |
| Observer | Current actor and exact physical life, installed receptor/sense pin, current eligible participation/awake state. No memory requirement. An unsupported hearing medium is `unsupported`; a completed eligible test below threshold is `not-detected`. |
| Original support | One occurrence root for an impulse, or exact original continuous owner/segment/generation with `[from,through)` coverage. A mixture carries the actual support roots privately without inventing another world occurrence. |
| Evaluation proof | Relevant source, receiver, geometry, mask-scene and policy revisions; source measurement time and actual acquired time are separate. Preserve exact original timestamps/order across retries/restore. |
| Admission | `strong` at the actual first eligible instant, or finite nonnegative weak impulse weight / constant interval support rate supplied by the selected physical law. Completed zero-strength coverage is a real gap for A, not permission to delete source history. |
| Acoustic quality | Finite received SPL, actual competition margin, original detector threshold/pin and surviving feature fidelity. Native numeric quality is not a public confidence percentage or an instruction to display dB. |
| Feature samples | One sample per installed received-feature family, each with `family: DefinitionPin`, `modality: 'hearing'`, unique ordered finite `{featureId, lower, upper}` intervals and `quality: {kind: 'acoustic', receivedLevelDbSpl, clarityMarginDb, identityFidelity}`. Generic sound character and voice identity are separate families. No pristine source vector. |
| Frame/location | Observer ear XYZ at measurement and accepted orientation for relative presentation. Optional SC02 bearing from that frame, quantized direction and conservative half-spread in radians, plus supported elevation or unknown. No sound-only exact point or range. |
| Continuity | Actual eligible coverage/dependency continuity for an interval. For independent contacts provide received frame/features/time, not a hidden-source equality hint. A decides compatible anonymous hypotheses, with no transitive chaining or duplicate support. |
| Speech adapter | Existing original utterance, actually heard partial/clear segments and their word quality, kept separate from voice-identity and location facts. A sound-only listener is valid without language, memory or a fake empty utterance. |

A immediately acquires strong impulses and strong interval onsets, then owns the selected weak rule: threshold 1, decay 2 per normal-speed second, admitted continuous full-strength scale 4 per normal-speed second and maximum compatible gap .5 normal-speed second. C supplies physical strength and meaningful boundaries, not another accumulator. Do not multiply by the world's rate twice. A's published contribution/lease/receipt structures preserve the uncovered prefix and one acquisition across event, native, personal and projection paths.

A owns classification into received-character hypotheses, repeated-contact recognition, learned individual familiarity and Perception-based association. C's generic dimensions cannot count toward A's three usable voice identity dimensions. Human Perception is read through the existing effective-attribute owner; it does not increase hearing range merely because it improves recognition. Unfamiliar speakers, colliding feature vectors, tentative matches and recognized recordings retain A's uncertainty/current-body rules.

For an impulse, acquisition grants no ongoing sound location: its measurement is historical immediately after the occurrence. The .5-second correlation grace is not a live position lease. A real interval can maintain a current permitted bearing/features lease while physical support remains valid. Its latest measurement time differs from how long the channel remained available. Freeze a meaningful final confirmation at actual loss; do not rewrite an onset as if its last sample were valid throughout. Old heard equipment, name or body facts never become fresh because another sound was acquired.

### Speech compatibility and memory independence

Preserve current whisper/normal/shout emission and partial/clear word thresholds through the shared physical receiver. Concurrent sound may reduce word availability without erasing an audible disturbance. A can recognize a familiar received voice without seeing its body and without exact localization; recognition cannot restore masked words. A first unseen stranger remains unknown. One committed instantaneous utterance provides one discrete voice sample; no invented syllable/token duration or familiarity credit.

Both `receiverIndex` and `perceiveSpeech` must stop using autobiography as a physiological gate. Compact acquisition precedes optional memory serialization. Extend event-evidence validation so an actual speech occurrence may produce nonlinguistic hearing-only facets for an animal, not an invalid linguistic placeholder. Retain existing asleep/incapacitated/dead receptor gates; this feature does not add sound-triggered waking. A deaf speaker's self-known action/result remains its existing self-knowledge, not fabricated hearing.

## Continuous reception, mixing and bounded work

The first implementation's numerical schedule, phase transaction and verification contract follow below. They are required for complete delivery; a per-event scalar helper alone is insufficient.

## Simulator ordering and atomic acquisition

## Native animals, attention and warning handoffs

## Retention, save/load and invalidation

## Verification and qualification plan

## Implementation order and open handoffs

## Maintained records

- [Feature](acoustic-stealth-feature-spec.md), [world policy](../worlds/base/physical-sound.md), [ACS delivery](../maintainers/acoustic-stealth.md), [limits](../limits/acoustic-stealth.md).
- Existing owners: [hearing/speech](../hearing-and-speech.md), [animal response](../worlds/base/animal-sound-responses.md), [spatial world](../spatial-world.md), [simulation time](../simulation-time.md), [events/perception/reactions](events-perception-and-reactions-tech-design.md).
- Shared [stealth design](stealth-awareness-tech-design.md), [coordination](../maintainers/stealth-awareness.md), pinned [A technical contract][a-tech] and [A world law][a-policy].

[a-feature]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-feature-spec.md
[a-tech]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-tech-design.md
[a-policy]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/worlds/base/perception-recognition.md
[a-work]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/maintainers/perspective-perception.md
[sa-d02]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/archive/05-project/open-decisions.md#sa-d02--evidence-source-revision-representation
