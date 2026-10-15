# Intelligent simulation evaluation: technical design

| Status      | Current progress                                                                                               | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The comparison design is prepared; implementation, live behavior and player-experience qualification are open. | 2026-10-15   |

## Scope and guarantees

Implement the [feature specification](intelligent-simulation-evaluation-feature-spec.md) by extending existing decision diagnostics, profiling and scoped evidence reports. This is design only. No runtime behavior, database, provider configuration, thresholds or spending policy changes in this documentation task.

The research headings and conditional ND20 relationship are identified in the feature specification. No new ND identity or competing acceptance system is introduced. Behavioral delivery remains CE05/AG12/CR12, computation attribution remains PF00/PF11/PF14 and spatial/storage owners, and wider operating qualification remains PS08.

The first delivery is a reproducible comparison of the current complete path. A proposed routing or shared-preparation change must have an attributed problem and matched baseline before implementation. Calibration and learned routing are later conditional experiments, not a mandatory architecture or a reason to delay ordinary character improvements.

## Existing owners and actual callers

| Responsibility                         | Existing owner and entry point                                                                                     | Required treatment                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Actor opportunity, route and execution | `apps/server/src/ai-director.ts`: `submit`, `considerThought`, `decideAttempt` and the existing call wrapper       | Observe the ordinary director; do not call a provider around its admission, budget or current-world checks                      |
| Decision context and action choices    | `decision-context.ts`: `prepareDecision`, `refreshDecisionActions`, `selectDecisionActions`; `action-retrieval.ts` | Retain actual candidate selection, missing evidence and offered exact bindings; never substitute an answer-key shortlist        |
| Attention and route questions          | `jev-questions.ts`, `level1-selection.ts`                                                                          | Record actual question/policy version and outcomes; keep independent questions batched under existing limits                    |
| Permitted history and freshness        | `history-preparation.ts`, `recall.ts`, `SqlGameRepository`, conversation projection                                | Reuse request-owned sources and current privacy/version fences; do not create another writable memory store                     |
| Model execution                        | `packages/ai` client/types, configured Macrofold adapter                                                           | Keep typed failures, actual capabilities, receipts, current delivery mode and cancellation; no model-internal assumptions       |
| Spending                               | `cognition-budget.ts`: `DecisionLedger`; durable repository/provider records                                       | Reconcile request identities, reservations, settled usage and uncertain completion through existing accounting                  |
| Diagnostic records                     | `intelligence-log.ts`: `IntelligenceLog`, existing authorized inspector                                            | Extend current root/child records only where a measurement is missing; no parallel trace database or inference on inspection    |
| Runtime spans and work counts          | `performance.ts`: `timed`, `timedSync`, `countMetric`, `observeDurations`, `performanceSnapshot`                   | Use bounded existing capture; profile actual callers and account for instrumentation overhead                                   |
| Native and full-server profiling       | `scripts/profile-native.ts`, `scripts/profile-server.ts`, `scripts/performance/profile-server.mjs`                 | Reuse compatible scenario/parser, disposable PostgreSQL lifecycle and real timer/client paths; extend only missing observations |
| Accepted effects                       | `WorldService`, existing domain transition/action owners and durable command receipts                              | One mutation owner validates and commits; instrumentation observes, never grants action or semantic authority                   |

Package boundaries remain unchanged: domain computes deterministic serializable effects; spatial computes renderer-free geometry; server controls scoped preparation and service; AI transports typed requests; protocol exposes permitted observations; client presents them. New numerical observations stay beside their semantic owner rather than creating a general-purpose instrumentation package.

## Data flow and comparison boundary

