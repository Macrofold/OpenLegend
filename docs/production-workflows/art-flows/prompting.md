# Art prompt direction

Use this page when writing or repairing an art prompt, not as an additional production stage. The [art workflow](README.md) owns scope, quality, candidate counts, decisions and spending; [tools](tools.md) owns providers and settings; [profiles](profiles.md) and [3D models](3d-models.md) own deliverables and inspection. Nothing here sets the selected world's look or changes the simple path.

The examples are original, adaptable instructions, not imported vendor prompts or measured quality guarantees. [Research and source limitations](../../../art-direction/research/ai-asset-prompting/README.md) explain their basis. Read only the section needed for the current output.

## Start with the current brief

Translate the existing brief rather than asking Mike to fill another form. Resolve the subject, intended output, accepted reference, relevant look rules, identity locks, permitted changes and the defect or decision this step addresses. Omit fields that do not affect it. Keep a quick prototype quick: one suitable input and the already-selected candidate count, not an automatic reference sheet, comparison campaign or polish pass.

There are three different instructions:

- **Art direction for the agent:** what the asset means, what is already accepted, which source to build on, and what evidence will answer this task.
- **A provider payload:** only the visual information and supported controls needed for this image, mesh, texture or motion operation. Expand relevant local references into concrete descriptions and attach the actual permitted images; a provider cannot read a repository path named in prose.
- **Production checks:** dimensions, topology, editable parts, rig compatibility, clips, material maps and export requirements verified on the actual output. Asking an image model for these does not deliver them.

A screenshot of a finely drawn person does not prove a usable body, separate clothing, a working rig or good deformation. Likewise, better source meshes and compatible motion can improve a result independently of prompt wording. Diagnose the missing input or capability before adding adjectives. Do not substitute a rejected source merely because a tutorial or skill makes it convenient.

## Describe visible decisions, not a quality score

Lead with the subject and the particular result. Give distinguishing shape, construction and surface relationships, ordered by importance. Replace ambiguous praise with observations that can be checked: which edge changes the silhouette, how a strap joins, where a material changes, what part stays visually quiet, or which feature identifies the individual. Use the selected look's requirements, not a generic demand for realism, cinematic light, more polygons or maximum detail.

For example, an object's refinement instruction can identify a handle's open gap and attachment, the thickness of the rim and the direction of its grain. This is more actionable than asking for a better fantasy prop. It still does not specify a universal handle shape or invent an object's game function. Geometry, texture and lighting solve different problems: do not request new surface noise to compensate for missing form.

The following is a brief-to-payload pattern, not a mandatory literal prefix:

> Produce [one named output] for [the current stage]. Its defining visible features are [the few features that matter]. Apply [the relevant look requirements]. Use [reference A] for [identity/construction] and [reference B] only for [material/palette]. Keep [specific accepted features]. Change or explore [the allowed dimensions]. Show [the view and presentation needed for this decision]. Exclude [only consequential unwanted elements].

Fill placeholders before execution. Remove irrelevant clauses. For a new design, leave meaningful creative freedom; for a repair, narrow it. When the source is absent, do not pretend to edit it or invent its details. Locate the approved source or expose the unresolved dependency under the workflow's existing decision rule.

## Give references distinct jobs

Name the supplied inputs in their actual order and assign a role to each: identity, proportion, construction, surface, palette, composition or a defect to avoid. An admired lighting reference is not permission to copy its anatomy. A material reference is not a replacement character. Use accepted project outputs where they answer the question; do not attach a giant moodboard by default.

Resolve conflicting references before downstream generation. Identify which accepted view governs the disputed feature. Keep left/right descriptions in the subject's coordinates, adding an image-edge direction when useful. Do not mirror an asymmetric garment, scar or hairstyle to manufacture a missing view.

