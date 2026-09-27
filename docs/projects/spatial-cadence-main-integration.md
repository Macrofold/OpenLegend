# Spatial/cadence integration with current main

Requested in chat on 2026-09-26: pull `feature/simulation-cadence`, thoroughly review its complete change against main, and rebase/reconcile both implementations for merge readiness. This authorizes local reconciliation, not merging main or force-publishing rewritten shared history.

## Baseline and risk

- Repository: `https://github.com/Macrofold/OpenLegend.git`, remote `origin`.
- Refreshed explicit target: `origin/main` at `56b8c383be1ef0e13416769e942f89b2ce6d15e2`.
- Source: `origin/feature/simulation-cadence` at `edc6980f7634bf4088c259cb4dfd61f03bbb9ce9`.
- Common ancestor: `03105fed9209c126e4e69e9faeb4687f42d1e74a`. Source has 75 subsequent commits and 92 changed files (4,436 additions / 947 deletions); main has 23 subsequent commits and 262 changed files (31,637 additions / 4,069 deletions).
- Approximately 4,000 changed runtime/tooling lines on the source side, plus substantial main overlap. High risk: elapsed-time phase ordering, dependency invalidation, state/resource ownership, observer privacy, asynchronous navigation and persistence/restore generation. The checkout was clean and detached at the source tip; it now tracks the explicitly requested source branch. Other worktrees are untouched.

## Preserve and reconcile

Retain the accepted elapsed-time start/rate/end contract, actual-progress debt accounting, swept continuous movement, semantic support IDs, Recast navigation, selective Rapier collision, independent device-cadence rendering, and observer-authorized presentation. Retain main's canonical production records, bounded history/checkpoints, multiplayer authority and fencing, persistent objects/claims, shared state contributions, dependency-aware native work, appraisals, shared Worker API, indexed memory retrieval and shared inventory access. Reuse each semantic owner instead of duplicating the old and new implementations.

The sound/speech branch remains separate. Inspect its current ref to reconcile the handoff and dependencies; importing an unrelated feature branch is not implicit in this main rebase. Existing PF13/SW/EPR gaps remain open unless current evidence satisfies their criteria. In particular, recorded short 8x success does not qualify the failed staggered-flight workload.

## Sequence

1. Preserve the source tip in a local recovery ref and retain the remote branch. Read current main guidance and applicable subsystem contracts. Inventory both sides' runtime and documentation changes.
2. Rebase the requested local branch onto the pinned refreshed main. Resolve textual and adjacent semantic overlap by intent and canonical ownership. Regenerate the single lockfile with pinned tooling if necessary. Follow the current rebase skill's stop rule for uncertain consequential resolutions; preserve the conflicted state and present concrete competing choices.
3. Inspect the full final diff and downstream callers: domain phases/rates/claims/dependencies, server scheduling/authority/save lifecycle, navigation workers, projection/privacy and browser rendering/input. Fix integration defects within this scope.
4. Reconcile PF12.3/PF12.5 stale wording, spatial runtime ordering, PF13 delivery versus acceptance, speech coordination, architecture, limits and relevant focused trackers. Record consequential decisions and fresh evidence without replacing historical results.
5. Run permitted static checks, actual native/service/browser observations and matched bounded stress; review the resulting full diff. Leave required CI and unqualified acceptance visible. Report exact commits, delivered behavior, verification, unresolved risks and merge readiness.

## Verification and completion

Use disposable worlds, new private diagnostic paths and `AI_BUDGET_USD=0`; do not read unrelated secrets or charge providers. The user explicitly authorized test updates and automated validation on September 26 after the initial reconciliation. The user then approved selective pruning: retire obsolete implementation assumptions and overlapping historical walkthroughs, retain compact checks for current contracts, and fix genuine regressions. Adapt retained fixtures to current identity, authority and asynchronous navigation. Run the retained unit/integration and browser suites with CI discovery and gates enabled; do not build an expansive replacement suite. Inspect scripts before invoking pinned formatting, typecheck, production build, configuration and guidance checks. Exercise elapsed action/status boundaries, movement/navigation failure and cancellation, save/restore with authority fencing, private projection and real browser camera/presentation interactions. Compare equivalent native workloads and actual advanced game time, intervals, debt and latency; record failures and limits honestly.

