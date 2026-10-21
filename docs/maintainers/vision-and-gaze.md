# Vision and gaze — design and implementation work

## Scope and status

This tracker owns the detailed work for [physical vision and independent gaze](../projects/vision-and-gaze-feature-spec.md) and its [technical design](../projects/vision-and-gaze-tech-design.md), specialist **B** under [SAD-B / SAI-B](stealth-awareness.md). The selected design lets a character walk while looking elsewhere, see only physically exposed detail, use light and cover, and notice a fleeting opportunity through actual simulation time. It does not own remembered knowledge or recognition (A), voluntary attention (E), surprise eligibility (F), psychological feelings (D), or player controls and disclosure (G).

**Design complete and reviewed (VG00). Implementation and qualification have not started.** This branch is documentation only. Every implementation and runtime-acceptance item below remains unchecked. A completed specification is not evidence that current radius-and-obstruction sight has changed.

The inspected implementation is `Macrofold/OpenLegend` at `codex/design-stealth-00-contracts`, commit `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e`. The completed A design was read at `codex/design-stealth-01-perception`, commit `40805523c4a19ab7c6cc455d49d51e4a122ecae0`; it is a pinned external design dependency, not a merged branch or delivered runtime. Its [feature specification](https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-feature-spec.md) and [technical design](https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-tech-design.md) remain A's owners.

## VG00 — Complete the physical-vision design

**Status: Done — design complete and reviewed; no runtime delivered.** Dependencies: shared contracts, actual source inspection, the completed A design, the selected world profile and directly affected owners.

- [x] Specify the player/NPC benefit, independent motion/body/gaze/camera meanings, authored body freedoms, ordinary action composition, geometry, light, evidence precision and complete scenarios in the paired documents.
- [x] Inspect the current sensing, spatial, action, temporal and presentation paths; distinguish existing capabilities from required source changes.
- [x] Review the complete repertoire collection for applicable ideas and preserve useful existing entries, priorities and optional scope.
- [x] Assign implementation slices, dependency exits and specialist handoffs without closing runtime work.
- [x] Complete the full design diff, source-reference, link, status and cross-owner review; reconcile the selected world values and limits with the technical model.
- [x] Commit and push all task-owned documentation; confirm the final branch contains documentation only and preserves the exact contracts base without merging A.

**Exit:** B's internal design is complete and reviewable; its physical input/output and temporal guarantees match the unchanged shared contracts or identify an explicit amendment. The bounded A source-revision proposal below remains a named integration dependency, not an implicit contract change. No runtime or human-play qualification is inferred.

**Documentation review:** the full affected content/diff and producer boundaries were reviewed; local link targets/anchors and repository-pinned Prettier 3.6.2 were checked. Semantic repertoire comparison confirms 32 changed rows in 15 files with no added/deleted IDs. The branch comparison retains the exact contracts merge base and only documentation changes; the shared technical document remains byte-identical. No runtime, executable test, performance or player qualification is claimed.

## Implementation sequence

Implement through the existing spatial, action, observation, clock and view owners. The first useful release must join physical vision to A's observer-specific evidence and G's safe ordinary-player projection. A hidden target that still appears through a raw view, shadow, tooltip or light source has not passed this feature's acceptance.

| Task | Dependencies                                                     | Required outcome before dependent work                                                           |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| VG01 | VG00; SAD-I contract disposition                                 | Valid installed body/sense policies and one authoritative physical orientation.                  |
| VG02 | VG01; action/spatial owners; C's supported posture agreement     | Looking, moving and interruption share actual admitted work and body constraints.                |
| VG03 | VG01; spatial/material/body owners                               | One current-query geometry model for exposed parts and independent optical/collision properties. |
| VG04 | VG03; installed clock/light definitions; FPW03 and G             | World light determines physical evidence and permitted rendered meaning.                         |
| VG05 | VG01–VG04; A producer/accumulation interface; SA-D02 disposition | Every promised interval and facet reaches A with correct timing and precision.                   |
| VG06 | VG03–VG05; spatial index/native-work owners                      | Bounded complete candidate and temporal work with correct invalidation and explicit overload.    |
| VG07 | VG01–VG06; save/authoring/action lifecycle owners                | Current-format restore and installed definitions preserve the same future outcome.               |
| VG08 | VG01–VG07; applicable SAI-A/C/E/F/G integration                  | Complete native/server/client journeys and measured operational and play acceptance.             |

### VG01 — Physical orientation and installed body/sense definitions

**Status: Not started.** Owns SAI-B's physical rig and authored-policy portion.

