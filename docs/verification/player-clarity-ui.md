# Player clarity UI verification

Branch `codex/player-clarity-ui` from `origin/main` `be68b1e0`, under the [player clarity plan](../projects/player-clarity-ui.md). Evidence is manual browser and direct-request observation on a disposable world, not automated regression coverage.

**Environment (all sections unless noted):** macOS host, local PostgreSQL 14 disposable database `openlegend_playerclarity_20260928`, `OPEN_LEGEND_GOD_MODE=true`, `AI_BUDGET_USD=0`, no provider keys (no model calls possible), local loopback authentication, development server with Vite middleware (hot reload unavailable because another worktree held the HMR port; pages were reloaded manually). Browser: the Claude desktop browser pane at 1280×860 (desktop) and the 375×812 mobile preset. Paid provider cost: **$0**.

## E05 — searchable subject picker

**Setup:** 46 people spawned through the god person route within ~14 m of Mike, plus the bundled Ada, two hares, a deer and a bird. Time resumed briefly so the character's current sightings refreshed.

**Results:**

- The private mind panel (Character → My thoughts and relationships) now shows a searchable combo box. The first request returned 40 observer-labelled subjects plus a continuation; scrolling or pressing ArrowDown to the end loaded the remaining 9. Two pages had 49 unique subjects with no duplicates. The former first-40 cap would have hidden 9 of them.
- Labels were the character's own (“a person”, “a hare”) with status and distance (“In view · 7 m away”). Searching “Tester”, the spawned people's global name prefix, returned nothing.
- Keyboard only: typing a query, ArrowDown and Enter selected a person on the second page. Naming them “Tomas” and saving a note persisted; a later search for “tom” found “Tomas · has notes”, and reopening the panel loaded the saved name and note through the exact-subject lookup (the note editor previously looked only at the current notes page).
- Stale rows are cleared as soon as the query changes, so keyboard selection cannot pick a result from the previous query.
- Direct requests: another actor's ID on the owner route → 403; malformed cursor → 400 “Invalid people page. Search again.”; a cursor reused with a different query → 400 “People changed. Search again.”; the god route for an NPC returned its own observer-scoped subjects.
- God inspection of Ada rendered both pickers (note editor and authored feeling).
- Mobile preset: the list fit within the 375 px viewport (no horizontal page scroll); it opens above the field when there is no room below.
- Saving from a tab that had lost character control was refused with “Control changed. Choose Take control to continue.” (existing authority behavior).

**Limits of this evidence:** only one human account exists in local mode, so a second human's private mind was not requested through the god route (the route reuses the same `mayInspectPrivate` rule as `/api/god/mind`). The disabled “notes only” state for authored feelings needs an NPC that lost recognition of a noted person and was not exercised. Request latency was 44–131 ms with the world running at 1× and 49 visible people; no large-crowd measurement was made.

## R04 — merge targets beyond the page

**Setup:** fresh disposable world (the database was recreated after the E05 run). God mode added 60 small stones to Mike; 46 one-stone lots were split off through the inventory's own split actions (native `split-item` commands from a local setup client), giving 52 inventory lots: 40 on the first page and 12 on the second.

**Results:**

- A stone lot on the second page listed 40 matching lots with **Search more lots**, then 6 more on the next window: all 46 other stone lots, 35 of them on the first page, none repeated and not the lot itself. Before this change that lot could only offer the lots on its own page.
- Merging it into a first-page lot from the UI succeeded (“Possessions updated.”); stone lots went from 47 to 46 and one lot became × 2. The list now returns to its first page after any inventory command, because the command invalidates a later-page cursor.
- The equipped knife and a lot with a declared owner offered no merge targets, and the declared lot was excluded from other lots' targets (the old client filter compared only definitions and would have offered it, leaving the server to refuse).
- Refusals are now readable 400 responses instead of a generic 500: another character's inventory → “This container is unavailable.”; a normal page cursor reused for merge lookup → “Contents or access changed. Refresh this container.”
- Mobile preset: the merge select spans 17–358 px of the 375 px viewport with no horizontal page scroll; the native select, Merge and Search more controls are keyboard-reachable buttons.

