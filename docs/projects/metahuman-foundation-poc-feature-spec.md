# MetaHuman foundation proof — feature specification

| Status  | Current progress                                                                                    | Last updated |
| ------- | --------------------------------------------------------------------------------------------------- | ------------ |
| Blocked | The private Main pilot is complete; broader foundation work awaits the masculine coverage decision. | 2026-11-10   |

## Purpose

Determine whether MetaHuman can supply anatomically believable **complete heads and bodies** for OpenLegend, and whether a small exported kit can create further characters without running MetaHuman. This is a bounded feasibility proof: make one adjustment toward the approved athletic references, correct elbows, qualify one premade garment across representative shapes, then test one existing natural-looking hair-card style in the actual renderer. Perfect production anatomy, hair polishing and hairstyle-library expansion are outside this proof. An Unreal screenshot or functioning slider alone is insufficient.

Authorization covers private foundation evaluation and MHP07's one-NPC integration in existing Main. The normal art workflow, production selections and existing character pilot retain their own unfinished obligations. [Execution evidence](../verification/metahuman-foundation-poc.md) distinguishes native/source checks from actual-game qualification.

## Product decisions and relationship to the existing pilot

MetaHuman would be an **occasional foundation-authoring dependency**, not a service invoked for every NPC or player edit. The intended flow is:

```text
Occasional kit authoring:
MetaHuman → reviewed bodies/faces and deformation samples → portable OpenLegend kit

Ordinary character creation:
description → appearance recipe → kit evaluation + modular parts → character

Player customization:
presets + curated sliders → the same appearance recipe and kit evaluation
```

The proof tests the last two paths with manually supplied descriptions and deterministic recipes. It does not need another language-model integration. A preset stores choices and control values; it is not a restriction to a fixed mesh. Continuous interpolation between prepared shapes can support player sliders without porting the MetaHuman editor.

**Recommendation to the main task:** pause additional SAM/MHR anatomy sculpting, CC0 head fitting/grafting and wardrobe production dependent on those provisional bodies until the foundation comparison resolves. Preserve existing work and settle any already-dispatched operation. Independent, narrowly scoped motion or renderer fixes can still be useful, but do not expand them around an unselected foundation. This document does not actually pause that thread or cancel its obligations.

If successful, this route **replaces** much of the custom head/body foundation construction, including the present dependence on a separate generated head fitted to SAM/MHR. It supplements the reusable recipe, part fitting, actor, animation, storage and inspection machinery. It does not automatically replace motion generation, clothing authoring, game equipment, character descriptions or the final art review. PPL03–PPL06 in [People](../maintainers/art/people.md) remain open until their own outcomes are delivered; this proof cannot close the full pilot.

Use complete MetaHuman people first. Keeping a rejected/provisional head or SAM/MHR body at all costs would defeat the experiment. Preserve H01/H02 and the Wayfarer concept as **art-direction references**, not as geometry that must survive a transplant. Exact facial likeness is an evaluation question; do not distort a good head to force a match.

## Why this foundation is being evaluated

The prior proof showed pinched eyes, weak facial forms, an unconvincing mouth, inconsistent head/neck transitions and a visible neck seam. Those are visible shortcomings, not a proven diagnosis of the underlying code. Clay material makes geometry easier to judge; skin textures cannot excuse a malformed face.

Mature character tools provide coherent topology, eyes, mouth interiors, skinning, materials and plausible shape controls. “Professionally authored” can mean these supplied foundations; hiring an artist is a last resort, not a prerequisite. Mike is willing to pay for useful software/assets, subject to an actual purchase decision and the task spending policy.

