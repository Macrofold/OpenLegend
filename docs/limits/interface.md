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

**Reason / tradeoff:** Keep visual memory manageable while ensuring rendering cleanup does not imply that the character forgot the corresponding game information. Remembered fire imagery now also retains its last-permitted illumination; the same eviction removes that remembered light. Fresh observation replaces its remembered state, and scope/timeline changes clear it. No hidden live source data is sent. [Presentation](../world-presentation.md#motion-and-depth).

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## LA223

**Current — native/browser checked October 3, 2026 · Restrictiveness: Safe.**

Over-character status messages show at most 3 temporary notices, lasting 4 seconds and cut to 240 characters. Accepted gesture notices (2026-09-28) share these bounds; a burst beyond three per character keeps only the newest, and the gesture stays in World Events and Talk history. Permitted numeric stat changes aggregate within a fixed four-second window, rounded to two decimal places, rather than extending one accumulating notice forever. Categorical changes name their new value. Injured visible bodies keep a separate 54×4 CSS-pixel health bar; full health remains displayed for four seconds after an observed change. Visibility/timeline changes reset comparison baselines. [Behavior and evidence](../verification/embodied-feedback.md).

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

**Current — rechecked October 3, 2026 · Restrictiveness: Very safe.**

The quick-action interface shows up to 3 contextual suggestions and supports 3 stable player-selected pinned shortcuts. PG03 preserves this arrangement; the complete catalogue has no corresponding action-count ceiling. [Scoped identity evidence](../verification/player-clarity-ui.md#pg03--action-discovery-and-commitments--october-3-2026) covers one exact-tool pin, not recommendation ranking or remapping.

**Reason / tradeoff:** Review the number as a screen-layout choice rather than a limit on which actions exist in the world.

[Implementation starting point](../../apps/client/src/ui/quick-actions.tsx).

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

The separate world silhouette outline begins after **more than 0.3 real seconds** over the same selectable target and fades over **0.25 seconds**; reduced motion keeps the delay and removes the fade. These are pointer-feedback timings, not simulation clocks. One hovered target uses two canvas-sized color textures and one mask depth target, reused across target changes; no per-entity outline framebuffer exists. Leaving/cancellation/replacement or permission loss releases the current mask copies. The shorter delay replaces the former one-second delay; the outline has 0.42 strength with a five-sample soft edge. It avoids visual noise while sweeping the pointer; the fade softens onset without obscuring selection. [Contract](../world-presentation.md#selection-and-hover), [current hover evidence](../verification/embodied-feedback.md#browser-playthrough) and [earlier visibility evidence](../verification/character-visibility.md).

**Reason / tradeoff:** A pointer-following card cannot scroll, so an unbounded list overflowed the viewport at edges and rebuilt every row on each pointer update. The complete lists stay one action away. Eight rows matches the pullout convention of eight visible rows before scrolling. Measured complete-list costs at 1,001 stacks (production build): In view detail 130–190 ms to commit; Pick Up pullout 438 ms to open and 109–268 ms per search keystroke. No virtualization yet; reconsider if ordinary play produces piles of hundreds of stacks or these costs rise. [Evidence](../verification/player-clarity-ui.md#bw11--very-large-piles), [world-hover.tsx](../../apps/client/src/ui/world-hover.tsx).

## PB04

**Reported · Restrictiveness: Safe.**

Character-view cursor: **2,048 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/protocol/src/index.ts).

## VP01

**Current after spatial/cadence integration · Restrictiveness: Medium.**

Ordinary read-through is restricted to scenery; people/animals and ordinary objects keep their depth occlusion. Currently perceived selected targets always receive foreground presentation, with no radius/strength preference restriction. Current server projection and the existing sight-focus picking restriction still apply. This supersedes read-through over every obstruction, protecting character readability. One color-free protection submission accompanies each eligible character silhouette; no target-by-occluder CPU query matrix or new target count cap is introduced. [Contract](../world-presentation.md#local-read-through), [evidence](../verification/character-visibility.md).

See-through presentation supports off, player-only and nearby authorized targets (default nearby). Radius is 2–12 m, default 6; strength is 0.2–0.95, default 0.7. The UI offers even-metre radius presets and 0.35/0.7/0.9 strength presets. Preferences belong to the account and survive gameplay rewind. They grant no new bodily sight or knowledge. Lighting selects up to eight nearby observed lit stations in Detailed or two in Economy, each with an eight-metre visual range; all selected stations cast dynamic shadows into the same shared atlas. Removal/extinguishing revokes a source immediately. This supersedes eight illuminating sources with one shadow caster because secondary lights passed through walls/floors. The intermediate four-source Detailed limit is expanded following measured shadow submission optimizations. Repeated eight-fire baselines did not reproduce the earlier 27.84 ms GPU result; it is no longer treated as an inherent capacity limit. Eight sources share the unchanged atlas, trading per-source map detail for broader occluded illumination. [Current 3× evidence](../verification/eight-fire-three-times.md) records workload-specific capacity and remaining tails. Unselected fire artwork stays emissive. Selected sources get a 1 m distance-priority bias to avoid admission churn; missing/unlit sources are excluded first. Quality changes reselect immediately, including while paused. Selection still scans/sorts the authorized observed entity list before taking the selected quality’s count; there is no new preselection population bound.

The renderer uses one framebuffer pixel per CSS pixel, with device pixel ratio capped at one. A 1920×1080 canvas renders at 1920×1080 in both quality modes; the unconditional 0.8 canvas scale is removed at the owner’s request. This increases pixel work by 56.25% for the same window versus that prior scale; it is a workload ratio, not a predicted frame-time increase. Larger windows remain supported without a new resolution cap, but require separate capacity evidence.

Detailed (the device-local default) uses clustered PCF5 with a 2048-pixel shared atlas, fire intensity 2.8, height offset 0.8 m and normal bias 0.025. The old per-light 512 setting was ineffective in this clustered path and is removed, correcting the previous inventory description rather than increasing the atlas from 512. Sunlight retains its 2048 map, 40 m distance and 0.04 normal bias; it uses PCSS with spread 0.015, 16 blocker/filter samples and the engine's capability fallback to PCF. Sun intensity is `1.2 × daylight`, disabled below daylight 0.001; ambient RGB is `(0.18, 0.22, 0.30) + daylight × (0.26, 0.25, 0.20)`. This replaces the 0.12 nighttime directional-light floor and reduces fire intensity from 3.5 to preserve shaded detail. These are visual approximations, not a physical photometric/sky model.

Economy selects PCF3 for both sun and clustered local shadows, with a 1024-pixel sun map and shared atlas. It preserves geometry, sun path and contacts, trading local-light coverage, map detail and sun contact-hardening softness for lower graphics cost. The existing local preference store owns this per-device choice; it is independent of account visibility preferences and saves. Supported PlayCanvas setters release replaced maps.

Lit forward material configurations prepare at most four quality × sun-present/absent programs (the current program and up to three counterparts), shared by the engine cache. Material copies retain the scene’s actual sun description, including while disabled. This trades some shader setup/cache cost for avoiding first-use compilation during ordinary quality and day/night changes; it adds no draw, texture, light or geometry budget. No general stutter-free deadline or unbounded background preparation queue is introduced. Newly encountered variants, immediate switches and driver/context behavior still require qualification.

Sprite casters retain the full-resolution alpha-tested front and add a shallow relief behind it. Inference uses at most 48 samples along the longest image dimension, conservative occupancy at alpha 24/255, Manhattan distance to transparency, two-cell depth quantization and depth of 0.75 times that distance normalized by grid width. Thin details stay shallow; equal-depth faces merge. The grid bounds inference to 2,304 cells and a conservative upper bound of 14,018 triangles per unique texture (ordinary assets are much smaller); source-alpha reading still scales with source pixel count. Geometry is generated lazily per texture/frame, shared by its instances, retained across inactive frames and released with its texture/appearance. One shared two-triangle front plane serves sprite reveal so the back cannot reveal itself. Contact padding is derived from the union of opaque pixels across asset frames (alpha at least 24/255), rather than authored per-image anatomy. There is no extra total caster-count cap: work scales with authorized entities and rendered scenery. Mesh assets use their geometry; fire/ground-grass imagery adds no caster. This supersedes the initial 19-variant compound profile cache (up to 448 triangles per body), which mismatched camera-facing art. The subsequent zero-thickness sheet was replaced by this derived relief to retain an edge-on shadow. It still follows camera orientation and cannot supply anatomical or camera-independent volume. Sprite normal bias is oriented toward each light for a two-sided sheet; mesh bias remains unchanged. General generated model loading and directional artwork remain separate asset capabilities.

Compatible sprite shadows group within 16 m XYZ cells, approximately a local light diameter. There is no per-cell caster cap or omitted member: conservative union bounds trade some extra vertex work for fewer driver submissions. Four/eight/sixteen-metre comparisons selected sixteen on the measured workload. Buffers grow to a power-of-two instance capacity (21 floats per instance); empty groups release resources, and source/scene disposal owns cleanup. Frames/transforms are refreshed every render, without a shadow-cache lifetime or stale-pose allowance. Artwork caches use the same procedural type/name/seed inputs, not a new authored metadata requirement.

The daily sun preset rises at 06:00 (+X), peaks at 60° elevation toward +Z at noon and sets at 18:00 (−X), repeating every 24 hours. One phase supplies the tilted circular direction and existing sine daylight curve; the former fixed Euler rotation `(52°, −32°, 0°)` is removed. The 60° peak avoids a directly overhead, collapsed sprite shadow while keeping noon substantially higher than morning/evening. There is no artificial minimum elevation or shadow-length clamp: near-horizon shadows can extend beyond the existing 40 m shadow distance as sunlight fades. Clock updates, rather than a separate render clock, own progression. Calendar, latitude, seasons, varying sun color and moonlight are not implemented. This localized presentation preset is the replacement seam when another environment needs a different sky.

**Reason / tradeoff:** Adjustable local legibility and bounded graphical work. These are presentation approximations, not physical light/sense rules or measured GPU capacity. Quality-dependent source counts with occlusion and set retention replace the earlier eight-source/one-shadow policy; alpha-derived relief preserves the front image and adds inferred edge-on volume at a higher triangle/setup cost than a sheet; it trades away the initial camera-independent proxy orientation. The sprite-specific bias can soften very close shadow contacts from other objects. Local PCF lacks contact-dependent softness. The daily orbit improves time-of-day cues without an astronomy subsystem or extra shadow pass. [Shadow evidence](../verification/shadow-quality.md) records matched Metal and software-renderer workloads on one Mac, not universal low-end capacity. [Presentation contract](../world-presentation.md), [implementation](../../apps/client/src/world-presentation.ts), [preferences](../../apps/client/src/ui/world-visual-settings.tsx).

## IW01 — Inventory task workspace

**Current — native and partial browser evidence 2026-10-02; final qualification pending · Restrictiveness: Safe.** [PW04](../maintainers/parallel-batch-01-playable-week.md#pw04--inventory-for-exact-camp-tasks) retains current-container search and existing object-query paging/scan windows; it adds no total inventory cap. Lazy destination discovery returns at most **40 choices** after examining at most **200 candidates** per response, using direct-child and spatial indexes with permission checks. It begins when the player chooses storage or a move destination, rather than during ordinary contents reads. Continuation distinguishes incomplete discovery from no matches; unavailable reads cannot certify an empty search. Cold index reconstruction, first-use queried-cell membership preparation and native admission for a selected bag are separate work, so these numbers do not bound total query latency or transfer work. The shared picker can choose permitted storage for a camp task without moving anything or offering to a recipient. NP04 adds a declared activity mode for visible distant dropped bags: appearance/location only until current admitted inspection. Exact refresh and explicit Approach reuse the same disclosure owner. Role pages use the same 40/200 envelope, a 160-character query and a 3,000-character opaque cursor; private traversal IDs remain sealed and scope-bound. Selected identities remain independent of page membership. Ground materials come only from the current character-inspected page; own materials traverse permitted nested possessions in bounded windows. This is a discovery scope, not a larger native stock allowance. [October 3 evidence](../verification/camp-life.md#np04--camp-supply-discovery-october-3-2026) records cold versus warm work separately.

All/Half fill an exact quantity draft; a separate native Move, Offer, Split or Drop performs the requested action. No all-belongings search, bulk transfer, loadout preset or trading transaction is implied. Comparison uses native characteristics and the actual equipped counterpart with matching meanings and units, without a synthetic total score or invented unknown values. Existing contents bounds remain under [QU03–QU04](objects.md#qu03).

Inventory and World Agent have an optional expanded workspace width of **792 CSS pixels**, clamped to available scaled width minus **184 pixels**, with the existing **336-pixel** compact floor. Ordinary panel widths retain their existing defaults. One/two panes adapt to the workspace's actual width; the [browser verification matrix](../projects/parallel-batch-01-playable-week-tech-design.md#verification-plan) samples short/narrow/enlarged layouts rather than defining new device support limits. Inventory selection and exact quantity drafts belong to one mounted world/actor/access/timeline workspace and survive layout changes and hiding; changing that scope resets them.

PW10's October 2 shared-layout consumer also tracks usable height: at most 600 logical pixels after interface scale uses the existing single active sheet, as does the existing width trigger below 720 logical pixels. This replaces width-only selection of the docked layout, which clipped the activity's Start/Stop controls at 1,024×600 and enlarged scale. Resizing into the sheet keeps the panel containing keyboard focus active; if browser movement loses focus, the same connected visible control regains it without overriding a different focused control. It preserves text size, panels and private drafts; it is an adaptation trigger, not a minimum supported device size or a new row/content cap. The tradeoff is one visible panel at a time in short windows. [Implementation plan](../projects/parallel-batch-01-playable-week/camp-activities.md#engineer-3-implementation-plan--october-2-2026) and [dated evidence](../verification/camp-life.md#engineer-3--containers-and-chosen-activities-october-2-2026) keep this scoped fix separate from PW04 qualification.

**Reason / tradeoff:** Improve the concrete camp task without hiding rows or inventing unsupported transaction semantics. Current query scopes and continuation remain under [objects](objects.md); broader search must acquire an indexed, permission-aware contract before claiming completeness. This scoped PW10 layout evidence does not complete PW04 performance/browser acceptance; its original planning baseline remains `6664144a`.

Expanding a workspace also uses more vertical HUD space until the player chooses **Compact workspace**. The panel-fit calculation accounts for that larger task surface and can temporarily remove another panel from the visible slots; Compact restores ordinary space accounting and normal slot placement. This favors a usable task workspace over retaining every prior panel alongside it. Expansion grants no additional access or mutation authority.

**Reason / tradeoff:** Improve the concrete camp task without hiding rows or inventing unsupported transaction semantics. Explicit pages keep routine reads small while preserving access to later eligible choices. Cold-index/native-bag costs and broader search need their own evidence. [Current bounded evidence](../verification/parallel-batch-01-playable-week-engineer-4.md#pw04--native-inventory-and-partial-browser-checks) covers native 250-owned/230-private-granted discovery, exact transfers and contents/offer fences through `4f86b1e1`, with partial actual layout/draft observations. Final current-server, large-content and input acceptance remains in PW04. Implementation: [inventory-view.ts](../../apps/server/src/inventory-view.ts), [inventory.tsx](../../apps/client/src/ui/inventory.tsx), [shared destination picker](../../apps/client/src/ui/inventory-destinations.tsx).

<a id="iw02--proposed-invention-workspace"></a>

## IW02 — Invention workspace

**Current — native evidence 2026-10-02; final browser/stream qualification pending · Restrictiveness: Very safe for direct editing, Safe for presentation.** [PW11](../maintainers/parallel-batch-01-playable-week.md#pw11--inspectable-and-editable-invention-workspace) supplies all seven current authoring kinds with exact saved-revision inspection, history and structural comparison. Direct structured human edits cover recipe fields supplied by installed native family metadata only; other kinds retain conversational revision and current exact review. Changed fields without editor metadata remain accessible as scoped exact values, without a second model summary or invented mechanical claim. Revision history and reviews for one exact draft/revision return **20 entries** with **21-row lookahead** and explicit continuation; they do not scan the latest session review page to infer that an old revision has no review.

The server rejects new human Save, Prepare, review decisions and Apply while that session has an active or recovering turn or unanswered question. Read-only inspection, native Preview and Check remain available when current disclosure permits them. Reconciliation of an earlier exact Save/Prepare/Apply receipt precedes new-mutation admission; retaining a request identity grants no new authority. Existing [session/revision/record/operation quotas](inventions.md#reviewed-authoring-and-remaining-usage) remain; no extra retained-history cap or automatic deletion.

Local recipe fields and saved-work selection persist on the device under world/access/session/draft/revision scope, with explicit Keep editing/Discard on a dirty selection change. Retained fields absent from refreshed family metadata remain inspectable and block a new Save/reapplication rather than being silently dropped. Save creates a new immutable revision through the existing owner. A stale revision preserves attempted input but requires inspection and deliberate reapplication to the newer base; a saved edit needs fresh validation/review and cannot inherit another revision's approval. Native preview, checking and structured editing need no provider call. Ordinary players receive permitted learned-recipe output, materials, facts, limitations and native Craft, without creator controls.

**Reason / tradeoff:** Make corrections and comparisons practical without a parallel server draft store, paid rewrite for numeric changes, or races between two writers. A player may prepare local changes while a turn runs, but new mutations wait for the native gate to clear. Recipe-only forms avoid pretending arbitrary policy payloads have validated human templates. [Current native evidence](../verification/parallel-batch-01-playable-week-engineer-4.md#pw11--exact-saved-work-and-native-receipt-authority) covers V2/history/receipt/gate/reopen and expiry/delayed-title revocation with `b4580543`; local-field preservation is reviewed through `51ebeafa`. [Task brief](../projects/parallel-batch-01-playable-week/invention-workspace.md) defines remaining actual browser/stream, deployment and broad accessibility qualification. Implementation: [saved-work view](../../apps/client/src/ui/world-agent-work.tsx), [recipe editor](../../apps/client/src/ui/world-agent-recipe-editor.tsx), [native owner](../../apps/server/src/world-authoring.ts).

## IW03 — Creator editor layout

**Current — source rechecked 2026-10-03; bounded browser evidence retained · Restrictiveness: Safe (presentation only).** The shared creator editor is at most **860 × 700 logical CSS pixels**, clamped in each dimension to the dynamic viewport minus **24 CSS pixels**, divided by the current HUD scale. Its content scrolls inside the editor; header and Save/Discard actions have separate layout rows. At **560 logical pixels or narrower**, the section navigation becomes a horizontal icon row with accessible names, meter fields reflow, and footer controls wrap. Resize/drag clamping keeps the rendered window within an **8 CSS-pixel** edge margin. These are layout choices, not minimum device dimensions or limits on authored meters, values or history.

The invention Work list/detail uses a scaled-viewport scroll allowance of `max(180px, 100dvh / ui-scale - 180px)`; two panes appear at **700 logical pixels**. Recipe and Work actions remain in reading order instead of covering focused fields with a sticky row. [IW01](#iw01--inventory-task-workspace) and [IW02](#iw02--invention-workspace) retain the workspace and revision scopes. Meter values, ranges and permissions come from native projections under [ST17](state-effects.md#st17--passive-meters-and-configured-body-services), not these CSS dimensions.

**Reason / tradeoff:** Fit scaled and narrow views without reducing text size, hiding authorable content or adding an independent mutation path. Scrollable content and one-pane layouts trade simultaneous visibility for reachable fields/actions; the exact dimensions are not proven optimal. [Existing browser evidence](../verification/parallel-batch-01-playable-week-engineer-4.md#pw07--real-alternate-world-ui-final-pairing-pending) includes the native meter editor at 390 × 844 and 130% component UI scale. Full browser/text-zoom, long-content/focus and assistive-device acceptance remains in [PW07](../maintainers/parallel-batch-01-playable-week.md#pw07--world-configured-survival), PW04/PW11 and [UIUX](../maintainers/ui-ux.md); static source checks are not new browser qualification. Sources: [editor owner](../../apps/client/src/ui/editor.tsx), [shared layout](../../apps/client/src/design-system/layout.css), [Work layout](../../apps/client/src/ui/world-agent-work.css).

## NPV01 — Private NPC reply preview

**Current · Restrictiveness: Very safe (conservative disclosure).** [NP05](../maintainers/parallel-batch-02-foundations-and-usability.md#np05--read-npc-replies-before-generation-finishes) previews only a complete strictly validated first operation when it is independent directed speech to the requesting player, with current clear hearing, visible observer-safe speaker attribution and active conversation membership. Background/other-recipient/later-operation/partial-hearing replies and unsupported adapters wait for final admission. No partial string or first-token promise. [Evidence](../verification/npc-reply-preview.md) qualifies the configured Macrofold fast/complex route after an authorized local Jev correction. The visible pending indicator is only the existing dots, with accessible waiting information retained.

Keep one volatile current snapshot per actual running attempt (plus one cleared terminal snapshot for reconnect) and one replaceable queued snapshot per authorized connection. Release prepared-world/parser closures when the attempt ends; completed or failed decoding releases its parser immediately. Reuse current operation/level/adapter limits: 16 operations, 1,200 speech characters, at most 1,000,000 decoded decision bytes; enabled invention adds at most 80,000 bytes to the level envelope for its separate bounded proposal. The incremental library parser's integrity wrapper permits depth 32 and 256 keys per object, enough for current schemas with bounded overhead. These limits are unchanged by the replacement of the custom lexer. Native stream framing permits at most 4,000,000 wire bytes and a 1,000,000-byte frame to cover escaped JSON envelopes plus final result, with no token archive. Overflow withdraws presentation and never spends on repair. Shared private delivery uses the existing 250 ms coalescing cadence, 128 KiB snapshot frame, 15-second heartbeat, 30-second blocked-consumer closure and configured connection cap ([WS01](inventions.md#ws01--world-agent-stream-delivery)). These transport bounds do not cap real speech audiences or establish server capacity.

Lifecycle changes, rather than provider chunks, publish snapshots. No durable preview table, saved draft speech or new paid request. Final schema validation, native admission and actual heard history remain authoritative; correlation uses existing public message IDs after native utterance resolution. Talk's fixed message/volume/input layout follows [CV01](#cv01--conversation-reading-space) below.

**Reason / tradeoff:** The existing structured response lets the model select recipients and private operations. Closed-operation validation and current authorization reduce premature disclosure risk at the cost of latency benefit and supported situations. A separately accepted server-bound public reply contract is the expansion trigger for safe partial-string delivery; property order alone is insufficient. The [feature/design](../projects/completed/parallel-batch-02-foundations-and-usability-feature-spec.md#np05--read-npc-replies-before-generation-finishes) defines the gate, lifecycle and acceptance. [AI execution](ai-execution.md) and [narration](narration.md) retain broader work/retention limits. Expansion to another route/caller requires its own real-provider feasibility and disclosure qualification. Lexer/framing caps can expand when a supported schema exceeds them, with bounded-work evidence; their current values do not establish population capacity.

## CV01 — Conversation reading space

**Current — browser verified 2026-10-03 · Restrictiveness: Safe for presentation.** The desktop conversation dock targets 420 CSS pixels of height, constrained by its top/bottom HUD insets. Narrow/short layouts give the conversation the sheet below a 70px top reservation and above the bottom range-control strip ([RG01](#rg01--perception-range-guide-display)); tight windows reserve the full remaining reading area. These dimensions follow user UI scaling. The input grows to a 64px visible envelope before its own text scrolls; there is no new message-content cap. The volume rail is 24–104px high with a 44px-wide interaction area and a 32×24px thumb. Three stops expose the existing authored speech presets, not a new hearing rule.

**Reason / tradeoff:** Fixed mode controls, volume and input leave messages as the primary reading scroller. This replaces the previous nested controls/history scroller, which preserved the input but made volume controls disappear and left too little reading space. Opening Conversation may cover part of the condition card or world; hiding it restores that space. The input envelope reserves useful message/slider space under enlarged text. Reassess the sheet/insets for measured software-keyboard or safe-area failures; do not impose a total history or draft cap.

[Current UI owner](../../apps/client/src/design-system/README.md#conversation-reading-layout) · [Implementation](../../apps/client/src/design-system/layout.css) · [Evidence](../verification/multiplayer-entry-maintenance.md#conversation-redesign--october-3-2026).

## RG01 — Perception range-guide display

**Current — native/browser checked 2026-10-03 · Restrictiveness: Safe for sampled presentation.** The inner sight guide reuses `VISION_FOCUS.clearFraction = 0.6`; it adds no observation tier. Field sampling uses 128 angular rays, 32 shared radial rings and 8 binary refinements per sampled crossing. The grid contains 8,064 base triangles per band; clipping can split one into two. Native center and edge-midpoint checks reject hidden or unsupported triangles. Full-cell interiors and shared edge samples reuse native classification across bands within a build. Changed projections coalesce with at least 100ms between completed builds; camera motion uses cached points and disabled guides do no field work. Cached graphics translate each frame with the displayed foot; movement beyond 0.04m from the last sample schedules a rebuild. This replaces the 250ms cadence to reduce walking jumps, at increased calculation frequency; clipping/topology can still change discretely. Calculation yields between grid/sample/triangle batches with a nominal 4ms slice budget. Previous graphics remain visible until the result is complete; changed map/disclosure, support/senses, world/timeline/access or controls cancel pending work and clear obsolete graphics. Individual queries, garbage collection and graphics replacement can exceed that budget; it is not a hard frame deadline.

A 0.05m support-height tolerance prevents triangles spanning discontinuous support sheets. Remaining mesh edges form closed outlines around each displayed patch and hole. Map boundaries now close the clipped display area; they are not invented sensory thresholds. This replaces the former 3m chord-join limit and deliberate contour gaps so the tint and boundary agree. Sampling can still miss narrow occluders/openings; no arbitrary bridge joins separate patches. The surface-selection/reference-body approximation is owned by the [current feature contract](../spatial-world.md#display-approximation-and-updates).

All boundary cores are **0.018m** wide (previously 0.0375m), lifted 0.035m from sampled support to avoid z-fighting. One static halo uses 3× core width and 0.025 opacity; core opacity is 0.38. Band brightness is 0.92/0.58/0.34. Hearing dashes retain a 0.7m stroke and 0.4m gap. Each sense's outer area has **0.006 opacity**; inner bands add no extra fill. Boundary hover has a 6 CSS-pixel tolerance and follows the existing 20Hz world-hover cadence; it loses to world objects, camera obstruction and UI. Fills and lines remain depth-tested, nonanimated and non-pickable.

**Reason / tradeoff:** Closed, matching fills and outlines make the reachable area legible even when its edge is off-screen. Native checks and bounded sampling remain outside the frame loop. Filled triangles cost more than the former isolated contours: current matched local measurements and broader calculation/device qualification are in [verification](../verification/perception-overlays.md#connected-outlines-and-faint-fills--october-3-2026) and SW09.4b. [Current walking evidence](../verification/embodied-feedback.md#guide-and-escape-costs) records frame-following graphics, cooperative calculation slices and separate replacement costs. These values are presentation choices, not proven optimal accuracy or a hardware guarantee. Geometry-query work still grows with already-public surface/blocker count; entity population and sound-source lists are excluded. No geometry-count truncation or gameplay range clamp is introduced. Reassess sampling or move calculation off-thread when measured fidelity or main-thread latency warrants it; do not quietly substitute new perception rules.

[Calculation](../../apps/client/src/perception-field.ts) · [Graphics lifecycle](../../apps/client/src/perception-overlay.ts) · [Measured evidence](../verification/perception-overlays.md).

## AP01 — Ordinary action discovery

**Current — PG03, reviewed October 4, 2026 · Restrictiveness: Safe.** Context queries remain selected-subject reads; the explicit complete catalogue enumerates all supported known choices over permitted current possessions, recipes and perceived targets. It has no relevance top-k, paid ranking, universal equipment score or stored-content quota. Exact weapon/projectile commands and display facts come from existing native owners. Unknown techniques, hidden targets and another character’s private knowledge remain unavailable.

The picker requests on opening, explicit refresh and possession/pause/authority/timeline changes, without polling. Existing rows retain their opening order; newly discovered identities append. It initially renders 40 matching choices; **Show more choices** adds 40 and focuses the first added command. Search visits the complete permitted result, including its visible target/tool identity, and retains the existing 1,000-character bound. Refresh retains the reading window; deliberate search or catalogue-scope changes reset it. Enter chooses a displayed available action or the existing grouped pickup choice. The menu uses the existing panel width, viewport insets and bounded vertical result scrolling; long names/reasons wrap. Persistent details are accessible separately from the command, with hover supplementary; their bodies render only while expanded. Failed reads suppress old commands/details rather than certifying an empty catalogue. Expected selected-item/target loss returns a safe 400 explanation; unknown service exceptions remain generic. Facts describe the last completed permitted read, and execution independently rechecks current conditions.

Full and selected-item discovery bypass the compact offer builder's six-lot/default top-level selection, using all permitted accessible possessions or only the exact selected item. The complete catalogue includes every fuel lot rather than one per definition. Accessible nested lots are included; inaccessible contents cannot return selected-item details. Compact/NPC defaults and native admission are unchanged. Request-scoped definition, target, item, recipe, tool-name and ammunition lookups are reused across candidates; no persistent authorization or preview cache is added. Client target filtering follows changes to visible identities, while current entity data still updates subject/icon presentation; position-only patches do not repeat catalogue/search filtering.

Cooking discovery requires choosing an exact perceived fire; inventory no longer offers the implicit-fire shortcut. Preparation explicitly discloses its existing supply-based, cross-lot consumption. These are presentation/selection boundaries, with native command admission unchanged.

**Reason / tradeoff:** Rendering 40 choices initially bounds initial row/detail work without hiding content, but deliberately showing all rows can still grow the DOM. Complete target-by-tool/resource discovery and structural previews remain proportional to supported combinations. [PG03 review evidence](../verification/player-clarity-ui.md#requested-review-follow-up--october-4-2026) records its historical workloads and interference. [PG04 evidence](../verification/command-frame-spikes.md#pg04-preview-work-and-larger-load-follow-up--october-4-2026) demonstrates cheaper offer refusals and omitted discarded drop-preview records, with an equivalent 1,443-choice native warm median of 272.42 → 175.87 ms. The actual Metal browser's 5,291-choice sample still takes 1.36 seconds to open and a 1.28-second median to refresh. Accepted offers/structural transfers and repeated inventory detail reads retain cost; PF05 owns comparable complete-path tails, longer runs and physical-device qualification. This introduces no stored-inventory, target or catalogue cap. Remapping, native IME, assistive devices and full accessibility remain open.
