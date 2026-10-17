# Recommended working procedures for OpenLegend

**Research checked:** 17 October 2026. **Status:** proposed procedures for future development tasks. They are concrete enough to review and use, but this research does not implement them, authorize service purchases, or replace the current project owners.

The [principles](09-openlegend-principles.md) explain the reasoning. The procedures below identify inputs, a sequence of work, acceptance evidence and likely tools. Use the parts needed for the current task; they are not a requirement to run every procedure for every change.

## 1. Begin each substantial task with a player outcome

**Use when:** starting a feature, meaningful visual improvement or production experiment.

**Inputs:** the current relevant project owners, the actual implementation baseline, and one observable player problem.

Write a short task brief that answers: what can the player do or understand afterward; what currently blocks it; what existing behavior and visual direction the work relies on; and what evidence would show success. Include relevant screenshots or a small reproducible world state. Resolve routine details from the existing docs rather than repeatedly reopening accepted decisions.

Split work along outcomes and ownership. For example, an inventory-art task can separate the icon family from interface composition after both use the same item definitions and style. Dependent integration stays with one owner. Give an agent the tools and source access it needs for that bounded job, then ask it to produce the result and inspect it.

**Acceptance evidence:** a complete player action or understandable visual improvement in the real client, plus the required impact-based checks and a concise account of defects repaired.

**Why here:** OpenLegend's current priority is a playable survival-adventure with genuine invention and independent characters in the early loop. A task should improve that experience rather than create infrastructure with no current consumer. [Gameplay priorities](../../../docs/repertoires/gameplay-priorities.md), [root workflow](../../../AGENTS.md).

## 2. Produce a polished inventory slice

**Use when:** addressing Mike's current UI concern.

**Inputs:** current inventory behavior, representative actual items, the existing design system, one approved full-screen exemplar, and a small icon/frame family.

Capture the present screen in an exact state. Diagnose the main visual defects. Resolve composition through a design stage, which may itself use an AI design tool or manual reference work. Then implement with the current React/React Aria components, preserving live data, accessibility and interaction semantics.

Keep artwork separate from text, quantities, focus and state. Review the entire screen over representative wilderness. Exercise selection, equipment, scrolling, pending and rejected actions, inventory changes while open, keyboard focus and return to world control. Compare the resulting screen with the exemplar at the same viewport and scale.

**Likely tools:** approved existing art; specialized image editing for missing illustrations; React Aria's official references; existing browser automation; CSS or authored image borders as appropriate. An alternative language agent can participate without changing the image model.

**Acceptance evidence:** coherent item recognition at actual size, preserved world visibility, real interaction completion, and fewer material visual defects than the captured baseline.

**Why here:** the source audit found a design system already in place and no evidence that browser UI is the fundamental blocker. The full [UI procedure and controlled comparisons](08-ui-quality-and-production.md) own the details; do not introduce a second design system in this research folder.

## 3. Create one reusable environment material family

**Use when:** producing repeated ground, stone, timber, plaster or metal surfaces.

**Inputs:** an approved sample in a real scene, material identity, relevant light states, and the permitted output channels.

Build or adapt a small graph with meaningful controls. Prefer broad forms and palette before tiny surface noise. Generate a deliberate variation sheet, including extremes that expose the recipe's limits. Tile the output across a representative surface, inspect the seam and repetition, then view it under the actual scene lights and camera sampling.

Separate base color from lighting information where the delivery path needs that distinction. Review whether painted highlights conflict with changing light and whether normal detail actually contributes at game scale. Retain the graph, accepted settings and final exported maps.

**Likely tools:** Substance Designer where available; Material Maker or Blender for an adequate lower-overhead route. The DCC-MCP Designer adapter is a candidate for graph operations, while the original inspected Material Maker bridge is incomplete. [Actual skill audit](04-skills-and-tooling.md).

**Acceptance evidence:** two visibly related useful variants, a cheap specified revision, valid exports and stable in-game appearance. A procedural label alone is not sufficient.

**Why here:** controlled surface variation matches OpenLegend's dimensional wilderness and reduces the need to generate unrelated texture images. [Procedural evidence and limitations](03-procedural-art-and-animation.md).

## 4. Take one prop from idea through world appearance and icon

**Use when:** qualifying a new rigid object or improving an existing item's appearance.

**Inputs:** the real object's supported function and visible parts, existing appearance choices, required scale, and a representative scene.

First inspect available exact art and compatible parts. If they suffice, compose and finish them. If an important visual piece is missing, use a bounded generator or ordinary modeling to produce a candidate. Inspect the whole object, including the back, underside, openings and contact surfaces.

Normalize orientation, scale and pivot in the editable source. Apply the approved material family. Export through the actual delivery format and inspect that export, not only the authoring viewport. Derive or produce a matching icon that preserves the same identity. Place the object in the actual scene beside a known reference and exercise its supported interaction.

**Likely tools:** PlayCanvas GLB inspection/calibration; Blender through one selected execution path; Tripo or Meshy as later candidate suppliers when generation is needed.

