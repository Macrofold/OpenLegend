# Whole-interface implementation completion

| Status      | Current progress                                                                                                                | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Action/checkpoint reload recovery and the selected UI journeys pass; full visual, device and player qualification remains open. | 2026-10-15   |

## Scope and authority

On October 14, Mike explicitly requested completing the UI implementation and running the game to verify it. This follows clarification that the earlier assignment was comprehensive UI/UX research and design. Earlier wording that inferred implementation permission from “continue” does not substitute for this explicit authorization.

**Latest scope instruction:** Mike subsequently directed that the hunting failure be recorded as a maintainer bug and that this continuation test only the UI. The [projectile-progress bug](../maintainers/projectile-progress-bug.md) owns that separate investigation. Do not resume combat, projectile, cognition or native simulation debugging from the broader historical plan below. Existing automatic repository CI remains a merge gate; excluding a repair from this task does not turn a failing check green.

The [UI-only verification report](../verification/ui-completion-2026-10-14.md) records the exact passing action/checkpoint recovery, ordinary browser, Journal and inventory observations, earlier fixture failures and remaining evidence boundaries. The original reload-recovery code is now implemented and verified in those scenarios; the broader privacy/storage/identity matrix is not automatically closed by that result.

This is the execution plan for the remaining agreed scope, not a replacement feature specification. The [feature specification](game-interaction-redesign-feature-spec.md), [technical design](game-interaction-redesign-tech-design.md), [UI/UX tracker](../maintainers/ui-ux.md) and [verification report](../verification/game-interaction-redesign.md) retain their requirements, decisions and evidence. Do not count implementation readiness and completion of the research/design deliverable as the same thing.

The completion work started on `Macrofold/OpenLegend`, GitHub `refs/heads/docs/game-ui-research-redesign`, at `18aa2920747ee0e8bb489f7c568ee60a6e6df193`. Its integrated GitHub `refs/heads/main` was then `1cf678802d62652d8dd466776d4b95a9d0d19166`; that reference was checked at the time. The later integrated base is recorded below. Preserve published history. This authorization does not request merging PR #27 into main or modifying unrelated branches.

## Implementation plan

### Current continuation — October 14

Mike requested finishing the branch after the UI-only handoff. The checkout at
`/Users/mzw/.codex/worktrees/0f80/OpenLegend` now uses
`docs/game-ui-research-redesign`; it previously had detached HEAD at
`4f16dc98c989b9954c2d00ba89e3c584824c7ca1`. The main checkout is unchanged.
The PR target was refreshed from `https://github.com/Macrofold/OpenLegend.git`:
`origin/main` at `0c12398e32e7c9578e18de07bbe79d39b4827208`. Merge
`542644797` preserves published history and combines the newer privacy,
current-format storage and authored terrain contracts with this branch's paired
inventory, scoped drafts and exact original-request recovery.

**October 15 target refresh:** the PR target advanced to
`https://github.com/Macrofold/OpenLegend.git` `origin/main` at
`062724cdd0312753c40b99b407cf4652ac3ab26a`. It contains the UI implementation
through `7da4449fb` as squash `b2c8e2eee`, then newer focus-pause feedback and
player action controls. Preserve those additions and this branch's later editor,
completed-task and qualification changes without rewriting published history.
A comparison against the already integrated UI source makes the conflict intent
unambiguous: keep both independent changelog additions and each later change at
its owner. No standard starting-world initializer or saved development world is
replaced; base/solo content is identical across this reconciliation, while the
integrated current need/health rules retain their own authored definitions.
The existing untracked environment file is byte-identical to main's new tracked
file and is preserved unchanged. Static/build checks and the fourteen focused
transport/draft checks cover reconciliation; no browser run is part of the merge.
The separate final UI continuation adapts its obsolete unavailable-action toggle
expectation to main's accepted always-visible known blocked actions, then reuses
unchanged native ownership/settlement evidence.

Finish in this order:

1. Inspect the existing captures and distinguish visible content from controls
   outside their captured reading position. Retain all earlier failures and limits.
2. Exercise the remaining connected UI tasks and recovery boundaries with the
   real application, disposable PostgreSQL and providers disabled. Reuse valid
   native subsystem evidence; do not restart the excluded hunting investigation.
