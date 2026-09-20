# Memory, attention and character cognition

Status: **canonical target architecture and accepted design**, September 19, 2026. This document describes the intended complete system, not a claim that it all runs today. The implementation audit and sequenced checklist at the bottom identify the executable subset and remaining work. It supersedes earlier memory limits, NPC cognition routing and thought-display guidance where they conflict. The implementation audit below distinguishes fixture-verified behavior from blocked live acceptance.

Related contracts: [implemented architecture](architecture.md), [context and inference](../archive/07-technical-architecture/context-and-inference.md), [perception and attention](../archive/07-technical-architecture/perception-and-attention.md), [production data model](../archive/07-technical-architecture/production-data-model.md#8-minds-evidence-knowledge-and-conversation), [data queries and MCP](../archive/07-technical-architecture/data-queries-and-mcp.md), and [declaration admission](../archive/07-technical-architecture/declarations-and-evolution.md). Those retain broader world, storage and transport detail; this document owns the memory/cognition behavior and delivery sequence.

## Today's required delivery

**Today's implementation must include a functioning full-harness thinking path and persistent inner-world updates. Completing only episodic memory storage or fast thoughts does not satisfy the task.** Deliver the vertical slice across the first four checklist stages: directional relationships, beliefs, appraisals, goals/concerns, reflection, basic sleep/dream consolidation, bounded authored mind documents, deterministic commits and a god-only mind/thought inspector.

NPCs must be able to reflect during safe downtime, not only when handling an immediate action or speech. Reflection can change their interpretation of past experiences and influence later decisions. Sleep can run the same cognition/consolidation machinery with an optional imagined dream presentation. Both paths are required in an initial form today; advanced semantic retrieval, elaborate dream generation and incremental streaming can follow later.

The bound for **authored inner-world text is at most 10 logical documents per actor, at most 500 words each** (at most 5,000 words in aggregate). See the precise quota and overflow rules below. The 300-entry recent-experience buffer is a separate bounded input, not a replacement for this richer inner world.

**Use a fresh NPC harness conversation for every thinking, reflection or dream job, while reusing compatible warm compute. Skip Macrofold agent presets initially.** Open Legend owns versioned master cognition instructions and injects them with the current actor context at the start of every job. Multiple model/tool turns within that job share its conversation; accepted mind state supplies continuity across jobs. World-agent chat tabs may retain their conversations.

**Allow flexible inner-world organization.** Instructions describe permitted files, quotas, provenance and output boundaries, and suggest relationships, beliefs, feelings, values, concerns and goals as useful subjects. They do not mandate a file per category, a rigid psychological checklist or a change after every reflection. Agents may name, combine, reorganize and summarize their own mind documents within the enforced limits.

This is implementation scope, not evidence that the feature has been delivered. Acceptance examples and unchecked tasks at the bottom must be completed against actual code and separately authorized live execution where required.

## 1. Separate mind, storage and executor

An NPC has a persistent logical mind scoped by world and actor. The game owns its canonical state and update rules. A database, optional file view, model conversation and compute sandbox are different things. A filesystem or MCP server is not required to retrieve database-backed memories: the backend can call its own retrieval function, assemble context and commit validated proposals from a response.

The current storage is a SQLite world snapshot. The end-state uses structured mind records behind a repository interface; separate normalized tables can be introduced without changing the cognition contract. PostgreSQL, a vector service and a workspace per NPC are not prerequisites for the first useful version.

Macrofold executes jobs and optionally hosts scoped tools and working files. Open Legend controls perception, recall eligibility, routing permissions, budgets, state transitions and client projection. No model receives the whole world or another actor's private mind. Canonical persistence and the reasoning executor remain replaceable independently.

## 2. What belongs in a mind

| Record family          | Meaning                                                                 | Producer and authority                                                     |
| ---------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Identity/profile       | Authored history, traits, values, dispositions and supported attributes | Initial game definitions; later changes follow explicit world rules        |
| Observations/episodes  | What this actor experienced, with event-time detail and attribution     | Native perception and ingestion; no AI required                            |
| Beliefs                | Claims about the world, other people or oneself, including uncertainty  | Authored seeds, native learning rules or validated full-harness proposals  |
| Relationships          | Directional familiarity, trust, affection and narrative assessments     | Actual encounter evidence plus native rules or full-harness interpretation |
| Appraisals/affect      | Cause-linked interpretation and supported emotional state               | Native responses and full-harness proposals under declared update rules    |
| Goals/intentions/plans | Durable concerns and plans that affect attention and future decisions   | Authored goals, native urgency or validated full-harness proposals         |
| Commitments            | Promises, debts and appointments, including due time and status         | Actual attributed speech/actions; interpretation may use a full harness    |
| Knowledge              | Learned admitted capabilities, recipes and skills                       | Authoritative teaching, practice and declaration/learning receipts         |
| Reflections/dreams     | Subjective interpretation, self-narrative and imagined associations     | Full-harness proposals when retained as part of the mind                   |
| Thought presentation   | Short in-character narration for an authorized god observer             | Any permitted thought tier; separate from recallable memory                |

Inner-world examples include “I think they will share the food,” “that refusal felt humiliating,” “I dislike depending on them,” “I want to be helpful,” “I still wonder why they left,” and imagined future possibilities. These can influence context and supported decision rules. Free prose never creates executable mechanics: “I feel twice as strong” does not change strength.

The engine stores what was perceived; the actor can interpret it incorrectly. “I saw someone take berries” is an observation. “They stole from me” is an inferred belief whose ownership assumptions may be wrong. Evidence validation establishes that the actor had the cited experience, not that the interpretation is objectively true. Background beliefs have authored provenance. Hypotheses and imagined scenes are allowed with their proper type; they cannot manufacture observed history.

Records use stable IDs, owner/world scope, revision, simulation time, recorded time, source kind, bounded prose, relevant entity/topic references, confidence where meaningful, salience and retention state. Evidence links distinguish supports, contradicts, derived-from and supersedes. Relationship A→B is independent of B→A. Do not create hundreds of psychological columns in advance; use finite supported facets and versioned schemas, keeping new prose descriptions non-executable.

## 2a. Bounded authored mind: 10 documents, 500 words each

Use up to **10 logical mind documents per actor**, each with a hard maximum of **500 words**. Persist them as structured database-backed records with stable IDs and revisions; optionally present them as workspace files through the same interface. Do not require a second filesystem authority. The quota applies identically whether the model returns typed patches or stages edits in files.

Possible subjects include profile/self-concept, beliefs, relationships, goals, concerns, commitments, values/preferences, reflections and retained dream interpretations. These are suggestions, not mandatory categories or file names. Agents can combine subjects, choose titles, introduce their own organizational structure and reorganize documents within the ten-document allowance. A reflection may conclude that nothing needs changing.

Keep a small typed envelope around each document: stable ID, title, revision and evidence references where applicable. Free-form prose does not require a rigid internal template. Explicit changes to structured relationships, goals, commitments or other mechanically meaningful fields still use finite typed proposals; prose alone never acquires executable meaning. Directional relationship records can carry supported numeric facets alongside bounded narrative assessments, with all authored narrative counted against the document quota.

Budget boundaries:

- Count all character-authored natural-language fields in the canonical mind, including titles, relationship assessments, belief statements, summaries and durable scratch prose. Every such field must belong to one of these documents; there is no unmetered parallel store of authored prose.
- Count words using one versioned deterministic function on normalized text (initially nonempty Unicode whitespace-delimited tokens). Count all string fields designated as prose by the shipped schema. IDs, numeric facets and provenance metadata have separate schema/count limits and cannot carry arbitrary prose. Set an additional finite UTF-8 byte limit per document and job so a giant unbroken string cannot bypass the word limit.
- The separately bounded **300 recent observed episodes** are engine-produced evidence, not harness-authored notes. Keep them available through `get_memories`; the harness cannot bypass the authored quota by creating fake episodes.
- Trusted operating instructions, `AGENTS.md` policy text, context manifests and schema metadata are outside the authored-mind quota but have their own request limits. Models cannot edit those fields to stash memories.
- God-only thought/audit history has a separate bounded retention policy and is not an NPC recall source. If a displayed reflection is retained for future cognition, its retained prose must fit the authored-mind quota.
- Old sessions, checkpoint files, exports and scratch must not expose an additional searchable autobiography to the NPC. Durable scratch counts toward the quota or is removed before the next job. Audit backups remain creator-only.

Before submitting a bundle that would exceed a limit, the full harness must decide which eligible material to summarize, merge or remove **within that same bounded run**. Supply current per-document word counts, remaining slots and protected records in the context. A read-only quota/patch-preview tool can return deterministic errors and counts, allowing the harness to revise its draft before final submission within the already admitted call/tool/cost limits.

Commit the compaction and new inner-world changes atomically against expected revisions. Preserve active commitments, essential identity and valid evidence attribution. The model cannot erase a still-active obligation merely to make room. If protected content cannot fit, compress its narrative without losing required structured fields or reject/defer the optional new material. Never silently truncate accepted prose or independently delete arbitrary relationships in code to fit a model response.

An over-limit final response is rejected by code, preserving the previous mind. Do not launch an automatic paid retry. Subsequent explicitly scheduled consolidation can address capacity. The harness chooses semantic summaries/removals; the server validates eligibility, quotas, provenance and revisions without another LLM call.

## 3. Recall volume and the get_memories boundary

**Initial target: retain approximately 300 recent episodic entries per actor and support retrieval of up to 300 entries.** This supersedes the earlier 20–40 recent-observation starting suggestion. It is an engineering starting point, not a claim about human memory capacity. A character should have substantial continuity; twelve short snippets must not become the permanent architectural ceiling.

Keep three separate limits:

- **Recent retention:** a configurable 300-entry recent episodic window, with an explicit byte budget and bounded summaries. Before entries leave it, eligible material can become long-term summaries, beliefs or relationship evidence. Mandatory commitments and identity have separate bounded storage and do not disappear merely because 300 routine episodes arrived.
- **Retrieval:** `get_memories` allows a requested limit up to 300 in the initial version. Full reflection may request the entire recent window; routing can request a smaller selection. Later retrieval searches eligible older retained records rather than only this window. Pagination does not bypass per-job limits or revive forgotten details.
- **Model context:** each task has a configurable record/token/byte allowance. A 300-entry retrieval is not an instruction to send 300 arbitrarily long documents to every Jev call. The assembler reports omissions and missing mandatory information; it never silently truncates JSON. Measure a high-recall context before choosing a smaller default.

The current 20KB context cap and 80 ordinary-memory retention are implementation limits, not the new design. Simply increasing the query limit would not make 300 entries available. Retention, retrieval and context sizing must be updated together. An illustrative 300 summaries × 50 tokens is about 15,000 tokens before other context; count and prose length both matter. This is arithmetic, not a measured model-cost or quality estimate.

The proposed public name is `get_memories`; implementation can use ordinary language conventions. Its actor authority comes from the backend job binding, never from a model-supplied actor ID:

```ts
get_memories(scope, {
  purpose,                 // route, think, deliberate, consolidate, conversation
  trigger,
  query,                   // free text, including arbitrary intent
  entityIds, topics, kinds,
  simulationTimeRange,
  sinceObservationSequence,
  goalRevision,
  includeCommitments,
  requiredMemoryIds,
  strategy,                // recent, relevant, mixed
  limit,                   // initial maximum 300
  maxBytes,
  cursor
}) -> {
  entries,
  observationWatermark,
  mindRevision,
  retrievalPolicyVersion,
  coverage,                // returned, omitted, index freshness, required missing
  nextCursor
}
```

This is a proposed contract, not an existing API. The backend clamps limits and derives scope. Returned memories preserve source type, historical time and uncertainty. Mandatory references and unresolved relevant obligations have a direct path outside optional similarity ranking. If mandatory material cannot fit, narrow/defer the question or admit a larger context within budget; do not imply complete recall.

## 4. Semantic memory retrieval and attention

The end-state includes a **semantic and attention-aware retrieval mechanism**. Recency alone cannot retrieve a relevant old promise, relationship pattern or similar problem. The first strategy uses recent entries, exact entity/commitment lookups and lexical matching; subsequent strategies add semantic search and ranking behind the same `get_memories` interface.

The attention query uses the trigger, current purpose, active goals, involved people/objects, unresolved concerns, emotional salience, recent outcomes and relevant traits. Retrieval proceeds through:

1. Filter by actor/world ownership, recall eligibility and permitted historical exposure.
2. Include required evidence, fresh observations and relevant active commitments.
3. Retrieve recent entries and candidates matching entities, topics and arbitrary intent.
4. Rank by relevance, recency, salience and evidence, with diversity so repetition or negative experiences do not monopolize recall.
5. Return bounded records and coverage; preserve conflicting testimony and distinguish absence from incomplete retrieval.

Optional embeddings index eligible record IDs and revisions; they are not the canonical mind. Entity/relationship lookup and fresh critical observations must work during index lag. Tombstones, corrections and forgetting invalidate search results and caches. Authorized scope filtering applies before ranking, snippets and counts.

External attention uses the [perception contract](../archive/07-technical-architecture/perception-and-attention.md): semantic interpretation of a new goal compiles bounded interests in recognizable features/affordances. Native matching then notices relevant exposures without calling Jev for every tree. Evaluate interests immediately against already visible objects as well as future arrivals. This world-attention mechanism and personal-memory retrieval share intent concepts but have different eligible data sources; neither grants knowledge of unseen world objects.

## 5. Cognition tiers and coherent outputs

Native simulation and valid ongoing plans run first. Use one Jev routing judgment where semantic selection adds value; avoid a mandatory chain of “act?”, “novel?”, “simple?” and “fast?” calls. Routing considers both reasoning difficulty and whether a lasting inner-world change is needed.

| Tier              | Executor                           | Permitted result                                                                                                        |
| ----------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Continue/native   | Code, or Jev selecting continue    | Existing plan/native action; no generated inner-world change                                                            |
| Existing action   | Jev selects a supplied candidate   | Action proposal under current prerequisites                                                                             |
| Fast thought      | Configured mini/nano LLM           | Short thought/dialogue and optionally an existing action proposal; no lasting inner-world proposal                      |
| Complex thought   | Stronger single LLM call           | Richer interpretation or immediate decision and optionally an existing action proposal; no lasting inner-world proposal |
| Full deliberation | Bounded Macrofold harness          | Coherent action, thought/dialogue and proposed inner-world changes; scoped recall tools when needed                     |
| Defer/unknown     | Code consumes explicit uncertainty | Preserve native behavior, ask for information where appropriate, or wait                                                |

**Only full deliberation may propose AI-authored lasting inner-world updates.** This is the chosen application policy, not a technical limitation of smaller models or a reason every harness run must use tools. A full harness may finish after one model response if it has enough evidence. Model selection within the harness remains configurable; route authority comes from the server, not the model's claimed tier.

Use the highest required tier for the whole coherent decision. If an encounter requires an action, a thought and a trust revision, one full-deliberation job returns them together. Do not separately ask weaker models to finalize parts of that decision. Jev can propose the route and evidence needs, while the server enforces allowed outputs, budget and limits.

A fast/complex thought can return `needsDeliberation` when it discovers that lasting interpretation is needed. That preliminary result remains uncommitted; one explicitly admitted escalation can resolve the bundle. No hidden retry/escalation loop. If deliberation is unavailable, continue safe native behavior and retain experiences for later processing; do not downgrade a mind write to an unauthorized fast call.

The full-harness requirement applies to AI-authored revisions, not all state changes. Observations, inventory changes, taught knowledge, fulfilled commitments, configured affect decay and native survival behavior must continue without waiting for a harness. Selecting an immediate action is an executable intention; adopting a persistent personal goal, relationship interpretation or enduring plan is an inner-world proposal. Deliberate rehearsal or memory salience changes can be proposed by the harness, while the engine still owns retention policy.

A fast thought's stored UI/audit entry is **not** automatically a recallable memory, belief, emotional update or future context source. Otherwise logging would become a covert mind-write path. Actual spoken dialogue is an external event and follows ordinary observation rules; promises or other durable implications should route to full deliberation before generation when anticipated.

## 6. Context construction and execution sequence

The context builder owns a versioned task contract with required/optional records, output authority and known/unknown policy. Assemble a consistent decision view, not unrelated reads of “latest” files.

```text
DecisionContext
  decision ID; world/actor scope; purpose; policy/schema versions
  simulation time; observation watermark; mind/goal/capability revisions
  trigger and recent relevant actions/outcomes
  environment: permitted visual/audible facts and other actors' observed actions
  body: relevant needs, conditions and owned inventory
  inner context: traits, relevant relationships, goals, intent, concerns
  recall: attributed memories/beliefs/commitments from get_memories
  actions: candidate IDs, bound parameters and capability/version references
  coverage: omissions, uncertainties, missing required information
  budget/deadline; permitted output fields; authorized tool references
```

Routing gets a purpose-specific smaller context with any memories necessary to interpret its trigger. Enrich after selecting the work required; do not serialize the entire biography into every call. Reuse authorized immutable templates and bounded cache entries when safe; warm compute does not make prompt tokens free.

The lifecycle is:

1. Commit actual world outcomes and record permitted experiences independently of AI availability. Coalesce repetitive exposure; not every footstep is a durable episode.
2. Create/coalesce decision opportunities per actor: directed speech, a person encounter, relevant resource discovery, goal progress/blockage, action outcome, meaningful need thresholds or supported hazards. An opportunity need not purchase a thought.
3. Execute native urgency/valid ongoing work first. Apply scheduling, fairness, real-time call limits and spending admission. Simulated reminders and real-time deadlines are different clocks.
4. Build routing context with the necessary observation watermark and select the highest required tier. Preserve explicit uncertainty.
5. Retrieve/enrich context for the selected tier. Bind mind and relevant world dependencies. During full deliberation, bounded tools can recall more actor-permitted evidence.
6. Receive and durably identify a complete typed proposal. Normalize provider failure/refusal/invalid/uncertain outcomes without inventing a game result.
7. Validate dependencies and proposed changes in ordinary code. Commit the coherent bundle atomically where coupled, with an idempotent decision receipt. A rejected coupled action/mind bundle is not partially applied. Independent historical annotations require an explicitly separate contract.
8. Advance accepted actions in simulation. Record their eventual success/failure and perceived consequences as new experiences. An action request or start is not a memory that its outcome already happened.

Do not postpone raw observation ingestion until a thought finishes. Do not grant inventory, action completion or an invented capability merely because it was described in a response. Updated plans, dead actors, consumed resources and changed target conditions can invalidate a delayed proposal. Recheck relevant predicates instead of rejecting everything on every unrelated world tick. A historical reflection can remain useful after a stimulus ends, but must not supply stale authority for a current action.

## 7. Response, validation and commit

A full-deliberation proposal can contain:

```json
{
  "decisionId": "decision-123",
  "contextId": "context-123",
  "expectedMindRevision": 8,
  "thoughtText": "I want to help, although I am still unsure I trust them.",
  "action": { "candidateId": "candidate-7" },
  "mindProposals": [
    {
      "kind": "relationshipAssessment",
      "subjectId": "person-known-to-this-actor",
      "text": "Cautiously willing to cooperate",
      "evidenceIds": ["observation-42"]
    }
  ]
}
```

Illustrative shape only: shipped schemas enumerate the actual patch families. Fast/complex schemas exclude `mindProposals`; server authority checks reject them even if output uses the full schema. The server binds the actor and decision; a model cannot choose whose mind it edits.

**Validation is ordinary deterministic programming, not another LLM call.** Checks include:

- Schema/type/size limits, finite numbers, supported patch families and enum values.
- Correct decision identity, caller/tier authority, actor ownership and live revision dependencies.
- Evidence references exist and are available to this actor; observed/heard/inferred/imagined provenance cannot be silently upgraded.
- Relationship changes name permitted subjects and stay within supported state/update rules.
- Actions resolve exact supplied candidate IDs to registered capabilities, versions and parameters; a display-name match is insufficient.
- Current resource, reachability, knowledge, target, permission and other execution prerequisites still hold.
- Already committed decision IDs are not applied twice; coupled changes commit together or not at all.

The validator does not claim to prove a belief true, a thought psychologically realistic or a relationship assessment wise. Those are quality/evaluation questions. Subjective mistaken interpretations are legitimate game content when properly represented. More semantic interpretation, when genuinely required, belongs to an explicit budgeted decision/declaration workflow rather than a routine hidden “validation LLM.”

Generated novel mechanics remain proposals until the declaration validator admits them into finite trusted families. Missing primitives become an unresolved capability request, not executable generated code. No automatic paid repair on invalid output.

## 8. Thoughts, streaming and god visibility

Private thoughts appear **only in god mode, in a Thoughts section of the character profile**. They do not appear over the character's head. Above-avatar action labels and inventory notifications are separate public presentation. Thoughts are authored character narration, separate from the provider's internal reasoning.

Enforce god access in the backend response/stream projection, not only by hiding a UI control. Ordinary players and other NPCs receive behavior, permitted speech and observations, not private thought entries. Store thought presentation with actor, decision, time and outcome, under its own retention policy. Display storage does not automatically make it recallable by the NPC.

First implementation waits for a complete validated decision before publishing thought text and starting its proposed action. Later streaming uses typed messages with explicit proposal/accepted states. Partial JSON never executes. If an action must begin before the entire harness run finishes, a complete accepted action message establishes a separate commit boundary; subsequent text cannot retroactively change it. That extension is deferred until coherence, cancellation and stale-state handling are demonstrated.

## 9. Sleep, dreams, forgetting and consolidation

This section owns the dream mechanic previously described in [agents and social simulation](../archive/03-design-proposals/agents-and-social-simulation.md#sleep-dreaming-and-consolidation); [the research discussion](../archive/02-research/human-models-and-memory.md) retains its background rationale.

### Safe downtime and the reflect decision

Safe downtime is a first-class reflection opportunity. Native eligibility checks confirm no immediate survival emergency, pending urgent directed interaction or responsibility requiring attention. Active purposeful work is not interrupted just to generate introspective prose. A sleeping/resting actor may consolidate while the native rest action continues.

When idle and eligible, offer `reflect` as a **cognitive candidate** to Jev alongside continuing/waiting and relevant existing actions. Selecting it dispatches full deliberation; it is not an invented physical action or a request to mutate the world directly. The harness can review recent encounters, revisit beliefs, update relationship assessments, form concerns/goals and return private thoughts with a coherent mind-update bundle. A new goal can then change attention and future action selection through supported rules.

Trigger opportunities on meaningful unprocessed experience, unresolved concerns, a supported periodic review or approaching the authored-mind capacity. Track an experience watermark, idle/rest episode and last reflection time. Coalesce repeated triggers, use per-actor real-time cooldowns and global spending/concurrency limits, and stagger actors. Finishing reflection while still idle must not immediately schedule another reflection over unchanged evidence. Mark processing progress only after the result is accepted; failures use a bounded scheduler backoff rather than a paid retry loop.

Urgent changes can cancel or supersede reflection. The world continues advancing; it does not freeze for introspection. An obsolete proposed action is not performed, and coupled mind/action changes obey the coherent-commit rule. Idle reflection normally omits a physical action, allowing its historical interpretation to be validated against relevant mind/evidence revisions independently of unrelated world motion.

### Sleep and dream consolidation

During eligible sleep/rest, schedule a low-priority, budgeted consolidation opportunity. A full-deliberation job can select consequential experiences, merge repetition, identify unresolved concerns, revise beliefs, compact relationship evidence and propose which details to retain or forget. Optional dream narration presents this process in the god-only Thoughts section. This is a fictional game mechanic, not a scientific model of sleep.

Dream scenes are tagged **imagined**. They can inspire a hypothesis or proposed invention but cannot become evidence that a real event occurred. A dreamed theft does not establish a theft; an inspired invention still needs declaration admission, materials and actual execution.

Consolidation reads an observation watermark and record revisions. Propose patches against record IDs, never replace the entire mind with a fresh file. Preserve experiences arriving during the job, unresolved obligations and protected identity. Deterministically merge nonconflicting changes where supported; otherwise defer a new cognitive decision. There is no automatic paid rerun on conflict.

Native retention, exact deduplication and supported decay operate without a harness. When budgets/provider capacity are exhausted, sleep and survival continue; staged retention rules preserve critical material and remove eligible low-value detail. Semantic consolidation waits. Stagger sleepers' jobs and deprioritize dreams before urgent decisions or directed conversation.

Differentiate recent experience, recallable long-term summaries and optional creator audit storage. Forgotten detail must leave retrieval indexes, file views and subsequent NPC context. A creator archive is not an unrestricted recall tool. Corrections retain attribution and invalidate relevant derived beliefs/caches without rewriting the original experience into something never observed.

Conversation transcripts are a second memory channel. Start a fresh NPC session for every thinking/reflection/dream job, not just after policy changes. Retain conversation only for the model/tool turns inside that job. Across jobs, reconstruct context from accepted, recallable mind state and experiences while reusing compatible warm compute. Workspace checkpoints, old exports and scratch files must not allow the NPC to recover forgotten data by searching them. Player-facing world-agent chat tabs may retain conversation history under their separate audience policy.

## 10. Open Legend instructions, fresh sessions and flexible files

**Skip Macrofold agent presets initially.** Open Legend owns the master cognition instructions, model/harness configuration, output contracts and tool permissions. Presets are an optional future packaging convenience, not a dependency of today's implementation or a second source of policy.

1. **Master instructions:** keep a versioned template in Open Legend explaining the NPC role, permitted sources, file locations, quotas, evidence attribution, output format and update authority. Suggest useful inner-world subjects without prescribing a universal personality, narrative style, file taxonomy or psychological checklist. Agents may organize their thoughts freely within the boundaries and need not change their mind on every job.
2. **Per-character seed:** authored background, traits, values, initial relationships/beliefs, permitted starting knowledge and possessions receive explicit provenance. Seeded facts are not fabricated experienced events. Mechanical setup is committed by the game; the harness receives an authorized projection.
3. **Every-job injection:** each game thinking turn starts a fresh harness session with the current master instructions, policy/schema versions, actor identity, task, permitted writes/tools, context manifest, accepted mind contents and quota usage. Required rules are included explicitly, not merely linked by a filename the model might skip. Within that job, subsequent model/tool turns use the same conversation and instruction snapshot. Keep stable policy text separate from volatile observations for inspection and potential caching.
4. **Flexible file view:** an optional generated `AGENTS.md` is a convenience entry point for the same policy, not the source of authority. Expose the accepted mind as a read-only snapshot, and let the harness stage additions, edits, renames, merges or removals in a restricted proposal area. Validate and atomically commit the resulting coherent bundle. Never treat edited files as automatic canonical replacements. Retained authored content, including scratch, follows the ten-document/500-word policy; observations and trusted instructions have separately declared limits.

Illustrative layout; the authored document names and organization are agent-chosen:

```text
AGENTS.md                 # optional generated entry point, not agent-editable
context/manifest.json    # actor, watermark, versions, permitted references
context/experiences.jsonl # bounded engine-produced observations
mind/<chosen-name>.md    # accepted authored documents and typed metadata
proposals/               # staged edits for this job, not another persistent mind
```

A staging area can temporarily contain a candidate next version, but its validated final authored set must satisfy the same total quota. Temporary proposals cannot become retained or searchable overflow storage. Supply protected records and deterministic quota counts so the harness can choose its own summaries and removals. Typed state patches accompany any mechanically meaningful changes; arbitrary document wording remains expressive content.

Do not rewrite a running worktree on every simulation tick. Send the current context in each job request; publish file snapshots only at a safe job boundary or as immutable artifacts. Inline accepted documents and structured final proposals can implement the same contract before a file adapter is needed. Either representation must deliver a working full-harness inner-world path today.

**Every NPC job gets a fresh conversation; compute can stay warm.** Several model/tool rounds within one job are expected when useful. At the next job, supply the latest accepted mind and permitted observations rather than inheriting a transcript. Reuse only compute/workspace state that cannot expose old sessions, obsolete mind files or retained scratch. Warmth is a compute optimization, not an alternate memory channel. World-agent chat tabs may keep actual conversations because user follow-ups depend on them; that exception does not change NPC recall rules.

Stamp the dispatched instruction version. Game-wide updates take effect for the next NPC job automatically. Define whether already in-flight proposals remain acceptable after a policy change; server revocation/validation still applies regardless of instructions already sent. No special conditional session-migration mechanism is required for ordinary NPC jobs because their conversations are always fresh.

Macrofold's inspected contracts support explicit harness/model selection without an agent preset, plus workspace/session/run/sandbox identities. Relevant sources: `../AgentCloud/packages/contracts/api.d.ts` (`RunCreate`), `../AgentCloud/packages/core/src/runs.ts` and the Open Legend backend adapter. This is source evidence, not live acceptance verification. Existing native calls denying files/tools are not evidence that the scoped staging/recall policy above is implemented.

## 11. Selective recall tools and remaining Macrofold work

Expose the same retrieval service to a full harness through scoped tools when needed. An MCP adapter is a good transport for `get_memories`, `inspect_memory`, `list_commitments`, permitted observation queries and action-candidate lookup. MCP must not become a second implementation of memory semantics.

Tool grants are bound to the world/actor/job by the server. Limit calls, records, bytes, time and spend; preserve snapshot semantics, coverage and historical provenance. Do not expose unrestricted SQL, world history or raw database credentials. Ordinary fast/complex requests use backend-assembled context without a tool round.

A `propose_mind_update` tool can stage typed changes for a full-deliberation job, but a final response containing the coherent action/thought/mind bundle is sufficient initially. Do not expose arbitrary `save_memory` or direct canonical file replacement. “Save” means submit a proposed record/patch through the same admission service.

No new Macrofold memory database is required to start. Open Legend needs the mind/retrieval/validation services and tier routing. Full selective recall additionally needs an authenticated connection between Macrofold and the game query service, plus least-authority tool grants. Verify hosted reachability separately: a hosted worker cannot assume the application's localhost is its own localhost. No network exposure or credential changes are authorized by this document.

Capabilities to verify or extend in Macrofold before relying on the full end-state:

- Enforce scoped recall/file grants with the selected harness; confirm tools cannot inspect another actor or old memory exports.
- Propagate Open Legend instruction versions and context identifiers into durable run receipts; use explicit run configuration without requiring agent presets. Define current-policy handling for in-flight jobs.
- Support a fresh session on compatible warm compute, explicit close/cancel and honest persistence outcomes.
- Provide the desired direct small/strong JSON model routes. The current Open Legend `generate` adapter uses a native harness; that is not yet the fast/complex no-harness split. Do not assume `/v1/models` eligibility for native runs means the same model is enabled for typed inference.
- Add typed incremental output only when early action commit/streaming is implemented. SSE text alone is insufficient.

Worker lifetime, session history, mind persistence and thinking-tier authority remain independent. A full harness is selected for proposed inner-world changes by policy even when it requires no tool calls; this can cost more than one small-model call. Measure that tradeoff and keep the execution contract modular so future revisions can authorize bounded mind-writing inference without changing storage.

## 12. Implementation audit and sequenced TODO

Source inspection on September 19, 2026. Checked items mean code exists, not that live-provider quality, latency, cost, persistence or end-to-end acceptance is proven. Parent-thread runtime work may advance independently; update this audit against actual code when completing a stage. This document's target contracts take precedence over older illustrative limits; unchecked work must not be described as implemented.

### Implemented and fixture-verified, September 19

`packages/domain/src/mind.ts` owns typed envelopes/facets, flexible documents, quotas, atomic proposals, private narration, revision checks and scoped recall. Native events and person-entry observations are recorded without AI. SQLite snapshots persist accepted minds. `apps/server/src/cognition.ts` owns versioned instructions and context. `ai-director.ts` routes through Jev, admits at most one explicit fast/complex-to-full escalation, and schedules reflection/dream opportunities. It discards lower-tier provisional output; full cognition cannot silently fall back to a direct model call.

The shared provisioner creates one persistent workspace/default worktree per NPC at startup and on discovery of new NPCs. NPC jobs start fresh sessions on compatible warm actor compute, with tools/files/shell/connections/network denied. Accepted documents and typed staged patches travel inline. No Macrofold preset, filesystem mirror or model-invoked MCP recall tool is installed. World-agent chat tabs retain conversational sessions separately.

The backend god endpoint and character inspector require `OPEN_LEGEND_GOD_MODE=true`, the existing local-owner cookie and same-origin boundary. This is **not** a multiplayer role system: keep it disabled when serving ordinary players. Public state and avatar labels exclude private thoughts and authored mind documents.

| Boundary                             | Implemented limit                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Ordinary native experience retention | 300 entries; 240 Unicode code points per summary; 400,000 total UTF-8 bytes                                    |
| Legacy active native commitments     | Existing separate 16-record protected allowance                                                                |
| Authored mind                        | 10 documents; 500 NFKC whitespace-delimited words including title and 8,000 UTF-8 bytes per document           |
| Typed facets and proposals           | 80 facets; 100,000 proposal bytes; all durable narrative belongs in quota-counted documents                    |
| Private thought presentation         | Last 100; each ≤250 words and ≤2,000 characters; never actor recall                                            |
| Job context                          | Full recall requests 300, smaller tiers 30; compact context ≤80,000 UTF-16 code units and ≤400,000 UTF-8 bytes |
| Complete Macrofold prompt            | 98,000 characters; fail before sending if it cannot fit                                                        |

Optional recall yields to the complete accepted mind and active obligations; coverage reports omissions. Required-content overflow fails before dispatch. A **synthetic payload measurement**, not model acceptance, supplied 300 short experiences in 52,944 context bytes, plus 3,009 schema bytes and 2,414 instruction bytes. Longer summaries or full authored capacity can reduce optional recall. Recent commit receipts are bounded to 300; durable backend jobs guard older operation replay.

Legacy model-authored belief/reflection notes remain in saved audit data but are excluded from actor recall, so they cannot bypass authored quotas. Seed goals enter protected identity. New commitment facets require accessible, native, self-attributed promise speech; models cannot invent executable debts or clear active obligations. Automatic obligation fulfillment, deadlines, richer relationship metrics and emotional mechanics remain extensions. Contradiction/supersession evidence links preserve attribution without proving an interpretation objectively true.

Safe downtime requires no active non-rest work, adequate needs and unprocessed evidence. Reflection uses a one-simulated-hour cooldown. Rest jobs bind the exact rest episode and watermark. Durable fingerprints, a wall-time admission interval, unchanged-evidence suppression and shared spending reservations bound attempts. Native urgent actions continue independently. Dreams remain imagined; concurrent observations survive commit.

### Reproduce setup and separately authorized live acceptance

Configure backend `.env`: existing `MACROFOLD_API_KEY`, `MACROFOLD_BASE_URL=http://localhost:3210`, `MACROFOLD_MODEL=gpt-5.4-mini`, `MACROFOLD_HARNESS=opencode`, an explicit `AI_BUDGET_USD`, `MACROFOLD_COMPUTE_MAX_USD=10`, and `MACROFOLD_RUN_MAX_USD=0.25`. The live catalogue listed GPT-5.4-mini as the highest enabled GPT-5 mini. The template keeps paid work disabled until an operator selects caps. Keys never reach the frontend.

```sh
# Workspace/worktree provisioning only: no compute or model call.
node --env-file=.env --import tsx scripts/macrofold-seed.ts
# Explicit paid acceptance: isolated saved world, four capped harness jobs.
node --env-file=.env --import tsx scripts/verify-live-memory.ts
# Only after diagnosing interrupted setup; reuses its original idempotency key.
node --env-file=.env --import tsx scripts/macrofold-resume-setup.ts .data/live-memory-acceptance.sqlite ada
```

These scripts and the shared backend preserve the exact request sequence: workspace, default worktree, capped sandbox, fresh runs, status/result polling and verified persistence. Mutations are durably journaled before sending. Uncertain admission blocks duplicates; the recovery script is an explicit operator action, not an automatic paid retry. The $10 compute allocation is a conservative reservation, **not a measured invoice**. Model-run caps are additional and share the application allowance.

**Observed live status:** Ada's workspace was created. The isolated acceptance initially had a world-identity conflict, corrected with distinct world identities and stable naming. Sandbox creation then returned HTTP 503, `execution_disabled`, before any model run was admitted. Macrofold's local execution requires `ALLOW_PAID_EXECUTION=true`, `EXECUTION_PROVIDER=docker`, `ORCHESTRATION_BACKEND=poller`, Docker and its worker. No live relationship quality, dream behavior, token cost, latency or warm-compute acceptance is claimed.

**Additional compatibility gap:** the inspected Macrofold inference implementation exposes Jev through Typesafe/OpenRouter, while generic JSON inference currently uses Anthropic. Open Legend's fast/complex adapter requests GPT-5.4-mini via OpenRouter; that JSON route requires Macrofold support and separate live verification. It fails explicitly instead of substituting another model or sandbox. Full mini-model harness execution and Jev classification are distinct routes.

### Today acceptance — complete the vertical slice before calling this done

Checked items indicate implemented deterministic behavior with fixture evidence, not live model acceptance. Live-dependent items remain unchecked. These tasks draw on Stages 1–4 below; those stages describe sequencing within delivery, not permission to postpone the full harness and inner world to another day.

- [ ] A real full-harness route receives an actor-scoped snapshot of experiences and current mind, produces a thought plus typed belief/relationship/appraisal/goal proposals, and the backend durably commits valid changes.
- [ ] Consecutive NPC jobs use distinct conversation/session IDs and compatible reused compute. Every job receives the current Open Legend master instructions and accepted mind; no agent preset is required. Old transcripts, obsolete files and scratch do not leak into recall.
- [ ] The harness can choose document names, combine topics and reorganize its thoughts within quota without a mandatory psychological checklist. Typed envelopes/patches preserve identity, evidence and mechanical boundaries.
- [ ] Ada experiences an actual supported interaction; a later reflection can develop a directional relationship assessment and an explicitly inferred belief citing that experience. Reload/restart preserves them, and the next decision receives the committed assessment/belief.
- [ ] Safe idle time creates a bounded `reflect` opportunity. Jev can select it without requiring a new player command; native urgency and existing responsibilities take priority. Unchanged idle state does not cause repeated paid reflections.
- [ ] Sleep/rest triggers a basic full-harness consolidation/dream job. It preserves concurrent new observations and obligations; any dreamed scene is tagged imagined and does not become observed evidence.
- [x] Up to ten authored mind documents, each at most 500 words, are enforced in code. At capacity, the harness can submit an atomic summarize/remove/add bundle; an unresolved overflow preserves the previous state. Inspectable structured relationships/beliefs remain available, not just a single narrative memory blob.
- [x] The god-only character profile exposes Thoughts and inspectable relationships/beliefs/inner-world state. Ordinary player DTOs and avatar labels never expose private thoughts.
- [x] Fast/complex calls cannot propose lasting inner-world changes. A decision needing action, thought and a mind update routes as one full-deliberation bundle.
- [ ] Fixture checks cover these boundaries without external calls. Separately budgeted live checks prove an actual Macrofold run, accepted result, durable mind update and reuse in a later decision; report any external blocker rather than claiming live acceptance.

### Stage 1 — Mind contracts and useful initial recall

- [x] Define canonical versioned mind/proposal schemas, directional relationships, appraisals, active concerns, authored seed provenance and `imagined` source support. Implement the ten-document, 500-word-per-document authored quota, deterministic word/byte counters and atomic compaction proposals.
- [x] Implement the `get_memories` port using current persistence; raise the recent window and retrieval ceiling to the initial **300-entry** target. Preserve commitments/identity with explicit storage allowances.
- [x] Update context sizing alongside retention: support high-recall jobs, smaller routing views, honest omissions and mandatory-evidence overflow. Measure actual payload sizes before freezing defaults.
- [x] Define semantic/attention strategy interfaces now; initially use recent/entity/commitment/lexical retrieval. Add appropriate storage indexes when records leave the world snapshot.
- [x] Separate thought presentation records from recallable memories; record native experiences regardless of AI availability.

### Stage 2 — One coherent routed decision

- [x] Add versioned routing contract for continue/action/fast/complex/full/defer, including whether lasting inner-world change is needed. Highest required tier owns the final bundle.
- [ ] Bind mini/nano and stronger single-call executors separately from the Macrofold harness; verify supported provider/model routes and budgets. No cheaper-route mind writes.
- [x] Implement complete response schemas, deterministic proposal validation, tier authorization and atomic coupled commits with idempotency and relevant revision checks.
- [x] Make awaiting/proposed/started/completed actions distinct; record actual action outcomes through the existing event path.
- [x] Add explicit abstention and a bounded, separately admitted escalation request without committing a lower-tier provisional result or automatically repeating paid calls.

### Stage 3 — Full deliberation and inspectable thoughts

- [x] Store/version master cognition instructions and actor seeds in Open Legend; inject them with the current policy, context and quota manifest every job. Skip Macrofold agent presets. Start a fresh NPC session for every job and retain only its within-job model/tool conversation; reuse compatible warm compute without exposing stale memory files.
- [ ] Provide scoped recall/inspection tools through MCP or an equivalent adapter over the same service. Enforce actor/job authority and bounded results.
- [x] Support agent-chosen mind-document organization with a small typed envelope and quota enforcement. Add optional read-only accepted snapshots and a restricted proposal staging area when using files; define scratch cleanup and safe publication boundaries. Do not mirror every tick or allow unmetered persistent staging.
- [x] Add a backend-authorized god-mode Thoughts section in character profiles. Exclude private thoughts from ordinary clients and avatar status queues.
- [x] Initially display only complete accepted narration. Defer typed streaming/early commit until the final-response path is reliable.

### Stage 4 — Dreams, continuity and recovery

- [x] Schedule safe-downtime `reflect` opportunities and staggered sleep/rest consolidation with priority, experience watermarks, episode deduplication, budget, simulation-time eligibility and real-time execution limits. Deliver their basic working paths today.
- [x] Implement full-harness consolidation proposals with imagined dream tagging, evidence-preserving summaries, protected commitments and watermark-safe merges.
- [x] Implement forgetting across indexes, workspace views and future session context; keep creator audit access separate from actor recall.
- [x] Add correction/contradiction handling and deterministic fallback retention during provider/budget failure.
- [x] Verify restart, concurrent observation arrival, cancellation, expired context and stale-policy behavior before enabling continuous background cognition broadly.

### Stage 5 — Advanced retrieval and measured expansion

- [ ] Add semantic retrieval/reranking for eligible older records and arbitrary intents, including index freshness, cache invalidation, diversity and mandatory direct lookups.
- [ ] Connect goal-derived world attention interests to personal recall while maintaining separate visibility/knowledge scopes.
- [ ] Add typed incremental thought/action events only with explicit independent commit boundaries and god-authorized streams.
- [ ] Evaluate high-recall contexts versus selective contexts, tier selection, long-term continuity and the harness-only mind-write policy; refine via versioned configuration rather than storage rewrites.

### Validation and acceptance work for those stages

- [ ] Fixture checks: 300-entry retention/retrieval, mandatory commitments, imagined-versus-observed separation, actor isolation, source/detail restrictions, tier write rejection, atomic/idempotent commit, stale dependencies, sleep-job merge, forgotten-session leakage and god-only thoughts. Fixtures make no external requests.
- [ ] Behavioral evaluation: old promises amid distractors, neutral/positive/negative recall balance, rumors and contradictions, coherent action/thought/relationship bundles, bounded routes that abstain rather than invent evidence.
- [ ] Separately authorized live acceptance: real model/harness compatibility, scoped MCP access, warm-session behavior, result/persistence outcomes, usage, context size, tool rounds, latency and spend per real hour and simulated day. No automatic paid retries.

Open parameters: exact supplementary record byte budgets (the ten-document/500-word authored limits and 300-entry recent target are settled starting values), longer-term retention allowances, cognition model choices, native emotional update rules, thought-audit retention, semantic index backend and streaming protocol. The direction is settled here; these values should remain configurable and evidence-driven.
