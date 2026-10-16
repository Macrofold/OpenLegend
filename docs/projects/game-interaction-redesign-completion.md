# Whole-interface implementation completion

| Status      | Current progress                                                                                              | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | UI repairs and requested code reviews are complete; browser/CI gates and human/device acceptance remain open. | 2026-10-16   |

## Scope and authority

On October 14, Mike explicitly requested completing the UI implementation and running the game to verify it. This follows clarification that the earlier assignment was comprehensive UI/UX research and design. Earlier wording that inferred implementation permission from “continue” does not substitute for this explicit authorization.

**Latest scope instruction:** Mike subsequently directed that the hunting failure be recorded as a maintainer bug and that this continuation test only the UI. The [projectile-progress bug](../maintainers/projectile-progress-bug.md) owns that separate investigation. Do not resume combat, projectile, cognition or native simulation debugging from the broader historical plan below. Existing automatic repository CI remains a merge gate; excluding a repair from this task does not turn a failing check green.

The [UI-only verification report](../verification/ui-completion-2026-10-14.md) records the exact passing action/checkpoint recovery, ordinary browser, Journal and inventory observations, earlier fixture failures and remaining evidence boundaries. The named action/checkpoint, creation and owner-message storage/recovery boundaries are implemented and qualified at their recorded sources, reusing unchanged native authority owners. This does not claim an exhaustive permission matrix or close the subsystem owners' broader work.

This is the execution plan for the remaining agreed scope, not a replacement feature specification. The [feature specification](game-interaction-redesign-feature-spec.md), [technical design](game-interaction-redesign-tech-design.md), [UI/UX tracker](../maintainers/ui-ux.md) and [verification report](../verification/game-interaction-redesign.md) retain their requirements, decisions and evidence. Do not count implementation readiness and completion of the research/design deliverable as the same thing.

The completion work started on `Macrofold/OpenLegend`, GitHub `refs/heads/docs/game-ui-research-redesign`, at `18aa2920747ee0e8bb489f7c568ee60a6e6df193`. Its integrated GitHub `refs/heads/main` was then `1cf678802d62652d8dd466776d4b95a9d0d19166`; that reference was checked at the time. The later integrated base is recorded below. Preserve published history. This authorization does not request merging PR #27 into main or modifying unrelated branches.

## Implementation plan

### Integrated UI review and completion — October 15

Mike requested an in-depth review of the imported UI code and designs and completion of settled missing UI work on local `main` at `cbb5976a21b9554ddf04113f6207c376666e14e7` in `Macrofold/OpenLegend` (`origin/main` matches). Edits use `/Users/mzw/Documents/ChatGPT/OpenLegend`; no branch or checkout switch is needed. Mike explicitly excluded the separate item/building proposal; retain it as deferred work under its own tracker. Existing native mechanics and authority are unchanged.

Review and repair four connected groups: shared controls and world-input ownership; Inventory/Activity/Construction; Conversation/creator editors; and entry/settings/checkpoints/readers/Operations/Diagnostics. Reuse current implemented designs and prior scoped evidence rather than rebuilding delivered features. Initial repair estimate is 200–450 production logic/markup lines, excluding tests, with medium risk from exact-request recovery, stale reads, private drafts and focus ownership. Complete source coverage and record any further demonstrated defect before expanding repairs.

1. Preserve exact inventory requests through connection/control renewal, release obsolete local waits and reject superseded completions. Retain unavailable original Activity outcomes and add an explicit retry for failed initial task reads. Keep incomplete construction numeric text editable and refuse invalid values before preview or execution.
2. Bind creator detail focus to the initiating interaction, and refused-message draft restoration to the unchanged edit revision. Give the JSON viewer one Escape/focus owner; derive remembered-place update notices from the loaded/current revision instead of allowing delayed reads to clear them.
3. Reuse a shared keyboard-input boundary where the current main/quick-action listeners share meaning, preserve distinct Escape behavior and prevent composition cancellation from dismissing a combobox. Verify actual event paths; the old shortcut warning is not evidence that the current imported guards are absent.
4. Review final code/design consistency and reconcile the UIUX tracker, existing evidence report and affected specifications. Run changed-file formatting, TypeScript, production build and relevant existing native/browser checks with inspected fixtures. Exercise ordinary and held/refused/stale cases through the actual affected components, then visually inspect representative desktop, narrow, short and enlarged layouts. Keep generated observations outside Git. Real OS input-method, assistive-device and uncoached-player acceptance remain distinct and must not be claimed from synthetic checks.
5. The native 1280×720 compact creator session reproduces a clipped message field/Send control: its footer receives 28 pixels for 110 pixels of content. Repair the existing dock/grid allocation so an ordinary composer remains fully reachable without expanding the workspace. Preserve bounded long-result/error reading and the already-fitting narrow/short/enlarged adaptations; compare native geometry and visuals before and after. This adds a small CSS repair, not a new layout framework or native behavior.

