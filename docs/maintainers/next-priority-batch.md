# Next priority batch — five assignments

**Status: in progress; NP02 and NP04 are delivered, while the other assignments and combined acceptance remain open.** The original October 2 planning pass completed no runtime work. The [feature specification](../projects/next-priority-batch-feature-spec.md) owns intended behavior, selection rationale and acceptance. The [technical design](../projects/next-priority-batch-tech-design.md) owns mechanisms and shared contracts. [Copyable prompts](../projects/next-priority-batch-prompts.md) supply standalone entrypoints.

These are scoped children of existing work, not replacements for their parent trackers. Current source was inspected at local `main` `c2e670b0` on October 2, 2026. The preceding PW work is substantially implemented, with open integration and qualification; do not treat its old proposal paragraph or an unchecked broad gate as proof that its implementation is missing.

## NP01 — Reliable AI outcomes and spending

**Priority 1 · proposed · ready from the audited base.** Repair shared provider/accounting behavior before expanding its consumers. A completed model call with an unknown price must not be treated as free; a rejected call must not be confused with an unfinished one. Configured allowance and context-limit failures should obey their existing accepted meanings.

- [ ] Deliver adapter outcome/dispatch classification, shared reported-cost decoding and authoritative settlement validation, removal of the hidden monthly $50 clamp within the already accepted configuration range, and existing `context-exceeded` reporting for required-context overflow.
- [ ] Demonstrate the [NP01 feature acceptance](../projects/next-priority-batch-feature-spec.md#np01--reliable-ai-outcomes-and-spending) through the actual callers and reconcile [NP01 design](../projects/next-priority-batch-tech-design.md#np01--reliable-ai-outcomes-and-spending) records. Preserve uncertain exposure, immutable receipt ownership, normal final admission and no automatic paid retry.

Parents: [MW05](macrofold-worker-api.md#mw05--outcome-classification-and-request-body-fixtures), [level-1 follow-ups](TODO.md#level-1-decisions-follow-up), CR12/CG09, WW07/WW11 and their WAF02/IER04 accounting/recovery scope. MW04 deployment and the existing deferred request-body fixture are not automatically closed. NP05 may edit provider streaming hooks, but classification and settlement remain NP01's responsibility.

## NP02 — Sensory work follows changed objects

**Priority 2 · delivered in this branch.** Eliminate repeated all-source preparation for a small known change while preserving every existing observation and event-order contract. PW08's delivered cache optimizations are prerequisites already present, not tasks to reimplement.

- [x] Deliver phase-specific complete-change notices, incremental derived source/index maintenance, old/new-neighborhood observer selection, safe snapshot succession and conservative rebuild fallback.
- [x] Demonstrate [NP02 acceptance](../projects/next-priority-batch-feature-spec.md#np02--sensory-work-follows-changed-objects), including fleeting observations, intermediate phases, fork/cancellation/restore and sparse growth versus dense first exposure; reconcile the [source-preparation design](../projects/next-priority-batch-tech-design.md#np02--sensory-work-follows-changed-objects).

Delivery and measured limits: [October 3 evidence](../verification/perception-reaction-intake.md#np02-sensory-preparation--october-3-2026). Warm source preparation stays constant across 100–5,000 distant objects; exact observation traces match the full-preparation reference. Follow-up review repairs stale contact starting positions after unknown/overflowed command edits and verifies initialization plus ordinary native advancement against full preparation. Small-scene timings are mixed, dense native CPU remains higher in the recorded profiles, and short PostgreSQL runs do not qualify capacity.

Parents: [EPR02](events-perception-and-reactions.md#epr02--eliminate-redundant-full-world-sensory-scans), PF12.3/PF13.11, [proportional stage 2](../projects/proportional-step-work.md#stage-2--sight-work-follows-change) and C18. No closure of whole-world publication cost, genuine first-exposure fan-out, all simulation stages or production capacity follows from this task.

## NP03 — Craft with an invented material

**Priority 3 · proposed · ready from the audited base.** Make one useful invented intermediate safely reusable by a second recipe, establishing the positive-consumer pattern instead of merely disabling a restriction.

- [ ] Deliver the world-authored cordage family and positively certified binding input for woven containers through existing invention admission, dependencies, craft and custody.
- [ ] Demonstrate [NP03 acceptance](../projects/next-priority-batch-feature-spec.md#np03--craft-with-an-invented-material), including actual manufacture, rejected impostor/stale/private inputs, resource conservation, reuse and current-format reopen; reconcile [NP03 design](../projects/next-priority-batch-tech-design.md#np03--craft-with-an-invented-material).

Parents: INV-3.5/INV-6.1–6.2, EWF09 and RF01. PW02/PW03 already supply the family/metadata/container mechanisms. Arbitrary recursive invention, assemblies, live-law replacement, generated code and automatic recipe knowledge remain outside this child.

## NP04 — Find and choose camp supplies

**Priority 4 · implemented and scoped acceptance passed October 3, 2026.** Connect existing camp activities to complete permitted discovery and explicit character inspection rather than arbitrary prefixes and an unusable narrowing warning.

- [x] Deliver role-filtered paged discovery, shared storage selection, exact selected identity, explicit approach/inspection, stale recovery and an accessible camp form.
- [x] Demonstrate [NP04 acceptance](../projects/next-priority-batch-feature-spec.md#np04--find-and-choose-camp-supplies) through real game UI and actual native effects; reconcile [NP04 design](../projects/next-priority-batch-tech-design.md#np04--find-and-choose-camp-supplies). [October 3 evidence](../verification/camp-life.md#np04--camp-supply-discovery-october-3-2026) records native effects, privacy/reopen, keyboard/wheel/layout checks, cold/warm work and zero paid spending. The requested follow-up review additionally verifies moved-source continuation, retired selections and disconnected/late storage reads; wider qualification remains with the parents below.

Parents: PW03/PW04/PW10, AC07/AC11, PO07, BW19 and UIUX02–UIUX04. Broader real model retention/reuse and uncoached/large-content qualification remain in PW10/PW04 until actually demonstrated. Current materials and containers are sufficient; NP03 is not a dependency. No new survival activity or learning algorithm is included.

## NP05 — Read NPC replies before generation finishes

**Priority 5 · proposed · feasibility can start; implementation is gated.** Extend structured character replies, separately from plain-text World Agent streaming, with a permitted unfinished preview and unchanged final gameplay admission.

- [ ] Establish the NP05 actual-route feasibility/latency gate before preview/UI implementation. Lack of safe early output remains an explicit blocker, not a completed streaming feature.
- [ ] Deliver bounded structured decoding, established viewer eligibility before release, attempt-scoped preview delivery, client display and final reconciliation through the actual character reply path.
- [ ] Demonstrate [NP05 acceptance](../projects/next-priority-batch-feature-spec.md#np05--read-npc-replies-before-generation-finishes), including privacy/cancellation/late output and actual browser-visible output before whole-response completion; reconcile [NP05 design](../projects/next-priority-batch-tech-design.md#np05--read-npc-replies-before-generation-finishes).

Parents: NC19 with NC02/NC10, CR02/CR12 and existing provider contracts. Scope is the direct player/NPC conversation defined by the design. Other structured explanation callers are inventoried, not silently qualified. Supported final-only fallback is required but does not pass the live streaming criterion. If the configured provider cannot supply safe incremental output, that criterion remains blocked and the task is reported incomplete; do not change models or add a second request to simulate it. PW05/PW11 owner-chat/workspace qualification remains separate.

## Dependencies and completion accounting

The [parallel boundaries](../projects/next-priority-batch-tech-design.md#parallel-boundaries) settle shared meanings without worker communication. The first four assignments have their implementation prerequisites on the current base. NP05 first resolves its documented provider/latency gate. There is no invented coordination stage or sixth integration engineer. Estimated effort and logic changes belong to the task design, not a guaranteed schedule.

When delivered, update the exact overlapping requirements above and their canonical specs/limits. Check a parent only when its whole exit is satisfied; otherwise name the delivered child and preserve the remaining work and actual evidence limitations. Source inspection is not runtime verification. Keep authored evidence summaries with their topic reports and raw generated output outside Git, following existing documentation policy.
