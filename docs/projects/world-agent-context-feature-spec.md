# World Agent context and invention loop: feature specification

**Status: approved implementation target; implementation in progress. No completed runtime delivery or live qualification is claimed.** Medium reasoning effort is an explicit owner requirement for the proposed World Agent execution profile. Other interface choices below are recommendations for implementation review.

## Purpose

Let a person describe an invention in ordinary language and receive a useful, accurately explained draft for review. Give the agent the necessary mechanics and a small set of meaningful operations. Keep administrative orchestration, permission checks, accounting and persistence in the application.

This project improves context and authoring while adopting the existing [graph and invention-pipeline foundation](world-agent-context/initial-foundation.md). The first version includes real dependency, validation and readiness records through existing owners; it does not introduce a new invention engine. The current [World Agent](../world-agent-runtime.md) remains one conversation able to investigate, design and invoke authorized actions. The [technical design](world-agent-context-tech-design.md) proposes how to make simple requests small while keeping deeper investigation available. [Mechanics inventory](world-agent-context/mechanics.md) separates executable behavior from supported authoring.

## Problem demonstrated

A captured real sling continuation contained 51 messages and 22 tool definitions. Compact JSON was 71,948 bytes: 36,555 bytes of tool messages, 18,248 bytes of tool definitions, 13,830 bytes of assistant messages, and 2,969 bytes of system/user messages, plus envelope/separator overhead. The initial request already contained 21,514 bytes. These are serialized byte measurements, not tokenizer measurements or provider-billed token counts.

