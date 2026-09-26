# Shared state, effect contributions and resource claims — technical design

**Status:** proposed, implementation not started by this design task. [Feature specification](shared-state-contributions-feature-spec.md) owns behavior; [SC01–SC08](../maintainers/state-contributions.md) owns detailed work and evidence. Parent ownership remains EWF02–03, INV-6.3, EWF07/SL00 and production data. Read [the five-project map](foundations-1-5.md) for the pinned baseline and cross-project order.

## 1. Research findings and boundaries

Inspected main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041`: [world-modules.ts](../../packages/domain/src/world-modules.ts) has finite implementation IDs, definition pins, numeric/category schemas and one native-or-sparse storage selection; [needs.ts](../../packages/domain/src/worlds/base/needs.ts) still writes body health from native starvation/exhaustion; [item-handling.ts](../../packages/domain/src/item-handling.ts) mutates current lots/custody; [WorldService](../../apps/server/src/world-service.ts) serializes mutations and awaits command commits. Preserve those owners, not a second transaction engine.

The [runtime contract](../../archive/07-technical-architecture/world-module-runtime.md#5-effects-ownership-and-deterministic-composition) deliberately distinguishes current sequential native behavior from future start-state aggregation. The [production model](../../archive/07-technical-architecture/production-data-model.md#7-processes-actions-and-contributions) supplies logical process/contribution/reservation records. Actual storage migrations extend current native record adapters; logical schema names in that target are not proof of existing tables. The invention branch at `271ac5738a1afe5dca0f53b2dc1a89a5e7c11b93` has additional workflow and receipts: reconcile through DF02 before touching shared paths.

Architectural classification: identity/fencing/valid references/accounting are protected runtime; typed claims and aggregation are reusable services; physiology rates, resource conversion and stacking selection are world policies; named effects are content. P01–P12 in [engine/world boundaries](../engine-and-world-boundaries.md#design-principles-for-every-feature) apply without copying their catalogue here.

## 2. Semantic owners and proposed code seams

| Responsibility | Owner / implementation location |
| --- | --- |
| Resolve installed definition and state provider | Extend `packages/domain/src/world-modules.ts`; a small proposed `state-owners.ts` contains typed provider interfaces. |
| Pure claim planning and contribution resolution | Proposed domain `resource-claims.ts` and `state-contributions.ts`, invoked inside the existing draft boundary. |
| Wilderness rates/body transitions | Existing `worlds/base/needs.ts`, living/body and native kernel adapters; no wilderness imports in generic claim code. |
| Active capability contributions | Existing status-effect/capability owner; adapt its active instances rather than allocate a second status store. |
| Admission, current principal and atomic publication | Existing `WorldService` mutation queue and `GameRepository` transaction. |
| Canonical persistence | Existing entity/component/process codecs and SQLite/PostgreSQL adapters; additions owned by D1/DF02. |
| Change delivery and deadlines | Existing domain change metadata and EPR/PF scheduling; Priority 4 extends dependency bookkeeping. |
| Views, actor context, action discovery | `projectAttributes`, server `view.ts`, decision context and existing catalogue/family adapters. |

Estimated implementation envelope is roughly 1,500–3,500 production logic lines plus consumed migrations, spread across these existing seams and a few focused modules. This is a planning estimate, not permission to construct an unused framework. SC01 replaces the estimate with actual affected callers before coding.

## 3. Typed addresses and operation contracts

Use exact definition/version/digest references already owned by declarations. Display names are never keys. A state address is world/entity plus registered state family/key, with exactly one resolved provider. A resource address additionally identifies the semantic resource and unit/quantum pin. Equal units alone are insufficient for transfer compatibility.

Illustrative internal contracts, not a new public protocol:

```ts
type StateRead<T> =
  | { status: 'known'; value: T; revision: number }
  | { status: 'unknown' | 'uninitialized' | 'not-applicable' | 'unsupported' };

type ContributionKind = 'stock-change' | 'resource-transfer' | 'active-capability';

interface ContributionIdentity {
  invocationId: string;
  contributionId: string;
  definitionPin: DefinitionPin;
  sourceRef: ScopedEntityRef;
  targetRef: ScopedEntityRef;
  phaseId: string;
  operationOrdinal: number;
}

interface ResourceClaim {
  resourceRef: ResourceRef;
  expectedRevision: number;
  amountQuanta: number; // positive safe integer in the admitted unit
  reservationId?: string; // existing owner-issued reservation only
}