1. Select a scoped existing scenario under CE05/AG12/CR12 and an observed failure or full-path cost. Name the pre-change source commit and current semantic contracts.
2. Prepare matched independent worlds using existing authored fixtures and disposable PostgreSQL tools. Preserve initial definitions, people, learned methods, accepted purposes, permitted evidence and saved randomness. Never use the developer's live database or private save as a benchmark fixture.
3. Admit the ordinary player/NPC opportunity. Its existing root identity links intake, context, attention, recall, route, selected proposal, provider attempts, validation and accepted effects. Native-only, deferred and unavailable cases remain visible roots without invented calls.
4. Record selected-source coverage and exact supplied choices before provider dispatch. Record newly arriving relevant evidence and the real freshness result after asynchronous work.
5. Let existing admission and execution owners act normally. Observe accepted steps, costs, interruption, remaining work and satisfaction; do not force continuation to make the episode finish.
6. Reopen or return after the selected interval. Offer the normal later opportunity and observe actual relevant recall and conduct. A provider result from the old world generation cannot enter the new one.
7. Aggregate root/child measurements and actual outcomes in the existing verification report, with failed/incomplete runs and cost uncertainty retained. Compare matched evidence rather than summing unrelated microbenchmark gains.

A comparison has two distinct uses: replaying accepted native inputs can establish equal mechanics; independent model runs establish observed behavior under matched opportunities. They must not be described as deterministic reproduction of a model's future choices. Divergent actions legitimately cause divergent later worlds; preserve and analyze that trajectory instead of forcing an identical success path.

## Selected-mode qualification through existing records

The feature's [October 15 comparison matrix](intelligent-simulation-evaluation-feature-spec.md#selected-october-15-comparisons) adds no second authoritative history or metric store. Extend the existing scenario manifest and root/child diagnostic capture with the actual installed native evaluator, communication source form, reaction-policy revision and supplied alias/option bindings. Retain supplied options and chosen operation identity once at preparation; use the accepted native receipt to identify the actual amount and source. Never recover the operation later by parsing a generated explanation, a caption or an alias whose request has expired.

For exact advancement, replay the same admitted command/interaction stream through ordinary and calculated native paths with equal starting definitions, clock, identities and saved RNG. Compare the ordered relevant event/evidence stream, work/stock/body changes, remaining work and current-format reopen, not just end totals. Include two moving bodies intersecting between endpoints, a third actor entering hearing/reach, earliest depletion/threshold, concurrent shared stock, stop/death, lost support and a definition change. Current installed sampling rules remain the reference until their own contract is deliberately changed; numerical arithmetic tolerances cannot excuse a different injury, recipient or random-attempt order. A family lacking a proved bound uses its ordinary bounded native path; report that fallback's real cost instead of claiming universal acceleration.

For communication and emotion, distinguish a fixed accepted-input replay (mechanics/privacy/deduplication) from independent live semantic choices (meaning/personal quality). Exact dialogue and compact meaning may lead to different legitimate replies; evaluate preservation of the supplied consequential information, permitted uncertainty and later opportunities with the written rubric. Assess sarcasm/conditional assent, a hidden private motive, different prior relationships, a late listener and a heard statement corrected during preparation. The actor-facing evaluator cannot see the other participant's undisclosed reason.

Exercise a numerical reaction that commits without `speech`, thought narrative, justification, expressive act or a new goal. Confirm its actual before/after value or source-linked intensity, lifetime, source ownership and later context via existing appraisal/meter and experience owners. Repeat same-cause replay, concurrent new reaction, correction/forgetting during an awaited read, expiry/decay, stopped work, restore and rejected stale publication. A selection probability/rating is never used as the proposed meter value; a supplied operation binding determines that amount. A valid spoken contribution and a rejected private reaction retain the distinct operation results and cannot roll back already heard words.

Compare defined short aliases with full labels using actual returned token usage when available, counting legend and offered-choice overhead. Missing tokenizer/usage data remains unknown. Compare structured generation and selection-only interpretation at equal installed options before expanding novel-language coverage; count candidate construction and all attention/recipient/reflection calls, including no-change choices. Do not require another call just to verbalize or audit the emotion. A zero generation-dispatch assertion is distinct from zero inference, latency or provider cost. Human-readable inspection is a derived rendering of accepted records and never a new inference on opening the inspector.

## Minimal comparison record

Use a compact typed fixture manifest owned by the existing selected comparison tool, plus the existing diagnostic records. This describes required fields, not a new production schema or an instruction to repeat full world state in every row.

