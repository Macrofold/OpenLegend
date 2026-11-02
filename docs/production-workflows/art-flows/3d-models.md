# 3D models: from a concept or character sheet to a game model

This page takes an approved concept, a supplied character sheet or a written brief to a finished, checked GLB for a prop, structure, person or creature. It is the 3D route of the [art workflow](README.md): the steps below fill its stages, and its settings, decision points, spending and preservation rules apply throughout. Commands and models come from [tools and defaults](tools.md); exporting and inspecting assets also follows the [PlayCanvas guidance](../../../.agents/skills/openlegend-playcanvas/SKILL.md). Nothing here sets a look: whatever the current look needs from a model comes from its [production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production).

Steps 1–3 belong to Brief and Prepare, 4–6 to Make, 7–9 to Finish, 10 to Check and 11 to Preserve. These steps are the `finished` route. A model or animation request at `prototype` quality takes the shorter [prototype path](README.md#prototype-path) instead, and "polish/finalize" resumes a selected prototype from Step 7 through the [finalize path](production.md#polish-or-finalize-a-selected-model), repairing only what its final use needs.

## Consumer contract and budgets

What the game currently accepts. Each value has an owner; if it changes there, it changes here.

| Item           | Current requirement                                                                                                                                                                                                                                                                                | Owner                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Format         | glTF 2.0 binary (`.glb`) with textures embedded; no cameras, lights, scripts or custom extensions; no Draco, meshopt or KTX2 compression (the client configures no decoders)                                                                                                                       | [3D pipeline design](../../projects/3d-pixel-art-asset-pipeline.md#6-quarantine-conversion-and-validation)            |
| Units and axes | Metres, +Y up; lowest point at 0; centred horizontally; facing glTF +Z (the glTF convention and Meshy's rigging requirement), which is a model facing −Y in Blender's Front view. Confirmed October 31, 2026: models facing this way face the camera beside the published cast in the study viewer | Existing study catalogs, e.g. [the mercenary](../../../apps/client/src/props/art-study/source-mercenary/catalog.json) |
| Size           | Real size in metres. People are fitted to their body extent in play, but proportions come from the real source height                                                                                                                                                                              | [World presentation](../../world-presentation.md#animated-character-pixels)                                           |
| Clips          | Animated characters must contain clips named exactly `Idle` and `Run`, playing in place; loading fails without them                                                                                                                                                                                | [`model-animation.ts`](../../../apps/client/src/model-animation.ts)                                                   |
| Names          | No mesh object may share a name with a bone (the renderer would deform the mesh as that joint)                                                                                                                                                                                                     | [`art_study_common.py`](../../../scripts/art_study_common.py)                                                         |
| Mesh           | First profile: 20,000 triangles per rigid model, 40,000 per skinned body, 100,000 per assembled render root                                                                                                                                                                                        | [A3D04](../../limits/3d-pixel-art.md#a3d04--mesh-complexity) (proposed)                                               |
| Textures       | Longest edge 2,048 px; 8,388,608 px of texture area per model across all maps; at most 8 materials                                                                                                                                                                                                 | [A3D05](../../limits/3d-pixel-art.md#a3d05--textures-and-materials) (proposed)                                        |
| Rig and motion | 64 joints, 4 influences per vertex, 32 clips                                                                                                                                                                                                                                                       | [A3D06](../../limits/3d-pixel-art.md#a3d06--articulation-and-visual-composition) (proposed)                           |
| Download       | 16 MiB for the model and what it needs on first use                                                                                                                                                                                                                                                | [A3D02](../../limits/3d-pixel-art.md#a3d02--encoded-intake-and-runtime-payload) (proposed)                            |
| Look-specific  | What to bake or leave to the renderer, identity accents, review conditions                                                                                                                                                                                                                         | [Production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production)                       |

The budgets are a first proposed profile, not proof that more triangles look better or worse. A model may exceed one when it must; record which and why in the study record.

## Step 1 — Choose the build route

Pick the cheapest route that can meet the locks. Record the choice and the reason in the brief.

| Route                     | Use when                                                                                                                                   | Typical subjects                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Reuse or library**      | An approved asset or a suitably licensed library source already has the right form                                                         | Ordinary plants, rocks, wildlife, familiar tools                                            |
| **Family fit**            | The subject can share an existing body, rig and clips; its identity is in proportions, clothing, hair, colour and carried things           | Ordinary people of the cast, outfit variants, species variants                              |
| **Image to 3D**           | The form itself is distinctive: a named character's silhouette and outfit, an unusual prop or creature                                     | Named characters, signature props, unusual creatures                                        |
| **Hybrid**                | Generate only what is distinctive (a coat, a pack, a head) and fit it to a family body; or generate a body and move it onto the family rig | Named people who must share clips; distinctive garments                                     |
| **Wrapped family member** | A person must look like their own concept and also share the family's skeleton, clips and garments                                         | Named and ordinary people once the family exists (unproven; [how](#wrapped-family-members)) |
| **Hand-modelled**         | Exact dimensions, openings, joints or repeated modules matter more than surface invention, or generation keeps failing                     | Wall panels, gates, posts, containers with real openings, modular kits                      |

- People of the ordinary cast start with **family fit**, so every person shares one skeleton and its clips ([how](#family-fit-for-people)). Only the family route gives people whose face and body can be varied or edited later, because every member shares one mesh layout. A generated one-off mesh has its own layout and cannot take shared sliders. It can join the family only by being wrapped onto the family mesh, an advanced retopology step ([character creator and populations](../../projects/art-workflow-feature-spec.md#11-people-families-a-character-creator-and-npc-variety)).
- **Try the kit first.** For a person from a concept sheet, first match the sheet with the family kit: the nearest face, adjusted sliders and existing outfits. Wrap only the piece the kit cannot reproduce within the locks, usually the face; that piece then joins the kit. State the route and cost in the plan line.
- Structures whose parts the game builds (posts, panels, gates) are **hand-modelled from real parts**, with generation only for surface accents.
- Creatures start from the strongest anatomical library or specialist source; a generated creature needs the closest anatomy review and its own rig ([rig routes](#rig-routes)).

### Family fit for people

The fitted cast comes from [`scripts/prepare-human-study.py`](../../../scripts/prepare-human-study.py).

- **What it uses:** CC0 MakeHuman/MPFB sources (the `mpfb2-master`, `makehuman_system_assets` and `suits02` packages listed in the [source study](../../../art-direction/assets/source-study/README.md)).
- **What it builds:** a body on the MPFB default rig, with fitted garments, eye accents and the procedural `Idle` and `Run` clips from [`study_human_motion.py`](../../../scripts/study_human_motion.py).

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

- **Size:** the height or dimensions to model at, in metres, from the look's scale rules in the [production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production) and, for objects, the subject's game definition. Never guess. A person's physical body in the world definitions can differ from the modelled height, because presentation fits the model to the body's extent; the production notes say which height to model at.
- **Handedness and carried things:** which hand holds what; which items are separate assets (held tools, removable packs, weapons) and which are part of the body or garment.
- **States:** the visible states the game records for this subject, each to be delivered from one source ([state sheets](profiles.md#assets-and-icons)).
- **Clips:** the clips the consumer requires today (`Idle`, `Run`), plus any clips the requested scope adds. For anything that attacks, the wind-up, contact and recovery come first ([creatures](profiles.md#creatures)).
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

## Step 4 — Generate model candidates

1. **Estimate** the batch ([how](tools.md#estimate-and-record-cost)) and add it to the running total.
2. **Generate three candidates** from the same view set with the default routes: two from one model with different seeds and one from a second model, so their mistakes differ. The exact commands and settings are in [tools](tools.md#image-to-3d). Request texture and, for bodies, the A-pose and the triangle budget; leave rigging until a candidate is picked (Step 8). A body that will be rigged through Higgsfield must come back as a GLB facing the front, since the rigger takes the raw candidate ([rigging](tools.md#rigging-and-clips)).
3. **Add outside candidates** when they apply: a family-fit body dressed to the concept, a library model, or a quick hand-blocked form. They are compared like any generated candidate.
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

The report reads the file's bytes, so an FBX saved under a `.glb` name is measured correctly. Record each candidate's pass or fail per row and an estimate of the cleanup each needs; a candidate that fails a lock is rejected even if it is the most attractive.

If every candidate fails the same way, the input is the problem. Return to Step 3 and change the views (separate the prop, open the arm gap, simplify a cape) rather than rerolling.

## Step 6 — Mike picks a candidate

Present the sheet with a short recommendation and the cleanup estimates ([review](README.md#comparison-sheets)). Add a capture of each candidate in the game's own look, made with the study viewer's local model preview after normalizing the candidates ([Step 10](#step-10--export-and-check-in-the-games-look)): at play distance, colour and silhouette decide more than detail. Record the choice and Mike's words.

## Step 7 — Clean and normalize in Blender

Work in a copy saved as `work/f01-<subject>.blend`; the raw candidate never changes. Use Blender 5.2.2 ([tools](tools.md#blender)). Put any fix you would repeat into a small script beside the work.

For an unrigged model, `normalize` does points 1–3 and the texture resize in one command and reports the result; `--blend` also saves the editable scene:

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

| Route                                 | Use for                                                                  | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Family rig** (preferred for people) | Ordinary cast members and anything that must share clips                 | Fit the body or garments to the shared human skeleton. Until [V3D05](../../maintainers/3d-pixel-art.md#v3d05--rigged-character-and-equipment-family) qualifies one, this is the MakeHuman/MPFB body ([family fit](#family-fit-for-people)). The study cast uses MPFB's bone-heavy Default rig; for new work prefer its Mixamo or GameEngine rig, and record the choice as provisional ([OD3](../../projects/art-workflow-feature-spec.md#od3--the-humanoid-body-family-and-rig-for-the-cast)). |
| **Automatic humanoid rig**            | A distinctive two-legged humanoid with clear limbs                       | Rig the picked candidate with the automatic rigging route at its real height ([tools](tools.md#rigging-and-clips)): a textured GLB facing +Z. Through Higgsfield this is the raw candidate, so later cleanup must keep the weights. Proven on four people in the October 31 proof run. Then make its clips (Step 9), retarget shared clips onto it, or transfer its weights to the family rig.                                                                                                 |
| **Authored rig**                      | Animals and every other nonhuman body; humanoids the automatic rig fails | In Blender, enable Rigify ([tools](tools.md#blender)) and start from its closest template (basic quadruped, horse, cat, wolf, bird, shark), or build a simple armature by hand. Use automatic weights as a start and hand painting to finish. A humanoid rig is never renamed onto an animal.                                                                                                                                                                                                  |

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

## Step 9 — Make the clips

1. **List the clips:** `Idle` and `Run` for any animated character today, plus the requested scope. Fix the body, weights and equipment fit before making a set of clips that depends on them. For attackers, the wind-up, contact and recovery for each weapon or bite come before idle polish.
2. **Choose a source** for each clip, in this order:
   - existing family clips (the current fitted people have procedural `Idle` and `Run` from [`study_human_motion.py`](../../../scripts/study_human_motion.py));
     These use the MPFB bone names, so they fit only the family rig.
   - a clip library offered by the rigging route (a single library clip by ID per rigging job; [tools](tools.md#rigging-and-clips)), retargeted in Blender;
   - a motion library such as Mixamo, used manually by Mike, with its terms recorded ([tools](tools.md#other-platforms-opt-in));
   - hand-keyed in Blender.

   Generated video is motion reference only.

   **For an automatically rigged humanoid** (Meshy's skeleton, one library clip per rigging job): run the rigging job twice on the same candidate, once with `Idle` (ID 0) and once with a run such as `Run_02` (ID 14) ([commands](tools.md#rigging-and-clips)), then combine them:

   ```sh
   "${B[@]}" clips --model "$S/models/f01-<subject>-rig.glb" \
     --clip Idle="$S/models/f01-<subject>-rig.glb" --clip Run="$S/models/f01-<subject>-run.glb" \
     --out "$S/export/f01-<subject>.glb"
   ```

   It keeps the first file's skeleton and mesh, takes the single clip from each named file, names the clips as the game expects, keeps the provider's frame rate and continuous rotations, exports with the recipe's settings and reports the result. Add `--in-place Run` for a clip that travels: it removes the root's net travel over each loop. `Run_02` is already in place.

   Otherwise hand-key the two clips on that rig, adapting the bone names in `study_human_motion.py`.

3. **Block first, then author in place:** review the key poses and contacts at play distance before polishing the motion. The game moves the body, so clips must not travel. Loop `Idle` and `Run` seamlessly; check feet planting, hand contact and held items on every frame that matters.
4. **Timing:** follow the look's production notes on how poses are held.
5. **Name** each action exactly as the consumer expects and push it to its own NLA track, so the glTF exporter writes one clip per action.

## Step 10 — Export and check in the game's look

1. **Export** a GLB with the [working recipe's settings](tools.md#blender): selected objects only, modifiers applied, NLA tracks as clips, skins, deform bones only, forced sampling, +Y up, textures embedded, no compression, no cameras or lights. Save it as `export/f01-<subject>.glb`.
2. **Report and budgets:** measure the exported file, not the `.blend`:

   ```sh
   "${B[@]}" report --out "$S/review/reports" --profile character --strict "$S/export/f01-<subject>.glb"
   ```

   It records height, lowest point, triangles, materials, texture sizes and total texture area, joints, maximum influences and clip names against the [budgets](#consumer-contract-and-budgets) and the required clips; `--strict` exits with code 2 when one fails. Check openings, pivots and attachment points by eye.

3. **Look check:** start the [study viewer](../../asset-workflow.md#inspect-in-a-browser-and-use-files-in-the-game) (`pnpm assets serve --page /art-study.html`; it needs the asset authority and the AWS sign-in to show the published cast), choose **All seven people**, then **Compare a local model** and pick the GLB, or drop it on the view. It joins the cast in the game's own renderer without being uploaded (up to 16 MiB), and its card shows the measured height, triangles, texture sizes and clips. Rotate the camera and set **Motion** to Run and Idle. Normalized candidates can be compared the same way before the pick.
   - Check that it faces the camera like the cast: a model showing its back here faces the wrong way.
   - A Blender viewport is not the game's look.

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
