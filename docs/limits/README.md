# Tracking limits and constraints

A limit is a chosen restriction on capacity, access to supported features, selection, retention, scheduling or behavior. It need not be a number: “only search the current bag” and “one login provider” qualify. Track deliberate **no limit**, removed limits and supported-feature boundaries as well as active caps. This register is an inventory, not a mandate to expand everything.

## One owner per purpose

- The feature specification owns behavior and accepted requirements.
- `docs/limits/<feature>.md` owns that feature’s limit inventory, reason and restrictiveness. A shared mechanism belongs to its owning feature once; consumers link to it. Do not create a second inventory in each project that touches it.
- The focused maintainer tracker owns implementation tasks, dependencies and acceptance. [Limits to revisit](../maintainers/limits-audit.md) ranks proposed limit changes and links those tasks; it does not duplicate their checklists.
- [The index](../openlegend-limits-decisions.md) locates inventories and the original audit IDs. [Import coverage](import-coverage.md) records source disposition, not another set of limits.
- [Policies to revisit](../maintainers/revisitable-policies.md) retains decision authority and triggers for accepted policies. Keep a cross-reference when a concrete limit-change candidate is added to the backlog; do not copy that policy register here.

## Entry structure

Each entry needs a stable ID, the value or behavioral restriction and its scope/units, status and evidence baseline, restrictiveness, a short reason/tradeoff, and an implementation/specification reference. Describe what happens at the boundary: refusal, omission, paging, waiting, eviction or pause. A compact paragraph is enough; group related constants only when their scope and reason are the same. Record “reason unknown” when no basis is established; an engineering explanation is not evidence that an exact number is optimal.

Use **Current**, **Reported** (implementation handoff, not independently rechecked), **Historical — needs recheck**, **Proposed**, **Removed** or **No limit**, qualified when necessary. Separate status from restrictiveness. Original `LA001`–`LA238` mean audit numbers 1–238; never renumber them. Feature prefixes identify newer entries, and imported report IDs remain stable even if their feature file changes. Moving an ID requires updating every inbound link. Do not reuse a retired ID.

A removed/no-limit entry still says what was removed, why, and which independent controls remain. Removing a stored-count cap does not permit unlimited per-tick work, model input or spending. Keep the removal record in the inventory after deleting the completed task from the backlog.

## Restrictiveness

Preserve the original audit vocabulary; these are qualitative judgments, not benchmark certifications:

| Rating      | Meaning                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------- |
| Very safe   | Strongly restrictive; may exclude substantial valid content, evidence or supported activity. |
| Safe        | Conservative allowance, bounded batch or short window.                                       |
| Medium      | Moderate envelope or a supported behavioral choice whose generosity is context-dependent.    |
| Liberal     | Substantial finite work/information allowance; qualification still required.                 |
| Too liberal | Unbounded growth or a known growth problem remains.                                          |

“Very safe” does not mean good gameplay or secure. Use `— (removed)` or `— (superseded)` when no current bound remains to rate; retain the original removal status. A no-limit policy with real unchecked growth can be **Too liberal**. For grouped settings, rate the consequential restriction and explain the tradeoff.

## What belongs here

Include engineering envelopes, tunable safety values, product defaults, authored-world balance choices, unsupported operations, implementation shortcuts and restrictions that hide information. Ordinary page/cache/buffer sizes belong in the inventory even when no change is recommended. Distinguish caps on total retained content from per-request work and from display-only previews. Keep authored base-world values separate from universal engine bounds.

Do not turn pure correctness obligations into tuning candidates: authorization/private-human boundaries, consistent identity, exact references, atomicity, no double spending or executable generated code. A discretionary implementation around an obligation still belongs: single-writer ownership, chosen payload limits or a broad invalidation strategy can change while correctness remains. Mixed findings retain their discretionary part and identify the invariant. [Import exclusions](import-coverage.md#excluded-original-entries) preserve references for old audit entries that are solely invariants.

## Update with the feature

When creating or changing feature documentation, follow [Feature documentation](../feature-documentation.md). When a change introduces, changes, removes or explicitly declines a limit, update its entry in the same change, including rationale, overflow behavior, source and baseline. Read only the inventories owned or consumed by the changed behavior; this is not a requirement to reload every feature.

Check schema, configuration, persistence, API, model request and UI consumers for inconsistent limits. A bounded page should expose remaining data; truncation or selection must be explicit. Where omissions matter, distinguish available, considered, selected and omitted records and explain the reason. Align complete provider requests with enforced transport/response limits and preserve essential context when optional selection fails; this does not authorize paid retries.

Reconcile the focused tracker and any backlog item. Remove completed backlog items, not inventory entries. Record consequential policy changes in the documentation changelog; update revisitable-policy triggers where relevant. Do not silently change an accepted specification to fit a runtime defect. New numbers are proposals until adopted; don't imply unrun performance or quality evidence.

## This migration’s scope

The original 238-entry audit is retained by ID across feature files and two explicit integrity-only exclusions. The repository already held a copy in the old limits-audit tracker; the two copies were compared, not imported twice. LA176 incorporates the newer streaming-save state. Selected superseded findings (LA014, LA080, LA127, LA164, LA167, LA172, LA176) were reconciled against the merged code. Remaining old findings are clearly historical, not a fresh whole-code audit.

Both supplied implementation reports are assessed item by item in import coverage. Their current numbers are reported baseline choices, not measured optimal values. No runtime limits, permissions or paid-work policies change in this documentation migration. The previously deferred full audit/qualification remains separate from this explicitly requested inventory work.
