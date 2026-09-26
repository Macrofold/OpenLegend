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

**Historical — needs recheck · Restrictiveness: Very safe.**

The live browser snapshot scans only the newest 512 perceived events, then shows at most 30 conversation entries and 60 journal entries.

**Reason / tradeoff:** Keep the initial update small while allowing the player to load older conversation and journal entries separately.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Replace**.

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

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Keep**.

## LA222

**Historical — needs recheck · Restrictiveness: Safe.**

The browser retains visual entries for only 128 remembered beings or objects.

**Reason / tradeoff:** Keep visual memory manageable while ensuring rendering cleanup does not imply that the character forgot the corresponding game information.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## LA223

**Historical — needs recheck · Restrictiveness: Safe.**

Over-character status messages show at most 3 temporary notices, lasting 4 seconds and cut to 240 characters.

**Reason / tradeoff:** Keep brief overhead messages while providing important full explanations in the appropriate panel or history.

[Implementation starting point](../../apps/server/src/http.ts).

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

**Reported · Restrictiveness: Safe.**

Character-view subject picker adds only the first **40 visible people**, plus subjects represented by displayed notes.

**Reason / tradeoff:** Keep selection UI compact; otherwise valid visible subjects can be absent.

## QU12

**Reported · Restrictiveness: Safe.**

Inventory/character cursors restart after relevant state changes; they are not stable historical snapshots.

**Reason / tradeoff:** Restart after invalidation to avoid stale authority/state; callers must handle restarts.

## QU15

**Reported · Restrictiveness: Safe.**

UI search debounce: **150 ms**; departure fade: **0.4 seconds**; displayed numeric feelings: **3 decimal places**.

**Reason / tradeoff:** Reduce query churn and visual noise; rounding is display-only.

## PB04

**Reported · Restrictiveness: Safe.**

Character-view cursor: **2,048 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/protocol/src/index.ts).
