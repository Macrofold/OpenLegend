# Efficient simulation and intelligent individuals

| Field | State |
| --- | --- |
| Status | Completed technical research synthesis for the October 14 source snapshot; not an approved implementation design. |
| Topic owner | **NPC**, with links to SYSTEMS, LOGISTICS, ACTION, KNOW, SPEECH, MULTI and PRODUCTION. This is not a 36th top-level topic. |
| Last reviewed | 2026-10-14 |
| OpenLegend baseline | GitHub main at `57a2977e22bab3f7293caa4a176c9ef4ba800751`; documented behavior, not new profiling. |
| Measurements | None newly run. All numerical examples below are explicitly illustrative or attributed to source-specific experiments. |

[NPC experience guide](characters-companions-and-relationships.md) · [Academic/industrial evidence](simulation-and-intelligence-evidence.md) · [Game inventory](../research-progress-intelligent-simulation-2026-10-14.md) · [Topic map](README.md) · [Assessment records](assessment-records.md)

## 1. The central engineering choice

The expensive part of an intelligent individual's life should not be repeated proof that an unchanged decision remains unchanged. Our preferred research direction is to preserve useful decisions and perform native execution until relevant circumstances justify reconsideration. This does not mean replacing a person with a survival script while the model is unavailable.

The first question for any proposed optimization is: **does this perform the same work more efficiently, avoid work whose result is already determined, or change the simulated behavior?** These categories require different evidence.

| Category | Example | Required argument |
| --- | --- | --- |
| Same semantics, cheaper implementation | Reuse immutable action descriptions or an exact prompt prefix | The reused data is still correct, permitted and current. |
| Skip provably unchanged work | An inactive process waits for a relevant dependency change | Every relevant change can wake it, including changes during registration or restoration. |
| Compact equivalent representation | Derive progress over an uneventful interval | The derivation preserves all interactions that matter within that interval. |
| Approximate simulation | Advance a remote group statistically | State what detail and intervention opportunities are lost. |
| Approximate cognition | A surrogate selects a familiar response | Show acceptable errors, preserved exceptions and a route to broader choice. |