After nine tool calls the candidate passed finite recipe validation. Sixteen more calls followed without saving it, including five guessed optional base recipe IDs. The capture predates the current omission guidance fix. It also contained duplicate recipe schema/contract data, unrelated definition/entity lists, and Macrofold file-output instructions despite the application denying file access. See [live continuation evidence](../verification/invention-main-integration.md#explicit-continuation-after-the-persistence-fix). Payload size alone does not establish the cause of the eventual harness exception.

The test asked for creation, a separate refinement, review and an unsupported-mechanics answer in one turn. Future measurements separate these journeys. Formatting changes alone cannot remove unnecessary decisions and round trips.

## Player and agent journeys

### A simple supported invention

The player asks: “Make a sling using cord and prepared fiber. Favor accuracy even if crafting takes longer.” The application supplies the actual eligible materials, launcher mechanics, field meanings, selected draft if any, and a clear completion instruction. The agent designs the candidate and submits it once for review.

Native code derives the candidate’s typed dependency graph, runs the supported family’s required checks, records presentation adequacy and current inventor eligibility, saves an immutable revision and creates the exact review plan. The result says that the draft is saved and awaiting human review. The agent briefly explains the tradeoff and finishes. It must not call a valid draft “installed,” claim the player possesses it, or wait in a paid loop for approval. Human approval and Apply retain their existing authority and receipts.

### Refining a saved invention

The player requests a change. The agent receives the selected exact revision, existing constraints and relevant mechanics once. Submission names the expected revision. A stale revision returns a refresh requirement; it does not overwrite another edit. Updating a candidate keeps the existing material/base pin rules. A new review refers only to the new exact revision; an old approval cannot authorize it.

### Investigating an unfamiliar invention

The player need not select a technical mode. If the request has no selected authoring kind, begin with compact capability discovery. Search results name purposes, applicability and current authoring support. The agent can inspect missing mechanical details through bounded tools. The executor may select a different tool profile only within the initiating request's grants and the session lifecycle defined in the technical design.

Extra investigation remains available for complex work. Small initial context must not become a hard limit on knowledge, a hidden shortlist of inventions or an excuse to omit interaction effects.

### A supported non-weapon tool

A gathering tool requires an eligible rigid, flexible body and binding material, an existing resource definition, finite-source behavior and total-yield semantics. The agent needs to know that the best compatible carried tool wins and yields do not stack. It does not need unrelated combat schemas, actor memories or the whole world catalogue. Crafting and using the tool still consume ordinary work/energy under the world's rules.

### A bed, food or effect the current authoring tools cannot express

“Make a bed that restores energy faster” requires an item-to-rest-effect binding that the current recipe adapter lacks. The agent explains that specific missing capability and retains the idea/constraints in the conversation. It must not silently replace this request with a world-wide sleep-policy edit. Similarly, an edible potion cannot be implemented by adding unsupported nutrition/status fields to a recipe.

If a world owner explicitly requests a sleep-policy change, use the appropriate policy profile and show its wider effects. Sleeping acts on entities; fullness continues draining while energy is restored; restrictions, waking, interruption and dream eligibility have different owners. Context must explain those interactions without copying every world definition.

### Resume, cancellation and uncertainty

On resume, rebuild current draft/review facts from application records and preserve unresolved operations. A confirmed saved review finishes preparation; a mere validation result does not. If a submission times out, reconcile its original operation identity. Cancellation ends paid activity without undoing committed drafts or world effects. Restore fences old packets, cursors, pending operations and approvals under the current save contract.

## Required behavior

- Plain-English instructions state the person's goal, constraints, current selection, next useful action and completion condition. Exact IDs remain data; internal names alone never explain a mechanic.
- Relevant mechanical descriptions identify named participant/object roles, prerequisites, units, reads, changes, consumption timing, interactions, process ownership, completion and interruption. Ordinary subject/source/target bindings are examples, not a universal three-role limit. Use real current values and explicit support/coverage.
- Definition, recipe, live item, actor, resource source and status instance remain distinct. Installation, learning, possession and action completion remain distinct outcomes.
- The first context is small and sufficient for common tasks. Broader evidence, relationships and schemas are available on demand with explicit continuation and incomplete coverage.
- A shared candidate relationship projection informs context selection, native validation and human review. Exact provenance, query coverage and unresolved requirements remain visible; a complete graph page cannot imply complete interaction validation.
- Attributable intent, selected revision, required checks, presentation adequacy, review, activation, knowledge and actual creation/use remain independently recoverable. These are native workflow responsibilities, not compulsory model calls.
- One source-backed representation owns each fact. Templates, readable instructions and strict tool contracts are views of the same owners; prose and examples grant neither mechanics nor authority.
- Tool results give the next useful action. Invalid, stale, unavailable, unsupported, denied, incomplete and uncertain outcomes remain distinct.
- The owner can inspect technical metrics and costs; players retain the existing abstract usage display. New prompts do not expose provider economics or estimate invention counts.
- World Agent requests use medium effort with verified forwarding. Unsupported settings are explicit configuration failures; no silent downgrade, higher-effort fallback, model substitution or automatic paid retry.

## Scope and exclusions

In scope: deterministic scoped context assembly, a small typed candidate graph, bounded native validation plans, attributable requirements and independent readiness; selected tool profiles, generated field guidance/templates, compact results, source/version-aware deduplication, resumable working context, native save-for-review orchestration, medium execution policy and measured qualification.

Existing INV/WW owners retain real harness reliability, generated art and richer presentation publication, full physics/composition, broader action families, body/law migration, private multiplayer qualification and sustained scale. This project exposes their actual support accurately; it does not implement them. No generic state patch, generated executable code, second effect interpreter, separate wallet, second World Agent UI, legacy save support or authoritative workspace files are introduced.

## Acceptance criteria

1. A supported new recipe and a refinement reach a saved exact review through the real native harness; the agent stops with an accurate explanation. Approval/Apply remain separately verified through existing WW07 coverage.
2. Relevant materials, units and mechanics are sufficient to design both a launcher and a gathering tool without administrative catalogue exploration. Complex and non-recipe journeys retain needed discovery.
3. Bed/potion/homing requests identify actual capability gaps; an incomplete search never proves a mechanic absent. Owner policy changes require their own explicit scope.
4. Selected field documentation and examples match strict schemas, native admission and consumers. Adding a property to prose cannot invent an effect.
5. Failed validation preserves recoverable work as specified; stale edits, duplicate submissions, timeouts, cancellation and restore neither duplicate effects nor misstate completion.
6. Recipient grants filter all input before formatting; altered grants/world generation require safe fresh context. No administrative context leaks into NPC cognition or another conversation.
7. Matched workload measurements meet the proposed [context targets](../limits/inventions.md#ctx01--context-size-and-measured-efficiency) without reducing semantic correctness. No byte savings are claimed as measured token or latency savings.
8. Macrofold's outgoing request confirms medium effort and a permission-appropriate tool/instruction surface. File tasks continue working under their own permissions.
9. The [initial foundation proof](world-agent-context/initial-foundation.md#6-concrete-first-version-proof) demonstrates graph/context/review parity, scoped native check completeness, presentation adequacy and recovery across recipe, gathering and owner sleep-policy cases. Harder repertoire cases preserve their requirements or report missing support, without claiming new execution systems.

## Delivery stages

First deliver source-backed guidance, the candidate graph and bounded shared analysis; then native submit with retained requirements/checks/readiness and thin transports; then selected profiles and Macrofold execution behavior; then continuity and cross-kind templates; finally qualify actual journeys. These are parts of the initial version, not optional graph/pipeline follow-ups. Work remains tracked once in WW17–WW23, not as duplicate checklists here. Runtime implementation is approved; the project packet tracks execution and evidence.

## Maintained records

- Implementation: [WW17–WW23](../maintainers/world-agent-writes.md#context-and-invention-loop-design); parent INV-21 and existing WW07/WW10/WW11 remain open.
- Limits and constraints: [World Agent context proposal](../limits/inventions.md#world-agent-context-proposal).
- Related design: [Technical design](world-agent-context-tech-design.md), [project packet](world-agent-context/README.md), [World Agent runtime](../world-agent-runtime.md), [composition](../invention-composition.md).
