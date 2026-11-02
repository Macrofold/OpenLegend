# Art workflow — technical design

| Status      | Current progress                                                                                                                                                                                                                     | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Stages 1–3 are delivered: the pages, the art tool (`report`, `sheet models`, `normalize`, `clips`) and the local model preview. The proof run's character-sheet part is done; the wrapped-family test and a state-sheet prop remain. | 2026-11-01   |

This design describes how the [art workflow](art-workflow-feature-spec.md) is built: which page owns what, the seam to the art direction, the naming and storage conventions, the helper tool, the local model preview, the consumer contract the 3D route relies on, and the delivery tasks. The workflow is an agent-operated procedure; almost all of it runs on tools that already exist (the Higgsfield CLI, the OpenAI Images API, Blender 5.2.2 and the `pnpm assets` CLI). The new code is deliberately small.

## Maintained records

- **Implementation:** [AF04–AF09](../maintainers/art-direction.md#art-flow-follow-through).
- **Limits and constraints:** no new discretionary limits ([feature specification](art-workflow-feature-spec.md#maintained-records)). The helpers read the existing [A3D04–A3D06](../limits/3d-pixel-art.md#a3d04--mesh-complexity) values from one table, and the preview applies [A3D02](../limits/3d-pixel-art.md#a3d02--encoded-intake-and-runtime-payload).
- **Related:** [feature specification](art-workflow-feature-spec.md); [asset workflow](../asset-workflow.md); [PlayCanvas guidance](../../.agents/skills/openlegend-playcanvas/SKILL.md); [world presentation](../world-presentation.md); [V3D tracker](../maintainers/3d-pixel-art.md).

## 1. Pages and owners

| Page                                                                                            | Owns                                                                                                | Read when                                      |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [`openlegend-art` skill](../../.agents/skills/openlegend-art/SKILL.md)                          | Entry point: read order, defaults, scope rules                                                      | Any art request (root route)                   |
| [`ol-design` skill](../../.agents/skills/ol-design/SKILL.md)                                    | `/ol-design` alias of the above                                                                     | `/ol-design`                                   |
| [Art workflow](../production-workflows/art-flows/README.md)                                     | Settings, fidelity, look seam, the seven stages, review, spending, naming, comparison, preservation | Every request                                  |
| [Tools and defaults](../production-workflows/art-flows/tools.md)                                | Default roster, presets and overrides, per-tool commands, cost estimates, job recovery, check dates | Every request with a tool step                 |
| [Profiles](../production-workflows/art-flows/profiles.md)                                       | Coverage per subject kind and the play checks                                                       | The matching profile only                      |
| [3D models](../production-workflows/art-flows/3d-models.md)                                     | Concept or sheet → prop, character or creature GLB, step by step; consumer contract and budgets     | 3D props, characters, creatures                |
| [Production packages](../production-workflows/art-flows/production.md)                          | Package contract; 2D, sprite, 2D rig, animation, material, environment, VFX and audio recipes       | Production of non-3D assets, and package rules |
| [Study record](../production-workflows/art-flows/study-record.md)                               | The record outline and final message                                                                | Writing or resuming a study                    |
| [Current direction at a glance](../../art-direction/decisions.md#current-direction-at-a-glance) | The look's entry point and its production notes                                                     | Every brief                                    |
| [Asset workflow](../asset-workflow.md)                                                          | Storage commands, workspaces, publishing problems                                                   | Fetching, saving, publishing                   |
| [Production handbook](../production-workflows/README.md) chapters                               | Turning art into play: objects, characters, scenes, interfaces, feedback                            | Integration work                               |

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
