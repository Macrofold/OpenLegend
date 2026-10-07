# Feelings and social continuity: limits and constraints

[Feature contract](../projects/completed/appraisal-social-continuity-feature-spec.md) · [Implementation work](../maintainers/actor-model.md#advanced-emotional-state-foundation) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [appraisals.ts](../../packages/domain/src/appraisals.ts), [appraisal-context.ts](../../apps/server/src/appraisal-context.ts).

## LA080

**Removed — current foundation · Restrictiveness: — (removed).**

The former 16-strongest-feelings retention cap is gone. Persistent cause-linked feelings use native-work admission and paginated reads; reflection input remains separately bounded (FL07).

**Reason / tradeoff:** Avoid silently losing durable feelings due to a tiny count cap. Native retained-work admission is finite; total historical storage and cold-index reconstruction are separate costs, not made bounded by a page size.

[Implementation starting point](../../packages/domain/src/appraisals.ts).

Original finding and recommendation superseded by the merged implementation; the ID remains stable.

## LA081

**Current — source-inspected 2026-09-26 · Restrictiveness: Medium.**

The bundled fear/discomfort definitions decay by 0.25 intensity per game hour. This is an explicit world policy, not a default lifetime for every feeling; other installed policies can persist or follow conditions.

**Reason / tradeoff:** Review this fading rate as a behavior rule rather than removing it as an unnecessary processing limit.

[Implementation starting point](../../packages/domain/src/worlds/base/appraisals.ts). [Current social rules](../worlds/base/social.md#feelings).

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

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Stacking is limited to separate causes or **replacement within the same actor, exact definition revision and target**. A new feeling does not replace a different feeling family merely because both concern the same person. There is no additive/blended aggregation. [Identity and replacement owner](../../packages/domain/src/appraisals.ts).

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

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Reflection may propose **8 feeling changes**. Source preparation considers only the first **48 supplied evidence IDs**, then keeps the eligible scoped sources returned by the repository. Feelings come from the first page of at most **24 currently active records**, subject to QU09’s 200-record scan window; this is stable ID order, not relevance or strongest-first ranking. The reflection adapter does not follow the continuation cursor. These are model-context selections, not retention limits. [Context owner](../../apps/server/src/appraisal-context.ts) · [Output schema](../../apps/server/src/cognition-contracts.ts).

**Reason / tradeoff:** Bound supplied feeling choices and changes, but the selected prefix can omit a relevant feeling or cause. Preserve that limitation rather than describing the supplied page as the character’s complete emotional state.

## FL08

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Before dispatch, the reflection adapter checks **100,000 UTF-8 bytes** across `JSON.stringify(request.context)` and the instruction string. That sum excludes the output schema, separately supplied mind files, subsequent tool results and the surrounding provider/harness envelope. It is checked after context preparation and diagnostic recording, so it does not cap that earlier work. [Input check](../../apps/server/src/cognition-maintenance.ts) · [Broader execution limits](ai-execution.md).

**Reason / tradeoff:** Bound these two supplied input fields before paid dispatch, not the complete reflection request, preparation memory or stored history. Other request and execution owners retain their separate allowances.

## FL09

**Current — source inspected 2026-10-06 · Restrictiveness: Medium.**

Each feeling reserves **8,192 estimated bytes**, one live allocation and one subscription; its execution allowance is **64 checks / 32 effects / depth 1**. Admission checks selected record state using **JSON string length × 3**, not actual UTF-8 length or measured heap. Ending the feeling releases its native-work allocation; the retained historical record has separate persistence/residency handling. [Admission and ending](../../packages/domain/src/appraisals.ts).

**Reason / tradeoff:** Conservative per-record admission estimates avoid unbounded native retained work.

## FL10

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

An opt-in internal feeling process admits an interval of **1–86,400 simulated seconds**, with one execution allowance per interval. After a due opportunity it schedules from the current simulation time rather than banking missed opportunities. The routine still walks the complete enrolled-process registry on each appraisal advance, including processes not yet due; expiry/decay records have a separate due index. This interval bound is not a bound on that registry walk or a requirement to enroll every actor. [Process owner](../../packages/domain/src/appraisals.ts) · [Feeling indexes](../../packages/domain/src/appraisal-index.ts).

**Reason / tradeoff:** Bound each process’s recurrence without claiming constant preparation cost at larger enrollment. Any broader creator exposure under [ACT09](../maintainers/actor-model.md#act09--internal-feeling-process-authoring) must account for this separate cost; the ordinary authoring UI is still proposed.

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

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Process requests are capped at **1,800 estimated bytes**, stored processes at **2,048**; allocation is one live item/subscription, with **16 checks / 8 effects / depth 1**. These checks use **JSON string length × 3**, not measured heap or a literal encoded-byte ceiling. [Process admission and current-format validation](../../packages/domain/src/appraisals.ts).

**Reason / tradeoff:** Bound serialized process state and execution expansion; sizes are estimates, not total world limits.

## FL15

**Reported · Restrictiveness: Medium.**

Reframing cannot change the target or reset lifetime; for decaying feelings it cannot change the numeric value. A resolved cause cannot simply be replayed to restart it.

**Reason / tradeoff:** Preserve original causal/time identity; a new target or renewed lifetime requires a distinct cause/record.

## FL16

**Reported · Restrictiveness: Very safe.**

Creator UI authoring supports **qualitative NPC feelings only**, with create/resolve operations and known subjects.

**Reason / tradeoff:** Expose a narrow trusted authoring surface; numeric/reframe/process editing is not yet delivered. [ACT09](../maintainers/actor-model.md#act09--internal-feeling-process-authoring) scopes a possible process-authoring journey and its required lifecycle decisions; it does not authorize implementation or promise a general editor.

## FL17

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Memory correction/erasure **invalidates all that actor’s feelings**, rather than selectively preserving unrelated ones. It also clears each enrolled process’s active-feeling reference, advances its opportunity identity and postpones it until at least one interval after correction. It does not unenroll the process: a later independently satisfied condition may create a new feeling, never resurrect the forgotten episode or its source text. [Correction boundary](../../packages/domain/src/experience.ts) · [Feeling/process invalidation](../../packages/domain/src/appraisals.ts).

**Reason / tradeoff:** Conservative invalidation prevents erased evidence surviving indirectly; selective dependencies would preserve unrelated feelings.

## FL18

**Reported · Restrictiveness: Very safe.**

Optional feelings can be refused on capacity exhaustion while the underlying injury/event still succeeds.

**Reason / tradeoff:** Optional cognition must not block authoritative injury/event outcomes; refusal must remain observable.

## QU09

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Feeling pages return **24 by default / 100 maximum**, scanning at most **200 active-index candidates** per page and returning a continuation when more remain. Initial index construction can still traverse the resident appraisal records across actors; the page’s 200-candidate window is not a cold-index construction limit. [Page owner](../../packages/domain/src/appraisals.ts) · [Index owner](../../packages/domain/src/appraisal-index.ts).

**Reason / tradeoff:** Bound view and scan work; continuation preserves access to the rest.

## PB05

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Feeling label: **80 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/domain/src/appraisals.ts).

## PB06

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

AI feeling/source/policy/subject handles: **120 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

## PB07

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Definition hash; supplied feeling source version: **128 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Definition pins](../../packages/domain/src/state-owners.ts) · [Supplied source validation](../../packages/domain/src/appraisals.ts).

## PB08

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Feeling evidence coverage description: **200 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/domain/src/appraisals.ts).

## PB09

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Subjects per evidence source: **48 subjects maximum**.

**Reason / tradeoff:** Bound evidence fan-out and validation/model work; exact counts are chosen envelopes.

[Implementation starting point](../../packages/domain/src/appraisals.ts).

## PB10

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Evidence references per authored feeling: **8 references maximum**.

**Reason / tradeoff:** Bound evidence fan-out and validation/model work; exact counts are chosen envelopes.

[Implementation starting point](../../packages/domain/src/appraisals.ts).

## PB11

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Saved internal feeling source version: **2,048 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/domain/src/appraisals.ts).

## FL19

**Proposed — psychological-needs coverage and authored policy, October 3, 2026 · Restrictiveness: Medium.** The initial humanlike resident must have meaningful opportunities for bodily experience, contact/belonging and enjoyment, including chosen solitude and independent interests. This is product coverage, not a fixed emotion vocabulary, universal need count, numerical social meter or identical behavior in every episode. Existing sparse appraisals and accepted self/relationship understanding are the first supported representations; current automatic feeling enrollment is unchanged.

**Reason / tradeoff:** Multidimensionality should affect the life the player encounters while avoiding compulsory meter maintenance. Every selected concern needs a cause, meaningful satisfaction/recovery or reprioritization, permitted context and a stopping condition. Missing mechanical effects remain unsupported until explicitly designed and installed; prose cannot silently supply them. Current record, cause, lifetime, privacy and capacity controls remain with FL01–FL18 and their owners. [CE01/CE02/CE05](../maintainers/character-experience.md) and [D69](../../archive/05-project/open-decisions.md#d69--multidimensional-character-experience) own selection and full-flow qualification; no optimal tuning or psychological validity is claimed.