**Limits:** containers with more than 200 children need several **Search more lots** presses; no large-container timing was measured. The browser pane was hidden during part of this run, so the world paused itself shortly after each resume (presence behavior); the merge was issued immediately after resuming.

## BW11 — very large piles

**Setup:** one ground pile near Mike built through the god item route: one stack of each of 11 base items plus woven bags (each bag is its own stack), first 261 stacks, then 1,001.

**Hover card:** with the pile centred, near the bottom edge and near the right edge, the card showed the pile name, the first 8 stacks and “+253 more · Look closer lists all 261” (later “+993 more … all 1001”). Near the bottom it flipped above the pointer (card 616–816 px in an 860 px viewport); near the right edge it flipped left of the pointer (985–1182 px of 1280). Before the change the card always opened below-right of the pointer with every stack, so it ran off the bottom of the screen. A flipped card initially rendered under the camera toolbar; it now renders above the HUD (it ignores the pointer and never coexists with the action menu).

**Complete lists:** keyboard only, focusing the pile's In view row and pressing Enter opened the detail listing all 1,001 stacks, with keyboard-reachable Pick Up All and per-stack pickup buttons. A context-menu event on the In view row opened the action menu, and **Pick Up ▸** opened the searchable list of 1,002 options (Pick Up All first). Shift+F10 from the browser tool did not produce a context-menu event, so the keyboard menu route itself was not exercised.

**Measurements (DOM commit time via a mutation observer; the browser pane was hidden, which throttles animation frames and timers, so paint timing was not usable):**

| Build       | Pile size | In view detail                     | Pick Up pullout open | Search keystroke                      |
| ----------- | --------- | ---------------------------------- | -------------------- | ------------------------------------- |
| Development | 1,001     | 158–288 ms (small entity: ~12 ms)  | 659 ms               | ~410 ms narrowing, ~394 ms clearing   |
| Production  | 1,001     | 130–187 ms (small entity: 9–13 ms) | 438 ms               | 109–157 ms narrowing, 268 ms clearing |

The state snapshot was 129 KB with the 261-stack pile and 327 KB with the 1,001-stack pile (the pile alone ~267 KB: every stack plus one pickup option each). God item creation into the pile slowed from ~69 ms to ~314 ms per item as it grew. Virtualization was not added; the measurements and trigger are recorded in [HV01](../limits/interface.md#hv01) and the large-pile benchmark item in [TODO](../maintainers/TODO.md#base-world-items--deferred-automated-validation).

**Short viewport:** at 1280×420 the Pick Up pullout was clamped to 396 px but its fixed 384 px list extended past the bottom of the viewport (list bottom 481 px). The popover is now a flex column and the list shrinks: list 87–407 px, popover 12–408 px.

**Limits:** host load from other work made early paint timings meaningless; only commit times are reported. Touch devices have no hover; they use In view and long-press/right-click as before.

## C11/E02 — older history and bounded search

**Setup:** same disposable world, run through a scratch in-process harness (not committed) that starts the real game server and issues native `say` commands for non-player characters, so other characters' speech could be produced without any model call. Ada spoke three lines near Mike (twice); a person 9 m away spoke two lines; a person 16 m away whispered “Meet me at zephyrwind hollow when the owls call” and said “The zephyrwind hollow hides quartzite tools”. Mike perceived the far lines only partly: “Meet […] at […] owls call” and “[…] hides quartzite tools”. Later filler lines (115 from Ada before she died of hunger, then about 2,000 from the 9 m speaker, paced after a tight loop hit the server's “busy” admission limit) pushed an earlier “obsidian needle” line more than 2,000 rows back in that speaker's own perspective.

**Speech search (`/api/world-events?type=speech&q=…`, UI and direct):**

- “moonflower” and the prefix pair “moon river” found both moonflower lines; “silver”, “flute”, “owls” and “quartzite” found their lines.
- **Privacy:** “zephyrwind” and “hollow”, spoken but never heard by Mike, returned nothing; “Farwhisper”, the hidden global name of a speaker Mike knows only as “a person”, returned nothing.
- Punctuation-only input → 400 “Search needs at least one letter or number.”; nine words → 400 with the word limit.
- **Continuation:** in the listener perspective holding 2,104 speech rows, the first “obsidian” search examined 2,000 rows in 184 ms, found nothing and returned `scanLimited` with a cursor; the next request found the needle in 29 ms. (Run directly against `readPerceivedEvents` in the harness because the player character had collapsed from hunger and stopped perceiving the flood.)
- UI: the World Events Speech filter search showed “1 match for “owls”” with the partly heard line, and “0 matches” for “zephyrwind”.

