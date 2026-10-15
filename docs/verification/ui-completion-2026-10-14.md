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

This establishes the shared collection's denied-read presentation. **It is not native revocation of another person's container grant.** The later pixel inspection below qualifies its captured appearance; the original broader denied-container acceptance requirement is not closed wholesale by this narrower observation.

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

The original continuation retrieved the core artifact, but local execution failed before archive inspection; no pixel inspection occurred then. That historical limitation is superseded by the later inspection below, without changing any original scenario failure or behavioral result.

### Later pixel inspection

After integration at `542644797`, all five artifacts above were downloaded with `gh run download` into temporary directories outside the repository. Their metadata matches the recorded source commits. **Twelve original PNGs were visually inspected**; no application, browser or server was run for this inspection, and no generated files were added to the repository. These images qualify only their original revisions, **not the current code after reconciliation with `origin/main` at `0c12398e3`**.

| Original source | PNG names                                                                      | Observed appearance and limits                                                                                                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ffca318d`      | `action-recovery-desktop.png`                                                  | The edited “wait 2 minutes” and disabled Attempt action are readable. The original-result explanation and recovery button are outside the captured reading position; a preceding card is partly clipped at the top. This frame proves neither initially visible recovery nor an unreachable control.      |
| `ffca318d`      | `checkpoint-create-recovery-phone.png`, `checkpoint-load-recovery-desktop.png` | The original operation, uncertainty explanation and Check original checkpoint result fit unobscured at 390 × 844 and 1440 × 960. Successful recovery and protection preservation come from the behavioral checks, not these pixels.                                                                       |
| `ffca318d`      | `time-settings.png`, `time-settings-narrow.png`, `tab-resume-narrow.png`       | Selected 0.5×, the time explanation and Resume/Log Out controls are readable within their viewports. Both narrow frames have black world backgrounds and do not qualify scene rendering.                                                                                                                  |
| `985c02a2`      | `journal-place-narrow.png`, `journal-place-short.png`                          | The camp-hearth observation, last-known position and distinction between camera focus and walking are readable. Move and Recheck fit at 390 × 844. At 1024 × 600, Move is partly below the panel edge in this reading position; scrolling to it is not established by pixels. Both backgrounds are black. |
| `ae799ea2`      | `inventory-trade-narrow.png`                                                   | Large travel cloak, quantity 1, Close and Trade · Mara Reed fit. The popup ends just after New offer; two-sided terms and reply controls are absent from this frame.                                                                                                                                      |
| `ddb20037`      | `collection-denied-desktop.png`                                                | My belongings shows a readable controlled refusal, no item cells or item popup, and a visible Refresh control. It does not show a retained denied external container.                                                                                                                                     |
| `339e838e`      | `companion-invitation-narrow.png`, `companion-invitation-sent.png`             | Preparation shows Mara, exact destination, purpose, the idle choice and reachable Send; lower explanatory text extends beyond the captured edge. The sent view shows pending terms, companion, purpose, Withdraw and the acceptance-before-movement explanation.                                          |

No new functional defect is established by these pixels alone. The action-recovery reading position, short Journal controls and incomplete barter view retain the specific presentation limits above. The later image inspection does not change earlier failed observations or establish new runtime behavior or broader input/player acceptance. Additional provider/Jev cost for retrieval and inspection: **$0**. Cumulative task provider/Jev cost: **$0**.

## October 15 continuation: integrated source and required checks

The continuation uses `docs/game-ui-research-redesign` in
`/Users/mzw/.codex/worktrees/0f80/OpenLegend`. It switched from detached HEAD at
`4f16dc98c` to that branch. The main checkout and saved development world were
unchanged. Merge `542644797` integrates refreshed `origin/main` at
`0c12398e32e7c9578e18de07bbe79d39b4827208` from
`https://github.com/Macrofold/OpenLegend.git`, preserving published history.

At published source **`a367c4d1b641d73f5431ff48071076faac571394`**, the ordinary
GitHub Actions workflows pass without workflow changes:

