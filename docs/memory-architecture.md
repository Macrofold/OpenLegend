# Memory architecture

This is the **single authoritative specification for the complete intended memory and cognition system**. It combines the current requirements for character minds, awareness, retrieval, attention, conversation, consolidation, reflection, workspaces, sleep and dreams. Related engineering documents can detail implementation, but do not define alternative memory behavior.

The CR01–CR11 runtime foundation is implemented; integrated acceptance and broader conditional features remain open. Build tasks are in [CR01–CR12](maintainers/cognition-redesign.md); actual delivery evidence belongs in [implementation status](../archive/05-project/implementation-status.md) and [maintainer TODO](maintainers/TODO.md). This document describes what to build rather than maintaining previous versions of the design.

## 1. Intent and ownership

A short exchange should receive a short, promptly generated answer. Speaking or making an immediate decision does not require the character to rewrite its relationships, beliefs, goals and concerns. Reflection is a separate background activity. Routine cleanup of remembered experience is lighter still.

A simple greeting's optimization target is a few hundred input tokens and roughly 10–50 visible output tokens. This is a target, not a measured result or a promise for every character/context. Count the complete workflow, including Jev, tool responses and reasoning tokens, when assessing cost and latency.

The domain remains pure, deterministic and authoritative for simulation transitions. The server owns awareness, context, scheduling, spending, workspace publication and admission. The AI package supplies generic typed execution; the client displays permitted data and sends intentions. Free prose, generated JSON fields and edited inner-world files cannot acquire executable meaning automatically.

### What belongs in a character's mind

The character has a durable inner life, not just a log of events. Its authored files can express the following subjects without requiring one file, JSON record or mandatory checklist per category.

| Content                        | Intended behavior                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Identity and self-concept      | Background, traits, values, preferences and the character's understanding of itself                                     |
| Beliefs                        | Interpretations of people, events and the world; beliefs may be mistaken or uncertain                                   |
| Relationships                  | Directional familiarity, trust, affection and narrative assessments; A's opinion of B need not match B's opinion of A   |
| Feelings and appraisals        | How experiences felt and what they mean to the character; numerical effects require supported native rules              |
| Goals, intentions and concerns | Durable motivations, unresolved questions and plans that influence attention and later decisions                        |
| Commitments                    | Remembered promises, debts and appointments; actual obligations and their lifecycle remain native authoritative records |
| Knowledge                      | Learned skills and recipes; thinking about a capability does not teach or admit it mechanically                         |
| Reflections and dreams         | Reinterpretation, associations and imagined possibilities retained when useful                                          |

“I saw someone take berries” is an experience; “they stole from me” is an interpretation. A later explanation can change the belief without rewriting the original experience. The character may be wrong. Validation should protect scope and game rules, not demand objectively correct beliefs or another model call to judge every interpretation.

New actors receive an authored identity and permitted starting knowledge, goals and possessions atomically with their initial saved state. Their own workspace and initial accepted About me text provide continuity from the first decision. Seed background is not a fabricated witnessed event. Essential identity and active obligations must survive ordinary compaction; new experiences can still change the character's opinions and priorities.

World state, remembered experience, authored inner world and thought presentation are separate. Inventory, health and location belong to the simulation. Raw/consolidated experiences supply recall. Reflection edits the inner world. God-only thought history presents short narration and is not automatically another memory store.

### Character continuity and learning

Relationships remain sparse and directional, with supported familiarity, trust, affection and fear; group membership is a separate world fact. Narrative assessments live in the accepted inner world. Any queryable prose projection must derive from that accepted revision, not become another writable biography. Native mechanical facets, protected commitments and learned capabilities retain their own authority.

Conversation preserves speaker, actual per-turn audience, interruption and topic continuity. Characters can decline, keep working while talking, ask clarifying questions and return to unfinished plans. A promise and its fulfillment are distinct events; exhausting inference allowance must not erase accepted obligations. One-on-one text precedes group text and voice, with captions retained for accessibility.

Stable traits, values and habits are distinct from temporary feelings and practical skills. Supported appraisals carry cause, target, intensity, decay and stacking keys so repeated sightings do not multiply the same fear. Native thresholds use hysteresis; stable traits change only at admitted rates. Fictional characterization must not infer sensitive traits of the human player.

Learning can follow observation, testimony, teaching and actual practice without a research minigame. Seeing part of a method cannot reveal hidden steps; proficiency changes require native evidence. Learned technique identity and compatible version mappings survive upgrades, while genuinely new steps must be learned.

## 2. Semantic levels and triggers

| Level | Executor                        | Purpose and allowed result                                                                      |
| ----- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| 0     | Native code                     | Routine behavior, urgent survival and ongoing actions; no semantic model required               |
| 1     | Jev                             | Attention, significance and routing; select supplied actions or escalate within offered choices |
| 2     | Mini LLM, fast thought          | Brief speech or immediate decision; default for talking to an actor                             |
| 3     | Complex LLM with low reasoning  | More complex immediate interpretation or decision                                               |
| 4     | Complex LLM with high reasoning | Difficult immediate interpretation or decision needing more deliberation                        |
| 5     | Full bounded harness            | Background reflection and multi-turn inner-world file work, including eligible dreams           |

