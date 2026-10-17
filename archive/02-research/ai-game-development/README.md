# AI game development research for OpenLegend

**Research date:** 17 October 2026. **Project baseline:** `0eb7358f251d1ab706592ccb6e9829e98c729fe9`. **Status:** completed research and proposed workflows; no engine migration, provider switch, tool installation or runtime behavior is adopted by these documents.

## Recommended direction

**Keep the current PlayCanvas and React foundation. Improve the production process around a representative, enjoyable OpenLegend slice: concrete visual references, coherent asset families, editable sources, selective generation and direct inspection of the real game. Audition alternative models for specific jobs.**

The research favors that direction because it addresses the actual project and the user's UI concern while preserving useful work. It does not require confidence that one engine or model is universally best.

This collection contains **14 Markdown documents, 16 developer case studies, 25 tooling-workflow candidates, 14 consolidated principles, 10 working procedures and 189 distinct source records**. Individual skill files, API pages and related publisher material count as resources, not independent studies. The [source register](13-source-register-and-coverage.md) explains coverage, reputation, access limits and what remains empirically untested; [sources.json](sources.json) retains the detailed source metadata.

## Read these first

1. [UI quality and production](08-ui-quality-and-production.md) — why the showcased interface is not a controlled Claude-versus-OpenAI or browser-versus-engine comparison, and how to isolate the actual cause.
2. [Consolidated principles](09-openlegend-principles.md) — what to carry into OpenLegend, with evidence, project-specific reasons and limits for every principle.
3. [Working procedures](10-openlegend-workflows.md) — practical task sequences for interfaces, art, animation, environments, characters, sound and play review.
4. [Evaluation and adoption](11-evaluation-and-adoption.md) — bounded experiments that decide which proposed methods deserve adoption.

For the direct engine question, read [PlayCanvas and Godot](05-playcanvas-godot-and-engine-choice.md). For story/model differences, read [models for stories and characters](06-models-for-stories-and-characters.md).

## Answers to the main questions

### Why is PlayCanvas missing from the supplied skills catalog?

The inspected catalog omits it, and the catalog's router defaults to Godot because that is its deepest area of coverage. PlayCanvas has its own official collection of 16 concrete skills. The omission is evidence about the catalog's coverage, not engine suitability.

There is a real compatibility detail: OpenLegend pins PlayCanvas 2.22.2, while the new runtime-inspection skill requires 2.23+. Useful GLB, calibration, lighting and animation methods should be selected with the actual version and local boundaries in mind. [Engine evidence](05-playcanvas-godot-and-engine-choice.md), [actual skill audit](04-skills-and-tooling.md).

### Should we move to Godot?

**The research does not justify a switch now.** Godot offers credible visual authoring, animation and UI resources, with real web-export tradeoffs. OpenLegend already has a substantial browser renderer and interface. A migration should solve a measured material product or production constraint and be compared using the same art, camera, world data and interactions. It should not be justified by an unrelated demo or a repository omission. [Engine assessment](05-playcanvas-godot-and-engine-choice.md).

### Is Claude better for the game UI?

**The supplied evidence cannot isolate that conclusion.** The WoW transcript describes a prepared reference library, skills, Unity/Blender control, specialized image and 3D services, iteration and human input. Coherent's especially relevant UI example used Claude Design for artboards/handoff, then an agent for implementation. These are useful production methods, without a controlled comparison of underlying models.

OpenLegend already has a design system. The recommended investigation separates artwork quality, originating a visual design, following a design, integration and review. React Aria does not impose a generic dashboard appearance, and browser CSS can implement resizable illustrated frames. No fresh live UI inspection or model trial was performed in this research. [UI analysis](08-ui-quality-and-production.md), [seed audit](12-supplied-examples-and-community.md).

### Are providers different for stories and characters?

There is a meaningful signal for **creative authoring**: current Arena preference ratings favor the selected Claude/Gemini entries over the selected current OpenAI entries. The two leading Claude/Gemini entries are not clearly separated by their displayed intervals. This supports an audition.

A persistent OpenLegend resident has additional requirements: distinct short dialogue, independent concerns, permitted knowledge, accurate memory, native action truth, earned development and workable response cost/time. No public result reviewed settles that combined contest. General coding rankings were excluded. [Narrative model evidence and proposed tests](06-models-for-stories-and-characters.md).

### What about image, 3D, motion and audio models?

Select them independently from the language director. The proposed image comparison is GPT Image 2.5 versus Nano Banana 2.1 on a coherent item family. Tripo and current Meshy routes are candidates for bounded 3D trials. Shared rigs, clips and procedural adjustment remain the starting point for motion; NVIDIA Kimodo is a specific offline constrained-motion lead. Open image, geometry and character models deserve later trials where control or repeated volume justifies their operating work.

