# Product scalability — technical design and staged plan

| Status      | Current progress                                                                                                               | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Native execution and admission contracts are specified; the selected fidelity questions and runtime qualification remain open. | 2026-10-15   |

**Status: proposed implementation design supporting accepted product direction, October 2, 2026. The October 2 design task delivered documentation only. No runtime work, new service, database migration, paid experiment, or deployment is authorized by this document.**

## Maintained records

- Research refinement: [Design/integration map](../maintainers/intelligent-simulation.md), [constraint map](../limits/intelligent-simulation.md) and [design completion plan](intelligent-simulation-design-plan.md).
- Canonical strategic behavior: [product scalability](../product-scalability/README.md).
- Player-facing specification: [feature specification](product-scalability-feature-spec.md).
- Delivery: [product-scalability tracker](../maintainers/product-scalability.md).
- Constraints and decisions needing qualification: [limits register](../limits/product-scalability.md).

## 1. Agreed documentation scope and risk

Create a cohesive suite from the converged design discussion, preserve secondary possibilities separately, and reconcile relevant existing cognition, time, perception, encounter, and participation documentation. Expected production logic changed: **zero lines**. The risk is semantic rather than executable: accidentally claiming a target is shipped, weakening private evidence or acknowledged outcomes, prescribing one world's laws for every world, or creating duplicate owners with conflicting rules.

Completion requires substantive canonical pages, a paired feature/technical design, a single focused tracker and limit inventory, linked extensions in existing relevant documentation, a preserved decision trail, and review of changed Markdown and link targets. No runtime benchmark or live model quality is implied by documentation checks.

## 2. Architecture constraints

Retain the domain as deterministic authority over admitted fictional transitions; the server owns permitted context, bounded work, spending, and publication; model execution proposes rather than authorizes. Reuse current state, history, plans, reservations, evidence, and lifecycle owners. Logical separation below is not a request for microservices or an ECS replacement.

| Responsibility                                    | Existing owner and extension                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Identity, body, inventory, work, resource effects | Existing domain authorities; retain one canonical state across detail modes                                               |
| Chosen goals and methods                          | Agency; extend continuing activities and cancellation without writing a parallel plan store                               |
| Occurrences and observer evidence                 | Perception/reaction intake plus sensory policies; add explicit aggregate episodes only under an admitted policy           |
| Focus and recollection                            | Cognition/memory; bounded input selection, stable focus, precise versus gist evidence                                     |
| Scene speech and obligations                      | Conversation and native commitment owners; validate completed beats before derived narration                              |
| Time                                              | Simulation-time owner; an explicit future calendar/mechanical separation, not reinterpretation of existing speed settings |
| Physical detail preparation                       | Spatial and simulation owners; reconstruct valid current work and poses, not replay history                               |
| Account departure and reentry                     | Multiplayer authority; bounded current-encounter continuation and correct private actor control                           |
| World policy and invention                        | Engine/world boundary and admitted definitions; capability inheritance with cost and lifecycle constraints                |
| Capacity and money                                | Existing host/work admission and accounting; differentiated workload envelopes, no fictional privilege bypass             |
| Durability and transfers                          | Current save/load and production-data owners; outcomes escaping a rollback scope require appropriate durable boundaries   |
| Shared campaigns                                  | A future bounded canonical campaign owner composed with local outcomes, not a global combat loop                          |

## 3. Proposed representation contracts

### Activity, not a second actor

An ongoing activity references its existing actor, chosen objective/method, admitted capability, current stage/progress, relevant resources, and causal evidence. It declares meaningful completion and interruption conditions through supported typed mechanisms. Private plans remain private; visual clients cannot receive hidden future routes or contingencies merely to interpolate motion.

Continuation can execute supported known steps. Choosing a new goal, consenting to a bargain, inventing a method, or changing a relationship is not automatically authorized by an activity envelope. Runtime or authored habits must retain their provenance; a cheap controller cannot silently become a replacement personality.

### Detail and activity policy

Keep mechanical fidelity, cognitive initiative rate, conversational resolution, and representation/network detail separately configurable. Each current activity has an admissible execution mode under its world's policy. Low-power mode reduces optional initiatives; it does not create owed optional decisions or erase actual obligations. Decisions and safety effects that remain required must have a bounded funded path or an explicit failure/admission rule.