Jev always evaluates escalation for a semantic decision opportunity. This does not mean a paid call for each fixed step, each footstep or each object: native routine responses proceed immediately, while meaningful stimuli are coalesced into bounded actor-scoped opportunities. Jev attention/routing calls do not recursively create more routing calls. Unknown/unavailable judgments have an explicit defer/native outcome under the same budget, not an automatic paid retry.

Talking to an agent creates a level-2 response opportunity automatically. Jev may escalate the immediate reply to level 3 or 4, or also request level-5 reflection when the circumstance warrants it. A reflection request runs in the background; the reply and simulation do not wait for it. A perceived need to develop a relationship is not a requirement to withhold speech until the mind is rewritten. Actual speech can create native evidence and supported promises through existing admission rules without a model editing a relationship record.

Environmental triggers may select any appropriate level. Significant events can be marked by trusted mechanics directly; other configured event classes ask Jev whether they warrant reflection. Downtime and eligible sleep are independent reflection opportunities. Admission, relevance, cooldowns, fair scheduling, concurrency and spending limits remain server responsibilities.

Trigger and escalation rules should be malleable through admitted in-game mechanics/inventions and world configuration. They must use finite trusted policy families; an invented description cannot grant new tools, exceed spending caps or bypass native urgent behavior. Exact models, low/high effort parameter mappings and token ceilings are configurable and must be verified for the chosen adapter. High effort is not the default for all complex thought or ordinary speech.

## 3. One compact model-facing context

Every semantic reasoning route uses the same actor-perspective projection principles, with only the information its decision requires. Keep the complete accepted inner-world text as “About me” in each decision context; other candidate sources pass through attention. Do not serialize the server's storage or execution envelope as the character's context.

Useful sections are the actual stimulus/question, About me, current relevant needs/environment, attended possessions and learned techniques, and a single Recall section. Render calendar day, time of day and known environmental conditions such as temperature in ordinary language. Raw simulation seconds, world IDs, world profile objects and the fact that self is an NPC are not useful context. A relevant world constraint can be stated briefly in English. Do not invent weather, dates or sensory knowledge that the simulation does not supply.

Inventory means owned quantities/instances; materials describe item definitions/properties. For cognition, combine the relevant facts into one description, such as “I have two lengths of cord suitable for tying.” Do not send both an inventory-ID list and a duplicated material catalogue. Invention/resolver tasks may need a different typed mechanical contract; their requirements must not inflate ordinary conversation.

Store every memory with a plain-English representation at creation or consolidation. Prefer deterministic text construction for native facts; a separately admitted small summarizer can help when needed. Model-facing recall is a list of strings, for example “Day 4, morning: I heard John say hi.” Use a person's permitted name only if recognized. Preserve meaningful testimony, inference, uncertainty and imagined attribution in the text; omit technical envelopes and empty values unless emptiness itself matters, such as “I have no food.”

Recent events are experiences, not a separate duplicated context section. One recall view combines selected consolidated memories, recent raw personal memories and recent raw world events the actor was aware of. Do not repeat the same event as a memory, a conversation transcript and a recent event.

### Metadata stays in the server binding

| Current field/content                                                  | Target treatment                                                                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `instructionsVersion`, `policy`, `decisionId`, world/actor IDs         | Keep in execution receipts and authoritative bindings; do not ask the model to echo them                            |
| `expectedRevision`, record revisions, `processedWatermark`             | Keep for concurrency and publication validation outside ordinary model text                                         |
| `coverage`, indexes, evidence IDs, protected flags                     | Preserve internally for retrieval/admission/audit; render only useful uncertainty or missing information in English |
| `acceptedMind` documents/records                                       | Replace in model context with the accepted plain-text “About me” snapshot                                           |
| Generic request “Current situation, relationships, goals and concerns” | Replace with the actual stimulus and narrow task                                                                    |
| `quotaUsage`, file constraints                                         | Supply only in the reflection workspace instructions/tool interface                                                 |
| Empty arrays/nulls/default facets                                      | Omit unless their absence is relevant information                                                                   |
| Action identity                                                        | A short offered handle is allowed only when selecting an action; resolve its authority server-side                  |

Assemble each decision from one consistent view of current permitted state, accepted inner-world text and selected recall. Record its input boundary server-side. Historical experiences keep their own times; they must not be mistaken for current observations. If a tool explicitly retrieves newer state, recheck affected dependencies before accepting a result.

Trusted short operating instructions remain separate from untrusted character prose and observed speech. Removing metadata from model text does not remove privacy, stale-result checks, idempotency or evidence validation. IDs needed by scoped tools can be short local handles; server-owned bindings map them to permitted objects.

## 4. Jev attention before context inclusion

The server first establishes what this actor can know. Jev then answers “What am I paying attention to right now?” with a yes/no judgment per eligible candidate in bounded batches. This applies to nearby entities, inventory, known recipes, raw experiences and consolidated recall. Jev cannot authorize an unseen object, another actor's memory or a technique the actor has never learned.

