# Character motion — walking, running, strikes and gestures

## State

The mercenary's travel, gait, strikes and capture are reworked in the game client and measured in the scene study. The five proof-run people have the same clip set, reviewable in the art study. Not owner-accepted. The game reads the mercenary's clips from the development runtime release, which still holds the earlier motion file; publishing the new one there needs Mike's permission (see [Resume](#resume)).

## Brief

- **Request (Mike, October 31, 2026):** "try to make better animations for them. Walking, running, attacking, dodging, waving. Iterate on these until they actually look good. The current walk animation is very janky and unnatural, the walk speed does not match the legs, there is no acceleration/deceleration, there is a weird stuttering when it starts and stops, etc. I'm looking at the mercenary specifically."
- **Subjects:** the Peacock Mercenary in the game, and the five people from the [character-sheet proof run](../2026-10-31-character-sheet-proof/README.md).
- **Tools:** Higgsfield's 3D Rigging clip library (Meshy animations), Blender 5.2.2, [`scripts/art/art-tool.py`](../../../scripts/art/art-tool.py) `clips`, the scene study and the art study.
- **Spend:** 80 Higgsfield credits (about $3–4) for ten clip-library rigging jobs; everything else ran locally.
- **Clips:** `Idle` (proof-run Orin's rig idle), `Walk` (walking-2), `Run` (proof-run Orin's run), `Sprint` (run-fast), `Attack` (sword-slash), `Punch` (jab), `Dodge` (stand-dodge), `Wave` (wave-one-hand). Each is retargeted onto the receiving rig in world space, so rigs with different bone axes (the mercenary's against Meshy's) share them; Walk, Run and Sprint are trimmed to one stride from left heel strike and play on the spot.

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
- **Heading and strikes** replay on the travel clock, so the mercenary turns and strikes where he is drawn, facing the strike's direction. A strike phase is filled in from its own linear progress, so it starts at the beginning and reaches contact. The mercenary plays his own Attack and Punch clips; prepared people without strike clips keep the sprite. The controlled body keeps its newest heading, which the locked camera follows.
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
- Prepared library people keep their single procedural run clip, which does not match travel speed, and sprite strikes; retargeting these clips onto their rig is separate work.
- **Latency:** drawn bodies, the controlled one included, run about 0.25 s behind the newest snapshot in steady play (0.08 s before) and up to 0.5 s with uneven updates. Health bars, captions and effects still appear on arrival, so a struck body can react before the drawn blow lands; delaying that feedback to the replay clock, or a lower-latency setting for the controlled body, would be separate decisions.
- A body leaving sight still jumps to where it was last seen, and one coming into view waits there for the delay before moving.
- The [selected per-fact stealth target](../../../docs/world-presentation.md#selected-per-fact-stealth-disclosure) would hold other people at their latest sample without interpolation; this playback remains the current baseline until that target is built.

## Resume

- **Files:** working folder `~/Documents/ChatGPT/OpenLegend-art/2026-10-31-character-motion/study/` (`models/` source clips, `export/` motion files with their clip facts, `review/` captures, sheets and traces, `work/` measurement scripts).
- **Private archive, first batch:** a `study` revision in `art-studies` / `curated-private`, owner `collection/openlegend-curated`, asset `character-motion-2026-10-31`, evidence `owner-authorized-character-motion-2026-10-31` (Mike's request above), uses `private-study`, `source`, `offline` and `recovery`.
  - Revision `sha256-95a47e150510a00b774efe0f624d7473ecd6146ccc1002f973a4a1ab96e0eeac`, manifest SHA-256 `69e432fa2a346568235ef6073ff886be3d2b97d9f6b3eb9add84a2fa30cced20`, operation `character-motion-2026-10-31-private`; 94 files, 66,087,214 bytes, verified; exact list in [archive.index.json](archive.index.json).
  - It holds the ten source clips, the pose frames, the recipes and the first exports. Those exports predate the stride fix, so their Walk still carries its travel; the rebuilt ones replace them.
  - **Fetch** with the main checkout's asset authority and the AWS sign-in: `pnpm assets workspace --index art-direction/studies/2026-10-31-character-motion/archive.index.json --all --output <new folder>`.
- **Final batch, not yet archived:** `archive/manifest.json` beside the working folder (revision `sha256-2fc5c463d488aed77b2f6eed6146deb8da771261f77cbdd64c06240a81e40ab4`, rights approved) lists 62 files: the rebuilt motion files, the final captures, traces, sheets and measurement scripts, 72.1 MB of them new. Publishing was refused because the archive store holds 10,712,599,895 of its 10,737,418,240-byte operating allowance ([A3D10](../../../docs/limits/3d-pixel-art.md#a3d10--durable-storage-and-quarantine), `assets/operating-envelope.json`). Once Mike raises the allowance or clears stored material, publish it with operation `character-motion-2026-10-31-final` and add its index here; superseded diagnostic runs stay local as scratch.
- **Open decisions:** the archive allowance above, and Mike's permission to publish `export/mercenary-motion-only.glb` as `apps/client/src/characters/mercenary-assets/mercenary-motion.glb` in the development runtime release and update the runtime lock; the game needs it for these clips.
- **Review:** in the scene study choose **Game travel** or **Mercenary strikes**; in the art study, **Compare a local model** with any file from `export/` and step through **Motion**.
