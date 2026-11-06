# Art prompt direction

Use this page when writing or repairing an art prompt, not as an additional production stage. The [art workflow](README.md) owns scope, quality, candidate counts, decisions and spending; [tools](tools.md) owns providers and settings; [profiles](profiles.md) and [3D models](3d-models.md) own deliverables and inspection. Nothing here sets the selected world's look or changes the simple path.

The examples are original, adaptable instructions, not imported vendor prompts or measured quality guarantees. [Research and source limitations](../../../art-direction/research/ai-asset-prompting/README.md) explain their basis. Read only the section needed for the current output.

## Detailed references for specific outcomes

When the task needs construction detail, the optional references below supply step-by-step methods and worked applications. Choose the relevant subject; do not preload the collection or add stages to a quick request.

| Outcome                                                  | Practical reference                                                                                                    |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Body, face, hair, creature or removable garment          | [Character construction and fitting](../../../art-direction/research/ai-asset-prompting/characters-and-clothing.md)    |
| Building, interior, landscape or a different world style | [Architecture and world construction](../../../art-direction/research/ai-asset-prompting/architecture-and-worlds.md)   |
| Tool, weapon, prop, grip or material                     | [Construction, contact and surface methods](../../../art-direction/research/ai-asset-prompting/props-and-materials.md) |
| Action, cloth, mechanism or visible work                 | [Motion and contact methods](../../../art-direction/research/ai-asset-prompting/motion-and-visible-work.md)            |
| Illustration, map, banner or visible drawing process     | [Illustration and mark-making](../../../art-direction/research/ai-asset-prompting/illustration-and-process.md)         |

Keep decisions that affect the actual result in the brief/provider operation: body and garment separation; important joins, openings and pivots; material structure; real contacts; and meaningful motion phases. A link alone is not a provider payload. The references retain deeper mechanisms and future design dependencies without selecting a new body family, feature or tool.

## Start with the current brief