Completion requires a completed rebase, reviewed semantic union, reconciled documentation, relevant verification and fixes. Pre-existing unmet qualification is not a pass and must not be hidden behind successful compilation. No main merge or remote history rewrite is included.

## Progress

- [x] Read supplied handoff, inspect clean checkout and refresh source/target refs.
- [x] Read current main workflow and record initial integration scope/risk.
- [x] Rebase and resolve all understood conflicts; retain the original tip in `codex/cadence-before-main-20260926`.
- [x] Complete semantic diff review and integration fixes.
- [x] Reconcile documentation and focused tracker status.
- [x] Complete permitted native/service/browser observations, bounded matched stress and final implementation review.
- [x] Complete the authorized test adaptation and local automated validation. `pnpm check` passes all 188 retained tests plus typecheck/build/static gates. All six retained browser cases pass across the final full run and corrected tooltip case's focused rerun; the evidence records the earlier failures and rerun boundaries. Hosted CI remains the publication/merge gate.

## Reconciliation outcome

The [integration record](../verification/spatial-cadence-main-integration.md) contains the full subsystem comparison and actual evidence. Production fixes preserve main's root placement, inactive participation, contribution lifetimes, indexed reservation/appraisal deadlines and native work charges. Movement restrictions now apply over the interval in which they existed; loss of perception retires visual episodes. Navigation publication tolerates queue admission overload without losing computed work, and obsolete worker retirement remains single-owner. Collision initialization covers the real service and operational load/creation scripts.

Main's record/checkpoint/authority owners and indexed memory/exposure work remain alongside the branch's Recast/Rapier, elapsed cadence and browser presentation. Documentation restores shared runtime/performance and action authority requirements, separates profile settings from world rewind, records new/removed limits, and preserves main's policy IDs. Sound integration, D51 viewport admission, exact fleeting exposure and sustained 8× remain their existing scoped work; this rebase does not complete those programs.

The remote source and selected main pins were rechecked after runtime verification and had not moved. The source history is recoverable and remote history remains unchanged. No provider charges or changes to CI policy occurred; the authorized automated follow-up is recorded in the same integration evidence.

The selective fixture cleanup also fixed stalled takeoff, stale trusted-local control scope, missing contextual inventory descriptions and enlarged mobile panels covering their launcher controls. The final native comparison includes restored flight work and supersedes the earlier optimistic measurement: approximately 12× lower median wall time than main for the sampled workload, still below sustained 8× capacity. Disposable reproduction scripts/logs remain outside canonical documentation.

## Authorized performance follow-through

The owner subsequently requested implementation of reduced repeated perception work, reduced copying/finalization and localized simulation deadlines. This extends the completed reconciliation under PF12.3–PF12.5, PF03/PF08/PF09 and PF13.11; renderer batching and sound-branch integration remain separate. Baseline is `688403da`, with refreshed main still `56b8c383`. Expected scope is several hundred to roughly a thousand runtime lines across native phase scheduling, encounter candidates and draft publication. Risk is high because missed invalidation or an incorrectly deferred participant can lose evidence, change event order or publish stale physical state.

