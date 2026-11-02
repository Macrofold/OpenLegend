# Character-sheet proof run — five people to rigged models

## State

Finish and Check done for all five: f01–f04 and f06 exported with `Idle` and `Run` and checked in the study viewer beside the published cast. Archived privately and verified (see [Resume](#resume)). Not owner-selected or accepted; not integrated.

## Brief

- **Purpose:** Mike supplied five character sheets on October 31, 2026 and asked for their backstories and for any tests worth running on them. This proof run takes each sheet through the [3D route](../../../docs/production-workflows/art-flows/3d-models.md) to a rigged, animated GLB. It also exercises the new art tool (AF05) and the study viewer's local model preview (AF06).
- **Settings:**
  - **Profile and finish:** people, rigged GLBs.
  - **Fidelity:** faithful, locking face, hair, outfit colours and construction; props are separate assets.
  - **Tools:** the `standard` preset: views with GPT Image 2.5 (high, 2K) and models with Multi-Image to 3D (Meshy) and Tripo H3.1 Multiview, all on Higgsfield; then Higgsfield's 3D Rigging, Blender 5.2.2 and `scripts/art/art-tool.py`.
  - **Candidates:** one Meshy and one Tripo per person. Mara and Orin also got a Meshy candidate from views cropped out of their sheets, as a crop-versus-clean test.
  - **Selection and stop:** the agent picks for the proof; Mike accepts. Stop at checked, archived GLBs.
  - **Budget:** unlimited ("Spend whatever you want"), tracked below.
- **Look:** the [current direction's production notes](../../decisions.md#how-the-current-look-changes-production): adults modelled at 1.85 m beside a 1.85 m reference figure, no baked pixelation (the renderer applies the pixel pass), and the mercenary as the quality bar.
- **Consumer:** the study viewer and the game client, which needs clips named `Idle` and `Run` ([`model-animation.ts`](../../../apps/client/src/model-animation.ts)).

### The five sheets and what the docs say

| Sheet | Person          | Backstory owner                                                                                                                                                            | What the backstory decided for the art                                                                                                                                                                                                                                         |
| ----- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| c01   | Sela Tern, 51   | [Medieval-survival repertoire](../../../docs/repertoires/worlds/medieval-survival.md#sela-tern-51--the-witch-of-nine-landings): river captain and ferry owner              | Her poles and chickens are props, not body; bare feet and the copper hooks at her belt are kept as hers                                                                                                                                                                       |
| c02   | Ser Jessa Cairn, 29 | [Medieval-survival repertoire](../../../docs/repertoires/worlds/medieval-survival.md#ser-jessa-cairn-29--the-kings-lance-at-the-broken-crossing): royal knight          | Sword, helmet, banner and scroll are separate items. The [house-style notes](../../midjourney/07-open-legend-house-style.md) say she fights on foot with spear and shield, which the sheet's sword contradicts; left for Mike                                                 |
| c03   | Ada             | [First-playable people](../../../docs/worlds/base/first-playable-people.md): practical, curious, watches animals                                                          | Cart, wheel and tools left out; her crossed arms opened to the A-pose                                                                                                                                                                                                          |
| c04   | Mara Reed       | [First-playable people](../../../docs/worlds/base/first-playable-people.md) and [the missing belonging](../../../docs/worlds/base/missing-belonging.md): a careful mender with river-crossing experience | One of the two Ada-based sheets; Mike: "they can be different characters". The satchel is her authored red-stitched satchel, a world item that starts at the Reed-side Store, so it is not modelled on her body                                                             |
| c05   | Orin            | [Contested watchpost](../../../docs/worlds/base/contested-watchpost.md): travelled with Kest, proud of his bow                                                             | His bow, arrows and knife are game equipment (the bow takes both hands), so they are separate assets                                                                                                                                                                         |

The backstories did not change how the models were made; that part is mechanical. They decided what belongs to the body and what is a separate game item, what must not be invented, and which person needs a way to be told apart (see the review).

## Candidates

All files are in the private archive at the paths shown; [archive.index.json](archive.index.json) lists every file's exact hash. Job IDs are Higgsfield's.

| ID      | From                       | What it is                                                                                         | Result                                                                                                             |
| ------- | -------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| c01–c05 | Mike                       | The five sheets, `references/c0N-<person>-sheet.{webp,png}`                                         | Identity references                                                                                                |
| views   | c01–c05                    | Clean A-pose front, back, left and right for each person, `views/clean/<person>-<view>.png` with prompts; sheet crops in `views/crop/` | All five back views came back as two figures, front and back (the back figure was cropped; originals kept as `*-back-pair.png`); two of ten side views faced the wrong way (redone; originals kept as `*-wrongfacing.png`) |
| m01     | Sela, clean views, Meshy   | `b382a273…`                                                                                         | **Picked**: strongest red scarf and closest read                                                                   |
| m02     | Jessa, Meshy               | `4c158fb6…`                                                                                         | **Picked**: green tabard, emblem and wave band read in play                                                        |
| m03     | Ada, Meshy                 | `0eb4937c…`                                                                                         | **Picked** over the near-equal m08: brighter, one texture                                                          |
| m04     | Mara, clean views, Meshy   | `2b10290c…`                                                                                         | **Picked**: cleanest and brightest of three                                                                        |
| m05     | Orin, Meshy                | `fcd26e52…`                                                                                         | Sleeves drifted from blue-grey to lavender                                                                         |
| m06–m10 | Sela, Jessa, Ada, Mara, Orin; Tripo with `--quad true` | `e747c743…`, `3c7f9915…`, `4e981a0e…`, `12678e47…`, `6b27e7a5…`                     | FBX files named `.glb`, facing sideways, four 2048 maps each. Darker than Meshy except Orin (m10), whose blue-grey was the most faithful; FBX cannot be rigged |
| m11     | Mara, cropped sheet views, Meshy | `cd455bb2…`                                                                                 | Kept the sheet's lighting and pose; darker and murkier than m04                                                    |
| m12     | Orin, cropped sheet views, Meshy | `df027b2c…`                                                                                 | Kept the sheet's raised arms and knife; pale boots                                                                 |
| m13     | Orin, Tripo GLB, front first | `4d24d6d1…`, quad and PBR off                                                                    | Real GLB with one map and 16,507 triangles, but facing sideways                                                    |
| m14     | As m13, `--orientation default` | `4e67e985…`                                                                                   | Still sideways: the option does not change facing                                                                  |
| m15     | Views ordered left, back, right, front | `9c8a1f89…`                                                                            | Faces the front; texture almost black                                                                              |
| m16     | As m15 with `--texture_alignment geometry` | `df3de134…`                                                                        | **Picked**: faces the front and textured like m10                                                                  |
| f01–f04 | m01–m04 rigged twice (`Idle` 0, `Run_02` 14) | rigs `0d9ab918…`, `d4fd5da6…`, `65fba84b…`, `f203aaf9…`; runs `bc88da0b…`, `c779d467…`, `8fa47ae4…`, `b0009453…` | `export/final/f0N-<person>.glb`, combined by `art-tool.py clips`                                                  |
| f05     | m13 rigged (sideways)      | rig `540302e5…`, run `86368dce…`                                                                    | **Rejected**: the rigger assumed front facing and ran the arm bones through the chest                              |
| f06     | m16 rigged                 | rig `fa3e6d5d…`, run `b3df56eb…`                                                                    | `export/final/f06-orin.glb`                                                                                        |

An earlier attempt to rig m10's FBX directly (job `be0374a4…`) failed and was refunded.

## Decisions

- **2026-10-31, Mike:** supplied the sheets; "There are 2 based on Ada but i think they can be different characters." "Run whatever tests you want on these now. Spend whatever you want. Full permission to do everything."
- **Decision B (delegated for the proof):** Meshy for Sela, Jessa, Ada and Mara, for truer colour and one texture; Tripo for Orin, for his blue-grey (m16, the front-facing remake of m10).
- **Decision C:** open. Mike has not accepted or sent back any model.

## Interpretations

- **Which sheet is whom:** c03 is Ada, from her own description. c04, the second Ada-based sheet, is Mara Reed: the satchel and mending tools match her authored story.
- **Props removed** from every view, as separate game items (see the table above).
- **Pose:** Ada's crossed arms and the sheets' relaxed poses became a 40° A-pose.
- **Height:** all five at the look's 1.85 m adult modelling height.
- **Clips:** Meshy library `Idle` (ID 0) and `Run_02` (ID 14), already in place; no hand animation.

## Construction and sources

| File                | Triangles | Texture   | Rig                              | Clips                    | Bytes     |
| ------------------- | --------- | --------- | -------------------------------- | ------------------------ | --------- |
| `f01-sela-tern.glb`   | 42,949    | one 2048² | 24 bones, 4 influences, 1.85 m | `Idle` 4.0 s, `Run` 0.7 s | 5,980,284 |
| `f02-jessa-cairn.glb` | 44,318    | one 2048² | same                           | same                     | 5,928,240 |
| `f03-ada.glb`         | 44,163    | one 2048² | same                           | same                     | 5,542,432 |
| `f04-mara-reed.glb`   | 45,407    | one 2048² | same                           | same                     | 5,201,584 |
| `f06-orin.glb`        | 16,234    | one 2048² | same                           | same                     | 1,621,736 |

- **Settings used:** Meshy `--should_texture true --pose_mode a-pose --topology quad --should_remesh true --target_polycount 20000 --seed 11`. Tripo m06–m10 `--geometry_quality detailed --orientation align_image --quad true --face_limit 20000`; m13–m16 as described above with `--face_limit 17000 --pbr false`. Rigging `--height_meters 1.85 --enable_animation true --animation_action_id 0` and `14`.
- **Tool commands:** `report`, `sheet models`, `normalize` and `clips` from [`art-tool.py`](../../../scripts/art/art-tool.py), as the [3D page](../../../docs/production-workflows/art-flows/3d-models.md) gives them. The run's helper scripts are in the archive under `work/recipes/`; the view prompts sit beside each view.
- **Review files** in `review/`: `finals-look-lineup.png` (in-game), `motion-sheet.png` (still, two run frames and idle per person), `look-sheet.png` (every candidate in game, beside its sheet), `finals-sheet.png` and per-person `normalized-*-sheet.png` (Blender), `look/` (viewer captures), `reports/` (measurements).

## Review and remaining gaps

**Observed:**

- **In the game's look,** all five carry their identity in large colour blocks and silhouette, closer to the mercenary than the stock fitted cast. Meshy kept the sheets' colours better than Tripo, except Orin's sleeves.
- **Ada and Mara read as the same person** at play distance: same rust overdress, grey skirt and build. This fails the "same thing" check between two named people. Making Mara distinct (a different dominant colour, her mending gear, a hood) is Mike's call.
- **Long garments split with the stride** in `Run` on all five (skirts, surcoat, cloak), because automatic weights bind them to the legs. They need hem reweighting or skirt bones before acceptance.
- **Budgets:** the Meshy models are 7–14% over the 40,000-triangle body budget (Meshy's 20,000 target counts quads; ask for 17,000). Orin is within every budget.
- **Rig and clips:** every rig is a correct 24-bone humanoid with the face toward glTF +Z, except the rejected f05; all clips keep their 30 fps keys with continuous rotations.
- **Clean views beat cropped sheet views** (m04 against m11, m05 against m12) for 11 credits per person.

**Not done:** the formal play checks, independent critique and matched-scale fidelity comparison; Mike's acceptance; game integration; the wrapped-family test and the state-sheet prop that AF07 also names.

**Cost** (Higgsfield Plus credits at $0.039–0.049 each; balance 903.75 before, 394.75 after):

| Batch                                                     | Credits | Dollars     |
| --------------------------------------------------------- | ------- | ----------- |
| 22 views (20 plus two redone side views) at 2.75          | 60.5    | $2.36–2.96  |
| 7 Meshy candidates at 30                                  | 210     | $8.19–10.29 |
| 5 Tripo candidates with quad at 16.5, 4 without at 15     | 142.5   | $5.56–6.98  |
| 12 rigging jobs at 8 (one failed job refunded)            | 96      | $3.74–4.70  |
| **Total**                                                 | **509** | **$19.85–24.94** |

One finished person on the route this run settled (four views, one Meshy candidate, two rigging jobs) costs about 57 credits, $2.20–2.80. Generation ran from 22:09 to 23:18 UTC; Mike's involvement was supplying the sheets.

## Resume

- **Private archive:** a `study` revision in `art-studies` / `curated-private`, evidence `owner-authorized-character-sheet-proof-2026-10-31` (Mike's chat request above), uses `private-study`, `source`, `offline` and `recovery`.
  - Owner `collection/openlegend-curated`, asset `character-sheet-proof-2026-10-31`.
  - Revision `sha256-2c937d43a1c704b98393ab495485bdc5f6130d2701d55e6af5176a5d70b34af8`, manifest SHA-256 `32d2c869c8ecc1fe43c0c92f01c792c80c5bf48e60e58bdacaac8985bc441c02`.
  - Publication operation `character-sheet-proof-2026-10-31-private`; 199 files, 338,760,769 bytes; exact list in [archive.index.json](archive.index.json).
  - Provider job records and error logs were left out as private operational receipts; they remain in the workstation folder `~/Documents/ChatGPT/OpenLegend-art/2026-10-31-character-sheet-proof/study/`.
- **Fetch** into a new folder with the main checkout's asset authority and the AWS sign-in ([asset workflow](../../../docs/asset-workflow.md#edit-or-generate-art)): `pnpm assets workspace --index art-direction/studies/2026-10-31-character-sheet-proof/archive.index.json --all --output <new folder>`.
- **Open decision:** Mike accepts, sends back or drops each of f01–f04 and f06, and decides how Mara should differ from Ada.
- **Next stage, once accepted:** fix the long-garment weights, request 17,000-quad remakes if the triangle budget holds, then add a study catalog entry or integrate as a separate request.