**Acceptance evidence:** recognizable function and silhouette, world/icon agreement, valid scale and placement, supported materials, acceptable delivery cost, and no invented mechanical capability.

**Why here:** it isolates the proposed general asset intake from the additional difficulty of skinning and animation. OpenLegend already displays a live character; the useful experiment is repeatable intake and identity, not proving that 3D can appear at all. [Invention-art owner](../../../docs/invention-art-pipeline.md), [asset proposal](../../../docs/projects/3d-pixel-art-asset-pipeline.md).

## 5. Add a useful action to a compatible character

**Use when:** expanding the mercenary pilot or a subsequently qualified body family.

**Inputs:** supported skeleton/body, actual action semantics, timing requirements, equipment, and camera conditions.

Choose one action required by play. Establish its start, anticipation, contact, recovery and interruption behavior using the native action's outcome as the reference. Obtain a compatible editable clip from an existing source, authored motion, retargeting, capture or a constrained motion tool.

Inspect joints, contacts, root travel, equipment grip and transitions. Fix body or export problems at their actual source rather than compensating with arbitrary scene offsets. Export selected clips and verify real non-root joint motion. Test the complete movement in the game at normal pixel scale from relevant orbit and pitch angles.

Only after one action succeeds should the workflow be repeated on another compatible body or equipment configuration. That second case reveals whether the procedure is reusable.

**Likely tools:** existing clip libraries and Blender; current PlayCanvas animation skill; Mixamo, Cascadeur or DeepMotion when suited to the input; Kimodo as a proposed offline constrained-motion trial. Video-only generation supplies reference unless actual skeletal motion is exported. [Motion assessment](07-image-3d-and-audio-models.md).

**Acceptance evidence:** readable action and intention, correct contacts and transitions, no false success indicated by presentation, and adequate behavior at camera distance. An advancing animation timer is not sufficient.

**Why here:** expressive people and useful combat need action coverage more urgently than an unqualified collection of bodies. Compatible reuse fits the project better than immediately building custom learned locomotion. [World presentation](../../../docs/world-presentation.md).

## 6. Populate a scene while preserving gameplay structure

**Use when:** adding foliage, rocks, ruins or background activity.

**Inputs:** authored landmarks and routes, authoritative obstacle/resource facts, an approved asset family, and target viewing conditions.

Start with traversable geometry and the intended player encounter. Place the essential landmarks and meaningful objects. Add procedural distribution through a small set of density, scale and clustering controls with a reproducible seed. Review the scene for threat visibility, routes, entrances and interaction points.

Add distant simplification only when needed. Inspect the runtime representation of repeated geometry and leaf cards before assuming authoring instances survive export. Measure overdraw, shadow cost or draw submission when the actual scene indicates a bottleneck. Change one relevant factor and compare.

**Likely tools:** Blender Geometry Nodes or a small data-driven placement recipe; current engine instancing/batching capabilities; PlayCanvas lighting/effects references. Preserve existing scene ownership.

**Acceptance evidence:** a scene that remains navigable and readable, predictable regeneration of decorative choices, and no accidental change to collision, harvestability or hidden information.

**Why here:** procedural population can make a world rich, but OpenLegend's physical meaning belongs to the world. Large-studio placement systems provide a production principle, not a mandate to rebuild their infrastructure. [Procedural dossier](03-procedural-art-and-animation.md), [engine/world boundaries](../../../docs/engine-and-world-boundaries.md).

## 7. Author an encounter and a person with room for choice

**Use when:** preparing world content or evaluating creative authoring models.

**Inputs:** the world brief, the playable loop, a person's motives/history, known facts and resources, and the existing content format.

Ask for a small number of alternative situations whose tensions arise from those facts. Choose one that creates useful choices, then refine its clarity and relationship to exploration, combat or invention. A person's concerns should explain several plausible actions; they should not prescribe a hidden sequence of exact player and NPC moves.

Use an authoring model to propose and revise dialogue examples, motives, environmental clues and consequences. Review the output for distinct voice, usable conflict and excessive exposition. Integrate only content supported by the current native/world authoring path; record missing capabilities as design questions rather than inventing an undocumented executor.

**Likely tools:** current incumbent plus a bounded Claude/Gemini authoring audition, existing world records, and a reviewer who knows the game's intended experience.

**Acceptance evidence:** a situation the player can understand and affect, a character who can reasonably disagree or change, and consequences compatible with actual world behavior. Attractive prose is necessary for some content, but not the complete acceptance criterion.

**Why here:** OpenLegend's authored people and non-canned invention distinguish it from both a fixed quest script and a narrator that can decree anything. [Character direction](../../../docs/projects/compelling-characters-feature-spec.md), [game priorities](../../../docs/repertoires/gameplay-priorities.md).

## 8. Evaluate a resident through repeated visits and consequences

**Use when:** selecting or changing a runtime character model, context procedure or relevant authored persona.

**Inputs:** a permitted evidence snapshot, current person definition, the actual output contract, and a small set of challenging situations.

Begin with fixed-context comparisons so candidates see equivalent evidence. Test a first meeting, a request against the resident's concerns, contradictory hearsay, an unavailable item, another person's secret, failed action, and changed conditions after an absence. Continue with a few closed-loop sessions where the model's earlier responses affect later conversation.

