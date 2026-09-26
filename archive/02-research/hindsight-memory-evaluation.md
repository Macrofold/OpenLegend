# Hindsight memory evaluation for OpenLegend

Research date: **2026-09-26**. Status: **desk research and architectural recommendation; no adoption, integration, fork, paid execution or comparative benchmark completed**.

This record captures the Hindsight investigation requested by Mike and its OpenLegend-specific conclusions. It belongs in research rather than the technical contract directory because an evaluated dependency is not an accepted architecture. The suggested integration and evaluation below remain proposals, not authorization to implement them.

## Scope, evidence and owners

The original OpenLegend implementation review used commit [`ce7ef555f50c979ac3d2179cf5876ea4a55e1318`](https://github.com/Macrofold/OpenLegend/tree/ce7ef555f50c979ac3d2179cf5876ea4a55e1318). This document is being archived from the subsequently updated `main` at [`61c9d1ca52b4267aa405187f4b6799ded9b24317`](https://github.com/Macrofold/OpenLegend/tree/61c9d1ca52b4267aa405187f4b6799ded9b24317). The latter contains additional foundation, persistence and lifecycle changes: historical code findings below describe the reviewed snapshot, not a complete re-audit of those later changes. Current knowledge ownership and conservative correction behavior were checked again while archiving.

Selected upstream code was inspected at [`vectorize-io/hindsight@ccfe85b4851957ac2adf88b4a9ddf9668b2882f1`](https://github.com/vectorize-io/hindsight/tree/ccfe85b4851957ac2adf88b4a9ddf9668b2882f1); its API package declares version `0.10.1`. Official documentation was checked on the research date. Moving documentation and an upstream main commit are not proof that every described feature exists in a particular release artifact. Recheck the exact deployment version before implementation. [Package manifest][hs-package]

Evidence categories used here:

- **Observed implementation:** named code and configuration at the pinned commits.
- **Documented capability or vendor result:** an upstream claim, not independently reproduced here.
- **Recommendation or inference:** the proposed application to OpenLegend.
- **Unverified:** lifecycle, quality, cost and scale behavior that needs a matched local experiment.

The review covered relevant memory, knowledge, recall, consolidation, maintenance, context and persistence code and their specifications; it was not an exhaustive security review of either repository. No test suite, live-memory acceptance script or benchmark was run for this investigation.

Existing owners remain authoritative: [Memory architecture](../../docs/memory-architecture.md), [Knowledge](../../docs/knowledge.md), [Events and perception](../../docs/events-perception-and-reactions.md), [Save/load](../../docs/save-and-load.md), [AI providers](../../docs/ai-providers.md), and [engine/world boundaries](../../docs/engine-and-world-boundaries.md). Current implementation belongs in [Architecture](../../docs/architecture.md); implementation and acceptance work stays in the [cognition tracker](../../docs/maintainers/cognition-redesign.md), including CR12 and CR13. [R11/R19](../05-project/research-backlog.md) own the remaining empirical memory/execution questions. This record does not replace those contracts, trackers or the [memory limits inventory](../../docs/limits/memory.md).

## 1. Recommendation

**Do not use Hindsight as a drop-in replacement for OpenLegend's complete memory system. Consider it as an optional, replaceable retrieval service. Do not maintain a divergent fork before an experiment establishes its value and a specific missing extension point.**

OpenLegend must own what a character experienced, what they believe, what they have forgotten, and what those things authorize. Hindsight organizes, retrieves and reasons over supplied information. Its richer retrieval may be useful, but those responsibilities are not interchangeable.

| Candidate use | Recommendation | Reason |
| --- | --- | --- |
| Replace canonical experience, knowledge and accepted mind | Do not adopt this approach | Would require recreating OpenLegend's evidence, privacy, authority and save/load contracts around another writable store |
| Generate optional recall candidates | Evaluate | Most plausible incremental benefit over the inspected retrieval baseline |
| Synthesize proposed interpretations | Consider only after retrieval qualification | Potentially useful, but publication must remain an OpenLegend transition |
| Offline trace analysis or permitted creator investigation | Reasonable lower-risk pilot | Can test usefulness without changing live NPC memory; does not prove NPC suitability |
| Fork the whole framework into an NPC mind engine | Defer | Combines upstream infrastructure maintenance with the game-specific work that still remains |

The intended split is **own character semantics; reuse useful search infrastructure**. Neither an upstream benchmark nor the existence of our own implementation settles the empirical comparison.

## 2. How Hindsight works

### 2.1 Memory banks and the meaning of learning

A bank is a namespace containing memory and its configuration. Banks can correspond to users, agents or other application boundaries. This is an organizational primitive; the application still decides who may access a bank. [Bank API][hs-banks]

Hindsight's learning is primarily external-memory accumulation and use, not automatic retraining of the calling model. The original paper describes TEMPR for memory organization/retrieval and CARA for memory-informed reasoning. Its original world/experience/opinion/observation framing should not be treated as an exact current API schema: implementation and product terminology have evolved. [Research paper][hs-paper]

For OpenLegend, a bank scoped to one world, actor and active restore generation is the recommended first experiment, not a Hindsight requirement. Do not begin with an omniscient world bank whose output is merely filtered at the end.

### 2.2 Retain: extraction, indexing and source preservation

Normal `retain` processing is more than an append. Its modules cover chunk storage, LLM fact extraction, embedding, entity resolution, fact storage, and temporal, semantic, entity and causal links. Extracted records can carry dates, location and described reasons as well as text. A claimed causal link remains a model interpretation of input, not proof from a simulation. [Retain modules][hs-retain-code], [fact extraction][hs-extraction-code]

The documented `world` and `experience` categories distinguish information about the external world from the bank agent's own history. They do not certify truth. A `world` fact is not necessarily an authoritative OpenLegend world fact. Speaker context matters when retaining third-party statements. [Retain architecture][hs-retain]

The API accepts timestamps, context, metadata, document IDs and explicitly supplied entities. Document IDs support updates rather than unconditional duplicate appends. Async operation identity supports submission reconciliation; it must still be reconciled with OpenLegend's durable spending and exactly-once acceptance rules. [Retain API][hs-retain-api]

Extraction mode matters. `chunks` stores chunk text without an extraction LLM; `verbatim` preserves original chunk text while extracting metadata; other modes permit richer rewriting. A restrictive mission can produce zero searchable memories even though the source document is stored and retention reports success. Ingestion success therefore does not establish recall coverage. [Retain architecture][hs-retain]

Current documentation also supports inline images with compatible vision execution. This can process supplied visual evidence; it does not implement line of sight, hearing, recognition or the permission to perceive an image. [Retain architecture][hs-retain]

### 2.3 Observations: higher-level synthesis

After retention, automatic background consolidation can create and revise observations from retained facts. Observations carry supporting fact references. Consolidation can be disabled and requested explicitly; source facts are not simply retired because an observation was generated. These are useful facilities for maintained interpretations, not guarantees of faithful synthesis. [Observations][hs-observations]

This differs from OpenLegend's routine-memory cleanup. Hindsight is constructing higher-level knowledge; OpenLegend also has rules for when source experiences may leave active recall, which incidents must remain distinct, and how complete source coverage is validated. Similar naming does not imply compatible lifecycle semantics.

### 2.4 Recall: complementary retrieval methods

Hindsight combines semantic, lexical, graph and temporal retrieval. Reciprocal-rank fusion combines positions across retrieval lists; an optional cross-encoder judges query-memory pairs, followed by additional ranking signals and result packing. Search depth and returned-text allowance are separate controls. The lexical backend is configurable: native PostgreSQL text search is not the same algorithm as a true BM25 backend. [Retrieval architecture][hs-retrieval]

This is the strongest adoption hypothesis. A character deciding whether to trust a merchant might need an old incident involving that merchant's associate rather than a passage that resembles the present question. Graph and time-aware candidates could help find that incident. This is an illustrative use case, not an observed OpenLegend result.

The documented ranking also uses supporting-fact count for observations. Repeated copies of one rumor are not independent corroboration; a retrieval score must not become character confidence or objective truth. [Retrieval architecture][hs-retrieval]

### 2.5 Reflect: reasoning over memory

`reflect` runs a bounded reasoning process rather than simply returning search hits. It can consult maintained models, observations and underlying facts. Disposition and freeform instructions influence interpretation. These are useful steering controls, but skepticism, literalism and empathy settings are not a complete psychology or an automatic mapping to OpenLegend traits. [Reflect architecture][hs-reflect]

The inspected tools allow hierarchical retrieval, reading maintained models, expanding memory to source chunks/documents, and returning supporting identifiers. Tools' descriptions of raw memories as ground truth must be understood relative to supplied source material, not as game-engine authority. [Reflect tools][hs-reflect-code]

Structured reflection can involve a further conversion pass. The API documents successful requests whose structured conversion fails and reports `structured_output_error`. OpenLegend still needs to distinguish valid text, valid structured output and a valid accepted mutation. [Reflect API][hs-reflect-api]

### 2.6 Mental models and knowledge pages

Mental models maintain answers to standing questions and can be refreshed. Knowledge pages provide a document-like surface, including incremental refresh from observations; their documented update path avoids consulting other knowledge pages. This reduces one source of recursive synthesis but does not establish complete factual correctness or dependency tracking. [Mental models][hs-models], [knowledge pages][hs-pages]

These overlap conceptually with character knowledge pads. The meaningful distinction is ownership: a generated page may inform a proposal, but must not independently change the accepted version of an OpenLegend relationship, belief or identity.

### 2.7 Runtime and deployment

The PostgreSQL path combines vectors, text search, relational/JSON data and graph queries in one database. Embedded `pg0` still runs PostgreSQL, not an in-process TypeScript map or SQLite replacement. Current documentation also lists Oracle support; this evaluation concerns the PostgreSQL deployment, not a verification of parity across databases. [Storage][hs-storage]

The service architecture includes the API, background processing and a control-plane UI. Dedicated workers can use PostgreSQL as their task broker. Embeddings and rerankers may be local or remote depending on configuration. [Services][hs-services]

The Node all-in-one wrapper starts a Python daemon. Its embedded-version default is documented as `latest`; a reproducible OpenLegend evaluation should override moving defaults and pin the SDK, service, models and configuration. Installing an npm package does not make the full engine native Node infrastructure. [Node wrapper][hs-node]

## 3. What OpenLegend already has

The inspected system is not merely a transcript plus embeddings. These findings describe the original code snapshot unless otherwise stated.

| Layer | Observed implementation and design | Consequence |
| --- | --- | --- |
| Acquisition | Actor-specific awareness records retain event-time modality, intelligibility, participants and recognition-related evidence | Export the permitted experience, never an unrestricted event payload |
| Canonical memory | Awareness, personal memories and summaries have distinct records; source versions and summary lineage are stored | Hindsight should be derived from these, not become a competing canonical store |
| Optional retrieval | SQL scope plus vector candidates and importance/recency fallback; related lexical helpers also exist | A stronger candidate provider is a plausible useful seam |
| Required context | Required evidence, active commitments and protected conversation material have dedicated paths | These guarantees must not depend on external extraction or search ranking |
| Attention | Candidates go through bounded actor-perspective attention; selected source revisions are rechecked after async work | Keep that authority validation even if candidate generation changes |
| Cleanup | Older routine memories are grouped separately from protected incidents and retained speech | Hindsight observations are not a contract-compatible replacement |
| Reflection | Background execution produces staged content; accepted mind and knowledge changes have controlled publication | A second background writer would introduce conflicting authority |
| Recovery | Memory scopes contain restore generation; caches, paid attempts and source revisions have distinct lifecycle roles | A remote timestamp argument alone cannot replace restore fencing |

Implementation references: [experience and limits][ol-experience], [recall candidates and attention][ol-recall], [SQL repository][ol-repository], [consolidation policy][ol-consolidation], [maintenance][ol-maintenance].

### 3.1 Retrieval is the most credible improvement opportunity

`RecallService.candidates()` binds world, actor and generation, checks index coverage, fetches required evidence separately, and requests optional selection. For small eligible sets it avoids needing a fresh query embedding. `MemoryRepository.select()` has a cosine-search path with structured fallback. Selected source revisions are checked before use. This is already valuable infrastructure, but not the complete multi-strategy Hindsight pipeline. [Recall][ol-recall], [repository][ol-repository]

An attention model cannot select an old memory that was never in the candidate set. Test upstream candidate generation without confusing its benefit with downstream model changes or a larger context budget.

### 3.2 Cleanup protects character continuity

The reviewed constants include a six-game-hour routine window, a retained newest-512 speech pool, protected importance at eight, and a 1,200-byte summary bound. They are historical implementation values, not new recommended policies. The current [limits inventory](../../docs/limits/memory.md) owns policy review. [Experience][ol-experience]

Batching excludes retained speech, separates important incidents, and supplies chronological positions. Acceptance checks coverage and preserves important incidents exactly and separately. Maintenance instructs and validates grouping rather than permitting arbitrary replacement of the actor's history. These controls do not mathematically prove every generated sentence is faithful: semantic quality still requires evaluation. [Consolidation][ol-consolidation], [experience acceptance][ol-experience], [maintenance][ol-maintenance]

### 3.3 Home-built does not mean complete or superior

The memory specification and cognition tracker distinguish implemented foundations from remaining integrated and live behavioral acceptance. A script or fixture is not evidence that a matched Hindsight comparison has occurred. [Memory specification][ol-memory], [cognition tracker](../../docs/maintainers/cognition-redesign.md)

The knowledge specification rechecked at the archive base still documents a conservative correction/forgetting path: it clears knowledge text alongside accepted-mind reset; forgetting also clears observer identity associations. More selective invalidation requires evidence before replacing that boundary. Hindsight's evidence-linked synthesis is useful inspiration here, but does not automatically supply OpenLegend's complete dependency semantics. [Knowledge at archive base][ol-knowledge]

## 4. Why this is not a drop-in replacement

### 4.1 Experience, belief and world truth must remain distinct

Illustrative sequence: Ada hears Mike accuse Ben of stealing berries. The experience is that Ada heard an accusation. Her belief may be that Ben stole something. The engine's truth may differ from both.

OpenLegend deliberately permits uncertain or false beliefs without permitting subjective text to rewrite physical facts. Hindsight can represent attributed claims, but its general-purpose fact/observation categories do not enforce this game-specific distinction on their own. Acquisition must remain typed and scoped before any extraction or synthesis. A dream, a self-authored thought and another person's testimony must not be promoted into witnessed evidence. [Memory specification][ol-memory], [knowledge][ol-knowledge], [extracted fact model][hs-extraction-code]

### 4.2 Entity resolution is not permission to recognize someone

OpenLegend distinguishes a canonical stored subject from recognition of the present exposure. A note about someone is not sufficient proof that a newly visible stranger is that person. [Knowledge][ol-knowledge]

Hindsight's `resolve_entities: false` applies to explicitly supplied entities; its automatically extracted entities still go through resolution. Observer-scoped identifiers and controlled text therefore matter even when that switch is used. Do not export hidden global names and rely on output redaction to undo a merge already made inside memory. [Retain API][hs-retain-api], [retain types][hs-types]

### 4.3 Temporal relevance is not historical access control

`query_timestamp` anchors relative dates and recency. `temporal_window` affects the temporal search arm; the API explicitly says it ranks rather than excludes all results outside that period. It is not a hard as-of cutoff. [Recall API][hs-recall-api]

A character restored to Day 3 must not retrieve discarded Day 7 knowledge. Use hard generation isolation and rejection of stale work. A time anchor can still help interpretation after that boundary is enforced. Simulation time also needs an explicit mapping to the backend's calendar timestamps; wall-clock defaults must not silently define the character's chronology.

### 4.4 Consolidation is not forgetting

Hindsight retains original facts alongside observations. Document updates, curation and deletion facilities help manage content, but their existence is not proof that every derivative or in-flight task satisfies a game-level forgetting contract. [Observations][hs-observations], [document API][hs-documents]

OpenLegend forgetting must cover optional indexes, source expansion, accepted knowledge, cached context, provider sessions, timeline copies and late completions. Either demonstrate full lineage invalidation or quarantine/rebuild the affected external bank while falling back to native recall. Deleting a search row is insufficient if a page or source chunk still contains the detail. Creator audit retention must not create a backdoor into an NPC's recall.

### 4.5 One accepted mind, not two writers

OpenLegend knowledge mutations are revision-checked; empty documents leave tombstones to block stale recreation. Reflection publication is atomic. These are not merely storage preferences. [Knowledge][ol-knowledge], [memory specification][ol-memory]

An independently refreshed Hindsight page and an independently edited OpenLegend pad would create two versions of what the character believes. Initially keep Hindsight synthesis read-only or disabled. Later generated interpretations may become proposals through the existing owner. Remembering a recipe cannot grant a capability; recalling a promise cannot fulfill or erase it.

### 4.6 Immediate experience must survive index lag

Recent dialogue and trigger evidence remain available natively before external processing completes. Retrieval outages, zero-fact extraction, missing embeddings or an incomplete bank must be reported as incomplete coverage, not interpreted as the character having no such experience. Required evidence bypasses optional ranking. [Recall][ol-recall], [retention coverage caveat][hs-retain]

### 4.7 Freshness and retries cross two services

OpenLegend validates source versions after async attention and distinguishes uncertain paid completion. Hindsight operation identity can assist reconciliation but does not, by itself, make cross-service acceptance atomic. Use a committed outbox and idempotent identifiers; recheck generation, source eligibility and revision after each external result. No blind paid resend after a timeout. [Recall][ol-recall], [repository][ol-repository], [retain API][hs-retain-api]

### 4.8 Backend budgets are not the complete game budget

Hindsight's recall `budget` means search depth, not a dollar reservation. The returned-text budget excludes some surrounding response material; source chunks have an independent allowance. The documented packing policy can return the highest-ranked fact whole when nothing fits. OpenLegend must separately bound transport bytes, assembled context, timeout, concurrency and total spend. [Recall API][hs-recall-api], [retrieval][hs-retrieval]

## 5. Build, adopt, host or fork

| Approach | Main benefit | Main cost or risk | Position |
| --- | --- | --- | --- |
| Keep current native system | Exact integration with authority, continuity and saves | Own retrieval development and qualification | Retain as canonical foundation and baseline |
| Improve native candidate generation | Potentially obtain most needed benefit with a smaller change | Still requires search engineering and benchmarks | Include as a serious comparator, not a straw man |
| Self-host Hindsight behind an adapter | Reuse retrieval, worker and inspection infrastructure with version/control autonomy | Python service, database/model operations, migrations and integration maintenance | Preferred durable candidate if evaluation succeeds |
| Managed Hindsight Cloud | Lower setup burden for a disposable pilot | Service availability, pricing, provider/data terms and lifecycle constraints | Suitable for controlled permitted traces; not assumed cheaper |
| Maintain a divergent fork | Change missing internals directly | Upstream security/migration merge burden plus our own game semantics | Only after proven benefit and a specific unavoidable patch |

The first-party upstream code at the inspected commit is MIT-licensed. This permits modification and redistribution subject to its notice requirements and reduces proprietary implementation lock-in. It is not a guarantee of ongoing support, an SLA, or blanket licensing of every dependency/model. OpenLegend's own licensing remains unchanged. [License][hs-license], [dependency manifest][hs-package]

Bank export/import/clone exists, so portability is not purely hypothetical. However, exports do not preserve database IDs or embeddings; import re-embeds and re-resolves entities. That is useful migration capability, not a byte-identical gameplay checkpoint or deterministic reconstruction of every retrieval result. Keep canonical source revisions outside the dependency. [Bank API][hs-banks]

The implementation surface is still evolving. Pin a service artifact/commit, SDK, configuration, extraction prompts and model identities; test upgrades against recorded traces before promotion. The documented Supabase extension move in v0.9.3 is one concrete example of integration configuration changing. Do not infer a bus factor, financial runway or enterprise support guarantee from repository activity. [Extensions][hs-extensions]

The preferred initial dependency strategy is an upstream release plus a small owned adapter, reproducible image and export/rebuild path. Use supported configuration and extension hooks first. A mirror can preserve access without becoming a maintained divergent fork. A fork becomes justified only after naming the precise missing capability, proposing it upstream where practical, and accepting its maintenance cost.

### Security boundary

Tenant and operation-validation hooks help enforce application policy, but the server must resolve the actor's bank and authorized operation; an NPC must not choose arbitrary bank IDs or hold administrative credentials. An optional pattern-based Memory Defense facility is documented; it is not a truth verifier or a substitute for scope and authority validation. Recalled prose remains untrusted input, never executable instructions. [Extensions][hs-extensions], [Memory Defense][hs-defense]

Self-hosting does not imply all content stays local when remote LLM, embedding or reranking providers are configured. Before a managed or remote-model deployment, separately verify retention/training terms, data locations, subprocessor use, deletion, logging and account-level limits. These were not contractually qualified in this review.

## 6. Economics and scaling

Hindsight's performance documentation describes a read-heavy design, around ten or more reads per write. That is a workload assumption to test, not evidence that it cannot handle simulation writes. Its latency guidance is deployment-dependent and was not measured in OpenLegend. [Performance][hs-performance]

A simulation may have substantial write fan-out: one native event can create many different actor-permitted experiences. Per-actor extraction, embedding and synthesis can multiply work even when the canonical event is shared. Never reduce that cost by merging private actor inputs into one omniscient synthesis job. Accelerated game time also creates more maintenance opportunities without increasing the acceptable real-time spending allowance. These are architectural inferences to measure.

Dated public Cloud reference rates, checked 2026-09-26 and documented as effective 2026-07-06:

| Operation | Published unit and rate |
| --- | --- |
| Retain | $10 per million input tokens |
| Recall | $0.75 per million output tokens |
| Reflect | $0.05 per call |
| Retrieve model/page | $0.25 per million output tokens |
| Create/refresh model/page | $0.05 per call |
| Storage beyond the documented 30-day grace period | $0.25 per million tokens per month |

These are reference rates, not a quote for our account. File conversion and other applicable charges are additional. Pages can refresh automatically after consolidation, creating charges without a deliberate interactive reflection call. As an arithmetic illustration, 10,000 reflect calls at the listed rate cost $500 before other operations. Recheck pricing and configure refresh triggers before any pilot. [Cloud billing][hs-billing]

Measure the complete pipeline rather than one API call: permitted-input fan-out, extraction, embeddings, reranking, observation/model refresh, cognition, storage, queueing and operational support. For self-hosting include database capacity, memory/CPU or accelerators, backups and engineering maintenance. Report cost per actor-game-hour, per simulated day and per real hour at each speed. Separate cold-start, steady-state and rebuild costs; maintaining a bank per restore generation can make restores expensive if replay pays for extraction again.

Do not initially place indexing and synthesis on the simulation's critical database resources without isolation. Reuse cached paid artifacts only when source identity, revision, model and permission scope match; never reactivate forgotten or future-timeline content just because its embedding is cached.

## 7. Proposed integration boundary

This is an architectural sketch for an authorized experiment, not a delivered API or a second current specification.

```text
OpenLegend commits an actor-permitted experience
  -> transactional outbox with immutable source/version identity
  -> world + actor + active-generation Hindsight bank
  -> optional recall candidate references
  -> OpenLegend validates mapping, eligibility and current revisions
  -> reload canonical permitted text and add required native evidence
  -> existing attention and compact context
  -> existing cognition, admission and accepted publication
```

### 7.1 Preserve canonical ownership

Treat Hindsight as disposable derived infrastructure. Keep experiences, accepted knowledge/mind, recognition, obligations, techniques and save authority in OpenLegend. Losing the backend should reduce optional retrieval quality, not erase the character. Persist any accepted generated interpretation through existing domain transitions so it survives independently of the dependency.

The initial seam is candidate selection around `RecallService.candidates()` and `MemoryRepository.select()`, not wholesale replacement of `MemoryRepository`, which also owns source eligibility, lineage and lifecycle data. The adapter should provide candidate-to-source mappings, versions, scores and coverage/operation status. It must not invent missing original IDs or treat generated text as authoritative evidence. [Recall][ol-recall], [repository][ol-repository]

### 7.2 Scope before processing and validate after processing

Only send actor-permitted source text and identities. Bind world, actor, generation, acquisition modality, event/learning times and source revision server-side. Validate all contributing sources for an aggregate result, not just one citation. If complete lineage cannot be established, exclude the aggregate from authoritative recall and retrieve original source candidates instead.

Use separate banks for the initial actor/generation experiment. Tags may be useful inside that boundary, but final-result filtering cannot undo a synthesis that already combined private sources. Explicitly avoid shared observation scopes until their semantics pass the same privacy tests. [Retain API][hs-retain-api]

One bank per generation is a conservative starting design, not a claim of acceptable scale. Measure bank count, rebuild latency and duplicated storage; retain old banks only under explicit non-NPC audit/retention rules. A more efficient namespace/snapshot scheme requires the same hard isolation evidence.

### 7.3 Start with retrieval rather than a second reflection engine

Disable automatic observations, model/page refreshes and `reflect` in the first pilot. Compare `chunks` with `verbatim`: the former isolates inexpensive indexing, while the latter exercises metadata extraction without rewriting source text. A chunks-only failure does not establish that the richer framework is useless. Conversely, a richer-mode success must include its ingestion and maintenance cost. [Retain architecture][hs-retain]

Keep OpenLegend's exact latest dialogue, stimulus and obligations on the native required path. Revalidate selected source versions after Hindsight and after attention. Reject rather than silently truncate required context when the full task cannot fit.

### 7.4 Lifecycle and failure handling

Write the outbox in the same transaction as the canonical source. Derive stable export/operation keys from the scoped source identity and revision; record acknowledgments and uncertain submissions. Distinguish successful ingestion from searchable coverage. Keep source revision changes, forgotten evidence and generation transitions fenced even when an old job finishes later.

On correction, invalidate the affected external candidates and derivatives before admitting them again. On forgetting, quarantine or rebuild the bank if selective erasure cannot be demonstrated. On restore, rotate the generation before accepting results and rebuild only from currently permitted saved sources, not a discarded-future transcript. A timestamp does not perform these operations.

Use a timeout and circuit breaker around optional retrieval. Fall back to native structured recall and surface incomplete coverage. Keep memory service operations off the physical simulation loop and account for cancellation that stops waiting but does not necessarily stop provider billing.

### 7.5 Only then evaluate synthesis

After retrieval qualification, an observation or reflected interpretation can be a staged, evidence-linked proposal. OpenLegend validates actor scope, source generation/revisions, forgotten evidence and document revision, then publishes through the existing owner. No auto-refresh writes directly to About me, knowledge pads, goals or protected obligations.

As a separate low-risk path, an authorized creator tool can analyze permitted traces offline. Its broader investigative access must never widen a player's or NPC's knowledge.

## 8. Proposed matched evaluation

The empirical question extends R11/R19; detailed implementation acceptance remains with the existing cognition and lifecycle trackers. No experiment is authorized or reported as completed by documenting this proposal.

Compare three arms:

1. Current OpenLegend at a newly pinned implementation baseline.
2. A modest native candidate improvement, such as lexical/time candidates and rank fusion.
3. Hindsight through the scoped candidate adapter, with separate minimal and richer ingestion configurations.

Use the same actor-perspective histories, downstream models, instructions, required context, opportunities and resource allowances. Record service, SDK, model and prompt versions. Keep development cases separate from holdout cases and use repeat runs where probabilistic variation matters. Agree behavioral success and latency/cost criteria from the development baseline before examining holdout results; do not choose thresholds afterward to favor adoption.

| Scenario family | Evidence required |
| --- | --- |
| Unheard or occluded event | No experience appears for an actor without permitted acquisition |
| Late conversation arrival | Group membership does not reveal speech before arrival |
| Similar names or unnamed animals | No unauthorized entity merge or recognition of a new encounter |
| Rumor repeated by several people | Preserve speaker/claim provenance; repetition is not independent proof |
| Contradiction and later explanation | Belief can change without rewriting what was witnessed or heard |
| Dream or intentional private thought | Remains imagined/self-authored, not objective evidence |
| Important incident amid routine noise | Relevant old incident remains retrievable without flooding context |
| Immediate dialogue and commitments | Protected required evidence remains usable before indexing completes |
| Forgetting across derivatives | Source text, facts, observations, pages, caches and source expansion do not reintroduce forgotten detail |
| Load an earlier save | Discarded-future facts and late old-generation jobs remain inaccessible |
| Correction while recall is running | Stale source versions are rejected after the external result arrives |
| Retry, timeout and restart | No blind paid replay or duplicate accepted mind mutation |
| Backend or provider outage | Native simulation continues; optional recall degradation is explicit |
| Increasing population and speed | Measure fan-out, queue age, resource use and cost without assuming linear scale |
| Backend upgrade or import/rebuild | Detect changed identity resolution, rankings, source mappings and accepted behavior |

Measure candidate coverage and attribution separately from downstream behavioral value. Record recall errors, false certainty, cross-scope leakage, commitment misses, justified abstention and whether relevant memories actually change later decisions. Fluent retrospective answers alone do not establish character continuity.

Record p50/p95 latency by stage, freshness lag, eligible/indexed/exported counts, retained bytes, calls/tokens and total cost. Include small native workloads where additional retrieval has no benefit. Any observed privacy, forgotten-memory, authority or discarded-timeline leak is an adoption blocker, not a quality tradeoff to average away; passing a finite test set is still not proof of universal correctness.

Adopt the sidecar only if it materially improves useful recall or maintained understanding relative to both baselines, within agreed budgets, with acceptable operational cost and a demonstrated uninstall/rebuild path. Reject or defer adoption if a small native improvement captures the benefit, if identity/lineage cannot be controlled, or if write amplification dominates.

## 9. Open questions and resumption

| Question | Evidence needed before adopting |
| --- | --- |
| Is optional candidate omission a material gameplay problem? | Matched traces showing missed memories change consequential behavior |
| Which exact released configuration should be tested? | Version-qualified APIs, extraction mode, local/remote models and reproducible deployment |
| Can actor-scoped identity survive all extraction and import paths? | Similar-name and exposure tests with verified source mappings |
| Can erasure and correction cover every derivative and in-flight job? | Lifecycle fault injection and inspection, not API-presence inference |
| Is per-generation isolation affordable? | Restore/rebuild and bank-count measurements; safe alternative only if needed |
| Does richer retrieval beat a modest native hybrid? | Three-arm behavioral, latency and full-cost comparison |
| Are hosted terms acceptable for the actual data? | Owner-reviewed contract, retention, deletion and provider routing |
| Is a fork necessary? | A proven benefit plus a concrete missing hook that cannot be cleanly configured or contributed upstream |

To resume, read the current canonical owners and R11/R19, pin the then-current code and upstream version, and recheck historical findings before implementation. An approved pilot should get its own scoped project plan and focused tasks under the existing documentation workflow. Do not turn this archival recommendation into an adopted dependency or duplicate current contracts merely by merging the document.

## 10. Source register

All vendor pages below were consulted for the 2026-09-26 evaluation or its archival verification. Links are primary sources. The research paper and vendor benchmark measure their own workloads; neither is an OpenLegend acceptance result. The vendor benchmark site reported 94.6% LongMemEval in the original brief; preserve that as a dated vendor-reported result, not a reproducible guarantee or a claim that the original paper used the same experiment. [Benchmark site][hs-benchmarks], [paper][hs-paper]

### Upstream evidence

- Mechanisms and API edges: [retain][hs-retain], [retain API][hs-retain-api], [retrieval][hs-retrieval], [recall API][hs-recall-api], [observations][hs-observations], [reflect][hs-reflect], [reflect API][hs-reflect-api], [mental models][hs-models], [knowledge pages][hs-pages], [banks/export/import][hs-banks], [documents][hs-documents].
- Deployment, security and economics: [storage][hs-storage], [services][hs-services], [Node wrapper][hs-node], [extensions][hs-extensions], [Memory Defense][hs-defense], [performance][hs-performance], [billing][hs-billing].
- Pinned implementation: [license][hs-license], [package/dependencies][hs-package], [retain modules][hs-retain-code], [input types][hs-types], [fact extraction][hs-extraction-code], [reflect tools][hs-reflect-code].

### OpenLegend evidence

- Original snapshot: [memory semantics][ol-memory], [experience/acceptance][ol-experience], [recall][ol-recall], [SQL memory repository][ol-repository], [consolidation policy][ol-consolidation], [maintenance][ol-maintenance].
- Archival follow-up: [knowledge contract at `61c9d1c`][ol-knowledge]. Current live acceptance and delivery status must be read from the linked maintained owners, not inferred from this dated report.

[hs-paper]: https://arxiv.org/html/2512.12818v1
[hs-benchmarks]: https://benchmarks.hindsight.vectorize.io/
[hs-retain]: https://hindsight.vectorize.io/developer/retain
[hs-retain-api]: https://hindsight.vectorize.io/developer/api/retain
[hs-retrieval]: https://hindsight.vectorize.io/developer/retrieval
[hs-recall-api]: https://hindsight.vectorize.io/developer/api/recall
[hs-observations]: https://hindsight.vectorize.io/developer/observations
[hs-reflect]: https://hindsight.vectorize.io/developer/reflect
[hs-reflect-api]: https://hindsight.vectorize.io/developer/api/reflect
[hs-models]: https://hindsight.vectorize.io/developer/mental-models
[hs-pages]: https://hindsight.vectorize.io/developer/knowledge-pages
[hs-banks]: https://hindsight.vectorize.io/developer/api/memory-banks
[hs-documents]: https://hindsight.vectorize.io/developer/api/documents
[hs-storage]: https://hindsight.vectorize.io/developer/storage
[hs-services]: https://hindsight.vectorize.io/developer/services
[hs-node]: https://hindsight.vectorize.io/sdks/hindsight-all-npm
[hs-extensions]: https://hindsight.vectorize.io/developer/extensions
[hs-defense]: https://hindsight.vectorize.io/security/memory-defense
[hs-performance]: https://hindsight.vectorize.io/developer/performance
[hs-billing]: https://docs.hindsight.vectorize.io/billing/
[hs-license]: https://github.com/vectorize-io/hindsight/blob/ccfe85b4851957ac2adf88b4a9ddf9668b2882f1/LICENSE
[hs-package]: https://github.com/vectorize-io/hindsight/blob/ccfe85b4851957ac2adf88b4a9ddf9668b2882f1/hindsight-api-slim/pyproject.toml
[hs-retain-code]: https://github.com/vectorize-io/hindsight/blob/ccfe85b4851957ac2adf88b4a9ddf9668b2882f1/hindsight-api-slim/hindsight_api/engine/retain/__init__.py
[hs-types]: https://github.com/vectorize-io/hindsight/blob/ccfe85b4851957ac2adf88b4a9ddf9668b2882f1/hindsight-api-slim/hindsight_api/engine/retain/types.py
[hs-extraction-code]: https://github.com/vectorize-io/hindsight/blob/ccfe85b4851957ac2adf88b4a9ddf9668b2882f1/hindsight-api-slim/hindsight_api/engine/retain/fact_extraction.py
[hs-reflect-code]: https://github.com/vectorize-io/hindsight/blob/ccfe85b4851957ac2adf88b4a9ddf9668b2882f1/hindsight-api-slim/hindsight_api/engine/reflect/tools_schema.py
[ol-memory]: https://github.com/Macrofold/OpenLegend/blob/ce7ef555f50c979ac3d2179cf5876ea4a55e1318/docs/memory-architecture.md
[ol-experience]: https://github.com/Macrofold/OpenLegend/blob/ce7ef555f50c979ac3d2179cf5876ea4a55e1318/packages/domain/src/experience.ts
[ol-recall]: https://github.com/Macrofold/OpenLegend/blob/ce7ef555f50c979ac3d2179cf5876ea4a55e1318/apps/server/src/recall.ts
[ol-repository]: https://github.com/Macrofold/OpenLegend/blob/ce7ef555f50c979ac3d2179cf5876ea4a55e1318/apps/server/src/memory-repository.ts
[ol-consolidation]: https://github.com/Macrofold/OpenLegend/blob/ce7ef555f50c979ac3d2179cf5876ea4a55e1318/apps/server/src/memory-consolidation.ts
[ol-maintenance]: https://github.com/Macrofold/OpenLegend/blob/ce7ef555f50c979ac3d2179cf5876ea4a55e1318/apps/server/src/cognition-maintenance.ts
[ol-knowledge]: https://github.com/Macrofold/OpenLegend/blob/61c9d1ca52b4267aa405187f4b6799ded9b24317/docs/knowledge.md
