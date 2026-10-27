# Adaptive implementation workflow — feature specification

| Status      | Current progress                                                                                          | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Operational guidance and named migrations are verified locally; fresh-session routing remains unobserved. | 2026-10-24   |

Design updated 2026-10-21T23:32:40-04:00, America/New_York. Mike explicitly authorized adoption on October 24, 2026. The operational workflow and documentation system are installed on the adoption branch; this package retains scope and rationale, while [CG34/CG05](../../maintainers/agent-guidance.md) owns adoption and observed-runtime gaps. Gameplay acceptance remains with its original owners.

## Purpose and scope

Deliver complete, robust features with the least process that establishes the agreed result. Choose implementation and verification around the task's dependencies and actual risks. Preserve architecture, security, performance, and gameplay guarantees without turning every small change into another review, benchmark, or documentation checkpoint.

The principal issue is which activities become mandatory. Select checks for accepted requirements and concrete risks; reopen work for a new finding or invalidated assumption. A useful optional investigation is not automatically another deliverable.

In scope: implementation planning/execution, selective context, review repetition, verification selection, performance scope, continuity, documentation organization, commit cadence, and conflicting companion instructions. Gameplay, spending limits, the protected development-save policy, mandatory conflict stops, and existing accepted checks are unchanged. No new agent framework, test programme, or productivity-reporting system is proposed.

## Package navigation

- [Technical design](02-workflow-tech-design.md): owners, routing, performance chapters, adoption, and validation.
- [Adoption plan](03-instruction-edit-plan.md): scope, canonical owners and remaining acceptance.
- [Implementation workflow](../../../.agents/rules/implementation.md): operational guidance for authorized code and configuration work.
- [Audit and research](../../research/agent-workflows/archive/2026/2026-10-21-workflow-audit.md): observed problems, primary sources, and limits of the diagnosis.
- [Documentation system](06-documentation-system-design.md): file ownership, indexes, growth, and completion filing.

These are design artifacts, not a mandatory reading package for future implementation. Those tasks load the operational workflow and relevant contracts. The audit supports the design but does not establish a measured speedup or an exact explanation of all elapsed time.

## Required workflow behavior

### Select the execution plan for the task

The implementation workflow governs authorized changes to product behavior or maintained code/tooling, including behavior-affecting data and configuration. Questions, research, prioritization, prose-only edits, design-only work, findings-only review, and history reconciliation do not activate it. A disposable analysis script alone does not change task mode.

Infer the outcome from the task, prior answers, current code/contracts, and valid evidence. Plan the whole agreed assignment at dependency level, detailing the next connected unit. A small fix can use a short conversation plan. Use an existing durable plan for substantial uncertainty, cross-layer contracts, or long-running work; line counts and file counts are not documentation triggers.

Choose timing to reduce expected rework. An uncertain foundation that could invalidate substantial implementation deserves an early executable example. Otherwise build connected behavior through its consumers before overlapping integration checks. A coherent crafting-and-use journey can be a better unit than separate checks after each helper edit. These are choices, not a prescribed sequence for every task.

### Preserve quality without importing production ceremony

Reuse the existing owner of each behavior, trace the changed producers and consumers, and correct shared defects at their common cause. Keep world laws, content, tuning, and wording in world configuration; keep reusable mechanisms in the engine. Prefer a narrow extension seam for an actual requirement over a speculative framework.

Preserve meaningful guarantees: who may use another character's materials, what a character can actually know, same-format save/load integrity, real spending, and effects already committed, such as a released arrow or consumed material. This zero-player development stage does not require legacy support or blanket production hardening. Check high-risk assumptions early when real resources or substantial dependent work are at risk; topic names such as privacy or saving do not automatically require immediate testing.

Review the complete affected change and relevant contracts once. After fixes, inspect the corrections and affected assumptions. Broaden only when a finding invalidates earlier review. Fix in-scope correctness and architecture defects; record significant out-of-scope findings once without turning every possible improvement into a task.

### Choose adequate evidence and stop at its purpose

Retain the default against new maintained automated tests. Reuse existing checks and tools, with small disposable scenarios when needed. Explicitly required tests remain required. Simplify repeated setup or repair its demonstrated defect; do not replace an oversized temporary script with a new maintained suite. Fixture repair is verification work, not delivered gameplay.

Check selection is proportional to consequence and uncertainty. Preserve required local gates and explicit full-suite checks; consolidate expensive overlapping verification after relevant implementations stabilize. Reuse evidence while its assumptions hold, including dependencies outside the directly changed file. A targeted pass is not a successful full-suite run.

