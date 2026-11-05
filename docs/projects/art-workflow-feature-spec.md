# Art workflow — feature specification

| Status      | Current progress                                                                                                                                                                                                          | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The procedure and tools are delivered; selective repair and prototype-to-polish handoffs are specified. New people still require the PPL body/clothing decisions; art acceptance and the remaining proof assets are open. | 2026-11-05   |

This project redesigns how OpenLegend makes art: one procedure that turns a request such as "turn this character sheet into a rigged model for the game" into finished, reviewed, preserved files, with explicit tool defaults, explicit artistic latitude and no built-in look. Mike asks; an agent, or a junior artist following the pages, does the work. The normal full path has three review points; unresolved consequential choices are resolved before dependent work, and the prototype path needs no candidate-selection round.

The procedure itself lives in the [art workflow pages](../production-workflows/art-flows/README.md). This document owns the purpose, the decisions and their reasons, the scenarios, acceptance and what remains; the [technical design](art-workflow-tech-design.md) owns the page structure, the helper tools, source/export handoffs and remaining delivery tasks.

## Maintained records

- **Implementation:** [AF04–AF14](../maintainers/art-direction.md#art-flow-follow-through) in the art-direction tracker; [PPL01–PPL03](../maintainers/art/people.md) own the ND39–ND42 body, face, hair, clothing and character-sheet design decisions. This workflow refinement does not close those decisions.
- **Limits and constraints:** no new discretionary limits. Model budgets are the existing [A3D04–A3D06](../limits/3d-pixel-art.md#a3d04--mesh-complexity) profile, the local preview applies the existing [A3D02](../limits/3d-pixel-art.md#a3d02--encoded-intake-and-runtime-payload) intake bound, and storage follows [AST](../limits/game-asset-storage.md). Spending follows the repository [spending policy](../../.agents/rules/verification.md#spending).
- **Related contracts and designs:** [technical design](art-workflow-tech-design.md); the workflow pages ([README](../production-workflows/art-flows/README.md), [tools](../production-workflows/art-flows/tools.md), [profiles](../production-workflows/art-flows/profiles.md), [3D models](../production-workflows/art-flows/3d-models.md), [production](../production-workflows/art-flows/production.md), [study record](../production-workflows/art-flows/study-record.md)); the art direction's [current direction at a glance](../../art-direction/decisions.md#current-direction-at-a-glance); the [runtime invention art contract](../invention-art-pipeline.md) and the proposed [generation and publication design](3d-pixel-art-asset-pipeline.md); rig families under [V3D05–V3D06](../maintainers/3d-pixel-art.md#v3d05--rigged-character-and-equipment-family).

## 1. Purpose

OpenLegend's art problem is not making one beautiful image. It is producing, at a steady pace, the people, creatures, tools, structures and states that the first playable game needs, in whatever look Mike has currently chosen, without Mike having to manage tools, prompts or files.

The previous workflow pages were sound in principle but abstract: no tool was named as a default, no step said which command to run, the route from a character sheet to a rigged model was a paragraph, and pieces of the current look (pixel treatment, proportions, interface parts) were written into the procedure itself. A junior could not follow them, and a change of look would have meant editing the workflow.

The redesigned workflow is:

- **Concrete:** every stage names its default tool, command, output, check and stop, with costs.
- **Adjustable:** a simple or full path, per-step options, tools, fidelity, candidate counts and the stopping point are request settings with defaults, and supplied material skips the steps it already answers.
- **Look-neutral:** the look comes from the art direction through one stable entry point.
- **Play-first:** acceptance happens in the game's own view, against checks that matter to play.

## 2. What makes this worth building

The pipeline should spend effort where OpenLegend differs from ordinary survival games. Each idea below is grounded in the repertoires and world specifications; together they determine what the workflow checks and what it makes first.

| Promise of the game                           | What the art workflow does about it                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Priority |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **People you recognise and remember**         | Each person gets a **signature** of two or three features visible at play distance, preserved where identifying information is intended to remain visible. Deliberate concealment and supported transformations follow the [play checks](../production-workflows/art-flows/profiles.md#play-checks). The **name check** asks whether someone can tell who is who in an unlabelled capture, because players often meet "a person" before they learn a name ([knowledge](../worlds/base/knowledge.md)). | Core     |
| **Invention that looks like what you made**   | Invented things come from fixed families (sling, bow, arrow, gathering tool, woven containers, cordage, shields) whose looks follow family, part materials and compiled values, never the name ([invention families](../worlds/base/invention-families.md)). The workflow makes **part kits** with material variants and attachment points, so a new invention composes without new art.                                                                                                              | Core     |
| **A world that shows what actually happened** | A **state sheet per family**: exactly the visible states the simulation records (wall damage bands and salvage, gate open/closed/barred, hearth cold/lit, bush full/depleted, corpse and remains) and nothing it does not. The **state check** verifies they read apart at play distance.                                                                                                                                                                                                             | Core     |
| **Danger you can read**                       | **Telegraph-first animation:** wind-up, aim, release and recovery for each weapon and for wolves, the bear and the stag, before idles are polished. The game discloses attack preparation to observers through the attacker's pose and motion ([combat](../worlds/base/combat.md)), so these clips must show that cue clearly; the animation itself decides nothing. The **threat check** reads them from front, side and behind.                                                                     | Core     |
| **A camp that is real construction**          | Walls and gates are built from their real parts (posts, wattle panels, ties, rails, bar, the 0.30 m hand window), so a missing panel looks like the real gap and raw poles look different from trimmed posts ([editable shelters](../worlds/base/editable-shelters.md)). The **construction check** covers it.                                                                                                                                                                                        | Core     |
| **Clues you can solve by looking**            | Authored evidence that already exists in the world (Mara's torn red fastening, the stag's hoof tracks, breached Watchpost walls) gets art matching its inspection text, cheaply, because it is static.                                                                                                                                                                                                                                                                                                | Core     |
| **Fast iteration on the world**               | A short route to an inspectable result: defaults remove repeated tool decisions, reports cover mechanical file checks, and a local model preview shows a candidate in the game's own renderer without publishing it ([technical design](art-workflow-tech-design.md#5-local-model-preview-in-the-study-viewer)).                                                                                                                                                                                      | Complete |
| **Worlds with their own looks**               | The workflow carries no look, so another authored world can bring its own art direction to the same procedure.                                                                                                                                                                                                                                                                                                                                                                                        | Depth    |

**What the first playable needs drawn** (from the world specifications; the [repertoire priorities](../repertoires/gameplay-priorities.md) defer to the first-scenario list):

- **People:** seven: the player, Ada, the Peacock Mercenary, Mara Reed, Tavin Vale, and Kest (shield) and Orin (bow) at the Watchpost. The restored mercenary and fitted library humans exist as candidates; none is accepted yet.
- **Animals:** hares, deer, birds, wolves, bears and the territorial stag. The current sourced animals and remaining gaps are owned by [AD09](../maintainers/art-direction.md#ad09--follow-through-on-the-grounded-stylized-direction); an earlier unresolved bear-source question does not override the selected WildMesh source. Motion and population qualification still need their own evidence.
- **Tools and weapons:** knife, knapped stone tool, club, shield, spear, camp hammer, field sling, Orin's bow and arrows, reed comb, pole hook, branch hook, river line. The club, hammer, hooks, comb, river line and knapped stone have no art in the current look.
- **Camp:** posts, wattle panels with damage bands and salvage, the sliding barred gate, a reed-mat roof, canopy posts with weather cloth, and a four-stone hearth.
- **Containers and stock:** pouch, open basket, woven containers of varying size, satchels and caches; ground piles of real items; poles, fibre, cord, stone, flint and bone.

**Ideas this review surfaced for other owners** are recorded in [showing the world's actual state](../game-ideas/visible-world-state.md): wetness from the moisture value, camp stock drawn from real items, and animating the ecology the game already runs.

**Deliberately not now** (over-engineering at zero players): paid generation during play, a universal wardrobe implementation before the selected [PPL clothing design](../maintainers/art/people.md) is settled, per-object history art, live footprints and wound decals, seasonal growth, face-landmark exports before NPC face recognition exists, and any automated multi-provider fan-out service.

## 3. Decisions

The decisions below retain their recorded provenance. Current production follows the latest art direction and the people-from-parts requirement; older proof methods do not authorize a rejected source or a fused-clothing replacement.

### 3.1 The outdated "artgen" skills

Mike asked what the claude.ai-synced skill `/anthropic-skills:openlegend-art-pipeline` is and how it differs from the repository's `openlegend-art` skill.

- **What it is.** The synced skill (and its companion `openlegend-art-cleanup`) is a command-by-command runbook for a tool called `artgen` (`art-direction/pipeline/artgen.mjs`). It ran a brief, generated eight concepts through fal.ai (four Nano Banana 2, four FLUX.2 pro, about $0.56), let Mike pick in a browser page, made A-pose reference views ($0.15 each) and generated eight 3D candidates (Hunyuan3D v3, Tripo H3.1, TRELLIS.2 and Rodin Gen-2.5, about $3). It then pixel-cleaned them in Blender and finalized a GLB into `art-direction/assets/generated/`, with a $10 job cap.
- **Finding.** `artgen.mjs`, `art-direction/pipeline/`, its `style.json`, `providers.json`, style bible and repository skill copy never existed in any branch or in the history of `Macrofold/OpenLegend`. The only trace is a note in the [Midjourney plans page](../../art-direction/midjourney/08-plans-costs-rights-privacy.md) that artgen's executable implementation was never supplied. The skill would fail at its first command.
- **Difference.** `openlegend-art` was the real, maintained workflow: a router into the Standard and Higgsfield procedures covering every kind of art, with no named defaults or commands.
- **Decision.** Adopt artgen's useful specificity into the real workflow, and recommend retiring the synced skills ([OD4](#od4--retire-the-synced-artgen-skills)).

| From artgen                                                                            | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A clean-reference-views step (A-pose front plus left, back, right) before any 3D spend | **Adopted** as [Stage 3](../production-workflows/art-flows/3d-models.md#step-3--make-clean-reference-views), with view rules and an agreement check.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Concrete default tools and candidate counts                                            | **Adopted** as the [default roster](../production-workflows/art-flows/tools.md#default-roster) and the candidate defaults in the request settings.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Spreading one prepared input across several 3D providers, then picking                 | **Adopted** as three candidates by default on the full path: two Meshy and one Tripo, both reachable through the already-connected Higgsfield account. Further providers are [OD2](#od2--a-second-3d-provider).                                                                                                                                                                                                                                                                                                                                                                                                  |
| Outside models (MakeHuman/MPFB bodies, hand-made, CC0) as equal candidates             | **Adopted as a sourcing option**, subject to current source acceptance. Stock MakeHuman bodies are rejected for the game; a hidden-base experiment is unresolved under PPL01, not an approved exception.                                                                                                                                                                                                                                                                                                                                                                                                         |
| A real height in metres in the brief                                                   | **Adopted** as a required game fact.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Estimates before paid steps, a cost cap, no automatic paid retry                       | **Kept** (already policy); made concrete with per-tool estimate commands.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Baking pixelation into models in Blender (triangles, texels per metre, palette)        | **Rejected as a workflow step.** It was an automatic, model-wide treatment written into the procedure and tied to one look. How surfaces are prepared for the selected look belongs to the art direction's [production notes](../../art-direction/decisions.md#how-the-current-look-changes-production). Triangle budgets for performance remain. The earlier claim that baking would "double" the renderer's pass was incorrect: historical recipes also painted fixed palette cells on rigid surfaces. This decision assigns style-specific treatment to the look owner; it does not require pixel processing. |
| Saving final models into `art-direction/assets/generated/` in Git                      | **Rejected.** Asset payloads always live outside Git in the asset library.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Its style bible and fixed model list                                                   | **Rejected.** The style bible does not exist and predates the October 16 direction; the model versions are dated. Tools are now defaults that requests can override.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| The `artgen` tool itself                                                               | **Not adopted.** It does not exist; existing CLIs (Higgsfield, Blender, the asset tool) plus a few small helpers cover the same ground.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

### 3.2 Artistic freedom

Mike asked whether turning a character sheet into a model leaves artistic freedom or is purely mechanical. **It is not mechanical.** Judgment enters when:

- resolving views that disagree;
- inventing what the sheet does not show (backs, undersides, under a cape);
- choosing a body and rig family;
- interpreting materials for the current look;
- deciding topology;
- repairing generated defects;
- acting in animation.

Image-to-3D services invent hidden geometry on their own. The workflow therefore makes the latitude explicit: a **fidelity** setting (`exact`, `faithful` by default, `interpretive`) with named **locks** and **free** areas. Every consequential interpretation is recorded in the study record, so Mike can see what was decided rather than copied. The vocabulary matches the runtime presentation contract's pinned features and cosmetic freedom. Under `exact`, the Gildmoss lesson applies: "exactly as shown" means the source's own texture and colour, verified on a matched-scale sheet.

### 3.3 Platforms and models are request settings with defaults

Mike asked whether the platforms and models in artgen (fal.ai, Tripo, Nano Banana and others) should become options. **Decision:** every stage has a default from the platforms the project already uses. A request can name a platform or model for any stage, and that overrides the default for that stage only. "Standard", "Higgsfield" and "both" remain as presets because Mike uses those words. Volatile facts (model IDs, prices, commands) live in one page with check dates, [tools and defaults](../production-workflows/art-flows/tools.md). One meaning changed: "standard" used to mean direct tools outside Higgsfield. It now means the default roster, which runs every generation stage on Higgsfield ([OD1](#od1--default-generation-platform)); only a `both` comparison keeps a direct side. A named tool that needs a new account or key is never set up silently: the agent says what is needed and asks.

### 3.4 The workflow carries no look

Mike's direction: "We shouldn't hardcode any specific artistic interpretation into the workflow itself." **Decision:**

- **One stable entry point.** The workflow reads the look from [current direction at a glance](../../art-direction/decisions.md#current-direction-at-a-glance), which names the current world-art, interface and concept owners.
- **Look-specific production rules collected.** The rules that depend on the selected look live in **how the current look changes production**: asset/material treatment, deliberate identity details, accepted/rejected source forms, physical scale, review conditions and playback presentation. Earlier pixel-pass and held-pose decisions are historical, not current workflow steps.
- **Style wording removed from the procedure.** Workflow and handbook pages lost their style-specific wording (pixel sampling, "natural proportions", specific UI parts, example games used as direction).
- **Change the look in one place.** When the look changes, only the art-direction section changes. This also respects the [engine and world separation](../engine-and-world-boundaries.md): the procedure is engine-side, while the look belongs to the bundled world.

### 3.5 Structure and conventions

- **One procedure.** The separate Standard and Higgsfield pages are gone: their procedure folded into the shared README, and their tool facts into [tools](../production-workflows/art-flows/tools.md).
- **A dedicated 3D route.** [3D models](../production-workflows/art-flows/3d-models.md) is the step-by-step route for props, characters and creatures; the production page keeps the package rules and the other recipes.
- **One skill body.** `/ol-design` is an alias of `openlegend-art`.
- **Three decision points on the full path.** Mike picks a direction, picks a candidate and accepts; the simple path makes one result for him to review. Everything else is the agent's job, and technical checks never stand in for acceptance.
- **Naming and working folders.**
  - Study IDs: `YYYY-MM-DD-<subject>[-<purpose>]`.
  - Candidate IDs: `c`, `v`, `m`, `k`, `f` plus two digits.
  - Working folder: `~/Documents/ChatGPT/OpenLegend-art/<study-id>/study/` with stage folders.
  - Default storage: study material to `art-studies` / `curated-private`, editable sources and packages to `art-library` / `curated-private`, the domains every archived study already uses. Every meaningful output is uploaded as soon as its batch finishes, and only the exact references are kept locally; only very likely temporary scratch stays local (Mike, October 31).

### 3.6 Simple and full paths (November 1, 2026)

Two requests met on November 1. The prototype work merged into `main` made model and animation generation default to one usable prototype export, with automatic rig, clip, material and format settings, and added a path to finalize a selected model. Mike then asked for a path for simple art generation and a path for full art generation, with options for each variation (a polished animation or not, a cleaned-up model or not, ideation and concept steps or not, steps skipped because of what is supplied), and for prototype or full art to be easy to ask for. **Decision:**

- **Two paths, one setting.** `quality=prototype` is the simple path and `quality=finished` the full path, chosen in ordinary words ("quick", "rough", "prototype"; "finished", "polished", "game-ready"). A quality word decides; a destination such as "for the game" does not, and asking to pick gives that step the full path's candidates. Model and animation generation default to the simple path; finished or game-ready assets and every other request default to the full path; "polish/finalize" moves a prototype to the full path at Finish.
- **Step options.** Concepts, views, candidates, cleanup, rig, clips, motion polish, materials, format and critique each have a default per path, and naming one changes that step only, as in "a prototype, but with a polished walk".
- **Supplied material skips what it answers.** A sheet or concept skips concepts, clean sheet views are cropped, a saved model starts at Finish, and a compatible rig and adequate materials are kept.
- **Default clips.** An animated walking character gets `Idle`, `Walk` and `Run`: the prototype work's idle and walk plus the `Run` the game's loader requires, with named motions added. Mike confirmed on November 3 that a walk is expected by default.
- **What no option removes.** A model the game will load keeps the file check, an animated character always carries the `Idle` and `Run` the game's loader requires, every 3D model gets one look in the game's renderer, and both paths preserve every meaningful output.

Most requests want either a quick usable look or finished art, and neither Mike nor a junior should decide every step. The simple path reduces optional work; dated provider estimates belong in [tools](../production-workflows/art-flows/tools.md), and actual cost includes repair and inspection, not just generation. The full path keeps the review points that caught rejected art. The tradeoff: a prototype skips the fidelity sheet and the critique, so it is never evidence of acceptance or of family qualification. The step options are request words read by the agent, not provider settings or a service.

### 3.7 Repair only the failed dependency

The [character-production research](../../art-direction/research/3d-pixel-worlds/character-production-2026-10-31.md) supports selective part generation, directly useful meshes, rough motion before polish and checking the exported result. These refine the existing procedure; they add no required provider comparison, retopology, high-poly sculpt, cloth simulation or inverse-kinematics pass.

**Experiment status:** selective repair and reuse already existed in the handbook. The additional handoff/recheck detail and any newly selected production technique are unqualified experiments where their workload, correctness or runtime effects are uncertain. The [isolated comparison](art-workflow-tech-design.md#isolated-workflow-experiments) must run before adopting extra routine process or claiming an efficiency improvement; documentation review is not that evidence.

- **Part control has two meanings.** A separate generation job can repair a head or accessory without remaking successful work. Separately, the selected world can require a part to remain removable or adjustable. Future people have that requirement under [PPL](../maintainers/art/people.md); it cannot be waived by choosing prototype quality. A rigid prop without exchangeable parts does not acquire it merely because it was generated in pieces.
- **Use what already works.** Refine a direct mesh if its form, requested deformation, material mapping and export meet the brief. Rebuild topology or bake detailed geometry only to solve a demonstrated problem. Simple utility-map baking for a chosen material method is a separate decision.
- **Polish resumes the selected asset.** Preserve its exact source, rig, requested clips and adequate materials. The [repair table](../production-workflows/assets-and-animation.md#repair-map-and-downstream-effects) determines which downstream checks become stale; no wholesale regeneration or repeat candidate contest is implied.
- **The short path has a real exit.** A prototype must load and perform its stated use with the required identity and proportions. Record cosmetic limitations, but do not call a broken requested motion usable merely because it is labelled a prototype. A checked export, a shared-family qualification and Mike's artistic acceptance are separate outcomes.

## 4. Scenarios

Each scenario names its trigger, what Mike sees, the decision points and a meaningful failure. New-person scenarios apply only after the [PPL decisions](../maintainers/art/people.md) authorize the body/parts route; retained study exceptions are not a general production method.

1. **Concept study.** _"Concept art for Tavin Vale, three directions."_ The agent reads the look and Tavin's facts, states the plan line (about $0.35), generates three distinct directions, fixes anatomy and placeholder defects with targeted edits, and shows one labelled sheet. Mike picks c02 or asks for another round. The study ends archived. _Failure:_ the default model keeps producing the same face; the agent audits a second model on the same brief and says so.
2. **Prop sheet to a finished model.** _"Turn this spear sheet into a finished model; keep the blade and bindings exactly."_
   - **Plan.** Preserve those locks, resolve actual dimensions and the held/ground consumer, then reuse usable views. Use the full path's default candidates only if a suitable accepted source is absent; estimate that selected route before spending.
   - **Pick.** Compare the candidates at matched scale and in the game's renderer. Mike selects one; the report distinguishes raw-source gaps from final export requirements.
   - **Finish.** Keep working geometry and UVs, repair only failed shape/material/attachment details, and check the delivered grip and orientation against the selected target. A rigid spear needs no humanoid rig.
   - **Accept.** Mike reviews the checked package; it is preserved. Integration remains a separate requested step.
   - _Failure:_ a generator fuses the binding into an incorrect grip shape. Diagnose the reference or source-method failure, repair or generate only the affected piece, and recheck fit. Generating that piece separately does not require another runtime draw object.
3. **State sheet.** _"Production models of the wattle panels, intact and damaged."_ The agent reads the shelter specification, finds intact, damaged, nearly broken and salvage, and makes one source with four states built from real parts. The state check confirms the four read apart at play distance. _Failure:_ the game has no "burnt" state; the agent does not make one.
4. **Tool override.** _"Concepts with Nano Banana Pro, 3D with Rodin."_ Nano Banana Pro runs through Higgsfield, already connected. Rodin is offered through fal.ai, which needs an account and key that are not configured, so the agent reports the requirement and asks, while preparing everything else. (Tripo, by contrast, is already reachable through Higgsfield.)
5. **Resume.** A new thread receives `2026-11-02-mara-reed-3d/m02`. It reads the record's Resume section, recovers any outstanding job, fetches the archived files and continues at Stage 5 without regenerating.
6. **Comparison.** _"Use both flows for a character appearance study."_ Shared inputs are frozen once; Standard and Higgsfield run independently with distinct IDs; one index compares coverage, quality, cost and Mike's involvement.
7. **Creature.** _"A wolf for the game."_ A library or specialist source fitted to a nonhuman rig, with stalking, bite wind-up and recovery clips authored before idles; the threat check reads the bite from three sides.
8. **Quick prototype.** _"A quick static model of this stone tool from the sheet."_ Reuse an adequate source or make one candidate from the usable supplied view, keep simple materials, normalize only as required, reopen the export and inspect its form/scale in the intended view. Preserve it and stop; no rig, animation, candidate sheet or polish pass is added. _Failure:_ the grip or silhouette violates a named lock; repair that defect or report an incomplete result. A minor surface blemish can remain for later polish.
9. **Animation only.** _"Give this selected rig a reaching motion; keep the model and materials."_ Reuse the exact target, block the reach and its return, check the hand against the actual target position, export and reopen. Preserve other clips. No new body, garment set, concepts or unrelated motion library is required. _Failure:_ a same-named source skeleton has a different rest pose; correct the mapping or pose and recheck contact rather than declaring compatibility from names.
10. **Finish a retained prototype.** _"Polish this face and coat, keeping the walk."_ Inspect the selected revision, repair the failed face/material or weights, then repeat its affected export and motion checks. A texture-only correction keeps geometry and the rig. A topology change rechecks affected weights and textures. _Failure:_ the available service can rig only its raw output, so rerigging there would discard local repair; use a supported local route or report that dependency before spending.

## 5. Behaviour

The workflow pages own the procedure; in summary:

- **Settings** ([README §2](../production-workflows/art-flows/README.md#2-request-settings)): result, profile, finish (study, production or integrate), quality (the [simple or full path](../production-workflows/art-flows/README.md#quality-the-simple-and-full-paths)) with its [step options](../production-workflows/art-flows/README.md#step-options), fidelity with locks and free areas, tools, candidates, references, selection, stop, budget and resume, all inferred with defaults and stated in one plan line before spending.
- **Look** ([README §3](../production-workflows/art-flows/README.md#3-read-the-look-from-the-art-direction)): read through the stable art-direction entry point into the brief's Look block.
- **Stages** ([README §4](../production-workflows/art-flows/README.md#4-the-seven-stages)): Brief, Explore, Prepare, Make, Finish, Check, Preserve, with decision points after Explore, Make and Check.
- **Tools** ([tools](../production-workflows/art-flows/tools.md)): a dated default roster per stage, presets, overrides, how to estimate cost, and how to recover jobs.
- **3D** ([3D models](../production-workflows/art-flows/3d-models.md)): build-route choice (library, family fit, image-to-3D, hybrid, hand-modelled), view rules, candidate checks, cleanup, rig routes, clips, consumer contract, budgets and in-game review.
- **Play checks** ([profiles](../production-workflows/art-flows/profiles.md#play-checks)): name, same thing, state, threat, construction and scale.
- **Records** ([study record](../production-workflows/art-flows/study-record.md)): state, brief, candidates, decisions, interpretations, construction, review, cost and resume.

## 6. Scope and non-goals

In scope: every offline art request, from concepts to production packages and the handoff to integration. Out of scope:

- runtime art generation during play ([V3D07–V3D10](../maintainers/3d-pixel-art.md));
- choosing the look (art direction owns it);
- qualifying the shared humanoid rig family (V3D05) and the nonhuman family (V3D06), although the workflow supplies their evidence;
- a new asset database, job service or provider abstraction layer;
- automated model scoring.

## 7. Failure cases

| Situation                                                     | Required behaviour                                                                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A named tool needs an account, key or plan that is not set up | Prepare everything else, report the exact requirement, ask. Never sign up, buy or reuse an unrelated credential.                                    |
| Generated views disagree                                      | Name the canonical view, correct the others with targeted edits, record the interpretation.                                                         |
| All candidates fail a lock (fused props, wrong face)          | Identify the failed input, source method or provider capability; repair that cause or change method within scope. More rerolls are not a diagnosis. |
| Budget would exceed the ceiling                               | Stop before dispatch, preserve finished work, report the shortfall and ask.                                                                         |
| A job times out or the session ends                           | Recover the submitted job from its ID; never resubmit while its status is uncertain.                                                                |
| Technical checks pass but Mike rejects                        | Record his words, identify the responsible choice, revise that source; preserve the rejected candidate.                                             |
| The request conflicts with the current direction              | Prepare, then ask which applies; a one-study exception does not change the direction.                                                               |
| Storage is unavailable                                        | Keep the working folder, mark "not yet archived", report the access needed.                                                                         |
| A state or detail the game does not record is requested       | Explain that art cannot assert it, offer the closest supported state, and route a missing mechanic to its owner.                                    |

## 8. Acceptance criteria

1. A junior following the pages can take a supplied character sheet to an archived, checked, owner-accepted rigged GLB, using the documented commands, defaults and decision points after applicable design decisions are settled. The [first proof run](art-workflow-tech-design.md#8-delivery-stages-and-tasks) supplies partial tool evidence; it does not establish owner acceptance, modular people or independent junior execution.
2. No workflow or handbook page states a specific look; changing the look requires editing only the art-direction entry point and the sections it names.
3. Every stage has a named default tool, a cost estimate method and a recovery method; overrides work per stage.
4. Every study record shows fidelity, locks, interpretations, decisions and costs.
5. Candidates are reviewed in the game's own look at the default camera before acceptance, and the profile's play checks are recorded.
6. The guidance checker passes and no link to the removed pages remains.
7. A request chooses the simple or the full path in ordinary words and changes any single step (concepts, views, candidates, cleanup, rig, clips, motion polish, materials, format, critique) without restating the rest; supplied material skips the steps it already answers.
8. A selected prototype can be finalized without replacing valid geometry, rig, clips or materials. The record identifies what changed, which evidence was reused and which affected checks were repeated; unsupported source editing or consumer features remain explicit gaps.

## 9. Delivery stages

1. **Pages and seam (this change):** the rewritten workflow pages and skills, the art-direction entry point, the conventions and the publishing problems list.
2. **Helpers:** the model report and turntable sheet, normalization, and clip assembly for automatic rigs ([technical design §4](art-workflow-tech-design.md#4-helper-scripts)); the image contact sheet stays unbuilt.
3. **Local model preview** in the study viewer ([technical design §5](art-workflow-tech-design.md#5-local-model-preview-in-the-study-viewer)).
4. **Proof run:** one first-playable person without accepted art, plus one state-sheet prop, taken end to end with measured cost, time, correction effort and Mike's decisions; then update the default roster from the evidence.
5. **Proposed, after the proof run:** the people family kit (AF10).
6. **Proposed:** kit-character batches (AF11).
7. **Simple and full paths (November 1):** the quality setting's two paths, the step options and what supplied material skips, reconciled with the prototype and finalize paths.

## 10. Open decisions and questions

This section retains settled decisions and unresolved alternatives. OD1 and OD8 are answered; OD2 adds no account by default. PPL01/PPL02 own the required body/rig, face/hair and clothing choices in OD3; OD4 is an account-level cleanup. Optional study subjects or techniques do not block unrelated prop or animation work.

### OD1 — Default generation platform

**Today's default** (the roster as written): concepts and reference views use the host's built-in image tool where one exists (Codex has one; Claude Code does not); otherwise GPT Image 2.5 through the OpenAI Images API with a key Mike has authorized for art; otherwise GPT Image 2.5 on Higgsfield. 3D already runs on Higgsfield. In a Claude Code session without an authorized OpenAI key, Higgsfield is therefore already the effective default.

**Options:**

| Option                          | For                                                                                                                                                                           | Against                                                                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Keep today's order           | No change; the OpenAI API does not train on API data by default                                                                                                               | Results and billing differ by host; needs a separately authorized OpenAI key                                                                                    |
| B. Higgsfield for everything    | One signed-in account, cost estimates, job recovery, a choice of models (GPT Image 2.5, Nano Banana, Seedream, FLUX.2); monthly credits are already paid and do not roll over | Higgsfield's terms let it train on uploads and outputs (opt-out only by deleting content, or Enterprise); about $0.11–0.13 per high-quality 2K image in credits |
| C. OpenAI Images API for all 2D | No training on API data by default; pay per image (the direct-method study averaged about $0.05 per image)                                                                    | A second account and key for every 2D stage; 3D still needs Higgsfield                                                                                          |
| D. Host tool wherever available | No extra billing in Codex                                                                                                                                                     | Not available in Claude Code; results vary by host                                                                                                              |

**What it decides:** which account a default request spends, how many accounts a junior needs, and where unreleased designs are uploaded.

**Mike's decision (October 31): B, Higgsfield for all generation.** The [roster](../production-workflows/art-flows/tools.md#default-roster) now uses GPT Image 2.5 on Higgsfield for concepts and views. The OpenAI Images API and host image tools remain alternatives a request can name, for example for a design Mike wants kept out of training data.

### OD2 — A second 3D provider

**Finding:** Mike's Higgsfield account already offers Tripo H3.1 Multiview, Hunyuan3D v3 and Meshy 7 besides the Meshy multi-image route, so the defaults now mix two models (two Meshy candidates, one Tripo) at no new account.

**Question:** should an external account join as well? Candidates are direct Meshy (model choice, 8K textures, image enhancement off, ten clips per request) or fal.ai (Hunyuan3D v3.1 with eight views, TRELLIS.2, Rodin).

**Recommendation:** not now. Decide after the proof run, and only if Higgsfield's routes repeat the same failures or miss a control the proof needed. Any new account needs Mike's key, so this is his call.

**Proof-run evidence (October 31):** the two connected models were enough for five people. Tripo needed a non-obvious view order and texture setting to come back facing the front, and Higgsfield cannot upload a cleaned model for rigging, so the raw candidate is what gets rigged ([tools](../production-workflows/art-flows/tools.md#rigging-and-clips)). Neither limit yet justifies a second account.

### OD3 — The humanoid body family and rig for the cast

**Mike's answer (October 31):** "Ok" to the MPFB direction, with a request to see the options. The body family is therefore provisionally MPFB; the rig variant stays open. Qualification still belongs to [V3D05](../maintainers/3d-pixel-art.md#v3d05--rigged-character-and-equipment-family).

**Mike's feedback (October 31):** the fitted MPFB study people "don't look very good"; the Peacock Mercenary "is much better". Their look comes from stock CC0 MakeHuman skin, eyes and hair, study garments, little face shaping and simple procedural motion. It is not the limit of the system: MPFB has hundreds of body and face shape targets, and any part can be replaced. But stock MakeHuman parts look generic, and the mercenary's quality came from its own concept, generation and finishing.

**Mike's feedback (November 4):** after generated heads were put on the library bodies for the game: "why are we using the make human bodies? They are horrible." The stock MPFB bodies are rejected as the game's people ([art direction](../../art-direction/decisions.md#how-the-current-look-changes-production)). Later that day Mike required every person to be built from parts (a body from a canonical set, an adjustable face and hairstyle, and clothing they can take off), each selected or generated from their character sheet. The [people-from-parts design](../maintainers/art/people.md) (PPL01, PPL02) now settles the body family and rig, including whether MPFB serves as a hidden base.

**Why it matters more than "a skeleton":** a shared human family (one mesh layout, shape targets and one skeleton) is also what a future character creator and varied NPCs need ([§11](#11-people-families-a-character-creator-and-npc-variety)).

**Options:**

| Option                                                                          | For                                                                                                                                                                                                                                                                                      | Against                                                                                                                                                 |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MPFB body with its Mixamo rig**                                               | Mixamo's large humanoid clip library applies directly; many tools can output Mixamo-named skeletons                                                                                                                                                                                      | Mixamo itself is manual and humanoid-only; its terms must be recorded                                                                                   |
| **MPFB body with its GameEngine rig**                                           | Built for export to game engines; fewer bones than the default                                                                                                                                                                                                                           | Clips from any library need retargeting in Blender, which has no built-in tool                                                                          |
| **MPFB body with its Default rig** (what the six fitted study people use today) | Already working; since November 1 the study people carry Meshy's library clips through a bone map                                                                                                                                                                                        | Very bone-heavy: the exported study files carry all 163 bones (137 without toes in MPFB's documentation), far over the proposed 64-joint budget (A3D06) |
| **Meshy's automatic rig per character** (what the mercenary uses)               | Shares Meshy's library of about 680 humanoid clips                                                                                                                                                                                                                                       | Each person is a one-off mesh: no shared shape targets, so no creator or slider variation                                                               |
| **A custom Rigify rig**                                                         | Full control, good for hand animation                                                                                                                                                                                                                                                    | The most work; still needs retargeting for library clips                                                                                                |
| **Our own wrapped family** (new, October 31)                                    | Each person keeps the look of their own concept, made the mercenary's way. The shared base mesh (MPFB's, or our own) is wrapped onto every generated person and their texture is baked onto it, so all share one mesh layout, skeleton, weights and clips, and can blend into new people | Wrapping and baking is skilled Blender work, unproven in this project; faces need the most care                                                         |

MPFB's other rigs (CMU, for motion capture, and Rigify) suit specialist cases.

**Current disposition:** the earlier wrapped-MPFB recommendation is an unqualified candidate, not the chosen source after the body rejection. PPL01 compares the preferred Quaternius character sources, generation, hand authoring and any explicitly accepted hidden base against body coverage, independent clothes, face adjustment, deformation, rights and cost. Wrapping preserves useful vertex correspondence only when deliberately constructed; it does not prove valid weights, arbitrary slider combinations or garment fit. Do not start that experiment on a rejected or provisional base without Mike's decision.

**Proof-run evidence (October 31):** Meshy's automatic rig worked on all five sheets' people: a 24-bone humanoid with at most 4 influences, well inside the 64-joint budget, for 8 credits per clip. It gives each person a one-off mesh, so it does not answer the family question; the accepted PPL parts/family proof still needs to establish compatibility.

### OD4 — Retire the synced artgen skills

**Question:** delete `openlegend-art-pipeline` and `openlegend-art-cleanup` from Mike's claude.ai skills, or replace their bodies with a pointer to the repository's `openlegend-art` skill?

**Why it matters:** they describe a tool that does not exist, store models in Git, hard-code a look, and can trigger on art requests.

**Recommendation:** delete both. Only Mike can, from his claude.ai skill settings.

### OD5 — First proof subjects

**Mike's decisions (October 31):** first "not yet". Later that day he supplied five character sheets (Sela Tern, Ser Jessa Cairn, Ada, Mara Reed and Orin) with "Run whatever tests you want on these now. Spend whatever you want." The [character-sheet proof run](../../art-direction/studies/2026-10-31-character-sheet-proof/README.md) took all five to rigged models with `Idle` and `Run` that day, by image to 3D and automatic rigging.

**Still to choose:** a person proving the accepted PPL parts/family route and a state-sheet prop. Tavin Vale and a wattle wall panel remain possible subjects, not selections. Wrapping is one candidate method, not a required MPFB path; use current AD09 animal choices for later creature work.

### OD6 — Review surface

**Recommendation:** labelled sheets shown directly in the conversation by default. A host's interactive review page (for example a private Claude artifact with pick buttons) is optional. Record picks in the study record either way. Mike can choose otherwise.

### OD7 — Motion source for shared clips

**Question:** where should the shared human clips come from?

**Candidates:**

- Meshy's library of about 680 humanoid clips, one per rigging job through Higgsfield.
- Mixamo: free with an Adobe sign-in, manual, humanoid only, and described as in maintenance mode.
- Hand-keyed clips in Blender.
- A motion-generation service such as Uthana or Hunyuan Motion.

Blender 5.2 has no built-in retargeting, so any shared-clip source also needs a retargeting method: a constraint script, the free Rokoko plugin, or the paid Auto-Rig Pro.

**What it decides:** the clip set's quality, rights and the effort per clip. The [tools page](../production-workflows/art-flows/tools.md#rigging-and-clips) lists the current options and their limits.

**Recommendation:** decide after the proof run shows which source survives retargeting onto the chosen rig with the least repair; start with Meshy's library because it is already connected.

**Proof-run evidence (October 31):** Meshy's library `Idle` (ID 0) and `Run_02` (ID 14) played correctly on all five automatic rigs, already in place, at one clip per 8-credit job, combined by `art-tool.py clips`. The [character motion study](../../art-direction/studies/2026-10-31-character-motion/README.md) then retargeted eight library clips (idle, walk, run, sprint, attack, punch, dodge, wave) onto those rigs and onto the mercenary's differently oriented rig with the same tool. Long skirts and cloaks split with the stride under automatic weights. On November 1 the same tool put those clips on the MPFB family rig of the 21 fitted study people, with a bone map and rest-pose alignment for their arms and legs ([library people](../../art-direction/studies/2026-10-31-character-motion/README.md#library-people)); Mike has not reviewed the result.

### OD8 — Training on uploaded art

**Findings (checked 2026-10-31):**

- **Meshy:** its [terms](https://www.meshy.ai/terms-of-use) (dated 2026-09-19) let it train on non-Enterprise customers' inputs and outputs unless the customer opts out by emailing support@meshy.ai. The terms state no drawback or feature loss from opting out.
- **The opt-out covers only a direct Meshy account,** which this workflow does not use. Today's Meshy and Tripo jobs go through Higgsfield, so Meshy's customer for them is Higgsfield, not Mike. This is inferred from how the route works, not stated by either party.
- **Higgsfield:** its [terms](https://higgsfield.ai/terms-of-use-agreement) (updated 2026-10-23) let it train on uploads and outputs. The only way to stop future use is to delete the content or the account. Enterprise agreements are excluded, and deletion does not undo training already done. The terms do not say whether providers behind Higgsfield may train on what it passes them.
- **OpenAI API:** it does not train on API data by default and keeps it up to 30 days for abuse monitoring ([business data](https://openai.com/business-data/)).
- **Tripo:** it states it does not train on paid users' content.

**Options:**

1. Accept training for ordinary art.
2. After each study is archived, delete its Higgsfield-side content. This loses Higgsfield's job history and Canvas for that study, and stops only future use.
3. Route designs Mike wants kept private through the OpenAI API for 2D, and through direct Tripo, or direct Meshy with the opt-out, for 3D. That needs those accounts (OD1, OD2).
4. Ask Higgsfield whether its providers train on routed content, or about Enterprise terms.

**Mike's decision (October 31):** opt out only where it is really easy and costs nothing. Meshy's email opt-out qualifies, but only once a direct Meshy account exists, so it is sent if and when one is opened. Higgsfield has no easy opt-out (deleting content loses its history and stops only future use), so nothing changes there. Uploads still respect each reference's rights.

## 11. People families, a character creator and NPC variety

**Current requirement; design still open:** [PPL01/PPL02](../maintainers/art/people.md) and [DG37](../maintainers/needs-design.md#dg37--character-appearance-a-creator-and-varied-populations) own ND39–ND42. Every new person has a canonical body or an explicit no-fit outcome, an adjustable face and hairstyle, and separately wearable clothing. The stock MakeHuman bodies are rejected. The selected source family, fitting ranges and gameplay clothing rules require Mike's accepted design before PPL03 replaces the current procedure. Existing shipped exceptions stay exactly within their recorded scope.

### What can be shared, and what still needs proof

A family can use measured body presets, compatible head/hair parts, a shared humanoid skeleton, fitted garments and material variations. There is no fixed number of body types, heads or sliders in this workflow. The selected world's population and first useful characters determine coverage; canonical means documented and deliberately supported, not a Cartesian product of every age, build and outfit.

| Reusable element                           | What it makes possible                                                                           | What it does not establish                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared vertex layout and shape targets     | Offline face/body adjustments and, with a supported consumer, morph interpolation                | Every combination is anatomically sound, within fit limits or supported by the current renderer                                                                       |
| Authored bone positions/scales             | Selected offline height or proportion controls, and live controls only with a supported consumer | The same animation contacts, bind frame, attachments or clothing fit survive; recheck the changed proportions and do not change physical world dimensions through art |
| A shared skeleton and clip convention      | Reuse of motion, attachment definitions and bone maps                                            | Matching names alone establish equal hierarchy, bind pose, proportions, contacts or weights                                                                           |
| Fitted hair and garments                   | Reusable identity and outfit pieces                                                              | Every layer fits every body or clips safely under all motion; supported combinations need evidence                                                                    |
| Material masks and colours                 | Cheap controlled visual variation                                                                | A new possession, injury, age, rank or other world fact exists because artwork depicts it                                                                             |
| A retained recipe and exact part revisions | Repeatable offline assembly without another generation call                                      | Free total production, distinct-looking combinations, accepted rights or measured crowd capacity                                                                      |

The current prototype defaults apply to the selected output, not to designing a complete kit. An animation-only request keeps its selected target. A static model need not acquire a rig. A future quadruped, bird or other body family is not forced onto the humanoid skeleton; [V3D06](../maintainers/3d-pixel-art.md#v3d06--nonhuman-and-state-composition-proof) owns its separate qualification.

### Candidate production methods

1. **Reuse or adapt accepted parts first.** Inspect the preferred source's actual body, head, hair and garments, rights, skeleton and editable data. A visually liked dressed model may lack a body under its clothes or independently removable garments. Report the missing part instead of inventing hidden usable anatomy.
2. **Generate or author only the missing part.** Use the character sheet to preserve identity and the target family to preserve dimensions, joints and interfaces. A body source is body-only with the approved underlayer; a garment is a garment. A whole dressed shell cannot be treated as a removable outfit or body.
3. **Wrap only when shared topology solves a real need.** Fitting a clean source mesh to a generated form can provide common vertex correspondence. Keep body, face and garments separate where required, transfer or rebuild the affected UVs and weights, then prove the requested deformation and fit. A generic shrink-wrap or surface-deform operation does not automatically preserve useful morph targets, contacts or skinning. Whether MPFB is permitted as a hidden construction source remains PPL01's decision.
4. **Preserve the supported family, not arbitrary blends.** Record allowed body/face controls and tested ranges with their source family. Do not expose untested mixtures as usable merely because coordinates interpolate. Start with the smallest useful body and outfit coverage; expand only when an actual character has no supported fit.

The [production handbook](../production-workflows/assets-and-animation.md#articulated-people-and-creatures) supplies the fitting, motion and repair procedure. The [technical handoff](art-workflow-tech-design.md#6-consumer-contract-used-by-the-3d-route) records exact dependencies without introducing another asset database.

### Delivering the selected combination

**Offline assembly** can use today's GLB delivery path for an explicit fixed-outfit study or approved retained exception. Preserve editable semantic parts even if an export combines primitives. That export alone does not satisfy the new requirement that clothing be removable in play. It also does not authorize another fixed-outfit person while PPL decisions are unresolved.

**Runtime assembly or outfit replacement** needs PPL02's clothing-state design and [V3D05](../maintainers/3d-pixel-art.md#v3d05--rigged-character-and-equipment-family): allowed combinations, hidden skin, fit, shared animation, actual item state and renderer lifetimes. More separate skinned parts can increase draws, material changes and skinning/bounds work; shared source meshes do not by themselves make crowds cheaper. Compare the actual exported scene under the existing budgets. Do not build a general mesh-merging service for this workflow.

**Live face/body sliders** also require the existing morph/lifetime work before admission. A recipe can bake selected values offline without promising a live creator. If a chosen part or consumer is unavailable, retain the approved current result and report the missing capability; never silently change the person, attach unsupported data or claim a prototype finished that feature.

### Staged delivery and ownership

1. **PPL01/PPL02 — Settle the design.** Body coverage and source, adjustable face/hair, rig, garment fit/layers/removal and existing-character exceptions are the decisions. ND39–ND42 stay open until their actual exit criteria are met.
2. **PPL03 — Publish the accepted production procedure.** Map each character-sheet input to an existing part, a bounded repair/generation step or no-fit. This is the prerequisite for AF10, not evidence that parts already exist.
3. **AF07/AF10 — Prove one useful person and a contrasting supported fit.** Follow published PPL03, or Mike's explicit bounded proof exception. Use the agreed source, separate garments and requested motions, with the isolated comparisons above for uncertain changes. Expand to the first-playable cast only after the method works; the video's timing is not a production promise.
4. **AF11 — Batch only a qualified kit.** Reuse exact parts, settings and sources; inspect meaningful variation rather than count mathematical combinations. Named people follow authored facts. Broader generated populations, creator UI and runtime appearance selection stay with DG37 and their world owners.

The world's definitions own appearance choices and ranges; the renderer displays permitted state. Cosmetic randomness stays separate from simulation randomness. Recognition uses acquired world evidence, never mesh IDs or generator metadata ([perception and recognition](../worlds/base/perception-recognition.md)). A pose may communicate an admitted action or selected performance direction; it does not reveal a private motive or make the character choose that action. An ordinary equipment change should preserve visual continuity without assuming a clothing-based identity rule. Deliberate concealment or a supported transformation can change the information available; art review must not force recognition or disclosure.
