# Parallel batch 03 — Personal game — technical task definitions

| Status      | Current progress                                                                                                  | Last updated |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | PG02, PG03 and PG04 are underway on separate branches; integrated delivery and the remaining acceptance are open. | 2026-10-04   |

[Feature scope and acceptance](parallel-batch-03-personal-game-feature-spec.md) · [Tracker](../maintainers/parallel-batch-03-personal-game.md) · [Copyable prompts](parallel-batch-03-personal-game-prompts.md)

## Shared implementation boundary

Use the existing command, cognition, object, experience, persistence and presentation owners. No assignment adds a second command executor, writable relationship graph, scheduler, knowledge store or spending ledger. Engine mechanisms stay generic; authored names, species, motives, example requests, vocabulary, rules and tuning belong under `packages/domain/src/worlds/base/` and `docs/worlds/base/`.

The planning baseline is local `main` `dd21d1c7`. Read current source on starting; the exact snapshot records evidence, not a requirement to discard later changes. No current-format schema change is proposed for PG01, PG03 or PG04. PG02 should first use existing identity, appraisals, knowledge and goals; a demonstrated missing durable representation requires a scoped design update before implementation. Current-format integrity and the protected no-compatibility policy remain in AGENTS.md.

### Shared files and exact responsibility

| Boundary                 | Producer / owner                                                                                                                          | Consumers and invariant                                                                                                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Native command admission | PG04 may extract pure prerequisite evaluation from existing domain/server owners; PG01 repairs concrete invention/use correctness defects | Current `CommandInput` and outcome semantics remain usable by PG01–PG03. Preview grants no authority; execution rechecks current state. No worker depends on a new PG04-only API.                                                    |
| Action catalogue/details | PG03 owns ordinary-player presentation fields and action-browser projection                                                               | PG04 optimizes prerequisite work beneath it. Existing exact target/item identity, permitted facts, enabled/reason and commands remain authoritative. PG03 does not alter mechanical eligibility.                                     |
| NPC decision context     | PG02 owns current body, motives, outcome and remaining-plan presentation                                                                  | It consumes existing domain action facts and observed experience. PG03's UI refinements are not required NPC context. Preserve the delivered BW16/D63 family disclosure and provenance contract; this assignment does not change it. |
| Invention delivery       | PG01 owns actual proposal-to-definition-to-item-to-use integration                                                                        | Existing admission, approval, resource and accounting owners remain sole writers. PG02 is not assigned novel invention qualification.                                                                                                |
| Encounter                | PG05 owns the design documents and proposed policy choices                                                                                | It may reference current attack/navigation/privacy behavior; no other task consumes an unimplemented combat interface.                                                                                                               |

Shared edits to `world-service.ts`, `view.ts`, `context.ts` or `main.tsx` are acceptable when limited to these responsibilities. The completed [family-authoring design](completed/family-authoring-tech-design.md) owns current family knowledge/projection and creator controls. Preserve that delivered behavior; its former worktree overlap is not a pending integration dependency. General creator-edit propagation remains separately proposed. Workers have all dependency contracts in these files; they do not message one another. No assignment grants integration or cross-branch mutation powers.

## PG01 — Integration definition

### Read and trace