Use the [shared brief](../production-process.md#start-with-the-current-brief) and
[operation procedure](../production-process.md#direct-the-operation) within the existing
stages. The purpose may be recognizing a returning person, reading a creature's preparation,
understanding an invented tool's construction or enjoying a beautiful place. A focused
repair can simply name its defect; it needs no new gameplay justification.

For new visual work, identify the forms, material contrasts, expressive poses or spatial
arrangements that could make the intended experience distinctive. For an existing result,
locate the issue in form, camera/presentation, material, motion or a capability the tool
does not supply. Use the relevant section below; extra detail or a longer prompt is not a
general repair. Better source meshes and compatible motion can improve a result independently
of wording. A screenshot of a finely drawn person does not prove a usable body, separate
clothing, a working rig or good deformation.

Translate the look and source locks into concrete visual descriptions and actual permitted
images for the provider. Dimensions, topology, editable parts, rig compatibility, clips,
material maps and export requirements remain checks on the files. Apply the existing
profile checks to the actual result and repair only the responsible source. Keep a quick
prototype quick: one suitable input and the selected candidate count, without an automatic
reference sheet, comparison campaign, polish pass, additional states or family qualification.
Observable readability or continuity supports an art judgment; whether an encounter or
repeated activity is fun needs gameplay evidence, not a provider's self-rating.

## Describe visible decisions, not a quality score

Lead with the subject and the particular result. Give distinguishing shape, construction and surface relationships, ordered by importance. Replace ambiguous praise with observations that can be checked: which edge changes the silhouette, how a strap joins, where a material changes, what part stays visually quiet, or which feature identifies the individual. Use the selected look's requirements, not a generic demand for realism, cinematic light, more polygons or maximum detail.

For example, an object's refinement instruction can identify a handle's open gap and attachment, the thickness of the rim and the direction of its grain. This is more actionable than asking for a better fantasy prop. It still does not specify a universal handle shape or invent an object's game function. Geometry, texture and lighting solve different problems: do not request new surface noise to compensate for missing form.

Work from the largest identifying forms to construction details, then surface finish. Spend detail on the surfaces and movements the intended camera exposes. Procedural construction can produce convincing forms; replacing a primitive with more primitives or more polygons is not evidence of improvement. Judge the contour, anatomy, joins and material response that the result actually shows.

The following is a brief-to-payload pattern, not a mandatory literal prefix:

> Produce [one named output] for [the current stage]. Its defining visible features are [the few features that matter]. Apply [the relevant look requirements]. Use [reference A] for [identity/construction] and [reference B] only for [material/palette]. Keep [specific accepted features]. Change or explore [the allowed dimensions]. Show [the view and presentation needed for this decision]. Exclude [only consequential unwanted elements].

Fill placeholders before execution. Remove irrelevant clauses. For a new design, leave meaningful creative freedom; for a repair, narrow it. When the source is absent, do not pretend to edit it or invent its details. Locate the approved source or expose the unresolved dependency under the workflow's existing decision rule.

## Give references distinct jobs

Apply the [shared reference procedure](../production-process.md#start-with-the-current-brief). Visual roles include identity, proportion, construction, surface, palette, composition and a defect to avoid. An admired lighting reference is not permission to copy its anatomy. A material reference is not a replacement character. Do not attach a giant moodboard by default.

Resolve conflicting references before downstream generation. Identify which accepted view governs the disputed feature. Keep left/right descriptions in the subject's coordinates, adding an image-edge direction when useful. Do not mirror an asymmetric garment, scar or hairstyle to manufacture a missing view.

For a reference-matching repair, first distinguish shape differences from presentation differences. Camera height, field of view, pitch, subject distance and scale jointly change apparent proportions. Compare under suitable matched conditions before deforming an accepted body to imitate perspective. This is a diagnostic within the existing fidelity check, not permission to change the game's camera or a requirement for extra prototype views.

Use the [clean-view procedure](3d-models.md#step-3--make-clean-reference-views) rather than writing another view standard here. A presentation illustration and a reconstruction reference have different jobs. A multi-view layout is not several independent image inputs until its views are separated for the selected tool; generated views must depict the same form rather than unrelated alternatives.

## Match the instruction to the operation

### Concept exploration

Ask for different solutions to an unresolved design question, not arbitrary detail changes. Use the workflow's selected number of candidates and approval points. A useful variation changes silhouette, construction or identity while holding accepted facts and the look constant. Do not claim that an illustrated mechanism already works in the game.

> Explore [the unresolved visual choices] within [the approved brief]. Keep [identity, scale relationships and look]. The allowed variation is [the meaningful design choices open for exploration]. Present the result so [the decision] is visible. Treat [unconfirmed feature] as a proposal, not established world content.

### Targeted image correction

Work from the exact accepted input, not a fresh textual reconstruction. Name the defect, replacement and protected areas. Check the changed region and its immediate boundaries, then the identity locks; do not demand an unrelated full production review for a small edit.

> Revise only [region] in image 1. The defect is [observable problem]. Replace it with [the intended visible relationship]. Preserve [identity, silhouette, pose, framing and material areas that are not being changed]. Reference 2 supplies only [its role]. Return the corrected version of image 1, not a redesigned subject.

An instruction to preserve pixels is not proof of pixel identity. For genuinely unchanged regions, use an appropriate mask or controlled compositing operation when available and inspect the actual result. Repeated whole-image regeneration can damage previously accepted details; return to the last sound input when necessary.

### Characters and creatures

The [3D route](3d-models.md#step-1--choose-the-build-route) owns the body, clothing, family and rig choices. A prompt must not bypass its restrictions on fused clothing, unaccepted family bodies or rejected visible sources. Use references that expose the specific anatomy or construction to be resolved. A close facial concept can guide form, but inspect the resulting geometry under the current direction's head check rather than accepting texture-painted relief.

Separate an identity change from an anatomy correction. Preserve approved age, build, distinctive facial structure, hair arrangement and asymmetry unless the brief changes them. For creatures, describe the relevant anatomical relationships and locomotion constraints rather than assuming a humanoid rig or borrowing a dramatic pose that hides the limbs. These are inputs to the existing checks, not a new character-generation authorization.

When a character holds or wears something, name the actual contact: which surface supports the palm, where fingers close, how a wrist bends and where the object clears the body. Evaluate the rendered hand, garment and prop together through the requested movement; a rig target reaching its coordinate does not prove a convincing grip or prevent intersecting meshes. An attractive dressed assembly does not establish a complete body under removable clothes.

### Props, structures and environments

Name the meaningful outline, construction joins, openings, movable parts and scale relationships. Generate or model separately what the consumer requires separately. Do not assume a generated image of a hinged lid delivers a separate lid mesh and usable pivot. Repeated modules and exact fitting dimensions may need the hand-modelled route already defined in the 3D procedure.

For an environment concept, distinguish composition from individual production assets. Describe large forms, focal areas, quiet areas and visible causes of variation. Keep accepted routes, scale and world facts fixed. A concept's water, wear or vegetation does not authorize new simulated conditions or traversable geometry.

Explain a place through construction and use: roof and wall forms, openings, circulation and the few objects that reveal an activity. A setting change may require different construction or plant forms as well as colour; only change what the brief authorizes. Inspect the relevant approach and normal camera: an aerial composition can be dominated by roofs while the same scene at eye level is dominated by walls. Where an approved object needs several depictions, reuse its defining shape and materials across held, ground and icon views instead of independently redesigning each.

### Material-only changes

Keep an accepted mesh when the defect is a surface problem. Specify material regions, direction and scale of visible structure, roughness intent and where wear plausibly belongs. Use the selected look's rules for lighting in surface colour; do not introduce a new material style through a tool example.

> Retexture the selected asset without changing its shape or part boundaries. Keep [locked palette and markings]. In [region], replace [the surface defect] with [the intended material structure]. Preserve [other material regions]. Follow the brief's lighting-in-texture requirements and inspect under the existing review lights.

A rendered material picture is not a set of coherent PBR maps. Tiling, alpha, normal orientation, channel meaning and supported texture budgets remain production checks where relevant. Select actual transparency/output controls when needed; a checkerboard painted behind an icon is not alpha. Do not promise seamlessness from the word alone.

For colour variants, identify the material regions allowed to change and preserve useful value structure, marks and material differences. A uniform tint can erase the distinctions between skin, cloth and metal or multiply already coloured shading. When a surface looks muddy, noisy or too dark, check texture scale, seams, colour multiplication and illumination before requesting additional painted detail. Apply one coherent material family across related parts.

For drawn or painted work, describe the marks that create the intended appearance: their direction along a form, edge softness, layering and contrast against the paper, cloth or other support. If the work develops visibly over time, retain recognizable proportions and identity through the intermediate states. Distinguish producing those marks from revealing an existing image; choose the process that serves the brief and describe the result honestly.

### Motion

Use a motion brief for the selected body and rig, not a request to generate a replacement character. Specify the action's readable intent, key contacts, timing, start/end states, loop or one-shot nature and allowed secondary movement. Reuse compatible clips first, as the existing workflow requires. A generated video is reference, not an animation clip delivered to the game.

> On [the selected rig], author or adapt [the requested motion]. Keep [the source body, proportions and attachment conventions]. The important contacts are [feet, grip or other contact]. Start at [pose], express [intent] through [key pose/timing], and finish at [pose or loop boundary]. Deliver the required animation data; identify any unsupported body or attachment rather than hiding it in a camera cut.

Make the meaningful phases visible: preparation, action/contact, release and settling as appropriate. If a hand draws, carries or uses a tool, coordinate its motion with the visible mark, load or contact; independent decorative motion can look disconnected even when both pieces animate. Feet need the actual support surface, and linked parts need a consistent phase relationship. Runtime consequences still come from the owning game state, never from the animation inventing an action or effect. Review the relevant transitions and loop boundary in motion; a contact sheet or successful counter cannot establish continuity. For a scrubbed animation study, revisiting the same time should show the same intended pose and event state.

## Adapt to the actual tool

Check only the capabilities used by this operation against the selected model and access surface: generation versus editing, reference roles/count, image-to-3D versus text-to-3D, masks, output format, topology controls and motion export. Web interfaces, APIs and intermediaries can differ. Keep version-specific syntax with [tools](tools.md), not in these generic examples.

Prefer a clear positive target. Use negative prompts only where that exact route supports them; do not paste another vendor's flags or a long exclusion list into an unsupported field. Do not let a provider's default style, resolution or topology label override the project's consumer contract. Provider marketing and example renders are not OpenLegend qualification.

## Preserve wording and learn without slowing ordinary work

Use the existing [study record](study-record.md) for the [shared prompt/source provenance](../production-process.md#keep-candidates-and-jobs-recoverable). Preserve the accepted wording when reusing a successful recipe; record focused changes rather than silently paraphrasing it.

Package a useful result as its smallest reusable unit: the original project instructions, approved reference, compatible editable source or parts, applicable rig/material requirements, a relevant failure example and evidence of the result. Keep payloads in the established asset storage, not Git, and do not install or execute an unfamiliar external skill merely because it is being reviewed. Public documentation must respect the source license; private paid originals are not public prompt templates.

Before adapting an external recipe, distinguish supplied instructions, finished assets, source assets, rig/clip data and executable helpers. Check the specific dependency that explains the desired result: a packed model does not imply its raw sources or working rebaker are included. Treat claimed test counts, screenshots and promotional comparisons as different kinds of evidence. Carry transferable art decisions into this workflow in original wording; leave incompatible styles, engine assumptions and unsupported numerical prescriptions with their source.

Ground repair instructions in the exact candidate and relevant view or moment. Confirm that a capture actually shows the named subject and defect, and label a representative sample as a sample. Record the observable correction and its evidence; a numerical self-rating is not a substitute for seeing the requested result.

For a proposed improvement, distinguish a hypothesis from demonstrated benefit. If a change would replace defaults or add meaningful cost, compare the current route with the candidate on a representative, already-authorized art task before promotion. Hold inputs and requirements constant, vary the relevant factor, and record accepted-output quality, identity preservation, repair effort, elapsed time and actual charges. Report a disappointing result honestly; do not turn every request into this comparison or keep spending until an arbitrary self-rating is reached. Existing budget and approval boundaries remain controlling.