3. Verify completed-task reading, short/narrow layouts, enlarged text and keyboard
   alternatives. Qualify the supported alternate-world interface through the
   existing installed definitions.
4. Fix demonstrated in-scope defects, review the full affected diff, reconcile the
   owning tracker/evidence/project status, and run the final required checks.
   The recovery review found that the owner conversation used an optional storage
   write before a paid send. Verify exact retention before dispatch, distinguish
   unreadable recovery from no request, and verify matching cleanup before another
   send. This uses the existing session/request owner and adds no paid retry.
5. Obtain actual OS input-method, assistive-device and uncoached-player evidence
   from suitable participants/devices. These remain required human observations;
   scripted interaction cannot close them.

After reconciliation, the initial estimate is fewer than 200 additional production
logic lines, excluding tests and documentation; reassess if a demonstrated defect
widens the work. Existing private-read and native mutation owners remain
authoritative. Cost grows with the visible collections and retained task details;
reuse current scoped reads, invalidate them on their actual access/content changes,
and measure through the connected screens. Do not add recurring polling, retained
world copies or another recovery executor.

Reconciliation passed TypeScript, production build, generated configuration,
guidance, affected formatting and 14 focused draft/transport tests. These are
static/fixture results, not browser or whole-feature acceptance. New UI verification
starts only after that merge; no browser environment ran during reconciliation.

**October 15 verification execution:** ordinary Code and Spatial/interface CI pass
at `a367c4d1b`. Local graphics startup and even an enabled ordinary pointer click
exceed the existing waits before the intended observations. Run the remaining
finite owner-storage, denied-container and completed-task observations on the same
disposable Linux runner, retaining their assertions and deadlines. Temporary
workflow/scenario files are verification tooling only; remove them before the final
handoff. This temporarily exceeds the earlier line estimate through copied
verification tooling, without expanding production behavior. Preserve every local
failure, exact source and supplied-fixture limit. No provider execution or live
credentials are permitted. Inspect the resulting images and reconcile the tracker;
an unavailable participant or device still leaves the corresponding human gate open.

The alternate-world review identified the same consequential boundary in the
existing Current task owner: unreadable session recovery was treated as no request,
and a fresh Start could overwrite the unknown original with a new command identity.
Keep the current stored shape and native command/receipt owners, reuse the existing
empty/pending/unreadable result type, verify storage before dispatch and
matching cleanup before releasing the guard, and retain a known original for
read-only result checks. Qualify refusal after the earlier work has actually ended,
so an ordinary busy-work refusal cannot hide a missing recovery constraint. This
adds roughly 80–110 task-owner logic lines; combined production changes are now
about 200 lines. The existing durable plan remains appropriate because original
effects, storage failure and stale results cross the client/native boundary; no
server schema, paid retry or new general recovery framework is introduced.
The action/checkpoint reader's existing serialized-length ceiling does not cover
authored task labels and metadata. Keep parsing with the task owner rather than
adding that new task limit merely to share a helper; actual storage failure still
refuses dispatch without truncating the intention.
Keep exact agreement replies with their existing native owner rather than treating
an uncertain task as a consent-ending prerequisite. Qualify losing the real Send
acknowledgement, explicit Withdraw, and then reading that original Send result
without another invitation or movement, within the existing composed outing case.

The existing enlarged-reading requirement also needs evidence beyond component UI
scale. Prepare one selected-place Journal observation in a disposable headed
Chromium window under Linux Xvfb. Native window-directed keyboard focus and
Ctrl-plus should reach 200% browser zoom; require unchanged physical window
bounds, doubled device-pixel ratio, approximately halved CSS viewport width and
unchanged visual-viewport scale before counting it. Retain the same real place,
Hide/reopen and keyboard reach without Move or a new command. This is one bounded
browser-zoom sample, not whole-interface text/input or human acceptance. Do not
edit user profiles/preferences or substitute CSS/font injection or pinch emulation.
The handbook also requires a separate 320-CSS-pixel reflow observation. Extend
that same native zoom scenario by resizing only its owned browser window to a
measured 320-CSS-pixel reading width while keeping 200% browser zoom and the
existing application scale. Retain the same place, Hide/reopen and keyboard
controls; check complete focus and no horizontal document overflow. Keep the
same sixty-second case and existing local assertions/capture limits. Earlier
320px/130% application-scale observations remain valid for their different sample.

