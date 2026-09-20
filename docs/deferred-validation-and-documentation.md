# Deferred tests and documentation

For the remainder of this session, implement requested changes without adding or updating tests and product/developer documentation for each change. Record that deferred work here instead, then complete it in batches when requested. This session instruction supersedes the repository's usual per-change test/documentation workflow.

Lightweight implementation checks may still be run when useful. Record exactly what was checked; do not describe deferred testing as completed. Existing tests may temporarily reflect superseded behavior; identify those cases explicitly.

## Pending batch

Changes through the movement-start journal filter already received their applicable tests and documentation updates.

### Contextual Invent suggestion and single clear control

- **Change:** `apps/client/src/action-browser.ts` offers a sparkle **Invent** row for nonempty searches with no available matching actions, after successful catalogue loading. Click or Enter opens the invention composer with the search text as an editable draft; it does not submit AI work. The row is absent for empty searches, available matches, failed initial loading or disconnection. Relevant unavailable matches can remain below it under the saved toggle. Removed the menu-close X; a normal styled X clears search and restores focus. Outside click and Escape still dismiss the menu. `apps/client/src/style.css` suppresses the browser's native blue search-clear decoration and styles the sparkle.
- **Checks performed:** formatted the two changed source files; `pnpm run typecheck` passed. No tests written or run, and no browser verification performed.
- **Tests deferred:** update `tests/browser/actions.spec.ts`, whose unmatched-search Enter expectation now intentionally changes from keeping the menu open to opening an invention draft. Cover empty/matching/unavailable-only queries, draft text/persistence, no paid dispatch, loading/failure/disconnection, keyboard selection, single clear X visibility and styling, focus after clear, outside-click/Escape dismissal, and preserved notebook tab. Review menu screenshots and any close-button expectations in other browser scenarios.
- **Documentation deferred:** update README, action-discovery architecture and playability/interface proposal to describe contextual invention and the clear-only X; replace statements that invention is exclusively accessible through the main composer tab. Record batch verification once performed.
- **Known gaps:** runtime interaction and cross-browser clear-control rendering remain unverified; live AI availability still governs sending the draft.

For each subsequent change, append:

- **Change:** behavior implemented and affected files.
- **Checks performed:** actual checks and results, or none.
- **Tests deferred:** meaningful cases to add/update, including existing tests made stale.
- **Documentation deferred:** affected documents and decisions to record.
- **Known gaps:** unresolved behavior or verification limits, if any.

### Action search placeholder

- **Change:** `apps/client/src/action-browser.ts` now displays “Search actions or invent something…” as the search placeholder.
- **Checks performed:** verified and replaced the existing source string; no runtime checks.
- **Tests deferred:** verify placeholder wording and fit in the compact menu during the next browser batch.
- **Documentation deferred:** include the new wording in the contextual invention interface update above.

### Contextual conversation, quick actions and world-agent tabs