Use native scope checks, indexes, retrieval and goal subscriptions to construct bounded candidate sets. Batch or partition large sets with coverage recorded server-side rather than making an individual paid request per object or silently claiming all history was considered. Relevant direct speech, essential immediate evidence, urgent dangers and active obligations have a protected path; optional relevance filtering cannot make native survival blind.

Attention is reevaluated on meaningful changes in stimulus, intent or evidence. Cache only with valid dependencies. Record omitted/deferred candidates for diagnostics outside the reasoning prompt. During an unavailable Jev route or exhausted budget, preserve native reactions and explicitly defer semantic work rather than passing the whole world/history to another model. The [perception proposal](../archive/07-technical-architecture/perception-and-attention.md) still governs sensory detail, encounters and interest discovery.

### Every semantic decision uses an event or intent sentence

The retrieval pipeline applies to every admitted semantic decision opportunity, not only speech or explicit goals: notable events, hazards, encounters, need/goal changes and conversation all supply an actor-perspective sentence or short description. For example, “Lightning struck the tree directly in front of me” can retrieve “I recently saw someone die after being struck by lightning,” only if that actor actually retained that experience. Embed the full permitted stimulus with relevant decision context, use Jev to select recall and route reasoning, and let the recalled evidence influence the response. If the actor only hears an unidentified crash, describe that uncertainty instead of supplying hidden lightning facts.

Native templates render supported events without a separate prose-generation call. Event identity, revisions, timestamps and authority bindings remain server-side. Meaningful opportunities are coalesced and scoped caches may be reused; this is not a model call per simulation step. Native emergency responses never wait for embeddings, Jev or reflection. The lightning case specifies cognition behavior for an admitted event or labeled fixture, not new weather mechanics delivered by this design.

### Selection signals and delivery order

Memory selection must respond explicitly to **who is present, what just happened, current goals, unresolved concerns, and conflicting beliefs**. Build bounded actor-scoped signals from permitted encounters/recent experience, native plan and commitment state, and the accepted inner-world perspective. Concerns and belief conflicts can have derived retrieval cues tied to the accepted snapshot; they do not require a second writable belief store or a mandatory extraction patch on every reply. Include relevant supporting and contradictory evidence without forcing the character to adopt an objectively correct belief. Keep structured lookup signals and diagnostics server-side, with useful meaning rendered in English for Jev and reasoning context.

Deliver retrieval in order: first explicit structured signals with exact/entity/topic/commitment lookups; then semantic matching for arbitrary intents and paraphrases; then selective-recall tools when recorded cases demonstrate that an agent needs permitted information omitted from its initial context. Semantic retrieval expands candidate discovery without replacing Jev inclusion judgments. The tool gate applies to extra recall, not the file capabilities required for reflection. Record the omitted evidence, why it mattered, and whether improved initial selection or bounded tool access resolves the gap.

### Encounters, sensory detail and reminder continuity

A genuinely new person encounter creates a logical decision opportunity, including an unrecognized person; it does not require greeting or a full thought. Preserve encounter identities, enter/exit hysteresis and restart baselines. Native immediate behavior can continue while bounded Jev routing processes semantic opportunities. Reevaluate already exposed objects when goals change. Ordinary objects without relevant changes do not individually purchase inference.

Reserve queue capacity for hazards and directed speech, coalesce repeated episodes, and partition crowded scenes fairly with recorded coverage. A restart must not fabricate new encounters or replay paid work. Missing recognition, unintelligible speech and distant detail remain unknown; later proximity cannot retroactively upgrade historical evidence. Observation is distinct from accepting a claim as true.

Persistent critical-need reminders are a separate proposed policy from accepted hourly memory cleanup. The perception proposal recommends an initial crossing and an hourly simulated reminder while unresolved, with native continuation of an adequate plan allowed. D54 still owns threshold/cadence and any fresh-generated-thought requirement. These reminders must respect real-time budgets and cannot silently become mandatory paid hourly thoughts. The example below 20/100 refers to fullness, not low hunger urgency.

### Retrieval service and selective recall tools

Use one actor-scoped retrieval service for context assembly and reflection tools. `get_memories` accepts a purpose, topic or arbitrary intent, permitted people/entities, time range, recent/relevant/mixed strategy, and bounded record/byte limits. Scope comes from the authenticated job, never a model-selected actor. Server-side results retain selected sources, coverage, freshness and revisions; model-facing results are useful English strings.

Search recent raw experiences and eligible older consolidated memories. Use exact person/topic/commitment lookups and text indexes first, with semantic matching for arbitrary intents and paraphrases behind a replaceable interface. Rank by relevance, recency and salience, and diversify results so routine repetition or negative incidents do not crowd out other useful experiences. Jev makes the inclusion judgments described above. Relevant active promises and mandatory fresh evidence have direct lookup paths independent of similarity ranking or index freshness.

Embeddings are required for semantic retrieval of arbitrary intents and paraphrases. Embed the complete natural-language intent rather than requiring an LLM to invent search keywords. Embed the English text of recallable experiences/summaries and relevant permitted retrieval content when created or meaningfully changed; retain source identity, revision, actor/disclosure scope and embedding-model version alongside each vector. Reuse unchanged vectors and compatible cached query embeddings. Exact person/commitment lookups and full-text search remain complementary paths; Jev still selects inclusion from bounded candidates.

