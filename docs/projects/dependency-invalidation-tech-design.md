# Dependency invalidation and aggregate work containment — technical design

**Status:** approved and implemented for this project’s scope; [verification](../verification.md#foundation-priorities-15--implementation-evidence) records evidence and limits. [Feature specification](dependency-invalidation-feature-spec.md) owns behavior; [DI01–DI08](../maintainers/dependency-invalidation.md) decomposes EWF08. EPR05 remains the ActorWork/reaction owner, SW owns spatial queries and PF owns measurement. [Foundation package](foundations-1-5.md) records shared dependencies.

The source audit and staged sequence below retain the design baseline. Current behavior is in the linked canonical owners; focused trackers record completed delivery and separate parent work.

## 1. Baseline and architectural decision

At main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041`, [ActorWork](../../apps/server/src/actor-work.ts) stores input arrays, a dirty Boolean and separate wall/simulation deadlines. `refresh` scans cognitive actors and `inspected` clears the ticket; new generation-aware acknowledgment belongs in that existing class through EPR05. [view.ts](../../apps/server/src/view.ts) conservatively depends on whole immutable collections for visibility and inventory. [WorldChanges](../../apps/server/src/store.ts) describes persistence paths, not semantic query dependencies. None should be replaced by a second event bus, scheduler or reactive world store.

The hearing continuation's EPR tracker at `c4379246b8db98974de319e1f5315439ac8176bd` already specifies wake-during-processing preservation, actor-scoped intake and durable evidence before paid work. Reconcile it through DF02; do not implement a competing queue on this branch. The cadence branch has a distinct execution contract and must be reviewed before any phase/deadline integration; a dependency refactor does not authorize changing the clock.

Use small typed shared interfaces in proposed domain `dependencies.ts` and `work-budget.ts`, with native query providers and server subscription bookkeeping at existing owners. Keep definition dependencies, invocation lineage, invalidation dependencies and rights/disclosure relationships separate. They may share identity types; they are not one generic writable graph.

Protected integrity includes current authority, finite admitted work and no false absence. Query membership and budget accounting are reusable services. Native query predicates, phase order, recurrence and gameplay priorities remain admitted policies. Add no arbitrary expression evaluator or data-supplied callback.

## 2. Dependency records and complete query contracts

A computation identifies its owner, world/timeline, audience and definition pins. Its dependency report uses a closed union of supported dependency kinds:

```ts
type Dependency =
  | { kind: 'value'; owner: string; key: string; revision: number }
  | { kind: 'existence'; scope: string; entityId: string; revision: number }
  | {
      kind: 'membership';
      queryFamily: string;
      predicateVersion: string;
      scopeKey: string;
      parametersDigest: string;
      membershipRevision: number;
    }
  | { kind: 'geometry'; spaceKey: string; footprintKey: string; revision: number }
  | { kind: 'authority'; scopeKey: string; revision: number }
  | { kind: 'definition'; pin: DefinitionPin }
  | { kind: 'deadline'; clock: 'simulation' | 'operational'; due: number };

type QueryResult<T> =
  | { status: 'complete'; values: readonly T[]; dependencies: readonly Dependency[] }
  | { status: 'budget-exhausted' | 'unavailable'; dependencies: readonly Dependency[] };
```

Illustrative names are not a new frozen external protocol. Use opaque structured server keys internally rather than expose arbitrary key strings for models to subscribe to. Scope includes the actual world, actor/audience and relevant predicate parameters. Validate field shapes and exact installed query-family versions. A cached empty answer needs an existence/membership scope just as much as a nonempty answer.

Start with concrete query providers already consumed by the game: spatial sight/hearing/contact candidates, direct container contents, installed compatible capabilities, actor-owned state bands and knowledge. Each declares mandatory membership/existence dependencies and relevant property changes. Runtime recording of objects actually read supplements this contract but cannot discover an object that was absent from the previous result.

Do not narrow an existing whole-collection dependency until the replacement covers creation, deletion, membership, property/applicability, geometry, sense, knowledge, authority and definition changes relevant to that query. A conservative false-positive invalidation is acceptable performance debt; a missed new member is a correctness defect. Unknown provider coverage retains the conservative dependency or rejects the precision claim.

`budget-exhausted` and `unavailable` must not be cached as an empty complete result, unreachable path or inaudible audience. An optional UI may show an explicit incomplete/unavailable state. Mandatory native execution either obtains its complete supported result before acceptance or uses the safe failure boundary below.

## 3. Change production and subscription ownership

Semantic owners emit bounded `ChangeSet` metadata alongside their existing transition: changed values/bands, existence, old/new placement extents, membership scopes, applicable definition/policy revisions and lifecycle. Capture old scope before it is lost. Do not infer all semantic meaning afterwards from serialized SQL paths or optional diagnostic logs.

Examples: P1 availability changes update resource-query membership/values; P3 transfer changes old/new container revisions and affected root placement; body/sense changes update relevant sensing footprints; CR knowledge publication/correction updates the owning actor's knowledge generation. A telemetry update emits no mechanical dependency change unless it actually owns a consumed value.

Store reverse subscriptions in bounded, rebuildable indexes near the consumer. Spatial subscriptions use the existing spatial partition/query service; container queries index by parent; definition queries by installed family/predicate scope; actor-private context by owner. Do not store a durable row for every transient observer-target pair or scan one global dependency table for every step.

A changed source enqueues/coalesces an existing computation ticket, never recursively runs dependent simulation code during mutation. Required native phases keep their ordered kernel boundary. External/paid consumers wake only after the state and necessary evidence commit. Domain invalidation metadata cannot contain an executable callback or independently mutate another owner's state.

## 4. Revision-safe compute, install and acknowledgment

A dirty Boolean is insufficient as a completion token. Maintain a monotonically increasing dirty generation or consumed/produced watermark per existing ticket. The common contract is:

1. Capture the immutable input snapshot, current scope, current dependency revisions and ticket generation `g`. Leave its old subscriptions installed while computing.
2. Run the bounded native/read computation against that snapshot. Record mandatory and actual-read dependencies and its complete/incomplete status. Provider work follows its existing admitted context and attempt identity, not an automatic dependency retry loop.
3. Before installing the result and new subscriptions, compare the current relevant source/scope revisions and ticket generation with the captured values. The check and subscription swap occur under the consumer's serialized owner; asynchronous reads must not slip between validation and installation.
4. If valid, atomically replace old subscriptions with the new set and acknowledge only generation `g`. If a newer generation exists, retain its pending reasons/deadline. If invalid, discard the stale derived result and leave/mark the ticket dirty; do not clear the later wakeup.
5. Publication still uses P2's current audience/grant checks. A source-current result may nevertheless be forbidden after access revocation.

A mutation arriving while dependencies are being replaced cannot fall into a gap: keep old subscriptions until successful validation/swap, and compare broad owner membership revisions covering potentially new dependencies. New subscriptions alone are not proof that no relevant change occurred during computation.

Coalesce scheduling reasons as a bounded typed set plus authoritative source/evidence watermarks. Do not retain unlimited event payloads on the ticket. Distinct speech, acquisition and required awareness remain in their existing durable owners; one dirty ticket means “inspect pending work,” not “all these events have been consumed.” Attempted, admitted, completed and consumed evidence remain separate EPR/CR concepts.

After-commit notification is an optimization over durable state. Where missing a wakeup would change required behavior, persist the relevant due state/cursor/intake marker in the existing transaction and reconcile it on startup. A crash after commit but before callback cannot lose the obligation. A rolled-back transition cannot admit paid work; a harmless conservative recheck after a rollback is not a delivered event.

## 5. Spatial membership and occurrence-time validity

Register spatial dependencies over the provider's conservative query footprint and relevant dimensions/support, not just the last returned IDs. A source movement invalidates interested computations intersecting the union of its old and new extents. Within-cell movement still changes the exact-query revision; unchanged bucket membership is not unchanged visibility, contact or reach.

A stationary observer must respond to moving/changing sources. Observer movement, body/sense capability/range changes and relevant geometry changes invalidate its old and new footprints. A blocker can change results for targets behind it: conservatively invalidate queries whose sensing volume may intersect the changed geometry, not only queries that previously returned that blocker. Use the existing broad phase before exact native geometry; it may over-invalidate but must not miss valid listeners/targets.

Property changes affecting an admitted predicate—such as compatible reserve supply, portability or observable detail—emit both the property change and the appropriate membership scope. A definition/policy change can make unchanged objects enter a query. An actor's goals/needs/knowledge can change the relevance of currently exposed objects without fabricating a new sensory entry event.

P3 bag movement updates the root footprint and container-dependent computations. It does not persist every descendant's world coordinate or expose private contents as independent spatial objects. An authorized content query depends on containment and current disclosure, not merely the root's screen position.

Event audience calculations bind to the event's occurrence snapshot. Do not reuse the end-of-batch geometry to decide who heard earlier speech. A cache is valid only for its exact phase/snapshot/revision contract. Preserve native recipient ordering, intelligibility, recognition, sleep/capability checks and saved random draws. Current SW/EPR implementations own those rules; dependency metadata does not replace them.

## 6. Nonspatial membership and private context

A direct-container query depends on parent membership and relevant item/capacity/access revisions. First insertion into an empty bag and removal of its last item are both changes. Moving a lot between parents invalidates both scopes. A state change on an existing child invalidates predicates that consume that state even when parent membership does not change.

Installed-capability queries depend on exact family/interface/policy membership, not only resolved definition IDs. Installation/retirement and an admitted applicability update must affect previous empty results. Private known-capability queries additionally depend on the actor's learned/recognized scope; globally installing a definition does not teach it to everyone.

Knowledge, appraisal, recognition and source-eligibility revisions remain actor-owned. Correction, forgetting, grant loss and timeline replacement invalidate private contexts and derived interests before new publication. A dependency edge, debug counter, query rejection or cached name cannot reveal a hidden subject or another human's private note. Query/debug reads use the same audience as the result unless an explicit separate inspection capability applies.

## 7. Budget model and static admission

Use a vector of deterministic work units plus separate measured timing: candidate reads, exact native tests, bytes examined/output, effect groups, resource claims, subscription entries, active invocations, queued descendants, retained state and expansion depth. Wall-clock duration is useful telemetry and a safety signal, not a source of gameplay ordering or random outcomes.

Each reviewed query/effect family declares a conservative bounded cost envelope. A definition combines its selected operations with checked sums/products, finite selector output bounds and lifetime/recurrence constraints. Reject overflow, unbounded selectors, unsupported recursion and cycles that can execute repeatedly at the same simulation instant. Merely capping returned results after execution is not admission.

Review the complete combined expansion, not each leaf in isolation. A 100-target selector with 100 children per target requests up to 10,000 children even if every child is individually cheap. Exact bounds must account for simultaneously active and queued instances, scope changes and shared/per-invocation state. A reused immutable definition may share prepared metadata; that does not erase per-invocation effects or memory.

Inactive library definitions consume stored artifact space under their existing owner, not active execution allocations. Installed definitions reserve only their declared installation/subscription footprint and admitted active capacity; creating an invocation separately reserves its live demand. Do not introduce arbitrary small definition-count caps to avoid computing real work.

Candidate validation and current activation must both check applicable world/host limits; stale approval cannot overcommit capacity after another installation. Reuse INV's candidate/impact/activation identity and EWF's manifest. Operational limits are versioned configuration with explicit units and qualification evidence, not fictional laws or generated-model permissions.

## 8. Runtime charging, descendants and recurring work

All descendants inherit a stable root invocation/lineage and applicable actor/module/world/host accounts. Choosing a fresh child ID does not create a fresh root allowance. At admission, reserve the complete coupled native group's conservative requirement across relevant scopes atomically; on execution, charge actual validated work through mandatory native query/effect ports. Release unused reservations and terminal live allocations through the existing lifecycle owner, exactly once.

One-shot roots have finite cumulative descendant/work allowances. Persistent recurring processes instead require explicit positive simulation-time progression, a finite work allowance per interval, finite burst, maximum simultaneous children, bounded pending queue and bounded retained state. This lets a supported fire or long-lived process continue without granting unlimited work at one instant. It does not impose an accidental lifetime timeout on a persistent but inert appraisal.

Recurring credit is calculated from the admitted phase/time policy, not from the number of callbacks, retries or provider sessions. Do not bank unlimited catch-up credit during pause, downtime or dormancy. A child cannot reschedule indefinitely at the same simulation timestamp, and a feedback cycle is admitted only when the supported native policy proves positive time advance and bounded work per advancement. Otherwise reject the candidate before activation.

Persist gameplay invocation progress, root lineage, interval phase and outstanding allocation state needed for continuation. Host resource quotas and external spending remain outside gameplay rewind: loading an old save cannot create a new real-money budget or simultaneous host capacity. Restore reconciles current allocations against restored processes rather than adding saved reservations to live allocations twice. Exact external accounting remains with the existing ledger.

## 9. Required work, overload and containment

Classify work at its semantic owner:

| Class                                              | Exhaustion/failure handling                                                                                                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Atomic native action/effect group                  | Reserve its complete required work before acceptance. Reject before effects when admission fails; never commit an arbitrary prefix.                                                                                                  |
| Required already-owed native continuation/evidence | Preserve its due state and use an existing proven bounded continuation contract, or stop at the safe owner/world boundary before advancing past the unprocessed consequence. Never silently omit damage, recipients or elapsed work. |
| Optional cognition/presentation/report             | Use the existing bounded queue, current priority and honest deferred/unavailable result; no automatic paid retry or invented in-world explanation.                                                                                   |
| Diagnostics                                        | Bound/drop diagnostic detail under its retention policy without changing canonical gameplay or private disclosure.                                                                                                                   |

An admitted native implementation exceeding its declared mandatory envelope is a contract violation, not permission to truncate output. Discard the uncommitted candidate, retain the prior authoritative state and report/quarantine the narrow supported scope under the existing failure policy. Already committed effects remain history. If a required world phase cannot safely continue, use the current paused/error boundary and require explicit recovery; do not label skipped simulation time successful.

Reviewed native TypeScript is not a safely preemptible untrusted runtime. Work ports, bounds and cooperative phase boundaries limit supported operations, but an accidental infinite native loop is still a host defect. G2 executable isolation remains a separate conditional engineering project; this design does not claim a counter or timeout can safely sandbox arbitrary code.

Backpressure must bound queue age/bytes and retain required cancellation/reconnect paths. Do not make high-load semantics depend on an optional dashboard read. Deterministic phase order and RNG are unchanged; live wall-time scheduling selects when to attempt work, not a different physical outcome from the same admitted native inputs.

## 10. Existing scheduler and lifecycle integration

EPR05 implements generation-aware dirty/reason acknowledgment in the existing ActorWork class. Replace broad refresh scans only after creation/death/cognitive-capability removal and current source/deadline registration are covered. Reuse the existing due-work/earliest-timer pattern when measured useful; no second per-object scheduler or one timer per emotion/definition.

Operational provider backoff and simulation deadlines retain their separate clocks. Preserve existing interactive priority, global concurrency, cancellation and the bounded urgent-refresh policy. Dependency invalidation does not authorize a new paid retry. Required input evidence is durable before paid admission, and a stale completion is handled by the existing context/output validator.

Definition activation publishes dependencies and allocation changes atomically with the installed pin. Retirement removes only that definition's registrations and releases its owned live allocations after supported process termination. Source/target removal cannot leave dangling subscriptions or detach another source's effect. INV-5/EWF07 own incompatible live transitions; P1 owns contribution termination.

SL00 saves authoritative episodes, latches, due state, relevant consumed/produced cursors, active invocation lineage and recurrence progress. Reverse indexes, query caches and subscription lookup tables are rebuildable. Startup reconstructs them from current scoped state and pending durable work, in bounded batches before the affected feature accepts work. Rebuilding does not emit a fresh encounter or replay a previously consumed cause. New timeline/grant/definition generations invalidate previous cached tokens even when object IDs recur.

## 11. Delivery and validation plan

[DI01–DI08](../maintainers/dependency-invalidation.md) sequence the dependency coverage audit, typed changes, revision-safe installation, unlike query integrations, static/live aggregate budgets, EPR/lifecycle integration and qualification. P1–P3 can begin with conservative bounded dependencies; full P4 is not a circular prerequisite to creating their first native records. Their new contracts must expose the necessary changes from the start.

Planning envelope: approximately 2,000–4,000 production logic lines across shared metadata, existing owner adapters and budget/lifecycle integration, excluding separately tracked new EPR sensory semantics and cadence changes. DI01 replaces this estimate with a current caller/change matrix before implementation.

Use disposable native/manual scenarios and small one-off comparison runs under the verification policy, not a newly authored automated suite. Compare optimized complete query results with an independent complete native evaluation on matched immutable snapshots: membership, order, awareness, privacy and meaningful transitions must agree. Exercise empty queries, within-cell movement, changed blockers, new definitions, forgotten sources, updates during compute, rollback/commit-notification failure and restore. Existing CI and deferred regression coverage remain release requirements.

Budget cases include nested fan-out, overflow, individually cheap combined modules, competing aggregate reservations, child attempts to create new roots, positive-time recurrence, same-time feedback rejection, cleanup after source removal and save restoration without duplicate host allocation. Test real work ports and downstream callers, not only the static estimator.

PF records candidates/exact tests, index builds, subscriptions, dirty generations/coalescing, queue age/bytes, descendant/live allocations, native mutation and publication tails, memory and cold/warm rebuild cost. Keep counters in existing bounded telemetry, not one SQL write per sample. Qualify the accepted mixed-world workload separately; no performance or capacity claim follows from a plan or isolated sparse fixture.

## 12. Alternatives and reference rationale

Rejected: tracking only returned entities; clearing dirty state unconditionally; deriving all dependencies from storage paths; per-feature event buses; unconditional full-world reactive graphs; fresh child budgets; capping recipients and calling the result complete; and using wall-clock timeouts as proof of safe arbitrary-code isolation.

The design instead uses typed membership-aware contracts, conservative coverage until proved precise, atomic revision-bound subscription replacement, root-lineage aggregate accounting and existing semantic owners. No product blocker remains. Actual operational ceilings require PF/host evidence and must never silently redefine game outcomes.

Primary research reference, consulted September 26, 2026: [Adapton](https://adapton.org/) describes named, demand-driven incremental dependencies and reuse. It informs the distinction between stable computation identity and changing input dependencies; this design does not adopt its runtime, require a new language, or transfer its performance claims to OpenLegend. Repository-specific evidence, authority, phase and persistence rules remain controlling.