**Memory history (`/api/memories`, UI and direct):** Mike had 1,067 eligible memories; 54 pages returned all of them with no repeated ID. Searches matched only displayed memory text (“zephyrwind” none, “owls” the partial line, “moonflower” two). Another actor's ID on the owner route → 403; a malformed cursor → 400; a cursor reused with a different search → 400. In the Character panel the recent 20 extended to 24 and then 44 through **Older memories** (the first page overlaps the live snapshot and is deduplicated), and searching “moonflower” showed “2 memories matching “moonflower””. God inspection of a non-player character showed 20 memories in **Memory and thought history**; **Private thoughts only** showed an honest empty result (no model-produced thoughts exist in this world). Memory continuation measured 107 ms for a 2,000-row window without a match and 21 ms for the next request.

**Existing pagers:** Journal **Older entries** loaded 40 → 80 → 120 entries; Talk **Older messages** with the far speaker loaded 42 → 82 messages.

**Narrow width:** at 375 px the memory search form spans 13–338 px with no horizontal page scroll; the event search uses the same wrapping layout.

**Limits:** the browser pane was hidden during this stage, which throttles page timers; checks were driven through DOM events and mutation-free polling rather than screenshots. Scan timings are from one busy development host. Reflection thoughts (at most 100 retained) were not produced because no model runs; their existing full display was not re-exercised.

## Caption gap notice

**Setup:** the scratch harness produced native speech from Ada (revived by the god Revive action after she starved) while a headless Google Chrome instance (Playwright `channel: 'chrome'`, fresh temporary profile, 1280×860 and 375×812) viewed the game; the desktop browser pane was hidden and suspends rendering, which the caption overlay needs. Mike had collapsed from hunger and was restored with the **Recover at camp** action so he could hear again.

**Results:**

- A six-line burst from one identified speaker: three captions entered the per-speaker queue and the notice read “3 speech captions weren’t shown.” with **Read speech history** and a dismiss button.
- Keyboard: focusing **Read speech history** and pressing Enter opened World Events with the filter set to Speech and hid the notice; the dropped lines were listed there.
- **Dismiss** hid the notice and moved focus to the world canvas.
- **Reconnect gap:** with the browser offline, two lines were committed; after reconnecting, the reset snapshot's unseen lines (plus captions still queued when the reset cleared the overlay) raised the notice again (“6 speech captions weren’t shown.”) and no caption was replayed.
- **Hidden tab** (simulated by overriding `document.hidden` and dispatching `visibilitychange`, because headless background tabs stay visible): two lines spoken while hidden → “2 speech captions weren’t shown.”, no captions replayed on return.
- A six-line burst of the player's own speech showed a caption and raised no notice.
- **Narrow width:** first placed above the quick actions, the notice overlapped the camera toolbar; it now sits between the launcher rails below the time bar (76–299 px wide, 296–422 px down, toolbar starts at 656 px) with no horizontal page scroll, and captions are placed around it.

**Limits:** a real browser hidden tab defers the report until the tab is visible again (the report flushes from the render loop); the simulation above exercises the counting, not the browser's own throttling. Screen-reader announcement was checked only structurally (one persistent `role="status"` region with a fixed sentence); no assistive technology was run. Speech that leaves the 60-event live window before reaching the tab is only flagged as “possibly more”, and the flag's turnover detection was not provoked.

## BW17 — read-only promises

**Setup:** Mike's promises were spoken through native `say` commands issued by the scratch harness (the Talk composer only speaks natively to other humans; no model call exists in this world). Gathering used the native `gather` command on the camp's river stones at 8× speed. The Journal was viewed in headless Chrome.

**Results:**

