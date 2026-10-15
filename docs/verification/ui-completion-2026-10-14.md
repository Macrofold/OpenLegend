# UI-only completion checks — October 14, 2026

This report continues [whole-interface verification](game-interaction-redesign.md). The [execution plan](../projects/game-interaction-redesign-completion.md) and [UI/UX tracker](../maintainers/ui-ux.md) retain the agreed acceptance requirements. It records actual interface checks, not approval of the entire game or model behavior.

## Scope correction

Mike explicitly directed that the hunting failure be recorded separately and that this continuation test only the UI. The [projectile-progress bug](../maintainers/projectile-progress-bug.md) now owns that investigation. No combat, projectile, cognition or time-simulation implementation is changed in this UI-only pass. The temporary hunting/cognition qualification workflow was removed. Existing automatic repository CI is not disabled or reclassified as passing.

## Source and environment

- Repository: `Macrofold/OpenLegend`.
- Tested branch: `refs/heads/docs/game-ui-research-redesign`.
- Tested commit: `ffca318d3f761bbb5c85bdb7780fadcea5f8cc68`.
- Integrated base: GitHub `refs/heads/main` at `b72e9d9aab8072eb1b5ae9d25f620a4421509148`, through the previously recorded normal merge `28baace2983f60baff0179def860c089af6b6e6d`. No new reconciliation was performed in this UI-only pass.
- Execution: disposable GitHub Actions checkout `/home/runner/work/OpenLegend/OpenLegend`, detached at the exact tested commit; pinned Node 22/pnpm dependencies, Chromium with software rendering, and disposable PostgreSQL 16. Mike's local checkout and saved development world were not used or changed.
- Provider access: fixture configuration without live credentials, `AI_BUDGET_USD=0`. **Additional provider/Jev cost: $0. Cumulative task provider/Jev cost: $0.**

## Passing checks

The [UI-only run](https://github.com/Macrofold/OpenLegend/actions/runs/38670999477/job/116213849202) passes TypeScript, formatting of the five affected UI recovery/layout owners, production build, and **all nine selected browser scenarios**. There are **zero skipped, unexpected or flaky results** in this run. The production build retains its existing large-bundle advisory; this is not a measured bundle-size improvement.

| Scenario | Result | Duration |
| --- | --- | --- |
| Contextual action search, displayed facts, keyboard handling and saved unavailable-action preference | Pass | 25.361 s |
| Camera gestures and cancellation never issue gameplay commands | Pass | 11.154 s |
| Owner-conversation growth, message-local pending and failure details | Pass | 12.491 s |
| Theme/scale, reduced motion and responsive controls survive reload | Pass | 21.686 s |
| Discarding a person draft, refreshing saved memories and narrow editor bounds | Pass | 13.171 s |
| Time settings, sole-tab entry, explicit control transfer, logout and manual pause | Pass | 40.736 s |
| Original action after edited words, finished current work and reload | Pass | 18.355 s |
| Checkpoint creation after lost acknowledgement and reload | Pass | 19.903 s |
| Checkpoint loading across the resulting timeline change | Pass | 19.700 s |

All scenarios use the unchanged **60-second per-test limit**, original assertions and the production application. The Time pass is source-specific evidence, **not proof of a general performance repair** or a reason to erase earlier intermittent failures. The six pre-existing UI scenarios and three existing recovery scenarios were selected explicitly; the spatial/combat journey and native/cognition test suites were not manually run.

### What the recovery scenarios actually establish

The action scenario submits real native waiting work with **Replace current work**, allows the server to accept it, and discards only the browser's acknowledgement. It then edits the draft and advances beyond the original work's completion. Reload preserves the changed draft separately from the original submitted text and scheduling choice. **Check original action** reads the accepted original result; the complete world digest stays unchanged, the submission count stays one, and preparing another action becomes available only after resolution.

Checkpoint creation similarly loses only the acknowledgement after the real server creates the checkpoint. Reload at narrow width retains the original task and blocks another creation. Checking its result leaves the complete checkpoint list unchanged and the create-submission count at one.

The load scenario creates and loads a real checkpoint, records the actual protection-checkpoint identifier supplied by the existing save owner, and discards the load acknowledgement. The actual saved timeline changes once. After reload, checking the original result changes neither that timeline nor the exact protection payload, and the load-submission count stays one. The probe does **not** treat an absent fixed `before-load` row as evidence of protection.

These are integrated browser/server/storage checks with controlled acknowledgement loss. They do not establish paid interpretation quality, every possible storage failure or every identity/grant transition.

## Evidence retention and inspection limits

Original artifact: [ui-final, 11944208133](https://github.com/Macrofold/OpenLegend/actions/runs/38670999477/artifacts/11944208133), **5,231,532 bytes**, SHA-256 `28a5c8a014970796af1aa858a209a981c865b07eaf9f53e5046fcfc727305edb`. The artifact contains the exact temporary recovery scenario, browser JSON, logs, metadata and captured images. The temporary scenario was removed and the runner verified its tracked and untracked source remained clean.

The artifact was retrieved. Local execution failed before archive inspection could run, so **the newly captured images have not been visually inspected in this continuation**. Successful DOM assertions, bounded layouts and screenshot capture are reported separately from inspecting the actual pixels. Earlier reviewed images retain only their earlier source-specific qualification.

Real operating-system input-method behavior, physical assistive devices and uncoached-player observation have not been performed here. Scripted keyboard tests and automated Chromium interaction cannot substitute for that evidence. No entire-feature completion, green repository-wide CI or merge approval follows merely from this passing UI subset.
