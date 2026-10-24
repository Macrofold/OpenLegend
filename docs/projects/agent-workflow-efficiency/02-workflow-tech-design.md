# Adaptive implementation workflow — proposed technical design

| Status      | Current progress                                                                      | Last updated |
| ----------- | ------------------------------------------------------------------------------------- | ------------ |
| Not started | Ownership, routing, migration, and verification are designed; adoption has not begun. | 2026-10-22   |

Updated 2026-10-21T23:32:40-04:00, America/New_York. Related behavior: [feature specification](01-workflow-feature-spec.md). Exact changes: [edit plan](03-instruction-edit-plan.md). This is a documentation-system change, not a replacement coding harness or a game architecture redesign.

## Architecture: a short entry point and one owner per obligation

| Owner                                      | Responsibility                                                                                                    | Loaded when                                                                                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                                | Task mode, authority, hard boundaries, protected save policy, concise communication, completion, top-level routes | All repository tasks                                                                                                |
| New `.agents/rules/implementation.md`      | Adaptive execution and continuity                                                                                 | Product or maintained code/tooling changes are authorized                                                           |
| New `.agents/rules/engineering-context.md` | Compact map of affected-contract reads                                                                            | Planning, implementing, or reviewing executable behavior; an explanation only loads the contracts it actually needs |
| Existing performance skill                 | Short universal cost/design principles plus conditional topic routes                                              | Executable design, implementation, review, or performance investigation                                             |
| Performance contract and topic chapters    | Current performance requirements, with separately loaded technical detail                                         | Matching mechanism or measurement                                                                                   |
| Existing verification rule                 | Choosing and interpreting checks; databases, spending, and environment controls                                   | Verification or executable work                                                                                     |
| Existing review skill                      | Review coverage, finding severity, and follow-up scope                                                            | Required implementation review or explicit review request                                                           |
| Existing documentation rule                | Short ownership/update policy; conditional route to the documentation-system guide                                | Documentation is being created or changed                                                                           |
| Existing design skill                      | Proposed product/architecture contracts and approval boundary                                                     | Design requests or material contract decisions                                                                      |
| Existing rebase skill                      | Base selection and history protection                                                                             | Actual implementation startup or requested reconciliation                                                           |

Use a rule file for the implementation workflow rather than a new discoverable skill. Its trigger is authorized product or maintained code/tooling work, including behavior-affecting configuration, not a keyword or file extension. This adds no skill-description tokens and avoids making “workflow design” activate implementation. The root explicitly links the rule; an incidental link elsewhere is insufficient.

The new engineering map replaces the long technical route catalogue in the root. It is a map, not another mandatory handbook. Read the map once when applicable, then only matching contracts. Keep routes shallow: root → topic map or skill → canonical section. Package guidance retains local boundaries and links to the same owners. Do not copy all policy into package files.

### Mode selection

| Request                                              | Execution route                                                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| “Implement the gate feature”                         | Implementation workflow, relevant engineering contracts, verification, review                                          |
| “Change animal behavior through world configuration” | Implementation and affected world/engine contracts, even without executable source edits                               |
| “Design a gate feature; do not implement”            | Design and relevant contracts; scoped authorized experiments allowed, without implementation startup                   |
| “Why is gate opening slow?”                          | Targeted diagnostic/research guidance; implementation workflow only if fixing is authorized                            |
| “Review and fix this branch”                         | Review begins with the requested scope; implementation workflow governs actual fixes without an extra permission cycle |
| “Findings only”                                      | Review and relevant contracts; no implementation workflow or edits                                                     |
| “Correct the gate's help text”                       | Relevant wording/UI/world guidance; implementation applies if the wording changes runtime interpretation or behavior   |
| “Continue” after context loss                        | Resume the existing authorized mode and progress record; no automatic fresh startup                                    |
| “Rebase this branch”                                 | Rebase-specific workflow and its selected checks; not fresh feature acceptance                                         |

The current request and prior authorization determine mode. A disposable research script may need relevant technical/verification guidance without activating implementation or base selection. Design can use scoped experiments where authorized; it does not grant product changes. No mode questionnaire is required.

## Engineering coverage

Keep the existing owners and conditional routes for authorization, world/engine separation, complete identity, asynchronous continuation, private knowledge, current-format saving, UI/asset behavior, and performance. The new map preserves these reads for changed producers and consumers, including new files. Reusing a helper is not sufficient if its caller bypasses the contract. A shared defect needs a correction at its common owner; a design seam does not require unused infrastructure.