The detailed implementation may begin with a small local mode enum behind its owner. Do not create a universal policy graph before an actual consumer requires it. Mode changes carry a policy version and reason sufficient to explain outcomes and diagnose exploits without exposing hidden world information to players.

### Mechanical family contract

A trusted family supplies applicable state, units and clock basis, dependencies, permitted operations, progress computation, earliest relevant boundary, invalidators, midpoint representation, and completion/interruption effects. It names whether the coarse result is equivalent, intentionally approximate, or unsupported. Definitions built from compatible families inherit these properties; composition is checked for shared resources and interactions, not assumed from matching names.

Unsupported combinations retain a declared fallback. A short generic natural-language description is not proof of conservative motion, safe approximation, bounded scope, or inventory correctness. Fresh capability families can remain unavailable in unattended regions until their behavior is implemented; ordinary authors should see an understandable restriction rather than write a second simulation.

### Scene contract

A scene identifies a bounded set of actual participants, scoped inputs, the issue being resolved, completed beats, ongoing choices, and permitted output operations. It is an interaction boundary, not an omniscient group mind. Recognition uses structural evidence such as actual conversation membership, shared work, or a contested encounter rather than periodic whole-world inference.

A beat can produce structured outcomes, optional exact lines, gist memories, and interpretation proposals. Only admitted completed outcomes enter canonical history. Unresolved future beats remain interruptible. Joint generation gets common evidence and legitimately supplied intentions; private independent choices may require separate actor-scoped work. Authorial world modes must explicitly state their different agency policy.

### Aggregate perception contract

A perceived aggregate represents evidence of a group or field: indistinct competing speech, a moving crowd, or broad commotion. It is not a synthetic entity that owns members' bodies, beliefs, or damage. It carries modality, observable extent/properties, uncertainty, time, and episode identity; permitted distinguished members remain separately referenced.

Group formation must not use hidden alliance, private goals, or unavailable exact identities as observer evidence. Focus policy selects distinguishable sources plus aggregate context before expensive cognition. Later focus does not retroactively yield words never understood. Source corrections, revocation, restoration, and knowledge changes remain subject to existing privacy/evidence invalidation.

## 4. Scheduling and interruption

An activity's predicted completion is not a committed future. Maintain bounded dependencies that can make its continuation invalid. On a relevant occurrence, materialize affected activities through that occurrence time, resolve resources and perceptions coherently, then continue, suspend, or reconsider using actual evidence. The roof/alarm scenario is a required consumer, not an abstract scheduling benchmark.

Coarse movement reaching an encounter boundary can produce an alarm or attack without per-footstep reasoning. Local actor and encounter owners still have to detect that boundary. Event-driven execution removes unchanged work; it cannot make unbounded real causal activity cheap. Unknown dependencies require a conservative fallback, not an infinite validity claim.

Do not independently advance a subsystem past an external event that can still arrive at an earlier unresolved time. Do not speculate irreversible effects into the future of live commands. Cross-region ownership and ordering details belong to the existing distribution design; this contract requires a coherent interaction boundary without mandating a particular transport.

## 5. Promotion, demotion, and arrival

Prepare detail according to reachable interaction and known preparation cost, not an entire named city or a fixed multiple of sight. Reuse preparation across overlapping observers. Background regions continue bounded admitted work; restoration need only materialize their valid present. Unsupported accumulated work is a capacity/admission issue, not permission to invent missing history.

Before an interaction or teleport commits, the required destination representation and capacity must be ready. A failed transfer retains a valid source-side character and truthful resource accounting. A transition must not duplicate identity, reroll encounters, erase damage, replace chosen methods, or manufacture a lethal state for a background-protected character.

Demotion requires that no remaining observer or tightly coupled interaction needs the detail being removed. Retain mode residency/hysteresis so boundary walking does not create thrashing. Already-contested events remain contested after observers depart. Distinct clocks, random choices, progress, and accepted scene beats must survive save/restore under their existing owners.

## 6. Participation and protection

Protection is an explicit world/entity policy over named outcome categories and supported entry conditions. It is neither an inference-budget tier nor universal physical invulnerability. Check proposed background outcomes and the detailed continuation they establish; do not merely test whether death was recorded offscreen.