- **Change:** removed the always-visible bottom composer. Talk opens the existing NPC conversation UI on demand, with a pinned target and close/Escape controls; invention routes to a separate center-left World agent panel. Added `apps/client/src/quick-actions.ts` with three dynamic suggestions and three configurable browser-saved slots. Suggestions use server-projected hearing eligibility for Talk, energy below 35 for Rest, available food above 70 hunger, and eligible camp recovery. Existing actions remain authoritatively validated; suggested actions remain stable while hovered/focused. Personal slots configure through their gear controls and retain stable action IDs per world in this browser.
- **Domain change:** `canRecoverAtCamp` is shared by admission and public projection. Human players can recover when incapacitated, health is below 30, or fullness is below 20. Recovery raises health/fullness/energy to at least 65/45/65, preserving higher values. This is personal-playtest assistance, not resource-consuming medical care. Low food and low health are alternative triggers.
- **World-agent change:** `apps/client/src/world-agent.ts` retains independent conversation identities, drafts and user/status history in browser localStorage per world. New tabs share no draft/history. Right-click Invent creates a new tab and automatically posts `Invent this: <query>` once; opening/switching/reloading never auto-submits. `apps/server/src/http.ts` adds an authenticated, strictly validated `/api/world-agent/messages` route that returns explicit HTTP 503 `world-agent-unavailable` without remote dispatch, including when direct NPC/invention provider credentials exist. No Macrofold instances, remote session persistence or world context retrieval are implemented yet.
- **Checks performed:** formatted changed source; TypeScript passed after fixing chat-only narrowing; Vite client build passed. A manual check of the existing in-app browser initially showed a blank page during module updates; reload displayed the new launcher and three-plus-three slots with no persistent composer. Opening the launcher displayed the World agent panel and an empty local Conversation 1. No messages were submitted in this manual check, no paid AI was called, and no automated tests were added or run. Later minor recovery-floor and suggestion-stability changes were typechecked, but not rebuilt or browser-verified.
- **Tests deferred:** native recovery thresholds and preservation of higher needs; command/projection agreement; hearing blockers, absent/dead/out-of-range NPCs; dynamic ranking/slot limits and no retargeting during pointer/focus; personal-slot persistence, unavailable bindings and storage failures; transient NPC target identity and sending blockers; tab/history/draft isolation, server/world identity validation, world switching, async response routing, reload, duplicate submit prevention, missing/failed/uncertain responses, auto-submission only after explicit Invent, no direct-provider fallback or paid calls; keyboard and narrow-screen layouts. Existing action-menu tests now expect the superseded editable-draft flow, and gameplay tests still expect a persistent bottom composer; update these in the batch. Existing collapse-only recovery assumptions may also be stale.
- **Documentation deferred:** README, implemented architecture, extension guide, interface/quick-slot proposal (old five-personal-slot count), world-agent proposal and implementation status. The explicitly requested Macrofold handoff was written now in `docs/macrofold-world-agent-handoff.md`; broader docs remain queued. Earlier pending Invent-row entry is superseded on activation: it now auto-submits to a new world-agent conversation rather than filling the old composer draft.
- **Known gaps:** local-only conversation/slot storage, no remote agents or context engineering, no per-tab archival/deletion or cross-device sync yet; the current NPC chat backend supports Ada only. Whole-world access and concurrency/billing contracts in the handoff are future work. No batch acceptance claim.

### Character status label queues

- **Change:** new `apps/client/src/character-status.ts` provides a reusable `enqueue(characterId, text, tone)` queue owned by `WildernessScene.statuses`. Public player-inventory deltas produce signed quantities/names, including removed stacks; public action/result events add character updates such as Crafted, preparation, eating, rest, recovery and failures. An engine producer can emit a committed `character-status` event with actor ID/text through normal permitted event projection. Initial load/world changes establish a baseline without replaying old inventory/history. Text is inserted safely, never interpreted as markup.
- **Presentation:** labels follow the character/camera through the existing visibility-aware projection, with newest at top and oldest at bottom. Each remains for about four seconds, fades over 600ms, then remaining lines slide down. Simultaneous arrivals have staggered expiration (900ms apart). Queues retain at most 12 lines per character, expire even while paused/hidden, and are removed when the scene is destroyed. Inventory gains/losses have distinct text colors; labels do not intercept input.
- **Checks performed:** source formatting and TypeScript passed; no tests written or run and no browser verification. Final small additions (initially hide a new stack until positioned; include action-start/harvest result types) are source-reviewed only.
- **Tests deferred:** inventory additions/removals/stack merges, crafting consumption plus output/status, duplicate state/event delivery, initial/reconnect/world-change behavior, per-character isolation, simultaneous FIFO expiry/newest-first layout, camera movement/zoom, fully blurred targets, pause/background aging, bounded bursts, teardown, plain-text injection safety, reduced-motion behavior and layout overlap.
- **Documentation deferred:** architecture/extension guide for the status queue and permitted event producers; interface description and verification log.
- **Known gaps:** player inventory notifications currently reflect net changes between public snapshots, so opposing changes to the same item within one server batch can cancel out. A future committed item-delta feed should cover every intermediate transfer. Private NPC inventory is not disclosed. Generic events must appear in the existing bounded public event feed to reach this client; the queue is transient presentation, not durable history.

### Progress-bearing object statuses and visual refinement

