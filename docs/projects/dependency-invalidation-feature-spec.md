# Dependency invalidation and aggregate work containment — feature specification

**Status:** approved and implemented for this project’s scope; [verification](../verification.md#foundation-priorities-15--implementation-evidence) records evidence and limits. Priority 4. [Technical design](dependency-invalidation-tech-design.md) owns algorithms; [DI01–DI08](../maintainers/dependency-invalidation.md) decomposes EWF08 while EPR/PF/SW retain their actual scheduler/query work. See [foundation package](foundations-1-5.md).

The source audit and staged sequence below retain the design baseline. Current behavior is in the linked canonical owners; focused trackers record completed delivery and separate parent work.

## 1. Outcome

A supported mechanic, perception query or action suggestion updates when its relevant inputs change—even when its last query returned nothing. It does not repeatedly recompute because unrelated telemetry changed. Many individually small mechanics cannot collectively create unlimited computation, subscriptions, delayed children or storage.

The guarantee is semantic correctness with bounded admitted work, not merely a faster frame. Optimized supported queries must agree with their complete native reference behavior for the same snapshot and scope. Work exhaustion is reported as incomplete/unavailable; it is never evidence that an object, recipient or path does not exist.

## 2. Existing foundation and governing contracts

Main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041` already uses immutable-snapshot spatial/custody caches, broad collection dependencies in server views, and [ActorWork](../../apps/server/src/actor-work.ts) tickets with input arrays/dirty state/deadlines. These are existing owners to improve. Their conservative collection invalidation must not be narrowed until equivalent membership coverage is supplied.

[EWF08](../maintainers/extensible-world-foundation.md#ewf08--declared-dependencies-aggregate-budgets-and-containment), [world-module runtime](../../archive/07-technical-architecture/world-module-runtime.md), [events/perception](../events-perception-and-reactions.md), [performance](../performance.md) and [save/load](../save-and-load.md) govern the contract. EPR05 already owns generation-aware ActorWork acknowledgment and common reaction intake. The hearing branch at `c4379246b8db98974de319e1f5315439ac8176bd` was inspected for those task boundaries; this project must not introduce another reaction scheduler.

## 3. Required scenarios

### A. Something enters an empty query

A stationary actor has no compatible visible source nearby. Another actor places one in range, or an admitted definition makes an existing source compatible. The previously empty query becomes dirty. Native perception and action availability recompute under the same actual scope; a model is not required merely to notice the change.

Tracking only the objects returned by the previous query is insufficient. Creation, membership, applicability and definition changes must also trigger the right consumers. The same requirement applies to an empty bag acquiring its first item and a supported capability becoming available through installation.

### B. Meaning changes without entry or cell crossing

An object moves within the same spatial cell, a door/blocker changes relevant geometry, an observer changes senses, or an actor's needs/knowledge change while an object remains visible. Relevant detection/detail/interest updates occur without waiting for the observer to move or for the target to leave and re-enter.

A change affects both its old and new scope: leaving observers lose current visibility, entering observers acquire permitted evidence. An unobserved change cannot become knowledge merely because a system-wide cache was invalidated.

### C. Another update arrives while work is running

A context/query computation starts from revision R. While it is running, a relevant committed change arrives at R+1. Finishing R cannot clear R+1's pending work or publish a result as current. The existing owner either accepts a result proven current or retains a dirty ticket for a later pass.

Distinct speech/evidence remains distinct; coalescing work does not delete events. Attempting optional cognition does not imply its evidence was consumed or a paid response succeeded.

### D. Small nested definitions collectively become large

A creator combines selectors, repeated effects and child invocations. The preview shows conservative total work and active/queued allocations, including all descendants. Breaking one large effect into many small definitions does not bypass root, actor/module, world or host allowances.

The system rejects unsupported or over-budget activation with an actionable explanation. It does not partially install the definition and discover later that mandatory native effects were silently omitted. Existing inactive library definitions are not charged as though every one is running.

### E. Recurring effects and feedback

A supported persistent process may continue for a long time, but its rate, burst size, simultaneous children, queued work and retained state remain bounded. A child cannot reset the parent's allowance by choosing a new ID. An effect cannot reschedule itself indefinitely at the same simulation instant.

A genuinely recurring supported process advances simulated time and uses its admitted recurring allowance. This differs from allowing an unlimited chain of supposedly new one-shot roots. Persistent appraisal with no required update may remain inert; it does not require a perpetual timer to remain valid.

### F. Overload, failure and restore

Optional display/model work may be delayed or denied according to its owner. Already owed native effects and required perception evidence are not discarded to keep a dashboard green. If the engine cannot safely complete a required transition within its admitted bounds, it stops at the safe boundary and reports the blocked/error condition rather than advancing a fictitious successful world.

After restart or restore, authoritative episodes, progress and cursors remain; rebuildable indexes/subscriptions are reconstructed. Restore does not create a fresh encounter for everything already perceived, replay old effects or grant a new external spending allowance.

## 4. User and creator surfaces

Ordinary users receive truthful unavailable/changed/control-stale results and responsive native behavior; they should not need to understand dependency graphs. A slow stream receives a scoped resync or disconnect rather than endless queued stale views. Client-side optimistic display does not authorize incomplete mechanics.

Authorized creator diagnostics can explain which supported dependencies caused recomputation, which admitted limit blocked a candidate, whether a query was complete and which concrete capability remains unsupported. Explanations must filter private targets, causes and counts. Debug access to a dependency edge is not permission to read its human-private source.

Reuse the existing workshop's candidate/diff/validation/approval workflow and PF diagnostics. Do not add a graph editor, telemetry database, universal task broker, new module compiler or a paid diagnosis call on ordinary work. Diagnostic failure must not roll back an otherwise valid world effect.

## 5. Included stages and unlike consumers

**Stage 1:** introduce typed change and read-scope metadata over existing owners. Establish snapshot/revision acknowledgment and conservative query membership coverage before removing broad invalidation.

**Stage 2:** integrate spatial perception and nonspatial inventory/installed-capability queries. These are intentionally unlike: old/new spatial extents versus parent or definition membership. Reuse EPR/SW and P3 indexes rather than forcing both into a single world-sized graph.

**Stage 3:** enforce invocation/descendant/recurrence budgets through the existing family admission/execution path, with aggregate installation and live allocation checks. Keep required versus optional work explicit.

**Stage 4:** integrate scheduler acknowledgment/recovery through EPR05, validate save/lifecycle and measure matched mixed workloads through PF. New algorithm isolation remains a separate G2 decision.

## 6. Non-goals

No replacement for native geometry or event semantics, no global reactive ECS rewrite, no continuously ticking full-world dependency graph, no arbitrary user scripts or claims of preempting untrusted JavaScript safely. No new physical law merely to simplify indexing. Do not change native phase order, random draws, simulation cadence, hearing intelligibility or thresholds under the label of optimization.

This project does not close EPR's full sensory/episode/reminder contract, the cadence branch, PF's first-release workload or D6 regional execution. It supplies shared contracts and required adapters to those owners.

## 7. Acceptance

DI01–DI08 must demonstrate: empty-query membership changes; stationary observer and within-cell movement; old/new spatial scope; geometry/sense/knowledge/manifest changes; nonspatial container and capability membership; update-during-compute and stale completion; duplicate/rolled-back notifications; aggregate nested fan-out; recurring descendants and zero-time feedback; removal/revocation cleanup; restore without duplicate reactions; and explicit incomplete-query/budget failure.

For optimized supported queries, compare outputs, ordering, disclosure and meaningful evidence with a native complete-reference evaluation on matched disposable snapshots. Measure candidates/edges/outputs, allocations, subscriptions, queued descendants, queue age and mutation/projection tail latency. Do not infer correctness from lower CPU alone or capacity from an isolated empty world.

The [accepted workload](../../archive/07-technical-architecture/data-delivery-and-scale.md) remains the qualification target, not a delivered performance promise. Native, database, client and live-provider quality are separate evidence classes. Required CI remains; default delegated implementation does not authorize new automated suites or paid retries.

## 8. Decisions and questions

Proposed defaults are explicit dependency types; mandatory membership scopes; version-bound acknowledgment; conservative invalidation before precision; bounded family-specific query providers; root-lineage charging across descendants; finite recurring rate/burst/live-state admission; and safe refusal rather than silent loss of mandatory work.

**Blocking product questions: none.** Numeric operating envelopes come from the established PF/host qualification process. Choosing an upper bound is not permission to truncate recipients, erase state, infer absence or change the world's meaning.
