# Explicit tab resume — feature specification

| Status    | Current progress                                                                            | Last updated |
| --------- | ------------------------------------------------------------------------------------------- | ------------ |
| Completed | Explicit Resume, tab pause, protected departure and browser/native acceptance are complete. | 2026-10-03   |

## Purpose and approved behavior

An authenticated player sees their assigned character and a clear **Resume here** entry, rather than a playable-looking screen with a small Control here button. Leaving the tab pauses that window immediately. Returning to it never silently takes control from another window. A blocking dialog says **Open Legend is open in another tab** when another page holds current control of the character, or **Game paused** otherwise, and offers **Resume here**.

Resume refreshes the permitted current world, explicitly transfers command authority to this page's existing random tab ID, and enters the same character through the existing safe return operation. Previous tab IDs and control revisions cannot issue gameplay commands. Focus and heartbeats never regain control. This applies to normal game entry and returning tabs; characterless operations retain their separate interface. Multiple characters are not introduced.

Leaving stops this client's stream, presence heartbeat, private-panel polling and scene updates/rendering. The existing bounded world departure removes the body while preserving identity, inventory and history. Other players and the world keep their independently authorized activity. Tab pause is distinct from the creator's manual world pause; Resume here does not override maintenance or manual pause. Browser refresh receives current server information, not missed-time simulation.

## Journeys and meaningful failure

- First entry: sign in, see the assigned character behind the blocking Game paused dialog, choose Resume here and play.
- Leave and return: leaving immediately blocks input; the body leaves under the authored exit contract. Refocus refreshes the snapshot but remains paused until Resume here.
- Two windows: the second window describes the other controller. Resume here moves play; the first window cannot execute stale commands or take back play through focus/heartbeats.
- A lost connection or acknowledgement keeps a truthful paused/error surface; retry refreshes authority and uses existing control receipts, without duplicating the character or inventory.
- Revoked access, replaced saves, unsafe return placement and maintenance preserve the existing authority/recovery boundaries. A failed Resume remains blocked with a readable reason.

## Scope, boundaries and acceptance

Reuse the account/character assignment, control generation, command receipts and departure/return owners. No credentials, tab IDs or another device's private identity are exposed in the explanatory UI. Authentication, single controlling page and stale-command rejection are application authority; fade, safe return and absent-body protection remain authored world behavior.

Complete code, documentation and static review before one final browser acceptance session, as requested by Mike. That session covers entry, blur/refocus, explicit resume, two-window replacement, stale-command refusal, manual world pause, keyboard/modal isolation and a narrow viewport. Fix findings and recheck affected cases after that session. Use a disposable PostgreSQL world, zero provider budget and no real save changes; stop the task-owned server afterward. Existing broader multiplayer/Auth0 qualification remains separate.

## Maintained records

- Implementation: [MP18](../../maintainers/multiplayer.md#mp18--explicit-tab-resume).
- Limits: [MP09](../../limits/multiplayer.md#mp09).
- Mechanism and execution plan: [technical design](tab-resume-tech-design.md).
- Current world absence: [human logout and return](../../worlds/base/lifecycle-and-protection.md#human-logout-and-return).

## Delivered refinements

Browser game tabs always pause on leaving, so Time settings now explains Resume instead of offering the conflicting background-play checkbox. Non-browser connected background policy remains supported. Verified heartbeats carry their captured control authority; stale heartbeats cannot affect absence. Local and OIDC requests both require current scope, including commands delayed across a pause/return in the same page. Permitted draft namespaces exclude tab ID and control revision, while session/grant, character and timeline still invalidate private work. Paused snapshot reads cannot cancel a newer explicit Resume intent.

## Completion evidence

[October 3 verification](../../verification/multiplayer-entry-maintenance.md#explicit-tab-resume--october-3-2026) records the native authority scenario, focused server and browser checks, final-session fixes and unrelated qualification gaps. The project is complete for its approved local tab lifecycle; broader Auth0 and World Agent qualification remains with its existing owners.
