# Bounded history, checkpoints and recovery

Authorized implementation: PF08, SL02/SL03/SL08/SL09 and remaining D1/D2 recovery qualification. Estimated 1,500–2,500 logic lines, excluding tests. No new automated unit/integration tests or paid execution. Base: refreshed `origin/main` at `ce7ef555`; development branch `codex/history-save-recovery`.

## Scope and ownership

Preserve current [memory semantics](../memory-architecture.md), [save contract](../save-and-load.md), [performance contract](../performance.md) and canonical record ownership. WorldService owns the committed cut and restore admission; WorldRecords/MemoryRepository own scoped source access; GameSaves/SaveFiles own checkpoint encoding, publication and retention; existing stores own transactional installation and external accounting. No new world laws, semantic retention, provider retry policy or alternate mutation authority.

Keep priorities 1–5 in [remaining foundations](../maintainers/remaining-foundational-work.md) out of scope. Inspect spatial, invention, action and speech branches as integration inputs without merging or changing their designs. Their durable routes/process cursors, definition pins, approvals, event-time speech evidence and receipts must use the existing record/save ownership and fresh-generation fences. NAV/REL, COM/MND, MAK/BLD and cooperative scenes in the action repertoire inform continuation drills; unsupported gameplay is not added here.

## Implementation sequence

1. Inspect relevant owners and in-flight branch diffs. Establish disposable native baselines for growing histories/checkpoints, recording hardware/runtime, latency, event-loop responsiveness, memory and bytes. Refine limits from evidence.
2. Select bounded chronological maintenance inputs in SQL, including protected barriers and the newest verbatim speech pool. Publish only through the current semantic owner after source/generation validation. Avoid full actor hydration during both preparation and publication. Bound daily review without incorrectly marking an incomplete day complete; unchanged failures must not retry automatically.
3. Separate the short committed capture boundary from output. Stream complete cold records/history using a consistent database snapshot, bounded pages/bytes and one in-flight capture. Preserve the current reader for existing saves. Replace the single 64 MiB payload ceiling with explicit record, active-state and total-package limits, validation and integrity checks; never merely remove it. Keep dependencies self-contained and validate before installation.
4. Publish private staging packages with durable file/directory synchronization and atomic rename. Concurrent requests cannot overwrite a published identity. Keep interrupted candidates out of the catalog. Preserve a usable pre-load checkpoint across large restores.
5. Add rolling autosaves through the same path: initial engineering default five minutes of running wall time, three complete retained points, no accumulation while paused or busy, manual saves protected, failure visible and shutdown drains admitted work. Rotation follows durable replacement and never deletes the last verified point. Record exact final limits in the retention ledger.
6. Improve operational backup/restore validation, atomic output, resource bounds and instructions. Native drills cover process death at commit/publication/rotation/install boundaries; concurrent writers and idempotent requests; corrupt/missing/oversized packages; failed/incomplete migrations; privacy/accounting and stale source/consolidation/restore races. Preserve source artifacts and use fresh disposable targets.
7. Stress large active state and cold history separately, including saves beyond 64 MiB, continuing native time/walking, slow output and repeated autosaves. Fix measured findings. Record actual latency distribution, peak memory, bytes and recovery/playability time, with explicit hardware and coverage limits.
8. Review the full diff twice, fix in-scope findings and re-run affected drills. Run changed-file formatting, typecheck and production build; no test suites. Reconcile canonical specs, architecture, extension/recovery guidance, focused trackers, verification evidence and significant decision history.

## Dependencies and decisions

Existing SQL snapshot support, canonical record codecs, protected-source admission, domain consolidation validation and restore generations are reused. SQLite must not hold its writer lane during output; PostgreSQL uses a repeatable read snapshot. Page/batch bounds limit preparation, not retained evidence. Daily review completion needs an explicit complete-day condition. Loads may pause the world while validating/installing; routine save output and maintenance must permit native progress. Engineering selects cadence and work/storage budgets under D58–D60; no new product approval is needed. Hosted/cloud recovery and future subsystem qualification remain with their owners.

## Completion criteria

Bounded maintenance retains evidence and stale-source checks; complete coherent saves above the previous limit publish atomically with bounded capture memory; autosaves rotate safely and surface failures; all requested native failure and performance drills run on available supported adapters, with failures fixed or genuine platform blockers stated. Two full reviews, typecheck/build and documentation reconciliation complete. Do not close PF09/D5 population, live-model, CI-suite or future gameplay gates from these results.

