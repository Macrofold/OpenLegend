# AI asset prompting: evidence and OpenLegend application

Research date: November 5, 2026. Scope: art direction, concepts, model inputs, materials, motion and reusable art instructions; not game-feature implementation. This record separates public observations, project-specific recommendations and unperformed qualification. The maintained procedure is [art prompt direction](../../../docs/production-workflows/art-flows/prompting.md); [remaining intake and verification](../../../docs/maintainers/art/prompting-and-library.md) has one progress owner.

## Coverage and evidence limits

Reviewed relevant public Create with Mark guides/catalog descriptions and primary provider documentation linked below. The authenticated library's individual paid skills, build files, prompts, dependencies and walkthroughs were not retrieved in this investigation. No original paid archive was downloaded, no proprietary prompt was imported, and no visual generation experiment was run. Public descriptions do not stand in for reading the purchased contents.

An earlier browser reading of the library landing page reported 266 builds and seven skills; the public sales page advertises 250+ builds and seven skills. These are different snapshots, not a reconciled current inventory. Do not infer that every advertised build is a distinct technique or that the whole library has been reviewed. A complete intake must enumerate the actual accessible items and mark read, excluded, unavailable and archived states individually.

## What the character comparison actually supports

Mark's [public skills guide](https://www.createwithmark.co/claude-skills/) identifies its before/after images as captures from different builds. It describes skills as packages that can contain instructions, examples, tools and assets. His [game-building guide](https://www.createwithmark.co/build-games-with-ai/) describes reusable body, head, hair, outfit and animation resources rather than merely replacing a weak sentence with a strong sentence.

**Interpretation:** the improvement may combine better source geometry, references, reusable construction, compatible motion and better instructions. The public comparison does not isolate exact wording or establish an expected OpenLegend improvement. Copying only a skill's prose may discard the mechanism that made it work. Conversely, copying its whole game framework imports unrelated assumptions and is not needed for this art task.

The applicable principle is to preserve a successful art recipe's necessary inputs and constraints, not just its final prompt. Our existing [3D route](../../../docs/production-workflows/art-flows/3d-models.md) already separates sources, geometry, materials, rigs and clips; the new prompting guide makes that distinction explicit when directing an agent or provider.

## Publicly advertised skills: art relevance, not completed intake

