# Inventory, task and conversation redesign verification

**October 4, 2026 — implementation in progress; integrated gameplay acceptance remains open.** This report records actual checks for [UIUX08–UIUX11](../maintainers/ui-ux.md#uiux08). The [feature specification](../projects/game-interaction-redesign-feature-spec.md#end-to-end-acceptance-journeys) owns J01–J16 and the [technical design](../projects/game-interaction-redesign-tech-design.md) owns the implementation plan. Component checks, native examples and the existing spatial browser gate do not collectively establish the complete camp session or an uncoached usability study.

The separate [game atlas](../ui-ux/games/README.md) and [screenshot ledger](../ui-ux/screenshots/gallery.md) retain the completed research: 71 digital game screenshots across 12 games, one separately excluded photo and four original design proposals. Those references are design evidence, not tests of this implementation.

## Revisions and environment

| Evidence                                            | Revision or environment                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Original source audit and implementation base       | b50ec6ce75f260d68c18ec99d767982c65b0fccb                                                                     |
| Research and approved implementation starting point | e0bba60a36ab4a19905ed04a8d71ae77ed81e5cb                                                                     |
| Initial runtime and review-fix checkpoints          | f3157d1 through 8aeffc6 on docs/game-ui-research-redesign                                                    |
| Integrated upstream                                 | c4e18d91848b5b6d367dda1d7214a9f8222cf070, preserved through history-preserving merges; main was not modified |
| Successful existing spatial CI head                 | 81f1227c1c622c7ffcbe74e2c3f85fd764ef8b83; actual PR merge checkout 5a8f515ed255c8be94672978c271f82110a05b46  |
| Local tools                                         | Node 24.19.0; repository-pinned pnpm 10.33.0, TypeScript and Prettier; frozen lockfile installation          |
| Local component browser                             | Chromium 153.0.8010.0 with software WebGL; this is not the pinned CI browser or physical-device evidence     |
| Existing CI                                         | Node 22, disposable pgvector/PostgreSQL 16 service, Playwright's Chromium 145.0.7632.6                       |
| Provider work                                       | None. Native checks use AI_BUDGET_USD=0. Additional Jev cost and cumulative task Jev cost are $0.            |

All browser screenshots, traces, generated logs and temporary scenario code remain outside the repository. No automated test or workflow was added for this task. The authored research screenshots are separate requested deliverables.

## Static checks and existing CI

The complete local TypeScript check passed after the native/client changes, exact pending-command ownership fixes, both upstream integrations and the auxiliary inventory paging correction. Changed-file formatting passes used the repository's pinned Prettier and explicit configuration. These results do not establish runtime behavior.

The [successful spatial workflow for 81f1227](https://github.com/Macrofold/OpenLegend/actions/runs/37170909291/job/111343501165) passed:

- The production build, including the real mercenary model.
- All 23 tests in the four existing spatial, domain spatial-world, client camera and server spatial-HTTP files.
- The existing full spatial browser journey: game entry and scene readiness, elevated-surface picking and native movement, camera/floor controls, drag isolation and reload. Its assertions found no collected page errors or paid chat/invention requests. The two scene screenshots were visually inspected.

That workflow does not exercise the redesigned chest, amount, offer, task and conversation sequence. Its success supplies real PostgreSQL/HTTP, production-build and scene-input evidence only for its actual workload.

The [required code workflow at the same head](https://github.com/Macrofold/OpenLegend/actions/runs/37170909361/job/111343501641) passed guidance and generated-configuration checks, then failed formatting in 65 files. The [exact target main run at c4e18](https://github.com/Macrofold/OpenLegend/actions/runs/37169958792/job/111340701951) failed the identical paths: the action-capabilities document and 64 repertoire documents. These files are unchanged upstream content in this branch. The required workflow did not reach its typecheck, full suite or build; its failure remains a merge gate. The separate successful spatial build does not make the required workflow green.

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

The production opening hook and status component passed nine controlled scenarios before integration: read-only Open; deliberate keyboard-confirmed approach to the native-returned stance; wait for the exact admitted movement to finish and then re-read access; refuse a wrong endpoint; refuse replacement work; refuse changed root identity/placement; refuse changed geometry; prefer newer stream-shaped information over an older state response; retain cancellation sent before movement acknowledgement; and recover only the original request fields without issuing another move. The endpoint/root/geometry cases are grouped within the recorded nine scenario results. No console errors were collected.

The out-of-reach status was visually inspected. This fixture used HTTP/command responses and stream-shaped inputs under local control, not the real native server, database, renderer or live SSE stream.

### Conversation and item mention

The pre-integration Composer check passed explicit person choice without automatic selection, item-to-person binding, recipient/mode draft separation, same-person Talk returning from Invent with focus, exact visible item-name prefix, edit-then-undo while a send was pending, late completion from another recipient, refusal retention, hide/reopen reading position, removable item mention, the combined 1,000-character guard, owner/timeline cleanup and cleanup when optional local storage is denied. Three controlled speech responses were used. Desktop and narrow screenshots were visually inspected.

After integration, a focused check used two controlled responses to exercise the changed tab-control assumption. A same-owner control transfer retained the exact unsent draft and reloaded history using the new access scope; completion from the former access scope was refused. Loss of control hid and disabled the draft, and explicit Resume restored it. A different account/world/character cleared the old draft, and a different save timeline cleared it again. Late completion from the former owner could not restore or erase the new context. No page errors were collected; the resumed view was visually inspected. The earlier assumption that every control-generation change clears private drafts is superseded by this upstream behavior and check.

A ResizeObserver warning occurred during the earlier resize scenario in the existing auto-growing textarea; no uncaught page error was observed. Neither run qualifies OS-level IME, assistive technology, native NPC reply quality or real hearing/range behavior.

### Chosen tasks and Crafting

The initial task/Crafting fixture used production React plus actual native role binding, execution and projection. Authority, the database and receipt lookup were controlled fixtures. It exercised contextual keyboard entry with a fixed target, no family/attempt-count input, retained blank and excessive values, exact budget/reserve/absolute deadline arguments, read-only preview, explicit replacement and Stop, and lost-response remount/recovery without a duplicate native effect. Crafting used output-first search, visible unavailable recipes, retained selection across filtering and the exact synthetic craft intent. Desktop and 390-pixel screenshots were visually inspected; the narrow case had no horizontal overflow.

That first visual pass also exposed a real design defect: every care-task parameter remained visible at once, leaving the primary action below the normal panel height. The default view is being corrected to a compact summary with one deliberately opened supply, amount or stopping-time editor. The earlier screenshots are historical and do not qualify the corrected layout. The later focused check of nested-picker Escape and exact late-request ownership passed before this visual correction; final layout/interaction evidence must be recorded after the correction.

### Paired inventory

The two collection readers, amount drafts, direct gestures and receipt handling are implemented. Review corrected main and auxiliary cursor ownership, world-root invalidation, unknown-result persistence, exact pending-command completion ownership, Escape during drag, and status/pane layout. The actual native-domain-backed inventory browser scenario is still in progress. No complete J01/J03–J09/J14/J15 browser pass is claimed here until its results are recorded.

## Review corrections and limits

Affected-diff review traced the new public storage hint and access read through native authority, exact action identity, guarded cancellation, receipt persistence and private projections. It also reviewed client focus/input ownership, scoped paging, amount drafts, task replacement and recipient/mention handling. The two upstream integrations preserved tab-control, observer-aware names, save recovery, family editing and shared picker behavior; they introduced no compatibility reader or alternate mutation owner.

Concrete corrections included fencing late completion to its own command; omitting display labels from strict receipt requests; requiring the distinct native recovery scope; refusing mutation when the original request cannot be retained in session storage; keeping the original world-root identity/placement/geometry; rechecking access after exact movement completion; resetting continuation when source/read context changes; preserving blank amount text and endpoints through hidden/stale views; and preventing the first drag Escape from also closing the parent panel. These are reviewed fixes, not a claim of exhaustive adversarial testing.

Local native-server qualification is blocked by the available execution environment: the maintained PostgreSQL binary refuses initialization as root, and a permitted unprivileged process identity is unavailable. No database guard was bypassed, no alternative storage backend was introduced and no existing save was reset. Existing CI supplies a disposable PostgreSQL service for its authored spatial checks, but cannot be credited with unrun redesign scenarios. The large model asset was initially unavailable through the source-file connector; CI built the exact asset successfully, and a matching copy was later recovered into scratch from its trace. No replacement model was authored.

Only the bundled base world is currently installed by the world constructor. Its trusted activity registrations are fixed; there is no already-supported alternate-world activity fixture or parameterized registration path for the requested portability example. Different seeds or differently named fire instances would not establish a different world's semantics. No new world mechanism was invented solely to mark that criterion passed.

The remaining acceptance work stays in [UIUX08–UIUX11](../maintainers/ui-ux.md#uiux08), with PW04/PW06 and the existing native owners retained: the complete real-client/native-server chest-to-camp sequence; two-client shared-content and receipt/restart failures; full recipient consent/expiry/access behavior; the final inventory and compact-task visual checks; and uncoached observation plus native IME/assistive-device and broader input/layout coverage. Recorded fixture successes do not close those gates. The project remains In progress.
