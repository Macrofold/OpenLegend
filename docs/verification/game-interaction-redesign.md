# Inventory, task and conversation redesign verification

**October 4, 2026 — runtime changes and focused UI checks are recorded; integrated gameplay acceptance remains open.** This report records actual checks for [UIUX08–UIUX11](../maintainers/ui-ux.md#uiux08). The [feature specification](../projects/game-interaction-redesign-feature-spec.md#end-to-end-acceptance-journeys) owns J01–J16 and the [technical design](../projects/game-interaction-redesign-tech-design.md) owns the implementation plan. Component checks, native examples and the existing spatial browser gate do not collectively establish the complete camp session or an uncoached usability study.

The separate [game atlas](../ui-ux/games/README.md) and [screenshot ledger](../ui-ux/screenshots/gallery.md) retain the completed research: 71 digital game screenshots across 12 games, one separately excluded photo and four original design proposals. Those references are design evidence, not tests of this implementation.

## Revisions and environment

| Evidence                                            | Revision or environment                                                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Original source audit and implementation base       | b50ec6ce75f260d68c18ec99d767982c65b0fccb                                                                              |
| Research and approved implementation starting point | e0bba60a36ab4a19905ed04a8d71ae77ed81e5cb                                                                              |
| Initial runtime and review-fix checkpoints          | f3157d1 through 8aeffc6 on docs/game-ui-research-redesign                                                             |
| Integrated upstream                                 | c4e18d91848b5b6d367dda1d7214a9f8222cf070, preserved through history-preserving merges; main was not modified          |
| Final reviewed UI correction                        | f39cec41d84a9192417b0bf2b306c642e9c3e084; paired endpoint context, retained selection/amount and compact task editors |
| Final runtime CI                                    | f39cec41d84a9192417b0bf2b306c642e9c3e084; actual PR merge checkout 943b92b4d3cdfa7d97b9f81d742d17ef571288f8           |
| Earlier successful existing spatial CI head         | 81f1227c1c622c7ffcbe74e2c3f85fd764ef8b83; actual PR merge checkout 5a8f515ed255c8be94672978c271f82110a05b46           |
| Local tools                                         | Node 24.19.0; repository-pinned pnpm 10.33.0, TypeScript and Prettier; frozen lockfile installation                   |
| Local component browser                             | Chromium 153.0.8010.0 with software WebGL; this is not the pinned CI browser or physical-device evidence              |
| Existing CI                                         | Node 22, disposable pgvector/PostgreSQL 16 service, Playwright's Chromium 145.0.7632.6                                |
| Provider work                                       | None. Native checks use AI_BUDGET_USD=0. Additional Jev cost and cumulative task Jev cost are $0.                     |

All browser screenshots, traces, generated logs and temporary scenario code remain outside the repository. No automated test or workflow was added for this task. The authored research screenshots are separate requested deliverables.

## Static checks and existing CI

The complete local TypeScript check passed after the native/client changes, exact pending-command ownership fixes, both upstream integrations, auxiliary inventory paging correction and final inventory/task layout corrections. Changed-file formatting passes used the repository's pinned Prettier and explicit configuration. These results do not establish runtime behavior.

The [final-runtime spatial workflow for f39cec4](https://github.com/Macrofold/OpenLegend/actions/runs/37172232264/job/111347371478) passed the real production build and all 23 tests in the four existing spatial/native files. Its browser run failed the initial five-second Time settings enabled assertion before executing the gameplay journey. This is a failed browser gate on the final runtime revision; it cannot be reported as a current spatial-browser pass.

The final trace's later snapshot, 1.24 seconds after that assertion failed, contained an enabled Time settings button, a ready canvas and no entry screen. Embodiment activation returned active, and subsequent state granted control without changing the private draft owner or timeline. No page or console errors were recorded. This is evidence of delayed readiness in the recorded run, not a proven cause or a passing deadline. No existing exact-c4e18 spatial run was available to establish target-main timing. The earlier passing run below remains separate evidence.

The earlier [successful spatial workflow for 81f1227](https://github.com/Macrofold/OpenLegend/actions/runs/37170909291/job/111343501165) passed:

- The production build, including the real mercenary model.
- All 23 tests in the four existing spatial, domain spatial-world, client camera and server spatial-HTTP files.
- The existing full spatial browser journey: game entry and scene readiness, elevated-surface picking and native movement, camera/floor controls, drag isolation and reload. Its assertions found no collected page errors or paid chat/invention requests. The two scene screenshots were visually inspected.

That earlier workflow does not exercise the redesigned chest, amount, offer, task and conversation sequence. Its success supplies real PostgreSQL/HTTP, production-build and scene-input evidence only for its actual workload and revision. The final inventory/task layout changes do not turn it into an f39cec4 browser pass.

The [required code workflow at final runtime f39cec4](https://github.com/Macrofold/OpenLegend/actions/runs/37172232266/job/111347371327) passed guidance and generated-configuration checks, then failed formatting in 65 files. The [exact target main run at c4e18](https://github.com/Macrofold/OpenLegend/actions/runs/37169958792/job/111340701951) failed the identical paths: the action-capabilities document and 64 repertoire documents. These files are unchanged upstream content in this branch; the [earlier 81f1227 code run](https://github.com/Macrofold/OpenLegend/actions/runs/37170909361/job/111343501641) had the same failure. The required workflow did not reach its typecheck, full suite or build; its failure remains a merge gate. The separate successful spatial build does not make the required workflow green.

### Earlier failures retained as evidence

The [e855963 spatial run](https://github.com/Macrofold/OpenLegend/actions/runs/37170751553/job/111343045109) passed its build and 23 native checks but timed out waiting for Time settings during entry. Its trace contained that enabled control and a ready canvas about half a second after the five-second assertion expired. Draft ownership and timeline stayed unchanged during control acquisition, so the changed private-owner remount condition was false for those recorded responses. The later 81f1227 run passed with unchanged entry code; only inventory details and offer paging changed between the two heads. This supports a transient entry-timing interpretation, not a separate timing qualification or a reproduced exact-main spatial baseline.

Before upstream integration, the [57d02b1 code run](https://github.com/Macrofold/OpenLegend/actions/runs/37169305029/job/111338810074) passed formatting/typechecking and reported 329 passing tests plus eight failures. The [b50ec6c base run](https://github.com/Macrofold/OpenLegend/actions/runs/37162366566/job/111318261011) reported 328 passing tests and the same eight failures: seven cognition-heading expectations and the stone-in-shaft refusal-message expectation. Native comparison also reproduced the same stone refusal on the original source. These are historical baseline failures; the current full suite was not reached after the newer upstream formatting failures. Neither history is a claim that all current tests pass.

## Focused native and existing checks

Selected existing checks passed for draft persistence/API cleanup, action-browser behavior, design-system views, native material spending and cancellation, spatial privacy/geometry and duplicate command immutability. The API file occurred in two selected groups and is not counted twice as independent coverage. A native sling, hunt, harvest, cook and eat example also passed; this verifies existing downstream mechanics, not the new full UI journey.

Small native scenarios exercised concrete new risks through the domain owner:

| Risk                       | Observed result and boundary                                                                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Movement identity and Stop | Admission returned the actual action identity. A stale expected-action cancellation did not stop replacement work; the exact current action could be stopped.                                                                                                                               |
| Stack identity             | A move that merged into another lot returned the surviving destination identity. An exact request replay left the world unchanged; a changed body or competing move could not duplicate the lot.                                                                                            |
| Recovery ownership         | Connection/control changes retained the recovery owner. Account, session/grant revision, actor, world, timeline or audience changes invalidated it. The execution fingerprint remained stricter. This field-level scenario does not qualify durable HTTP recovery after a database restart. |
| Opened-object movement     | Root placement revision changed with position/support changes and stayed stable for an identical pose; root identity prevents a different custody root with the same number from appearing unchanged.                                                                                       |
| Chosen activity bounds     | Exact permitted target and role metadata bound through the native owner. Budget/reserve/deadline/access refusals, actual one-unit spending and retained reserve, deadline completion and the authored 16-attempt bound were exercised.                                                      |

The native command and receipt owners remain the single mutation path. Creator operations retain a null gameplay-recovery fingerprint; the new read-only gameplay receipt route cannot recover or execute those creator operations. Upstream family authoring uses that existing reviewed-operation owner and was checked during integration.

## Actual component interaction and visual checks

These scenarios loaded the production React components, shared controls and API helpers in an actual browser. The stated fixture scope is essential: controlled HTTP-shaped responses or a native-domain-backed fixture do not provide live session authority, durable database commits, real SSE delivery or autonomous character behavior.

### Opening an object

The production opening hook and status component passed controlled scenarios before integration: read-only Open; deliberate keyboard-confirmed approach to the native-returned stance; wait for the exact admitted movement to finish and then re-read access; refuse a wrong endpoint; refuse replacement work; refuse changed root identity/placement; refuse changed geometry; prefer newer stream-shaped information over an older state response; retain cancellation sent before movement acknowledgement; and recover only the original request fields without issuing another move. No console errors were collected.

The out-of-reach status was visually inspected. This fixture used HTTP/command responses and stream-shaped inputs under local control, not the real native server, database, renderer or live SSE stream.

### Conversation and item mention

The pre-integration Composer check passed explicit person choice without automatic selection, item-to-person binding, recipient/mode draft separation, same-person Talk returning from Invent with focus, exact visible item-name prefix, edit-then-undo while a send was pending, late completion from another recipient, refusal retention, hide/reopen reading position, removable item mention, the combined 1,000-character guard, owner/timeline cleanup and cleanup when optional local storage is denied. Three controlled speech responses were used. Desktop and narrow screenshots were visually inspected.

After integration, a focused check used two controlled responses to exercise the changed tab-control assumption. A same-owner control transfer retained the exact unsent draft and reloaded history using the new access scope; completion from the former access scope was refused. Loss of control hid and disabled the draft, and explicit Resume restored it. A different account/world/character cleared the old draft, and a different save timeline cleared it again. Late completion from the former owner could not restore or erase the new context. No page errors were collected; the resumed view was visually inspected. The earlier assumption that every control-generation change clears private drafts is superseded by this upstream behavior and check.

A ResizeObserver warning occurred during the earlier resize scenario in the existing auto-growing textarea; no uncaught page error was observed. Neither run qualifies OS-level IME, assistive technology, native NPC reply quality or real hearing/range behavior.

### Chosen tasks and Crafting

The initial task/Crafting fixture used production React plus actual native role binding, execution and projection. Authority, the database and receipt lookup were controlled fixtures. It exercised contextual keyboard entry with a fixed target, no family/attempt-count input, retained blank and excessive values, exact budget/reserve/absolute deadline arguments, read-only preview, explicit replacement and Stop, and lost-response remount/recovery without a duplicate native effect. Crafting used output-first search, visible unavailable recipes, retained selection across filtering and the exact synthetic craft intent. Desktop and 390-pixel screenshots were visually inspected; the narrow case had no horizontal overflow.

That first visual pass exposed a real design defect: every care-task parameter remained visible at once, leaving the primary action below the normal panel height. The final correction replaces that view with a compact summary and one deliberately opened supply, amount or stopping-time editor. Current work keeps status, spending, stopping and Stop near the top; the primary Start/replacement row stays reachable while the task body scrolls. The earlier all-fields screenshots are historical evidence of the defect.

The corrected view passed a focused browser scenario inside the actual shared Panel, 504 pixels wide at its normal dock position in a 1280×900 viewport. No inputs appeared in the default view. Opening one editor closed the other; a blank amount survived switching away and back. Native budget 1, reserve 1 and checked deadline 600 were retained exactly. Editing and prerequisite checks performed no mutation; Start performed one native mutation. Start fit inside the visible idle panel. For current work, Stop and Prepare replacement were reachable near the top, and Replace current work and start was fully inside the visible body (button y=717–755; body y=325–791). In an explicitly opened stopping picker, Escape closed only the picker; a second Escape closed the editor and restored its trigger. The final default, ready and current-work screenshots were visually inspected.

A separate focused receipt scenario held request A, remounted the component, activated recovery twice synchronously, recovered A, held request B, then completed late A. There was one receipt read and exactly two native mutations. B's stored identity and pending guard survived A's late completion until B's own result arrived. The final layout correction changed presentation and action placement, not that completion owner. These native-domain-backed fixtures do not qualify HTTP authorization or durable PostgreSQL recovery.

### Paired inventory

The representative browser scenario used production Inventory, native inventory projections, command binding and domain transitions with an in-memory transport adapter. It passed read-only opening, exact three-unit transfer, movement back with the native merge-survivor identity, nested bags, keyboard inspection, comparison/equipment, pointer drag, separate offers with native decline, retained/stale amount handling, child Escape, pending-result remount/recovery and external-root movement invalidation. Review corrected main and auxiliary cursor ownership, popup dismissal erasing an amount, and the workspace lifetime. A same-private-owner control change retained the four-unit draft while refreshing full-scope reads; a different private-owner namespace cleared selection and amount.

The final targeted pass used the actual shared Panel and HUD dock styles. The expanded desktop workspace measured 792 pixels. Filtering out the selected item showed a generic page-absence status without stale item facts or actions; clearing the search and reselecting restored the four-unit draft. A filtered page did not imply that the object was destroyed. After expanding equipment comparison, Shift+Tab reached Close and scrolled it into view; Enter closed only the item popup.

At 390 and 320 pixels, both endpoint identities stayed readable in the sticky context row while scrolling to the external collection, without horizontal page overflow. A named out-of-reach status appeared above inventory, with no stale external contents. All seven final desktop/narrow, comparison, filtered-selection and opening-status screenshots were visually inspected. A Vite-reported ResizeObserver-loop warning recurred during a popup/page transition; the browser recorded no page errors or console errors and all checked interactions completed.

These checks establish the recorded component/native-domain interactions and final layout correction. They do not establish authenticated HTTP, PostgreSQL receipt persistence, real PlayCanvas object picking, assistive-device behavior or complete J01/J03–J09/J14/J15 gameplay acceptance.

## Review corrections and limits

Affected-diff review traced the new public storage hint and access read through native authority, exact action identity, guarded cancellation, receipt persistence and private projections. It also reviewed client focus/input ownership, scoped paging, amount drafts, task replacement and recipient/mention handling. The two upstream integrations preserved tab-control, observer-aware names, save recovery, family editing and shared picker behavior; they introduced no compatibility reader or alternate mutation owner.

Concrete corrections included fencing late completion to its own command; omitting display labels from strict receipt requests; requiring the distinct native recovery scope; refusing mutation when the original request cannot be retained in session storage; keeping the original world-root identity/placement/geometry; rechecking access after exact movement completion; resetting continuation when source/read context changes; preserving blank amount text and endpoints through hidden/stale views; and preventing the first drag Escape from also closing the parent panel. These are reviewed fixes, not a claim of exhaustive adversarial testing.

Local native-server qualification is blocked by the available execution environment: the maintained PostgreSQL binary refuses initialization as root, and a permitted unprivileged process identity is unavailable. No database guard was bypassed, no alternative storage backend was introduced and no existing save was reset. Existing CI supplies a disposable PostgreSQL service for its authored spatial checks, but cannot be credited with unrun redesign scenarios. The large model asset was initially unavailable through the source-file connector; CI built the exact asset successfully, and a matching copy was later recovered into scratch from its trace. No replacement model was authored.

Only the bundled base world is currently installed by the world constructor. Its trusted activity registrations are fixed; there is no already-supported alternate-world activity fixture or parameterized registration path for the requested portability example. Different seeds or differently named fire instances would not establish a different world's semantics. A narrower native check removed the optional camp host from the existing trusted pin subset: no activity descriptors or contextual entries were returned, and fire-watch binding returned unsupported-activity. This demonstrates capability absence within the existing world, not alternate-world portability. No new world mechanism was invented solely to mark that criterion passed.

The remaining acceptance work stays in [UIUX08–UIUX11](../maintainers/ui-ux.md#uiux08), with PW04/PW06 and the existing native owners retained: the complete real-client/native-server chest-to-camp sequence; two-client shared-content and receipt/restart failures; full recipient consent/expiry/access behavior; the different-world demonstration; and uncoached observation plus native IME/assistive-device and broader input/layout coverage. The final inventory and compact-task component checks are recorded above; their success does not close these gameplay gates. The project remains In progress.