[Factorio](../dossiers/intelligence/factorio.md) is particularly useful because its developer accounts contain both successful elimination of work and examples where a seemingly technical change altered behavior. [Light Society](simulation-and-intelligence-evidence.md#e07--light-society-very-large-populations-through-approximation) is useful for explicitly approximate computation, not as evidence that all reuse is exact.

## 2. Separate the costs before selecting an architecture

A complete character episode can include native world updates, finding relevant candidates, preparing permitted observations, memory lookup, embeddings, decision routing, model input processing, output generation, admission, world mutation, persistence and presentation. Optimizing only the visible model call can move the bottleneck rather than remove it.

A useful accounting identity is:

`episode cost = native simulation + candidate/context preparation + memory ingestion/recall + all inference stages + world commit/persistence + delivery`

This is a decomposition, not a measured model. Each term can contain CPU, memory, storage, network, service spend and wall-clock delay. These dimensions should not be collapsed into one opaque score.

For an illustrative population of `N` people, if fraction `a` are currently eligible for a periodic decision and their average interval is `τ` wall seconds, the periodic arrival rate is approximately `N × a / τ` requests per second. Meaningful interruptions add another rate, `λe`. Routing may produce zero, one or several provider calls per decision opportunity.

For **1,000 eligible people**, one opportunity every five wall seconds produces 200 opportunities per second; one every five minutes produces about 3.3, before interruptions. This is arithmetic illustrating leverage, not a recommended interval or an achievable quality claim. If the interval is measured in simulation seconds and the world runs faster than real time, multiply the periodic rate by that speed ratio.

A simple token-spend estimate can sum `request rate × (input tokens × input unit price + output tokens × output unit price)` across model stages. Use actual provider billing units, cache pricing and observed retries. It omits non-token charges unless explicitly added. No current prices, projected monthly bill or population capacity are asserted here.

Latency is another quantity. A decision can wait for admission, preparation, provider capacity, generation and final validation. Parallel requests can increase throughput while worsening individual latency; [AgentSociety's reported configurations](simulation-and-intelligence-evidence.md#e06--agentsociety-whole-system-throughput-and-individual-latency-differ) demonstrate why these should be reported separately.

## 3. Time: use different mechanisms for different rates of change

### Fixed-step work

A bounded fixed-step loop is straightforward for dense, regularly changing interactions. Its cost can be predictable and its ordering easier to inspect. The problem is applying it to every dormant actor, memory or resource regardless of whether anything can change.

A smaller time step is not automatically more intelligent. It may improve collision fidelity while doing nothing for a forgotten promise. Conversely, a larger step can remove a response opportunity or alter who obtains a resource. [SUMO's documentation](simulation-and-intelligence-evidence.md#e14--traffic-simulation-movement-frequency-and-decision-frequency-need-not-match) is useful evidence that changing temporal resolution can change behavior.

### Discrete-event work

For a known future completion or threshold, store when the next relevant change occurs and process that event instead of repeatedly asking whether it has happened. Typical research candidates include a finite work stage, a deadline, a scheduled review or an inactive process waiting for an input.

A queue still costs memory and dispatch. Invalidated events can accumulate if cancellation is careless. Simultaneous events need a stable policy; insertion order should not accidentally become a permanent social advantage. [SimPy's ordering model](simulation-and-intelligence-evidence.md#e13--discrete-event-scheduling-skip-empty-time-preserve-order) supplies a concrete implementation contrast, not automatic fairness for OpenLegend.

### Analytical advancement

Some changes over an interval may be computed directly from start conditions and rates. This is attractive only while those assumptions hold. If a rate changes halfway through, a resource is exhausted, or another actor intervenes, advancement must stop at the relevant boundary and continue under the new conditions.

For a hypothetical uninterrupted work process, completion can be scheduled from remaining work and the current rate. An injury, missing input or withdrawn permission changes that calculation. Merely applying the final rate to the entire elapsed interval would rewrite history.

### Mixed rates

Movement, bodily processes, perception, tactical control, open-ended deliberation and rendering need not share one cadence. The important constraint is the earliest consequential interaction, not an arbitrary global “AI tick.” Different rates also require a clear time basis when pausing, accelerating, saving or reconnecting.

The simplest useful system may combine a fixed native world step with event-driven cognition and explicit ongoing work. A wholesale conversion to discrete-event simulation is not justified merely because some work is sparse.

## 4. Continuing intentions and choosing when to reconsider

An accepted activity should carry enough information to continue without repeatedly rediscovering its purpose. The existing goal and plan owners should retain the intention, actual progress and supported constraints; this research does not propose a parallel writable hierarchy.

A useful bounded activity might identify its purpose, chosen method, targets, permitted resource range, stopping condition and review conditions. The model can propose these only within supported trusted representations. A free-form phrase such as “unless something morally troubling happens” is not magically an executable cheap predicate.

Three complementary attention routes are worth comparing:

**Dependency changes.** A target disappears, an input becomes unavailable, a deadline approaches, a relevant bodily condition changes, or a prior assumption becomes false. Native mechanisms can detect many of these without interpreting a whole biography.

**Character-selected relevance.** A person can identify a known acquaintance, expected reply or commitment as worth watching. The engine can match supported observations without deciding in advance what the character must do.

**Open-ended review.** Some meaning is not anticipated. Periodic or self-initiated reconsideration can admit curiosity, emerging dissatisfaction and unexpected associations. Removing it entirely would turn the cheap representation into the ceiling on attention.

Event delivery must use what the character can perceive or legitimately know. A scheduler may know a private event occurred without being entitled to tell everyone. Multiple notices can sometimes be coalesced into one decision opportunity, but coalescing must preserve the evidence and order needed to understand what happened. Repeated weather updates and distinct utterances are not interchangeable kinds of traffic.

Stability matters too. Continually switching between nearly equal alternatives can waste work and look incoherent. A character's existing commitment, switching cost and completion proximity are relevant evidence; an arbitrary permanent lock is not. Prefer reevaluating why a commitment still matters to adding hidden rules that force it to persist.

## 5. Bounded planning without a rule for every story

A finite set of trusted actions can support many sequences. A planner can search preconditions and effects to find means toward a chosen purpose, as the [F.E.A.R. dossier](../dossiers/fear.md) explains. A hierarchical method can package an established procedure into stages. A selected sequence can be simpler than either.

The tradeoff is authoring and maintaining the action model. It must remain consistent with actual execution, uncertain outcomes and another actor's independent choice. Searching an inaccurate model faster produces confidently invalid plans.

For OpenLegend, a promising order is: reuse accepted sequence execution; package genuinely reusable known methods; then consider bounded search for recurring mechanical gaps. Do not begin with a planner for an entire human life. Do not give it undiscovered recipes or let its cost function decide a person's values.

Local repair is appropriate only inside accepted discretion. Choosing another equivalent designated container differs from taking a stranger's bag. A failed step should provide a reason and actual consequences, not simply restart. Limit repeated attempts according to the chosen activity and available evidence rather than letting an expensive loop repeatedly discover the same obstruction.

Speculative lookahead is a separate facility. Predicted effects must never become committed effects, memories or authorizations. [Versu's reversible lookahead](../dossiers/versu.md) is an implementation reference, but importing it would require careful isolation of random state, side effects and private information. No such runtime facility is approved by this guide.

## 6. Perception, candidates and memory can cost more than action selection

### Find what can matter without scanning the whole world

Spatial indices, local neighborhoods and semantic indexes can narrow searches. The exact index should follow the query: nearby visible bodies, reachable resources, outstanding commitments and remembered people are different lookups. One giant universal similarity query is unlikely to be the best owner of all of them.

Naive pairwise perception or relationship checks can grow quadratically with population. Local interaction can reduce the practical candidate count, but social relevance is not purely spatial: a distant person's expected arrival may matter. Keep broad-phase candidate discovery separate from exact permission, visibility, reach and semantic checks.

Candidate pruning has two forms. Removing an impossible action preserves choice; removing an unusual but possible action changes it. Record which is being done. Include a supported route to seek another option where the limited list may miss the point. Do not make the Decision API's shortlist the invisible author of every character's life.

### Retrieve for a question, not merely a generic summary

A useful decision context may need current bodily facts, the active intention, relevant recent outcomes, the people and objects involved, and selected longer-term memories. The source of each fact matters. Required evidence should be bounded and deduplicated with optional recall, not copied into another narrative store.

Failure diagnosis should identify the stage: not recorded, not permitted, not indexed, not retrieved, omitted by a budget, misread, or correctly remembered but not used. [LongMemEval and its newer successor](simulation-and-intelligence-evidence.md#e10--longmemeval-retrieval-and-reading-are-separate-failure-points) offer useful distinctions, while remaining narrower than a game episode.

A compact summary may retain an intention and lose the reason it ended. A successful-skill library may omit the failure that makes a similar future attempt dangerous. Preserve access to precise evidence and conditions rather than repeatedly summarizing summaries until only plausible generalities remain.

### Separate truth, testimony and interpretation

The world can hold an event without every character knowing it. A person can hear a claim without believing it. A reflection can change self-understanding without changing the event. These boundaries are essential to believable mistakes, secrecy, trust and discovery, not merely privacy restrictions bolted onto an otherwise omniscient mind.

A shared public event description can be reused. A private memory projection cannot be shared with another actor merely because the event identifier matches. Permission and perspective belong in the cache identity and retrieval boundary wherever they affect the result.

## 7. Data organization and native simulation

The [Factorio](../dossiers/intelligence/factorio.md), [FLAME GPU](simulation-and-intelligence-evidence.md#e16--flame-gpu-2-large-numbers-of-simple-local-interactions) and [BioDynaMo](simulation-and-intelligence-evidence.md#e17--biodynamo-memory-locality-is-part-of-simulation-architecture) accounts motivate attention to layout, allocation and locality. They do not establish that OpenLegend needs their engines or languages.

Separate shared immutable definitions from per-person state where the semantic distinction is real. Many people can use the same method definition, but their progress, restrictions, knowledge and memories remain individual. Avoid reconstructing identical descriptions or allocating large temporary structures for every small update.

Data-oriented layouts can improve repeated access to selected fields. They can also complicate mutation, persistence and debugging if imposed indiscriminately. An entity-component architecture is a way to organize responsibilities, not a benchmark result. Use measured access patterns and the existing semantic owners before choosing a rewrite.

Avoid copying the entire world to prepare one decision. Scope projections to permitted relevant data. Incremental updates and cached summaries can reduce work, but require correct invalidation. A stale “food available” summary is a behavior bug when a character repeatedly chooses an impossible meal.

Pathfinding is often separable from cognition. Reuse valid route portions, spatial connectivity and known destinations where appropriate; invalidate them when geometry or relevant capabilities change. Local avoidance can make motion smoother, but does not decide destination, ownership or acceptable danger. The [RVO2 comparison](simulation-and-intelligence-evidence.md#e15--reciprocal-collision-avoidance-a-narrow-controller-can-be-useful-below-cognition) illustrates that narrow responsibility.

Do not merge unique objects merely to reduce entity count. Interchangeable stock can be summarized for a quantity query while instances with meaningful ownership or history remain distinct. The equivalence needed for a particular calculation is narrower than universal interchangeability.

## 8. Concurrency, shared resources and distributed causality

Independent context preparation and model calls can overlap. Consequences involving shared resources cannot be committed as though everyone had exclusive access to the snapshot they saw. Two characters choosing the last meal create a conflict to resolve, not permission to duplicate it.

A useful boundary is one authoritative owner for admission and mutation, even when proposal generation is parallel. Recheck facts that could invalidate the proposed operation: target identity, resources, permissions, bodily capability or the relevant commitment. An unrelated change elsewhere should not invalidate every answer; a blanket global revision check can waste valid decisions.

Partitioning the world by space can reduce local coordination, but relationships, trade, travel and messages cross boundaries. Partitioning by character can preserve private work but increase contention over shared places and objects. A generic actor framework does not settle ownership of the shared object. Choose partitions around real interaction patterns and preserve explicit transfer/commit rules.

Distributed simulations must decide whether they wait for causally earlier work or speculate and roll back. Rollback is particularly awkward once text has reached a player or a paid call has been made: an internal state reversal cannot undo those external effects. This argues for bounded speculative preparation and conservative commitment before inventing a fully optimistic distributed world.

Determinism is useful for native replay, but model outputs and external timing are not automatically reproducible. Record accepted proposals and outcomes at appropriate boundaries rather than assuming rerunning a prompt recreates a past decision. Saved randomness, ordered events and distinct hypothetical work should remain within current repository contracts.

## 9. Simulation detail at scale: preserve the individual contract

A low-detail background model may omit footsteps while retaining travel, consumption and a chosen destination. A more approximate model may summarize production or population change statistically. These are different contracts and should not share an ambiguous “sleeping NPC” label.

Before reducing detail, ask what another actor could interact with, what irreversible boundary might be crossed, and what evidence must exist later. A unique item transfer, a death, an overheard conversation and a passed deadline may require more exact treatment than an uneventful interval.

Increasing detail later must restore the same person, not generate a replacement consistent with a population average. Preserve identity, possessions, body, commitments, known relationships and the history actually represented. Do not fill gaps with invented testimony. A coarse event can remain coarse in the record.

Visibility is only one relevance signal. Someone far away may be approaching a meeting, controlling a shared supply, or interacting with another player. Conversely, an on-screen person following an unchanged route may not need generative thought. [Hitman](../dossiers/hitman-absolution.md), [Songs of Syx](../dossiers/intelligence/songs-of-syx.md), [Shadows of Doubt](../dossiers/shadows-of-doubt.md) and [CDDA](../dossiers/intelligence/additional-comparisons.md#cataclysm-dark-days-ahead) expose different tradeoffs rather than one universal recipe.

For a deliberately anonymous crowd, a simpler contract may be appropriate. That is a world/product decision to communicate, not an invisible optimization of promised persistent individuals.

## 10. Inference efficiency: distinguish several kinds of reuse

| Mechanism | What is reused | Main risk or limitation |
| --- | --- | --- |
| Stable context/description cache | Trusted unchanged data | Stale definitions, wrong observer or permissions |
| Exact prompt-prefix cache | Repeated input computation | Helps input processing, not all output generation |
| Existing chosen activity | A still-valid decision and its limits | Missing a consequential change |
| Known method library | A procedure, not the desire to use it | Hidden knowledge or outdated prerequisites |
| Semantic answer cache | An answer from a similar situation | Similar wording can conceal different obligations or meaning |
| Distilled/local policy | Learned mapping from context to choice | Distribution shift and loss of rare personal exceptions |

[Prefix caching](simulation-and-intelligence-evidence.md#e19--exact-prefix-caching-is-not-semantic-decision-reuse) is not the same as substituting one person's decision for another's. Shared model weights likewise do not imply shared memory. Keep the correctness and privacy argument specific to the layer.

Batching requests can improve utilization while adding waiting time. A live conversation and optional background reflection may justify different queues, but deprioritization should not indefinitely erase a person's opportunities. Deadlines, fairness and stale-work cancellation matter alongside average throughput.

A smaller model or Decision API can be appropriate for selecting among known options. A larger generative model may be needed when meaning, new possibilities or conflicting concerns are not represented. The boundary is empirical; a generative call is not automatically better, and a high action score is not automatically calibrated certainty.

Repeated paid retries are not a neutral reliability mechanism. Failures should remain distinguishable from valid indecision, refusal and a choice to wait. The repository's spending and retry policies remain unchanged. A provider outage should not secretly install a different goal policy to make the world look active.

## 11. Metareasoning: is another decision worth its cost?

A useful conceptual question is whether expected improvement from reconsideration exceeds its cost in delay, compute and disruption. That does not imply a known numeric formula for every character. The expected improvement depends on uncertainty, potential consequence and whether another method is likely to resolve it.

The confidence of a selected action, confidence in the evidence, confidence that all important options were considered, and confidence that extra computation will help are different quantities. [Simile's work](simulation-and-intelligence-evidence.md#e03--similes-newer-confidence-work-prediction-and-knowing-when-to-trust-it) supports treating error prediction as its own task, not reading certainty off a preference score.

A hypothetical escalation policy might consider an invalidated assumption, conflicting commitment, recent repeated failure, unknown entity or unusually consequential action. It should not require the cheaper model to fully understand the difficult situation before admitting that difficulty. Native impossibility checks, explicit unfamiliarity and an opportunity to request broader interpretation can complement learned routing.

Calibration must be evaluated on the deployment population and types of choices. A gate that is right on ordinary meals can still suppress every act of sacrifice. A low average error rate can conceal severe errors in uncommon relationships or cultures. Use consequence-weighted and subgroup/context-sensitive inspection, without pretending there is one universal scalar of character quality.

## 12. Evaluation: what would justify adopting a shortcut?

Start from a concrete existing episode and compare a small number of alternatives. Keep initial world conditions, known capabilities and relevant personal evidence controlled, while allowing legitimate variation in choice. Do not demand that every character produce the evaluator's preferred moral answer.

### Correctness and continuity

Check actual resources, permissions, effects, ordering, identity, cancellation, restoration and stopping. Verify that an interrupted activity does not duplicate consumed inputs or resume after its purpose is obsolete. Distinguish engine failures from cognition failures.

### Individuality and meaning

Change one relevant history, value or commitment while keeping the physical situation similar. Does the system permit a different choice? Can a person refuse, misunderstand, update a belief or choose leisure? Can the same action arise for different reasons without requiring a scripted explanation?

### Attention and recovery

Introduce ordinary disturbances, consequential exceptions and unexpected but meaningful information. Measure missed reconsideration, unnecessary reconsideration, time to recover and repeated invalid attempts. A gate's savings should include its own context and retrieval cost.

### Performance

Report native step time, simulation-to-wall-clock ratio, active population, candidate counts, memory growth, event fan-out, queue delay, decision latency, provider calls/tokens and end-to-end episode cost. Include tails and bursts, not just averages. State hardware, model/version, prompt conditions, workload and which setup or ingestion costs were excluded.

### Experience

Observe whether people can understand enough to act, whether pauses feel appropriate, whether relationships remain recognizable and whether quiet success remains satisfying. Eloquence, session length and a developer's favorite anecdote are not interchangeable evidence of enjoyment.

A more expensive model is one comparison, not an oracle. A simpler native controller, an explicit chosen sequence and deliberate omission are important baselines. The best result may be less architecture rather than more.

## 13. A practical order of investigation

**First: eliminate redundant work under existing semantics.** Reuse stable definitions and relevant projections, preserve chosen activity, and fix missing outcome evidence. These have a clearer correctness argument than population-level approximation.

**Next: examine why activity must stop or be reconsidered.** Identify supported dependencies and meaningful interruptions, including the cases a cheap gate misses. Retain open-ended attention instead of hiding every difficult case behind a cooldown.

**Then: compare bounded methods and specialized decisions.** Learn from existing action sequences and recurring failures before introducing a general planner or training a new policy.

**Only where measured need warrants it: reduce simulation detail, distribute authority or use approximate surrogates.** Define the lost detail and preserve the individual contract. The cost of coordinating a larger architecture can exceed the work it saves.

These are research recommendations, not an approved implementation sequence. Existing feature designs, maintainers and acceptance criteria remain authoritative. This guide does not allocate new design identifiers, prescribe new schemas, select providers or set production budgets.

## 14. What remains uncertain

The inspected sources do not establish which term dominates OpenLegend's present cost, the best model mix, the maximum sustainable population, or an acceptable deliberation interval. Those require measurement against the actual workload and character-experience goal.

Several questions are particularly discriminating: can an existing decision cover more native work without losing meaningful exceptions; can attention routing save total cost rather than only visible calls; does compact memory retain what changes later choices; and can background advancement preserve causal evidence across multiple observers? The NPC guide supplies complete hypothetical episodes for these questions.

A completed research pass can identify these uncertainties without pretending to settle them. No runtime change or benchmark claim is made here.
