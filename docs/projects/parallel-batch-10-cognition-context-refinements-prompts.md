# Parallel batch 10: cognition context refinements

Two independently completable implementation assignments use the existing [feature specification](../features/situation-aware-cognition-context.md), [technical contract](../technical/situation-aware-cognition-context.md#171-shared-preparation-and-parallel-ownership) and [SC tracker](../maintainers/cognition-context.md). The [shared baseline](../verification/situation-aware-cognition-context.md#october-31--shared-preparation-baseline) is complete on the supplied local `codex/cognition-lab` branch; it is not assumed merged into `main` or pushed. The original allocation starts both worktrees from the same checkpoint. The proposed branch names were absent locally and on origin when allocated. Assignment B is now delivered in `codex/cognition-lab`; retain its prompt as the allocation record, rather than launching it again. Assignment A and combined qualification remain open in the [SC tracker](../maintainers/cognition-context.md).

The context pipeline is the larger critical path; output admission can finish alongside it. Each includes its own callers, documentation and scoped verification. Their combined qualification follows technical §17 step 7 after integration. The existing pair and tracker remain the scope owners; no duplicate allocation specification or backlog is introduced.

# A: Complete cognition context pipeline

```text
Implement faithful, question-specific character context with bounded preparation and one coherent final request (SC01–SC03). Follow AGENTS.md and applicable guidance.

Start readiness: Ready on the supplied local codex/cognition-lab branch containing the October 31 shared-preparation baseline and technical section 17.1. Use that explicit local base, not main or origin/codex/cognition-lab if they lack this checkpoint. Verify the recorded source baseline 9c7f9aebe98c006af1292e1f274f1374681b343f is an ancestor.
Open prerequisites: None on that supplied base. The baseline is docs/verification/situation-aware-cognition-context.md#october-31--shared-preparation-baseline; private captures are optional local evidence, not a starting prerequisite.

After selecting and refreshing that base under AGENTS.md, create and switch to codex/cognition-context-pipeline.

Read, in order:
- docs/features/situation-aware-cognition-context.md and docs/technical/situation-aware-cognition-context.md §§5.2, 6.1, 7.6, 11, 13.1, 17: the accepted behavior, ordering and accounting contract.
- The shared-preparation baseline and technical §17.1, then docs/maintainers/cognition-context.md SC01–SC03 and docs/limits/cognition.md.
- The applicable acceptance in docs/verification/situation-aware-cognition-context.md; consult docs/projects/completed/2026/situation-aware-cognition-context-evidence-and-decisions.md for accepted rationale.

Reuse the completed baseline portion of technical §17 step 1; deliver its remaining caller integration and steps 2–5 in order. Cut over typed occurrence projection and all readers together; preserve stable indexing text. Then implement chronological exchange/required-source union and actual compact-source fitting. Declare real consumer questions before expansion, separate capability directories from selected invocation details, and complete dependency-aware selection/finalization using existing primitives.

Primary owners are perceived-context.ts, recall.ts, appraisal-context.ts, conversation-context.ts, response-context.ts, decision-context.ts and decision-context-selection.ts and cognition-maintenance.ts under apps/server/src, plus existing capability owners. In ai-director.ts and decision-preparation.ts, own input preparation and measurement; technical §17.1 allocates the shared files by responsibility. Cover all five prepareDecision callers, including reflection. Preserve existing output/admission semantics, ordinary defaults, closed alternatives, exact references, privacy, actor scope and current lifetime behavior. Update every affected existing consumer, including consolidation/narration readers; add no new call pipeline or world-specific engine policy. Preserve delivered SC12 schema factoring; its deferred revision/work-mode projection is excluded.

Retain quiet interests and meaningful alternatives; shorter context must not narrow characters into task machines. Finish and verify this scope on its starting base even if no other assignment runs. Use the baseline and selected static/manual/native checks; automated suites and test authoring remain paused. Demonstrate complete required meaning, stable bindings and honest bounded failure, not model-quality improvement from smaller text alone. Demonstrate preparation work and exact request sizes through the actual affected callers, preserving valid baseline evidence. Update the named canonical docs, SC01–SC03, applicable limits and scoped verification evidence. Leave combined SC09 qualification open for the later integrated change.
```

# B: Bound responses and component admission

```text
Make character responses reference real editable goals and prevent one invalid dependency from discarding independent valid contributions (SC04). Follow AGENTS.md and applicable guidance.

Start readiness: Ready on the supplied local codex/cognition-lab branch containing the October 31 shared-preparation baseline and technical section 17.1. Use that explicit local base, not main or origin/codex/cognition-lab if they lack this checkpoint. Verify the recorded source baseline 9c7f9aebe98c006af1292e1f274f1374681b343f is an ancestor.
Open prerequisites: None on that supplied base. The baseline is docs/verification/situation-aware-cognition-context.md#october-31--shared-preparation-baseline; private captures are optional local evidence, not a starting prerequisite.

After selecting and refreshing that base under AGENTS.md, create and switch to codex/cognition-response-admission.

Read, in order:
- docs/features/situation-aware-cognition-context.md and docs/technical/situation-aware-cognition-context.md §§7.6, 9.7, 17 step 6: shared response guidance, exact target binding and failure isolation.
- The shared-preparation baseline and technical §17.1, then docs/maintainers/cognition-context.md SC04 and docs/limits/cognition.md.
- Applicable acceptance in docs/verification/situation-aware-cognition-context.md and accepted rationale in docs/projects/completed/2026/situation-aware-cognition-context-evidence-and-decisions.md.

Extend boundResponseSchema in apps/server/src/cognition-contracts.ts with captured actor-owned native goal identities and supported aliases, preserving native eligibility and null meanings. Add and integrate that narrow capture on the existing preparation boundary; do not depend on a future context representation or infer targets from display text. Consolidate existing response guidance there. Preserve repaired immediate/plan action references, current defaults, route/lifetime/privacy guards and native authority.

Implement structural versus dependency failure separation at packages/domain/src/response.ts. Exclude dependency-invalid operations and blocked dependents before paid grounding, retaining the original envelope, independent outcomes and receipt identity. Update ordinary/higher generation, supplied responses, entity resolution and private preview together through ai-director.ts, decision-preparation.ts and existing grounding owners. Keep malformed or ambiguous envelopes as whole-response failures. Do not add retries, salvage schema-invalid targets, suppress gestures or introduce new world policy. Preserve delivered SC12 schema factoring; its deferred revision/work-mode projection is excluded.

Finish and verify this scope using existing context preparation, without requiring another assignment's changes. Under the paused-suite/test-authoring policy, obtain focused static/manual/native evidence for independent speech beside an invalid dependency, blocked dependents, valid mixed operations, goal aliases and duplicate identities through applicable callers. Synchronize the named docs, SC04, limits and scoped verification evidence; leave combined SC09 qualification open for later integration.
```