1. [First-playable agreement](../../archive/05-project/first-playable-mvp.md), especially the creative and persistence outcomes; apply current canonical lifecycle where the historical document differs.
2. [Invention handoff](../invention-handoff.md), current supported families in [invention foundation](../invention-foundation.md), and [NP03's completed contract](completed/parallel-batch-02-foundations-and-usability-tech-design.md#np03--craft-with-an-invented-material).
3. `apps/server/src/invention-service.ts`, `invention-context.ts`, `invention-tools.ts`, `invention-workshop.ts` and `actor-invention.ts` for the ordinary invention route; inspect `world-authoring.ts` and `world-agent-runner.ts` only for a path actually used by the journey.
4. `packages/domain/src/declarations.ts`, native `kernel.ts`, `packages/domain/src/worlds/base/` recipe/material owners, and `apps/client/src/ui/inventory.tsx` for real manufacture/use. `tests/fixtures/` identifies existing disposable setup; historical `/tmp` probes are not required inputs.

### Ordered work and contracts

First establish which available service path ordinary play actually uses, what is already qualified and which first-playable cases remain open. Select the narrow supported family and route before live dispatch. Use the existing application configuration and accounting prerequisites; do not deploy another project or inherit an old uncertain provider hold as free allowance.

Capture a proposal absent from the starting world's recipe catalogue. Its required inputs, material roles, work, output, permitted parameters, checks and supported presentation must survive preview, approval where required, admission, manufacture and native use. Recipe identity/revision and actual object identity carry between stages; displayed names never serve as authority. A repeated request and paraphrase reuse the existing selected proposal/technique under its current knowledge rules. A rejected candidate must remain a rejection, with no material consumption or partially installed object.

Follow the ranged result through actual ammunition accounting, target movement/reach, hit or miss, death when permitted, finite yields, cooking prerequisites and consumption. Do not require every random strike to succeed. Show a player-recoverable miss or blocked attempt before the successful completion case. The current native food chain is reused, not rewritten.

The contrasting non-weapon case uses the already supported cord/container contract. Generated material claims require positive producer/consumer evidence; unsupported recursive material composition stays unsupported. No extra authoring family is justified merely to force a particular wording to work.

Close the arrow-material assertion mismatch from the actual validator result: verify stone is still rejected for the role, then describe/check the meaningful rejection instead of requiring an incidental English substring. Existing TODO remains the tracking owner.

### Evidence and reconciliation

Use the complete [PG01 acceptance](parallel-batch-03-personal-game-feature-spec.md#pg01--make-an-invention-matter-in-play). Report stage latency and complete attributable provider usage, plus actual consumed resources, resulting item/recipe references and persistence evidence. Keep synthetic admission evidence distinct from live novelty. No default sample count or new spending permission is imposed by this design.

Update the scoped INV-3/INV-14/INV-19 acceptance, NP03's separately open live-generation child if demonstrated, relevant WW07/WW11 subsets only when their specific criteria are met, and the existing arrow-material TODO. Preserve external deployment, historical accounting and broader qualification gaps. Evidence belongs in existing `docs/verification/invention-foundation.md`, `actor-agency-and-inventions.md` or `camp-life.md` according to the exercised route.

**Risk/stop boundary:** unavailable live execution can block the live acceptance but does not justify a replacement fake route. A new unsupported family is a scope/design question, not permission to expand the engine. PG01 does not claim every first-playable requirement or all INV gates from one successful episode.

## PG02 — Character integration definition

### Read and trace

Use the [compelling-character specification](compelling-characters-feature-spec.md), especially concept distinctions, current perspective, lifecycle and CE-F02–CE-F06; [CE01–CE05](../maintainers/character-experience.md); [AG06/AG07/AG12](../maintainers/agent-agency.md); [CR12](../maintainers/cognition-redesign.md); and the [behavior-debugging skill](../../.agents/skills/openlegend-behavior-debugging/SKILL.md). The bounded assignment here does not supersede the parent requirement for a richer whole life.

Source entrypoints: `packages/domain/src/worlds/base/characters.ts` (existing resident, currently no initial operational goals), `worlds/base/world.ts` (authored opportunities), `appraisals.ts` and `agency.ts` (accepted state), `events.ts`/`memory-perspective.ts` (observed outcomes), `apps/server/src/decision-observation.ts`, `decision-context.ts`, `response-context.ts`, `interests.ts`, `attention-request.ts`, `appraisal-context.ts` and `ai-director.ts` (preparation, routing and reconsideration). Use `activity-context.ts` for remaining steps rather than inventing another plan summary.

### Representation choices

Keep body conditions, lasting identity, temporary feelings, accepted beliefs and chosen operational goals distinct. Stable biography belongs in the authored identity; no new `socialNeed` or `boredom` counter is proposed. A concern is carried by existing accepted understanding/appraisal/goal structures according to its meaning, and changes through their existing validated mutation owners. Duration and importance are not synonymous with truth or action priority.

The complete accepted About me text remains required. A compact optional window must include only relevant permitted current evidence, with source distinctions preserved. Render self-directed harm/feelings in the actor's own perspective and target names through observer-safe naming. Keep IDs/bindings outside readable model text wherever the current contract already separates them. Do not omit contrary evidence, an ongoing conversation or urgent danger merely to make the desired choice win.

The hypothesis to test is missing relevance, missing outcome or stale intention, not insufficient biography length. Identify whether failure occurs at the trigger, preparation, offered action, selection, admission, execution or later reconsideration. Controlled hardcoded diagnostic variants may locate the gap under the behavior-debugging skill; production changes must remove the hardcoded target/canned goal. Success must still occur through ordinary supported scheduling and action discovery.

### Ordered work

1. Capture current unmodified behavior and the exact supplied context for the three concerns, including offered actions and what the character actually knows. Reuse prior meal evidence; do not repeat the whole earlier hunting matrix.
2. Trace one concrete miss in the chain. Correct the responsible owner: missing permitted observation, stale body/outcome, ambiguous completion, lost goal/remaining work or an unavailable action. Do not rewrite every subsystem based on a model anecdote.
3. Compare current and minimally revised authored identity/context with genuine alternatives: available food versus prey, welcome versus refusal, solitary opportunity versus urgent bodily pressure. Selected psychological meaning is narrative/accepted appraisal, with no automatic fulfillment from mere proximity or activity labels.
4. Verify actual native effects and later reconsideration. A completed step is evidence; it is not automatic completion of an adopted goal. Goal state changes use the current actor-owned decision path. A stop decision must identify what has ended and why in permitted evidence.
5. Simplify the successful input combination and retain failures/uncertainty. Demonstrate a quiet internal opportunity using the current review/reflection owner. If no suitable supported opportunity exists, specify the narrow missing seam and its cost before adding it; no parallel scheduler or unbounded retry.

### Completion and exclusions

Apply [PG02 acceptance](parallel-batch-03-personal-game-feature-spec.md#pg02--one-resident-with-reasons-to-act-and-reasons-to-stop). D69's richer psychological quantities/laws, broad personality transformation, compulsory thoughts, background communities and family disclosure are excluded. A useful existing movement/observation/conversation action may satisfy an episode; prose-only enjoyment is not a claim of a new mechanical resource.

Reconcile CE01–CE05 only for demonstrated subsets, AG06/AG07/AG12, CR12 and applicable BW18 content/context rows. Preserve full CE-F01/CE-F07–CE-F09 and any unfinished parent acceptance rather than checking the entire character project. Keep `docs/memory-architecture.md`, `agent-agency.md`, base-world character documentation and the relevant existing verification reports consistent. Use the existing cognition/feeling/memory inventories for any chosen limits. Major new psychological policy choices return to D69 explicitly.

## PG03 — Presentation definition

### Read and trace

Read [UI/UX essentials](../../.agents/rules/ui-ux.md), [world interaction](../ui-ux/world-interaction.md#actions-explain-the-commitment), [inventory decisions](../ui-ux/inventory.md#item-detail-and-comparison), matching React/controls chapters and the current [action-experience contract](../action-experience.md). AC11 and DG01/ND13/ND18 remain parent owners.

Source: `apps/client/src/ui/action-picker.tsx`, `quick-actions.tsx`, `action-attempts.tsx`, `inventory.tsx`, `apps/client/src/action-browser.ts`, shared `design-system` components; `apps/server/src/action-catalogue.ts`, `action-descriptions.ts`, `view.ts`, `inventory-view.ts`; and `CatalogueAction`/`ActionCatalogue` in `packages/protocol/src/index.ts`.

### Data and interface

Reuse the current catalogue entry's identity, label, command, enabled state and reason. Derive meaningful detail from existing `describeCommand`/`commandFacts` and domain action descriptions. First inventory fields already available to callers; add only missing permitted facts to the shared projection. Do not create a second world-family vocabulary or duplicate range/damage/cost formulas in React.

The existing CatalogueAction.facts field already carries labeled string pairs and is rendered by Explanation. Reuse that projection and improve its coverage/placement before proposing additional fields; no replacement facts schema is selected here. They are display data, never command parameters or granted knowledge. Missing knowledge is unknown; missing applicability is omitted. Avoid a universal effectiveness score, opaque JSON dump or output promises for a stochastic attempt. Distances refer to the selected perceived target and current position, not an assumed successful route; label unavailable route estimates honestly. Automatic movement/equipment is part of the selected action's existing contract, not a new command generated by the client.

Arrange the menu as a stable target/title, search and availability controls, a scrollable action region, then access to full catalogue/freeform request. Action rows show concise primary wording and a short secondary reason/cost. Expansion keeps longer facts adjacent to the selected row without replacing its identity. Reuse existing pullout behavior where adequate. Long names/reasons wrap; scrolling belongs to the result region. Preserve keyboard and touch access to every detail, pending/error recovery and the original player pins.

For repeated refreshes, bind results to the selected object/item and current authorized scope. Retain the current action when it still exists; mark it unavailable or remove private details when scope changes. Never replace a reviewed tool or target with a similarly named alternative. Opening, filtering and comparing are reads; execution still submits the current exact command to the server.

### Completion and reconciliation

Apply [PG03 acceptance](parallel-batch-03-personal-game-feature-spec.md#pg03--discover-actions-and-understand-their-consequences), including actual downstream command effects and important failure states. The existing context-menu service fixture and UI surfaces are reusable evidence entrypoints; test policy remains in AGENTS.md. No new UI theme, full inventory rewrite or shader work is included.

Update AC11 and UIUX03/UIUX04 only where their actual requirements are met, the scoped DG01/ND13/ND18 delivery note, current world-interaction/action-experience presentation and relevant interface/action-experience limits. Keep larger remapping/first-encounter narration and accessibility programs open. Existing family creator controls and PG02's model context are not owned here.

## PG04 — Prerequisite evaluation definition

### Read and trace

Use [PF05](../maintainers/performance.md#pf05--public-view-and-browser-responsiveness), [command/frame evidence](../verification/command-frame-spikes.md) and the [existing follow-up](shadow-quality-tech-design.md#follow-up-commandframe-spikes-and-physical-lower-end-hardware). The prior roughly 40% isolated query improvement is delivered, not this assignment's expected new gain. The roughly 6.6/60.8 CPU-second preview attribution and overloaded whole-game results are historical leads, not a current baseline.

Trace `WorldService.previewCommand`, `evaluateCommand` and `bindCommand`; `apps/server/src/view.ts` and `action-catalogue.ts`; `packages/domain/src/kernel.ts`, existing action-family admission helpers and current navigation/body/resource query owners. Use existing PF00 timing and command/catalogue checks as starting tools. Do not alter renderer or browser visual fidelity to qualify a server optimization.

### Algorithm boundary

Separate reusable read-only prerequisite evaluation from mutation for the measured command families. Inputs are the current authoritative world, actor and bound command; output is the existing availability/refusal meaning and, only where immediately safe, ephemeral prepared data tied to the same unchanged snapshot. The helper can inspect exact objects, custody, knowledge, body capabilities, target validity, ranges, resources and routes as those families require. It must not allocate durable action IDs, consume randomness/materials, append events, change reservations or schedule work.

Real execution consumes the same evaluation and retains command-specific mutation plus completion-time checks. Any awaited work or changed snapshot invalidates prepared data; actual admission reevaluates. Prefer sharing pure guards/query preparation over persisting a cache. If a narrow family genuinely cannot be separated without changing semantics, retain its disposable transition and document the uncovered portion instead of inventing a broad fallback that hides disagreement.

Preserve the `previewCommand` return contract and existing callers, including request-specific explanation notes. PG03 can ship without PG04. Per-request reuse may share identical reads on the same immutable world and actor; cross-actor or cross-version reuse needs a demonstrated reason and explicit scope. Bound temporary work by the existing request and release references afterward. Output truncation never hides unbounded upstream work or proves scale.

### Decision and completion

Profile before choosing families; prioritize actual repeated cost. Compare selected availability/refusal results and real transitions against the existing execution owner, including malformed/unsupported input, stale targets, unavailable resources and navigation failure. Compare seed/randomness and emitted events for commands whose previous preview performed a disposable transition. Actual mutation remains singular and authoritative.

Apply [PG04 acceptance](parallel-batch-03-personal-game-feature-spec.md#pg04--make-action-previews-cheap-without-changing-admission). Report separate isolated and whole-path results. Stop widening the optimization once the selected cause is addressed; broader scheduler/save/database work stays in PF. If the source hypothesis is disproved, record the no-go and retain parent performance gaps honestly.

Update PF05, AC11, the existing command/frame plan and report, and only affected runtime/interface limits. Preserve SW18 physical-device and full load qualification. No new workload cap, smaller visible catalogue or reduced sensory meaning is permitted as a substitute for cheaper work.

## PG05 — Encounter-design assignment definition

Use [lifecycle and protection](../worlds/base/lifecycle-and-protection.md), BW14/MP04, D07/PS-D01, DG07/ND11, relevant [combat/rescue repertoire](../repertoires/combat-rescue.md) and action examples. Read current animal movement/flee behavior in `packages/domain/src/kernel.ts`, authored bodies/species under `worlds/base/`, attack result/equipment families, native participation/protection and existing event/experience projection before claiming a mechanic exists.

Create `docs/projects/first-threat-encounter-feature-spec.md` and `docs/projects/first-threat-encounter-tech-design.md`. The pair owns this bounded proposal; update the existing BW14/DG07/ND11 references rather than creating another combat backlog. Do not mark D07 resolved merely because the design recommends an answer.

The feature document must name one encounter and explain why someone would willingly engage. Define discoverability, warning, a viable noncombat alternative, confrontation, interruption, disengagement and a satisfying consequence. Compare the recommended animal case with a hostile speaking character and with deferral. A territorial animal is a recommendation to evaluate, not a required enemy taxonomy or an excuse to hardcode engine behavior.

The technical document must distinguish current support from missing seams. Specify the proposed perception-to-intention-to-native-action path, target loss, approach/range/recovery, attack interruption, no duplicate effects, native enemy movement cost and bounded pursuit. Explain where authored threat policy lives and how another species/world can differ without new engine name checks. Use current clocks, saved randomness, body/resources, object custody and scoped events.

Present explicit decisions for human incapacitation/recovery and possession preservation, intentional lethal consequences for NPCs, environmental/indirect harm, player consent where applicable and logout interruption. Walk each path through domain, server admission, public feedback and restart. Existing cooperative PvP default and inactive-human protection cannot be weakened. No map marker may reveal an unseen enemy; warnings need a permitted sensory source. Avoid adding a resurrection or world-wide combat framework to support one encounter.

Describe player feedback with a small proposed layout/wording example: warning source, current target/range, active action, interrupted/escaped/defeated result and next possible action. Include keyboard and compact-screen implications under the handbook. Choose placeholder art only if it honestly communicates the intended threat; presentation cannot imply implemented attack animations or invisible mechanics.

Completion is the full [PG05 definition](parallel-batch-03-personal-game-feature-spec.md#pg05--design-the-first-dangerous-encounter), with a decision list the owner can answer, preferred choices and their consequences, explicit implementation stages and owner-linked acceptance. Runtime delivery waits for the unresolved consequential choices and implementation authorization; the design task itself is immediately runnable.

## Verification and document reconciliation

This planning packet requires source/reference/acceptance review and documentation checks only. No browser session, model call, benchmark or runtime acceptance was performed by writing it. Future workers use AGENTS.md for verification, authoring tests, budget, commits and completion; these task definitions add no competing workflow.

Each task updates its scoped PG row and the exact linked parent requirements when evidence changes them. A completed child does not close all CE, INV, WW, PF, AC, BW or UIUX work. Mark project files completed/move them only when their own agreed scope is actually complete, following the canonical documentation policy.

## Maintained records

[PG tracker and parent map](../maintainers/parallel-batch-03-personal-game.md) owns assignment status. [Feature scope](parallel-batch-03-personal-game-feature-spec.md#maintained-records) links the canonical behavior owners and existing limits inventories. This technical allocation adds no game limit or alternative policy owner. PG05's future policy proposals must enter the base-world inventory as proposals; measured PG04 constraints and PG02 context choices remain with their established owners.