MetaHuman and Reallusion Character Creator both cover heads **and bodies**. MetaHuman is the selected POC because of its supplied human foundation, contemporary body controls and scriptable authoring. This is not a verified claim that it is the cheapest or easiest browser pipeline. The [technical source review](metahuman-foundation-poc-tech-design.md#12-research-and-alternatives) records alternatives and the export/licensing uncertainties.

## Supported proof experience

1. An artist starts from supplied MetaHuman presets, prepares one fit adult masculine and one fit adult feminine foundation, and compares them to the retained concept references. Men are shirtless in opaque fitted linen briefs/small fitted loincloth coverage; women wear an opaque fitted bra and briefs. These are separate garments over complete anatomy. Fuller construction-reference outfits are not the review presentation.
2. Both foundations appear in OpenLegend's actual renderer, in clay and converted materials, close up and at the ordinary game camera. Visible anatomy, eyes and necks must survive export and lighting; production finish is a later task.
3. After exporting the kit and closing MetaHuman, an operator creates three contrasting characters in one family and a petite fit character in the other. Smallest does not mean unfit. Family selection describes the proof's geometry, not a universal rule equating gender identity with physique.
4. Four controls operate continuously: height, muscularity, nose width and jaw width. At least one newly entered intermediate combination was never separately authored/exported in MetaHuman. Both families support the controls. Three saved recipes per family demonstrate presets using the same mechanism.
5. One existing natural-looking premade hair-card style can be removed/restored without regenerating the face. After animation and clothing pass, inspect its hairline, silhouette, highlights and transparency from several angles in the actual renderer. Do not sculpt geometric hair, build a custom hair system or expand the hairstyle library. Retain existing eye-colour selection.
6. Suitable premade clothing first survives export and moves correctly on one body, then fits and moves on the contrasting bodies. One fitting/binding per family is allowed, not a hand-sculpted garment for every recipe. A separate rigid buckle or pendant proves attachment without rubber-like deformation. The underlying body and underwear remain available when clothing is removed. Backward-elbow diagnosis precedes clothing checks; the single hair-card check follows them. Custom garment construction stays stopped unless a specific unmet need and Mike's agreement justify it.
7. Idle, Walk and Run operate on all four review characters, including transitions and two differently shaped wearers visible together. A separate blink/jaw-opening export diagnostic measures the path to facial animation; the proof does not claim a complete expression or speech system.
8. An archived kit and recipes reproduce the result without MetaHuman, Epic authentication, a generation provider or a commercial character editor. Report which outputs are reusable and which later body changes require new source samples, bindings, masks, rigs or motion qualification. Authoring additional foundations can still require those tools and their licenses.

## Private Main-world pilot

MHP07 integrates one provisional Vivian NPC into the existing Main world and ordinary scene alongside the Peacock Mercenary and current cast. Use the existing character creation/spawn, appearance, equipment, save/load, animation, renderer and asset-storage owners. Main initialization owns the authored newcomer; explicit artwork selection installs the exact permitted family/wardrobe definitions, while adding a person to an already-running Main uses normal creation. Existing characters, art, environment, camera and UI remain unchanged. Do not create a replacement world, scene, study or viewer.

The selected private runtime projection offers separate linen bra/briefs as baseline coverage and Bald. The premade shirt/shorts is one compound outfit occupying torso and legs, with no new abilities. Equipment is its sole visible outfit authority; removing it restores covered complete anatomy. The existing authoring sources remain provisional MVP assets; production likeness, physique, materials and hair do not block this unit. MetaHuman/providers are not runtime dependencies. This is a private/local exception, not public publication, production selection or regular-workflow adoption.

Required actual-game evidence: coexistence with the unchanged cast; saved appearance and outfit after save/reload; Idle/Walk/Run and start/stop without backward elbows or major breakthroughs; visible equip/remove; outfit transfer to a compatible temporary wearer; existing stature/spatial and appearance authority; cosmetic isolation from abilities, permissions and cognition. Present existing assets before qualification, then actual gameplay screenshots/recordings with defects and unqualified cases labeled. Broader controls, six-preset library, full wardrobe, custom garments, hair generation/polish and cast conversion are excluded.

The current private pilot demonstrates one saved Nessa recipe and compound outfit, visible removal/restoration, compatible-wearer transfer, short movement/start-stop witnesses, corrected moving ground shadows and clean ordinary-server reopening in Main. The corrected ground-shadow path remains a bounded experiment with measured CPU/frame-tail cost; standalone timings do not qualify it. Bald hair and the shirt/shorts remain provisional. [Main gameplay evidence](../verification/metahuman-foundation-poc.md#november-10-2026--ordinary-main-gameplay) owns the demonstrated scope and [MHP07](../maintainers/art/metahuman-poc.md#current-progress) owns completion.

## Scope and deliberate exclusions

| Included                                                                                         | Deferred to adoption or the existing character project                                                                               |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Two adult foundations, bounded deformations, preset recipes, independent slider evaluation       | Broad age/fullness/ancestry coverage, children, arbitrary species, unrestricted random faces, blending between the two body families |
| Complete anatomy with separate opaque underwear, a suitable premade outfit, one rigid attachment | Full Wayfarer wardrobe; separate torso/legs/gloves/inner armour/outer armour/helmet/hat/boots/accessory catalogue                    |
| One existing natural-looking premade hair-card style plus bald, existing eye-colour selection    | Hair polishing/sculpting, a custom hair system, hairstyle-library expansion, facial-hair catalogue, broader body/face controls       |
| Locomotion and facial-export diagnostic                                                          | Combat/contact coverage, all hand gestures, lip sync, full FACS/ARKit, facial performance capture                                    |
| Actual renderer/actor study plus one private Main-world NPC through existing gameplay paths      | Broad creator/cast rollout, changed authority/save formats, production and workflow/provider selection changes                       |
| Static skin and normal-map preparation under current art direction                               | Recreating Unreal skin/eye shaders, cinematic fidelity at every distance, strand-groom runtime or cloth simulation                   |

The existing larger modular-character design remains the owner of those deferred requirements. This proof must expose a viable extension path, not implement them in advance. A measured facial-export failure is a material adoption risk, even when the neutral foundation passes.

## Acceptance and meaningful failures

The [execution guide](metahuman-foundation-poc-tech-design.md#4-execution-sequence) specifies the evidence and pass conditions. Distinguish four outcomes:

- **Required pass:** complete plausible covered anatomy with one bounded athletic adjustment; portable sliders on both families; correct elbows and independent wearers, premade clothing fit and locomotion; one existing hair-card style checked in the renderer; asset budgets and reproducible sources without per-character vendor calls.
- **Required measurement:** source-to-browser losses, basic facial-animation export, authoring effort, conversion time and before/after performance. A result must be reported even if poor; measurement alone does not approve it.
- **Human acceptance:** Mike's existing foundation-selection delegation permits this bounded proof to continue. Present the feasibility comparison and quality gaps candidly; production-body, finished-art and normal-workflow adoption approval remain separate. Do not expand body or hair polishing to obtain production acceptance within this proof.
- **External decision:** lawful use of the selected assets, organization-specific licensing and eventual browser distribution. Private evaluation permission is not a blanket public redistribution grant.

Fail the independent-kit hypothesis if new ordinary characters still need MetaHuman, if endpoint samples cannot retain reliable correspondence, or if good faces require ongoing manual vertex repair. Fail visual qualification if the result has alien eyes, collapsed lips, neck seams, hollow replacement torsos, cardboard underwear, obvious clipping or broken gait. Fail the current runtime profile if necessary fidelity cannot fit it. Do not silently weaken a requirement or substitute an Unreal video.

A failed proof is a useful completed experiment when its bounded investigation and evidence are complete; it is not successful adoption. Stop the failing path after one focused corrective attempt and report the unresolved tradeoff before expanding tooling, purchasing another solution or redesigning the runtime.

## Open decisions and evidence gaps

| Question                                                                                                                | Resolution owner and effect                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Can exported MetaHuman shapes, eyes, necks and joint placement fit the existing family contract without losing quality? | MHP02–MHP03. A failing answer blocks the independent-kit claim; do not disguise it as routine finishing.                                   |
| Are the two foundations and their bounded variations attractive and sufficiently close to the intended characters?      | Mike, or his explicit delegate, at the body/head review; Mike at the final browser review. Final acceptance remains pending until then.    |
| Do the selected rights support public browser delivery and a redistributable customization kit?                         | MHP01's private evaluation permission is resolved; public rights and an explicit source-license decision remain prerequisites to adoption. |
| Does the result merit replacing the current source foundation?                                                          | Mike after MHP06. The recommendation is conditional; no workflow migration is authorized by a passing report.                              |

These are the questions the experiment is designed to resolve, not instructions to improvise new product scope. No new gameplay, cognition, body-stat or gender rule is selected here.

## Maintained records

- Implementation: [MetaHuman proof tasks](../maintainers/art/metahuman-poc.md).
- Limits and constraints: [MetaHuman proof inventory](../limits/metahuman-poc.md).
- Execution, contracts and research: [Technical design](metahuman-foundation-poc-tech-design.md).
- Larger feature: [Adjustable people and wardrobe](people-from-parts-feature-spec.md), [authoring contract](people-from-parts-authoring-contract.md), [existing pilot work](../maintainers/art/people.md).