interface AtomicEffectGroup {
  identity: ContributionIdentity;
  claims: readonly ResourceClaim[];
  operations: readonly SupportedOwnerOperation[];
  readDependencies: readonly VersionedDependency[];
  fulfillment: 'all-or-nothing' | 'bounded-partial';
}
```

Each union branch has a strict codec and service-specific semantic validator. Do not implement `SupportedOwnerOperation` as arbitrary paths or callbacks. Start with existing numeric stock changes, source/recipient transfers and existing capability-block contributions. Category initialization/edit remains the category owner; it is not numeric addition. Reserve editor replacement as a separate authorized operation, never a client-selected override priority.

The server supplies current world/timeline, control/grant generations and source provenance. The pure domain receives an already bound authority context but still validates current mechanical inputs. A model cannot invent a reservation, source identity or stacking group that grants access.

## 4. Number, unit and conservation rules

New discrete/conserved resource families use nonnegative integer quanta with a pinned scale and checked safe arithmetic. Validate each input and every sum/product; do not rely on SQL integer range when TypeScript arithmetic has already lost precision. Wire quantities remain validated numbers within the safe range; larger scales require a separately implemented decimal/string codec rather than silently accepting them.

Native health/fullness/energy retain their current numeric representation and rounding during owner extraction. They are not automatically reclassified as fungible conserved matter. Existing charge definitions require an explicit precision audit before conversion. A migration must preserve any fractional remainder in the owning representation or refuse a lossy conversion with the original world intact; it cannot round away stock to simplify a new table. SC04 owns this inspected conversion and its current-state comparison.

For admitted rates, integrate by simulation elapsed time with a saved fractional carry in the resource owner. Cap integration at the next depletion/capacity/lifetime boundary. Save `lastIntegratedSimTime`, rate pin and remainder with the process/stock transition. Carry does not reset on pause, tick subdivision or restart. Conversion between different resources requires an explicit native conversion policy with ratio, output/waste/source semantics and supported rounding; the first same-resource transfer does not implement a general chemical solver.

A source operation is explicit and separately authorized. Creator conjuring stays in INV's existing confirmation/receipt path. Declaring a magical source cannot mint real credits, access grants or storage capacity.

## 5. Execution phases and deterministic arbitration

### Preserve existing semantics first

SC02 wraps current native mutations at their current call sites and in their existing order. It must not reorder hunger, work, damage, recovery, event emission or saved RNG consumption. A native adapter can use a one-operation group while retaining existing clamp-per-step behavior. Removing direct writes is an ownership refactor, not a change to the clock or simultaneous combat rules.

### Explicit compositional phase

For new supported multi-contributor work, a named phase has one immutable start-state and a stable proposal order. Use phase order, existing server/domain admission sequence and operation ordinal, with stable invocation identity as the final tie-breaker. Clients do not supply priority. Long-lived processes retain their admitted sequence; new work cannot acquire an older slot by retrying.

Algorithm:

1. Capture the phase boundary and applicable definitions. Evaluate each supported producer against that start-state using bounded read ports; collect proposals without mutating authoritative values.
2. Validate shapes, authority, revisions, mandatory dependencies and each producer's advertised work envelope. Reject unsupported same-phase cycles. No proposal sees another producer's speculative intermediate result.
3. Resolve claims in stable order against one temporary availability ledger. For each atomic group, consider its complete claim set before reserving any of it. `available = stock − outstanding holds`; a process consuming its own hold converts that hold rather than subtracting it twice.
4. All-or-nothing groups fail without effects when any claim is unsatisfied. A bounded-partial family computes the admitted minimum across source availability, recipient capacity and its advertised maximum, then derives all coupled operations from that actual amount.
5. Resolve owner-specific contributions, validate bounds and prepare one candidate draft. Stock changes and active capability aggregation have different resolvers. Clamping after a sum versus per operation is a pinned owner policy, not an iteration accident.
6. Atomically commit changed state, consumed/released holds, process progress, required events/awareness, receipt and invalidation intent. Publish actor-visible results only from the committed outcome.

Example: stock 10, another process holds 4, request 8, recipient capacity 5. A partial transfer may move 5; an all-or-nothing claim for 8 fails. Retrying the completed partial transfer returns its original result and does not move another 5. Under a competing batch, the later claimant sees the remaining ledger allowance, not the original stock 10.

This ordering does not claim optimal economic allocation or fairness across infinitely recurring producers. Reservations have explicit lifecycle bounds, and Priority 4 supplies aggregate recurring work admission. A future allocator is a versioned world policy with changed-outcome evidence, not an opportunistic sorting change.

## 6. Active effects and cancellation

An active effect instance retains exact effect pin, invocation/source/target, admitted stack identity, parameters, lifecycle state and the currently owned contribution. Use the existing status instance as the authoritative record where that family already owns it. Contribution lookup indexes are derived.

Supported lifecycle transitions are admit → active → ended, with explicit rejection and family-supported suspension where needed. End reasons include expiry, source loss, cancellation, target retirement and authorized removal. Repeated termination is idempotent. Missing duration is never interpreted as accidental immortality: explicit-removal lifetime is an admitted tag.

For capability blocks, effective blocked state is determined from current body eligibility plus all active blocking contributors. Ending contributor A removes A, leaving B untouched. For stock changes, the receipt records the already committed amount; ending the source schedules no inverse delta. For sustained transfers, termination stops future increments and releases remaining holds. It never restores an old base-value snapshot.

Persist fixed deadlines in simulation time; source-sustained lifetimes subscribe to actual source/process changes. Conditional termination only uses implemented predicates with complete membership dependencies and bounded reevaluation. Until that support exists, return unsupported rather than polling the entire world or compiling prose.

## 7. Persistence, transactions and recovery

Consumed logical records extend the [production model](../../archive/07-technical-architecture/production-data-model.md#6-possessions-inventory-resources-and-construction): resource reservations, active process contributions and discrete transfer evidence. Required fields are scoped identity, exact definition/unit pin, source and target references, amount or contribution payload, row revision, lifecycle/held state, owning process/invocation, timeline and integrated/deadline state. Unique constraints prevent duplicate invocation-operation application. World-local foreign keys protect references; lifecycle tombstones retain referenced identities.

Route the entire effect group through the current writer transaction. Lock/check the world authority and relevant row revisions in consistent order; no transaction waits for a model, user confirmation or network work. On failure, discard the candidate and retain the prior loaded snapshot. On ambiguous database acknowledgement, reconcile the receipt before accepting a new attempt. Retry of an already receipted command returns a scoped result; altered bodies conflict and expired epochs do not execute again.

Do not append a transfer journal row on every microsecond of continuous drain. Save compact integrated process/stock state at existing durability boundaries; retain discrete meaningful transfers and required receipt evidence. Do not reconstruct current balances by scanning lifetime history.

Add identity-preserving in-place migrations to existing record extraction, with source verification and atomic cutover. There is never a period with writable native and generic copies. Follow current [active-development save policy](../save-and-load.md#active-development-policy), which supersedes older no-migration prose in historical designs. Missing required pins or invalid residue/contribution references fail before installation.

SL00 capture includes active contributions, holds, progress, fractional carry, deadlines and exact definitions. Restore installs these together under a fresh timeline/authority fence, rebuilds lookups and schedules future native work without replaying initial application. Current privacy, control grants and external spending remain outside rewind. INV-5/EWF07 own live owner replacement; unsupported detach or missing migration blocks activation.

## 8. Dependencies, disclosure and bounded work

Each owner emits semantic change keys: stock availability, applicable state/band, active capability set, source/process lifecycle and definition revision. Use these for action availability, EPR concern intake and scoped projection invalidation. A numerical decrement need not request a paid decision. Priority 4 adds general membership/budget infrastructure; the first slice must still use bounded source/target sets and explicit dirty keys.

Count complete atomic groups, candidate reads, claims, outputs, active contributions, holds and scheduled descendants. Reserve required mutation/evidence work before acceptance. Aggregate exhaustion returns an explicit admission result or enters the existing safe paused/error boundary for an invalid mandatory internal transition; it cannot silently skip damage or create a successful zero-cost effect. Operational limits are versioned configuration derived from qualification, not new fictional resource laws or arbitrary content-count caps.

Actor/context/UI projections expose only authorized current state and causes. Raw claims may contain private plans; other actors receive at most permitted availability or outcome. A rejected target count, hidden reservation owner or creator diagnostic must not become an information oracle. Labels remain plaintext. No new model call occurs on hover, inspection, tick or cancellation.

## 9. Implementation and qualification

[SC01–SC08](../maintainers/state-contributions.md) contains task bodies, dependencies and exits. Deliver in order: baseline/provider map; owner extraction; atomic claims; native resource consumers; active contributions; persistence/lifecycle; scoped surfaces/invention bridge; integrated qualification. P2 can consume the stable transfer interface before all authoring surfaces exist; P3 replaces the lot/placement adapter without redefining claims.

Qualification must compare matched wilderness traces, exercise both SQLite and PostgreSQL commits, and run disposable native scenarios with zero provider budget. Cover every failure boundary before/after receipt publication, repeated cancellation, overlapping blocks, cap/depletion, save between reservation and consumption, source retirement, stale callbacks and fractional integration under different step partitions. Browser evidence verifies current values and truthful partial outcomes. Do not author/run automated suites under the default delegated workflow; record deferred regression work and retain CI requirements.

Measure work per admitted group, claim/active-instance counts, mutation wait and commit tail latency, allocation rate, queue age and payload size under the existing mixed workload. An isolated charge benchmark does not establish the first-release player/world capacity.

## 10. Alternatives, decisions and references

Rejected: independent subsystem setters (lost updates); inverse snapshots (erase history); one universal numeric reducer (wrong semantics); immediate whole-kernel simultaneous rewrite (changes gameplay/RNG); ledger replay for every balance read (unbounded hot work); locks held across generation (contention and unsafe authority waits).

Proposed choices: finite typed owner services, sequential extraction followed by explicit named batch phases, all-or-nothing default with declared partial fulfillment, active-contribution detach, consumed canonical records and native scheduling. No blocking product decision remains for this foundation; new loss/precision or lifecycle choices discovered on real data must be raised before applying them.

External mechanism checks, consulted September 26, 2026: PostgreSQL [explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html) supports short transactional row locking and consistent lock order; [constraints](https://www.postgresql.org/docs/18/ddl-constraints.html) distinguish row-local checks from cross-row invariants. These support the transaction approach, not a claim that SQL alone implements resource semantics or that OpenLegend's broader release gates have passed.
