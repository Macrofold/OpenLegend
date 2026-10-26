# Vision and gaze — design and implementation work

## Scope and status

This tracker owns the detailed work for [physical vision and independent gaze](../projects/vision-and-gaze-feature-spec.md) and its [technical design](../projects/vision-and-gaze-tech-design.md), specialist **B** under [SAD-B / SAI-B](stealth-awareness.md). The selected design lets a character walk while looking elsewhere, see only physically exposed detail, use light and cover, and notice a fleeting opportunity through actual simulation time. It does not own remembered knowledge or recognition (A), voluntary attention (E), surprise eligibility (F), psychological feelings (D), or player controls and disclosure (G).

**Design complete and reviewed (VG00). Implementation and qualification have not started.** The integrated work is documentation only. Every implementation and runtime-acceptance item below remains unchecked. A completed specification is not evidence that current radius-and-obstruction sight has changed.

The [technical dependency record](../projects/vision-and-gaze-tech-design.md#1-authority-dependencies-and-completion-boundary) preserves the inspected contracts source. Current A/C/E/F/G links resolve to the integrated canonical design. Design integration was reviewed through 2026-10-24; implementation and runtime qualification remain open.

## VG00 — Complete the physical-vision design

**Status: Done — design complete and reviewed; no runtime delivered.** Dependencies: shared contracts, actual source inspection, the completed A design, the selected world profile and directly affected owners.

- [x] Specify the player/NPC benefit, independent motion/body/gaze/camera meanings, authored body freedoms, ordinary action composition, geometry, light, evidence precision and complete scenarios in the paired documents.
- [x] Inspect the current sensing, spatial, action, temporal and presentation paths; distinguish existing capabilities from required source changes.
- [x] Review the complete repertoire collection for applicable ideas and preserve useful existing entries, priorities and optional scope.
- [x] Assign implementation slices, dependency exits and specialist handoffs without closing runtime work.
- [x] Complete the full design diff, source-reference, link, status and cross-owner review; reconcile the selected world values and limits with the technical model.
- [x] Preserve source provenance and reconcile current canonical links, exact source revisions, sampled temporal support and producer/consumer ownership through the integrated documentation review.

**Exit:** B’s selected physical inputs, sampled fidelity and consumer contracts agree with the integrated shared design. Exact source revisions, Perception and C movement/posture are settled technical decisions. No runtime, capacity or player qualification is inferred.

## Implementation sequence

Implement through the existing spatial, action, observation, clock and view owners. The first useful release must join physical vision to A's observer-specific evidence and G's safe ordinary-player projection. A hidden target that still appears through a raw view, shadow, tooltip or light source has not passed this feature's acceptance.

| Task | Dependencies                                                        | Required outcome before dependent work                                                           |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| VG01 | VG00; installed body/sense owners                                   | Valid installed body/sense policies and one authoritative physical orientation.                  |
| VG02 | VG01; action/spatial owners; C’s selected posture/movement contract | Looking, moving and interruption share actual admitted work and body constraints.                |
| VG03 | VG01; spatial/material/body owners                                  | One current-query geometry model for exposed parts and independent optical/collision properties. |
| VG04 | VG03; installed clock/light definitions; FPW03 and G                | World light determines physical evidence and permitted rendered meaning.                         |
| VG05 | VG01–VG04; integrated A producer/accumulation adapters              | Every canonical sample/held interval reaches A with measured/acquired timing and precision.      |
| VG06 | VG03–VG05; spatial index/native-work owners                         | Bounded complete candidate and temporal work with correct invalidation and explicit overload.    |
| VG07 | VG01–VG06; save/authoring/action lifecycle owners                   | Current-format restore and installed definitions preserve the same future outcome.               |
| VG08 | VG01–VG07; applicable SAI-A/C/E/F/G integration                     | Complete native/server/client journeys and measured operational and play acceptance.             |

### VG01 — Physical orientation and installed body/sense definitions

**Status: Not started.** Owns SAI-B's physical rig and authored-policy portion.

- [ ] Add the selected body heading and bounded head/eye receiver state through the existing spatial owner; retain distinct actual motion direction and presentation-only camera direction. Audit every current movement-heading and guard-facing consumer.
- [ ] Install and validate world/species/body policy for receiver placement, gaze limits and rates, finite fields, central/peripheral quality, finite range, surface/part samples and supported sense families. Distinguish an absent optional sense, a valid disabled receptor and missing required physical data under technical §5.1; valid blindness must not stall simulation.
- [ ] Connect the selected Perception/stat/trait policy to available weak evidence and precision, preserving all hard geometry, field, range and darkness gates. Presentation-only trait labels confer no mechanic.
- [ ] Exercise a frontal person and a contrasting lateral-vision animal, including a body with multiple receivers, through the same supported policy family. Distinct head freedom must not create extra action owners or omnidirectional fine detail.

**Exit:** current authoritative pose and every receiver can be evaluated deterministically from installed definitions; no renderer, camera or unsupported anatomy supplies missing physical state. Wider body families remain explicitly unsupported until their geometry and lifecycle are designed.

### VG02 — Looking through the existing action owner

**Status: Not started.** Coordinate [action capabilities](../action-capabilities.md#selected-look-posture-and-watch-composition), spatial admission and C's posture producer.

- [ ] Admit idle look and supported look-during-movement through the existing actor action/activity owner, with declared body-part compatibility, equipment/support/clearance constraints and explicit replace/refuse/interrupt behavior. Do not treat consumable stock claims as body concurrency.
- [ ] Apply the selected simulation-time turn and motion policies. Validate before costs or effects; refusal leaves existing work and accepted pose unchanged. A head turn changes visual reception while body-facing guard coverage follows the actual body.
- [ ] Preserve the chosen direction or permitted tracking target through continuation, interruption and restored work. End current target following on loss of the required A permission; retaining a last permitted point is not hidden live tracking.
- [ ] Return accepted, pending, refused, interrupted and completed physical outcomes for E/G without choosing what to investigate or defining input bindings. Turning into a limit cannot silently rotate the whole body or redirect a shield.

**Exit:** sideways/backward movement and a glance have real body/time consequences while ordinary movement, guard, other actions and cancellation remain coherent. An intended watch is not an actually admitted gaze or active preparation.

### VG03 — Exposed shape, parts and material rules

**Status: Not started.** Coordinate spatial primitives, authored body/equipment definitions and C's actual posture.

- [ ] Replace coarse exposed-height assumptions for the selected visual model with the specified receiver and target part/surface geometry, projected exposure, range, motion and detail precision. Use the same point predicate in due sample preparation and its admitted held-availability integration; current queries consume the completed result. Compile the selected finite same-surface bridges so an unobstructed rotating body keeps its binding when adjacent samples take over, without requiring fine contact detail. Distinct-part handoffs still require actually visible authored seams.
- [ ] Add independent authored vision/light transmission, physical collision and attack-obstruction properties through existing geometry/material definitions. Validate walls, foliage, slopes, low roofs and small openings without inferring solidity from opacity.
- [ ] Install the selected crouched optical fixture together with C’s 1.05 m body/.869 m receptor anchor, retaining 52 samples and unchanged face proportions. Compose direction/quiet/posture speed caps by minimum through the single movement owner.
- [ ] Require actual action/part-owned preparation transforms before exposing a visual weapon/limb preparation cue; a hidden action stage is not a physical pose.
- [ ] Resolve each visible facet independently: body location, face, hands, markings, clothing and equipment cannot inherit one another's permission. A protruding object can be visible without proving its hidden carrier's identity or held relation. Remove the self-ID shortcut from optical evidence while preserving separately authorized self-knowledge and presentation.
- [ ] Admit supported pose changes only after support and resulting body/equipment clearance. Sample the actual physical part and height, never the client's animation or an unsupported posture intention.

**Exit:** mask, foliage, wall and partial-cover cases yield the specified physical evidence without a global hidden flag, seeing through collision geometry, or transferring visibility to concealed parts.

**Attention redesign dependency, design only:** [PS04-A](product-scalability.md#ps04-a--core-attention-and-recording) additionally needs observer-received terrain patches and physical-boundary snippets under [its geometry contract](../projects/attention-and-scenes-tech-design.md#51-received-scene-and-geometry). Coordinate through A's existing evidence owner and VG03/VG05: certify received interiors, distinguish physical edges from visibility limits, preserve near/far-side uncertainty and invalidate live support without rewriting history. This source is not delivered by current body sight, public map geometry or Known-place anchors. The owning PS04-A item remains open; existing VG scope/checks below are unchanged.

### VG04 — Authoritative light and consistent appearance

**Status: Not started.** Coordinate [base-world vision](../worlds/base/vision-and-gaze.md), [FPW03](first-playable-world.md#fpw03--ordinary-actions-readable-work-and-readiness), and G's projection.

- [ ] Install the shared one-normal-second epoch daylight coefficient samples and local light native/cell boundaries, without a global 20 Hz stationary scan.
- [ ] Install the selected day/night, ambient, direct-light and finite local-source policies under the world clock and geometry owner. Evaluate light transmission, exposed surface illumination and local background contrast independently of GPU shadows or client quality settings.
- [ ] Distinguish seeing a light source, seeing an illuminated surface and seeing a silhouette. Install the finite emissive flame shape and background-radiance rules, including non-occluding emitters, intervening blockers and a source coinciding with a surface sample. An unseen lamp may light a wall without disclosing the lamp's entity, coordinates, holder or hidden movement.
- [ ] Supply G with the permitted physical lighting meaning and source-free visible effects needed to render consistently. Keep remembered/nearest-rendered-fire approximations out of detection and replace conflicting rendered-light behavior through G; preserve actual current behavior until the complete replacement is delivered.
- [ ] Validate unsupported light/material families explicitly and keep the declared first-release approximation honest. Do not silently introduce reflected/refracted light, photorealistic global illumination or thermal sensing.

**Exit:** moving a lamp or screen produces the same material visibility consequence for native sensing and ordinary presentation, within the authored approximation; graphics settings and camera cutaways cannot change observation.

### VG05 — A's visual producer and bounded temporal sensing

**Status: Not started.** Depends on A’s integrated physical-input, exact-source and acquisition contracts.

- [ ] Produce only actual visual evidence at the supported feature/facet precision, quality and time. Supply A's source/life/receiver provenance, identity fidelity and the technical design's sampled received-witness correspondence; overlapping figures cannot retain tracking by private ID. Leave recognition, weak-evidence storage, decay, episode ownership and remembered facts with A.
- [ ] Implement canonical 50 ms normal-time active-scope cells through the existing native boundary queue, with complete swept candidates and shared batches. Preserve original epoch/cell ordinals and actual motion; static dependency-complete scopes reuse their sample.
- [ ] Hold completed sample rates/facet availability until the next due sample or earlier actual invalidation; let A consume each uncovered span and solve its threshold. Actual source/pose/material changes and impulses remain native boundaries. Existing supported narrow-window sweeps add deterministic measurements; explicitly qualify missed/held shorter unrepresented optical intervals.
- [ ] Reconcile all currently sampled motion families, including target/resource/item approaches, falls and wandering impulses. Required trajectory changes are source work; do not infer an unadmitted continuous path through an old instantaneous move.
- [ ] Keep the experimental four-metre displacement bound honest: it remains the current broader sampling policy, not a sight radius or proof of continuous vision. Pause, speed changes, interval splitting and restore must preserve B/A outcomes under the new selected temporal contract.
- [ ] Yield required unfinished due-cohort preparation at one coherent native prefix; invalid/unsupported installed inputs fail explicitly. Do not introduce a certified optical root solver or terminal near-tangency stall. F cuts remain capture-only, and dynamic learning waits for canonical physical samples.

**Exit:** canonical samples, held support and existing supported narrow-window measurements produce the same actual A evidence across speed/host/save partitions. Current projection keeps measured times, typed motion uses two actually received samples, and F captures no extra contact-time observation.

### VG06 — Complete candidates, caches and operational bounds

**Status: Not started.** Coordinate spatial indexing, native interval work and the [vision limits inventory](../limits/vision-and-gaze.md).

- [ ] Select candidates using finite installed ranges, actual receiver/target extents and conservative swept bounds; query relevant neighborhoods rather than every observer against every entity each frame.
- [ ] Invalidate current and prepared results on relevant old/new movement bounds, body/head orientation, posture, equipment, sense/stat policy, illumination, geometry, source/life and definition changes. Include direct-light and emissive-surface/background dependencies separately: an output-only change or distant flame must update affected sight/silhouettes beyond its lighting radius. Staying in one spatial cell is not sufficient cache validity.
- [ ] Implement the specified cache keys, dependency revisions, work allowances and resumable preparation. Capacity eviction changes reuse only; it cannot drop legitimate actors, lights, contributors or temporal events from the physical result.
- [ ] Handle dense/coincident scenes and rapidly changing light/geometry with coherent metered continuation and explicit invalid-input failure; numerical near-tangency is not a terminal failure. Repeated retries cannot advance an incoherent world or hide permanent failure.
- [ ] Measure ordinary and adversarial workloads after implementation; record memory, work, latency and supported scale in the owning evidence report. Source inspection or an algorithmic bound alone does not qualify performance.

**Exit:** correctness does not depend on nearest-N selection, render-frame rate or unbounded synchronous pair scans, and required physical work resumes without semantic omission; unsupported installed data fails explicitly and total supported scene capacity remains unqualified.

### VG07 — Save, authoring and lifecycle integration

**Status: Not started.** Coordinate installed-world definitions, [save/load](save-and-load.md), action continuation and A/G lifecycle owners.

- [ ] Persist authoritative pose, accepted turn/motion continuation and the selected canonical time anchors under the current save format. Restore only exact supported world/body/definition identities; implement no legacy format adapter.
- [ ] Rebuild derived candidates/caches without refreshing remembered facts or duplicating A evidence. Resume partial preparation and accumulations according to their actual owners, preserving life identity, ordering and completed time.
- [ ] Handle body/equipment/receiver replacement, despawn/death, world/timeline/control change, paused commands and removed definitions through existing lifecycle boundaries. Revoke invalid physical tracking and dependent presentation promptly.
- [ ] Route authored values, validation, capability offers, native admission, actor/NPC descriptions and restored work through one installed policy. New optics/anatomy/trajectory families require supported source capabilities, not arbitrary strings or executable prose.

**Exit:** save/restore and valid authoring variations preserve the future physical/evidence result; stale identities and unsupported installations fail explicitly without silently adopting a different body or world policy.

### VG08 — End-to-end qualification and useful play

**Status: Not started.** Depends on complete selected A/B/C/E/F/G integration, with broader specialist work retaining its own owner.

- [ ] Exercise all [VG-S01–VG-S12 scenarios](../projects/vision-and-gaze-feature-spec.md), including daylight recognition, rear approach, sideways wildlife watching, mask/hidden hand, fire/darkness, bush/wall distinction, narrow-gap passage, strike-time turn, old spear/new voice, helpful lamp/screen, slope/lateral animal and camera/restore cases.
- [ ] Qualify actual native/server/client/storage paths, source-free light effects, per-fact losses, cached/late view cleanup, body/control changes and current-versus-remembered presentation. No full-world client path may bypass A/G permission.
- [ ] Exercise pause and supported 1×/3×/8× clock changes, moving participants, same-time attack ordering, split intervals and restore during a turn or fleeting exposure. Resolve concrete boundary failures before expanding optional tests.
- [ ] Exercise operational limits and failure recovery through the real scheduler; preserve coherent simulation time under overload without invisible evidence loss.
- [ ] Separately observe whether people understand blind spots and partial knowledge, enjoy moving while watching, and find useful light/cover cooperation without constant camera or vigilance chores. Compare with the ordinary capable route; passing mechanics alone does not establish fun or balance.
- [ ] Update actual evidence, implementation statuses and persistent current-behavior documentation only after each claim is demonstrated. This design task authorizes no executable tests or runtime implementation.

**Exit:** the selected feature works through ordinary play and all disclosure paths, with measured limits and separately reported usability/enjoyment evidence. Surprise, psychology and broader optional sense families are not marked complete by B's acceptance.

## Integrated specialist dependencies

The [technical integration contract](../projects/vision-and-gaze-tech-design.md#15-shared-contract-compatibility-decisions-and-handoff) fixes A’s exact source adapters and measured/acquired semantics, C’s posture/minimum locomotion caps, E’s voluntary work, F’s capture-only warning/preparedness use and G’s frozen measured projection. These are implementation dependencies, not pending shared technical choices. No consumer can substitute hidden live values for a sampled facet. SA-D01 remains the separate controlled-player psychological policy decision.

## Complete repertoire review coverage

VG00 covers all **42 repertoire files**: 28 topical catalogues, six navigation/planning records, four research/provenance records and four world profiles. The review includes every scope and entry's applicability, plus full relevant rows and surrounding context; it does not claim a new external-source research pass or redesign of unrelated proposals. Existing catalogue IDs, priorities and optional scope remain intact. The shared repertoire owner retains central priorities and broader optional scope.

## Maintained records

- Experience and scenario acceptance: [feature specification](../projects/vision-and-gaze-feature-spec.md).
- Physical model, data flow, temporal algorithms and source changes: [technical design](../projects/vision-and-gaze-tech-design.md).
- Authored bundled-world choices: [base-world vision and gaze](../worlds/base/vision-and-gaze.md).
- Restrictions, bounds and expansion triggers: [vision limits](../limits/vision-and-gaze.md).
- Shared contracts and cross-project delivery: [stealth technical design](../projects/stealth-awareness-tech-design.md) and [SA tracker](stealth-awareness.md).
- Existing persistent owners: [spatial behavior](../spatial-world.md#selected-body-oriented-awareness), [actions](../action-capabilities.md#selected-look-posture-and-watch-composition), [time](../worlds/base/time.md#spatial-fidelity) and [presentation](../world-presentation.md#selected-per-fact-stealth-disclosure).
