# Art workflow — feature specification

| Status      | Current progress                                                                                                                                                                                                                                           | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The workflow pages, skills, art-direction seam, art tool and local model preview are delivered. The first proof run took Mike's five character sheets to rigged, animated models, not yet accepted; the wrapped-family test and a state-sheet prop remain. | 2026-10-31   |

This project redesigns how OpenLegend makes art: one procedure that turns a request such as "turn this character sheet into a rigged model for the game" into finished, reviewed, preserved files, with explicit tool defaults, explicit artistic latitude and no built-in look. Mike asks; an agent, or a junior artist following the pages, does the work; Mike decides at most three things per request.

The procedure itself lives in the [art workflow pages](../production-workflows/art-flows/README.md). This document owns the purpose, the decisions and their reasons, the scenarios, acceptance and what remains; the [technical design](art-workflow-tech-design.md) owns the page structure, the helper tools still to build and the delivery tasks.

## Maintained records

- **Implementation:** [AF04–AF09](../maintainers/art-direction.md#art-flow-follow-through) in the art-direction tracker.
- **Limits and constraints:** no new discretionary limits. Model budgets are the existing [A3D04–A3D06](../limits/3d-pixel-art.md#a3d04--mesh-complexity) profile, the local preview applies the existing [A3D02](../limits/3d-pixel-art.md#a3d02--encoded-intake-and-runtime-payload) intake bound, and storage follows [AST](../limits/game-asset-storage.md). Spending follows the repository [spending policy](../../.agents/rules/verification.md#spending).
- **Related contracts and designs:** [technical design](art-workflow-tech-design.md); the workflow pages ([README](../production-workflows/art-flows/README.md), [tools](../production-workflows/art-flows/tools.md), [profiles](../production-workflows/art-flows/profiles.md), [3D models](../production-workflows/art-flows/3d-models.md), [production](../production-workflows/art-flows/production.md), [study record](../production-workflows/art-flows/study-record.md)); the art direction's [current direction at a glance](../../art-direction/decisions.md#current-direction-at-a-glance); the [runtime invention art contract](../invention-art-pipeline.md) and the proposed [generation and publication design](3d-pixel-art-asset-pipeline.md); rig families under [V3D05–V3D06](../maintainers/3d-pixel-art.md#v3d05--rigged-character-and-equipment-family).

## 1. Purpose

OpenLegend's art problem is not making one beautiful image. It is producing, at a steady pace, the people, creatures, tools, structures and states that the first playable game needs, in whatever look Mike has currently chosen, without Mike having to manage tools, prompts or files.

The previous workflow pages were sound in principle but abstract: no tool was named as a default, no step said which command to run, the route from a character sheet to a rigged model was a paragraph, and pieces of the current look (pixel treatment, proportions, interface parts) were written into the procedure itself. A junior could not follow them, and a change of look would have meant editing the workflow.

The redesigned workflow is:

- **Concrete:** every stage names its default tool, command, output, check and stop, with costs.
- **Adjustable:** tools, fidelity, candidate counts and the stopping point are request settings with defaults.
- **Look-neutral:** the look comes from the art direction through one stable entry point.
- **Play-first:** acceptance happens in the game's own view, against checks that matter to play.

## 2. What makes this worth building

The pipeline should spend effort where OpenLegend differs from ordinary survival games. Each idea below is grounded in the repertoires and world specifications; together they determine what the workflow checks and what it makes first.

| Promise of the game                           | What the art workflow does about it                                                                                                                                                                                                                                                                                                                                                                                               | Priority |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **People you recognise and remember**         | Each person gets a **signature** of two or three features visible at play distance, kept through every view and state. The **name check** asks whether someone can tell who is who in an unlabelled capture, because players often meet "a person" before they learn a name ([knowledge](../worlds/base/knowledge.md)).                                                                                                           | Core     |
| **Invention that looks like what you made**   | Invented things come from fixed families (sling, bow, arrow, gathering tool, woven containers, cordage, shields) whose looks follow family, part materials and compiled values, never the name ([invention families](../worlds/base/invention-families.md)). The workflow makes **part kits** with material variants and attachment points, so a new invention composes without new art.                                          | Core     |
| **A world that shows what actually happened** | A **state sheet per family**: exactly the visible states the simulation records (wall damage bands and salvage, gate open/closed/barred, hearth cold/lit, bush full/depleted, corpse and remains) and nothing it does not. The **state check** verifies they read apart at play distance.                                                                                                                                         | Core     |
| **Danger you can read**                       | **Telegraph-first animation:** wind-up, aim, release and recovery for each weapon and for wolves, the bear and the stag, before idles are polished. The game discloses attack preparation to observers through the attacker's pose and motion ([combat](../worlds/base/combat.md)), so these clips must show that cue clearly; the animation itself decides nothing. The **threat check** reads them from front, side and behind. | Core     |
| **A camp that is real construction**          | Walls and gates are built from their real parts (posts, wattle panels, ties, rails, bar, the 0.30 m hand window), so a missing panel looks like the real gap and raw poles look different from trimmed posts ([editable shelters](../worlds/base/editable-shelters.md)). The **construction check** covers it.                                                                                                                    | Core     |
| **Clues you can solve by looking**            | Authored evidence that already exists in the world (Mara's torn red fastening, the stag's hoof tracks, breached Watchpost walls) gets art matching its inspection text, cheaply, because it is static.                                                                                                                                                                                                                            | Core     |
| **Fast iteration on the world**               | Idea to in-game look in hours: defaults remove tool decisions, scripted checks remove manual inspection, and a local model preview shows a candidate in the game's own renderer without publishing it ([technical design](art-workflow-tech-design.md#5-local-model-preview-in-the-study-viewer)).                                                                                                                                | Complete |
| **Worlds with their own looks**               | The workflow carries no look, so another authored world can bring its own art direction to the same procedure.                                                                                                                                                                                                                                                                                                                    | Depth    |

**What the first playable needs drawn** (from the world specifications; the [repertoire priorities](../repertoires/gameplay-priorities.md) defer to the first-scenario list):

- **People:** seven: the player, Ada, the Peacock Mercenary, Mara Reed, Tavin Vale, and Kest (shield) and Orin (bow) at the Watchpost. The restored mercenary and fitted library humans exist as candidates; none is accepted yet.
- **Animals:** about twenty: hares, deer, birds, three wolves, two bears and a territorial stag. The bear's anatomy is unresolved.
- **Tools and weapons:** knife, knapped stone tool, club, shield, spear, camp hammer, field sling, Orin's bow and arrows, reed comb, pole hook, branch hook, river line. The club, hammer, hooks, comb, river line and knapped stone have no art in the current look.
- **Camp:** posts, wattle panels with damage bands and salvage, the sliding barred gate, a reed-mat roof, canopy posts with weather cloth, and a four-stone hearth.
- **Containers and stock:** pouch, open basket, woven containers of varying size, satchels and caches; ground piles of real items; poles, fibre, cord, stone, flint and bone.

**Ideas this review surfaced for other owners** are recorded in [showing the world's actual state](../game-ideas/visible-world-state.md): wetness from the moisture value, camp stock drawn from real items, and animating the ecology the game already runs.

**Deliberately not now** (over-engineering at zero players): paid generation during play, a universal clothing system or many-slot equipment figure before clothing is scheduled, per-object history art, live footprints and wound decals, seasonal growth, face-landmark exports before NPC face recognition exists, and any automated multi-provider fan-out service.

## 3. Decisions from the October 31, 2026 discussion

### 3.1 The outdated "artgen" skills

Mike asked what the claude.ai-synced skill `/anthropic-skills:openlegend-art-pipeline` is and how it differs from the repository's `openlegend-art` skill.

- **What it is.** The synced skill (and its companion `openlegend-art-cleanup`) is a command-by-command runbook for a tool called `artgen` (`art-direction/pipeline/artgen.mjs`). It ran a brief, generated eight concepts through fal.ai (four Nano Banana 2, four FLUX.2 pro, about $0.56), let Mike pick in a browser page, made A-pose reference views ($0.15 each) and generated eight 3D candidates (Hunyuan3D v3, Tripo H3.1, TRELLIS.2 and Rodin Gen-2.5, about $3). It then pixel-cleaned them in Blender and finalized a GLB into `art-direction/assets/generated/`, with a $10 job cap.
- **Finding.** `artgen.mjs`, `art-direction/pipeline/`, its `style.json`, `providers.json`, style bible and repository skill copy never existed in any branch or in the history of `Macrofold/OpenLegend`. The only trace is a note in the [Midjourney plans page](../../art-direction/midjourney/08-plans-costs-rights-privacy.md) that artgen's executable implementation was never supplied. The skill would fail at its first command.
- **Difference.** `openlegend-art` was the real, maintained workflow: a router into the Standard and Higgsfield procedures covering every kind of art, with no named defaults or commands.
- **Decision.** Adopt artgen's useful specificity into the real workflow, and recommend retiring the synced skills ([OD4](#od4--retire-the-synced-artgen-skills)).

| From artgen                                                                            | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A clean-reference-views step (A-pose front plus left, back, right) before any 3D spend | **Adopted** as [Stage 3](../production-workflows/art-flows/3d-models.md#step-3--make-clean-reference-views), with view rules and an agreement check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Concrete default tools and candidate counts                                            | **Adopted** as the [default roster](../production-workflows/art-flows/tools.md#default-roster) and the candidate defaults in the request settings.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Spreading one prepared input across several 3D providers, then picking                 | **Adopted** as three candidates by default: two Meshy and one Tripo, both reachable through the already-connected Higgsfield account. Further providers are [OD2](#od2--a-second-3d-provider).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Outside models (MakeHuman/MPFB bodies, hand-made, CC0) as equal candidates             | **Adopted**: library and family-body fits compete with generated candidates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| A real height in metres in the brief                                                   | **Adopted** as a required game fact.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Estimates before paid steps, a cost cap, no automatic paid retry                       | **Kept** (already policy); made concrete with per-tool estimate commands.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Baking pixelation into models in Blender (triangles, texels per metre, palette)        | **Rejected as a workflow step.** It was an automatic, model-wide treatment written into the procedure and tied to one look. How surfaces are prepared for the current look (deliberately painted fixed-pixel textures, limited palettes) belongs to the art direction's [production notes](../../art-direction/decisions.md#how-the-current-look-changes-production). Triangle budgets for performance remain. _Correction during review:_ the conversation first said baking would "double" the renderer's pass. The current recipes do paint fixed palette cells on rigid surfaces, so that reason was wrong; the real reason is that any such treatment belongs to the look, not the workflow. |
| Saving final models into `art-direction/assets/generated/` in Git                      | **Rejected.** Asset payloads always live outside Git in the asset library.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Its style bible and fixed model list                                                   | **Rejected.** The style bible does not exist and predates the October 16 direction; the model versions are dated. Tools are now defaults that requests can override.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| The `artgen` tool itself                                                               | **Not adopted.** It does not exist; existing CLIs (Higgsfield, Blender, the asset tool) plus a few small helpers cover the same ground.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

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
- **Look-specific production rules collected.** The rules that depend on the look were gathered there as **how the current look changes production**, from the old workflow wording, world presentation and the generative-art research: the renderer's final pixel pass, surface preparation per the source-study recipes, authored eye accents, concepts may be painted, the interface is never pixel-styled, rejected forms, modelling heights, review conditions and animation holds.
- **Style wording removed from the procedure.** Workflow and handbook pages lost their style-specific wording (pixel sampling, "natural proportions", specific UI parts, example games used as direction).
- **Change the look in one place.** When the look changes, only the art-direction section changes. This also respects the [engine and world separation](../engine-and-world-boundaries.md): the procedure is engine-side, while the look belongs to the bundled world.

### 3.5 Structure and conventions

- **One procedure.** The separate Standard and Higgsfield pages are gone: their procedure folded into the shared README, and their tool facts into [tools](../production-workflows/art-flows/tools.md).
- **A dedicated 3D route.** [3D models](../production-workflows/art-flows/3d-models.md) is the step-by-step route for props, characters and creatures; the production page keeps the package rules and the other recipes.
- **One skill body.** `/ol-design` is an alias of `openlegend-art`.
- **Three decision points.** Mike picks a direction, picks a candidate and accepts. Everything else is the agent's job, and technical checks never stand in for acceptance.
- **Naming and working folders.**
  - Study IDs: `YYYY-MM-DD-<subject>[-<purpose>]`.
  - Candidate IDs: `c`, `v`, `m`, `k`, `f` plus two digits.
  - Working folder: `~/Documents/ChatGPT/OpenLegend-art/<study-id>/study/` with stage folders.
  - Default storage: study material to `art-studies` / `curated-private`, editable sources and packages to `art-library` / `curated-private`, the domains every archived study already uses. Every meaningful output is uploaded as soon as its batch finishes, and only the exact references are kept locally; only very likely temporary scratch stays local (Mike, October 31).

## 4. Scenarios

Each scenario names its trigger, what Mike sees, the decision points and a meaningful failure.

1. **Concept study.** _"Concept art for Tavin Vale, three directions."_ The agent reads the look and Tavin's facts, states the plan line (about $0.30), generates three distinct directions, fixes anatomy and placeholder defects with targeted edits, and shows one labelled sheet. Mike picks c02 or asks for another round. The study ends archived. _Failure:_ the default model keeps producing the same face; the agent audits a second model on the same brief and says so.
2. **Character sheet to game model.** _"Turn this sheet into a rigged model; keep the face and coat exactly."_
   - **Plan.** `faithful`, with locks on face and coat; reference views, then three candidates (two Meshy, one Tripo) through Higgsfield, and a rig with `Idle` and `Run`; about $4–5.50 in all.
   - **Pick.** The agent shows the views with a turntable sheet of the three candidates beside the reference figure, and each candidate in the game's own look beside the cast through the study viewer's local preview. Mike picks m02.
   - **Finish.** The agent cleans m02 in Blender, fits it to the shared body family or rigs it, adds the required clips, checks budgets and play checks, gets a critique, and shows a matched-scale sheet.
   - **Accept.** Mike accepts and the package is archived. Integration is a separate request.
   - _Failure:_ every candidate fuses the satchel to the hip. The agent returns to Stage 3, removes the satchel from the views to make it a separate prop, and regenerates within budget.
3. **State sheet.** _"Production models of the wattle panels, intact and damaged."_ The agent reads the shelter specification, finds intact, damaged, nearly broken and salvage, and makes one source with four states built from real parts. The state check confirms the four read apart at play distance. _Failure:_ the game has no "burnt" state; the agent does not make one.
4. **Tool override.** _"Concepts with Nano Banana Pro, 3D with Rodin."_ Nano Banana Pro runs through Higgsfield, already connected. Rodin is offered through fal.ai, which needs an account and key that are not configured, so the agent reports the requirement and asks, while preparing everything else. (Tripo, by contrast, is already reachable through Higgsfield.)
5. **Resume.** A new thread receives `2026-11-02-mara-reed-3d/m02`. It reads the record's Resume section, recovers any outstanding job, fetches the archived files and continues at Stage 5 without regenerating.
6. **Comparison.** _"Use both flows for a character appearance study."_ Shared inputs are frozen once; Standard and Higgsfield run independently with distinct IDs; one index compares coverage, quality, cost and Mike's involvement.
7. **Creature.** _"A wolf for the game."_ A library or specialist source fitted to a nonhuman rig, with stalking, bite wind-up and recovery clips authored before idles; the threat check reads the bite from three sides.

## 5. Behaviour

The workflow pages own the procedure; in summary:

- **Settings** ([README §2](../production-workflows/art-flows/README.md#2-request-settings)): result, profile, finish (study, production or integrate), fidelity with locks and free areas, tools, candidates, references, selection, stop, budget and resume, all inferred with defaults and stated in one plan line before spending.
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

| Situation                                                     | Required behaviour                                                                                               |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A named tool needs an account, key or plan that is not set up | Prepare everything else, report the exact requirement, ask. Never sign up, buy or reuse an unrelated credential. |
| Generated views disagree                                      | Name the canonical view, correct the others with targeted edits, record the interpretation.                      |
| All candidates fail a lock (fused props, wrong face)          | Return to the stage that caused it; change the input (views, separation), not the number of rerolls.             |
| Budget would exceed the ceiling                               | Stop before dispatch, preserve finished work, report the shortfall and ask.                                      |
| A job times out or the session ends                           | Recover the submitted job from its ID; never resubmit while its status is uncertain.                             |
| Technical checks pass but Mike rejects                        | Record his words, identify the responsible choice, revise that source; preserve the rejected candidate.          |
| The request conflicts with the current direction              | Prepare, then ask which applies; a one-study exception does not change the direction.                            |
| Storage is unavailable                                        | Keep the working folder, mark "not yet archived", report the access needed.                                      |
| A state or detail the game does not record is requested       | Explain that art cannot assert it, offer the closest supported state, and route a missing mechanic to its owner. |

## 8. Acceptance criteria

1. A junior following the pages can take a supplied character sheet to an archived, checked, owner-accepted rigged GLB, using only the documented commands, defaults and decision points (demonstrated by the [first proof run](art-workflow-tech-design.md#8-delivery-stages-and-tasks)).
2. No workflow or handbook page states a specific look; changing the look requires editing only the art-direction entry point and the sections it names.
3. Every stage has a named default tool, a cost estimate method and a recovery method; overrides work per stage.
4. Every study record shows fidelity, locks, interpretations, decisions and costs.
5. Candidates are reviewed in the game's own look at the default camera before acceptance, and the profile's play checks are recorded.
6. The guidance checker passes and no link to the removed pages remains.

## 9. Delivery stages

1. **Pages and seam (this change):** the rewritten workflow pages and skills, the art-direction entry point, the conventions and the publishing problems list.
2. **Helpers:** the model report and turntable sheet, normalization, and clip assembly for automatic rigs ([technical design §4](art-workflow-tech-design.md#4-helper-scripts)); the image contact sheet stays unbuilt.
3. **Local model preview** in the study viewer ([technical design §5](art-workflow-tech-design.md#5-local-model-preview-in-the-study-viewer)).
4. **Proof run:** one first-playable person without accepted art, plus one state-sheet prop, taken end to end with measured cost, time, correction effort and Mike's decisions; then update the default roster from the evidence.
5. **Proposed, after the proof run:** the people family kit (AF10).
6. **Proposed:** kit-character batches (AF11).

## 10. Open decisions and questions

Each needs Mike unless marked otherwise; the recommendation is the agent's.

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

**Why it matters more than "a skeleton":** a shared human family (one mesh layout, shape targets and one skeleton) is also what a future character creator and varied NPCs need ([§11](#11-people-families-a-character-creator-and-npc-variety)).

**Options:**

| Option                                                                          | For                                                                                                                                                                                                                                                                                      | Against                                                                                                                                                              |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MPFB body with its Mixamo rig**                                               | Mixamo's large humanoid clip library applies directly; many tools can output Mixamo-named skeletons                                                                                                                                                                                      | Mixamo itself is manual and humanoid-only; its terms must be recorded                                                                                                |
| **MPFB body with its GameEngine rig**                                           | Built for export to game engines; fewer bones than the default                                                                                                                                                                                                                           | Clips from any library need retargeting in Blender, which has no built-in tool                                                                                       |
| **MPFB body with its Default rig** (what the six fitted study people use today) | Already working, with procedural `Idle` and `Run` clips                                                                                                                                                                                                                                  | Very bone-heavy (older MPFB documentation lists 163 bones, 137 without toes), far over the proposed 64-joint budget (A3D06); unverified for the exported study files |
| **Meshy's automatic rig per character** (what the mercenary uses)               | Shares Meshy's library of about 680 humanoid clips                                                                                                                                                                                                                                       | Each person is a one-off mesh: no shared shape targets, so no creator or slider variation                                                                            |
| **A custom Rigify rig**                                                         | Full control, good for hand animation                                                                                                                                                                                                                                                    | The most work; still needs retargeting for library clips                                                                                                             |
| **Our own wrapped family** (new, October 31)                                    | Each person keeps the look of their own concept, made the mercenary's way. The shared base mesh (MPFB's, or our own) is wrapped onto every generated person and their texture is baked onto it, so all share one mesh layout, skeleton, weights and clips, and can blend into new people | Wrapping and baking is skilled Blender work, unproven in this project; faces need the most care                                                                      |

MPFB's other rigs (CMU, for motion capture, and Rigify) suit specialist cases.

**Recommendation:** our own wrapped family, using MPFB's mesh, shape targets and Mixamo or GameEngine rig as the hidden base. People then look like their own concepts (the mercenary's quality) while sharing one family. Test it in the proof run on one person, and measure the joint count and the time wrapping takes. Do not use the Default rig for new work.

**Proof-run evidence (October 31):** Meshy's automatic rig worked on all five sheets' people: a 24-bone humanoid with at most 4 influences, well inside the 64-joint budget, for 8 credits per clip. It gives each person a one-off mesh, so it does not answer the family question; the wrap test still does.

### OD4 — Retire the synced artgen skills

**Question:** delete `openlegend-art-pipeline` and `openlegend-art-cleanup` from Mike's claude.ai skills, or replace their bodies with a pointer to the repository's `openlegend-art` skill?

**Why it matters:** they describe a tool that does not exist, store models in Git, hard-code a look, and can trigger on art requests.

**Recommendation:** delete both. Only Mike can, from his claude.ai skill settings.

### OD5 — First proof subjects

**Mike's decisions (October 31):** first "not yet". Later that day he supplied five character sheets (Sela Tern, Ser Jessa Cairn, Ada, Mara Reed and Orin) with "Run whatever tests you want on these now. Spend whatever you want." The [character-sheet proof run](../../art-direction/studies/2026-10-31-character-sheet-proof/README.md) took all five to rigged models with `Idle` and `Run` that day, by image to 3D and automatic rigging.

**Still to choose:** a person made as a wrapped family member (the [method](#11-people-families-a-character-creator-and-npc-variety) is untested) and a state-sheet prop. The recommendation stands: Tavin Vale for the wrap, and the wattle wall panel. The bear is the strongest creature candidate later, because its anatomy is the open problem.

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

**Proof-run evidence (October 31):** Meshy's library `Idle` (ID 0) and `Run_02` (ID 14) played correctly on all five automatic rigs, already in place, at one clip per 8-credit job, combined by `art-tool.py clips`. Long skirts and cloaks split with the stride under automatic weights. Retargeting onto a family rig is still untested.

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

Mike asked (October 31) how a player character creator with editable face and body would work, how many NPCs get distinct looks, and whether that changes this pipeline.

**How games usually build a character creator.** Almost always from one base body and head that every character shares: the same mesh layout (topology) and the same skeleton. They vary it in four ways that combine freely:

1. **Shape targets** (morph targets or blend shapes): stored differences of the base mesh, such as nose width, jaw, cheekbones, eye spacing, weight, muscle and age, each driven by a slider. Because every character shares the layout, any mix of sliders is valid.
2. **Bone controls:** scaling or moving bones for height, limb length, shoulder width, head size and some facial features. Cheap at runtime and compatible with ordinary skinning, so most games combine it with shape targets.
3. **Swappable parts:** hair, beards, brows, sometimes whole heads, and clothing, all fitted to the base body and skeleton. Clothes follow the body because they carry matching shape targets or are skinned to the same bones.
4. **Colour and material values:** skin, hair and eye colour, freckles, scars, tattoos and ageing, as tints, masks and decals.

Presets are saved sets of these values. Some games offer only preset heads and bodies plus colours; others expose dozens of sliders.

**NPC variety is the same system driven by code.**

- **Each NPC is a few numbers:** slider values, part choices and colours, sampled from population ranges (by region, culture or family) with a seed. Named characters get authored values.
- **No per-NPC generation:** nothing is paid for, and a save stores only those numbers.
- **"Fifteen canonical body shapes" need not be fifteen models.** They become fifteen presets, or fifteen clusters in the population ranges, over continuous values.

**What it changes in this pipeline:**

- **People are produced as a family.** For people, the pipeline's main product becomes the family itself: the base body and head with shape targets or bone controls, one skeleton, garments and hair fitted with matching shapes, and colour masks. MakeHuman/MPFB is such a parametric human (it is itself a character creator, with CC0 shape targets and several rigs), which is why [OD3](#od3--the-humanoid-body-family-and-rig-for-the-cast) matters beyond the skeleton.
- **Generation keeps its place:**
  - concepts for faces, outfits and cultures;
  - distinctive named characters as bespoke models;
  - garments, packs and props fitted onto the family body (the hybrid route).

  A generated one-off person cannot take shared sliders unless wrapped onto the family mesh, an advanced retopology step.

- **Garments must follow the body.** Each body shape target needs a matching garment target (transferred offline in Blender), or variation is limited to bone scaling. This is family production work in Blender.
- **Faces at play distance:** a person is small at the default camera, so face sliders show mainly in portraits, close inspection and the creator itself. Build, silhouette, hair, clothing and colour carry identity in play, which is why the profiles' signature and name check focus there.

**Our own families instead of stock MakeHuman looks.** The standard way to make many good-looking people share one family is **wrapping**:

1. Keep one base mesh with good deforming topology, shape targets and a skeleton. MPFB's base can serve, hidden underneath.
2. For each person, make the concept and generate the model the mercenary's way.
3. Fit the base mesh onto that model's surface, then bake the model's texture onto the base.

Each person then looks like their own concept, yet keeps the family's layout, skeleton, weights and clips. People can also blend into each other as shape targets, so a population can come from a few authored people. Blender can do the fitting (shrink-wrap and surface-deform modifiers) and the baking; dedicated wrapping tools do it faster. It is unproven here, and the proof run should test it on one person ([OD3](#od3--the-humanoid-body-family-and-rig-for-the-cast)).

**Meshy's automatic skeleton.** When Meshy rigs a model (`--enable_rigging`, or the `3d_rigging` job), it places a standard humanoid skeleton inside that one mesh and paints its skin weights automatically. The mercenary's has 34 joints. The bone names are always the same, so any of Meshy's roughly 680 library clips plays on any Meshy-rigged model. But each rigged person is still a separate mesh with its own layout, so it cannot share shape targets, garments or sliders with anyone else.

**Pre-built parts, combined per character.** The family can also be a kit made once and combined many times:

- a few body builds sharing one skeleton (or one body with shape targets);
- a set of heads, made by wrapping as above;
- hairstyles and beards;
- clothing and gear for each role and culture, fitted to every build;
- colour and material ranges.

Ten builds, twelve heads, ten hairstyles and fifteen outfits give 18,000 combinations before colour, from under fifty pieces. Every piece must fit every body it can meet, which is why shared shape targets (garments follow the body) matter. Rigify, Blender's rig-building tool, is one way to make the shared skeleton; it is not needed for combining parts.

**Delivering combinations:**

1. **Now:** bake each character's combination offline into its own GLB, which works with today's renderer.
2. **Later:** assemble parts at runtime on one shared skeleton. This is cheaper for crowds, but the renderer must support several skinned parts per character, which V3D05's garment and hair work covers.

**The production sequence** (October 31, 2026; the order matters more than the counts):

1. **Prove the method on one person**, when Mike says go: the MPFB hidden base with its Mixamo or GameEngine rig, one person wrapped end to end, with time and cost measured (AF07).
2. **Make the first-playable people as wrapped family members.** Their faces, builds and outfits become the kit's first pieces. Do not build a large kit before any character exists.
3. **Fill the kit's gaps for crowds** (AF10):
   - **Bodies come from measurements, not concept art.** The base's sliders for height, weight, muscle, age and sex give about eight to twelve build presets spanning the world's population ranges.
   - **Faces, hair and outfits come from concept art**, because identity and culture live there. Each is made once (wrapped or fitted) and then reused.
   - The world's own people (ages, roles, cultures) set the ranges.
4. **Produce characters** in one of two ways:
   - **Kit characters**, for most NPCs. There is no generation and no wrapping. The agent picks combinations and slider values within the world's ranges, avoids repeats, bakes each to a GLB, shows a sheet, uploads, and records the recipe. A batch of a hundred costs nothing paid; AF11 provides the batch tool.
   - **Signature characters from a concept sheet.** First try to match the sheet with the kit (nearest face, adjusted sliders, an existing outfit). Generate and wrap only the piece the kit cannot reproduce, usually the face. That piece then joins the kit. A request names neither route; the plan line says which one applies and what it costs, and Mike can say "kit only" or "wrap".

**Faces and sliders.**

- **How faces are made:** each kit face is a concept, a generated head and a wrap onto the shared head, stored as a face shape.
- **Sliders are possible.** Every face shares one mesh layout, so faces can be blended (sixty per cent one face, forty another), and MPFB's feature sliders (nose, jaw, eyes) work on all of them. Presets only would also work.
- **Live sliders come later.** In-game sliders need the V3D05 renderer work; until then, chosen values are baked into files.

**What stays separate (runtime work, not this workflow):**

- **Appearance values as world data:** which sliders exist and their ranges per population belong to the world's definitions, saved with each character.
- **An engine mechanism** that turns those values into shape weights, bone scales and material values in the renderer.
- **A creator interface.**
- **A visual seed** separate from simulation randomness, as the [runtime art contract](../invention-art-pipeline.md) requires.
- **Recognition stays independent:** NPC recognition must not read mesh or asset identity ([perception and recognition](../worlds/base/perception-recognition.md)).
- **Renderer support is missing:** the pinned engine destroys a previous morph instance on assignment, so shape targets need the lifetime work [V3D05](../maintainers/3d-pixel-art.md#v3d05--rigged-character-and-equipment-family) already lists before any GLB with them can be admitted.

**A staged path:**

1. Bake a set of family variants offline (MPFB values to separate GLBs) for the cast and early NPCs. This works with today's renderer.
2. Later, add runtime shape targets and bone controls with a creator, after the V3D05 renderer work and a design.

The future design is registered as [DG37](../maintainers/needs-design.md#dg37--character-appearance-a-creator-and-varied-populations). It is not selected or scheduled.
