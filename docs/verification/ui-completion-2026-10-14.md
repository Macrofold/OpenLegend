# UI-only completion checks — October 14, 2026

This report continues [whole-interface verification](game-interaction-redesign.md). The [execution plan](../projects/game-interaction-redesign-completion.md) and [UI/UX tracker](../maintainers/ui-ux.md) retain the agreed acceptance requirements. It records actual interface checks, not approval of the entire game or model behavior.

**Result: thirteen distinct selected UI scenarios have passing evidence across the source-specific runs below.** This is not one thirteen-test run or a statement that every whole-feature acceptance criterion has passed. The current production UI was unchanged during this narrower testing pass.

## Scope correction

Mike explicitly directed that the hunting failure be recorded separately and that this continuation test only the UI. The [projectile-progress bug](../maintainers/projectile-progress-bug.md) now owns that investigation. No combat, projectile, cognition or time-simulation implementation is changed in this UI-only pass. The temporary hunting/cognition qualification workflow was removed. Existing automatic repository CI is not disabled or reclassified as passing.

## Source and environment

- Repository: `Macrofold/OpenLegend`.
- Tested branch: `refs/heads/docs/game-ui-research-redesign`.
- Initial UI-only tested commit: `ffca318d3f761bbb5c85bdb7780fadcea5f8cc68`; later observation revisions are identified below.
- Integrated base: GitHub `refs/heads/main` at `b72e9d9aab8072eb1b5ae9d25f620a4421509148`, through the previously recorded normal merge `28baace2983f60baff0179def860c089af6b6e6d`. No new reconciliation was performed in this UI-only pass.
- Execution: disposable GitHub Actions checkout `/home/runner/work/OpenLegend/OpenLegend`, detached at each exact tested commit; pinned Node 22/pnpm dependencies, Chromium with software rendering, and disposable PostgreSQL 16. Mike's local checkout and saved development world were not used or changed.
- Provider access: fixture configuration without live credentials, `AI_BUDGET_USD=0`. **Additional provider/Jev cost: $0. Cumulative task provider/Jev cost: $0.**

## Nine core UI and recovery checks

