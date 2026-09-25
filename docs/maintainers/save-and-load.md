# Save/load implementation tracker

## Spatial capture dependency

[SW15](spatial-world.md) owns new spatial-state fixtures and cache/renderer restoration. This tracker retains global capture/restore and privacy/accounting behavior. A saved route/flight progress is canonical data; reconstructing readiness or visuals cannot consume resources or redispatch AI.

This is the sole implementation tracker for gameplay save/load capabilities. The [save/load design](../save-and-load.md) owns behavior and acceptance principles. [Architecture](../architecture.md) owns implemented facts; [Verification](../verification.md) owns evidence. Phase exit gates remain open until their required evidence is recorded; the initial delivery below is not full qualification. Existing persistence and backup scripts are reusable foundations, not proof that these capabilities are complete.

Tasks deliberately avoid enumerating object types, fields or physical layouts. Subsystem owners maintain their own serialization, validation and migration details as they evolve. Completing the framework does not automatically establish coverage for subsequently added state.

Coordinate module dependency capture and load validation with [EWF07](extensible-world-foundation.md#ewf07--module-lifecycle-and-current-format-save-integration); module fixtures do not complete this tracker’s broader acceptance.

## Initial implemented slice

- [x] SL00–SL03 foundations: a repository-owned current-format package captures `SavedWorld` plus durable history, retired source versions and optional annotations; manual slots publish atomically in the local save folder after transactional capture. Capture reuses the current canonical record owner.
- [x] SL04–SL05 foundations: loading drains background workers, preserves external accounting/privacy authority, replaces history atomically with the world, rotates command/context generations and retains a pre-load slot. Restored pending narration is cancelled; world-agent sessions restart fresh.
- [x] SL07 basic UI: Game below World agent offers named save, list, confirm-load and confirm-delete; successful load reopens paused. Named saves have no fixed count ceiling; one pre-load slot and 64 MiB per payload remain.
- [x] Build and isolated native browser walkthrough: save, advance, restore earlier clock/meters and observe paused state. See [runtime evidence](../verification.md#manual-saveload-runtime).

The detailed phase criteria below remain open where not fully established. Automated checks are deferred by instruction to [save/load validation TODO](TODO.md#manual-saveload-deferred-validation); Native SQLite/PostgreSQL import, backup/restore, transactional rollback and one actual process-death drill are now recorded in [foundation evidence](../verification.md#data-foundation-runtime). Full crash-boundary and live-provider qualification remain open. SL08 and SL10 are not implemented.

## Delivery boundaries and sequence

Build the initial personal-world manual save/load flow through SL00–SL05 and SL07, with SL06 limited to current-format rejection under the active development policy; SL09 owns broader qualification. Start with a simple complete snapshot and an explicit pause during capture/load if necessary. SL08 adds rolling autosaves; SL10 is conditional future work. The initial version need not wait for normalized storage, all future objects, multiplayer or cloud infrastructure.

[Production-data D0–D6](production-data.md) continue to own storage contracts, operational recovery and rollout. [PF00–PF11](performance.md) own runtime optimization and scale qualification. Reuse their evidence and prerequisites where applicable without copying their tasks or marking their phases complete. Gameplay-specific delivery is tracked here; the existing operational backup/import rehearsal remains with its current tracker.

## SL00 — Establish the subsystem integration boundary

Dependencies: none; use the existing authoritative transition and repository boundaries.

- [ ] Define a small coordination interface for capture, dependency enumeration, candidate validation/restoration and derived-state rebuilding. Keep payload interpretation with the owning subsystem; a single implementation is sufficient initially.
- [ ] Map current state owners to the design's save-scope categories and identify gaps in complete capture, including state outside the hot world object. Keep evolving details with those owners, not in this tracker.
- [ ] Document how a new subsystem joins the save/load path and adds meaningful round-trip coverage. Do not introduce a universal object hierarchy, automatic reflection serializer or speculative plugin registry.

Exit: an integration path demonstrated with the current persistence boundary and an additive fixture change, without freezing domain schemas or requiring framework edits for every new field.

## SL01 — Versioned save package and dependency validation

Dependencies: SL00.

- [ ] Implement a versioned logical package boundary carrying save identity, captured revision, compatibility information and required dependency references; keep its physical encoding replaceable.
- [ ] Validate completeness, integrity, resource limits and supported interpretation before exposing a candidate to restoration. Keep private state private and exclude credentials.
- [ ] Resolve required content versions explicitly; report missing or incompatible dependencies without silently substituting current content.

Exit: valid fixture packages can be inspected independently of the running world; corrupt, incomplete, oversized and unsupported packages fail clearly without changing active state.

## SL02 — Consistent authoritative capture

Dependencies: SL00–SL01.

- [ ] Capture a committed transition boundary through the existing authority, incorporating preceding native progress and its required durable side effects.
- [ ] Capture all participating stores and retained dependencies at that logical cut. Cover cold state as well as active state without requiring everything to live in one object or database table.
- [ ] Separate stable capture from serialization/output; bound simultaneous captures and retained memory. Classify pending external work without waiting indefinitely for it.

Exit: controlled concurrent transitions cannot produce a mixed-revision save; subsequent live mutations cannot alter a captured candidate. Record capture duration and memory use.

## SL03 — Durable publication and save catalog

Dependencies: SL01–SL02.

- [ ] Add durable publication and bounded catalog operations for creating, listing, inspecting and explicitly deleting retained saves. Represent pending, complete and failed outcomes accurately.
- [ ] Publish candidates atomically, preserve the prior valid save on failure, and order concurrent slot updates so late completion cannot overwrite newer intent accidentally.
- [ ] Retain required dependencies for each complete save; release them safely on deletion while respecting other saves and privacy policy.

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

- [ ] Schedule bounded autosaves through the same capture/publication path, with clear behavior during pause, slow storage, concurrent manual saves and shutdown.
- [ ] Rotate only complete saves, protect manual saves and required dependencies, and apply privacy deletion through the existing authoritative policy.
- [ ] Expose retained restore points and failure/coverage information without implying arbitrary ten-minute rewind.

Exit: prolonged play remains within the selected storage/work budget; interrupted rotation preserves a usable checkpoint, and every advertised point restores successfully.

[AG09](agent-agency.md#ag09--same-version-save-pause-recovery-and-revocation) owns agency-state round-trip and continuation coverage. SL capture/restore includes its authoritative goals/frontiers and fences discarded-timeline work; reuse that coverage without duplicating the AG checklist.

## SL09 — Continuation, recovery and performance qualification

Coordinate new stimulus-state continuation with proposed [EPR08](events-perception-and-reactions.md#epr08--saveload-generation-fencing-and-overload); SL retains capture, restoration and generation-fencing qualification under the active development policy.

Dependencies: SL02–SL07 for the manual release; extend coverage when SL08 or SL10 ships. Develop focused checks alongside each capability.

- [ ] Build a reusable semantic continuation harness that compares uninterrupted native execution with save/load/resume under identical inputs. Let each subsystem supply representative cases as it evolves.
- [ ] Exercise the canonical design's failure boundaries across supported adapters, including cross-store dependencies, interrupted publication/installation, current-format rejection, external authority and stale clients. Reuse existing tests where they establish the same evidence.
- [ ] Measure capture pause, peak memory, save latency and restored playability on named workloads with growing active state and cold history. Set initial budgets with the performance tracker and address measured failures before adding incremental formats or worker infrastructure.
- [ ] Record verified scope, limitations and recovery instructions in Architecture and Verification; update extension guidance to make future state additions extend the coverage.

Exit: published, reproducible no-cost correctness evidence and measured performance for the supported initial scope. Fixture success does not establish live model quality, cloud recovery or untested future-state coverage.

## SL10 — Conditional portability and shared-world expansion

Dependencies: qualified personal-world flow, relevant D60 choices and production-data rollout gates. Not an initial-release prerequisite.

- [ ] When portable export/import is selected, package required dependencies and validate target authority reconciliation, privacy and compatibility before installation.
- [ ] For cloud/shared worlds, enforce the selected world-creator and authorized OpenLegend-system-admin save/load roles; deny ordinary participants and keep private-content inspection separate. Implement participant synchronization, branch/conflict policy and cross-world-effect boundaries without treating unresolved later features as foundation blockers.
- [ ] When measurements justify incremental storage or distributed capture, preserve the same logical save contract and qualify bounded recovery with the relevant performance/production tasks.

Exit: each enabled extension has scoped failure and recovery evidence; unsupported modes remain explicitly unavailable rather than inheriting personal-world guarantees.
