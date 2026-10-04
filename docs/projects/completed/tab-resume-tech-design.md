# Explicit tab resume — technical design

| Status    | Current progress                                                                              | Last updated |
| --------- | --------------------------------------------------------------------------------------------- | ------------ |
| Completed | Scoped Resume, paused transport/rendering, safe return and focused verification are complete. | 2026-10-03   |

## Plan, owners and risk

Estimated 350–650 changed production logic lines. Medium risk: authority races, page lifecycle, private async results, modal focus and renderer suspension cross server/protocol/client boundaries. Local main and refreshed origin/main both resolve to b50ec6ce; unrelated ongoing camera/FPS/time edits are preserved. This project supersedes manual Control here presentation and automatic control in the loopback HTTP path without replacing account/session/control ownership.

1. Project only whether another page holds current control of the assigned character; derive it through current server authority, without a second writable ownership record.
2. Remove HTTP auto-acquisition. Resume uses the existing explicit replacement operation and expected control revision; pause uses release. Keep same-origin, current session/world, commit fencing and receipt recovery.
3. A root React tab-pause value survives application remounts after a control revision change. A focused page refreshes its snapshot but does not resume automatically. Blur, hidden visibility and pagehide pause. The pause release captures the old authority; a delayed release cannot erase newer Resume authority.
4. Transport loads one current snapshot while paused and establishes no stream/heartbeat. Active transport uses the existing scoped event stream. Control replacement pauses the prior page, clears queued intentions and invalidates old async requests; changed session/grant/character/timeline still remounts all private application panels. Resume waits for pending release, refreshes authority, submits replacement, then refreshes/establishes the new stream. Failed or uncertain publication remains blocked until reconciled.
5. Use a dedicated React Aria non-dismissable resume dialog with one primary action, readable failure and busy states. Modal isolation prevents background commands and shortcuts. Preserve permitted durable/private work; no pause-triggered paid dispatch.
6. Extend the existing plain renderer boundary with suspension, stopping scene update work and automatic rendering while retaining assets. Reset frame timing on return and rebuild from the refreshed projection. Pause persistent panel polling through existing visibility props.
7. Reconcile architecture, multiplayer limits/tracker, affected historical policy references and verification evidence. Format changed files; typecheck/build; inspect the whole affected diff and run focused existing native authority checks. Only after implementation is complete, conduct the feature spec's one final browser session and fix findings.

## Persistence and separation

No new save schema, compatibility reader, database migration or second control service. Existing operational control records stay outside gameplay rewind. The random ID identifies this page lifetime; a reload is a new page that must explicitly Resume. Account-to-character assignment remains durable and unchanged. Pause/Resume cannot impersonate an arbitrary character, broaden creator permissions or authorize paid work.

All application authorization stays with AuthorityRepository/WorldService. Native departure and validated return use current domain operations and the bundled-world participation policy. Rendering suspension is presentation only and never simulates or mutates bodily state. Characterless operations do not participate in this game-tab lifecycle.

## Race and recovery requirements

Multiple resume requests serialize through expected control revision; stale releases, commands and heartbeats cannot regain control. A refresh after uncertain acknowledgement discovers current authority before any retry. Each new explicit Resume intent gets one retained request receipt. Revocation or timeline replacement clears old private application data through existing scope handling. A paused tab holds no active presence and makes no periodic world/private requests; refocus or an explicit retry loads the current snapshot.

Normal world pause and maintenance remain independent. No fully offline advancement is introduced. Existing exit grace remains the bound for safe interruption; leaving does not instantly undo an admitted action. If return placement is invalid, the actor remains absent and the dialog reports the existing safe-return error.

## Maintained records

- Behavior and acceptance: [feature specification](tab-resume-feature-spec.md).
- Delivery and remaining checks: [MP18](../../maintainers/multiplayer.md#mp18--explicit-tab-resume).
- Limits and changed prior policy: [MP09](../../limits/multiplayer.md#mp09).
- Current server boundaries: [account authority](../../architecture.md#account-authority-and-participation).

## Delivered refinements

Browser game tabs always pause on leaving, so Time settings now explains Resume instead of offering the conflicting background-play checkbox. Non-browser connected background policy remains supported. Verified heartbeats carry their captured control authority; stale heartbeats cannot affect absence. Local and OIDC requests both require current scope, including commands delayed across a pause/return in the same page. Permitted draft namespaces exclude tab ID and control revision, while session/grant, character and timeline still invalidate private work. Paused snapshot reads cannot cancel a newer explicit Resume intent.

The other-tab heading derives from the committed control record, including the interval before its new stream starts. It exposes no page identity and disappears after explicit release or inactive departure. The renderer retains resources across pause/Resume. A control revision change does not remount the whole application; only security, character or timeline changes require that reset. Older control snapshots are ignored before they can pause a resumed page, and gameplay controls wait for a current controlling projection.

Resume publishes the freshly permitted view before reopening panels. Every explicit Resume validates the body’s return, including after a lost acknowledgement when this page still owns control. A server-unavailable error keeps the dialog open and offers the same explicit retry; no automatic retry or takeover occurs. The 15-second control/snapshot deadline follows MP09 and limits client waiting, not server effect authority.

## Completion evidence

[October 3 verification](../../verification/multiplayer-entry-maintenance.md#explicit-tab-resume--october-3-2026) records the native authority scenario, focused server and browser checks, final-session fixes and unrelated qualification gaps. The project is complete for its approved local tab lifecycle; broader Auth0 and World Agent qualification remains with its existing owners.