- [ ] Add the selected body heading and bounded head/eye receiver state through the existing spatial owner; retain distinct actual motion direction and presentation-only camera direction. Audit every current movement-heading and guard-facing consumer.
- [ ] Install and validate world/species/body policy for receiver placement, gaze limits and rates, finite fields, central/peripheral quality, finite range, surface/part samples and supported sense families. Define explicit refusal for malformed or unsupported installations.
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

- [ ] Replace coarse exposed-height assumptions for the selected visual model with the specified receiver and target part/surface geometry, projected exposure, range, motion and detail precision. Use the same predicate in current queries and future interval preparation.
- [ ] Add independent authored vision/light transmission, physical collision and attack-obstruction properties through existing geometry/material definitions. Validate walls, foliage, slopes, low roofs and small openings without inferring solidity from opacity.
- [ ] Require actual action/part-owned preparation transforms before exposing a visual weapon/limb preparation cue; a hidden action stage is not a physical pose.
- [ ] Resolve each visible facet independently: body location, face, hands, markings, clothing and equipment cannot inherit one another's permission. A protruding object can be visible without proving its hidden carrier's identity or held relation.
- [ ] Admit supported pose changes only after support and resulting body/equipment clearance. Sample the actual physical part and height, never the client's animation or an unsupported posture intention.

**Exit:** mask, foliage, wall and partial-cover cases yield the specified physical evidence without a global hidden flag, seeing through collision geometry, or transferring visibility to concealed parts.

### VG04 — Authoritative light and consistent appearance