Cost grows with visible inventories/options, retained pages and active readers; these fixes add local request/revision/focus bookkeeping rather than polling, full-history reads or new caches. Reuse exact retained commands and existing permitted projections. Selection, private ownership, timeline, read/control scope, request attempt and explicit edits invalidate the corresponding local work. Measure verification through real callers, checking command counts, retained originals, focus/draft continuity, visible errors and layout; no new provider requests or paid model quality trial is needed.

Mike's subsequent review request covers the complete five-commit change through `7df9b6a78f6ece6e6cff5ae37218184bf6dc7b26`. The refreshed `origin/main` remains `cbb5976a21b9554ddf04113f6207c376666e14e7`; continue in the same checkout on local `main`, preserving those local commits. Review request recovery, shared input/readers and creator/layout owners independently, then inspect their complete combined diff. The initial additional repairs are estimated at 15–60 production logic lines: give an active sibling dialog priority over the JSON viewer's Escape listener, reject obsolete command notifications at their shared parent, and avoid rereading an unchanged remembered creator seed from browser storage on each keystroke. The complete caller pass additionally finds that appending remembered-place pages must preserve the earlier pages' update notice, and can merge incoming identities without a nested scan. Scope remains UI-only; do not implement the deferred item/building proposal or alter native authority, rules or saved formats.

Most repairs are constant local event-driven or mount-time work; remembered-place merging grows with the loaded entries plus the incoming page, without scanning unrequested history. Reuse the current access scope, existing dialog semantics and component-local seed owner; no cache, background process or new query is needed. Access changes invalidate action feedback, the focused dialog owns Escape, and mounting a different creator conversation owns seed initialization. Verify newly changed behavior through the actual callers using focused controlled cases; reuse unchanged native/layout/recovery evidence. Finish with affected-diff review, pinned formatting, TypeScript/build as applicable and synchronized tracker/evidence updates. Existing unresolved ordinary browser gates and required CI remain explicit; this review neither waives them nor authorizes publication.

### Follow-up implementation review — October 15

Mike requested another thorough review of the published implementation at
`1dbfbfe63886cc246254b310264f701392153e94`, including correctness, simplification,
expansion, scaling and world/engine ownership. The refreshed PR target remains
`Macrofold/OpenLegend` `origin/main` at
`362d3b0a20e92fc38a672730104b957b1c7c1be4`, already an ancestor; no reconciliation
or checkout change is needed. Keep the existing accepted scope and outstanding
human/device requirements. At that review's start, the separate proposed
item/building work awaited scope clarification; Mike has since explicitly deferred
it, as recorded in the integrated review above and its own maintainer tracker.

Cross-review the complete affected implementation and its callers in three groups:
creator/editor/request retention; player item/construction/conversation/shared
controls; and private history/diagnostics/native projections. Check documentation
and the complete final diff centrally. Repair demonstrated issues through existing
owners, removing duplication only where it has a clear shared responsibility.
Initial additional repair estimate is 0–200 production logic lines, with medium
risk from request loss and private-read races; reassess before wider changes.

Performance review must distinguish explicit command/recovery work from recurring
rendering and polling. Cost grows with visible readers, inventory/equipment size,
history pages and overlapping refreshes. Share existing permitted projections,
exact-ID lookups and immutable preparation; avoid per-row repeated scans and new
global caches. Reuse expires with the actual access, timeline, evidence, selection
and authored-definition dependencies. Verify changed complete callers and request
counts with focused existing checks or a finite missing scenario, then run static
integration and required CI on published source. Do not infer population capacity
from small fixtures or repeat unchanged qualification. Record each concrete finding,
repair and any justified remaining gap in the existing review report and tracker.