The six completed-task images expose a partly clipped Prepare another task focus
outline on the long desktop/short results, despite the probe's partial-visibility
pass. Add the existing small scroll-margin token only to that completed task's
direct button, then require the whole button and computed outline inside the
actual scrolling clip after the same Task→Tab route. Reuse all native completion
evidence; rerun this one presentation observation because the pixels demonstrate
a new in-scope defect. This adds fewer than ten CSS lines, no shared Panel change,
new size limit or focus event handler, and keeps all original execution bounds.

The current required God editor check exposes a separate real responsive failure:
the dialog width shrinks, but its old desktop left coordinate remains beyond the
original five-second fit deadline. Add editor-only CSS constraints to its painted
left/top, keeping the existing physical edge margin, maximum size and preferred
desktop coordinates. Center, drag start and resize correction must read actual
computed coordinates so a clamped window cannot jump. Estimated change: 12–20
logic lines and about six CSS lines, with scaled dragging as the main risk.
Verify desktop drag/Center and shrink/grow at normal and 130% application scale,
plus the unchanged required narrow-fit case. No new size policy, polling or shared
panel mechanism is needed. The failed trace establishes delayed fit, not permanent
overflow or a graphics performance cause.

The final acceptance audit identifies two concrete remaining private-ownership
observations beyond the passing storage/timeline cases: checking an original action
under a different legitimately permitted account/character, and clearing a selected
Journal place while an older permitted inspection is still waiting. Cover both in
one finite actual-App/server/PostgreSQL scenario. Keep one real original action and
remembered observation, change ownership through the existing native account/grant
owner, receive that account's actual fresh view, and verify old draft/request/place
details disappear and stay absent after the old inspection is released. Attempt
only a read of the exact original action under the new permitted identity and
require no original job/result disclosure or mutation. Reuse the existing
zero-provider action fixture, native authority and private cleanup owners; do not
fabricate a granted client view or add production policy. Keep the original
sixty-second case and local action/assertion/capture bounds. This adds temporary
verification only; injected Storage tests alone do not establish these composed
browser boundaries.

### Original action recovery — UIUX12

Keep one unresolved Describe an action request separately from subsequent draft edits. Before dispatch, retain its exact identity, text, selected subject and scheduling choice under the existing authenticated private ownership boundary. A changed subject, edited words, completion of the character's current work, hiding the panel or reloading must not allocate a replacement while the original result is unknown.

Recovery reads the original server-owned request/job outcome; it must not call the submission path, pay for another interpretation or execute another action. Preserve the distinction between not found, still pending, a recorded refusal, an admitted request and completed physical work. A missing record alone does not prove that a delayed original request cannot arrive. Check current authority and the original world/timeline before disclosing or consuming its outcome. Changed private ownership clears private recovery. Failed browser persistence blocks an unretainable new submission rather than silently losing it. Clearing a resolved record must not erase a newer request or release the guard while cleanup is uncertain.

Use the existing action admission, durable job store and private draft owner, with a narrowly scoped read projection where the current API does not expose the original result. No parallel action executor, automatic resend or new general job framework.

### Checkpoint recovery — UIUX14

Retain one exact unresolved checkpoint creation or load, including its original identifier and label or checkpoint identity, before dispatch. Add a synchronous operation guard so rapid input cannot start competing checkpoint mutations. Hide/reopen and same-owner reload restore the pending task and an explicit result-check action; draft changes cannot replace it.

The result check uses the existing checkpoint and durable load-record owners without taking another checkpoint, reloading again or rotating protection. Loading can legitimately change the saved timeline: an original load outcome may be read under current save authority, but the old executable request must never be admitted into the new timeline. A changed account, character, world or revoked grant must not expose another owner's retained details. Preserve storage-health warnings even when an original load record proves installation succeeded. Keep the existing exact named confirmation and current-format validation.

### Presentation and existing composed journeys — UIUX08–UIUX18

Remove the excessive empty space around a retained completed task without clipping details or weakening focus/scroll behavior. Verify the change with actual content at desktop, narrow and short sizes.

Finish the already tracked connected journeys: barter from Inventory and person entries, companion invitations and displayed-description search, Known places inside Journal, denied-container rendered state, and the outstanding creation/owner-conversation storage and recovery combinations. Keep exact lots/subjects/terms, explicit execution, current permission and privacy, and original-operation outcomes through interruption. Reuse unchanged native evidence instead of pretending every previous check was rerun. Inspect real rendered results as well as assertions.

