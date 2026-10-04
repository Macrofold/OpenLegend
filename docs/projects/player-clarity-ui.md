# Player clarity UI implementation

| Status      | Current progress                                                                                                                     | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | The seven interface slices are implemented; remaining privacy, layout and accessibility qualification stays with the focused owners. | 2026-10-04   |

The seven clearer-everyday-feedback items were approved in chat on 2026-09-28 by Mike and implemented on `codex/player-clarity-ui` from `origin/main` `be68b1e0`. The source pins, shared-file assignments and implementation sequence below describe that historical delivery, not work to replay. The seven mechanisms are present; [recorded evidence](../verification/player-clarity-ui.md) retains the unrun cross-account, reaction-layout, keyboard-menu and assistive-technology cases. The promise-specific boundary and preparation corrections remain under [BW17](../maintainers/base-world.md#bw17--readable-promises-and-commitment-management). Estimated 1,000–1,300 changed logic lines across protocol, server read projections and client panels. Cross-layer read contracts and viewer-privacy boundaries warrant this durable plan. Each completed stage is committed separately so the branch stays coherent and mergeable. No paid provider calls (`AI_BUDGET_USD=0`).

## Scope, owners and design summary

1. **E05 — searchable subject picker.** [QU11](../limits/interface.md#qu11) previously listed only the first 40 visible people. The implemented observer-scoped subject search read (`/api/mind/subjects`, god variant for inspectable NPCs) is owned by [continuity-view.ts](../../apps/server/src/continuity-view.ts). Candidates are currently recognized visible people plus every subject the character has notes about. Search and sorting use only the character's own labels (given names or “a person”), never global names. Pages of 40 with a fenced continuation cursor. Both pickers in the mind panel (note editor, authored feeling) use an async React Aria combo box. This also fixes editing a note that lies on another notes page and stops offering unrecognized note-only subjects for new feelings, which the server already rejects. Tracker: [limits audit E05](../maintainers/limits-audit.md#e05), [AG](../maintainers/agent-agency.md).
2. **R04 — merge target beyond the page.** [QU05](../limits/objects.md#qu05) previously limited merge choices to the displayed 40-item page, with looser eligibility than admission. The implemented `mergeSourceId` mode extends the existing `/api/inventory` read. The server returns only lots that pass a domain helper mirroring merge admission, using the existing 40-result / 200-scanned windows and cursor. The kernel still rechecks at commit. Tracker: R04 in the [limits audit](../maintainers/limits-audit.md) (removed on delivery), [PO](../maintainers/persistent-objects.md).
3. **BW11 — very large piles.** Stored contents and projections are already complete. The pointer hover card becomes a bounded, viewport-aware preview (first stacks plus an explicit “+N more” count and the path to the full list). Look closer (In view detail) and searchable Pick Up remain the complete-list paths. Measure large detail and pickup lists before considering virtualization. Tracker: [BW11](../maintainers/base-world.md).
4. **C11/E02 — older history and bounded search.** Journal and per-person conversation paging already exist through `/api/history`; verify them. Add owner memory paging and search (`/api/memories`, god variant limited to inspectable NPCs) with a Thoughts filter for private-thought memories. Add a bounded text search (`q`) to the existing `/api/world-events` read so all retained perceived speech is searchable. Searches match only the text the viewer is shown (perspective text / memory summary), use AND-combined word prefixes, and scan a bounded window per request with explicit “search older” continuation, so every eligible retained record stays reachable without unbounded per-request work. Reflection thoughts keep their existing 100-entry retention ([LA023](../limits/memory.md#la023)); nothing older exists to page. Trackers: [C11/E02](../maintainers/limits-audit.md), [NC10](../maintainers/narration-and-conversations.md), [HE04](../maintainers/hearing-and-speech.md).
5. **Caption gap notice.** Captions are dropped only on the client: queue overflow, pending/hidden expiry, hidden tab and the baseline rebuild after an SSE reset/reconnect. `SpeechCaptions`, the single caption owner, counts dropped perceived speech from other characters in the authorized `GameView.events` projection and reports it through the existing caption-options seam. The HUD shows a persistent notice with “Read speech history”, which opens World Events on the Speech filter. No new transport, server counter or speech-only stream: the existing EPR projection and SSE reset remain the only gap signals ([hearing §9](../hearing-and-speech.md)). The count is an explicit lower bound. Tracker: [HE deferred expansion](../maintainers/hearing-and-speech.md#deferred-expansion).
6. **BW17 read-only slice — own promises.** [Feature spec](readable-promises-feature-spec.md) and [technical design](readable-promises-tech-design.md). A Promises section in the Journal lists the player's own obligations: exact words, recipient as the player knows them, status, what the world checks automatically, and fulfillment evidence. Read route `/api/commitments`, owner-scoped with no actor parameter. No amending or cancelling; [D64](../../archive/05-project/open-decisions.md#social-exposure-decisions) stays open. Tracker: [BW17](../maintainers/base-world.md#bw17--readable-promises-and-commitment-management).
7. **Reaction bubbles (conditional).** Accepted `expression` events (seven fixed gestures such as nod or wave) already exist as viewer-authorized perceived events. Present them as transient overhead notices through the existing `CharacterStatuses` DOM overlay. No `scene.ts` or `billboard.ts` change. Fix the overlay baseline so reconnects, control changes and timeline changes do not replay old notices. Adaptive “Hmm”-style reactions remain NC03 work. Tracker: [TODO reaction bubbles](../maintainers/TODO.md#future-character-reaction-bubbles).

## Boundaries and shared files

Owned: the client panels changed here (mind panel pickers in `ui/diagnostics.tsx`, `ui/inventory.tsx`, the hover card, memory history, `ui/world-events.tsx`, `speech-captions.tsx`, `character-status.tsx`, the new promises panel), their protocol types and the server read projections (`continuity-view.ts`, `inventory-view.ts`, `perceived-events.ts`, new `memory-history.ts` and `commitment-view.ts`).

Shared, minimal edits: `apps/server/src/http.ts` (one contiguous block of read cases beside `/api/god/mind`, two inspection-list entries and one-line schema additions), `apps/server/src/memory-repository.ts` (read methods only), `apps/client/src/main.tsx` and `design-system/layout.css` (small mounting and style hunks). Do not edit invention-owned files, shadow-owned renderer files, camera controls, `ui/game-saves.tsx`, action status display or `packages/domain/src/decision-context.ts`/`response.ts` (edited by a parallel branch).

## Decisions

- Search and labels use only what the viewer is shown. Matching global names, raw event payloads or unheard words would let search reveal hidden facts.
- Bounded scan windows instead of unbounded index scans: each search request has a fixed maximum work; the UI says when it stopped early and offers to continue into older records.
- New owner reads are POST routes inside the authorized dispatcher, except speech search, which extends the existing GET `/api/world-events` with one parameter to keep the `http.ts` change to one line. The search text therefore appears in that request URL, like the existing filters; nothing else is logged by the server.
- The hover card is presentation-only; truncation there is explicit and never limits stored or projected contents.
- The missed-caption count is local to the tab and scope, excludes the player's own speech and is a lower bound; it never includes speech the player did not perceive.
- Promises display server-written wording for the one supported automatic check (gathering an item). Other amended completion bindings receive a generic description rather than the gathering-specific explanation; raw event-type strings never reach the client. Recognition, gathering interpretation, tuning and explanatory wording still need the single authored-world source tracked by BW17.
- Review follow-up: search words are matched in JavaScript over the bounded window (read 250 rows at a time) rather than by PostgreSQL's parser, whose word splitting and lowercasing depend on the database locale. The bounded scan never used the text index anyway. Search cursors carry a digest of the search, not its words.
- Review follow-up: the promise count uses the admission rule itself (one domain helper shared by admission and the list), and World Events returns to the All filter when closed, as it did before the missed-caption notice needed to choose Speech.

## Implementation sequence

Each stage: implement, typecheck, exercise in the running app (desktop and narrow), update its limits/tracker/canonical docs, commit.

1. Plan and promises spec pair; BW17 tracker links. Commit.
2. E05 subject search.
3. R04 merge targets.
4. BW11 hover preview and large-list measurement.
5. C11/E02 memory history, speech search, journal/conversation paging check.
6. Caption gap notice.
7. BW17 promises panel.
8. Reaction bubbles.
9. Full review workflow over the branch diff, fixes, reverification, documentation reconciliation (limits audit, changelog, architecture, gameplay availability, verification report).

## Verification and completion

Disposable PostgreSQL database, `OPEN_LEGEND_GOD_MODE=true`, `AI_BUDGET_USD=0`, no provider keys, isolated port. Exercise each item in the browser at desktop width and the mobile preset, with keyboard-only paths. Check authority boundaries with direct requests (another actor, a player-controlled actor on god routes, stale cursors). NPC speech and gestures cannot be produced at zero cost from the UI; use a small in-process scenario or a component fixture and label that evidence. Run `pnpm typecheck`, `pnpm build` and pinned Prettier on changed files. No new automated suites (default policy); record gaps in the focused trackers. Evidence goes to [player clarity verification](../verification/player-clarity-ui.md).

Done when each item works in the running app at desktop and narrow widths with keyboard access and the privacy boundary checked (or the gap is recorded honestly), and the limits rows and trackers are updated.

## Progress

- [x] Context, code maps and plan.
- [x] E05 subject search.
- [x] R04 merge targets.
- [x] BW11 large piles.
- [x] C11/E02 older history and search.
- [x] Caption gap notice.
- [x] BW17 read-only promises.
- [x] Reaction bubbles.
- [x] Review, fixes and documentation reconciliation ([review follow-up](../verification/player-clarity-ui.md#review-follow-up)).
