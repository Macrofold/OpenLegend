# 3D models: from a concept or character sheet to a game model

This page takes an approved concept, a supplied character sheet or a written brief to a finished, checked GLB for a prop, structure, person or creature. It is the 3D route of the [art workflow](README.md): the steps below fill its stages, and its settings, decision points, spending and preservation rules apply throughout. Commands and models come from [tools and defaults](tools.md); exporting and inspecting assets also follows the [PlayCanvas guidance](../../../.agents/skills/openlegend-playcanvas/SKILL.md). Nothing here sets a look: whatever the current look needs from a model comes from its [production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production).

Steps 1–3 belong to Brief and Prepare, 4–6 to Make, 7–9 to Finish, 10 to Check and 11 to Preserve. These steps are the full path. The [simple path](#simple-and-full-paths) runs only part of them, and "polish/finalize" resumes a selected prototype at Finish through the [finalize path](production.md#polish-or-finalize-a-selected-model): it repairs only what the final use needs (a body rigged through Higgsfield takes only weight-safe local fixes) and then gets Step 10 in full and Mike's acceptance.

## Simple and full paths

The [quality setting](README.md#quality-the-simple-and-full-paths) picks the path; [step options](README.md#step-options) change one step at a time, and [supplied material](README.md#what-supplied-material-skips) skips the steps it already answers. On the simple path the [prototype path](README.md#prototype-path) uses these steps:

| Step           | Simple path (`prototype`)                                                                                                                                                                                       | Full path (`finished`)                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1 Route        | The cheapest route that keeps the identity, usually image to 3D                                                                                                                                                 | As written                                                |
| 2 3D facts     | Real size and the clips, asking once for a size that no owner defines; the rest only where the stated use needs it                                                                                              | All of them                                               |
| 3 Views        | One front view: the sheet's or the supplied image's, cropped, when it meets the view rules in Step 3; otherwise one generated from it or, with no image at all, from the brief (that image is also the concept) | Clean views and the agreement check                       |
| 4–6 Candidates | One Meshy candidate from that image, with a quick look at the file; no sheet and no pick                                                                                                                        | Three candidates, the turntable sheet and Mike's pick     |
| 7 Clean        | `normalize` (with `--profile prop` for a prop) for a static model; a model rigged through Higgsfield comes back at its height with feet at 0 and skips cleanup                                                  | All of Step 7                                             |
| 8 Rig          | The automatic rig when a two-legged humanoid needs clips, with one bend checked in the look check; other bodies need an authored rig                                                                            | The rig route, skinning checks and the rough export first |
| 9 Clips        | Library clips combined with `clips`: `Idle`, `Walk` and `Run` for a walking character; rough motion                                                                                                             | The motion order, in-place clips, gait strides measured   |
| 10 Check       | `report` (`--profile prop` for a static prop), then the look check in the study viewer                                                                                                                          | All six points                                            |
| 11 Preserve    | The same                                                                                                                                                                                                        | The same                                                  |

So a static prototype prop goes from one image and one candidate (Steps 1–6, briefly) to `normalize`, the check and preservation (Steps 7, 10 and 11); an animated prototype person replaces `normalize` with the automatic rig and its clips (Steps 8 and 9).

## Consumer contract and budgets

What the game currently accepts. Each value has an owner; if it changes there, it changes here.

| Item           | Current requirement                                                                                                                                                                                                                                                                                | Owner                                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format         | glTF 2.0 binary (`.glb`) with textures embedded; no cameras, lights, scripts or custom extensions; no Draco, meshopt or KTX2 compression (the client configures no decoders)                                                                                                                       | [3D pipeline design](../../projects/3d-pixel-art-asset-pipeline.md#6-quarantine-conversion-and-validation)                                            |
| Units and axes | Metres, +Y up; lowest point at 0; centred horizontally; facing glTF +Z (the glTF convention and Meshy's rigging requirement), which is a model facing −Y in Blender's Front view. Confirmed October 31, 2026: models facing this way face the camera beside the published cast in the study viewer | Existing study catalogs, e.g. [the mercenary](../../../apps/client/src/props/art-study/source-mercenary/catalog.json)                                 |
| Size           | Real size in metres. People are fitted to their body extent in play, but proportions come from the real source height                                                                                                                                                                              | [World presentation](../../world-presentation.md#animated-character-pixels)                                                                           |
| Clips          | Animated characters must contain clips named exactly `Idle` and `Run`, playing in place; loading fails without them. A person whose catalog entry lists `strides` also needs each named stride clip plus `Attack` and `Punch`                                                                      | [`model-animation.ts`](../../../apps/client/src/model-animation.ts), [`character-motion.ts`](../../../apps/client/src/characters/character-motion.ts) |
| Names          | No mesh object may share a name with a bone (the renderer would deform the mesh as that joint)                                                                                                                                                                                                     | [`art_study_common.py`](../../../scripts/art_study_common.py)                                                                                         |
| Mesh           | First profile: 20,000 triangles per rigid model, 40,000 per skinned body, 100,000 per assembled render root                                                                                                                                                                                        | [A3D04](../../limits/3d-pixel-art.md#a3d04--mesh-complexity) (proposed)                                                                               |
| Textures       | Longest edge 2,048 px; 8,388,608 px of texture area per model across all maps; at most 8 materials                                                                                                                                                                                                 | [A3D05](../../limits/3d-pixel-art.md#a3d05--textures-and-materials) (proposed)                                                                        |
| Rig and motion | 64 joints, 4 influences per vertex, 32 clips                                                                                                                                                                                                                                                       | [A3D06](../../limits/3d-pixel-art.md#a3d06--articulation-and-visual-composition) (proposed)                                                           |
| Download       | 16 MiB for the model and what it needs on first use                                                                                                                                                                                                                                                | [A3D02](../../limits/3d-pixel-art.md#a3d02--encoded-intake-and-runtime-payload) (proposed)                                                            |
| Look-specific  | What to bake or leave to the renderer, identity accents, review conditions                                                                                                                                                                                                                         | [Production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production)                                                       |

The budgets are a first proposed profile, not proof that more triangles look better or worse. A model may exceed one when it must; record which and why in the study record.

## Step 1 — Choose the build route

Pick the cheapest route that can meet the locks. Record the choice and the reason in the brief.

| Route                     | Use when                                                                                                                                             | Typical subjects                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Reuse or library**      | An approved asset or a suitably licensed library source already has the right form                                                                   | Ordinary plants, rocks, wildlife, familiar tools                                                                      |
| **Family fit**            | The subject can share an accepted body, rig and clips; its identity is in proportions, clothing, hair, colour and carried things                     | Outfit and species variants of an accepted family body; no human family body is accepted yet                          |
| **Image to 3D**           | The form itself is distinctive: an unusual prop or creature                                                                                          | Signature props, unusual creatures                                                                                    |
| **Hybrid**                | Generate only what is distinctive (a coat, a pack, a head) and fit it to an accepted family body; or generate a body and move it onto the family rig | Distinctive garments, heads and packs                                                                                 |
| **Wrapped family member** | A person must look like their own concept and also share the family's skeleton, clips and garments                                                   | People, if the [people design](../../maintainers/art/people.md) chooses it (unproven; [how](#wrapped-family-members)) |
| **Hand-modelled**         | Exact dimensions, openings, joints or repeated modules matter more than surface invention, or generation keeps failing                               | Wall panels, gates, posts, containers with real openings, modular kits                                                |

- **People are built from parts.** Each person gets a body, a face, a hairstyle and clothing, each selected from shared sets or generated from their character sheet, so their clothes are worn and can come off. The body is the closest available body type for the sheet; if none fits, say so. How each step works is still being designed ([people built from parts](../../maintainers/art/people.md)). Until that design is accepted, ask Mike before making a person, and never generate a person whose clothes are part of the body: image to 3D makes a dressed person as one shell, with the clothes fused in and no body underneath.
- The stock MakeHuman/MPFB bodies are rejected as anyone's visible body, not only for their faces ([art direction](../../../art-direction/decisions.md#how-the-current-look-changes-production)); MPFB may serve only as a hidden base for skeleton and mesh layout. Only a family that shares one mesh layout gives people whose face and body can be varied or edited later with shared sliders. A generated one-off mesh has its own layout, and joins a family only by being wrapped onto the family mesh, an advanced retopology step that is still unproven ([wrapped family members](#wrapped-family-members), [character creator and populations](../../projects/art-workflow-feature-spec.md#11-people-families-a-character-creator-and-npc-variety)).
- Structures whose parts the game builds (posts, panels, gates) are **hand-modelled from real parts**, with generation only for surface accents.
- Creatures start from the strongest anatomical library or specialist source; a generated creature needs the closest anatomy review and its own rig ([rig routes](#rig-routes)).

### Family fit for people

The fitted cast comes from [`scripts/prepare-human-study.py`](../../../scripts/prepare-human-study.py). These stock bodies are rejected as people's visible bodies ([art direction](../../../art-direction/decisions.md#how-the-current-look-changes-production)): rebuild them only to maintain the existing study cast or as the hidden base of a wrap test, never as a new person's look.

- **What it uses:** CC0 MakeHuman/MPFB sources (the `mpfb2-master`, `makehuman_system_assets` and `suits02` packages listed in the [source study](../../../art-direction/assets/source-study/README.md)).
- **What it builds:** a body on the MPFB default rig, with fitted garments, eye accents and the procedural `Idle` and `Run` clips from [`study_human_motion.py`](../../../scripts/study_human_motion.py). The cast's motion files were then rebuilt with the motion study's eight library clips through `clips --bones` ([step 9](#step-9--make-the-clips)) and are in the development runtime and public studies releases ([AF12](../../maintainers/art-direction.md#art-flow-follow-through)); give a new person the same.

To add a person:

1. Fetch the exact source packages into a workspace ([asset workflow](../../asset-workflow.md#run-the-existing-offline-recipes)).
2. Add a row to the recipe's `PEOPLE` table: name, body proportions, base, hair options and palette.
3. Run the recipe headless with `--sources <packages> --person <name>`.
4. Dress the result to the concept with the CC0 garments, or with a generated or hand-made garment fitted and weighted to the same rig (the hybrid route).

The recipe was written for the study cast, so this is an experienced-artist route today; the [proof run](../../maintainers/art-direction.md#art-flow-follow-through) (AF07) turns it into exact steps.

**Look:** Mike judged the current fitted study people not good enough on October 31, 2026; the mercenary sets the bar. Use the family for its skeleton, mesh layout, weights and clips, and take each person's look from their own concept by wrapping.

### Wrapped family members

This is an experienced-artist route, unproven here; the proof run measures it. It joins a person made the mercenary's way to the shared family:

1. Generate the person from their concept (Steps 3–6) and clean the picked model (Step 7).
2. Pose the family base mesh to match: the same A-pose, height and proportions as closely as its shape targets allow.
3. Fit the base onto the generated surface:
   - Shrinkwrap it, then use Surface Deform for detail, pinning landmarks (eyes, mouth corners, fingertips, feet) so features land in the right places.
   - Fix by hand where the fit folds or slides; faces need the most care.
4. Bake the generated model's colour (and, where the look uses it, normal detail) onto the base mesh's UVs.
5. Store the result as a shape target of the base, or as a mesh with identical layout. It keeps the family's skeleton, weights, garments and clips, and blends with other people for variety.

## Step 2 — Add the 3D facts to the brief

On top of the shared [brief](README.md#stage-1--brief-no-spending), record:

- **Size:** the height or dimensions to model at, in metres. A person gets their own height ([production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production)): the height their definition states, or else one read from their age, build and work, with the reasons in the record's Interpretations list; never a shared default. An object takes its game definition's dimensions. A person's physical body in the world definitions can differ from the modelled height, because presentation fits the model to the body's extent.
- **Handedness and carried things:** which hand holds what; which items are separate assets (held tools, removable packs, weapons) and which are part of the body or garment.
- **States:** the visible states the game records for this subject, each to be delivered from one source ([state sheets](profiles.md#assets-and-icons)).
- **Clips:** `Idle`, `Walk` and `Run` for a walking character ([how `auto` decides](README.md#step-options); the consumer requires `Idle` and `Run`), plus any clips the requested scope adds. For anything that attacks, the wind-up, contact and recovery come first ([creatures](profiles.md#creatures)).
- **Parts and points:** pivots, grips and attachment points the game uses, and parts that must move or come apart.
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

A tool-neutral prompt skeleton:

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

Use `--profile prop` for rigid models and `--profile creature` for animals: `character` applies the body budget and also requires `Idle` and `Run`. The report reads the file's bytes, so an FBX saved under a `.glb` name is measured correctly. Record each candidate's pass or fail per row and an estimate of the cleanup each needs; a candidate that fails a lock is rejected even if it is the most attractive.

If every candidate fails the same way, the input is the problem. Return to Step 3 and change the views (separate the prop, open the arm gap, simplify a cape) rather than rerolling.

## Step 6 — Mike picks a candidate

Present the sheet with a short recommendation and the cleanup estimates ([review](README.md#comparison-sheets)). Add a capture of each candidate in the game's own look, made with the study viewer's local model preview after normalizing the candidates ([Step 10](#step-10--export-and-check-in-the-games-look)): at play distance, colour and silhouette decide more than detail. Record the choice and Mike's words.

## Step 7 — Clean and normalize in Blender

Work in a copy saved as `work/f01-<subject>.blend`; the raw candidate never changes. Use Blender 5.2.2 ([tools](tools.md#blender)). Put any fix you would repeat into a small script beside the work.

For an unrigged model, `normalize` does points 1–3 and the texture resize in one command and reports the result (add `--profile prop` for a prop, as for `report`); `--blend` also saves the editable scene:

```sh
"${B[@]}" normalize --in "$S/models/m01-<subject>.glb" --out "$S/export/normalized/m01-<subject>.glb" \
  --height "$H" --rotate-deg 0 --max-texture 2048 --blend "$S/work/f01-<subject>.blend"
```

`--rotate-deg` turns the model about the vertical axis until the sheet's front column shows its face: 0 for Meshy candidates, −90 for front-first Tripo candidates ([facing](tools.md#image-to-3d)). Normalize candidates to compare them in the game's look; a body rigged through Higgsfield is rigged from the raw candidate instead and comes back at the requested height with feet at 0 ([rigging](tools.md#rigging-and-clips)), so its cleanup keeps the weights (local fixes only).

1. **Import** the GLB, apply all transforms, and delete cameras, lights and empty helper objects the provider added.
2. **Face and scale:** rotate about the vertical axis until the model faces Blender's Front view (−Y), then scale uniformly so its height is the brief's real height. Move it so the lowest point sits at 0 and it is centred horizontally.
3. **Geometry repair:**
   - Merge vertices closer than 0.1 mm and delete loose vertices and edges.
   - Recalculate normals outward, and check winding with backface culling on.
   - Fix fused parts locally (cut them apart, rebuild the gap, smooth), and fill holes.
   - Remove invented ornaments that break a lock.
4. **Separate** held items, removable gear and moving parts into their own objects, with their pivots at their real hinge or grip. Appearance never sets collision, reach or capacity; those stay with the game's own definitions. Generate a part separately only when the extra control earns its fitting work, for example replacing a weak head while keeping an approved body and outfit; production parts, exported draw units and gameplay equipment are three separate decisions.
5. **Topology:**
   - Rigid models may be decimated to budget after checking the silhouette stays.
   - When a generated mesh keeps the intended form and supports the required movement, materials and budgets, refine it directly; repair or rebuild only the topology that fails a needed deformation or silhouette.
   - A body that will bend needs clean loops at shoulders, elbows, hips and knees. Where it lacks them, use a quad-topology generation setting, Blender's remesh followed by retopology, or a family body, rather than collapsing triangles. Quad output is an authoring option, not an acceptance test: the joints' structure, the exported triangles, the skinning and the rendered result decide.
6. **Materials and textures:** at most 8 materials, named by region (skin, hair, coat, leather, metal). Resize textures to the budget. Treat lighting baked into colour, identity accents and anything else the look depends on as the [production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production) say.
7. **Names:** `<subject>` for the root, `<subject>-<part>` for meshes, with no mesh named like a bone.
8. **Save** the `.blend` and record what was reconstructed in the record's Interpretations list.

## Step 8 — Rig and skin

### Rig routes

| Route                      | Use for                                                                                                                            | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Family rig**             | The shared skeleton under people's bodies, garments and hair, once the [people design](../../maintainers/art/people.md) settles it | Fit the body or garments to the shared human skeleton. Until [V3D05](../../maintainers/3d-pixel-art.md#v3d05--rigged-character-and-equipment-family) qualifies one, this is the MakeHuman/MPFB body ([family fit](#family-fit-for-people)), used only hidden under a person's own look. The study cast uses MPFB's bone-heavy Default rig; for new work prefer its Mixamo or GameEngine rig, and record the choice as provisional ([OD3](../../projects/art-workflow-feature-spec.md#od3--the-humanoid-body-family-and-rig-for-the-cast)). |
| **Automatic humanoid rig** | A distinctive two-legged humanoid with clear limbs                                                                                 | Rig the picked candidate with the automatic rigging route at its real height ([tools](tools.md#rigging-and-clips)): a textured GLB facing +Z. Through Higgsfield this is the raw candidate, so later cleanup must keep the weights. Proven on four people in the October 31 proof run. Then make its clips (Step 9), retarget shared clips onto it, or transfer its weights to the family rig.                                                                                                                                             |
| **Authored rig**           | Animals and every other nonhuman body; humanoids the automatic rig fails                                                           | In Blender, enable Rigify ([tools](tools.md#blender)) and start from its closest template (basic quadruped, horse, cat, wolf, bird, shark), or build a simple armature by hand. Use automatic weights as a start and hand painting to finish. A humanoid rig is never renamed onto an animal.                                                                                                                                                                                                                                              |

### Skinning checks

Pose the model through its extremes before making clips, and fix the weights or topology rather than hiding a bad bend:

- arms raised to horizontal and above the head;
- elbows and knees bent about 120°;
- a deep crouch;
- a 45° torso twist;
- hands opening and closing where the hands are rigged.

Check shoulders, armpits, hips, hems and anything worn over the body; garments must not pass through the legs or chest. Keep at most 4 influences per vertex and 64 joints, and keep bone names stable, because shared clips depend on them. Matching bone names alone does not make two skeletons compatible: proportions, rest pose and weights must also agree.

**Rough export first.** Before finishing materials or making a clip set, export the rough rigged body with its most demanding garment or carried thing and look at it in the study viewer ([Step 10](#step-10--export-and-check-in-the-games-look)): standing, turning and one representative bend. This finds wrong scale, bind pose, foot anchor, readability and material assumptions while they are cheap to change. When game integration is outside the request, this preview stands in for it and gameplay qualification stays open. A body, rig or garment meant for reuse is qualified with its family's [fit envelope](../../projects/3d-pixel-art-appearance-families.md#qualify-the-reusable-fit-envelope), and a route for repeated use is chosen with the [matched character-production comparison](../../projects/3d-pixel-art-validation.md#matched-character-production-comparison).

**Long skirts, robes and cloaks:** automatic weights bind them to the legs, so they split with each stride; every long-skirted person in the October 31 proof run did this in `Run`. Judge it in the game's look, and where it does not read as the garment, reweight the hem towards the hips with a smooth falloff or add skirt bones. Record the choice.

### Give a person a generated head

When a person's face fails the [head check](#step-10--export-and-check-in-the-games-look) (paint on a smooth head, or a stock face the look rejects), replace the head and keep the body, clothing, rig and clips. One head serves every outfit of the same person. This is the `head` [step option](README.md#step-options), about 29 credits a person.

1. Make the [head views](#head-views), about 11 credits.
2. Make one head with Tripo H3.1 Multiview, about 18 credits ([settings](tools.md#generated-heads)). Look at it as bare clay before going on: a real nose, brow and lips, and hair in locks.
3. **Read its landmarks** from front and side renders at known scale: the point between the pupils at the front of the eyeballs, the pupil spacing, and the chin and crown. Find each pupil as the darkest spot near its eye rather than by eye on a grid, where a reading was 8 px off per side. A MakeHuman body needs nothing more, since its eye bones give its own point and spacing. A face painted on a generated body needs the same point read from its renders, and its old head's chin-to-crown height.
4. **Graft it** onto the rigged body, or onto its motion file to keep its clips, with `head` ([how it works](../../projects/art-workflow-tech-design.md#45-head-give-a-body-a-sculpted-head)). Put the cut inside the clothing, about 4 cm below the front of the lowest neckline the person wears and at least 1 cm above the bottom of the bust as placed on that body: a head can sit 1.4 cm higher on one outfit than another (1.465–1.50 m on the 1.85 m MakeHuman bodies). Cut at the neckline itself, the bust ended there and a strip of old skin showed; `head` refuses a cut below the head:

   ```sh
   "${B[@]}" head --model "$S/export/f01-<subject>-motion.glb" --head "$S/models/m02-<subject>-head.glb" \
     --head-eyes X,Y,Z --head-eye-spacing D --neck-cut 1.47 --out "$S/export/f02-<subject>-head.glb"
   ```

   For a face painted on a body that is one mesh, give `--model-eyes X,Y,Z --scale S --neck-by-colour` instead of `--head-eye-spacing`, with S the old head's chin-to-crown height over the new one's.

5. **Check** it as Step 10's head check says, and look closely at the neck from the front, side, three-quarter and back, standing and mid-run: a bust standing off the clothing, a ring or crease across the throat, a line down the back of the neck or old skin showing at the collar is a failure. Then look in head-and-shoulders frames mid-clip in Idle, Walk, Attack, Wave and Sprint for the seam.

What the character fixes study found ([record](../../../art-direction/studies/2026-11-03-character-fixes/README.md#faces-for-the-rest-of-the-cast)):

- Tripo H3.1 Multiview from four views gave sculpted faces and hair in locks; Hunyuan3D v3 from the front view gave a strong face but a smooth helmet of hair and blotched cheeks. A MakeHuman head shaped under a generated body's own low-resolution paint read as a mask.
- Heads grafted onto MakeHuman bodies measure 2.8–4.0 cm nose ahead of the eyes. On bodies generated from sheets the painted heads are small (about 1:9 of the body), so their new heads measure 2.1–2.3 cm.
- Placed by the eyes, the generated bust is the generated person's chest, not the body's: on Kest and Mike it stood up to 10 cm outside the coat and swung with the head mid-run. `head` fits it onto the body's bare skin. The first version also left half the old nape over the new neck on every MakeHuman body, a hard line down the back of the neck. Mike found both in the game's look; close renders of the neck mid-run show them. The first fit then pressed every throat onto the old one from just under the jaw and left a ring across the neck: the base of a MakeHuman neck slopes about 6 cm lower at the throat than at the nape, and `head` now presses down to that base.
- A body painted as one mesh keeps its old painted chest skin at an open neckline, and its tone can differ from the new neck's there (Mara's sheet model). On MakeHuman bodies the skin paint is tinted to match.
- A braid that should swing needs geometry and bones of its own (Sela's braid); a generated braid is cut off at the neck.
- For the game's own files, graft with `--max-texture 1024`, which caps every map in the file, a generated body's own 2048² map too. The library people's other maps are 256²–512², and a 2048² map would add about 22 MiB of GPU memory per person against the proposed 256 MiB for all appearance art ([A3D11](../../limits/3d-pixel-art.md#a3d11--client-loading-and-residency)). Study files keep 2048² for close review.
- `head` keeps the body's clips at their own key rate. An earlier version exported at Blender's 24 fps, which cut every person's 0.7 s run loop to 0.667 s.

## Step 9 — Make the clips

1. **List the clips:** `Idle`, `Walk` and `Run` for a walking character (the game requires `Idle` and `Run` in every animated character), plus the requested scope. Fix the body, weights and equipment fit before making a set of clips that depends on them. For attackers, the wind-up, contact and recovery for each weapon or bite come before idle polish.
2. **Choose a source** for each clip, in this order:
   - existing family clips: the fitted MPFB study people carry the [character motion study](../../../art-direction/studies/2026-10-31-character-motion/README.md#library-people)'s library clips with the authored upright `Idle` from the [character fixes study](../../../art-direction/studies/2026-11-03-character-fixes/README.md#stance), retargeted with `--bones` (below), in place of the procedural `Idle` and `Run` from [`study_human_motion.py`](../../../scripts/study_human_motion.py);
   - a clip library offered by the rigging route (a single library clip by ID per rigging job; [tools](tools.md#rigging-and-clips)), retargeted in Blender;
   - a motion library such as Mixamo, used manually by Mike, with its terms recorded ([tools](tools.md#other-platforms-opt-in));
   - hand-keyed in Blender.

   Generated video is motion reference only.

   **For an automatically rigged humanoid** (Meshy's skeleton, one library clip per rigging job): run the rigging job once, with `Idle` (ID 0) ([commands](tools.md#rigging-and-clips)), then give it the cast's clips rather than that library idle, which crouches and looks around: the upright `Idle` from the [character fixes study](../../../art-direction/studies/2026-11-03-character-fixes/README.md#stance), and `Walk` (`walking_2`, ID 566) and `Run` (`Run_02`, ID 14) from the files the [character motion study](../../../art-direction/studies/2026-10-31-character-motion/README.md#resume) used (each Resume names the archive holding them); `CLIPS` below is a folder holding those three files:

   ```sh
   "${B[@]}" clips --model "$S/models/f01-<subject>-rig.glb" \
     --clip Idle="$CLIPS/k01-upright-idle.glb" --clip Walk="$CLIPS/k02-walking-2.glb" \
     --clip Run="$CLIPS/f06-orin-run.glb" --stride Walk --stride Run \
     --out "$S/export/f01-<subject>.glb"
   ```

   It keeps the first file's skeleton and mesh, takes the single clip from each named file, retargets it onto that skeleton (so a clip from another rig with the same bone names fits), names the clips as the game expects, keeps the provider's frame rate, exports with the recipe's settings and reports the result.
   - **Gait clips** that the game paces to travel speed (`Walk`, `Run`, `Sprint`) take `--stride NAME`: each becomes one in-place stride from left heel strike, each foot is held still while it is down, and the stride's measured ground speed goes in `<out>.clips.json` for the game's [gait](../../../apps/client/src/characters/gait.ts). Copy those facts where the game reads them: a catalog person's `strides` beside its animated file's hash, the mercenary's in [`mercenary.ts`](../../../apps/client/src/characters/mercenary.ts).
   - **Other clips that travel** take `--in-place NAME`.
   - **A rig of another family** takes `--bones` with a map naming the clip bone each of its bones follows, plus the limbs whose rest pose differs from the clip rig's; [`mpfb-meshy.json`](../../../scripts/art/bone-maps/mpfb-meshy.json) puts Meshy's clips on the MPFB family rig ([tech design](../../projects/art-workflow-tech-design.md#44-clips-give-a-rig-the-clips-the-game-plays)).
   - **A model that loads its motion separately**, like the mercenary, takes `--motion-only` to export just the skeleton and clips.

   Otherwise hand-key them on that rig: adapt the bone names in `study_human_motion.py` for `Idle` and `Run`, and key `Walk` in Blender.

3. **Block first, then author in place:** review the key poses and contacts at play distance before polishing the motion; polished clips follow the [motion order](../assets-and-animation.md#4-produce-motion-that-serves-an-action) for each needed motion. The game moves the body, so clips must not travel. Loop `Idle` and `Run` seamlessly; check feet planting, hand contact and held items on every frame that matters.
4. **Timing:** follow the look's production notes on how poses are held.
5. **Name** each action exactly as the consumer expects and push it to its own NLA track, so the glTF exporter writes one clip per action.

### Animate a saved model

A model kept in the archive has no live provider job, and the Higgsfield CLI cannot upload models, so a new library clip from a rigging job is possible only while a candidate job's `result_url` still works ([rigging](tools.md#rigging-and-clips)). Otherwise:

- retarget an existing clip with `clips` from any file that holds it on a compatible skeleton, with `--bones` for another family's rig;
- use the family clips when the model is on the family rig;
- ask Mike to fetch a clip from Mixamo ([manual](tools.md#other-platforms-opt-in));
- or hand-key it in Blender.

Keep the model's existing clips by naming each one, `--clip Idle="$MODEL#Idle"`, beside the new one. The study viewer's Motion menu plays only Idle, Walk, Run, Sprint, Attack, Punch, Dodge and Wave; check any other clip in Blender's viewport.

## Step 10 — Export and check in the game's look

1. **Export** a GLB with the [working recipe's settings](tools.md#blender): selected objects only, modifiers applied, NLA tracks as clips, skins, deform bones only, forced sampling, +Y up, textures embedded, no compression, no cameras or lights. Save it as `export/f01-<subject>.glb`.
2. **Report and budgets:** measure the exported file, not the `.blend`:

   ```sh
   "${B[@]}" report --out "$S/review/reports" --profile character --strict "$S/export/f01-<subject>.glb"
   ```

   Use the subject's profile here too (`prop` for a rigid model). It records height, lowest point, triangles, materials, texture sizes and total texture area, joints, maximum influences and clip names against the [budgets](#consumer-contract-and-budgets) and the required clips; `--strict` exits with code 2 when one fails. Check openings, pivots and attachment points by eye.

3. **Look check:** start the [study viewer](../../asset-workflow.md#inspect-in-a-browser-and-use-files-in-the-game) (`pnpm assets serve --page /art-study.html`; it needs the asset authority and the AWS sign-in to show the published cast), choose **All seven people**, then **Compare a local model** and pick the GLB, or drop it on the view. It joins the cast in the game's own renderer without being uploaded (up to 16 MiB), and its card shows the measured height, triangles, texture sizes and clips. Rotate the camera and set **Motion** to Run and Idle. Normalized candidates can be compared the same way before the pick.
   - Check that it faces the camera like the cast: a model showing its back here faces the wrong way.
   - A Blender viewport is not the game's look.
   - **Head check (people):** when the look's [production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production) ask for sculpted faces, view the head close up in the Smooth 3D treatment and as bare clay from the front and three-quarter, and measure how far the nose stands ahead of the eyes (`work/tools/face.py` in the [character fixes study](../../../art-direction/studies/2026-11-03-character-fixes/README.md#faces-for-the-rest-of-the-cast)). Faces painted on smooth heads measured 0.1–1.3 cm, sculpted ones 2.1–4.0 cm and the mercenary 3.4 cm. A failing face gets a [generated head](#give-a-person-a-generated-head).
   - **Feet check (walking characters):** watch the feet in the scene study's **Game travel** at the world's 6.6 m/s. A planted foot should not slide while it is down, and a clip played alone in place does not show this. The [character fixes study](../../../art-direction/studies/2026-11-03-character-fixes/README.md#planted-feet) measured how far toes move over the ground while down.
   - **Person check (people):** before the specific checks, look at the whole figure as a person: full body and upper body, standing, in Idle and through Walk, Run and Sprint, from the front, side, three-quarter and back, painted and as clay, beside the source body. Ask whether a person would look like that doing it. The head should sit over the shoulders, the back should be straight, the shoulders down, the neck its natural length, a man's chest without breast-like mounds under his clothing, and the hands whole. A flaw that came with a library source fails too. In the [character fixes](../../../art-direction/studies/2026-11-03-character-fixes/README.md#the-head-and-neck-and-the-runs-back), checking only the defects just fixed passed a run with the head jutting forward, a hump and a chest like small breasts.
   - **Back check (walking characters):** watch Run and Sprint from the side. The back leans in one line with the hips and the head sits over the shoulders; `clips` stands strides that way and limits their lean ([design](../../projects/art-workflow-tech-design.md#44-clips-give-a-rig-the-clips-the-game-plays)).

4. **Play checks:** run the profile's [play checks](profiles.md#play-checks) and record them.
5. **Fidelity:** build the [matched-scale comparison](README.md#matched-scale-comparison) of the export against the views and concept, and list the remaining differences.
6. **Critique:** get the [independent critique](README.md#independent-critique) for every new character or creature.

Make only the variants and levels of detail the consumer needs. A portrait, a turntable or one moving bone is not a finished animated character: record the rig and body revision the clips belong to, and the real limits found.

## Props, structures and state sheets

Rigid things follow Steps 1–7, 10 and 11, and skip rigging and clips (Steps 8–9) unless a part moves. A moving part (a lid, a gate leaf) becomes its own object with its pivot at the real hinge, and is rigged only when the consumer animates it.

- **Model to the game's dimensions.** For structures the game builds from parts, take each part's size and openings from its definition (for example a wattle panel and its hand opening) and model those parts, not a single sculpture.
- **One source, one collection per state.** Keep every visible state the game records in one `.blend`, one collection per state (`<subject>-intact`, `<subject>-damaged` and so on). Make damage remove, crack or displace real parts rather than remodelling the whole thing. All states share the same origin and pivot, so swapping them never jumps.
- **One export per state:** `export/f01-<subject>-<state>.glb`. The consumer selects a file per state; the berry bush's full and depleted exports in its [study catalog](../../../apps/client/src/props/art-study/source-natural-berry-bush/catalog.json) are the working example.
- **Part kits** for invention families and construction: each separable part is its own object with its pivot at its join, its material named by what it is made of, and its attachment points recorded in the study record.
- **Checks:** the [state and construction checks](profiles.md#play-checks) at the default camera, plus the scale check beside a person.

## Step 11 — Accept, preserve and hand off

Mike accepts or sends back (decision C). Then preserve through the [workflow's rules](README.md#9-preserve-and-resume):

- **Study material** goes to `--boundary art-studies --domain curated-private`: views, every candidate including rejected ones, sheets, captures and critique.
- **The package** goes to `--boundary art-library --domain curated-private`: the `.blend`, the raw picked candidate, the final GLB with its textures and clips, the report and the recipe scripts.

Finish the record. Putting the model into the world is integration: the [assets and animation chapter](../assets-and-animation.md) and the world's appearance owners cover selection, installation and play. Integration includes the provenance and catalog entries, the selected release, and placing the person or object through the world's own definitions.