- **Change:** `CharacterStatuses.upsert(entityId, statusId, {text, progress?})` updates stable entries without reordering; `remove` explicitly ends them. Progress below 100% persists indefinitely, independent of transient expiration, and active entries are not evicted by transient queue limits. Player activity now includes a stable action ID and friendly label in the public DTO; the existing work widget under needs was removed and feeds a status/progress entry instead. Rest start/finish notices were excluded from floating feedback, and generic accepted-work start toasts are suppressed. The API can target any rendered entity, while the current authoritative bridge is player work.
- **Visuals:** labels use white text with no background, a subtle shadow, and an optional white 4px progress bar smoothed by a 250ms CSS transition. Scene status anchors derive from the actual tilted sprite's projected bounds, not an estimated body height. Variable-height rows stack with a consistent 12px bottom clearance; paused work remains and cancelled/replaced work is removed. This is presentation interpolation, not predicted work.
- **Checks performed:** changed sources formatted; TypeScript passed. No tests added/run or visual browser verification for this change.
- **Tests deferred:** progress update identity and order, persistent partial progress through pause/occlusion, completion/cancellation/replacement, inventory notices alongside work, burst eviction preserving active work, first-load active work restoration, variable-height bottom spacing, animated sprite/camera bounds, smooth fills and reduced motion, absence of technical resting notices and old needs-panel progress. Update tests referencing the old work widget/action DTO labels. Generic building/task producers remain future integration.
- **Documentation:** explicitly requested UX guidance added now to `archive/03-design-proposals/playability-and-controls.md`. Remaining architecture/extension/status documentation and verification are deferred.
- **Known gaps:** the simulation still cancels/replaces work when another action is issued; resuming abandoned crafting/building requires authoritative persistent tasks, not retained stale UI. Existing inventory delta and bounded event-feed limitations from the previous queue entry still apply.

### Immediate completion removal and elapsed-time progress

- **Change:** completed/removed progress entries now leave the DOM and queue immediately. Player activity reconciliation occurs before inventory-delta notices, eliminating the completed work row's empty space. Generic progress at 100% also removes immediately; ordinary transient text retains its fade behavior.
- **Timing:** the public action DTO supplies duration, elapsed simulated seconds and whether work is advancing. Timed status entries maintain a real-time origin with the current simulated-seconds-per-real-second rate, update their fill every rendered frame, and freeze/rebase on pause or speed changes. Removed CSS fill transitions; normal snapshots no longer restart the animation. Only server action removal completes the player activity; the display itself never applies effects. Generic producers may supply the same timing presentation data for other entities.
- **Checks performed:** changed sources formatted; TypeScript passed. No tests written/run or browser verification.
- **Tests deferred:** gather completion followed by inventory addition without blank space; generic completion/removal; continuous fill over a known duration at each speed; pause/resume and rate switches; initial partial work restoration, approach-to-work boundary, network delay/reconnect and background throttling; timing drift correction policy and authoritative completion; overlapping transient/progress stacks. Existing progress/spacing cases from the preceding batch item still apply.
- **Documentation deferred:** replace the earlier UX/architecture description of 250ms CSS progress interpolation with elapsed-time animation and immediate removal. Transient notices still fade.
- **Known gaps:** the time origin is seeded from the first received work sample and rebased for clock-rate changes, so transport delay can leave a small visual offset from server time; authoritative action removal remains decisive. No networking/prediction guarantees are claimed.

### Opt-in action statuses; no walking status

- **Change:** public activity projection explicitly opts gathering, preparation, crafting, cooking, harvesting, resting and hunting into floating progress using `showStatus`. Walking and any future action not explicitly selected have no automatic progress status. The renderer removes a previous work status when switching to an excluded action. Movement remains authoritative and otherwise unchanged.
- **Checks performed:** changed source formatted; TypeScript passed. No tests added/run.
- **Tests deferred:** walking never creates a label/bar, switching work to walking removes its prior entry, listed work retains progress, and newly added action families default to no floating status.
- **Documentation deferred:** clarify that progress/status feedback is deliberately opted into per action, not automatic for every action.

### Circular tool rails and independent panels

