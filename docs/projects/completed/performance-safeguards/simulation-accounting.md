# Direct effect lookup and cheaper work accounting

| Status    | Current progress                                                                                               | Last updated |
| --------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | All six tasks and their required focused comparisons are complete; measured benefits remain workload-specific. | 2026-10-18   |

**Implementation update — October 17, 2026, 20:12 EDT.** Mike authorized implementation of the complete package. The [performance-safeguards tracker](../../../maintainers/performance-safeguards.md) records completed implementation and its scoped evidence; the earlier source findings below describe the design baseline. No smooth-3× result is asserted.

Read the [technical design](../performance-safeguards-tech-design.md) first. This guide removes repeated work without changing what a character's effects do or how much computation they are allowed. [PSF03/PSF04](../../../maintainers/performance-safeguards.md) own progress.

## PSF03: check the already-known effect entry

### Behavior at design time and ownership

[chargeStatusWork](../../../../packages/domain/src/native-work.ts) receives a specific effect instance. Before charging its accounting record, it creates an array of the entity's effects and searches for an active instance with the same episode. Both production callers already obtained the instance from a known key:

- [Status-rate integration](../../../../packages/domain/src/status-effects.ts), inside `integrateStatusRates`: key is `interval.definition.id`; the caller also needs the instance to update elapsed time.
- [Independent contributions](../../../../packages/domain/src/state-contributions.ts), inside `advanceCapabilityContributions`: key is the loop's `id`. It can differ from the definition's ID; multiple contributions may share a definition.

The existing record is authoritative. Do not build an episode-to-effect index or add a second active-effect list. Cost currently grows with effects updated × entries searched. A direct key lookup removes the second growing factor for these calls. Supported deferred numeric episodes already use a different path in rate integration; do not force them back into eager charging to make a test exercise this helper.

### Selected signature and edit order

1. In `native-work.ts`, change the internal helper to:

   ```ts
   export function chargeStatusWork(
     world: WorldState,
     entity: Entity,
     definition: StatusEffectDefinition,
     stateId: string,
     state: StatusEffectInstance,
   ): void;
   ```

2. Keep `state = readOnlyDraftView(state)`. Read the entity's current `statusEffects` through the existing read-only draft view, and get only `[stateId]`. Convert that stored instance to the same read-only view if present.
3. Return without charging when the supplied instance is inactive, the stored entry is absent/inactive, or the stored entry's `episode` differs from the supplied instance's episode. Compare episode identity, not object reference equality: mutable draft wrappers and immutable views can represent the same instance.
4. Leave `admitStatusWork`, `advanceWorkInterval`, `statusWork` and `chargeInvocation` in their existing order, with their current arguments and failure behavior. Do not suppress a missing-definition or exceeded-budget error elsewhere.
5. Update the status-rate caller to pass `interval.definition.id` immediately before its existing `state` argument. Update the contribution caller to pass its actual `id`, not `definition.id` or `contribution.definitionId`.
6. Search every use of `chargeStatusWork` and update all current callers together. The two above are the complete production set at the recorded baseline. Keep no old-signature overload.

The caller still supplies its earlier instance so the helper can detect replacement at the same key. A direct lookup by key alone would incorrectly charge a new episode using old work. No cache, new stored field or new identifier namespace is introduced.

### Required scenarios

| ID  | Scenario                                                                                                                   | Required observation                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Charge a normal active singleton effect through actual rate integration.                                                   | Same invocation counters, interval handling, elapsed effect time and world result. One selected entry read; no collection enumeration in the helper. |
| E2  | Advance two active independent contributions sharing a definition but using different record keys/episodes.                | Each charges only its own episode. A definition ID cannot substitute for the stored key.                                                             |
| E3  | Retain an earlier reference, then remove, deactivate or replace that entry before calling the helper.                      | No old episode is recreated or charged; the replacement episode is unchanged.                                                                        |
| E4  | Exercise published immutable worlds and a real domain draft.                                                               | Both find the same logical entry without reference-equality assumptions or escaping draft proxies.                                                   |
| E5  | Grow unrelated effects while updating a fixed selected effect.                                                             | Helper membership visits remain one, and it allocates no `Object.values` collection. Actual downstream work is also measured.                        |
| E6  | Advance, save/reopen, then continue a world mixing eligible deferred numeric effects with effects that require eager work. | Same current values, events, episode identities and accounting as control; deferred eligibility is unchanged.                                        |