Save what context was actually delivered, including the distinction between observation and reported information. When a response fails, identify whether the cause was missing evidence, wrong retrieval, prose quality, persona drift, invalid operation or delivery behavior. Repair the owning stage; do not add more world history indiscriminately.

**Likely tools:** the existing provider/harness contract, human blind review of valid outputs, and calibrated automated triage where useful. Public persona benchmarks contribute scenario design; they are not the acceptance authority.

**Acceptance evidence:** distinct concise voice, plausible agency, faithful uncertainty, no unauthorized knowledge or invented event, appropriate development, and acceptable total response time/cost.

**Why here:** public memory products and mods demonstrate that stored context, actual model input and the final spoken response are separate stages. OpenLegend's own perspective requirements are stricter than a mod that shares the player's camera with every NPC. [Narrative dossier](06-models-for-stories-and-characters.md), [runtime case studies](02-developer-case-studies.md).

## 9. Produce feedback audio and, when justified, character voices

**Use when:** adding sound to a current playable action or qualifying a voice experience.

**Inputs:** exact event or accepted spoken words, intended character/material identity, duration, interaction timing, and mix context.

Start with a small set of useful cues: distinguish an impact, a failed action, a completed craft and an urgent threat. Produce several controlled variations where repetition matters. Check loop seams, loudness, intelligibility and separation from speech in the actual scene.

For voices, keep casting stable across returning visits. Use the same short audition lines and invented names across providers. Measure the interval from player intent to the first complete acceptable response, including recognition, generation, validation and playback. Test interruption and cancellation as part of the experience.

**Likely tools:** an existing licensed library or authored sound where adequate; specialist effects/music generation; separate ElevenLabs, Google or OpenAI TTS candidates. Use the current native words and disclosure scope as the contract.

**Acceptance evidence:** useful feedback in motion, consistent voice identity, intelligible speech, controlled repetition and complete delivery behavior. A good whole song does not automatically provide a score that transitions between game states.

**Why here:** sound can make current actions feel more complete without an engine rewrite. Voice is a later product choice when it improves the intended play, not a prerequisite imposed by this research. [Audio assessment](07-image-3d-and-audio-models.md).

## 10. Close the loop with play, diagnosis and a durable repair

**Use when:** completing any representative slice.

**Inputs:** an actual build, a reproducible starting condition, intended actions and a short list of observable criteria.

Run a human play session and appropriate existing automation. Check whether a player can discover the goal, act, understand feedback, recover from failure and use the reward. Inspect the full interface and world together. Record a defect with its starting state, action sequence and visible/native result; avoid a vague request for “more polish.”

Assign the defect to its cause: art, layout, control, world rules, asset export, context selection or delivery. Repair the relevant owner and rerun the affected path plus any surrounding interaction it could disturb. If the same error recurs, add the smallest useful check or instruction.

**Likely tools:** the existing client/browser route and verification tools; an exploratory AI player only where it can use supported actions and provide reproducible observations.

**Acceptance evidence:** the intended loop works and remains understandable, relevant failures recover properly, and the chosen checks pass. Human willingness to continue playing remains separate from automated task completion.

**Why here:** EA's production testing augments existing scripted systems selectively, and Play2Code makes browser play part of iterative repair. Neither demonstrates that automated agents can decide all of OpenLegend's fun, art or character quality. [EA/other cases](02-developer-case-studies.md), [Play2Code's public method](https://continual-game-generation.vercel.app/), [project verification](../../../.agents/rules/verification.md).

## A compact task record

The following is a proposed checklist for a substantial production trial. Reuse an existing project record where it already holds this information.

| Field | What to record |
| --- | --- |
| Player outcome | The action, understanding or feeling this work improves |
| Starting point | Relevant repository revision, current owner, reproducible scene/state |
| Creative constraints | Approved references, identities, palette/material/rig or voice family |
| Chosen route | Existing asset, procedural recipe, generation or manual finishing; why |
| Tool identity | Exact relevant model, application and skill/helper revision |
| Work and cost | Preparation, attempts, correction time, paid work and final accepted outputs |
| Acceptance evidence | Actual exports, complete-client views and relevant interactions |
| Failure and recovery | What went wrong, how it was repaired, any remaining qualification limit |
| Reuse | Source assets, settings and the next variation that tests repeatability |

This record need not become a new database or a large form. Its purpose is to preserve the few facts that let another session repeat and improve the work.

## Proposed sequence for the next development effort

Begin with the inventory/scene baseline and identify the most consequential quality gap. Produce the corresponding small art family and one complete interaction. In parallel, where independent, prepare a limited character-authoring comparison. Extend the accepted result through one prop and one animation round trip, then prove a second family member.

Only after those steps reveal repeated work should the team add a narrow automation skill or a new authoring bridge. Only after a measured product or authoring limitation should it investigate an engine port or self-hosted model operation. This ordering follows the research's strongest project-specific finding: useful references, editable reuse and real review can improve the game immediately while producing evidence for larger choices.
