# Research applications for OpenLegend production

**Research checked:** 17 October 2026. **Status:** proposed task examples for future development. The reusable routes now live in [Production workflows](../../../docs/production-workflows/README.md); this research preserves their source-specific applications. No example implements a capability, authorizes service purchases or replaces the current project owners.

The [principles](09-openlegend-principles.md) explain the reasoning. The examples below retain useful task details and tool candidates from this research. Select the relevant example after choosing the experience or production opportunity; their numbering is not a delivery order.

| Reusable route                                                                       | Examples in this document                                      | What the route connects                                                                                |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [Shared production approach](../../../docs/production-workflows/README.md)           | Task framing and final review                                  | Desired result, current owners, creative exploration, production, inspection and revision              |
| [Assets and animation](../../../docs/production-workflows/assets-and-animation.md)   | Material families, prop/icon delivery and character actions    | An idea and its function through editable sources, compatible exports and a usable entity              |
| [Scenes and interfaces](../../../docs/production-workflows/scenes-and-interfaces.md) | Inventory and scene population                                 | Visual intent, spatial/interaction structure, coherent art and the complete client                     |
| [Characters and play](../../../docs/production-workflows/characters-and-play.md)     | Encounter authoring, resident comparison and playable revision | A worthwhile situation and person through independent choice, actual consequence and another encounter |
| [Audio and feedback](../../../docs/production-workflows/audio-and-feedback.md)       | Sound cues and character voices                                | An actual action or utterance through fitting sound, presentation and the player's experience          |

