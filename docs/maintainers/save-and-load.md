# Save/load implementation tracker

## Spatial capture dependency

[SW15](spatial-world.md) owns new spatial-state fixtures and cache/renderer restoration. This tracker retains global capture/restore and privacy/accounting behavior. A saved route/flight progress is canonical data; reconstructing readiness or visuals cannot consume resources or redispatch AI.

This is the sole implementation tracker for gameplay save/load capabilities. The [save/load design](../save-and-load.md) owns behavior and acceptance principles. [Architecture](../architecture.md) owns implemented facts; [Verification](../verification.md) owns evidence. Phase exit gates remain open until their required evidence is recorded; the initial delivery below is not full qualification. Existing persistence and backup scripts are reusable foundations, not proof that these capabilities are complete.

Tasks deliberately avoid enumerating object types, fields or physical layouts. Subsystem owners maintain their current serialization, validation and supported live-definition-change details as they evolve; the root policy prohibits development-format compatibility work. Completing the framework does not automatically establish coverage for subsequently added state.

Coordinate module dependency capture and load validation with [EWF07](extensible-world-foundation.md#ewf07--module-lifecycle-and-current-format-save-integration); module fixtures do not complete this tracker’s broader acceptance.

## Initial implemented slice

- [x] SL00–SL03 foundations: a repository-owned current-format package captures `SavedWorld` plus durable history, retired source versions and optional annotations; manual slots publish atomically in the local save folder after transactional capture. Capture reuses the current canonical record owner.
- [x] SL04–SL05 foundations: loading drains background workers, preserves external accounting/privacy authority, replaces history atomically with the world, rotates command/context generations and retains a pre-load slot. Restored pending narration is cancelled; world-agent sessions restart fresh.
- [x] SL07 basic UI: Game below World agent offers named save, list, confirm-load and confirm-delete; successful load reopens paused. Named saves have no fixed count ceiling; public catalog pages are bounded. Streamed packages use explicit record/work limits and a 256 MiB total allowance, with durable pre-load files.
- [x] Build and isolated native browser walkthrough: save, advance, restore earlier clock/meters and observe paused state. See [runtime evidence](../verification/checkpoints-and-recovery.md#manual-saveload-runtime).

The detailed phase criteria below remain open where not fully established. Automated checks are deferred by instruction to [save/load validation TODO](TODO.md#manual-saveload-deferred-validation); historical SQLite/PostgreSQL import, backup/restore, transactional rollback and one actual process-death drill are recorded in [foundation evidence](../verification/data-foundation.md#data-foundation-runtime). [Local crash/restore and large-save qualification](../verification/checkpoints-and-recovery.md#bounded-history-checkpoints-and-recovery) records the then-supported SQLite/PostgreSQL application-process boundaries. Current verification uses PostgreSQL only; removed import/conversion paths are not delivery requirements. SL08 is implemented; live-provider, future-owner, hosted and SL10 qualification remain separate.

## September 26 bounded capture and recovery delivery

SL02/SL03/SL08 and the supported local SL09 slice are implemented and exercised. [Evidence](../verification/checkpoints-and-recovery.md#bounded-history-checkpoints-and-recovery) records complete saves above 64 MiB, one bounded worker, snapshot barriers, rolling retention, actual SIGKILL boundaries, failed/ambiguous storage paths, source/generation races, continuation and operational backup/import. The Game panel and public catalog use 100-entry pages without limiting retained manual slots. Directory discovery still scales with slot count; saved bodies are never loaded by catalog reads.

Rebased integration preserves manual save grants and server-owned whole-world autosaves. Ordinary players have no save controls and their list/create/delete/load requests are denied. [Integration evidence](../verification/checkpoints-and-recovery.md#checkpoint-integration-with-foundations) records creator-absent autosaves, binding preservation and exact authority recovery on that historical foundation. Its import, preceding-layout conversion and both-adapter results are historical, not supported features; [current PostgreSQL recovery and worker qualification](../verification/ordered-async-saves.md) retains its separately named scope.

Acceptance is scoped to the current local mechanisms and named native workloads. The 256 MiB ceiling itself, every future process/plan family, naturally aged long sessions, hosted storage/power loss, live providers, CI suites and first-release population SLOs are not qualified. Existing SL00/SL01/SL04/SL05/SL07 checklists retain broader owner-integration/release evidence; this delivery does not silently close them. [Extension guidance](../extending.md#persistence-and-migrations) and DF02 define current owner integration; historical branch and format conversions are not remaining merge or migration requirements.

## Delivery boundaries and sequence

The initial authorized manual save/load flow and SL08 rolling autosaves are implemented on canonical records. Complete the remaining named SL01/SL04/SL05/SL07 and recovery qualification, rather than rebuilding those mechanisms. Current-format rejection follows the root development policy; SL06 remains conditional released-save support, not a current migration project. Bounded full-record streams release capture after its revision barrier; explicit loads pause for reconstruction/install. SL10 remains conditional future work, not a prerequisite for the current personal-world flow.

[Production-data D0–D6](production-data.md) continue to own storage contracts, operational recovery and rollout. [PF00–PF11](performance.md) own runtime optimization and scale qualification. Reuse their evidence and prerequisites where applicable without copying their tasks or marking their phases complete. Gameplay-specific delivery is tracked here; the existing operational backup/import rehearsal remains with its current tracker.

## SL00 — Establish the subsystem integration boundary

Dependencies: none; use the existing authoritative transition and repository boundaries.

- [x] Define a small coordination interface for capture, dependency enumeration, candidate validation/restoration and derived-state rebuilding. Keep payload interpretation with the owning subsystem; a single implementation is sufficient initially.
- [x] Map current state owners to the design's save-scope categories and identify gaps in complete capture, including state outside the hot world object. Keep evolving details with those owners, not in this tracker.
- [x] Document how a new subsystem joins the save/load path and adds meaningful round-trip coverage. Do not introduce a universal object hierarchy, automatic reflection serializer or speculative plugin registry.

Exit: an integration path demonstrated with the current persistence boundary and an additive fixture change, without freezing domain schemas or requiring framework edits for every new field.

## SL01 — Versioned save package and dependency validation

Dependencies: SL00.

- [ ] Qualify the implemented logical package boundary carrying save identity, captured revision, compatibility information and required dependency references; keep its physical encoding replaceable.
- [ ] Validate completeness, integrity, resource limits and supported interpretation before exposing a candidate to restoration. Keep private state private and exclude credentials.
- [ ] Resolve required content versions explicitly; report missing or incompatible dependencies without silently substituting current content.

Exit: valid fixture packages can be inspected independently of the running world; corrupt, incomplete, oversized and unsupported packages fail clearly without changing active state.

## SL02 — Consistent authoritative capture

Dependencies: SL00–SL01.

- [x] Capture a committed transition boundary through the existing authority, incorporating preceding native progress and its required durable side effects.
- [x] Capture all participating stores and retained dependencies at that logical cut. Cover cold state as well as active state without requiring everything to live in one object or database table.
- [x] Separate stable capture from serialization/output; bound simultaneous captures and retained memory. Classify pending external work without waiting indefinitely for it.

Exit: controlled concurrent transitions cannot produce a mixed-revision save; subsequent live mutations cannot alter a captured candidate. Record capture duration and memory use.

## SL03 — Durable publication and save catalog

Dependencies: SL01–SL02.

- [x] Add durable publication and bounded catalog operations for creating, listing, inspecting and explicitly deleting retained saves. Represent pending, complete and failed outcomes accurately.
- [x] Publish candidates atomically, preserve the prior valid save on failure, and order concurrent slot updates so late completion cannot overwrite newer intent accidentally. Ambiguous publication retries re-establish directory durability; [follow-up drills](../verification/checkpoints-and-recovery.md#follow-up-checkpoint-review) cover sync failure, incomplete metadata and catalog controls.
- [x] Retain required dependencies for each complete save; release them safely on deletion while respecting other saves and privacy policy.

Exit: process interruption, storage exhaustion and concurrent completion leave only complete recoverable catalog entries; restart discovers published saves and safely handles abandoned candidates.

## SL04 — Staged restore and atomic installation

Dependencies: SL01–SL03; SL05 and current-format validation are required before exposing load.

- [ ] Qualify isolated candidate preparation, reference reconstruction and invariant validation through subsystem-owned restore paths without replaying creation side effects.
- [ ] Qualify admission quiescence, preservation of the pre-load recovery point and installation through one recoverable authority transition. Fail safely if preparation or installation cannot complete.
- [ ] Rebuild derived state, discard abandoned-future projections, issue fresh client baselines and reopen paused. Keep load operation identity outside the rewindable world so request retries cannot rewind twice.

Exit: interrupted installation recovers a complete old or new world; invalid candidates leave active state intact; a lost-response retry returns the original outcome even after later progress.

## SL05 — External authority and stale-work isolation

Dependencies: SL00; integrate with SL02 and SL04.

- [ ] Preserve current spending, uncertain operation records, permissions and forgetting/erasure protections during restore; reconcile them again at installation.
- [ ] Fence commands, background publication, provider callbacks and workspace/session context from the abandoned generation. Cancellation alone must not establish safety.
- [ ] Distinguish committed results, undispatched intent and uncertain execution using existing admission/recovery semantics. Keep paid dispatch blocked if required external authority cannot be recovered.

Exit: deterministic no-cost fixtures prove stale results cannot mutate the restored world, uncertain work is not automatically retried, spending is not refunded and revoked information does not reappear in cognition or client projections.

## SL06 — Compatibility policy after real-player support begins

This task is conditional on the owner changing the [development save policy](../../AGENTS.md#development-save-policy) through [RP02](revisitable-policies.md#rp02--development-state-compatibility). Current-state integrity checks remain in SL01.

- [ ] After the owner changes the linked policy, select a real-player support window in D60 and scope an ordered migration pipeline with preserved originals and historical fixtures.

Exit: future compatibility work is qualified only against a newly authorized support policy. This task does not block the development save/load flow.

## SL07 — Initial manual save/load experience

Dependencies: SL03–SL05 and current-format validation; future migration support is not a prerequisite.

- [ ] Qualify the delivered authorized manual save, save listing and load operations through the application boundary, with React controls using the current design system.
- [ ] Show real creation time, simulated time, compatibility and truthful pending/success/failure feedback. Make replacement of the active timeline clear before destructive load or save deletion.
- [ ] Verify the complete player flow: save, advance the world, load, inspect the restored state and explicitly resume. Handle repeated submissions, disconnects and failure feedback.

Exit: a currently authorized save-grant holder can retain and restore the supported personal world without shell scripts; success is reported only after durable completion. Usable-release acceptance also requires SL09.

## SL08 — Rolling autosaves and retention

Dependencies: SL03–SL07; selected cadence/retention policy in D60 and relevant historical-retention policy in D59.

- [x] Schedule bounded server-owned whole-world autosaves through the same capture/publication path, with clear behavior during pause, slow storage, concurrent manual saves and shutdown.
- [x] Rotate only complete saves, protect manual saves and required dependencies, and apply privacy deletion through the existing authoritative policy.
- [x] Expose retained restore points and failure/coverage information without implying arbitrary ten-minute rewind.

Exit: prolonged play remains within the selected storage/work budget; interrupted rotation preserves a usable checkpoint, and every advertised point restores successfully.

[AG09](agent-agency.md#ag09--same-version-save-pause-recovery-and-revocation) owns agency-state round-trip and continuation coverage. SL capture/restore includes its authoritative goals/frontiers and fences discarded-timeline work; reuse that coverage without duplicating the AG checklist.

## SL09 — Continuation, recovery and performance qualification

Coordinate new stimulus-state continuation with proposed [EPR08](events-perception-and-reactions.md#epr08--saveload-generation-fencing-and-overload); SL retains capture, restoration and generation-fencing qualification under the active development policy.

Dependencies: SL02–SL07 for the manual release; extend coverage when SL08 or SL10 ships. Develop focused checks alongside each capability.

- [x] Provide the reusable native checkpoint benchmark with a semantic continuation comparison under identical inputs; no automated suite was added. Let each subsystem supply representative cases as it evolves.
- [x] Exercise the canonical design's failure boundaries across the adapters supported by each recorded run (current verification uses PostgreSQL only), including cross-store dependencies, interrupted publication/installation, current-format rejection, external authority and stale clients. Current evidence is native/no-cost, with suites deferred explicitly; future subsystem and hosted boundaries remain their owners' gates.
- [x] Measure capture pause, peak memory, save latency and restored playability on named workloads with growing active state and cold history. Set initial budgets with the performance tracker and address measured failures before adding incremental formats or worker infrastructure.
- [x] Record verified scope, limitations and recovery instructions in Architecture and Verification; update extension guidance to make future state additions extend the coverage.

Exit: published, reproducible no-cost correctness evidence and measured performance for the supported initial scope. Fixture success does not establish live model quality, cloud recovery or untested future-state coverage.

### Recovery qualifications identified by the save-limit follow-up

These items were first identified by source inspection. Ticked entries now cite runtime evidence; unticked entries and sub-items remain unverified. Existing local SL09 evidence remains valid for its named scenarios. The [PW09 large-vector restore failure](../save-and-load.md#performance-and-evidence) remains with [PW09](parallel-batch-01-playable-week.md#pw09--correct-and-efficient-memory-retrieval), PF08 and D1/D2; SL09-C’s successful 100,000-memory captures/restores exercise a different workload and do not close that failure.

- [ ] **SL09-A — Recovery when capture is unavailable.** Exercise healthy-checkpoint load with full disk and an oversized current world; verify failure leaves current authority intact. Design an explicit recovery path that preserves the current world independently before allowing restoration; do not silently skip the pre-load safeguard. Include [SB13](../limits/persistence.md#sb13) in operator failure guidance.
  - [x] 2026-09-28: the pre-load checkpoint is written before the restore transaction, pinned to the replaced revision. Unwritable storage and a >1 MiB record both refuse the load, keep the current world (paused by the load request) at its revision without a storage latch, and record a recovery failure; after storage recovers the same load succeeds. Operator guidance is in SB13. [Evidence](../verification/ordered-async-saves.md#save-recovery-stages-47).
  - [ ] Open decision for the owner: whether to provide an explicit load path after a _verified_ independent preservation (operational backup or database dump) for worlds that can no longer be captured. No bypass exists; the design is recorded in [SB13](../limits/persistence.md#sb13).
- [x] **SL09-B — Retention correctness and honest guarantees.** Done 2026-09-28: durable per-world capture sequence orders catalog, cursors and rotation ([SB14](../limits/persistence.md#sb14)); clock rollback, timestamp ties, damaged/unlisted slots, cleanup failure, byte usage and a checksum-valid but semantically invalid package are exercised in the [evidence](../verification/ordered-async-saves.md#save-recovery-stages-47); protected recovery slots (the file the “Before last load” entry names kept beyond the two newest, rotation after refused loads, no entry, unreadable entry) are exercised in the [hardening drill](../verification/ordered-async-saves.md#paths-the-final-review-found-unexercised). The Game panel reports save-folder bytes and describes counts as retention targets, not quotas. Original scope: Exercise clock rollback/timestamp ties, cleanup failure, catalog-excluded damaged files and protected recovery slots. Select capture order independently of wall-clock display time. Distinguish file-integrity checks from actual current-format decode/restore evidence; include a checksum-valid but semantically invalid package. Track real directory bytes as well as catalog counts; do not claim a hard three/two-file quota.
- [x] **SL09-C — Slow-output snapshot pressure.** PostgreSQL is the only supported adapter. Measure snapshot age and command latency during slow output, add whole-capture worker cancellation for a stuck file operation, and exercise a larger write-heavy checkpoint with a matched command baseline and restoration. The runtime checkpoint path is complete; command-line operational backup retains a separate combined snapshot and its independent limitation is recorded in [SV07](../limits/persistence.md#sv07). [Evidence](../verification/ordered-async-saves.md#slow-output-snapshot-pressure-sl09-c), [SB16](../limits/persistence.md#sb16).
  - [x] 2026-09-28 (PostgreSQL only; SQLite was removed): with capture output throttled to 8 and 25 ms per record, the capture held its snapshot until the existing two-minute deadline aborted it; the database's oldest-snapshot age reached 85–132 transactions (0–5 without a capture) and durable command latency did not rise materially (p95 192–350 ms against 363–368 ms without a capture on the loaded host; 160 against 147 ms on the quieter final-code run), the snapshot was released at the abort and no staging files remained. No new cancellation is warranted by this evidence. [Evidence](../verification/ordered-async-saves.md#slow-output-snapshot-pressure-sl09-c).
  - [x] 2026-10-01: a worker that never completes a file operation is terminated after the whole-capture watchdog fires; its stage is removed before failure is reported, no delayed publication occurs, and it cannot accept a later capture. A normal worker completes successive captures. Three 100,000-memory, 102.2 MB checkpoints under concurrent durable writes preserved native continuation and restored successfully. In the storage-counter run, command p95 was 9.0 ms before capture and 38.1 ms during its 2.52 seconds; 30 writes were accepted, the largest oldest-snapshot age was 29 transactions, cluster WAL advanced 1.61 MB and the dead-row estimate rose by 1,130. These counters do not establish exact retained WAL or row-version bytes. This is workload evidence, not a host-independent latency guarantee. [Evidence](../verification/ordered-async-saves.md#slow-output-snapshot-pressure-sl09-c).
  - [x] A third disposable run used `pgstattuple` and vacuum on one updated table: `world_head` held 5 dead tuples (465 bytes) while the snapshot was open and none after worker completion and vacuum. This directly measures retained versions in that table without claiming a whole-database or WAL-retention total. The 102.2 MB checkpoint restored and native continuation passed. [Evidence](../verification/ordered-async-saves.md#slow-output-snapshot-pressure-sl09-c).
  - [x] The worker watchdog also covers a stall inside one filesystem write, sync or rename, and a 100,000-memory checkpoint ran with concurrent durable writes and a matched command baseline. That host was busy; the measurements do not establish quiet-host or general production latency.
- [x] **SL08-A — Restart-visible failure status.** Preserve or durably report the latest checkpoint failure for operators, with explicit reset/acknowledgment; confirm restart does not falsely imply recent protection. Keep catalog health distinct from historical autosave errors. [SB12](../limits/persistence.md#sb12). Done 2026-09-28 with persisted autosave settings and manual-save priority (C05); [evidence](../verification/ordered-async-saves.md#save-recovery-stages-47).

Only the current layout is supported. The preceding-format reader was removed; [DF04](production-data.md#df04--retire-residual-compatibility-paths) separately tracks the residual snapshot/journal startup converter, which must not be mistaken for supported compatibility. [SB15](../limits/persistence.md#sb15) preserves its historical rationale without authorizing an older-format reader. Future owner integration qualifies current-format SL01/DF02 behavior under the [development save policy](../../AGENTS.md#development-save-policy). [SV18](../limits/observability.md#sv18) records the stress tool’s envelope; it is not a capacity gate. Operational restore file cleanup belongs to [D1/D2](production-data.md#remaining-d1d2-implementation-and-evidence).

## SL10 — Conditional portability and shared-world expansion

Dependencies: qualified personal-world flow, relevant D60 choices and production-data rollout gates. Not an initial-release prerequisite.

- [ ] When portable export/import is selected, package required dependencies and validate target authority reconciliation, privacy and compatibility before installation.
- [ ] Extend the implemented scoped save grants and participant denial to cloud deployment, preserving the separation from private-content inspection. Qualify participant synchronization, branch/conflict policy and cross-world-effect boundaries without treating unresolved later features as foundation blockers.
- [ ] When measurements justify incremental storage or distributed capture, preserve the same logical save contract and qualify bounded recovery with the relevant performance/production tasks.

Exit: each enabled extension has scoped failure and recovery evidence; unsupported modes remain explicitly unavailable rather than inheriting personal-world guarantees.

## Foundation integration acceptance

SL00's [current owner inventory](../save-and-load.md#current-subsystem-integration) classifies the implemented foundation state, non-rewindable grants/revocations/accounting, derived indexes and invalidated asynchronous work. Future maintenance and ghost owners must join it when implemented. Include inactive humans, retained/summoned ghosts when supported, contribution/definition pins and approval/activation receipts. Reuse current generation and receipt boundaries; no new subsystem-specific restore patch outside its declared owner. Coordinate DF02 and INV-5.6 and prove continuation after save/load with a changed grant and pending job. The foundation integrations and both-adapter capture/restore evidence close the current SL00 integration boundary; broader SL09 and future branch integration remain open.
