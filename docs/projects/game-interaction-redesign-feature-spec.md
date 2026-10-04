# Inventory and everyday play: interaction redesign

| Status      | Current progress                                                                                          | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Runtime interactions and focused UI checks are recorded; full native gameplay qualification remains open. | 2026-10-04   |

[Technical design](game-interaction-redesign-tech-design.md) · [Game interface atlas](../ui-ux/games/README.md) · [Current-interface diagnosis](../ui-ux/current-interface-audit.md)

## Purpose and decision

Make handling belongings, opening a chest, tending a fire and talking to a person feel like acting in the world. Mike's October 3 direction explicitly replaces the routine destination-selector and activity-form experience. The inventory shows recognizable objects in squares, and opening a supported container connects its contents to the player's own inventory. The subsequent chat continuation authorized implementation of this discussed plan. Research is complete and the runtime interactions now exist; the complete gameplay qualification remains open.

The user-approved direction is **world object → relevant interaction → visible result**. The behavior below is the accepted interaction contract. The implementation and recorded focused checks do not by themselves establish completion: the real-game journeys remain required, including the integrated camp session. [Runtime evidence and limits](../verification/game-interaction-redesign.md) distinguish observed results from remaining qualification.

The [pinned pre-redesign audit](../ui-ux/current-interface-audit.md) preserves the diagnosis: one container collection and a detail pane led to a destination chooser and an additional exact-transfer submission; the inspected world object was not connected to a paired inventory view. Camp activities exposed internal parameter fields and a separate review. The runtime now connects objects to paired inventory and authored activity presentations while retaining native validation. Visual review also corrected the first care-task implementation into the compact summary described below. The audit describes its recorded revision, not the current replacement UI.

## Maintained records

