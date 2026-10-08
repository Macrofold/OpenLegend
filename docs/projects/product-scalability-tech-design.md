# Product scalability — technical design and staged plan

| Status      | Current progress                                                                                                                         | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The shared design is delivered; existing native activities are prerequisites, while PS02–PS08 integration and qualification remain open. | 2026-10-07   |

**Status: proposed implementation design supporting accepted product direction, October 2, 2026. The original suite-authoring task delivered documentation only. This document does not itself authorize runtime work, a new service, a database migration, paid experiments or deployment, and does not cancel later owner-approved work under the [root task policy](../../AGENTS.md#task-scope-and-authorization).**

## Maintained records

- Canonical strategic behavior: [product scalability](../product-scalability/README.md).
- Player-facing specification: [feature specification](product-scalability-feature-spec.md).
- Delivery: [product-scalability tracker](../maintainers/product-scalability.md).
- Constraints and decisions needing qualification: [limits register](../limits/product-scalability.md).
- Later product elaboration and selection: [continuing NPC lives](continuing-lives-feature-spec.md), [attention and scenes](attention-and-scenes-feature-spec.md), and the [game-first sequence](five-product-feature-specs.md#game-first-delivery-sequence). Their detailed technical designs remain deliberately deferred; this shared foundation does not claim those contracts are complete.

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

An activity's predicted completion is not a committed future. Maintain bounded dependencies that can make its continuation invalid. On a relevant occurrence, materialize affected activities through that occurrence time, resolve resources and perceptions coherently, then continue, suspend, or reconsider using actual evidence. A useful chosen activity interrupted by a legitimately heard alarm is the required consumer, not an abstract scheduling benchmark. Under the later PS02 product scope, existing gathering or finite crafting can provide that first personal contribution; the roof/alarm example remains a later construction case, not a prerequisite for useful follow-through.

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

**PS02: one interruptible life.** First improve one resident’s useful follow-through in the running personal game. Reuse one supported activity family and its existing agency continuation rather than waiting for an unattended community or a new construction family. Extend only the concrete completion or interruption conditions that the selected episode needs and the current owner lacks; retained goals and plans are already available, not new PS02 machinery. Demonstrate work, resource exhaustion, alarm, damage, cancellation, and restart with scoped evidence and no per-step generation. Decide the smallest policy vocabulary from these cases.

**PS03: one cheap unattended community.** Add low-power initiative and a small set of coarse-capable activities, with viable needs, obligations, bounded background scheduling, and no accumulated optional-thought debt. Prove travel and partly completed construction can resume in detail. Isolate unsupported mechanics explicitly.

**PS04: one coherent scene and perceptual crowd.** Ordinary directed conversation and useful interruptions can improve independently of PS03 unattended service. Add the broader completed scene beats, gist/exact evidence, focused speech, and aggregate visual/acoustic episodes through existing owners only under their scoped design and playability gates; existing instantaneous speech is not changed by this plan. Test secrets, unwanted focus changes, unrecognized identities, partial speech, and midscene arrival. This is an explicit semantic extension, not a silent optimization of existing exact evidence.

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
