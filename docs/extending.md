# Extending Open Legend

Use the smallest responsible module. Favor an explicit finite contract and meaningful scenarios over a framework that anticipates every future game.

## A new native rule or component

Start in `packages/domain/src/types.ts` with a versioned, serializable component or reference. Add the rule to a pure transition; use the saved RNG instead of `Math.random`, and supplied simulation time instead of `Date.now`. Document which inputs it consumes, which component owns each output, when it interrupts work, and the observations it emits. Emit only committed outcomes. Add a scenario for conservation, cancellation or competing access if relevant.

If a player needs a new action, add its intention to the public protocol and bounded request validation, map it to a domain command, and register its options in `action-catalogue.ts` (plus `view.ts` for inline controls). Include discoverable unavailable entries when prerequisites are missing; enumerate all learned definition variants without an AI retrieval cap. Reuse pure command admission for availability and prove that browsing leaves the world unchanged. Add a common explanation and any target/condition-specific description in `action-descriptions.ts`, using only the permitted observation. Reuse stored recipe/item prose for inventions, then add trusted, current mechanical facts. Keep blockers in `reason`, not row subtitles. The client renders server-provided options and treats all descriptions as plain text. Never let a renderer-specific object or a freeform client effect enter authoritative state.

## A new invented family

For future visual/audible behavior, follow the [proposed perception contract](../archive/07-technical-architecture/perception-and-attention.md): shared near/medium/far descriptions, supported state overlays, event-time sound emissions and exposure-filtered context. Keep description/semantic-index data separate from executable rule authority. Those records and interest subscriptions are not implemented fields; introduce schemas and backward-compatible evidence handling before using them.

First implement the trusted mechanism in ordinary domain code. Define suitable material roles, permitted properties, units, parameter bounds and incompatibilities. Add admission counterexamples, such as a rock that is rigid but cannot be an arrow shaft. Update `DECLARATION_CONTRACT`, the strict authoring schema, Jev route candidates and the scoped prompt. Include at least two compositions exercising the same mechanism to avoid weapon-specific hardcoding.

Recipe and output-item descriptions are already required, bounded fields saved at admission. Use those for the current crafting/equipment families. When a future family needs distinct common situations (for example animal, NPC and player targets), introduce a small versioned set of validated description variants at creation, with an explicit default. The application should select variants from trusted target kinds and permitted facts; avoid one text per state permutation, model calls on hover, arbitrary template expressions or exposing private state. New variant fields need strict-schema changes and migration/backward-compatible defaults before use. Prose explains mechanics and never establishes them.

Invented definitions are data. A new property does nothing until a trusted operator consumes it. Do not implement a universal `effects` map, eval, generated scripts, or automatic physics from prose. Unsupported operations should stay unsupported until they have normal tests and review. If replacing admitted definitions later, design immutable versions, references, migration and rollback before introducing an edit API.

## Models and Macrofold

Implement `AiClient.judge` and `AiClient.generate` with the result/receipt contracts in `packages/ai/src/types.ts`. Preserve unavailable, invalid, refused, canceled and uncertain outcomes, usage provenance and actual model reporting. Do not retry paid calls invisibly. Tests can inject a client; the application marks injected execution as fixtures unless explicitly configured otherwise.

A Macrofold adapter may submit typed inference or pooled agent work through its service API. It must preserve stable request IDs, cancellation/deadlines, provider receipts, bounded resources, permission-scoped context and durable attempt semantics. Macrofold must not become the authority for world state or declaration admission. The [platform brief](../archive/07-technical-architecture/macrofold-implementation-brief.md) describes the broader proposed service behavior. No Macrofold dependency or sandbox is required to run this initial game.

## Memory and context

Keep physical truth, personal beliefs, episodes, commitments, reflections and procedural knowledge separate. Retrieval may evolve from lexical/importance scoring to relational or vector indexes behind `buildContext` and the query port. Store structured records and provenance; a summary is an index/compression artifact, not a replacement for authoritative facts. Never retrieve another person's private records solely because a query matches them. Add a test where the tempting fact exists but the actor did not perceive it.

## Time controls and presence

Keep simulation rates in the server clock configuration, never in rendering or individual need/work rules. New speed presets must update bounded HTTP/service validation, the controls and rate-equivalence tests. Preserve fractional simulation debt at 0.5×. Only transitions that actually affect pause/speed should reset clock debt.

Keep foreground attention separate from connection liveness. Window blur can mean the tab is visible but unfocused; background timers may stop while its event stream remains connected. The saved pause preference selects which signal permits advancement, and manual pause/storage errors override either. A future transport must supply equivalent connect/disconnect signals. Do not turn an opted-in background tab into permission to simulate server downtime. Update preferences with partial patches so independent controls never reset each other.

## Persistence and migrations

Implement `GameRepository` to replace SQLite. Keep world CAS and domain receipts atomic, and paid-attempt admission durable before dispatch. Unknown external completion must not become permission to resend. A save adapter must preserve item identity, RNG, in-progress work, knowledge and all supported component versions. A schema change needs a migration fixture or an explicit refusal to load, never silent reset. Back up the original save before any future migration writes.

The initial store uses full snapshots. The next persistence work follows the [production data model](../archive/07-technical-architecture/production-data-model.md), with independently queryable canonical records and the [stable data/MCP interface](../archive/07-technical-architecture/data-queries-and-mcp.md). Build new database consumers against that contract rather than the snapshot JSON shape. The [delivery plan](../archive/07-technical-architecture/data-delivery-and-scale.md) specifies migration and retention; partitioning, physical sharding and specialized indexes follow measured workloads. Do not assume the bounded prototype journal can reconstruct missing history.

## Governance, discovery and workshop extensions

Read the [governance](../archive/03-design-proposals/invention-governance-and-ownership.md), [controls](../archive/03-design-proposals/playability-and-controls.md) and [world workshop](../archive/03-design-proposals/world-agent-and-workshop.md) contracts before building these future features. Keep invention authorship, account grants, world installation and character knowledge distinct. Every admission path must honor the current world policy; workshop edits require immutable versions and explicit activation/migration. A player's complete action catalogue and a god's authorized journal queries are different projections from a bounded NPC prompt. Do not widen the current public DTO to implement either.

## Visuals and assets

Preserve the scene's distinction between right-click (actions on release) and right drag (camera only), including the small movement threshold, pointer capture and cancellation cleanup. Native context-menu events can arrive before or after pointer release, so a camera gesture must not also open actions. Keep keyboard/Control-click access and test both event orders when changing these handlers.

`apps/client/src/scene.ts` projects the game onto PlayCanvas. `art.ts` creates original pixel textures/sprites from code; they can be replaced with licensed art without changing game rules. The camera, resource hit testing, readable DOM controls and scoped entity projection remain separate. Check the art-direction feedback before changing style. External reference pictures are inspiration, not granted production assets.

The initial focus-blur experiment is isolated in `vision-blur.ts`; it consumes projected screen geometry from the scene and never requests extra entities. `perception.ts` owns sight/hearing range rules, and the server projects the sight radius. Replacing the circular approximation with an occlusion field should change a scoped presentation/query contract, not grant the renderer world authority. Retained unseen images are visual history only: preserve frozen state, non-interactivity, bounded retention and removal/revalidation on return.

Object action menus must scope both available and unavailable candidates to the selected world object before preview; reserve broad discovery for empty-ground context. Keep right-click selection independent of notebook navigation, and preserve the saved toggle across label changes. Map hit testing and hover must share the blur cutoff and revalidate stationary pointers as the scene changes.
