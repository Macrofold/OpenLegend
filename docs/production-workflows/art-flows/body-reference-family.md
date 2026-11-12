# Build an adjustable body family from visual references

**Design for a bounded experiment; production qualification is open.** This procedure produces corresponding, reference-led body shapes and fits them into OpenLegend's existing character machinery. It does not resume the paused anatomy proof, install assets, change the current cast or qualify an entire character library by itself. [MHP10](../../maintainers/art/metahuman-poc.md#peacock-anatomy-controls) owns the first body/shirt acceptance; [PPL05–PPL07](../../maintainers/art/people.md#family-asset-delivery) own broader body, age and base coverage. The [family contract](../../projects/people-from-parts-authoring-contract.md) remains the runtime and file-format authority.

## 1. Outcome and boundaries

An artist supplies strong visual targets for a deliberately sampled body space. Image generation supplies consistent construction views; Meshy supplies detailed donor geometry; fitting transfers that geometry onto the selected canonical topology; the existing compiler/evaluator turns corresponding shapes into editable recipes. The visible target remains beside the work at every stage. A few measurements or a prose description cannot replace it.

The first delivery is one adult masculine family at a fixed apparent age, stature and structural frame, with independent **muscle mass, fullness and definition**. It includes a replaceable canonical head, complete underlying anatomy, separate close-fitting baseline coverage, and the **same existing premade Peacock shirt** working across every qualified recipe and motion. It includes source-to-runtime comparisons and reconstruction evidence, not only attractive stills. No custom tunic, hair library, new viewer, character-creator UI, engine replacement or production selection belongs to this unit.

Later stages add an independently authored feminine body, adult age responses, structural/proportion controls and approved younger ranges. These are explicit staged deliverables, not capabilities implied by a successful masculine grid. The body workflow leaves face identity, facial sliders, skin finish, hair/beard/brows and a full wardrobe with their existing owners. One neutral head is sufficient for body qualification; it is insufficient for whole-character or adult-face-age acceptance.

### What must remain reusable

- The canonical vertex order, UV correspondence, region labels, ordered neck ring, skeleton conventions and editable fitting data.
- A source catalogue relating each accepted reference, donor, corresponding body and recipe to exact files and measurements.
- One offline target conversion path feeding the existing family compiler and one runtime evaluator, rather than a new script for each physique.
- Separate clothing bindings, weights, ease and supported ranges. A named build is a preset of controls, never a special deformation branch.
- Exact rejected and accepted evidence, with their status. A technically valid export does not supersede an approved silhouette or repair a rejected source by declaration.

The body is an anatomical surface beneath clothing, not a shirt-shaped hollow shell. The donor is an artistic source, not an automatically usable rig, family or final game asset. OpenLegend must evaluate the shipped family with Unreal, MetaHuman and provider services closed.

## 2. Inputs and authority

Before any production run, resolve these fields in the existing [study record](study-record.md). Missing source IDs, budget, target selection or required permissions stop the dependent operation; they do not prevent independent design work.

| Input                   | Required value and authority                                                                                                                                                                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task and stopping point | Design/concepts, donor production, family qualification or integration; do not infer the next stage from a successful prior one.                                                                                                                                                                   |
| Selected body           | Exact accepted reference views, source recipe, canonical family revision and complete editable body. For the first Peacock comparison, preserve mass/fullness/definition `50/0/100` and its approved waist/lower-rib silhouette. The paused hand-shaped fuller candidate is not an accepted donor. |
| Reference roles         | Identify which image governs anatomy, which governs style and which is diagnostic. Armour and beard do not govern hidden torso or jaw volume. A donor cannot silently overrule the approved concept.                                                                                               |
| Fixed quantities        | Apparent age, physical stature, neutral skeleton/frame, head identity, skin/presentation, pose, camera and lighting. Read the actual reference stature from the selected family; do not infer centimetres from image size.                                                                         |
| Runtime context         | Exact current family/compiler/renderer revision, same named shirt and motion sources, existing browser budgets and current admitted appearance/spatial owners.                                                                                                                                     |
| Cost/access             | Remaining cumulative task allowance, current provider price for the actual operation, permitted source rights and private archive destination. A row count is not permission to spend for that many jobs.                                                                                          |

Use the [paused study](../../../art-direction/studies/2026-11-11-peacock-full-transfer/README.md), [production strategy](../../research/character-production/archive/2026/2026-11-11-strategy.md), [art lessons](../../research/art-production/lessons-needs-design.md) and current [world direction](../../../art-direction/decisions.md) as inputs. This workflow adopts the strategy's source-led 2 → 4 → 12 experiment, not an unqualified promise that twelve shapes cover all people.

## 3. Controls: independent inputs, interacting anatomy

Use normalized values `0…1` in manifests; percentages are display labels. They are travel through authored targets, not body-fat percentages, muscle kilograms or medical classifications. A preset name describes a sample only.

| Control                  | What changes                                                                                                       | What remains protected; interaction                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Body base                | Select a corresponding authored anatomical foundation, initially masculine or feminine.                            | Personal gender is separate world data. Base selection does not confer abilities, personality or permissions. Cross-base blending is unsupported until specifically qualified.                   |
| Apparent age             | Whole-body shape and distribution; age-conditioned physique responses and, in its own work, face/maps.             | Do not substitute wrinkles for changed body structure, or force weakness, stooping or greying. Chronological aging is a separate mechanic.                                                       |
| Stature                  | Uniform final anatomical height after shape evaluation.                                                            | Scale anatomy, rest rig and attachments exactly once from the soles; exclude hair/shoes from crown height. Use existing spatial admission for actual physical stature.                           |
| Structural breadth       | Shoulder span, ribcage breadth/depth and pelvic frame.                                                             | Changes relevant internal landmarks; does not set tissue mass or fullness. In the existing bundled profile this is `breadth`, not the historical `frame` key.                                    |
| Local structural breadth | `shoulderBreadth`, `hipBreadth` and any later explicitly authored regional structure.                              | Residual adjustment over the selected structural breadth, with measured physical limits. Do not represent the same deformation twice.                                                            |
| Muscle mass              | Muscle-group volume across torso, shoulders, arms, seat and legs.                                                  | Fixed stature and bone frame for this first grid. A large, lean muscular person remains possible.                                                                                                |
| Fullness                 | Adipose volume/distribution across neck/trunk/back/waist/seat/upper and lower limbs, as appropriate to the source. | Fixed bone landmarks for tissue-only changes. The visible shoulder width can increase even though skeletal shoulder span stays fixed. Fat arms belong here, not in a bigger-biceps-only control. |
| Definition               | Shape of muscle bellies and separations at the selected mass, fullness and age; maps for fine detail.              | Does not turn a slender body into a large lifter. High fullness attenuates visible relief through authored interactions, without silently rewriting the requested definition value.              |
| Local soft anatomy       | `belly`, chest/breast volume and shape, supported regional refinements.                                            | Residual over global fullness/mass. A chest control is not a substitute for ribcage or pectoral mass. No isolated extrusion with a hard border.                                                  |
| Proportions              | Leg/trunk ratio, arm/neck/head length, neck girth and qualified local dimensions.                                  | Length controls move joints and preserve declared total-height compensation. Fixed total stature does not permit arbitrary incompatible limb sums.                                               |
| Pigment/finish           | Skin/eye pigment, supported marks and maps.                                                                        | Material-only changes reuse geometry/rig/fits. Do not infer ancestry, identity or capability.                                                                                                    |
| Head/style/parts         | Replaceable face identity, hair/beard/brows and clothing/accessories.                                              | They follow their existing fit contracts. Head independence still requires a shared neck interface and correct attachment scale.                                                                 |