The [bundle catalog](https://www.createwithmark.co/bundle/) advertises the following seven packages. Each paid package remains unread; these dispositions apply only to the advertised scope.

| Package | Art-focused disposition |
| --- | --- |
| Game Character Kit | Highest relevance: investigate form, modular parts and compatible motion. Do not assume its bodies fit our direction or license. |
| Dark Crawler Kit | Inspect material/scene craft selectively; do not adopt its engine or bake a dungeon's lighting into our surface colours. |
| Voxel World | Possible composition and variation lessons; voxel construction is not our accepted visible style. |
| Doom Skill | Retain only transferable staging or asset-process lessons; retro rendering is not the target. |
| Retro VGA RPG | Low direct art-pipeline fit; avoid replacing our 3D direction with a retro presentation. |
| FPS Kit | Potential hand/contact and motion references; first-person weapons are not a mandate for our game. |
| Game Workbench | Look for useful visual inspection/reuse practices; game tooling and feature implementation are outside this task. |

## Primary-source findings

The following are bounded summaries, not copies of provider recipes. Documentation describes a capability or recommendation; it does not prove quality, reliability, cost or speed on our assets. Provider versions and access surfaces must be checked when used, without automatically replacing the existing roster.

### Image direction and precise edits

**OpenAI — [image prompting](https://developers.openai.com/api/docs/guides/image-prompting).** Its guidance separates subjects, composition and constraints, assigns reference roles and distinguishes changed details from preserved details. It warns that repeated edits can still alter protected areas; pixel-identical preservation can require compositing. It also distinguishes an actual alpha channel from a drawn background pattern. **Application:** explicit identity/material roles, focused repairs and output inspection. These are original OpenLegend instructions, not a copied vendor prompt pack; photorealistic examples do not set our style.

**OpenAI — [image-generation tool](https://developers.openai.com/api/docs/guides/tools-image-generation).** The documented tool can revise the submitted prompt and expose that text as `revised_prompt`. **Application:** record the authored instruction and the available actual/revised instruction separately. Do not assert exact wording reached a model when the platform hides or rewrites it. This does not imply every image service exposes the same field.

**Midjourney — [Style Reference](https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference), [Omni Reference](https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference) and [Edit Model](https://docs.midjourney.com/hc/en-us/articles/48495453462797-Edit-Model).** Style conditioning and subject identity have different purposes. The current Edit Model documentation describes multi-image editing for versions 8.1/8.2, replacing older character/omni-reference functionality there, and notes incompatible features such as tiling. **Application:** select the reference mechanism supported by the exact model instead of copying old parameter strings. Our existing concept-art owner and tool roster retain authority; this research does not migrate them.

### Image-to-model preparation and defect diagnosis

**Meshy — [prompt guide](https://help.meshy.ai/en/articles/11972484-meshy-prompt-guide-best-practices-and-templates-by-asset-type).** Subject, properties and style are separate prompt concerns; the current guide says negative prompts are unsupported. It also describes retirement of its Text to 3D interface tab in favour of an Agent path. That is not evidence that every API or intermediary changed. **Application:** check the specific route, describe a positive target and decline irrelevant style suggestions. Its photorealistic, low-poly and cinematic examples are not adopted.

**Meshy — [prompt drift and bad generations](https://help.meshy.ai/en/articles/15723825-how-to-fix-bad-meshy-generations-and-prompt-drift).** This article identifies conflicting descriptors and overlong prompts as failure sources, but recommends negative prompts elsewhere. That conflicts with the prompt guide above. **Application:** do not turn this inconsistency into a universal rule. Verify the actual supported field before use; do not repeatedly retry an unsupported instruction. Its seed advice is not a guarantee of reproducibility across versions.

**Meshy — [Image to 3D](https://help.meshy.ai/en/articles/9996860-how-to-use-meshy-image-to-3d).** Input preparation, model review, texturing and remeshing are distinct parts of the workflow. **Application:** fix geometry defects in geometry or its source views, not with more painted detail. Reuse our clean-reference and clay/model checks instead of adding a second preparation pipeline.

**Tripo — [Image to 3D](https://www.tripo3d.ai/product-doc/model-generation/image-to-3d).** The provider recommends clear single-subject inputs and diffuse lighting, and notes that unseen surfaces must otherwise be inferred. It distinguishes high-detail generation from controllable-topology paths and says its documented image route does not take text input. **Application:** improve the actual supplied image and select real supported controls; do not assume a lengthy text prompt affects a route that does not consume it. Keep the existing prototype's one-view default unless the subject or fidelity requirement warrants more.

**Tripo — [multi-view generation](https://www.tripo3d.ai/product-doc/model-generation/multi-view-to-3d) and [texture API](https://developers.tripo3d.ai/en/models/texture).** Multi-view input and texturing are separate operations with their own inputs. **Application:** consistent views must represent one object, and a texture-only repair should retain accepted geometry when the selected route supports that operation. Additional views are not automatically useful if they disagree.

### Material and motion boundaries

**Adobe — [Bitmap2Material parameters](https://helpx.adobe.com/substance-3d-b2m/desktop/parameters.html).** This older technical reference describes removing lighting information and manipulating material outputs. **Application:** distinguish surface colour from illumination and verify the maps actually delivered. It is supporting material knowledge, not a recommendation to adopt an old product or a claim about a current generation model.

**Adobe — [Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html).** Its documented auto-rigging is for bipedal humanoids, with restrictions on appendages, pose, disconnected geometry and scene contents. **Application:** a humanoid animation demonstration does not qualify wildlife, unusual creatures or arbitrary clothing. Retargeted motion still needs to be inspected on the actual body. This is compatibility evidence, not a new default rigging tool.

## Applying the evidence to the current OpenLegend look

The [current direction](../../decisions.md#current-direction-at-a-glance) and [creative brief](../../final-board/creative-brief.md), not the sources above, own these requirements: grounded stylized plain 3D, convincing proportions and construction, painted-looking material groups, sculpted faces and hair, and rejection of visibly faceted, toy-like and chibi results. The Quaternius stylized textured anchor is not permission to adopt its rejected flat low-poly families. Previously rejected visible MakeHuman/MPFB bodies remain rejected; a hidden rig/layout use is a different decision. No human family is qualified by this research.

The practical changes are in directing inputs, not changing that look:

- **People:** name specific identity/form requirements and retain the accepted source; inspect real facial relief rather than texture-painted facial detail. Preserve the existing separate-body/clothing design boundary. A compelling clothed illustration is useful concept art, not proof of removable garments.
- **Props and architecture:** explain joins, openings and material transitions. Exact parts, pivots and dimensions remain authoring/export work; do not spend repeatedly asking a texture generator to create them.
- **Plants and places:** use shape, growth, scale and grouped detail to communicate the intended design. Scene lighting and composition references may be useful while their voxel, retro or permanently gloomy presentation is not.
- **Materials and motion:** isolate the defective layer, keep accepted work and reuse compatible outputs. A more polished image or video is not automatically a better runtime asset.

These are applications of existing direction, not new world laws. No gameplay mechanics, character cognition, runtime generation, renderer defaults, asset budgets or production tool defaults change.

## Wording, reuse rights and private preservation

The publisher's [terms](https://learn.marketwithmark.com/legal/terms.html), last updated July 27, 2026 and inspected November 5, permit personal project use/adaptation and publishing created work, but prohibit redistribution of source prompts/files and scraping or bulk downloading. Public repository publication of paid source material is therefore not assumed permitted. Franchise-inspired examples also do not supply rights to third-party characters or designs.

Use an authorized publisher-provided export or obtain the required permission before attempting a whole-library archive. Review permitted downloads without executing bundled scripts. Preserve original bytes, the complete required folder/dependencies, source/version, license, retrieval date and checksums in a private location outside Git. An optional Markdown reading copy must not replace originals. Verify the local files and backup before claiming preservation; a manifest alone is not an archive. Never retain access tokens or credentials in public documentation.

In the public repository, write original transferable instructions and cite their sources. Exact proprietary wording and dependency-sensitive examples stay private unless redistribution permission is established. Do not claim that paraphrasing retained identical model behaviour. Our own accepted prompts should be preserved exactly with inputs and settings through the existing study record.

## Qualification before changing defaults

New prompt/provider/asset-package combinations remain experiments until assessed on suitable OpenLegend material. A useful bounded comparison uses the same approved brief, source images, selected quality path and output requirements. Compare a baseline with one proposed change; inspect identity and form, then the relevant exported artifact. Record correction effort, elapsed time and actual charges as well as visual preference. A different mesh, reference, renderer and prompt all changing together cannot establish a wording-only benefit.

Use existing studies and AF07/AF08 evidence where applicable. Do not create a new mandatory benchmark on every art request, add extra candidates to prototypes, rerun unchanged work or promote a source from attractive marketing alone. No comparison was executed for this research, and no quality, performance or cost improvement is claimed.
