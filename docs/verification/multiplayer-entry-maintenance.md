# Multiplayer entry and maintenance verification

[Verification index](../verification.md) · [Plan](../projects/multiplayer-entry-maintenance.md) · [Work](../maintainers/multiplayer.md#entry-and-maintenance-execution-notes--september-28-2026) · [Limits](../limits/multiplayer.md#mp15)

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