Use actual admitted contributions, not duplicate-episode malformed fixtures. Suitable source owners include [status-effect action checks](../../../../apps/server/src/status-effect-actions.test.ts) and the native integration fixtures already used by the parent [simulation report](../../../verification/performance/overhaul-simulation-implementation.md). Existing tests may not cover all six scenarios; use the common verification policy to fill the specific gaps.

## PSF04: validate a charge once, retain every limit check

### Current behavior

[work-budget.ts](../../../../packages/domain/src/work-budget.ts) has two related responsibilities:

- A synchronous calculation group and its nested groups keep temporary counters. `chargeWork` checks a requested increment against every enclosing group's remaining allowance, then charges all of them.
- Admitted ongoing work keeps saved invocation counters. `chargeInvocationValue` already checks only the changed counters and preflights before mutation. Its `depth` counter uses a maximum, unlike the temporary group's additive charge.

The second responsibility already avoids copying all counters for every effect. **Do not reimplement that optimization or merge the two kinds of accounting into one generic updater.** Their depth, recurrence and revision semantics differ.

### Selected implementation

The first slice uses existing representations. It creates no prepared-charge type, branded value, global cache, runtime schema, counter registry or new public API.

1. Keep `chargeWork`'s early return when no active calculation group exists. This preserves its current trusted construction behavior; do not start validating inactive calls accidentally.
2. Obtain `Object.keys(demand)` once, as today. Preserve its iteration order.
3. At the current meter, loop over those keys **once**. Check each name against `WORK_UNITS`, validate its supplied increment with the existing `integer` helper, and preflight that meter’s resulting sum and limit in the same pass. This avoids an extra key traversal in the common unnested case.
4. Walk the remaining parent meters, and keys in the same order as today. For each pair, compute `integer(meter.used[key] + demand[key]!)` and compare against that meter's limit. Keep overflow/nonnegative protection on the computed sum; the sum can become invalid even if the increment was valid.
5. Only after the entire chain passes, perform the second walk that adds the increments to every meter. No mutation, partial charging, refund or catch/retry belongs in the preflight loop.

The inputs are trusted ordinary data used synchronously; no asynchronous wait occurs between validation and use. Do not broaden this assumption to incoming JSON or property accessors. External/current-save admission remains validated at its existing boundary. Invalid internal increments still fail before any mutation; exact precedence between multiple malformed internal fields and an exhausted limit is not a public gameplay promise. For valid inputs, the first exhausted meter/counter and existing `WorkBudgetError` fields remain unchanged.

This changes validation cost from roughly **keys × nesting depth** to **keys**, while the necessary accounting remains **keys × nesting depth**. Do not allocate an array of `[key, amount]` tuples on every charge merely to move the same work; reuse the existing keys array. Do not weaken limit checks or make the whole operation asynchronous.

### Reuse already-normalized limits

`withWorkMeter` and `meteredIterator` each call `workVector(limit)`, then pass the resulting vector through `requireWork`, which normalizes it again.

1. Extract the comparison portion of `requireWork` into a private helper such as `requireWorkVector(required: WorkVector, limit: WorkDemand, code: WorkBudgetError['code']): void` in the same file. Its only responsibility is the existing ordered comparison over `WORK_UNITS`.
2. Keep exported `requireWork` as the validating boundary: normalize the demand once with `workVector`, then delegate to the private comparison.
3. Have the two meter creators call that comparison directly for their newly normalized `meter.limit`, preserving the existing default error code and each creator's order of depth checks versus allowance checks.
4. Keep normalization of saved allocations, public `workVector`, and arithmetic helpers unchanged in this slice. Do not introduce shared mutable zero vectors or cache validation by a mutable object's identity.