## Progress and evidence

- Initial context and clean worktree inspected; refreshed/rebased onto `ce7ef555` without conflicts.
- Implemented bounded SQL maintenance, selected-source publication, daily cursors and additive sequence indexes/backfill; preserved native consolidation ownership and explicit no-retry markers.
- Implemented revision-pinned worker capture, bounded canonical record streams, atomic synchronized publication, legacy reading, bounded public catalog pages, rolling autosaves and durable pre-load recovery pointers.
- Implemented complete streamed operational backups and source-preserving restore/import, with immutable slot dependencies and explicit empty-target/external-authority checks.
- Native SQLite/PostgreSQL crash, migration, concurrency, forgetting, profile-import, source-race, retention and continuation drills passed. Large PostgreSQL attempts exposed statement-sized rebuild/transfer costs; paging fixed them without removing deadlines or atomicity. [Evidence](../verification.md#bounded-history-checkpoints-and-recovery) records failed attempts, successful reruns and resource/latency limits.
- Review one covered the complete capture/maintenance/restore paths and found lifecycle, scheduling and recovery-order issues. Review two rechecked all runtime/tool/UI changes and extension seams, fixing queued create/delete ordering, bounded migrations and catalog work, complete authority-table validation and post-commit cleanup errors. The resulting changes were reread; no separate agent review was used.
- Production browser save/advance/load/resume, the recovery list and 205-slot pagination passed in disposable worlds. Filesystem-handle write/sync failure injection retained the prior checkpoint; legacy import preserved source bytes and refused backup replacement. No automated suites or paid calls were made.
- Final `pnpm typecheck`, `pnpm build`, changed-file Prettier, `git diff --check` and changed Markdown link checks passed. Build retains existing PlayCanvas browser-externalization and chunk-size warnings. Prettier excludes `docs/maintainers/remaining-foundational-work.md`: its table formatting already fails at the base revision, and only priority 9 was edited in its existing style to preserve the other AI's priorities 1–5. The agreed local implementation and verification are complete; broader qualification stays below.

### Consequential decisions and remaining qualification

The selected batch, not the actor's lifetime backlog, is the atomic maintenance unit; every model partition inside it still validates before publication. Daily cursor progress never calls an incomplete day complete. One worker is justified by measured main-thread hitches; no generic background framework was added. Full load reconstruction remains an explicitly paused, proportional-memory operation. New growing owners must split canonical records before exceeding the 1 MiB encoded-record allowance. Manual slot counts remain unlimited, while each public catalog response is bounded to 100 entries; directory discovery remains asynchronous and linear.

The agreed local implementation is distinct from broader PF08/PF09/D5 acceptance: naturally aged worlds, rare full-history owner edits, live providers, new branch owners, hosted power loss and first-release population capacity remain with their existing trackers. The in-flight branch audit informed extension guidance without changing priorities 1–5 or merging their work.

## Follow-up implementation review

The requested thorough review covers the complete pending diff and its downstream callers. Initial corrective estimate: 200–500 logic lines, refined from confirmed findings. Reuse current ownership and helpers; do not introduce new gameplay contracts or broaden priorities 1–5.

1. Refresh the base while preserving the pending implementation. Trace independent database snapshots, capture/publication lifecycle, retention and restore ordering, maintenance cursors/source validity, and complete operational backup/install dependencies.
2. Reproduce concrete failures with disposable native scenarios before fixing them. Simplify duplicated responsibilities where there is a real shared owner; keep expansion through the canonical record and authority boundaries.
3. Exercise corrected success/failure paths on the affected adapters, and rerun a representative bounded stress workload for hot-path changes. Review UI async behavior and interact with any changed controls.
4. Reread the complete resulting diff; reconcile this plan, canonical guidance, focused trackers and actual evidence. Finish with changed-file formatting, typecheck, build and links. No automated suites, paid calls or unrelated branch changes.

Completion: confirmed in-scope findings fixed and verified; the resulting runtime changes were reread with no unresolved actionable review findings. Existing broader qualification limits remain open.

- Refreshed `origin/main`; it remained at `ce7ef555`, so no branch movement or conflict resolution was needed. Priorities 1–5 were preserved.
- Reproduced and fixed expired SQLite read-scope reuse, false success after ambiguous publication sync failure, missing backup recovery dependencies, byte admission after hydration and incomplete streamed metadata. Restore now refuses a nonempty target before copying its retained files. UI catalog responses are generation-checked and changing a failed save's label resets its command identity.
- Shared canonical capture between worker/operational snapshots and the external-authority catalog between backup/import/restore. The worker uses a trusted ESM bootstrap compatible with ordinary and stdin launches, and initializes its independent reader before readiness.
- Repeated native semantics, fault injection, operational CLI, production-browser controls and two 10,000-source saves on each adapter. Both native continuation comparisons passed. [Actual review evidence](../verification.md#follow-up-checkpoint-review) records before/after reproductions, hydrated bytes, latency, peak RSS, the caught intermediate worker regression and measurement limits.
- Final typecheck and production build passed; existing browser-externalization/chunk warnings remain. Changed-file Prettier, all 671 local links across 17 changed Markdown files and `git diff --check` passed. The pre-existing formatting exception for the remaining-foundations table remains unchanged. No new tests, automated suites, provider calls or dependencies.

## Rebase onto integrated foundations

Requested rebase target: local `main` at `c1330009f0e3e851eee47ba8a53354fcc3093549`, containing foundations 1–5; freshly fetched `origin/main` remains at `ce7ef555`. Preserve that implementation and all pending history/save/recovery work. Estimated reconciliation: 200–600 logic lines across overlapping owners, depending on conflicts; no independent feature design or automated suites.

1. Restore the identified temporary stash onto the original base and commit the complete pending implementation locally, as requested. Rebase that commit onto local main.
2. Reconcile only certain conflicts from both sides' contracts. Preserve new request authority, canonical state owners and appraisal source dependencies while retaining bounded maintenance/capture, atomic publication and recovery. Stop immediately for any uncertain resolution as required by the rebase skill.
3. Review the full resulting branch diff and neighboring integration seams. Update this plan and affected canonical statements, run typecheck/build and targeted no-cost native capture/restore and maintenance drills where reconciliation changes execution. Preserve all earlier unverified gates.

Committed the complete pending implementation locally as `d9b936f` on `ce7ef555` before rebasing onto local `main` at `c1330009`, as requested. The identified temporary stash preserved every tracked/new file during this sequence. Reconciliation retains foundations 1–5 and changes only their save/history integration seams.

Rebase decision resolved by the user: autosaves are server-owned save files for the shared persistent world, independent of player presence. Ordinary participants never create their own whole-world autosaves. Manual world save/load remains creator/authorized-operator work under current verified grants. The scheduler gets a separate internal entry point; no public request accepts an automatic-save flag or bypasses scope checks.

Reconciliation and verification are complete:

- Preserved current scope checks while releasing manual create/delete output and catalog reads from the mutation queue; added the internal host-owned autosave entry point and creator-only save controls. The user resolved the only uncertain authority conflict before work resumed.
- Reused the canonical assembler with current cold object/appraisal/contribution markers. Bounded selected-source consolidation does not materialize unrelated terminal owner history. The exact preceding stream layout uses the existing foundation conversion; incomplete current packages remain refused.
- Extended the shared operational catalog with all nine account/control tables. Gameplay and existing-world operational restore share current human-binding reconciliation; full operational recovery preserves external authority independently of gameplay rewind.
- Native API/retention, both-adapter backup/import, newer-binding restore, old-layout conversion and incomplete-layout rejection passed. Production browser inspection showed the creator recovery panel and no ordinary-player save control. Both adapters passed two 10,000-source captures and exact native continuation; [measurements and limits](../verification.md#checkpoint-integration-with-foundations) record the new base and runtime separately from prior evidence.
- Reviewed the complete branch change and the reconciled integration twice; no unresolved actionable findings remain. Typecheck, production build, changed-file formatting, whitespace and 709 local links across 17 Markdown files passed. The existing remaining-foundations table formatting exception remains. No automated suites, live provider calls or dependency changes were introduced by this branch.

## Maintained records

- Implementation: [Feature tasks](../maintainers/save-and-load.md).
- Limits and constraints: [Persistence, checkpoints and recovery inventory](../limits/persistence.md).