Account departure does not grant the simulation authority to invent a human's new goals, thoughts, purchases, or long-term adventures. A world may finish a bounded already-engaged encounter using standing choices or a disclosed continuation policy. Explain the affected scope before participation. Preserve reconnect ownership and the resulting aftermath; world rules decide death, revival, recovery, or permanent loss.

A logout warning uses currently permitted player evidence. It must not reveal an unseen enemy. Closing a browser or losing the network cannot always show a warning; the published policy must remain coherent without successful UI delivery. Distinguish client disconnection, deliberate logout, server failure, and administrative restore; no unearned safe exit or silent expansion of absentee control follows automatically.

## 7. Capacity, economics, and global campaigns

Admission considers interaction costs, existing obligations, future effects of admitted mechanics, and headroom, not only player count. Tightly interacting cells form one cost problem even when owned separately. Clear congestion boundaries and declared venue rules are preferable to an accepted encounter that becomes inconsistent. Technical load cannot silently change enemy reasoning quality or suppress a legitimate attack mid-fight.

Cognition is bounded by eligible opportunities, context, generation/reflection/selection costs, and fair budgets. A more capable baseline for highly scrutinized characters is a configurable evaluated policy, not a guarantee that a costly model follows every rule. Body authority and privacy validation remain outside generation.

A shared campaign owns bounded canonical strategic facts. Local encounters stay local. Validated uniquely identified outcomes affect explicit power sources, logistics, fronts, and campaign phases. Receipts crossing world boundaries must survive the applicable rollback policy. Forecast publication carries uncertainty and revision reasons; the campaign cannot force a prevented invasion to happen merely to keep its announcement accurate.

## 8. Delivery stages

**PS01: preserve the target and reconcile owners.** Deliver this documentation suite and explicitly distinguish current execution from future policy. No runtime changes.

**PS02: one interruptible life.** Extend one existing activity family and its agency continuation. Demonstrate work, resource exhaustion, alarm, damage, cancellation, and restart with scoped evidence and no per-step generation. Decide the smallest policy vocabulary from these cases.

**PS03: one cheap unattended community.** Add low-power initiative and a small set of coarse-capable activities, with viable needs, obligations, bounded background scheduling, and no accumulated optional-thought debt. Prove travel and partly completed construction can resume in detail. Isolate unsupported mechanics explicitly.

**PS04: one coherent scene and perceptual crowd.** Add completed scene beats, gist/exact evidence, focused speech, and aggregate visual/acoustic episodes through existing owners. Test secrets, unwanted focus changes, unrecognized identities, partial speech, and midscene arrival. This is an explicit semantic extension, not a silent optimization of existing exact evidence.

**PS05: safe absence and local transitions.** Integrate overlapping players, preparation, teleport admission, protected-background outcomes, dangerous logout, reconnect, and world-specific aftermath. Test mode cycling, wolf-entry traps, attacks followed by departure, and network loss. No new deployment topology is prerequisite.

**PS06: community admission and sustainable economics.** Measure concentrated and fragmented occupancy; implement declared capacity responses and fair budgets for the supported envelope. Test after-admission load growth, party/reconnect/resident access, low-power liveliness, and long absence without claims of million-player qualification.

**PS07: federated participation and one campaign.** Introduce compatible-domain opt-in and a small multi-community campaign with finite power sources, local fronts, published forecasts, player-caused schedule changes, and durable nonduplicated contributions. A city-by-city siege demonstrates local participation and one coherent antagonist history.

**PS08: broader scaling and quality qualification.** Expand only after the small end-to-end cases are compelling at measured cost. Operational distribution, larger fleets, and disaster recovery retain their own plans. Do not replace a failed quality test with a larger synthetic population count.

The [tracker](../maintainers/product-scalability.md) owns completion state; this section owns sequence and dependencies, not a second checkbox list.

## 9. Verification and completion gates

Documentation verification checks Markdown structure, relative links/anchors, changed-file scope, status language, preservation of prior useful meaning, and whether every consequential rule has a canonical owner. Runtime verification is future work and must record actual evidence separately.

