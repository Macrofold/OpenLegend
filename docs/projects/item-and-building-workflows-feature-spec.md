# Item and building workflows — feature specification

| Status      | Current progress                                                                             | Last updated |
| ----------- | -------------------------------------------------------------------------------------------- | ------------ |
| Not started | The follow-on design is prepared; implementation and its acceptance checks have not started. | 2026-10-14   |

**Design scope selected by Mike:** turn the inventory, crafting, equipment and construction learnings into a concrete OpenLegend follow-on with implementation tasks. This document proposes the additions; it does not authorize runtime implementation or change current world rules. Parent design needs remain [ND13 — usable action controls](../maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization) and [ND07 — usable buildings](../maintainers/needs-design.md#nd07--editable-buildings-that-become-usable-homes). Neither broader entry is closed by this selected slice.

## Maintained records

- Implementation, dependencies and remaining work: [IWB01–IWB07](../maintainers/item-and-building-workflows.md).
- Limits and deliberate omissions: [IWB limits](../limits/item-and-building-workflows.md).
- Mechanisms and ownership: [technical design](item-and-building-workflows-tech-design.md).
- Existing interaction standards: [inventory](../ui-ux/inventory.md), [world interaction](../ui-ux/world-interaction.md) and [system feedback](../ui-ux/system-feedback.md).

## 1. What already exists, and why this is a follow-on

The missing sequence in the Rust research was **missing current-version visual evidence about Rust**, not a finding that OpenLegend has no inventory or construction. The owner audit began at `b72e9d9aab8072eb1b5ae9d25f620a4421509148`; this project branches from published main `57a2977e22bab3f7293caa4a176c9ef4ba800751`, which also integrates foundation privacy and continuity repairs. Current client excerpts were checked at that latter revision. Described delivery below relies on the named current owners and their recorded evidence, not a new playtest.

### Existing inventory foundation

Exact-quantity moves, nested-container navigation, scoped search and native equipment comparison are already delivered in the scope recorded by [PW04 and UIUX04](../maintainers/ui-ux.md#uiux04) and the [persistent-object design](persistent-objects-feature-spec.md). The addition connects inspection, an exact transfer and the resulting item without lost selection, and adds deliberate equip-and-stow destination review.

### Existing recipe and activity foundations

Learned-recipe detail and ordinary Craft exist; creator recipe editing is a separate workflow. [PW11 ordinary recipe inspection](parallel-batch-01-playable-week/invention-workspace.md#ordinary-player-recipe-inspection) and [UIUX05](../maintainers/ui-ux.md#uiux05) retain their delivery and remaining qualification. The addition is a finite player-selected crafting list, clear pending/current/produced states, and a route from actual output to ordinary use or storage.

[Action records and learned activities](../action-experience.md#selected-execution-and-inspection) already provide native finite execution and actual produced-output bindings. The addition is a player-facing manufacturing-list editor and explicit lifecycle controls over that executor, not a second queue engine.

### Existing shelter and continuity foundations

Flat one/two-bay shelters and a single-bay lean-to already have preview, build, stop/resume, replacement and reclaim within the [shelter design](editable-shelters-feature-spec.md) and [SH delivery](../maintainers/editable-shelters.md). The addition improves placement/refusal/correction continuity and the complete choose → review → build → use → revise journey over those supported arrangements.

Same-character draft continuity, current private reads and truthful transaction recovery remain owned by the [foundation follow-through](../maintainers/ui-ux.md#future-improvements-from-the-foundation-review) and [save/load contract](../save-and-load.md#continuation-and-identity). Apply these guarantees across the connected tasks without reopening completed foundation repairs.

The new project owns these additions, not the unfinished broad PW04/PW11/SH/UIUX qualification programs. A defect in an existing primitive is repaired in its existing owner and referenced here; it is not a second implementation of that primitive. Existing project documents retain their delivered subsets and unmet acceptance.

A concrete current presentation issue illustrates the need: `apps/client/src/ui/recipe-details.tsx` labels a recipe's prospective product **Actual output** before crafting. This project uses **Makes** or **Expected result** for a recipe, reserving **Produced** for a completed outcome with real item references. The inspected component is evidence of the label, not proof of every surrounding UI defect.

## 2. Player experience and non-goals

A person preparing an outing should be able to answer: what is available, which part is usable now, what making it requires, where the result will go, and what actually happened. A builder should be able to move a proposed shelter, understand a refusal, correct it and later alter the real shelter without confusing a preview with construction.

Keep the ordinary short routes. A single safe Craft, Move or Equip must not require creating a work list or passing a new confirmation wizard. Introduce a review where several possessions, destinations or material consequences need to be understood. Reuse the current panels, design-system controls and camera meanings; this is not a Rust-themed replacement interface.

This slice adds no universal inventory grid, carrying-slot cap, armor plates, automatic best-gear score, saved loadout system, PvP/theft permission, corpse-loot rule, compulsory station tier, blueprint currency, factory, offline production, raid protection, upkeep tax, forced wipe, walls/doors or new structural physics. Those are separate world/mechanic choices. The current browser delivery and supported input promises remain unchanged.

## 3. Inspect, collect and move without losing the intended item

Enter from carried inventory, an already permitted container, or an ordinary perceived ground-pile interaction. Keep the selected object's readable identity, source and intended quantity visible while inspecting uses or choosing a destination. Identically named items remain distinguishable by their permitted location and state, not by forcing the player to read internal IDs.

Present **total held**, **usable for this operation**, and any disclosable reason for held/unavailable units separately. A partially reserved lot must not appear wholly free or wholly absent. Unknown availability stays unknown. Current container rules determine load and capacity; the base world's packing units are not kilograms or Rust inventory slots.

A destination selection is read-only. If approaching or inspecting a container is needed, make that a separate explicit action. A visible bag does not disclose its unseen interior. A permission failure should not explain itself by revealing another person's hidden contents, identity or private reservations.

For a reviewed transfer, keep the exact item/quantity and destination fixed through refresh. If access, stock or capacity changes, show the relevant permitted change, retain the lawful draft and request a fresh choice. Do not substitute another similarly named item, silently reduce the quantity or drop overflow on the ground. After a confirmed result, keep a route to the actual remaining source and transferred output, including when a split or merge changed the lot identity.

The existing **Pick Up All** operation has its own meaning: eligible pile contents are selected at completion. Do not relabel it as an exact previewed selection. This follow-on does not change that command. A new exact reviewed operation binds the enumerated selection; an incomplete page cannot certify an entire container or all possible destinations.

## 4. Make a finite crafting list

### Inspect and prepare

Known-recipe detail distinguishes the known method, required tools/place or station where applicable, actual inputs, native work duration, expected products and interruption consequences. Existing family descriptors supply these facts. The UI does not invent a station requirement or assume every recipe consumes at the same phase.

**Craft once** retains the current ordinary command. **Add to crafting list** prepares a finite list without starting work, acquiring knowledge or reserving materials. The quantity is explicitly **number of crafts/batches**, with the expected product quantity per craft where known. A recipe that produces several objects must not confuse batch count with units of one selected product.

Rows have stable positions and identity. The player can change counts, remove a pending entry or move it using named controls; dragging is optional, never the only route. Counts accept intermediate editable text without silently turning a blank into zero or dispatching work. A changing availability sort must not move a target under the cursor.

Show combined known requirements for the list while respecting shared inputs. Do not claim the same four free units independently fund two four-unit entries. Exact selected inputs remain exact; supply-based recipes retain their explicitly described native selection rules. A recipe whose inputs depend on earlier products is marked as such, not incorrectly declared impossible before those products exist.

There is no automatic gather, purchase, invention, recipe discovery or search for an optimal production chain. Players can add a known supported preceding recipe themselves. Unsupported composition is explained before starting; selecting a wished-for result is not permission to invent a new mechanic.

### Start and follow real progress

**Start crafting list** names the actor, chosen order, known material commitment and any current work that would be replaced. Existing action admission decides whether replacement is allowed. Do not stop unrelated work merely by opening or editing this list.

There is one existing physical-work lane for the actor. Accepted list entries are intentions, not a warehouse of reserved future stock. The first craft is admitted against current state; each later craft rechecks its actual recipe, knowledge, inputs, equipment, place and authority at its own start/effect boundary. Waiting entries do not secretly lock the household's possessions.

Display the current craft, progress actually reported by its owner, completed count, pending entries and any blocker. Native work time is not a promised wall-clock completion time: pauses, movement, interruptions and changing conditions can alter when the list finishes. A transport spinner must not masquerade as crafting progress.

**Pause after this craft** finishes the currently admitted craft and stops before starting the next. **Stop current work** uses the existing interruption rule and clearly explains any already-consumed material or preserved partial work. Removing an unstarted entry spends nothing for it. Reordering the pending suffix does not restart the active craft or erase completed products. A dependent entry cannot be moved ahead of its producer.

When a step fails, the list identifies the failure and stops further automatic dispatch, including independent later entries. It does not silently skip, retry or refund. **Review remaining work** opens the unstarted remainder with fresh facts. Resuming a supported paused list and starting a new attempt after a cancelled craft remain different choices; already completed steps never run again accidentally.

### Finish with something useful

A confirmed craft reports the actual product and its ordinary location. **Inspect produced item**, **Equip** and **Choose storage** lead into existing native tasks using the receipt's actual output, not an expected placeholder or an old same-named item.

The first release's worklist contains manufacturing, not arbitrary automatic inventory transactions. Storage and equipment follow-through are explicit separate actions. If the craft succeeds but storing its product is refused, say **Produced; not moved to that storage**. The product remains in its actual native location. There is no hidden overflow buffer, automatic drop, repeated Craft or refund. Automatic logistics would require a separately qualified action composition, not an invisible convenience rule.

## 5. Replace equipment with a visible disposition for conflicts

Start with a candidate already in the actor's own accessible possessions, including a nested bag. Collecting something from the ground remains a separate ordinary pickup; a time-consuming approach and subsequent swap must not be presented as one indivisible transaction.

Show the candidate, the actual current equipment it conflicts with, the body places affected, relevant comparable native characteristics, and **where each displaced item will go**. The existing default remains stowing conflicts in carried possessions. The added review permits choosing an accessible container within the actor's own possessions where supported. It does not deposit items in another person's inventory or grant access to a locked bag.

Capacity is evaluated for the complete resulting arrangement. Taking a candidate out of a bag can free room for the displaced tool. A bag that is full before the swap is not necessarily full afterward. Conversely, compatible body attachment does not guarantee a chosen stow destination can accept the old item. The displayed review must match the native final-load calculation.

**Equip and stow** commits the admitted equipment/destination change together or changes nothing. Every conflict is included. On changed access, reservations, incompatible body, invalid destination or insufficient final room, keep the current equipment and all possessions unchanged and preserve the lawful draft. No item is silently destroyed, dropped or moved to a guessed alternate destination. Ordinary Equip remains available without this expanded task when its current behavior suffices.

The first usable comparison exercises the existing tool/shield/two-handed equipment vocabulary where installed. It does not introduce armor slots or new combat values. Generated and world-authored equipment use the same compatibility and quantity owners.

## 6. Place, understand a blocker, build and revise

### Draft and checked placement

Refine the existing construction view and preview-shape path rather than build another placement engine. Choose an installed arrangement, actual materials, a supported site and orientation. Offer alignment assistance only at anchors/orientations that the family supports. Do not impose a world-wide grid or imply arbitrary rotation when a particular arrangement has discrete supported headings.

A moving draft is **Not checked**. A returned review is **Checked for this placement and these inputs**. Material, permission, arrangement, support or relevant geometry changes invalidate that review while retaining the intended layout. Distinguish a blocked result from still checking, incomplete geometry preparation and a failed request. Color supplements the words; it is not the only way to identify a refusal.

The preview represents permitted actual extents, including height, cover and orientation. A useful blocker explains what the player can change: choose another material, move the proposed footprint, select a supported surface, clear an obstruction lawfully, or obtain the relevant permission. Do not disclose unseen actors or private property through a detailed collision label. No available checked placement is a guarantee that conditions will remain unchanged by the time a worker reaches it.

Provide named move/orientation controls and a non-drag route alongside any pointing affordance. Keep search, material choices and placement intent through viewport changes and an ordinary refusal. Hiding the panel clears the transient ghost without turning its last location into a command; restoring a draft requires fresh permitted facts before it can be submitted.

### Commit and use

**Build** starts the existing native phased work with its actual materials, support, reach, body clearance and construction grants. The UI distinguishes an admitted request from completed posts, attached cover and a finished arrangement. A stopped build retains only the parts and costs the native owner actually committed; the applicable Resume or reclaim choice explains what is left.

A successful demonstration includes using the place: approach and leave it, rest where already permitted, put a real belonging there, and return. Rendering a convincing roof is not sufficient. The project adds neither a magical safe zone nor guaranteed comfort, household membership or NPC preference.

### Correct or change the real structure

Before Build, **Back**, **Cancel preview** and changing a field affect only the draft. After material commitment, the available verbs are the installed family's real operations: compatible material replacement, supported extension, Take down or Dismantle. Do not label them free Undo or a universal Upgrade tier.

Review what remains installed, the spare inputs, work, actual reclaimed-output destinations and any temporary loss of cover. A **keep covered** constraint is respected or explicitly refused, never silently weakened. Full reclaim destinations, occupied work space or changed access refuse new effects according to the native phase rules; earlier completed work remains factual. Material condition and identity follow the real parts through removal, reuse and reinstallation.

This slice stays within qualified flat one/two-bay and single-bay lean-to behavior. New walls, doors, heavy supports, deterioration or destructive raids require their own ND07/world-design scope. Existing SH lifecycle and geometry qualification remains independently tracked.

## 7. Continuity across the whole task

Browsing, previewing and editing do not pause the world by themselves. The existing explicit pause, technical-hold, presence, death and save/load owners determine what can continue. In particular, the current human-departure rule is not replaced by offline crafting. Returning shows any interrupted work and its real outputs/costs; it never silently restarts cancelled work.

Same-character control renewal and panel adaptation preserve permitted drafts. A true account, character, world or timeline replacement re-scopes them before rendering private facts. Read validity is refreshed independently of draft identity; retaining an intention does not retain revoked access or stale inspected information.

An unconfirmed write stays **Outcome not confirmed** until the original operation is reconciled. Do not send another operation identity merely because the first reply was lost. A completed outcome can be recovered under current disclosure authority without re-executing the action; stale permissions never authorize a new effect.

NPCs remain independent actors. This interface grants no permission to assign them work, inspect their private possessions or change their decisions. Existing player/NPC native actions must remain consistent if a shared action projection changes; a helpful-looking NPC reaction is not an acceptance criterion for these controls.

## 8. Acceptance journeys

These are future checks, not reported tests. The tracker assigns their delivery; inherited wider programs keep their own exits.

**Prepare for an outing:** find an exact item in a nested bag, inspect a known recipe, make a finite quantity, identify the actual product, equip/use or deliberately store it. No creator permissions or model call are required.

**Shared material shortage:** two entries compete for the same free stock; list review does not double-count it. A later shortage stops at the real boundary and preserves earlier completed outputs.

**Pause, reorder and stop:** pause after the active craft, reorder only a valid pending suffix and resume once. Separately stop a craft and show its native sunk cost without replay/refund.

**Full storage after crafting:** the product exists exactly once. A failed move leaves it in its real location and offers a fresh storage choice, not another Craft.

**Full-bag equipment replacement:** an exact candidate leaving a full bag creates sufficient final room for the displaced item where the capacity rule permits it. An impossible or stale swap changes neither equipment nor stock.

**Loot/transfer changes:** another actor removes an item or revokes container access during inspection. No substitute item, hidden-content leak or stale action survives. Existing changing-all pickup and new exact review remain distinct.

**Build after a refusal:** draft placement is blocked, the safe explanation guides a valid correction, fresh review precedes Build, and the completed structure supports its intended ordinary use.

**Revise while preserving material:** replace or reclaim actual shelter parts. Keep-covered refusal, full destination and occupied work-space failure preserve exact completed phases and state.

**Lost reply and changed timeline:** reconcile the original committed operation once. Old reads, ghosts and pending submissions cannot publish into the restored world.

**Accessible ordinary controls:** pointer and keyboard/no-drag journeys work in desktop, narrow and short layouts with long names and enlarged text. Popup dismissal does not move the character and updates do not move the intended target.

Use genuinely different supported content, not just renamed items: single versus multi-output manufacturing where installed, one-hand versus multi-port equipment, and flat versus sloping cover. Omitted capabilities must not appear as mysteriously unavailable variants. Record native correctness, observed UI behavior, measured cost and uncoached human understanding separately.

## 9. Research trace and delivery decisions

The source is the [Rust study at its inspected revision](https://github.com/Macrofold/OpenLegend/blob/5b1af798987b66bc41f9134fb8f23e452d7f0866/archive/02-research/game-inspiration/dossiers/rust.md) and its [53-asset visual atlas](https://github.com/Macrofold/OpenLegend/blob/5b1af798987b66bc41f9134fb8f23e452d7f0866/archive/02-research/game-inspiration/dossiers/rust-visual-atlas.md). Those immutable references do not require merging the research branch to use this design.

The general lesson routes are BUILD-L001/002 (placement versus purpose), CRAFT-L001/002 (making prerequisites and useful output), GEAR-L001/002 (destinations, custody and identity), UX-L001/002 (stable targets and truthful action states), and LOSS-L001/002 (continuity and a worthwhile next choice), recorded in the research revision's [assessment ledger](https://github.com/Macrofold/OpenLegend/blob/5b1af798987b66bc41f9134fb8f23e452d7f0866/archive/02-research/game-inspiration/synthesis/assessment-records.md). These inform the choices above; they are not proof that the proposed interface is enjoyable or that Rust's unseen current workflows have been qualified.

**Design disposition:** the selected additions and boundaries are specified; no unanswered Rust fact blocks implementation planning. Exact visual tuning uses existing tokens and later actual-task evidence, not a new theme or unsupported numerical target. The larger excluded mechanics remain unselected, not secretly assumed prerequisites. Runtime implementation requires Mike's subsequent go-ahead. A first useful release can deliver item review and equip/stow before crafting-list or shelter refinement; the complete requested follow-on still includes all IWB modules.