### Alternate-world repair — UIUX17 / UIUX18

Repair the existing clockwork/touch starting-world composition. The present preset replaces attribute definitions after creating the full base world, leaving object properties whose definitions were removed. The same failure was reproduced on unchanged main. Preserve a deliberately selected coherent set of objects, authored definitions and activities; do not disable validation, make wilderness rules universal or substitute a renamed base-world meter for the actual recharge task.

Verify ordinary base-world construction separately from clockwork and touch construction, permitted recharge discovery, finite supply use, partial work/Stop and current-format continuation. Follow each selected world's actual contracts and fix further concrete integration errors exposed by these paths.

### Required failures and final review — UIUX18

Inspect the actual assertions and producer/consumer paths behind the inherited Code failures. A matching test name is not proof of an identical cause. Update stale fixtures only when the accepted current behavior establishes they are stale; repair implementation defects at their semantic owner. Do not weaken assertions, normal-close/abrupt-loss coverage, the Time journey's sixty-second aggregate deadline or local capture allowances.

Finish the existing required Code and Spatial/interface checks on the final source. Inspect the complete affected diff and resolve actionable review findings. Reconcile the feature/design status, task checkboxes, current evidence and PR description with the actual delivered result; keep historical evidence and failures scoped to their original revisions.

## Size, risks and ownership

Initial estimate: approximately 400–700 changed production-logic lines across the action and checkpoint clients, existing server outcome readers, scoped browser recovery and alternate-world composition, plus small layout changes. The estimate excludes tests and documentation and will be reassessed if the native owners reveal a wider required change. This is not a limit that permits dropping agreed scope.

The consequential risks are duplicate paid interpretation, repeated world rewind, lost protection checkpoints, private-data disclosure after changed ownership, and stale asynchronous completion. The client owns drafts and a retained request description, never proof of success or permission. Existing server/native owners remain responsible for admission, durable outcomes, current grants, actual game effects and current-format state. No incompatible-save migration or new spending policy is introduced.

## Performance and verification plan

- **Growth:** retain at most one unresolved action and one unresolved checkpoint operation per currently permitted private task scope. Do not accumulate request logs, clone the world or scan all game history to recover a single request.
- **Shared preparation:** reuse the existing authenticated request context, durable exact-ID job/load lookup, checkpoint metadata and private draft cleanup. World composition runs only when deliberately creating a world, not during rendering or simulation ticks.
- **Invalidation:** bind action results to original identity/body and current private owner/world/timeline; bind load-result inspection to its original durable operation while separately checking current save authority. Ignore obsolete component/query completions. Failure to read or clear browser storage never means a request did not happen.
- **Measurement:** run pinned formatting, configuration/guidance checks, TypeScript and the production build; exercise relevant existing native/HTTP checks and finite missing recovery scenarios with disposable PostgreSQL. Run the actual production App/server/browser journeys, record exact source and failed stages, and inspect captured UI. Required CI remains required. No broad new benchmark suite is needed for these exact-ID, explicit-gesture paths.

During the earlier October 14 pass, local execution failed before commands ran, so its verification used disposable GitHub Actions checkouts. The current continuation can run local commands and uses its own disposable PostgreSQL container and worlds; Mike's saved development world is not used. Browser launch requires execution outside the command sandbox. Any temporary observation/packaging files stay outside the final feature tree. Keep generated logs, traces and screenshots outside canonical source by default.

All verification starts with providers disabled and `AI_BUDGET_USD=0`. Fixture interpretation or supplied recipient decisions cannot establish live model quality. No paid call has been made in this completion pass; the shared authorized task cap remains governed by repository verification policy.

## Completion criteria

- [ ] Original action and checkpoint requests recover through reload and same-page changes without replacement admission or duplicate effects; meaningful storage, identity, privacy and stale-result cases pass.
- [ ] Completed-task presentation and the already specified composed game journeys are implemented and verified through their actual owners and rendered interface.
- [ ] Base, clockwork and touch worlds remain coherent under current definitions, and the supported alternate recharge interaction works through the shared interface and persistence.
- [ ] In-scope defects and required final Code/Spatial failures are resolved without weakening acceptance; the affected diff and canonical documentation are reviewed and committed.
- [ ] Remaining keyboard/non-drag, text/viewport, real operating-system input-method, assistive-device and uncoached-player requirements are accurately qualified. Automated browser or synthetic composition results cannot be reported as human/device evidence.

