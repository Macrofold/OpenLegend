# Explicit tab resume — feature specification

| Status    | Current progress                                                                                                       | Last updated |
| --------- | ---------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Quiet focus-pause display, automatic return, failure recovery and existing tab controls passed focused browser checks. | 2026-10-14   |

## Purpose and approved behavior

A sole game tab enters automatically, including reload and return from another application. Leaving still pauses browser work and begins the existing protected character departure. Only another open tab holding the last selected play requires a blocking dialog. Its exact text is **Game Paused**, **OpenLegend is open in another tab.**, **Resume Here**, and **Log Out**. Resume Here deliberately transfers play; focus alone cannot displace another open tab.

Ordinary focus loss retains the world and open panels beneath a slight tint over the entire game, with small **Game is paused.** text. This preserves the visible place the player left while input remains suspended. Returning to the sole tab remains automatic; genuine connection or return failures remain readable and retryable. [The current presentation](../../architecture.md#account-authority-and-participation) retains the existing departure and competing-tab behavior.

Log Out ends the shared game login and clears private presentation in all its browser tabs, including paused tabs. The server revokes that login, so stale commands and streams remain refused independently of browser notifications. This does not end the external identity provider's login (IDP03) or log out other independently signed-in devices. Local-mode Sign in explicitly creates a fresh local login after logout.

## Journeys and meaningful failure

- First entry, reload and sole-tab refocus: enter the assigned character automatically; no Resume dialog.
- Ordinary focus loss: keep the world and panels visible beneath the quiet pause overlay, without presenting a connection failure.
- Two open tabs: the new or displaced tab shows the exact blocking copy. Resume Here transfers play; refocus, stale commands and heartbeats cannot take it back.
- Close the selected tab: the surviving sole tab returns automatically on focus, without describing a closed tab as another open tab.
- Duplicate a browser tab: copied session storage must not give two live pages the same server identity.
- Log Out from the blocked tab: both tabs clear private game views and show Sign in; old login requests fail. Explicit local sign-in remains usable.
- Connection/return failures are readable and retryable without claiming another tab exists. Manual world pause, maintenance, assigned character and safe return remain intact.

## Scope, boundaries and acceptance

Reuse account, session, control generation, departure and return owners. Browser coordination contains only tab identities and the opaque permitted draft scope; it is a presentation/liveness hint, never command authorization. No new world law, save schema or paid AI work.

Implement and review before the final browser acceptance session. Use focused existing PostgreSQL/native checks and existing browser journeys, then inspect the exact dialog visually and interact with both tabs. Cover reload/duplicate identity, sole-tab return, deliberate transfers, keyboard isolation, all-tab logout, sign-in recovery, narrow layout and no provider dispatch. Preserve the existing broader Auth0 qualification gap.

## Subsequent continuity hardening — October 14, 2026

**Feature specification updated 2026-10-14T21:11:40Z.**

The completed October 3 tab-entry behavior remains the accepted contract. Foundation hardening preserves inventory navigation, search, unfinished quantities and camera/scene resources when the same player resumes, while refreshing private reads and clearing transient captions/hover. Failed or obsolete reads cannot restore private details; actual account, character or timeline replacement clears private work. The complete final-build browser journey now passes, including real geometry replacement and scene disposal/reload. [Inventory continuity](../../ui-ux/inventory.md#organize-around-player-tasks-not-container-internals) and [world presentation](../../world-presentation.md#camera-and-settings) own the current behavior; [FR10](../../maintainers/foundation-review-todos.md#fr10--preserve-same-character-work-and-camera-on-resume) and the [new browser evidence](../../verification/foundation-hardening.md#resume-and-private-draft-browser-acceptance--october-14) record this separate acceptance.

Initial 3D construction now waits until the tab enters play, keeping cold graphics preparation out of control acquisition. A newly opened competing tab shows the permitted interface and Resume dialog before preparing its 3D background; an existing paused tab preserves its scene and receives current invalidation. Caption/perception preferences apply when that first scene is created. This changes presentation timing, not who may control the character or the authored departure rule.

The later focus-pause display correction replaces the entry/connection screen used during ordinary focus loss with the retained game and quiet overlay described above. It preserves automatic return and actual failure recovery. [Focused browser verification](../../verification/multiplayer-entry-maintenance.md#focus-pause-presentation--october-14-2026) covers the overlay, keyboard isolation, automatic return and failed-return recovery; the existing completion evidence below records the separately qualified entry and continuity behavior.

## Maintained records

- Implementation: [MP18](../../maintainers/multiplayer.md#mp18--explicit-tab-resume).
- Limits: [MP09](../../limits/multiplayer.md#mp09).
- Mechanism and execution plan: [technical design](tab-resume-tech-design.md).
- Current world absence: [human logout and return](../../worlds/base/lifecycle-and-protection.md#human-logout-and-return).

## Accepted correction — October 3, 2026

The original implementation required explicit Resume on every entry and refocus. Mike rejected that requirement: explicit Resume is only for switching between open game tabs. Existing rendering suspension, protected world departure and stale-command fencing remain. The original acceptance is historical; the corrected behavior passed fresh focused acceptance.

## Completion evidence

[Corrected October 3 acceptance](../../verification/multiplayer-entry-maintenance.md#sole-tab-entry-and-shared-logout--october-3-2026) records native authority/logout checks, four focused browser journeys, the closing-tab regression/fix, copied-tab identity and held-logout blur/refocus, plus actual dialog/logout interaction. Broader Auth0/provider logout and multi-device qualification remain separately tracked.
