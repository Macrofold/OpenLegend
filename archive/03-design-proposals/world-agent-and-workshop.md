# World agent, durable world log, and invention workshop

Recorded September 19, 2026 from [U14](../00-source/world-governance-and-controls-followup.md). **Accepted product direction; contracts and sequencing below are proposals, not implemented features.** The prototype has a bounded journal and immutable admitted G1 recipes, not a complete historical event store, privileged world agent or revision workshop.

This document owns world-agent access, durable inspection and revision workflows. [Playability and controls](playability-and-controls.md) owns log/menu presentation; [invention governance and ownership](invention-governance-and-ownership.md) owns locks, authorship and pack rights. The [declaration architecture](../07-technical-architecture/declarations-and-evolution.md) owns authoritative activation and migration.

## The experience

The creator can talk to a world agent that can look up the world's environment, all characters and their contextual records, current and historical state, inventions and the entire retained authorized world log, with explicit gaps for unwitnessed or expired experiential events. It can answer what happened, explain mechanics, author inventions and workshop existing ones. Requests such as making something burn slower should not require manually rewriting a declaration.

An invention opened from a log or account library offers Inspect, Workshop and, where permitted, Export / use in another world. The workshop retains the conversation, draft, base version, evidence and validation results across turns. The author can refine their own contribution; activation in another owner's world still requires that world's permissions. Proposed owner exception: a deliberate owner edit can be separately authorized and audited while the player invention lock is on. Until that exception is adopted, owner authoring requires the player lock off and editing permission; the independent agent lock need not be changed. Calling the world agent or labeling a new behavior a revision cannot bypass the applicable lock: a player-directed AI workflow retains player origin, while autonomous NPC invention follows the agent lock.

## Confirmed god-mode conjuring

Accepted September 20, 2026; planned, not implemented. In god mode, the creator can ask the world agent to conjure a named object or suggest a random object. The request may describe something not yet defined in the world. The agent helps complete the object as it does an invention: propose relevant properties, supported behavior, dependencies, appearance and initial instance state, explain consequential choices, and ask for missing information only where it matters. “Random” selects a reviewable candidate; confirmation and retries must not silently reroll it.

