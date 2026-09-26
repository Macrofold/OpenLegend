# Save/load implementation tracker

## Spatial capture dependency

[SW15](spatial-world.md) owns new spatial-state fixtures and cache/renderer restoration. This tracker retains global capture/restore and privacy/accounting behavior. A saved route/flight progress is canonical data; reconstructing readiness or visuals cannot consume resources or redispatch AI.

This is the sole implementation tracker for gameplay save/load capabilities. The [save/load design](../save-and-load.md) owns behavior and acceptance principles. [Architecture](../architecture.md) owns implemented facts; [Verification](../verification.md) owns evidence. Phase exit gates remain open until their required evidence is recorded; the initial delivery below is not full qualification. Existing persistence and backup scripts are reusable foundations, not proof that these capabilities are complete.

Tasks deliberately avoid enumerating object types, fields or physical layouts. Subsystem owners maintain their own serialization, validation and migration details as they evolve. Completing the framework does not automatically establish coverage for subsequently added state.

Coordinate module dependency capture and load validation with [EWF07](extensible-world-foundation.md#ewf07--module-lifecycle-and-current-format-save-integration); module fixtures do not complete this tracker’s broader acceptance.

## Initial implemented slice

- [x] SL00–SL03 foundations: a repository-owned current-format package captures `SavedWorld` plus durable history, retired source versions and optional annotations; manual slots publish atomically in the local save folder after transactional capture. Capture reuses the current canonical record owner.
- [x] SL04–SL05 foundations: loading drains background workers, preserves external accounting/privacy authority, replaces history atomically with the world, rotates command/context generations and retains a pre-load slot. Restored pending narration is cancelled; world-agent sessions restart fresh.
- [x] SL07 basic UI: Game below World agent offers named save, list, confirm-load and confirm-delete; successful load reopens paused. Named saves have no fixed count ceiling; public catalog pages are bounded. Streamed packages use explicit record/work limits and a 256 MiB total allowance, with durable pre-load files.
- [x] Build and isolated native browser walkthrough: save, advance, restore earlier clock/meters and observe paused state. See [runtime evidence](../verification.md#manual-saveload-runtime).

The detailed phase criteria below remain open where not fully established. Automated checks are deferred by instruction to [save/load validation TODO](TODO.md#manual-saveload-deferred-validation); Native SQLite/PostgreSQL import, backup/restore, transactional rollback and one actual process-death drill are now recorded in [foundation evidence](../verification.md#data-foundation-runtime). [Local crash/restore and large-save qualification](../verification.md#bounded-history-checkpoints-and-recovery) now covers SQLite/PostgreSQL application-process boundaries. SL08 is implemented; live-provider, future-owner, hosted and SL10 qualification remain separate.

## September 26 bounded capture and recovery delivery

SL02/SL03/SL08 and the supported local SL09 slice are implemented and exercised. [Evidence](../verification.md#bounded-history-checkpoints-and-recovery) records complete saves above 64 MiB, one bounded worker, snapshot barriers, rolling retention, actual SIGKILL boundaries, failed/ambiguous storage paths, source/generation races, continuation and operational backup/import. The Game panel and public catalog use 100-entry pages without limiting retained manual slots. Directory discovery still scales with slot count; saved bodies are never loaded by catalog reads.

Rebased integration preserves manual save grants and server-owned whole-world autosaves. Ordinary players have no save controls and their list/create/delete/load requests are denied. [Integration evidence](../verification.md#checkpoint-integration-with-foundations) covers creator-absent autosaves, current binding preservation, exact authority backup/import, preceding-layout conversion and both-adapter stress on the integrated foundation.

Acceptance is scoped to the current local mechanisms and named native workloads. The 256 MiB ceiling itself, every future process/plan family, naturally aged long sessions, hosted storage/power loss, live providers, CI suites and first-release population SLOs are not qualified. Existing SL00/SL01/SL04/SL05/SL07 checklists retain broader owner-integration/release evidence; this delivery does not silently close them. [Extension guidance](../extending.md#persistence-and-migrations) and DF02 define the branch migration path.

## Delivery boundaries and sequence

Build the initial personal-world manual save/load flow through SL00–SL05 and SL07, with SL06 limited to current-format rejection under the active development policy; SL09 owns broader qualification. Bounded full-record streams now release capture after its revision barrier; explicit loads pause for reconstruction/install. SL08 provides rolling autosaves; SL10 remains conditional future work. The initial version need not wait for normalized storage, all future objects, multiplayer or cloud infrastructure.

[Production-data D0–D6](production-data.md) continue to own storage contracts, operational recovery and rollout. [PF00–PF11](performance.md) own runtime optimization and scale qualification. Reuse their evidence and prerequisites where applicable without copying their tasks or marking their phases complete. Gameplay-specific delivery is tracked here; the existing operational backup/import rehearsal remains with its current tracker.

## SL00 — Establish the subsystem integration boundary

Dependencies: none; use the existing authoritative transition and repository boundaries.

- [x] Define a small coordination interface for capture, dependency enumeration, candidate validation/restoration and derived-state rebuilding. Keep payload interpretation with the owning subsystem; a single implementation is sufficient initially.
- [x] Map current state owners to the design's save-scope categories and identify gaps in complete capture, including state outside the hot world object. Keep evolving details with those owners, not in this tracker.
- [x] Document how a new subsystem joins the save/load path and adds meaningful round-trip coverage. Do not introduce a universal object hierarchy, automatic reflection serializer or speculative plugin registry.

Exit: an integration path demonstrated with the current persistence boundary and an additive fixture change, without freezing domain schemas or requiring framework edits for every new field.

## SL01 — Versioned save package and dependency validation

Dependencies: SL00.

- [ ] Implement a versioned logical package boundary carrying save identity, captured revision, compatibility information and required dependency references; keep its physical encoding replaceable.
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
- [x] Publish candidates atomically, preserve the prior valid save on failure, and order concurrent slot updates so late completion cannot overwrite newer intent accidentally. Ambiguous publication retries re-establish directory durability; [follow-up drills](../verification.md#follow-up-checkpoint-review) cover sync failure, incomplete metadata and catalog controls.
- [x] Retain required dependencies for each complete save; release them safely on deletion while respecting other saves and privacy policy.

Exit: process interruption, storage exhaustion and concurrent completion leave only complete recoverable catalog entries; restart discovers published saves and safely handles abandoned candidates.

## SL04 — Staged restore and atomic installation

Dependencies: SL01–SL03; SL05 and current-format validation are required before exposing load.

- [ ] Prepare an isolated candidate, reconstruct references and validate invariants through subsystem-owned restore paths without replaying creation side effects.
- [ ] Quiesce admission, preserve a recoverable pre-load point and install through one recoverable authority transition. Fail safely if preparation or installation cannot complete.
- [ ] Rebuild derived state, discard abandoned-future projections, issue fresh client baselines and reopen paused. Keep load operation identity outside the rewindable world so request retries cannot rewind twice.

Exit: interrupted installation recovers a complete old or new world; invalid candidates leave active state intact; a lost-response retry returns the original outcome even after later progress.

## SL05 — External authority and stale-work isolation

Dependencies: SL00; integrate with SL02 and SL04.

- [ ] Preserve current spending, uncertain operation records, permissions and forgetting/erasure protections during restore; reconcile them again at installation.
- [ ] Fence commands, background publication, provider callbacks and workspace/session context from the abandoned generation. Cancellation alone must not establish safety.
- [ ] Distinguish committed results, undispatched intent and uncertain execution using existing admission/recovery semantics. Keep paid dispatch blocked if required external authority cannot be recovered.

Exit: deterministic no-cost fixtures prove stale results cannot mutate the restored world, uncertain work is not automatically retried, spending is not refunded and revoked information does not reappear in cognition or client projections.

## SL06 — Compatibility policy after real-player support begins

The [active development policy](../save-and-load.md#active-development-policy) permits small in-place migrations now. This task covers a future ongoing release-compatibility commitment, not ordinary development updates. Current-state integrity checks remain in SL01.

- [ ] When real-player release compatibility is needed, select a support window in D60 and scope an ordered migration pipeline with preserved originals and historical fixtures.

Exit: future compatibility work is qualified only against a newly authorized support policy. This task does not block the development save/load flow.

## SL07 — Initial manual save/load experience

Dependencies: SL03–SL05 and current-format validation; future migration support is not a prerequisite.

- [ ] Expose authorized manual save, save listing and load operations through the application boundary, with React controls using the current design system.
- [ ] Show real creation time, simulated time, compatibility and truthful pending/success/failure feedback. Make replacement of the active timeline clear before destructive load or save deletion.
- [ ] Verify the complete player flow: save, advance the world, load, inspect the restored state and explicitly resume. Handle repeated submissions, disconnects and failure feedback.

Exit: a player can retain and restore the currently supported personal world without shell scripts; success is reported only after durable completion. Usable-release acceptance also requires SL09.

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
- [x] Exercise the canonical design's failure boundaries across supported adapters, including cross-store dependencies, interrupted publication/installation, current-format rejection, external authority and stale clients. Current evidence is native/no-cost, with suites deferred explicitly; future subsystem and hosted boundaries remain their owners' gates.
- [x] Measure capture pause, peak memory, save latency and restored playability on named workloads with growing active state and cold history. Set initial budgets with the performance tracker and address measured failures before adding incremental formats or worker infrastructure.
- [x] Record verified scope, limitations and recovery instructions in Architecture and Verification; update extension guidance to make future state additions extend the coverage.

Exit: published, reproducible no-cost correctness evidence and measured performance for the supported initial scope. Fixture success does not establish live model quality, cloud recovery or untested future-state coverage.

## SL10 — Conditional portability and shared-world expansion

Dependencies: qualified personal-world flow, relevant D60 choices and production-data rollout gates. Not an initial-release prerequisite.

- [ ] When portable export/import is selected, package required dependencies and validate target authority reconciliation, privacy and compatibility before installation.
- [ ] Extend the implemented scoped save grants and participant denial to cloud deployment, preserving the separation from private-content inspection. Qualify participant synchronization, branch/conflict policy and cross-world-effect boundaries without treating unresolved later features as foundation blockers.
- [ ] When measurements justify incremental storage or distributed capture, preserve the same logical save contract and qualify bounded recovery with the relevant performance/production tasks.

Exit: each enabled extension has scoped failure and recovery evidence; unsupported modes remain explicitly unavailable rather than inheriting personal-world guarantees.

## Foundation integration acceptance

SL00's [current owner inventory](../save-and-load.md#current-subsystem-integration) classifies the implemented foundation state, non-rewindable grants/revocations/accounting, derived indexes and invalidated asynchronous work. Future maintenance and ghost owners must join it when implemented. Include inactive humans, retained/summoned ghosts when supported, contribution/definition pins and approval/activation receipts. Reuse current generation and receipt boundaries; no new subsystem-specific restore patch outside its declared owner. Coordinate DF02 and INV-5.6 and prove continuation after save/load with a changed grant and pending job. The foundation integrations and both-adapter capture/restore evidence close the current SL00 integration boundary; broader SL09 and future branch integration remain open.
