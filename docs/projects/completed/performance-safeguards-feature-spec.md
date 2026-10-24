# Less repeated safety work — feature specification

| Status    | Current progress                                                                                               | Last updated |
| --------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | All six tasks and their required focused comparisons are complete; measured benefits remain workload-specific. | 2026-10-18   |

**Specification reviewed and synchronized — October 18, 2026, 00:02 EDT.** The selected feature behavior is unchanged. Current implementation departures and the remaining verification limits are recorded in the linked tracker and technical design.

**Implementation update — October 17, 2026, 20:12 EDT.** Mike authorized implementation of the complete package. The [performance-safeguards tracker](../../maintainers/performance-safeguards.md) records completed implementation and its scoped evidence; the earlier source findings below describe the design baseline. No smooth-3× result is asserted.

Design reviewed against source on **October 17, 2026, 17:50 EDT**. The original design removes repeated preparation and validation while preserving the game's guarantees. Implementation is now authorized and installed. Its focused results do not close the broader smooth-3× project.

## What the player should notice

The computer should spend less time proving the same facts repeatedly. Walking, working, remembering an event and reopening a saved world must produce the same outcomes. There is no selected gameplay compromise, reduced population, lost memory, weaker save guarantee or new spending behavior.

| Work item | Before this package                                                                                                                                      | Implemented result                                                                                                                                               | Expected scope of benefit                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| PSF01     | Saved-world reads repeatedly prepare safety checks; loading and auditing a world use separate database views.                                            | Prepare each reusable statement once, avoid an idle wait timer when the save owner proves there is nothing to apply, and load/audit through one consistent view. | Repeated read preparation; loading benefits separately from ongoing play. |
| PSF02     | A ready memory search checks search readiness before opening its database view, then again inside it.                                                    | Check once inside the actual search view; wait outside that view only if preparation is incomplete.                                                              | Searches that actually use the text index.                                |
| PSF03     | Accounting for an ongoing effect searches the character's effects even though its caller already knows the entry.                                        | Check that exact entry and its current episode directly.                                                                                                         | Characters with several ongoing effects or independent contributions.     |
| PSF04     | Charging a small amount of simulation work validates the same counter names and amounts for every enclosing limit.                                       | Validate the input once per charge, then check every applicable limit before changing any counter.                                                               | Frequently repeated simulation calculations, especially nested ones.      |
| PSF05     | Some saves discover that delayed saving is unsuitable after preparing data and opening a transaction, then throw an exception to select ordinary saving. | Decide everything knowable beforehand, and represent a valid fallback as an ordinary outcome.                                                                    | Saves that fall outside the delayed-saving eligibility envelope.          |
| PSF06     | Startup immediately repeats the full world validation already performed by loading.                                                                      | The load owner guarantees a validated result; startup consumes that guarantee.                                                                                   | Startup and reopening, not steady frame rate.                             |

The original cost hypotheses now have focused behavior and timing evidence; results are mixed and remain scoped to their measured workloads. See the tracker's linked reports. The earlier review's broad suggestion to group reads is narrowed here: most multi-query memory and world-record readers already share a database view. Do not add transactions around entire HTTP requests or claim that all reads need regrouping.

## Required behavior

1. **An acknowledged action stays saved.** A successful player action must survive reopening exactly as before. A read must not mistake partially applied saved changes for the latest complete world.
2. **Searching remembers the same things.** Once the search index is ready, identical permitted inputs return the same selected memories, ordering and text. If preparation is incomplete, the request waits under the existing policy or reports temporary unavailability. It must not return a misleading empty result.
3. **Private information stays private.** If permission changes or a memory is forgotten while a request waits, the old text must not be disclosed. Sharing database preparation does not replace the final permission and evidence checks.
4. **Characters behave identically.** Ongoing effects retain their timing, amounts, activation, interruption and saved continuation. Independent effects that use the same definition remain distinct.
5. **Computation limits still work.** A calculation that exceeds an applicable allowance is refused before any of that attempted charge is applied. A child calculation cannot escape its parent's allowance. Yielding and resuming do not replenish limits.
6. **An ordinary save remains a valid alternative.** A change too large or unsupported for delayed saving may still save through the ordinary path. Corruption, a stale world revision or missing permission remains a real failure; none triggers a second attempt automatically.
7. **Invalid saved worlds stay invalid.** Removing a duplicate startup check does not remove the owning current-format validator or checks required after actual startup changes.