| Information            | Required contents and reason                                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comparison identity    | Existing run identity, scenario family, variant, repetition and tuning/calibration/evaluation partition; prevents accidental mixing                                          |
| Reproduction           | Source commit, installed definition/profile revisions, world seed, relevant initial accepted state and fixture version; distinguishes changed mechanics from changed routing |
| Person and permission  | World/actor identity, generation, permitted source scope and current grants; keeps private comparisons independent                                                           |
| Model and instructions | Actual requested and reported model revision, adapter, rubric/context versions, route availability and Jev-only setting; missing reported revisions stay unknown             |
| Operating envelope     | Host/device/runtime, clock settings, actual elapsed/progress, concurrency, cold/warm state, retained history and local density; makes denominators interpretable             |
| Episode rubric         | Initial opportunity, acceptable alternatives, relevant exception, completion/stop condition, later-return opportunity and observation window                                 |
| Actual disposition     | Proposed, admitted, completed, refused, deferred, stale, cancelled, unavailable, invalid or uncertain, linked to existing outcome/receipt identities                         |
| Judgment               | Separate mechanical, personal, social and presentation finding with source references, evaluator type, ambiguity and disagreement                                            |
| Complete cost          | Existing child request identities and ledger/receipt links, attributable native/store/presentation work, unresolved exposure and excluded/unavailable measurement            |

