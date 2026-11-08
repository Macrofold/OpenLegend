# Art workflow — technical design

| Status      | Current progress                                                                                                                            | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Common production readiness and its implementation modules are designed; report/rehearsal support and production qualification remain open. | 2026-11-08   |

This design describes how the [art workflow](art-workflow-feature-spec.md) is built: which page owns what, the seam to the art direction, the naming and storage conventions, the helper tool, the local model preview, the consumer contract the 3D route relies on, and the delivery tasks. The workflow is an agent-operated procedure; almost all of it runs on tools that already exist (the Higgsfield CLI, the OpenAI Images API, Blender 5.2.2 and the `pnpm assets` CLI). The new code is deliberately small.

## Maintained records

- **Implementation:** [AF04–AF20](../maintainers/art-direction.md#art-flow-follow-through) own workflow and motion delivery, including common preparation/report and rehearsal support in §12; [AP01–AP03](../maintainers/art/prompting-and-library.md) own prompt guidance and source coverage; [PPL01–PPL06](../maintainers/art/people.md) own the accepted people design and unfinished family, creator and wardrobe implementation. The tracker owns current progress.
- **Limits and constraints:** no new game/runtime limits; §11 owns upstream motion constraints and offline authoring defaults ([feature specification](art-workflow-feature-spec.md#maintained-records)). The helpers read the existing [A3D04–A3D06](../limits/3d-pixel-art.md#a3d04--mesh-complexity) values from one table, and the preview applies [A3D02](../limits/3d-pixel-art.md#a3d02--encoded-intake-and-runtime-payload).
- **Related:** [feature specification](art-workflow-feature-spec.md); [asset workflow](../asset-workflow.md); [PlayCanvas guidance](../../.agents/skills/openlegend-playcanvas/SKILL.md); [world presentation](../world-presentation.md); [V3D tracker](../maintainers/3d-pixel-art.md).

The designed [people specification](people-from-parts-feature-spec.md) and [technical design](people-from-parts-tech-design.md) own canonical body measurements, facial controls, joint adjustments, garment fits and appearance recipes. The [family authoring contract](people-from-parts-authoring-contract.md) fixes control/age evaluation, source roles, material finishing and reusable baker interfaces; the [operator procedure](../production-workflows/art-flows/people.md) puts them in production order. The existing `head` and `clips` commands supply study evidence; neither builds an adjustable person or qualifies a wearable. Author and verify separate parts, then bake the first outfits offline. Live assembly and its costs require their own renderer qualification.

## 1. Pages and owners

| Page                                                                                            | Owns                                                                                                                                             | Read when                                                                 |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [`openlegend-art` skill](../../.agents/skills/openlegend-art/SKILL.md)                          | Entry point: read order, defaults, scope rules                                                                                                   | Any art request (root route)                                              |
| [`ol-design` skill](../../.agents/skills/ol-design/SKILL.md)                                    | `/ol-design` alias of the above                                                                                                                  | `/ol-design`                                                              |
| [Art workflow](../production-workflows/art-flows/README.md)                                     | Settings, the simple and full paths with step options, fidelity, look seam, the seven stages, review, spending, naming, comparison, preservation | Every request                                                             |
| [Tools and defaults](../production-workflows/art-flows/tools.md)                                | Default roster, presets and overrides, per-tool commands, cost estimates, job recovery, check dates                                              | Every request with a tool step                                            |
| [Profiles](../production-workflows/art-flows/profiles.md)                                       | Coverage per subject kind and the play checks                                                                                                    | The matching profile only                                                 |
| [3D models](../production-workflows/art-flows/3d-models.md)                                     | Concept or sheet → prop, character or creature GLB, step by step, on either path; consumer contract and budgets                                  | 3D props, characters, creatures                                           |
| [Animation](../production-workflows/art-flows/animation.md)                                     | Conditional motion work, reuse, source selection, target-preserving preparation, clip review and qualification                                   | Only a request/consumer requiring animation                               |
| [Production packages](../production-workflows/art-flows/production.md)                          | Package contract; the finalize path; 2D, sprite, 2D rig, animation, material, environment, VFX and audio recipes                                 | Production of non-3D assets, package rules and the finalize path          |
| [Runtime preparation](../production-workflows/art-flows/runtime-preparation.md)                 | Conditional physical references, motion routing, rough consumer rehearsal, complete assembly and readiness checks                                | Finished game assets and the applicable prototype/integration scope       |
| [Study record](../production-workflows/art-flows/study-record.md)                               | The record outline and final message                                                                                                             | Writing or resuming a study                                               |
| [Prompt direction](../production-workflows/art-flows/prompting.md)                              | Turning the existing brief into supported inputs; source locks, defect diagnosis and operation-specific examples                                 | Drafting or revising a generation/edit prompt; only the matching sections |
| [Current direction at a glance](../../art-direction/decisions.md#current-direction-at-a-glance) | The look's entry point and its production notes                                                                                                  | Every brief                                                               |
| [Asset workflow](../asset-workflow.md)                                                          | Storage commands, workspaces, publishing problems                                                                                                | Fetching, saving, publishing                                              |
| [Production handbook](../production-workflows/README.md) chapters                               | Turning art into play: objects, characters, scenes, interfaces, feedback                                                                         | Integration work                                                          |

**Routing.** The root `AGENTS.md` art-direction route points at the stable art-direction entry point, and the art route covers every art generation, study, 3D or production request, including `/ol-design` and any named tool or flow. Asset export and inspection work also loads the [PlayCanvas skill](../../.agents/skills/openlegend-playcanvas/SKILL.md) through the existing engineering route; the 3D page does not repeat it. Feature design reaches the matching production route through [feature documentation](../feature-documentation.md#required-content) when its scenarios require new or changed visuals or motion.

## 2. The art-direction seam

- **Interface.** The workflow needs five things from a world's art direction: target and rejects, proportion and scale rules, references with roles and rights, production notes, and review conditions. The bundled world supplies them through [current direction at a glance](../../art-direction/decisions.md#current-direction-at-a-glance), a dateless heading that names the dated sections now current and carries **how the current look changes production**.
- **Changing the look.** Edit the entry point, its production notes and the dated sections it names. Nothing in `docs/production-workflows/` should need to change; if it does, the seam leaked and the leaked rule moves to the art direction.
- **Another world.** A world that brings its own art direction supplies the same five things in its own art-direction owner. The brief's Look block is filled from that owner instead. No registry or schema is needed until a second world exists.

## 3. Conventions

The [art workflow's working-files section](../production-workflows/art-flows/README.md#7-working-files-ids-and-records) owns study/candidate IDs, records, stable working folders and file names; the [preservation section](../production-workflows/art-flows/README.md#9-preserve-and-resume) owns storage destinations. Private studies use `curated-private` in `art-studies` and `art-library`; the local study viewer serves only `public` and `curated-private`. Temporary-directory examples in the generic asset workflow are for disposable checks, not study preservation.

### 3.1 Prompt handoff through existing owners

The agent follows [the guide's ordered procedure](../production-workflows/art-flows/prompting.md#start-with-the-current-brief): the existing brief supplies purpose, sources and locks; tools supplies supported inputs; the relevant 3D/production route and profile define the actual artifact and review; the study record retains prompts, exact references, selection and continuation. These handoffs stay within the current stages. A prompt-only request ends with text in the requested document or chat, without an asset job or study folder.

No runtime/model adapter, automatic scoring loop, asset database, additional queue or retained world data is introduced. The prompt guide runs offline in agent context, so it adds no game tick cost or persistence/migration work. It consumes only the task's relevant brief and tool information; the [library research](../../art-direction/research/ai-asset-prompting/README.md) remains optional evidence. Provider syntax stays in the tools owner, and reusable source assets/rigs retain their existing rights and qualification boundaries.

**Extension trigger:** add a helper only when repeated authorized production exposes a specific manual operation that existing tools cannot serve well. A second world can use its own art-direction inputs without a registry. A source package's popularity, a long prompt or a polished example is not such a trigger.

**Verification:** inspect the changed guidance and links, run pinned formatting and the guidance checker, and reuse valid native routing observations when loading semantics have not changed. A text-only repair and a scoped material correction exercise the clarified stopping/state boundaries without paid generation; inspect their actual outputs, not only file reads. Existing AF07/AF08 own production measurements and default changes. No asset-quality pass or human enjoyment result follows from these documentation checks.

## 4. Helper scripts

One Blender command-line tool, `scripts/art/art-tool.py`, replaces the manual inspection and preparation steps that a junior would otherwise perform differently each time. It has five commands: `report`, `sheet models`, `normalize`, `clips` and `head`. The October 31 proof run repeated normalization twelve times and clip assembly five times, so those two were built with the first two; `head` followed when the November 3 character fixes gave seven people generated heads; `sheet images` stays unbuilt. It runs in Blender's bundled Python, needs no new dependency, and writes only outside Git through the existing `external_output` guard in [`scripts/asset_workspace.py`](../../scripts/asset_workspace.py). It never calls a provider, opens a world or publishes anything.

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

`clips --model <rigged> --clip NAME=<file>[#ACTION] [--clip …] [--stride NAME …] [--in-place NAME …] [--bones <map.json>] [--motion-only] --out <glb>` keeps the target model's skeleton, mesh and weights and takes exactly one clip from each named file (`#ACTION` picks one of several). Meshy's rigger returns one library clip per job, so each clip is one job. One `--bones` map, including `alignRest` and `relax`, applies to every input clip; all inputs must support that same correspondence. A map for an external rig is not automatically valid for retained target-native clips. Use the [saved-model experiment](../production-workflows/art-flows/3d-models.md#animate-a-saved-model) when native actions must survive or conventions differ. `#ACTION` matches a newly imported Blender action name exactly, not a stable source-file animation ID. A name occupied by the target or an earlier action can change that imported name; the [isolated diagnostic](../../art-direction/research/3d-pixel-worlds/character-production-2026-10-31.md#qualification-status--november-5-2026) reproduces this on Blender 4.3.2. Target reimport with `FILE#ACTION` is therefore not a qualified preservation recipe. The helper then:

- sets the scene rate from the first clip file's key spacing (30 fps for the inspected Meshy clips). Compatible sampling preserves timing; the helper rebuilds and retargets actions, and later glTF inputs can be resampled, so unchanged keys are not promised. Check durations, loop boundaries and contacts at the selected rate: resampling at Blender's default 24 fps shortened a 0.7 s run loop in the proof. An FBX clip whose import changes the rate is refused, because restoring the rate would re-time it;
- retargets each clip in world space: every bone of the kept skeleton turns by the same world rotation from its own rest pose as the source's bone of that name, and the root travels by the source's displacement scaled by hip height. Rigs whose bone axes differ therefore share clips; the mercenary's rig is over 100° off Meshy's, and copying joint angles twisted it. Bones the source lacks, such as the mercenary's cape, stay at rest;
- places the legs rather than copying their turns. Meshy's automatic rig puts the knee joint in front of a straight leg (10 cm on the clip rig, proof-run Maer Fen), so its leg joints read 28° bent while the leg stands straight, and the same turns dropped feet into the ground on legs that rest straight. Each ankle follows its clip ankle's path from rest, scaled like the root's travel, and a two-bone solve keeps the source hip/knee/ankle bend direction. Using the receiver's current plane could reverse its knee when an adjusted ankle goal crossed that plane. Project the source direction off the target hip-to-goal axis; a straight source falls back to the receiver plane, then straight. Discard scale-relative float32 collinearity noise before normalizing either projection. [Original Walk/Run controls and timing](../../art-direction/studies/2026-11-05-adjustable-people-redo/README.md#motion-and-export-experiments) isolate this correction. A leg reaches no farther than it stands, so it never straightens past its own standing angle; where the clip rig's falsely bent knees straighten (Wave, a run's push-off) the foot falls short for those frames. Lowering the hips per frame to reach instead made them jump up to 11 cm between frames. An ankle never goes below its standing height (the library's Wave, Punch and Dodge sink the clip rig's own feet up to 4 cm), and a foot pitches up about its ankle, rolling onto its toes, before a toe would;
- in a stride, holds each foot still while it is down. The library's feet speed up under the hips through each stance (a sprint foot from about 4 to 11 m/s on the ground). The earlier clips' feet floated and touched for a frame, so once the placed legs stood the clips on the ground no single pace kept a foot still: in the scene study's game travel the toes slid forward a median 43% of body speed, against 14% before. A foot is down while its toes are within 4 cm of their lowest and move back under the hips. The library walk's toes hover 1–3 cm through each stance and reach the floor only as the foot rolls off them, so a 1.5 cm band found only that roll. Through each run of at least three such frames the toes move at one steady speed relative to the hips, from where they land to where they lift; each ankle goal moves by the toes' error and the leg is solved again, twice;
- in a stride, stands the body above the hips as a runner stands (`stride_posture`). The library run leans the hips 12° and curls the upper back 29° further (41° from upright at the shoulders, with the neck bent back 27° to look ahead), its sprint leans the hips 45° and curls 20° more, and its walk 4° and 11°, which read as a hunchback on every person. Straightening the back alone, which an earlier version did, left the shoulders, arms and neck at the clip's turns for the curled chest: the shoulders rolled forward against it, a muscled chest under a tight tunic bunched into mounds and the head stood 20 cm ahead of the hips mid-run. Now:
  - a clip whose hips lean more than 20° beyond standing on average (`STRIDE_LEAN_MAX`) has its lean scaled down in every frame, so its rise and fall stay: the sprint leans 20°, the run and walk keep theirs;
  - each spine bone between the hips and the neck leans with the hips, keeping its turns and side bends but none of its forward curl beyond them;
  - the shoulders turn with the chest, so they keep the clip's hold on it, and the arms half as far (`STRIDE_ARM_CARRY`): turned fully, the sprint's forward hand rose above the head; left at the clip's turns, its back arm swung out straight behind;
  - the neck keeps the direction it has standing, with its turns and side bends, so the head stays over the shoulders; tilted with the chest, a MakeHuman neck, which leans 38° forward standing, carried the head out in front, chin first. The head keeps the clip's turn, so the gaze stays where the clip looks.

  The hips turn about their joints, not their middle: the root moves so each thigh stays where the clip's own hips put it, so the legs placed afterwards keep the clip's reach, the feet land and push off where the clip's do, and the strides' ground speeds stay within 0.5% of what they were before the hips stood up (the 21 library files; the mercenary's sprint moved 0.7%). Turned about their middle, the hip joints moved forward, the sprint's feet landed elsewhere and its ground speed rose by up to 31%, and in the scene study's game travel the watchpost runners' toes slid a median 26–30% of body speed, against 6–7%. Aiming the feet from the clip's hips under hips turned about their middle restored the speeds, but Ada's push-off leg could not reach back, her foot lifted early and slid 93% of body speed at travel speed;

- grounds each clip: one constant offset lowers it until its lowest foot point over the clip stands where the foot rests. The library's walk, run and sprint float the clip rig 2–7 cm, and in Wave its hips rise as its knees straighten;
- with `--bones`, retargets onto a rig of another family. The map's `bones` name the clip bone each model bone follows, several to one where needed; unlisted bones follow a same-named source bone when present, otherwise their parents. Its `alignRest` limbs first turn to the direction their clip bone rests in, so a different rest pose does not offset every frame; a limb with no followed bone below it (a hand) turns with the limb above. [`scripts/art/bone-maps/mpfb-meshy.json`](../../scripts/art/bone-maps/mpfb-meshy.json) puts Meshy's clips on the MPFB study people: their arms rest 47° below horizontal against Meshy's 67°, which unaligned left the arms 20° out. Spine, neck, head, legs and feet stay unaligned, because their rest differences are anatomy or joint placement: aligned legs copied Meshy's falsely bent knees and crouched about 37° in Idle, and a foot turned to Meshy's 51° sinks its toes 6 cm. Its `relax` holds give bones no clip moves a fixed turn from rest: MPFB's fingers rest spread flat and now curl gently, more from index to little finger;
- with `--stride`, makes a gait clip one stride that starts at left heel strike (a closed loop is rotated to start there, a longer clip keeps its first whole stride), so the game can blend walk, run and sprint phase-aligned. The strike is sought among the loop's frames once round, since its last frame stands for its first: sought on that last frame too, the strike fell there on 13 of the 22 game motion files' sprints, which were then kept unrotated and ended on a frame that after retargeting no longer matched the first, so they hitched once a stride. A stride always plays on the spot: its travel is removed before trimming, because rotating a loop that still travels leaves a jump back that a later pass cannot see, and again after; its grounding is measured over the one stride kept. Each stride's seconds and the ground speed its feet imply go in `<out>.clips.json`; the game paces its legs by them. The ground speed is how fast a foot slides back under the hips as it touches down, over the frames within 1.5 cm of its lowest point while it moves back, by central difference over the loop, measured on the clip after its feet are held. Where a foot was held still it reads the speed the foot was held at. A foot down too briefly to hold is read where it touches: the mercenary's sprint touches for one frame a foot, and pacing to the one held stretch instead slid his left foot 80% of body speed;
- with `--in-place`, removes another clip's net travel over each loop and keeps its bob;
- names each clip as given and writes one NLA track per clip, as the working human recipe does;
- with `--motion-only`, exports only the skeleton and clips, for a model that loads its motion separately (the mercenary's `mercenary-motion.glb`);
- exports through the shared export with the [working recipe's glTF settings](../production-workflows/art-flows/tools.md#blender). Quaternion signs need no repair: the pinned PlayCanvas makes each rotation track continuous when it parses a clip;
- reports the result.

**Current source-inspection limitation (November 4):** Blender can suffix an imported action when its name collides with a target action already in memory, so `FILE#ACTION` is not reliable for every same-name/multi-action assembly. The proven single-action-per-file recipes remain valid. [Section 11.5](#115-target-maps-and-two-pass-assembly) specifies the AF15 source-scoped selection fix before relying on the new retained-clip examples.

### 4.5 `head`: give a body a sculpted head

`head --model <rigged> --head <head> --head-eyes X,Y,Z --neck-cut M [--model-eyes X,Y,Z] [--scale S | --head-eye-spacing D [--model-eye-spacing D]] [--neck-by-colour] [--head-bone NAME] --out <glb>` replaces a rigged body's head with a separately generated head and neck, keeping the body's skeleton, clothing and every clip. It exists because generated bodies came back with faces painted on smooth heads (nose 0.1–1.3 cm ahead of the eyes) and the MakeHuman study people kept a stock look the art direction rejects, while a head generated from close-up views is sculpted (2.1–4.0 cm on the cast). How the head is made is in the [3D route](../production-workflows/art-flows/3d-models.md#give-a-person-a-generated-head). It:

- removes the old head: every mesh hanging at least a tenth on the head bone or the bones below it and at most a tenth on a limb (MakeHuman's eyes, brows, lashes and hair: a long braid hangs only 21% on the head, while the body's skin hangs 40% on its limbs), and every skin face hanging only on those bones. Only those faces go, not their vertices: deleting the vertices too renumbered the rest, so the per-vertex bone list no longer lined up, half the old nape read as finger skin and stayed over the new neck, and the tint sampled the wrong faces;
- places the new head by one landmark, the point between the eyes at the front of the eyeballs. On a rig with two eye bones (the MakeHuman family) the body's point and pupil spacing come from those bones and the scale from the two spacings, which also lands the new crown where the old head's was; a painted face has neither, so its point is read from front and side renders and its scale keeps the old head's chin-to-crown height;
- merges the head's vertices first (glTF splits them along texture seams, which would otherwise read as open edges all over the face), then cuts it flat at `--neck-cut`. It keeps the plain dark-grey undershirt its views give it, which at an open neckline reads as an undershirt; stripping it left the old skin showing, in another colour, between its neckline and the clothing;
- fits the bust below the base of the neck onto the body's bare skin, as cloth is fitted. Everything below the head of the lowest neck bone joined to the cut's edge is pressed onto the nearest bare skin and relaxed in turns, twenty rounds, 1.5 mm outside the skin. The press is full at the base of the body's own neck, the height where its skin hangs half on the neck and head, read level all round the neck, and grows over the 4 cm above it (or over the room down to the cut, where that is less), never from above the bone: that base sits at the bone at the nape and about 6 cm lower at the throat. Pressed from the bone all round, a generated throat standing 2 cm in front of the old one was pushed onto it just under the jaw and left a ring across the neck; ended below where the generated chest juts out, part of that chest stayed out and pinched the neck above the collar. The open edge is laid level onto the skin at its own height and is not relaxed. What the skin cannot take, where it stops under clothing, goes; the rest lies under the clothing or shows at an open neckline. Placed by the eyes, the bust is the generated person's chest, not the body's: it stood up to 10 cm outside a coat, cut flat like a shelf, and since MakeHuman bodies have no skin under their clothes it took its weights from the throat and chin and swung with the head. Pushed under the clothing instead, it folded into a ruff at the neckline; pressed in one go, the shelf's flat top crumpled into a strip there; and drawn to the nearest skin without the level edge, the edge rose in the middle and opened a notch. A piece joined to the cut's edge that comes nowhere near the body (a braid's cut end) stays put, judged over the whole piece: judged by its cut edge alone, a cut through only the front of a chest was nowhere near and left the shelf. Put the cut about 4 cm below the lowest neckline's front and at least 1 cm above the bottom of the bust as placed on that body; cut at a neckline, the bust ended there and a strip of old skin showed. A cut below the placed head is refused: it cut nothing, so nothing was fitted and the whole bust stood off like a shelf;
- elsewhere, as where the neck is cut above its base (the painted sheet bodies), draws the cut's edge onto the body left after the old head goes, fully at the edge and fading over 2 cm, 1.5 mm outside it, so the two meet without a step. Only that edge moves: hair locks are open sheets too, and drawing their edges out to the old head's shell raised a flap at a crown;
- removes the old skin of the neck and upper back that the new head covers (within 4 cm), except within 1 cm of the seam, so no hole opens; faces hanging on shoulders or limbs do not go. Where skin is its own mesh, all of it above the base of the neck counts as neck (MakeHuman hangs the sides of the neck partly on the collarbones, and that skin, outside a slimmer new neck, showed at Ada's collar), and the skin the fitted bust lies on goes too, whatever it hangs on and even by the seam, or it showed through mid-run. On a body painted as one mesh, a collar, scarf or hood hangs on the neck and spine like the skin, so `--neck-by-colour` removes covered skin only where its paint falls in the old head's own colours (12 levels per channel, give or take one); without it a hood's brown-grey, close to the hair's, came out in shards;
- where skin is its own mesh, tints the body's skin paint to the new neck, so the old skin below the seam and the hands match the face: per channel, the ratio of the two necks' colours, each the median of the lighter half of its warm samples (brown hair is warm too, but darker). A body painted as one mesh is not tinted: tinting by colour also shifted clothing near the skin's colours;
- skins the new head with the inverse-distance mix of its four nearest old skin vertices' weights, with the bones below the head folded into it, so the jaw follows the head and the neck its neck bones in every clip, and the fitted bust, as far as it was pressed, with the skin's own weights at the point it lies on, so it moves with that skin;
- downscales every map in the output, the head's and the body's, to the budget or to `--max-texture` (a generated body's own map is 2048², and the game's copies are capped at 1024²), names the head `generated head` (never a bone's name), exports through the shared export and reports the result;
- works at the body's own clip rate, as `clips` does, so its clips export unchanged. At Blender's default 24 fps the export resampled 30 fps clips and cut the 0.7 s run loop to 0.667 s, dropping the frame that closes it.

It does not merge the head into the body's material or repaint a body painted as one mesh: where such a body shows its old painted chest skin at an open neckline (Mara's sheet model), that skin keeps its old colour. Hair that hangs below the cut is cut with it.

### 4.6 Verification

The script is a tool, so verification is a disposable run, not a new test suite:

- run `report` and `sheet models` on three published study GLBs (the mercenary, one fitted person, one rigid prop) and compare the reported triangles, bounds and textures with their catalogs;
- confirm the facing convention beside the published mercenary ([§10](#10-open-questions));
- confirm the output guard refuses a path inside the checkout;
- run `normalize` on rotated, mis-scaled candidates and confirm the report shows the height, feet at 0 and centring;
- run `clips` on two rigging outputs and confirm the clip names, durations and key rate, that stride clips stay on the spot (the root's first and last keys match and its span is only the body's bob), then watch every clip in the study viewer.
- run `head` on a body painted as one mesh and on a MakeHuman body, then check the head as bare clay from the front and three-quarter, the neck close up from the front, side, three-quarter and back, standing and mid-run (a bust standing off the clothing, a ring or crease across the throat, a line down the back of the neck or old skin at the collar fail), and head-and-shoulders renders mid-clip in Idle, Walk, Attack, Wave and Sprint for the seam; confirm every clip survived and the file loads in the study viewer.

**Evidence so far** (the [proof run](../../art-direction/studies/2026-10-31-character-sheet-proof/README.md), 2026-10-31): `report` measured 21 provider outputs, including Tripo FBX files named `.glb`; `normalize` brought 13 candidates to 1.85 m with feet at 0, and their facing was confirmed beside the published cast in the study viewer; `clips` built four characters whose `Idle` (4.0 s) and `Run` (0.7 s) kept every 30 fps key and played correctly in the viewer. `report` also matched the catalogs of three published study models (the mercenary at 42,500 triangles and 2.035 m, Kest at 32,462 and 1.85 m, the grounded chest at 13,996 and 0.709 m, with the same texture sizes; vertex counts differ by up to 22 where Blender's importer splits seams differently), and refused an output folder inside the checkout. The [character motion study](../../art-direction/studies/2026-10-31-character-motion/README.md) retargeted eight library clips onto the five people and the mercenary's differently oriented rig; it found that `--stride` rotated a single-stride loop before removing its travel, leaving 1.28 m of drift in Walk, now fixed by removing travel before and after trimming (every stride's root now ends where it starts, within 5 cm of bob). On November 1 `--bones` put the same eight clips on the 21 MPFB library people; their meshes, materials, texture bytes and node names came through unchanged and the bind pose within 0.00003. Ground speed measured at contact reproduces the mercenary's recorded speeds within 5%, and at the game's normal 6.6 m/s travel the library people's planted feet drift a median 12–17% of body speed ([library people](../../art-direction/studies/2026-10-31-character-motion/README.md#library-people)). On November 4 `head` put seven generated heads on 21 bodies (three proof-run sheet models on Meshy's rig, 18 MPFB library outfits): every file kept its eight clips, the faces measure 2.1–4.0 cm nose ahead of the eyes against 0.1–2.5 cm before, the seams held mid-clip in five clips on four people, and the files load in the study viewer ([character fixes](../../art-direction/studies/2026-11-03-character-fixes/README.md#faces-for-the-rest-of-the-cast)). Those checks missed what Mike then saw mid-run in the game's look: the bust standing up to 10 cm off the clothing and swinging with the head, and the old nape over the new neck. With the bust fitted and the faces-only removal, no head stands more than 2.2 cm outside the clothing below the neck (4 points on Ada), against up to 1,693 points and 10.2 cm off the dressed body before. A close check before Mike's look found that the press, begun at the lowest neck bone all round, had left a ring across Kest's throat; pressed down to the body's own neck base, his and Mike's throats keep their sculpted shape, up to 2.7 cm in front of the old throats whose skin goes, the other 15 heads come out byte for byte the same, and close renders of all 18 MakeHuman outfits from four sides, standing and mid-run, show a clean neck; the straightened run leans 17° beyond standing against 31° ([character fixes](../../art-direction/studies/2026-11-03-character-fixes/README.md#the-head-and-neck-and-the-runs-back)).

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

The [3D page's consumer contract](../production-workflows/art-flows/3d-models.md#consumer-contract-and-budgets) owns the current format, axes, size, clip, naming, compression and budget requirements, each linked to its owner. The helpers read the same facts with the current limitations below: `report` checks its profile clip list, reports mesh/bone name conflicts, and its budget dictionary mirrors A3D04–A3D06. The current `creature` profile has no automatic required-clip list although the prepared actor loader requires `Idle` and `Run`; compare those manually until PR2 supplies explicit consumer checks. The general intake rules for arbitrary assets remain the proposed [3D pipeline design](3d-pixel-art-asset-pipeline.md#6-quarantine-conversion-and-validation); a manually prepared trusted asset uses the existing delivery path.

### Source, part and revision handoff

Use the existing study record and storage references. Resolve the selected source, consumer, requested change and stopping point. Link existing reports/catalogs/source data for unchanged facts; record only missing facts, changed assumptions and affected checks. Do not transcribe a second bone, clip, material or revision inventory. The selected [production-readiness contract](#12-production-readiness) makes applicable dependency facts and consumer checks ordinary package requirements. Uncertain production techniques and claimed effort/performance improvements retain the isolated experiments below; they are not prerequisites for requiring a usable handoff.

| Boundary                                  | Additional dependency facts                                                                                                             | Failure and owner                                                                                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Body/head/hair/garment → assembled source | Exact part/body-family references, fit method and supported range, neck/hair/hat interfaces, layering and hidden-skin assumptions       | PPL01/PPL02 own new-person contracts; missing fitted parts do not permit a fused-shell fallback. V3D06 owns nonhuman families.                                                 |
| Source rig → requested motion             | Target hierarchy/rest-bind frame and bone correspondence, relevant proportions, contacts and attachments; link the existing clip report | Retarget against the actual target. Matching names alone do not prove compatible pose, weights or contact.                                                                     |
| Parent → repaired revision                | Parent reference, changed dependency, affected checks, reusable evidence and retained parts/materials/clips                             | Follow the [repair map](../production-workflows/assets-and-animation.md#repair-map-and-downstream-effects); changing UVs, topology and a rest pose invalidates different work. |

The [brief/view agreement](../production-workflows/art-flows/3d-models.md#step-3--make-clean-reference-views) and [package contract](../production-workflows/art-flows/production.md#1-define-the-package-before-finishing) already own identity locks, contradictory references, rights/upload permission, units and export/material/resource requirements. Resolve those through their owners. Source-only shaders, constraints or physics need a supported export; report unsupported consumption instead of adding an engine service.

These are authoring facts in the existing **Construction and sources** and **Resume** sections. Keep exact inventories in the asset catalogs. Preserve rejected and selected inputs, and create a new output revision instead of overwriting review evidence. An unrigged candidate may report missing consumer clips; a final game-consumed animated export may not. `report` returning zero means it wrote its report, not that every row or visual requirement passed.

For a repair, reopen the changed exported bytes and compare with the parent under the affected use. Confirm retained clips and materials actually survived; do not infer preservation from a successful tool exit. Use an early rough export before expensive finishing to expose importer, proportions, gait/contact and supported-material problems. Existing `normalize`, `clips` and `head` commands have their documented input restrictions; notably an external rigger that can only accept its own raw candidate cannot preserve arbitrary local geometry repairs.

Required semantic parts remain editable even if a permitted export combines their draw primitives. Authoring in parts is not a mandate for a mesh/material per detail. Current GLB exports do not add wearable-item authority, a live character creator or arbitrary morph support. Runtime clothing/equipment state, actor decisions and physical action timing stay with their existing owners; clips display those facts and do not create them. No save migration, compatibility adapter, new provider wrapper or recurring population-generation process is introduced by this design.

### Evidence appropriate to the request

- **Prototype export — required pass:** the selected file loads, preserves required identity/scale, and performs only the requested motion with usable contacts. Cosmetic gaps may remain. A raw candidate's missing rig is expected; a requested animated deliverable's missing motion is not.
- **Polish — required pass:** the stated repairs pass the affected source/export/play checks, with the selected identity and unaffected working components retained. Broad family and device qualification is not repeated for a material-only repair.
- **Production proof — required measurement:** AF07 records provider spend, hands-on work, queue/run time, repair passes and limitations for the named source and consumer. Record overlapping elapsed intervals once. The video's timings and triangle counts establish no target. An unsuccessful method is useful evidence but cannot be called a qualified family.
- **Art acceptance — human evidence:** Mike's actual response determines acceptance; a file report, agent recommendation or absence of criticism does not. PPL source acceptance and a part's fit/rights evidence are separate from an individual image or head being liked.

### Isolated workflow experiments

AF07 owns these **unqualified method/efficiency experiments**; AF08 promotes only the scope supported by their results. Keep each comparison in its existing study record. Correct source/tool restrictions and common readiness checks remain mandatory. Compare additional automation, check-selection optimisations or uncertain techniques when actually selected, not the basic obligation to deliver required dependencies. Routine art edits need no benchmark campaign.

| Change under test                                                    | Actual before/after                                                                                                                                                     | Required correctness evidence                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Optional handoff automation or a claimed check-selection improvement | The current complete package/repair procedure versus the same job with only the proposed automation or check-selection technique changed; test those changes separately | The next operator can locate the exact source and complete the requested repair. Required identity, dimensions, parts and motion survive. Detect an intentionally omitted dependency relevant to this change: for example a retained clip, source reference, part or state. |
| One newly selected repair, fit or export technique                   | The established route versus one named technique on the same source and requested defect; separate UV, topology, rig, head/garment and clip changes                     | The repair passes its affected rows in the [repair map](../production-workflows/assets-and-animation.md#repair-map-and-downstream-effects), final consumer checks and the same play-distance review.                                                                        |

1. **Freeze the comparison.** Record exact input bytes, the previous recipe's commit/path, one changed step, requested quality/coverage, tool versions and consumer. Hold style, dimensions, required clips and resource budgets constant. Use separate working copies. If both routes already do the same work, record no treatment difference; do not invent a whole-model rebuild as the baseline.
2. **Execute both routes.** Measure hands-on work, provider/tool wait and run time, total elapsed time, repair passes and paid cost separately. Include documentation, recovery and rework. Do not sum overlapping waits as labour or substitute reading-time estimates. Keep task-specific scripts disposable unless repeated real use warrants a helper.
3. **Check the delivered result.** Reopen both exports and inspect relevant material/UV seams, deformation, contacts, clip coverage/duration/loops, identity, scale and parts. Retargeted clips need motion checks, not merely equal names. Exercise one relevant missing dependency in the handoff experiment; use an omitted custom clip only when retained motion is involved. Do not add animation to a static prop for this test or publish the deliberately broken artifact.
4. **Measure the affected consumer.** Compare final resource reports. If delivered runtime inputs differ, verify that each export actually loads and compare the same populated scene, camera, activity, device and settings. Use the relevant completed-frame and load/residency measurements from the existing [protocol](3d-pixel-art-validation.md#5-performance-qualification), with the current plain-3D look; this does not require its broader crowd/device or service campaign. File size or triangles alone do not prove performance. Identical runtime inputs establish no changed runtime workload and no speedup.
5. **Protect meaning.** Art-only trials must leave world facts, physical dimensions, action timing, observation and cognition inputs unchanged. Verify that boundary. A candidate changing any of them is a separate change under its semantic owner and needs isolated correctness/cognition and performance checks before adoption; an unrelated paid model rerun is not evidence about an offline art edit.
6. **Decide from evidence.** Retain failures and measured differences, including uncertainty and operator/tool conditions. Correctness is a required pass. Extra routine work or a performance regression keeps the candidate experimental; resolve noise with matched repeat runs, not a favorable sample. Do not widen its use while results are missing or inconclusive. A selected family needs its existing contrasting-fit proof too; one repaired asset does not qualify a population.

**Execution gap:** the [November 5 evidence](../../art-direction/research/3d-pixel-worlds/character-production-2026-10-31.md#qualification-status--november-5-2026) includes narrow bone-map, action-selection and in-memory retention checks, not production qualification. The available Blender 4.3.2 cannot run the full helper's Blender 5 action API, and retained editable production fixtures are unavailable locally. Production A/B tests remain unrun; use the documented Blender recipe and retained sources to execute them. PPL/V3D choices remain additional prerequisites for their respective people/family experiments.

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

| Stage    | Task                                                                  | Done when                                                                                                                                                                                                                 |
| -------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **AF04** pages, skills, art-direction seam, conventions               | Shared procedure and conditional routes are documented, links resolve, and the guidance check passes                                                                                                                      |
| 2        | **AF05** `art-tool.py` `report`, `sheet models`, `normalize`, `clips` | §4.1–4.4 behaviour and §4.6 verification pass; the 3D page calls the tool instead of describing manual inspection                                                                                                         |
| 3        | **AF06** local model preview                                          | §5 behaviour and verification pass; the 3D page's review step uses it                                                                                                                                                     |
| 4        | **AF07** proof run                                                    | One person using the accepted PPL route and one state-sheet prop go end to end with recorded cost, active/elapsed time, corrections and decisions                                                                         |
| 4        | **AF08** update defaults from the proof run                           | The roster's defaults and the rig and motion recommendations reflect the measured results                                                                                                                                 |
| —        | **AF09** retire the synced artgen skills                              | Mike deletes or replaces them ([OD4](art-workflow-feature-spec.md#od4--retire-the-synced-artgen-skills))                                                                                                                  |
| —        | **AP02/AP03** prompt-direction design and guidance                    | Existing feature/technical owners and operational instructions agree; original source dispositions remain traceable; scoped documentation/routing checks pass. This does not close AP01's media gap or AF/PPL proof work. |
| 5        | **AF18** NVIDIA design                                                | Section 11, feature §3.9, operational routes and research agree; no unmeasured route is called qualified                                                                                                                  |
| 6        | **AF15** offline motion bridge                                        | Source import, target maps, clip assembly and arbitrary-clip study preview pass the disposable checks in §11                                                                                                              |
| 7        | **AF16** Kimodo qualification                                         | Actual pinned provider/model/target combinations pass a small study with total effort/cost and art review recorded                                                                                                        |
| Optional | **AF17** MotionBricks transition                                      | One justified safe-pose transition is baked and accepted, or the comparison records why ordinary keying wins                                                                                                              |

Stages 2 and 3 are delivered. PPL01/PPL02 settle the people design; the authorized Wayfarer pilot supplies its qualification work. AF07 can complete an independent prop. Normal new-person production requires the qualified family and published PPL03 procedure; design approval alone does not supply them. AF10 builds the accepted kit, and AF11 batches it after fit and motion are demonstrated. No mandatory provider contest is required.

## 9. Alternatives considered

- **Rebuild artgen as a repository CLI.** Rejected: the Higgsfield CLI already provides cost estimates, waiting and job recovery; a wrapper would duplicate it and add a provider layer to maintain. Only inspection, sheets and normalization, which no existing tool does for this project's conventions, become code.
- **Import the purchased skill collection or add a prompt compiler.** Rejected for this work: external packages combine unrelated engines, assets and assumptions, while the existing brief and tools already carry the required information. Original focused instructions are sufficient. No parser, schema, automatic retry loop or catalogue of mandatory prompt fragments is needed.
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

**Status:** Kimodo is the accepted core human-motion source. The [source proof](../../art-direction/studies/2026-11-05-kimodo-api-test/README.md) verifies one hosted generation and Blender source import with Mike’s preview acceptance. Maintained integration and final character qualification remain undelivered. The [feature decision](art-workflow-feature-spec.md#39-nvidia-motion-authoring) owns activation, defaults and scope. The [animation procedure](../production-workflows/art-flows/animation.md) is the operator's route; [tools](../production-workflows/art-flows/tools.md#human-motion-generation) owns the live provider pin/settings; the [research](../../art-direction/research/3d-pixel-worlds/nvidia-animation-2026-11-04.md) retains evidence and alternatives. All commands/options explicitly marked **planned** below must be implemented by AF15/AF17 before a guide treats them as executable.

Run the examples from the repository root with `B` and the external study folder `S` from the [working-folder setup](../production-workflows/art-flows/3d-models.md#step-5--inspect-and-compare-candidates). Point `B` at the verified Blender 5.2.2 installation and substitute the fetched asset filenames.

### 11.1 Components and boundaries

Use the current character and clip pipeline. Add one small single-provider request helper, source import inside the existing Blender helper, explicit bone maps, and study-only clip inspection. There is no runtime model, provider registry, database, worker service, asset migration or new gameplay state machine.

| Owner/file                                                                                             | Existing behavior                                                                 | Narrow addition                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Agent + art workflow                                                                                   | Resolve request, study, budget, tools, approvals and external storage             | Determine animation need; default new/replacement human motion to Kimodo; reuse accepted clips across compatible characters                            |
| Planned `scripts/art/kimodo-request.py`                                                                | None                                                                              | One Replicate submission or recovery, local receipt, bounded polling/cancellation and artifact download; no rigging, retargeting or publication        |
| `scripts/art/art-tool.py`                                                                              | Import/report/normalize, retarget and assemble clips, extract strides, export GLB | Import the supported SOMA BVH profiles, validate the actual motion root and mapped roles, save editable retarget output, inspect planned clip metadata |
| `scripts/art/bone-maps/`                                                                               | MPFB-to-Meshy map                                                                 | Explicit SOMA maps for each tested target rest rig; readable anatomical roles, no guessed per-clip mapping                                             |
| `apps/client/src/art-study.ts`, `model-animation.ts`, `art-study.css` and `apps/client/art-study.html` | Local model preview, fixed motion choices, current Idle/Run gate                  | A study-only path to select any imported action and preview loop versus one-shot; keep game dispatch separate                                          |
| Existing asset workspace / `pnpm assets`                                                               | Exact external revisions, source retention and publication                        | Preserve new source, corrected `.blend`, manifests and exports through the same commands                                                               |
| Planned optional `scripts/art/motionbricks-bake.py`                                                    | None                                                                              | Convert a pinned MotionBricks pose-array result to a faithful Blender source action, then use the same retarget/export path                            |

The world chooses action meanings, visible expression, rig families, tool grips and timing. The generic helper reads only explicit files and parameters. It cannot query private actor state, create actions, apply damage, move a body, transfer an object or publish assets. Another world can use the same helpers with a different look and compatible human family. Different anatomy keeps the existing specialist route rather than being forced onto SOMA.

### 11.2 Input, output and record contract

Before a job, complete the usual study brief with the target's exact asset revision, actual rest rig, requested action, clip name, consumer/study-only destination, loop or one-shot meaning, root policy, duration, contact/grip targets and rights. Fetch the target and reusable source files into the external study workspace. Do not reconstruct a target from a screenshot or replace it with the model's stick figure.

Keep source acquisition separate from target authoring. One generated source can feed several target candidates without another request or a copied cost entry. Reuse the existing [study record](../production-workflows/art-flows/study-record.md#construction-and-sources) and asset inventory for source rights, inspected skeleton/units/axes/time basis, target/map revisions, root/loop/contact edits, editable sources and final review. The Blender helper reports import/bake facts; the agent records them. It does not update the acquisition receipt or introduce a second asset manifest.

The planned request helper is the sole writer of two small files in each external source-job directory:

| File           | Contract                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `request.json` | The exact validated POST body, copied from the operator's input and frozen once submission is attempted. Hash its saved bytes with SHA-256.                                                                                                                                                                                                                                                                                       |
| `receipt.json` | `requestSha256`; local `phase` (`prepared`, `submitting`, `submission-unknown`, `submitted`, `downloaded`); nullable `predictionId`, `providerStatus`, `submittedAt`, `statusUrl`, `cancelUrl`; `cancelAfterSeconds`; nullable `costReserveUsd`; `downloads` entries with relative `file`, `originalFilename` and `sha256`; nullable `lastError`. UTC timestamps use ISO 8601. Write atomically after each meaningful transition. |

A prepared receipt has no prediction or spend reservation. Before the single POST, record `submitting`, its timestamp and the supplied reservation. A returned ID advances to `submitted`; provider status is recorded separately, so a terminal provider result does not falsely mean its files are downloaded. `downloaded` means every required artifact is complete and hashed. On restart, `submitting` without an ID becomes `submission-unknown`. Failed/canceled jobs retain their terminal provider status and cause; they never become resubmittable merely by invoking `resume`. Keep the latest sanitized provider response alongside these files when it supplies useful diagnostics/usage. Actual charges and shared-task totals remain in the existing study cost record; absent billing evidence is unknown, not zero. No schema version, job database or migration is needed.

The study's source row links this job once. Its target candidate rows reference that source and name their own rig/map, corrections, output and review. A local/library source without a hosted job needs no fabricated receipt; preserve its command/settings and original artifact. A reused hosted source retains its original request/receipt references and incurs no new generation charge; record new target work separately.

`rootPolicy` is one of `gait`, `stationary`, `authored-travel`. This is a study decision, not a new CLI switch or runtime field. `gait` means an in-place cycle paced by native movement. `stationary` means intentional local body motion without net locomotion; it may include a reach, dip or sit transition. `authored-travel` retains a path for source/reference or a specifically supported consumer; it never bypasses native movement. A successful library export can still be `study-only`.

Preserve raw generation, useful rejected candidates, editable corrections and final exports. Use expiring signed output URLs only for immediate download, then discard them from durable receipts; retain prediction ID, stable status/cancel URLs, artifact hashes and exact preserved refs. Redact output URLs from the archived provider response. Send the Bearer token only to `api.replicate.com`, never to artifact downloads or a redirected origin, and never put it in prompts, artifacts, logs or receipts. Do not send unrelated references, world saves or private conversations. Model/rig changes invalidate only dependent source/map qualification; do not version the entire art system or re-export unaffected old assets.

### 11.3 Acquire one Kimodo candidate

#### Hosted route

Copy the maintained [hosted request profile](../production-workflows/art-flows/tools.md#hosted-kimodo-request-profile) into the external source-job directory and edit its prompt, duration, seed and filename prefix for the requested new or replacement motion. That profile is the sole current owner of the deployment pin, model and request defaults; the provider's linked immutable schema defines its fields. Fail explicitly if the pinned deployment is unavailable. Changing the pin requires affected source qualification, not a silent fallback to `latest`.

The first route requests **BVH** so the importer can use a defined hierarchy/rest convention. GLB is an optional optimization only after an actual exported file proves that Blender imports it as one armature with a valid rest pose; animated empties or a rods-and-spheres preview are not sufficient. Do not rely on `output_format=all` until the host's behavior without a supplied FBX has been checked. Do not upload our character merely to use the provider's Mixamo-specific FBX retargeter.

One prompt contains one action segment, normally 2–5 seconds and never over the upstream **10-second** limit. The host splits prompts on periods and treats duration as **per segment**. For this first helper, reject periods and multi-segment `segment_durations`; the operator writes a single clause. This prevents a paragraph from accidentally becoming a longer/bigger job. Advanced constraints and deliberately connected sequences remain explicit upstream-tool work, not an implicit expansion of the default request. Seed assists reproduction only within the recorded environment. Use the [prompting and control guide](../production-workflows/art-flows/tools.md#prompting-and-controls); prompt punctuation is a provider delimiter, not a prose-style rule.

For explicit constraint work outside that initial helper, `constraints_json` is a URI for the
uploaded JSON array. Author in the source skeleton's space: metres, +Y up, XZ displacement from
its starting origin, zero-based frame indices at the declared rate; this differs from centimetres
in the exported BVH and frame 1 in Blender. Full-body/limb constraints carry source-rest-pose
rotations and root positions, not target-rig bone names or arbitrary game-world points. Transform
through the qualified source/target convention and preview the authored constraint poses before
paying for generation.
Retargeting can change contact, so check the actual target and prop again. Use the
[upstream field definitions](https://research.nvidia.com/labs/sil/projects/kimodo/docs/user_guide/constraints.html)
and the pinned provider schema; no implicit scene solver or new constraints editor is required.

The planned helper has three commands:

- `submit --request FILE --out DIR --cancel-after SECONDS --cost-reserve USD`: validate the allowed model/profile, single segment, sample count, duration and external output path; write prepared request/receipt before the POST. Require an authorized `REPLICATE_API_KEY` in the process environment, never in arguments or output. One invocation creates at most one prediction. `--prepare-only` requires only `--request` and `--out`: it runs pure local `validate_request()`, writes the prepared request/receipt and exits without credentials, network access or a spend reservation. `--cost-reserve` is required only for real submission; preparation does not invent a price estimate. A real submit refuses an existing prediction or unresolved submission receipt and marks the receipt `submitting` immediately before its single POST; a crash in that interval resumes as unknown rather than permitting a duplicate. The same pure validation is used by the disposable local check.
- `resume --out DIR`: read the recorded prediction ID/URLs, fetch status, finish downloads and update the same receipt. It never POSTs a new prediction. An already downloaded result returns without spending only after its recorded files are present and match their hashes. Missing files are recovered from the same job when available or reported for restoration from the existing archive; the receipt alone is not proof of a complete result. For `submission-unknown`, accept optional `--prediction-id ID` only for a job positively identified from authorized account history; fetch it and verify the pinned version and submitted input fields before saving the recovered ID/URLs. Provider-added default fields are allowed. A mismatch preserves the unknown receipt and fails without creating a job.
- `cancel --out DIR`: cancel the known nonterminal prediction through its returned URL, then record the observed terminal state. Cancellation can incur already-used compute; do not mark it free.

Use Python's standard JSON/HTTP/filesystem utilities; no server or provider SDK is necessary. The agent/operator reserves the amount in the shared study budget **before** invoking `submit`; the helper validates it is supplied but is not a global financial ledger. Estimate using the current published billable rate and the configured execution deadline plus the provider's cancellation/billing terms, then account for previous/reserved/uncertain calls. Start with a 120-second deadline only when that bound fits the remaining authorized budget; it is a convenience default, not a promised price or provider SLA. A typical-cost label is not a spend cap. If the provider's maximum charge cannot be bounded adequately, do not dispatch automatically; report the missing price/access fact.

POST to `https://api.replicate.com/v1/predictions` with Bearer authorization, JSON body and the provider's `Cancel-After` header. `Prefer: wait` is optional HTTP waiting, not a billing deadline. Immediately persist the returned ID and `urls.get`/`urls.cancel` with an atomic local-file replacement. Poll the known GET URL about every two seconds while `starting`/`processing`, respecting rate-limit responses; `succeeded`, `failed` and `canceled` are terminal. The [HTTP reference](https://replicate.com/docs/reference/http) owns these values. If locally interrupted, leave the receipt for `resume`; a polling failure must not trigger a fresh generation.

The returned `output` is an **array of file URIs**, not a named GLB field. Download to temporary filenames, identify the expected BVH by header/content and metadata, verify completion, hash it, then rename. Require exactly the expected candidate/action and metadata; do not take `output[0]` on trust. Retain returned metadata and the useful MP4; archive any auxiliary viewer as source material without automatically executing its HTML/scripts. Missing/ambiguous artifacts fail the acquisition stage. [API output files expire after one hour](https://replicate.com/docs/topics/predictions/output-files), so download immediately and preserve through the existing asset workflow after each completed batch.

If the create response is lost before an ID is saved, mark `submission-unknown` with the request hash and time. Inspect account history through authorized provider access; resume a positively identified prediction or report ambiguity. The helper must not retry POST automatically. The execution deadline bounds paid computation, not recovery: status/download GETs may recover the same job after that deadline while its files remain available. Use a 30-second timeout per network operation and a 120-second polling/download window per invocation; on expiry preserve progress for `resume`. These local bounds never submit or renew paid work; a failed model generation, timeout or expired artifact never authorizes a new paid generation. One ordinary run is enough to decide whether the artifact advances; targeted offline correction continues without an extra permission round.

#### Official local route

An already provisioned workstation can use official v1.2 instead. Keep code/checkpoint revision, model license, text-encoder authorization and settings in the record. The [upstream CLI](https://research.nvidia.com/labs/sil/projects/kimodo/docs/user_guide/cli.html) supports this **upstream command**, independent of our planned helper:

```sh
kimodo_gen "A person walks forward" \
  --model Kimodo-SOMA-RP-v1.2 --duration 4 --num_samples 1 \
  --diffusion_steps 100 --seed 42 --output "$S/source/walk" \
  --bvh --bvh_standard_tpose --save_example_dir
```

Archive native NPZ and replay/constraints metadata alongside BVH. The native route uses a **standard T rest pose**, unlike the hosted route's expected BONES rest convention, so it needs the matching source profile/map qualification. No built-in native GLB/FBX export or dependable native Mac setup is assumed. Existing CPU text-encoder offload reduces GPU requirements but is not free local setup. Do not distribute model/text-encoder weights in game assets.

### 11.4 Import the source correctly

Extend `import_model`/`native_fps` in `art-tool.py` to accept an explicit **source-only** profile for animation inputs. The target model remains an ordinary supported rigged GLB/FBX. A new `.bvh` must not fall through to OBJ or be accepted solely from its filename. First inspect its hierarchy, frame count/time and channels; refuse missing or nonfinite transforms, an unsupported hierarchy, an empty action or more than the requested single source. Preserve the raw file unchanged.

Planned `clips` additions:

| Option                                   | Contract                                                                                                                                                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--source-profile kimodo-soma-bvh-bones` | Use the qualified hosted SOMA BVH hierarchy/rest convention; centimetres, +Y up/+Z forward, 30 Hz; verify actual header/metadata                                                                                              |
| `--source-profile kimodo-soma-bvh-tpose` | Same units/axes/timing but the explicitly exported standard T rest convention; separately qualified map                                                                                                                       |
| `--blend PATH`                           | Save the retargeted target rig, original target mesh/materials/weights and selected editable actions to an external `.blend` after disposable source objects have been removed, retaining the target and its editable actions |
| `--same-rig`                             | Assemble full target GLB inputs by copying prepared actions under the checks in §11.5; incompatible with source profiles/maps and gait/drift cleanup.                                                                         |
| `--clip-facts NAME=FILE`                 | In same-rig assembly, use an explicitly selected existing-format clip facts file when the source’s sibling `.clips.json` is unavailable; `NAME` is the requested output name.                                                 |

The source profile applies to **all sources in that invocation**, like the existing single `--bones` map. Do not mix raw SOMA and existing target clips in one command. Ordinary retargeting keeps its existing GLB/FBX path when no source profile is supplied. Frame-rate handling must happen before selecting keyframes; no 30-to-24 reinterpretation.

Blender **5.2.2** ships `io_anim_bvh` in `scripts/addons_core`; enable it explicitly in factory startup. Use `bpy.ops.import_anim.bvh` with `target='ARMATURE'`, `global_scale=0.01`, `axis_forward='Z'`, `axis_up='Y'`, `frame_start=1`, `use_fps_scale=False`, `update_scene_fps=True`, `update_scene_duration=False`, `use_cyclic=False`, `rotate_mode='NATIVE'`. Enable the bundled module after each factory reset before BVH import, since `clear_scene()` resets Blender settings. Require an importer `FINISHED` result and set the export range from the actual action, not the default scene end or an extra rest placeholder. The importer keys N real samples at frames 1 through N; do not drop sample 1. Require positive finite frame time agreeing with 1/30 second within 0.000001 second, and require the common sample-time grid on required keyed channels to be 1 through N, not N total keyframe points across all channels. After validating the frame interval, set `scene.render.fps=30` and `scene.render.fps_base=1.0` after each import so a rounded BVH interval does not leave a fractional effective rate. Pin and verify the installed operator at setup; an unavailable importer is a setup error, not permission to install an arbitrary plugin or guess scale. Source: [Blender v5.2.2 importer](https://github.com/blender/blender/blob/v5.2.2/scripts/addons_core/io_anim_bvh/__init__.py).

The importer converts to Blender's +Z-up/+Y-forward convention. Rotate the **whole source armature** 180° around Blender Z, including its rest frame and motion, to match OpenLegend's Blender −Y forward / exported glTF +Z forward. The resulting coordinate mapping must be source `(x,y,z)` metres → Blender `(x,-z,y)` metres. Check three unit vectors: source forward → Blender −Y, source up → Blender +Z, source right → Blender +X. Do not rotate only the first animation frame or only the target mesh. Do not apply another 0.01 to the target or to already-metric GLB.

The hosted source proof contains 77 SOMA joints plus a `Root` wrapper (78 imported bones); metadata lists only the 77 body joints. Both `Root` and `Hips` declare translation channels. Inspect their actual transforms rather than inferring the motion root from the metadata count. Expected upstream BVH has a static `Root` wrapper. **`Hips` is the moving pelvis.** Its native rest positions come from BVH `OFFSET`s, not frame zero. Rotation channels are ordered Z/Y/X; the Blender importer must honor channel order. Inspect actual hosted output before approving this profile: published upstream export facts are not proof of a community wrapper's bytes. A mismatch stops intake with the actual hierarchy/units needed for a new profile; it does not trigger guessing.

Keep 30 Hz through the raw retarget bake. Record both frame count and timestamp span: N samples at 30 Hz span `(N-1)/30` seconds between first and last samples; do not stretch the result by one frame merely to make a metadata duration label exact. Preserve fractional seconds in export. A source at an unexpected FPS fails the declared profile; a deliberate upstream re-export is preferable to silent reinterpretation.

Full source joints are intermediate data, not the runtime joint budget. Retarget onto the existing family and export its deform joints. Do not ship the 77-joint SOMA source just because it animates. Native NPZ is retained for provenance and optional upstream editing, **not loaded into the game or parsed for gameplay**. Its foot-contact channel layout differs between predicted and expanded skeletons, so no code may assume every NPZ has four channels.

### 11.5 Target maps and two-pass assembly

Create named maps only after inspecting exact source and target skeletons in Blender. Keep the current map direction: **target bone → source bone**. Preserve `bones` and `alignRest`; add a small `roles` object naming the target `hips`, `leftFoot`, `rightFoot`, `leftToe` and `rightToe`. For SOMA profiles, use only explicit mapped names; an unlisted target bone inherits its parent/rest pose. Do not accidentally bind a same-named `Root` to the static source wrapper. Require the mapped `hips` role to follow `Hips`, with positive finite source/target standing hip heights.

The current gait preparation also compensates for the Meshy library’s leg placement, bent spine and foot motion ([implemented behavior](#44-clips-give-a-rig-the-clips-the-game-plays)). Check each correction against the selected source and its target. For a SOMA source, apply only corrections justified by that source’s contacts and posture. A successful historical MPFB audition supplies evidence for that study rig; the modular family requires its own final worn-body check.

The helper's current `ground_speed` and `one_cycle` use Meshy names through `followers`. Use explicit target foot/toe roles when supplied so SOMA/MPFB names do not silently produce zero speed or a missing-key error. Existing no-profile Meshy behavior can retain its current known mapping; this is a narrow extension, not a general skeletal ontology. Record unmapped fingers/twists/cloth separately. Missing hips, either leg/foot chain, trunk/head or a requested arm chain is an error; optional finger/cape motion is a declared limitation, never invented by the mapper.

Verified source body chain and target-name starting points:

| Anatomy                         | SOMA source                                                                | MPFB target names already in the repo                                                         | Other target family                                                           |
| ------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Pelvis                          | `Hips`                                                                     | `root`                                                                                        | Inspect the actual deform pelvis, not any scene root                          |
| Lower/middle/upper spine        | `Spine1`, `Spine2`, `Chest`                                                | `spine03`, `spine02`, `spine01`; **verify parent/anatomical order before assigning**          | Inspect ordered spine joints; do not reuse source-name spelling by assumption |
| Neck/head                       | `Neck1`, `Neck2`, `Head`                                                   | `neck01`, `head`; select the anatomically corresponding neck joint and check head orientation | Inspect the existing rest chain                                               |
| Shoulder/upper arm/forearm/hand | `LeftShoulder`, `LeftArm`, `LeftForeArm`, `LeftHand` and right equivalents | `clavicle.L`, `upperarm01.L`, `lowerarm01.L`, `wrist.L` and `.R` equivalents                  | Use actual target names                                                       |
| Thigh/calf/foot/toe             | `LeftLeg`, `LeftShin`, `LeftFoot`, `LeftToeBase` and right equivalents     | `upperleg01.L`, `lowerleg01.L`, `foot.L`, `toe1-1.L` through `toe5-1.L`, plus `.R`            | Use actual target names; SOMA `LeftLeg` is thigh, not the Meshy calf          |

Sources: [pinned SOMA definitions](https://github.com/nv-tlabs/kimodo/blob/e1c219c99b4b94ba48be1fb6a1cbc64ecee4c954/kimodo/skeleton/definitions.py), [existing MPFB map](../../scripts/art/bone-maps/mpfb-meshy.json). Do not present this anatomy table as a fully qualified map. AF15 must save real JSON maps with tested target hierarchy/rest signatures; a junior follows this sequence:

1. Inspect target rest bones, parent chains and world directions. Save names, parents and rest transforms with the target asset hash; identify hips and feet. Compare the same anatomical chain in the source. Record the actual mapping file with the candidate before baking.
2. Inspect a still rest pose and simple original diagnostic poses: raise one arm, bend one knee, rotate the torso. Confirm left/right and forward orientation on both source and target. These are free local checks and require no generation.
3. Use the existing rest-relative world-space rotation retarget. Scale pelvis displacement once by target/source standing hip height after the source-unit conversion. Use the explicitly identified pelvis for every action; store roots **per action** rather than reusing the last loop variable when applying `--stride`/`--in-place` to several outputs.
4. Review limb rest alignment. Start `alignRest` with only the anatomical arms/legs that require it; verify hands with their parent limbs. Do not blanket-align spine, head or feet, where rest differences often express anatomy and can bury toes or twist the torso. Record any deliberate neck/spine reduction in the map note.
5. Bake the raw source onto a copy of the target at 30 Hz. Keep target mesh, skin weights, rest bones, materials, height, face, equipment sockets and garment construction intact. If a new rig or changed weights are actually necessary, identify that separate repair. Perform it when already in the authorized scope; otherwise report the dependency. Never rerig merely to accommodate the motion source.
6. Save an editable target `.blend` and a **full target GLB with its skinned mesh** containing the new action(s). An armature-only intermediate may reimport as empties, so reserve `--motion-only` for a validated final consumer export. Reimport this full intermediate into a clean scene and confirm the same target skeleton and non-root joint motion.
7. Finish contacts/root/loop policy in the target source, export the corrected full target intermediate, then assemble it with retained target clips using the planned `clips --same-rig` path **without the raw-source profile or map**. Every wanted existing clip is explicitly listed: `clips` clears the model's old actions. No unspecified action is assumed to survive. AF15 must make action selection robust to Blender name collisions: detach/remove the target's old actions before source imports, temporarily namespace newly baked target actions until imports finish, and resolve `#ACTION` within the just-imported source's original names. Reject duplicate requested output names. A target's existing `Idle` must not cause the imported `Idle` to become an unmatched `Idle.001`. This is a needed helper fix, not an already-proven property of the current command.

**Same-rig assembly preserves corrected motion.** The existing retargeter copies rotations and one pelvis translation; running it again can discard other translation/scale keys. The planned `--same-rig` mode copies prepared target actions from full skinned GLBs. Reject other formats with an instruction to export a full target GLB first; ordinary source retargeting retains GLB/FBX support. Use these checks:

1. **Match static rigs.** Compare names, parent chains and `Bone.matrix_local` for each keyed bone and its ancestors. Also compare captured armature-local rest TRS and effective static parent placement separately: equal world placement alone does not make object-local channels interchangeable. Do not compare evaluated pose matrices or frame zero: the glTF importer restores its first animation, and `pose_position='REST'` does not neutralize object animation. After each factory reset, enable the bundled glTF add-on's `animation_ui` preference before importing target/source GLBs. Its `gltf2_animation_rest` property captures each object's **local** TRS before animation; compose static parents and `matrix_parent_inverse` to obtain placement. Capture these values once, without copying the importer or changing the user's saved preferences. Compare matrix elements with absolute tolerance `1e-4` for roundoff (the MPFB roundtrip in §4.5 differs by up to `0.00003`). Unrelated unanimated target bones may remain at rest. A mismatch identifies the bone/transform and fails; a shared family name never substitutes for these checks.
2. **Copy the selected rig's channels.** Resolve the armature's slot through the selected imported action/NLA binding. A glTF Action may hold several object/shape-key slots: copy only that slot's channel bag into a target-owned action/slot, including bone and armature translation, rotation and scale. Do not choose `action.slots[0]` or collect every slot with the existing all-slot helper. Bind the copied active action to the target slot before deleting source objects. This mode handles baked skeletal clips; report selected motion requiring animated parents, separate objects or shape keys as unsupported rather than silently dropping it.
3. **Preserve the supported time grid.** Set 30 fps / `fps_base=1` before each GLB import. GLB timestamps are seconds, not an FPS declaration; bypass `native_fps`'s smallest-key-spacing inference. Normalize the prepared action's time origin, retaining its timestamp span. Accept keys on the resulting whole-frame grid, including sparse keys; snap only roundoff within `0.0001` frame, shifting key handles with their key. Check the selected slot's range rather than unrelated slots. The pinned NLA exporter truncates fractional track bounds with `int(...)`, so use each action's validated integral bounds and never promise arbitrary fractional-endpoint preservation. Genuinely off-grid motion needs an explicit 30 Hz resampling decision and renewed duration/stride review before assembly; do not silently shorten it or resample a valid retained clip merely because its keys are sparse.
4. **Complete static defaults before NLA export.** Keep `export_reset_pose_bones=True` for unkeyed bones. The exporter does not reset armature-object TRS between tracks: set the target object's `rotation_mode='QUATERNION'` and complete each copied action's missing `location`, `rotation_quaternion` and `scale` components with constants from the target's captured static local TRS. Add them at the action's existing normalized integral endpoints, preserving keyed components and duration; do not add Euler channels or use the last evaluated pose or generic defaults. Then construct the final NLA strips from those validated bounds and bind each strip to its target action slot. This keeps object motion from leaking into a following bone-only clip without an exporter fork.

Reject `--bones`, `--source-profile`, `--stride` and `--in-place` in this mode; source adaptation and cleanup precede assembly. Pinned Blender sources: [static transform capture](https://github.com/blender/blender/blob/v5.2.2/scripts/addons_core/io_scene_gltf2/blender/imp/node.py), [metadata preference](https://github.com/blender/blender/blob/v5.2.2/scripts/addons_core/io_scene_gltf2/__init__.py), [action slots](https://github.com/blender/blender/blob/v5.2.2/scripts/addons_core/io_scene_gltf2/blender/imp/animation_utils.py), [NLA export/reset behavior and bounds](https://github.com/blender/blender/blob/v5.2.2/scripts/addons_core/io_scene_gltf2/blender/exp/animation/tracks.py), [bone-only reset](https://github.com/blender/blender/blob/v5.2.2/scripts/addons_core/io_scene_gltf2/blender/exp/animation/anim_utils.py), [NLA channel evaluation](https://github.com/blender/blender/blob/v5.2.2/source/blender/blenkernel/intern/anim_sys.cc).

Read each source's existing sibling sidecar with `Path(source).with_suffix('.clips.json')`, or its explicit `--clip-facts NAME=FILE`. Resolve the entry by the selected **source action name**, copy it under the requested output name, and check its duration against the copied action (within 0.001 seconds, matching the existing rounded report). Preserve verified `groundSpeed` for unchanged gaits. Missing metadata means unmeasured: write duration but omit `groundSpeed`, identify the affected clip, and require measurement before runtime gait integration; never run the Meshy-name estimator on MPFB or write zero as a substitute. Existing catalog stride facts can supply the same-format input after confirming the exact source asset. Remeasure if root cleanup, timing or scale changes. This reuses one sidecar format, not a second manifest.

The disposable preservation check includes corrected non-pelvis translation/scale, a sparse action after another track, retained Idle/Walk/Run, and an armature-TRS clip followed by a bone-only clip on a rig with nonidentity static placement. Compare each clip sampled independently with the final multi-clip export's poses/durations and confirm original stride facts survive. A deliberately off-grid endpoint must produce the resampling requirement, not a silently shortened export. Exact GLB bytes need not match; pose/timing differences beyond export roundoff fail assembly.

Planned first pass (after AF15; paths stand for fetched exact assets in the external workspace):

```sh
"${B[@]}" clips \
  --model "$S/target.glb" --clip "Wave=$S/source/wave.bvh" \
  --source-profile kimodo-soma-bvh-bones --bones "$S/target-soma-map.json" \
  --blend "$S/target-wave.blend" \
  --out "$S/target-wave.glb"
```

**Planned after AF15:** list the target's entire required/retained set, not just the three shown here. The same-rig copy and source-scoped selection checks above must pass first:

```sh
"${B[@]}" clips \
  --model "$S/target.glb" --same-rig \
  --clip "Idle=$S/retained-target.glb#Idle" \
  --clip "Walk=$S/retained-target.glb#Walk" \
  --clip "Run=$S/retained-target.glb#Run" \
  --clip "Wave=$S/target-wave.glb#Wave" \
  --out "$S/target-final.glb"
```

Use this only when `retained-target.glb` passes the target rest-rig and object-transform checks above. If an older clip is still on Meshy's source rig, adapt that batch with its own existing map first; never apply the SOMA map to it. Preserve every catalog-required strike/stride (`Attack`, `Punch`, optional `Sprint`) as applicable. Do not re-trim already phase-aligned retained loops merely to add Wave; copy their verified timing/ground-speed entries and check they remain unchanged. If the final export changes sampling or timing, remeasure and review rather than silently copying stale metadata.

`report --strict` still gates a **complete runtime character** against the actual consumer and budgets. A raw source or one-shot intermediate intentionally lacks Idle/Run: inspect its source/action facts without mislabeling the missing runtime set as an error or fabricating clips to pass. The final assembled character must pass the runtime requirements. Source joint counts do not replace target A3D budgets.

### 11.6 Finish motion for play

Generation supplies a draft. Finish on the **target** so feet, grip, body proportions and garments are the ones the player sees. The editable `.blend` keeps the useful raw retarget action as a comparison and the corrected action as the export choice; only the selected actions enter the final GLB. Keep loop/one-shot, phase and contact notes with the target candidate in the existing study record, not in a new gameplay event channel. The existing `<out>.clips.json` remains the consumer-compatible seconds/ground-speed table.

| Kind               | Required finishing                                                                                                                                                          | What the helper must not assume                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Idle               | Select a stable interval; fix contact and join first/last pose deliberately; preserve a small readable gesture only if intended                                             | A generated finite segment is not automatically a loop                                                                      |
| Walk/run/sprint    | Choose a stable complete gait cycle, establish left heel-strike phase, remove locomotor travel, use `--stride`, inspect the loop and measure target ground speed            | `--stride` cannot repair a bad pose seam, irregular gait or abrupt generated turn                                           |
| Stationary gesture | Preserve entry/meaning/exit, intended local pelvis shift and vertical motion; correct planted feet and hand contacts; export a one-shot unless it is explicitly a hold/loop | `--in-place` removes net drift on channels; it does not safely remove a nonlinear path or distinguish a sit from locomotion |
| Work/held object   | Match actual support/grip geometry on the target; mark contact intervals, correct hands/feet in Blender, bake constraints to joints                                         | Text such as “holding a hammer” does not supply the game prop, socket, object transform or valid crafting result            |
| Authored travel    | Keep the source trajectory as reference; use only a consumer explicitly designed to reconcile it with native movement                                                       | A root animation cannot become another world-position authority                                                             |
| Strike/recovery    | Fit preparation, contact cue and recovery to the existing supported phase/progress contract; keep the strike silhouette readable from relevant directions                   | Model duration or a clip marker cannot delay input, decide damage or repair server/presentation lag                         |

For a contact correction, identify the frames during which a foot or hand should remain at its support/grip, set the intended target position in the existing source scene, use temporary Blender constraints/IK or keyed adjustments to keep it there, and bake the resulting supported deform-bone transforms. Remove authoring controls from the export. Inspect approach, contact and release; planting a hand for the entire clip is not a correct grip. Keep native object placement/ownership separate from this authoring reference.

Do not run the old net-drift removal over every one-shot. It subtracts a linear end-to-end displacement and can erase a meaningful rise or leave an arcing travel path. For a stationary action, correct the unintended planar travel while preserving the intended local weight shift and vertical motion. If it cannot be reconciled with the existing movement/action consumer, retain it as a reference/study and use a compatible motion. No new runtime IK, motion matching or per-frame model call is required by this design.

Loop cleanup is deliberate: choose a cyclic interval; compare first/last joint poses and the direction of motion across the seam; edit a short seam region only where it does not slide a planted foot or remove the intended beat. Recheck the exported loop several times with entry/exit to the existing idle and travel states. Do not make a long generation “loop” by only enabling a playback flag. Time stretching is permitted only when the resulting contact and native timing remain sound; a long work activity can repeat a valid working segment rather than setting work duration from a generated clip.

Review the exact export at the normal camera, with the current look, lighting, representative equipment and the actual target height. Compare to the retained motion on the same body. Confirm facing, posture, silhouette, non-root articulation, feet, hands, garment deformation and moving-camera artifacts. For the runtime locomotion proof, compare planted-foot drift and ground speed against the current clip under the same travel speed; report the values and visible result, not a universal “no foot sliding” claim. Current source-study timing/health-effect lag remains a separate presentation issue.

Pause/resume, starting, stopping and cancellation must not produce a visual success after a failed native action. The initial provider study can inspect these transitions in the viewer/Blender, but only an existing game consumer can prove actual gameplay interruption. A Wave or work clip in the study does not establish its game dispatch, even where a native expression/action already exists.

### 11.7 Inspect any named clip without expanding gameplay

The current `installLocomotion` requires Idle/Run and marks every imported action looping. The local viewer's fixed choices do not cover arbitrary work/gesture names. AF15 adds a **study-only** installer/control path while preserving `installLocomotion`'s runtime contract:

1. Reuse track collection and resource disposal; do not change native character-motion selection. A selected local preview model exposes its actual valid track names. Choose Idle if present, otherwise the first imported track. A zero-track model still displays as a static model.
2. The local model's clip control lists its own tracks by literal text, never a provider-supplied HTML label. Use the page’s existing native labeled select, buttons and loop checkbox, with keyboard operation and visible focus. Changing clips must not rebuild the focused control. For a static or absent local model, hide the motion controls and show a short inline status. Selecting a name plays that track on that model. The existing cast comparison can remain on its existing controls; do not invent a shared fallback that disguises a missing clip in another model.
3. Provide play/pause, replay and a loop toggle for that local preview. Default known locomotion/idle review to looping and other actions to one-shot; these are review settings, not engine semantics. A one-shot stops on its final pose; Replay starts at zero. Switching clips resets review time without changing game state.
4. Store the local component and its clip/play/loop state separately from the comparison cast’s `animations` array: the existing global-pose loop calls `play()` on every member each frame. Advance the local component exactly once from the existing update callback under the same visibility/reduced-motion gates; keep engine auto-play disabled. Local controls never change the global cast pose, and the global control never resets the local one-shot. Do not add another animation-frame loop. On successful model replacement, rebuild the local choices and release the previous tracks/entity/resources through existing cleanup; a failed load preserves the displayed model and its controls. Leaving the page or clearing preview releases them as usual.
5. Reuse the existing intake bound and asset checks. No inference model weights, inference worker or network account enters the viewer. Optional motion notes are shown by the study record; no new runtime asset metadata schema is required.

Disposable verification uses a full skinned target GLB containing only an unfamiliar one-shot, a normal Idle/Walk/Run target and a static prop. Check one-shot completion/replay, loop toggle, pause/resume, replacement and cleanup in the local study page. Then confirm the game's ordinary Idle/Run and phase-paced strikes are unchanged. This is a small authoring improvement, not a new emote menu or gameplay action selector.

### 11.8 Optional MotionBricks bake

AF17 starts only for a useful supported pose transition or an explicitly requested comparison. Use the pinned SOMA model and code, own/licensed pose history and target poses; exclude bundled evaluation motions and their derivatives from production. The shipped human API returns pose buffers; it does **not** export a BVH/GLB clip. Its ONNX exporter exports a model graph. The optional adapter must bridge this gap explicitly.

The planned `motionbricks-bake.py` is an offline Blender-side consumer of a saved generation result plus its exact skeleton/coordinate metadata. It never starts a provider job or chooses game behavior. The generation-side record stores the input history/targets and times, raw output, valid-frame count, code/model hash and rights. A small companion invocation in the upstream model environment can serialize those results; do not import the complete inference stack into the game or ordinary Blender helper.

Use a tiny planned producer, `scripts/art/motionbricks-generate.py`, in the provisioned model environment and `motionbricks-bake.py` in Blender; their sole interchange is a numeric pose package plus JSON provenance. Both use the external-output guard. The pinned source contract is MotionBricks `54fc563aeaaf819a753d72cc9fdc6713989cdd43` (v0.2.0), specifically its [engine](https://github.com/NVlabs/motionbricks/blob/54fc563aeaaf819a753d72cc9fdc6713989cdd43/motionbricks/model/soma/engine.py), [buffer](https://github.com/NVlabs/motionbricks/blob/54fc563aeaaf819a753d72cc9fdc6713989cdd43/motionbricks/animation/animation_buffer.py) and [example](https://github.com/NVlabs/motionbricks/blob/54fc563aeaaf819a753d72cc9fdc6713989cdd43/docs/examples/generate_once.py). A later version needs its affected source checks repeated.

1. Resolve the pinned LFS rig `motionbricks/assets/human/soma_base_skel_minimal_no_root.usd` and load skeleton prim `/OUTPUT/c_skeleton_grp/Hips` through the upstream USD loader. Expected LFS object: SHA-256 `4ab93d78a0f1c06d3bcbedee5ceebb5d9d5b002fd0a88638e9399ed80b61871d`, 2,036,435 bytes. An unresolved pointer is not the rig. Save actual ordered joint names, parents and reference local transforms from the loader; do not infer the rest pose from frame zero or assume the resolved rig has exactly 30 or 77 joints. The model maps its 30 required named joints into that supplied rig, whose first joint must be `Hips`.
2. Explicitly construct the model engine with `model_to_runtime=wp.transform_identity()`. Author or retarget safe input poses **onto that SOMA skeleton** in metric +Y-up/+Z-reference-forward model/world coordinates. OpenLegend target-rig transforms are not compatible inputs by renaming them. The demo's MuJoCo `_rig.py` uses a different runtime conversion; do not copy it and then apply our conversion again.
3. Use `create_input(skeleton)` / `create_output(skeleton)`, populate context/target with `update_from_poses`, then call `engine.generate_animation(context, target, output, config=...)`. Supply exactly four chronological 30-Hz context poses ending at the current pose and one to four chronological target poses; the first target is the arrival pose and later targets describe motion after arrival. Four repetitions of an authored held pose are a legitimate explicit stationary context. The call has no arbitrary arrival-time deadline; duration comes from allowed token counts. If a selected game's window cannot accommodate it, correct/key a suitable transition rather than changing the native window.
4. Copy `output.poses[:output.num_frames].numpy()` after synchronous generation completes. The Warp slice is `[T,J]` of `wp.transform`; its copied NumPy representation is float32 `[T,J,7]`: translation XYZ and quaternion **XYZW**. `Hips` is world/runtime-space; children are **parent-local absolute transforms**, not Blender pose-bone deltas. Units are metres; `sample_rate` is 30. Save `rest_local[J,7]`, integer `parents[J]` (−1 for Hips), ordered string `joint_names[J]` and `foot_contacts[T,4]` (left heel, left toe, right heel, right toe). Likewise copy `skeleton.reference_local_transforms.numpy()`, `skeleton.parent_indices.numpy()` and `output.foot_contacts[:T].numpy()` before serialization. Use numeric/string NPZ arrays without object/pickle payloads and a JSON metadata file; load with `allow_pickle=False`. Include model/ONNX/rig hashes, input-pose rights, windows, configuration, quaternion order and the identity runtime conversion.
5. The engine already trims the three raw boundary samples on each end. Valid T is `4 * token_count - 6`: allowed tokens 6–16 yield 18–58 samples; default 8–14 yields 26–50. Export exactly T, not buffer capacity, and do not trim again. Timestamp span is `(T-1)/30`. With default endpoint correction, compare output start with the last context pose and output end with the first target pose. Keep context separate from export so the endpoint is not duplicated.
6. In Blender validate array dimensions, joint-name/parent agreement and an acyclic hierarchy. Normalize finite nonzero quaternions; reject nonfinite or degenerate rotations rather than requiring mathematically exact unit norms. Multiply transforms parent-first to reconstruct rest and posed world transforms. Pre-multiply both by the homogeneous conversion `C: (x,y,z) → (x,-z,y)`. **No 0.01 scale**: this package is already metric. Reorder quaternion components to WXYZ when constructing `mathutils.Quaternion`; never assign the XYZW array directly.
7. Build a source armature with the converted reference matrices, names and parents. Set edit-bone heads/orientations from the matrices, use a nonzero display length independently and leave parent connections unforced where joint offsets require that. For each frame, use `Bone.convert_local_to_pose(..., invert=True)` with the explicit parent pose/rest matrices to derive bone-local basis transforms, and key them at frames 1…T with `fps=30`, `fps_base=1`. Absolute local joint transforms are not `matrix_basis` deltas. Verify reconstructed joint positions/orientations against the numeric package before retargeting.
8. Use the ordinary target map, target retarget/correction/full-GLB export and final assembly from §11.5–11.6. Load `art-tool.py` as a module through Python `importlib` in the Blender process and call its shared retarget/export helpers without invoking its CLI; do not duplicate the retarget math or install the inference stack in Blender. Record the actual optional source profile; a Kimodo BVH profile cannot be reused because its wrapper, units and import mechanism differ. Additional source joints follow their documented reference/endpoint behavior, not a claim of independent finger or face generation.

The generated endpoint and authored target must also agree after target retargeting and contact correction. Wrong footing, target discontinuity or an unavailable path is an authoring failure, never a reason to move the authoritative actor to fit the clip. For this first route bake one short transition; automatic long-path chunk streaming is outside scope. Model endpoint correction does not solve the game environment or make a transition fit every body.

Its qualification output is one useful transition with source/target poses, safe provenance, a corrected editable target and the exact final clip. Compare correction effort with ordinary keying. If keying is simpler or better, keep MotionBricks optional and record the rejected comparison; AF16/Kimodo and the playable game do not wait for it.

### 11.9 Implementation order and qualification

Follow the dependency order below; rows 2–7 may complete for the mercenary first, then repeat only target-dependent work for MPFB using the retained source. The full AF15/AF16 tasks stay open until their specified coverage is resolved. These are bounded local implementation/verification tasks, **not a request to generate during this documentation task**, a new automated test suite or a GitHub Actions workflow.

| Order / owner                       | Work                                                                                                                                                                                                                                                                                                                                               | Exit evidence / stopping condition                                                                                                                                                                                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 / AF15                            | Read this section, existing `clips`/maps, consumer requirements and current target source records. Fetch the exact mercenary target; select one MPFB study body/outfit from its source record for the second pass; list the clips each actually needs. Prepare an original or appropriately licensed diagnostic BVH and simple own-authored poses. | Source and targets available; rights and required names recorded. Evaluation-only fixtures stay clearly separated from production exports. No provider account is required for these local checks.                                                                                                       |
| 2 / AF15                            | Extend source import/FPS/axes, enable the bundled BVH importer after resets, add explicit roles/root selection and `--blend`; keep root policy in the study. Validate the source before retargeting.                                                                                                                                               | Original diagnostic poses import upright/facing correctly at 30 Hz, with the right span/scale; missing required joint or invalid frame time fails clearly.                                                                                                                                               |
| 3 / AF15                            | Inspect the current target hierarchy, make its map, bake a full target intermediate, correct one motion and assemble retained clips through the same-rig copy path.                                                                                                                                                                                | Target appearance/rest/skin unchanged; requested limbs move correctly; retained names, translation/scale channels, timing and stride facts survive; full target reimports correctly and consumer reports distinguish intermediate from final.                                                            |
| 4 / AF15                            | Add the bounded single-provider helper and study-only arbitrary-clip preview.                                                                                                                                                                                                                                                                      | Validate a prepared request without submitting; exercise receipt recovery against saved representative responses and local failures; preview a local one-shot without fake Idle/Run. Do not add a new general mock/test framework.                                                                       |
| 5 / AF16, with AF15 fixes if needed | Use the preserved source proof first; inspect its actual BVH hierarchy/rest convention and metadata. Verify account/rate/deadline only when a genuinely new audition needs generation.                                                                                                                                                             | Either confirm the expected profile and continue, or stop, record the mismatch and adjust the narrow source adapter before another paid request. Source changes use the retained candidate; do not regenerate to debug import. This explicit feedback loop prevents AF15 and AF16 waiting on each other. |
| 6 / AF16                            | Complete the representative audition below, on the same retained generation wherever possible. Preserve raw/edited/export/review artifacts and actual costs.                                                                                                                                                                                       | Qualify only the exact route/map combinations that pass; record failures and a concrete reuse/manual fallback. Stop when the requested coverage is answered; do not search many seeds for a favorable claim.                                                                                             |
| 7 / AF16                            | Update the operational route's status and exact evidence links; compare result/correction effort with the existing library; get Mike's art review for production acceptance.                                                                                                                                                                       | A fresh thread can recover every needed source and follow the route without a hidden setup step. Pending artistic acceptance is still pending.                                                                                                                                                           |
| Optional / AF17                     | Qualify one pose-driven transition only when selected.                                                                                                                                                                                                                                                                                             | A measured useful result or explicit rejection; no dependency for the primary human text-to-motion route.                                                                                                                                                                                                |

The first source fixture may be hand-authored specifically for importer checks. It need not resemble a good generated performance. The first actual hosted sample is what confirms the deployment's source-format/rest contract; a local fixture cannot do that. Use a stable first sample to fix adapter bugs free of extra generation spend. Native v1.2 can provide a separate permitted fixture if already provisioned, but its standard-T profile cannot qualify the hosted rest convention by implication.

#### Small representative audition

Start with one candidate each for the cases actually missing; reuse any adequate existing candidate. Normally three short generations are enough to answer the initial source questions, with the same sources retargeted onto both bodies. This is a bounded comparison plan, not a claim of cost or a requirement to buy unnecessary replacements.

| Case                   | Checks                                                                                                                                               | Runtime status                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Steady locomotion      | Import/FPS/scale; crop/phase/loop; target feet; ground speed; preserved height/outfit; transition to retained Idle/Run                               | Use the existing Idle/Move path for the first complete game-consumer proof. Do not replace the accepted/default clip unless the candidate is useful and reviewed. |
| Ordinary object action | A requested pickup, reach or small work stroke with real reference geometry; approach/contact/release, hand and support pose; interruption rehearsal | Study-only until that action's 3D consumer is explicitly wired. Native pickup/work existing does not itself prove animation dispatch.                             |
| Expressive one-shot    | A restrained wave or hesitation; identity, shoulder/hand deformation, entry/exit and completion without a false loop                                 | The native `wave` expression exists, but the current 3D consumer does not dispatch the Wave clip. Review proves authoring, not new gameplay.                      |

Run these on the mercenary and one MPFB study body/outfit, using exact assets from the existing motion/height study records. Automatic-rig bodies are a separate unqualified target until actually checked; they are not interchangeable with the mercenary. Include a garment/equipment condition that can fail visibly, without trying every outfit or inventing a crowd qualification. Promote a passing target route independently while the second target remains pending or failed; record the limitation rather than labeling all humanoids supported. The first runtime proof needs only the chosen supported locomotion case; missing gameplay dispatch keeps the other auditions study-only.

For each case record source version/hash, target/map, source/profile facts, generation elapsed time, retarget time, correction time, first usable export time, total provider spend including failed/uncertain jobs, useful/rejected outputs, before/after captures, play-scale checks and actual reviewer outcome. Compare full effort with the available library/manual alternative. Optional [cost/quality experiments](../production-workflows/art-flows/tools.md#cost-and-useful-output) change one control at a time and require their own before/after evidence; a promising first preview is not a measured improvement. Do not report GPU inference latency as accepted-asset throughput. Passing technical checks and Mike accepting the performance are separate results.

**Reusable qualification key:** provider/deployment + actual model/checkpoint + source format/rest profile + importer version/settings + target hierarchy/rest identity + map revision. Store a readable passed/failed/pending row with exact study evidence in the operational owner. Ordinary clips on a passed combination reuse that qualification and still get their usual per-clip checks; no new per-clip approval ceremony. A different garment/height/contact gets the relevant visual check, while a changed bind rig/map/source convention needs the affected retarget checks. Qualification is not inferred from a provider brand name or copied across model versions.

### 11.10 Errors, work bounds and open facts

| Condition                                                | Required outcome                                                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| No animation need, or accepted motion to retain          | No provider call when the brief requests no new or replacement motion; use the static/reuse path                                          |
| Missing target/source rights or unsupported anatomy      | Preserve preparation, report the exact missing input, use the applicable library/manual route if it answers the request                   |
| Missing access, unbounded cost or unavailable deployment | Do not submit; finish offline preparation and identify the precise setup dependency                                                       |
| Unknown create result                                    | Preserve `submission-unknown`, account for uncertain spend, recover by verified provider history; never duplicate POST automatically      |
| Failed/canceled known prediction                         | Retain ID/error/cost; no paid automatic retry; a deliberate new attempt needs changed cause/settings and the normal budget check          |
| Expired/malformed/multiple unexpected output             | Fail acquisition; recover only the same still-available job/files; do not take a preview as the requested skeletal result                 |
| Wrong units/axes/rest/joints/rate or zero hip height     | Fail source/map intake with the actual observed facts; do not normalize the target to disguise the error                                  |
| Body looks wrong after retarget                          | Repair map/rest alignment/contact on the retained source, not a new image/model generation; separate skinning defects from motion defects |
| Clip lacks a supported consumer                          | Preserve a study/library output and state the missing dispatch; no invented action/event or successful gameplay claim                     |
| Storage unavailable                                      | Keep the external workspace and resume receipt, mark not archived, report the exact dependency; never claim an expiring URL is preserved  |

**Performance:** this is per-request offline work. One request helper handles one candidate/job; no task queue, per-NPC calls or model fan-out. Import/bake work scales with source frames × mapped bones, bounded by the selected short clip and target family. Process source batches sequentially, discard disposable source objects/actions after baking, and reuse the generated source across compatible targets instead of paying per character. Viewer work uses the existing asset bounds, animation update/culling and cleanup. Runtime receives ordinary target GLB clips and existing small stride metadata, so there is no model download, inference latency or new network dependency during play. Additional clips still have ordinary payload/memory cost; retain only the relevant runtime set and keep unused auditions in study storage.

**Open facts, assigned rather than blocking the design:** AF16 establishes actual account access, billable bounds, hosted rest convention, generated quality and total correction effort. AF15's inspected target maps settle exact spine/neck correspondence. AF17 establishes the optional human pose-buffer bake and whether it beats ordinary keying. None requires Mike to choose a new architecture now. Other non-motion decisions, AF07/AF12/AF13 art acceptance and V3D family qualification retain their current status with their owners. This design does not claim any provider execution, accepted generated asset, renderer improvement or resolved gameplay timing issue.

## 12. Production readiness

This section implements the selected [feature decision](art-workflow-feature-spec.md#310-common-production-readiness).
The [operator procedure](../production-workflows/art-flows/runtime-preparation.md) owns the ordered
steps and conditional checklist; this section owns mechanisms, work boundaries and acceptance.
The design is complete. Tool additions below are planned under AF19–AF20, not available commands.
Existing supported manual preparation can proceed without waiting for those conveniences.

### 12.1 Owners and data flow

| Concern                                    | Existing owner and integration point                                                                     | Responsibility retained                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Intended use and required visible states   | Selected world's definitions; existing brief and study record                                            | Decide what exists, can act, changes state and is disclosed; no filename/species inference                      |
| Visual source, rig, material and export    | Existing 3D/people/animation recipes; `scripts/art/art-tool.py`                                          | Prepare assets offline; no provider calls or publication from inspection                                        |
| Exact artifact inventory and delivery      | Existing catalogs, `packages/assets`, `scripts/assets.ts`, [asset workflow](../asset-workflow.md)        | IDs/references, dependency files, rights, visibility and selected releases; no new manifest                     |
| Body, support, reach and physical geometry | [Spatial contract](../spatial-world.md#authored-terrain-and-bodies) and installed world definitions      | Admit actual numeric bodies/structures, physical effects and navigation; imported geometry is not authoritative |
| Actor pose                                 | `apps/client/src/model-animation.ts`, `characters/character-motion.ts`, existing person-family consumers | Load supported clips, pace locomotion and display permitted native action progress                              |
| Props, scenery and secondary motion        | Existing scene/prop owners, [wind](../world-presentation.md#wind), supported garment consumers           | Apply their established transforms, materials, culling and lifecycle; no generic physics inference              |
| Inspection                                 | Existing `art-study.ts`, `scene-study.ts` and person study/preview surfaces                              | Rehearse the selected supported assembly; a study adds no gameplay dispatch                                     |

The flow is **brief + selected definitions → source assembly → exported artifacts → inspection →
existing catalog/publication → authorized integration**. The final step is conditional on the
request. Requirements and diagnostic reports are read-only inputs to the operator; they never
write domain state. Only the ordinary integration path installs a selected appearance or changes
an admitted definition. Permitted projections continue to determine what any player or NPC sees;
visual state cannot disclose a private inventory, identity, wound or history by reading raw state.

Use the existing [boundary decision procedure](../engine-and-world-boundaries.md#5-a-repeatable-boundary-decision):
worlds can differ in anatomy, style, action families and physical law; the common procedure merely
checks supported representations and references. No new runtime computation is needed to record
those relationships. A genuinely missing mechanic stays with its existing feature owner.

### 12.2 Handoff contract without another schema

The existing study record's Brief, Construction and sources, Review and Resume sections hold
only missing facts and links. Catalogs retain exact asset inventories; world definitions retain
physical values. The table below defines the information the next operator must be able to resolve,
not a new persisted runtime type, versioned manifest or JSON validation framework.

| Information         | Required representation and resolution                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source and consumer | Exact source/export references, selected consumer/code revision and any relevant installed family/recipe revision; distinguish existing versus proposed consumer  |
| Required coverage   | Requested part/state/action → actual file/node/clip → existing binding → checked result; use the current catalog mapping instead of transcribing it               |
| Assembly frame      | Source/export units and conversion, root anchor, parent and local join/grip/hinge frame; preserve the target family's rest/bind convention                        |
| Physical references | Current body's/structure's definition or admitted profile, support and interaction/contact owner as applicable; authored proposals remain labelled until admitted |
| Motion contract     | Method, target rig, exact action names, loop/one-shot and root policy, native phase binding, retained clips and relevant gait facts                               |
| Resources           | Actual report plus intended outfit/kit/repetition context and existing budget references; runtime measurements include their device, camera and workload          |
| Completion          | Applicable checks and failures, exact checked references and separate exported/checked/archived/selected/integrated facts                                         |

A static decoration may resolve motion/physical/interaction rows with one explicit not-needed
statement. An asset advertised for use cannot leave its required coverage as “TODO”; if the
consumer is not implemented, the package is for that design, not a checked running-game asset.
A single clip or material can be finished independently when that is the named deliverable.

**Transforms:** express exported rigid joins in the selected consumer's local frame (currently
metres, right-handed, Y-up), and record source conversion separately. For a rigid child whose mount
must coincide with a parent anchor, use the existing transform helpers to compose
`parentWorld × parentAnchorLocal × inverse(childMountLocal)`. A node's location is not a second
saved world position. Required exported anchors must be unambiguous in their actual hierarchy;
record the parent path, not just a repeated name. Skin/bind transforms and deformable garment fit
follow their existing family owners rather than applying rigid attachment arithmetic blindly.
Whole-model ground centring remains appropriate only for the selected freestanding consumer.

**Physical alignment:** inspect visuals against the admitted body/structure and relevant anchors.
Selection geometry, blocking/support geometry, combat contact and decorative simulation constraints
remain separate. A doorway's outer bound is not its solid geometry. Native shapes/queries—not a
visual convex hull or material name—determine clearance, reach and navigation. An artist can retain
proposed proxies/helpers externally; they become authoritative only through the normal world
integration boundary. Merely inspecting a proxy proves alignment, not successful traversal.

### 12.3 Implementation modules

| Module                         | Owner                            | Deliverable and dependency                                                                                      | Exit                                                                                                                                           |
| ------------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| PR1 — Common package procedure | AF19 design subitem              | Existing seven-stage routes, package procedure and study record call runtime preparation; no code required      | A producer can resolve each conditional requirement and the next operator can locate its single owner                                          |
| PR2 — Missing export facts     | AF19 implementation              | Extend the existing `art-tool.py report`; retain current reporting and explicit consumer expectations below     | Actual export dependencies/channels/anchors can be inspected; required failures remain failures without forcing animation onto static art      |
| PR3 — Consumer rehearsal       | AF20                             | Reuse existing model/person/scene consumers and only add a missing inspection hook for the selected cases below | Difficult rough assemblies and final exports are inspectable through the correct consumer, with honest missing-capability outcomes and cleanup |
| PR4 — Production qualification | AF07 and existing PPL/V3D owners | Apply PR1 now; use PR2/PR3 where delivered; reuse selected assets and existing proof campaigns                  | Required package/use cases pass, actual production effort is recorded, and family/artistic evidence remains correctly scoped                   |

These are workflow/tooling modules, not four new services or packages. PR2 and PR3 can proceed
independently on established inputs; a valid manual check is not blocked by unfinished reporting.
A person still depends on its selected family; an independent prop or existing animal does not.
Do not generate a new specimen merely because a module needs evidence.

#### PR2 — Extend the existing report, then its callers

Current `report` imports a file and reports size, rest bounds, geometry, materials/images, rig,
clips and profile budgets. It does not measure actual draw calls, physical usability or dynamic
bounds. Its current `creature` profile has no required clips even though `installLocomotion`
requires `Idle` and `Run`; this is a concrete source of false confidence, not a new animal policy.

Implementation order:

1. Preserve the report's existing output fields and current single-file processing path. Add
   facts to the same report rather than creating a new package registry. This preserves active
   callers as part of the change, not legacy formats or a compatibility reader.
2. For final GLB/glTF inputs, inspect encoded data as well as the Blender import. Report actual
   external buffer/image references versus embedded data, required extensions and primitive/material
   assignments. Count source images distinctly and distinguish exported declarations from inferred
   Blender settings. FBX/OBJ remain source reports; they cannot establish final GLB readiness.
3. Add a compact node/anchor view: hierarchy path, exported node index within this exact file,
   local transform and skin association. The node index is a diagnostic locator, not a new stable
   asset ID. Report ambiguities affecting a required attachment; do not forbid every harmless
   duplicate visual name. Keep known mesh/bone binding conflicts visible.
4. Extend material/geometry facts with primitive counts, material alpha mode/cutoff/double-sided
   flags, used texture slots/channels and unique image dimensions. These are structural facts,
   never a claim of a fixed runtime draw count or GPU residency.
5. Report each encoded animation's duration and transform/rotation/scale/weight target paths,
   identifying missing or unresolved data. Do not infer foot contact, sensible acting, state-machine
   dispatch or correct physics from channels existing. Rest bounds remain explicitly rest bounds;
   dynamic bounds require the PR3 consumer check.
6. Add planned repeatable `--require-clip NAME` arguments to `report`. They add exact expected
   names to the selected profile's existing required set; deduplicate expectations and report
   missing names. Update the prepared-creature export callers to pass `Idle` and `Run`, and
   any catalog-declared required clips, through that same check. Keep the current `character`
   profile default; use explicit expectations for another named consumer. `--strict` returns 2
   for those missing requirements as it does for current failures. No action alias, automatic clip
   renaming, silent substitute or globally required creature action is introduced.
7. Final-package checks must fail for an unavailable required dependency, unsupported required
   extension or wrong final format. Resolve relative source resources only inside the selected
   external workspace; report remote URIs without fetching them or executing content. Reuse current
   format and intake restrictions, not a new extension allowlist inferred from latest vendor docs.
8. Update the working command examples after delivery. Until then, operators manually compare
   exported clip/dependency inventories against the brief; the proposed flag is not copyable
   current functionality. Review a static prop, a prepared creature missing `Run`, and an export
   missing a required texture. A static prop must not acquire actor clip requirements.

Keep encoded inspection in a small pure helper inside the existing art tooling if useful; no new
package dependency is needed for GLB JSON/chunk inspection. Share the one parsed representation
across report sections; process files sequentially and release imported scenes before the next
file. Read only the explicit package/dependency set, never scan the whole library. Respect the
existing intake/output guards. Do not add schema versions or migration code.

#### PR3 — Rehearse through existing consumers

Start by selecting the actual path from this table. A generic engine feature list is not evidence
that its OpenLegend caller installs the necessary material, node binding or animation.

| Selected representation                    | Existing inspection route                                                                | Additional proof for integration                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Prepared rigid or animated GLB             | Local model comparison and named study clips in `art-study.ts` / `model-animation.ts`    | The actual prop/actor selection, placement and motion driver uses the files                                     |
| Adjustable body or fitted wearable         | Existing person preview/study and PPL family evaluation                                  | Current item/equipment state, removal and restored coverage; no new wardrobe dispatcher                         |
| Foliage or a populated kit                 | Existing scene study through the real scenery/material/wind path                         | Same grouping, shadow, picking and bounds behavior as ordinary placement                                        |
| Door, modular structure or usable interior | Existing structure/scene assembly and ordinary native placement/movement when authorized | Openings, support, body clearance, permitted camera/cutaway and changing geometry agree                         |
| Unsupported effect/morph/secondary motion  | Existing matching recipe/consumer only when actually supported                           | Otherwise record the missing owning capability; do not add a universal mechanism to make the demonstration pass |

For each selected rehearsal:

1. Resolve exact input references and their current consumer/family. Reuse current local loading,
   trust bounds and permissions; do not automatically upload a local candidate or mutate a release.
2. Instantiate only the required parts and already-supported state/motion binding. Use ordinary
   parent transforms and existing family assembly. Keep the preview's diagnostic poses separate
   from game action dispatch and from the running world's saved state.
3. Use the existing camera, named clip/state selection, game-travel inspection and scene fixture
   controls where available. Add a narrowly scoped hook to an existing surface only if the selected
   case cannot otherwise be inspected. The first delivery needs no new page, generalized physics
   overlay, asset editor, scene database or universal simulation runner.
4. Observe required poses/end states, contact and bounds at the normal camera and diagnostic views.
   For foliage use the actual shared wind/material path, not a private shader copy. For an outfit
   include the declared layers and body; for a module include its neighbouring structure pieces.
5. Capture existing diagnostics/resources and state what they measure. A repeated group or outfit
   uses the scenario from the brief; do not turn the largest exploratory count into a capacity
   promise. If a proposed art budget is exceeded, resolve it with its owner; an installed hard
   intake limit or loader refusal cannot be waived by a prose exception.
6. Replace/remove the candidate and leave the preview. Existing load generations and ownership
   must reject late results, release owned buffers/materials/animations/listeners and preserve
   borrowed shared resources. Reuse existing caches and per-visible-pose updates. No per-frame
   file validation, asset-library scans or renderer objects in domain state.

A required consumer feature absent from the current runtime is an explicit integration dependency,
not an invitation to simulate it in the viewer. Files-only work records its binding/defect and
owner; changes to runtime bounds, definitions or action dispatch require authorized integration.
Do not block unrelated asset preparation on that missing feature.

### 12.4 Performance, persistence and change propagation

Preparation runs on request, offline. Work scales with selected files, exported primitives/images
and required motion samples; it does not add per-NPC generation, server ticks or a new network
service. Reuse parsed data and compatible shared materials/geometry. The expected-use check
inspects the dressed actor/structure/group, so individually modest files cannot hide an excessive
assembly. Sampling demanding poses is inspection evidence, not a mathematical swept-volume proof.

The [repair map](../production-workflows/assets-and-animation.md#repair-map-and-downstream-effects)
remains the one invalidation guide. A changed attachment frame reopens assembly/contact checks;
a changed material/alpha route reopens surface/overlap/shadow checks; changed rig/topology/clip
reopens relevant deformation, contact and bounds checks. Reuse unaffected source and evidence.

No save schema changes. The current asset catalogs, exact publication and world-selected appearance
owners continue to manage references. Art-only replacement leaves admitted physical definitions,
mechanical state, action timing and knowledge unchanged. A separately authorized physical change
uses the ordinary owner and its native dependency invalidation/restoration checks, not a model-load
callback. The [development policy](../../AGENTS.md#development-save-policy) controls incompatible
development state; this workflow adds no compatibility adapter, migration or historical reader.

### 12.5 Acceptance and evidence

Use existing selected specimens and campaigns rather than commissioning a new asset collection.
The following cases define obligations for the modules they exercise; they are not a mandate to
implement an unsupported creature action or mechanism during an art-tooling task.

| Case                                 | Required pass                                                                                                                      | Evidence boundary                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Static decoration                    | Final shape/material/placement and dependencies work; motion/physical rows explicitly unnecessary                                  | No skeleton, clips, collision, LOD chain or invented interaction                                           |
| Prepared stag/wolf                   | Correct target anatomy/scale, loader clips and declared gait/actions, contact/attachments and relevant bounds                      | Missing `Run` is caught even for the creature report; a preview-only bite does not qualify native dispatch |
| Cape/armour on a body                | Required fit, layers, attachment/removal/coverage and exported motion work on the declared assembly                                | PPL/V3D retain broader family/fit-envelope qualification; no universal cloth conclusion                    |
| Moving gate or usable tavern section | Required pivots/end states, openings, joins and materials survive export; native clearance/support when integration is in scope    | Missing mechanism support remains a dependency, not a passed visual proxy                                  |
| Well or articulated tool             | Opening/grip/use frame aligns and any requested moving part survives                                                               | Water transfer, container contents and successful work remain native outcomes                              |
| Foliage group                        | Cutouts, shared wind anchoring, shadows and bounds hold in intended repetition                                                     | Record actual renderer metrics; primitive/material counts alone do not prove frame cost                    |
| Broken package and replacement       | Missing required texture/clip/part or unsupported required capability is reported; late preview load cannot replace a newer choice | Inspect only relevant failure paths; no parallel validation suite or rare-case campaign                    |

**Required pass:** requested package completeness, ordinary consumer use and the affected
correctness/lifecycle checks. A missing required dependency blocks that claimed use. For files-only
work, do not require unauthorized gameplay changes; name the later native checks explicitly.

**Required measurement:** AF07 records actual hands-on and elapsed production effort, corrections
and paid cost for its existing proof. For an affected repeated assembly, record the actual existing
resource/performance observations and their workload. Failed or unavailable measurements remain
results/gaps, not invented passes or automatic permission to redesign the renderer.

**Exploration:** extra LOD/atlas/batching/secondary-motion techniques only when the selected use
shows a need or a comparison is requested. Optional optimisation never expands core delivery by
itself. **Human acceptance:** Mike's art selection and an independent artist/developer's ability
to follow the procedure remain distinct from a script pass; record observed execution when a
production proof includes it, never infer it from detailed prose.

For this design-only change, content/diff review, affected-link checks and changed-file formatting
are sufficient; no game run, paid generation or automated suite is implied. Implementation selects
its actual static/manual checks under the [verification policy](../../.agents/rules/verification.md).

### 12.6 Decisions, tradeoffs and open questions

- **Selected:** one conditional common procedure, early difficult-dependency rehearsal, a complete
  package through existing records and optimisation for intended use. This is ordinary correctness
  work; uncertain new techniques still need their own evidence under §6.
- **Selected:** references and alignment rather than art-owned physics; motion follows the actual
  consumer; source parts may remain editable while compatible exported draw sections combine.
- **Not added:** another asset database, readiness service, universal skeleton/cloth/mechanism
  solver, automatic provider fan-out, live paid generation, mandatory per-prop LODs or legacy support.
  Each would add delivery cost without resolving the common handoff gap.
- **No blocking common-design question.** AF19/AF20 implementation, AF07/PPL/V3D qualification and
  existing source acceptance retain their concrete owners. A later asset brief resolves its exact
  action list, body/fit range, geometry and workload. Unsupported consumers receive scoped work at
  that boundary rather than a speculative universal implementation now.

### 12.7 Source notes

The installed source remains authoritative for OpenLegend behavior: the lockfile pins PlayCanvas
2.22.2 with the repository patch; the operational Blender recipe is in [tools](../production-workflows/art-flows/tools.md#blender).
Official documentation informs format constraints, not an automatic dependency upgrade:

- [Khronos glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units): metres/right-handed Y-up coordinates; its [animations](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#animations) and [GLB structure](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification) distinguish exported channels and resource references from authoring behavior. Core visual data does not implement OpenLegend physical rules.
- [Blender glTF export](https://docs.blender.org/manual/en/3.6/addons/import_export/scene_gltf2.html#animations): object/bone/shape animation export differs from source physics/material animation. This is supporting format evidence, not the command reference for the installed Blender version; use and verify the pinned recipe.
- [PlayCanvas supported formats](https://developer.playcanvas.com/user-manual/assets/supported-formats/): direct engine loading and Editor conversion differ. The application loader/decoder configuration still determines usable runtime inputs.
- [PlayCanvas transparency](https://developer.playcanvas.com/user-manual/graphics/transparency/): blended surfaces depend on mesh-instance ordering; cutouts have different depth/sorting behavior. Inspect actual overlapping foliage/hair and camera motion rather than treating alpha as a checkbox.

Sources checked November 8, 2026. Vendor capability is not evidence that a source-specific rig,
material, simulation or action binding works in the current application.