Batch indexing under explicit real-time resource/spending limits. Embedding inference has compute and, for paid providers, billable usage; account for both indexing and query calls without automatic paid retries. Pending/failed indexing must preserve mandatory fresh evidence through direct lookup and disclose incomplete semantic coverage rather than silently claiming equivalent keyword recall. Forgetting, corrections and permission changes remove or invalidate affected vectors and cached results. Model changes require versioned reindexing; never compare incompatible vector spaces.

The embedding model/provider, dimensions, similarity metric and vector-storage implementation remain open choices. PostgreSQL remains the canonical persistence target; `pgvector` is a candidate, not an accepted dependency. Evaluate paraphrase recall, privacy, latency, index size and total cost to choose those details, not to decide whether embeddings are needed.

Embeddings and caches are derived indexes, not canonical memory. Actor scope is enforced before ranking, snippets and counts. Corrections, forgetting and changed permissions invalidate affected entries. A lagging index cannot establish that an important new experience never happened. If required information does not fit, narrow or defer the task rather than pretend recall is complete or reveal hidden facts.

Reflection may use bounded `get_memories`, `inspect_memory` and `list_commitments` tools over this service, exposed through MCP or an equivalent adapter. Limit total calls, records, bytes, time and spending across the job; pagination cannot bypass those limits. No arbitrary SQL, world-history search or access to another actor's private mind is granted. Immediate level-2–4 calls use assembled context without requiring a tool round. Tools and database-backed recall do not require a separate database per NPC.

Goal changes reevaluate already perceived objects as well as new exposures. World-interest subscriptions and personal recall can share an intent, but have distinct permission scopes: remembering a tree does not establish that it is still present or currently visible.

## 5. Events, awareness and memory storage

All actors, including the player, have limited awareness. Record event-time awareness as a shared event plus an actor/event join carrying or referencing each actor's permitted perceived text, detail and attribution. Only a subset of actors may know an event; one listener might recognize a speaker while another only hears an indistinct voice. Joining an area later never grants historical witnessing.

If no actor was aware of a simulation occurrence, it need not be retained as an experiential world event. Its state effects still commit, and necessary state-change, idempotency, accounting and recovery records remain independent. Creator journal coverage must say what was never recorded; it cannot promise omniscient experiential history. Later discovery or testimony is a new experience, not retroactive awareness of the original event.

Do not independently copy every aware world event into each actor's raw memory collection. The awareness view is already a raw experience source. Separate raw memories can hold other legitimate personal experiences. Both sources need stored English text and native source bindings; actor-specific projections must never reveal the shared event's hidden payload.

