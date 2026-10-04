# Parallel batch 03 — Personal game — feature specification

| Status      | Current progress                                                                                                  | Last updated |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | PG02, PG03 and PG04 are underway on separate branches; integrated delivery and the remaining acceptance are open. | 2026-10-03   |

[Technical definitions](parallel-batch-03-personal-game-tech-design.md) · [Assignment prompts](parallel-batch-03-personal-game-prompts.md) · [Tracking](../maintainers/parallel-batch-03-personal-game.md)

## Recommendation and source baseline

Select work that makes the existing personal game worth playing and watching: invent something useful, spend time with an independent person, understand available choices, and receive responsive feedback. In parallel, design a first dangerous encounter so combat becomes a deliberate addition rather than another catalogue entry.

This planning pass inspected local `main` at `dd21d1c7`, including the four newly merged branches. It changes documentation only, with zero production logic lines. The assignments are recommendations, not claims that their runtime scope has been approved or implemented. A copied implementation prompt supplies the recipient's requested task; this planning pass dispatches nobody.

The [game-first sequence](five-product-feature-specs.md#game-first-delivery-sequence) and [first-playable agreement](../../archive/05-project/first-playable-mvp.md) are the product baseline. Current canonical contracts prevail over historical wording in that agreement: for example, tab departure and return follow today's multiplayer/lifecycle contracts, not the superseded background-play checkbox. NP01–NP05 are complete for their selected scope and are not restarted here.

October 3 status refresh: family authoring is now merged at c4e18d91. Separate PG02/PG03/PG04 branches are in progress; no integrated acceptance is inferred. [Batch 04](parallel-batch-04-expeditions-and-exchange-feature-spec.md) proposes follow-on work without changing this batch’s scope. The source/exclusion notes below preserve the original planning evidence.

### Allocation in priority order

| Assignment | Outcome                                                                                      | Mode                              | Why now                                                                                                                        | Effort assumption                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| PG01       | A freeform invention becomes useful equipment, a real meal and a retained discovery          | Integration and bounded repairs   | This is the accepted creative promise; separate component proofs do not establish the whole current-main journey               | 2–4 engineering days; roughly 100–600 changed logic lines if gaps are localized         |
| PG02       | One resident chooses, follows through, reacts to results and stops when the reason has ended | Scoped character integration      | More inventory or maintenance commands do not make a person interesting                                                        | 3–6 days; roughly 250–800 logic lines, plus authored content and behavior qualification |
| PG03       | Players discover supported choices and understand the commitment before acting               | Player UI implementation          | Existing mechanics earn little value when players cannot find or interpret them                                                | 2–4 days; roughly 250–650 logic lines                                                   |
| PG04       | Action availability and command feedback stay responsive without changing game rules         | Measured implementation           | Existing profiling attributes significant CPU to disposable command previews; every additional choice increases the exposure   | 3–5 days; roughly 250–750 logic lines, contingent on confirming current attribution     |
| PG05       | A complete first threat encounter, with meaningful avoidance, confrontation and aftermath    | Product and technical design only | Danger adds a distinct reason to explore and use inventions; unresolved recovery choices make immediate runtime work premature | 2–3 days of design/source tracing; zero production logic lines                          |

These ranges include relevant verification, documentation and integration adjustments. They are uncertain estimates for one engineer per assignment, not a fixed workweek, deadline or AI productivity claim. Four assignments change or qualify the game; the fifth produces a decision-ready implementation package. Unequal size follows value and readiness, not a quota across task classes.

### Alternatives considered

- **Family creation and learned relations (original planning baseline):** active uncommitted work was found in `/Users/mzw/.codex/worktrees/e878/OpenLegend`. Excluded. Its changes to family knowledge and creator-edit propagation must be preserved when integrating these assignments.
- **More fire maintenance, repair, packing and prescribed daily routines:** possible repertoire additions, but the current batch has stronger reasons to play. Do not manufacture scarcity to make those tasks necessary.
- **Full continuing communities, crowds, generic stat checks and construction:** useful later proposals; not prerequisites for one interesting resident or one useful invention. PG02 does not implement unattended simulation.
- **General save SQL batching or approximate vector search:** retain their measurement gates. Current evidence is stronger for action-preview cost than for adopting those techniques now. Do not lower history/population limits to make performance appear solved.
- **Broad deployment and historical provider accounting:** WW07 retains external deployable-runtime prerequisites and unresolved historical usage. PG01 qualifies the selected available execution path, not the entire deployment program.
- **Arrow-material assertion:** a confirmed existing check mismatch, already tracked in TODO, belongs inside PG01's material-admission evidence. It is too small to consume a separate assignment.

No new game research was commissioned. This recommendation uses maintained research, product decisions, source and recorded evidence; it makes no claim that external examples were refreshed today or that enjoyment has been demonstrated.

## PG01 — Make an invention matter in play

### Current behavior and scope

Native recipe admission, material roles, manufacturing, melee/ranged use, finite harvesting, cooking, consumption, object identity and save/load already exist. NP03 demonstrates invented cord used in a container through native/supplied proposals; NPC meals have separate behavioral evidence. The remaining selected problem is a complete ordinary-player journey on the integrated build, with genuine generation, useful results and retained knowledge.

Deliver one end-to-end current-main journey, repairing concrete failures through their existing owners. Begin from a fresh authored world without the finished requested recipe. The player expresses a practical intention in ordinary language; the system generates a supported recipe, explains the actual method/material requirements, admits it under the current approval rules, and makes it discoverable for manufacture. Manufacture consumes actual inputs and time. The resulting tool must change an available activity, not merely create a named inventory record.

Use the accepted ranged hunting/food journey, then a contrasting non-weapon construction using the already supported cord/container composition. This is breadth evidence for supported composition, not a requirement that every session follow two quests. The player can decline an invention and use an existing method. No hidden finished recipe, auto-granted ingredients or fabricated model choice may stand in for the live result.

### Completion

- A previously absent recipe is generated through the selected real service path, reviewed/admitted normally, manufactured, equipped and used. A real shot/attempt, prey reaction, finite harvest, required preparation and eating yield visible committed results.
- A supported paraphrase finds the existing technique instead of charging for duplicate generation. Wrong materials, absent ammunition and unreachable prey produce truthful recoverable outcomes.
- A contrasting generated non-weapon proposal uses current supported composition and produces a useful item. Native fixture success remains distinct from live generation success.
- Reload/restart preserves definitions, item identity, learned techniques and the results without repeating payments, ammunition use or harvest. Existing controls govern pause, stale requests and service failure.
- Review the unchanged arrow-material assertion against actual mechanical rejection; correct the assertion or justified role wording without accepting stone as a valid shaft.
- Record complete journey latency, all attributable provider cost and uncertainty, interventions and remaining qualification. Later successful calls do not erase old uncertain charges. A missing live-service prerequisite leaves that acceptance open, with a precise blocker.

Exclude new invention families, generated art infrastructure, arbitrary world-law activation, provider deployment changes and repairs to historical bills without evidence. Existing WW07 and broad INV acceptance stay open beyond this child.

**Priority hypothesis:** the live creative result is a better next payoff than another isolated native command. If the journey already passes unchanged, preserve that evidence and close this scoped gap; do not invent code work. If the supported family cannot honor the chosen intention, expose the actual missing capability instead of silently simplifying the promise.

## PG02 — One resident with reasons to act and reasons to stop

### Current behavior and scope

The bundled resident already has rich identity, traits, empty initial goals, body signals, memory, feelings, chosen goals/plans, reflection and native actions. Do not replace this with a timetable or a new psychological meter system. This assignment is the first attended-world slice of [CE01–CE05](../maintainers/character-experience.md), not completion of the full compelling-character specification.

Connect supported circumstances and consequences to current decisions. Reuse the complete authored identity, current perceived surroundings and inventory, relevant accepted memories/feelings, current intention and remaining plan. Fix demonstrated stale or missing information and ineffective outcome/continuation wiring. A selected intention must reach actual action; an outcome must be available to later reconsideration.

Start with three contrasting concerns using existing supported behavior: bodily hunger, interest in another person, and curiosity/enjoyment pursued alone. The resident may eat, approach and speak, decline company, walk to a perceived place, observe, continue a chosen activity or rest. A movement ending does not mechanically award enjoyment, and standing near someone does not mechanically satisfy belonging. Such interpretations remain character-owned accepted understanding/appraisal, with existing lifetimes and correction semantics.

Content may make the resident's interests and current circumstances more coherent, but must not prescribe a successful itinerary, install a hunting goal, reveal unseen places or invent past encounters. Use ordinary quiet-time/reflection opportunities already available to surface an internal concern; no new constant polling or paid rumination loop. Richer need mechanics under D69 remain outside this slice.

### Completion

- Demonstrate a whole attended episode with a freely selected pursuit, actual execution, consequence, later recall/reconsideration and a legitimate stopping or switching point. Purposeful repetition is allowed; maximum action variety is not the objective.
- Contrast hungry versus sufficiently fed conditions; welcome versus declined contact; and a quiet opportunity for solitary curiosity/enjoyment. No repeated player instruction is needed to choose every step. Refusal and chosen solitude are valid results.
- A material interruption preserves or explicitly abandons unfinished intent through the existing plan owner. Return uses remaining work and actual remembered outcomes; no vague completion message or invented success.
- A quiet-interval example starts from an existing internal opportunity, not a secretly injected external instruction. Absent opportunity support must be named and scoped, not concealed by a scripted trigger.
- Demonstrate perception/privacy, provider failure, pause and absence controls. A paused or unfunded character is not described as freely choosing idleness.
- Use controlled context/content comparisons to locate a demonstrated bottleneck, simplify the successful combination and record total costs, interventions, failures and limits. Model prose alone does not establish causal motivation or enjoyment.

Do not implement family disclosure, new family facts, unattended communities, autonomous invention expansion, a universal personality taxonomy or new automatic survival behavior. Previously demonstrated native meal selection should remain economical; this assignment does not impose a blanket model choice on novel speech or intention formation.

**Priority hypothesis:** outcome-aware continuation and suitable available opportunities can improve one person without adding more simulated minds. If the available activities cannot support a valued concern, name that specific missing family; do not claim a paragraph of biography delivers it or build a universal need framework as a workaround.

## PG03 — Discover actions and understand their consequences

### Current behavior and scope

Context menus, the full action browser, pinned shortcuts, inventory comparison and scoped action descriptions already exist. Catalogue entries already carry description/fact rows, presented through the current Explanation component. The current filter sorts enabled actions before disabled ones on each refresh, and decisive costs generally remain in explanatory detail rather than the primary action row. Extend these owners into a clear ordinary-player journey; do not create a competing recommendations panel, tutorial quest or AI-ranked task list.

Selecting a perceived object or carried item should reveal supported uses, with the target and exact compatible tool clear. Present enough information to choose: known distance/approach, relevant target condition, duration where known, consumed inputs/ammunition, tool reach and outcome uncertainty when relevant. Reuse the action-detail contract; do not repeat every stat on every row. Expandable detail supplies longer explanations, while the primary row retains the action, target/tool and its decisive blocker or cost.

Keep the current contextual menu as the main entry point, a visible route to all actions, and stable user pins. Available choices retain stable grouping/order while the menu is open; changed availability updates in place. Known unavailable actions explain the reason and a supported remedy when there is one. Unknown hidden techniques/targets remain hidden. Freeform requests stay available without implying support for every request.

### Completion

- From ordinary play, find a carried weapon's applicable use, compare two relevant tools, select the intended target, understand automatic approach/equip and execute through existing admission.
- Distinguish supported-but-blocked actions, missing knowledge, service/loading failure, no matches and a genuinely empty permitted catalogue. Retain typed search and selection after refresh where still valid.
- A target disappearing, an item moving, control transferring or an older request returning cannot expose stale private details or silently retarget the action. Stop/cancel uses existing work semantics.
- Desktop and narrow/short layouts preserve the selected object, readable reasons, primary action, keyboard focus and scrollable results. Names and reasons wrap; fixed controls do not consume the entire visible area. Hover is supplementary.
- Inventory/context-menu/shortcut entry points agree about the chosen item, target and actual command result. No new inference calls are needed to render or rank ordinary supported actions.

Exclude a full inventory redesign, renderer/picking changes, arbitrary key remapping and new action mechanics. Follow existing React Aria components and handbook rules. This delivers a scoped DG01/AC11 improvement, not all ND13/ND18.

**Priority hypothesis:** clearer entry and commitment information earns more immediate play than expanding the action count. If observation shows existing controls already explain a case, retain them; improve the demonstrated discovery or decision gap rather than reskinning everything.

## PG04 — Make action previews cheap without changing admission

### Current behavior and scope

The public view and action catalogue repeatedly use `WorldService.previewCommand`, which executes a disposable transition. Previous geometry changes improved isolated queries, but [recorded complete-game results](../verification/command-frame-spikes.md) did not establish acceptable tails. This assignment owns the remaining repeated preview work and its measured player impact, under PF05/AC11.

Measure the current path, then remove duplicated work through shared pure prerequisite evaluation used by preview and real execution. Do not make the UI optimistic by skipping real checks, derive authority from a preview, or replace many repeated queries with a stale global cache. Preserve the current command/result meanings and selected targets.

### Completion

- Attribute menu/action projection, command queue, native work, database and browser time separately on a repeatable representative scene. Distinguish actual simulation progress from the configured speed and a command receipt from an immediate click marker.
- Demonstrate reduced repeated preview work on the measured high-frequency cases, with equivalent enabled/refused decisions and unchanged committed outcomes, resources, event order and randomness.
- Cover relevant state changes between preview and execution: item/target/condition changes, control replacement, deletion, restore and competing commands. The authoritative command performs current checks.
- Compare unchanged and changed snapshots, small scenes and larger candidate sets/history where relevant. Report measurement uncertainty and host contention; no capacity claim from a tiny workload or hidden reduction in options.
- Preserve renderer quality and current world mechanics. Physical lower-end qualification stays open if that device is unavailable.

Exclude general SQL batching, scheduling redesign, renderer quality reduction and speculative caching. If current attribution disproves preview cost as a worthwhile cause, report the measured no-go and the actual dominant owner; do not manufacture a refactor to fill the assignment.

**Priority hypothesis:** this known shared cost grows with useful choices and can hurt every player action. A current matched profile can change that recommendation. Equivalence plus an isolated win is necessary but does not itself prove complete-game responsiveness.

## PG05 — Design the first dangerous encounter

### Deliverable and scope

Produce a paired feature specification and technical design for one optional, discoverable wilderness threat. Recommend one concrete encounter, preferably a territorial animal using the existing animal/body/navigation/action foundation, and compare it briefly with a hostile person and with leaving danger out for now. Threat selection must earn tension, tactical choice or a useful reason to invent; it must not exist only to consume food or demand equipment maintenance.

This is explicitly a **design assignment**. Current hunting/attack primitives do not establish enemy perception, pursuit, disengagement, player defeat or recoverable human death. D07/BW14 leave consequential choices open; no implementation prompt should pretend those decisions have been made.

### Completion

- Define entry, warning, observation, avoidance/retreat, confrontation, stopping and aftermath as one playable episode. The player can decline the encounter and retain other worthwhile play. NPCs act from permitted evidence and supported policies.
- Make practical invention useful without requiring a hidden exact recipe or mandatory combat. Explain tool/range tradeoffs and reachable escape rather than adding difficulty through arbitrary misses or inflated health.
- Propose exact human defeat/recovery, possession preservation, NPC lethal consequence/confirmation and logout behavior consistent with current accepted policy. Explain any remaining owner choices and preferred alternatives; do not silently settle D07 or change PvP defaults.
- Define engine versus bundled-world ownership, supported body/equipment/reaction integration, interruption and pursuit bounds, known/unknown target information, save/load and replay. An unseen fleeing player is not an omniscient target; inactive characters remain protected.
- Walk through an interrupted attack, obstructed pursuit, lost sight, changed consent, disappearance, disconnect, simultaneous defeat and returning to the aftermath. Identify native mechanisms genuinely missing from current code.
- Supply implementation stages, complete acceptance scenarios, estimated logic/risk, content/art fallback needs and a specific owner-decision list. No runtime or live behavioral claim follows from the written design.

The output must be ready for an owner decision and subsequent implementation assignment. No raids, factions, pack ecology, resurrection system, arbitrary combat engine or broad PvP release is included.

**Priority hypothesis:** an optional credible threat gives existing movement and inventions new meaning. If escape/recovery needs dominate the benefit, reduce the encounter scope or defer it, while preserving the proposed design and explaining why.

## Parallel boundaries and sequencing

All five assignments can begin their scoped work from a branch containing this packet. PG01 and PG02 can start with source/native baseline work, but their live acceptance requires a configured, authorized provider path and available allowance under the existing policy. This planning pass did not probe provider availability or dispatch calls; those operational prerequisites are not claimed as verified. A missing service blocks live closure, not the independent work of PG03–PG05. PG01/PG02 use existing action surfaces; they do not wait for PG03 or PG04. PG03 consumes the existing preview/command interface; PG04 preserves it. PG05 delivers documents and does not block the other four. The owner combines the work; no task-to-task communication is required or requested.

PG01 owns demonstrated invention/manufacture/use integration defects. PG02 owns cognition preparation, authored resident content and outcome-driven continuation. PG03 owns ordinary action discovery/detail presentation and its permitted projection. PG04 owns prerequisite computation and preview efficiency. PG05 owns the encounter design and unresolved combat decision proposals. Shared files may be edited, but these meanings have a single assigned owner.

After integration, reuse PG01's invention journey with PG03's discovery surfaces and PG04's preserved command behavior; revisit PG02 only for a changed cognition/action assumption. This combined check is the owner's integration boundary, not a sixth assignment or permission for workers to merge one another's branches. Parent qualification stays with its existing tracker.

## Maintained records

- Delivery and parent mapping: [PG01–PG05](../maintainers/parallel-batch-03-personal-game.md); [technical definitions](parallel-batch-03-personal-game-tech-design.md).
- Invention: [INV](../maintainers/inventions-and-world-evolution.md), [World Agent work](../maintainers/world-agent-writes.md), [invention limits](../limits/inventions.md).
- Character: [CE](../maintainers/character-experience.md), [agency](../maintainers/agent-agency.md), [cognition](../maintainers/cognition-redesign.md), [cognition limits](../limits/cognition.md), [feeling limits](../limits/feelings.md), [memory limits](../limits/memory.md), [AI execution limits](../limits/ai-execution.md).
- Action usability and responsiveness: [AC](../maintainers/action-capabilities.md), [PF](../maintainers/performance.md), [UI/UX](../maintainers/ui-ux.md), [interface limits](../limits/interface.md), [action limits](../limits/action-experience.md).
- Encounter proposal: [BW14](../maintainers/base-world.md), [design needs](../maintainers/needs-design.md), [lifecycle](../worlds/base/lifecycle-and-protection.md), [base-world limits](../limits/base-world.md).

This allocation introduces no runtime quota or new discretionary game limit. Existing limits remain controlling; new limits selected during delivery belong with their canonical inventory and must be justified there.