These are the full feature's acceptance criteria, not authorization to restart the excluded native repairs during the UI-only continuation. Source-specific progress lives in the linked verification report; a passed subset cannot close a compound criterion whose other cases remain unverified.

There is no unresolved product decision blocking the implementation work described above. Physical assistive-device and uncoached-player observations require suitable real participants/devices; their absence must remain explicit rather than silently waived or used to stop independently executable implementation work.

## Integrated recovery continuation — October 14

Development now includes GitHub `Macrofold/OpenLegend` `refs/heads/main` at
`b72e9d9aab8072eb1b5ae9d25f620a4421509148`, through normal merge `28baace2983f60baff0179def860c089af6b6e6d`.
Keep the revised creator removal controls and single-scroll review together with
this branch's task navigation. The earlier verification remains source-specific.

The running-game recovery checks exposed two additional presentation/lifetime
problems: opening Checkpoints leaves focus in the Game menu, and the application
reset erases the pending checkpoint when its own load changes the timeline.
Selecting a task from Game will close that navigation menu and move focus into the
selected task without trapping it. A load transition may retain only the exact
read-only checkpoint description whose server-issued recovery scope still matches;
old executable commands and unrelated private drafts remain cleared. Changed
account, grant, character or session must not retain that description.

The clockwork preset deliberately reuses real shelter materials and the existing
practice target. Install their exact attribute definitions and the shelter activity
as selected authored dependencies, without installing human hunger/energy or
turning wilderness defaults into mandatory engine rules. Current validation stays
strict. Verify all three existing presets, then actual recharge and recovery.

The recovery probes use the visible Replace current work control and inspect the
actual generated pre-load protection checkpoint through the existing save owner.
A missing fixed `before-load` row cannot establish protection. Preserve the original
request counts, exact content, native effects and all existing deadlines. These
changes do not close wider native, accessibility or uncoached-play requirements.

### Trace-supported completion corrections

The ae12 native browser run passes checkpoint creation through reply loss, reload
and phone adaptation. Its recorded load retains the same native checkpoint owner
while replacing the timeline, but the old stream sends an undifferentiated access
invalidation. Classify a timeline-only stream reset only after the existing authority
owner accepts the exact old scope with the new timeline and current save permission.
That public signal contains no private payload and permits retaining only the local
read-only checkpoint description; genuine revocation still clears all private drafts.
Fresh state and every receipt read continue to validate current authority.

The action scheduling label is present but is clipped by competing nested scroll
areas. Use the existing Character page as the single vertical scroll owner while
editing; keep Practice in the retained browsing content, not above the focused form.
The action footer scrolls with its form rather than covering fields. Keep ordinary
pointer selection, keyboard navigation, exact request identity and the original
60-second journey deadline.

Construct bodies deliberately have no equipment attachment points. The fresh
clockwork preset must release inherited worn items into the same character's carried
belongings through the existing object owner before replacing those bodies. Preserve
real items, quantities and custody; do not change universal anatomy or weaken current
validation. This is initial preset composition, not a stored-world migration.

### Exact fixtures and completed-task presentation

The recorded full run passes six ordinary browser journeys including Time
under its unchanged sixty-second limit. Its remaining catalogue assertions
assume older authored actions/recipes. Keep exact independent expectations,
privacy assertions and refusal checks while including the current content.
The crafted-tool loop must select its newly admitted sling and exact physical
output, not whichever starter recipe or equipped item appears first.

A native diagnostic confirms the additional cognition call is attention over
four distant visible objects in the expanded starting world. The one-request
orchestration fixtures will explicitly install fourteen-metre sight for their
small near-camp scenario, with recalculated exact sense pins and unchanged
hearing, native admission, request accounting, limits and assertions. This is
fixture-only scope, not a production range or attention change; it does not
establish that the complete current starting scene needs only one request.

Completed Activity results will size their own panel to content, only while
visible, not preparing and with no current work. Preparation/running work keep
their existing workspace; long results still have the available-height bound.
Validate the composed result, keyboard focus and phone/short layouts in the
actual game before closing UIUX09.