- Implementation and acceptance: [UIUX07–UIUX11](../maintainers/ui-ux.md#uiux07), with existing PW04/PW06, PO, AC and conversation owners retained there.
- Limits and constraints: [UXL06–UXL10](../limits/ui-ux.md#uxl06); current native bounds remain in [interface](../limits/interface.md) and [objects](../limits/objects.md).
- Persistent interaction rules: [Inventory](../ui-ux/inventory.md), [world interaction](../ui-ux/world-interaction.md), [chat](../ui-ux/chat-and-invention.md) and [UI brief](../ui-design-brief.md).
- Evidence and source identity: [one research ledger](../ui-ux/research.md#game-interface-screenshot-atlas) and its linked game dossiers. Screenshot observations, documented controls, player reports and our recommendations are distinguished.
- Implementation evidence: [game-interaction verification](../verification/game-interaction-redesign.md); focused checks, platform limitations and the remaining real client/server journeys are recorded there.

**Fixture scope:** Chest and workbench illustrations express the target interaction. Initial implementation and acceptance use currently supported native bags/containers and available crafting capabilities. Creating fixed-chest or new workbench mechanics is not a prerequisite to repairing the interface; new authored families retain their own scope.

## Inventory interaction

### Open the chest you are looking at

A stationary right-click on a perceived chest opens its short contextual menu. **Open** is prominent; the same action is available from the selected object's visible details and keyboard route. A player does not need to know the right-click gesture to discover it. Primary selection continues to inspect, and dragging continues to control the camera according to the existing bindings.

Opening identifies this exact object, reads its permitted contents and opens the inventory workspace. The player's belongings are on the left and the named chest on the right. The world remains visible around the task when there is space. Both collections stay visible while moving items. A chest's title, appearance and permitted place description establish which chest is open; a dropdown of all nearby containers does not replace that relationship.

If out of reach, selecting or inspecting the chest still does not move the character. Offer **Walk to and open** only as an explicit movement-and-open intention when supported. It follows a valid route, can be cancelled and checks reach/access again on arrival. If no route exists, explain the obstruction. Opening is never a remote view into hidden contents.

The current bundled-world handling rule is 1.6 metres between interaction anchors, with an obstruction check; the audit links its authored source. The interface should say **Too far to open** or **Blocked by the wall**, with truthful permitted spatial guidance. It must not show a decorative circle that pretends ordinary feet-to-object distance is the exact admission calculation. Other installed worlds can define different reach and means of access.

### Two collections, one clear transfer

Each side has an unmistakable title, a compact item grid, relevant quantity/capacity information and local search/sort when useful. Use small item names or a readable-label mode for unfamiliar invented objects. Quantity, equipped state and a player's protected-item mark must survive icon similarity and color changes. Item details are supporting information rather than a permanent third pane consuming the room needed by the two collections.

Grid cells organize the display. They do not introduce physical slot capacity, Tetris shapes, automatic stacking, item teleportation or a new universal weight rule. The world's native object/capacity facts remain authoritative. Visual grouping of two similar objects is not a domain merge.

The implemented desktop controls follow this grammar; their complete input and layout qualification remains part of J09:

| Player action                                           | Result                                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Click an item                                           | Select and inspect it; keep its location visible.                                              |
| Drag to the other open collection                       | Move the chosen item or stack through native handling admission.                               |
| Shift-click or Shift+Enter on an item                   | Quick-move its exact inspected available quantity to the other open collection.                |
| Choose **Move to Camp chest** or **Take into backpack** | Accessible non-drag equivalent with the destination already named.                             |
| Right-click an item / invoke its keyboard context menu  | Short list of relevant actions on this item.                                                   |
| Choose **Split stack…**                                 | Open a small quantity control beside the item; retain both collections and the target.         |
| Open a carried bag                                      | Navigate that side into the bag, retaining a breadcrumb and the opposite side.                 |
| Escape                                                  | Cancel the active drag or close the top child layer, then the workspace on a subsequent press. |

Quick-move, drag and the explicit Move action share native handling and keep the destination named. Show the quick-move binding in help and the relevant item action; no hidden modifier is the only route. A second click must not accidentally repeat a consequential action. Clicking outside an ordinary item drop zone cancels the drag; dropping into the world requires the explicit supported Drop route, not an accidental release over scenery. Existing application shortcuts and input ownership remain controlling.

A routine reversible transfer is the player's commitment. It does not open another review asking them to select the already-open chest or confirm the same move. Show pending state on the affected item, then actual quantities on receipt. Before completion, do not make the item usable at both ends. A failure restores the visible truthful collection and explains the reason beside the task.

An uncertain move retains its exact original request. **Check result** reads that request's native receipt without moving the item again; hiding, reopening or resuming control is not a new transfer. If the browser cannot retain the recovery record, inventory refuses the send and explains that nothing was sent. This restriction protects recovery rather than guessing whether a timed-out move happened. [Recovery contract](game-interaction-redesign-tech-design.md#direct-transfer-without-weaker-authority)

### Small choices stay small

One gesture submits the stack's **exact inspected available quantity** without another review. Reserved units stay where they are; the command does not expand to a different quantity at admission. A requested partial move adds only a quantity decision. All/Half are shortcuts, and an exact field stays available. Blank or intermediate input remains a draft. Changing an amount keeps the selected source and chest; any stale eligibility preview is refreshed without making the player choose that chest again. Changed native quantities or revisions can refuse the move rather than silently choosing another amount or item.

Equipping is a deliberate item action or a drop into a compatible equipment slot. Show the actual item being replaced, a relevant comparison and a clear equipped marker. Equipment slots and characteristics come from the installed world. A protected/favorite mark prevents accidental bulk disposal; it is a player preference, not permission to violate native custody. Selling, consuming and destroying have different meanings and cannot share an ambiguous trash symbol.

Nested containers use readable breadcrumbs. One external object is active in the transfer workspace; opening a different chest replaces that external side deliberately. Each side keeps one finite contents page and its own search and continuation, replacing that page when navigating rather than accumulating every opened bag. This display scope is not a limit on stored possessions. A future logistics view may compare more storage, but is not necessary for ordinary chest use.

### Space, bulk handling and failure

Show native capacity in its applicable units; unknown capacity is not zero. Empty display cells are not proof that another object fits. A known invalid target is explained when approached or attempted, rather than silently disappearing from a list.

**Take all** and **Deposit matching** are useful candidates only after native multi-item semantics exist. They must state scope, protect equipped/favorite items where supported, and report actual partial/refused outcomes. Initial delivery can be complete without them; it cannot display a button that loops through untracked mutations and calls the batch successful. Terraria and Stardew provide lessons about chore reduction, not authority to move items into unopened or remote containers.

At narrow widths, stack the two named collections vertically, with a concise transfer action reachable from either one. If height makes simultaneous grids unusable, use explicit source/destination views with a persistent counterpart strip and selected-item summary; never switch to a nearby-container dropdown. Keep selection, quantity, search and reading positions. Enlarged text can reflow the task; it must not make item identity depend on hover.

## Activities begin at the relevant thing

Clicking a fire offers actions such as **Add fuel** or the currently supported care activity. Clicking a workbench offers its known recipes. Clicking a resource offers gathering. A selected item supplies itself to **Use**, **Eat**, **Equip** or other admitted actions. The specific actor, object and location are already known from the player's context.

For **Add fuel**, show eligible carried fuel as item choices with exact native quantities and relevant consequences. Choose a stack and the meaningful amount, then act. For longer fire care, use a compact summary such as “Keep this fire supplied from my backpack until sunset; use at most 6 sticks and keep 2 for me.” These illustrative values must come from the supported authored policy and player choice. Supply, stopping condition, maximum consumption and any personal reserve stay visible and individually changeable; internal attempt bounds remain authored implementation details. Do not ask for actor, target, container, resource, return behavior and queue policy as an undifferentiated form when context already determines them.

The current immediate fuel action uses the existing native **one-unit** command and states that amount before commitment. It does not offer an arbitrary amount that the command cannot honor. Longer care uses the supported supply, budget, reserve and stopping choices. Contextual activity screens are now implemented from a closed set of trusted presentations with world-authored roles and wording; unsupported presentations receive an explanation rather than a generated parameter form. J10–J12 still require real native client/server qualification of these choices and effects.

The default care-task view is a compact summary naming the selected supply/material, budget, reserve and stopping condition. **Supply**, **Amount** and **Stopping** open one focused editor at a time; Start stays reachable and explicitly describes replacing current work when applicable. Visual inspection found the first all-fields-at-once implementation still violated this requirement. That defect is corrected, with the final workflow checked inside the actual 504px Panel. Moving choices into focused editors preserves their values, native defaults and consequential commitments. The [verification report](../verification/game-interaction-redesign.md#chosen-tasks-and-crafting) records the checked layout and remaining native gameplay limits.

Default only values the system can establish safely. If two sources have meaningfully different consequences, ask **Which fuel?** with the actual objects, not their internal identifiers. If the player has no suitable material, keep the fire as the context and explain **You need suitable fuel** with a permitted route to obtain it. Never silently borrow another person's possessions or choose a valuable item because it happens to be first in a query.

An ongoing activity becomes a readable in-world task: what the character is doing, the target, current progress if measurable, and **Stop** or **Change**. Duration, repeat conditions and replacement of current work are meaningful decisions and remain visible when they matter. **Change** uses a supported native amendment if one exists; otherwise it prepares a replacement and explains that starting it stops the current work. Editing a draft or reopening the panel has no such effect. The UI does not promise autonomous outcomes beyond the supported native activity. Newly invented actions must use trusted semantic presentation patterns and context binding; an unfamiliar definition is not permission to render every schema field or execute generated UI code.

## Conversation and other menus

Talk starts from a person or an existing conversation. Keep the speaker and destination understandable, history readable, and the composer fixed. Preserve the current vertical speech-volume control, one-line growing composer, draft retention, reading position and dots-only pending reply treatment. A hearable utterance and a private message are different world rules: choosing a target cannot imply that nearby characters cannot hear. MMO channel selectors are relevant to audience clarity, not proof that a dropdown is suitable for selecting a physical chest.

The pinned audit found one session draft record. The implementation now keeps drafts scoped to the world, controlled character and conversation, and switching recipients must not silently send the previous recipient's text. The accepted tab-resume behavior preserves permitted drafts when the same owner resumes control after a connection or control change. Private presentation stays hidden until fresh access is established; a changed session, grant, character, world or timeline removes the prior owner's private work. This supersedes the earlier blanket clearing on character-control replacement without making restored text evidence of permission. [Tab-resume contract](completed/tab-resume-feature-spec.md) · [Current qualification](../verification/game-interaction-redesign.md)

Offer a small number of meaningful dialogue/topic suggestions where supported while retaining natural-language speech. Item references can be inserted as named chips from permitted objects; they do not expose hidden item facts. Disco Elysium's attribution and transcript continuity are references for legibility, not permission to reveal other characters' thoughts. World Agent authoring stays a distinct role with its existing spending, review and installation boundaries.

| Menu family               | Entry and primary task                                | Required presentation                                                                          |
| ------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Belongings and containers | Own inventory or **Open** on an object                | Grid; paired collections during transfer; local item actions.                                  |
| Equipment                 | Selected item or character equipment                  | Readable slots and candidate/current comparison.                                               |
| Crafting and cooking      | Station, known recipe, or carried crafting capability | Output first, usable recipes and ingredient evidence; substitutions only when meaningful.      |
| Ongoing activities        | Target or current character task                      | Relevant choices, understandable stopping condition, visible Stop/Change.                      |
| NPC conversation          | Person or conversation                                | Speaker, audience, transcript and composer; no provider/workflow machinery.                    |
| Trade and handover        | Person and an offered item/set                        | Offer contents, consent and actual outcome; inspection does not transfer custody.              |
| Journal/map/history       | Explicit navigation                                   | Known information, readable return path, scope and preserved reading position.                 |
| Creator work and settings | Explicit authoring/settings entry                     | Appropriate structured editing and consequential review; these are separate from routine play. |

## End-to-end acceptance journeys

These remain required completion gates for the implemented interactions. The full native client/server J01–J16 qualification is open: disposable PostgreSQL/platform access is incomplete, and a complete real-world camp session has not been demonstrated. Focused native or component observations in the [verification report](../verification/game-interaction-redesign.md) do not replace these journeys. Each journey must be exercised from the real world view through actual native results. Compare observed hesitation, errors, backtracking and completion with the baseline; a prettier static screen is insufficient.

| ID  | Trigger and knowledge                            | Player interaction and visible result                                                                                                                                 | Failure/recovery to demonstrate                                                                                       |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| J01 | Reachable, permitted chest in view               | Open from object; see chest and belongings together; transfer one item each way without choosing a destination again.                                                 | Full chest leaves custody unchanged and explains capacity.                                                            |
| J02 | Visible chest beyond handling reach              | Inspect without movement; deliberately Walk to and open; contents appear only after valid arrival.                                                                    | No route, cancellation, moving target, obstruction and revoked access stop opening.                                   |
| J03 | Carried stack and open chest                     | Quick-move the exact inspected available quantity; split a specific amount without losing either side.                                                                | Blank amount and stale quantity never become zero or a different stack.                                               |
| J04 | Two same-named items, one damaged or equipped    | Distinguish by visible identity/state; compare and equip intentionally.                                                                                               | Missing comparison fact is unknown; equipped item is conspicuous.                                                     |
| J05 | Nested carried bags and an external chest        | Open bag on one side, move to chest, navigate back with stable focus.                                                                                                 | Self-containment and moving a parent into a descendant are refused.                                                   |
| J06 | Two players handling the same contents           | Each sees actual authoritative changes; a competing move produces an exact outcome.                                                                                   | A timeout or double activation cannot duplicate, lose or retransfer an item.                                          |
| J07 | Remote/hidden/other-person storage               | Inspect only permitted exterior facts; no fabricated interior or globally searchable contents.                                                                        | Lost authority removes private content and disables mutation promptly.                                                |
| J08 | Open task during movement/disconnect             | Preserve meaningful selection but show inaccessible or reconnecting state truthfully.                                                                                 | Return to valid access refreshes permitted contents; no stale drag commits.                                           |
| J09 | Keyboard-only, large text, narrow/short viewport | Open, inspect, move, split, cancel and return without drag or hover; both endpoints remain clear.                                                                     | Popup Escape, IME, wheel and pointer release do not move the world.                                                   |
| J10 | Fire with eligible carried fuel                  | Select the fire, choose Add fuel, choose meaningful material/amount and see actual fire change.                                                                       | No fuel or inaccessible supply is explained in the same context.                                                      |
| J11 | Longer care task and an existing activity        | Choose scope/stopping condition, see current task, replace deliberately if needed, stop it.                                                                           | No indefinite hidden loop, fabricated progress or unintended restart on reopening.                                    |
| J12 | Workbench with known and unavailable recipes     | Select useful output, inspect native ingredients/substitutions, craft and receive output.                                                                             | Missing station/resource condition is explained; ordinary crafting exposes no authoring schema.                       |
| J13 | Nearby person and speech draft                   | Talk from person; retain draft/older reading through replies and hide/reopen; switch recipient/world/control without silently carrying text into another destination. | IME cannot send accidentally; out-of-range/technical failure retains useful recovery.                                 |
| J14 | Item offered to a person                         | Select item and recipient in context; see offer and consent outcome.                                                                                                  | Decline, expiration and changed access do not silently change custody.                                                |
| J15 | Invented object without finished art             | Identify it by readable name/fallback, inspect and perform a supported action.                                                                                        | Unsupported presentation/action is honest; no blank usable cell or generated executable UI.                           |
| J16 | One integrated camp session                      | Open chest, take supplies, equip tool, gather, fuel/cook, offer food, talk, return remaining items.                                                                   | Every transition preserves object identity, real effects and conversation context; no generic execution form appears. |

## Delivery order and completion

1. **Chest and belongings.** Include the complete reachable world-object → Open → paired-inventory entry and implement J01/J03/J05/J09 plus concurrency/access failures J06–J08 using existing handling authority. Remove the ordinary destination chooser from this path in the same slice. Do not leave two competing inventory experiences as a compatibility layer.
2. **Approach and equipment.** Extend the existing object-entry path with the distant-object approach/reach journey and clear equipment handling. Auto-approach is separately enabled only after its cancellation and arrival recheck work.
3. **Fire, gathering and crafting.** Replace the camp execution form with contextual native activity presentations and meaningful choices. Complete J10–J12 and the connected session.
4. **Conversation and handover integration.** Preserve current chat gains while connecting person/item entry, scope cues and J13/J14. New trading economics are not required.
5. **Chore reduction.** Consider bulk storage, organization, additional input modes and broader action families from measured play. These do not delay the ordinary chest interaction.

The branch now carries the approved implementation as well as the original research; completion remains subject to the actual-game journeys above and remaining native, input and usability qualification in UIUX08–UIUX11. The design's binding directions are clear; exact pixel dimensions, bindings that conflict with existing shortcuts, and native batch semantics retain explicit owners and acceptance gates. They must not reopen the decision to make ordinary players choose containers and fill execution forms.
