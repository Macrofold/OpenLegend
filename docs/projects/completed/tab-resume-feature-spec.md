# Explicit tab resume — feature specification

| Status    | Current progress                                                                                                  | Last updated |
| --------- | ----------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Automatic sole-tab entry, exact transfer dialog and shared-login logout passed focused native/browser acceptance. | 2026-10-03   |

## Purpose and approved behavior

A sole game tab enters automatically, including reload and return from another application. Leaving still pauses browser work and begins the existing protected character departure. Only another open tab holding the last selected play requires a blocking dialog. Its exact text is **Game Paused**, **OpenLegend is open in another tab.**, **Resume Here**, and **Log Out**. Resume Here deliberately transfers play; focus alone cannot displace another open tab.

Log Out ends the shared game login and clears private presentation in all its browser tabs, including paused tabs. The server revokes that login, so stale commands and streams remain refused independently of browser notifications. This does not end the external identity provider's login (IDP03) or log out other independently signed-in devices. Local-mode Sign in explicitly creates a fresh local login after logout.

## Journeys and meaningful failure

- First entry, reload and sole-tab refocus: enter the assigned character automatically; no Resume dialog.
- Two open tabs: the new or displaced tab shows the exact blocking copy. Resume Here transfers play; refocus, stale commands and heartbeats cannot take it back.
- Close the selected tab: the surviving sole tab returns automatically on focus, without describing a closed tab as another open tab.
- Duplicate a browser tab: copied session storage must not give two live pages the same server identity.
- Log Out from the blocked tab: both tabs clear private game views and show Sign in; old login requests fail. Explicit local sign-in remains usable.
- Connection/return failures are readable and retryable without claiming another tab exists. Manual world pause, maintenance, assigned character and safe return remain intact.

## Scope, boundaries and acceptance

Reuse account, session, control generation, departure and return owners. Browser coordination contains only tab identities and the opaque permitted draft scope; it is a presentation/liveness hint, never command authorization. No new world law, save schema or paid AI work.

Implement and review before the final browser acceptance session. Use focused existing PostgreSQL/native checks and existing browser journeys, then inspect the exact dialog visually and interact with both tabs. Cover reload/duplicate identity, sole-tab return, deliberate transfers, keyboard isolation, all-tab logout, sign-in recovery, narrow layout and no provider dispatch. Preserve the existing broader Auth0 qualification gap.

## Maintained records

- Implementation: [MP18](../../maintainers/multiplayer.md#mp18--explicit-tab-resume).
- Limits: [MP09](../../limits/multiplayer.md#mp09).
- Mechanism and execution plan: [technical design](tab-resume-tech-design.md).
- Current world absence: [human logout and return](../../worlds/base/lifecycle-and-protection.md#human-logout-and-return).

## Accepted correction — October 3, 2026

The original implementation required explicit Resume on every entry and refocus. Mike rejected that requirement: explicit Resume is only for switching between open game tabs. Existing rendering suspension, protected world departure and stale-command fencing remain. The original acceptance is historical; the corrected behavior passed fresh focused acceptance.

## Completion evidence

[Corrected October 3 acceptance](../../verification/multiplayer-entry-maintenance.md#sole-tab-entry-and-shared-logout--october-3-2026) records native authority/logout checks, four focused browser journeys, the closing-tab regression/fix, copied-tab identity and held-logout blur/refocus, plus actual dialog/logout interaction. Broader Auth0/provider logout and multi-device qualification remain separately tracked.
