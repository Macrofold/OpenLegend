# Multiplayer entry and maintenance verification

[Verification index](../verification.md) · [Plan](../projects/completed/multiplayer-entry-maintenance.md) · [Work](../maintainers/multiplayer.md#entry-and-maintenance-execution-notes--september-28-2026) · [Limits](../limits/multiplayer.md#mp15)

## Entry and maintenance — September 28–29, 2026

Branch `codex/multiplayer-entry-maintenance` from `origin/main` `be68b1e0`: implementation commits `e94aa3c8` (characterless sessions), `2106525f` (invites) and `061f54db` (maintenance), then review fixes `9959e02e` and narrow-layout fix `bd6a99f7` recorded below. Shared macOS development host under heavy concurrent load from other agents; Node 22.23.2; loopback PostgreSQL 14.17; disposable Keycloak 26.7.4 container with five generated test accounts; headless Google Chrome through Playwright 1.58.2, one isolated browser context (independent cookie jar) per person. Server in OIDC mode with loopback HTTP, `OPEN_LEGEND_GOD_MODE=true`, five-second exit grace, `AI_BUDGET_USD=0` and no provider keys. The final runs used a fresh disposable database and the production client build. No automated suite was authored or run; no paid provider was called. Scratch scripts and screenshots stayed in the session scratchpad.

Accounts: Alice (creator bound to `entity-0001`, all capabilities), Olga (startup binding with no character: spectate, inspect, save, manage-access), Bob, Sam and Dave (no access until invited).

### Characterless sessions

- Olga signed in through Keycloak and landed on World operations automatically (`/api/state` returned `403 characterless`). The console showed world status, granted operations, the overview map, saves and access management.
- Every character route rejected Olga before dispatch with `403 characterless`: `/api/state`, `/api/world-events`, `/api/events`, `/api/command`, `/api/god/spawn`, `/api/god/mind`, `/api/knowledge`. Granted routes worked: saves list `200`, performance `200`.
- Alice's game view reported `canOperate`; her operations tab showed “Return to your character”.

### Invite enrollment and revocation

- Olga, with no character, created a player invite for Bob bound to Ada (`entity-0002`, the only unowned person) and a spectator invite for Sam through the console form. Listings never contained a token. An operator invite requesting `create`, which Olga lacks, returned `403 forbidden`.
- Bob opened the link, signed in and landed on `/?entry=invite-accepted` with the notice below the clock. His grant bound `entity-0002`; the body was inactive until **Control here**, then active and controlling. Native speech (`200 spoken`) and a 1.5-unit walk (x 13 → 14.5) committed.
- Sam's invite landed on `/?entry=invite-accepted&view=operations`. Sam's operations payload held only `ok, worldId, accountId, capabilities, scope, generation, mode, clock, maintenance, overview`: 13 bodies with only `category/x/z`, no `entity-` identifiers, names, account IDs or access section. `/api/state` returned `403 characterless`.
- Reusing Bob's redeemed link and opening a revoked link both landed on `/?entry=invite-unavailable` with no session. Bob, already a member, opening a fresh spectator link landed on `/?entry=already-member` and left that invite pending. A 721-hour expiry returned `400 invalid-input`.
- Olga removed Sam's access with the existing audited capability change; Sam's next console refresh returned `403 forbidden`. Final state: Dave revoked, Sam and Bob redeemed; grants Alice (character), Bob (`entity-0002`, play), Olga (characterless), Sam (no capabilities).

### Maintenance, restart and Ready

Alice's context used `America/New_York`; Bob's used `Europe/London`.

- Alice scheduled a one-hour window about two minutes ahead through the console. Bob's notice read “Maintenance scheduled: the world pauses in 3 min”, the full EDT range with `(GMT-4)`, the creator's message and “Your time (Europe/London)” in BST. Rescheduling to one minute ahead changed it to “Maintenance rescheduled”.
- The writer-lane timer started maintenance 147 ms after the scheduled minute. Bob's view: `paused`, `pauseReason: maintenance`, notice “The world is paused for maintenance”, the pause button disabled and the time bar reading “Paused for maintenance”; the world generation rotated.
- During maintenance Bob's speech and resume requests returned `409 maintenance`; Alice created a cord through the creator item route (`200 item-created`). Extending by 30 minutes changed Bob's notice to “Maintenance was extended” with the new 1 h 30 min range.
- Simulated time stayed identical over the held period, including a graceful server stop/start: 0 simulated seconds across 55 real seconds. After restart the window was still active and Bob still controlled his character.
- **Mark ready and resume** completed the window; the world resumed with an 8-simulated-second change at the first observation (no catch-up of the held 55 s, which would be 3,300 s at 1×). Bob's notice read “Maintenance finished”; a request carrying the pre-maintenance world generation returned `409 stale-world`, and fresh speech succeeded.
- A window scheduled a day ahead and then cancelled produced “Scheduled maintenance was cancelled”. Creator history listed the completed and cancelled windows with revisions.
- A run whose scheduled start hit a transient writer-lane overload recorded a fail-closed storage pause (see failures below). After restart the missed start activated before play, which also exercised the offline-start rule on the real server; Ready then completed it.

### Final code in local mode

The last OIDC run on the final code stopped partway because Docker Desktop went down on the host (Keycloak became unreachable; load average about 700 from other workloads). The final server code (`9959e02e` plus the notice layout) was therefore re-run in local loopback mode on a separate disposable database, one browser context in `Asia/Tokyo`:

- Start-now maintenance paused the world (`maintenance`); simulated time changed by 0 over 10 real seconds; Resume returned `maintenance`; Ready completed with a 3-simulated-second change at the first observation, and later 2-second samples (54, 59, 33 simulated seconds per real second) matched plain running on this host (77, 21, 85).
- A window scheduled one minute ahead in Tokyo time started through the timer 4.8 s after its minute under this load, then extended, completed through Ready, and a later window was cancelled. Invite creation in local mode returned `409 invite` (“Invites need OIDC sign-in”).
- At 390 px the HUD notice shows a headline with **Show details** and the left and right rails move below it; at 1280 px details show without the toggle. At 390 px the operations console stacks to one column with readable forms.

### Fixture evidence: stale work and failed-state guard

In-process scenario using the repository fixture helpers, a disposable PostgreSQL database, the real `MaintenanceSchedule` and `AiDirector`, and an injected fixture AI client with network requests blocked (the internal fixture allowance mirrors `ai-director.test.ts`; nothing reached a provider). This is fixture evidence, not live-model evidence.

- An explicit invention job reached its provider stage and was held. Maintenance started (paused, generation rotated). A creator item edit succeeded; an ordinary transition was refused. A 60-second tick advanced 0 simulated seconds.
- The held provider result was released during maintenance; after Ready and presence renewal the job ended `stale` and no recipe was installed. A one-second tick afterward advanced exactly 60 simulated seconds at 1×.
- A window whose start passed while its schedule object was closed activated when a new schedule object initialized (the restart path). With a simulated storage error, Ready was refused (“The world is not ready: … Maintenance continues.”) and the world stayed held; after clearing it, Ready completed.

### Time-zone conversion and display

Ad-hoc check of the server conversion and the client formatter (`en-US` locale):

- 22:00–00:00 America/New_York across midnight displayed both dates (Fri Oct 2 10:00 PM EDT – Sat Oct 3 12:00 AM EDT) with London and Tokyo equivalents.
- 01:30 on 2026-11-01 in New York was rejected as occurring twice until an occurrence was chosen; earlier → 05:30 UTC (EDT), later → 06:30 UTC (EST), displayed as “1:30 AM EDT (GMT-4)” and “1:30 AM EST (GMT-5)”. London's fall-back 01:30 was also rejected without a choice.
- 23:00–03:00 across midnight and the end of daylight saving showed EDT → EST and a real duration of 5 h. A Sydney window across midnight and the start of daylight saving showed GMT+10 → GMT+11 and 3 h 30 min.
- Skipped times (02:30 on 2027-03-14 in New York, 02:30 on 2026-10-04 in Sydney), 30 February and an unknown zone were rejected; `US/Eastern` canonicalized to `America/New_York`.
- Overdue active windows read “Maintenance is taking longer than announced; the world stays paused until it is ready”.

### Failures found and fixed during verification

- The entry notice initially rendered under the time bar, which intercepted clicks; notices now render inside the clock container below it.
- Validation errors on operations and access routes were reported to characterless sessions as `403 stale-scope`, because the response wrapper checked `play`. Operations routes now own their response checks and access routes check `manage-access`; the same request returns `400 invalid-input`.
- A scheduled start that expired while queued behind the writer lane (`OverloadError`, nothing started) failed closed with a storage pause that required a restart. It now retries after one second; genuine persistence failures still fail closed.
- Review found that a tick waiting in the writer lane across a resume could charge real time from before the resume. The host clock now never simulates time before the latest resume instant. This was reasoned from the code; a forced slow tick at resume was not reproduced.
- In development (Vite middleware) mode, a server restart makes Vite reload the page, so the reloaded tab must take control again. This is a development-server behavior; the production build kept control across restart.
- On a 390 px HUD the notice covered the top rail launcher, and its details toggle then appeared on wide layouts because the design system's later button rule won. Narrow notices now collapse and move the rails; the toggle rule has the needed specificity.

### Limits of this evidence

Plain running on this host was irregular (2-second samples of 0–109 simulated seconds per real second at 1×) because of concurrent load; rates after Ready are within that jitter. Not qualified: hosted security or abuse review of invite links, hostile clients, live-model jobs straddling maintenance, load during maintenance transitions, touch devices and every locale. The last complete OIDC two-browser maintenance pass ran on `061f54db` plus the response-check and scheduled-start retry fixes; the resume-instant change and the notice layout were verified in local mode, not again through OIDC, because Docker was unavailable. Disposable database creation through the fixture helper timed out twice under host load (`57014`); the final database was created directly with `psql` on the same loopback server and dropped afterward.

## Login entry screen — October 2, 2026

Client change on `codex/auth0-sign-in`, based on `c2e670b0`. An isolated Vite preview served the actual client with simulated unauthenticated, refused-access and unavailable-service replies; no world database or Auth0 credentials were used.

- Browser: signed-out entry shows Welcome, Open Legend and a primary Sign in link, without an error or connection retry. Tab focuses Sign in first; Enter reaches the login route. The unloaded game canvas is excluded from accessibility and keyboard navigation.
- Browser: refused access shows operator/invitation guidance and Check access again. A service failure exposes optional Connection details; Retry connection recovers to signed-out entry. A delayed retry retains its label and disables duplicate submission while pending.
- Layout: default desktop, 320×568 narrow, 720×320 short, and 320×568 at the supported 130% UI scale. Content wraps; short/scaled entry scrolls instead of clipping the next action.
- Static: TypeScript, production build and pinned formatting pass. The build reports existing PlayCanvas worker externalization and bundle-size warnings.

This qualifies the client entry and navigation states, not real Auth0 token exchange, invitation redemption, authenticated gameplay, assistive-technology behavior or provider logout. IDP01's live two-account requirement remains open. The incompatible existing Auth0 test database was left unchanged. No paid model calls were made.

## Change account — October 2, 2026

The refused-access entry now includes a secondary Change account link below the existing retry action. The game requests Auth0’s login UI with `prompt=login`; its existing callback replaces and revokes the old game session only after successful sign-in. This is account-switching UX, not provider logout or an enforced fresh-authentication security guarantee.

- Browser fixture: Tab reaches Change account after Check access again; Enter navigates to `/auth/login?change-account=true`. Check access again still returns both recovery actions when access remains refused. Desktop visual inspection and 320×568 at 130% UI scale confirm wrapping and keyboard scrolling keep the action reachable.
- Running local server with the real Auth0 configuration: ordinary login and Change account both return 303 with PKCE S256; only Change account includes `prompt=login`. No credentials were entered and no token exchange or completed two-account switch was exercised.
- Static: TypeScript and production build passed; the existing PlayCanvas worker externalization and bundle-size warnings remain. Focused formatting and affected-diff inspection passed.

IDP01’s live two-account run and IDP03’s provider logout remain open. Social-provider account selection still depends on that provider’s session behavior. No paid model calls were made.

## Conversation input layout — October 3, 2026

On `codex/auth0-sign-in`, the conversation controls and history now occupy a bounded scrolling area above the input. The input and readiness text cannot shrink into the messages. The scrolling region has a keyboard focus target for short panels.

- Actual game client with a disposable PostgreSQL world and 14 long native speech messages: checked 1280×720, 1280×600 and 390×844. Messages remain clipped to the history area; controls can scroll when space is short, while the input stays visible below them.
- A multiline draft remains separate from history. Hiding and reopening Conversation preserves the draft. Keyboard scrolling of the controls region was checked after adding its focus target.
- TypeScript and production build pass. Existing PlayCanvas worker externalization and bundle-size warnings remain. Focused formatting and full affected-diff review pass.

Paid AI was disabled throughout. This verifies layout with saved native speech, not live model replies or mobile on-screen keyboard behavior. The real world save was not changed.

## Conversation redesign — October 3, 2026

The preceding nested-controls fix avoided overlap but Mike's screenshot exposed poor usability: controls scrolled away and the transcript had little reading space. This correction separates fixed mode/recipient, message-only scrolling, a vertical volume slider and fixed input. The quoted “own scrolling area” text in the earlier screenshot was seeded test speech, not NPC-generated narration.

Actual production client, disposable PostgreSQL world, zero paid AI: 14 long realistic native speech messages; desktop 1280×720, narrow 320×568, short 1280×420, narrow at 130% UI scale. Pointer drag Shout→Whisper and arrow-key Normal→Shout worked; restored Normal. Multiline draft survived hiding/reopening and resizing. Saved desktop panel translation no longer moves a nondraggable narrow sheet outside its viewport. At 130%, final message bottom 388.23, input form top 398.63/bottom 494.21, slider thumb bottom 369.79: no overlap. Restored 100% scale and reset viewport override. Production build/typecheck and focused formatting pass; no new tests or broad suites. Existing production bundle-size and PlayCanvas externalization warnings remain.

This fixture intentionally reports AI needs setup. Separate actual Auth0 game on localhost:3211 reports AI connected, Jev Configured and Language model Configured; the actual saved world was preserved. Provider/setup evidence remains in the [Macrofold report](macrofold-worker.md#conversation-redesign-ai-readiness--october-3-2026). Software keyboards and a full assistive-device matrix were not qualified.

## Explicit tab resume — October 3, 2026

Historical: mandatory Resume on sole-tab entry/refocus was rejected by Mike and superseded by the [correction below](#sole-tab-entry-and-shared-logout--october-3-2026). Preserve these original observations as evidence for the earlier implementation.

Implementation began on local `main` at `b50ec6ce`, after fetching `origin/main` at the same commit. No branch switch or merge. Concurrent commit `0ae0eed8` saved the Resume implementation alongside shared entity-name work; this task commits its remaining timeout refinement separately under the current committed-handoff rule, without pushing. Shared macOS host, Node 22.23.2, pinned Playwright 1.58.2 and Chromium headless shell; disposable loopback PostgreSQL through the existing fixture owner. Production client, `AI_BUDGET_USD=0`, no provider credentials or real saves. Browser acceptance began only after implementation, documentation, static checks and initial diff review; subsequent fixes were rechecked within that final acceptance phase. [Completed feature](../projects/completed/tab-resume-feature-spec.md) and [MP18](../maintainers/multiplayer.md#mp18--explicit-tab-resume) own scope and status.

- Native HTTP scenario: opening/reading never acquires control; explicit replacement succeeds; a second page sees the other-tab indication before opening its stream. Old-page commands, heartbeats and releases are refused without displacing the current controller. An old scope from the same page is also refused after Resume. Release/departure preserves the character and removes active participation; explicit return works both after release and when an absent body still has a retained control lease. Manual world pause survives. No provider jobs were created.
- Focused existing server checks: `http.test.ts`, `world-service.test.ts` and `spatial-http.test.ts`, **26 passed**, with one worker and 60-second test/hook bounds on the loaded host. The first run exposed two fixture assumptions: automatic local control and equality of operational participation during physical pause. Existing checks now enter explicitly and retain their physical state/save assertions. A later concurrent run timed out 18 tests under the default 15-second bound and reported one PostgreSQL cleanup failure (`55006`); the serialized run passed all assertions and cleanup. This is functional evidence, not a capacity benchmark.
- Focused browser checks: action menu, camera cancellation, elevated-world movement/save reload and time/tab control passed. The final time and spatial checks passed together in 24.2 seconds; action and camera passed in the preceding final-phase run. Time covers initial/reloaded paused entry, explicit Resume, blur/focus event handling, no automatic refocus, frozen absent time, manual pause, two-page replacement in both directions, Escape isolation and 390×844 bounds. Headless focus/blur uses explicit event fixtures; this is not a physical multi-device or OS tab-switch qualification.
- Actual in-app browser: explicit entry, both-direction tab replacement, blocking headings, keyboard isolation, retained invention draft and preserved manual world pause. Stopping the task-owned server leaves Resume blocked with **Could not reach the game server. Try Resume here again.** The button becomes available for another explicit attempt. Successful recovery after a prolonged network outage was not separately exercised.
- Final-session fixes: the compact dialog needed stronger CSS specificity; the other-tab heading now derives from committed control during stream startup; Resume retains scene assets instead of rebuilding them; it applies fresh permissions before panels reopen, eliminating a stale-permissions error while retaining the draft. Every Resume checks the body's return even if the page already owns control after an uncertain acknowledgement. Source review also bounded control/Resume reads to 15 seconds; the explicit timeout label is not separately delay-injected browser evidence.
- Static: production build, TypeScript, focused pinned formatting, guidance check and full affected-diff review passed. Existing PlayCanvas worker externalization, bundle-size and advisory guidance-size warnings remain. Scene updates/automatic rendering and periodic private readers stop while paused; the lightweight PlayCanvas application loop remains. No frame-rate or scaling promise is inferred.

The repository's forced SwiftShader browser run timed out all six selected checks on this host. A temporary configuration outside git used ANGLE Metal, 180-second journey bounds and 20-second assertions; the four relevant journeys above passed. The in-app viewport override did not change its actual dimensions, so the narrow evidence comes from Playwright's checked viewport and screenshot instead. Temporary servers/tabs were stopped and the viewport override reset; the player's localhost:3211 server and save were not changed. Raw screenshots, traces and probes remain outside git.

Two additional existing World Agent browser checks remain unqualified: `conversation-ui.spec.ts` and `design-system.spec.ts` first lack creator mode, and an explicit creator-mode diagnostic then reaches the current **Start conversation** boundary rather than their assumed Message/Send controls. The conversation check also mocks the former `/api/world-agent/messages` flow instead of the current owner-session routes. They timed out; they are not reported as passes. [UIUX05](../maintainers/ui-ux.md#uiux05) tracks adapting those fixtures without authorizing provider calls or bypassing session/spending checks. These older authoring-UI assumptions do not invalidate the separately demonstrated tab lifecycle. Real two-account Auth0 acceptance, hostile clients, touch/assistive devices and broader deployment qualification remain in their existing trackers.

No Jev or LLM calls were made: additional Jev cost **$0**, cumulative task provider cost **$0**.

## Sole-tab entry and shared logout — October 3, 2026

Correction began on local main `a489c500`, after fetching origin/main `b50ec6ce`; no branch/worktree switch or merge. Implementation checkpoints: `5045ee98` and `db2e9a32`, alongside independently committed work. Shared macOS host, Node 22.23.2, PostgreSQL disposable databases through the existing fixture owner, production client, pinned Playwright 1.58.2/Chromium and zero AI budget. Raw traces and screenshots remain outside git. The final browser phase began after implementation, static checks and affected-diff review; its concrete race fix was rechecked afterward.

- Native HTTP scenario passed: automatic non-replacing acquire and same-page reacquire; refusal to acquire another active controller; explicit replacement; old command, heartbeat and release refusal; safe return and manual pause; inactive and disconnected retained-lease reclamation. A pending return remains protected before its stream opens. Logout revokes requests from all three page identities; cookie-free reads stay signed out; explicit local Sign in creates a fresh usable login. No provider jobs.
- Focused existing server check: `http.test.ts`, **11 passed** in 15.44 seconds after the final server changes. An intermediate approach renewed foreground presence on acquisition, breaking five existing absence assumptions; it was corrected to reserve the first heartbeat through the existing bounded message-order record without marking the player present.
- Four focused browser journeys passed in **38.4 seconds**: action search, camera input/cancellation, elevated-world movement/save reload and time/control/logout. The expanded time journey then exposed a real closing-tab revision race and an older foreground check. Fresh foreground checks now supersede older automatic checks; automatic entry retries one changed control revision using acquire, never replace, and clears an obsolete other-tab explanation while connecting.
- Final expanded time journey passed in **21.6 seconds** (18.0-second test): initial/reloaded sole-tab entry, blur/refocus, frozen absence, preserved manual world pause, transfers both ways, exact dialog copy, copied-session-storage identity separation, selected-tab closure and automatic surviving-tab return, 390×844 modal bounds, both-tab logout and sign-in recovery. A held logout request plus blur/refocus keeps Resume disabled until revocation completes. Headless focus/blur and copied storage are explicit fixtures, not an OS/device claim.
- Actual in-app browser interaction confirmed automatic entry/reload, the exact Game Paused / OpenLegend is open in another tab. / Resume Here / Log Out dialog, Escape isolation, transfer to the second tab and blocking of the first. Clicking Log Out in the blocked tab sent both pages to Sign in. Desktop dialog spacing/buttons were inspected visually; narrow bounds and layout were inspected from the existing browser screenshot.
- Typecheck, production build, changed-file pinned formatting and guidance check passed. The first typecheck was blocked by a concurrently edited perception display; its owner completed that work, and subsequent typechecks passed. Existing build size/PlayCanvas externalization and guidance-size warnings remain advisory.

No model calls, credentials or real save changes; paid execution cost **$0**. Task-owned browser tabs/server and disposable databases were cleaned up. This qualifies the corrected local tab lifecycle, not live Auth0 two-account exchange/provider logout, physical multi-device focus, assistive technology or population scale; those broader gates retain their existing owners. [Completed feature](../projects/completed/tab-resume-feature-spec.md), [technical design](../projects/completed/tab-resume-tech-design.md), [MP18](../maintainers/multiplayer.md#mp18--explicit-tab-resume).

## Focus-pause presentation — October 14, 2026

The correction began from refreshed `origin/main` `0c12398e32e7c9578e18de07bbe79d39b4827208` in `Macrofold/OpenLegend`, in `/Users/mzw/.codex/worktrees/d0cb/OpenLegend` on `codex/focus-pause-overlay`. Node 22.23.2, PostgreSQL 14.17 disposable fixture databases, the production client and pinned Playwright 1.58.2 with headless Google Chrome/software rendering were used. No real save or provider credentials were used; paid execution cost was **$0**.

A focused temporary browser scenario passed on the final overlay code:

- Synthetic focus loss retained the world and open Time settings beneath the full-screen light tint and exact small **Game is paused.** text, without the entry/connection screen. The canvas and game interface were inactive; Tab stayed within the pause display and Escape did not dismiss it.
- Sole-tab refocus resumed automatically and retained Time settings. Review found separately mounted dialog controls outside the original inactive boundary; the final display uses the existing React Aria modal boundary to isolate them and restore focus.
- Desktop, narrow and enlarged-text screenshots were inspected. The final text has no card, buttons or focus outline. Resizing a suspended scene can clear its canvas until rendering resumes; these narrow screenshots qualify the overlay and retained interface, not suspended-scene resize continuity.
- A controlled failed character return showed the genuine connection error and reachable **Retry connection** action. Removing the failure and pressing Retry restored play. The ordinary outside-click rule closes the open Time settings when Retry is clicked; that is separate from focus-pause continuity.
- The same scenario's focused continuation passed manual world pause through blur/refocus, a second tab's exact blocking explanation, and deliberate **Resume Here** transfers in both directions. It used a shared browser context, brought each selected tab to the foreground and allowed the existing return requests to settle; the earlier background-tab attempt did not complete a transfer.
- No browser script errors or AI jobs were recorded. Type checking, production build, changed-file formatting and affected-diff review passed. The build retained its existing large-bundle and browser externalization warnings.

Earlier in this correction, the checked-in `tests/browser/time.spec.ts` stopped at its early narrow-window assertion before reaching focus loss or tab transfer, including with a longer overall timeout. Its browser reported the old React viewport value after the Playwright resize. A temporary copy with an explicit resize event passed that step but then failed its fixed-clock world-resume assertion. An unchanged-client comparison from the development base failed during initial entry, so it did not establish the cause of that later assertion. Those runs did not qualify the complete journey; the narrower normal-clock scenario above qualified the overlay, manual pause and tab transfers. Initial probe setup and its overly broad panel-retention expectation after clicking Retry were corrected before the successful focused run. The final current client build was restored after the comparison.

These checks use synthetic focus events and browser tab selection, not physical application switching, assistive technology or multi-device acceptance. Raw scripts, screenshots and traces remain outside the repository. All task-owned browser/server processes and disposable databases were cleaned up.

### Suspended-scene resize and stock-journey continuation

The continuation first found a concrete renderer defect: changing a suspended canvas's rendering resolution clears its previous image, while automatic rendering is disabled. The renderer now requests one frame after a resize, reusing its existing scene. It does not resume character animation, world time or game input. That initial correction changed no client focus/return behavior or browser fixture.

Fresh production builds and focused renderer formatting passed. The checked-in time journey was run with its unchanged 60-second test limit and ordinary 5-second assertions, using disposable PostgreSQL and no AI providers:

- The pinned Chromium headless shell with the repository's software-rendering flags exhausted the overall limit at the second-entry screenshot. Its trace recorded the first Time settings click waiting about 16.8 seconds for stable animation frames and 14.9 seconds inside scrolling into view. The second click also encountered the pause display once; its whole duration cannot be attributed only to rendering.
- The optional Chrome channel with the same software-rendering flags also exhausted the overall limit early.
- Chrome with native Metal rendering passed every behavior assertion: ordinary narrow-window resize, complete simulated departure and automatic refocus return, resumed simulation, preserved manual pause, tab transfers, duplicated-tab identity, shared logout, sign-in and final absence. The run still exceeded the overall limit around teardown. Browser launch took about 16.8 seconds; database/server preparation then occupied about 21 seconds before navigation, followed by about 38 seconds for the complete journey. This is functional evidence, not a passing overall test result or a software-renderer qualification.

The previously failing viewport and fixed-clock return assertions therefore passed without a production or fixture workaround. Concurrent host work included a separate active 30-minute browser survival soak; it was inspected only to identify timing interference and was not interrupted. A separate small paused-resize probe then stopped before browser launch because disposable PostgreSQL creation reached its existing 30-second administrative limit (`57014`). No administrative, test or assertion limit was increased.

The integrated production health-browser scenario subsequently passed the paused-resize check using its already-owned disposable world and browser. Actual viewport changes from 390 to 1440 pixels, without a synthetic resize event, updated the HUD's narrow layout and canvas backing width correctly. Both inspected screenshots retained the drawn world beneath the tint and exact **Game is paused.** text. Time settings remained open and refocus returned automatically. The scenario reported no browser script errors or provider calls and cleaned up its resources. The final journey checks below distinguish hardware and software rendering; [MP18](../maintainers/multiplayer.md#mp18--explicit-tab-resume) tracks the remaining qualification limit.

After the independent soak finished naturally, original-budget stock runs exposed a stale entry helper: the retained Time settings button could be enabled while the quiet pause still blocked entry. The helper now waits for both current blocking dialogs to disappear, and the time journey explicitly expects the new quiet display on ordinary focus loss. The action-search journey searches for Gather, Walk and the authored Evade choice before inspecting rows inside the current category menu. Its unavailable-action checks still exercise actual filtered rows, including after reload. No test or assertion limit changed.

Those runs also exposed a startup ordering problem. One trace recorded successful control acquisition in about 76 ms, but no presence report before another state read about 9 seconds later. The first presence report was owned by asynchronous connection setup, so cold scene preparation could delay it. Presence now starts immediately from the current accepted foreground control before the scene effect, retaining the existing five-second timer and focus/visibility reporting. Connection retries no longer own that timer. Each reporter keeps its accepted permission for requests and cleanup, so a late cleanup cannot withdraw a successor's presence. The six existing API checks pass, including lost-focus behavior, increasing request order and cleanup after a newer permission is accepted; focused formatting and the rebuilt production client pass.

Final production-browser verification used the corrected existing fixtures and unchanged 60-second test / 5-second assertion limits:

- **Chrome/Metal: both focused journeys passed, exit 0.** Action search took 14.3 seconds; time/control took 24.4 seconds. The latter covers the exact quiet pause, ordinary narrow resize, complete simulated departure and automatic return, resumed simulation, manual pause, control transfers, duplicated-tab identity, shared logout, sign-in and final absence. No additional focus overrides were introduced. Both journeys assert no browser script errors or paid requests/jobs and complete their cleanup.
- **Default pinned Chromium/software renderer: both journeys still failed to confirm initial quiet-dialog removal within five seconds.** Each trace records three early visible samples, then no further completed visibility sample before the deadline. The final timeout snapshot shows the ready scene, active interface and removed pause dialog; it does not establish exactly when removal occurred or which startup operation stalled observation. The traces also show accepted control generation 1, active participation and `visible: true` presence reports (sequences 1 and 2), without a release or false-presence report before failure. The first successful presence request preceded the first character-model request; its dispatch occurred about 4.3 seconds after acquisition in the action journey and 5.7 seconds afterward in the time journey. This confirms the changed request ordering, but does not establish the cause of the software-browser timing failure. These are failed software-renderer gates, not passes inferred from the Metal results. No budget was increased and no unchanged rerun followed.
