# Save recovery, editor regressions and family facts

| Status    | Current progress                                                                                                         | Last updated |
| --------- | ------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Completed | Save recovery, the focused editor fixes and the redesigned family-tree journey are delivered with recorded verification. | 2026-10-03   |

Implementation plan for SL09-C, the two God-mode editor regression items, and BW16. Current base: local `main` `b50ec6ce`. Original implementation base: local `main` `add92ccb`, containing refreshed `origin/main` `0382be76`. Working branch: `codex/save-editor-family`.

## Scope and owners

- **Save recovery:** `apps/server/src/checkpoint*`, `game-saves.ts`, and `save-files.ts` own the capture lifetime and filesystem publication. Keep the PostgreSQL snapshot consistent and prior saves usable. The database writer and restore command must share the current-format marker so a valid new backup can be installed without accepting older formats. Measure a larger write-heavy case with a matched command baseline and record host contention. Address a blocked individual write/sync/rename through one worker-lifetime rule; do not let a timed-out writer publish after the caller reports failure.
- **Editor correctness:** the React editor sends only changed memory/event entries; `WorldService` merges those against current authoritative history with per-entry hashes. Add focused regression coverage for mature lists, validation, discard/reset, concurrent simulation additions, same-entry conflicts, and refresh. Fix actual defects in those owners without duplicating save logic. Inspect the resulting UI at desktop and narrow sizes.
- **Family facts:** the base-world family owner maintains parent links and computes relationship descriptions; `WorldService` owns creator admission and scoped projection; protocol carries only permitted data; the client owns a creator journey with actor selection, direction preview, submission, deletion and readable bounded inspection. The paired feature and technical designs record Mike's choices: plain creator deletion and learned-only ordinary-player visibility. Existing permitted observations, memories and knowledge supply learned claims; the objective tree remains creator-only. Keep subjective notes independent and world-specific topology localized.

## Sequence and dependencies

1. Reconcile the selected base, owners, present contracts and D63 policy; record family design and limits. D63's correction choice is plain deletion without a family-specific audit; the learning path uses existing permitted observations and memories. No historical save migration under the development save policy.
2. Verify existing editor delta/merge behavior with focused tests and UI interaction; repair only confirmed gaps. Keep pagination and request bodies bounded as character histories grow.
3. Measure SL09-C on disposable PostgreSQL with concurrent durable writes and a matched baseline. Exercise an operation that never finishes inside a real worker; the same parent watchdog covers write, sync and rename. Verify exit-before-failure, cleanup, refusal to reuse the failed worker, normal worker reuse, restoration and native continuation. The local host was heavily loaded, so report the measured comparison without a quiet-host or general latency claim.
4. Implement BW16 through domain, server/protocol and client. Validate self/duplicate/cycle/stale authority/replay, deletion and late creation retry, privacy, large lists and same-format restart. Visual and keyboard review includes spacing, information density and narrow viewport.
5. Reconcile focused trackers, current contracts, limits, decision history and verification report. Review the complete diff and run changed-file formatting, typecheck, build and focused runtime/browser checks.

## Completion criteria

SL09-C has measured pressure and a safe, explained outcome for a blocked individual file operation. Both editor TODOs have passing meaningful regression evidence and no uncovered behavior gap in their stated cases. BW16's agreed creator/observer/correction journey works through the real UI and service with privacy and restart evidence. Only then mark their checklist entries complete. Report any unverified gate as unfinished.

## October 3 family redesign

Mike replaced independent sibling facts with an authoritative parentage graph and computed descriptions. The [revised design](family-authoring-tech-design.md) owns implementation scope, invariants and checks. Existing permitted memories/observations supply learned claims; no direct objective tree disclosure to NPCs or ordinary players. General [creator edit propagation](../creator-edit-propagation-feature-spec.md) records no automatic memory cascades, earlier explicit-dependency preview work and later optional semantic memory tools.

## Completion

Family delivery and remaining vocabulary/qualification limits are recorded in [October 3 evidence](../../verification/family-authoring.md). Existing save-recovery evidence remains in [ordered async saves](../../verification/ordered-async-saves.md); the focused person-editor browser regression passed again with this integration. Broader restore/privacy qualification in the separate priority-followups plan remains under that owner and is not reopened or claimed by this plan.

Local `main` advanced after family implementation. The branch has now been reconciled onto local `main` `fa047dc3`. The original feature evidence remains scoped to `b50ec6ce`; reconciliation preserves the family behavior and uses patch comparison and TypeScript checking rather than repeating browser qualification.