Resolve an existing compatible definition and artwork first. If absent, author the needed definition/properties and automatically arrange matching artwork through the [runtime art pipeline](visual-direction.md#art-generated-during-play). Define the object's name/description, applicable material and physical properties, supported interactions, required active-world behavior, presentation, quantity, placement and ownership where relevant. Use admitted defaults explicitly; a decorative image or invented field is not a fully working mechanic. Any object can be requested, but unsupported behavior remains a visible requirement for a new trusted family or engineering work, rather than a false claim of completion.

Before executing conjuring, show a concrete preview and obtain explicit confirmation: what will appear, how many, where, which definitions/properties will be reused or created, significant effects and assumptions, missing requirements, and the bounded generation/art allowance. Draft discussion does not authorize spawning. Confirmation covers automatic definition/art completion within that reviewed scope; material changes to scope or cost require renewed confirmation. Do not dispatch paid art generation before this confirmation and the applicable spending admission.

Conjuring is a separate server-authorized creator operation that can instantiate an admitted object without ordinary crafting resources. It must not silently grant character knowledge or change unrelated objects. Recheck god access, world/policy revisions and definition readiness at commit; new behavior still follows applicable invention locks and admission, without implying a general owner exception. Persist request, candidate, confirmation and one instance-creation receipt so duplicate submissions or restart cannot create extra objects or repeat paid generation.

After confirmation, automatically complete and validate the approved definition and queue any missing art. Mechanically complete objects may appear with an honest temporary fallback while art finishes; show pending/failed art separately from successful creation. Publish validated art against the retained definition/version and current instance state. Missing required mechanics prevent spawning; art failure does not erase a valid object or authorize automatic paid retries. The creator should not need a separate prompt to request the missing artwork. Track this work in [INV-4.6](../07-technical-architecture/declarations-and-evolution.md#inv-4--give-the-creator-useful-scoped-world-investigation-and-workshop-tools), using INV-3 presentation/family support and the existing art pipeline.

## Whole-world access with distinct audiences

The authorized god/creator agent must support queries over the entire world, including private NPC memories, goals and state. It is not limited to the creator character's perception. Access remains scoped to that world and granted administrative powers; a UI toggle or fictional status grants no authority.

| Audience               | Evidence                                                                                         | Mutation authority                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Ordinary player or NPC | Perceived events, learned/public mechanics, owned and explicitly permitted records               | Validated actions and permitted invention requests        |
| Inventor workshop      | Author's retained versions, permitted dependencies and world evidence                            | Draft revisions; activation requires host permission      |
| World creator/god      | World-wide state, inventions, event history and character context, including private NPC records | Separately granted creator commands and activation        |
| Macrofold worker       | Resources/tools granted for this application, world, audience and task                           | Application-mediated proposals; no direct world authority |

World context excludes credentials, unrelated worlds and unrelated private account data. Shared-world policy must disclose handling of human-private conversations and administrative inspection; those exact terms remain open. Broad creator access remains required. Creator-agent findings stay in the god surface and do not become NPC memories, speech or public events without an authorized in-world act. Recheck scope on retrieval and commit, including after role changes.

## Retrieval and execution

Whole-world access means complete authorized query coverage, not the entire database in every prompt. Typed read tools cover snapshots, entities, character context, events, invention versions, diffs, dependencies and artifact contents. Paginated traversal reaches the whole authorized history. Results include evidence IDs, revisions, time bounds, omissions and index freshness; answers link their evidence.

Exact lookups, filters, counts and diffs use database/code operations. Jev routes ambiguous requests or chooses among supplied intents. LLMs explain evidence and draft declarations/revisions. Bounded tool-using agents handle multi-step investigation and validation. Filtering logs and refreshing menus never require inference per frame.

Macrofold is the preferred generic typed-execution and bounded-agent service behind replaceable contracts. Open Legend owns tool semantics, grants, context selection, spending admission and authoritative changes. An optional workspace retains drafts/reports; canonical active definitions, rights and receipts remain game-owned. This does not require a permanently running sandbox. The runtime now has a Macrofold conversation/execution backend; scoped world query and mutation tools remain unimplemented, and live acceptance remains pending. See [the handoff](../../docs/macrofold-world-agent-handoff.md) and [maintainer TODO](../../docs/maintainers/TODO.md).

## Durable records behind the log and inspector

Use a database-backed world journal and independently retained invention/version artifacts. Visible scrollback is a paginated view, not the retention boundary. The later [awareness contract](../../docs/memory-architecture.md#5-events-awareness-and-memory-storage) retains experiential events only when at least one actor was aware; creator access cannot reconstruct never-recorded experiences. Required state-change and recovery records persist separately. A 300-entry feed is not the entire retained log. Fixed steps need not emit redundant per-field/per-tick rows: document event coverage and retain snapshots plus changes for supported historical queries. Never-recorded or deliberately expired history is labeled unavailable, not fabricated by AI.

| Logical record             | Minimum information and purpose                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| World event                | Stable ID, world/branch/epoch, sequence, simulation/recording time, type/category, actor/controller, targets, outcome, audience, action/invention versions and causation IDs                                               |
| Invention identity/version | Stable ID, immutable version/digest, author accounts, originating character/world, lineage, name, typed parameters/units, preconditions, costs, duration, effects, dependencies, declaration, assets and script references |
| Technical artifact         | Independently retained configuration/source bytes, digest, schema/runtime/ABI, permissions and validation evidence; an expiring diagnostic URL cannot be the sole copy                                                     |
| World installation         | World ID, pinned versions/dependencies, policy revision, installer, migration receipt, effective tick and supersession/quarantine state                                                                                    |
| Workshop session           | World/audience/author, objective, base version, evidence, drafts, patch, assumptions, tests, status, execution receipts and allowance                                                                                      |
| Account invention index    | Creator-owned versions, originating/installed worlds, access/export rights and source availability; rebuildable from durable authorship records                                                                            |

The inspector exposes **all stored technical content of the selected authorized version**: bounds/units, conditions, effects and affected fields/systems, configuration, script source when present, dependencies, tests and revision/activation history. Offer friendly summaries and expandable structured/raw views. Separate declared effects from observed outcomes; arbitrary program consequences cannot be exhaustively predicted. Viewing source never executes it. G1 may have no scripts; G2 execution remains separately gated.

Player log filters cover actions, actors, types, outcomes, places, time and inventions; god mode adds world-wide and administrative views. New inventions retrieves committed admissions linked to exact versions. Drafts, failures, revisions, imports and first inventions remain distinct event kinds. Ordinary summaries cannot leak private definitions or character context.

Commit events and activation receipts atomically, using a transactional outbox for account/global projections elsewhere. Consumers deduplicate IDs and expose index watermarks; authors retrieve new inventions immediately even if search lags. Stage immutable blobs before committing references. Model-run cleanup, world archival and author retention are separate lifecycles: creator-owned artifacts cannot disappear because a trace expires or a host closes a world. Private memories and inspiration never enter packs implicitly.

## Workshop a change without rewriting history

1. Resolve the intended invention/version and installation. If a burn-rate request could affect several objects or a shared material system, ask one consequential clarification or state a reviewable assumption.
2. Read actual parameters, units, declarations, observed behavior and dependencies. Distinguish changing one recipe from changing shared combustion. Generated fields gain no meaning until a trusted interpreter supports them.
3. Draft a named revision and before/after diff. Preserve identity/authorship; record reviser and derivation. Without modification rights, propose a permitted fork or explain the restriction.
4. Validate operations, resource accounting, bounds, dependencies, world premise and invention policy. Run deterministic scenarios and required isolated tests. Unknown/failed validation remains visible.
5. Preview affected recipes, objects, active processes and tradeoffs. Keep refinement available. Publishing and activating a version are separate operations; a draft or successful AI run never silently changes live behavior.
6. Submit the authorized change with expected base version, policy/grant revisions and idempotency key. Concurrent edits conflict/rebase. Recheck locks and permissions at activation. Existing authorization can cover routine changes; no extra confirmation dialog is mandated every turn.
7. Activate atomically at a simulation boundary with explicit migration or compatible pinned-process completion. Preserve consumed fuel, elapsed burn time and relevant state. Slower burning cannot refill fuel or undo a fire. Invalid migration leaves the previous version active.
8. Record events, update library/pack projections and report scope. Reverting configuration is a validated forward change with migration, not deletion of history or reversal of unrelated events.

Either invention lock leaves defined actions and ordinary instance-state changes available under existing rules; the other group can still invent when its own lock is off. Changing definition behavior is authoring even when called tuning. Causal premise and invention admission remain separate controls.

## Proposed delivery and acceptance

Capture stable author/world/invention/version IDs and durable admissions before community contributions. Add the independent server-enforced agent/player invention locks, complete action catalogue, indexed inspection, account library and read-only creator agent. Follow with the G1 revision workshop; pack cloning requires enforced permissions/dependencies. Broad script authoring follows the existing G2 evidence gate. These future increments do not replace the MVP's still-open live-AI acceptance.

Acceptance covers history beyond scrollback; technical records after restart/run expiry; creator inspection without NPC leakage; author access after leaving a host; revocation or locking during generation; conflicting revisions; unsupported parameters; fuel-preserving migration; and full-pack cloning without private context or incompatible dependencies. Distinguish fixtures from live-provider evidence.

Open choices include event coverage/retention budgets, human-private-record policies, co-author/moderator rights, migration defaults, world deletion versus author retention, workshop approval defaults and Macrofold interfaces available at implementation time.

## Implementation tracker: world-agent invention and workshop

Added September 19, 2026. Use the [canonical sequenced invention tracker](../07-technical-architecture/declarations-and-evolution.md#implementation-tracker-from-world-agent-invention-to-evolving-world-mechanics) for task status and dependencies; this section maps the user experience to those tasks rather than creating a second independently maintained backlog.

**Current boundary, from source inspection:** persistent Macrofold chat is now wired in `apps/server/src/macrofold.ts`, superseding this document's older statement that integration is absent. It receives `buildContext(..., 'player', ...)`, not authorized whole-world creator queries, and explicitly has no world-mutation tools. Right-click Invent opens and submits to a new chat tab, but the chat does not currently submit declarations to the engine. The separate invention pipeline supports only its existing finite families. These observations do not establish complete live gameplay acceptance.

| Ship in order | Player/creator experience | Canonical tasks |
| --- | --- | --- |
| 1 | One common request, policy and durable invention outcome across entry points | INV-1 |
| 2 | Right-click Invent yields an actual admitted recipe, then an ordinary Craft/use action; reload retains the result | INV-2 — first playable release |
| 3 | New non-weapon families appear through the same chat, action catalogue and presentation contract | INV-3 |
| 4 | Inspect authorized world-wide evidence, retain drafts and confirm named/random object conjuring with properties and automatic art | INV-4, alongside INV-3; conjuring also uses the art pipeline |
| 5 | Workshop an existing invention, inspect the diff, activate a compatible version while preserving existing progress/resources | INV-5 |
| 6 | Discover reusable material, construction and environmental interactions through play | INV-6 and INV-7 |
| 7 | Inspect a creator library, share/import compatible packs; later consider constrained algorithms only behind their engineering gate | INV-8 |

The first implementation should use a small **server-mediated typed operation** from world-agent chat to the shared invention service. It can return complete response envelopes before adding MCP or streaming. Avoid an LLM call whose only purpose is to repeat an explicit Invent request, and never generate a second candidate when a valid scoped candidate already exists. Normal authorized low-impact invention need not acquire a new confirmation dialog; shared-law edits and consequential migrations follow the separate workshop policy.

The eventual creator agent may query the entire **authorized world** through bounded tools, including permitted private character context. That is query coverage, not a giant world snapshot or permission to disclose private source material in public inventions. Its effects remain typed application operations: draft, validate and request activation; any physical action, character learning, instance spawning or creator command needs its own supported authority and admission path. Macrofold conversations and workspaces supply execution and continuity, never independent authority over the game.

Progress is recorded under the canonical task IDs above. No world-agent mutation path, expanded context access or new mechanic was implemented by this documentation change.
