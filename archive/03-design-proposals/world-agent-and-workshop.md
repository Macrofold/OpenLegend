# World agent, durable world log, and invention workshop

This document owns accepted product behavior for the creator agent, world inspection, workshop and confirmed conjuring experience. Current durable history, Narrator, finite invention and world-agent capabilities are described in [Architecture](../../docs/architecture.md); the complete privileged revision workshop remains target behavior.

This document owns world-agent access, durable inspection and revision workflows. [Playability and controls](playability-and-controls.md) owns log/menu presentation; [invention governance and ownership](invention-governance-and-ownership.md) owns locks, authorship and pack rights. The [declaration architecture](../07-technical-architecture/declarations-and-evolution.md) owns authoritative activation and migration.

## The experience

The creator can talk to a world agent that can look up the world's environment, all characters and their contextual records, current and historical state, inventions and the entire retained authorized world log, with explicit gaps for unwitnessed or expired experiential events. It can answer what happened, explain mechanics, author inventions and workshop existing ones. Requests such as making something burn slower should not require manually rewriting a declaration.

An invention opened from a log or account library offers Inspect, Workshop and, where permitted, Export / use in another world. The workshop retains the conversation, draft, base version, evidence and validation results across turns. The author can refine their own contribution; activation in another owner's world still requires that world's permissions. Proposed owner exception: a deliberate owner edit can be separately authorized and audited while the player invention lock is on. Until that exception is adopted, owner authoring requires the player lock off and editing permission; the independent agent lock need not be changed. Calling the world agent or labeling a new behavior a revision cannot bypass the applicable lock: a player-directed AI workflow retains player origin, while autonomous NPC invention follows the agent lock.

