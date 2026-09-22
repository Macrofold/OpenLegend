# Context assembly and AI routing

> **NPC cognition update:** [Memory architecture](../../docs/memory-architecture.md) owns the accepted redesign: Jev attention/escalation, default level-2 speech, separate low/high complex reasoning, and background level-5 workspace reflection. Ordinary responses do not carry mind patches. The richer manifests, coverage and dependency envelopes below belong to server contracts, not serialized NPC prompt text. Routine experience summarization has its own small-model route; subjective inner-world edits belong to reflection. [CR01–CR12](../../docs/maintainers/cognition-redesign.md) track implementation; the broader audience/authority contract remains in force.

This is the broader target contract between Open Legend's simulation, memory, declaration registry and AI execution adapters. The executable prototype's bounded context retrieval and Jev/LLM routes are described in [implemented architecture](../../docs/architecture.md); richer perception and distributed infrastructure remain proposed, with benchmarks and broad acceptance open. Read with the [declaration specification](declarations-and-evolution.md) and [Macrofold brief](macrofold-implementation-brief.md).

## 1. Context is a versioned product of the application

The accepted future [Narrator context contract](../../docs/narration-and-conversations.md#8-the-narrator-and-context-assembly) reuses this pipeline with a presentation purpose: actor-set/perspective, conversation/type/time filters, event-time awareness, mandatory causal evidence and scoped semantic retrieval. It does not inherit full NPC About me text or the union of participants' private knowledge. Ordinary conversation excludes internal thoughts; explicit single-actor grants and policy-approved notable-event cutaways are separate modes. One bounded generation returns source-linked prose, never effects; narrator voice is style only. The [agency runtime](agent-agency-runtime.md) owns optional multi-operation decisions, operational goal/plan projection and admission, tracked in AG. NC retains communication/narration integration; CR retains memory/attention. Private need/goal/result causes enter the [EPR intake](../../docs/events-perception-and-reactions.md#9-reaction-intake-and-scheduling), not a public sensory feed.

The [perception and attention specification](perception-and-attention.md) extends this proposal with exposure-specific descriptions, event-time sound, embodied screen parity, semantic interest subscriptions and batched decision opportunities. It also audits the simpler current prototype; these richer contracts are not implemented by the documentation update. All retrieval and tools below must preserve the actor's actual detail/intelligibility, not merely check that an entity or event ID is accessible.

The central responsibility is to bring the right evidence to a particular question, under the right authority and within a measured budget. A larger prompt is not the definition of better context. Each decision must be explainable in terms of the evidence available, evidence missing, permitted operations and versions used.

Separate a **context contract** from an **assembled context**. The contract belongs to a versioned task/resolver definition: purpose, required and optional facts, permitted sources, candidate types, derivations, output alternatives, unknown policy and consequence limits. The assembled context instantiates that contract against a consistent view of this actor/world. A model may suggest another relevant query but cannot rewrite the contract or its permission limits.

Open Legend owns game relevance, perception and required dependencies. Macrofold supplies generic context transport, authorized resource/tool access, immutable references, execution limits and diagnostics. The game-specific context builder may be deployed beside the game or exposed as an authorized provider to Macrofold; where it runs does not transfer ownership of its policy.

## 2. Context audiences and permitted views

| Audience | Permitted evidence | Prohibited shortcut |
|---|---|---|
| NPC planner/speaker | Its observations, remembered beliefs, relevant body state, learned capabilities and active concerns | Reading hidden world facts or another mind to improve an answer |
| Trusted interaction resolver | Authoritative facts needed to determine a valid effect, current permissions and effective rules | Returning hidden adjudication facts verbatim in speech or player explanations |
| Declaration builder/evaluator | Approved primitive contracts, authorized definitions, sanitized failure cases and sandbox fixture snapshots | Receiving all private histories because it works on world mechanics |
| Creator/admin | Explicitly granted diagnostic and world-management resources | Passing admin authority to ordinary actor jobs or silently publishing private evidence |
| Future Narrator | Recipient-permitted source events/awareness, actual effects and separately granted private/cutaway material for the selected mode | Treating participant knowledge as an unredacted union, creating facts/effects, or exposing thoughts in conversation |

Public explanation is a separate output projection. It receives structured outcome/reason codes and observer-permitted facts, with a deterministic fallback. Do not make a model that has seen a private fact solely responsible for concealing it from a lower-privilege recipient. If a workflow changes audience, build a new approved projection and fresh execution context instead of continuing a privileged transcript.

Scope derives from authenticated tenant/world/job identity. Actor IDs in prompts and tool arguments are identifiers to validate, not authority. Filter eligible sources before lexical/vector retrieval, aggregation and ranking. Search snippets, counts, logs and cache hits must obey the same scope.

Open Legend authenticates the player/job and resolves its actor and audience. Macrofold can verify the integrating application, project, resource grants and audience namespace; it cannot independently know a game's perception rules. Bind the envelope to the authenticated application issuer and preserve that binding through references and tools. Neither product should pretend the other has performed its domain authorization. Private fact IDs and hashes can also disclose information; lower-privilege projections use only permitted references, not a hidden-source manifest with the values removed.

## 3. Assembly pipeline

### A. Normalize the task and preserve uncertainty

Inputs include trigger/intent, server-resolved actor and targets, purpose, conversation/plan generation, effective world/profile, deadline and cost/context budget. Resolve UI-selected IDs directly. If freeform text identifies several possible targets or methods, preserve candidates and ask a bounded clarification when consequential ambiguity cannot be resolved. A cheap preliminary interpretation can itself use a small scoped context; avoid a circular dependency where a full context requires a full plan first.

For every admitted NPC semantic trigger, render the permitted event/intent as a sentence before recall and routing. Speech is one trigger among hazards, notable events, encounters and need/goal changes. Required embeddings search the full stimulus plus relevant decision context; structured event fields remain server bindings. Native emergency behavior proceeds independently. Preserve uncertainty about causes the actor did not perceive.

### B. Bind a consistent world and authorization view

Capture the required world/sector snapshot token and authoritative epoch, effective profile, compatible declaration manifest and actor-memory watermark. Consistency can be a database snapshot or an immutable view produced by the sector owner. Several independent reads of “latest” workspace files are not a snapshot.

Scope verification precedes reads. Bind data timestamps and versions to the assembled result. Derive simulation time from the captured world clock; record retrieval/expiry in real time separately. Snapshot-bound tools read the captured view while it remains available. Current-state tools explicitly return a newer view. A changed mandatory source invalidates its affected derivations and candidate checks; rebuild those before accepting a consequential result. Do not combine old derived shelter exposure with a newly removed wall. Cap refresh attempts, then defer or use a native action instead of looping forever in a fast world.

Historical beliefs and observations retain their own event times. They need not be simultaneous with current world state. A context containing both is valid only when their roles are explicit. Event-time observation records, rather than today's positions or permissions alone, establish what a character experienced; current access checks still govern what may be retrieved now.

### C. Retrieve eligible mechanisms and their dependency closure

First filter by world/profile compatibility, admitted status, component/target family, allowed effect kinds, creator permissions and content-access rights. For NPC planning, further filter by learned capability/skill policy. A trusted resolver can know that a mechanism exists without teaching it to an actor automatically.

Use exact IDs, tags, entity/component types and lexical matching before optional semantic retrieval. Fetch a small set of candidate summaries, then the full contract of promising candidates. Include dependencies that are essential to the question: relevant material/part definitions, instance overrides, geometry, exposure and current processes. Include significant negative evidence and counterexamples, not only positive matches.

Authoring context also retrieves canonical state owners, contribution interfaces, applicable prior committed outcomes and a bounded set of anticipated influences. Mark each relationship as admitted, anticipated, uncertain or forbidden in this profile. Dormant design notes can guide missing dependencies and tests; they cannot be passed to a resolver as working mechanics or to an NPC as learned facts. Retrieve relevant history through indexes or curated evidence, not an unbounded world transcript. Prior observations constrain generalization only within their recorded conditions.

Trusted operation/query families define mandatory reads; instrumentation records what was actually read. Instrumentation cannot discover a helmet check that an arbitrary algorithm never made. A generated declaration using a trusted contact-damage operation inherits that operation's protection checks; arbitrary G2 code still needs an admitted applicability/read contract and counterexample testing. Completeness here means satisfying a defined contract, not proving that every relevant fact in the universe was considered.

Track query-result dependencies as well as returned entities: an empty-neighbor query becomes stale when a new burning object appears; an earlier registry miss becomes stale after a compatible definition activates. Start with conservative region/collection and registry revisions plus fresh critical predicates. A changed broad token triggers rechecking the bounded query and its result fingerprint; it need not discard a judgment when the relevant result is unchanged. Include predicate membership, geometry, access-filter changes and effective definitions. Fine-grained field tracking is an optimization after measured invalidation rates justify it.

### D. Resolve values and attach provenance

Each important value identifies its source kind and resolution status:

| Status | Meaning and use |
|---|---|---|
| Known | Current authorized state, authored definition or valid deterministic derivation |
| Admitted estimate/default | Explicit world-approved approximation, with method/version and initialization provenance |
| Unknown | Field is supported but value is unavailable, unobserved or not initialized |
| Conflicting | Permitted sources disagree; preserve alternatives and an explicit resolution policy |
| Not applicable | Contract explicitly excludes this property for this object/context |

Missing **definitions** are separately recorded. “Thermal behavior is unimplemented” is not “moisture is unknown.” Absence is not zero, immunity, dry, false or infinite strength. Derive numeric quantities and unit conversions in code. A descriptive claim such as “waterproof cloth” may help retrieve a known profile, but cannot silently become an exact permeability constant.

The context contract distinguishes a required record from a required known value. A perception-limited planner may need the explicit fact that a container's contents are unknown; that is complete input for an inspection decision. A physical resolver needing actual mass requires a known value or an admitted approximation. Do not widen NPC access merely to satisfy a known-value requirement; use a valid unknown outcome or request an observable action. Passive rain/fire processes follow the declaration family's pre-admitted fallback policy, not a synchronous inference to invent every missing value.

For NPCs, distinguish observed, heard, inferred and imagined content. An old belief about an object's location can be useful memory without being current authoritative location. Derivations retain their input revisions; estimates disclose uncertainty. A semantic classification may introduce an approximation only through an already admitted scoped policy or a new declaration admission, never by confidence alone.

### E. Retrieve personal context when the task needs it

Include the complete accepted inner-world text as About me, relevant current goals/plan, urgent needs and active commitments, plus one Jev-selected Recall section combining consolidated memories and recent raw personal/aware-event experience without duplication. Rank by involved entities, topic, time, salience and intent; diversify repetitive evidence. Read bounded evidence links when needed. Numeric body state can constrain choices without serializing every organ into every greeting.

Operational goals, frontier and fresh results come from the [agency projection](agent-agency-runtime.md#72-attention-inputs), within the existing budget and protected-context guarantees. Goal-derived interests use only actor-known prerequisites; no hidden registry lookup becomes actor evidence.

Selection explicitly considers who is present, what just happened, current goals, unresolved concerns and conflicting beliefs. Derive bounded actor-scoped cues from permitted state and accepted inner-world text, including relevant counterevidence; do not introduce a second writable narrative store. Deliver structured lookups first, arbitrary-intent semantic matching second, and selective-recall tools only after demonstrated initial-context omissions. This sequencing does not delay required reflection file access; see the [canonical selection contract](../../docs/memory-architecture.md#selection-signals-and-delivery-order).

Do not invoke an LLM merely to retrieve an exact promise or a known recipe ID. Start with indexed owner/entity/status/time queries and full-text retrieval. Use required embedding retrieval for arbitrary intents and paraphrases, embedding the complete intent rather than purchasing keyword expansion. Evaluate the model/storage choices and supplementary ranking; embeddings are no longer conditional on a lexical-search failure. Index lag must be recorded; a stale search index cannot establish that no new critical memory exists. Mandatory commitments and fresh events use a path that does not depend on optional indexing.

A decision names the minimum observation watermark it requires. Read the newly committed observation/commitment records directly if the derived memory view lags; wait briefly or return pending when essential data is not available. Do not solve the race by replaying the full hidden world journal into NPC context. Background reflection edits subjective inner-world files against relevant accepted revisions; it cannot grant skills. Native observation ingestion and evidence-backed practice/teaching records do not wait for reflection.

### F. Budget and serialize deliberately

Allocate budgets across world constraints, task/targets, candidate contracts, current evidence, personal context and optional history. Required safety/causal facts, relevant urgent state and active obligations cannot simply fall off the end of a truncated prompt. Drop optional detail deterministically and record the omissions. If mandatory content does not fit, narrow the question, retrieve a smaller applicable candidate set, choose a compatible execution policy within budget or return insufficient context.

Use a provider-aware token estimate plus hard byte/record/tool-result limits. Provider context limits are upper bounds, not target sizes. Context retrieval, summaries, embeddings, retries and tooling have costs too. Start with small task-specific budgets, measure quality versus size, then tune; the greeting target is a few hundred input tokens and 10–50 visible output tokens, with exact per-route ceilings still open. Full About me inclusion must fit the accepted snapshot budget.

Serialize stable definitions separately from volatile observations to allow content-addressed reuse and provider-supported caching when actually available. Do not assume that attaching a resource reference means the provider reads it for free: the adapter must resolve/authorize it and account for the actual submitted payload.

### G. Seal and submit

Persist or reference an immutable, access-controlled context artifact before admitting consequential inference. Its manifest includes the context contract/version, audience/scope, profile/manifest refs, snapshot/time, source refs/hashes/revisions, relevant query tokens, completeness/omissions, token estimate, expiry and budget. Trusted instructions and untrusted conversations/descriptions are separate fields. Data cannot grant new tools, change world rules or override the context contract.

The artifact digest identifies the exact serialized input after required redaction/assembly. A sanitized developer view may differ from the full private artifact; label it as such. Diagnostic context storage has bounded retention and export policy, not an entitlement to keep every private conversation forever.

Two digests serve different purposes. The context digest identifies the normalized application evidence; the execution receipt also identifies the actual provider request after prompt/template rendering, resolved references and adapter conversion. Record adapter/template versions and disclose transformations. Retain the minimal accepted decision in the game before applying effects; full prompt retention and diagnostic replay may expire independently. A provider schema can validate shape, not the truth of the evidence or safety of its requested effect.

The [god-mode context inspector](../../docs/memory-architecture.md#god-mode-cognition-debugger) exposes this assembly as a bounded child of the semantic trigger: actual query, source/snapshot versions, required/selected/omitted evidence, section budgets and final provider payload. Include per-candidate embedding metric/score and Jev inclusion where available, with index/cache/coverage gaps explicit. Keep application and provider artifacts distinct, access-controlled and labeled when partial; diagnostic inspection does not replay inference.

## 4. Illustrative wire contracts

These examples are server-owned execution envelopes, not NPC prompt serialization or model-echoed fields. NPCs receive the compact English projection defined in the canonical memory specification. API names remain illustrative:

```json
{
  "schema": "ol.context/1",
  "id": "ctx_123",
  "purpose": "interaction.interpret",
  "scope": { "world": "w1", "audience": "npc", "actor": "a7", "grantRevision": "g4" },
  "contract": { "id": "interpret.binding", "version": 2 },
  "worldProfile": "profile_sha256",
  "declarationManifest": "manifest_sha256",
  "snapshot": { "sector": "s1", "epoch": 3, "simulationTime": 7200 },
  "facts": [{ "id": "f1", "status": "known", "source": "observation_8", "revision": 2 }],
  "candidateRefs": ["capability.binding_bundle@1"],
  "queryDependencies": [{ "query": "accessible_inventory", "revision": "q17" }],
  "missingRequired": [],
  "omittedOptional": ["older_routine_observations"],
  "expiresAt": "2026-09-19T20:00:05Z",
  "digest": "sha256_of_canonical_context"
}
```

Actual fact records carry bounded typed values, units where needed, observation time, source type and visibility metadata; the compact example omits these fields for readability. The application clamps all caller-proposed budgets and scopes. Raw actor/world IDs are never enough to authorize this envelope.

A decision receipt contains execution/attempt IDs, task-definition version, context digest, model/provider version, normalized outcome, evidence references, raw provider uncertainty where applicable, schema validation status, usage/cost, timestamps and terminal/ambiguous status. The subsequent game receipt references that decision and the committed events. “Provider returned,” “output valid,” “interpretation accepted” and “action committed” are separate states.

## 5. Route by the work required

An agent is a bounded loop of model calls and tools, not a different species of model. It is useful when evidence gathering, planning or testing needs iteration. It should not be the compulsory wrapper around every model request.

| Situation | First route | Escalation or fallback |
|---|---|---|
| Explicit known menu action; complete applicable mechanism | Deterministic checks and execution | Explain unavailable prerequisites; no inference required |
| Movement, need decay, fuel use, rain transmission, ordinary process update | Standard code/admitted formula or algorithm | Defined process recovery; no model-per-tick repair |
| Exact fact or missing retrievable dependency | Authorized data query | Essential unavailable data → explicit approximation policy, clarification or defer |
| Closed set of plausible interpretations or activities | Jev or equivalent typed inference | Unknown/uncertain → bounded additional context, single LLM when meaning needs generation, or clarify |
| NPC speech or immediate decision                                                             | Jev attention/escalation; level 2 mini by default, level 3 low or level 4 high for complexity | [Agency operations](agent-agency-runtime.md#2-decision-envelope-and-translation), including no new response; independently enqueue reflection, no automatic paid repair |
| Future Narrator presentation | Scoped event/awareness selection and semantic retrieval, then one bounded LLM generation | Player-private grounded prose with source links; no effects, new awareness or recursive narration triggers; deterministic fallback |
| Simple declaration draft with sufficient evidence | One typed LLM call | Invalid output stays unresolved; any further paid authoring requires separate admission and authorization |
| Subjective reflection or eligible dream | Background level-5 bounded workspace harness | Publish accepted inner-world text and short thoughts atomically; preserve previous snapshot on failure |
| Multi-step investigation, retrieving related evidence, designing/testing a novel composition | Bounded agent job with approved tools | Return evidence and draft; independent validators decide admission |
| Authoring/testing generated code or larger artifacts | Isolated native harness task | Candidate artifact only; engineering or G2 admission still required |
| Forbidden cause, missing permission or unsupported authority | Deterministic rejection after adequate interpretation | Friendly truthful explanation; no larger-model bypass |
| Missing host primitive/storage semantics or incompatible world premise | Engineering/creator design backlog | No automatic trusted-kernel patch from an ordinary action |

M10/M11 require live LLM decisions, conversation and generation plus a useful Jev route in the [first playable MVP](../05-project/first-playable-mvp.md). Fixtures and optional adapter capabilities support development and failure handling; they do not make live AI optional for the playable acceptance test.

This is a branching policy across task families. Native routine actions need no inference. Each admitted NPC semantic opportunity receives bounded Jev attention/escalation; Jev calls do not recursively route themselves. Speech defaults to level 2, complex immediate decisions use levels 3/4, and level 5 runs reflection independently in the background. A single LLM can return an intent, proposed plan and required clarification together when they share evidence; separate them only when outputs truly depend on information obtained later.

Jev is suitable for supplied choices, scores or yes/no judgments over text/structured state. Its independent questions share state but do not consume each other's answers; dependent decisions need another stage or a different formulation. Use explicit other/unknown choices. Keep model IDs pinned and rubric-specific calibration; do not normalize all providers to an invented universal confidence percentage. [Primitives](https://docs.typesafe.ai/primitives), [state](https://docs.typesafe.ai/concepts/state), [models](https://docs.typesafe.ai/models).

Jev's documented arithmetic, distraction and adversarial-input limitations support doing calculations in code, minimizing irrelevant context and measuring errors on actual game cases. A Score is not an automatically valid physical constant. Neither schema conformance nor a probability distribution proves truth. [Limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13). Detailed vendor pricing/limits and untested assumptions remain in [Jev research](../02-research/jev-and-semantic-routing.md).

### Triggers and scheduling

For exposure triggers, a new person encounter always creates a logical decision opportunity; mundane objects do so when a current interest or meaningful state change warrants it. Reevaluate already-visible candidates when a goal changes. Native exposure deltas and interest matching precede a bounded Jev batch, with no per-object/per-step inference. Critical-need reminders use simulation time, while model cooldowns and spending use real time. The [detailed trigger and reminder contract](perception-and-attention.md#7-sensory-event-generation) defines coalescing, index lag, encounter coverage and reminder opportunities without compulsory generated thoughts.

The game scheduler decides when reasoning is useful from explicit events and state transitions. It does not ask an LLM to inspect every tick or poll every resident continuously. Proposed trigger policy:

| Trigger | Work requested | Scheduling rule |
|---|---|---|
| Immediate hazard or survival threshold | Native interruption/action first; optional appraisal later | Survival never waits for inference; merge repeated hazard observations |
| Current action completes, plan fails, or a significant need/opportunity changes | Native utility selection; typed choice or short LLM plan if unresolved | Retain a valid current plan; one current planning generation per actor; cooldown repeated failures |
| Directed speech or relevant conversational turn | LLM response using that actor's permitted evidence | Prioritize responsiveness; cancel superseded drafts; retain committed speech history |
| Meaningful social event or surprising outcome | Bounded appraisal/memory proposal if deterministic recording is insufficient | Batch related events; ordinary observations are recorded without a model call |
| Every simulated hour | Small-model consolidation of raw personal/aware-event experience older than six game hours | Atomic summary publication; preserve concurrent evidence, bounded backlog, no automatic paid retry |
| Safe downtime, eligible sleep, authored-capacity pressure or significant unresolved experience | Background level-5 file reflection; sleep requires two continuous hours before dream eligibility | Independent bounded queue; publish accepted inner-world text and short thoughts; never block speech or native rest |
| Novel intent after compatible-family retrieval fails | Missing-support record, single declaration draft or bounded authoring/testing agent | Canonical deduplication, novelty budget, repeated-demand priority; ordinary world activity continues |
| Creator describes/edits a premise or requests an explicit intervention | Creator-scoped profile/manifest workflow | Separate authority and budget; consequential profile changes use validation and migration |
| Repeated mechanic failures or poor decision evaluation | Quarantine policy plus optional diagnosis/regression job | Bounded repair attempts; engineering work cannot automatically patch live trusted code |

Distinguish a job's simulation-time relevance deadline from its real-time queue/execution deadline. Coalesce duplicate stimuli before context assembly, and refresh context only if the task remains relevant and budget permits. Sleeping, distant or uneventful actors can continue native activity with few or no model calls. Provider failure does not require repeatedly waking a model until it succeeds.

At higher game speed, preserve hard real-time spending and concurrency limits. More simulated days do not automatically buy more model calls. Measure jobs by trigger, calls per job, input/output tokens, retrieval/embedding costs, provider charges and execution/storage overhead per real hour. Shared workers reduce platform startup/idle work; selecting less irrelevant context and fewer unnecessary calls reduces token spend. Neither gain should be assumed before matched-workload measurement.

## 6. Tools and bounded expansion

Ordinary cognitive tools can expose `observe`, `inspectKnownEntity`, `recall`, `inspectMemoryEvidence`, `listKnownCapabilities`, `estimateSupportedAction` and `proposePlan`. Names are illustrative. Their implementations resolve scope from the job and bound records, field selection, distance, time range and output bytes. A model receives no arbitrary SQL or access to world-file history. The server envelope retains provenance and version/freshness metadata; NPC-facing results contain scoped English evidence, useful uncertainty and only necessary local handles. Immediate levels 2–4 do not require a tool round.

Builder tools can retrieve admitted declaration contracts, inspect authorized candidate dependencies, run headless fixtures in disposable worlds and submit a draft bundle. They do not activate a rule, modify the live profile or read NPC private histories unless a specific authorized task needs that evidence. Isolated shell/code tools belong to the build mode, not default NPC conversation.

Prefer a complete proposed plan returned for game execution. Where an agent uses an action tool interactively, the tool submits the same validated command with a stable call/action identity and returns its actual receipt. A final narrative cannot reapply that action. Recheck grants and game prerequisites at invocation and commit, not only when admitting the long-running job.

Cap tool rounds, total retrieved bytes, model requests, output length, elapsed time and child jobs under one aggregate budget. Partial results remain partial. Retrying a provider or mutating tool with an unknown outcome requires reconciliation; a new execution ID is not proof that repeating the side effect is safe.

## 7. Freshness, caching and feedback

Keep separate caches for immutable declaration content, derived simulation queries, context fragments and exact semantic judgments. Each has different keys and invalidation rules. A judgment key includes authorized tenant/world/audience scope, the relevant input fingerprint, context contract, model, rubric, profile and dependency versions. Retention/permission changes invalidate access even if the bytes once matched. A public material definition can be shared where licensed; a private relationship appraisal cannot be reused across actors as fact.

A semantic retrieval match suggests a mechanism; it is not itself a cache hit authorizing its effect. Quantitative effects are recomputed from live state. Record stochastic draws instead of caching one random success forever. Negative lookups expire or invalidate when the scoped registry, neighborhood or memory collection changes. Track omissions and index watermarks so partial retrieval is never reported as exhaustive.

At commit, compare relevant versions and recompute admitted predicates. An unchanged source item with a newly introduced nearby fire still needs reconsideration. A new profile invalidates decisions that rely on the old permissions/premise. Old conversation responses check turn/plan generation. Superseded work cannot mutate a mind or world solely because its provider eventually completed.

Separate dependencies of a semantic judgment from prerequisites of executing its proposed action. A remembered promise can still explain an intent after the actor moves; current reach, inventory and ownership are checked when acting. A judgment about whether a particular wet material ignites depends on that material evidence and cannot survive a meaningful change without reevaluation. Define the distinction per trusted task family; do not let a model declare arbitrary changes irrelevant. Measure stale-result rate and useful completed decisions at each speed setting. Excessive invalidation is a design failure to address, not an excuse to bypass current-state validation.

Feedback enters distinct records: committed world outcomes; perceived observations; subjective memory updates; decision evaluations; and declaration demand/counterexamples. Store accepted model results for replay. Do not automatically retrain a provider or grant cross-world data use because context artifacts exist.

Forgetting propagates through accessible records, retrieval indexes, cached contexts, workspace projections and native session reuse. Every NPC cognition job starts with fresh model conversation state; only bounded within-reflection turns share a session. Reuse warm compute independently, never forgotten cross-job transcripts. World-agent conversations retain their separate policy. Creator audit retention is separate from NPC recall; backups are not an NPC memory tool.

## 8. Worked routing cases

**“Bind these branches into a little house.”** Resolve selected parts and intended use, retrieve the supported shelter family, check materials and distinguish coverage from enclosure/occupancy. Reuse or parameterize an existing plan when possible. Generate a new G1 composition only for an actual gap, then activate and revalidate. Household significance can become a social record without changing structural strength.

**Match versus twig or wooden wall.** Interpretation determines source, target section and exposure method. The admitted coarse model uses material/section class, moisture, source strength/duration and accumulated ignition/cooling state. Code advances the attempt. A missing moisture reading is not a reason to ask Jev to invent exact wetness; a missing thermal family is a declaration gap. Later spread runs the admitted algorithm directly.

**“My magic wand lights the tree.”** Interpret the actual cause, not a banned word. A theatrically named ordinary firelighter may be supported. Source-free magical heat is forbidden in a grounded world, even if a generator labels it `natural_spell_heat`. Roleplay speech can exist without the physical effect. A fantasy world consults its own admitted magic costs and abilities.

**“Why are you angry with me?”** The NPC receives its permitted memories and current relationship, including uncertainty and relevant contradictory evidence. It can express its belief without access to the player's private intent. A promise to reconcile becomes a commitment; a claimed completed gift must reference an actual transfer receipt.

**“Make a world that behaves like reality.”** A creator-scoped workflow retrieves a tested premise/default family and separates causal rules from proposed clock, population, recovery and budget settings. One generation call may assemble the draft; a bounded agent is appropriate only when it must inspect compatibility or evaluate examples iteratively. Ask about material conflicts, record assumptions, and validate the starting manifest in code. No model can infer a universally complete physics implementation from the sentence.

**“Can I wring this cloth dry?”** Retrieve the existing wetness owner and material applicability first. A dormant wringing influence helps locate the missing action/transfer contract, not calculate an imaginary effect. Reuse a supported mechanism or author the smallest admitted extension. A failed service call produces no water transfer or fictional learning. Once supported, execution changes the same cloth's state, and observation can teach a character only what they experienced.

## U14: action discovery and the world workshop agent

The [controls catalogue](../03-design-proposals/playability-and-controls.md) is an authoritative application query, not a model-generated list. Enumerate all permitted existing actions through complete pagination, with stable IDs, categories, current availability and reasons. Rank using deduplicated execution counts and context in ordinary code. Bounded top-k retrieval remains appropriate for an individual AI decision; it must not limit what a player can browse. Jev can help classify ambiguous intent or propose category metadata during admission; opening a menu, filtering the journal or pressing a shortcut should not require inference.

The [world agent](../03-design-proposals/world-agent-and-workshop.md) has the authorized god audience: query coverage across the whole world's state, NPC context, definitions and retained event history. This is broader than character perception but still bounded to that world and the caller's grants. Each inference receives relevant evidence through bounded, paginated read tools, with revisions and coverage disclosed. Exact counts, filters and version comparisons use code; Jev routes bounded questions, LLMs explain or draft, and an agent loop handles investigations needing multiple reads. Private human communication policy remains to be decided before shared-world access is enabled.

A read grant never authorizes edits. Workshop outputs are proposals to the application, which rechecks policy and revisions and applies validated changes through the world commit path. Revocation stops further retrieval and consequential operations; canceling already-dispatched inference does not erase possible provider cost. These requirements extend the proposed context contract, not the implemented prototype's current journal or AI adapter.

## 9. Evaluation before richer infrastructure

Build a labeled corpus by task family, including paraphrases, rare consequential cases, forbidden causes, missing fields, private facts, contradictory testimony and large distractor histories. Keep tuning and held-out examples separate. Compare local rules, bounded typed calls, single LLMs and agents at equivalent evidence and authority. Evaluation should measure useful coverage and accepted errors, not merely schema pass rate.

Acceptance must connect selected memories to observable later utterances, decisions or actions in labeled cases spanning all five selection signals. Compare matched situations with different permitted histories, preserve justified unchanged outcomes, and require meaningful behavioral differences where evidence matters. Prompt inclusion alone is insufficient; fixtures do not establish live behavioral usefulness.

Track required-fact recall, irrelevant-context volume, attribution errors, unauthorized retrieval, false forbidden/missing classifications, accepted wrong routes, stale-result rejection, commitment misses, context assembly latency, provider latency, total tokens, tool rounds and dollars per real hour. Compare small contexts with richer contexts; complexity must improve behavior enough to justify its cost.

Test source deletion/revocation after admission, index lag, a new query member, mandatory facts exceeding the budget, two simultaneous proposals, provider timeout after charge, worker crash after commit and faster world time. Use fixture providers to test contracts without spending. Real-provider acceptance is separately budgeted and records exact versions. The defaults for ranking, thresholds, limits and provider choice remain open until these tests establish a useful operating envelope.