Use exact stable IDs internally, scoped by world, actor, generation and record kind where those distinguish meaning. Composite keys follow [the identity contract](../identity-and-references.md#contract), not concatenated strings whose components may contain delimiters. Labels and names remain human display text. Model-facing context retains ordinary compact prose and allowed references; comparison metadata and internal IDs are not added to every prompt.

Version the fixture/rubric when its interpretation changes, and record existing instruction and definition revisions; do not introduce compatibility aliases or `V2` record families. This is an experiment-version distinction, not legacy-save support.

## Mechanical versus personal judgment

Mechanical checks read authoritative effects and receipts under operator permission: actual material use, accepted consent, health changes, work timing, resource conservation and publication. Personal judgments receive the actor's permitted evidence and authored perspective, plus the observed action/result needed for the rubric. Hidden knowledge can establish a world effect without becoming information the character should have acted on.

Use explicit observed alternatives rather than a single expected action. A satisfied person resting, a justified refusal and changed plans can all pass their applicable dimension. Missing relevant evidence is classified separately from a model ignoring evidence that was present. Unavailable services and never-admitted opportunities are not personal refusals. Repetition is evaluated against the actual current purpose and outcomes, not an arbitrary novelty quota.

Counterfactual cases change one relevant variable, such as earlier care versus no such experience, or designated personal material versus ordinary interchangeable stock. Keep the remaining permitted inputs and mechanics matched. Include alternative interpretations and an unchanged control. Observed sensitivity is evidence about the inputs' influence, not recovered hidden reasoning.

Separate evaluator disagreement and insufficient evidence from success/failure. Human reviewers see a compact episode chronology with permitted observations, choices and consequences, rather than a persuasive generated account of why the person acted. A more capable model may help organize a separately authorized comparison, but cannot be the sole oracle or silently label its own answer correct.

## Conditional routing and calibration

### Begin with a consequential error

Before a route experiment, record the actual missed information or unnecessary cost, current route, available time, reversible/irreversible consequences and existing no-change alternative. Distinguish a preparation bug from a route-selection problem. Fixing missing required evidence through its owner is preferable to buying deeper interpretation of incomplete input.

The initial comparison preserves the current routing, configured models and limits, including Jev-only guards, combined/dependent judgment paths and explicit abstention/defer outcomes. The observed API answer probability, reported confidence and action rating are different quantities. None is called calibrated correctness merely because it is numerical.

### Calibration data and unavailable capabilities

If representative traces justify a learned or statistical comparison, define the target error label first: unsupported action, disclosure, missed personal exception, avoidable replacement, false success or another documented consequence. Do not merge these labels into an unexplained universal quality target.

Group whole source episodes, continuations, paraphrases and related character/relationship variants before splitting development, calibration and held-out evaluation. Retain the group identity in the manifest. Fit choices and any threshold on development/calibration data only; freeze them before final evaluation. Report sample sizes, class imbalance, uncertainty, disagreement and natural versus deliberately sampled rates separately.

Compare the existing route, a credible simpler rule and the candidate gate at matched allowance, counting the gate itself. Report missed important cases and unnecessary escalations by consequence class; an aggregate accuracy or call-saving percentage cannot hide an important exception. Evaluate cold input families, new definitions, unfamiliar action sets and outage cases. An API without hidden activations cannot support a hidden-activation probe; explicitly mark the feature unavailable and use only actually returned data.

No fixed threshold, trained model, vendor, training procedure or production promotion is selected. If no representative data exists, record that finding and stop the learned comparison at its prerequisite; complete the baseline and other independent stages. Do not fabricate synthetic preference labels as evidence of live personal quality.

### Cached decisions and unfamiliar cases

Preparation reuse and behavioral reuse require different proofs. Existing immutable public geometry or exact validated method compilation may be shared under its owner's dependency contract. A prior chosen route/action additionally depends on this person's purpose, permitted evidence, current action bindings, relevant risks/means and the policy/model version used to select it.

Start with request-owned reuse. An experiment retaining behavior across requests must name a complete dependency key and lifetime before implementation. Invalidate on relevant definition/ability changes, custody or stock changes, changed goals/work, new consequential evidence, correction/forgetting, consent, conversation membership where relevant, timeline generation and permission changes. A world-global revision is safe but may destroy useful reuse; a smaller key is acceptable only with proven complete coverage. Reuse never skips current native action admission.

Unknown dependency coverage, unfamiliar inputs or a missing calibration model means no experimental shortcut. Follow the already configured eligible route or its explicit defer behavior; it does not authorize generation, a new request or automatic paid retry. Preserve distinct stale, unsupported and unavailable outcomes. Cap experimental retained entries through the existing owner and linked limits review; do not invent an arbitrary retention number in implementation.

## Shared-computation experiment

For the measured operation, write the growth equation before changing it: callers × candidates visited × work per candidate, plus relevant queries, observers and retained history. Distinguish active people, inert objects, local density, stock lots, definition count, history size and simulation speed as independent axes.

Compare at least these relevant phases without multiplying them into a meaningless exhaustive product:

- Cold world/startup and restored-world reconstruction.
- Warm repeated reads at a genuinely unchanged scope.
- Relevant mutation and concentrated invalidation, including altered referenced definitions.
- Unrelated mutations that should preserve reuse.
- Increased retained history and unrelated objects, separately from increased living density.
- Ordinary and burst callers, with storage/lane delay and concurrent permitted reads where relevant.

Select only the matrix cells needed by the proposed optimization and the existing PF contract. Preserve complete answers and ordering; count candidates visited, bodies hydrated, definitions compiled, allocations or copied bytes where measured, SQL round trips and hit/miss/rebuild costs. No fixed scan cap may disguise missing choices. Exhausted or deferred preparation is incomplete, not absence.

Shared preparation stays immutable or request-owned. Share only matching fields, observer/permission scope and source snapshot; fetch missing material instead of repeating earlier reads. Long-lived derived reuse must have an owning lifecycle, bounded retention and complete invalidation. Restore reconstructs transient indexes from authority. No cache supplies a second editable claim about knowledge or work.

Movement evidence separates route-search preparation/worker wait, local collision/avoidance, actual travel, sensory consequences, publication and rendered feedback. A faster route helper is not faster complete movement. Existing spatial owners choose any optimization; this design adds neither a navigation system nor a new process per person.

Stop or revert an experimental optimization if constructing keys, copying results, tracking dependencies or rebuilding costs more than the eliminated work, if its complete-path benefit is inconclusive, or if it loses a required consequence. Record that negative result under the existing owner; no architecture change is required to declare a comparison complete.

## Metrics, denominators and accounting

Attach missing spans/counts to existing root/attempt records. Do not construct growing full histories merely for measurement. Capture exact dependencies and selected counts once at the existing preparation/admission boundary; retain current finite diagnostic capture and report explicit gaps.

| Stage                  | Required observations when actually available                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opportunity/admission  | Trigger source, coalescing/disposition, eligible versus admitted opportunity, queue age, real and simulation time                                                          |
| Preparation            | CPU/wall time, source rows/bytes selected versus hydrated, SQL and lane waits, cache rebuild/reuse, shortlist candidates visited versus offered                            |
| Semantic services      | Attention, recall selection, routing, embedding, generation, tools and reflection as distinct linked calls; model, input/output volumes, provider queue and execution time |
| Acceptance/native work | Freshness/admission result, validation time, actual native steps and elapsed simulation progress, resource effects, rejected/stale/partial components                      |
| Durability/delivery    | Mutation-lane hold, persistence round trips and waits, publication/SSE/network stages, browser main-thread/frame measurements when measured                                |
| Later return           | Requested versus retrieved relevant evidence, attribution/contrary evidence, actual opportunity and voluntary later conduct                                                |

Record p50/p95/p99 only with sample counts and a method adequate for the reported tail. Existing bounded last-sample distributions are labeled as such; they are not full-run quantiles. Separate cold, warm, steady and burst results and instrumentation-on/off costs. Report process CPU, heap/RSS and allocation/peak measures only when actually captured; phase-end heap is not measured peak.

Cost totals reconcile existing request/attempt/receipt identities exactly once, including linked background work, stale completions and late settlement. Separate provider charge, platform charge and local compute estimates. A shared preparation cost is recorded once, with its attribution rule visible. Report exclusive stage spans or explain overlap; summing concurrent wall durations does not equal episode elapsed time.

For conditional learned shortcuts, also report data preparation, labeling, training/calibration, retained artifacts and deployment/maintenance costs when incurred. Keep one-time costs separate from recurring execution, and state the observed reuse volume needed to recover them; do not present an assumed future volume as achieved savings. Human evaluation effort is a separate measured burden rather than a hidden free service.

For cost per real hour or simulated day, include actual measurement duration and achieved game time. Use the installed world's day duration rather than assuming an Earth day. State whether startup/drain and background maintenance are inside the window. A requested accelerated clock is not achieved progress; denied or queued decisions are not completed decisions. Retained identities, active bodies, opportunities, actual decisions and environmental operations have separate counts. Human reading/composition time is measured separately from server/provider delay.

For useful-completion ratios, publish useful completions, incomplete episodes and total cost, not only the ratio. A no-cost native check can establish zero provider dispatch; it cannot price the live path. Unknown usage retains its conservative hold. Preserve every available decimal place in reported Jev costs and scoped/cumulative totals under [the spending policy](../../.agents/rules/verification.md#jev-cost-reporting).

## Privacy, persistence and failure

Use the existing server-authorized inspector/export boundaries. The comparison may inspect privileged mechanics only under explicit operator permission; actor-facing input remains actor-permitted. Redact credentials and private information not required by the approved scenario. External experiment payloads require the existing scope/account/spending authorization; a local trace is not permission to upload a private save or train on it.

No new authoritative gameplay records are needed for baseline attribution. Existing accepted world effects, action history, receipts and spending retain their current durable owners. Comparison manifests and aggregate reports may be committed only as concise authored reproducibility/evidence documents; generated raw traces, screenshots, private prompts, trained artifacts and fixture saves stay outside Git. Diagnostic expiry does not erase accepted actions or real accounting, and absent diagnostics are reported as missing evidence.

Reopening validates the current format, advances the existing runtime generation and reconstructs transient measurements/caches. It does not replay provider calls to recover a comparison. Native save/load equivalence concerns accepted rules and subsequent inputs, not reproduction of a model's future outputs. Follow [save/load](../save-and-load.md#continuation-and-identity) and the root development-save policy; no migration or legacy reader is added.

Capture failure must not stop or alter ordinary native execution. Required preparation/admission failure retains its actual failure semantics; measurements cannot downgrade it to an optional missing log. Preserve distinct budget refusal, cancellation, deadline, unavailable provider, invalid output, uncertain completion, stale world and persistence fault. Neither inspection nor report refresh dispatches inference. No new retry/fallback policy is introduced.

## Implementation modules and dependencies

The focused [coordination tracker](../maintainers/intelligent-simulation.md) links these slices to existing work; this list defines delivery boundaries rather than assigning competing task IDs.

1. **Comparison baseline and rubrics:** extend existing CE05/AG12/CR12 scenario/report definitions with the episode/later-return record, legitimate alternatives and grouped evaluation splits. Depends on actual scenario availability, not calibration or a new service policy.
2. **Complete-path attribution:** fill specific missing observations through `IntelligenceLog`, `performance.ts`, repository diagnostics and existing profiling scripts. Depends on current request/receipt identities and relevant permissions. Preserve PF14 preparation rather than reimplement it.
3. **Measured shared preparation:** implement only a demonstrated duplicate at its semantic owner, with dependency/lifecycle review and full-caller cold/warm comparison. Depends on slice 2's observed cost, not a population-scale rewrite.
4. **Live episode and player evidence:** separately admit bounded live trials through current director routes, then assess ordinary visible play where appropriate. Depends on working native fixtures, credential/provider availability and explicit spending scope. Native fixtures do not close this slice.
5. **Conditional routing/calibration comparison:** only if slices 1–4 expose a route problem and provide appropriate representative labels, compare a small candidate with current and simpler routes outside production. Depends on grouped held-out evaluation and supported provider features; no production gate is silently enabled.

Estimate implementation size only after selecting the missing observations or measured duplicate; this design does not justify a large generic harness in advance. Each implementation plan names the affected actual caller, fields, work growth, acceptance owner and current limits before edits.

## Verification and completion criteria

Use focused existing checks and a small representative scenario where current tools lack coverage, following the repository's test policy. Do not prescribe authoring a new test suite. Static/content checks qualify this design only; no runtime or paid experiment was performed to create it.

Native qualification covers the ordinary director with explicit injected providers, zero external calls, stable action/resource semantics, privacy, unavailable/stale/uncertain dispositions, exact accounting linkage and current-format reopen. Database-dependent checks use disposable PostgreSQL. Cold/warm/invalidation measurements exercise the complete consuming caller, not an isolated helper.

Live qualification uses unchanged authored people and actual service routes under separately authorized caps, with ordinary and exceptional cases and a later return. Retain failed, inconclusive and adverse comparisons; an agreeable isolated choice is insufficient. Jev-only acceptance rejects any generative dispatch even if the episode succeeds. No provider call was made for this design; additional and cumulative task provider costs are $0.

Player qualification asks whether uncoached observers understand and value what actually happened; it is separate from native validity and engineer-assessed plausibility. Existing whole-life, mature-history, hosted capacity and operating-offer gates stay open until their actual evidence exists. A conditional experiment with a justified negative conclusion may be complete without adopting its technique.

## Decisions and open questions

The design chooses existing owners and comparisons over a new benchmark framework, and complete episodes over preferred-action agreement. Production routing, cognition thresholds, provider selection, operating budget and fidelity promises remain unchanged. This preserves a simpler delivery path while leaving learned routing available only when representative evidence warrants it.

No developer answer is required to implement baseline attribution and case definitions. Selecting production changes, a paid experiment outside existing permission, a new training/data destination or a changed operating promise requires resolving the corresponding question before dependent work. Merely marking it open in a report is not permission to proceed.

## Maintained records

- Implementation coordination: [Intelligent simulation](../maintainers/intelligent-simulation.md), reusing [AG12](../maintainers/agent-agency.md#ag12--behavioral-value-and-cost-separately-authorized), [CR12](../maintainers/cognition-redesign.md#cr12--acceptance-and-tokenlatency-evidence), [CE05](../maintainers/character-experience.md#ce05--integrated-character-quality-and-complete-cost-qualification), [PF](../maintainers/performance.md) and [PS08](../maintainers/product-scalability.md#ps08--broader-experience-and-scale-qualification).
- Limits and constraints: [Intelligent simulation](../limits/intelligent-simulation.md), [cognition](../limits/cognition.md), [native work](../limits/native-work.md), [spatial](../limits/spatial.md), [interface](../limits/interface.md) and [product scalability](../limits/product-scalability.md). Reuse current capture, request, work and spending envelopes; no new numeric allowance is selected.
- Counterpart: [Feature specification](intelligent-simulation-evaluation-feature-spec.md).
- Current contracts: [AI providers](../ai-providers.md), [memory](../memory-architecture.md), [performance](../performance.md), [profiling tools](../maintainers/performance-profiling.md), [identity](../identity-and-references.md#contract), and [save/load](../save-and-load.md).