Clicking **Invent** first searches permitted existing inventions using text embeddings and vector search. Similar matches open a new **Similar inventions** modal offering Use existing, Modify existing, Invent new or Cancel before candidate generation. Modification retains the selected version as a derived draft; use follows ordinary crafting/action prerequisites. No matches proceeds normally; search failure is visible. The [canonical search contract](../07-technical-architecture/declarations-and-evolution.md#similar-inventions-before-authoring) and INV-2.1a–2.1b own details and implementation status. This workflow is planned, not implemented.

NPC invention uses the same backend service with actor-scoped method/feedback and [agency continuation](../../docs/agent-agency.md#6-actor-led-invention), without opening the player’s Similar inventions modal. Creator-only queries, persistent creator transcripts and public discovery rights do not become NPC permissions or private knowledge. An admitted method does not force construction.

## Natural-language world and mechanic authoring

The world agent is the primary interface between player/creator intent and the technical work of defining supported mechanics, organisms, senses, and subsystems. A creator should not need to learn schemas, edit scripts, or name storage tables to make an ordinary supported change. Technical artifacts remain fully inspectable under authorization, and all authoring surfaces use the same canonical draft, validation, and activation services.

The [engine/world principles](../../docs/engine-and-world-boundaries.md#natural-language-authoring-with-inspectable-mechanics) define this interface goal. [Runtime contracts](../07-technical-architecture/world-module-runtime.md) define executable integration; [worked examples](../../docs/extensible-world-examples.md) illustrate scope without promising unsupported capabilities.

### From intent to an inspectable candidate

1. **Bind context and authority.** Identify whether the request is ordinary invention, creator workshop, installation, or instance creation. Resolve the authorized world, actor/origin, selected artifact/base revision, applicable locks, and spending scope. Asking in natural language grants no extra permission.
2. **Understand the experience.** Preserve what the requester is trying to achieve. Distinguish a new reusable template, a specialized variant, a subsystem change, and one live instance. Ask only where ambiguity materially changes behavior, scope, rights, safety, or cost.
3. **Find existing supported parts.** Query permitted constructs, definitions, host interfaces, and active world policy. Follow the existing similar-invention workflow where applicable. Reuse exact capabilities rather than copying whole systems, and distinguish unavailable search from no match.
4. **Draft the smallest complete change.** Bind supported ports, propose defaults, declare required dependencies, and retain explicit unanswered choices. Routine technical details should be filled by the agent/compiler. A draft with unsupported required behavior remains incomplete; do not silently substitute another experience.
5. **Validate and test.** Use native schema, compatibility, authority, dependency, resource, lifecycle, and independent scenario checks. The agent may propose tests, but its own test suite or confident explanation cannot certify correctness. Technical output and validation results attach to the exact candidate version/digest.
6. **Explain and review.** Present what will change, who/what is affected, what was reused, important defaults, limitations, validation status, and remaining decisions in plain English. Separate design intent from demonstrated behavior. Offer technical drill-down without requiring it.
7. **Activate under existing policy.** An already authorized low-impact invention may proceed within its declared envelope. Consequential shared-world changes and conjuring keep their existing explicit confirmation requirements. Material scope, permission, cost, or effect changes require renewed review; do not ask for confirmation after every harmless tool call.
8. **Report the committed result and support refinement.** Say installed only after the authoritative receipt exists. Show pending art or blocked subparts separately. Keep the candidate/version and active installation distinguishable. “Make the effect shorter” creates a coherent parameter revision or specialization, not an untracked live mutation.

These are responsibilities within the existing INV workflow, not a second state machine or a requirement for eight model calls. A complete simple request may use a short path. The world agent is not the runtime executor for ongoing effects, needs, or perception.

### Consequential decisions versus routine defaults

Ask about meaningful tradeoffs: new species versus existing population; touch only versus touch plus hearing; memory of explored locations; temporary influence versus enforced compulsion; unknown material assumptions; a newly required effect domain; irreversible changes; changed privacy or player control; and expansion of the cost/target envelope.

Do not ask the creator to choose a JSON property name, internal repository interface, SQL table, or ordinary serialization layout. Use safe reviewed implementation defaults and expose them in technical details. If a missing host capability makes the requested result impossible now, explain the exact gap and offer only real supported narrower alternatives; do not relabel a rough substitute as the complete feature.

### Example: touch-only creatures

For “Make a mechanic for blind creatures that can only sense by touch,” identify whether only excludes hearing, which creatures are affected, and whether they retain remembered routes. Propose a supported contact approximation and state its limits. Check that the candidate removes inappropriate sensory feeds, reference leaks, and omniscient navigation cues—not merely darkens the screen. A fine pressure/texture model remains unsupported unless the host provides it.

Explain the candidate before claiming success: “These creatures will have contact sensing but no sight or hearing; they can remember places already touched if you keep that setting. The first version uses coarse contact detection, not fine pressure.” If the actual validator finds a missing navigation or detector requirement, report the blocker and keep the candidate a draft.

### Reuse and specialization

A creator can request “Use this framework but replace its effect,” “Expose target selection so others can customize it,” or “Adapt this resource rule for my world.” Use [typed construct specialization](../07-technical-architecture/world-module-runtime.md#reusable-constructs-and-specialization). Show required unbound ports and compatibility/rights constraints. A larger effect domain or new lifetime cannot inherit authorization merely because a label was replaced.

A creator may distribute a template with open choices. The agent labels it reusable-but-unbound rather than runnable. Derived versions preserve pinned dependencies and attribution; changes to the original do not silently update installed descendants.

### One artifact across chat and technical inspection

The current structured draft is authoritative. Plain-English summaries, generated diagrams if provided, forms, and raw technical views derive from that draft and its validation state. Chat and raw edits use the same expected revision and validation boundary. Do not let a conversation summary and a JSON editor maintain two conflicting specifications.

Keep semantic traceability from requested behavior to chosen definitions, parameter bindings, defaults, and unresolved requirements. A changed draft invalidates an older preview when relevant. Concurrent edits report a conflict or produce a new reconciled candidate; an old approval cannot activate a stronger replacement. An explanation that generation succeeded does not mean installation succeeded.

Technical inspection includes authorized parameters, units, effects and lifetime rules, dependencies, source/version lineage, schemas, code only where that artifact actually has code, validation results, and known limits. It excludes credentials, unrelated worlds, ungranted private inspirations, and host internals outside the granted inspection scope. Source viewing never executes code.

### Delivery and evaluation

Use INV-1/2/3/4 and the existing Macrofold handoff; EWF12 supplies runtime support/discovery and explanation metadata. Retain requests, drafts, decisions, and receipts independently of an expiring model session. Paused tasks resume only under fresh scope/revision checks; failed or uncertain paid requests do not retry automatically.

A native fixture proves the contract, not that an AI can understand the creator. Separately evaluate capped live requests for meaningful clarification, accurate explanation, supported reuse, technical inspectability, unsupported-feature honesty, and the absence of manual JSON/script work for supported changes. Do not impose that live test as a prerequisite for every native compiler change.

## Confirmed god-mode conjuring

Accepted September 20, 2026; planned, not implemented. In god mode, the creator can ask the world agent to conjure a named object or suggest a random object. The request may describe something not yet defined in the world. The agent helps complete the object as it does an invention: propose relevant properties, supported behavior, dependencies, appearance and initial instance state, explain consequential choices, and ask for missing information only where it matters. “Random” selects a reviewable candidate; confirmation and retries must not silently reroll it.

Resolve an existing compatible definition and artwork first. If absent, author the needed definition/properties and automatically arrange matching artwork through the [runtime art pipeline](visual-direction.md#art-generated-during-play). Define the object's name/description, applicable material and physical properties, supported interactions, required active-world behavior, presentation, quantity, placement and ownership where relevant. Use admitted defaults explicitly; a decorative image or invented field is not a fully working mechanic. Any object can be requested, but unsupported behavior remains a visible requirement for a new trusted family or engineering work, rather than a false claim of completion.

Before executing conjuring, show a concrete preview and obtain explicit confirmation: what will appear, how many, where, which definitions/properties will be reused or created, significant effects and assumptions, missing requirements, and the bounded generation/art allowance. Draft discussion does not authorize spawning. Confirmation covers automatic definition/art completion within that reviewed scope; material changes to scope or cost require renewed confirmation. Do not dispatch paid art generation before this confirmation and the applicable spending admission.

Conjuring is a separate server-authorized creator operation that can instantiate an admitted object without ordinary crafting resources. It must not silently grant character knowledge or change unrelated objects. Recheck god access, world/policy revisions and definition readiness at commit; new behavior still follows applicable invention locks and admission, without implying a general owner exception. Persist request, candidate, confirmation and one instance-creation receipt so duplicate submissions or restart cannot create extra objects or repeat paid generation.

After confirmation, automatically complete and validate the approved definition and queue any missing art. Mechanically complete objects may appear with an honest temporary fallback while art finishes; show pending/failed art separately from successful creation. Publish validated art against the retained definition/version and current instance state. Missing required mechanics prevent spawning; art failure does not erase a valid object or authorize automatic paid retries. The creator should not need a separate prompt to request the missing artwork. Track this work in [INV-4.6](../../docs/maintainers/inventions-and-world-evolution.md#inv-4--give-the-creator-useful-scoped-world-investigation-and-workshop-tools), using INV-3 presentation/family support and the existing art pipeline.

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

### Multi-turn tool use within a task

A retained chat thread supplies conversational continuity; a harness additionally lets the agent choose another tool call after inspecting an actual result. This is especially useful for unfamiliar inventions, following causes through world history, revising interacting mechanics, and completing a complex conjured object's dependencies. Example: inspect a roof's composition, discover the active rain rule, examine supported permeability, then revise and validate the smallest relevant change. Tools and feedback supply the benefit; more ungrounded model turns do not.

Start with simple typed operations for the first release. Later runs may inspect, draft and validate repeatedly within one admitted allowance, with finite rounds/time/bytes and no automatic failed-run retry. Pause the task durably when awaiting creator confirmation, physical work or asynchronous artwork. Revalidate on resumption; session continuity never grants broader authority.

## Durable records behind the log and inspector

Use a database-backed world journal and independently retained invention/version artifacts. Visible scrollback is a paginated view, not the retention boundary. The [awareness contract](../../docs/memory-architecture.md#5-events-awareness-and-memory-storage) retains witnessed experiential events and, under the future NC04 extension, configured notable unseen events without granting actor awareness. Creator access cannot reconstruct never-recorded experiences. Required state-change and recovery records persist separately. A 300-entry feed is not the entire retained log. Fixed steps need not emit redundant per-field/per-tick rows: document event coverage and retain snapshots plus changes for supported historical queries. Never-recorded or deliberately expired history is labeled unavailable, not fabricated by AI.

The future [Narrator](../../docs/narration-and-conversations.md) has separate player-private prose and source links, not world-event authority or World Agent/workshop conversation identity. Journal/history queries distinguish authoritative events from derived storytelling; creator inspection needs explicit access to private story records, and narration cannot fill missing historical evidence.

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

## Delivery

Delivery is tracked in [Inventions and world evolution](../../docs/maintainers/inventions-and-world-evolution.md). The focused remote conversation/session boundary is specified in the [Macrofold world-agent handoff](../../docs/macrofold-world-agent-handoff.md).
