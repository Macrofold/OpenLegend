# Animation authoring

Use this procedure when the brief requires animation or names a motion. It owns source selection,
retargeting and clip assembly for the [art workflow](README.md); [production packages](production.md#animation-clips)
own the final finishing checks. [Tools and defaults](tools.md#human-motion-generation) owns the
current provider, model, version, access and cost facts. Exact helper behavior and the planned
source adapter belong to the [tech design](../../projects/art-workflow-tech-design.md#11-nvidia-motion-authoring).

**Current readiness, November 4, 2026:** compatible library reuse and the existing `clips` helper
remain usable. The new default human-motion route is a design decision, not a qualified export
path: source adaptation is planned in AF15 and provider/version/target-rig qualification in AF16.
Do not run a prospective adapter command or describe a generated source clip as game-ready before
those tasks deliver it. Reusing existing clips needs no new motion-service account or qualification.
The [research record](../../../art-direction/research/3d-pixel-worlds/nvidia-animation-2026-11-04.md)
explains availability and the selected route.

## Resolve the motion request

Ordinary requests such as “give this saved character a relaxed idle and a reaching motion” are
enough. Infer a small brief from the request and the actual consumer: selected model/rig revision,
required clip names, action or emotion, native timing, whether each clip loops or finishes, important
contacts and output format. Use the [step options](README.md#step-options), including
`motion=rough|polished`; simple/full still controls how far finishing goes. Do not expand one requested
action into a whole motion library or a new body-family project.

Animation-only work keeps the supplied mesh, rig, proportions, weights, materials and identity.
Repair a demonstrated blocking deformation within the authorized scope; a new motion source does
not require generating a new character or replacing a suitable rig. Models without a rig follow the
existing [rig routes](3d-models.md#rig-routes). Static props and root-only effects do not acquire a
humanoid skeleton merely to use a generator. Nonhuman creatures use an appropriate rig and motion
route for their anatomy.

List existing suitable clips before choosing new work. Preserve their useful timing. A walking
character normally needs `Idle`, `Walk` and `Run`; the current game requires `Idle` and `Run` in every
animated character. A request for one extra action adds it to that working set when the destination
is the game. A study-only named motion can remain narrower. New game actions follow their native
action timing; do not change gameplay durations to fit a generated performance.

## Choose a source for each missing clip

1. **Reuse suitable motion first:** the selected model's own clips, the compatible family collection
   or another already available, appropriately licensed clip. Retarget only when needed. The
   [character motion study](../../../art-direction/studies/2026-10-31-character-motion/README.md#library-people)
   contains the current family examples.
2. **New compatible human motion:** use the [default human-motion source](tools.md#human-motion-generation)
   once its pinned provider/version and the selected target rig are qualified. Describe the motion
   naturally, then retain the exact submitted prompt and resolved controls. Reuse a qualified route;
   qualification is not a new review ritual for every compatible clip. The
   [qualification contract](../../projects/art-workflow-tech-design.md#119-implementation-order-and-qualification)
   defines which source or target changes need another check.
3. **Other anatomy or an unavailable default route:** use an available clip library or Blender
   authoring appropriate to the selected rig. A user-selected source takes precedence when suitable.
   State the concrete access or compatibility gap and the route actually used; never silently
   substitute a different provider/model version. Ask only when missing account access, budget or a
   consequential artistic choice blocks the requested result.

Rigging and motion are separate stages. An already authorized rigging job may supply a useful clip,
but do not rerig once per motion or replace a saved character merely to obtain library animations.
Generated video is motion reference only, never the playable clip deliverable.

## Reuse clips with the existing helper

The current helper imports GLB/glTF and FBX; it does not import BVH. Its one `--bones` map applies to
all source clips in the invocation. A map for a new source must never be applied to existing clips
that are already on the target rig. For mixed source skeletons, adapt each source batch to the target
first, then [assemble the target clips](#assemble-and-review-the-target-clips).

For an automatically rigged humanoid on the established library skeleton, run the rigging job once
with its idle clip ([commands](tools.md#rigging-and-clips)). Then add the cast's walk and run from the
files named in the [character motion study's Resume](../../../art-direction/studies/2026-10-31-character-motion/README.md#resume).
`CLIPS` below holds those files; `B` and `S` use the
[working-folder setup](3d-models.md#step-5--inspect-and-compare-candidates).

```sh
"${B[@]}" clips --model "$S/models/f01-<subject>-rig.glb" \
  --clip Idle="$S/models/f01-<subject>-rig.glb" --clip Walk="$CLIPS/k02-walking-2.glb" \
  --clip Run="$CLIPS/f06-orin-run.glb" --stride Walk --stride Run \
  --out "$S/export/f01-<subject>.glb"
```

The model supplies the preserved mesh, skin and target skeleton. Each selected source action is
retargeted, named for the consumer and exported. The helper uses the first source clip's frame
spacing; it does not provide arbitrary mixed-rate normalization. Inspect rates before combining
sources and preserve timing explicitly.

- A different source family needs a map from target bone names to source bone names, including the
  limbs that need rest-pose alignment. The existing
  [`mpfb-meshy.json`](../../../scripts/art/bone-maps/mpfb-meshy.json) supports the established library
  route; it is not a map for a newly selected generator's skeleton.
- `--stride NAME` converts a traveling gait into one in-place stride from left heel strike and writes
  its measured speed to `<out>.clips.json`. Use it for newly prepared `Walk`, `Run` or `Sprint` clips
  that the game paces to travel speed, on a supported target foot mapping. Use `--in-place NAME` only for a deliberately reviewed net-drift correction; it does not close a pose seam or safely remove an arbitrary one-shot trajectory. Follow the [root-policy finishing rules](../../projects/art-workflow-tech-design.md#116-finish-motion-for-play).
- `--motion-only` exports the skeleton and clips for a consumer that loads motion separately.
- Hand-keying on the selected rig remains available. The existing
  [`study_human_motion.py`](../../../scripts/study_human_motion.py) is a starting point for procedural
  idle/run authoring, not a reason to replace a better existing action.

See [the implemented clip contract](../../projects/art-workflow-tech-design.md#44-clips-give-a-rig-the-clips-the-game-plays)
for action selection, rest-pose retargeting and export details. The current single-action-per-file
recipe above is established; preserving already prepared target clips requires the planned
[AF15 same-rig assembly and source-scoped selection](../../projects/art-workflow-tech-design.md#115-target-maps-and-two-pass-assembly)
described below.

## Author a new human motion

Use this procedure after AF15 supplies the helper and AF16 qualifies the selected route. The
[implementation and first-qualification sequence](../../projects/art-workflow-tech-design.md#119-implementation-order-and-qualification)
owns those initial tasks; source-profile options below are not installed commands yet.

1. Confirm the selected provider/version/target-rig qualification and available account, permission
   and bounded task budget. Pin the exact model revision; record its input controls, source skeleton,
   exported format, units, axes, time basis and applicable rights. Generate only the missing motion.
2. Preserve the original motion source and replay settings. For a hosted job, keep its prepared
   `request.json` and `receipt.json` once in the study's permitted working/archive location. Target candidates link that same source
   when it is reused on another body; do not duplicate its paid job or charge. Keep target-specific
   mapping, corrections and review in the [study record](study-record.md#construction-and-sources).
   An exported skeleton is source data, not the character's replacement rig. If the route produces
   BVH, the planned source-profile extension imports and normalizes it before retargeting; the current
   helper alone cannot consume it.
3. Adapt the new source batch onto the unchanged target rig using the qualified mapping and
   rest-pose/scale treatment. Normalize incompatible time bases explicitly. Bake a full target GLB
   intermediate including mesh and skin, correct root movement for the consumer, then measure any
   new gait on the final target rig. Keep editable target data when the planned option is available;
   a skeleton-only intermediate may not reimport as the required armature.
   Inspect contacts and deformation before assembling it with retained clips.
4. Assemble target-compatible clips with the planned `--same-rig` path and review the exported package
   below. Preserve existing actions that the request did not replace. Keep the source and repeatable conversion settings so
   a failed fit can be corrected without another paid generation.

A successful hosted prediction, a downloaded model or a promising preview does not close the
source-to-target check. If no qualified route exists yet, report that specific gap and complete
usable reuse or authoring work that is already in scope. The shared procedure adds no mandatory
Blender GUI plugin, live model service or inference dependency to the game.

### Optional offline transitions

A pose-conditioned transition tool from [the tool roster](tools.md#human-motion-generation) may fill
an explicitly needed gap between target poses. Prepare source-space pose conditioning with the
qualified mapping; the planned optional pose-array bake must produce a supported source artifact
before retargeting and review. This route does not supply a ready-made BVH export. Ordinary
clip blending does not automatically require generated transitions. This is offline asset authoring;
there is no runtime motion-model integration.

The tool's model/code terms and the rights to example motions are separate. The BONES example motions
shipped for this route are restricted to nonproduction use; do not ship them or use them as
production source motion. Record rights for the actual conditioning poses and motion data used.

## Assemble and review the target clips

The planned `clips --same-rig` path copies prepared actions without retargeting them again. It checks
that keyed bones' hierarchy/rest transforms and the armature object transform match the target,
then preserves their full action channels, including translations and scales. Source-scoped action
selection also prevents colliding names such as `Idle.001` from breaking `#ACTION`. The example is
**planned until AF15 delivers these checks and copying behavior**. It adds `Wave` to a model whose
complete retained set is `Idle`, `Walk` and `Run`:

```sh
"${B[@]}" clips --same-rig --model "$MODEL" \
  --clip Idle="$MODEL#Idle" --clip Walk="$MODEL#Walk" --clip Run="$MODEL#Run" \
  --clip Wave="$READY#Wave" --out "$OUT"
```

Here `READY` is a verified full target-rig GLB, not a raw provider download. `Wave` demonstrates clip
assembly and viewer review; playing it in the game requires the existing action/consumer route to
dispatch it, which this procedure does not add. Name every action to keep; the helper does not
preserve unnamed actions automatically. `--same-rig` rejects source profiles, bone maps, `--stride`
and `--in-place`; finish those operations before assembly. Reserve `--motion-only` for the final
export when its consumer loads motion separately.

The planned path carries existing `.clips.json` `seconds`/`groundSpeed` facts from each selected source
action to its requested output name. Missing gait facts require remeasurement; never substitute zero
or repeat accepted gait cleanup to hide the gap. Update the game's metadata only from the final
accepted target clips: catalog `strides` alongside
the animated file's hash, or the mercenary's values in
[`mercenary.ts`](../../../apps/client/src/characters/mercenary.ts), under the existing integration workflow.

For both simple and full paths, play the actual exported clip on the exported target at normal speed
and inspect important contact frames: feet, ground penetration, joint limits, hand/weapon grips,
clothing and held items. Check action names, duration and sampling, loop seams or one-shot endpoints,
and preservation of retained motion and appearance. The game's simulation moves the body. Locomotion cycles play in place; one-shot local weight shifts and vertical movement follow the explicit root policy and never become a second world-position authority. A clean source-rig preview does not prove the target character works.

`motion=rough` stops at useful readable motion after those checks. `motion=polished` follows the
[production motion order](../assets-and-animation.md#4-produce-motion-that-serves-an-action) for the
requested actions, including transitions or interruption behavior only where the consumer needs them.
Use the look's current production notes for pose timing; do not infer a low sample rate from a
pixelated presentation.

The current game report expects `Idle` and `Run`. The study viewer also needs both before it plays
any motion; its Motion menu offers Idle, Walk, Run, Sprint, Attack, Punch, Dodge and Wave. Inspect
narrow study-only exports and other actions in Blender's viewport and report that viewer limitation. Preserve coverage and any remaining source/rig/version qualification gaps in the
[study record](study-record.md#construction-and-sources). Finish under the
[production animation checks](production.md#animation-clips) when that quality was requested.

## Animate a saved model

Restore the chosen model and its recorded rig/clip sources from the archive, then follow this
procedure from the missing-clip inventory. A saved model does not need a live generation job to
receive reusable, authored or qualified generated motion. The existing rigging provider cannot
upload saved models through its CLI, so its one-clip-per-rigging-job path requires a still-valid
candidate URL ([access details](tools.md#rigging-and-clips)); that limitation does not block the other
motion routes. Keep original files and export to a new working path until review accepts the result.
