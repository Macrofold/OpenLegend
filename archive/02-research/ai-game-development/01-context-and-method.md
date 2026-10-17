# Research scope, OpenLegend context, and evidence method

**Research date:** October 17, 2026. **Repository baseline:** [Macrofold/OpenLegend `main` at `0eb7358f251d1ab706592ccb6e9829e98c729fe9`](https://github.com/Macrofold/OpenLegend/commit/0eb7358f251d1ab706592ccb6e9829e98c729fe9). **Delivery branch:** `docs/ai-game-development-research-2026-10-17`.

This research answers Mike's request to understand how capable developers automate game production, find useful published agent skills, compare game-specific model capabilities, explain polished game UI, and assess PlayCanvas versus Godot. It covers AI-assisted development and conventional systems that make AI assistance more productive. It excludes general code-model rankings, runtime implementation, engine migration, installing skills, and paid model trials.

The research makes recommendations; it does not silently accept a new art direction, change the runtime, remove existing safeguards, or close gameplay and visual acceptance work. The [research index](README.md) owns the reading order and conclusions.

## 1. Start from the game OpenLegend is trying to deliver

OpenLegend's priority is a complete, enjoyable survival-adventure with usable combat, exploration, rewards, progression, crafting and a functional home. A small real instance of useful invention, independent character choice and remembered consequence belongs in that first experience. An enormous simulation or a catalogue of generated assets is not itself that experience. This is the project's accepted selection policy, not an inference from an influencer's preferred genre. [Gameplay priorities](../../../docs/repertoires/gameplay-priorities.md)

The larger ambition is an engine for authored realities, with a playable bundled world. Another world can have different laws, creatures, vocabulary and presentation. Native mechanisms and the selected world's authored content remain distinct. AI can propose language, appearances and supported new content; a plausible description does not grant a game effect, permission or new physical law. [Root instructions](../../../AGENTS.md) · [Engine and world boundaries](../../../docs/engine-and-world-boundaries.md)

That combination changes which production advice is useful. A workflow that rapidly makes an attractive fixed-level shooter may supply excellent lessons about references, materials, sound and review, while offering little evidence about a persistent, observer-scoped world in which the player can invent objects.

### Current foundation and open work

| Area | What the inspected baseline establishes | Consequence for this research |
| --- | --- | --- |
| World rendering | PlayCanvas presents a dimensional scene with meshes, lit sprites, camera movement, depth and shadow behavior. | Assess how to improve the existing renderer and asset preparation before proposing an engine replacement. |
| Character art | A bundled animated mercenary pilot is delivered, with a separate pixel-resolution character render and depth integration. General generated assets, arbitrary rigs and broad production qualification remain open. | Do not describe OpenLegend as sprite-only, or treat one model pilot as a complete 3D production pipeline. |
| Interface | React and React Aria support a custom design system. The October 16 world-first redesign changes ordinary navigation, speech, records and world interaction. | “There is no design system” is contradicted by the documents; whether its visible execution is good enough requires direct visual and interaction evidence. |
| Authoring | A unified owner conversation and bounded reviewed world changes have implementation, alongside unfinished broader authoring capabilities. | Development-agent automation and an in-game World Agent are different permission and publication contexts. |
| Generated art | The runtime invention-art contract is an accepted target. The broader progressive-appearance implementation remains partly proposed. | Offline production can use external tools now without pretending that the game already runs that entire pipeline. |
| Simulation | Domain rules, authoritative writes, character knowledge, persistence and presentation have separate owners. | Do not import an editor tutorial that makes client-side objects or generated meshes authoritative. |
| Product quality | Trackers distinguish delivered behavior from native, browser, provider and human playtest evidence. | Attractive screenshots, a build, and scripted success answer different questions. |

Sources: [world presentation](../../../docs/world-presentation.md), [progressive 3D art specification](../../../docs/projects/3d-pixel-art-feature-spec.md), [UI brief](../../../docs/ui-design-brief.md), [UI production guidance](../../../apps/client/src/design-system/README.md), [runtime art contract](../../../docs/invention-art-pipeline.md), [architecture](../../../docs/architecture.md).

The root README remains useful onboarding, but newer focused documents explicitly supersede parts of its older UI and visual summaries. This research follows the current focused owner where dates and scope differ. It does not undertake the separate exhaustive documentation reconciliation.

## 2. Aesthetic and interaction constraints

The creative target is dimensional wilderness, expressive recognizable people, meaningful fine detail, organic shapes, warmth, and purposeful lighting. Detailed pixel art is an artistic direction to evaluate at actual gameplay scale, not permission to apply a coarse pixel filter everywhere. Portraits, item icons, the 3D world and sharp readable UI can use different resolutions. Voxel blocks, permanent gloom, toy proportions and heavy blur do not follow from the chosen direction. [Creative brief](../../../art-direction/final-board/creative-brief.md) · [3D art specification](../../../docs/projects/3d-pixel-art-feature-spec.md)

The interface brief already calls for deep forest-green surfaces, warm ivory text, muted sage, restrained antique gold, tactile detail and game-oriented interactions. It explicitly rejects generic dashboard presentation. React Aria supplies interaction primitives, not this visual identity. Proposed production changes should make those existing choices tangible through a reference screen, assets, shared components and review. They should not create a second competing design system. [UI brief](../../../docs/ui-design-brief.md) · [UI foundations](../../../docs/ui-ux/foundations.md)

Camera freedom matters. A technique that works from one fixed side view can fail when OpenLegend's camera rotates or tilts. The research therefore distinguishes final sprites, model-generated sprite sheets, rigid meshes, articulated models, shared rigs, attached equipment, procedural state effects and UI-only illustrations. “Generate a character” is too vague to establish usable delivery.

## 3. What counts as evidence

A source is evaluated at the level of the claim being used. A respected studio may establish that a workflow shipped, while its talk still does not prove that the workflow is economical for a two-person team. A hobbyist may describe a technically sound method without establishing commercial success.

| Evidence class | What it can establish | What it cannot establish by itself |
| --- | --- | --- |
| First-person shipped-production account plus identifiable release | A team used a method in a delivered game; concrete constraints and tradeoffs. | Causal sales impact, universal productivity gains, or suitability for our architecture. |
| Inspectable repository, skill source, official API or model card | Actual instructions, interfaces, dependencies, formats and declared capabilities. | Output quality, maintenance reliability, or production acceptance without trying it. |
| Detailed creator workflow with build or process artifacts | A reported sequence of preparation, tools, iteration and results. | A finished game, robust multiplayer, reproducible costs, or superiority of one model over another. |
| Vendor case study or sponsored demonstration | Named adoption or a vendor-supported example, with attributed claims. | Independent productivity measurement or an unbiased comparison. |
| Research benchmark with published method | Performance on the described tasks, judge and model versions. | Game-specific player enjoyment, production art quality, long-lived character fidelity, or generalization to this codebase. |
| Community discussion | Leads, recurring failure modes, useful hypotheses and practitioner vocabulary. | Representative prevalence, verified credentials, or a controlled model comparison. |
| Researcher's synthesis | A justified recommendation connecting multiple sources to OpenLegend. | A measured outcome; proposed experiments remain unrun. |

We record creator identity, the relevant game, release/demo status, access to reproducible material, commercial incentives, and whether success numbers are independently established. “Shipped” is not a synonym for “good,” and sales or review counts do not isolate the effect of AI. A prototype can still contain valuable production techniques.

## 4. Distinctions that prevent the wrong decision

### Model, harness, tool and asset

A language model can choose a composition, write instructions and operate Blender through a tool. The harness supplies available tools, parallel workers, state, screenshots and permissions. An image or 3D generator produces another artifact. The runtime engine displays the result. Comparing complete videos with different references, tools, budgets and time does not isolate the language model.

The important practical comparison is first the complete production workflow: how long does it take to obtain a coherent, usable, maintainable result? A separate controlled comparison can then ask whether changing the model improves that workflow.

### Beautiful image, working interaction and complete game

An inventory screenshot can look excellent while dragging, keyboard selection, stack splitting, unavailable actions or narrow layouts fail. A convincing scene can have bad collision or unusable attacks. A playable local demonstration can still have no demonstrated networked persistence or multi-user authority.

The research therefore records visual quality, functional behavior, integration, operation and player experience separately. None should be inferred from a creator calling something an MMO or a “full game.”

### Development-time automation and generation during play

A developer may review an asset offline, repair it, commit it and ship it. A live player-created item needs bounded spending, provenance, compatible representations, truthful readiness, failure recovery and controlled publication. An unattended desktop workflow is not an acceptable specification for that live system. Existing OpenLegend authorities continue to own those requirements. [Runtime art contract](../../../docs/invention-art-pipeline.md)

### Reference art and production assets

Reference examples communicate composition, hierarchy, material language and readability. They do not automatically come with rights to ship their icons, fonts, characters, logos or UI borders. The recommended workflow extracts the useful visual principles and produces original or appropriately licensed production assets, preserving their provenance through the existing asset owners. [Art-direction ownership](../../../docs/maintainers/art-direction.md)

## 5. Search and inspection approach

The investigation begins with all user-supplied sources: both Reddit threads and the community itself, three YouTube links, the two attached transcripts, the Project Tomorrow transcript in chat, Higgsfield, Top3D, Learn3D, and the game-development skills catalogue.

It then branches into:

1. Identifiable creators and shipped-production comparisons, including conventional procedural pipelines.
2. First-party tool documentation and actual public skill files.
3. Game art, animation, environment, lighting, UI, audio, story, character and playtesting workflows.
4. Current official model capabilities and research evaluations, avoiding generic coding leaderboards.
5. Counterexamples: manual cleanup, failed rigs, visual inconsistency, incomplete demos, human editorial work, and workloads where native rules or existing assets are better.
6. OpenLegend-specific application, with existing owners, tradeoffs and a small test that could falsify a recommendation.

The source register and individual dossiers preserve the inspected sources and their access limits. Search-result discovery is not silently represented as reading a whole article or watching a whole video. Dates shown by a crawler, a source's own publication date and the October 17 research date are different facts. Ambiguous relative timestamps are not converted into invented exact dates.

The attached transcripts are read as supplied, including transcription errors. Their model names, costs and creator claims are checked where possible; uncertain numbers remain attributed. Full transcripts and external skill collections are not copied into the repository.

## 6. Completion and uncertainty

No finite web search can establish that every relevant private workflow or public source has been found. The useful standard is explicit coverage of every requested subject, multiple independent lines of evidence for major recommendations, source-file inspection for shortlisted skills, current official checks for changing capabilities, and disclosure of unresolved questions.

This assignment completes a research and recommendation package. It does not claim a paid bake-off, live OpenLegend UI inspection, installation test of external tools, benchmarked device capacity, completed asset production, or human playtest. Those activities would supply evidence that documents and videos cannot.

A recommendation is strongest when it is useful even if today's leading model changes: curate a visual target; reuse approved components; generate only missing content; keep asset identity and mechanics separate; show agents the actual result; compare alternatives fairly; measure accepted output and correction effort; preserve the player's experience as the goal.