Guarantees stay strict while check timing remains proportional. A complex contract may need broad verification; a small edit does not inherit every historical check linked from that contract. [Edit plan](03-instruction-edit-plan.md) names the preserved routes and protected policy.

## Performance guidance restructuring

Use a short skill core with explicit conditional links. Keep `docs/performance.md` as the current performance contract and navigation entry; move its detailed material into the chapters below, consolidating overlapping skill advice there. Adding all that advice to the existing 101 KB file would preserve the loading problem.

| Destination                       | Existing material and required trigger                                                                                                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/performance/preparation.md` | Recurring work, growing command results, inactive history, derived preparation/invalidation, complete-result construction, and simulation/history growth. Read for repeated collection work, caches, retained data, or changed prepared reads. |
| `docs/performance/scheduling.md`  | Work placement, triggered background work, batching/backpressure, bounded admission, native bursts, and fairness. Read for queues, workers, asynchronous coordination, or recurring scheduling.                                                |
| `docs/performance/storage.md`     | Compact transactional persistence and storage execution. Read for changed queries, schema/indexes, snapshots, or persistence preparation.                                                                                                      |
| `docs/performance/spatial.md`     | Spatial cost/scheduling, navigation failure/shutdown, sensory budget, and hearing costs. Read for movement, geometry, navigation preparation, or sensory candidate work; retain links to the authoritative spatial contract.                   |
| `docs/performance/measurement.md` | Optional measurement, complete-path attribution, settings/workload/progress, instrumentation cost, cold/warm results, CPU/waits, retention, and variance. Read when measuring or interpreting performance, not for every ordinary feature.     |

These are topic chapters, not new copies of requirements. Preserve existing thresholds and their scope in one owner; link rather than restating them. Place implementation tradeoffs with their mechanism. Keep historical measurements at their existing evidence owner or the documentation system's dated benchmark records. Repair affected links and retain temporary forwarding headings only where needed.

Route directly to applicable sections/chapters, never all five as a bundle. Keep ordinary frontend guidance in its existing React/PlayCanvas owners. The short skill supplies general principles; verification policy selects whether a run is needed. This partition changes documentation, not game guarantees or benchmark targets.

## Verification selection and invalidation

For substantial tasks, the existing plan identifies needed outcomes, suitable evidence, timing, and the requirement basis when it affects completion. No separate matrix or per-check worksheet is required. Check early only when uncertainty threatens real resources or substantial dependent work; otherwise consolidate connected verification after relevant code stabilizes. The existing default against new maintained tests remains.

Evidence identifies revision/diff, settings, workload, actual consumer, result, and limits. Shared admission, initialization, representation, or scheduling changes can invalidate evidence even if a checked file was untouched. A new commit alone does not. Record why a consequential result is reopened; routine reuse needs no new note.

Performance correctness includes starvation and uncontrolled retention, but intentional history growth is not automatically a defect. For optional stress choose the smallest discriminating workload; accepted population measurements and pass gates retain their separate meanings. [Workflow draft](04-implementation-workflow-draft.md) owns execution; [edit plan](03-instruction-edit-plan.md#4-verification-policy) specifies the policy changes.

## Documentation and continuity

[Documentation system](06-documentation-system-design.md) owns the proposed layout, filing units, indexes, and migration. Adopt its compact operational rules as `docs/documentation-system.md`; this full design package remains optional historical design material. The short documentation policy routes to the relevant section when creating, splitting, moving, or reconciling documents. A local wording correction does not load the entire system.

Keep one short current-progress section in the existing task owner: unfinished scope, important decisions, next action, applicable evidence links, and resources or financial uncertainty needed for safe continuation. Replace stale content. Do not create a plan, progress file, and second tracker for the same work. Current contracts, TODOs, and historical measurements have separate owners and are linked rather than copied.

Root and topic indexes select the needed owner or dated record; they are not required reading lists. Load contracts for affected behavior, current work for the agreed task, and specific historical records only when their evidence matters. Completed project plans are filed away, while current feature/technical contracts remain discoverable without reading archives. Shared verification has one evidence owner even when several projects cite it.

Existing checker size advisories remain advisories. The adoption goal is a complete root/ancestor instruction chain below the effective installed-agent limit with headroom, plus a smaller ordinary-task read set. Measure bytes rather than line counts when diagnosing loading; do not raise the limit or delete protected policy to conceal duplicated obligations. Collections are partitioned by their purpose and natural lifetime, not an arbitrary token quota or a new monitoring service.

## Failure handling without loops

Use existing progress signals and a finite observation window for costly runs. A stalled participant does not establish active-workload performance. Reuse valid prerequisite observations; classify product, fixture, and environment failures before repeating. Do not consume unavailable paid capacity, restart unchanged failing setup, or continue a diagnostic after it has answered its question.

Choose a different approach when information gain disappears: narrow the question, simplify setup, or continue independent work. There is no universal retry quota. Clean up only task-owned disposable resources, retaining required evidence and uncertain financial commitments. Tool availability and human participation can block evidence; implementation difficulty alone is not an external blocker.

## Adoption sequence

1. **Coordinate and pin the active guidance.** Use the current checkout and instructions at adoption time; this audit used an active worktree at `a67a7790e47a83458d3d42ee9661f1b5871d3b6d`. Do not apply stale line-number patches over the main agent's edits. Record unique constraints and preserve the protected block.
2. **Resolve policy contradictions together.** Apply the core changes to root, verification, review, documentation, design transition, and contributor guidance in one coherent change. Add the implementation-only rule. Preserve the current test-authoring default and remove contradictory review/timing obligations.
3. **Shorten required loading.** Move the technical route catalogue into the engineering map and partition performance detail under the explicit chapter routes. Preserve explicit routes and matching-mode semantics. No change to runtime code is needed.
4. **Install documentation navigation and migrate the named entry points.** Follow [the documentation-system migration](06-documentation-system-design.md#bounded-adoption) after coordination with current writers. Promote current truth out of historical locations, separate growing records, and retain completed-project filing. Do not audit or relocate every old document before the new workflow is usable.
5. **Review and verify the instruction change.** Content/anchor review, pinned formatting, `pnpm guidance:check`, and the focused dispatch cases below. No game stress, provider calls, dependency installation, new checker infrastructure, or broad gameplay suites are required for prose-only adoption.

No instruction update is being applied in this side conversation. No active process is being stopped. This package is saved outside the worktree deliberately.

## Focused routing and behavior checks for later adoption

Use the existing CG05 approach on the agent runtime actually used for development. A small combined read-only routing exercise can cover several rows; do not run one costly agent for every sentence. These are not instructions to run agents in this side chat.

| Case                                                       | Expected evidence                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Local executable fix and new-file fix                      | Implementation rule and relevant short performance/contract routes load; unrelated subsystems do not   |
| Design-only request mentioning implementation and stress   | Relevant design context and authorized experiments only; no automatic implementation startup           |
| Question or prose correction mentioning caches             | No implementation workflow and no automatic benchmark                                                  |
| Findings-only review versus review-and-fix                 | Both preserve review scope; only the authorized fix phase activates implementation                     |
| Package working directory                                  | Complete root/local constraints and matching routes are found without requiring a root cwd             |
| Resume after compaction with valid evidence                | Reads compact current progress and current diff; no automatic full-suite or full-report restart        |
| Required diagnostic fails outside ordinary population      | Records the result and capability limit; does not invent a pass or silently waive a separate hard gate |
| Explicit pass gate fails                                   | Remains incomplete; diagnosis continues within authorization or a genuine blocker is identified        |
| Fixture rejects a valid result or a service is unavailable | Distinguishes cause, changes setup or waits on a prerequisite, avoids repeated unchanged runs          |
| Privacy bug appears during review                          | Fixes and verifies it even if rare; efficiency does not suppress high-impact defects                   |

Structural checks cannot prove the agent followed the intended trigger. Check the complete effective instruction chain in a fresh session, including native skill discovery and applicable ancestor/package guidance. Inspect actual reads and actions where available. Retain unsupported runtime/platform cases as CG05 gaps; do not make the full cross-vendor historical matrix a new automatic adoption gate. Explicit existing requirements still need their own disposition.

## How to evaluate whether this helps

Sample ordinary subsequent tasks rather than launch a benchmark project. From existing history, compare task scope, time to a working connected result, repeated setup or unchanged full checks, reviewed scope, fixture repair, selected context size, and escaped defects. Record environmental waits separately when observable. No mandatory time diary, percentage target, or agent competition is introduced.

An efficiency improvement must retain accepted scope and correctness. Reduced tool count alone can indicate skipped work. Increased test count alone can indicate wasted effort. Assess the reason for each expensive activity and the quality of the delivered result. The audit supports changing the instructions; it does not establish a numerical return before this observation.

## Maintained records

- Adoption and unresolved dispatch: existing `docs/maintainers/agent-guidance.md`.
- Guidance architecture: `.agents/README.md` after adoption.
- No new game runtime, schema, permissions, credentials, or financial caps.
- Exact migrations and replacement text: [edit plan](03-instruction-edit-plan.md).