- **Changed:** Inventory, Crafting and Character launch from the left; World agent and What's visible launch from the right. Panels toggle independently, have close buttons, and retain opening order outward from each edge. Desktop panels share available width; narrow screens scroll the dock horizontally. Quick actions use local circular symbols, resource/hand overlays, accessible names and hover labels.
- **Conversations:** tab X removes the local conversation and its stored history; late responses cannot restore it. Closing the whole panel only hides it. Macrofold is still disconnected, so no remote session is created or ended. The future adapter must close/cancel the mapped remote session idempotently when a tab ends, reject further messages for closed sessions, and surface uncertain closure without pretending success.
- **Character:** current health, food and energy are displayed. Traits, additional attributes and character history are explicitly unavailable until supported by public projection.
- **Checks:** TypeScript and production build; manual browser verified simultaneous left/right panels, opening order and icon rendering. No tests added.
- **Deferred:** automated ordering/toggle/tab-close and late-response coverage; keyboard/mobile layout review; remote-session lifecycle integration; stable per-definition symbol registry replacing provisional label-based local symbol selection; general interface/developer documentation. Explicit invention-symbol requirements were added to the capability lifecycle proposal now.

### Left-button camera dragging (corrected preference)

- **Changed:** left-button dragging pans the camera. A simple left-click still selects/walks; exceeding the five-pixel drag threshold suppresses that click action. Right-click opens actions and no longer pans. In-game controls reflect left dragging. This supersedes the prior right-drag request.
- **Checks:** source formatted and TypeScript checked; no tests added/run.
- **Deferred:** verify left drag versus click threshold, no accidental walking/selection after dragging, right-click menu without panning, pointer cancellation, and Mac Control-click; update control documentation in the next batch.

### Strict right-click target scope

- **Changed:** empty ground offers only destination movement (plus the existing invention search UX), never personal, gathering or social actions. Self menus contain rest/recovery, preparation, inventory use and crafting. Resource gathering and NPC conversation appear only for that selected target. Unavailable personal families follow the same scope.
- **Checks:** formatted changed files and TypeScript checked; no tests added/run.
- **Deferred:** catalogue coverage for ground/self/resource/NPC with unavailable toggle and typeahead, self picking, and updated interface scope documentation. Existing ground-wide catalogue tests need revision. Persistent quick-action shortcuts are unchanged.

### Context-menu dismissal and empty unavailable section

- **Changed:** hide the unavailable-actions toggle when the target catalogue contains no unavailable actions, retaining the saved preference for other targets. Search filtering does not reset that preference. A left press on the map that dismisses the context menu is consumed before the canvas can start a walk/select/drag gesture; a subsequent click works normally.
- **Checks:** changed files formatted and TypeScript checked; no tests added/run.
- **Deferred:** verify dismissal causes no move/selection, subsequent click moves, drag-to-dismiss does not pan, and the unavailable toggle responds to catalogue/connection changes without losing player preference. Update interface documentation in the next batch.

### In View navigation and work-start statuses

- **Changed:** In View replaces the old visible-panel title. Selecting a listed item or left-clicking it in the world replaces the panel contents with that item's details and a Back to In View button. The list is not rendered beneath details. Floating work statuses are projected only once the action reaches its working stage, including when paused during work; approaching a target has no work label/bar.
- **Checks:** formatting and TypeScript; no tests added/run.
- **Deferred:** verify list/detail/back navigation and world selection, target leaving sight, approaching-to-working transition, paused work visibility and no gathering status while walking. Update interface/status documentation in the next batch.

### Macrofold backend: long-running compute and bounded Jev

