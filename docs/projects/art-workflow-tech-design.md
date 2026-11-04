# Art workflow — technical design

| Status      | Current progress                                                                                                                                                                                                                     | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Existing art helpers and local preview are delivered. Section 11 specifies NVIDIA authoring additions; those additions and provider/target qualification are future work. Earlier proof-run acceptance remains with its existing tracker. | 2026-11-04 |

This design describes how the [art workflow](art-workflow-feature-spec.md) is built: which page owns what, the seam to the art direction, the naming and storage conventions, the helper tool, the local model preview, the consumer contract the 3D route relies on, and the delivery tasks. The workflow is an agent-operated procedure; almost all of it runs on tools that already exist (the Higgsfield CLI, the OpenAI Images API, Blender 5.2.2 and the `pnpm assets` CLI). The new code is deliberately small.

## Maintained records

- **Implementation:** [Art-flow follow-through](../maintainers/art-direction.md#art-flow-follow-through), including AF14–AF17 for the NVIDIA design and qualification. The tracker owns current progress.
- **Limits and constraints:** no new discretionary limits ([feature specification](art-workflow-feature-spec.md#maintained-records)). The helpers read the existing [A3D04–A3D06](../limits/3d-pixel-art.md#a3d04--mesh-complexity) values from one table, and the preview applies [A3D02](../limits/3d-pixel-art.md#a3d02--encoded-intake-and-runtime-payload).
- **Related:** [feature specification](art-workflow-feature-spec.md); [asset workflow](../asset-workflow.md); [PlayCanvas guidance](../../.agents/skills/openlegend-playcanvas/SKILL.md); [world presentation](../world-presentation.md); [V3D tracker](../maintainers/3d-pixel-art.md).

## 1. Pages and owners

| Page                                                                                            | Owns                                                                                                                                             | Read when                                                        |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [`openlegend-art` skill](../../.agents/skills/openlegend-art/SKILL.md)                          | Entry point: read order, defaults, scope rules                                                                                                   | Any art request (root route)                                     |
| [`ol-design` skill](../../.agents/skills/ol-design/SKILL.md)                                    | `/ol-design` alias of the above                                                                                                                  | `/ol-design`                                                     |
| [Art workflow](../production-workflows/art-flows/README.md)                                     | Settings, the simple and full paths with step options, fidelity, look seam, the seven stages, review, spending, naming, comparison, preservation | Every request                                                    |
| [Tools and defaults](../production-workflows/art-flows/tools.md)                                | Default roster, presets and overrides, per-tool commands, cost estimates, job recovery, check dates                                              | Every request with a tool step                                   |
| [Profiles](../production-workflows/art-flows/profiles.md)                                       | Coverage per subject kind and the play checks                                                                                                    | The matching profile only                                        |
| [3D models](../production-workflows/art-flows/3d-models.md)                                     | Concept or sheet → prop, character or creature GLB, step by step, on either path; consumer contract and budgets                                  | 3D props, characters, creatures                                  |
| [Animation](../production-workflows/art-flows/animation.md) | Conditional motion work, reuse, source selection, target-preserving preparation, clip review and qualification | Only a request/consumer requiring animation |
| [Production packages](../production-workflows/art-flows/production.md)                          | Package contract; the finalize path; 2D, sprite, 2D rig, animation, material, environment, VFX and audio recipes                                 | Production of non-3D assets, package rules and the finalize path |
| [Study record](../production-workflows/art-flows/study-record.md)                               | The record outline and final message                                                                                                             | Writing or resuming a study                                      |
| [Current direction at a glance](../../art-direction/decisions.md#current-direction-at-a-glance) | The look's entry point and its production notes                                                                                                  | Every brief                                                      |
| [Asset workflow](../asset-workflow.md)                                                          | Storage commands, workspaces, publishing problems                                                                                                | Fetching, saving, publishing                                     |
| [Production handbook](../production-workflows/README.md) chapters                               | Turning art into play: objects, characters, scenes, interfaces, feedback                                                                         | Integration work                                                 |

**Removed:** `art-flows/standard.md` (its steps were duplicates of the shared procedure; its tool rules moved to the roster) and `art-flows/higgsfield.md` (its access, billing, reference-role, Canvas and recovery notes moved to the [Higgsfield section](../production-workflows/art-flows/tools.md#higgsfield) of the tools page). The production page's two 3D recipes moved, expanded, into the 3D page. Links were repaired in the same change.

**Routing.** The root `AGENTS.md` art-direction route now points at the stable art-direction entry point, and the art route covers every art generation, study, 3D or production request, including `/ol-design` and any named tool or flow. Asset export and inspection work also loads the [PlayCanvas skill](../../.agents/skills/openlegend-playcanvas/SKILL.md) through the existing engineering route; the 3D page does not repeat it.

## 2. The art-direction seam

- **Interface.** The workflow needs five things from a world's art direction: target and rejects, proportion and scale rules, references with roles and rights, production notes, and review conditions. The bundled world supplies them through [current direction at a glance](../../art-direction/decisions.md#current-direction-at-a-glance), a dateless heading that names the dated sections now current and carries **how the current look changes production**.
- **Why a new heading instead of renaming.** The dated requirements heading is linked from 56 files. Renaming it would churn unrelated documents, while a stable entry point gives the workflow a durable target.
- **Changing the look.** Edit the entry point, its production notes and the dated sections it names. Nothing in `docs/production-workflows/` should need to change; if it does, the seam leaked and the leaked rule moves to the art direction.
- **Another world.** A world that brings its own art direction supplies the same five things in its own art-direction owner. The brief's Look block is filled from that owner instead. No registry or schema is needed until a second world exists.

## 3. Conventions

The [art workflow's working-files section](../production-workflows/art-flows/README.md#7-working-files-ids-and-records) owns the study and candidate IDs, the record location, the working folder and file names; the [preservation section](../production-workflows/art-flows/README.md#9-preserve-and-resume) owns the storage destinations. They settle what the audit found inconsistent:

- three study-ID formats and two candidate-ID schemes in use;
- art studies kept in temporary directories, against the tracker's stable-workspace rule. The asset workflow's generic `/private/tmp` command examples remain illustrations for disposable checks;
- an uncertain private study domain. Every archived study file uses `curated-private`, in both `art-studies` and `art-library`, and the local study viewer serves only `public` and `curated-private`.

## 4. Helper scripts

One Blender command-line tool, `scripts/art/art-tool.py`, replaces the manual inspection and preparation steps that a junior would otherwise perform differently each time. It has four commands: `report`, `sheet models`, `normalize` and `clips`. The October 31 proof run repeated normalization twelve times and clip assembly five times, so those two were built with the first two; `sheet images` stays unbuilt. It runs in Blender's bundled Python, needs no new dependency, and writes only outside Git through the existing `external_output` guard in [`scripts/asset_workspace.py`](../../scripts/asset_workspace.py). It never calls a provider, opens a world or publishes anything.

Invocation, as for the existing recipes:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --disable-autoexec --offline-mode --python-exit-code 1 \
  --python scripts/art/art-tool.py -- <subcommand> [options]
```

### 4.1 `report`: what is this model?

`report --out <dir> [--profile character|creature|prop] [--expect-height M] <model> [<model> …]` imports each GLB, glTF, FBX or OBJ into an empty scene (choosing the importer from the file's bytes, because Tripo has delivered FBX files named `.glb`), ignoring the bone-shape mesh the glTF importer adds in its `glTF_not_exported` collection, and writes `<dir>/<name>.report.json` plus a one-screen summary:

| Group     | Values                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Size      | Bounds in glTF axes (+Y up), height, width, depth; lowest point (feet should be at 0); horizontal centre offset; unapplied object scale or rotation                                                    |
| Geometry  | Triangles, vertices, mesh objects, loose vertices and edges, non-manifold edges, zero-area faces, UV layer count                                                                                       |
| Materials | Unique materials; each texture's name, size, colour space and alpha                                                                                                                                    |
| Rig       | Joint count, root joint, maximum influences per vertex, object names that equal a bone name (PlayCanvas resolves the mesh first and deforms it as the joint)                                           |
| Motion    | Clip names, frame ranges, frame rate, duration; whether the clips the game requires are present (`Idle` and `Run` for animated characters, per [the client](../../apps/client/src/model-animation.ts)) |
| Budgets   | Each value against the A3D table for the profile (pass, warn or over), with the limit's ID                                                                                                             |

The A3D numbers live in one dictionary at the top of the script with a comment linking [the inventory](../limits/3d-pixel-art.md); that is the only place to update them. Exit code 0 means a report was written; `--strict` returns 2 when a budget is over or a required clip is missing, so the check can gate an export.

### 4.2 `sheet`: one picture to compare

`sheet models --out <png> --reference-height M [--fit-height M] [--tile PX] [--label TEXT] <model>…` renders every model at the same scale with Blender's Workbench engine (fast, deterministic, no lighting setup, works in background mode). Each model gets five orthographic views (front, right, back, left, three-quarter), named in a header row, in two rows: plain clay (single colour, to judge shape) and textured (material colour). The header exists because a mislabelled facing went unnoticed in the proof run until the game showed the models' backs. A reference figure at `--reference-height` (the look's reference figure from the [production notes](../../art-direction/decisions.md#how-the-current-look-changes-production); the tool has no built-in default) stands beside each model, and a label tile gives each ID, height, triangles, texture count and bones. `--fit-height` scales raw candidates of unknown units to one height first.

`sheet images --out <png> [--label TEXT] [--source <image>] <id>=<image> …` (deferred) lays concept or view images on equal-size planes with a text label under each, on a neutral background, the source first. It uses the same Workbench scene, so it needs no image library.

### 4.3 `normalize`: make it match the game's conventions

`normalize --in <model> --out <glb> --height M [--rotate-deg N] [--max-texture N] [--blend <path>]` applies transforms, rotates by the given angle about the vertical axis (facing is checked by eye on the sheet; automatic facing detection is unreliable), and scales uniformly so the mesh height equals `--height`. It then:

- moves the lowest point to 0 and centres horizontally;
- merges vertices closer than 0.1 mm, removes loose geometry and recalculates outward normals;
- downscales embedded textures larger than `--max-texture`;
- renames mesh objects that collide with bone names;
- exports through the shared export (§4.4), with no cameras or lights;
- saves the normalized `.blend` when asked, and finishes by running `report` on the output.

It does not decimate: the proof run showed the triangle budget is better met by the provider request (Meshy's target counts quads), and a rigged body would need retopology rather than a collapse. It is meant for unrigged candidates; rescaling an animated rig would leave its bone keys at the old scale.

### 4.4 `clips`: give a rig the clips the game plays

`clips --model <rigged> --clip NAME=<file>[#ACTION] [--clip …] [--stride NAME …] [--in-place NAME …] [--bones <map.json>] [--motion-only] --out <glb>` keeps the first file's skeleton, mesh and weights and takes exactly one clip from each named file (`#ACTION` picks one of several). Meshy's rigger returns one library clip per job, so each clip is one job. It then:

- imports at the clips' own key rate, read from the first clip file's key spacing (Meshy's are 30 fps), so every key lands on a whole frame and exports unchanged; resampling at Blender's default 24 fps shortened a 0.7 s run loop. An FBX clip whose import changes the rate is refused, because restoring the rate would re-time it;
- retargets each clip in world space: every bone of the kept skeleton turns by the same world rotation from its own rest pose as the source's bone of that name, and the root travels by the source's displacement scaled by hip height. Rigs whose bone axes differ therefore share clips; the mercenary's rig is over 100° off Meshy's, and copying joint angles twisted it. Bones the source lacks, such as the mercenary's cape, stay at rest;
- with `--bones`, retargets onto a rig of another family. The map's `bones` name the clip bone each model bone follows, several to one where needed; unlisted bones follow their parents. Its `alignRest` limbs first turn to the direction their clip bone rests in, so a different rest pose does not offset every frame; a limb with no followed bone below it (a hand) turns with the limb above. [`scripts/art/bone-maps/mpfb-meshy.json`](../../scripts/art/bone-maps/mpfb-meshy.json) puts Meshy's clips on the MPFB study people: their arms rest 47° below horizontal against Meshy's 67° and their knees straight against slightly bent, which unaligned left the arms 20° out. Spine, neck, head and feet stay unaligned, because their rest differences are anatomy and turning them distorts the body (a foot turned to Meshy's 51° sinks its toes 6 cm);
- with `--stride`, makes a gait clip one stride that starts at left heel strike (a closed loop is rotated to start there, a longer clip keeps its first whole stride), so the game can blend walk, run and sprint phase-aligned. A stride always plays on the spot: its travel is removed before trimming, because rotating a loop that still travels leaves a jump back that a later pass cannot see, and again after. Each stride's seconds and the ground speed its feet imply go in `<out>.clips.json`; the game paces its legs by them. The ground speed is how fast a foot slides back under the hips as it touches down, over the frames within 1.5 cm of its lowest point while it moves back, by central difference over the loop. The library clips' feet speed up through each stance, so pacing to the moment they visibly meet the ground plants them best; an average over the whole stance left them sliding forward on landing, and frame pairs in a fixed 3 cm band reduced a sprint's single contact frame to one push-off sample;
- with `--in-place`, removes another clip's net travel over each loop and keeps its bob;
- names each clip as given and writes one NLA track per clip, as the working human recipe does;
- with `--motion-only`, exports only the skeleton and clips, for a model that loads its motion separately (the mercenary's `mercenary-motion.glb`);
- exports through the shared export with the [working recipe's glTF settings](../production-workflows/art-flows/tools.md#blender). Quaternion signs need no repair: the pinned PlayCanvas makes each rotation track continuous when it parses a clip;
- reports the result.

### 4.5 Verification

The script is a tool, so verification is a disposable run, not a new test suite:

- run `report` and `sheet models` on three published study GLBs (the mercenary, one fitted person, one rigid prop) and compare the reported triangles, bounds and textures with their catalogs;
- confirm the facing convention beside the published mercenary ([§10](#10-open-questions));
- confirm the output guard refuses a path inside the checkout;
- run `normalize` on rotated, mis-scaled candidates and confirm the report shows the height, feet at 0 and centring;
- run `clips` on two rigging outputs and confirm the clip names, durations and key rate, that stride clips stay on the spot (the root's first and last keys match and its span is only the body's bob), then watch every clip in the study viewer.

**Evidence so far** (the [proof run](../../art-direction/studies/2026-10-31-character-sheet-proof/README.md), 2026-10-31): `report` measured 21 provider outputs, including Tripo FBX files named `.glb`; `normalize` brought 13 candidates to 1.85 m with feet at 0, and their facing was confirmed beside the published cast in the study viewer; `clips` built four characters whose `Idle` (4.0 s) and `Run` (0.7 s) kept every 30 fps key and played correctly in the viewer. `report` also matched the catalogs of three published study models (the mercenary at 42,500 triangles and 2.035 m, Kest at 32,462 and 1.85 m, the grounded chest at 13,996 and 0.709 m, with the same texture sizes; vertex counts differ by up to 22 where Blender's importer splits seams differently), and refused an output folder inside the checkout. The [character motion study](../../art-direction/studies/2026-10-31-character-motion/README.md) retargeted eight library clips onto the five people and the mercenary's differently oriented rig; it found that `--stride` rotated a single-stride loop before removing its travel, leaving 1.28 m of drift in Walk, now fixed by removing travel before and after trimming (every stride's root now ends where it starts, within 5 cm of bob). On November 1 `--bones` put the same eight clips on the 21 MPFB library people; their meshes, materials, texture bytes and node names came through unchanged and the bind pose within 0.00003. Ground speed measured at contact reproduces the mercenary's recorded speeds within 5%, and at the game's normal 6.6 m/s travel the library people's planted feet drift a median 12–17% of body speed ([library people](../../art-direction/studies/2026-10-31-character-motion/README.md#library-people)).

## 5. Local model preview in the study viewer

**Problem.** The [study viewer](../../apps/client/src/art-study.ts) shows only published catalog assets, so judging a fresh candidate in the game's own look requires publishing it first. Because the current look is applied by the renderer, a Blender viewport cannot show what Mike will see.

**Change.**

- **Control.** Add a **Compare a local model…** control (file picker and drag-and-drop) to the study page. The chosen GLB joins the current comparison (for example the cast) as one more subject, through the same preparation path as catalog assets: material treatment, small-subject density and `installLocomotion` when it has `Idle` and `Run` clips.
- **Loader.** [`BundledModels`](../../apps/client/src/bundled-models.ts) gains `loadBytes(name, filename, bytes)`, sharing the existing parse path instead of `readAssetBytes`, so ownership, cancellation and teardown stay as they are.
- **Bounds.** These come from the loaded meshes, since a local file has no catalog entry: world bounds for rigid meshes, and the bind pose for skinned ones, because a skin's inverse bind matrices already cancel the providers' 0.01-scaled armature node.
- **Card.** Like a catalog subject's card, showing the file name, height, triangles, texture sizes and clip names, with a note when `Idle` or `Run` is missing; there is no download link, since the file is already local.

**Boundaries:**

- The file never leaves the browser and is never uploaded, cached or published.
- Files over the [A3D02](../limits/3d-pixel-art.md#a3d02--encoded-intake-and-runtime-payload) 16 MiB runtime payload bound are refused with a message: the game would not load them either, so a larger raw candidate is resized or reduced first.
- Replacing or removing the local model releases its resources like any other comparison.
- It is a developer study tool, not a game feature.
- It works on the hosted public viewer and the local study server alike.

**Verification:**

- **Browser check:** load a local candidate beside the cast, rotate the camera, switch Idle and Run, replace it, and leave the page.
- **Resources:** check that it was released.
- **Bad input:** a malformed file shows an error without breaking the page.
- **Static checks:** typecheck and the client build.

**Evidence** (2026-10-31, headless Chromium driving the local study server): 13 normalized candidates and four rigged characters each joined the seven-person cast in turn, replacing the previous local model; the rigged ones played `Run` and `Idle`; **Remove local model** restored the seven; a text file named `.glb` showed "That file could not be read as a GLB model. The previous comparison is retained." and hid the remove control. Running it found two defects, both fixed: the local study server refused every workspace package (it dropped the leading `/` of Vite's `/@fs/` paths and omitted `packages/network`), so the page never finished loading; and skinned models measured 0.02 m tall, which misplaced their labels and framing.

## 6. Consumer contract used by the 3D route

The [3D page's consumer contract](../production-workflows/art-flows/3d-models.md#consumer-contract-and-budgets) owns the current format, axes, size, clip, naming, compression and budget requirements, each linked to its owner. The helpers read the same facts: `report` checks the required clips and the mesh/bone name rule, and its budget dictionary mirrors A3D04–A3D06. The general intake rules for arbitrary assets remain the proposed [3D pipeline design](3d-pixel-art-asset-pipeline.md#6-quarantine-conversion-and-validation); a manually prepared trusted asset uses the existing delivery path.

## 7. Security, privacy and spending

- **Credentials:**
  - **Higgsfield:** uses its own signed-in CLI session.
  - **OpenAI Images API:** needs an API key that Mike has authorized for art. A discovered key is not authorization.
  - **New platforms:** need Mike's account and permission.
  - Keys never enter records, prompts, sheets or Git.
- **Uploads:** a reference image goes to a provider only when its rights note permits it. Licensed library sources may forbid upload to AI services; reference-only screenshots are never uploaded as training or generation inputs without that permission.
- **Spending:** the [policy](../../.agents/rules/verification.md#spending) controls. The tools page gives per-tool estimates and the record keeps balances before and after each batch. Higgsfield credits are valued at the plan's per-credit price, about $0.039–0.049 on the Plus plan (checked 2026-10-31), with its own check date.
- **Private data:** never upload private world saves, conversations or unrelated files to a generator.

## 8. Delivery stages and tasks

| Stage | Task                                                                  | Done when                                                                                                            |
| ----- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1     | **AF04** pages, skills, art-direction seam, conventions               | This change: pages rewritten, removed pages' links repaired, guidance check passes                                   |
| 2     | **AF05** `art-tool.py` `report`, `sheet models`, `normalize`, `clips` | §4.1–4.4 behaviour and §4.5 verification pass; the 3D page calls the tool instead of describing manual inspection    |
| 3     | **AF06** local model preview                                          | §5 behaviour and verification pass; the 3D page's review step uses it                                                |
| 4     | **AF07** proof run                                                    | One first-playable person and one state-sheet prop go end to end with recorded cost, time, corrections and decisions |
| 4     | **AF08** update defaults from the proof run                           | The roster's defaults and the rig and motion recommendations reflect the measured results                            |
| —     | **AF09** retire the synced artgen skills                              | Mike deletes or replaces them ([OD4](art-workflow-feature-spec.md#od4--retire-the-synced-artgen-skills))             |
| 5 | **AF14** NVIDIA design | Section 11, feature §3.7, operational routes and research agree; no unmeasured route is called qualified |
| 6 | **AF15** offline motion bridge | Source import, target maps, clip assembly and arbitrary-clip study preview pass the disposable checks in §11 |
| 7 | **AF16** Kimodo qualification | Actual pinned provider/model/target combinations pass a small study with total effort/cost and art review recorded |
| Optional | **AF17** MotionBricks transition | One justified safe-pose transition is baked and accepted, or the comparison records why ordinary keying wins |

Stages 2 and 3 are independent and can run in parallel; stage 4 benefits from both but can start without them using the manual steps the 3D page gives.

## 9. Alternatives considered

- **Rebuild artgen as a repository CLI.** Rejected: the Higgsfield CLI already provides cost estimates, waiting and job recovery; a wrapper would duplicate it and add a provider layer to maintain. Only inspection, sheets and normalization, which no existing tool does for this project's conventions, become code.
- **A provider abstraction for many vendors.** Rejected for now. Two connected 3D models on Higgsfield (Meshy and Tripo) plus library fits are enough until the proof run shows a need ([OD2](art-workflow-feature-spec.md#od2--a-second-3d-provider)).
- **Keep separate Standard and Higgsfield pages.** Rejected: they duplicated the shared procedure. Presets keep Mike's vocabulary.
- **Rename the dated art-direction heading.** Rejected: 56 incoming links; a stable entry point achieves the same independence.
- **Turntables in the game renderer instead of Blender.** The game renderer is used for look review (§5); Blender's Workbench is used for shape sheets because it runs headless and identically every time.
- **An interactive review page with pick buttons.** Optional, not required ([OD6](art-workflow-feature-spec.md#od6--review-surface)); a labelled sheet in the conversation works in every host.
- **Pillow or ImageMagick for image sheets.** Rejected: neither is a project dependency, and Blender is already required for the 3D route.
- **`@gltf-transform/cli inspect` for model reports.** Rejected as a new dependency; Blender is already required and also renders the sheets. It remains a good manual cross-check.

## 10. Open questions

The product questions are [OD1–OD8](art-workflow-feature-spec.md#10-open-decisions-and-questions). The two technical questions this design began with are settled (checked 2026-10-31 on this Mac's Blender 5.2.2):

- **Workbench rendering:** it renders in `--background` mode, so sheets need no GPU window.
- **Importers:** factory startup enables glTF and FBX, and OBJ is built in. Rigify is bundled but disabled; `bpy.ops.preferences.addon_enable(module="rigify")` enables it headlessly, after which its metarig operators (for example the basic quadruped) work.

The facing convention is settled too: models normalized to face glTF +Z face the camera beside the published cast, including the mercenary, in the study viewer (October 31 proof run), and the 3D page's consumer contract states it.

## 11. NVIDIA motion authoring

**Status:** accepted design direction for implementation, not delivered code or qualified model output. The [feature decision](art-workflow-feature-spec.md#37-nvidia-motion-authoring) owns activation, defaults and scope. The [animation procedure](../production-workflows/art-flows/animation.md) is the operator's route; [tools](../production-workflows/art-flows/tools.md#human-motion-generation) owns the live provider pin/settings; the [research](../../art-direction/research/3d-pixel-worlds/nvidia-animation-2026-11-04.md) retains evidence and alternatives. All commands/options explicitly marked **planned** below must be implemented by AF15/AF17 before a guide treats them as executable.

### 11.1 Components and boundaries

Use the current character and clip pipeline. Add one small single-provider request helper, source import inside the existing Blender helper, explicit bone maps, and study-only clip inspection. There is no runtime model, provider registry, database, worker service, asset migration or new gameplay state machine.

| Owner/file | Existing behavior | Narrow addition |
| --- | --- | --- |
| Agent + art workflow | Resolve request, study, budget, tools, approvals and external storage | Determine animation need first; reuse compatible clips; select the qualified route for each missing human action |
| Planned `scripts/art/kimodo-request.py` | None | One Replicate submission or recovery, local receipt, bounded polling/cancellation and artifact download; no rigging, retargeting or publication |
| `scripts/art/art-tool.py` | Import/report/normalize, retarget and assemble clips, extract strides, export GLB | Import the supported SOMA BVH profiles, validate the actual motion root and mapped roles, save editable retarget output, inspect planned clip metadata |
| `scripts/art/bone-maps/` | MPFB-to-Meshy map | Explicit SOMA maps for each tested target rest rig; readable anatomical roles, no guessed per-clip mapping |
| `apps/client/src/art-study.ts` and `apps/client/src/model-animation.ts` | Local model preview, fixed motion choices, current Idle/Run gate | A study-only path to select any imported action and preview loop versus one-shot; keep game dispatch separate |
| Existing asset workspace / `pnpm assets` | Exact external revisions, source retention and publication | Preserve new source, corrected `.blend`, manifests and exports through the same commands |
| Planned optional `scripts/art/motionbricks-bake.py` | None | Convert a pinned MotionBricks pose-array result to a faithful Blender source action, then use the same retarget/export path |

The world chooses action meanings, visible expression, rig families, tool grips and timing. The generic helper reads only explicit files and parameters. It cannot query private actor state, create actions, apply damage, move a body, transfer an object or publish assets. Another world can use the same helpers with a different look and compatible human family. Different anatomy keeps the existing specialist route rather than being forced onto SOMA.

### 11.2 Input, output and record contract

Before a job, complete the usual study brief with the target's exact asset revision, actual rest rig, requested action, clip name, consumer/study-only destination, loop or one-shot meaning, root policy, duration, contact/grip targets and rights. Fetch the target and reusable source files into the external study workspace. Do not reconstruct a target from a screenshot or replace it with the model's stick figure.

Use one `motion.json` per candidate beside its payloads in the existing external study folder. It is a production record, not a runtime asset schema or new database. Git's study README links the preserved record and states decisions/readiness; it does not copy large provider responses or pose arrays.

| Record group | Required content |
| --- | --- |
| Intent | Study/candidate ID; target asset revision/hash; requested output names; anatomy/rig family; destination; loop/one-shot; `rootPolicy`; action timing/contact notes; fidelity locks |
| Source | Provider and immutable deployment or upstream code/checkpoint revision; actual model; seed; exact prompt/constraints, duration and generation settings; source rights and acquired license notices |
| Submission | Prepared request hash; submitted timestamp; prediction ID and status; returned get/cancel URLs; deadline; estimated/reserved/actual/uncertain spend under the shared task ceiling |
| Imported facts | Raw-file hash/type; FPS and timestamp span; source units/axes; rest convention; skeleton names/parents; moving pelvis; importer version/arguments and any whole-source rotation |
| Retarget/edit | Target rig signature; map file and Git revision; source/target root/foot roles; crop and root policy; contact corrections, pose edits and loop seam treatment; Blender version; editable source exact ref |
| Export/review | Exact GLB and sidecar refs/hashes; retained/new clip names; required consumer coverage; report, view/capture refs; actual checked rig/outfit/consumer; reviewer result and remaining limits |
| Resume | Current stage, known active job or uncertain submission, completed local downloads, preserved refs and next action; never a credential |

`rootPolicy` is one of `gait`, `stationary`, `authored-travel`. This is authoring metadata only. `gait` means an in-place cycle paced by native movement. `stationary` means intentional local body motion without net locomotion; it may include a reach, dip or sit transition. `authored-travel` retains a path for source/reference or a specifically supported consumer; it never bypasses native movement. A successful library export can still be `study-only`.

Preserve raw generation, useful rejected candidates, editable corrections and final exports. Use expiring signed output URLs only for immediate download, then discard them from durable receipts; retain prediction ID, stable status/cancel URLs, artifact hashes and exact preserved refs. Redact output URLs from the archived provider response. Credentials are used only in the authorized authentication header, never in prompts, artifacts, logs or receipts. Do not send unrelated references, world saves or private conversations. Model/rig changes invalidate only dependent source/map qualification; do not version the entire art system or re-export unaffected old assets.

### 11.3 Acquire one Kimodo candidate

#### Hosted route

Use the pinned `sprited/kimodo` version and `Kimodo-SOMA-RP-v1.1` in the [tools owner](../production-workflows/art-flows/tools.md#human-motion-generation). The inspected immutable deployment is `17111248e89aa145d768cc1e5f7baae228f69d854b996b860becfee287379545`. Its [published schema](https://replicate.com/sprited/kimodo/versions/17111248e89aa145d768cc1e5f7baae228f69d854b996b860becfee287379545/api) is the implementation contract; fail explicitly if the provider no longer offers it. Changing a pin requires a new source qualification, not a silent fallback to `latest`.

The first route requests **BVH** so the importer can use a defined hierarchy/rest convention. GLB is an optional optimization only after an actual exported file proves that Blender imports it as one armature with a valid rest pose; animated empties or a rods-and-spheres preview are not sufficient. Do not rely on `output_format=all` until the host's behavior without a supplied FBX has been checked. Do not upload our character merely to use the provider's Mixamo-specific FBX retargeter.

Prepare this shape as `request.json`; these values illustrate one candidate rather than requiring a new walk when an adequate walk already exists:

```json
{
  "version": "17111248e89aa145d768cc1e5f7baae228f69d854b996b860becfee287379545",
  "input": {
    "prompt": "A person walks forward at an even pace",
    "model": "Kimodo-SOMA-RP-v1.1",
    "duration": 4,
    "seed": 42,
    "num_samples": 1,
    "diffusion_steps": 100,
    "postprocess": true,
    "root_margin": 0.04,
    "output_format": "bvh",
    "output_delivery": "individual",
    "include_auxiliary": true,
    "filename_prefix": "openlegend_walk_c01",
    "sample_index": 0,
    "preview": true,
    "image_size": 512
  }
}
```

One prompt contains one action segment, normally 2–5 seconds and never over the upstream **10-second** limit. The host splits prompts on periods and treats duration as **per segment**. For this first helper, reject periods and multi-segment `segment_durations`; the operator writes a single clause. This prevents a paragraph from accidentally becoming a longer/bigger job. Advanced constraints and deliberately connected sequences remain explicit upstream-tool work, not an implicit expansion of the default request. Seed assists reproduction only within the recorded environment.

The planned helper has three commands:

- `submit --request FILE --out DIR --cancel-after SECONDS --cost-reserve USD`: validate the allowed model/profile, single segment, sample count, duration and external output path; write prepared request/receipt before the POST. Require an authorized `REPLICATE_API_TOKEN` in the process environment, never in arguments or output. One invocation creates at most one prediction.
- `resume --out DIR`: read the recorded prediction ID/URLs, fetch status, finish downloads and update the same receipt. It never POSTs a new prediction. An already downloaded complete result returns without spending.
- `cancel --out DIR`: cancel the known nonterminal prediction through its returned URL, then record the observed terminal state. Cancellation can incur already-used compute; do not mark it free.

Use Python's standard JSON/HTTP/filesystem utilities; no server or provider SDK is necessary. The agent/operator reserves the amount in the shared study budget **before** invoking `submit`; the helper validates it is supplied but is not a global financial ledger. Estimate using the current published billable rate and the configured execution deadline plus the provider's cancellation/billing terms, then account for previous/reserved/uncertain calls. Start with a 120-second deadline only when that bound fits the remaining authorized budget; it is a convenience default, not a promised price or provider SLA. A typical-cost label is not a spend cap. If the provider's maximum charge cannot be bounded adequately, do not dispatch automatically; report the missing price/access fact.

POST to `https://api.replicate.com/v1/predictions` with Bearer authorization, JSON body and the provider's `Cancel-After` header. `Prefer: wait` is optional HTTP waiting, not a billing deadline. Immediately persist the returned ID and `urls.get`/`urls.cancel` with an atomic local-file replacement. Poll the known GET URL about every two seconds while `starting`/`processing`, respecting rate-limit responses; `succeeded`, `failed` and `canceled` are terminal. The [HTTP reference](https://replicate.com/docs/reference/http) owns these values. If locally interrupted, leave the receipt for `resume`; a polling failure must not trigger a fresh generation.

The returned `output` is an **array of file URIs**, not a named GLB field. Download to temporary filenames, identify the expected BVH by header/content and metadata, verify completion, hash it, then rename. Require exactly the expected candidate/action and metadata; do not take `output[0]` on trust. Retain returned metadata and the useful MP4; archive any auxiliary viewer as source material without automatically executing its HTML/scripts. Missing/ambiguous artifacts fail the acquisition stage. [API output files expire after one hour](https://replicate.com/docs/topics/predictions/output-files), so download immediately and preserve through the existing asset workflow after each completed batch.

If the create response is lost before an ID is saved, mark `submission-unknown` with the request hash and time. Inspect account history through authorized provider access; resume a positively identified prediction or report ambiguity. The helper must not retry POST automatically. A download/status GET may be retried within the same job/deadline; a failed model generation, timeout or expired artifact never authorizes a new paid generation. One ordinary run is enough to decide whether the artifact advances; targeted offline correction continues without an extra permission round.

#### Official local route

An already provisioned workstation can use official v1.2 instead. Keep code/checkpoint revision, model license, text-encoder authorization and settings in the record. The [upstream CLI](https://research.nvidia.com/labs/sil/projects/kimodo/docs/user_guide/cli.html) supports this **upstream command**, independent of our planned helper:

```sh
kimodo_gen "A person walks forward" \
  --model Kimodo-SOMA-RP-v1.2 --duration 4 --num_samples 1 \
  --diffusion_steps 100 --seed 42 --output "$MOTION_WORK/source/walk" \
  --bvh --bvh_standard_tpose --save_example_dir
```

`MOTION_WORK` is the established external study workspace, not a new system directory. Archive native NPZ and replay/constraints metadata alongside BVH. The native route uses a **standard T rest pose**, unlike the hosted route's expected BONES rest convention, so it needs the matching source profile/map qualification. No built-in native GLB/FBX export or dependable native Mac setup is assumed. Existing CPU text-encoder offload reduces GPU requirements but is not free local setup. Do not distribute model/text-encoder weights in game assets.

### 11.4 Import the source correctly

Extend `import_model`/`native_fps` in `art-tool.py` to accept an explicit **source-only** profile for animation inputs. The target model remains an ordinary supported rigged GLB/FBX. A new `.bvh` must not fall through to OBJ or be accepted solely from its filename. First inspect its hierarchy, frame count/time and channels; refuse missing or nonfinite transforms, an unsupported hierarchy, an empty action or more than the requested single source. Preserve the raw file unchanged.

Planned `clips` additions:

| Option | Contract |
| --- | --- |
| `--source-profile kimodo-soma-bvh-bones` | Use the qualified hosted SOMA BVH hierarchy/rest convention; centimetres, +Y up/+Z forward, 30 Hz; verify actual header/metadata |
| `--source-profile kimodo-soma-bvh-tpose` | Same units/axes/timing but the explicitly exported standard T rest convention; separately qualified map |
| `--blend PATH` | Save the retargeted target rig, original target mesh/materials/weights and selected editable actions to an external `.blend` before disposable source objects are removed from the authoring handoff |
| `--root-policy NAME=stationary\|gait\|authored-travel` | Record the intentional policy per output action and validate compatible finishing choices; never infer game movement |

The source profile applies to **all sources in that invocation**, like the existing single `--bones` map. Do not mix raw SOMA and existing target clips in one command. Keep the existing GLB/FBX path unchanged when no source profile is supplied. Frame-rate handling must happen before selecting keyframes; no 30-to-24 reinterpretation.

Blender **5.2.2** ships `io_anim_bvh` in `scripts/addons_core`; enable it explicitly in factory startup. Use `bpy.ops.import_anim.bvh` with `target='ARMATURE'`, `global_scale=0.01`, `axis_forward='Z'`, `axis_up='Y'`, `frame_start=1`, `use_fps_scale=False`, `update_scene_fps=True`, `update_scene_duration=False`, `use_cyclic=False`, `rotate_mode='NATIVE'`. Enable the bundled module after each factory reset before BVH import, since `clear_scene()` resets Blender settings. Require an importer `FINISHED` result and set the export range from the actual action, not the default scene end or an extra rest placeholder. The importer keys N real samples at frames 1 through N; do not drop sample 1. Require positive finite frame time agreeing with 1/30 second within 0.000001 second, and match header sample count to action keys. Pin and verify the installed operator at setup; an unavailable importer is a setup error, not permission to install an arbitrary plugin or guess scale. Source: [Blender v5.2.2 importer](https://github.com/blender/blender/blob/v5.2.2/scripts/addons_core/io_anim_bvh/__init__.py).

The importer converts to Blender's +Z-up/+Y-forward convention. Rotate the **whole source armature** 180° around Blender Z, including its rest frame and motion, to match OpenLegend's Blender −Y forward / exported glTF +Z forward. The resulting coordinate mapping must be source `(x,y,z)` metres → Blender `(x,-z,y)` metres. Check three unit vectors: source forward → Blender −Y, source up → Blender +Z, source right → Blender +X. Do not rotate only the first animation frame or only the target mesh. Do not apply another 0.01 to the target or to already-metric GLB.

Expected upstream BVH has 77 SOMA joints and a static `Root` wrapper. **`Hips` is the moving pelvis.** Its native rest positions come from BVH `OFFSET`s, not frame zero. Rotation channels are ordered Z/Y/X; the Blender importer must honor channel order. Inspect actual hosted output before approving this profile: published upstream export facts are not proof of a community wrapper's bytes. A mismatch stops intake with the actual hierarchy/units needed for a new profile; it does not trigger guessing.

Keep 30 Hz through the raw retarget bake. Record both frame count and timestamp span: N samples at 30 Hz span `(N-1)/30` seconds between first and last samples; do not stretch the result by one frame merely to make a metadata duration label exact. Preserve fractional seconds in export. A source at an unexpected FPS fails the declared profile; a deliberate upstream re-export is preferable to silent reinterpretation.

Full source joints are intermediate data, not the runtime joint budget. Retarget onto the existing family and export its deform joints. Do not ship the 77-joint SOMA source just because it animates. Native NPZ is retained for provenance and optional upstream editing, **not loaded into the game or parsed for gameplay**. Its foot-contact channel layout differs between predicted and expanded skeletons, so no code may assume every NPZ has four channels.

### 11.5 Target maps and two-pass assembly

Create named maps only after inspecting exact source and target skeletons in Blender. Keep the current map direction: **target bone → source bone**. Preserve `bones` and `alignRest`; add a small `roles` object naming the target `hips`, `leftFoot`, `rightFoot`, `leftToe` and `rightToe`. For SOMA profiles, use only explicit mapped names; an unlisted target bone inherits its parent/rest pose. Do not accidentally bind a same-named `Root` to the static source wrapper. Require the mapped `hips` role to follow `Hips`, with positive finite source/target standing hip heights.

The helper's current `ground_speed` and `one_cycle` use Meshy names through `followers`. Use explicit target foot/toe roles when supplied so SOMA/MPFB names do not silently produce zero speed or a missing-key error. Existing no-profile Meshy behavior can retain its current known mapping; this is a narrow extension, not a general skeletal ontology. Record unmapped fingers/twists/cloth separately. Missing hips, either leg/foot chain, trunk/head or a requested arm chain is an error; optional finger/cape motion is a declared limitation, never invented by the mapper.

Verified source body chain and target-name starting points:

| Anatomy | SOMA source | MPFB target names already in the repo | Other target family |
| --- | --- | --- | --- |
| Pelvis | `Hips` | `root` | Inspect the actual deform pelvis, not any scene root |
| Lower/middle/upper spine | `Spine1`, `Spine2`, `Chest` | `spine03`, `spine02`, `spine01`; **verify parent/anatomical order before assigning** | Inspect ordered spine joints; do not reuse source-name spelling by assumption |
| Neck/head | `Neck1`, `Neck2`, `Head` | `neck01`, `head`; select the anatomically corresponding neck joint and check head orientation | Inspect the existing rest chain |
| Shoulder/upper arm/forearm/hand | `LeftShoulder`, `LeftArm`, `LeftForeArm`, `LeftHand` and right equivalents | `clavicle.L`, `upperarm01.L`, `lowerarm01.L`, `wrist.L` and `.R` equivalents | Use actual target names |
| Thigh/calf/foot/toe | `LeftLeg`, `LeftShin`, `LeftFoot`, `LeftToeBase` and right equivalents | `upperleg01.L`, `lowerleg01.L`, `foot.L`, `toe1-1.L` through `toe5-1.L`, plus `.R` | Use actual target names; SOMA `LeftLeg` is thigh, not the Meshy calf |

Sources: [pinned SOMA definitions](https://github.com/nv-tlabs/kimodo/blob/e1c219c99b4b94ba48be1fb6a1cbc64ecee4c954/kimodo/skeleton/definitions.py), [existing MPFB map](../../scripts/art/bone-maps/mpfb-meshy.json). Do not present this anatomy table as a fully qualified map. AF15 must save real JSON maps with tested target hierarchy/rest signatures; a junior follows this sequence:

1. Inspect target rest bones, parent chains and world directions. Save names, parents and rest transforms with the target asset hash; identify hips and feet. Compare the same anatomical chain in the source. Record the actual mapping file with the candidate before baking.
2. Inspect a still rest pose and simple original diagnostic poses: raise one arm, bend one knee, rotate the torso. Confirm left/right and forward orientation on both source and target. These are free local checks and require no generation.
3. Use the existing rest-relative world-space rotation retarget. Scale pelvis displacement once by target/source standing hip height after the source-unit conversion. Use the explicitly identified pelvis for every action; store roots **per action** rather than reusing the last loop variable when applying `--stride`/`--in-place` to several outputs.
4. Review limb rest alignment. Start `alignRest` with only the anatomical arms/legs that require it; verify hands with their parent limbs. Do not blanket-align spine, head or feet, where rest differences often express anatomy and can bury toes or twist the torso. Record any deliberate neck/spine reduction in the map note.
5. Bake the raw source onto a copy of the target at 30 Hz. Keep target mesh, skin weights, rest bones, materials, height, face, equipment sockets and garment construction intact. If a new rig or changed weights are actually necessary, identify that separate repair. Perform it when already in the authorized scope; otherwise report the dependency. Never rerig merely to accommodate the motion source.
6. Save an editable target `.blend` and a **full target GLB with its skinned mesh** containing the new action(s). An armature-only intermediate may reimport as empties, so reserve `--motion-only` for a validated final consumer export. Reimport this full intermediate into a clean scene and confirm the same target skeleton and non-root joint motion.
7. Finish contacts/root/loop policy in the target source, export the corrected full target intermediate, then assemble it with retained target clips using the current `clips` command **without the raw-source profile or map**. Every wanted existing clip is explicitly listed: `clips` clears the model's old actions. No unspecified action is assumed to survive.

Planned first pass (after AF15; paths stand for fetched exact assets in the external workspace):

```sh
"$BLENDER_BIN" --background --factory-startup --disable-autoexec --offline-mode \
  --python-exit-code 1 --python scripts/art/art-tool.py -- clips \
  --model "$MOTION_WORK/target.glb" --clip "Wave=$MOTION_WORK/source/wave.bvh" \
  --source-profile kimodo-soma-bvh-bones --bones "$MOTION_WORK/target-soma-map.json" \
  --root-policy Wave=stationary --blend "$MOTION_WORK/target-wave.blend" \
  --out "$MOTION_WORK/target-wave.glb"
```

The next assembly uses the existing interface; list the target's entire required/retained set, not just the three shown here:

```sh
"$BLENDER_BIN" --background --factory-startup --disable-autoexec --offline-mode \
  --python-exit-code 1 --python scripts/art/art-tool.py -- clips \
  --model "$MOTION_WORK/target.glb" \
  --clip "Idle=$MOTION_WORK/retained-target.glb#Idle" \
  --clip "Walk=$MOTION_WORK/retained-target.glb#Walk" \
  --clip "Run=$MOTION_WORK/retained-target.glb#Run" \
  --clip "Wave=$MOTION_WORK/target-wave.glb#Wave" \
  --out "$MOTION_WORK/target-final.glb"
```

Use this only when `retained-target.glb` really is the same target rig/rest family. If an older clip is still on Meshy's source rig, adapt that batch with its own existing map first; never apply the SOMA map to it. Preserve every catalog-required strike/stride (`Attack`, `Punch`, optional `Sprint`) as applicable. Do not re-trim already phase-aligned retained loops merely to add Wave; copy their verified timing/ground-speed entries and check they remain unchanged. If the final export changes sampling or timing, remeasure and review rather than silently copying stale metadata.

`report --strict` still gates a **complete runtime character** against the actual consumer and budgets. A raw source or one-shot intermediate intentionally lacks Idle/Run: inspect its source/action facts without mislabeling the missing runtime set as an error or fabricating clips to pass. The final assembled character must pass the runtime requirements. Source joint counts do not replace target A3D budgets.

### 11.6 Finish motion for play

Generation supplies a draft. Finish on the **target** so feet, grip, body proportions and garments are the ones the player sees. The editable `.blend` keeps the useful raw retarget action as a comparison and the corrected action as the export choice; only the selected actions enter the final GLB. Store loop/one-shot, phase and contact notes in `motion.json`, not in a new gameplay event channel. The existing `<out>.clips.json` remains the consumer-compatible seconds/ground-speed table.

| Kind | Required finishing | What the helper must not assume |
| --- | --- | --- |
| Idle | Select a stable interval; fix contact and join first/last pose deliberately; preserve a small readable gesture only if intended | A generated finite segment is not automatically a loop |
| Walk/run/sprint | Choose a stable complete gait cycle, establish left heel-strike phase, remove locomotor travel, use `--stride`, inspect the loop and measure target ground speed | `--stride` cannot repair a bad pose seam, irregular gait or abrupt generated turn |
| Stationary gesture | Preserve entry/meaning/exit, intended local pelvis shift and vertical motion; correct planted feet and hand contacts; export a one-shot unless it is explicitly a hold/loop | `--in-place` removes net drift on channels; it does not safely remove a nonlinear path or distinguish a sit from locomotion |
| Work/held object | Match actual support/grip geometry on the target; mark contact intervals, correct hands/feet in Blender, bake constraints to joints | Text such as “holding a hammer” does not supply the game prop, socket, object transform or valid crafting result |
| Authored travel | Keep the source trajectory as reference; use only a consumer explicitly designed to reconcile it with native movement | A root animation cannot become another world-position authority |
| Strike/recovery | Fit preparation, contact cue and recovery to the existing supported phase/progress contract; keep the strike silhouette readable from relevant directions | Model duration or a clip marker cannot delay input, decide damage or repair server/presentation lag |

For a contact correction, identify the frames during which a foot or hand should remain at its support/grip, set the intended target position in the existing source scene, use temporary Blender constraints/IK or keyed adjustments to keep it there, and bake the resulting supported deform-bone transforms. Remove authoring controls from the export. Inspect approach, contact and release; planting a hand for the entire clip is not a correct grip. Keep native object placement/ownership separate from this authoring reference.

Do not run the old net-drift removal over every one-shot. It subtracts a linear end-to-end displacement and can erase a meaningful rise or leave an arcing travel path. For a stationary action, correct the unintended planar travel while preserving the intended local weight shift and vertical motion. If it cannot be reconciled with the existing movement/action consumer, retain it as a reference/study and use a compatible motion. No new runtime IK, motion matching or per-frame model call is required by this design.

Loop cleanup is deliberate: choose a cyclic interval; compare first/last joint poses and the direction of motion across the seam; edit a short seam region only where it does not slide a planted foot or remove the intended beat. Recheck the exported loop several times with entry/exit to the existing idle and travel states. Do not make a long generation “loop” by only enabling a playback flag. Time stretching is permitted only when the resulting contact and native timing remain sound; a long work activity can repeat a valid working segment rather than setting work duration from a generated clip.

Review the exact export at the normal camera, with the current look, lighting, representative equipment and the actual target height. Compare to the retained motion on the same body. Confirm facing, posture, silhouette, non-root articulation, feet, hands, garment deformation and moving-camera artifacts. For the runtime locomotion proof, compare planted-foot drift and ground speed against the current clip under the same travel speed; report the values and visible result, not a universal “no foot sliding” claim. Current source-study timing/health-effect lag remains a separate presentation issue.

Pause/resume, starting, stopping and cancellation must not produce a visual success after a failed native action. The initial provider study can inspect these transitions in the viewer/Blender, but only an existing game consumer can prove actual gameplay interruption. A Wave or work clip in the study does not establish its game dispatch, even where a native expression/action already exists.

### 11.7 Inspect any named clip without expanding gameplay

The current `installLocomotion` requires Idle/Run and marks every imported action looping. The local viewer's fixed choices do not cover arbitrary work/gesture names. AF15 adds a **study-only** installer/control path while preserving `installLocomotion`'s runtime contract:

1. Reuse track collection and resource disposal; do not change native character-motion selection. A selected local preview model exposes its actual valid track names. Choose Idle if present, otherwise the first imported track. A zero-track model still displays as a static model.
2. The local model's clip control lists its own tracks by literal text, never a provider-supplied HTML label. Selecting a name plays that track on that model. The existing cast comparison can remain on its existing controls; do not invent a shared fallback that disguises a missing clip in another model.
3. Provide play/pause, replay and a loop toggle for that local preview. Default known locomotion/idle review to looping and other actions to one-shot; these are review settings, not engine semantics. A one-shot stops on its final pose; Replay starts at zero. Switching clips resets review time without changing game state.
4. Keep the existing manual advancement/visibility behavior: do not let the engine and viewer both advance the same animation or add another animation-frame loop. Removing/replacing a model, leaving the page and clearing preview release tracks, entity and loaded resources through the existing cleanup.
5. Reuse the existing intake bound and asset checks. No model files, inference worker or network account enters the viewer. Optional motion notes are shown by the study record; no new runtime asset metadata schema is required.

Disposable verification uses a full skinned target GLB containing only an unfamiliar one-shot, a normal Idle/Walk/Run target and a static prop. Check one-shot completion/replay, loop toggle, pause/resume, replacement and cleanup in the local study page. Then confirm the game's ordinary Idle/Run and phase-paced strikes are unchanged. This is a small authoring improvement, not a new emote menu or gameplay action selector.

### 11.8 Optional MotionBricks bake

AF17 starts only for a useful supported pose transition or an explicitly requested comparison. Use the pinned SOMA model and code, own/licensed pose history and target poses; exclude bundled evaluation motions and their derivatives from production. The shipped human API returns pose buffers; it does **not** export a BVH/GLB clip. Its ONNX exporter exports a model graph. The optional adapter must bridge this gap explicitly.

The planned `motionbricks-bake.py` is an offline Blender-side consumer of a saved generation result plus its exact skeleton/coordinate metadata. It never starts a provider job or chooses game behavior. The generation-side record stores the input history/targets and times, raw output, valid-frame count, code/model hash and rights. A small companion invocation in the upstream model environment can serialize those results; do not import the complete inference stack into the game or ordinary Blender helper.

Keep the two environments separate through arrays and metadata: the producer writes numeric poses; the Blender adapter checks shape, finite values, frame order, skeleton identity and units, reconstructs the source action at 30 Hz, then uses the same target map/retarget/correction/full-target-export path as §11.5–11.6. Use upstream pose/skeleton definitions to distinguish local rotations from global positions; no transposing or quaternion-order guessing. The detailed pinned pose layout must be captured with the first AF17 fixture and is a source-adapter fact, not a new runtime abstraction.

Use only valid output frames returned by the runtime. The nominal chunk's three-frame padding on each end must not be trimmed again if the API already returned the valid slice. Preserve history separately so it is not accidentally exported twice. The generated endpoint and authored target must be compared after retargeting; wrong footing, target discontinuity or an unavailable path is an authoring failure, never a reason to move the authoritative actor to fit the clip. For this first route, bake one short transition; automatic long-path chunk streaming is outside scope.

Its qualification output is one useful transition with source/target poses, safe provenance, a corrected editable target and the exact final clip. Compare correction effort with ordinary keying. If keying is simpler or better, keep MotionBricks optional and record the rejected comparison; AF16/Kimodo and the playable game do not wait for it.

### 11.9 Implementation order and qualification

Follow the order below. These are bounded local implementation/verification tasks, **not a request to generate during this documentation task**, a new automated test suite or a GitHub Actions workflow.

| Order / owner | Work | Exit evidence / stopping condition |
| --- | --- | --- |
| 1 / AF15 | Read this section, existing `clips`/maps, consumer requirements and current target source records. Fetch one exact primary target plus an MPFB target; list the clips each actually needs. Prepare an original or appropriately licensed diagnostic BVH and simple own-authored poses. | Source and targets available; rights and required names recorded. Evaluation-only fixtures stay clearly separated from production exports. No provider account is required for these local checks. |
| 2 / AF15 | Extend source import/FPS/axes, enable the bundled BVH importer after resets, add explicit roles/root selection and `--blend`/root-policy records. Validate the source before retargeting. | Original diagnostic poses import upright/facing correctly at 30 Hz, with the right span/scale; missing required joint or invalid frame time fails clearly. |
| 3 / AF15 | Inspect actual target hierarchies, make the two maps, bake full target intermediates, correct one motion and explicitly assemble retained clips. | Target appearance/rest/skin unchanged; requested limbs move correctly; retained names and timing survive; full target reimports correctly and consumer reports distinguish intermediate from final. |
| 4 / AF15 | Add the bounded single-provider helper and study-only arbitrary-clip preview. | Validate a prepared request without submitting; exercise receipt recovery against saved representative responses and local failures; preview a local one-shot without fake Idle/Run. Do not add a new general mock/test framework. |
| 5 / AF16, with AF15 fixes if needed | Verify account/rate/deadline; acquire the first **one** pinned hosted candidate. Inspect its actual BVH hierarchy/rest convention and returned metadata. | Either confirm the expected profile and continue, or stop, record the mismatch and adjust the narrow source adapter before another paid request. Source changes use the retained candidate; do not regenerate to debug import. This explicit feedback loop prevents AF15 and AF16 waiting on each other. |
| 6 / AF16 | Complete the representative audition below, on the same retained generation wherever possible. Preserve raw/edited/export/review artifacts and actual costs. | Qualify only the exact route/map combinations that pass; record failures and a concrete reuse/manual fallback. Stop when the requested coverage is answered; do not search many seeds for a favorable claim. |
| 7 / AF16 | Update the operational route's status and exact evidence links; compare result/correction effort with the existing library; get Mike's art review for production acceptance. | A fresh thread can recover every needed source and follow the route without a hidden setup step. Pending artistic acceptance is still pending. |
| Optional / AF17 | Qualify one pose-driven transition only when selected. | A measured useful result or explicit rejection; no dependency for the primary human text-to-motion route. |

The first source fixture may be hand-authored specifically for importer checks. It need not resemble a good generated performance. The first actual hosted sample is what confirms the deployment's source-format/rest contract; a local fixture cannot do that. Use a stable first sample to fix adapter bugs free of extra generation spend. Native v1.2 can provide a separate permitted fixture if already provisioned, but its standard-T profile cannot qualify the hosted rest convention by implication.

#### Small representative audition

Start with one candidate each for the cases actually missing; reuse any adequate existing candidate. Normally three short generations are enough to answer the initial source questions, with the same sources retargeted onto both bodies. This is a bounded comparison plan, not a claim of cost or a requirement to buy unnecessary replacements.

| Case | Checks | Runtime status |
| --- | --- | --- |
| Steady locomotion | Import/FPS/scale; crop/phase/loop; target feet; ground speed; preserved height/outfit; transition to retained Idle/Run | Use the existing Idle/Move path for the first complete game-consumer proof. Do not replace the accepted/default clip unless the candidate is useful and reviewed. |
| Ordinary object action | A requested pickup, reach or small work stroke with real reference geometry; approach/contact/release, hand and support pose; interruption rehearsal | Study-only until that action's 3D consumer is explicitly wired. Native pickup/work existing does not itself prove animation dispatch. |
| Expressive one-shot | A restrained wave or hesitation; identity, shoulder/hand deformation, entry/exit and completion without a false loop | The native `wave` expression exists, but the current 3D consumer does not dispatch the Wave clip. Review proves authoring, not new gameplay. |

Run these on the actual primary target and an MPFB body/outfit representing the other existing rig route. Include a garment/equipment condition that can fail visibly, without trying every outfit or inventing a crowd qualification. If a case fails on one family, qualify the other independently and record the limitation; do not label all humanoids supported.

For each case record source version/hash, target/map, source/profile facts, generation elapsed time, retarget time, correction time, first usable export time, total provider spend including failed/uncertain jobs, useful/rejected outputs, before/after captures, play-scale checks and actual reviewer outcome. Compare full effort with the available library/manual alternative. Do not report GPU inference latency as accepted-asset throughput. Passing technical checks and Mike accepting the performance are separate results.

**Reusable qualification key:** provider/deployment + actual model/checkpoint + source format/rest profile + importer version/settings + target hierarchy/rest identity + map revision. Store a readable passed/failed/pending row with exact study evidence in the operational owner. Ordinary clips on a passed combination reuse that qualification and still get their usual per-clip checks; no new per-clip approval ceremony. A different garment/height/contact gets the relevant visual check, while a changed bind rig/map/source convention needs the affected retarget checks. Qualification is not inferred from a provider brand name or copied across model versions.

### 11.10 Errors, work bounds and open facts

| Condition | Required outcome |
| --- | --- |
| No animation need or adequate existing motion | No provider setup/call; use the current static/reuse path |
| Missing target/source rights or unsupported anatomy | Preserve preparation, report the exact missing input, use the applicable library/manual route if it answers the request |
| Missing access, unbounded cost or unavailable deployment | Do not submit; finish offline preparation and identify the precise setup dependency |
| Unknown create result | Preserve `submission-unknown`, account for uncertain spend, recover by verified provider history; never duplicate POST automatically |
| Failed/canceled known prediction | Retain ID/error/cost; no paid automatic retry; a deliberate new attempt needs changed cause/settings and the normal budget check |
| Expired/malformed/multiple unexpected output | Fail acquisition; recover only the same still-available job/files; do not take a preview as the requested skeletal result |
| Wrong units/axes/rest/joints/rate or zero hip height | Fail source/map intake with the actual observed facts; do not normalize the target to disguise the error |
| Body looks wrong after retarget | Repair map/rest alignment/contact on the retained source, not a new image/model generation; separate skinning defects from motion defects |
| Clip lacks a supported consumer | Preserve a study/library output and state the missing dispatch; no invented action/event or successful gameplay claim |
| Storage unavailable | Keep the external workspace and resume receipt, mark not archived, report the exact dependency; never claim an expiring URL is preserved |

**Performance:** this is per-request offline work. One request helper handles one candidate/job; no task queue, per-NPC calls or model fan-out. Import/bake work scales with source frames × mapped bones, bounded by the selected short clip and target family. Process source batches sequentially, discard disposable source objects/actions after baking, and reuse the generated source across compatible targets instead of paying per character. Viewer work uses the existing asset bounds, animation update/culling and cleanup. Runtime receives ordinary target GLB clips and existing small stride metadata, so there is no model download, inference latency or new network dependency during play. Additional clips still have ordinary payload/memory cost; retain only the relevant runtime set and keep unused auditions in study storage.

**Open facts, assigned rather than blocking the design:** AF16 establishes actual account access, billable bounds, hosted rest convention, generated quality and total correction effort. AF15's inspected target maps settle exact spine/neck correspondence. AF17 establishes the optional human pose-buffer bake and whether it beats ordinary keying. None requires Mike to choose a new architecture now. Existing OD1–OD3, AF07/AF12/AF13 art decisions and V3D family qualification remain open with their owners. This design does not claim any provider execution, accepted generated asset, renderer improvement or resolved gameplay timing issue.