- “I promise to gather stone”, “I promise to help you” (to Ada) and “I promise to gather 2 stones.” appeared as 3 of 16 open. Only the first read “Kept automatically when you gather Small stone.”; the other two read that the world does not check them automatically. Ada appeared as “a person” because Mike never learned her name.
- After gathering, the first became **Kept** with “You gathered Small stone.” and the game time; the count dropped to 2 of 16.
- Two rounds of 14 stone promises each kept by one gathering produced 29 kept promises: the Journal showed 2 open plus 20 past, and **Show earlier promises** (focused and pressed with Enter) loaded the remaining 9 with no repeats.
- Filling the open slots: of 15 further unsupported promises, 14 were recorded; the section read “16 of 16 open. New promises are not recorded until one is kept.” and the world held exactly 16 unresolved obligations.
- Overdue and cancelled (set through the existing raw `/api/commitment` amendment route, because the list deliberately offers no amendment) read “The deadline passed.” and “Cancelled. This does not mean anyone else agreed to release you.”; wording that implied a cancelled promise “stays open” was fixed during this check.
- The list was identical after a server restart (16 open, 29 past). A request body naming another actor was rejected (400); a past-page cursor from an earlier control session and a malformed cursor were refused with readable 400 messages.
- At 375 px the Journal had no horizontal page scroll; long promise text wraps.

**Limits:** only one human exists locally, so cross-account denial is by construction (no actor parameter) rather than a second-account request. Promises made by an NPC through model output were not produced.

## Reaction bubbles

**Precondition checked:** accepted gestures already exist as committed `expression` events (seven fixed verbs admitted by `commitActorResponse`, no mechanical effects) and reach a viewer only through that viewer's perceived-event projection. The overlay therefore proceeded (the tracker's “record the gap and stop” branch did not apply).

**Setup:** the scratch harness committed Ada's gesture responses through the real `commitActorResponse` admission path inside a normal service transition (no model call); headless Chrome watched at 1280×860.

**Results:**