Runtime scenarios must cover: unseen invader versus heard alarm; simultaneous depletion and interruption; scene arrival before/after a committed promise; gist versus exact quotation; focus without omniscience; damage despite inattention; protected arrival; logout during accepted conflict; reconnect after aftermath; event replay without reroll; incompatible creation/import powers; duplicate global contributions; and invasion prevention after a published forecast.

Compare equivalent boundary histories where exactness is promised. Where approximation is intentional, compare distributions and player incentives, not identical microscopic traces. Measure latency, cognition cost, background work, retained memory, error rates, and experienced continuity together. A mode switch that rewards exploitation is a failed design even when its output is individually plausible.

## 10. Unresolved implementation choices

Do not freeze attention counts, cell sizes, preparation radii, encounter deadlines, grace periods, world capacities, model SKUs, prices, or rollout dates in this design. Select them from meaningful experiments and record the decision in the [limits owner](../limits/product-scalability.md). Policy choices about protected outcomes, human absentee behavior, clock assignments, domain imports, and campaign participation must be resolved before the affected stage is activated. None authorizes weakening existing authority or durability to make a benchmark pass.

## 11. Research refinement: one authoritative world under efficient execution

**Design continuation, October 15, 2026.** This section specifies the common execution/admission boundary for IS06–IS08 in the [integration map](../maintainers/intelligent-simulation.md). It refines this existing pair rather than defining a second simulation. The first fidelity and prospective gist policies await the developer answers in the [design plan](intelligent-simulation-design-plan.md); no dependent approximate family, harm rule or new service promise is selected by these independent contracts. [Constraint map](../limits/intelligent-simulation.md) records that distinction. Earlier broad PS03–PS07 targets remain proposals with their own decisions.

### 11.1 Current code and reusable responsibilities

