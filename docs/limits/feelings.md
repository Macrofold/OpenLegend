# Feelings and social continuity: limits and constraints

[Feature contract](../projects/appraisal-social-continuity-feature-spec.md) · [Implementation work](../maintainers/agent-agency.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [appraisals.ts](../../packages/domain/src/appraisals.ts), [appraisal-context.ts](../../apps/server/src/appraisal-context.ts).

## LA080

**Removed — current foundation · Restrictiveness: — (removed).**

The former 16-strongest-feelings retention cap is gone. Persistent cause-linked feelings use native-work admission and paginated reads; reflection input remains separately bounded (FL07).

**Reason / tradeoff:** Avoid silently losing durable feelings due to a tiny count cap; execution/storage work is still bounded.

[Implementation starting point](../../packages/domain/src/appraisals.ts).

Original finding and recommendation superseded by the merged implementation; the ID remains stable.

## LA081

**Historical — needs recheck · Restrictiveness: Medium.**

Emotional reactions tracked by game rules, such as fear of someone who caused harm, lose 0.25 intensity per game hour.

**Reason / tradeoff:** Review this fading rate as a behavior rule rather than removing it as an unnecessary processing limit.

[Implementation starting point](../../packages/domain/src/agency.ts).

Original recommendation: **Review**.

## FL01

**Reported · Restrictiveness: Very safe.**

Creation requires a **living, memory-capable actor**.

**Reason / tradeoff:** Use actors that have supported memory/cognition ownership; other emotional entities are not integrated.

## FL02

**Reported · Restrictiveness: Very safe.**

Five supported cause categories: perceived event, memory, condition, disposition and explicit authoring.

**Reason / tradeoff:** Keep causes typed and inspectable; additional causal families require resolvers.

## FL03

**Reported · Restrictiveness: Medium.**

Each record has **one target or none**, and either a qualitative label or one bounded numeric value.

**Reason / tradeoff:** Simple directed records retain clear evidence; multidimensional or multi-target feelings need another contract.

## FL04

**Reported · Restrictiveness: Very safe.**

Stacking is limited to separate causes or **replacement of the previous active feeling toward the same target**. No additive/blended aggregation.

**Reason / tradeoff:** Avoid hidden arithmetic across meanings; authored blending needs a defined reducer.

## FL05

**Reported · Restrictiveness: Very safe.**

Lifetimes: persistent, fixed expiry, **linear decay**, or condition-sustained. Decay supports at most **16 notification thresholds**.

**Reason / tradeoff:** Deterministic finite lifetime families and bounded notifications keep native scheduling predictable.

## FL06

**Reported · Restrictiveness: Very safe.**

AI reflection supports only explicitly enabled event/memory policies using separate causes. It cannot create condition/disposition processes or new policies.

**Reason / tradeoff:** Keep model output within enabled trusted policies; model proposals cannot author new native processes.

## FL07

**Reported · Restrictiveness: Very safe.**

Reflection may propose **8 feeling changes**. It receives at most **48 evidence sources** and the first **24 active feelings**, without paging through the rest.

**Reason / tradeoff:** Bound model input/output, but first-24 selection can hide a relevant feeling.

## FL08

**Reported · Restrictiveness: Very safe.**

Reflection’s serialized context plus instructions cannot exceed **100,000 UTF-8 bytes**. [Input check](../../apps/server/src/cognition-maintenance.ts)

**Reason / tradeoff:** Bound the entire reflection request, including instructions; this is not a storage quota.

## FL09

**Reported · Restrictiveness: Medium.**

Each feeling reserves **8,192 estimated bytes**, one live allocation and one subscription; its execution allowance is **64 checks / 32 effects / depth 1**.

**Reason / tradeoff:** Conservative per-record admission estimates avoid unbounded native retained work.

## FL10

**Reported · Restrictiveness: Very safe.**

Internal feeling processes run every **1–86,400 simulated seconds**, with one execution per interval.

**Reason / tradeoff:** Bound recurrence cadence; exact interval range is an operational envelope.

## FL11

**Reported · Restrictiveness: Very safe.**

Conditions support only **one numeric field on that actor being below a threshold**. Disposition processes are periodic opportunities; no compound/randomized condition evaluator.

**Reason / tradeoff:** Deliver the currently needed condition family without an arbitrary expression engine.

## FL12

**Reported · Restrictiveness: Very safe.**

Those processes create targetless feelings; numeric feelings begin at the definition’s maximum. Each process keeps at most one active feeling.

**Reason / tradeoff:** One process-owned record avoids duplicate emissions; target/value selection is a current feature boundary.

## FL13

**Reported · Restrictiveness: Very safe.**

Process configuration is immutable under its ID; **no dedicated unenrollment API** was added.

**Reason / tradeoff:** Keep saved process identity stable; explicit retire/replace controls remain unimplemented.

## FL14

**Reported · Restrictiveness: Very safe.**

Process requests are capped at **1,800 estimated bytes**, stored processes at **2,048**; allocation is one live item/subscription, with **16 checks / 8 effects / depth 1**.

**Reason / tradeoff:** Bound serialized process state and execution expansion; sizes are estimates, not total world limits.

## FL15

**Reported · Restrictiveness: Medium.**

Reframing cannot change the target or reset lifetime; for decaying feelings it cannot change the numeric value. A resolved cause cannot simply be replayed to restart it.

**Reason / tradeoff:** Preserve original causal/time identity; a new target or renewed lifetime requires a distinct cause/record.

## FL16

**Reported · Restrictiveness: Very safe.**

Creator UI authoring supports **qualitative NPC feelings only**, with create/resolve operations and known subjects.

**Reason / tradeoff:** Expose a narrow trusted authoring surface; numeric/reframe/process editing is not yet delivered.

## FL17

**Reported · Restrictiveness: Very safe.**

Memory correction/erasure **invalidates all that actor’s feelings**, rather than selectively preserving unrelated ones.

**Reason / tradeoff:** Conservative invalidation prevents erased evidence surviving indirectly; selective dependencies would preserve unrelated feelings.

## FL18

**Reported · Restrictiveness: Very safe.**

Optional feelings can be refused on capacity exhaustion while the underlying injury/event still succeeds.

**Reason / tradeoff:** Optional cognition must not block authoritative injury/event outcomes; refusal must remain observable.

## QU09

**Reported · Restrictiveness: Safe.**

Feeling pages: **24 default / 100 maximum**, scanning at most **200 records**.

**Reason / tradeoff:** Bound view and scan work; continuation preserves access to the rest.

## PB05

**Reported · Restrictiveness: Safe.**

Feeling label: **80 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/protocol/src/index.ts).

## PB06

**Reported · Restrictiveness: Safe.**

AI feeling/source/policy/subject handles: **120 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/protocol/src/index.ts).

## PB07

**Reported · Restrictiveness: Safe.**

Definition hash; supplied feeling source version: **128 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/protocol/src/index.ts).

## PB08

**Reported · Restrictiveness: Safe.**

Feeling evidence coverage description: **200 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/protocol/src/index.ts).

## PB09

**Reported · Restrictiveness: Safe.**

Subjects per evidence source: **48 subjects maximum**.

**Reason / tradeoff:** Bound evidence fan-out and validation/model work; exact counts are chosen envelopes.

[Implementation starting point](../../packages/protocol/src/index.ts).

## PB10

**Reported · Restrictiveness: Safe.**

Evidence references per authored feeling: **8 references maximum**.

**Reason / tradeoff:** Bound evidence fan-out and validation/model work; exact counts are chosen envelopes.

[Implementation starting point](../../packages/protocol/src/index.ts).

## PB11

**Reported · Restrictiveness: Safe.**

Saved internal feeling source version: **2,048 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/protocol/src/index.ts).
