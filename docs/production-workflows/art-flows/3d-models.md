# 3D models: from a concept or character sheet to a game model

This page takes an approved concept, a supplied character sheet or a written brief to a finished, checked GLB for a prop, structure, person or creature. It is the 3D route of the [art workflow](README.md): the steps below fill its stages, and its settings, decision points, spending and preservation rules apply throughout. Commands and models come from [tools and defaults](tools.md); exporting and inspecting assets also follows the [PlayCanvas guidance](../../../.agents/skills/openlegend-playcanvas/SKILL.md). Nothing here sets a look: whatever the current look needs from a model comes from its [production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production).

For every new person on either path, start with [Make a person from a selected concept](people.md). The accepted separate-parts design requires its canonical body, rig and wardrobe pilot to qualify before routine production. Continue within the authorized pilot or resolve its remaining production gate before making a new person. Use the rules below for the individual parts and final exports that procedure calls for.

For a finished game asset, apply [runtime preparation](runtime-preparation.md) throughout these steps: resolve the intended use and motion method, rehearse difficult dependencies, prepare physical/attachment references, and check the complete consumer-ready assembly. It covers creatures, rigid mechanisms, wearables, structures and foliage without imposing a character rig on them.

Steps 1–3 belong to Brief and Prepare, 4–6 to Make, 7–9 to Finish, 10 to Check and 11 to Preserve. These steps are the full path, with cleanup/rigging order determined by the selected route in Step 7. The [simple path](#simple-and-full-paths) runs only part of them, and "polish/finalize" resumes a selected prototype at Finish through the [finalize path](production.md#polish-or-finalize-a-selected-model): repair what the final use needs, then follow Step 10 and Mike's acceptance.

## Simple and full paths

The [quality setting](README.md#quality-the-simple-and-full-paths) picks the path; [step options](README.md#step-options) change one step at a time, and [supplied material](README.md#what-supplied-material-skips) skips the steps it already answers. On the simple path the [prototype path](README.md#prototype-path) uses these steps:

Both paths obey the [people-from-parts production gate](../../maintainers/art/people.md): proceed within a qualified route or an explicitly authorized pilot, and never generate a person whose clothes are part of the body. The historical one-shell character examples below document retained study assets and tools; they are not a shortcut around that requirement. Props, creatures and an authorized edit to a selected existing source retain their applicable routes.

| Step           | Simple path (`prototype`)                                                                                                                                                                                       | Full path (`finished`)                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1 Route        | For a person, use the parts procedure. For another subject or an isolated missing part, choose the cheapest route that keeps its identity                                                                       | As written                                                |
| 2 3D facts     | Real size and the clips, asking once for a size that no owner defines; the rest only where the stated use needs it                                                                                              | All of them                                               |
| 3 Views        | One front view: the sheet's or the supplied image's, cropped, when it meets the view rules in Step 3; otherwise one generated from it or, with no image at all, from the brief (that image is also the concept) | Clean views and the agreement check                       |
| 4–6 Candidates | For an isolated part or other subject that needs generation, inspect one Meshy candidate. Use the selected family recipe for the person                                                                         | Three candidates, the turntable sheet and Mike's pick     |
| 7 Clean        | `normalize` (with `--profile prop` for a prop) for a static model; a model rigged through Higgsfield comes back at its height with feet at 0 and skips cleanup                                                  | All of Step 7                                             |
| 8 Rig          | Use a qualified family rig for a new person. An individual two-legged creature may use an automatic rig. Check a bend in either case.                                                                           | The rig route, skinning checks and the rough export first |
| 9 Clips        | Shared [motion procedure](animation.md), default source for new/replacement motion and accepted-clip reuse: `Idle`, `Walk` and `Run` for a walking character; rough motion                                      | The motion order, in-place clips, gait strides measured   |
| 10 Check       | `report` (`--profile prop` for a static prop), then the look check in the study viewer                                                                                                                          | All applicable export and assembly checks                 |
| 11 Preserve    | The same                                                                                                                                                                                                        | The same                                                  |

So a static prototype prop goes from one image and one candidate (Steps 1–6, briefly) to `normalize`, the check and preservation (Steps 7, 10 and 11); an animated subject also needs an appropriate rig, a motion check and clips (Steps 8 and 9).

## Consumer contract and budgets

The table and Step 10 describe what OpenLegend currently accepts. Each value has an owner; if it changes there, it changes here. An explicitly different consumer follows its [package contract](production.md#1-define-the-package-before-finishing) for format, units, clips and inspection. For example, a Blender-only animation is checked by reopening its deliverable and playing it on the selected target; `report --profile character --strict` enforces the game's clip minimum and is not its acceptance gate.

| Item           | Current requirement                                                                                                                                                                                                                                                                                                                                                                                                           | Owner                                                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format         | glTF 2.0 binary (`.glb`) with textures embedded; no cameras, lights, scripts or custom extensions; no Draco, meshopt or KTX2 compression (the client configures no decoders)                                                                                                                                                                                                                                                  | [3D pipeline design](../../projects/3d-pixel-art-asset-pipeline.md#6-quarantine-conversion-and-validation)                                            |
| Units and axes | Metres, +Y up. Freestanding prepared actors/props use their selected ground/root anchor and horizontal centring; actors face glTF +Z (−Y in Blender Front view), as confirmed beside the cast. Fitted/mounted parts preserve their parent-space join, hinge or bind frame; do not independently ground-centre them ([assembly frames](runtime-preparation.md#3-build-a-rough-assembly-and-rehearse-its-difficult-dependency)) | Existing study catalogs, e.g. [the mercenary](../../../apps/client/src/props/art-study/source-mercenary/catalog.json)                                 |
| Size           | Real size in metres. People are fitted to their body extent in play, but proportions come from the real source height                                                                                                                                                                                                                                                                                                         | [World presentation](../../world-presentation.md#animated-characters)                                                                                 |
| Clips          | Animated characters must contain clips named exactly `Idle` and `Run`, playing in place; loading fails without them. A stride catalog needs every named stride clip. The current character motion layer animates strikes only when both `Attack` and `Punch` exist; otherwise it retains the established strike fallback. Deliver them when animated strikes are part of the promised use                                     | [`model-animation.ts`](../../../apps/client/src/model-animation.ts), [`character-motion.ts`](../../../apps/client/src/characters/character-motion.ts) |
| Names          | No mesh object may share a name with a bone (the renderer would deform the mesh as that joint)                                                                                                                                                                                                                                                                                                                                | [`art_study_common.py`](../../../scripts/art_study_common.py)                                                                                         |
| Mesh           | First profile: 20,000 triangles per rigid model, 40,000 per skinned body, 100,000 per assembled render root                                                                                                                                                                                                                                                                                                                   | [A3D04](../../limits/3d-pixel-art.md#a3d04--mesh-complexity) (proposed)                                                                               |
| Textures       | Longest edge 2,048 px; 8,388,608 px of texture area per model across all maps; at most 8 materials                                                                                                                                                                                                                                                                                                                            | [A3D05](../../limits/3d-pixel-art.md#a3d05--textures-and-materials) (proposed)                                                                        |
| Rig and motion | 64 joints, 4 influences per vertex, 32 clips                                                                                                                                                                                                                                                                                                                                                                                  | [A3D06](../../limits/3d-pixel-art.md#a3d06--articulation-and-visual-composition) (proposed)                                                           |
| Download       | 16 MiB for the model and what it needs on first use                                                                                                                                                                                                                                                                                                                                                                           | [A3D02](../../limits/3d-pixel-art.md#a3d02--encoded-intake-and-runtime-payload) (proposed)                                                            |
| Look-specific  | What to bake or leave to the renderer, identity accents, review conditions                                                                                                                                                                                                                                                                                                                                                    | [Production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production)                                                       |

The budgets are a first proposed profile, not proof that more triangles look better or worse. Resolve a necessary exception to a proposed art target with its owner and record why. An exception never bypasses an installed intake limit, missing dependency, supported-format rule or loader refusal; the current local preview enforces its 16 MiB input bound.

## Step 1 — Choose the build route

Pick the cheapest route that can meet the locks. Record the choice and the reason in the brief. The optional [outcome references](prompting.md#detailed-references-for-specific-outcomes) supply construction methods for bodies and separate garments, creatures, buildings, weapons/tools, surfaces and actual hand contacts. Use the relevant method when it helps solve the requested form; the route and consumer requirements here still govern delivery.

| Route                     | Use when                                                                                                                                                     | Typical subjects                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Reuse or library**      | An approved asset or a suitably licensed library source already has the right form                                                                           | Ordinary plants, rocks, wildlife, familiar tools                                                        |
| **Family fit**            | The subject can share an accepted body, rig and clips; its identity is in proportions, clothing, hair, colour and carried things                             | Outfit and species variants of an accepted family body; no human family body is accepted yet            |
| **Image to 3D**           | The form itself is distinctive: an unusual prop or creature                                                                                                  | Signature props, unusual creatures                                                                      |
| **Hybrid**                | Generate one distinctive part such as a coat, pack or head and fit it to an accepted body; fit authorized body-source sculpts to the family topology and rig | Distinctive garments, heads and packs                                                                   |
| **Wrapped family member** | A distinctive sculpted part needs to take the shared mesh layout                                                                                             | Isolated heads or body-family source sculpts under an authorized pilot ([how](#wrapped-family-members)) |
| **Hand-modelled**         | Exact dimensions, openings, joints or repeated modules matter more than surface invention, or generation keeps failing                                       | Wall panels, gates, posts, containers with real openings, modular kits                                  |

- **People are built from parts.** Start from the closest editable preset, adjust continuous measurements to the sheet, then fit the face, hair and removable wardrobe. Record the nearest fit and missing landmarks if the concept exceeds the family’s supported range. A dressed concept supplies the silhouette and wardrobe reference. Generating it as one mesh fuses clothing to skin, so make new wearable pieces separately. [People procedure](people.md)
- **Source the visible anatomy from the selected concepts.** Follow the selected source in the [family authoring contract](../../projects/people-from-parts-authoring-contract.md#source-choice-and-quality-boundary). The stock MakeHuman/MPFB bodies are rejected as visible people. A different technical donor requires a separate choice and qualification; an authorized MPFB experiment may use only hidden construction geometry or rig data. [Source requirements](../../../art-direction/decisions.md#how-the-current-look-changes-production) · [Design](../../projects/people-from-parts-feature-spec.md)

- Reusing vertex-delta shape targets requires matching vertex correspondence. A different mesh can still share a supported rig, fitted parts or bone controls after fit/deformation checks. [Wrapping](#wrapped-family-members) is one unqualified method when common topology is actually needed, not a prerequisite for every reusable person ([family options](../../projects/art-workflow-feature-spec.md#11-people-families-a-character-creator-and-npc-variety)).
- Structures whose parts the game builds (posts, panels, gates) are **hand-modelled from real parts**, with generation only for surface accents.
- Creatures start from the strongest anatomical library or specialist source; a generated creature needs the closest anatomy review and its own rig ([rig routes](#rig-routes)).

### Family fit for people

The fitted cast comes from [`scripts/prepare-human-study.py`](../../../scripts/prepare-human-study.py). These stock bodies are rejected as people's visible bodies ([art direction](../../../art-direction/decisions.md#how-the-current-look-changes-production)). This recipe is for explicitly authorized maintenance of the retained study or a hidden-base experiment, never a new person's look; PPL01 owns the future body and rig choice.

- **What it uses:** CC0 MakeHuman/MPFB sources (the `mpfb2-master`, `makehuman_system_assets` and `suits02` packages listed in the [source study](../../../art-direction/assets/source-study/README.md)).
- **What it builds:** a body on the MPFB default rig, with fitted garments, eye accents and the procedural `Idle` and `Run` clips from [`study_human_motion.py`](../../../scripts/study_human_motion.py). The cast's motion files were then rebuilt with the motion study's eight library clips through `clips --bones` ([step 9](#step-9--make-the-clips)) and are in the development runtime and public studies releases ([AF12](../../maintainers/art-direction.md#art-flow-follow-through)). These are retained study facts, not acceptance of the bodies or their rig for new people.

To reproduce an existing study person for authorized maintenance:

1. Fetch the exact source packages into a workspace ([asset workflow](../../asset-workflow.md#run-the-existing-offline-recipes)).
2. Select that person's existing row in the recipe's `PEOPLE` table: name, body proportions, base, hair options and palette. Do not add a new visible cast member through this retained recipe.
3. Run the recipe headless with `--sources <packages> --person <name>`.
4. Apply only the requested maintenance to its existing fitted garments, weights and clips, and recheck the [affected dependencies](../assets-and-animation.md#repair-map-and-downstream-effects).

The recipe was written for the study cast. The [proof run](../../maintainers/art-direction.md#art-flow-follow-through) (AF07) and PPL01 must establish any different production use; replaying this recipe does not qualify a family.

**Look:** the mercenary sets the bar. MPFB's skeleton, mesh layout and weights may be inputs to an authorized hidden-base experiment; wrapping them onto another form remains unproven and does not reverse the visible-body rejection.

### Wrapped family members

This is an experienced-artist candidate method, unproven here and subject to PPL01's source and body-family decisions. An authorized proof measures whether a separately produced body or face can join a shared mesh layout; the selected concept governs the visible result, and a dressed one-piece shell cannot supply the removable clothes or underlying body the people requirement needs:

1. Use the approved body-only or face target and the selected canonical source. Generate only a missing, authorized target (Steps 3–6), then clean it (Step 7); do not generate fused clothing for this experiment.
2. Pose the family base mesh to match: the same A-pose, height and proportions as closely as its shape targets allow.
3. Fit the base onto the generated surface:
   - Fit the surface while keeping landmarks (eyelids, mouth corners, neck seam, fingertips, feet) aligned. Shrinkwrap and Surface Deform are possible authoring aids, not an automatic anatomical fit; select and inspect the method on the actual source.
   - Fix by hand where the fit folds or slides; faces need the most care.
4. Transfer the target's colour (and normal detail only where needed) onto the base mesh's UVs, following the [material recipe](production.md#materials-and-textures).
5. Keep vertex order unchanged when storing a shape target and record the source revision. Check the fitted body and face beside adjacent parts, across slider mixtures and at the required poses; refit garments, inspect skin weights and recheck contacts for the changed proportions. Correct a failed fit at its sculpt, rig or garment owner. Shared topology permits the representation but does not prove valid blends, garment fit or motion compatibility. Test the declared combinations before adding them to a family.

## Step 2 — Add the 3D facts to the brief

On top of the shared [brief](README.md#stage-1--brief-no-spending), record:

- **Size:** the height or dimensions to model at, in metres. A person gets their own height ([production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production)): the height their definition states, or else one read from their age, build and work, with the reasons in the record's Interpretations list; never a shared default. An object takes its game definition's dimensions. A person's physical body in the world definitions can differ from the modelled height, because presentation fits the model to the body's extent.
- **Handedness and carried things:** which hand holds what; which items are separate assets (held tools, removable packs, weapons) and which are part of the body or garment.
- **States:** the visible states the game records for this subject, each to be delivered from one source ([state sheets](profiles.md#assets-and-icons)).
- **Clips:** `Idle`, `Walk` and `Run` for a walking character ([how `auto` decides](README.md#step-options); the consumer requires `Idle` and `Run`), plus any clips the requested scope adds. For anything that attacks, the wind-up, contact and recovery come first ([creatures](profiles.md#creatures)).
- **Parts and points:** pivots, grips and attachment points the game uses, and parts that must move or come apart. Link the existing physical/support/interaction definitions and record their alignment, keeping [picking, collision and combat roles separate](runtime-preparation.md#4-prepare-physical-references-and-attachment-information).
- **Motion and assembly:** select the [runtime method](runtime-preparation.md#2-choose-how-movement-reaches-the-game), exact assembly partners and representative repeated use. State when motion/physical roles are unnecessary; do not infer exportability from Blender playback.
- **Signature and locks:** the identity features to keep, and their sides.

## Step 3 — Make clean reference views

Image-to-3D services rebuild what they are shown. A dramatic, lit, cropped concept produces a dramatic, lit, cropped model. Make clean views first; they are cheap and decide most of the result.

**Rules for every view** (technique, not style):

- One subject, whole, including feet or base, centred, with the same scale and ground line in every view. Nothing is cropped or overlapping the edge.
- Even, neutral light with no cast shadows, rim light, fog or strong colour cast; a plain light-grey background.
- A long-lens, near-orthographic look with the camera at mid-height; no wide-angle distortion.
- **Bodies in an A-pose:** arms about 30–45° down from horizontal and clear of the body, legs slightly apart, hands open and relaxed, head straight, a neutral face with the mouth closed. Use a T-pose only when the chosen rig route asks for it.
- Gaps visible between arms and torso and between the legs; capes, hems and hair kept off the limbs where the design allows.
- **Separate what the game separates:** remove held items, weapons and removable packs from the views and make them their own assets. Keep straps, belts and anything sewn on.
- At least 1,024 px on the long side, PNG.

**Views to make:**

- **Bodies:** front, back, left and right (the image-to-3D route takes up to four).
- **Props:** a three-quarter hero view plus the front, side or top views that show openings, handles and undersides.

**How:**

1. If the supplied sheet already has views that meet these rules, crop each one to its own file and skip generating it. Otherwise edit the picked concept or sheet with the [default image tool](tools.md#default-roster), one view per request. Painted sheets rarely meet the rules: in the October 31 proof run, Meshy models built from cropped sheet views kept the sheet's lighting, pose and props and came out darker and murkier than models built from clean views. Cropping saves about 11 credits per character.
2. Give the concept and every already accepted view as references, and state the rules above in the prompt.
3. Name each file by candidate and view: `v01-front.png`, `v01-back.png`, `v01-left.png`, `v01-right.png`.
4. **Check what GPT Image 2.5 returns** (seen in 2026-10-31 runs):
   - Back views come back as two figures, front and back side by side (all five did); crop the back figure.
   - About one side view in five faces the wrong way (two of ten). Check every side view's facing and regenerate wrong ones with the direction spelled out, for example "the nose points to the LEFT edge of the image".

A tool-neutral prompt for a reference drawing follows. For people, show the complete body in the selected world’s fitted baseline undergarments, with its torso and pelvis visible around the coverage pieces. Make separate modeling references for each wearable as the [people procedure](people.md) describes.

> The same character as the reference image, shown as a clean modeling reference: full body from head to feet, **[front / back / left side / right side]** view, A-pose with arms angled about 40 degrees down from horizontal and clear of the body, hands open, legs slightly apart, neutral expression. Even soft studio light, no shadows, plain light-grey background, orthographic, centred, nothing cropped. Keep exactly: **[locks]**. Do not include: **[separate items]**.

**Agreement check before any 3D spend.** Put the views on one [image sheet](tools.md#review-sheets) and compare:

- face profile and hairline;
- hem and sleeve lengths;
- belt and strap routing;
- closures;
- which side each item, mark or asymmetry is on;
- colours.

Mirrored left/right mistakes are the most common error. Name the canonical view where views disagree and correct the others with targeted edits. Under `exact`, Mike approves the views before Step 4; otherwise show them beside the model sheet in Step 6.

### Head views

A [generated head](#give-a-person-a-generated-head) takes four close-up views of the head and neck instead of the body:

- a head-and-neck bust from the top of the hair to the collarbones, at eye level, with a neutral face, the mouth closed and the eyes open;
- bare except for a plain dark-grey round-neck undershirt: no scarf, hood, collar, armour or jewellery. The body's own clothing then covers the join, and the undershirt fills in under it;
- the same flat light, light-grey background and near-orthographic camera as every view, at high quality, 2K and 3:4 ([settings](tools.md#generated-heads));
- the front made with the sheet as its reference, or from a written description when the person has none, which makes the face a proposal to label as one; the other views made from the front view and the sheet;
- the hair described in the same words in every view, including which shoulder a braid falls over. The front view decides it, so read it before making the others: Ada's and Mara's fronts put their braids over a shoulder rather than down the back, as their prompts had said;
- the right view may be the left view mirrored, which saves an image, when face and hair are symmetric. A side parting or a braid over one shoulder needs its own right view.

## Step 4 — Generate model candidates

1. **Estimate** the batch ([how](tools.md#estimate-and-record-cost)) and add it to the running total.
2. **Generate three candidates** from the same view set with the default routes: two from one model with different seeds and one from a second model, so their mistakes differ. The exact commands and settings are in [tools](tools.md#image-to-3d). Request texture and, for bodies, the A-pose; ask for the triangle budget of the subject's kind (20,000 for a rigid prop, 40,000 for a body; [polycount settings](tools.md#image-to-3d)); leave rigging until a candidate is picked (Step 8). A body that will be rigged through Higgsfield must come back as a GLB facing the front, since the rigger takes the raw candidate ([rigging](tools.md#rigging-and-clips)).
3. **Add outside candidates** when they apply: an accepted family body dressed to the concept (for people, not the rejected MakeHuman bodies), a library model, or a quick hand-blocked form. They are compared like any generated candidate.
4. **Save each raw output** as `models/m0N-<subject>.glb`, unchanged, with its job ID and settings in the record. Upload the batch, including rejected candidates, to the private study collection as soon as it finishes ([preserve as you go](README.md#9-preserve-and-resume)), because provider links expire.

## Step 5 — Inspect and compare candidates

Inspect the actual files, starting with plain clay shading; texture hides shape problems.

| Look for                     | Fail when                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Silhouette and locks         | The outline, proportions or a locked feature differs from the views at the same scale                      |
| Fused or melted parts        | Fingers merged, a prop grown into a hand or hip, hair or a cape fused to the body, a robe joining the legs |
| Missing or invented geometry | Holes, extra limbs, a flattened back, invented ornaments, open seams                                       |
| Symmetry                     | An asymmetric design made symmetric, or a mark on the wrong side                                           |
| Riggability                  | Limbs not separable, armpits or crotch webbed, hands in a fist                                             |
| Texture                      | Baked shadows or highlights, a blurred face, visible seams, colours off the locks                          |
| Counts                       | Triangles, textures or materials far beyond the [budgets](#consumer-contract-and-budgets)                  |

Measure every raw candidate and build a turntable sheet of all of them at one scale beside the look's reference figure ([review sheets](tools.md#review-sheets)), with the views alongside:

```sh
# Run from the repository root; later steps reuse these.
B=(/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec \
  --offline-mode --python-exit-code 1 --python scripts/art/art-tool.py --)
S=~/Documents/ChatGPT/OpenLegend-art/<study-id>/study
H=<height in metres from the brief>
REF=<reference figure height from the production notes>
"${B[@]}" report --out "$S/review/reports" --profile character "$S"/models/m0*.glb
"${B[@]}" sheet models --out "$S/review/m-sheet.png" --reference-height "$REF" --fit-height "$H" \
  --label "m01 Meshy" --label "m02 Meshy" --label "m03 Tripo" "$S"/models/m0[1-3]*.glb
```

Use `--profile prop` for rigid models and `--profile creature` for animals: `character` applies the body budget and also requires `Idle` and `Run`. At this unrigged candidate stage, a missing-clip finding is expected, not grounds for rejection; record it as pending Step 8–9 and do not run `--strict` as the raw-candidate gate. The report reads the file's bytes, so an FBX saved under a `.glb` name is measured correctly. Record each candidate's pass or fail per relevant row and an estimate of the cleanup each needs; a candidate that fails a lock is rejected even if it is the most attractive.

If candidates repeat a failure, identify its cause before another paid attempt. Correct contradictory views, fused reference props or hidden limb gaps at Step 3. When the views are adequate but the chosen model cannot preserve the needed topology, use local modeling, a suitable permitted source or a deliberately selected alternative route. Repeated failure does not by itself prove the input is wrong, and is not permission to reroll automatically.

## Step 6 — Mike picks a candidate

Present the sheet with a short recommendation and the cleanup estimates ([review](README.md#comparison-sheets)). Add a capture of each candidate in the game's own look, made with the study viewer's local model preview after normalizing the candidates ([Step 10](#step-10--export-and-check-in-the-games-look)): at play distance, colour and silhouette decide more than detail. Record the choice and Mike's words.

## Step 7 — Clean and normalize in Blender

Work in a copy saved as `work/f01-<subject>.blend`; the raw candidate never changes. Use Blender 5.2.2 ([tools](tools.md#blender)). Put any fix you would repeat into a small script beside the work.

**Choose the execution order before editing.** A local/family rig that accepts the prepared mesh uses cleanup → rig/skin → motion. Higgsfield's raw-candidate route uses Step 8 on the selected raw candidate first, then supported cleanup on its returned rigged source, then Step 9. Normalized comparison copies do not become that provider's input. If a necessary repair cannot survive this route, use an authorized local rig/skin method that consumes the repaired source, or report the blocked dependency; do not discard the repair or submit another paid job automatically.

For an unrigged model, `normalize` applies scale/facing/centering, transforms, a 0.1 mm merge, loose-geometry removal, normals and texture resize, then exports and reports. It does not separate fused parts, fill holes or remove invented ornaments; inspect and repair those manually. Add `--profile prop` for a prop; `--blend` also saves the editable scene:

```sh
"${B[@]}" normalize --in "$S/models/m01-<subject>.glb" --out "$S/export/normalized/m01-<subject>.glb" \
  --height "$H" --rotate-deg 0 --max-texture 2048 --blend "$S/work/f01-<subject>.blend"
```

`--rotate-deg` turns the model about the vertical axis until the sheet's front column shows its face: 0 for Meshy candidates, −90 for front-first Tripo candidates ([facing](tools.md#image-to-3d)). Higgsfield's returned rig is already at the requested height with feet at 0; do not run unrigged normalization on it. Preserve its weights for compatible local fixes; a change requiring new bindings returns deliberately to rig/skin work.

1. **Import** the GLB. On an unrigged source, apply transforms and remove unused cameras, lights and provider helpers. On a rigged source, preserve the armature/rest frame and any hierarchy the skin or clips use; do not apply the unrigged cleanup blindly.
2. **Face and scale:** for an unrigged source, rotate to Blender's Front view (−Y), scale uniformly to the brief's real height, then put its lowest point at 0 and centre it horizontally. Keep an already correct rigged frame; a required bound-frame change returns to the rig/skin checks.
3. **Geometry repair:**
   - Inspect the normalization result: its 0.1 mm merge and loose-geometry cleanup must not destroy a deliberate seam, opening or independent part. Repair only accidental duplicates when working manually.
   - Recalculate normals outward, and check winding with backface culling on.
   - Fix accidental fused parts locally (cut them apart, rebuild the gap, smooth), and fill unintended holes. Keep deliberate openings, thin garment surfaces and separate attachment boundaries.
   - Remove invented ornaments that break a lock.
4. **Separate** held items, removable gear and moving parts into their own objects, with their pivots at their real hinge or grip. Appearance never sets collision, reach or capacity; those stay with the game's own definitions. Generate a part separately only when the extra control earns its fitting work, for example replacing a weak head while keeping an approved body and outfit; production parts, exported draw units and gameplay equipment are three separate decisions.
5. **Topology:**
   - Rigid models may be decimated to budget after checking the silhouette stays.
   - When a generated mesh keeps the intended form and supports the required movement, materials and budgets, refine it directly; repair or rebuild only the topology that fails a needed deformation or silhouette.
   - A body that will bend needs clean loops at shoulders, elbows, hips and knees. Where it lacks them, use a quad-topology generation setting, Blender's remesh followed by retopology, or a family body, rather than collapsing triangles. Quad output is an authoring option, not an acceptance test: the joints' structure, the exported triangles, the skinning and the rendered result decide.
6. **Materials and textures:** use the [material recipe](production.md#materials-and-textures), the selected budget and the [look's production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production).
   - Keep usable UVs. Repair or unwrap only where stretching, seams, map resolution or a required edit demands it; preserve the original textured source first. When UVs change, transfer or rebake every map using them onto the new layout, then inspect the face, neck, joints and garment seams at the intended distance.
   - Name materials by region and reuse appropriate sets; the proposed profile allows 8, not 8 per generated part. Use simple material values when they suffice. A high-to-low bake, a texture set for every region and a new shader are not routine finishing requirements.
   - Follow the consumer's supported channel, colour-space and normal-map conventions. A custom Blender node graph or another engine's material setup does not imply a compatible exported material; inspect the GLB's actual assignments and maps under the game's light. A texture-only repair keeps the working geometry, rig and clips.
7. **Names:** `<subject>` for the root, `<subject>-<part>` for meshes, with no mesh named like a bone.
8. **Save** the `.blend` and record what was reconstructed in the record's Interpretations list.

For an already rigged source, keep the armature transforms, rest pose, topology and vertex order when a local repair can do so. If the required change breaks those dependencies, return to the rig/skin step deliberately and recheck the [affected work](../assets-and-animation.md#repair-map-and-downstream-effects). Higgsfield's raw-candidate rigging limitation is a route constraint, not permission to keep a broken bend or to submit a new paid job automatically.

## Step 8 — Rig and skin

### Rig routes

| Route                      | Use for                                                                   | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Family rig**             | The shared skeleton under separate bodies, garments, hair and attachments | Use the exact qualified body/rig family and its declared fit range, with authored rest-joint adjustments for the measured body. Keep the named hierarchy and evaluate bind transforms, garment fit, feet and grip on the actual target ([people technical design](../../projects/people-from-parts-tech-design.md)); [V3D05](../../maintainers/3d-pixel-art.md#v3d05--rigged-character-and-equipment-family) owns qualification. Pilot source selection follows the [authoring contract](../../projects/people-from-parts-authoring-contract.md#source-choice-and-quality-boundary); it does not itself qualify the family for routine production. The retained study cast uses MPFB's bone-heavy Default rig ([family fit](#family-fit-for-people)); its Mixamo and GameEngine rigs remain possible hidden-base inputs to an authorized comparison, not the default for a new person. |
| **Automatic humanoid rig** | A distinctive two-legged humanoid with clear limbs                        | Rig the picked candidate with the automatic rigging route at its real height ([tools](tools.md#rigging-and-clips)): a textured GLB facing +Z. Through Higgsfield this is the raw candidate; subsequent repairs follow [Step 7](#step-7--clean-and-normalize-in-blender). Proven on four people in the October 31 proof run. Then make its clips (Step 9), retarget shared clips onto it, or transfer its weights to the family rig.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Authored rig**           | Animals and every other nonhuman body; humanoids the automatic rig fails  | In Blender, enable Rigify ([tools](tools.md#blender)) and start from its closest template (basic quadruped, horse, cat, wolf, bird, shark), or build a simple armature by hand. Use automatic weights as a start and hand painting to finish. A humanoid rig is never renamed onto an animal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

### Skinning checks

Pose the model through its extremes before making clips, and fix the weights or topology rather than hiding a bad bend:

- arms raised to horizontal and above the head;
- elbows and knees bent about 120°;
- a deep crouch;
- a 45° torso twist;
- hands opening and closing where the hands are rigged.

Check shoulders, armpits, hips, hems and anything worn over the body; garments must not pass through the legs or chest. Keep at most 4 influences per vertex and 64 joints, and keep bone names stable, because shared clips depend on them. Matching bone names alone does not make two skeletons compatible: proportions, rest pose and weights must also agree.

**Rough export first.** Apply the [common early rehearsal](runtime-preparation.md#3-build-a-rough-assembly-and-rehearse-its-difficult-dependency) to every asset with an uncertain consumer dependency, including moving props, foliage and usable structures. For a character, before finishing materials or making a clip set, export the rough rigged body with its most demanding garment or carried thing and look at it in the study viewer ([Step 10](#step-10--export-and-check-in-the-games-look)): standing, turning and one representative bend. This finds wrong scale, bind pose, foot anchor, readability and material assumptions while they are cheap to change. When game integration is outside the request, this preview stands in for it and gameplay qualification stays open. A body, rig or garment meant for reuse is qualified with its family's [fit envelope](../../projects/3d-pixel-art-appearance-families.md#qualify-the-reusable-fit-envelope), and a route for repeated use is chosen with the [matched character-production comparison](../../projects/3d-pixel-art-validation.md#matched-character-production-comparison).

**Long skirts, robes and cloaks:** automatic weights bind them to the legs, so they split with each stride; every long-skirted person in the October 31 proof run did this in `Run`. Judge it in the game's look, and where it does not read as the garment, reweight the hem towards the hips with a smooth falloff or add skirt bones. Record the choice.

### Give a person a generated head

For a selected source approved to continue, diagnose a failed [head check](#step-10--export-and-check-in-the-games-look) in neutral light, bare clay and the intended view. Distinguish face shape from paint placement, UVs, material or lighting: repair a misplaced eyebrow on sound sculpted geometry through the [repair map](../assets-and-animation.md#repair-map-and-downstream-effects), keeping the head. A face painted on a smooth head still fails the selected sculpted-face requirement. When the geometry needs replacement, retain the approved body, clothing, rig and clips. Generated replacement follows the `head` [step option](README.md#step-options), about 29 credits a person. It is a repair of that source, not approval to reuse a rejected body or proof of PPL01's adjustable face/hair family. Reuse one head source across that person's outfits, but inspect the join for each outfit's neckline.

For a new adjustable face, use the common head layout and test facial controls and the neck seam under the [people procedure](people.md). A one-off graft demonstrates only that particular repair.

1. Make the [head views](#head-views), about 11 credits.
2. Make one head with Tripo H3.1 Multiview, about 18 credits ([settings](tools.md#generated-heads)). Look at it as bare clay before going on: a real nose, brow and lips, and hair in locks.
3. **Read its landmarks** from front and side renders at known scale: the point between the pupils at the front of the eyeballs, the pupil spacing, and the chin and crown. Find each pupil as the darkest spot near its eye rather than by eye on a grid, where a reading was 8 px off per side. A MakeHuman body needs nothing more, since its eye bones give its own point and spacing. A face painted on a generated body needs the same point read from its renders, and its old head's chin-to-crown height.
4. **Graft it** onto the rigged body, or onto its motion file to keep its clips, with `head` ([how it works](../../projects/art-workflow-tech-design.md#45-head-give-a-body-a-sculpted-head)). Put the cut inside the clothing, about 4 cm below the front of the lowest neckline the person wears and at least 1 cm above the bottom of the bust as placed on that body: a head can sit 1.4 cm higher on one outfit than another (1.465–1.50 m on the 1.85 m MakeHuman bodies). Cut at the neckline itself, the bust ended there and a strip of old skin showed; `head` refuses a cut below the head:

   ```sh
   "${B[@]}" head --model "$S/export/f01-<subject>-motion.glb" --head "$S/models/m02-<subject>-head.glb" \
     --head-eyes X,Y,Z --head-eye-spacing D --neck-cut 1.47 --out "$S/export/f02-<subject>-head.glb"
   ```

   For a face painted on a body that is one mesh, give `--model-eyes X,Y,Z --scale S --neck-by-colour` instead of `--head-eye-spacing`, with S the old head's chin-to-crown height over the new one's.

5. **Check** it as Step 10's head check says, and look closely at the neck from the front, side, three-quarter and back, standing and mid-run: a bust standing off the clothing, a ring or crease across the throat, a line down the back of the neck or old skin showing at the collar is a failure. Inspect mid-clip poses in every retained motion that changes this join, including Idle, Walk, Attack, Wave and Sprint when present. Compare clip names, durations and key rates with the input so no unrelated motion is lost. This helper cuts hair below its cut plane; preserve or rebuild an affected braid as its own supported piece rather than silently delivering cropped hair.

What the character fixes study found ([record](../../../art-direction/studies/2026-11-03-character-fixes/README.md#faces-for-the-rest-of-the-cast)):

- Tripo H3.1 Multiview from four views gave sculpted faces and hair in locks; Hunyuan3D v3 from the front view gave a strong face but a smooth helmet of hair and blotched cheeks. A MakeHuman head shaped under a generated body's own low-resolution paint read as a mask.
- Heads grafted onto MakeHuman bodies measure 2.8–4.0 cm nose ahead of the eyes. On bodies generated from sheets the painted heads are small (about 1:9 of the body), so their new heads measure 2.1–2.3 cm.
- Placed by the eyes, the generated bust is the generated person's chest, not the body's: on Kest and Mike it stood up to 10 cm outside the coat and swung with the head mid-run. `head` fits it onto the body's bare skin. The first version also left half the old nape over the new neck on every MakeHuman body, a hard line down the back of the neck. Mike found both in the game's look; close renders of the neck mid-run show them. The first fit then pressed every throat onto the old one from just under the jaw and left a ring across the neck: the base of a MakeHuman neck slopes about 6 cm lower at the throat than at the nape, and `head` now presses down to that base.
- A body painted as one mesh keeps its old painted chest skin at an open neckline, and its tone can differ from the new neck's there (Mara's sheet model). On MakeHuman bodies the skin paint is tinted to match.
- A braid that should swing needs geometry and bones of its own (Sela's braid); a generated braid is cut off at the neck.
- For the game's own files, graft with `--max-texture 1024`, which caps every map in the file, a generated body's own 2048² map too. The library people's other maps are 256²–512², and a 2048² map would add about 22 MiB of GPU memory per person against the proposed 256 MiB for all appearance art ([A3D11](../../limits/3d-pixel-art.md#a3d11--client-loading-and-residency)). Study files keep 2048² for close review.
- `head` keeps the body's clips at their own key rate. An earlier version exported at Blender's 24 fps, which cut every person's 0.7 s run loop to 0.667 s.

## Step 9 — Make the clips

Follow [Animation authoring](animation.md), the shared owner for source selection, working commands,
retargeting and clip assembly. Start new/replacement compatible human motion with the default
source and reuse accepted results across characters. Hosted source generation is verified; the
maintained target conversion still needs its adapter and target-rig qualification. Other anatomy uses a suitable library or authored motion on its own rig.

List the needed clips from the brief and consumer: a walking character normally has `Idle`, `Walk`
and `Run`, and every animated game character must include `Idle` and `Run`. Keep existing clips and
native action timing. Fix blocking body, weights or equipment fit before building clips that depend
on them; animation-only work otherwise preserves the supplied character.

The shared procedure covers the current `clips` helper, source-specific bone maps, in-place movement,
measured gait strides and exact action names. Follow `motion=rough|polished`; both paths check the
actual target export and contacts. Polished motion follows the look's production notes and the
[production motion order](../assets-and-animation.md#4-produce-motion-that-serves-an-action).

### Animate a saved model

Use [the saved-model procedure](animation.md#animate-a-saved-model) with the archived model's existing
rig and appearance. It includes retained-clip assembly and the current viewer's supported action
names. Saved files can receive reusable, authored or qualified generated motion without a live model
generation job; the rigging provider's upload limitation applies only to its own library-clip route.

## Step 10 — Export and check in the game's look

1. **Export** a GLB with the [working recipe's settings](tools.md#blender): selected objects only, modifiers applied, NLA tracks as clips, skins, deform bones only, forced sampling, +Y up, textures embedded, no compression, no cameras or lights. Save it as `export/f01-<subject>.glb`.
2. **Report and budgets:** measure the exported file, not the `.blend`:

   ```sh
   "${B[@]}" report --out "$S/review/reports" --profile character --strict "$S/export/f01-<subject>.glb"
   ```

   Use the subject's profile here too (`prop` for a rigid model, `creature` for a nonhuman body). The current creature profile does not automatically require `Idle`/`Run`; compare the exported clips manually against the prepared actor loader and brief until [PR2](../../projects/art-workflow-tech-design.md#pr2--extend-the-existing-report-then-its-callers) is delivered. It records height, lowest point, triangles, materials, texture sizes and total texture area, joints, maximum influences and clip names against the [budgets](#consumer-contract-and-budgets) and the required clips; `--strict` exits with code 2 when one fails. Check openings, pivots and attachment points by eye.

3. **Look check:** start the [study viewer](../../asset-workflow.md#inspect-in-a-browser-and-use-files-in-the-game) (`pnpm assets serve --page /art-study.html`; it needs the asset authority and the AWS sign-in to show the published cast), choose **All seven people**, then **Compare a local model** and pick the GLB, or drop it on the view. It joins the cast in the game's own renderer without being uploaded (up to 16 MiB), and its card shows the measured height, triangles, texture sizes and clips. Rotate the camera and set **Motion** to Run and Idle. Normalized candidates can be compared the same way before the pick.
   - Check that it faces the camera like the cast: a model showing its back here faces the wrong way.
   - A Blender viewport is not the game's look.
   - **Head check (people):** when the look's [production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production) ask for sculpted faces, view the head close up in the Smooth 3D treatment and as bare clay from the front and three-quarter, and measure how far the nose stands ahead of the eyes (`work/tools/face.py` in the [character fixes study](../../../art-direction/studies/2026-11-03-character-fixes/README.md#faces-for-the-rest-of-the-cast)). Faces painted on smooth heads measured 0.1–1.3 cm, sculpted ones 2.1–4.0 cm and the mercenary 3.4 cm. [Diagnose the failure](#give-a-person-a-generated-head): repair surface-only defects on sound sculpted geometry; replace an inadequate head shape through the selected generated-head route. For a family member, correct the canonical head shape or wrap the isolated sculpt and recheck its controls.
   - **Feet check (walking characters):** watch **Game travel** at the selected world's actual movement speeds. A planted foot should not slide while down; an in-place clip alone cannot show this. The bundled world's [character fixes study](../../../art-direction/studies/2026-11-03-character-fixes/README.md#planted-feet) measured toes at 6.6 m/s; that is a scoped example, not every world's speed.
   - **Person check (people):** inspect the whole figure and upper body at rest and through requested and retained motions affected by the edit, from front, side, three-quarter and back, painted and as clay, beside the source. Check anatomy, posture, hands, clothing and neck against the selected subject and [look's production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production). A library-source defect fails too. The [character fixes study](../../../art-direction/studies/2026-11-03-character-fixes/README.md#the-head-and-neck-and-the-runs-back) records why checking only a repaired seam missed whole-body posture and chest distortions.
   - **Back check (walking characters):** inspect requested and retained gaits affected by the edit from the side against that subject's anatomy and intended pose. The current `clips` helper straightens and limits lean for the bundled humanoid cast ([design](../../projects/art-workflow-tech-design.md#44-clips-give-a-rig-the-clips-the-game-plays)); do not apply that convention to another anatomy or intentionally different performance without a supported route.

4. **Play checks:** run the profile's [play checks](profiles.md#play-checks) and record them.
5. **Fidelity:** build the [matched-scale comparison](README.md#matched-scale-comparison) of the export against the views and concept, and list the remaining differences.
6. **Critique:** get the [independent critique](README.md#independent-critique) for every new character or creature.
7. **Complete assembly:** apply the [runtime-preparation checklist](runtime-preparation.md#8-finish-the-package-and-when-requested-integrate): motion/state coverage, physical alignment and attachments, exported material quality, relevant moving bounds and the intended outfit/kit/repeated use. A file report cannot establish these by itself.

Make only the variants and levels of detail the consumer needs. A portrait, a turntable or one moving bone is not a finished animated character: record the rig and body revision the clips belong to, and the real limits found.

## Props, structures and state sheets

Rigid things follow Steps 1–7, 10 and 11, and skip rigging and clips (Steps 8–9) unless a part moves. A moving part (a lid, a gate leaf) becomes its own object with its pivot at the real hinge, and is rigged only when the consumer animates it.

- **Model to the game's dimensions.** For structures the game builds from parts, take each part's size and openings from its definition (for example a wattle panel and its hand opening) and model those parts, not a single sculpture.
- **Mesh-state source.** When the consumer swaps geometry, keep its required visible states in one editable source, one collection per state (`<subject>-intact`, `<subject>-damaged` and so on). Make damage remove, crack or displace real parts rather than remodelling the whole thing. All states share the same origin and pivot, so swapping them never jumps.
- **Exports follow the state consumer:** for file-swapped geometry, use `export/f01-<subject>-<state>.glb`; the berry bush's full and depleted exports in its [study catalog](../../../apps/client/src/props/art-study/source-natural-berry-bush/catalog.json) are the working example.
  A supported material parameter, part change or animation can represent another state without another complete mesh. Do not add a new state mechanism solely to avoid an export.
- **Part kits** for invention families and construction: each separable part is its own object with its pivot at its join, its material named by what it is made of, and its attachment points recorded in the study record.
- **Checks:** the [state and construction checks](profiles.md#play-checks) at the default camera, plus the scale check beside a person.

## Step 11 — Accept, preserve and hand off

Mike accepts or sends back (decision C). Then preserve through the [workflow's rules](README.md#9-preserve-and-resume):

- **Study material** goes to `--boundary art-studies --domain curated-private`: views, every candidate including rejected ones, sheets, captures and critique.
- **The package** goes to `--boundary art-library --domain curated-private`: the `.blend`, the raw picked candidate, the final GLB with its textures and clips, the report and the recipe scripts.

Finish the record with the [complete consumer-ready handoff](runtime-preparation.md#8-finish-the-package-and-when-requested-integrate), including applicable assembly data and physical references alongside the files. Putting the model into the world is integration: the [assets and animation chapter](../assets-and-animation.md) and the world's appearance owners cover selection, installation and play. Integration includes the provenance and catalog entries, the selected release, and placing the person or object through the world's own definitions.