Distinguish the following when the difference affects cost or completion; no classification form is required for each check:

| Obligation                | Completion                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| Required behavior         | The promised behavior works, with adequate evidence.                                                      |
| Required measurement      | The specified workload ran validly and its result, including failure, is recorded.                        |
| Required performance pass | The specified workload meets its threshold; otherwise the obligation remains unmet.                       |
| Exploration               | A bounded question is answered; the diagnostic workload does not automatically become supported capacity. |
| Human/external acceptance | Evidence comes from actual participants or the required external system. Fixtures cannot replace it.      |

Do not silently reinterpret a pass requirement as measurement only. Existing authorization covers routine implementation and verification choices; only consequential unresolved decisions need user input. Failure of an optional diagnostic does not itself authorize indefinite optimization.

### Design for performance, measure when useful

Consider frequency, growing inputs, unnecessary copies, repeated scans, and shared preparation before choosing algorithms. Use existing indexes and owners. A simple removal of repeated pure work may need source reasoning and correctness checks rather than profiling. Invasive caching, scheduling, geometry, or representation changes need evidence proportional to their uncertainty and impact. Numerical speed claims require suitable measurements.

“Glaring” means a substantial reachable regression, starvation/deadlock, uncontrolled resource growth, accidental multiplicative work on a plausible path, or an obvious low-risk shared correction. It does not mean minimizing every measurable cost. Intentionally retained game history is not a defect merely because it grows.

Use required stress workloads as specified. For optional diagnostics, start with ordinary or plausible near-term use and the smallest workload that can answer the identified risk; increase only when needed. Define the question and finish condition before expensive work. Purposeful repetitions can measure variance or reproduce a defect. Do not chase a favorable run or automatically optimize each newly largest cost.

Keep actual progress, settings, workload, observation overhead, waits, retained memory, and paid cost with relevant measurements. Check only prerequisites used by the run, reuse still-valid observations, and distinguish product, fixture, and environment failures. Continue independent work when a prerequisite is unavailable. Preserve gameplay and failed results.

### Keep continuity and documentation inexpensive

For work spanning sessions or substantial stages, keep one short current-progress section in the existing task owner: unfinished scope, consequential decisions, next action, applicable evidence, and resources or financial uncertainty. Replace stale content. Small tasks need no new progress artifact.

Resume from that summary and the current diff, then load only needed contracts or evidence. Compaction, another commit, or a status question does not restart base selection, full review, or qualification.

Use the [documentation system](../../documentation-system.md). Current contracts, unfinished tasks, research, evidence, and history have distinct owners. Growing records use coherent questions/campaigns or dated filing units. Indexes guide to topics or date folders without enumerating every historical file. Completed projects leave the active area; useful current contracts remain discoverable. Missing required human evidence remains open.

Batch updates at meaningful boundaries and before handoff. Preserve dates for actual changes, not unchanged reviews. Make commits at coherent or risk-sensitive boundaries and before handoff, without a fixed timer or an attached documentation/testing ceremony.

### Finish the authorized assignment

Complete available implementation, integration, documentation, review fixes, and required checks. A phase is a checkpoint, not a reason to stop. A genuine blocker prevents its dependent work, not independent obligations. Once agreed work and evidence are complete, finish; do not expand scope to fill blocked time or pursue optional improvements indefinitely.

Report software readiness, independent character/provider evidence, and real-player experience separately. Do not claim comprehension or enjoyment from fixtures. Existing spending, ownership, branch, commit, and merge rules remain controlling.

## Acceptance and maintained records

Adoption must preserve unique constraints, route by task intent, reduce redundant obligations and routine context, keep the test-authoring default, and make current contracts/unfinished work discoverable without loading historical collections. Verify links, formatting, structural guidance checks, and representative routing. Structural validity alone proves neither correct agent behavior nor faster delivery.

Judge efficiency through ordinary subsequent tasks and delivered quality, without a new measurement programme. The existing guidance tracker owns adoption and unresolved routing evidence; this proposal needs no new gameplay limits inventory. Scope and remaining acceptance are in [the adoption plan](03-instruction-edit-plan.md).

## Maintained records

[CG34 adoption and CG05 dispatch](../../maintainers/agent-guidance.md) own remaining work and evidence. [The documentation system](../../documentation-system.md) and installed guidance are current operational owners. This guidance-only change adds no gameplay limits inventory.