**Status: Not started.** Coordinate [base-world vision](../worlds/base/vision-and-gaze.md), [FPW03](first-playable-world.md#fpw03--ordinary-actions-readable-work-and-readiness), and G's projection.

- [ ] Install the selected day/night, ambient, direct-light and finite local-source policies under the world clock and geometry owner. Evaluate light transmission, exposed surface illumination and local background contrast independently of GPU shadows or client quality settings.
- [ ] Distinguish seeing a light source, seeing an illuminated surface and seeing a silhouette. An unseen lamp may light a wall without disclosing the lamp's entity, coordinates, holder or hidden movement.
- [ ] Supply G with the permitted physical lighting meaning and source-free visible effects needed to render consistently. Remove reliance on remembered or nearest-rendered-fire approximations for detection; preserve actual current behavior until the complete replacement is delivered.
- [ ] Validate unsupported light/material families explicitly and keep the declared first-release approximation honest. Do not silently introduce reflected/refracted light, photorealistic global illumination or thermal sensing.

**Exit:** moving a lamp or screen produces the same material visibility consequence for native sensing and ordinary presentation, within the authored approximation; graphics settings and camera cutaways cannot change observation.

### VG05 — A's visual producer and complete temporal coverage

**Status: Not started.** Depends on A's adopted physical-input shapes, evidence-accumulation semantics and SA-D02 disposition.

- [ ] Produce only actual visual evidence at the supported feature/facet precision, quality and time. Supply A's source/life/receiver provenance and identity fidelity; leave recognition, weak-evidence storage, decay, episode ownership and remembered facts with A.
- [ ] Implement the technical design's complete interval preparation for moving observer and target, head/body turns, changing posture, light/source motion and changing occlusion. Derive it from the same current-query model, using actual admitted paths and canonical time anchors.
- [ ] Partition at all required field, geometry, range, light, quality and action boundaries. Deliver obvious evidence promptly and weak evidence over its real duration; let A calculate its first threshold crossing. Equal endpoint samples or a midpoint alone cannot prove that a narrow opening was never visible.
- [ ] Reconcile all currently sampled motion families, including target/resource/item approaches, falls and wandering impulses. Required trajectory changes are source work; do not infer an unadmitted continuous path through an old instantaneous move.
- [ ] Keep the experimental four-metre displacement bound honest: it remains the current broader sampling policy, not a sight radius or proof of continuous vision. Pause, speed changes, interval splitting and restore must preserve B/A outcomes under the new selected temporal contract.
- [ ] At unresolved required preparation, retain the last coherent simulation boundary and report the specified incomplete/failure condition. Do not synthesize no exposure, surprise eligibility or an unmeasured observation time.

**Exit:** a target can pass through a narrow gap between coarse movement endpoints and receive exactly its supported opportunity, with no fabricated unseen updates. A's accumulated result and F's immutable evidence cut are invariant to publication frequency and supported clock speed.

### VG06 — Complete candidates, caches and operational bounds

**Status: Not started.** Coordinate spatial indexing, native interval work and the [vision limits inventory](../limits/vision-and-gaze.md).

- [ ] Select candidates using finite installed ranges, actual receiver/target extents and conservative swept bounds; query relevant neighborhoods rather than every observer against every entity each frame.
- [ ] Invalidate current and prepared results on relevant old/new movement bounds, body/head orientation, posture, equipment, sense/stat policy, illumination, geometry, source/life and definition changes. Staying in one spatial cell is not sufficient cache validity.
- [ ] Implement the specified cache keys, dependency revisions, work allowances and resumable preparation. Capacity eviction changes reuse only; it cannot drop legitimate actors, lights, contributors or temporal events from the physical result.
- [ ] Handle dense/coincident scenes and rapidly changing light/geometry with explicit bounded continuation and terminal diagnostic failure. Repeated retries cannot advance an incoherent world or hide permanent failure.
- [ ] Measure ordinary and adversarial workloads after implementation; record memory, work, latency and supported scale in the owning evidence report. Source inspection or an algorithmic bound alone does not qualify performance.

**Exit:** correctness does not depend on nearest-N selection, render-frame rate or unbounded synchronous pair scans, and every admitted scene either progresses with complete physical preparation or exposes the declared bounded failure.

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

## Specialist handoffs and explicit contract proposal

| Owner                 | B provides                                                                                                                                               | Owner retains / required agreement                                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — observer evidence | Physically supported visual facets, finite precision, identity fidelity, source/life provenance and actual support intervals; no hidden current updates. | Recognition, accumulation/decay, familiarity, episodes, memory and per-fact grants. Confirm B's producer mapping and temporal acquisition cuts before VG05.                                           |
| C — posture/acoustics | Receiver/part geometry and visual consequences of an actually admitted pose or motion.                                                                   | Crouch/quiet-motion policy and sound production/hearing. Agree supported pose dimensions and joint action constraints; opacity never defines footstep sound or collision.                             |
| E — attention         | Physically available look directions, accepted/pending/refused outcomes, bounded turn progress and actual observation quality.                           | Whether to look, inspect, watch or investigate; finite purpose, voluntary interruptions, handoffs and attention cost. A requested watch cannot be reported as active before actual admission.         |
| F — surprise          | Time-indexed physical evidence through A and actual admitted orientation/work through their owners.                                                      | Relevant warning, preparation lead time, eligibility and attack-time cuts. A turn completed after the selected cut cannot retroactively change that attack's evidence.                                |
| G — player experience | Authoritative visibility meaning, accepted physical gaze and permitted world-light effects through A's projection boundary.                              | Camera privacy, controls, accessible feedback and all full/patch/history rendering surfaces. Camera direction grants no sight; hidden light-source truth cannot accompany a visible illuminated wall. |
| SAD-I — integration   | B's pair, implementation tasks, authored profile, limits and repertoire review below.                                                                    | Shared-interface adoption, cross-specialist review and central repertoire/priorities reconciliation. Other specialists' completion is not inferred on this branch.                                    |

**E/G coordination availability:** the exact requested remote `codex/design-stealth-05-attention` and `codex/design-stealth-07-player-experience` refs and independent branch searches returned no available branch during this review. No sibling agreement or completion is claimed; the explicit handoffs above must be reconciled when those documents become available. This is a reference-availability fact, not a conclusion about work on other branches.

**SA-D02 — source-revision representation remains an explicit A proposal.** A's [completed reference proposal](https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-tech-design.md#shared-contract-amendment-proposal) identifies a mismatch between the shared illustrative numeric source revision and actual producers using numeric native revisions or a SHA-256 personal-source revision. B consumes the shared contract as written and does not silently redefine that field. SAD-I/shared-contract ownership must adopt or reject the proposed typed source-revision extension with A and its consumers before the dependent VG05 persistence/projection mapping is implemented. This is an interface adoption dependency, not a reason to change B's physical behavior or to import A's branch.

## Complete repertoire review coverage

All **42 files** under `docs/repertoires/` were considered. Review covered each file's scope/headings and entry applicability, then full relevant rows and nearby context; the combined scenes and world-profile contexts informed useful play. It does **not** claim every word of unrelated proposals or every external source in a historical research ledger was reread. Catalogue presence does not select a new feature. Existing IDs, priorities and optional levels remain meaningful.

Paths in the table are relative to `docs/repertoires/`.

| Files                                                                                                                                                                                                                                                              | Review focus and disposition                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `actions.md`, `adventure-discovery.md`, `bodies-species.md`, `combat-rescue.md`, `ecology-weather.md`, `materials-resources.md`, `mechanics.md`, `objects.md`, `traits.md` (9)                                                                                     | Look/watch/movement, anatomy and field quality, real cover and materials, rescue, wildlife, objects and traits. Applicable entries feed B's physical producer; attention, surprise, recognition and optional ecology retain their owners.                                      |
| `abilities-progression.md`, `arts-leisure.md`, `automation-creators.md`, `languages-knowledge.md`, `settlements-architecture.md`, `simulation-experiments.md`, `work-crafting.md` (7)                                                                              | Full applicable entries on trained observation, birdwatching, actual light, watch handoff, partial witnesses, optional gestures, lookouts, tests and object inspection. Selected in-place improvements are listed below.                                                       |
| `characters-backstories.md`, `diplomacy-conflict.md`, `economy-logistics.md`, `faith-ritual.md`, `history-myth.md`, `institutions-politics.md`, `magic.md`, `needs.md`, `psychology-behavior.md`, `relationships.md`, `technology.md`, `unusual-realities.md` (12) | Scope and entry applicability for witness differences, concealment, social arrangements, body/sense variation and optional realities. Relevant rows retain physical evidence boundaries; this design adopts no general social, magical, institutional or psychological system. |
| `README.md`, `coverage.md`, `design-foundation.md`, `gameplay-priorities.md`, `selection-and-scale.md`, `combinations.md` (6)                                                                                                                                      | Navigation, selection, scope and combined-scene context. Preserve the survival/home/encounter priorities and useful cooperation; SAD-I owns final central navigation/count/priority reconciliation.                                                                            |
| `source-atlas.md`, `group-3-reading-progress.md`, `group-6-reading-progress.md`, `group-7-research-progress.md` (4)                                                                                                                                                | Source coverage and historical reading provenance. Preserve their evidence; this design does not claim a new completed source-research pass.                                                                                                                                   |
| `worlds/living-fantasy.md`, `worlds/medieval-survival.md`, `worlds/modern-life.md`, `worlds/planetary-scifi.md` (4)                                                                                                                                                | Authored-world scopes and relevant sense, light and body differences. The shared mechanism must permit contrasting coherent policies; optional profiles do not install those policies in the bundled world.                                                                    |

The selected changes refine **32 existing rows in 15 topical files**, plus a sensory-owner link; they add no catalogue entries. Physical/action entries are OBS-05, BOD-01/BOD-11, CBT-08, BSP-044/BSP-056, ECW-002/017/061, TR-065, MEC-003/058, CR-050/051, ITEM-248/181 and TE-151. These connect actual gaze, body freedoms, cover/light and rescue to their existing owners.

The noncombat connections remain small, concrete extensions of existing entries: AP-022/AP-138 physical observation ownership; AP-245/AP-261 actual timed watch and intermittent checks; ARL040/ARL215 world light and screens; ARL171 watching birds while moving; ACR-051 watch/action ownership; LKN065 visible gestures in its existing optional scope; LKN134 witnesses with different visible facets; ARC-142/ARC-232 lookout and balcony exposure; SIM-055/SIM-259 real illumination and foliage experiments; WORK-136 moving a lamp or object to inspect genuine marks. None grants hidden truth, automatic comprehension, a recipe, unlimited range or a compulsory surveillance chore.

The final integration owner must link the completed specialist documents from central repertoire navigation, reconcile any selected limit/priority implications once across all specialists, and preserve catalogue counts and source provenance. B's local review does not replace that shared integration task.

## Maintained records

- Experience and scenario acceptance: [feature specification](../projects/vision-and-gaze-feature-spec.md).
- Physical model, data flow, temporal algorithms and source changes: [technical design](../projects/vision-and-gaze-tech-design.md).
- Authored bundled-world choices: [base-world vision and gaze](../worlds/base/vision-and-gaze.md).
- Restrictions, bounds and expansion triggers: [vision limits](../limits/vision-and-gaze.md).
- Shared contracts and cross-project delivery: [stealth technical design](../projects/stealth-awareness-tech-design.md) and [SA tracker](stealth-awareness.md).
- Existing persistent owners: [spatial behavior](../spatial-world.md#selected-body-oriented-awareness), [actions](../action-capabilities.md#selected-look-posture-and-watch-composition), [time](../worlds/base/time.md#spatial-fidelity) and [presentation](../world-presentation.md#selected-per-fact-stealth-disclosure).
