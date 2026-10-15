# Explicit tab resume — technical design

| Status    | Current progress                                                                                                  | Last updated |
| --------- | ----------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Tab control and later draft/resource continuity are implemented, with focused native/browser acceptance complete. | 2026-10-14   |

## Plan, owners and risk

Estimated 250–450 changed production logic lines. Medium risk: browser identity/liveness, authority races, private asynchronous results and login revocation cross client/server boundaries. Work stays on local main (a489c500); fetched origin/main is b50ec6ce. Preserve unrelated ongoing language/domain edits.

1. Retain a random tab ID in session storage across reload. A bounded BroadcastChannel discovery distinguishes a copied tab from the original before any request uses its ID. Remember the selected open page across blur through that page's live reply; do not infer a competing tab merely from initial paused state.
2. Automatic entry uses the non-replacing acquire operation. Permit reacquiring the same page and reclaiming a lease without a live controller; authorize the latter only from the server's serialized current participation, connections and verified presence, with expected control generation still fenced. Explicit Resume uses replace. Browser hints never authorize effects.
3. Extend the existing tab hook with a separate blocked-by-another-tab value. Pause still suspends input/transport/rendering and releases control. On foreground entry/refocus, discover whether the selected page is still open; automatically return only if it is not. Broadcast successful selection immediately so displaced pages block before the new stream opens.
4. Keep mutation serialization, stale-intent fences and 15-second request deadlines. An uncertain acquire refreshes current authority and retries at most one changed control revision through acquire; a fresh foreground check supersedes older automatic checks, while explicit Resume/logout retain their intent; an actual competition becomes the dialog, while server/return failure uses a connection/retry surface. Do not issue background loops or replay old intentions.
5. Use the exact requested modal text, a primary Resume Here action and secondary Log Out action. Reuse existing session revocation. Notify every same-origin tab after successful logout; each clears the game view, private request authority and browser storage for private work. Server stream revocation and publication fences remain independently authoritative. Make explicit loopback Sign in usable after local logout.
6. Update canonical architecture, limits, tracker, handbook and decision history. Adapt focused existing fixtures/journeys rather than author new automated tests. Typecheck/build/format, inspect the full affected diff and native failure cases before the final browser acceptance phase; fix and recheck findings.

## Persistence and separation

No new saved-world format, compatibility layer or second authority record. Session storage retains only the random tab identity. BroadcastChannel discovery is bounded and event-driven; it exchanges no credentials, character state, inventory, history or private drafts. Only the current server scope and expected control revision admit acquisition/replacement. Existing current-session invalidation owns private work after logout.

Automatic acquisition cannot replace a live different controller. A same-page reload reacquires its own identity; a character with no current controlling stream or verified presence permits reclaiming a retained stale lease. Return reserves the first heartbeat for the new control generation before a stream opens, using the existing bounded message-order records and 12-second presence window. This prevents simultaneous acquisition through that gap without making acquisition itself foreground activity. A copied tab receives a distinct identity before requesting a projection. Two simultaneous entrants still race at the existing atomic control publication; losing acquisition refreshes and blocks rather than silently replacing.

## Race and recovery requirements

Preserve generation fencing for delayed pause, command and heartbeat requests. Capture pause authority before queuing release. A browser notification can pause presentation but cannot grant play. Re-check the latest intent after every await; prevent focus and automatic acquisition from racing explicit Resume or logout. A failed return stays blocked with its actual error; do not show the other-tab explanation without evidence. Logout notification also reaches tabs without world streams, while revoked sessions cannot disclose new data even if a notification is missed. Paused tabs check current authentication when foregrounded.

## Subsequent continuity hardening — October 14, 2026

**Design consulted and implementation alignment recorded 2026-10-14T21:11:40Z.** This dates the foundation follow-up’s use of this design; the original October 3 completion remains historical.

The completed October 3 tab-entry behavior remains the accepted contract. Foundation hardening preserves inventory navigation, search, unfinished quantities and camera/scene resources when the same player resumes, while refreshing private reads and clearing transient captions/hover. Failed or obsolete reads cannot restore private details; actual account, character or timeline replacement clears private work. The complete final-build browser journey now passes, including real geometry replacement and scene disposal/reload. [Inventory continuity](../../ui-ux/inventory.md#organize-around-player-tasks-not-container-internals) and [world presentation](../../world-presentation.md#camera-and-settings) own the current behavior; [FR10](../../maintainers/foundation-review-todos.md#fr10--preserve-same-character-work-and-camera-on-resume) and the [new browser evidence](../../verification/foundation-hardening.md#resume-and-private-draft-browser-acceptance--october-14) record this separate acceptance.

Initial 3D construction now waits until the tab enters play, keeping cold graphics preparation out of control acquisition. A newly opened competing tab shows the permitted interface and Resume dialog before preparing its 3D background; an existing paused tab preserves its scene and receives current invalidation. Caption/perception preferences apply when that first scene is created. This changes presentation timing, not who may control the character or the authored departure rule.

## Maintained records

- Behavior and acceptance: [feature specification](tab-resume-feature-spec.md).
- Delivery and remaining checks: [MP18](../../maintainers/multiplayer.md#mp18--explicit-tab-resume).
- Limits and changed prior policy: [MP09](../../limits/multiplayer.md#mp09).
- Current server boundaries: [account authority](../../architecture.md#account-authority-and-participation).

## Accepted correction — October 3, 2026

This revision supersedes mandatory Resume on initial entry, reload and sole-tab refocus. Historical acceptance remains in the linked report. MP18 is complete after the corrected entry, closing-tab and logout journeys passed focused native/browser checks.

## Completion evidence

[Corrected October 3 acceptance](../../verification/multiplayer-entry-maintenance.md#sole-tab-entry-and-shared-logout--october-3-2026) records native authority/logout checks, four focused browser journeys, the closing-tab regression/fix, copied-tab identity and held-logout blur/refocus, plus actual dialog/logout interaction. Broader Auth0/provider logout and multi-device qualification remain separately tracked.