This is the deliberate refinement of the earlier “validate fixed inputs once” recommendation: remove provable duplicate checks inside the existing owner before considering a new reusable prepared-input abstraction. A future cross-call cache is not part of these six changes.

### Required scenarios

| ID  | Scenario                                                                                                           | Required observation                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Nested child fits locally but exceeds its parent's allowance.                                                      | `WorkBudgetError` reports the same counter; no counter in either group receives any part of the attempted charge.                                   |
| B2  | A multi-counter charge fits its first counter but exceeds its next.                                                | Entire charge is refused; a later valid charge can still use all original allowance.                                                                |
| B3  | Invalid unit, negative/fractional/NaN/infinite increment; separately a valid increment whose sum overflows.        | Refusal before mutation. Sum validation remains active after input-validation hoisting.                                                             |
| B4  | Empty charge and charge outside a meter.                                                                           | Existing no-op behavior; no new allocation or validation requirement for the inactive case.                                                         |
| B5  | Nested operation throws, generator yields/resumes, generator is cancelled, or resume occurs under the wrong owner. | Parent ownership is restored; spent allowance survives yield; cleanup uses remaining allowance; wrong-owner resume cannot consume the pending step. |
| B6  | Create meters with valid and oversized limits.                                                                     | Same normalized limits, depth enforcement and error code as control; one normalization of the supplied limit per creation.                          |
| B7  | Advance actual effects/native simulation under several nesting depths.                                             | Exact world/events/accounting agree. Input-name/amount checks happen once per key per charge; enclosing limit checks still happen at every level.   |
| B8  | Continue a saved invocation with recurrence and a depth increment.                                                 | Existing saved invocation semantics are untouched; no additive/max mix-up or altered executions/revision occurs.                                    |

Run the existing focused [work-budget tests](../../../../packages/domain/src/work-budget.test.ts):

```sh
AI_BUDGET_USD=0 pnpm exec vitest run packages/domain/src/work-budget.test.ts
```

This file already covers nested atomicity, multi-counter refusal, parent restoration, generator yield, wrong-owner resume and cancellation. It does not prove whole-game speed or all malformed-input cases. Add only the missing focused scenario evidence allowed by repository verification policy.

## Combined measurement and acceptance

Use the parent simulation fixture/driver through actual native transitions, with unchanged world definitions, random state, commands and fixed simulated intervals. Compare complete materialized current worlds, events and saved work—not just stored numeric anchors when the existing representation intentionally defers arithmetic. Do not let a correctness inspection replace the measured service's resident world or warm caches accidentally.

Measure a small ordinary case and a case with more active effects/contributions; distinguish eligible deferred work from eager work. For nesting, include depths 1, 2 and 8 within existing limits. These are diagnostic workload sizes, not new gameplay settings. Use visit/check counts to prove the mechanism and an unsampled matched complete-caller comparison to assess cost. Preserve cold/reopen evidence separately.

Do not keep an unused helper or a new accounting abstraction after a failed experiment. If a local improvement does not improve the actual caller, report that limit rather than moving the benchmark to a more favorable helper.

## Maintained records

- Implementation and exit status: [PSF03/PSF04](../../../maintainers/performance-safeguards.md).
- Shared plan: [technical design](../performance-safeguards-tech-design.md); behavior: [feature specification](../performance-safeguards-feature-spec.md).
- Limits remain in [native work](../../../limits/native-work.md), including ordinary work admission and delayed arithmetic. No ceilings, nesting allowance or interval reset rules change.
- Current meaning remains in [status effects](../../../status-effects.md), [identity](../../../identity-and-references.md#contract), and [save continuation](../../../save-and-load.md#continuation-and-identity).