- Ada waving toward Mike showed an italic “Waves toward you” above Ada for about 4 s; the polite live region read “a person Waves toward you” (Mike does not know Ada's name).
- Ada nodding toward a newly spawned person Mike had never named showed “Nods toward a person”. The same gesture in World Events read “a person nods toward Quillon.”, exposing a name Mike never learned; this pre-existing disclosure is recorded in [TODO](../maintainers/TODO.md#future-character-reaction-bubbles).
- A gesture toward a person Ada could not see was refused by admission and produced nothing.
- After expiry no notice remained; reloading the page did not replay old gestures.

**Limits:** no model produced gestures (live cognition is unconfigured); overlap with simultaneous speech captions and work bars, narrow-width edge clipping and assistive-technology output were not qualified. Notices use the overlay's existing wall-clock lifetime and have no on/off preference.

## Review follow-up

**Review:** a five-part review of the whole branch (privacy and authority, server correctness and performance, client correctness, accessibility and layout, documentation), with a second reviewer trying to refute each finding. Confirmed findings were fixed and rechecked on the same disposable world after a server restart, through direct requests and headless Chrome (1280×860, 375×812 and 340×740). One reported race, a promise listed twice or not at all while a tick lands mid-read, cannot occur: the HTTP dispatcher holds the mutation lane for the whole promise read. A defensive duplicate filter was still added.

**Server results:**

- **Search no longer depends on the database locale.** Words are now matched in JavaScript after normalization, instead of by PostgreSQL's parser, which under this database's C locale glued non-ASCII punctuation to words and did not lowercase accented capitals. A nearby character said “Wait—Burst the dam, Éloise…really?”. The player had collapsed from hunger and was out of earshot, so the check read Ada's perceived events through the same server function and Ada's memories through `/api/god/memories`. `burst`, `burst dam`, `éloise`, `ÉLOISE`, `really` and `wait` all found the line. `eloise` without the accent did not, as documented. The player's earlier searches (`burst`, `owls`, `moonflower`) still matched; `zephyrwind` (unheard) and `quillon` (a name never heard) found nothing.
- **Search continuation works for long searches.** Cursors now carry a digest of the search words instead of the words themselves. With a 160-character authority scope a continuation cursor measured 464 characters whatever the search length. Reusing it for a different search was refused (“This event page expired. Refresh the event log.”). Before this fix, ordinary 6–8-word searches produced cursors longer than the 2,048-character limit, so **Search older events** failed.
- **The private-thoughts filter is bounded.** For the player (2,008 retained memories, no private thoughts) the first request examined its 2,000-row window in 38 ms and offered continuation; the continuation finished in 10 ms. Before this fix the filter could walk the whole history in one request. Plain paging still returned all 2,008 memories exactly once.
- **Promise count matches admission.** The Journal read “15 of 16 open.” with the server's admission count equal to the listed open promises.

**Client results:**

- **Memory history:** the first **Older memories** press now replaces the live snapshot with two history pages (20 → 40 rows), and three presses gave 80 rows with no React duplicate-key warnings. Before, same-time memories could repeat after the second press. Keyboard focus stays on the button while it loads, because busy load buttons now use React Aria's pending state instead of being disabled.
- **Notes:** after saving a person's notes, “Knowledge updated.” and the saved text stay on screen while the notes reload. Searching the picker for `zzzz` shows “No one this character knows matches “zzzz”.”
- **Missed-caption notice:** World Events was open with a search for `owls`. Three lines were missed while the tab was hidden, and the notice read “3 speech captions weren’t shown.” Activating **Read speech history** with the keyboard cleared the search, chose Speech, moved focus to the event-type filter and settled the notice. Closing and reopening World Events showed All again, as before this branch. After another miss, turning captions off hid the notice, and turning them back on did not bring the old count back.
- **Narrow layouts:** at 375×812 without a panel the notice sits between the launcher rails at (76, 296)–(299, 422). With the Journal sheet open it moves over the sheet's header at (12, 373)–(363, 453), below the open-panel tabs (325–365), so the tabs stay usable; the sheet's own title and close button are covered until the notice is opened or dismissed. At 340×740, where the rails become a row, it sits below the launcher row at (12, 342)–(328, 422), or below the tabs at (12, 390)–(328, 470) with a sheet open. In every case **Read speech history** was hit-testable and there was no horizontal scroll.
- **Merge targets:** pressing **Search more lots** with the keyboard keeps focus on the button while the next window loads, instead of dropping it to the page. When the last window loads the button is removed and focus returns to the page. **Show earlier promises** behaves the same on its last page.

**Second focused review:** a review of the fix commit alone confirmed 11 smaller issues, all fixed and rechecked:

- Speech search now reads its matches, and the bodies loaded for them, in one read snapshot. A match whose row vanished mid-read now gives “History changed while loading. Refresh the event log.” instead of a generic invalid-input error.
- A window that ends exactly at the oldest row no longer offers an empty “search older” step. With a stub reader, 1,999 and 2,000 remaining rows reported no continuation and 2,001 did.
- “izmir” and “İZMİR” find “İzmir” (lowercasing İ adds a combining dot that is now folded). Speech and memory searches, one-row paging and the promise count were rechecked through the routes after the change.
- The notes editor is no longer remounted by a save when the private mind has several pages. On Quillon's mind, paged by 25 creator-authored feelings, saving notes about a chosen subject kept the choice, the “Knowledge updated.” message and the editor. Editing now waits for the refreshed revisions after a save, and a successful retry clears the old load error.
- Memory history: **New memories — refresh** cancels a page still loading, a memory arriving during the first load now offers the refresh, and clearing a search while it loads no longer leaves the panel busy.
- With a sheet open on narrow screens the notice no longer covers the open-panel tabs (see above).
- The Promises list no longer says “You have not made a promise yet.” while unlisted commitments count, and it explains when those fill the limit.

**Documentation:** corrected claims that corrected memories are hidden (they stay visible as witnessed history), that search can never reveal hidden names (it adds nothing beyond displayed text, which still has the tracked gesture-name leak), that subject pages never repeat, the promise count rule, World Events filter ownership and the promise design's method name. Two MH05 links that had been pointed at MH08 were restored, and deferred automated coverage is tracked in the [TODO](../maintainers/TODO.md#player-clarity--deferred-automated-validation).

**Limits:** no automated tests. Search timings come from one host and one small world. Assistive-technology output was not checked.