The production schema uses actor-scoped awareness and memory records alongside `mind.inner_world`; see the [data model](../archive/07-technical-architecture/production-data-model.md#8-minds-evidence-knowledge-and-conversation). Existing SQLite snapshots require an explicit migration. This plan does not imply those tables exist today.

### Storage responsibilities

PostgreSQL is the target shared store; records are scoped by world and actor. A persistent actor workspace is the authoring surface for inner-world text, not a second simulation database.

| Record                                      | Responsibility                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Shared experiential event                   | One retained occurrence with at least one aware actor                                                                           |
| Actor/event awareness                       | Which actor perceived which part of the event, with stored permitted English text and event-time detail                         |
| Personal memory                             | Raw personal experience or consolidated summary, with English text, game time/range, relevant people/topics and retention state |
| `mind.inner_world`                          | One current accepted text snapshot per world/actor, with revision and publication binding stored alongside it                   |
| Native commitments and learned capabilities | Protected mechanical facts, status and permissions, independent of authored prose                                               |
| Cognition/consolidation jobs                | Input boundary, scheduling, spending, completion and idempotent publication state                                               |
| Private thought history                     | Bounded god-only presentation entries, separate from actor recall                                                               |

World commits and awareness delivery must be recoverable together; duplicate delivery must not create duplicate experiences. Game time drives age, recall windows, sleep and reminders; real time drives service deadlines, queue limits and spending. Store enough clock information to interpret saved game times after restart. The [production data model](../archive/07-technical-architecture/production-data-model.md#8-minds-evidence-knowledge-and-conversation) supplies physical table/index details for these responsibilities.

## 6. Hourly consolidation and six-hour raw recall

At every simulated-hour boundary, schedule bounded cleanup of raw personal memories and aware world events **older than six in-game hours**. The recent raw context window is the last six hours; count/byte caps remain operational safeguards, not the semantic definition of “recent.” A delayed older backlog is not dumped raw into the next conversation.

Use a small summarization model, with GPT-5 nano as the requested candidate pending adapter availability and budget verification. This is light memory maintenance, not a full reflection harness. Group like entries, remove routine inconsequential details and retain or emphasize important experiences. For example, repeated berry eating can become “This morning I ate a lot of wild berries to satisfy my hunger,” and repeated observations of gathering can become “I watched John gather a bunch of fiber.” Preserve exceptions, consequential incidents, uncertain testimony and unresolved promises; do not aggressively erase character continuity.

Consolidation consumes the union of raw memories and raw aware events once per actor. Save source coverage/watermarks and atomically publish summaries before retiring covered detail from active recall. Shared source retention must respect other observers still awaiting consolidation. Never replace observations that arrived during a job or silently turn an imagined dream into witnessed history.

Every semantic decision context is selected consolidated memories plus selected recent raw memories plus selected recent aware events, woven into one recall section. Summaries remain subject to attention and longer-term retention limits; “consolidated” does not mean send every lifetime summary each time.

Failures leave the last accepted summaries usable and preserve critical unprocessed evidence under an explicit bounded backlog policy. Hourly eligibility uses simulation time; real-time concurrency, deadlines and caps control actual dispatch at accelerated speeds. Pause/offline behavior follows the existing world clock policy. Missed work is coalesced, not replayed as an unbounded series of paid catch-up calls.

### Retention, corrections and protected commitments

Keep separate finite limits for raw experience, consolidated memory, authored inner-world text and god-only history. The six-hour window does not imply unlimited rows during a busy hour, and consolidated summaries do not imply unlimited lifetime retention. Tune record and byte budgets together. Native exact deduplication and supported decay work without a model; semantic summarization needs its separately admitted call.

Preserve actual unresolved promises through routine noise and compaction. Their creation allowance is finite, and native rules own fulfillment, deadlines, cancellation and other supported lifecycle changes. A model cannot create an obligation from an unsupported paraphrase, erase an active obligation to make room, or claim a promised action already happened. Narrative can be compressed without losing the required native fact.

Corrections and contradictory testimony should update later interpretation without rewriting witnessed history. Reconsider affected derived summaries or beliefs when their supporting material changes; invalidating a search entry alone is insufficient. The character may retain a mistaken belief, but the system must not silently present corrected or unavailable supporting detail as established evidence. Compacted source detail may become unavailable; keep only enough attribution to distinguish observation, testimony and imagination honestly. Forgotten details leave active indexes, cached contexts and actor-accessible files. Old provider sessions and backups must not secretly restore them. Creator retention is separately bounded and does not grant an NPC unrestricted recollection.

## 7. Minimal outputs and independent commits

A simple conversation needs only speech. An immediate action decision may include one supplied action handle. Ordinary semantic responses do not return `policy`, `expectedRevision`, internal `thought`, `documents`, `removeDocuments`, `records` or other mind-patch arrays. Do not demand a private narration or psychological checklist with each reply.

The server binds the result to the admitted job, validates its tiny route-specific schema and rechecks current action prerequisites before committing effects. Native memory/awareness ingestion proceeds whether or not an LLM runs. Dialogue, immediate action and background reflection have distinct commit boundaries; there is no mandatory highest-tier bundle holding all three hostage.

Reflection changes files through scoped workspace capabilities. Its final response returns **one or more short presentation thoughts, each no more than 20 words**. Choose a finite per-job count during implementation. These are authored character narration for the game, not provider private deliberation. It must not echo the entire edited inner world or its database metadata in JSON. Invalid output/publication preserves the previous accepted state; there is no automatic paid repair.

### Validation and recovery

Validation is deterministic code: check shape and size, the admitted actor/job, relevant revisions, offered action handles, current resources/targets/knowledge and already-committed results. Recheck relevant dependencies rather than rejecting a historical reflection merely because an unrelated world tick advanced. A delayed action must not act on a dead actor, moved target or consumed item.

Within each commit boundary, coupled changes publish atomically and duplicate completion is harmless. Preserve native observations arriving during AI work. Provider refusal, invalid output, missing credentials, cancellation and uncertain completion remain distinct. Uncertain paid execution retains its accounting reservation until reconciled; a restart must not resend it automatically.

Complete validated output is the initial publication boundary. Streaming thoughts or early action execution can follow only with explicit typed accepted messages and independent commit boundaries. Partial JSON or provisional text cannot execute an action or publish part of an inner world.

## 8. Reflection, workspaces and publication

The persistent actor workspace is its editable inner world. Reflection runs a bounded multi-turn harness during safe downtime, eligible dreams or significant events. The agent can name, edit, reorganize and consolidate its own inner-world files freely within enforced quotas. No mandatory relationship/belief/goal document taxonomy or change on every reflection is required.

Keep the existing ten-file/500-word-per-file maximum as an initial storage safety ceiling pending an explicit context-budget decision; it is not a request to fill every file. All durable authored prose counts, including scratch retained between jobs, and finite byte limits prevent bypasses. Quota instructions belong to reflection only. The maximum 5,000-word snapshot conflicts with a few-hundred-token greeting if actually filled: CR01 must set a sustainable accepted snapshot budget or report the tradeoff, rather than silently omit required About me text.

After reflection, the server snapshots the allowed files, validates scope, sizes and relevant revisions, and pulls their text into PostgreSQL as a **single current text entry in `mind.inner_world` for each world/actor**. Stable file ordering/headings can preserve organization without JSON wrappers. The last accepted text is included in every subsequent decision context. File edits are staged authoring; only an accepted publication changes the database text used by decisions.

Store snapshot/version/job provenance beside the text, not inside the prompt. Atomic publication updates that actor's accepted snapshot and short thought history without replacing concurrent raw experience. A failed, partial, stale or canceled export cannot publish half a mind. Keep the previous accepted snapshot available while reflection runs; reconcile workspace/database disagreement explicitly, with one accepted revision rather than two competing authorities.

The simulation and interactive conversation **never wait for reflection** or remote cancellation cleanup. Use a bounded background queue, separate admission/priorities and shared spend reservations. Safe immediate behavior and the current accepted inner world remain usable while files are being edited. Reflection receives no authority to change physical state, grant a recipe, erase native obligations or elevate invented prose into observed facts.

Every NPC cognition job starts with fresh model conversation state and current trusted instructions, including immediate reasoning as well as reflection and dreams. Immediate calls use the assembled context; a reflection may share conversation state across its bounded within-job tool/model turns. Compatible compute can remain warm. Cross-job continuity comes from accepted inner-world files and permitted memories, not old model transcripts, checkpoints or audit exports. Scoped recall tools may retrieve more permitted experiences within the already admitted budget. World-agent chat tabs retain their separate conversation policy. No per-tick workspace hydration or full-harness call is required for level 2–4 reasoning.

### Safe downtime and reflection scheduling

Downtime eligibility requires no immediate survival emergency or responsibility demanding attention. Purposeful native work continues; introspection must not displace it. Meaningful unprocessed experiences, unresolved concerns, a supported periodic review or approaching authored capacity can create a reflection opportunity. Jev can choose reflection alongside continuing ordinary activity.

Track the actor's experience boundary, idle/sleep episode and last accepted reflection. Coalesce repeated triggers, stagger actors and use real-time cooldowns and shared caps. Completing a reflection while still idle must not immediately schedule another over unchanged evidence. Mark processing progress only after accepted publication. Failure may defer a future opportunity, but never launch an automatic paid retry of the same work.

Urgent events, waking, actor death, canceled jobs or changed relevant rules may supersede pending work. Preserve the last accepted snapshot and native observation ingestion. Decide acceptance using the affected dependencies; a past experience remains usable even when its stimulus is no longer present.

### Instructions, file organization and quotas

Open Legend owns versioned master instructions, model bindings, permissions and character seeds. Skip Macrofold agent presets initially. Supply the current instructions at each fresh job; store their version in server receipts. Trusted instructions are not editable memory. Policy changes govern new jobs and can revoke incompatible in-flight work.

The harness chooses its own file names and subjects. An illustrative layout is:

```text
AGENTS.md        trusted reflection instructions, if needed by the harness
context/         bounded read-only permitted experience for this job
mind/            agent-organized persistent inner-world files
```

Workspace implementation may stage edits in an isolated snapshot or proposal directory before acceptance. Do not mount obsolete snapshots, transcripts or unrestricted creator exports. No mandatory file per psychological category or per remembered event is required.

The initial authored quota is at most ten files, each at most 500 normalized whitespace-delimited words, including titles, and a finite UTF-8 byte bound. Count all retained authored narrative, including relationship descriptions and durable scratch; metadata cannot be used as hidden prose storage. Engine-produced experiences and routine memory summaries have separate bounded stores. Trusted instructions and temporary tool results have request limits rather than consuming authored mind capacity.

Expose deterministic counts and a bounded preview/validation tool during reflection. Near capacity, the harness chooses what to summarize, merge or remove within the admitted run. Publish the final file set atomically only if it fits and preserves required identity/obligations. Reject an unresolved overflow while retaining the old snapshot; do not silently truncate text or purchase a repair call.

### Execution adapter requirements

Macrofold supplies generic bounded inference/harness execution, scoped file access, snapshots and compatible warm compute; Open Legend owns the meaning of memory and publication. Keep persistence and execution behind independently replaceable interfaces. Direct inference, fixtures or shared workers can implement the appropriate execution contract without changing memory semantics; worker lifetime, job lifetime and persistent actor identity remain separate. Verify independent model routes for levels 2–4 and the small summarizer, actor-scoped workspace reads/writes, fresh sessions, cancel/close behavior and reliable snapshot export. A catalogue entry or provisioned workspace alone does not establish those capabilities.

The game can call retrieval directly; harness tools reuse the same service. Hosted tool access needs authenticated reachability rather than assuming the worker can access the game's localhost. Keep secrets out of context and files visible to the model. PostgreSQL publication and editable workspace reflection remain required outcomes even if an interim repository adapter uses SQLite.

## 9. Sleep, dreams, forgetting and consolidation

Agents must rest for **eight in-game hours per day**. A dream reflection becomes eligible only after **at least two continuous in-game hours asleep**. These are accepted thresholds, not wall-clock timers. Track sleep episodes and rest accounting in saved deterministic state so pause, speed changes and restarts do not duplicate dreams or manufacture rest.

Rest and sleep need distinct states: merely starting a rest action is not proof of two hours asleep. The initial native rules use calendar game days, credit split rest within each day, begin sleep after fifteen uninterrupted resting minutes, and reset continuous sleep when the rest episode changes. Daily shortfall adds debt capped at one day and modestly increases awake fatigue. One dream opportunity is admitted per eligible episode; later cadence remains conditional. Dreams are optional paid work; lack of credentials or budget must not prevent native sleep or rest.

Dreamed scenes remain imagined and cannot prove an actual theft, encounter or invention. God-mode thought history receives short presentation thoughts; it is not another recall channel. Forgotten detail must leave actor-accessible indexes, workspace exports and later contexts, while creator-only audit retention stays separately scoped.

Hourly routine consolidation remains independent of sleep and reflection. A dreaming harness can reinterpret permitted experiences, but it does not replace the six-hour/hourly maintenance process.

## 10. Privacy, inspection and verification

Thought history and inner-world inspection remain god-only, enforced by the backend. Ordinary players see only permitted speech and behavior, never private reflection files, reasoning or another actor's About me text. The player is also an actor for awareness filtering; creator privileges do not widen their character's knowledge.

The character profile exposes inner-world text, relationships/beliefs and short Thoughts only to an authorized god observer. Include an experience timeline, active promises and learned skills so continuity can be inspected alongside prose. Thoughts do not appear over avatars; public action labels are separate. Enforce the same access in responses and any future streams, not merely hidden UI controls.

Record routes, attention coverage, prompt/schema/response size, reasoning tokens, queue/provider latency and actual usage separately. Include all Jev, summarizer and harness costs per real hour at each game speed. Also measure recall/attribution errors, missed commitments, retained bytes and cost per simulated day. Compare executor or retrieval alternatives on the same character histories and workload; fluent narration alone is not acceptance. Keep diagnostic storage server-side; expose scoped detail only through authorized god inspection, avoiding bulk whole-mind exports. No observability vendor or new SDK is required by this design.

### God-mode cognition debugger

Extend the existing right-side Intelligence calls panel into a development inspector grouped by semantic trigger/action, rather than requiring application-log searches. Deliver its foundation alongside routing, then add context/retrieval and background-job inspection as those systems land; CR11 finishes integration rather than starting instrumentation. This is accepted target behavior, not a claim that the current call viewer already implements it.

Each detected semantic opportunity creates a stable root before routing: actor/world, perceived event or intent sentence, game and wall time, policy version, offered route options and disposition. Native-only, ignored, deferred, coalesced and budget-blocked opportunities remain inspectable even without a provider call. Link coalesced inputs and asynchronous reflection to their originating roots; ordinary simulation ticks do not create semantic triggers or model calls. Keep bounded history with explicit retention gaps instead of silently implying that missing records mean nothing happened.

The collapsed row shows time, actor, trigger sentence, chosen route, current outcome and aggregate known cost. Expand progressively through **semantic trigger/offered routes → semantic decision/Jev routing → context and attention → escalated LLM or harness → validation/committed outcome**. Represent actual execution order and dependencies, including attention before routing when applicable, rather than fabricating a fixed pipeline. Separate Jev routing from Jev relevance calls; show every recorded child call once, with parent links for background work.

Routing details show native gates, offered choices, Jev input/judgment, selected level/model and recorded reason or unavailable reason. Output details distinguish model-proposed actions/decisions, spoken text and short presentation thoughts from validated speech/actions and accepted snapshot publication. Show pending, skipped, deferred, coalesced, canceled, stale, rejected, failed and uncertain states explicitly. Reasons come from actual policy results or explicit model outputs; do not fabricate explanations or require hidden chain-of-thought.

Context details show the event/intent query, consistent snapshot and accepted About me revision, instruction/adapter versions, section token/byte sizes, source coverage, required evidence, selected/omitted material and final submitted input. The bounded candidate view covers memories, events, objects, items and knowledge: permitted source text/revision, structured or semantic match, embedding model/version/metric, similarity score and rank when available, Jev inclusion judgment and linked call, and final selection/exclusion reason. Scores are not probabilities or comparable across incompatible metrics/models; exact lookups, cache hits and unavailable scores are labeled honestly. Show index lag, truncation, unexamined candidates and coverage rather than suggesting the whole history was searched.

Each expandable stage exposes captured input/output, model/effort, token usage, queue/provider duration and estimated versus actual cost with receipts. Separate input, output, cached and reasoning tokens when supplied; absent usage is unknown, not zero. Aggregate charges exactly once, including embeddings, attention, tools and linked background jobs, with late billing updates. Link application context and actual transformed provider input; label sanitized, partial, expired or unavailable captures. Harness internal calls are only inspectable when supplied by the provider. Inspecting or refreshing details must never rerun inference.

Consolidation shows source coverage/watermarks, summary output, backlog and acceptance/retirement; reflection/dreams show eligibility, queue state, tools, bounded file changes, presentation thoughts and snapshot publication. Search/filter by actor, time, trigger, route, stage and outcome. Provide paginated history, follow/pause updates and new-entry notices; preserve expansion, reading position and keyboard focus as updates arrive. Details load on demand so the initial view stays compact.

Authorize every list/detail/update/export request on the server, redact credentials, and clear cached private views on world change or lost access. Diagnostic capture and retention have finite limits; expose capture failures/gaps without blocking native survival or cognition. This god-only view never widens NPC recall or ordinary-player DTOs. Expiring diagnostics cannot erase authoritative accepted decisions, and no observability vendor, SDK or UI-framework migration is required.

The [CR12 acceptance tasks](maintainers/cognition-redesign.md#cr12--acceptance-and-tokenlatency-evidence) cover short greetings, complex decisions, promises, repeated routines, significant events, dreams, outages and migration. Fixture payload measurements are not evidence of live speed, model quality or dollars saved. Paid checks require configured credentials, explicit caps and separate authorization.

Verification must also cover encounter overflow/restart, historical sensory detail, contradictory testimony, interrupted conversation, partial learning and query-membership changes. Separate tuning cases from held-out cases. Distinguish simulation-time relevance deadlines from real-time execution deadlines; missing information is unknown, never an invented zero or known absence.

## 11. Migration, delivery and acceptance

Import existing authored documents into the initial accepted text and workspace without losing identity, relationships, beliefs, concerns or goals. Preserve native commitments and learned capabilities independently. Deduplicate legacy event/memory copies where their source identity is known; do not fabricate awareness when historical audience evidence is missing. Version saved state and support recoverable migration without a silent reset.

Deliver the system through the [CR01–CR12 build tasks](maintainers/cognition-redesign.md): compact contracts and immediate conversation; attention and awareness; hourly memory cleanup; editable workspaces and accepted snapshots; background reflection and sleep; admitted trigger configuration; migration and inspection; then integrated acceptance. The task list is execution tracking, not a second architecture specification.

Acceptance must demonstrate:

- A greeting uses a short immediate response without compulsory reflection or mind-patch JSON; difficult decisions can escalate through Jev under explicit budgets.
- A promise survives repetitive routine activity; an older relevant memory can be retrieved; rumors, uncertainty and dreams remain distinguishable from witnessed facts.
- Different actors remember only what they perceived, including different detail of one shared event; unseen events still affect saved simulation state.
- Hourly cleanup summarizes material older than six game hours once, preserves important exceptions and concurrent observations, and prevents repeated raw/consolidated copies in context.
- Reflection edits flexible files, publishes one accepted PostgreSQL text snapshot, and influences a later decision after restart without blocking the simulation or conversation.
- Rest accumulates under explicit native rules, dreams cannot run before two hours asleep, and provider failure never prevents sleep or survival.
- Cross-actor access, forgotten-session leakage, duplicate completion, stale publication, cancellation and partial failures cannot corrupt or disclose the mind.
- God inspection shows accepted inner-world content and short thoughts; ordinary clients do not receive them.

Behavioral acceptance must show the right memory influencing a subsequent decision, utterance or action, not merely appearing in the prompt. Use labeled cases for each selection signal and compare matched situations with different permitted histories: a present person recalls an old promise, a fresh event revives an unresolved concern, or conflicting testimony leads to a clarifying question or changed plan. Record the selected evidence and observable outcome without requiring private deliberation. Recall need not always change behavior; unchanged behavior can be justified, but the suite must demonstrate meaningful changes where the remembered evidence matters. Fixture routing proves plumbing; model-driven behavioral usefulness remains a separately capped live gate.

Use no-cost fixtures for deterministic contracts and separately capped live execution for provider compatibility, useful behavior, latency and actual cost. Do not call the complete system delivered from fixtures alone.

## 12. Remaining implementation choices

Initial choices are explicit and configurable: mini/low at level 2, complex/low or high at levels 3/4, nano cleanup, and the configured reflection harness; 1,024/4,096/8,192 immediate output tokens; a complete accepted-text context ceiling of 100,000 bytes; one native Jev map for up to 24 candidates; and one to three presentation thoughts of at most twenty words. Required evidence survives attention failure. Relevance includes a winning yes probability of at least 0.5; route choice uses a winning probability of at least 0.5, while uncertain addressed speech stays level 2. These are tuning policies, not calibrated correctness guarantees.

The initial embedding index uses OpenAI `text-embedding-3-small`, 512 dimensions and cosine ranking over actor-scoped revision-compatible vectors stored through the repository, without pgvector. Raw recall is six hours; backlog 8,192 records; summaries 256 with thirty-day routine expiry and protected high-salience retention; thought history 100; diagnostics 1,000 roots/stages combined. Overflow is visible rather than silently losing protected evidence. Remaining work is held-out quality/cost tuning, comprehensive recovery/fixture acceptance and any later repeat-dream or demonstrated-omission recall-tool requirement.

The accepted requirements include embedding retrieval across all admitted semantic decision triggers, actor-perspective event/intent sentences, and the semantic levels, level-2 speech default, Jev escalation and attention, compact English context, actor awareness, hourly cleanup of experiences older than six hours, background file reflection, PostgreSQL text publication, eight-hour daily rest and two-hour sleep minimum for dreams. Implementation choices must preserve these behaviors.
