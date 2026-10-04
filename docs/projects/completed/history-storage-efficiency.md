# History storage efficiency

| Status    | Current progress                                                                                                                                       | Last updated |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Completed | Indexed history startup, dialogue, deletion and selective edits are delivered with local evidence; broader capacity and hosted acceptance remain open. | 2026-10-03   |

## Authorized scope and outcome

The owner approved implementation on 2026-09-27 after the production-data review.
Starting a saved game, finding a character's dialogue, retrying failed character
speech, deleting a character and editing recorded events should avoid unrelated
lifetime history. Preserve each observer's permitted evidence, complete correction
dependencies, atomic writes and current-format save/restore. Add the owner's exact
unambiguous-reference instruction to root AGENTS.md.

Base: refreshed `origin/main` (`0b9c51aa`) in Macrofold/OpenLegend. Branch:
`codex/history-storage-efficiency`. Estimated impact: 1,000–2,000 changed logic
lines, excluding verification. This crosses storage, privacy and edit-publication
contracts, so the plan and focused tracker remain current through implementation.

## Owners and decisions

- `WorldRecords`: indexed startup working-set selection, durable list positions,
  descriptive record indexes and partial-history preservation.
- `HistoryRepository`: one event/observer perspective row also grants history
  access; self-contained perceived text/attribution survives recall consolidation.
  Query columns belong to this projection, not raw omniscient event evidence.
- `MemoryRepository`: indexed actor/ancestor deletion and source dependency reads;
  canonical source versions, correction/forgetting and vector invalidation remain
  transactional.
- `WorldService` and domain event editing: prepare the complete affected dependency
  set outside the mutation queue, revalidate it, then publish through the existing
  mutation/commit owner. Never interpret partial materialization as deletion.
- Current-format schema changes reject incompatible databases/checkpoints before
  installing data. No development-save migration, reset or automatic deletion.
- Keep public string IDs, world scoping, one world per database and current lexical
  recall. Numeric keys, partitioning, text deduplication against mutable events and
  multiple worlds per database remain deferred as recommended.
- Measure startup event counting. Keep its exact integrity check unless measured
  cost justifies transactionally maintained counts with an explicit full audit;
  record any resulting change to startup's corruption-detection guarantee.

## Implementation sequence

1. Add the instruction and reconcile D1/D2/PF08 tracking with this accepted scope.
2. Measure the current PostgreSQL queries on disposable growing-history fixtures.
3. Implement owner-driven awareness tails/list maxima, indexed recent-memory and
   unresolved-commitment selection, descriptive specialized indexes and indexed
   ancestor deletion. Preserve current filtering and record order.
4. Combine audience and perspective storage; add response and permitted-participant
   query columns/indexes; update writers, revocation, transcript/history readers,
   capture/recovery manifests and current-format validation together.
5. Replace full-world creator event-edit materialization with affected dependencies,
   stale-preparation rejection and atomic publication. Reuse selective preparation
   for related creator/memory edits where their semantics permit it.
6. Resolve event-count optimization from measured evidence, preserving an explicit
   integrity audit if ordinary startup no longer performs a physical recount.
7. Exercise downstream callers and failure cases; review the complete diff, fix
   findings, reconcile canonical docs/limits/trackers and record actual evidence.

## Verification and completion

Use existing focused PostgreSQL fixtures after inspecting their setup/side effects;
use `AI_BUDGET_USD=0` and only owned disposable databases. Add no automated tests by
default. A focused ad-hoc workload covers gaps: increasing retained history,
sparse witnesses, recent/old/unresolved memories, failed-character-reply lookup,
participant paging, event correction/deletion, forgetting, stale preparation,
restart and current-format checkpoint restore. Compare query plans, examined rows,
latency and storage with matched inputs; do not infer production capacity.

Run TypeScript checking, production build, configuration/guidance checks and
changed-file formatting. Preserve broader existing CI and hosted/model-quality
gates. Completion requires all accepted code/docs, focused behavior/failure
verification, full affected-diff review and honest remaining qualification limits.

Tracking: [D1/D2](../../maintainers/production-data.md),
[PF08](../../maintainers/performance.md#pf08--long-lived-worlds-hot-state-and-checkpoints),
[MH03/MH06/MH07](../../limits/memory.md#mh03),
[save/load](../../save-and-load.md), and
[guidance](../../maintainers/agent-guidance.md).

## Progress

- Complete: instruction, startup indexes, descriptive source indexes, actor-parent deletion,
  combined perspectives, character-reply/dialogue lookups and selective edit preparation.
- Measured event counting at 2.7 seconds for one million synthetic rows; adopted a
  transactional count with physical audits at capture/full recovery. Normal startup
  no longer detects arbitrary out-of-band row-count drift; canonical save/load owns
  that explicit tradeoff. Added scalar-owner paging for checkpoint capture.
- Review fixes: propagate the domain’s complete correction invalidation set and
  return rejected forgetting outcomes instead of reporting success. Load affected
  actors’ terminal appraisals for existing privacy invalidation. Initialize the
  physical schema atomically and refuse missing/incompatible schema markers.
- Verification and measurements: [evidence](../../verification/history-storage-efficiency.md#history-storage-efficiency).
  Current native caller/failure scenarios, focused restart/writer checks and required
  static checks pass. The existing save/reopen test now creates its own food item,
  and its focused PostgreSQL rerun passes after correcting the starting-inventory assumption. Full CI, natural aging,
  hosted/browser/live-model qualification and larger affected dependency sets remain
  the existing owners’ work, not acceptance claims from these synthetic fixtures.
- Deferred choices remain unchanged: public string IDs, one world per database,
  no partitioning, no mutable-event text deduplication, no new lexical-recall rewrite.
  Complete affected dependency sets have no newly imposed size cap; large-set
  resumability is not added without measured need. No data migration or deletion.
- Full affected-diff review complete; scoped implementation and documentation delivered.