Confirmed follow-up repairs now include preserving Future narration's Close guard
through acknowledged event-save reloads; retaining unresolved Speak/Act originals
after an uncertain retry; removing browser-storage reads from barter snapshot
rendering while retaining original-request checks at recovery and dispatch; and
finishing FRL02's operator-read fencing/scheduling through the existing API and
Diagnostics owners. Review also confirms that a known Inventory/Construction
result must remain visible when browser cleanup fails, and that renewed control
must retain the current task's in-memory fields when optional draft storage fails.
The additional repair estimate is now approximately 260–350 production logic lines,
with the same medium risk and unchanged native contracts. Keep task drafts under
their existing private owner while refreshing authority-scoped choices and fencing
old read/write presentation. Verify held responses and real caller composition,
not only isolated helper results.
The shared barter continuation also needs to release its old sending guard after
explicit receipt recovery, without letting that obsolete promise later change a
new offer. Reuse the existing shared draft owner with a local attempt identity;
ordinary acknowledgements retain their normal reviewed-term updates. Private note
editing must adopt a current saved revision after becoming clean without rebasing
an unsaved draft. These are additional composed-caller correctness repairs, not
new trade or knowledge behavior.

**Follow-up outcome:** all demonstrated in-scope findings are repaired through the
existing task, editor, request and diagnostic owners. Focused existing transport/
editor checks and controlled actual-component continuations cover the ordinary,
failure and delayed-result cases; [the review report](../verification/ui-implementation-review.md#follow-up-correctness-and-performance-review)
retains exact counts, reproduced failures and native/evidence limits. FRL02 is
implemented. The published head's required [PR checks](https://github.com/Macrofold/OpenLegend/pull/27/checks)
remain the integration gate; earlier green heads do not waive it. Human/device
acceptance remains open. The separate proposed item/building scope question was
still open at that checkpoint; Mike subsequently deferred it explicitly.

### Complete imported-interface review — October 15

Mike requested an in-depth review of the imported interface and designs, with
repairs and completion of missing accepted UI. Review the entire current interface,
including the redesign already integrated into main, rather than only the small
remaining PR diff. The refreshed PR target is `Macrofold/OpenLegend`
`origin/main` at `362d3b0a20e92fc38a672730104b957b1c7c1be4`; it is already an
ancestor of the review's starting source `99cb310fbe7ac597a417664551991f074995b888`.
All edits stay in `/Users/mzw/.codex/worktrees/0f80/OpenLegend` on
`docs/game-ui-research-redesign`. The main checkout and its development save are
not used for edits or runtime verification.

1. Compare the accepted feature/design, current handbook, coverage map and UIUX
   tracker with each current surface. Separate missing implementation, demonstrated
   bugs, proposed additions and unmet human/device evidence. Compare Mike's named
   main-checkout tracker without replacing either checkout's independent changes.
2. Review player item/action/activity/record screens; entry/settings/checkpoint and
   creator/operations screens; conversation/world/camera and shared controls in
   parallel. Trace complete request and return paths, cancellation, stale reads,
   permission changes, focus/input ownership and long/narrow/short content.
3. Repair confirmed issues at their existing owners. Preserve native authority,
   original-operation recovery, current-world content and accepted design decisions.
   Reconcile any contradictory handbook wording with the actual accepted contract.
4. Exercise each changed task through suitable existing focused checks and actual
   rendered interaction, including a relevant failure. Reuse unchanged native and
   browser evidence; do not recreate the removed qualification suite. Inspect the
   complete final diff and affected callers, then run required CI on published source.
5. Update the current behavior, UIUX work and verification report with actual scope,
   evidence and limitations. Keep real OS input-method, assistive-device and
   uncoached-user acceptance open until performed.

The initial 100–300-line repair estimate is now approximately 1,000–1,350 production
logic lines after the concrete findings below; the review itself covers substantially
more source. Risk is medium
because shared dismissal/focus, asynchronous private reads and consequential-write
recovery can affect several screens. Any wider native contract change requires a
revised estimate and plan before implementation. The separately designed IWB
follow-on adds crafting-list and compound equipment behavior, not just presentation;
its inclusion awaited Mike’s scope clarification at that review’s start. He later
explicitly deferred it, while the settled interface repairs continued.

Confirmed repairs cover complete equipment-conflict visibility; trade and Speak/Act
focus ownership; exact edited-draft completion; construction draft retention and
fresh read/preview fencing; forgotten action-history display and awaited server
read fencing; refused creator-page reads; future-narration tab/save/close continuity;
Operations logout cleanup and single-flight refresh; and prospective recipe wording.
The read-only relationship/evidence child also expires with current access and
evidence revision, independently of the retained same-owner writing workspace.
Both private Mind history readers and the fetched private snapshot expire after
corrected/forgotten evidence, preserving the mounted note editor. Reuse
the existing spaced creator confirmation for retained-draft switch warnings.
Current authored spawn options and private diagnostic actors supply their own
icons, removing the remaining client species-to-icon and native human-species
classification. Current note/name proposal cards must follow the admitted schema
and keep proposals distinct from effects; diagnostic detail refreshes reject older
results after a newer read or dismissal. Reuse the existing authored Entity icon through the permitted
diagnostic projection, with generic fallbacks; no new world or storage law.
Malformed retained question
answers cannot be consumed as valid answer objects.
The storage review also finds that Inventory did not verify an original request
before overwriting or verify its retained bytes before sending. Strengthen that
existing owner, then reuse it with a distinct construction task slot for the real
second caller. Construction must retain its exact Start/Stop request and check only
the original receipt after a lost acknowledgement, including after earlier work
ends. This closes the existing shared recovery contract; it adds no manufacturing
list or compound stow behavior. Keep native receipt/admission owners unchanged,
include changed-owner cleanup, and verify failed storage and no duplicate dispatch.
The same review includes native creator Save, opening selection, Prepare and
question answers, plus the relationship-inspection removal preparation callers:
optional local-draft storage cannot substitute for mandatory verified retention of
an original consequential request. Check parent discard/navigation callers as well
as the leaf editor, preserving later fields while reconciling an earlier original.
A final measured shared-controls finding expands verification: changing the offered
UI scale from 100% to 130% enlarges a HUD button from 40 to 52 pixels, but portaled
dialog controls and popup text remain unchanged. Propagate the same selected scale
through existing shared control owners, preserving anchor width/placement, modal
viewport bounds, ordinary keyboard dismissal/focus and narrow controls. Inspect
SelectField, Pullout and the actual dialog callers; account for already-physical
anchor measurements to avoid double scaling. Keep theme/defaults and native game
behavior unchanged. This cross-caller repair requires both before/after rendered
measurements and focused existing browser coverage, not only CSS inspection.
The new Speak/Act bar joins the existing measured caption exclusions; no frame-level
HUD measurements, new timing policy or extra native speech evidence is introduced.

Cost grows with mounted/visible readers, list/history pages, repeated projection
updates and optional preview requests. Reuse current permitted projections and
single-flight readers; do not add a global workflow store or broad cache. Retained
facts invalidate on their actual owner, timeline, authority, selection and evidence
dependencies; local draft identity remains separate from read validity. Measure the
changed complete caller, including request counts and rendered behavior where
relevant, rather than infer responsiveness or privacy from component structure.
Verification starts without providers and with `AI_BUDGET_USD=0` in disposable
worlds/databases. Completion requires resolution of every actionable in-scope review
finding, implementation of the agreed missing UI, current documentation and passing
required checks; source review alone does not qualify the remaining human gates.

**Review outcome:** all demonstrated imported-interface findings are repaired and
focused observations plus required Code/Spatial/interface checks pass at executable
source `38a8adcf6`. The [review report](../verification/ui-implementation-review.md)
retains complete coverage, failures, the unchanged native-time-test retry and
cleanup. UIUX18 retains broader human/input/device qualification. Inclusion of the
separate proposed item/building follow-on was still a scope question at that
checkpoint; Mike subsequently deferred it. This review did not implement its new
native behaviors.

### Current continuation — October 14

Mike requested finishing the branch after the UI-only handoff. The checkout at
`/Users/mzw/.codex/worktrees/0f80/OpenLegend` now uses
`docs/game-ui-research-redesign`; it previously had detached HEAD at
`4f16dc98c989b9954c2d00ba89e3c584824c7ca1`. This continuation does not change the main checkout.
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
A subsequent documentation-only target refresh uses the same repository/ref at
`362d3b0a20e92fc38a672730104b957b1c7c1be4`, retaining its independent research
framing and design-needs additions. It changes no tested runtime owner.
The separate final UI continuation adapts its obsolete unavailable-action toggle
expectation to main's accepted always-visible known blocked actions, then reuses
unchanged native ownership/settlement evidence.

**Verified source checkpoint — October 15:** documentation source `5926cf6478325b0764dcae271b95952de93653b9` passes [PR Code](https://github.com/Macrofold/OpenLegend/actions/runs/38692034687), [push Code](https://github.com/Macrofold/OpenLegend/actions/runs/38692030647) and [Spatial/interface attempt 2](https://github.com/Macrofold/OpenLegend/actions/runs/38692034677/attempts/2). Attempt 1 fails only Actions at the unchanged sixty-second total; its 28 native checks, spatial browser case and other five ordinary UI cases pass, including Time in 47.7 seconds. The single unchanged-source rerun passes without a code, fixture or configuration change; Actions takes 35.6 seconds. The first failure, unproved browser reload interval and earlier cleaned-source/selected zoom passes remain at their exact revisions; no performance repair is inferred. [Diagnosis and rerun](../verification/ui-completion-2026-10-14.md#documentation-head-actions-deadline).

**Earlier cleaned source — October 15:** the published source `d3c52639279ef8547fc7dc32126b3526665f6a99` removes all thirteen temporary verification files. [PR Code](https://github.com/Macrofold/OpenLegend/actions/runs/38691148982), [push Code](https://github.com/Macrofold/OpenLegend/actions/runs/38691143590) and [Spatial/interface](https://github.com/Macrofold/OpenLegend/actions/runs/38691148985) all pass; Code reports 392 tests in 43 files plus all static/build gates. The affected diff and canonical documentation have been reviewed. [Cleaned-source evidence](../verification/ui-completion-2026-10-14.md#cleaned-source-and-required-checks) preserves the individual browser/native qualifications and their limitations. Real OS input-method, assistive-device and uncoached player/creator/operator acceptance remain open.

**Earlier checkpoint — October 15:** branch source `b77639184dc6fa291771562dff04c2a554af074d` includes `Macrofold/OpenLegend` `origin/main` at `362d3b0a20e92fc38a672730104b957b1c7c1be4` through merge `ef301fae202f14fe528d1e986712566e965ab2a1`. [PR Code](https://github.com/Macrofold/OpenLegend/actions/runs/38689010811) and [Spatial/interface](https://github.com/Macrofold/OpenLegend/actions/runs/38689010883) pass unchanged deadlines. The invitation passes in 56.0 seconds, with all five focused-control images inspected; the supported alternate recharge/storage/changed-login/touch continuation passes at `b26ecb7cb` and its unchanged owners are reused. Current task retention guards, completed-task focus padding and editor viewport constraints retain their recorded qualification. The narrow Character correction keeps one vertical reader without changing the retained draft or native consent owner. No provider or excluded hunting repair is added.

The selected Journal native browser-zoom/reflow observation now passes at `c98de4a07e5bd4b39bee5724c675ac64e76bb91d`: [run 38690319197](https://github.com/Macrofold/OpenLegend/actions/runs/38690319197) completes in 56.1 seconds under the original sixty-second total, five-second assertions and ten-second captures. All three inspected images show the retained place at normal size, native 200% zoom and measured 320-CSS-pixel reflow, with reachable complete focus, no overlays or horizontal overflow, unchanged native world and no gameplay commands or provider requests. The earlier `b77639184` capture timeout and `526368719` five-second layout failure remain in the evidence; one measured resize-to-HUD change is not a performance repair. The cleaned-source review, temporary-tooling removal and required checks pass at `d3c526392`; all required checks also pass at `5926cf647` after its unchanged-source second Spatial/interface attempt. The first Actions timeout remains recorded. Real OS input-method, assistive-device and uncoached player/creator/operator observations remain open. The original implementation sequence below is retained with its source-specific evidence.

<a id="current-required-check-investigation"></a>

## Closed required-check investigation

1. The original trace and actual [Actions browser case](../../tests/browser/actions.spec.ts) place the aggregate timeout at the ground right-click after reload; no individual five-second assertion fails. The reload takes 35.31 seconds although the document GET returns in 8.86 ms. This locates an unexplained browser document-commit interval; source review establishes no safe production or fixture correction. [Exact diagnosis](../verification/ui-completion-2026-10-14.md#documentation-head-actions-deadline) retains the trace and image limits.
2. The original sixty-second total, five-second assertions, existing action/capture defaults, screenshots and acceptance assertions remain unchanged. This ordinary case does not set the temporary zoom observation's separate ten-second capture bound. No code, fixture or configuration change is made.
3. The single [second attempt](https://github.com/Macrofold/OpenLegend/actions/runs/38692034677/attempts/2) passes on the identical published source `5926cf6478325b0764dcae271b95952de93653b9`, closing that source’s required-check gate alongside its passing Code checks. Later integrated UI repairs retain the separate current browser/CI gap in the readiness report. The first failure and earlier `d3c526392`/`c98de4a07` passes remain evidence; the pass proves no performance repair. No provider work or excluded hunting repair occurs.

The original completion sequence is retained below with its source-specific evidence.

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

The a5e825563 invitation journey passes functionally, but inspected short images
show a bottom-edge control and an older notice crossing later consent controls.
The existing partial-viewport assertion cannot qualify complete visible focus.
During the already required post-main invitation recheck, require the entire
focused control/outline inside its panel clip and unobscured by visible notices,
within the same five-second assertion and sixty-second total. This is verification
of a concrete image finding, not an additional account or gameplay matrix. Any
failed geometry must identify its actual owner before production repair.

The stronger b26ecb7cb consent check demonstrates a real Character layout defect:
its separate tab-page scroller can shrink below one complete button in a short
narrow window while the identity and tabs consume the remaining height. Use the
existing outer Character scroller as the single vertical owner in narrow layouts;
let sections/pages take their natural height. This is roughly eight scoped CSS
lines, with no shared Panel change, new minimum size, event handler or native
consent change. Identity/tabs may scroll with the narrow content; desktop and the
selected section/draft remain intact. Extend the existing focus measurement to
intersect all intervening clips and identify actual hit targets, and qualify the
same Decline/Accept/Leave controls within the unchanged limits.

Required Code CI also exposes a stale upstream HTTP catalogue expectation: a
campfire-specific read still expects ground/self destination evasion, although
main's accepted catalogue and its focused tests exclude that row for object
selection. Remove only that obsolete expected entry, keeping the exact remaining
catalogue/order, read-only world/jobs and input/preferences/authority assertions.
This affects zero production logic lines. Run the single existing HTTP case and
final required CI; do not change combat, simulation or action admission.

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

- [x] Original action and checkpoint requests recover through reload and same-page changes without replacement admission or duplicate effects; the named storage, identity, privacy and stale-result cases pass at their recorded sources.
- [x] Completed-task presentation and the already specified composed game journeys are implemented and verified through their actual owners and rendered interface. The selected native Journal zoom/reflow observation passes at `c98de4a07`; full human-use acceptance remains separate.
- [x] Base, clockwork and touch worlds remain coherent under current definitions, and the supported alternate recharge interaction works through the shared interface and persistence; the b26ecb7cb two-preset continuation passes.
- [x] At the earlier published source `5926cf647`, the named in-scope defects and required Code/Spatial failures were resolved without weakening acceptance; the affected diff and canonical documentation were reviewed and committed. Both Code checks and unchanged-source Spatial/interface attempt 2 passed; attempt 1’s timeout remains recorded.
- [ ] Complete the required ordinary-browser and CI gates for the later integrated UI repairs. The [current review readiness](../verification/ui-implementation-review.md#current-verification-and-readiness) retains unresolved readiness/resize failures and required CI not run for those new local commits; earlier green sources do not close this gate.
- [ ] Remaining keyboard/non-drag, text/viewport, real operating-system input-method, assistive-device and uncoached-player requirements are accurately qualified. Automated browser or synthetic composition results cannot be reported as human/device evidence.

Required Code and Spatial/interface checks pass at cleaned source `d3c526392`, and the selected Journal zoom/reflow case passes at `c98de4a07`. The earlier published source `5926cf647` passed both Code checks and the unchanged-source second Spatial/interface attempt, closing that source’s required-check/review criterion. The later integrated repairs retain the current ordinary-browser/CI gap linked above. The first Actions timeout at that earlier published source remains recorded, and cleanup is complete. Real input/device/uncoached acceptance remains unperformed.

These are the full feature's acceptance criteria, not authorization to restart the excluded native repairs during the UI-only continuation. Source-specific progress lives in the linked verification report; a passed subset cannot close a compound criterion whose other cases remain unverified.

There is no unresolved product decision blocking the delivered interface repairs. Mike explicitly deferred the separately proposed native item/building follow-on; its accepted design and unfinished delivery remain tracked under their own owners. Physical assistive-device and uncoached-player observations require suitable real participants/devices; their absence must remain explicit rather than silently waived or used to stop independently executable implementation work.

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
