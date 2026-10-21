# Physically coherent vision and independent gaze — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The physical producer, owner integration and implementation requirements are being specified; no runtime work has started. | 2026-10-21 |

## 1. Authority, dependencies and completion boundary

This is the implementation design for [vision and gaze](vision-and-gaze-feature-spec.md), specialist **B** under [SC01–SC14](stealth-awareness-tech-design.md#shared-contracts). [VG00–VG08](../maintainers/vision-and-gaze.md) own design completion and future implementation. [Base vision policy](../worlds/base/vision-and-gaze.md) owns the selected world's values, feature families and formulas; [the limits inventory](../limits/vision-and-gaze.md) owns restrictions, incomplete work and qualification gaps. Numerical examples here use those laws rather than installing another set of defaults.

Repository/base: Macrofold/OpenLegend, remote codex/design-stealth-00-contracts, exact tip a3d40b4d71e29d6504e9f3fcc21e76344a0a284e. Work branch: codex/design-stealth-03-vision, created from that commit. The completed remote codex/design-stealth-01-perception was read, without merging, at 40805523c4a19ab7c6cc455d49d51e4a122ecae0: [feature](https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-feature-spec.md), [technical design](https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-tech-design.md), and [recognition policy](https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/worlds/base/perception-recognition.md). Those pinned links deliberately do not imply the files exist on this branch.

B owns physical visual opportunities, available detail, optical input, accepted receptor transforms and their temporal evaluation. A owns detection acquisition, accumulated weak evidence, exposure episodes, leases, recognition, names and historical facts. C owns posture/body/contact and locomotion policy. E owns voluntary attention, look/watch/investigation choices and native animal decisions. F owns warning/preparedness criteria and combat cuts. G owns controls and authorized presentation. Existing action, spatial, time, record and world-definition owners perform their mutations. No new package hierarchy, event bus, action lane, scheduler or knowledge database is selected.

The shared technical document is preserved byte for byte. The notation below resolves its B-family placeholders through existing owners; it does not replace SensoryEvidence, ObservationResult, Fact, ExposureRef, EvidenceCut or source-revision meanings. New runtime names are illustrative implementation names. They are not claims that those APIs exist.

This task delivers documents only. Future implementers must change current-format producers, consumers and validators together under the root development policy; no old-format adapter or migration is needed. Runtime tests, performance and player qualification remain unchecked.

## 2. Inspected source and required changes

| Current source owner | Behavior at the pinned base | Required change and consumers |
| --- | --- | --- |
| [perception.ts](../../packages/domain/src/perception.ts): visionQuery, entityVisionQuery, pointVisionQuery, canSee | Finite foot-anchor radius, three target-centre height rays at 0.85/0.5/0.15; binary success if a ray clears. No target width, FOV, illumination or actual face availability. | One richer physical evaluator shared by current reads and temporal prediction. Remove radius-only or boolean shortcuts as authority for newly selected sight. Update event observation, speech's visual participant checks, actions and projection through A. |
| [perception-frame.ts](../../packages/domain/src/perception-frame.ts) | Coarse outward descriptors are prepared from entity state; they are not independently authorized visual facets. | Preserve descriptor preparation where useful, but select only exposed fields. A handles original values/times; no current hidden descriptor refresh. |
| [spatial-state.ts](../../packages/domain/src/spatial-state.ts): EntitySpatial, setSpatialPosition | Numeric body, inactive body, support and one heading are authoritative. Translation currently writes heading from atan2(dx,dz). | Separate translation from admitted body orientation in this owner; add accepted receptor-joint pose and update all movement/guard/placement callers explicitly. |
| [types.ts](../../packages/domain/src/types.ts), [kernel.ts](../../packages/domain/src/kernel.ts), [activity-execution.ts](../../packages/domain/src/activity-execution.ts) | One actor.action and sequential native activities. [resource-claims.ts](../../packages/domain/src/resource-claims.ts) reserves consumable values/items, not neck or eye concurrency. | Add narrowly typed compatible orientation inside the existing action record/admission. Do not describe existing stock reservations as a delivered body-part claim system. |
| [contact-defense.ts](../../packages/domain/src/contact-defense.ts) | A guard's chosen facing must agree with body heading; guard admission writes that heading. | Keep head-only looking independent; a body turn must satisfy or explicitly replace the guard. F remains the protection/outcome owner. |
| [spatial geometry](../../packages/spatial/src/geometry.ts), [spatial types](../../packages/spatial/src/types.ts) | Finite solids/sloping panels, separate movement/sight flags, ordered ray hit intervals and sound transmission. Positive interior sight-solid traversal blocks; isolated endpoint contact does not. | Add supported optical response on the same geometry/material definitions. Preserve collision/attack predicates. Include assemblies, body blockers and attachments in conservative preparation. |
| [motion-boundaries.ts](../../packages/domain/src/motion-boundaries.ts) | Range roots and sightSweep form runs over predictable linear paths; sensoryCrossingBound stops inside some missed runs/gaps. Falling, several approaches and 0.4m wandering impulses still have sampled limitations. Certificates lack gaze/light. | Supply actual onset/loss/quality intervals, complete relevant motion, rotating stationary receivers and light/material boundaries. Do not credit hypothetical paths or call the four-metre fallback complete coverage. |
| [encounter-cache.ts](../../packages/domain/src/encounter-cache.ts), [draft.ts](../../packages/domain/src/draft.ts) | Existing source/observer preparation, dirty-neighborhood logic and sensoryDraftWrites support reuse. | Extend exact dependencies and old/new neighborhoods for orientation, parts, optical material, illumination and body life. Keep A's acquisition owner. |
| [base senses](../../packages/domain/src/worlds/base/senses.ts), [base spatial definitions](../../packages/domain/src/worlds/base/spatial-definitions.ts) | Sight is installed through sense definitions; actual numeric body/anchors vary. Person defaults include 0.28m radius, 1.75m height and 1.58m eye height. | Add body-linked optical receptor/feature profiles; no inference from species name, sprite or absence of a memory component. |
| [base time](../../packages/domain/src/worlds/base/time.ts), [base actions](../../packages/domain/src/worlds/base/actions.ts) | Normal clock 60:1; finite horizon 60 simulation seconds; experimental sensing travel bound 4m; ordinary speed 0.11m/simulation-second. | Keep the clock. Reconcile required visual crossings with actual motion and speed; retain unrelated coarse fidelity only where its existing semantics permit. |
| [sunlight.ts](../../apps/client/src/sunlight.ts), [world-presentation.ts](../../apps/client/src/world-presentation.ts) | Client-only daylight/ambient rules and nearest 2/8 fire lights; remembered fire imagery can continue to contribute rendered light. No domain light input. | World-owned physical light plus safe presentation projection. Render budgets cannot truncate authoritative contributors; historical fire cannot assert current burning. |
| [view.ts](../../apps/server/src/view.ts), client scene/perception guides | Entity visibility and current appearance already have observer-dependent paths, but are not the new part/facet contract. | A/G consume actual supported facets; body meshes, labels, tooltips, shadows, particles and previews must not restore unsupported detail. |

Source inspection establishes these integration points, not successful runtime capacity. Existing caches are optimizations, not limits on who can see; the 128-observer/512-target cache capacities in current perception cannot become nearest-N sensing rules.

## 3. One physical state, separate directions

### 3.1 Authoritative records

The existing spatial record owns current placement/support, numeric body, body heading and current admitted sensory joint angles. The existing action owns any unfinished instruction to change or maintain that pose. There is no second saved world-space eye position, motion heading or camera heading on the actor.

| Meaning | Representation and writer | Read-only consumers |
| --- | --- | --- |
| Body heading | Existing heading in radians, normalized with the shared spatial angle helper; written only by admitted spatial/action transition. | Body/attachment transforms, guard, movement constraints, visual geometry and authorized presentation. |
| Motion direction | Derivative of the actual accepted piecewise trajectory; zero displacement means no new motion direction. Do not recover it from body heading. | Locomotion, contact/sound, relative-motion sensing, animation. |
| Head/receptor joint pose | Finite list of joint ID plus yaw/pitch relative to its declared parent; pin to the body rig. Current angles live in the spatial owner. | Eye/receptor transform, physical feature orientation and scoped rendering. |
| Gaze | Derived ray/field transform from body heading, admitted joint angles and receptor mount. An eye may steer relative to a head. | Physical sensing and authorized look feedback. |
| Camera | G's viewer/device presentation state. | Rendering, picking permitted geometry and control-intention construction. No native sensing writer. |

Position uses the existing Y-up metre convention and support anchor. A body can be upright yet face differently from travel. The selected mechanism supports body yaw and bounded yaw/pitch sensory joints; body roll, six-degree body rotation and arbitrary skeletal constraints remain unsupported. A rigid receiver has no joint and follows its actual mount. Two lateral eyes are two receptors on the same supported body, not two independent knowledge owners.

The current position setter's implicit heading write must be removed from translation semantics and replaced at callers with explicit installed movement orientation. A caller cannot preserve old behavior accidentally by writing a copied heading after an admitted independent look. One combined transition settles pose and translation, then publishes invalidations once. Spawn, teleport, body replacement and restore explicitly supply valid current orientation; teleport does not invent a traversed path.

### 3.2 Admitted rig and feature definitions

These are narrow serializable fields in the existing numeric-body/world-definition owners, not a general skeleton runtime. Each definition has its existing DefinitionPin and normal installation/content revision.

| Record | Required fields and validation |
| --- | --- |
| VisualRig | Ordered joints and receptors; referenced body profile; supported upright transform family; no cycle or dangling joint/mount reference. Empty receptor list explicitly means no optical sight. |
| SensoryJoint | Stable authored ID; parent body or earlier joint ID; local mount position; yaw/pitch neutral and inclusive bounds; positive angular rates in authored normal-speed units; supported capability/condition constraints. Bounds must contain neutral. |
| OpticalReceptor | Stable ID; mount joint/body and local offset; rest direction; admitted sight sense; finite positive range; supported horizontal/vertical angular field and central-quality law; enabled condition; light-response/feature-family pins. No arbitrary callback or pixel shader. |
| VisualPatch | Stable part/patch ID; local physical transform and outward normal; represented area/weight; deterministic sample locations on the admitted surface; supported appearance/feature roles; optical material; attachment/body owner. Locations must lie on the admitted part, not an artistic mesh. |
| VisualFeatureFamily | Finite feature IDs, physical ranges/normalization/positive weights, required visible landmarks/patches, and mapping from available precision to received intervals. Body definitions supply real physical feature values/landmarks. |
| OpticalMaterial | Supported opaque, transmitting-volume or transmitting-surface family; channel-specific transmission/extinction and reflectance/emission parameters; ordinary movement/attack/acoustic fields remain separately owned. |
| LightEnvironment | Installed clock binding, finite daylight curve/direction law, sky samples and their weights, sky boundary convention, reference units and optical family. |
| LightSource | Exact owning object/life where applicable; actual source/attachment transform; enabled/emission state; finite radius and strength; point or supported spot family; source surface emission. Fuel or switch state is owned by the producing item/process. |

Rig/patch/source-size ceilings are declared in the limits inventory and enforced before installation/creation/replacement. Current records resolve the exact pins and complete required numeric fields; finite values alone do not prove required keys exist. Unknown optical families are unsupported, not transparent, dark, human or omnidirectional defaults. Replacing a definition cannot silently mutate already admitted body dimensions; use the existing live replacement operation or create a new body with its actual definition.

### 3.3 Turning law and pose trajectory

An admitted turn records original start time, current actor/life, action generation, rig/locomotion pins, authored clock conversion, starting angles, goal and ending condition in its existing action continuation. The spatial current angles are the accepted result at the coherent boundary. The continuation's start anchor is progress metadata, not another independently writable current pose.

Angles follow the shortest supported arc at the installed rate, clamped at the goal and joint bounds. At an exact half-turn tie use the world's declared tie direction; do not let map iteration, camera side or random redraw choose it. Different supported joints can advance simultaneously inside one admitted pose transition; the body does not snap while the head consumes time. The solver derives their values from the original anchor and elapsed simulation time, not repeated per-callback additions. Completion and joint-limit times are native boundaries.

An eyes/head request allocates the required yaw/pitch to the eye and head according to the pinned deterministic world allocation rule. A body-assisted request may also turn the body only if that assistance is explicit and compatible. The solver reports achieved direction and remaining permitted error. A request whose required final direction is outside the supported envelope is refused before replacing work, unless the request explicitly accepts the displayed partial result. A late restriction can end the directive at the last accepted pose; it cannot leave an angle outside the new admitted body's limits.

Pose feedback distinguishes accepted-and-turning, reached, explicitly limited, blocked/incompatible, stale-target and ended. An incomplete physical preparation is a technical result through existing work handling, not a fictional blocked neck.

## 4. Existing action owner and resource compatibility

### 4.1 Narrow composition

Add an optional orientation directive to the existing admitted physical action state. An idle look is an ordinary physical action. A moving, waiting, guarding or working action may accept a directive amendment only if its installed action/body policy supports that combination. There is still one actor.action, one action generation, one physical executor and one cancellation/receipt path.

Do not implement an independently ticking gaze component, background look action, generic parallel activity tree or a new claim scheduler. Existing consumable resource claims remain what they currently are. The concrete extension is an action-local pose requirement record and a shared compatibility evaluator used by offers, admission, continuation and restore.

| Directive field | Meaning |
| --- | --- |
| goal | Exactly one of observer-relative direction captured at admission, fixed permitted world point/region-derived bearing, or current-observation-bound body/part reference. No hidden canonical tracking handle. |
| scope | Eyes/head-only or explicitly body-assisted. Which joints are available comes from the rig. |
| ownership | Exact actor/life, containing action generation and activity node where one exists; one admitted directive per independently steerable rig group. |
| extent | Orient once; maintain through this action; or maintain to an explicit simulation deadline supplied by a finite E activity. No implicit forever watch. |
| loss | Stop tracking, or retain the last permitted point/bearing when explicitly selected. Neither policy follows hidden source motion. |
| replacement | Amend compatible current work, or ordinary explicitly authorized replacement. A failed amendment preserves current work and pose. |
| progress | Original start pose/time, admitted pins/conversion, current phase and remaining goal; no provider promise or renderer completion callback. |

An observer-relative direction is converted once using the accepted pose at admission. A world point remains in world coordinates as the actor moves. A region yields a chosen bearing/point inside the permitted region under the selected action, not the private source's coordinate. Tracking consumes A's current permitted measurements at their physical boundaries; it may aim toward the last measured point between updates but cannot read a future target route to achieve perfect pursuit.

When an orient-once directive reaches its goal, it ends without resetting the accepted pose or creating another action. The current relative pose persists until another admitted pose requirement changes it. Starting subsequent ordinary work applies that family's explicit default orientation at real turn rates. Maintaining a world point is continuing work and ends with its containing action/deadline. A voluntary long watch belongs to E's finite activity and may renew only through that owner's rules.

### 4.2 Shared read-only admission and ordered mutation

1. Resolve current control/participation, exact life, action generation, installed definitions and permitted target. Classify unsupported, stale, incompatible and technical incomplete distinctly.
2. Read current body, attachments, support and action-held pose requirements. Preserve non-negotiable support/clearance under SC06. If the request changes physical volume or mount location, check the resulting body and swept supported turn before commitment.
3. Solve the requested joint/body freedom and resulting movement relationship. Check the current action's requirements, including a required viewing region, body facing, fixed tool stance and available parts. Head-only does not imply whole-body permission.
4. Return an offer with actual turn duration/range of achievable direction, any selected movement consequence and whether current work will continue or end. Offers consume the same policy and do not allocate IDs, spend resources, interrupt or acquire evidence.
5. On execution, recheck dependencies, settle old motion/exposure to the current ordered boundary, perform exactly one admitted action/pose transition, and invalidate affected physical/evidence preparation. Ordinary cancellation preserves committed effects and recovery.

The body currently has a circular movement footprint; yaw alone need not change its clearance. Attached parts can make a turn consequential. Reuse actual numeric attachment geometry and the existing physical query; do not infer that every yaw is harmless or invent an extra square collider. If supported rotational clearance is unavailable for a particular extended assembly, refuse that body-assisted turn as unsupported before mutation. Do not block free eye rotation solely because a distant unrelated object exists.

### 4.3 Required compatibility table

| Existing action/condition | Required selected result |
| --- | --- |
| Ordinary route movement plus eyes/head look | Compatible when the installed rig and movement family allow it; preserve route, destination, purpose and remaining costs. Actual translation does not overwrite head pose. |
| Side/back travel with body-assisted look | Use the admitted locomotion factor and physical route/clearance; C owns speed/contact effects. Do not apply a second unrelated penalty or auto-change the route. |
| Stationary guard plus head-only glance | May keep guard body facing and shield coverage. F evaluates actual protection; seeing behind does not redirect a shield. |
| Guard plus body turn | Refuse an incompatible amendment or perform the explicitly requested guard replacement through its owner, preserving preparation/recovery semantics. No silent 360-degree guard. |
| Aimed shot, tool contact or precise work requiring a viewing region | The action declares the minimum actual physical constraint. A glance that violates it is refused or explicitly interrupts; do not claim all gaze for every action by default. F/work family owns whether a phase requires that view. |
| Posture change while moving/looking | C admits resulting shape, support, eye/part mounts and attachments; B recalculates transforms and remaining supported directive under the same transition. Refused stand changes nothing. |
| Target loses physical support | B reports the facet loss to A; A ends the live binding. Stop or retain the last permitted point as admitted, with no unseen update. |
| Pause, stop, incapacity, body/control replacement | Pause freezes progress; stop ends owned maintained instructions without undoing pose. Incapacity/replacement invokes existing lifecycle interruption; exact old-life directives never attach to a new body. |

Admission failure preserves resources, action, posture, position, RNG and accepted orientation. A later failure preserves already elapsed motion/turn and spent resources truthfully. Replacement of only a compatible orientation directive must not advance a whole-action replacement generation that would incorrectly cancel unrelated cooperation; use the owner's scoped amendment revision and revalidate the actual dependencies. Genuine action replacement still uses ordinary interruption.

## 5. Physical visual evaluation and A adapter

### 5.1 Input and result shapes

The physical evaluator is a pure, renderer-free read of a coherent native physical snapshot or a certified interval. Required preparation lives in the existing simulation continuation. It does not mutate knowledge, allocate an exposure, read a subjective notepad or request a model.

| Input | Required contents |
| --- | --- |
| Evaluation scope | Existing world/timeline/native phase scope; requested interval or instant; admitted definition pins and physical revision certificate. Server audience/control wrappers remain at their existing owner. |
| Observer | Exact ActorLifeRef; participation and sense capability; numeric body/rig; accepted pose and complete admitted trajectories over the interval; applicable settled ability/condition values. Memory is not an eligibility requirement. |
| Candidate source | Existing exact object/body life reference privately; actual body/part/attachment geometry, material, physical appearance/feature definitions and executed motion. It is not a permitted participant ID. |
| Environment | Indexed map/assembly/dynamic optical geometry, supported light environment/sources, clock and source/material revisions. |
| Required measurement | Current query, meaningful physical transition, A's due visual-learning sample, or an already ordered native cut requiring current information. Reading a UI is not a new measurement. |

The B-private result has exactly these alternatives:

| Result | Fields and meaning |
| --- | --- |
| complete | Ordered, disjoint physical intervals plus requested point measurements; each retains its evaluated range, exact dependency certificate, receptor/patch support and source binding. An empty opportunity set is a completed absence of supported opportunity for this candidate/interval only. |
| unsupported | Installed receptor/optical/trajectory family is absent or unsupported; supply a scoped native reason. Do not fabricate zero light or human fallback. |
| incomplete | Existing work reference and remaining preparation cursor; no completed answer for the unresolved suffix. Preserve owed simulation time. |
| failed preparation | Existing technical failure disposition with diagnostic family/cell/pins; the dependent native boundary remains held. This is not an ObservationResult.not-detected and supplies no gameplay absence. |

Each physical interval supplies: private candidate/receiver binding; from/through times; constant detection-support band with immediate eligibility or nonnegative support rate in the admitted unit; available facet masks/precision bands; actual measurement values and their measurement times where needed; original observer frame; visible patches and sufficient physical continuity proof; definition and dependency pins. Values do not claim to be constant merely because availability is constant. Adjacent intervals may merge only when all semantic inputs, rate, masks and continuity are equal; retain original value sampling boundaries separately.

This is an internal producer input to A, not a new public shared evidence type. A maps it into SC02 ObservationResult and the upstream A facet families, allocates observer-local exposure/contribution identities, integrates support once, and supplies actual acquired facts. B never returns recognized, suspected-person, knows-name, afraid, hostile, prepared or surprised. It does not create EvidenceRef revisions or change the proposed SC02 revision representation.

### 5.2 Exact adapter responsibilities

| B supplies | A owns | Consumer consequence |
| --- | --- | --- |
| Actual available interval and selected nonnegative rate/immediate condition | Once-only accumulation, first detection crossing, gap decay and episode continuity | Strong exposure does not wait for attention; duplicate queries do not add weak exposure. |
| Visible surface/body/object correspondence and permitted geometric precision | Detected signal/surface/body classification, scoped current body reference and participant binding | A seen spear need not disclose a concealed carrier. A body reference is separate from person identity. |
| Actual visible feature intervals plus visual identity fidelity | Received-feature facet, matching, familiarity, learned individual and name association | A mask or back of head cannot supply missing face dimensions; a mesh/ID is not a signature. |
| Exposed descriptor/item/activity primitives and independent availability/loss | Field allowlist, value capture, immutable contribution, live lease and final historical confirmation | Hand loss ends current equipment support even when the torso remains visible. |
| Observed patch location/bearing, quantization/error bound and observation frame | SC02 LocationEvidence and timing/support | No hidden true point accompanies an approximate cue. |
| Physical loss/change/canonical measurement boundary | Lease update/end, memory freshness and meaningful intake | Old spear time is not refreshed by later body detection, sound or recognition. |

Use A's fixed facet order: detection, location, received features in family order, observed detail in producer order, followed by A's classification/association/name meanings. Body/appearance/item relation participants bind the permitted exposure unless an eligible prior association exists. A later identity match cannot be inserted as a circular prerequisite of the features that established it.

Physical continuity is a property of supported visible paths/parts across the interval, not equality of private source IDs. Crossing, occlusion or overlapping indistinguishable bodies can make correspondence unresolved. Preserve broad/ambiguous observation; A decides whether and how to correlate episodes. Seeing two separate modeled surfaces does not by itself establish two people.

### 5.3 Current values, measurements and negative results

Canonical physical measurements occur at admitted source/pose/material/light changes; entry/exit and quality/facet/precision boundaries; actual motion-segment changes; due learning boundaries requested by A; and required native cuts. Motion-dependent locations use the selected physical precision-grid crossings or an explicit required-cut measurement, rather than render frequency. Stable facts can supply a certified constant-value interval. An interval of available sight of a moving body does not mean its most recent point held for the whole interval.

The latest permitted point, feature interval or appearance value is resolved before handing it to A. A may keep that value in its current lease with separate value-measured and availability-confirmed intervals. B supplies new values only at canonical physical boundaries; A's capture operation copies the values already acquired for its ordered cut. A request from a later display cannot acquire a previously missed event or rewrite a prior cut.

A completed no-opportunity result covers the candidate and evaluated interval. A bounded search can use a completed set of examined geometry/intervals, but B does not conclude a whole building empty or select E's search wording. Missing resident state, unresolved geometry and unsupported capabilities are not negative observations.

## 6. Geometry, actual parts and material meaning

### 6.1 Candidate bounds and patch model

Use existing spatial/entity membership with conservative full body/part bounds. An index of support anchors must expand for all admitted radii, heights, offsets, attachments and their swept motion. A target centre outside range or a body's feet below the ray does not reject an exposed in-range part. Eye mount rotation encloses the full arc; source and receiver movement use the union of all actual relevant pieces. A later precise range/field test applies to the real sample point, not the support anchor.

The selected optical body representation is a finite set of physical surface patches with deterministic quadrature samples. It extends the three vertical centre rays without making visual meshes authoritative. Each sample has its actual world position, outward normal and represented area. Profiles define head, torso/limb and visible attachment patches; masks and held objects have their own surfaces. Compile the fixed samples once per exact immutable shape/profile. Default locations and the complete finite ceiling live in the world/limits owners.

The model measures represented exposure, not the count of rays that happen to succeed. A small hand sample cannot weigh as much as an entire torso unless the physical profile actually says so. Profile weights describe their represented areas and normalize once; adding sample density within a patch subdivides its same area rather than increasing detectability. Do not change sample placement based on camera angle, rendering quality or unsaved randomness.

For each receptor and actual patch sample, reject absent/disabled sight, beyond finite range, outside angular field, back-facing unavailable surface and self-occluded/covered landmarks. Intersect the remaining ray with opaque/transmitting geometry in native deterministic order. Only then evaluate available illumination/contrast and authored quality. Target self-occlusion ignores only the exact endpoint surface at its contact boundary, not the whole target/assembly. Seeing the rear of a head never reads front-face landmarks.

The finite patch model intentionally cannot promise every arbitrarily small mark or opening on a renderer mesh. It must represent the selected real wall gaps, body exposure and carrying features in the physical definitions. The temporal guarantee concerns all opportunities of this declared physical model. Do not hide a supported modeled interval between time samples. An unsupported finer feature stays unobservable until its physical patch representation is authored, without changing source truth.

### 6.2 Occlusion and transmission

Reuse ordered entry/exit intersections from the existing spatial geometry owner. Preserve finite sloped solids, floors, roof overhangs and actual assembly thickness. Add dynamic optical parts and blockers through the existing physical index; a hidden blocker can physically obstruct sight without revealing its identity. Scalar hit intervals are private calculation data.

Opaque material blocks on positive interior path length. Isolated endpoint/corner tangency does not block under the existing predicate; face-coincident or penetrative cases must use the same exact geometry classification in current and temporal queries. Never skip an entire structure because the source or receiver touches one part of it.

A transmitting volume contributes optical depth equal to its extinction coefficient times actual traversed distance. Combined transmission is exp of the negative sum, multiplied by admitted surface transmission factors at actual crossings. Overlapping independent volumes contribute independently; duplicated geometry for one physical volume is deduplicated by that volume's exact identity, not by a material name. Different wavelengths/optical channels require a supported family; the initial visible-light scalar cannot secretly simulate infrared, X-ray or magical sight.

The world's source rule distinguishes leaf canopy from trunk, wall from window and a physical opening from an alpha hole in art. An opaque wall blocks direct sight/light even if client cutaway makes it translucent. A bush can let a body move through while reducing exposure; the same bush can independently attenuate light and create sound through C. Movement alone does not clear foliage or create sound without the admitted contact rule.

| Physical situation | Sensing consequence | Independent physical consequence |
| --- | --- | --- |
| Dense leaves around a visible gap | Per-path transmission, exposed patches and motion may supply weak body/motion detail. | Movement/contact and attack families use their own material response; no leaf-wall equivalence. |
| Solid wall or roof | Positive crossing blocks applicable sight and light; slopes/height matter. | Walking/projectile volumes still check actual solid geometry. |
| Transparent solid, where installed | View and light may transmit with its admitted material law. | It can still block body/weapon movement; refraction is not implied. |
| Narrow slit | Rays to represented parts may clear; field/precision remains limited. | Weapon or hand sweep must fit separately; no shot authorization from canSee. |
| Moving person in front of another | Actual opaque body parts occlude relevant rear patches. | Detection of the foreground body does not automatically expose a hidden body/count. |
| Spear extends beyond wall | The item may be observed as its own exposed object. | Carrier/carrying relation needs its own visible support; native hidden attachment is not evidence. |

### 6.3 Detail, motion and precision

Compute a detection opportunity and each detail opportunity independently. Aggregate body exposure does not authorize an occluded hand, face or tool. Fine features require their own visible landmarks, target-facing geometry, received surface illumination, angular size, transmission and central/peripheral resolution. Silhouette contrast helps body/motion detection; it does not brighten the face calculation.

Target motion is actual relative angular/surface motion against the observed background. It can improve detection salience within the world law after hard physical gates, while rapid relative movement can reduce detail fidelity. Do not reward mere hidden world velocity or punish an observer and target moving together as though their relative image motion were high. Head rotation contributes to retinal motion; a stationary person rotating gaze is a real changing observer. No motion bonus repairs zero transmission, an absent light path, out-of-field or out-of-range geometry.

Location output is based on the actually observed patch cluster. A barely detected region must not be packaged with the private exact body anchor. The world selects bearing/region/point precision bands and quantization. A point's error radius encloses the permitted quantized patch position; if that cannot establish an observed body centre, retain the patch point/region and an unresolved correspondence. Exact positions needed for native collision stay private. G must not turn a region centre into a live mesh or physical target.

For identity features, use the selected finite physical measurements and available intervals, not an entity ID, render asset identifier, clean hidden vector or arbitrary unique hash. Normalize through the pinned family into A's 0–1000 interval space; missing dimensions are omitted, not zero. B supplies visual identity fidelity; A applies its own usable-dimension, quality, familiarity and matching law. Clothing, location and carried equipment can supply separate observed details/contextual hypotheses but are not permanent face dimensions.

## 7. World-owned illumination and appearance

### 7.1 Native light evaluation

Evaluate optical light in world units declared by the installed environment. The initial visible-light family uses normalized reference illumination, not a claim of calibrated lux or full radiometry. The world policy defines the daylight curve, celestial direction, sky quadrature, point/spot falloff and surface reflectance/emission. Engine code supplies bounded geometry and arithmetic; it contains no dawn hour, species sensitivity or named-fire exception.

At a patch, evaluate direct sky paths, the sun path and all physically relevant finite sources using the same optical geometry. Sun and sky visibility cast toward the installed environment boundary through the full admitted geometry; no arbitrary short ray allows a tall wall to leak light. A finite source's candidate bound includes its true source extent and influence radius. Within it, actual source-to-patch transmission, surface incidence and installed falloff determine contribution. Add all contributions in stable source order; do not take the renderer's nearest two/eight. A bright source reaching the detector's saturation can permit an early bound only when omitted nonnegative contributions cannot change any relevant band or detail result.

Light sources consume current committed source state. A lit fire exists mechanically only while its producing item/process says it emits; fuel exhaustion/extinguishing and attachment changes are physical boundaries. The source can illuminate a visible wall while itself remains occluded. B privately evaluates the true source to produce that permitted wall light; no hidden coordinates are embedded in the outward result. Source disappearance ends its future light under the actual producing policy, independently of remembered appearance.

Sky access is sampled through the world-authored directions/weights. A roof can block overhead ambient while an opening admits a low sky path. This is a declared approximation, not universal flood-filled ambient or sunlight through every wall. Direct surface illumination and background radiance are separate. For silhouette detection, sample the supported background just beyond the target along the viewing direction using visible physical geometry or admitted sky; do not expose what that background consists of. The contrast law can reveal shape without supplying unlit face/hand features.

The first family excludes multiple light bounces, mirrors, refraction, spectral transport, volumetric smoke dynamics and eye adaptation over time. A world can install a separately supported family later. Cosmetic reflected light or tone mapping cannot be fed back into detection. An installed declaration needing unsupported transport refuses at authoring/admission; it does not silently receive a misleading ordinary-light approximation.

### 7.2 Shared physical meaning, bounded client detail

The domain owns environment/light samples; A owns which current surfaces/features the observer may know; server/protocol/G own the safe presentation. Send the environment's permitted clock/daylight description, current allowed emitter projections, and resolved illumination/contrast classifications or surface samples for already authorized visible geometry. Hidden contributors can affect these surface values without transmitting their object/life reference, exact coordinates, private fuel or hidden geometry.

G may choose a coarse surface-light field, per-patch shading or a restricted rendering proxy; it must not reconstruct hidden emitter coordinates as a shortcut. B defines those source-independent field samples as usable inputs, not a new UI/transport design. Their dependency revisions and affected region allow proper removal/update. A field sample does not authorize the hidden object that caused it.

The renderer can choose color grading, artistic ambient lift, contact shadows and hardware quality. It must maintain perceptual ordering: an authorized silhouette must not show unauthorized face/weapon detail; mechanically dark surfaces cannot become a clearly revealed hidden actor; a low-quality shadow option cannot make a character see through a wall. World-owned light still affects native evidence when a client has graphics/audio disabled. Compare graphics presets against the same acquired facts during later G qualification.

Current client sunlight and HUD day/night hours differ. The future implementation uses one installed world daylight policy for native light, rendering and the day/night indicator; named dawn/dusk activity times remain clock vocabulary unless the installed definition explicitly binds them. Existing decorative ambient brightness and remembered-fire lighting are not inherited as physical truth. These are explicit later source changes coordinated with FPW03 and G, not delivered fixes.

## 8. Detection quality, Perception and A accumulation

The selected world first applies hard eligibility: receptor exists/enabled, finite range/field, actual exposed samples, required optical paths and positive relevant signal. It then computes physical exposure/angular-size/illumination/contrast/motion quality and separate detail fidelity. Apply the settled Perception/condition gain only to available supported information. No positive stat changes a hard zero into an observation.

The base policy explicitly extends A's newly designed recognition-only Perception to this physical detection/resolution consumer. The baseline code has neither that new stat nor this use. Install it once through the existing attribute/world definition owner and read its settled value through the current attribute reader; do not create a second perception meter. Conditions use the owning contribution/attribute interface. B does not read psychological fear as an undocumented accuracy or sensing modifier.

Convert continuous physical quality into the finite support bands in the world policy. Certify the time boundaries of each band. Each resulting run has a constant rate or immediate condition, so A can integrate exactly regardless of how the host divides a simulation interval. Arbitrary midpoint sampling of a varying rate is forbidden. Finite received-detail/precision bands likewise have real change boundaries; diagnostic raw quality is not a probability of truth or an automatic public statistic.

A alone owns the weak threshold, maximum progress, gap decay, episode grace and learning cadence from its pinned recognition policy. B supplies a full-rate multiplier and actual covered simulation interval. Convert authored per-normal-second rates with the admitted 60:1 clock once; runtime speed is not multiplied into the rate. A consumes only the uncovered interval, solves the first threshold crossing, stores progress and emits its own immutable acquisition. A returning query, repaint, network retry or restored cache creates no extra support or familiarity.

At a physical loss, finish the preceding supported interval under its original pins, then report the new unsupported/no-opportunity interval. A ends only affected live facets immediately and retains its own allowed correlation/decay state. A's grace does not grant continued current sight. Later reacquisition cannot supply the route, equipment change or action performed during the gap.

Strong exposure becomes immediately eligible at its actual native opportunity boundary; A still must acquire it before a consumer can use it. Positive-duration interval support and point-event semantics are specified below. Optional AI attention does not delay this native work, and a native animal with no autobiography receives the same relevant physical input through A's compact path.

## 9. Actual trajectories and complete temporal coverage

### 9.1 What advances and what does not

Use simulation seconds for saved times and interval endpoints. The selected normal clock is 60 simulation seconds per normal-speed second; actor walk speed 0.11 m/simulation-second means 6.6 m per normal-speed second. The current 4 m travel bound can therefore leave about 0.606 normal-speed seconds between spatial samples. A 0.10 m opening crossed at that speed lasts about 0.0152 normal-speed seconds, or 0.909 simulation seconds. Both endpoints can be occluded. At 8×, its wall-time duration is smaller again; its physical exposure, turn progress and evidence remain identical. These are examples, not new displacement or frame limits.

The native owner must bound a proposed advance by the earliest relevant admitted physical/knowledge event. The old travel-distance bound remains a conservative integration aid for owners that still use it. It cannot certify visual absence, a continuous live lease, or complete weak exposure between its endpoints. A narrower global travel step would still miss an arbitrarily narrow modeled gap; install the supported temporal evaluator instead.

The physical trajectory input is a finite ordered sequence of actual segments, each with actor/object/life, definition and action pins; original start and end simulation times; a supported transform law; and all admitted discontinuities. Translation, body turn, sensory joints, relevant attachments and emitter mounts derive from these segments. Source samples, body shapes or light output cannot be interpolated across a teleport, replacement, destruction, material change or discontinuous action transition. Segment endpoints explicitly name which pre/post state applies. A zero-motion observer with a turning head is still temporally active.

| Current movement/pose family | Required temporal treatment before claiming complete visual coverage |
| --- | --- |
| Existing predicted move, flight and flee | Retain admitted path pieces and existing quadratic range/geometry helpers; extend to sample positions, gaze, lights and precise opportunity boundaries. Do not replace a known path with one chord through corners. |
| Approach inside target/item/resource actions | Expose each actual locomotion segment to the same preparation owner; currently these cannot inherit the move action's coverage merely because they change position. |
| Falling or other admitted acceleration | Install the actual bounded polynomial trajectory and supported intersections, or stop at the last coherent boundary with explicit unsupported preparation. Do not label linear interpolation of a fall complete. |
| Current 0.4 m wander impulse | Change that owner to admit a short real movement segment at its actual movement speed, with start/end and facing policy. Preserve the decision timer/RNG meaning and total travel/cost; do not add extra hops. Until changed, a teleport-like impulse has only actual endpoint evidence. Never invent retrospective travel through the old gap. |
| Head/body turn | Original-anchor, bounded piecewise angular trajectory, including completion/limit and optional control-tick boundaries. Stationary actors participate. |
| Posture or optical attachment change | C/object owner supplies actual part transforms over the admitted transition. An instantaneous supported change has ordered before/after states; no guessed crouching animation supplies intermediate cover. |
| Moving light/occluder | Actual object/assembly/body trajectory and material/output changes, including old/new support volumes. A decorative renderer animation is not a trajectory. |

### 9.2 Deterministic control of a moving gaze goal

The initial family does not require a continuously solved pursuit differential equation. A fixed relative-angle request uses its exact bounded turn until reached. For a literal world point or A-permitted tracked target whose receptor/goal is moving, use the world's **30 control ticks per normal-speed second**, anchored to the directive's original admission time. At the selected 60:1 clock this is 2 simulation seconds per tick. These are native physical control boundaries, independent of frame rate, host batch size, speed multiplier and publication.

At an admitted tick, first settle the already accepted pose and acquire the current physically supported measurement through A. Resolve a literal world point or A's currently authorized point/region, then compute the bounded eye/head/body goal with the installed allocation rule. Start a new piecewise constant-rate joint segment from the actual current angles. Stop each joint at its goal or limit. A target's unobserved transform, carried item or later motion is never an input to this steering step. On support loss use the request's already selected stop or last-observed-point behavior. A may supply coarse/old-within-lease position precision; the gaze follows that authorized estimate, not an exact hidden coordinate.

Ticks are omitted when the relative goal and receptor are stationary and no tracking refresh is required; completion and dependency changes still apply. A directive that ends has no scheduled ticks. A literal world point remains an intentional point in space after the entity once occupying it leaves. Attention must explicitly choose to renew or investigate; the physical owner does not reacquire targets by secret tracking. The 30 Hz control approximation and its gameplay qualification are inventoried; all sensing between those actual piecewise trajectories remains continuous under the supported model.

### 9.3 Partition construction

Prepare physical opportunity runs before publishing observations. The selected implementation pipeline is:

1. **Capture one coherent scope.** Pin source/receiver life, exact definitions, attribute reads, actual trajectories, relevant spatial/optical/light revisions, and the native interval under preparation. Reject stale or incomplete inputs before effects. Keep the previous accepted boundary available.
2. **Collect possible pairs conservatively.** Query swept receptor range/field bounds against swept optical-part bounds, plus relevant occluders/backgrounds/light supports. Broad-phase rejection must prove no supported patch can participate. Do not reject a pair using feet, target centre, present cell alone or a light's current position alone.
3. **Split at admitted changes.** Use motion corners, turn completion/limits/control ticks, pose changes, action boundaries, source on/off/material changes, lifecycle, day-curve pieces, actual geometry changes and native knowledge deadlines. A host-requested publication/restore split is a restriction of the same physical segment, not a new trajectory or root-search origin.
4. **Isolate geometric and optical branch changes.** Include range, receptor fields, patch front/back orientation, ray/volume entry and exit, occlusion/background ordering, source reach/cones, sky/sun obstruction and visible relation support. Compute actual material path lengths on each stable branch. Existing linear range roots and sight-sweep geometry are useful building blocks, not complete B results.
5. **Isolate quality and precision changes.** Evaluate the world formulas with conservative interval bounds. Split at every finite detection-band, detail-band, face-angle/size and received-position quantization transition. Relative angular speed changes are included. A stable run has one supported facet/feature set, one finite precision band and one constant evidence rate/immediate classification; it need not pretend that the underlying light or position is constant.
6. **Ask A for acquisition/learning boundaries.** Supply the complete classified opportunities to A's preparation path. A can solve its threshold, decay/correlation and feature-learning deadlines. Restrict the native advance to the earliest required actual measurement; evaluate that measurement at its actual pose, then let A acquire. B does not advance A's ledger into an uncommitted future.
7. **Commit at the selected native boundary.** Revalidate captured dependencies. Advance the existing physical owner, acquire through A in canonical occurrence order, then perform dependent action/outcome work. The next slice continues from the same original trajectory pins. Publish only after the coherent transition is complete.

All relevant event times belong to one ordered merge, not independent timer loops that can pass one another. A new admitted action or geometry change invalidates affected future predictions; past acquired facts retain their original evidence. An interrupted preparation discards its speculative result without overwriting accepted state.

### 9.4 Certified solver and finite numerical failure

The selected optical family needs an implemented conservative interval evaluator, not a promise to increase sampling frequency. For each primitive, implement point evaluation, enclosing interval evaluation and the derivative/critical-point information used by the supported isolator. Use outward-rounded bounds for arithmetic, trigonometric/exponential/square-root terms and coordinate transforms. JavaScript's ordinary point Math calls alone do not establish a conservative enclosure. Installation must select the qualified interval math implementation/version; implementing or selecting that helper is VG03 work, not a new world rule or an external executable plugin.

For existing linear range/intersection families use analytic polynomial roots and the same strict-interior rules as instantaneous geometry. For bounded rotation and changing light, recursively classify a canonical interval cell:

- If all necessary predicate/quality enclosures lie in one admitted classification, emit that certified constant-class run. Equality belongs to the declared boundary class; an exact constant-at-threshold expression uses its proved constant value.
- If a changing scalar has a nonzero derivative enclosure and its endpoint signs bracket one root, isolate that unique root by directed refinement. Other predicates must also be certified on the resulting pieces. A monotone certificate cannot be inferred from two point values.
- If a derivative can vanish, isolate its supported critical points and split there; use the primitive's analytic certificate for repeated/tangent roots where available. Otherwise subdivide conservatively. Unexamined cells remain unresolved, never presumed empty.
- Refine in chronological order, splitting at the exact representable midpoint with deterministic ties. Check all cells; endpoints/midpoints alone are never a completeness proof. Store the original segment/cell coordinates so later host partitioning does not restart a different search.

The initial family permits **64 subdivision levels** and **16,384 classified/refined cells per candidate pair per canonical physical piece**. A physical piece is the admitted motion/turn/environment-law piece restricted to an absolute world-epoch grid of one normal-speed second; it is not the caller's current rendering or host time budget. Additional true native changes split it. These numbers bound failure detection, not semantic contributor selection. A time range with no distinct representable interior or a non-increasing computed end is unresolved unless an analytic certificate fully classifies it.

Representable event times use one family-wide rule: isolate the mathematical crossing with directed lower/upper bounds, choose the first representable simulation time whose post-crossing classification is certified for an onset, and the last certified supported time for an end. Record the numerical enclosure in private preparation diagnostics. Do not round an onset earlier, extend a live interval later or treat an uncertain sliver as acquired exposure. If that enclosure can change acquisition, feature availability or ordered pre-outcome membership and cannot be refined to a unique supported result, return **unresolved preparation**. Do not silently erase a positive interval because it is below 10⁻⁹ simulation seconds, a frame duration or an implementation epsilon. Canonical root anchors and rounding are unchanged by restore or host partitions.

An exactly isolated tangent with no positive supported neighborhood creates no visual opportunity. A static admitted object/action transition at a native boundary can establish an immediately obvious opportunity when the resulting state has certified right-hand support; it need not wait for a fake epsilon tick. At an already acquired interval's ending boundary, complete the certified preceding exposure and end the affected current support before later consumers. A query at a tangent does not manufacture an acquisition that the temporal classifier forbids. The same inequality/equality convention is used by direct queries and interval prediction.

Exhausting cells/depth, encountering an unsupported dynamic optical shape, failing a required interval certificate or finding ambiguous ordering is a technical failure. Yielding for the 256-work-unit continuation quantum is instead normal incomplete work. On terminal failure, keep the last coherent native boundary, report the responsible family/input and unresolved bracket through existing diagnostics, and require a new supported command/content change or corrected implementation before retrying that same failed preparation. Never automatically retry forever, advance past it, publish guessed no-sight, retain stale live sight or present a fictional blindness/refusal. Save the accepted state; discard speculative acquisitions. VG03 must qualify ordinary authored fixtures so this safety path is exceptional, not a normal play loop.

### 9.5 Ordered turn, observation and strike preparation

For a native action boundary, use this order within the existing occurrence/transition owner:

| Phase | Required behavior |
| --- | --- |
| Advance admitted past work | Bring already admitted movement, body/head/eye turn, light and pose to the boundary using their original anchors. A newly requested turn has no elapsed preparation. |
| Acquire preceding/current opportunities | Finish physical coverage up to the boundary, apply required onset/loss transitions and have A acquire supported evidence that canonically precedes the pending outcome. Do not run optional thought selection first. |
| Capture the consuming cut | F captures its EvidenceCut at its actual position in canonical occurrence order, including only evidence already acquired. B supplies no awareness or surprise boolean. |
| Resolve the prepared action | Existing action/contact owner consumes that cut and actual body/guard geometry. Head direction alone has not rotated a shield or admitted a defense. |
| Publish resulting signals/state | Contact, pain, destruction or other outcome signals occur after that cut and cannot retrospectively prepare the actor for the same outcome. Reprepare any changed geometry/light for later work. |

If a separately admitted turn completes at the same numeric timestamp, membership depends on its canonical transition position and actual preceding acquired evidence, not equal timestamps alone. A completed view can support F's later decision; a turn instruction submitted after the cut cannot. E may choose a reaction only after its available evidence, subject to actual action timing. The native owner must not serialize an uncommitted future turn as past preparation during save.

## 10. Candidates, relevance, caching and bounded work

### 10.1 Spatial selection and audience

Extend the existing spatial broad phase with optical-part bounds and finite source supports. A receiver query begins with its finite receptor reach and the conservative union of its admitted swept fields, not the entire population. Find potential target parts intersecting that region. For a moving source/occluder, reverse-query receiver support bounds in the union of old, new and swept affected regions. Use actual vertical extent; a support anchor can be outside a cell or range while the visible part intersects it.

One receiver with two eyes receives one combined candidate opportunity. Prepare shared environment/geometry records once per coherent region/revision and reuse immutable results across compatible requests. Stable entity/life, part, receptor and source order gives deterministic reductions and continuations. Do not share a result across observers with different position, head pose, optical policy, settled attribute or permitted appearance family merely because their cells match.

Relevance is physical and task scoped: current local sight candidates; ongoing certified weak/current support whose loss must be processed; actual event candidates requested by A; and explicit, already-admitted inspection/watch regions. A previous memory is not permission for a hidden target query to feed new details. Broad-phase preparation may privately touch hidden geometry as needed, but no candidate index, missed-candidate count or rejection reason is exposed as observer knowledge. Optional attention priority can influence E's choices, never suppress a physically mandatory warning/acquisition or postpone lease loss.

No per-frame all-observer × all-target scan is selected. Normal work is proportional to affected local index visits, admitted sample/receptor pairs, intersected optical primitives, relevant light/background paths and actual temporal transitions. A genuinely dense crowd in which everyone can see everyone can have quadratic real interaction count; this design does not claim otherwise. The limits inventory explicitly leaves total dense-scene capacity unqualified. Changing a cache or a renderer light cap is not an answer to that capacity question.

### 10.2 Dependency keys and invalidation

| Dependency change | Required invalidation/repreparation |
| --- | --- |
| Receiver translation, body heading, head/eye pose, receptor enabled state or height | Receiver's relevant current and swept candidate results; old and new viewed regions; temporal certificates from the change onward. |
| Target/attachment translation, turn, pose, actual body/part replacement, lifecycle | Receivers whose old/new/swept support intersects the changed parts; current facet-loss completion and new opportunity preparation. |
| Optical geometry/material, assembly transform, door, wall, foliage density | Rays/regions whose conservative swept support intersects the changed volume; observer-target and all affected source/sky/background transmission. |
| Emitter enable/output/range/position/mount | Receiver/target surface-light regions within old/new/swept source support, including indirect effects on silhouette contrast. Hidden source invalidation stays private. |
| Clock/daylight/environment policy | All affected daylight/sky optical regions and temporal certificates; coalesce one environment revision rather than append one dirty item per rendered patch. |
| Settled attribute/trait/condition affecting sight | Receiver quality/detail results from that native effective time; no geometry redefinition and no retroactive evidence gain. |
| Definition pin, life/control generation, action directive revision | Exact dependent preparation; stale source/control requests refused. Recognition history itself remains A's responsibility. |

Use existing monotone owner revisions and actual changed regions. A same-cell test is insufficient for turning, shadows, small gaps and within-cell motion. Light changes require both surface and background invalidation. A moving opaque body can change another pair's sight/light even if it is not their target. Source-output changes and head-only turns must issue sensory invalidation through the same accepted transition path as translation.

Cache only immutable prepared physical inputs/results with complete keys. Separate instantaneous geometric queries, shared optical/environment samples, temporal certificates and A's authoritative state. Point caches cannot certify a duration; one certificate cannot authorize a later value sample. After cache eviction, restore, incomplete dependency coverage or a missing revision, recompute conservatively. No cache miss is a negative observation. Retain the existing 128/512 eviction capacities initially as engineering choices; do not cap audience or light participation with them.

### 10.3 Continuations and back pressure

Charge at most the selected **256 primitive-work units per continuation** through the existing native work owner, including inner primitive intersections/refinements. Retain a serializable-or-rebuildable cursor over stable ordered inputs, captured revisions, accumulated private classifications and original canonical cell anchors. A yield has no partial evidence side effect. Resume only after dependency validation; otherwise discard and reprepare the affected accepted scope.

Coalesce repeated dirtiness by existing source/region revision and one pending invalidation per owner; use a full-region rebuild flag when detailed invalidation provenance is unavailable. Do not append an unbounded duplicate job for each frame, each eye or each light sample. A continuation's retained primitive/input bounds and bytes count toward qualification. The population/index/overlapping-light totals can still grow; there is no claim that the queue as a whole is bounded merely because each slice is.

If required vision work is incomplete, the native owner yields at its current coherent boundary before allowing a dependent attack, knowledge read or publication to observe a half-prepared result. Existing unrelated work can proceed only where its owner already proves independence; B creates no alternate clock. User-visible diagnostics belong to existing technical progress/error handling, not an in-world stealth penalty. A terminal family failure follows §9.4; ordinary work exhaustion resumes without resetting progress or duplicating acquisitions.

### 10.4 Performance qualification contract

VG07 must measure whole native callers, not only the raw ray function. Report candidate/index visits, receiver/target/patch count, primitive intersections, sky/source/background evaluations, interval cells and depth, cache hit/eviction rate, dirty queue size/oldest age, continuation retained bytes, accepted simulation progress and total latency. Keep world setup, actual contributors, speed multiplier and cache state in the benchmark record.

Required workload families are: one moving observer in sparse terrain; the same observer in dense foliage/architecture; a moving crowd with local mutual visibility; many stationary observers while one body turns; one light changing behind a wall; many overlapping real lights; sunrise over an occupied settlement; a moving assembly/door; repeated body/attachment changes; and cold restore of the same scenes. Compare normal and accelerated clocks at equal simulation progress, including the old four-metre threshold crossing. Double spatially distant unrelated population separately from doubling real local contributors. The former should not impose an all-pairs slope; the latter must report its real growth honestly.

No millisecond, population, frame-rate or hardware pass number is invented here. Before claiming production capacity, the existing performance owner must record representative hardware/scene envelopes and measured acceptance targets under the limits policy. That explicit qualification dependency cannot be closed by a microbenchmark, fixed nearest-N selection or reducing rendered lights. Unsupported numerical families are refused before semantic publication even if they would be faster to approximate.

## 11. Persistence, restore and lifecycle

Persist current admitted spatial body heading and sensory-joint angles; exact body/rig/feature/material/light/clock definition pins; actual optical/body/attachment values; and existing object/source enabled state. Persist the unfinished orientation directive in the existing action continuation, including original start/segment anchors, next canonical control tick, accepted goal, target's scoped life/reference where applicable, loss behavior, action generation and orientation amendment revision. Save A's acquisition/weak-progress/current-support state through A, not in the gaze record.

Do not save renderer camera direction as a physical gaze, derived eye world positions as another authority, cached visibility booleans, speculative future observations, independently copied recognition features, GPU light/shadow state or a second watch timer. The current accepted pose and original continuation anchor must agree at the saved simulation time. A future control tick is derived from the original grid/index; restore does not schedule it at an arbitrary fresh interval from now.

Current-format validation must reject missing/nonfinite required fields, impossible joint indices/ranges, cyclic/missing mounts, incompatible action claims, mismatched pose/trajectory anchors, stale actor or target life, unresolved mandatory definition pins, invalid material/shape family, duplicate feature/patch IDs and impossible source/attachment transforms. A missing optional gaze directive means no ongoing turn; it does not make required current rig data optional. A body explicitly authored with no optical receptors is valid. A world missing required visual definitions is invalid installation rather than universal blindness or generic human fallback.

Load the coherent native spatial/action/world state first, validate all pins and supported capability families, then rebind A's current support under its restore contract before publishing a personal view or resuming an outcome. Drop physical caches and rebuild necessary certificates from saved original trajectory anchors. Pure revalidation/confirmation does not add exposure, recognition learning or another native signal; actual unprocessed time advances once through the ordinary owner. The same saved A source revision cannot be reissued as a new event.

On death/destruction/body replacement, end dependent actual optical support at the owning transition and let A finalize only its affected leases. On control handoff, G/E's stale intention requests are invalid, while the body's already admitted physical pose continues or ends according to the existing handoff/action policy. A new controller does not inherit another observer's private knowledge through a gaze field. A target life replacement at reused coordinates never resumes the old tracking target or exposure episode by ID alone.

Restore during unfinished private preparation is supported by discarding that speculation and rebuilding from the last committed boundary; no partially consumed A interval has been published. If the native framework later persists a private cursor for efficiency, validation must prove identical captured inputs and canonical anchors, and discarding it must still produce the same accepted outcome. Saving cannot turn unresolved preparation into no-sight or bypass a pre-outcome cut.

## 12. Capability and authoring contract

The physical world installs supported mechanism families through existing sense/body/action/material definitions. It can author receptor count/mounts, finite range/field, angular quality, joints/rates/limits, brightness response, appearance dimensions, optical shapes, daylight and emitters within their validated envelopes. It cannot install an executable script, arbitrary unbounded expression, renderer callback or omniscient identity extractor in place of a supported family. New families require source changes, point/interval evaluators, current-format validation and qualification together.

Trait integration uses settled existing contribution readers. A wide field can come from an actual lateral-eye rig; a damaged/covered eye changes its actual enabled state; high Perception improves supported detection/detail; a nocturnal profile selects better brightness response. An adjective alone grants nothing. Transparent or luminous bodies need actual optical material/emission definitions. An eye mounted on a tool or separately owned creature uses that actual observer/control/knowledge relationship; seeing through another character's eyes is not granted by this design.

Worlds without ordinary optical sight can explicitly omit it or install a different already supported sense family. Echolocation, scent, thermal radiation, supernatural perception and shared minds do not use these visible-light equations by default. They require their own authored source/propagation/knowledge contracts. A different world may use no Perception attribute, a different body field or no day/night; it must provide an explicit supported policy and compatible units. The bundled human, grazer and fixed-receptor fixtures are qualification contrasts, not global taxonomy.

Public offers expose only physically actionable capabilities, reachable aim/region, known compatibility/refusal causes and supported feedback from the observer's allowed information. Do not expose target-private field checks, hidden face descriptors, total candidate counts or unseen obstruction identity as a helpful error. E chooses whether/when to inspect, maintain a watch or redirect its limited voluntary attention. G defines input binding, camera behavior and how limited/reached/lost feedback is presented. B's capability query must use the same read-only validation as final admission so an offered glance cannot bypass the actual action owner.

