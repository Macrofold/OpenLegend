# Foundation review and stable regression tests

| Status    | Current progress                                                                                                                          | Last updated |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | The review, thirteen immediate tasks, five conditional improvements and ten stable foundational tests are delivered with evidence limits. | 2026-10-14   |

## Scope and completion boundary

Review the current integrated code at local `main`, commit `fa904e1da0daebf5cbc684754d3ee345215f57d7`, in Macrofold/OpenLegend. This is a snapshot audit, not integration of unfinished branches or certification of every execution path. Work is on `codex/foundation-review` in `/Users/mzw/.codex/worktrees/e5f2/OpenLegend`; the main checkout is unchanged. No remote refresh or history reconciliation is needed to review this existing snapshot.

The requested deliverables are a substantial evidence-backed critique, concrete implementation instructions, a focused immediate-work tracker, future tasks in their existing subsystem owners, and a selective foundational unit-test strategy. Production changes are recommendations for subsequent implementation. The initial narrow test slice was delivered under the request to start stable foundational tests; no broader coverage was added.

No production logic was changed. The initial tests required no new dependencies, providers, database, or game fixtures, and no runtime refactor merely to make testing convenient. The review crosses ownership and privacy boundaries, so findings need source evidence and independently checked implications; a large file or an unfamiliar pattern alone is not a defect.

## Review assignments

| Area                                            | Owners and consumers                                                                    | Review focus                                                                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Deterministic simulation, geometry and language | `packages/domain`, `packages/spatial`, `packages/language`; server and client consumers | Mutation ownership, conservation, identity, actions, invention, world rules, time, perception, memory, geometry and stable reusable primitives. |
| Server and AI execution                         | `apps/server`, `packages/ai`; HTTP, persistence, model tools and projections            | Multiplayer authority, private information, spending, concurrency, cancellation, restore, NPC cognition, invention and complete-operation cost. |
| Client and public contracts                     | `apps/client`, `packages/protocol`; server producers                                    | Player clarity, accessible interaction, stale reads, request/render cost, resource cleanup, private/public contracts and world-owned wording.   |
| Integration, tooling and test strategy          | Root tooling, scripts, tests, documentation and subsystem joins                         | Safe operational tools, existing checks, missing stable contracts, duplicate trackers and actionable sequencing.                                |

Before each area's review, read root/path instructions and the applicable architecture/behavior guidance. Use the review and performance skills throughout; load AI, UI/PlayCanvas, save/identity, action, spatial and other guidance only for matching work. Delegates write private review notes; the coordinating reviewer owns repository edits and cross-checks significant findings.

## Method and sequencing

1. Inventory source, tests and existing tracked work. Identify semantic owners and follow their real callers, rather than judging modules only by names or size.
2. Trace high-consequence operations from intent through authorization, native admission, mutation, storage and public/private presentation. Check failure, replacement and restore boundaries.
3. Record each material recommendation with a concrete condition, evidence, impact, owning paths, proposed steps, dependencies, verification and an explicit now/later rationale. Reuse existing task IDs and preserve unmet acceptance requirements.
4. Evaluate tests by stable semantic contracts, not line coverage: deterministic randomness, immutable copying, identity, resource claims, geometry and authority are candidates; changing world recipes, balance, exact prose, model choices and UI layout are not first-wave targets.
5. Add the narrow stable test slice; inspect existing setup and run only selected tests plus TypeScript checking when source tests change.
6. Reconcile a single review report, immediate TODO tracker and focused future tasks. Review all edits, check links/formatting, commit task changes and state evidence limits.

## Performance questions

Review growth with actors, observers, definitions, inventory, concurrent requests and retained history. Identify existing shared preparation and its actual dependency owner. Examine invalidation on edits, moves, control changes, cancellation and restore. Source analysis establishes a cost shape, not a measured slowdown; recommend complete-caller measurements for unmeasured concerns. No benchmarks or paid calls are implied by this audit.

## Verification and exit criteria

- All packages and shared operational/test tooling have an explicit coverage record; deep-trace boundaries and unreviewed details are disclosed.
- Confirmed findings are distinguished from hypotheses, known unfinished features and optional future improvements.
- Immediate tasks have concrete instructions and acceptance; later tasks have a focused owner and an activation condition, without duplicate task bodies.
- The foundational test plan names stable contracts, existing coverage, exclusions and a small delivery order; any new tests run with `AI_BUDGET_USD=0` and no external services.
- Changed Markdown passes pinned formatting and link/anchor review. If tests are added, their focused run and `pnpm typecheck` are recorded honestly; existing full CI remains a separate merge gate.
- No production fixes, broad test expansion, paid experiments, pushes or merges occur as part of this review.
- The complete task diff is reviewed and committed, with no task-owned uncommitted work.

## Delivered outcome

[The review report](../../verification/foundation-review.md) records source coverage and evidence limits. [FR01–FR13](../../maintainers/foundation-review-todos.md) owns immediate recommendations; five conditional future improvements are in existing subsystem maintainers. [The foundational test plan](../../maintainers/foundational-tests.md) records the ten passing tests, passing TypeScript check and deliberately excluded volatile coverage. Production recommendations remain future implementation, not unfinished work within this review.
