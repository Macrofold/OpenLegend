# Tools and defaults

Which platform and model each stage of the [art workflow](README.md) uses, how to run it, what it costs and how to recover a job. Everything on this page is volatile: model names, prices and options change monthly. Each section gives the date it was last checked. **Before relying on a value, check it again** (`higgsfield model get <id>`, the vendor's pricing page) and update this page when it has changed. The workflow pages never name a model; only this page does.

## Presets and overrides

| Preset               | Meaning                                                                                                                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `standard` (default) | Every stage uses the [default roster](#default-roster). Image and geometry generation use Higgsfield; missing compatible human motion uses the qualified [human-motion route](#human-motion-generation). "Regular", "manual" and "standard" all mean this.                                                                                                      |
| `higgsfield`         | Keeps Higgsfield for its supported image, geometry and rigging stages. It does not silently override the shared motion-source order; an explicit motion-source request can do that.                                                                                                                                                                                                                      |
| `both`               | A comparison of Higgsfield against direct routes, from one frozen input set ([comparisons](README.md#8-compare-tools-or-methods)). The direct side uses the OpenAI Images API for 2D and an authorized direct 3D account; a stage with no authorized direct route is excluded, and the record says so. |

**Overrides.** A request may name a platform or model for any stage: "concepts with Nano Banana Pro", "3D with Tripo", "views with Seedream". The named tool replaces that stage's default only; every other stage keeps the preset.

- If the named tool is reachable through an already-connected platform (many are on Higgsfield), use it there.
- If it needs an account, key, plan or installation that is not set up, prepare everything else and ask Mike. Never sign up, buy, install an unreviewed tool or reuse a credential authorized for something else.
- If a name is ambiguous ("Banana"), use the closest current model on a connected platform and say which.
- Label a mixed route honestly: in a comparison, never substitute another generator and still call the result single-platform.

## Default roster

Checked 2026-10-31. "Connected" means usable today without new accounts or keys.

| Stage                           | Default                                                                                                                                                                                                                                                                                                                    | Alternatives you can name                                                                                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Concept images                  | **GPT Image 2.5 on [Higgsfield](#higgsfield)** (`gpt_image_2_5`, quality `high`, `2k`)                                                                                                                                                                                                                                     | Nano Banana Pro, Nano Banana 2, Seedream 5.0 Pro, FLUX.2 on Higgsfield; the [OpenAI Images API](#openai-images-api) or the host's built-in image tool when named; Midjourney ([manual only](#midjourney)) |
| Reference views and image edits | **GPT Image 2.5 on Higgsfield**, editing with the concept and accepted views as references                                                                                                                                                                                                                                 | **Seedream 5.0 Pro** on Higgsfield (faces, character sheets); Nano Banana Pro on Higgsfield (up to 14 references)                                                                                         |
| Image to 3D                     | **Three candidates on Higgsfield** (connected) on the full path: two from Multi-Image to 3D (Meshy) with different seeds, one from Tripo H3.1 Multiview; **one Meshy candidate** on the simple path ([details](#image-to-3d))                                                                                              | Hunyuan3D v3 and Meshy 7 single-image on Higgsfield; direct Meshy, Tripo, fal.ai models ([opt-in](#other-platforms-opt-in))                                                                               |
| Library sources                 | [Approved sources](#library-sources)                                                                                                                                                                                                                                                                                       | Other CC0 or properly licensed sources, after rights review                                                                                                                                               |
| Cleanup, normalization, export  | **Blender 5.2.2** ([details](#blender)), with recipe scripts beside the work                                                                                                                                                                                                                                               | —                                                                                                                                                                                                         |
| Human rig                       | The family rig: the MPFB body with its Mixamo or GameEngine rig, chosen in the proof run ([OD3](../../projects/art-workflow-feature-spec.md#od3--the-humanoid-body-family-and-rig-for-the-cast)); for a distinctive humanoid, **3D Rigging** on Higgsfield applied to the picked candidate ([rigging](#rigging-and-clips)) | Mixamo or AccuRIG ([manual](#other-platforms-opt-in)); hand-built in Blender                                                                                                                              |
| Nonhuman rig                    | Blender's bundled **Rigify** templates (basic quadruped, horse, cat, wolf, bird, shark) or a hand-built armature                                                                                                                                                                                                           | Tripo's creature rig types (direct Tripo, opt-in)                                                                                                                                                         |
| Clips                           | Suitable existing clips first; Kimodo for missing compatible human motion after qualification; library or Blender authoring for other cases ([procedure](animation.md), [readiness](#human-motion-generation))                                                                                                                                                                               | Meshy library reuse; Mixamo (manual); explicit alternative motion services ([access](#other-platforms-opt-in))                                                                                                                              |
| UI composition and typography   | **Claude Design** ([notes](#claude-design))                                                                                                                                                                                                                                                                                | A native layout or vector tool, or a source preview                                                                                                                                                       |
| Review sheets                   | [Image and turntable sheets](#review-sheets)                                                                                                                                                                                                                                                                               | —                                                                                                                                                                                                         |
| Look check                      | The game's [study viewer](../../asset-workflow.md#inspect-in-a-browser-and-use-files-in-the-game)                                                                                                                                                                                                                          | —                                                                                                                                                                                                         |
| Preservation                    | `pnpm assets` ([asset workflow](../../asset-workflow.md#publish-an-exact-revision))                                                                                                                                                                                                                                        | —                                                                                                                                                                                                         |

The October 31, 2026 Higgsfield choice still applies to image and geometry generation ([OD1](../../projects/art-workflow-feature-spec.md#od1--default-generation-platform)). The November 4 motion decision adds the conditional Kimodo default below; it does not replace geometry, rigging or existing clips. Higgsfield's terms let it train on uploads ([rights and data](#image-to-3d)); a design Mike wants kept private goes through a route he names for it.

**Settings to state explicitly every time** (defaults are often wrong for art):

- **GPT Image 2.5:** quality (Higgsfield defaults to `low`), resolution (defaults to `1k`), aspect ratio, background (`opaque` or `transparent`), and variant (`flare` or `sunburst`).
- **Nano Banana Pro:** resolution and aspect ratio.
- **Seedream 5.0 Pro:** resolution, aspect ratio and background removal.
- **Image to 3D:** texture (Meshy multi-image defaults to untextured), pose mode, topology and polycount and, when rigging, the real height.

**A typical character run** on these defaults, priced from the October 31 proof run's actual charges: four views at about 11 credits (plus about 3 for each view redone), two Meshy candidates at 30 each, one Tripo candidate at 15, and a rig at 8 (one rigging job; `Walk` and `Run` come from the motion study's clips at no cost). That is about 95–110 credits, roughly $3.70–5.40 at the Plus plan's value, inside the $10 ceiling; three concepts add about 8. On the [simple path](README.md#quality-the-simple-and-full-paths) the same person costs about 38 credits (roughly $1.50–1.85): one Meshy candidate from the sheet's front view at about 30 (the charge measured with four views; one image is not yet measured) and the rigging job at 8, or about 30 for a static model; a generated front view adds about 3. Record the real charges rather than trusting this estimate ([the proof run's record](../../../art-direction/studies/2026-10-31-character-sheet-proof/README.md) shows how).

## Estimate and record cost

- **Before each paid batch,** estimate it and add it to the task's running total against the [$10 ceiling](README.md#6-spending).
- **Higgsfield:** `higgsfield generate cost <model> [same options as create]` prints the credits without creating a job. Local image paths are uploaded to estimate, so only estimate with images you are about to use. `higgsfield account status` shows the balance; record it before and after each batch, and `higgsfield account transactions` gives the exact charges afterwards.
  - The estimator does **not** support `multi_image_to_3d` or `3d_rigging` (checked 2026-10-31); use the figures below and read the real charge from the transactions afterwards.
  - **Dollar value:** Plus is 1,200 credits a month for $59 billed monthly or $47 a month billed annually, about **$0.039–0.049 per credit** ([pricing](https://higgsfield.ai/pricing), checked 2026-10-31). Credits do not roll over.
  - The plan's unlimited and free generations do not apply to CLI or MCP use; every CLI job spends credits.
- **OpenAI Images API:** charged per image by model, quality and size on OpenAI's [pricing page](https://platform.openai.com/docs/pricing). The [direct-method study](../../../art-direction/studies/2026-10-18-interface-direct-method/README.md) spent $1.90 for 36 GPT Image 2.5 requests. Record the request count and the reported usage.
- **Plan quotas:** Claude Design uses Mike's claude.ai plan quota; record the share used when visible. Blender, the asset tools and library sources cost nothing to run.

Higgsfield credit costs (checked 2026-10-31 with the CLI estimator and the account's own charges; 1:1 aspect):

| Model                                               | Credits                                                                                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| GPT Image 2.5 (`gpt_image_2_5`)                     | low 1K 0.25 · medium 0.5 · high 1K 1.5 · **high 2K 2.75** · max 4K 15                                                   |
| Nano Banana Pro (`nano_banana_pro`)                 | 1K or 2K 2 · 4K 4                                                                                                       |
| Nano Banana 2 (`nano_banana_flash`)                 | 1K 1.5 · 2K 2 · 4K 3                                                                                                    |
| Seedream 5.0 Pro (`seedream_v5_pro`)                | 1K 1.25 · 2K 2.5                                                                                                        |
| FLUX.2                                              | Pro 1K 1 · Max 2K 6                                                                                                     |
| Multi-Image to 3D (`multi_image_to_3d`)             | Not estimable; **charged 30** textured with quad remeshing (four views, 2026-10-31)                                     |
| 3D Rigging (`3d_rigging`)                           | Not estimable; **charged 8** per job with one library clip; a failed job was refunded                                   |
| Meshy 7 Image to 3D (`meshy_v7_image_to_3d`)        | textured 38 · untextured 25 · with rig 44 · rig and clip 47.5                                                           |
| Tripo H3.1 Multiview (`tripo_h3_1_multiview_to_3d`) | 9 · detailed geometry 15 · detailed texture 12 · both 18 · quad adds 1.5 (detailed geometry with quad was charged 16.5) |
| Hunyuan3D v3 (`hunyuan3d_v3_image_to_3d`)           | 11 · with PBR 15 · geometry only 7                                                                                      |

## Recover a job

- **Higgsfield:** `higgsfield generate list` shows recent jobs; `higgsfield generate get <job_id>` shows one; `higgsfield generate wait <job_id>` waits for it and prints the result. Never resubmit while a job's status is uncertain. Download results immediately: provider storage is temporary (Meshy keeps API outputs for 3 days), and links expire.
- **OpenAI Images API:** requests are synchronous. A timed-out request may still have been charged; record it as uncertain, check the usage dashboard, and do not repeat it blindly.
- **Claude Design:** a round sends no completion signal; check the canvas about every 4 minutes.

## Review sheets

- **Turntable sheet:** [`art-tool.py sheet models`](../../projects/art-workflow-tech-design.md#42-sheet-one-picture-to-compare) renders every candidate at one scale beside the look's reference figure (named in the [production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production)): orthographic front, right, back, left and three-quarter columns, named across the top, in plain clay and material colour. Pass `--fit-height` to compare raw candidates whose units differ. A model whose "front" column shows its back faces the wrong way; fix that before anything else.
- **Image sheet:** every candidate, labelled with its ID, at the same size on one neutral background, with the source first. Any layout tool or a short local script works (`sheet images` is not built). Save it as `review/<stage>-sheet.png`.
- **Look sheet:** captures from the [study viewer](3d-models.md#step-10--export-and-check-in-the-games-look), cropped to each candidate beside the source view and an existing person, show what the game will actually draw.

## Higgsfield

Checked 2026-10-31 with CLI 1.2.2, signed in on Mike's machine (Plus plan). Higgsfield supplies generation and editing; the workflow's coordinator still owns scope, inspection, preservation and the final result.

**Access.**

- **Use the existing session.** Reuse the signed-in CLI (`higgsfield account status`). If sign-in is needed, run `higgsfield auth login` and let Mike finish the browser step. Never request passwords or codes, and never store them in a record.
- **Prefer the CLI.** It is the established route; an official MCP connection or the website can serve when a host lacks it. A browser login does not authenticate the CLI.
- **Billing:** the separate pay-as-you-go developer API has its own USD balance and no 3D models. Do not buy plans or top-ups without Mike's authorization.
- **Optional skill:** the first-party [Higgsfield skill](https://github.com/higgsfield-ai/skills) is useful background; review and pin it before installing.

**Terms** (updated 2026-10-23): Higgsfield claims no ownership of outputs and does not restrict their commercial use; agent activity through the CLI counts as the account holder's own. Retention varies by plan, so download promptly ([terms](https://higgsfield.ai/terms-of-use-agreement)).

**Find models and options.**

- **List models:** `higgsfield model list` shows every model.
- **One model's options:** `higgsfield model get <id> --json` shows its parameters, enums and defaults. Read it before building a command, since defaults and IDs change.
- **Current IDs:**
  - Images: `gpt_image_2_5`, `nano_banana_pro`, `nano_banana_flash`, `seedream_v5_pro`, Flux 2.0 variants.
  - 3D: `multi_image_to_3d`, `tripo_h3_1_multiview_to_3d`, `meshy_v7_image_to_3d`, `hunyuan3d_v3_image_to_3d`.
  - Rigging: `3d_rigging`.
- **Avoid stale options:** do not use options that the underlying vendor has retired, such as Meshy's `lowpoly` model type (retired 2026-10-30).

**Limits found in use** (2026-10-31):

- **At most 8 jobs run at once** per account. Further submissions are refused with `rate_limit_reached` and not charged; submit in batches of 8 or fewer and resubmit only the refused jobs.
- **Uploads take images, video, audio and documents, not models:** `higgsfield upload create model.glb` fails ("Cannot detect media type"). A model reaches a later job, such as rigging, only as an earlier job's result URL.
- **An upload occasionally fails with HTTP 520;** repeating the same command worked.

**Images.**

```sh
higgsfield generate create gpt_image_2_5 --prompt "$(cat concepts/c01.prompt.txt)" \
  --quality high --resolution 2k --aspect_ratio 2:3 --background opaque --variant flare --wait
higgsfield generate create seedream_v5_pro --prompt "$(cat views/v01-back.prompt.txt)" \
  --image concepts/c02.png --image views/v01-front.png --resolution 2k --aspect_ratio 2:3 --wait
```

**References.**

- `--image` (an alias for `--image-references`) accepts a local path, an upload ID or a previous job ID. Repeat it for several references; Nano Banana Pro takes up to 14 and Seedream 5.0 Pro up to 10.
- Name each reference's role in the prompt (identity, material, palette, construction or composition) and change one thing per edit.
- Check whether a model treats a reference as style, identity or a start image before running dependent work.
- Never upload an undifferentiated pile of references, anything private, or a reference whose rights forbid it.

**Finishing tools.** Upscaling, layer separation and background removal are available. Upscale only outputs worth keeping, and inspect them again for altered ornament or invented detail. A "Layers" result is not proof of an editable layered source or clean alpha. If a required production format is not supported, keep the concept, finish it with another authorized tool, and record the limit.

**Canvas** (optional) saves a reusable node graph for repeated work: the brief and references feeding direction nodes, each anchor feeding its own edit nodes. Name it with the study ID, run only the needed nodes, and record the link plus a portable text recipe in the study record. A saved graph does not guarantee identical regeneration or an exportable source.

**Download and preserve.** Fetch originals and meaningful revisions from the finished job, then save them through the workflow's [preservation rules](README.md#9-preserve-and-resume). Publishing to a public Higgsfield profile is never required.

Sources (checked 2026-10-24 unless noted): [CLI and model catalog](https://github.com/higgsfield-ai/cli) · [agent connection](https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-connect-higgsfield-to-ai-agent) · [MCP and automated-generation billing](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-higgsfield-mcp) · [developer API](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api) · [Canvas](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas) · [assets and downloads](https://higgsfield.ai/creator-hub/help-center/getting-started/whats-in-my-higgsfield-account) · [Layers](https://higgsfield.ai/higgsfield-layers) · [pricing](https://higgsfield.ai/pricing) (2026-10-31).

## Image to 3D

On the full path the default makes three candidates from the same clean views ([Step 3](3d-models.md#step-3--make-clean-reference-views)): two from **Multi-Image to 3D**, which runs Meshy, and one from **Tripo H3.1 Multiview**, a different model whose mistakes differ. The simple path makes one Multi-Image to 3D candidate from its single image; Meshy candidates face the front as delivered, so the rigger can take it directly. Options checked with `higgsfield model get` on 2026-10-31.

**Multi-Image to 3D** (`multi_image_to_3d`):

| Option                                            | Use                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--image` × 1–4                                   | The clean views, **front first** (Meshy treats the first image as the front)                                                                                                                                                                                |
| `--should_texture true`                           | Required for a textured model and for rigging; it defaults to `false`. `--enable_pbr true` adds PBR maps                                                                                                                                                    |
| `--pose_mode a-pose`                              | Bodies (`t-pose` only when the rig route asks for it)                                                                                                                                                                                                       |
| `--topology quad` or `triangle`                   | Quad output is easier to clean and rig; triangle is lighter for rigid props                                                                                                                                                                                 |
| `--target_polycount N`, `--should_remesh true`    | Counts quads: 20,000 returned 40,700–45,400 triangles. Ask for **17,000** for a body under the 40,000-triangle budget. For a rigid prop under its 20,000-triangle budget, about 8,500 is the same ratio, not yet measured. Measure the result with `report` |
| `--symmetry_mode`                                 | Accepted, but Meshy has ignored it since May 2026; make asymmetry clear in the views instead                                                                                                                                                                |
| `--seed N`                                        | Vary between candidates; a seed does not reproduce identity across separate generations                                                                                                                                                                     |
| `--enable_rigging true --rigging_height_meters H` | An automatic humanoid rig at the real height (needs texture); prefer rigging the cleaned model with `3d_rigging` ([rigging](#rigging-and-clips))                                                                                                            |

Compared with Meshy's own API, this route cannot choose the Meshy model version, geometry resolution, texture resolution, image enhancement or output formats. Use [direct Meshy](#other-platforms-opt-in) when one of those matters.

**Tripo H3.1 Multiview** (`tripo_h3_1_multiview_to_3d`), measured on nine runs on 2026-10-31:

- **Facing and view order:** whatever `--orientation` says, the model comes back with the first image's view on its +X side in Blender. Front-first views (front, left, back, right, the order Tripo and fal document) therefore give a model facing sideways: fine for comparison or a static model (normalize with `--rotate-deg -90`), but it cannot be rigged ([rigging](#rigging-and-clips)). For a front-facing model, give the views as **left, back, right, front** with `--texture_alignment geometry`. With the default `original_image` alignment, that order textured the model almost black.
- **Format:** `--quad true` returns an FBX file (saved under a `.glb` name), which the rigger refuses. Leave quad off, the default, for a GLB.
- **Texture:** PBR is on by default and adds two more maps; three 2048-pixel maps total 12.6 million pixels, over the 8.4 million budget. `--pbr false` returns one base-colour map.
- **Budget:** `--face_limit 17000` returned about 16,000–16,500 triangles.
- **Quality:** `--geometry_quality detailed` and `--texture_quality detailed` for the finer versions.

**Hunyuan3D v3** (`hunyuan3d_v3_image_to_3d`) takes one image. Set `--face_count` explicitly, because it defaults to 500,000. `--polygon_type quadrilateral` gives quads, but only together with `--generate_type LowPoly` (a rule in the model's schema). Useful as a cheap shape check for props.

```sh
# zsh: keep each flag and path a separate word by using arrays. V is the study's views folder.
V=~/Documents/ChatGPT/OpenLegend-art/<study-id>/study/views
MESHY=(--image "$V/v01-front.png" --image "$V/v01-back.png" --image "$V/v01-left.png" --image "$V/v01-right.png")
# This order and geometry-aligned texture make Tripo's model face the front, ready to rig.
TRIPO=(--image "$V/v01-left.png" --image "$V/v01-back.png" --image "$V/v01-right.png" --image "$V/v01-front.png")
MESH=(--should_texture true --pose_mode a-pose --topology quad --should_remesh true --target_polycount 17000)
higgsfield generate create multi_image_to_3d "${MESHY[@]}" "${MESH[@]}" --seed 11 --wait --json
higgsfield generate create multi_image_to_3d "${MESHY[@]}" "${MESH[@]}" --seed 23 --wait --json
higgsfield generate cost   tripo_h3_1_multiview_to_3d "${TRIPO[@]}" --geometry_quality detailed --texture_alignment geometry --pbr false --face_limit 17000
higgsfield generate create tripo_h3_1_multiview_to_3d "${TRIPO[@]}" --geometry_quality detailed --texture_alignment geometry --pbr false --face_limit 17000 --wait --json
```

Submit at most 8 jobs at once, and save each job's JSON beside its download: the result URL inside it is what rigging needs.

**Rights and data** (checked 2026-10-31):

- **Higgsfield** lets you keep and use outputs commercially, but its terms let it train on uploads and outputs. The only way to stop future use is to delete the content or the account; Enterprise agreements are excluded. Whether the providers behind it (Meshy, Tripo and others) may train on routed content is not stated ([terms](https://higgsfield.ai/terms-of-use-agreement)).
- **Meshy (direct):** paid users own their outputs. Meshy may train on non-Enterprise content unless the customer opts out by emailing support@meshy.ai, with no stated drawback. API outputs are deleted after 3 days ([terms](https://www.meshy.ai/terms-of-use)).
- **Tripo (direct):** paid users have rights to their outputs, and Tripo does not train on their content ([terms](https://developers.tripo3d.ai/en/terms)).
- **OpenAI Images API:** does not train on API data by default and keeps it up to 30 days for abuse monitoring ([business data](https://openai.com/business-data/)).
- **Uploads:** never upload a reference whose license or privacy forbids it. [OD8](../../projects/art-workflow-feature-spec.md#od8--training-on-uploaded-art) covers how to handle designs Mike wants kept out of training data.

## Human motion generation

Checked 2026-11-04. **Kimodo is the selected default for new, missing compatible human motion.**
Reuse suitable existing clips first. This does not select a model/rigging provider for creatures or
replace a supplied character's rig. See [Animation authoring](animation.md) for the shared procedure
and the [NVIDIA research record](../../../art-direction/research/3d-pixel-worlds/nvidia-animation-2026-11-04.md)
for source links and release/access evidence.

**Execution status: unqualified.** The source adapter is planned in AF15; a successful bounded
provider/version/target-rig check is required in AF16 before the route is used as an operational
default. The current helper has no direct SOMA/BONES mapping or BVH import. No account, source
export, mapping or end-to-end target result is claimed by this design decision. Existing clip reuse
is independent of those tasks.

| Route | Intended use and status |
| --- | --- |
| Replicate `sprited/kimodo`, explicitly pinned SOMA-RP v1.1 | Preferred initial hosted candidate for AF16 because it can be called programmatically. Inspect and record the exact provider version and export contract; an account/key and authorized bounded spend are prerequisites. It is a third-party deployment, not NVIDIA's hosted production API. |
| Official Kimodo v1.2 | Optional self-hosted route and a later upgrade candidate. Its checkpoint, skeleton/export behavior, dependencies, hardware, license and target mapping require their own qualification. Never silently substitute it for the hosted v1.1 pin. |
| MotionBricks | Optional offline pose-conditioned transition authoring when a requested asset needs it. Bake and retarget the output through the same target checks. No runtime inference service is part of this workflow. |

The initial candidate pin is Replicate version
`17111248e89aa145d768cc1e5f7baae228f69d854b996b860becfee287379545`
for `Kimodo-SOMA-RP-v1.1`. Qualification starts with one natural-language segment of 2–5 seconds
(maximum 10 seconds), one sample, 100 diffusion steps and postprocessing enabled. Periods delimit
segments in this wrapper, so resolve a conversational request into one segment deliberately.
Use `output_delivery=individual`; the API returns an array of output URIs. Download and preserve
artifacts within one hour, retaining the prediction ID and status for polling/resume; an unknown
submission outcome is not permission to retry a paid job. Prefer BVH as the initial source to
inspect: the wrapper's GLB may contain animated empties without a Blender armature. These are
candidate settings and export risks, not evidence that the target adapter or route is qualified;
[tech design §11](../../projects/art-workflow-tech-design.md#11-nvidia-motion-authoring) owns the planned
normalization and mapping contract.

Prefer a repeatable CLI/API and headless conversion over requiring a Blender GUI plugin. Exact
commands and mapping implementation belong to [tech design §11](../../projects/art-workflow-tech-design.md#11-nvidia-motion-authoring)
and remain prospective until AF15 ships. If the hosted candidate cannot meet the export, license,
quality or cost requirements, report the specific failure and use an authorized available route;
do not describe the preferred candidate as connected or change the pin without recording the choice.

Keep provider charges and any self-hosted GPU/storage commitment inside the existing task budget;
check current pricing and retain settled cost plus outstanding commitments. Existing typical asset
cost examples assume their stated reused clips and do not include new motion-generation charges.
A successful prediction is not proof that retargeting or game export works.

Record model/code rights separately from the source motion and conditioning data. In particular,
MotionBricks' bundled BONES example motions are for nonproduction use; exclude them from shipped
assets and production motion sources. Preserve the applicable terms and the rights to the actual
inputs/output with the study. The research record holds the detailed license evidence.

## Rigging and clips

This stage supplies a needed rig and may include a useful library clip. For an already rigged model,
start with [Animation authoring](animation.md); do not rerig it to reach the new human-motion default.

**3D Rigging** (`3d_rigging`) rigs a humanoid at a given height and adds one library clip. Measured on five people on 2026-10-31:

```sh
URL=<the picked candidate job's result_url>; H=<height in metres from the brief>
higgsfield generate create 3d_rigging --model_url "$URL" --height_meters "$H" \
  --enable_animation true --animation_action_id 0 --wait --json     # Idle
higgsfield generate create 3d_rigging --model_url "$URL" --height_meters "$H" \
  --enable_animation true --animation_action_id 14 --wait --json    # Run_02
```

- **Input:** a GLB at a URL Higgsfield can fetch, in practice a candidate job's own `result_url`, because the CLI cannot upload models ([limits](#higgsfield)). So the **raw** candidate is rigged; cleanup afterwards must be weight-safe: local fixes only, no remeshing or retopology.
- **Facing:** the model must face the front (glTF +Z) **before** rigging. The rigger places the skeleton assuming that facing: a Tripo model turned sideways came back with its arm bones running through the chest. Turning the model afterwards cannot repair it. Meshy candidates face the front as delivered.
- **Format:** an FBX is refused (the job fails and is refunded); Tripo returns FBX when `--quad true` ([image to 3D](#image-to-3d)).
- **Output:** one GLB at the requested height with feet at 0, a 24-bone humanoid skeleton (root `Hips`, at most 4 influences) inside an armature scaled 0.01, and exactly the one requested clip, keyed at 30 fps and named like `Armature|Idle|baselayer`. A second job on the same model gives the same 24 bones with slightly different joint placement: 3–7 mm on average, but up to 6 cm at a knee hidden by a long skirt. Each job costs 8 credits.
- **Combine and name the clips** with [`art-tool.py clips`](3d-models.md#step-9--make-the-clips), which gives the game its `Idle` and `Run`.
- **Library IDs used:** `Idle` 0 (4.0 s loop) and `Run_02` 14 (0.7 s loop, already in place: about 1 cm of net travel). The [character motion study](../../../art-direction/studies/2026-10-31-character-motion/README.md) tried `Casual_Walk` 30 and `walking_2` 566 and gave the cast `walking_2` as its `Walk`; it travels forward, so it takes `--stride Walk`. A new rig gets these clips from that study's files with `clips` instead of a rigging job per clip. Browse others in the [animation library](https://docs.meshy.ai/en/api/animation-library) (about 680 humanoid clips) and record the ID used.
- **Requirements** from Meshy: a textured two-legged humanoid with clear limbs, at most 380,000 triangles; no animals ([Meshy rigging](https://docs.meshy.ai/en/api/rigging), checked 2026-10-31).
- **Long garments:** automatic weights bind long skirts and cloaks to the legs, so they split with each stride. Check them in the run and plan a fix for such characters ([skinning checks](3d-models.md#skinning-checks)).
- **Fallbacks** when a model cannot be rigged this way: rig in the generation call (`--enable_rigging true --rigging_height_meters H`, Meshy candidates only), Mixamo or AccuRIG (manual, opt-in), or a rig built in Blender.
- **Direct Meshy** (opt-in) merges up to 10 clips per request.
- **Nonhumans:** Blender's bundled Rigify (0.6.10 in Blender 5.2.2; enable it first, [Blender](#blender)) includes basic quadruped, horse, cat, wolf, bird and shark templates. Fit one, generate the rig, then weight-paint; export deform bones only. A humanoid rig is never renamed onto an animal.
- **Retargeting** shared clips onto a different skeleton has no built-in one-click tool in Blender 5.2. Between humanoid rigs, `art-tool.py clips` retargets in world space ([tech design](../../projects/art-workflow-tech-design.md#44-clips-give-a-rig-the-clips-the-game-plays)): it moved Meshy's library clips onto the mercenary's differently oriented rig, and with a `--bones` map onto the MPFB family rig, whose bone names and rest pose differ. Non-humanoid skeletons need bone constraints in a small script or an opt-in add-on (the free Rokoko plugin, compatibility with 5.2 unverified, or the paid Auto-Rig Pro Remap). The [human-motion default](#human-motion-generation) and [shared procedure](animation.md) govern missing motion; this existing library route remains usable for suitable clips.

## OpenAI Images API

Direct GPT Image 2.5 generation and editing, used by the [direct-method study](../../../art-direction/studies/2026-10-18-interface-direct-method/README.md). It needs an API key in the shell environment that Mike has authorized for art work; the game's AI key is not automatically authorized for art. Set the model, size, quality and background explicitly, and send references through the edit endpoint for views. Keep each prompt and the exact returned model ID in the record ([image generation guide](https://platform.openai.com/docs/guides/image-generation)).

## Blender

Blender 5.2.2 LTS at `/Applications/Blender.app/Contents/MacOS/Blender`; it is not on the shell path. Run scripts headless exactly like the existing recipes:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec \
  --offline-mode --python-exit-code 1 --python <script.py> -- <arguments>
```

- **Outputs:** scripts write only outside Git, through `external_output` in [`scripts/asset_workspace.py`](../../../scripts/asset_workspace.py); the [existing recipes](../../asset-workflow.md#run-the-existing-offline-recipes) show the pattern.
- **Built in:** factory startup enables the glTF (exporter 5.2.40) and FBX importers and exporters; OBJ is part of Blender itself. **Rigify is bundled but off**: enable it first, in a script with `bpy.ops.preferences.addon_enable(module="rigify")` or in Preferences → Add-ons (checked 2026-10-31). Workbench renders work in `--background` mode.
- **glTF export settings:** copy the ones the working human recipe uses ([`study_human_motion.py`](../../../scripts/study_human_motion.py)):

  ```python
  bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
      export_apply=True, export_animations=True, export_animation_mode='NLA_TRACKS',
      export_yup=True, export_skins=True, export_def_bones=True, export_force_sampling=True)
  ```

  - `export_apply` defaults to off, so set it.
  - `NLA_TRACKS` writes one clip per NLA track.
  - `export_def_bones` exports deform bones only, which keeps Rigify's many control bones out of the game.
  - The exporter's default of 4 influences matches the budget.
  - **Leave Draco and meshopt compression off.** The game configures no decoder for either, and the pinned PlayCanvas 2.22.2 cannot read meshopt.
  - **Animated exports need the provider's own frame rate,** as `art-tool.py`'s exports do: import clips at 30 fps for Meshy's library, because resampling at Blender's default 24 fps shortened a 0.7 s run loop to 0.67 s. Rotation keys need no sign repair; the pinned PlayCanvas makes each track continuous when it loads a clip.

- **Useful repair tools:** Voxel and QuadriFlow remesh, Decimate, Merge by Distance and weight painting. LoopTools is an online extension, not bundled, so it is unavailable in `--offline-mode`.
- **Interactive work** in the Blender interface is fine for an artist; record repeatable fixes as scripts.
- **No Blender MCP by default.** The official Blender Lab MCP add-on and the community `blender-mcp` both run arbitrary model-written Python without guards (the community one also sends usage telemetry unless disabled). Prefer headless scripts. An interactive MCP session needs Mike's explicit choice, a reviewed and pinned version, and telemetry off.

## Claude Design

The project's choice for interface composition, typography and design systems ([editable composition](profiles.md#editable-composition)). It runs under Mike's claude.ai plan. Give it the focused brief, real content, captures, component constraints and the contender's artwork. Retrieve editable exports and review images; a canvas link is navigation, not the archive. Check a running round about every 4 minutes.

## Midjourney

Manual only: its terms forbid automated access. Mike runs it himself when he wants it; agents prepare prompts with the [prompting guide](../../../art-direction/midjourney/README.md) and receive the images back as references. Record the version and parameters he used.

## Library sources

- **Approved for the current direction:** the sources the [production notes](../../../art-direction/decisions.md#how-the-current-look-changes-production) name.
- **Already acquired:** sources with exact provenance in the [source study](../../../art-direction/assets/source-study/README.md).
- **Rights:** record each source's license, attribution and whether it may be uploaded to a generator. Share-alike sources keep their license on derivatives, and a reference-only image is never a source.

## Other platforms (opt-in)

These need an account, key or manual step that is not set up. Use one only when Mike names it and provides access. Prices were checked 2026-10-31 and are vendor claims.

| Platform           | What it adds                                                                                                                                                                                                    | Cost and notes                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Meshy (direct API) | Model choice (`meshy-7.1`, Smart Topology `meshy-t2.5`), 4K geometry, 8K textures, image enhancement off, chosen formats, up to 10 clips per request, text-to-motion for bipeds                                 | Paid plan required for a key; textured multi-image about 30 credits (about $0.38–0.60 by plan); rig 5, clip 3               |
| Tripo (direct API) | Part segmentation and rig types for biped, quadruped, avian, serpentine and more, with engine skeleton presets (P2 native-quad generation is also on Higgsfield as `tripo_p2_image_to_3d`, about 34–40 credits) | 1 credit = $0.01; H3.1 multiview 20–50 credits; rig 25, retarget 10 per clip                                                |
| fal.ai             | One key for many models: Hunyuan3D v3.1 Pro (up to 8 views), TRELLIS.2 (MIT), Rodin Gen-2.5, Meshy 7.1, Tripo, Nano Banana, FLUX.2, Hunyuan Motion                                                              | Pay per call, e.g. Hunyuan3D v3.1 $0.375, TRELLIS.2 $0.25–0.35, Rodin $0.40, Meshy 7.1 textured $1.20, Hunyuan Motion $0.08 |
| Mixamo             | Automatic humanoid rigging and a large human motion library                                                                                                                                                     | Free with Mike's Adobe sign-in, manual in a browser, no API, humanoid only; record its terms                                |
| AccuRIG 2.0        | Free automatic biped rigging with engine presets                                                                                                                                                                | Desktop app with an ActorCore account; its motions are licensed separately                                                  |
| Cascadeur          | Physics-assisted keyframing, retargeting, quadruped autoposing on higher plans                                                                                                                                  | Indie about $8–19 a month; free tier exports only its own format                                                            |
| Uthana             | Human text-to-motion and automatic rigging                                                                                                                                                                      | Pay as you go, about $0.02–0.10 per second of motion                                                                        |

[OD2](../../projects/art-workflow-feature-spec.md#od2--a-second-3d-provider) records whether any of these should join the defaults.