## Representative journeys and failure cases

| Scenario                                                                     | Required outcome                                                                                            |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| A character searches already prepared personal memories.                     | The same memories are returned after one search-readiness query in one consistent database view.            |
| A new permitted memory is saved just before the search.                      | Search preparation catches up, or the existing unavailable result is returned; saved evidence is retained.  |
| A memory is forgotten while its database read is pending.                    | The existing disclosure guard rejects the stale result.                                                     |
| An effect ends or is replaced before accounting uses an earlier reference.   | The old episode is not charged and is not recreated.                                                        |
| A child calculation exceeds a parent limit.                                  | The whole attempted charge is refused; neither child nor parent receives a partial charge.                  |
| A supported save needs more constraint lookups than delayed saving allows.   | It selects ordinary saving without changing the world's result or raising the allowance.                    |
| A valid world is reopened, including supported delayed numeric calculations. | The load owner validates the complete current format; continuation agrees with the previous implementation. |
| A malformed world is reopened.                                               | Loading refuses before installation or serving that world.                                                  |

## Scope and boundaries

All six changes belong to existing server and domain owners. No new service, queue, global cache, generic validation framework, schema version or alternate gameplay representation is needed. The engine continues to enforce storage integrity and computational containment; installed world definitions continue to choose fictional effects and their parameters.

No UI, rendering, AI model, cognition cadence, database schema, save migration or world tuning changes are selected. Existing operational limits remain owned by the linked inventories. This package adds no discretionary limit and removes none. In particular, an unchanged output limit does not prove bounded total history work or full-game capacity.

## Delivery and acceptance

Implement in the sequence and source owners specified by the [technical design](performance-safeguards-tech-design.md). Each focused guide defines required scenarios and work-count assertions. The [tracker](../../maintainers/performance-safeguards.md) is the only checkbox/status owner.

Acceptance requires identical supported outcomes, preserved meaningful failures, demonstrated removal of the named repeated work, and matched complete-caller measurements for hot-path changes. Fewer queries or less code alone is not proof of lower latency. Report an inconclusive or regressing experiment honestly; do not retain a slower design merely to complete a checklist. Startup-only improvements must be reported separately.

The existing performance project's full-game run accounting remains controlling. This specification adds no run allowance. Component correctness and finite caller comparisons are distinct from a full expanded-scene observation. Smooth 3× with responsive walking and drawing remains a separate, unfulfilled acceptance goal until its actual workload passes.

## Maintained records

- Implementation and acceptance status: [PSF01–PSF06](../../maintainers/performance-safeguards.md), linked beneath [PF17](../../maintainers/performance.md#pf17--performance-overhaul-ideas).
- Technical design: [ownership, sequence and measurement](performance-safeguards-tech-design.md).
- Limits unchanged by this proposal: [delayed saving](../../limits/persistence.md#pf17-j01--experimental-deferred-saving), [memory preparation](../../limits/memory.md#mh15--delayed-lexical-preparation), and [native work](../../limits/native-work.md).
- Current contracts: [saving/loading](../../save-and-load.md), [private memory retrieval](../../memory-architecture.md#private-retrieval-fencing), and [storage execution](../../performance/storage.md#storage-execution).
- Parent project: [performance overhaul](../performance-overhaul-feature-spec.md) and its [evaluation procedure](../performance-overhaul/evaluation.md). Historical results remain evidence with their original limits.
