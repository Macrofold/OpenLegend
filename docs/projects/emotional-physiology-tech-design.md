# Emotional physiology and adaptive reappraisal — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Ownership and source-grounded integration boundaries are specified; detailed schemas, flows and acceptance design are in progress. | 2026-10-19 |

## Authority and delivery boundary

This is specialist SAD-D's design under [SC08–SC09](stealth-awareness-tech-design.md#emotions-and-reconsideration), SC12 ordering and SC13–SC14 time/lifecycle. The [feature specification](emotional-physiology-feature-spec.md) owns product behavior. [The tracker](../maintainers/emotional-physiology.md) owns delivery and acceptance. This module consumes selected ND11/ND19 emotion scope; it neither merges another specialist branch nor implements runtime behavior.

The inspected source is Macrofold/OpenLegend at `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e`. Existing code is evidence of delivered mechanisms; proposed contracts below require coordinated changes to their current owners and consumers. No legacy API, save reader, parallel emotion database, general expression evaluator or new scheduler is introduced.

## Existing owners and required extension

| Owner | Inspected baseline and selected responsibility |
| --- | --- |
| `packages/domain/src/appraisals.ts` | Owns private records, exact cause identity, target/cause stacking, scaled/qualitative values, source binding, expiry/decay and creation outcomes. Preserve create/reframe/resolve; add a distinct source-bound reassessment operation and optional review progress on the existing appraisal record. |
| `packages/domain/src/appraisal-index.ts` and appraisal residency | Own active scoped membership and due boundaries. Extend those indexes for review deadlines; complete mechanical reads cannot use the first 24-record display/reflection prefix. |
| Body/status/state-contribution owners | Own exact-life physical effects and their lifecycle. Add only the missing numeric-parameter contribution support and startle family; memoryless actors cannot pass through the appraisal creation gate. |
| `apps/server/src/actor-work.ts` | Owns one coalesced character ticket and simulation deadlines. Add an operation-specific review reason and acknowledgement, not a second queue. |
| Existing cognition execution, decision preparation and publication | Reuse budgets, permitted snapshots, durable accounting and serialized publication. Supply an independently selectable emotion-only schema; current reflection requires presentation thoughts and cannot be reused unchanged. |
| Prepared-response appraisal and threat-response owners | Reuse exact bindings and accepted receipts; compatible due reviews can join the existing first threat stage without a third call or another threat decision. |
| Existing contact/ranged/evasion owners | Consume complete effects at declared action/outcome boundaries. A new impact's startle cannot influence that same impact. |

Reassessment must retain the original appraisal ID, cause, stack key, creation time, definition meaning and creation receipt. A decaying proposal selects a current value at a captured simulation time. Native admission checks the immutable original-cause horizon and ages the proposed value through any publication delay. An unchanged result never renews its curve, semantic revision, event or review allowance.

Review bookkeeping has its own operational revision. Changes to that bookkeeping must not invalidate unrelated ordinary decisions as though the person's feelings changed. A standalone review acknowledges only its own captured opportunity; it cannot advance the director's ordinary evidence-consumption position or swallow an unanswered invitation or threat.

## Maintained records

- Product behavior: [Feature specification](emotional-physiology-feature-spec.md).
- Implementation: [Emotional physiology tracker](../maintainers/emotional-physiology.md).
- Limits: [Feelings inventory](../limits/feelings.md), with existing cognition, memory, native-work and AI-execution limits retained.
- World choices: [Psychological reactions](../worlds/base/psychological-reactions.md).
- Shared contracts: [Stealth-awareness technical design](stealth-awareness-tech-design.md).
