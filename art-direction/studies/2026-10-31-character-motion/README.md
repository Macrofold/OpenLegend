# Character motion — walking, running, strikes and gestures

## State

The mercenary's travel, gait, strikes and capture are reworked in the game client and measured in the scene study. The five proof-run people have the same clip set, reviewable in the art study. Since November 1 the game's prepared library people have it too, on their own rig, with the same speed-matched gait and strikes ([Library people](#library-people)). Not owner-accepted. The game reads these clips from the development runtime release, which has held the new motion files since November 1 (see [Resume](#resume)).

## Brief

- **Request (Mike, October 31, 2026):** "try to make better animations for them. Walking, running, attacking, dodging, waving. Iterate on these until they actually look good. The current walk animation is very janky and unnatural, the walk speed does not match the legs, there is no acceleration/deceleration, there is a weird stuttering when it starts and stops, etc. I'm looking at the mercenary specifically."
- **Subjects:** the Peacock Mercenary in the game, and the five people from the [character-sheet proof run](../2026-10-31-character-sheet-proof/README.md). Follow-up on November 1, 2026: the game's prepared library people (Ada, Kest, Mara, Mike, Orin, Tavin and the padded-armor study, three outfits each), whose single procedural run did not match travel.
- **Tools:** Higgsfield's 3D Rigging clip library (Meshy animations), Blender 5.2.2, [`scripts/art/art-tool.py`](../../../scripts/art/art-tool.py) `clips`, the scene study and the art study.
- **Spend:** 80 Higgsfield credits (about $3–4) for ten clip-library rigging jobs; everything else ran locally.
- **Clips:** `Idle` (proof-run Maer Fen's rig idle), `Walk` (walking-2), `Run` (proof-run Maer Fen's run; his files say `orin`), `Sprint` (run-fast), `Attack` (sword-slash), `Punch` (jab), `Dodge` (stand-dodge), `Wave` (wave-one-hand). Each is retargeted onto the receiving rig in world space, so rigs with different bone axes (the mercenary's against Meshy's) share them; Walk, Run and Sprint are trimmed to one stride from left heel strike and play on the spot.

## What was wrong

Measured in the scene study's game-travel fixture: bodies cross 8 m at 6.6 m/s, the bundled world's normal-speed travel, and rest 1.5 s at each end. Updates arrive unevenly, 60% at 50 ms and the rest at 100–300 ms.

| Symptom Mike saw                       | Cause found                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legs out of step with travel           | Held poses: the look sampled poses 12 times a second while travel stayed continuous, so a planted foot moved with the body. Across each stance it drifted 6.6–7.0 m/s against a body at 6.2 m/s, then snapped back.                                                                                                                                   |
| Stuttering, surging speed              | Displayed time steered toward the newest snapshot's time, which jumps at every arrival: displayed speed swung between 6.3 and 8.8 m/s at a steady 6.6. A gap longer than the delay stopped playback dead, then it lurched to catch up.                                                                                                                 |
| No acceleration                        | Starts and stops eased with an even average: a linear speed ramp with abrupt corners.                                                                                                                                                                                                                                                               |
| Body vanishing or cut in half          | The mercenary's capture window came from his standing pose, which reaches only 0.11 of his height forward or back; strides and strikes reach far beyond it (below). The Walk clip also still carried 1.28 m of forward travel per loop: `--stride` rotated a single-stride loop to heel strike before travel removal, which then saw no net travel. |
| Legs stepping on the spot after a stop | The fading stride kept playing at full speed through the 0.25 s crossfade to Idle.                                                                                                                                                                                                                                                                  |
| Animation frozen after he left the screen | Off-screen sleep set his animation speed to zero and nothing restored it, so after the first sleep every pose update was multiplied by zero (present since October 17). |
| Cape like a board when running         | The settled cape is carried rigidly by one shoulder bone, so it tilts with the run's forward lean.                                                                                                                                                                                                                                                 |
| Strikes never shown on the model       | The scene showed the sprite whenever a strike was active, and the sprite's pose changed only at snapshot cadence.                                                                                                                                                                                                                                  |
| Off-screen and pause | Animation frozen for good after his first off-screen sleep; paused bodies 1–3 m short of their positions | Pose advances again after returning to view; paused bodies rest within 0.000001 m of their newest positions |

Poses reach beyond the standing contour by these fractions of standing height (Blender, every frame of each clip on the mercenary's body):

| Clip   | Behind | Ahead | Above | Below |
| ------ | ------ | ----- | ----- | ----- |
| Walk   | 0.16   | 0.26  | 0.01  | 0     |
| Run    | 0.30   | 0.29  | 0     | 0.01  |
| Sprint | 0.38   | 0.44  | 0     | 0     |
| Attack | 0.13   | 0.46  | 0     | 0.04  |
| Punch  | 0.09   | 0.60  | 0     | 0.04  |
| Wave   | 0      | 0.12  | 0.06  | 0     |

## What changed

- **Playback clock:** displayed travel steers by the world's present time carried forward from the latest arrival, nudging its pace by at most −10%/+20%. It eases off near the newest sample instead of stopping, jumps after a stall longer than 0.6 s and plays through speed changes. The delay starts at 0.25 s, rises at once to cover a long gap and relaxes over seconds of steady arrivals. A paused world finishes playing what it admitted, so bodies stop where the world holds them.
- **Starts and stops:** triangular weights over ±0.15 s give an S-shaped speed ramp of about 0.3 s. Displayed speed comes from the same weighting and paces the legs.
- **Gait:** Walk, Run and Sprint blend by displayed speed at the rate that keeps planted feet in place; stopping settles into Idle over 0.1 s of clip time played at 0.4×, without stepping.
- **Heading and strikes** replay on the travel clock, so the mercenary turns and strikes where he is drawn, facing the strike's direction. A strike phase is filled in from its own linear progress, so it starts at the beginning and reaches contact. The mercenary plays his own Attack and Punch clips, as library people now do; animals keep the sprite. The controlled body keeps its newest heading, which the locked camera follows.
- **Off-screen sleep** no longer zeroes the animation speed, so the pose resumes after he returns to view.
- **Capture window:** it covers the current pose each frame, using a box per bone around the vertices that bone moves plus the cape's live bounds. The standing figure alone still sets his displayed size; fixed-row comparison treatments grow their image by whole samples.
- **Working look:** smooth poses and the simulated cape replace held poses and the settled cape; both remain comparison options.
- **Clip tool:** `--stride` now always removes travel, before and after trimming.

## Evidence

All runs use the scene study at 1280×800 with Metal-backed WebGL on Mike's Mac, the game-travel or strike fixture and the new motion file served locally under its exact hash. Coverage is exact: every second vertex of the body and cape is projected with the capture's own camera matrix each third frame.

| Check                       | Before                                     | After                                                                                         |
| --------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Body inside capture | Cut or missing in 8 of 120 sampled frames | 0 cropped in every run (213–280 samples each), including the fixed-row comparison treatments; the outermost pixel sits 2 px inside |
| Fast-travel displayed speed | 6.3–8.8 m/s sawtooth | mean 6.57–6.78 m/s, spread 0.28–0.47 (target 6.6) |
| Planted-foot drift | 6.6–7.0 m/s (held poses) | 0.3–1.5 m/s per stance of 35 ms or more with the body near 6.8 m/s, a tenth to a fifth of its speed and partly the foot's own roll; shorter stances are dominated by timestamp noise |
| Worst frame and image reallocation | 941–956 ms stalls during diagnostics; 25 reallocations per 7 s run | 16–29 ms; at most one reallocation per 7 s run in each treatment |
| Strikes                     | Sprite only; pose at snapshot cadence      | Model clips every frame; punch from 2% to contact, club through full recovery; no fallback    |

Dodge and Wave have no game event yet. They play in the art study's **Motion** control, which now offers every clip a model carries, on all five people and on the mercenary's full model. That model shows without its cape, which exists only as simulated cloth in the game.

## Limits

- The fixture is harsher than a local server: 300 ms update gaps exceed the 0.25 s delay cap and still dip speed briefly, and a club wind-up of 0.2 s may be caught by a single update and held.
- **Latency:** drawn bodies, the controlled one included, run about 0.25 s behind the newest snapshot in steady play (0.08 s before) and up to 0.5 s with uneven updates. Health bars, captions and effects still appear on arrival, so a struck body can react before the drawn blow lands; delaying that feedback to the replay clock, or a lower-latency setting for the controlled body, would be separate decisions.
- A body leaving sight still jumps to where it was last seen, and one coming into view waits there for the delay before moving.
- The [selected per-fact stealth target](../../../docs/world-presentation.md#selected-per-fact-stealth-disclosure) would hold other people at their latest sample without interpolation; this playback remains the current baseline until that target is built.

## Library people

On November 1 the prepared library people got the same clips, gait and strikes. Each of their 21 animated files (seven people, three outfits each) played one procedural `Run` at a fixed pace, its feet moving 0.27 m/s under a body travelling 6.6 m/s, and their strikes fell back to the sprite.

- **Different skeleton:** they use MakeHuman's (MPFB) 163-bone rig, not Meshy's 24 bones, and their rest pose differs: arms 47° below horizontal against Meshy's 67°, knees straight against slightly bent. `art-tool.py clips --bones` reads [`scripts/art/bone-maps/mpfb-meshy.json`](../../../scripts/art/bone-maps/mpfb-meshy.json): 30 MPFB bones follow Meshy's 22 (all five toes follow its one), the rest follow their parents, and the arms and legs first turn to Meshy's rest directions, the hands with them. Spine, neck, head and feet keep their own shapes, which are anatomy rather than pose; turning a foot to Meshy's would sink the toes 6 cm. Without alignment the arms hung about 20° out and the hands flared.
- **Stride speeds at contact:** these clips' feet speed up under the hips through each stance (a sprint foot from about 4 to 14 m/s), so no single pace plants them throughout. The tool now measures a stride's ground speed where the foot visibly meets the ground: within 1.5 cm of its lowest point, moving back, by central difference over the loop. This reproduces the mercenary's recorded values within 5% (1.27, 4.92 and 10.0 m/s against 1.29, 5.12 and 9.53) and replaces the sprint's single push-off sample, which read 14 m/s on these people. An average over the whole stance, tried first, left feet sliding forward as they landed (39–46% of body speed).
- **Game:** a library person whose catalog entry lists strides plays them through the motion layer the mercenary uses ([`character-motion.ts`](../../../apps/client/src/characters/character-motion.ts)), with Attack and Punch on the model; animals keep one looping run and sprite strikes.
- **Clips:** the same eight sources, per person: `clips --model <person>-motion.glb --clip Idle=<f06 Maer Fen rig> --clip Walk=<k02> --clip Run=<f06 Maer Fen run> --clip Sprint=<k03> --clip Attack=<k05> --clip Punch=<k06> --clip Dodge=<k07> --clip Wave=<k08> --stride Walk --stride Run --stride Sprint --bones scripts/art/bone-maps/mpfb-meshy.json`. Meshes, materials, texture bytes and node names match the published files exactly and the bind pose agrees within 0.00003; each file grows from about 2.1 to 2.9–3.3 MB because every bone is sampled in every clip.

Measured stride speeds, m/s (Walk 1.167 s, Run 0.7 s and Sprint 0.5 s loops); each outfit's exact values are in its catalog entry beside the file's hash:

| Person              | Walk        | Run         | Sprint        |
| ------------------- | ----------- | ----------- | ------------- |
| Ada                 | 1.142–1.154 | 4.831–4.840 | 10.763–10.782 |
| Padded-armor study  | 1.183       | 5.425       | 11.424        |
| Kest                | 1.239–1.250 | 5.427–5.475 | 11.457–11.559 |
| Mara Reed           | 1.200–1.209 | 5.682–5.725 | 11.690–11.778 |
| Mike                | 1.179–1.226 | 5.385–5.431 | 11.352–11.450 |
| Orin                | 1.219–1.225 | 5.797–5.823 | 11.798–11.851 |
| Tavin Vale          | 1.246–1.264 | 5.492–5.572 | 11.788–11.961 |

Evidence: the scene study's Game travel fixture at 1280×800, Metal-backed WebGL in headless Chromium on Mike's Mac at 120 frames a second, served by a plain Vite study server with an exact index naming the rebuilt files; every other file came from the public asset host, checked against its hash. "Before" ran the base commit `fa954b9bd` with the published files. Drift is measured per contact, because these contacts last 25–45 ms and their lowest heights differ by a few centimetres: the toe's ground displacement over ±25 ms around each low point that comes within 4 cm of the foot's lowest height, over that time. Steady travel means 6.2 m/s or more and 0.5 s after the leg starts.

| Check                                   | Before                                       | After                                                                                                                                                   |
| --------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planted-foot drift, steady travel       | median 97% of body speed (48 contacts, camp) | camp, two runs: median 12% and 14% (36 contacts; 90th percentile 23–29%, worst 40%); watchpost, Kest and Orin, Orin down the ramp: 17% (8 contacts); the mercenary in the same camp run: 6–14% |
| Planted-foot drift, starts and stops    | median 104%                                  | median 24–49%; the first left contact of each leg, about 0.3 s after starting, reaches up to 1.9× body speed                                            |
| Displayed speed, steady travel          | 6.83–6.85 m/s                                | 6.75–6.85 m/s                                                                                                                                           |
| Own model shown                         | yes                                          | every frame of travel and strikes; no sprite fallback                                                                                                   |
| Strikes (Mara, study strike timing)     | sprite                                       | 335 of 335 strike frames on the model, no wrong clip; Attack from its start through full recovery (0.01–1.53 s), Punch to contact (0.73 s against 0.72) |

Limits:

- **Starts:** the first stance of each leg slides while the stride fades in from Idle and the body reaches full speed in about 0.3 s; the mercenary shows the same, less (up to 0.4× body speed).
- **Floating feet:** the source clips' planted feet float 3–5 cm on their own rig, and they do on these people too; at sprint contact the toe joint dips about 1 cm below its standing height.
- **Budgets:** as before, the 163-bone rig is over the 64-joint budget ([A3D06](../../../docs/limits/3d-pixel-art.md#a3d06--articulation-and-visual-composition)), the work-vest outfits over the material budget and Mara's work vest over the triangle budget.

## Resume

- **Files:** working folder `~/Documents/ChatGPT/OpenLegend-art/2026-10-31-character-motion/study/` (`models/` source clips, `export/` motion files with their clip facts, `review/` captures, sheets and traces, `work/` measurement scripts).
  - **Library people:** `models/library/` holds the 21 published motion files used as inputs (fetch them again from the repository root with `pnpm assets workspace --public --all --index <working folder>/work/recipes/library/people-motion.index.json --output <new folder>`), `export/f07`–`f27` their rebuilt files and clip facts, and `review/library-before`, `library-run2`, `library-run3` (with the mercenary), `library-watchpost` and `library-strikes` the final runs' series, summaries, frames and recordings; `library-run1`, measured with whole-stance speeds, is superseded scratch. `work/recipes/library/` builds the files and writes the catalogs; `work/tools/library/` holds the study server harness, strike check and contact analysis.
- **Private archive, first batch:** a `study` revision in `art-studies` / `curated-private`, owner `collection/openlegend-curated`, asset `character-motion-2026-10-31`, evidence `owner-authorized-character-motion-2026-10-31` (Mike's request above), uses `private-study`, `source`, `offline` and `recovery`.
  - Revision `sha256-95a47e150510a00b774efe0f624d7473ecd6146ccc1002f973a4a1ab96e0eeac`, manifest SHA-256 `69e432fa2a346568235ef6073ff886be3d2b97d9f6b3eb9add84a2fa30cced20`, operation `character-motion-2026-10-31-private`; 94 files, 66,087,214 bytes, verified; exact list in [archive.index.json](archive.index.json).
  - It holds the ten source clips, the pose frames, the recipes and the first exports. Those exports predate the stride fix, so their Walk still carries its travel; the rebuilt ones replace them.
  - **Fetch** with the main checkout's asset authority and the AWS sign-in: `pnpm assets workspace --index art-direction/studies/2026-10-31-character-motion/archive.index.json --all --output <new folder>`.
- **Private archive, final batch:** the same asset's revision `sha256-2fc5c463d488aed77b2f6eed6146deb8da771261f77cbdd64c06240a81e40ab4`, manifest SHA-256 `486b987a2bda1bd35d3da792b9900e9610cb6202819b6fda9e5ed0fa2cd50cf9`, operation `character-motion-2026-10-31-final`; 62 files, 90,956,621 bytes (72.1 MB new), verified; exact list in [archive-final.index.json](archive-final.index.json).
  - It holds the rebuilt motion files, the final captures, traces and sheets, and the measurement scripts; superseded diagnostic runs stay local as scratch.
  - The archive store's former 10 GiB allowance refused it until Mike removed that cap for official storage on November 1 ([A3D10](../../../docs/limits/3d-pixel-art.md#a3d10--durable-storage-and-quarantine)).
  - **Fetch** like the first batch, with `--index art-direction/studies/2026-10-31-character-motion/archive-final.index.json`.
- **Private archive, library batch:** the same asset's revision `sha256-adb4783c58d65560fa840d2f126dda33813a06c45785d4eb32f19627f9a6bbea`, manifest SHA-256 `a504f85badd72a95075d5975e59bd5cb5e7fc72bed149958950d05261efb70b5`, operation `character-motion-2026-10-31-library`; 87 files, 89,131,522 bytes, verified; exact list in [archive-library.index.json](archive-library.index.json).
  - It holds the 21 rebuilt files with their clip facts, the final runs' recordings, traces and summaries, the strike captures, and the library recipes and tools. The travel runs' screenshot frames, the harness logs and the superseded `library-run1` stay local as scratch.
  - It depends on the final batch, which holds the source clips. Its other inputs are not copied: `work/recipes/library/people-motion.index.json` names the 21 published input files, and proof-run Maer Fen's `Idle` and `Run` are in the [character-sheet proof](../2026-10-31-character-sheet-proof/README.md) archive.
  - **Fetch** like the first batch, with `--index art-direction/studies/2026-10-31-character-motion/archive-library.index.json`.
- **Runtime release:** published November 1 with Mike's permission as the development runtime's revision `sha256-7d81191ca1c801356c82b4eb0d3362a052fdf822669029056882c5c67c4704a7` (manifest SHA-256 `cd82ab7af905b8a3052e9f8acaaf83291784a80d631c13d085844fee4e14d0d6`, operation `character-motion-development-runtime-20261101`), now revision 6 of the `development/runtime` selection. It replaces only `apps/client/src/characters/mercenary-assets/mercenary-motion.glb` (from `export/mercenary-motion-only.glb`) and the 21 library files under their existing paths (`apps/client/src/props/art-study/source-<person>/<person>-<outfit>-motion.glb`). [`assets/locks/development.json`](../../../assets/locks/development.json) names it, and all 1,067 hosted files verified. A saved world uses it once its owner chooses **Use installed game art**.
- **Studies release:** published November 1 with Mike's permission as public studies revision `sha256-b8838ac359de4b9ff9d76a8b9e06603fa62292e337a6cee290179802124a2af7` (manifest SHA-256 `c18aec171c5fbc4132ac6c542840a386fedb0cb132ac2c88ff7b1f55594aca6e`, operation `character-motion-public-studies-20261101`). It inherits the previous revision and replaces only the same 22 motion files and the seven library people's catalogs. Its successor, public studies revision `sha256-b789ebfda3d3421a5a6ff9f6532c64ec78851adb17dd40ae28bff10cf33584d9` (manifest SHA-256 `217a4af202d6604700d1a6999dc052910822b4f9a3cfb77e5f7581f175969f29`, operation `hosted-study-fonts-public-studies-20261101`), adds only the Gildmoss interface fonts (Figtree and Gelasio, each with its OFL notice) that rebuilt study pages use; [`assets/locks/studies.json`](../../../assets/locks/studies.json) names that successor. Study pages served from a checkout with `pnpm assets serve` use it. The hosted art and scene studies that the game's art-inspector link opens (`studyViewerBaseUrl` in [`assets/delivery.json`](../../../assets/delivery.json)) are build `sha256-9c07c5535bee3c73b25904b332269ad530f5e657bba46474e76a6ef403ac5d43`, published November 3 from the next public studies revision, which adds the [character heights study](../2026-11-03-character-heights/README.md#resume); they load these motion files too. It supersedes the build staged on November 1 in `~/Documents/ChatGPT/OpenLegend-art/2026-11-01-hosted-study-build/viewer-rebased/`, which was never published. The site's navigation page still links to the earlier build.
- **Open decisions:** Mike's review of the motion and of the working look.
- **Review:** open the studies with `pnpm assets serve --page /scene-study.html` (or `/art-study.html`), which uses the current studies lock, or the hosted copies the game's art-inspector link opens. In the scene study choose **Game travel** (the Camp has Ada, Mara and Tavin; the Broken Watchpost has Kest and Orin) or **Mercenary strikes**; in the art study, **Compare a local model** with any file from `export/` and step through **Motion**.