| Check                                                                                                                                                                                           | Observed result                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [PR Code](https://github.com/Macrofold/OpenLegend/actions/runs/38679452362/job/116240412069) and [push Code](https://github.com/Macrofold/OpenLegend/actions/runs/38679445677/job/116240390626) | Pass, including 392 tests in 43 files, guidance, generated configuration, formatting, TypeScript and production build. |
| [Spatial and interface](https://github.com/Macrofold/OpenLegend/actions/runs/38679452378/job/116240412190)                                                                                      | Pass: 28 native checks in four files, the spatial browser journey and all six ordinary interface journeys.             |
| Time within that interface run                                                                                                                                                                  | Pass in 28.9 seconds under the unchanged 60-second total and original local allowances.                                |

These are disposable Linux-runner/PostgreSQL/Chromium results. The Time fixture
integrated from main uses the authored solo opening and current simulated
departure deadlines; it retains normal close, abrupt loss, explicit transfer,
re-entry, pause and logout assertions. Its smaller scene and different host prevent
interpreting the result as a measured speedup over earlier runs. Historical Time
failures remain recorded.

Local Node 24.13.0/pnpm 10.33.0 checks also pass TypeScript, production build,
affected formatting, configuration, guidance and 14 selected draft/transport tests.
Local browser execution uses an owned PostgreSQL 16/pgvector container on loopback
port 55445, disposable databases, and no live provider credentials.

The first sandboxed six-file attempt aborted at Chrome launch before application
setup. Outside the command sandbox, installed Chrome reached the application but
the five graphics-dependent cases failed initial world readiness under their
unchanged five- or twenty-second allowances; Time failed to see the second-tab
pause dialog within five seconds. Pinned Chromium 145.0.7632.6 repeated the action
readiness failure. These are failed local observations, not CI passes. In the
inspected action trace the first world image eventually rendered after the
assertion deadline, with one landscape build taking 409 ms and 1,250 scenery
objects; the renderer startup block and constructor are unchanged from the
pre-merge source. This establishes neither permanent suspension nor a precise
graphics bottleneck or production performance repair.

The recovery review corrected two actual client boundaries: obsolete inventory
contents cannot overwrite a newer permitted read, and an owner conversation must
verify exact request retention before sending. Unreadable storage and failed
matching cleanup block another owner request without losing editable text; an old
Resubmit callback cannot replace a different retained request. The ordinary owner
conversation journey passes in CI. Additional targeted storage-failure/reload
qualification is recorded separately as it completes; static inspection and the
ordinary journey do not close that failure matrix.

All provider execution remains disabled or intercepted fixture behavior.
Additional provider/Jev cost: **$0**. Cumulative task provider/Jev cost: **$0**.
Fixture accounting values in native test logs are not real provider charges.

### Finite storage and denied-container observations

At `7e161aaebbf20cd5197d8be0b712df46521a3636`, the
[finite Linux observation run](https://github.com/Macrofold/OpenLegend/actions/runs/38680389344/job/116243352552)
passes the owner-storage and denied-container observations. Its overall result is
**failed** because the completed-task case stops on an ambiguous test selector:
both the completion reason and the actual deadline contain “chosen stopping time.”
That failure precedes its six requested images; it establishes no new presentation
defect. The correction selects the deadline precisely and keeps the assertions and
all existing budgets.

The owner-storage case passes in **18.1 seconds** under its 60-second limit. The
actual App and native owner session use supplied retained turn records and
intercepted message submissions, with native provider allowance zero. Failed
pending-record writes preserve the exact draft and send zero messages. Restored
storage allows one original submission whose acknowledgement is deliberately
lost; unreadable pending storage across reload blocks another send. Restoring
reads and checking the saved result recovers that same request ID and preserves
the newer unsent draft, with the submission count still one. A separately explicit
second message retains the existing pending/failure presentation checks. This is
client recovery against controlled turn records, not live inference or new proof
of native turn persistence. The inspected image shows the warning and retained
newer draft over a rendered world. Check saved result is partly below the captured
message region; the later actual click succeeds, so this image alone does not
qualify every initial reading position.

The denied-container case uses one real local account and a stationary woven bag
containing a stone. It establishes initial contents access, then withdraws that
access through the existing native access owner as fixture intervention. The
authenticated exact-bag inventory read returns HTTP 400 without items; the
selected bag stays retained, with zero private item rows and no old detail popup.
The single original `.ol-inventory-workspace` capture succeeds in **6,213 ms**
under its unchanged **10,000 ms** allowance, with default animation. The inspected
image shows Container, Search Container, the readable unavailable reason, Refresh
and Close container; the player's separate belongings remain visible. Custody is
unchanged and every owned resource closes successfully. This closes the missing
external-container image, reusing the earlier two-account conservation/receipt
evidence; it does not qualify an administrative permission-editing interface or
prove that JavaScript consumed a formerly permitted late response.

Local failed attempts remain distinct: output 01 stops at initial graphics
readiness, output 02 uses prepared fibers that current authored rules refuse
inside a bag, and output 03 stops before dispatching an ordinary In view click.
The Linux fixture uses a permitted stone. Its passing capture does not diagnose
the older capture-stability failure or demonstrate a performance repair.

[Artifact 11948295150](https://github.com/Macrofold/OpenLegend/actions/runs/38680389344/artifacts/11948295150)
retains the reports, traces and two inspected images (28,848,374 bytes). The denied
image SHA-256 is
`88d4204b771245c8cc4392d5238dd890cb91b8b427fb04e84960974a3cf31839`.
Additional and cumulative task provider/Jev cost: **$0**.

## Selected continuation at 7da4449fb

The [second finite run](https://github.com/Macrofold/OpenLegend/actions/runs/38682587472/job/116250230154)
at `7da4449fb7d6647d3d83b05354e14756ab881285` is **failed**. Its ordinary
required checks are independently green: [PR Code](https://github.com/Macrofold/OpenLegend/actions/runs/38682591099/job/116250241265)
and push Code pass 392 tests in 43 files and the static/build gates;
[Spatial/interface](https://github.com/Macrofold/OpenLegend/actions/runs/38682591101/job/116250241469)
passes 28 selected native tests and all seven browser journeys. Time takes
55.2 seconds under the unchanged sixty-second total. This is another bounded
pass, not a performance improvement or explanation of earlier failures.

The finite connected-screen batch reports **two passes and five failures**:

| Selected case                       | Observed result and limit                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Original action recovery            | Pass, 38.4 s. Failed retention sends nothing; lost native acknowledgement, edited draft, ended work and reload preserve the original. Failed local cleanup keeps the guard; restored cleanup reads that same outcome with no new submission/effect.                                                                                                                                                                                                                |
| Checkpoint creation recovery        | Pass, 32.4 s. Failed retention captures nothing; the one actual checkpoint survives acknowledgement loss and reload. Result inspection preserves the catalogue without another capture.                                                                                                                                                                                                                                                                            |
| Combined action and checkpoint load | Fails at post-logout Sign in while the actual document reload is unfinished. Before that, the real load changes timeline once, old action/draft disappear after controlled delivery of its fetched native receipt, the original load result resolves under current save authority, and the exact protection checkpoint/catalogue/world remain unchanged. Native logout returns 200 and the next state read returns 401. Fresh-session assertions were not reached. |
| Creation with failed local markers  | Fails at the same unfinished logout navigation. Before that, one real Woven bag creation and its identical retry retain one output/receipt, unavailable local markers/read/cleanup preserve the exact session request, and native logout succeeds. The fresh-session observations were not reached. One pre-retry image was captured.                                                                                                                              |
| Retained Journal place              | Real Inspect, section and Hide/reopen retention, and camera-only Focus pass. The first narrow measurement occurs about 105 ms after resize while the HUD still reports its desktop layout: right edge 596 versus permitted 391. No narrow image, short keyboard, obsolete inspection or explicit Move observation follows.                                                                                                                                         |
| Reciprocal barter                   | Mara's real knife gift and Counteroffer preparation occur without a browser command. Prepared fibers are outside the person detail's first six offered carried lots, so selecting that absent option reaches sixty seconds. Later shared-draft, quantity/revision, disconnection/refusal and reply observations were not reached.                                                                                                                                  |
| Companion invitation                | Description search, exact destination/purpose and work-choice preparation occur without a browser command. The fixture focuses Send while it is disabled and does not refocus after the genuine preview enables it; the five-second focus assertion fails. Sending, withdrawal/recovery and incoming choices were not reached.                                                                                                                                     |

The completed-task observation **passes in 76,641 ms**, within its original
120-second work / 150-second hard limits. One real Start spends one branch and
ends at sixty native seconds; Hide/reopen, reading, deliberate preparation and
time 61 cause no restart or extra debit. Six captures cover short native wording
and explicitly supplied long display prose at 1440×960, 390×844 and 390×420. All
six pixels were inspected. The short desktop card is 337 pixels high with 16
pixels below its content. The narrow reading fits; short captures show the final
button reading position after scrolling through earlier text. The long desktop
and short images also expose a partly clipped lower focus outline, which requires
review before claiming fully unobscured keyboard focus. Black world backgrounds
in the 390×844 frames qualify no graphics-readiness or performance guarantee.
The report's copied `runtimeSource` field still names `a367c4d1b`; its actual
checkout and per-owner hashes identify this run, including Current task SHA-256
`6938d36c405fa393c8275e6bfb170e40b3f09a2b8322e6c83c315a4e3585cecf`.

The alternate-world observation fails after thirteen seconds, before any task
command or image. Its real inventory has 24 carried lots, including authored
shelter items with no icon. The native optional-icon projection and existing
visible letter-symbol fallback agree; the probe's requirement that every item
have an icon is false. Later recharge/recovery/reopening observations did not run.

The prepared corrections retain all original assertion/test/capture bounds:
await actual logout DOMContentLoaded before the five-second Sign in assertion;
await the Journal's actual narrow layout before measuring; select/read the exact
fiber through Inventory; wait for Send to be enabled before focusing; and verify
each alternate item against its actual optional icon or visible initial. No
production authentication, item rule, renderer or deadline change follows from
these fixture failures. Rerun only the affected cases and the new browser-zoom
sample; reuse the two passing recovery cases and valid earlier native evidence.

[Artifact 11949605158](https://github.com/Macrofold/OpenLegend/actions/runs/38682587472/artifacts/11949605158)
contains 120,919,664 bytes of original traces, reports and captures. Owned cleanup
passes for the completed-task run and the failed alternate stage. Additional
provider/Jev cost is **$0**; cumulative task provider/Jev cost is **$0**.

## Selected continuation at 72214abab

The [third finite run](https://github.com/Macrofold/OpenLegend/actions/runs/38684091407/job/116254879881)
at `72214ababce1d29471644ea55e1518229b0e9ea5` is **failed**. It reuses the two
unchanged passing recovery cases above. Of its six selected connected cases,
**three pass and three fail** under their unchanged sixty-second totals:

| Selected case                       | Actual result and remaining limit                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creation with failed local markers  | Pass, 52.7 s. One real Woven bag creation and its identical native retry retain one output; failed marker writes, reads and cleanup preserve the original session request. Logout and a fresh session clear the old private request. The inspected image shows the exact original creation, unavailable-read warning and deliberate Retry original creation control.                                                                              |
| Retained Journal place              | Pass, 29.4 s. The actual observation survives section changes, Hide/reopen and narrow/short adaptation. Focus leaves the character still; keyboard Move submits one exact current remembered-place command. A held native inspection is superseded by an empty search; Chromium cancels its delivery and old detail remains absent. This qualifies cancellation, not JavaScript consuming obsolete response data or a new HTTP privacy-race test. |
| Combined action and checkpoint load | Pass, 52.7 s. One action submission/read, one checkpoint creation and one load preserve the exact load result and protection checkpoint. The old action/draft clear after the timeline changes, failed cleanup retains the load guard, and a fresh session clears private recovery. The inspected image shows the restored paused world; the command and recovery assertions supply the invisible request evidence.                               |
| Reciprocal barter                   | Fails at 28.2 s because the fixture expects zero browser commands after deliberately inspecting an Inventory item. The recorded command is that exact `inspect-inventory`, with no exchange effect. Shared fiber identity and quantity survive the entry switch; later native revision/refusal/settlement checks are not reached.                                                                                                                 |
| Companion invitation                | Fails at 35.1 s after one actual invitation is recorded. The fixture expects a disabled Send button although the interface has replaced preparation with the sent invitation. Withdrawal, recovery and incoming decisions are not reached.                                                                                                                                                                                                        |
| Native browser zoom                 | Fails at 1.9 s before entering the application: the probe starts tracing when Playwright already owns an active trace. No zoom or enlarged-layout result is established.                                                                                                                                                                                                                                                                          |

The two Journal images were inspected. The narrow image retains the exact place
and reading text, but Move lies partly below that initial reading edge and the
hearing notice crosses its bottom. The short image shows keyboard-focused Move
fully inside the panel. These pixels do not establish fully unobscured focus in
every narrow reading position; the separate enlarged-browser observation retains
its whole-control/focus-outline checks.

The completed-task observation **passes in 69,424 ms** within its unchanged
120-second work / 150-second hard limits. Its stronger check requires the entire
button and its computed focus outline inside the actual scroll clip after ordinary
Task-to-Tab navigation. All **six new images were inspected**: short native wording
and supplied long display wording at 1440×960, 390×844 and 390×420. The formerly
clipped lower outline is now visible, with four pixels inside the long desktop and
short reading edge. The short desktop card retains its 337-pixel height and
16-pixel content padding; long content scrolls without an empty fixed-height task
area. One Start uses one branch and completes at native time 60; reading,
Hide/reopen, deliberate preparation and time 61 add no work or debit. The long
wording remains an explicit presentation fixture. Black backgrounds in the tall
narrow images do not qualify graphics startup. Recorded cleanup closes every
owned resource and drops the disposable databases. This closes the specific
completed-task presentation requirement, without expanding native lifecycle or
human-input claims.

The alternate-world observation fails at 32 seconds on its second attempt to open
the exact recharge source. One real Start and its native receipt have succeeded;
the retained In view detail correctly hides the source list, which the helper
incorrectly searches without first using Back. Inventory membership and each
item's authored optional icon or visible letter fallback pass. Its Inventory image
is retained; later after-work recovery and reopen checks remain unexecuted.

Ordinary [PR Code](https://github.com/Macrofold/OpenLegend/actions/runs/38684096852)
and push Code pass. [Spatial/interface](https://github.com/Macrofold/OpenLegend/actions/runs/38684096801)
is **failed**: 28 native checks, the spatial browser case and five ordinary UI
cases pass, while the God editor remains wider than its 390-pixel viewport during
the original five-second fit check. Time passes in **50.5 seconds** under its
unchanged sixty-second total. The editor failure is under investigation; the
previous green run does not waive this current gate.

[Artifact 11948884590](https://github.com/Macrofold/OpenLegend/actions/runs/38684091407/artifacts/11948884590)
retains 67,013,627 bytes of reports, traces and captures. Current task and its CSS
match the report's exact source hashes. Reuse the three newly passing connected
cases and completed-task result; rerun only the corrected barter, invitation,
zoom and alternate cases unless a relevant behavior owner changes. No production
authentication, simulation or deadline change follows from these fixture failures.
Additional and cumulative task provider/Jev cost: **$0**.

## Selected continuation at d23efc05c

The [fourth finite run](https://github.com/Macrofold/OpenLegend/actions/runs/38685376344/job/116258895210)
at `d23efc05c70fdac6495cafff3887bb3f4250d09a` is **failed**. All three selected
connected cases fail, after progressing beyond their previous fixture errors:

- Barter reaches 45.3 seconds. The exact two Inventory inspections, retained
  three-unit draft, native smaller maximum and reviewed counteroffer run; Review
  changed terms remains disabled after the disconnection/re-entry sequence. Its
  actual connection/authority state still needs diagnosis before correction.
- Invitation reaches 48.3 seconds. One real invitation, lost acknowledgement,
  enabled exact Withdraw, retained original request, blocked new Send, original
  result read and later deliberate preparation run. Send is enabled, but the
  fixture expects the purpose textbox where no textbox is currently rendered.
  Incoming accept/decline/Leave observations are not reached.
- Browser zoom reaches 51.2 seconds. Native X11 keys double Chromium's pixel ratio
  from one to two at an unchanged 1440×960 outer window, halving the inner width
  from 1440 to 720 CSS pixels. Resizing only that owned window to 640 physical
  pixels supplies a measured 320-CSS-pixel width while keeping real 200% zoom,
  application scale one and visual viewport scale one. The exact place survives
  Hide/reopen; full focused controls and outlines fit, no visible tooltip overlaps
  them, document width stays 320, and the character/world and command count remain
  unchanged. The final POST allowlist then incorrectly rejects the legitimate initial
  control-acquisition request and the promises read. Acquiring control is a real
  entry effect, not a read-only endpoint; it must be accounted for separately
  from later viewing. Its later usage assertion is not reached; command/provider
  request observations remain empty.

All three zoom images were inspected. The baseline is a correct 1440×873 content
capture. The enlarged images are only 720×436 and 320×436 **physical** pixels and
show the enlarged top-left portion, omitting the controls whose geometry passed.
They do not establish readable full enlarged-browser pixels. Correct actual
browser-content capture without changing zoom, viewport geometry or the original
ten-second capture allowance; this is a capture limitation, not evidence that the
application itself clips those controls.

The alternate-world run reaches its real clockwork task, four native commands and
same-database reopening before failing at about seventy seconds with an already
closed page/context. Its recovery assertions establish that the earlier recharge
has ended, unreadable browser storage blocks new work, a failed matching clear
continues blocking it, reading the exact original Stop causes no command replay,
and restored cleanup permits a deliberate later Start. The saved world reopens
with exact contents/meters and all four original receipts resolved. Later
changed-login checks and the touch-world stage are unexecuted; the overall run
remains failed. Both recorded native shutdowns save cleanly. Diagnose the closed
page before attributing it to application behavior or weakening any deadline.

The three alternate images were inspected. Inventory uses the actual optional
icons or visible initials; current work shows Charge, finite supply and Stop all
work without human Food/Energy defaults. The retained cancelled result shows the
exact original Stop, known-result/failed-cleanup warning and Check request result.
The invitation's narrow preparation/pending images were also inspected: work
choices and deliberate Send are readable, followed by exact companion/destination,
full stated purpose and focused Withdraw. The barter capture shows its retained
Inventory entry at a scrolled reading position; complete two-sided terms are not
visible in that frame and later reply captures remain pending.

[Artifact 11950445239](https://github.com/Macrofold/OpenLegend/actions/runs/38685376344/artifacts/11950445239)
retains 71,378,848 bytes of original reports, traces and captures. Reuse the
completed-task, creation, Journal and original action/checkpoint passes above;
only the still-incomplete cases and newly identified private-ownership/editor
checks need execution. Additional and cumulative task provider/Jev cost: **$0**.

## Remaining whole-feature qualification

The October 15 source review also found a Current task recovery defect: failed
session-storage reads appeared to mean no original request, and failed cleanup
released a confirmed request. The task now distinguishes unreadable storage,
verifies exact retention before dispatch and keeps the original guard through
failed cleanup. TypeScript, production build and changed-file formatting pass.
The d23efc05c native clockwork observation now exercises that guarantee after the
earlier work has ended, including unreadable storage, failed matching cleanup,
read-only original-result recovery and a deliberate later Start. Its later page
reuse failure leaves changed-login and touch-world continuation incomplete.

The original action and checkpoint reload-recovery implementation is no longer missing: the three specific interrupted-request journeys above pass. This does not close every compound UIUX12/UIUX14 requirement. Wider storage/identity/revocation combinations, complete native barter/outing continuation and the alternate-world interface qualification retain their earlier explicit tracking and evidence limits. Completed-task rendered-result review now passes at the exact source above.

Real operating-system input-method behavior, physical assistive devices and uncoached-player observation have not been performed here. Scripted keyboard tests and automated Chromium interaction cannot substitute for that evidence. The twelve-image inspection resolves the earlier pixel-inspection blocker for that historical subset only. Current Code is green, but the latest Spatial/interface gate fails its God editor fit case. Earlier green results do not establish current merge readiness, entire-feature completion or the remaining specific interface and human observations. The unrelated hunting repair remains excluded at Mike's direction rather than being restarted under UI acceptance.