These are candidate selections based on capabilities and fit, not measured OpenLegend quality rankings. [Asset and audio dossier](07-image-3d-and-audio-models.md).

### What do reputable developers teach us?

The strongest shipped-game accounts emphasize editable systems and inexpensive revision: Motion Twin's animation/art production, System Era's constrained visual tooling, Guerrilla's procedural placement/materials and Embark's technical finishing. Newer named customer stories suggest valuable AI-assisted variations but seldom disclose full costs. Public runtime mods, AI Dungeon and a released voice game expose context, latency and serving problems that a trailer does not.

The Project Tomorrow creator explicitly used procedural techniques without AI. His shipped prior game provides a reputation signal; the upcoming project and revenue claim require separate treatment. The supplied $2,175 demo figure is a language-model API-equivalent estimate, not an audited all-in production cost. [Developer cases](02-developer-case-studies.md), [procedural methods](03-procedural-art-and-animation.md), [supplied examples](12-supplied-examples-and-community.md).

## Complete document map

| Document                                                                | Purpose                                                                                       |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [01 — Context and method](01-context-and-method.md)                     | Current project facts, baseline, research questions and evidence standards                    |
| [02 — Developer case studies](02-developer-case-studies.md)             | Attributed workflows, shipped/research/prototype distinctions, reputation and transfer limits |
| [03 — Procedural art and animation](03-procedural-art-and-animation.md) | Material graphs, smart surfaces, modular props, vegetation, motion and lighting               |
| [04 — Skills and tooling](04-skills-and-tooling.md)                     | Actual instructions/helpers, 25 candidates, dependencies and compatibility findings           |
| [05 — Engine choice](05-playcanvas-godot-and-engine-choice.md)          | Catalog omission, current client, Godot/Unity/Unreal tradeoffs and migration criteria         |
| [06 — Stories and characters](06-models-for-stories-and-characters.md)  | Current provider evidence, authoring, roleplay, memory, open models and evaluation            |
| [07 — Images, 3D and audio](07-image-3d-and-audio-models.md)            | Separate specialist models, output contracts, rigging, motion, voice and production cost      |
| [08 — UI production](08-ui-quality-and-production.md)                   | Competing explanations of UI quality and controlled design/art/implementation comparisons     |
| [09 — Principles](09-openlegend-principles.md)                          | Fourteen justified recommendations with project fit, evidence and limits                      |
| [10 — Workflows](10-openlegend-workflows.md)                            | Ten selectable procedures for delivering useful game work                                     |
| [11 — Evaluation](11-evaluation-and-adoption.md)                        | Proposed sample tasks, acceptance, accounting and adoption decisions                          |
| [12 — Supplied sources](12-supplied-examples-and-community.md)          | All starting links, transcript reconstruction, cost/reputation caveats and Reddit trails      |
| [13 — Sources and coverage](13-source-register-and-coverage.md)         | Coverage matrix, credibility rules, limits and the source index                               |
| [Source metadata](sources.json)                                         | Machine-readable identities, URLs, dates, evidence types, supported claims and limits         |

This README is the fourteenth Markdown document. The detailed dossiers intentionally separate observed practice from OpenLegend recommendations so future decisions can cite a specific reason rather than inherit an unsupported slogan.

## Practical priorities

Choose the next task from the current playable loop and its biggest quality gap; these are useful priorities, not mandatory serial gates:

- **One attractive working inventory:** concrete design, coherent item art, real state changes and complete-client review.
- **One editable material or prop family:** prove that a useful revision and another variant remain cheap and consistent.
- **One useful animation on a compatible body:** inspect actual motion, contacts and equipment at the game's camera.
- **A small creative-authoring/character comparison:** retain the actual incumbent and judge equivalent permitted evidence.
- **Narrow automation for repeated friction:** use inspected compatible skills and existing project owners rather than adding a generic platform.

## Confidence and limits

This is a comprehensive desk-research pass over the requested areas, with deliberate follow-up from supplied links into primary documentation, source repositories, developer accounts and research methods. It is not proof that every possible source exists in this collection or that an unrun tool will work well for OpenLegend.

The decisive unknowns are now concrete: which visual workflow produces an accepted screen with less correction; which asset route survives export and reuse; and which model produces better valid character moments under the game's actual constraints. The evaluation plan makes those questions answerable without first committing to an engine rewrite, mass tool installation or global provider replacement.