- **Implemented:** server-only bearer transport, bounded requests/responses, same-origin polling URLs and redirect rejection. No credentials enter frontend code. Every mutation has a durable logical-operation fingerprint and stable Idempotency-Key. Ambiguous admissions block further dispatch instead of replaying paid work. Server metadata stores project/workspace/session/sandbox/run IDs, accepted operations and final results (including artifact IDs and persistence outcome).
- **Execution:** persistent world-agent conversations get separate worktrees and `long_running: true` sandboxes. Continuations use both session and sandbox IDs. Bounded LLM generation uses fresh sessions on reusable per-task compute to avoid retaining stale/private actor context. Jev choices use sandbox-free `/v1/inferences`. Existing deterministic simulation, context assembly, declaration validation and stale-result admission remain authoritative. Macrofold agents have shell, file and connector access denied. World-agent responses discuss proposals; they cannot yet commit inventions through a world tool.
- **Lifecycle:** one local in-flight operation per worktree, remote queue disabled, poll asynchronous worktree/sandbox/run completion, require final output and verified native persistence. Cancellation is requested on abort. Terminal verified interrupted work can release the lane for subsequent work; uncertain admission/persistence remains blocked for operator reconciliation. Closing a tab tombstones its conversation, cancels active work and requests sandbox destruction. The remote API exposes no session-close mutation, so remote history is retained and the application rejects reuse. Shutdown cancels active world-agent requests. No automatic resume, compute-credit renewal or paid retries.
- **Spending/configuration:** `.env.example` includes Macrofold URL/key, project, optional separate project-bound inference key, enabled model/harness, run cap, compute allocation and timeout. Macrofold takes precedence when its key is configured. Both model and compute allocations count against the existing durable AI cap. Full compute allocation is conservatively retained as uncertain expenditure; billing reconciliation/refunds remain future work. Default compute allocation is zero. No claim that the local budget UI is an exact Macrofold invoice.
- **Verification performed:** read live `/openapi.json`, authenticated model catalogue and project discovery; inspected sibling Macrofold contracts for operation envelopes, permissions and Jev evidence. TypeScript and production build passed. No paid calls, worker provisioning or live persistence/latency acceptance verified. Automated tests deferred per session instruction. Setup project/key mutation was rejected by automatic approval review and did not run; explicit user approval and compute allocation are pending.
- **Tests deferred:** secret/redirect/size boundaries; async worktree creation; ready polling; selected model/harness validation; long-running sandbox reuse; isolated parallel conversations; warm continuation with both IDs; fresh bounded histories; idempotency conflict/uncertain admission and restart; unknown persistence/cancel/timeout; close races during provisioning and execution; one-worktree concurrency; capped spending including idle compute; Jev abstention, invalid/absent confidence and project-bound credentials; context isolation, schema rejection and stale-world admission; request deadlines; UI responses/closure. No fixture can count as live quality or pricing evidence.
- **Documentation deferred:** replace stale direct-only setup instructions, world-agent unavailable description, architecture/execution diagrams and Macrofold handoff with this implemented subset. Add operator reconciliation/resume procedures, project-scoped key instructions, billing reconciliation, backend-authoritative message-history recovery, live acceptance checklist and measurements. World context engineering, native harness process reuse, fully pooled multi-actor workers and generated-icon jobs remain future work.

### Updated Macrofold workspace terminology and selector-free requests

- **Changed:** one server-side MACROFOLD_API_KEY authenticates all Macrofold requests. Removed separate inference-key and project-ID configuration, project creation, explicit worktree creation, and project/workspace selectors from inference, sandbox and initial-run requests. Macrofold allocates workspace context. Conversation continuations still retain session_id and sandbox_id for history/compute reuse; bounded calls retain only compute between fresh sessions.
- **Supersedes:** the preceding integration entry's project-scoped-key requirement and project/key approval blocker no longer apply. No new credentials or explicit workspace resources are created by setup code. Compute allocation still defaults to zero until configured; existing budgets and uncertain-operation guards remain intact. Historical saved metadata is left untouched.
- **Checks:** implemented against the user's supplied updated contract without rereading Macrofold code/schema; formatting and TypeScript checked. No paid calls or live acceptance verified.
- **Deferred:** batch tests for selector-free request bodies, shared authentication, readiness without project configuration, isolated server-assigned workspaces, continuation identity and existing metadata compatibility. Update older setup/handoff/architecture documents to Macrofold's workspace terminology in the documentation batch.

## Completed batches

None yet. When a batch is completed, move its items here with the checks run, results, documentation updated and any remaining gaps.

### NPC memory vertical slice (explicitly requested verification batch)

The current request explicitly required tests and the canonical memory checklist, so these were implemented now; ordinary small-change batching remains in effect. See `memory-architecture.md` for limits, setup scripts, fixture evidence and live blockers. Broader README/architecture/extension-guide consolidation is queued. Existing action-catalogue fixtures still assume generic empty-space actions and move options on every object, superseded by earlier UI requests; their batch update remains open.