The [existing playability questions](../../../docs/projects/five-product-feature-specs.md#playability-gates) determine whether a production improvement helps the game. Technical asset acceptance, an appealing screenshot and lower cost each supply different evidence.

## 1. Begin each substantial task with a player outcome

**Use when:** starting a feature, meaningful visual improvement or production experiment.

**Inputs:** the current relevant project owners, the actual implementation baseline, and a worthwhile player or production opportunity.

Write a short task brief that answers: what becomes worth doing, seeing or creating; which current limitation or new possibility motivates the work; what existing behavior and visual direction it relies on; and what evidence would show success. Include relevant screenshots or a small reproducible world state. Resolve routine details from the existing docs rather than repeatedly reopening accepted decisions. Explore alternatives where a substantive creative choice remains open.

Split work along outcomes and ownership. For example, an inventory-art task can separate the icon family from interface composition after both use the same item definitions and style. Dependent integration stays with one owner. Give an agent the tools and source access it needs for that bounded job, then ask it to produce the result and inspect it.

**Acceptance evidence:** a complete player action or understandable visual improvement in the real client, the required impact-based checks, and a separate judgment of what became more interesting, expressive, satisfying or useful. Record defects and remaining uncertainty as well as gains.

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

**Acceptance evidence:** recognizable function and silhouette, world/icon agreement, valid scale and placement, supported materials, acceptable delivery cost, and no invented mechanical capability. If the trial installs or replaces a representation, also exercise a failed/delayed load and a reload: preserve the same object, current state, adequate fallback and admitted mechanics. An offline asset study does not require a publication test suite.

**Why here:** it isolates the proposed general asset intake from the additional difficulty of skinning and animation. OpenLegend already displays a live character; the useful experiment is repeatable intake and identity, not proving that 3D can appear at all. [Invention-art owner](../../../docs/invention-art-pipeline.md), [asset proposal](../../../docs/projects/3d-pixel-art-asset-pipeline.md).

## 5. Add a useful action to a compatible character

**Use when:** expanding the mercenary pilot or a subsequently qualified body family.

**Inputs:** supported skeleton/body, actual action semantics, timing requirements, equipment, and camera conditions.

Choose one action required by play. Establish its start, anticipation, contact, recovery and interruption behavior using the native action's outcome as the reference. Obtain a compatible editable clip from an existing source, authored motion, retargeting, capture or a constrained motion tool.

Inspect joints, contacts, root travel, equipment grip and transitions. Fix body or export problems at their actual source rather than compensating with arbitrary scene offsets. Export selected clips and verify real non-root joint motion. Test the complete movement in the game at normal pixel scale from relevant orbit and pitch angles.

When broad reuse is the claim, repeat the qualified procedure on another compatible body or equipment configuration. Keep a deliberately bespoke action valid within its stated scope.

**Likely tools:** existing clip libraries and Blender; current PlayCanvas animation skill; Mixamo, Cascadeur or DeepMotion when suited to the input; Kimodo as a proposed offline constrained-motion trial. Video-only generation supplies reference unless actual skeletal motion is exported. [Motion assessment](07-image-3d-and-audio-models.md).

**Acceptance evidence:** readable action and intention, correct contacts and transitions, no false success indicated by presentation, and adequate behavior at camera distance. An advancing animation timer is not sufficient.

**Why here:** expressive people and useful combat need action coverage more urgently than an unqualified collection of bodies. Compatible reuse fits the project better than immediately building custom learned locomotion. [World presentation](../../../docs/world-presentation.md).

The [delivered first-threat encounter](../../../docs/projects/completed/first-threat-encounter-feature-spec.md) is one possible application of coordinated action feedback: it already supplies actual preparation, contact, retreat and aftermath. Its retained simple deer presentation is not proof of a newly qualified stag rig or bespoke charge animation. Select compatible assets and preserve the current action timing unless that owning design is separately changed.

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

Explore alternative situations whose possibilities arise from those facts. Choose a promising source of value: discovery, danger, mastery, invention, shared enjoyment, rivalry or pleasure in a place. Use the [existing situation-authoring questions](../../../docs/repertoires/design-foundation.md#how-systems-produce-a-situation) to connect people, information, physical possibilities and consequences. A person's concerns should explain several plausible actions; they should not prescribe a hidden sequence of exact player and NPC moves.

Use an authoring model to propose and revise dialogue examples, motives, environmental clues and possible consequences. A text rehearsal, paper layout or inexpensive playable content pass can expose a weak premise before detailed art. Preserve the eventual live-invention and independent-choice proof where required; a rehearsal does not supply it. Review for distinct identity, worthwhile choices and excessive exposition. Integrate content through the current native/world authoring path. If a valuable possibility needs new capability, develop it through the existing design owner instead of dismissing it solely because the present tool cannot perform it.

**Likely tools:** current incumbent plus a bounded Claude/Gemini authoring audition, existing world records, and a reviewer who knows the game's intended experience.

**Acceptance evidence:** a situation the player wants to engage with and can affect, a person whose own concern matters, and a consequence the player understands or wants to investigate. Keep actual world validity separate from these experience judgments. A refusal, retreat or quiet shared activity can be an appropriate outcome.

**Why here:** OpenLegend's authored people and non-canned invention distinguish it from both a fixed quest script and a narrator that can decree anything. [Character direction](../../../docs/projects/compelling-characters-feature-spec.md), [game priorities](../../../docs/repertoires/gameplay-priorities.md).

## 8. Evaluate a resident through repeated visits and consequences

**Use when:** selecting or changing a runtime character model, context procedure or relevant authored persona.

**Inputs:** a permitted evidence snapshot, current person definition, the actual output contract, and relevant [complete character episodes](../../../docs/projects/compelling-characters-feature-spec.md#complete-behavioral-flows).

Begin with fixed-context comparisons so candidates see equivalent evidence. Select relevant cases such as a first meeting, a request against the resident's concerns, contradictory hearsay, an unavailable item, another person's secret, failure, enjoyment or changed conditions after an absence. Continue through the existing episode comparison: independent choice, actual activity, a relevant interruption or change, stopping and a later opportunity for the experience to matter. Ordinary company, curiosity, satisfaction and chosen solitude deserve attention alongside adverse cases. An intended or rejected action must not become a remembered completed event. [Existing episode evaluation](../../../docs/projects/intelligent-simulation-evaluation-feature-spec.md#the-episode-not-the-preferred-answer).

Save what context was actually delivered, including the distinction between observation and reported information. When a response fails, identify whether the cause was missing evidence, wrong retrieval, prose quality, persona drift, invalid operation or delivery behavior. Repair the owning stage; do not add more world history indiscriminately.

**Likely tools:** the existing provider/harness contract, human blind review of valid outputs, and calibrated automated triage where useful. Public persona benchmarks contribute scenario design; they are not the acceptance authority.

**Acceptance evidence:** distinct concise voice, plausible agency, faithful uncertainty, no unauthorized knowledge or invented event, appropriate continuity/development, and acceptable complete cost and delay. Separately identify what made this particular person curious, amusing, challenging or worth knowing to a player. Accurate recollection alone cannot establish that result.

**Why here:** public memory products and mods demonstrate that stored context, actual model input and the final spoken response are separate stages. OpenLegend's own perspective requirements are stricter than a mod that shares the player's camera with every NPC. [Narrative dossier](06-models-for-stories-and-characters.md), [runtime case studies](02-developer-case-studies.md).

## 9. Produce feedback audio and, when justified, character voices

**Use when:** adding sound to a current playable action or qualifying a voice experience.

**Inputs:** exact event or accepted spoken words, intended character/material identity, duration, interaction timing, and mix context.

Start with a small set of useful cues: distinguish an impact, a failed action, a completed craft and an urgent threat. Produce several controlled variations where repetition matters. Check loop seams, loudness, intelligibility and separation from speech in the actual scene.

For voices, keep casting stable across returning visits. Use the same short audition lines and invented names across providers. Measure the interval from player intent to the first complete acceptable response, including recognition, generation, validation and playback. Test interruption and cancellation as part of the experience.

**Likely tools:** an existing licensed library or authored sound where adequate; specialist effects/music generation; separate ElevenLabs, Google or OpenAI TTS candidates. Use the current native words and disclosure scope as the contract.

**Acceptance evidence:** useful feedback in motion, consistent voice identity, intelligible speech, controlled repetition and complete delivery behavior. A good whole song does not automatically provide a score that transitions between game states.

**Why here:** sound can make current actions feel more complete without an engine rewrite. Voice is a separate product choice when it improves the intended play. The [audio and feedback route](../../../docs/production-workflows/audio-and-feedback.md) combines sound with the visible action and player feedback; this research does not make voice a prerequisite. [Audio assessment](07-image-3d-and-audio-models.md).

## 10. Close the loop with play, diagnosis and a durable repair

**Use when:** completing any representative slice.

**Inputs:** an actual build, a reproducible starting condition, intended actions and a short list of observable criteria.

When play is authorized, use a human session and appropriate existing automation. Apply the existing [playability questions](../../../docs/projects/five-product-feature-specs.md#playability-gates): can the player find something they want to try, turn the intention into a useful result, understand another person's part in it, and reach a satisfying consequence or next possibility? Inspect the full interface and world together. Observe voluntary choices, delight, interest and valued difficulty as well as confusion and waiting. Record a defect with its starting state, action sequence and visible/native result; avoid a vague request for “more polish.”

Assign the defect to its cause: art, layout, control, world rules, asset export, context selection or delivery. Repair the relevant owner and rerun the affected path plus any surrounding interaction it could disturb. If the same error recurs, add the smallest useful check or instruction.

**Likely tools:** the existing client/browser route and verification tools; an exploratory AI player only where it can use supported actions and provide reproducible observations.

**Acceptance evidence:** the selected checks establish their actual technical scope, and labeled player observations address the intended experience. Record why someone wanted to continue, change approach, return or finish contentedly; time spent alone does not explain enjoyment. Small sessions do not establish retention or broad appeal. Existing episode and verification owners retain the evidence, rather than a second universal fun rubric.

**Why here:** EA's production testing augments existing scripted systems selectively, and Play2Code makes browser play part of iterative repair. Neither demonstrates that automated agents can decide all of OpenLegend's fun, art or character quality. [EA/other cases](02-developer-case-studies.md), [Play2Code's public method](https://continual-game-generation.vercel.app/), [project verification](../../../.agents/rules/verification.md).

## A compact task record

The following is a proposed checklist for a substantial production trial. Reuse an existing project record where it already holds this information.

| Field                | What to record                                                               |
| -------------------- | ---------------------------------------------------------------------------- |
| Player outcome       | The action, understanding or feeling this work improves                      |
| Starting point       | Relevant repository revision, current owner, reproducible scene/state        |
| Creative constraints | Approved references, identities, palette/material/rig or voice family        |
| Chosen route         | Existing asset, procedural recipe, generation or manual finishing; why       |
| Tool identity        | Exact relevant model, application and skill/helper revision                  |
| Work and cost        | Preparation, attempts, correction time, paid work and final accepted outputs |
| Acceptance evidence  | Actual exports, complete-client views and relevant interactions              |
| Experience judgment  | What became worth doing or caring about, observed tradeoffs and uncertainty  |
| Failure and recovery | What went wrong, how it was repaired, any remaining qualification limit      |
| Reuse                | Source assets, settings and the next variation that tests repeatability      |

This record need not become a new database or a large form. Its purpose is to preserve the few facts that let another session repeat and improve the work.

## Choose the application from the current opportunity

Use current [gameplay priorities and coverage](../../../docs/repertoires/gameplay-priorities.md), the affected owners and actual evidence to choose a worthwhile result. Inventory work directly addresses Mike's reported concern; a character, action, place or invention may be the more consequential current opportunity. No inventory-first sequence is selected here. The [reusable routes](../../../docs/production-workflows/README.md) and these examples are selectable production methods, not serial prerequisites. Independent authoring or asset work can proceed in parallel when its inputs are clear.

Use compatible reference skills when they help the chosen task. A new bridge or automation can earn a trial by reducing repeated work or enabling a valuable creative capability. Test another family member when broad reuse is the claim. An engine port or self-hosted model operation needs evidence of sufficient product or production benefit, including its operating and transition costs. Useful references, editable reuse, creative exploration and real play/revision can improve the game while informing those larger choices.
