# MetaHuman foundation proof — feature specification

| Status      | Current progress                                                                                    | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Both foundations export and compile; live creation, modular clothing and motion remain unqualified. | 2026-11-08   |

## Purpose

Determine whether MetaHuman can supply attractive, anatomically believable **complete heads and bodies** for OpenLegend, and whether a small exported kit can create further characters without running MetaHuman. Quality in OpenLegend's browser presentation is the deciding result. An attractive Unreal screenshot, a moving mannequin or a functioning slider alone is insufficient.

This is an authorized standalone private experiment, not adoption of MetaHuman into the art workflow. The normal art workflow, selected game assets, world definitions and existing character pilot retain their own selections and unfinished obligations. [Execution evidence](../verification/metahuman-foundation-poc.md) distinguishes capability checks from actual source/export qualification.

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
2. Both foundations appear in OpenLegend's actual renderer, in clay and finished materials, close up and at the ordinary game camera. Visible anatomy, eyes, hair and necks must survive export and the game's lighting.
3. After exporting the kit and closing MetaHuman, an operator creates three contrasting characters in one family and a petite fit character in the other. Smallest does not mean unfit. Family selection describes the proof's geometry, not a universal rule equating gender identity with physique.
4. Four controls operate continuously: height, muscularity, nose width and jaw width. At least one newly entered intermediate combination was never separately authored/exported in MetaHuman. Both families support the controls. Three saved recipes per family demonstrate presets using the same mechanism.
5. Hair can be removed or switched between two short styles, and eye colour can change without regenerating the face. These choices must remain correctly seated as the face changes.
6. The same tunic design fits and moves on the contrasting bodies. One fitting/binding per family is allowed, not a hand-sculpted garment for every recipe. A separate rigid buckle or pendant proves attachment without rubber-like deformation. The underlying body and underwear remain available when the tunic is removed.
7. Idle, Walk and Run operate on all four review characters, including transitions and two differently shaped wearers visible together. A separate blink/jaw-opening export diagnostic measures the path to facial animation; the proof does not claim a complete expression or speech system.
8. An archived kit and recipes reproduce the result without MetaHuman, Epic authentication, a generation provider or a commercial character editor. Authoring additional foundations can still require those tools and their licenses.

## Scope and deliberate exclusions

| Included                                                                                     | Deferred to adoption or the existing character project                                                                                           |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Two adult foundations, bounded deformations, preset recipes, independent slider evaluation   | Broad age/fullness/ancestry coverage, children, arbitrary species, unrestricted random faces, blending between the two body families             |
| Complete anatomy with separate opaque underwear, one soft tunic design, one rigid attachment | Full Wayfarer wardrobe; separate torso/legs/gloves/inner armour/outer armour/helmet/hat/boots/accessory catalogue                                |
| Two short hair choices plus bald, selectable eye colour                                      | Long-hair simulation, facial-hair catalogue, eye-shape/neck/limb-length/breast-specific sliders, full head library                               |
| Locomotion and facial-export diagnostic                                                      | Combat/contact coverage, all hand gestures, lip sync, full FACS/ARKit, facial performance capture                                                |
| Actual game renderer/actor in a developer study                                              | Installing the kit in the ordinary world, changing character authority/save formats, normal creator rollout, workflow/provider selection changes |
| Static skin and normal-map preparation under current art direction                           | Recreating Unreal skin/eye shaders, cinematic fidelity at every distance, strand-groom runtime or cloth simulation                               |

The existing larger modular-character design remains the owner of those deferred requirements. This proof must expose a viable extension path, not implement them in advance. A measured facial-export failure is a material adoption risk, even when the neutral foundation passes.

## Acceptance and meaningful failures

The [execution guide](metahuman-foundation-poc-tech-design.md#4-execution-sequence) specifies the evidence and pass conditions. Distinguish four outcomes:

- **Required pass:** visibly good covered anatomy and heads in the browser; portable bounded sliders on both families; correct independent wearers, tunic fitting and locomotion; asset budgets; no per-character vendor dependency; reproducible archived sources.
- **Required measurement:** source-to-browser losses, basic facial-animation export, authoring effort, conversion time and before/after performance. A result must be reported even if poor; measurement alone does not approve it.
- **Human acceptance:** Mike selects browser body/head appearance, or explicitly delegates that selection, and approves the final comparison. Without the relevant response, keep selection/acceptance pending; completed technical evidence is reported separately. Do not multiply wardrobe work before the body/head checkpoint.
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