1. Profile the corrected mixed fixture and retain disposable baseline worlds/results for matched replay, including growing evidence and staggered flight. Separate cold acquisition, warm work and profiling overhead.
2. Reuse phase-valid spatial inputs and restrict audience work to conservative receiver candidates. Keep source/observer capability and geometry invalidation, stable ordering and complete audiences. No cached draft entity escapes publication.
3. Remove measured repeated traversal/copying at the existing draft owner, preserving immutable snapshots, append proofs, forks and persistence write sets. Keep the public save representation and one mutation owner.
4. Localize supported motion deadlines and their sensing work within the native owner. Bring interacting participants to the same occurrence time before collision, evidence or other effects; retain a conservative fallback for unsupported dependencies. All externally returned snapshots must be coherent at their reported game time. Saved clocks, RNG and progress remain authoritative; derived schedules rebuild on command/load and never become another persisted scheduler.
5. Review the complete resulting change; exercise movement, near/far observers, event order, capability/geometry changes, cancellation, save/recovery and pathological deadline density. Use matched actual game-time workloads, existing authorized regression suites and static/build checks. Preserve the user's preference for compact behavioral checks rather than a broad implementation-specific suite. No live providers or spending.

Completion means all three requested improvements have implemented paths and measured evidence, current contracts/limits and focused trackers agree, and meaningful regressions are resolved. Broad hosted population/GPU qualification is separate; do not close existing acceptance merely from a faster microbenchmark.

### Motion deadline implementation decision

Use two levels in the existing native transition: shared mechanical deadlines and private motion/sensing slices. Reuse the predicted rates/deadline between motion slices; invalidate through state-owner revision tokens (including silent status transitions), conservative effect signals, and takeoff/landing changes to grounded predicates. Synchronize moving bodies before delivering flight evidence, retain the existing movement-before-endpoint-rate/effect ordering, and materialize all continuous values before a coherent checkpoint. Retain stable identity order for simultaneous landing reservations and deadline/identity order for saved wander RNG. This deliberately avoids a second per-region authority or unsynchronized actor clocks.

Restrict each mover's small-sense displacement bound to observers whose conservative reachable envelopes overlap during the shared interval. Unknown mechanics keep existing shared bounds. An interval may include at most 32 motion slices, still yielding within each and allowing the server to request an earlier coherent stop after its existing eight-millisecond batch budget; a call retains the total 4,096-slice ceiling and can return a coherent prefix early. The server requests one interval. These ceilings bound work, not wall latency. Snapshot only encounter dependencies between private slices, not complete histories. This reduces global reconsideration/publication caused by independent motion deadlines, while truly coupled physics/rates and exact fleeting exposure remain their tracked separate work.

The native continuation can survive a coherent publication only under the exact frozen successor identity, with copied countdowns for forks and scalar-only motion bounds. Commands, edits, load and changed state owners rebuild it. Spatial candidate queries choose between covered cells and occupied cells to avoid cubic scans of empty reachable envelopes.

### Follow-through outcome

All three requested reductions are implemented and reviewed. Matched 300-game-second workloads reduced median wall time by 24.2% for the mixed scene and 17.9% for staggered flight; per-call latency remains overlapping and neither qualifies sustained 8×. The [existing integration record](../verification/spatial-cadence-main-integration.md#performance-follow-through) contains the method, correctness/service observations and passing full validation. PF12.3–PF12.5 and PF13.11 retain broader dense/history, regional-rate and latency work; those programs are not closed by this implementation.

## Main refresh after performance follow-through

The subsequent requested rebase refreshed `origin/main` in `Macrofold/OpenLegend` to `f6db141abe0ddcbd7c9895cd9c56d323f96857a7`. Recovery ref `codex/cadence-before-main-f6db141a` retains the prior local tip `c206f2d5`; all 77 branch commits replayed. Conflicts in the TODO and changelog were independent additions: both main's social/research records and this branch's spatial/performance records remain. Range comparison and file-identity checks preserve the reviewed simulation, rendering, navigation and dependency changes. Main's history cleanup retains the existing complete story-revocation owner, and its repository usage type now references the public contract.

Fresh `AI_BUDGET_USD=0 pnpm check` passed all 188 tests in 28 files, typecheck, production build, formatting, configuration and guidance checks. Existing build/advisory warnings remain. Prior browser/performance evidence retains its original revision scope; neither was rerun for this small base refresh. Main and the remote feature branch were not rewritten, and existing PF12/PF13/SW qualification gaps remain open.