Use the [clean-view procedure](3d-models.md#step-3--make-clean-reference-views) rather than writing another view standard here. A presentation illustration and a reconstruction reference have different jobs. A multi-view layout is not several independent image inputs until its views are separated for the selected tool; generated views must depict the same form rather than unrelated alternatives.

## Match the instruction to the operation

### Concept exploration

Ask for different solutions to an unresolved design question, not arbitrary detail changes. Use the workflow's selected number of candidates and approval points. A useful variation changes silhouette, construction or identity while holding accepted facts and the look constant. Do not claim that an illustrated mechanism already works in the game.

> Explore [the unresolved visual choice] within [the approved brief]. Keep [identity, scale relationships and look]. The allowed variation is [one meaningful design axis]. Present the result so [the decision] is visible. Treat [unconfirmed feature] as a proposal, not established world content.

### Targeted image correction

Work from the exact accepted input, not a fresh textual reconstruction. Name the defect, replacement and protected areas. Check the changed region and its immediate boundaries, then the identity locks; do not demand an unrelated full production review for a small edit.

> Revise only [region] in image 1. The defect is [observable problem]. Replace it with [the intended visible relationship]. Preserve [identity, silhouette, pose, framing and material areas that are not being changed]. Reference 2 supplies only [its role]. Return the corrected version of image 1, not a redesigned subject.

An instruction to preserve pixels is not proof of pixel identity. For genuinely unchanged regions, use an appropriate mask or controlled compositing operation when available and inspect the actual result. Repeated whole-image regeneration can damage previously accepted details; return to the last sound input when necessary.

### Characters and creatures

The [3D route](3d-models.md#step-1--choose-the-build-route) owns the body, clothing, family and rig choices. A prompt must not bypass its restrictions on fused clothing, unaccepted family bodies or rejected visible sources. Use references that expose the specific anatomy or construction to be resolved. A close facial concept can guide form, but inspect the resulting geometry under the current direction's head check rather than accepting texture-painted relief.

Separate an identity change from an anatomy correction. Preserve approved age, build, distinctive facial structure, hair arrangement and asymmetry unless the brief changes them. For creatures, describe the relevant anatomical relationships and locomotion constraints rather than assuming a humanoid rig or borrowing a dramatic pose that hides the limbs. These are inputs to the existing checks, not a new character-generation authorization.

### Props, structures and environments

Name the meaningful outline, construction joins, openings, movable parts and scale relationships. Generate or model separately what the consumer requires separately. Do not assume a generated image of a hinged lid delivers a separate lid mesh and usable pivot. Repeated modules and exact fitting dimensions may need the hand-modelled route already defined in the 3D procedure.

For an environment concept, distinguish composition from individual production assets. Describe large forms, focal areas, quiet areas and visible causes of variation. Keep accepted routes, scale and world facts fixed. A concept's water, wear or vegetation does not authorize new simulated conditions or traversable geometry.

### Material-only changes

Keep an accepted mesh when the defect is a surface problem. Specify material regions, direction and scale of visible structure, roughness intent and where wear plausibly belongs. Use the selected look's rules for lighting in surface colour; do not introduce a new material style through a tool example.

> Retexture the selected asset without changing its shape or part boundaries. Keep [locked palette and markings]. In [region], replace [the surface defect] with [the intended material structure]. Preserve [other material regions]. Follow the brief's lighting-in-texture requirements and inspect under the existing review lights.

A rendered material picture is not a set of coherent PBR maps. Tiling, alpha, normal orientation, channel meaning and supported texture budgets remain production checks where relevant. Select actual transparency/output controls when needed; a checkerboard painted behind an icon is not alpha. Do not promise seamlessness from the word alone.

### Motion

Use a motion brief for the selected body and rig, not a request to generate a replacement character. Specify the action's readable intent, key contacts, timing, start/end states, loop or one-shot nature and allowed secondary movement. Reuse compatible clips first, as the existing workflow requires. A generated video is reference, not an animation clip delivered to the game.

> On [the selected rig], author or adapt [the requested motion]. Keep [the source body, proportions and attachment conventions]. The important contacts are [feet, grip or other contact]. Start at [pose], express [intent] through [key pose/timing], and finish at [pose or loop boundary]. Deliver the required animation data; identify any unsupported body or attachment rather than hiding it in a camera cut.

## Adapt to the actual tool

Check only the capabilities used by this operation against the selected model and access surface: generation versus editing, reference roles/count, image-to-3D versus text-to-3D, masks, output format, topology controls and motion export. Web interfaces, APIs and intermediaries can differ. Keep version-specific syntax with [tools](tools.md), not in these generic examples.

Prefer a clear positive target. Use negative prompts only where that exact route supports them; do not paste another vendor's flags or a long exclusion list into an unsupported field. Do not let a provider's default style, resolution or topology label override the project's consumer contract. Provider marketing and example renders are not OpenLegend qualification.

## Preserve wording and learn without slowing ordinary work

Use the existing [study record](study-record.md). Keep the exact authored prompt, available submitted or provider-rewritten prompt, selected model/route, meaningful settings, ordered input references, source revision and output IDs. Mark an unavailable submitted prompt as unknown. Preserve the accepted wording when reusing a successful recipe; record focused changes rather than silently paraphrasing it. A seed alone is not a reproducible asset.

Package a useful result as its smallest reusable unit: the original project instructions, approved reference, compatible editable source or parts, applicable rig/material requirements, a relevant failure example and evidence of the result. Keep payloads in the established asset storage, not Git, and do not install or execute an unfamiliar external skill merely because it is being reviewed. Public documentation must respect the source license; private paid originals are not public prompt templates.

For a proposed improvement, distinguish a hypothesis from demonstrated benefit. If a change would replace defaults or add meaningful cost, compare the current route with the candidate on a representative, already-authorized art task before promotion. Hold inputs and requirements constant, vary the relevant factor, and record accepted-output quality, identity preservation, repair effort, elapsed time and actual charges. Report a disappointing result honestly; do not turn every request into this comparison or keep spending until an arbitrary self-rating is reached. Existing budget and approval boundaries remain controlling.