The [bundled profile](../../worlds/base/people-appearance.md#control-definitions) owns exact current keys and provisional ranges. Its `frame` currently interpolates feminine/masculine anchors; it must not be relabeled as generic skeletal breadth. The selected proof may expose independent base packages and alias a single base's data at both evaluator frame endpoints. Do not change stored meaning to simplify a new UI.

**Global breadth at 100% and shoulder refinement at 0% can coexist** if that combination is inside the family's qualified envelope: the latter means the narrow residual relative to the broad structure, not the globally narrowest possible shoulders. Publish the resulting joint span and outer surface span separately. Controls are independently settable inputs, not a promise that their visible effects are disjoint. Evaluate a recipe deterministically from neutral data; never accumulate edits onto the last displayed body. Invalid combinations need a clear unsupported-range result, not an invisible clamp that changes another slider.

### Example recipes, not body categories

| Illustrative appearance       | Mass | Fullness | Definition |
| ----------------------------- | ---: | -------: | ---------: |
| Slender, little relief        |    0 |        0 |          0 |
| Wiry                          |    0 |        0 |        100 |
| Selected lean athletic source |   50 |        0 |        100 |
| Moderate, softer build        |   50 |       50 |          0 |
| Large lean musculature        |  100 |        0 |        100 |
| Fuller, moderate musculature  |   50 |      100 |          0 |
| Strong and full               |  100 |      100 |         50 |

Low definition alone does not mean fat. Increasing muscle mass alone must not create an expanded ribcage ledge or breast-like isolated chest extrusion. Fullness must not leave fit arms, legs and back attached to a rectangular belly. Definitions are source-relative, not stereotypes about gender or age.

## 4. Sampling plan and model counts

Separate **reference targets**, **independent donor meshes**, **corresponding support shapes**, **interpolated validation bodies** and **runtime targets**. They are different counts. A Meshy retry is a job, not another required body type. A baked character is not a new support model.

For one adult base/age/frame, the review matrix is the full Cartesian product:

```text
mass      = [0, 0.5, 1]
fullness  = [0, 0.5, 1]
definition= [0, 0.5, 1]
27 recipe coordinates; stable row ID: M{000|050|100}-F{000|050|100}-D{000|050|100}
```

Plan all rows before production. Each has an intended reference or explicitly unaccepted synthesized comparison, source status, geometry status and shirt/motion result. Generate reference sheets as consistent variants of an accepted anchor, with reference inputs retained. Do not assume a label in a prompt makes a measurable 50% anatomical midpoint.

### Stages and advancement

| Stage                              |              Independent supports | Work and exit                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | --------------------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A: usable lean/full pair           |                           2 total | Existing accepted `50/0/100` and new `50/100/100`; identical skeleton, stature, age and pose. Establish whole-body source fidelity, correspondence and natural motion. Repair input mismatch before fitting a whole grid.                                                                                                                                                                                      |
| B: definition interaction          |                           4 total | Add `50/0/0` and `50/100/0`. Qualify both definition sweeps and their fullness interpolation. High-fullness/high-definition is a strong full body, not exposed cut abs painted over fat.                                                                                                                                                                                                                       |
| C: mass interaction                |                          12 total | Add mass 0 and 100, each at all four fullness/definition endpoint combinations. Compile the complete core volume and compare all 27 reference coordinates.                                                                                                                                                                                                                                                     |
| D: systematic refinement if needed | 21, then at most 27 grid supports | If the fullness midpoint plane fails, author all nine `F=.5` supports across the 3×3 mass/definition grid, rather than chasing individual failed combinations. If remaining definition midpoints fail, add the six missing `D=.5,F∈{0,1}` supports. All 27 are then independently sourced. This is a bounded escalation requiring available budget and a demonstrated error; do not generate it automatically. |

Only 12 of the 27 initial validation shapes are independent supports. For the other fifteen, the initial evaluator synthesizes the shape; independent reference art judges whether that interpolation is believable and faithful. Synthetic midpoint geometry is not independent validation evidence. A source image that cannot be made mutually consistent stays unresolved, not a target the fitter must distort itself to satisfy.

The first 12-shape experiment preserves MHP10's **30 recipes and 24 sweeps**. Its 30 are `M∈{0,.5,1}`, `F∈{0,1}`, `D∈{0,.25,.5,.75,1}`. Union with the 27-point grid gives **45 unique static recipes**, not 57. The six definition paths hold `M∈{0,.5,1},F∈{0,1}`; the nine fullness paths hold `M,D∈{0,.5,1}`; the nine mass paths hold `F,D∈{0,.5,1}`. Sweep the remaining axis over its complete range. Inspect quarter-fullness/quarter-mass observations from the recordings; do not replace the accepted check set with a smaller chart.

### Age, base, height and the larger matrix

The example `3 ages × 2 bases × 3 mass × 3 fullness × 3 definition` is **162 reference/validation coordinates**, not a requirement for 162 unique Meshy meshes. It also omits teen transitions, structural/proportion controls and head identity; therefore it does not establish complete coverage by itself.

After MHP10, use the existing **adult milestone at ages 30 and 75 with midpoint 52.5**, two independently authored bases, four specified physique recipes per age and eight age sweeps. Its 24 comparisons remain required. Expand a new age's 12-shape volume only if authorized for that broader range; an age slider backed only by neutral body aging is insufficient.

The broader bundled target still names adult anchors **18, 35, 60 and 80**. Do not silently replace those with the proof's 30/75 samples or claim their range from it. At twelve supports per adult anchor, two bases and four anchors imply **96 corresponding body supports**, before structural residuals or required corrections; the associated 27-point grids contain **216 evaluations**. This is a planning count, not a quality guarantee or spending request. Accepted supports may be reused where exactly compatible. The proof ages need their own evidence rather than relabeling an older shape's age.

Height alone does not require another donor grid: uniform scaling and existing contact/admission checks cover the declared stature range. Structural breadth and local proportions require their own authored response targets and interaction qualification; never multiply every axis into a blind full Cartesian production run. For each added control, define its neutral/endpoint sources, affected regions/landmarks and interaction rows before the batch, then check the global physique corners most likely to stress it. This is a planned coverage matrix, not ad hoc user testing.

Child/teen/adult continuity remains PPL07. Choose age-appropriate anchors and coverage only when that stage is approved; child bodies are not shrunken adult donors or extreme adult mass variants. Shared topology enables interpolation but does not guarantee plausible growth. Adjacent bands must share qualified overlap geometry, joints, fit and motion; otherwise expose separate supported ranges. No instantaneous invisible model swap at a birthday. The current design does not authorize youth image generation.

## 5. Concept generation and source admission

### Make each source visually determinate

1. Start from the accepted body image, not armour measurements or a text summary. Record exact source paths/hashes and which parts are reliable. Use ImageGen edit/reference inputs to preserve pose, frame and identity across a batch. If the source has hair/beard, request a bald neutral head or use a neck-down body donor; do not let hairstyle change the head scale used for registration.
2. Produce front, true side and back views of one adult in one declared pose, equal scale and floor line. Use the selected canonical A-pose where possible. Require a clean unobstructed side contour, separated limbs, neutral pelvis and comparable shoulder/hip landmarks. If the side arm occludes the torso, request a dedicated unobstructed side view and record the pose difference; never call mismatched poses identical.
3. Use plain neutral lighting, background and lens, no depth of field, vignette, fog, beauty blur or dramatic rim light. Keep full feet and crown visible. A clay diagnosis later removes material and normal maps; it does not intentionally blur the torso.
4. Male adult coverage is **plain opaque white medieval linen braies/close-fitting cloth wrap**, smooth over the pelvis and upper thighs, with no modern elastic/logo, hanging panels, bulky seams or sculpted cloth folds. Female adult coverage follows the selected simple opaque linen chest/hip wraps, not a modern lingerie aesthetic. Coverage must remain sufficient; “minimal geometry effect” does not mean transparent or absent coverage.
5. Keep the anatomy brief explicit across the whole body: deltoids, pectorals, lats/trapezius, abdominal/oblique forms, upper/lower arms, seat, thighs and calves. For fullness, specify coherent soft volume and transitions in front, side and rear, including arms and legs. For strong older references preserve age-appropriate structural shape without forcing frailty. Use the reference image to resolve contour detail rather than inventing it procedurally from those words.
6. Compare the views before Meshy. Fix contradictory chest width, pelvic tilt, limb length, hidden hand/foot or inconsistent identity. Crop individual panels without rescaling them differently. Do not send a multi-person comparison board as if it were one model.

### Prompt template

Fill every bracket from the selected row and source record. Do not send the brackets literally or replace a reference image with this text.

```text
Asset: construction reference for ONE adult fantasy-game body, not final clothing.
Reference images: [exact approved sheet, anatomy authority; optional style reference].
Preserve: [apparent age], [stature/relative proportions], neutral skeletal frame,
canonical bald replaceable head, pose, camera scale and lighting of the selected anchor.
Change only physique to [mass/fullness/definition coordinate and its visual brief].
Show straight front, true side and straight rear at one scale and floor line.
[State the canonical limb angles and how the side torso remains visible.]
Keep neutral pelvis/spine and natural waist, ribcage and seat transitions.
Show coherent anatomy across chest, shoulders, back, abdomen, arms, hips and legs.
Coverage: opaque white medieval linen close-fitting braies/cloth wrap, sufficient
front/back coverage, minimal fabric bulk, no thick hems, modern elastic or hanging flap.
Neutral soft studio illumination, clear surface forms, no blur or depth of field;
bare feet, complete head/feet in frame, no armour, hair, beard, jewellery or props.
Do not turn low definition into low muscle mass or fullness into belly-only swelling.
```

A generation tool may reject an otherwise nonsexual construction request. Record the refusal and stop that rejected route; do not repeatedly rewrite to evade it. A more-covered output is a distinct silhouette reference, not fulfillment of the anatomy requirement. Obtain a permitted suitable source through an authorized alternative before donor production. Store the actual model ID if exposed; a built-in tool that hides it is recorded as **model not exposed**, never guessed from another API's default.

### Meshy donor generation

Use the existing [tool route](tools.md) and check its current operation/model/options and price before dispatch. Meshy's documented multi-image API accepts one to four views of the same object; a wrapper may expose fewer options. Supply clean front/side/back panels for one coordinate, one job per donor. Store exact request/options, image hashes, returned task ID, costs, raw geometry and materials before cleanup. Reuse existing successful jobs instead of submitting again after an uncertain timeout. [Multi-image API](https://docs.meshy.ai/en/api/multi-image-to-3d).

Inspect raw untextured geometry: do the muscles exist as surface volume, or only as painted shadows? Are the side and rear coherent? Reject melted hands, contradictory joints, missing limbs and fused cloth that materially controls the intended body region. Close-fitting linen still produces clothing-shaped geometry: mark covered pelvis surfaces **unknown/inferred**, retain complete canonical anatomy there and fit separate baseline cloth. Do not shrinkwrap the body onto the outer surface of shorts and call that anatomy. Hidden-region exclusion must be visible in coverage/error reports, not a way to omit failed regions from acceptance.

Use the same body source to derive the paired low-definition/high-definition views when possible, but independently inspect both. Adding smoothing to one mesh is not automatically a valid low-definition donor; it may erase muscle volume or alter waist/limbs. The visual brief governs.

## 6. Measurements and whole-body acceptance

Measure **target, donor, corresponding master and final runtime body**, in that order, using the same named landmarks and coordinate system. Record value, unit, method, view/source, uncertainty and pass/fail. A section with hidden skin or perspective uncertainty is not an exact circumference measurement.

### Registration

Use the selected family reference stature, sole origin, forward axis and canonical pose. Record source-to-canonical transform. Use rigid alignment plus one uniform scale; if anatomical pose normalization is needed, record its joint rotations and preserve the unmodified donor. Do not independently scale the waist/chest or auto-frame each comparison to hide a regression. Front/back/profile renderings use one camera calibration, comparable light and a scale bar. Pixel ratios from concept art guide proportions; physical 3D measurements come from the registered mesh.

### Measurement set

| Region              | Required observations                                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole body          | Sole-to-crown height, neck-base/pelvis/joint heights, left/right limb lengths, total regional volumes and silhouette overlays in front/back/both profiles/quarters.                                                                                                                                                                                                   |
| Trunk               | Horizontal sections at axilla, nipple/pectoral level, lower sternum, lower ribs, natural waist, navel, pelvis and maximum seat. Record width, depth, circumference, section area and front/rear offsets from the skeletal centreline. Keep section positions tied to anatomy, not changing image percentages.                                                         |
| Shoulders/back/seat | Skeletal shoulder span separately from outer deltoid span; shoulder slope, lat width, rib-to-waist taper, upper/lower back depth, lumbar curve, pelvic tilt and seat projection. Check side silhouette for an exaggerated posterior shelf and rear silhouette for rectangular fullness borders.                                                                       |
| Arms and legs       | Sections at deltoid, upper-arm midpoint, elbow, maximum forearm, wrist, upper/mid thigh, knee, maximum calf and ankle. Compare both sides and soft-volume continuity. A fuller target must show its intended limb changes, not just a larger abdomen.                                                                                                                 |
| Muscle surfaces     | Registered cross-sections over pec bellies/lower pec border, deltoid-to-arm transition, abdominal rows/linea alba, obliques/serratus/lats, biceps/triceps, quads/hamstrings and calves. Measure crest/valley positions and depth relative to the local surface, not only silhouette. Use clay and raking light to distinguish actual geometry from normal-map detail. |
| Neck/head interface | Neck front/back/profile curvature, larynx projection, throat-to-jaw transition, nape and shoulder transition; seam positions, shared normals and weights. A numerically closed ring can still create a giant Adam's apple or pinched throat.                                                                                                                          |

The selected lean recipe's approved waist/lower-rib values remain its regression witnesses. Do not enforce those lean centimetres on the fuller endpoint. Re-measure when a source's scale is corrected rather than treating stale numbers as anatomy truth.

### Initial fidelity gates — experimental tolerances

These are proposed acceptance defaults for the first registered adult batch, not existing measured passes or universal anatomy laws. Report failures; do not loosen them merely to accept the current result. If sampling noise or source resolution invalidates a threshold, document that specific measurement limitation and retain the visual requirement.

- On reliable exposed donor regions: bidirectional sampled surface distance, per-region median/p95/max, plus signed direction; target p95 ≤ **0.2% of stature** and no unreviewed connected patch exceeding **0.5% of stature**. At 1.75 m these are 3.5 mm and 8.75 mm. Report sampling density and excluded area. Nearest-surface agreement alone cannot prove correct vertex correspondence.
- Named external width/depth sections: within **2% of the accepted target section dimension** after registration. Visually important landmarks within **0.3% of stature**, unless source uncertainty is greater and explicitly recorded. Require correct source proportions even if an aggregate error is small.
- For resolved muscle forms larger than the runtime mesh's sampling interval: retain **80–120%** of the accepted donor's measured crest-to-valley relief and the anatomical feature's location. This is a transfer-fidelity diagnostic, not permission to preserve a donor artifact that contradicts the image. Source detail too small for geometry needs an explicit normal-map bake and a runtime comparison, not silent removal.
- No cracks, inverted triangles, new self-intersections, isolated spikes, bilateral correspondence swaps or visible mask-border ledges in accepted anatomy. Use rest-pose whole-body views and motion; one numerical average cannot waive a glaring defect.
- The compiled/native/runtime reconstruction of the same target must agree within **1e-6 m** in canonical unposed positions, allowing a separately documented exporter precision limit if encountered. This numerical check proves transport, not attractiveness.

Review whole-body silhouette first, then each region, then repeat whole-body review. Compare to the **actual intended row**, not only the preceding failed output. The artist/agent owns catching glaring chest, waist, back, neck and limb defects; Mike should not have to discover them one at a time. A broad audit is mandatory after every local repair because shape, seam and garment changes can regress elsewhere.

## 7. Transfer the entire reliable surface

“Transfer” here means **fit the selected canonical mesh to the donor's accepted whole-body surface**, preserving large muscle volumes and local surface contours together. It does not mean paste front-torso relief onto a generic body or filter out the large forms that make the source athletic.

1. Duplicate the selected canonical master without changing connectivity, vertex order, UVs or named anatomical regions. Preserve the original and all approved targets. Freeze a canonical topology hash and source manifest before fitting.
2. Register donor and canonical anatomy as above. Identify corresponding landmarks and region boundaries on both meshes. Protect neck ring, internal joint frame, hands/feet or other unchanged reliable source areas as explicitly declared, not accidental untouched islands.
3. Fit **neck-to-feet usable anatomy**, including posterior trunk, lateral torso, deltoids, arms, seat and legs. Restrict correspondences by anatomy and side; global nearest vertices can map an arm to a rib or one thigh to the other. Use landmarks, smooth region-overlap weights and surface correspondence together. Regularization protects triangle quality; it must not erase accepted pec/abdominal/back volume.
4. Work coarse-to-fine for convergence, but retain the final full surface. Any smoothing/artifact removal has a named source discrepancy, before/after crop, bounded region and preserved surrounding silhouette. Do not high-pass the donor and discard its body proportions, or treat all sharp muscle forms as noise.
5. Reconstruct cloth-obscured pelvis anatomy from the selected complete canonical body and adjacent accepted anatomy, with a smooth transition and explicit uncertainty. Inspect underneath the separate coverage in the authoring tool. Do not project garment folds into skin. Repaired joints/covered regions have their own evidence rather than fabricated source-fidelity scores.
6. Compare source/donor/fitted master in identical clay and textured views and with the measurement set. Reject a fit that hits a few circumferences while retaining smooth generic limbs or shrinking the waist. Fix the fitting field or donor, not downstream lighting that conceals the mismatch.
7. Check canonical vertex correspondence anatomically: elbows remain elbows, muscle borders are similarly located, seams agree, triangle aspect ratios remain usable and skin weights still attach to the intended bones. Large shape changes can require weights/correctives even with identical vertex IDs.
8. Preserve high-detail master and derive runtime reduction with **one shared mapping across all targets**, not independently remeshed slider endpoints. Bake fine normal detail against the actual exported triangulation/tangents. Compare high master → reduced master → export → runtime separately so loss has an identifiable owner.

MetaHuman can remain the offline topology/rig foundation. Native body-conform/template operations have input correspondence requirements; record the installed version, actual route and options. Importing an arbitrary Meshy object does not automatically give it MetaHuman's parametric slider semantics or preserve every sculpt through native body solving. Measure any conform/parametric round trip before adopting it. If it loses accepted shape, retain the qualified canonical fit for OpenLegend and diagnose the native step; do not resculpt from a lossy text brief. [Epic body conform examples](https://dev.epicgames.com/documentation/metahuman/body-conform-examples?lang=en-US), [template mesh requirements](https://dev.epicgames.com/documentation/metahuman/from-template-mesh?lang=en-US).

A wholly Meshy-derived topology could also support reuse if someone builds and qualifies its correspondence, UVs, skeleton, weights, shape responses, seams, maps and clothing bindings. It is not a shortcut that avoids those requirements. For this experiment the selected canonical foundation stays fixed; changing it is a consequential foundation decision, not routine cleanup.

### Transfer tooling prerequisite

The preserved `2026-11-11-peacock-full-transfer/study/transfer/transfer.py` is diagnostic starting code, not a general body fitter. Inspection finds source-specific absolute-height bands, radial charts, knee/axilla exclusions, manual pelvis/seat offsets and smoothing. Replaying those constants on a fuller or feminine donor would carry the old assumptions into the new body. Reuse its coordinate/import and comparison work only where valid; do not promote its artistic offsets as universal anatomy.

The first implementation step is to parameterize correspondence from each registered source's anatomical landmarks and region labels, with the excluded and retained areas explicit in the study manifest. Keep source-surface queries and canonical topology separate. A radial chart is usable only where a section is a single outward surface about its declared centre; undercuts, axillae, crotch and concavities need constrained surface correspondence instead of interpolating missing ray hits into invented skin. Compare the resulting fit to the complete accepted donor before admitting it as the reusable batch method. Do not automate the failed regional masks across twelve sources.

The stage-A fit experiment must choose and record one reproducible working correspondence recipe before batch expansion: exact existing tool/script revision, landmark pairs/curves, region eligibility, source exclusions, smoothing/projection settings, convergence/stop result and measured residuals. It must preserve accepted large forms, including waist corrections, when recovering detail; reprojecting the original narrow donor after that correction is a regression. If existing permitted tooling cannot pass the pair, report the specific failure and compare an established non-rigid wrapping route before building a new solver. New tool purchase or a foundation change requires its own decision. There is no claim that a generic production fitter is already implemented.

## 8. Compile supports into the existing evaluator

The reusable offline conversion described here is **proposed tooling**, not an available command. Implement it beside the existing family build helpers, with input/output manifests and explicit errors. Reuse [`scripts/art/people.py`](../../../scripts/art/people.py) and the current [`person-family.ts`](../../../apps/client/src/characters/person-family.ts) contract. Do not create a second runtime interpolation system or assume native MetaHuman sliders run in the browser.

### Inputs and output

Input: one base/age/frame's corresponding body positions for the selected support coordinates, identical topology/UVs, reference stature/pose, source records and region confidence. Validate these invariants before subtracting meshes. Output: a neutral body, ordinary bipolar target pairs, interaction correctives with named drivers, provenance and reconstruction results for every input coordinate. Baseline coverage and shirt remain independent parts.

The study's `M/F/D` symbols are coordinate labels, not new runtime recipe keys. The build record maps each once to the selected family's existing declared control ID; refuse missing or duplicate mappings. Resolve physical reference units and all other neutral control values from that exact family descriptor. A third-party tool's native muscle slider value is never silently used as the normalized OpenLegend value.

For twelve supports, first fill the 27-node grid by bilinear interpolation in fullness/definition within each fixed mass slice. These filled nodes are derived, not independently authored. If later supports replace a derived node, recompute the whole target decomposition from the new grid; never stack an old correction onto a revised neutral.

### Exact decomposition

Let `S(m,f,d)` be corresponding positions at grid nodes, and `B=S(.5,.5,.5)`. The neutral is the grid centre, **not** the lean Peacock source recipe. The source must reconstruct at `(m=.5,f=0,d=1)`.

For each nonempty subset `A` of `{mass,fullness,definition}` and each selection of endpoint sides `s∈{0,1}` on those axes:

```text
x = [.5,.5,.5] with coordinates in A set to s
C[A,s] = S(x) - B
          - sum(C[T, s restricted to T] for every nonempty proper subset T of A)
process subsets in increasing size (single axes, pairs, triple)
```

Store single-axis `C` as that control's negative/positive targets. Store pair/triple `C` as existing corrective records whose drivers name the corresponding negative/positive excursions. The evaluator already uses:

```text
negative(v) = max(1 - 2*v, 0)
positive(v) = max(2*v - 1, 0)
P(recipe) = B + sum(product(driver excursions) * C)
```

This reproduces the 27 grid nodes and piecewise trilinear interpolation between them. It needs at most **6 single-axis + 12 pair + 8 triple arrays = 26 arrays** for one mesh/base/age. At a recipe only one side of each axis is active: at most three single, three pair and one triple contributions. The current evaluator may scan additional inactive metadata; do not describe storage as seven arrays. Alias identical frame endpoint arrays for a single base rather than duplicating them.

Do not omit triple interactions merely because pair corrections are easier: a fuller muscular body with low relief may need a mass×fullness×definition residual. Remove exact-zero targets freely; approximate pruning requires a separately measured error/cost experiment. Preserve neutral subtraction and operation order through float32 compilation.

### What interpolation proves

Corresponding vertices move continuously; it does **not** follow that the intermediate anatomy is plausible. Misaligned abdominal groups can create doubled borders, dents or sliding muscle insertions; an endpoint may be good while its midpoint fails. Registration and the independent midpoint references test this. Do not blame linear interpolation for an incorrectly fitted endpoint or accept a midpoint solely because its number is 50%.

Before asset qualification, reconstruct every support, every grid node and at least the fixed interior points `(M,F,D)` with each component `.25` or `.75` (eight points). Compare the compiler/native/browser outputs to a direct trilinear reference calculation with the same target data. Then run the broader visual/garment matrix. Algebraic agreement establishes implementation correctness; the visual references establish whether the function is a good body model.

### Structural and age additions

Tissue-only M/F/D targets keep internal joints fixed. Structural breadth and length targets use the existing internal landmark controls and rebuild rest joints/binds. Preserve height compensation and avoid applying a second bone scale after geometry already changed.

At age anchor `a`, derive its own neutral `B_a` and coefficients `C_a`. Keep neutral-age `B_0,C_0`; supply age samples `B_a-B_0` and age-conditioned response corrections `C_a-C_0`, driven by the same excursions. Blend adjacent anchors using the same age weights. Applying `C_a` on top of `C_0` would double the response. Age-related changes include torso/limb shape and fat/muscle distribution, not only skin maps.

The current evaluator supports age-shaped meshes and age-conditioned corrections. It does **not yet supply dedicated age samples for internal structural landmarks/joint rests**. If an age/proportion target changes the skeleton, add that support through the existing landmark owner as its own experiment before claiming that range; surface-bound landmarks alone cannot fix an internal joint. The adult-body proof must state which proportions change and which joints stay fixed. Cross-age fit/rig/motion is a required pass, not a presumed consequence of matching topology.

## 9. Replaceable head and separate coverage

Use one canonical head/scalp for the first body grid. Keep a named ordered neck boundary with matching positions, normal-sharing groups and skin rows; body-neck changes and the head's lower transition must be evaluated together. Record attachment transforms and anatomical crown height. Check neutral, both head turns, nod and raised arms, looking at larynx, throat and nape shape as well as seam closure. A giant neck protrusion is a failure even when every seam vertex coincides.

Do not transfer hair/beard volume into the skull or neck. Later face sources can be generated separately, registered to the same head/neck interface and qualified for eyes/lids/mouth/expressions. Their independent production does not imply arbitrary head scaling or no integration checks.

Retain complete torso/pelvis under baseline cloth. Coverage has its own geometry, fitting and motion; removing the shirt restores that coverage and the body. Minimal donor underwear does not replace this separate asset. Use the existing selected premade coverage where it passes; if it does not fit the new range, repair its fitting/cut through the part owner. Do not replace skin with a boxy shirt, cardboard pelvic panel or hidden hole.

## 10. The shirt is part of acceptance

Use the exact existing Peacock premade shirt source, its material data and the maintained animation sources. Keep source rights and source-specific construction intact. Body fidelity is checked before dependent fitting, but final task completion requires the shirt on **every tested body variation**, including intermediate fullness, mass and definition. A correct naked-body graph with a broken shirt is not a completed body-system proof.

1. Evaluate final body and structural landmarks, rebuild its bind pose if needed, then fit coverage and shirt. Use the current surface/bridge/rigid part owners; no per-frame nearest-surface fit or new collision system.
2. For a soft shirt, preserve canonical triangle/barycentric bindings and surface-frame offsets. Constrain source binding by body region/side. Inspect neckline, shoulders, axillae, sleeves, chest, abdomen, back and hem. A tight local offset can amplify a body ledge; fixing the body and garment are separate diagnoses.
3. Keep intentional ease rather than wrapping the cloth onto every abdominal groove. A bridge support can span a loose hem; rigid plates need their own later sizing/attachment contract. Fit against final mass/fullness/definition, even if definition usually causes a smaller adjustment. There is no blanket promise that definition cannot affect clothing.
4. Where a demonstrated shape needs a correction, use the existing part corrective mechanism with named drivers. A changed canonical binding requires re-derived skin weights; applying stale weights after changing the support triangle is invalid. Test armhole/elbow and pelvis/hem motion before expanding the batch.
5. Inspect with body-hiding masks **off**. Check contact through rest, raised arms, Idle, Walk, Run and start/stop. Remove/reapply shirt and confirm body/coverage restoration. Masks may optimize genuinely covered surfaces only after unmasked fit passes; they cannot hide penetration at openings or repair an anatomy gap.
6. Compare source animation, retargeted export and actual game renderer for backward elbows, shoulder twist, foot sliding or knee issues. Preserve quaternion-sign continuity, joint rest-axis mapping, weights and normal/seam fixes already in the maintained path. Do not widen gait unnaturally to avoid arm contact or claim a new raw FBX fixed a runtime interpolation bug without chain comparison.

If one shirt cut cannot accommodate the declared envelope after its existing fitting controls are correctly used, report the specific unsupported range and required cut/corrective. Do not shrink the range, invent coverage masks or resume custom tunic construction without an explicit scope decision. The named garment remains an unmet acceptance requirement until it works or Mike changes that requirement.

This procedure does not qualify armour, capes or accessories merely because a shirt works. Later garments use independent pieces, layer-specific fit supports and compatible wearers. A compound shirt/shorts item remains compound; no invented torso/leg interchangeability. Established premade hair cards, if later tested, remain separate from this body stage.

## 11. Visual and motion review protocol

Use the existing renderer/study tools and actual game paths where the owning milestone requires them. No new viewer is needed. Generate a manifest-driven contact sheet and capture queue so the agent reviews the matrix in batches rather than asking Mike to drag dozens of sliders.

For each static recipe record:

- Exact recipe and all fixed values; original concept, raw donor where available, canonical master and runtime result, labelled by stage and source status.
- Equal-scale front, back, both sides and front/rear three-quarter views; one full-body plate plus readable torso/neck/arm/leg crops. Show clay with normal maps disabled and final material separately. Do not mix textured reference and blurred clay as the only comparison.
- Bare anatomy in the permitted authoring context, covered-body presentation, unmasked shirt fit and shirt removal/restoration. Record excluded/obscured surfaces explicitly.
- Whole silhouette, proportions, muscle placement, regional fullness and continuity; then face/neck connection, garment outline/openings and final normal/seam quality. Inspect across the entire image, not only the property changed that iteration.

For each accepted sweep: hold other values fixed, travel from 0 to 1 and back, then reproduce the same endpoint by different edit orders and direct recipe load. Record numerical geometry/landmark equivalence and video. Check material-only edits reuse the body and do not alter the recipe's other controls.

For motion, capture at least one complete loop each of Idle/Walk/Run and both starts/stops for each required recipe. Use consistent front/profile/back/quarter coverage, including the camera side previously hiding the defect. Review slow playback plus normal speed. Sample geometry at clip keys and intermediate times to catch inter-key elbow flips and clothing breakthroughs. Verify recordings actually contain changing frames and the intended control values; a one-frame or frozen video is not motion evidence.

Maintain a review table: `recipe → source fidelity → anatomy → seam/rig → coverage → shirt → motion → runtime cost → accepted/gap`. Record visible defects directly with view/time/region. Do not write “passes visually” when only the file was opened, and do not let one attractive angle qualify the whole row. After a repair rerun affected rows and their dependency witnesses; retain valid unrelated evidence.

Mike's art acceptance occurs at coherent stages: the lean/full source pair, the combined body range and final shirt/motion presentation. The agent performs the technical and broad visual audit first. Do not seek approval for obvious broken anatomy or leave routine inspection to Mike.

## 12. Data and module ownership

Keep source-only records outside Git with the assets. A small study manifest records each coordinate, exact reference/donor/master files and hashes, source confidence, measured properties, fixed conditions, fitting method/options, runtime release, rejected status and evidence paths. Use stable IDs, not filenames such as `final-final`. Do not build a new catalogue service or parallel recipe schema.

| Owner                                             | Reuse or bounded addition                                                                                                                                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Existing art CLI and study tools                  | Provider requests, task recovery, source preservation, capture orchestration and build entry points. Inspect current help rather than invent commands. Add one reusable batch operation only if necessary.                                                   |
| `scripts/art/people.py` / adjacent offline helper | Proposed corresponding-grid validation, target decomposition and reconstruction report; reuse coordinate conversion, family compilation, bind helpers and float32 conventions. A focused helper is appropriate if the existing module would become unwieldy. |
| `apps/client/src/characters/person-family.ts`     | Existing excursion evaluation, coupled targets, age responses, dependency reuse, landmarks and fitting. The M/F/D grid needs data, not a parallel solver. Structural-age support is a separate identified gap.                                               |
| Family/part package                               | Topology, target arrays, control definitions, age/frame records, fit supports, qualified ranges and exact source provenance. Geometry arrays are assets, not world-authoring code.                                                                           |
| Bundled world                                     | Select permitted anatomical bases, apparent age/stature ranges, presets, coverage and equipment policy. Human age labels, medieval clothing and gender presentation are not engine-wide enums.                                                               |
| Existing domain/server authority                  | Validate and save admitted appearance/equipment recipes, enforce physical stature/placement and project permitted data. No client authority, provider call, random regeneration or cognition rule belongs in shape evaluation.                               |

No legacy reader, compatibility alias or parallel family format is needed. Rebuild the current development package and consumers coherently under the existing no-compatibility policy. Preserve exact asset revisions and current save/load integrity; old source art remains archived evidence, not a runtime compatibility obligation.

## 13. Cost, performance and isolated experiments

The design increases upfront reference/transfer work to reduce repeated manual repair. That saving is **a hypothesis**, not a guarantee. Record wall time, provider jobs/cost, failed rows, repair iterations and reusable yield per stage. Stop multiplying sources if the first pair cannot transfer faithfully; more donors do not repair a broken fitter.

Rendering and slider evaluation primarily cost the **player's client CPU/GPU and memory**. The server still admits/saves recipes and handles gameplay; cosmetic targets must not expand cognition inputs or change abilities. A good Unreal screenshot does not qualify exported geometry, textures, eyes or hair in the actual renderer. MetaHuman source complexity, compressed asset bytes, decoded arrays, GPU textures and frame time are distinct quantities.

Retain current proof budgets: **40,000 triangles, 2,048 maximum texture edge, 8,388,608 total texture pixels, eight materials, 64 joints, four influences and 16 MiB encoded GLB** for the governed output. The 16 MiB is an existing payload constraint, not a limit imposed by MetaHuman, a GPU-memory estimate or a reason to erase source anatomy. Do not apply it to the sum of an offline donor archive or quietly raise it. Compiled family data also needs its own measured transfer/residency report.

A dense position target costs `12 × vertexCount` bytes in float32 before metadata/encoding. At 20,000 vertices, 26 arrays are 6.24 MB decimal for one body/base/age, excluding the neutral, normals, skin, shirt, head and textures. More age samples can multiply storage. Sparse/pruned/compressed targets or selective age loading are later measured optimizations, not assumptions used to hide the initial cost. Assets should be shared per family; report actual per-actor shaped buffer costs separately.

### Experiment register for implementation

These extend the existing [E1–E7 qualification](../../projects/people-from-parts-authoring-contract.md#isolated-experiments); they are not claims of completed testing.

| Experiment                      | Isolate the change                                                                                               | Before/after evidence and fail condition                                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reference-led whole-body fit    | Same donor, canonical topology, rig, cameras and renderer; vary only fitting method/settings.                    | Regional shape/relief errors, full silhouette, artifact count, effort and runtime reduction loss. Fail if improved torso relief sacrifices waist, neck, limbs or posterior shape.      |
| Grid-to-target conversion       | Same corresponding input grid; direct trilinear reference versus compiled/native/browser evaluation.             | Reconstruction tolerance, all supports/interior points, edit-order/reset equality and untouched target hashes. Fail on double-applied neutral/age responses or mismatched coordinates. |
| Additional support targets      | Same renderer, materials, triangles, joints and clips; compare qualified reduced target set versus expanded set. | Transfer bytes, decoded residency, setup and slider p50/p95, steady-state renderer CPU/GPU where available, allocations/draws. Separate anatomy improvement from target-count cost.    |
| Runtime mesh/detail reduction   | Same high master and recipe; change one topology mapping or normal-map choice at a time.                         | Surface/relief fidelity and actual-renderer appearance versus bytes/pixels/triangles. Fail on lost sculpted muscle forms or changed neck correspondence.                               |
| Shirt fit/weights               | Freeze body and motion; change binding, fit correction or weights separately.                                    | Unmasked penetrations/clearance, sleeve/hem shape, motion and setup cost across required recipes. Then verify the accepted fix with the full body grid.                                |
| Structural/age landmark support | Freeze age/body targets; vary only the proposed landmark/evaluation implementation.                              | Joint rest/bind reconstruction, height compensation, neck, reach/contact and fit; affected setup/shape cost. No age-band acceptance until these pass.                                  |

Use the [current MetaHuman performance procedure](../../projects/metahuman-foundation-poc-tech-design.md#controlled-performance-experiments) for actual hardware/workloads. Keep one/four actors, warm-up and alternating paired runs, report p50/p95 and absent GPU telemetry honestly. The existing targets include 20 slider sweeps, p95 shape update ≤16 ms and input-to-visible ≤100 ms; a steady-state p95 regression over the larger of 1 ms or 10% of baseline fails the bounded comparison. Describe whether “visible” is a post-render timing proxy. A settled body must not refit every animation frame. Preserve prior measurements only where code/assets/workload remain applicable.

Under the current verification policy automated suites remain paused. For authorized implementation, use permitted static checks and manual/native isolated experiments, including source and runtime comparisons. Do not run LLM/cognition experiments merely to assert cosmetic safety: inspect the authority/data flow and compare the same character's abilities, permissions, cognition-visible state and action context before/after cosmetic changes. Physical stature is the documented exception and uses its existing owner. Report unmeasured behavior rather than claiming 100% certainty.

## 14. Dependency-aware refinement and preservation

| Later change                               | Reuse                                                                                         | Rebuild/requalify                                                                                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Better source sculpt on unchanged topology | Recipe/control evaluator, canonical IDs, asset authority and character/equipment integration. | Affected targets, reduced exports, normals/maps, fitted clothing/coverage and relevant motion/measurements. A binding may remain valid but its fit still needs review. |
| Skin pigment/roughness only                | Geometry, skeleton and bindings.                                                              | Material package and lighting/skin-seam evidence; actual texture memory if changed.                                                                                    |
| New head identity on same interface        | Body, body grid and compatible clothing.                                                      | Head/expression shapes, neck transition, eyes/mouth and fitted hair/beard/collars; full assembly witness.                                                              |
| Structural proportions or skeleton         | Topology and source art where still corresponding.                                            | Landmarks/rest binds, reach/contact, clothing weights/fits and animation qualification.                                                                                |
| Canonical topology/UV/rig change           | Concepts, donor art and high-level recipe semantics where valid.                              | Correspondence, targets, seam mappings, bindings, skin/maps and compiled family together. This is the costly dependency to stabilize early.                            |

Body refinement therefore does **not** make every garment design disposable, but neither are old fits automatically safe. Preserve the editable garment source and binding/corrective data; refit against the changed anatomy and requalify affected shapes. Establish credible body envelopes and stable topology before producing a large wardrobe. Do not wait for final pores, skin finish or every hairstyle before proving the reusable body and garment system.

Archive original prompts, returned images, raw donors, corresponding masters, metrics, selected releases and useful failed comparisons through the [existing private asset workflow](../../asset-workflow.md). Record actual tool/model/options; do not claim an opaque ImageGen tool used a particular model. Verify a fresh-workspace pull and hashes before saying an archive is preserved. Permission to archive privately is not public publication, production adoption or permission to publish MetaHuman sources.

## 15. Execution checklist and completion claims

Execute in order when the body implementation is authorized:

1. Resolve exact selected sources, family/shirt/motion revisions, task allowance, current code and fixed recipe conditions. Record previous rejected outputs and protected successful measurements.
2. Prepare the 27-row reference/coverage plan and stage-A pair. Generate/inspect body views, preserve exact prompts, and obtain the required source-pair selection. If generation cannot supply usable anatomy, report that blocker before Meshy spend.
3. Generate only missing stage-A donors. Compare raw geometry to references. Register, fit complete usable anatomy to the canonical mesh and retain uncertainty masks. Pass whole-body geometry and natural motion before multiplying donors.
4. Add stage-B definition endpoints, then stage-C mass endpoints, preserving approved shapes. Implement/qualify the reusable offline target conversion and reconstruct every source. Review the full 27-grid and the retained 30/24 check set. Escalate support planes only for measured interpolation failure with available authorization/budget.
5. Fit separate baseline coverage and the same premade shirt. Qualify unmasked clothing and natural motion throughout all required rows/sweeps; removal/restoration must reveal complete anatomy. Diagnose any failure along the source/export/runtime chain.
6. Run the isolated performance/correctness comparisons for actual changed components. Preserve current world/cognition authority and production art selection. Export and rebuild with Unreal closed.
7. Present references, matched body comparisons, complete grid, clips and fit/cost matrix before asking final art acceptance. State demonstrated behavior, visible defects, unsupported cases and exact reusable outputs separately.
8. Verify private preservation and fresh reconstruction; reconcile MHP10/PPL scope and gaps in their existing trackers. Commit task-owned code/docs under repository policy when implementation is authorized. Do not install, merge or push without its own authorization.

**Body-grid completion** requires all selected body rows/sweeps, source fidelity, shirt/coverage/motion and isolated runtime checks to pass. A metric with a failed result completes a measurement, not the required pass. A protocol design is not an executed system. A masculine fixed-age pass does not qualify feminine bodies, age, broader structures, faces, hair, armour or the full slider matrix.

### Decisions still requiring evidence or a later task

- Twelve supports may suffice, or the bounded plane additions may be necessary. The experiment decides; no upfront source count guarantees robustness.
- The first valid lean/full source pair must be selected before batch Meshy production. A provider refusal or inconsistent sheet remains unresolved source work, not an excuse to use the rejected hand-shaped fuller body.
- The feminine direction starts from the selected [Jessa athletic source study](../../../art-direction/studies/2026-11-11-jessa-meshy-body/README.md), whose canonical fit remains unqualified; a petite/curvier target needs its own approved reference and corresponding shape. Do not silently substitute a default Vivian body, or assume stature alone creates those proportions. Final selection remains with that stage's owner.
- Adult 30/75 proof targets, the broader 18/35/60/80 design and future younger overlaps have distinct qualification obligations. The required source/landmark work must be planned before claiming each range.
- Native MetaHuman round-trip fidelity, full-body source transfer, midpoint plausibility and shirt fit are unqualified until measured for the selected assets. No universal arbitrary-body fit guarantee is made.

## 16. Design evidence

The [design concept record](../../../art-direction/studies/2026-11-12-body-reference-family/README.md) preserves the generated overview, exact prompts and source limitations. The image is a clothed silhouette illustration, not an accepted anatomy sheet. The requested body-reference generation remains incomplete where the tool rejected it.

The implementation design follows the inspected existing evaluator and the [research strategy](../../research/character-production/archive/2026/2026-11-11-strategy.md#4-the-recommended-end-to-end-workflow). External documentation establishes capabilities, not quality: [Meshy multi-image](https://docs.meshy.ai/en/api/multi-image-to-3d), [MetaHuman body conform](https://dev.epicgames.com/documentation/metahuman/body-conform-examples?lang=en-US), [MetaHuman Python tooling](https://dev.epicgames.com/documentation/metahuman/metahuman-creator-python-scripting-in-unreal-engine?lang=en-US), and [Blender surface binding](https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/surface_deform.html). Check the installed versions and actual wrappers at execution. A surface binding transfers deformation; it does not supply missing anatomy or certify garment clearance.
