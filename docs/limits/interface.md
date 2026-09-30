# Authoring and presentation: limits and constraints

[Feature contract](../ui-design-brief.md) · [Implementation work](../maintainers/TODO.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [http.ts](../../apps/server/src/http.ts), [index.ts](../../packages/protocol/src/index.ts).

## LA179

**Historical — needs recheck · Restrictiveness: Medium.**

The player can select simulation speeds of 0.5×, 1×, 3× or 8×, and the base rate is 60 game seconds per real second.

**Reason / tradeoff:** Treat these as game-speed presets and measure how much simulation work the server can complete before offering faster choices.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## LA197

**Historical — needs recheck · Restrictiveness: Medium.**

Server ports are restricted to 1,024–65,535 and world-generation seeds to 1–2,147,483,647.

**Reason / tradeoff:** Keep valid configuration ranges unless a concrete deployment or reproducible-world requirement needs values outside them.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Keep**.

## LA205

**Historical — needs recheck · Restrictiveness: Safe.**

Invention-job history returns 50 entries per page, and the character-memory editor returns 100 entries per page.

**Reason / tradeoff:** Keep pagination so large histories remain available without loading them all at once.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Keep**.

## LA206

**Historical — needs recheck · Restrictiveness: Safe.**

The stored-event editor shows 100 events per page and fetches 101 to detect more; the general history view defaults to 40 and permits 100 per page.

**Reason / tradeoff:** Keep paginated history access and make the next page available whenever additional records exist.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Keep**.

## LA207

**Current — rechecked 2026-09-28 · Restrictiveness: Safe (live snapshot only).**

The live browser snapshot still scans only the newest 512 perceived events and carries at most 30 conversation entries and 60 journal entries. These feed live consumers (captions, overhead notices, reply status); they are not the history views. Journal (**Older entries**), per-person Talk (**Older messages**) and World Events (**Load older events**, plus search) page through every retained permitted record with keyset cursors ([HR06](hearing-and-speech.md#hr06--history-paging-and-growth)).

**Reason / tradeoff:** Keep the live update small; durable history routes provide complete older access.

[Snapshot](../../apps/server/src/view.ts), [transcript pages](../../apps/server/src/history.ts).

Original recommendation: **Replace** — delivered through the durable history routes.

## LA211

**Historical — needs recheck · Restrictiveness: Safe.**

Player chat/action input and the locally saved unsent draft are limited to 1,000 characters.

**Reason / tradeoff:** Align editing and submission limits and avoid silently cutting the player's unsent text when saving the draft.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Expand**.

## LA212

**Historical — needs recheck · Restrictiveness: Safe.**

The message box for the AI that edits the world and invention-purpose UI allow 2,000 characters.

**Reason / tradeoff:** Align these input allowances with downstream authoring validators so accepted text does not fail later because another limit is smaller.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Expand**.

## LA213

**Historical — needs recheck · Restrictiveness: Safe.**

The native speech command accepts 1,500 characters, while the native private-thought command accepts 350.

**Reason / tradeoff:** Make native text limits consistent with the user interface and model-generated response limits for the same operations.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Expand**.

## LA214

**Historical — needs recheck · Restrictiveness: Safe.**

The person editor allows an 80-character name, 2,000-character description, 1,000-character personality and 4,000-character backstory.

**Reason / tradeoff:** Expand descriptions when useful while preserving clear total character-data and model-input allowances.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Expand**.

## LA215

**Historical — needs recheck · Restrictiveness: Very safe.**

Character creation/editing permits 8 traits and 8 initial goals, each goal limited to 500 characters.

**Reason / tradeoff:** Allow richer authored characters without forcing every trait and goal into every model request.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Expand**.

## LA216

**Historical — needs recheck · Restrictiveness: Safe.**

Owner editing of memories/events permits 20,000-character text, 100 referenced entities and 1,000 source-event or audience identifiers.

**Reason / tradeoff:** Ensure legitimate large-group events and their explanations can be edited without losing who participated or who perceived them.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Expand**.

## LA217

**Historical — needs recheck · Restrictiveness: Liberal.**

One owner request can edit up to 10,000 memory/event records, subject also to the editor HTTP request's 1 MiB size limit.

**Reason / tradeoff:** Measure and bound total editing work rather than assuming the large entry count alone makes a batch safe.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## LA218

**Historical — needs recheck · Restrictiveness: Safe.**

Save labels allow 80 characters, editor entry identifiers 200, paging cursors 240 and inspection request identifiers 300.

**Reason / tradeoff:** Keep labels readable and ensure identifiers fit consistently through every endpoint that stores or reads the same record.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Expand**.

## LA221

**Historical — needs recheck · Restrictiveness: Safe.**

A rendered ground-item pile uses only its first 12 item types, at most 3 decorative copies per type and 18 decorative pieces total.

**Reason / tradeoff:** Keep decorative geometry small while showing the pile's real contents and quantities through the item interface.

[Implementation starting point](../../apps/client/src/art.ts).

Original recommendation: **Keep**.

## LA222

**Historical — needs recheck · Restrictiveness: Safe.**

The browser retains visual entries for only 128 remembered beings or objects.

**Reason / tradeoff:** Keep visual memory manageable while ensuring rendering cleanup does not imply that the character forgot the corresponding game information.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## LA223

**Historical — needs recheck · Restrictiveness: Safe.**

Over-character status messages show at most 3 temporary notices, lasting 4 seconds and cut to 240 characters. Accepted gesture notices (2026-09-28) share these bounds; a burst beyond three per character keeps only the newest, and the gesture stays in World Events and Talk history.

**Reason / tradeoff:** Keep brief overhead messages while providing important full explanations in the appropriate panel or history.

[Implementation starting point](../../apps/client/src/character-status.tsx).

Original recommendation: **Keep**.

## LA224

**Historical — needs recheck · Restrictiveness: Safe.**

The browser's set of already-announced event identifiers shrinks from more than 600 entries to the newest 300.

**Reason / tradeoff:** Keep notification deduplication memory bounded, recognizing that very old repeated event deliveries may be announced again.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Keep**.

## LA225

**Historical — needs recheck · Restrictiveness: Very safe.**

The quick-action interface shows 3 contextual suggestions and supports 3 pinned shortcuts.

**Reason / tradeoff:** Review the number as a screen-layout choice rather than a limit on which actions exist in the world.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## LA226

**Historical — needs recheck · Restrictiveness: Safe.**

Collapsed diagnostic previews shorten text to 240 characters and show only the first 4 fields of structured data.

**Reason / tradeoff:** Keep previews brief while allowing the user to inspect or copy the full saved data.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Keep**.

## LA227

**Historical — needs recheck · Restrictiveness: Safe.**

A conversation tab for the AI that edits the world title uses at most 36 characters, and a temporary main-screen notice disappears after 6 seconds.

**Reason / tradeoff:** Keep compact titles and temporary notices without deleting the underlying conversation or important error information.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Keep**.

## LA228

**Historical — needs recheck · Restrictiveness: Safe.**

Camera controls restrict zoom to 4–30, tilt to about 25–75 degrees, per-command pan movement to ±1,000 and horizontal focus coordinates to -64–192.

**Reason / tradeoff:** Choose camera bounds that fit the actual authored world and viewport rather than only the starter map.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## LA229

**Historical — needs recheck · Restrictiveness: Safe.**

The renderer adds at most 0.1 seconds to its animation clock for one frame.

**Reason / tradeoff:** Keep protection against visual jumps after a stalled frame without changing the server's authoritative simulation time.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Keep**.

## LA230

**Historical — needs recheck · Restrictiveness: Medium.**

Current health/food/energy and body-condition values use 0–100, probabilities/confidence use 0–1 and trust uses -1–1.

**Reason / tradeoff:** Keep valid values within each defined representation; changing physiology scales requires an explicit world-model change.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## QU11

**Current — implemented 2026-09-28 · Restrictiveness: Medium.**

The private-mind subject pickers (knowledge notepads and creator-authored feelings) search the inspected character's subjects on the server: every currently recognized visible person plus every subject that character has notes about. The former cap of the **first 40 visible people** is **removed**. Results come in pages of **40** with a fenced continuation cursor (at most 2,048 characters, shared with [PB04](#pb04)); queries are at most 120 characters and debounced by [QU15](#qu15). A search request makes one in-memory pass over that character's current sightings and note subjects with no independent cap on either count and no storage read. Paging is keyed by (status, label, ID): entries can appear, leave or move to a later status group between pages as sightings change, so a person can come back on a later page; the picker lists each person once. A changed query, scope or world generation restarts the search. When a search finds no one, a status line under the field says so, because the fixed first choice keeps the list itself non-empty.

**Reason / tradeoff:** Every permitted subject is reachable without sending an unbounded list on each mind load. Search and ordering use only the character's own labels (learned given names or species descriptions), never global names, so a query cannot reveal who an unnamed stranger is. Identical labels such as “a person” are distinguished only by status and distance. Measure large crowds or note collections before caching sorted candidates. Implementation: [continuity-view.ts](../../apps/server/src/continuity-view.ts), [subject-picker.tsx](../../apps/client/src/ui/subject-picker.tsx).

## QU12

**Reported · Restrictiveness: Safe.**

Inventory/character cursors restart after relevant state changes; they are not stable historical snapshots.

**Reason / tradeoff:** Restart after invalidation to avoid stale authority/state; callers must handle restarts.

## QU15

**Reported · Restrictiveness: Safe.**

UI search debounce: **150 ms**; departure fade: **0.4 seconds**; displayed numeric feelings: **3 decimal places**.

**Reason / tradeoff:** Reduce query churn and visual noise; rounding is display-only.

## HV01

**Current — implemented 2026-09-28 · Restrictiveness: Safe (display only).**

The world hover card previews at most the first **8** item stacks of a pile, followed by “+N more · Look closer lists all N”. It flips and clamps to stay at least 12 px inside the viewport, is at most 320 px wide (long names truncate) and renders above the HUD because it follows the pointer and ignores pointer events. Stored contents, the projected `EntityView.contents`, In view inspection and the searchable Pick Up pullout are not capped.

**Reason / tradeoff:** A pointer-following card cannot scroll, so an unbounded list overflowed the viewport at edges and rebuilt every row on each pointer update. The complete lists stay one action away. Eight rows matches the pullout convention of eight visible rows before scrolling. Measured complete-list costs at 1,001 stacks (production build): In view detail 130–190 ms to commit; Pick Up pullout 438 ms to open and 109–268 ms per search keystroke. No virtualization yet; reconsider if ordinary play produces piles of hundreds of stacks or these costs rise. [Evidence](../verification/player-clarity-ui.md#bw11--very-large-piles), [world-hover.tsx](../../apps/client/src/ui/world-hover.tsx).

## PB04

**Reported · Restrictiveness: Safe.**

Character-view cursor: **2,048 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/protocol/src/index.ts).

## VP01

**Current after spatial/cadence integration · Restrictiveness: Medium.**

See-through presentation supports off, player-only and nearby authorized targets (default nearby). Radius is 2–12 m, default 6; strength is 0.2–0.95, default 0.7. The UI offers even-metre radius presets and 0.35/0.7/0.9 strength presets. Preferences belong to the account and survive gameplay rewind. They grant no new bodily sight or knowledge. Lighting selects up to eight nearest observed lit stations with an eight-metre visual range; only the nearest fire casts dynamic shadows, using a 512-pixel map. The sun remains separate.

**Reason / tradeoff:** Adjustable local legibility and bounded graphical work. These are presentation approximations, not physical light/sense rules or measured GPU capacity. [Presentation contract](../world-presentation.md), [implementation](../../apps/client/src/world-presentation.ts), [preferences](../../apps/client/src/ui/world-visual-settings.tsx).