| Owner                                                                                       | Current responsibility to preserve                                                                            | Refinement and caller boundary                                                                                                                                                   |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/domain/src/kernel.ts` — `advanceWorldSlices`                                      | Deterministic bounded native advance with coherent publication points and explicit unadvanced time            | Remains the sole time/effect path. Alternate preparation may provide a narrower proved boundary; no independent actor/region writes past this committed prefix.                  |
| `packages/domain/src/simulation-time.ts`, current action/status/movement owners             | Rates, thresholds and meaningful native deadlines from installed state                                        | A family owns validity and stopping facts; the coordinator combines their earliest relevant boundaries, not a world-wide library of survival rules.                              |
| `packages/domain/src/work-budget.ts`, `native-work.ts`                                      | Actual native demand, interval/invocation work and release                                                    | Use existing finite work categories and group limits; do not classify an activity as free because it has no model call.                                                          |
| `apps/server/src/world-service.ts`, `host-work.ts`                                          | One world mutation/publication owner, admitted live/candidate capacity, rollback of reservation before commit | Off-lane preparation returns read-only proposals. Candidate liability remains reserved through SQL; only the commit owner publishes actual effects.                              |
| `apps/server/src/actor-work.ts`, `ai-director.ts`                                           | Actor-private coalesced opportunities, fairness, current decision admission and cancellation                  | Preserve separate native CPU, decision opportunity and external-spending admission. Do not add a second scene/region queue or paid gate per physical slice.                      |
| `apps/server/src/work-lane.ts`, `postgres.ts`, command/response receipt owners              | Bounded queued requests, ordered transactions, exact outcome recovery                                         | Queue expiration precedes execution; uncertain committed results recover by identity. A save/decision retry is never inferred from a transport failure.                          |
| `world-composition.ts`, exact installed definitions and world-owned trusted implementations | Finite supported family meaning and selection                                                                 | A family may opt into an implemented equivalent/approximate evaluator only under its selected policy and dependencies. World text never installs code or grants host privileges. |

No new package, background actor store, region replica, database, broker or worker pool is required for this scope. `HostWork` currently coordinates allocations within one process; distribution requires its own qualified admission/ownership contract and is not obtained by adding worker threads.

### 11.2 Prepared work is not authoritative future state

The coordinator handles three questions independently: which exact native work can safely advance; which person has an opportunity to reconsider; and which optional presentation detail to prepare. A useful answer to one never authorizes the others.

A family's interval preparation is an immutable derived value tied to the same exact actor/action invocation, physical life, installed definition pins and committed input snapshot. It contains only the calculation needed to establish its validity bound, required inputs and earliest meaningful stop. This is a conceptual contract implemented at current family helpers; do not add a universal serialized “activity certificate” object when the existing sampling/deadline owners already supply the answer.

For any genuinely new evaluator, its owning design must specify:

- Exact reads and writes, units, clock and complete dependencies; shared stock, route/body/geometry, current conditions, observed audiences and exact consent/grants where consumed.
- Maximum eligible interval and the earliest completion, depletion, contact, arrival, threshold, observer or policy boundary. Unknown cannot certify an infinite interval.
- Whether its output is equivalent, explicitly approximate or unsupported under the installed rule. An average estimate cannot enter an exact effect slot.
- Deterministic resource and randomness handling, participant ordering, partial-progress representation, actual outcome recording and the explicit stop/refusal path.
- Interaction with another admitted family. Independent proofs may be composed only when shared resources and cross-effects are covered; two individually valid outputs do not each own the same remaining stock.

Select conservative eligible work before preparing bodies, paths or histories. Deduplicate calculations at their existing owner; do not infer cognitive irrelevance from spatial distance. Every actual observer and affecting participant remains part of the causal boundary even if no human is looking.

### 11.3 One complete operation

1. Read current committed world and exact invocation through the existing mutation/intention owner; select only installed supported families. Existing current authority and knowledge checks retain their owners.
2. Share immutable target-independent definition/geometry preparation, then calculate participant-specific dependencies only for eligible work. Required route preparation retains the existing technical hold and stays outside mutation; no artificial hunger accrues while that hold applies.
3. Reserve the complete native and external liabilities before dispatch. A native allowance cannot spend money; an account allowance cannot exceed CPU admission or buy fictional permission. Retain the operation's exact prepared data through awaited reads rather than retrieving a replaceable recent cache again.
4. At publication, recheck current authority, definition/body/life, exact resource/consent and relevant evidence dependencies. An unrelated distant edit need not invalidate a local result when the owning dependency contract proves independence; incomplete coverage conservatively rechecks.
5. Advance only the earliest permitted prefix through ordinary native effects. Reconcile simultaneous boundaries using current deterministic ordering; continuous swept movement and native safety tests remain responsible for actual contact, reach and support. Never commit a future stock transfer and later “correct” it after a human has used it.
6. Record actual occurrences and each observer's permitted evidence once through existing owners; preserve partial failure and remainder. Commit coherently through normal persistence, acknowledge only the captured intake reasons, then publish permitted views. New evidence arriving during work remains pending.

A refusal or deferred result says what is unavailable without inventing fictional indifference or a successful outcome. A family's missing exact representation cannot be repaired by generated narrative.

### 11.4 Mid-activity interaction, cancellation and recovery

| Situation                                                               | Required result                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Another person approaches or an actual observer gains relevant evidence | End the prepared interval before its dependency no longer holds; materialize the same current people and partial work. Do not invent a separate meeting location or history.                                                                                                  |
| Material is taken or exact consent changes during preparation           | Revalidate the same operation; refuse/suspend through its existing owner when actual terms no longer hold. Earlier committed debits/outcomes remain.                                                                                                                          |
| Actor stops, dies, departs or begins different work                     | End only the affected activity/relationship under its installed lifecycle. A released independent effect retains its own owner; cancellation does not erase an in-flight projectile or paid charge.                                                                           |
| Capacity is unavailable before optional work is admitted                | Explicitly defer/refuse new work. Preserve admitted obligations and current exact physical effects under existing holds; do not solve overload by discarding audience evidence.                                                                                               |
| A queued request expires or a provider reply becomes stale              | Retain distinct expired/stale/cancelled/failed outcomes and actual accounting. No automatic paid catch-up or replay.                                                                                                                                                          |
| Server stops or gameplay is restored                                    | Save canonical action cursor, partial quantity, pending native remainder, definition pins, selected terms and RNG through their current records. Rebuild derived indexes/preparation; fence callbacks with current generation and preserve external reservations/uncertainty. |
| A new world definition is installed/removed                             | Same validation and supported live-change owner decides whether resumable work remains valid. Historical finished facts remain interpretable without creating fresh execution rights.                                                                                         |

No new schema is mandated by caching an interval. If a selected family genuinely requires additional durable progress, add it to its existing record/catalogue owner and current-format validation. Follow the root no-legacy policy; this design does not authorize migrations or silent reinterpretation. Account/session authority, money and private forgetting remain outside gameplay rewind.

### 11.5 Separate engine capability, authored law and operating service

The engine enforces identity, one committed outcome, exact protected rights, supported type/definition relationships and bounded calculation. A world selects which family exists, its rates, observation/disclosure, accepted fictional risk and whether a proved alternate evaluator is permitted. The server chooses measured operating batch/concurrency under those contracts and reserves real money/capacity. The interface describes current committed state and technical waiting; it has no authority to choose a simpler fictional law.

A contrasting hypothetical maintenance machine can retain charge, part wear, chosen work and a touch-only sensor instead of hunger, anatomy and speech. The same typed work/dependency/admission mechanisms apply without installing human social urgency or a universal “seek food” branch. This is a design contrast, not claimed implemented gameplay. Conversely, a base-world camp may use human-like activities while keeping their content and vocabulary under its authored package.

An invented method inherits only the guarantees its actual installed dependencies compose. A new spell described as “instant travel” has no equivalent physical interval evaluator merely because walking does. Its unsupported or costlier route remains explicit through existing authoring/admission, without automatic engine invention or a special named-spell exception.

### 11.6 Growth, bounded work and measurement

**Growth:** active invocations and observers, supported family combinations, movement/geometry density, shared resource contention, queued/in-flight replies and retained exact evidence. Per-actor finite work does not bound the number of actors, interactions or wakeups. A future connected scene can cause real work proportional to its legitimate audience.

**Shared preparation:** reuse current immutable definitions, existing spatial candidates and exact request-owned scope/body facts. Cold rebuilds and concentrated changes are measured separately; no cache of current consent, private interpretation or native authority. Unknown invalidation coverage recomputes through current owners.

**Invalidation:** body/life, exact action instance/cursor, resource/custody, installed definitions, geometry/support/motion, applicable clock boundary, observer eligibility, consent/grants, evidence correction and restore generation. Do not key a timed display only to an unchanged entity object, or a current permission only to a route cache.

**Measurement:** use existing PF tooling through actual server/native entrypoints. Compare equal authored input and admitted subsequent commands, save/reopen and enter/leave cycles; preserve exact output/order/RNG where equivalence is claimed. Count selected/visited candidates, actual SQL and bytes, interval preparation/rebuilds, queue wait, retained heap/RSS, cold/warm/burst/tail latency and all model work. Record active versus retained people and real versus simulated duration. Do not infer a community capacity from one interval or one successful known method.

Before increasing population or approximating outcomes, attribute redundant preparation, local allocation, geometry and publication work. A dependency index or distributed process is chosen only if its complete-path benefit exceeds maintenance/serialization/recovery costs. No new numeric limits are derived from research headlines; existing inventories remain controlling, with [IS constraints](../limits/intelligent-simulation.md) covering this refinement.

### 11.7 Integration stages and future acceptance

1. Inventory existing exact family bounds and current dependencies; link observed bottlenecks and existing delivery/evidence instead of relabeling them as missing architecture.
2. Implement only the smallest selected gap at its owning family/query/helper. First compare against ordinary detailed execution with fixed subsequent inputs and a materially different supported definition; unsupported/conflicting definitions refuse before effects.
3. Qualify actual preparation → wait → admission → native progress → persistence → scoped disclosure, including source change during waits, partial work, simultaneous resource contention, approach/observer entry, cancellation/death and restore. Do not require a blanket new test suite; use the repository's existing verification policy.
4. Compare a meaningful complete episode and later encounter through the [evaluation pair](intelligent-simulation-evaluation-feature-spec.md), including useful independent action, allowed alternatives and explicit service failure. A fast native helper does not qualify character agency or a human return experience.
5. Expand to the separately selected family or service only after its actual policy answers, full liability and evidence exist. Current multiplayer protection, clocks, unattended terms and coarse social proposals retain their own gates.

Design completion requires current owners/callers, precise independent contracts, selected policy boundaries, failures, bounds and this delivery breakdown to agree across the pairs. Implementation and measured acceptance remain IS06–IS09/PS/PF work, never consequences of a documentation checkbox.
