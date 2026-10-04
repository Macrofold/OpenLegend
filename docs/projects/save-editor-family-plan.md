# Save recovery, editor regressions and family facts

| Status      | Current progress                                                                                                                                  | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Save recovery and the two focused editor fixes are delivered; family authoring still needs its learning design, runtime journey and verification. | 2026-10-03   |

Implementation plan for SL09-C, the two God-mode editor regression items, and BW16. Current base: local `main` `b50ec6ce`. Original implementation base: local `main` `add92ccb`, containing refreshed `origin/main` `0382be76`. Working branch: `codex/save-editor-family`.

## Scope and owners

- **Save recovery:** `apps/server/src/checkpoint*`, `game-saves.ts`, and `save-files.ts` own the capture lifetime and filesystem publication. Keep the PostgreSQL snapshot consistent and prior saves usable. The database writer and restore command must share the current-format marker so a valid new backup can be installed without accepting older formats. Measure a larger write-heavy case with a matched command baseline and record host contention. Address a blocked individual write/sync/rename through one worker-lifetime rule; do not let a timed-out writer publish after the caller reports failure.
- **Editor correctness:** the React editor sends only changed memory/event entries; `WorldService` merges those against current authoritative history with per-entry hashes. Add focused regression coverage for mature lists, validation, discard/reset, concurrent simulation additions, same-entry conflicts, and refresh. Fix actual defects in those owners without duplicating save logic. Inspect the resulting UI at desktop and narrow sizes.
- **Family facts:** `social.ts` owns authoritative parent/sibling transition; `WorldService` owns creator admission and scoped projection; protocol carries only permitted data; the client owns a creator journey with actor selection, direction preview, submission, deletion and readable bounded inspection. The paired feature and technical designs record Mike's choices: plain creator deletion and learned-only ordinary-player visibility. Define the permitted learning path before implementing ordinary disclosure. Keep subjective notes independent and world-specific topology localized.

## Sequence and dependencies

1. Reconcile the selected base, owners, present contracts and D63 policy; record family design and limits. D63's correction choice is plain deletion without a family-specific audit; the learning path remains to be designed. No historical save migration under the development save policy.
2. Verify existing editor delta/merge behavior with focused tests and UI interaction; repair only confirmed gaps. Keep pagination and request bodies bounded as character histories grow.
3. Measure SL09-C on disposable PostgreSQL with concurrent durable writes and a matched baseline. Exercise an operation that never finishes inside a real worker; the same parent watchdog covers write, sync and rename. Verify exit-before-failure, cleanup, refusal to reuse the failed worker, normal worker reuse, restoration and native continuation. The local host was heavily loaded, so report the measured comparison without a quiet-host or general latency claim.
4. Implement BW16 through domain, server/protocol and client. Validate self/duplicate/cycle/stale authority/replay, deletion and late creation retry, privacy, large lists and same-format restart. Visual and keyboard review includes spacing, information density and narrow viewport.
5. Reconcile focused trackers, current contracts, limits, decision history and verification report. Review the complete diff and run changed-file formatting, typecheck, build and focused runtime/browser checks.

## Completion criteria

SL09-C has measured pressure and a safe, explained outcome for a blocked individual file operation. Both editor TODOs have passing meaningful regression evidence and no uncovered behavior gap in their stated cases. BW16's agreed creator/observer/correction journey works through the real UI and service with privacy and restart evidence. Only then mark their checklist entries complete. Report any unverified gate as unfinished.