The [UI-only run](https://github.com/Macrofold/OpenLegend/actions/runs/38670999477/job/116213849202) passes TypeScript, formatting of the five affected UI recovery/layout owners, production build, and **all nine selected browser scenarios**. There are **zero skipped, unexpected or flaky results** in this run. The production build retains its existing large-bundle advisory; this is not a measured bundle-size improvement.

- Contextual action search, displayed facts, keyboard handling and saved unavailable-action preference: **pass, 25.361 s**.
- Camera gestures and cancellation never issue gameplay commands: **pass, 11.154 s**.
- Owner-conversation growth, message-local pending and failure details: **pass, 12.491 s**.
- Theme/scale, reduced motion and responsive controls survive reload: **pass, 21.686 s**.
- Discarding a person draft, refreshing saved memories and narrow editor bounds: **pass, 13.171 s**.
- Time settings, sole-tab entry, explicit control transfer, logout and manual pause: **pass, 40.736 s**.
- Original action after edited words, finished current work and reload: **pass, 18.355 s**.
- Checkpoint creation after lost acknowledgement and reload: **pass, 19.903 s**.
- Checkpoint loading across the resulting timeline change: **pass, 19.700 s**.

All scenarios use the unchanged **60-second per-test limit**, their substantive assertions and the production application. The Time pass is source-specific evidence, **not proof of a general performance repair** or a reason to erase earlier intermittent failures. The six pre-existing UI scenarios and three existing recovery scenarios were selected explicitly; the spatial/combat journey and native/cognition test suites were not manually run in this UI-only continuation.

### What the recovery scenarios actually establish

The action scenario submits real native waiting work with **Replace current work**, allows the server to accept it, and discards only the browser's acknowledgement. It then edits the draft and advances beyond the original work's completion. Reload preserves the changed draft separately from the original submitted text and scheduling choice. **Check original action** reads the accepted original result; the complete world digest stays unchanged, the submission count stays one, and preparing another action becomes available only after resolution.

Checkpoint creation similarly loses only the acknowledgement after the real server creates the checkpoint. Reload at narrow width retains the original task and blocks another creation. Checking its result leaves the complete checkpoint list unchanged and the create-submission count at one.

The load scenario creates and loads a real checkpoint, records the actual protection-checkpoint identifier supplied by the existing save owner, and discards the load acknowledgement. The actual saved timeline changes once. After reload, checking the original result changes neither that timeline nor the exact protection payload, and the load-submission count stays one. The probe does **not** treat an absent fixed `before-load` row as evidence of protection.

These are integrated browser/server/storage checks with controlled acknowledgement loss. They do not establish paid interpretation quality, every possible storage failure or every identity/grant transition.

## Four composed interface observations

### Journal and Known places

At `985c02a273615e78687bc897b7f40362ffc69fc9`, the [Journal scenario](https://github.com/Macrofold/OpenLegend/actions/runs/38672133234/job/116217474525) **passes in 29.500 s**. Opening Places, inspecting an observed place and focusing its last-known location sends no gameplay command and leaves the character's actual position unchanged. Selection survives 390 × 844 and 1024 × 600 layouts, with the panel inside the viewport. An unmatched search shows the proper empty result; clearing it restores search focus and the observed-place entries.

That run's two other scenarios failed before completing their intended observations. The [read-only trace inspection](https://github.com/Macrofold/OpenLegend/actions/runs/38672475281/job/116218548364) established fixture mistakes: Mara, not Ada, is an offered inventory recipient at the current starting position, and the supposed remote-container check had only opened the player's own collection. Those failures are retained, not reinterpreted as passing native trade or permission tests.

### Shared barter draft and responsive placement

At `ae799ea2e6c1b808b885961f2f6e9929a1ec8b65`, the [corrected barter scenario](https://github.com/Macrofold/OpenLegend/actions/runs/38673466079/job/116221641382) **passes in 28.365 s**, with TypeScript and production build passing. It selects Mara's real trade entry, chooses an exact carried item and quantity, then opens that same physical item in Inventory and chooses Mara from the actual offered recipients. The exact draft survives both entry routes and the 390 × 844 layout. Closing the popup leaves actual carried lots, quantities and character position unchanged; no offer, exchange, transfer, move or drop is submitted during preparation.

Opening Inventory does legitimately record inspection through the native owner. The observation therefore distinguishes inspection from a premature transfer or movement; it does not assert that every inventory gesture is command-free. It does **not** establish reciprocal settlement, recipient acceptance or every permission/refusal combination.

The preceding `ddb20037` observation sampled the popup immediately after resizing and measured its right edge at 614 pixels in a 390-pixel viewport. The corrected observation waits, within the existing assertion budget, for the **same exact viewport-bound predicate**, then performs the original bounds assertions. It passes without any production-code change. Thus no persistent popup overflow or production sizing repair is established by this evidence. The earlier progress update that called it a real UI defect was premature.

### Denied collection reread

At `ddb20037ef1e2036e581127d1ef4d213a9ddc151`, the [denied-reread scenario](https://github.com/Macrofold/OpenLegend/actions/runs/38673044662/job/116220338950) **passes in 19.609 s**. It first populates the player's real collection through the running UI and database. A controlled denied reply to its next inventory reread causes the prior item cells to disappear, shows the refusal, leaves no item popup visible and keeps Refresh enabled. The panel fits the viewport and a screenshot is captured.

This establishes the shared collection's denied-read presentation. **It is not native revocation of another person's container grant**, nor visual inspection of the resulting screenshot. The original broader denied-container acceptance requirement is not closed wholesale by this narrower observation.

### Companion invitation

At `339e838e35c0fd72e46f734f54cab2bec003f2f1`, the [companion-invitation scenario](https://github.com/Macrofold/OpenLegend/actions/runs/38673904852/job/116223041930) **passes**, with TypeScript and production build passing. The single-test run takes 38.687 s including runner setup/teardown, with no skipped, unexpected or flaky result.

The real selected companion is supplied to the form. Choosing a permitted destination, reopening its picker and pressing Escape retains the destination, closes only the picker and returns focus to its trigger. The optional purpose, companion and destination survive the narrow layout. Preparing sends no gameplay command and moves neither character. The explicit Send control submits exactly one real invitation with the selected companion and purpose; the server accepts it, the UI presents the result, and both characters remain in place pending acceptance. The parent task stays within the narrow viewport before and after sending.

This is actual invitation submission, not a simulated success reply. Recipient acceptance, subsequent joint travel and live model choices are outside this observation.

## Evidence retention and inspection limits

Every artifact retains the exact temporary scenario and source commit, relevant logs/JSON and captured images. Runner-only test files were removed after their runs, and the runners verified that their source checkouts were clean. Three-day artifact retention is an execution limit; stable run references and the essential measured results are retained here.

- [Core UI artifact 11944208133](https://github.com/Macrofold/OpenLegend/actions/runs/38670999477/artifacts/11944208133): **5,231,532 bytes**, SHA-256 `28a5c8a014970796af1aa858a209a981c865b07eaf9f53e5046fcfc727305edb`.
- [Initial composed artifact 11945195031](https://github.com/Macrofold/OpenLegend/actions/runs/38672133234/artifacts/11945195031): **30,249,061 bytes**, SHA-256 `b309fc2aad58b4213ad927a6297adcec6abad93076f4b80ec7c799aafee1243c`. Includes the passing Journal observation and the original fixture-failure traces.
- [Denied-reread and transitional barter artifact 11945236517](https://github.com/Macrofold/OpenLegend/actions/runs/38673044662/artifacts/11945236517): **15,471,217 bytes**, SHA-256 `278b512419fcfa942a5a10e20c92bf26a73bea2a449e2032f04c0c0463efbe5e`.
- [Passing barter artifact 11945272362](https://github.com/Macrofold/OpenLegend/actions/runs/38673466079/artifacts/11945272362): **121,455 bytes**, SHA-256 `e19a9ee91ec1535530cddb8d7d4908db00e8aba8eb2a5daf6bdd789220c9f661`.
- [Passing invitation artifact 11945590579](https://github.com/Macrofold/OpenLegend/actions/runs/38673904852/artifacts/11945590579): **457,553 bytes**, SHA-256 `0a76d276751e7a8b57a573fb47c7047bba74be96eeea8b790cf7fdf875a36c12`.

The core artifact was retrieved. Local execution failed before archive inspection could run, so **the newly captured images have not been visually inspected in this continuation**. Successful DOM assertions, bounded layouts and screenshot capture are reported separately from inspecting the actual pixels. Earlier reviewed images retain only their earlier source-specific qualification.

## Remaining whole-feature qualification

The original action and checkpoint reload-recovery implementation is no longer missing: the three specific interrupted-request journeys above pass. This does not close every compound UIUX12/UIUX14 requirement. Wider storage/identity/revocation combinations, complete native barter/outing continuation, completed-task rendered-result review and the alternate-world interface qualification retain their earlier explicit tracking and evidence limits.

Real operating-system input-method behavior, physical assistive devices and uncoached-player observation have not been performed here. Scripted keyboard tests and automated Chromium interaction cannot substitute for that evidence. Pixel inspection is blocked by the current local execution failure. No entire-feature completion, green repository-wide CI or merge approval follows merely from the passing UI subset. The unrelated hunting repair remains excluded at Mike's direction rather than being restarted under UI acceptance.
