# Emergency reactions and equipment loadouts — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| Not started | The design and delivery breakdown are complete; implementation and gameplay qualification remain open. | 2026-10-27 |

## 1. Scope, base and owners

Implements the selected [feature](emergency-combat-and-loadouts-feature-spec.md), including the scoped ND11/ND13 and related ND38 overlap. Inspection used connected `Macrofold/OpenLegend` main at `beeb25179c6d772c4d3044c43e694265dd78c414`. Implementation must check its actual base. Names marked **proposed** identify new contracts, not existing runtime support.

| Meaning | Existing owner to extend | Required integration |
| --- | --- | --- |
| Attacks, personal encounters and recovery | `packages/domain/src/combat-encounters.ts`, combat execution and attack-family adapters | Mechanical opening state stays separate from perceived pairs and recovery. |
| Equipment and attachments | `equipment.ts`, `objects.ts`, `object-access.ts`, `resource-claims.ts` | One grouped preflight/commit; placement remains the sole equipment authority. |
| Defense and injury | `contact-defense.ts`, `living.ts`, installed shield/body profiles | Body/item defense sources share guard phases and impact resolution. |
| Fictional configuration | Base-world composition, `worlds/base/body-policy.ts`, definition/configuration owners | Install [world policy](../worlds/base/combat-readiness.md) once; generic consumers read it. |
| Commands and current work | Existing binder, dispatcher, prospective work-transition and receipt owners | Checked replacement plus ordinary guard/attack; one new equipment-set action, not an emergency executor. |
| Input and mode | Existing ASE scene/input/settings owner | Preserve current bindings, gesture cancellation, notice baselines and exact targeting. |
| Requests and public view | Existing server WorldService/projection and protocol | Authenticated commands, scoped emergency view and ordinary result recovery. |
| Panels and drafts | Existing App overlay/workspace and inventory/person panels | Hide mounted task owners; never copy their private drafts into the alert. |
| Saved choices | Existing account/character-scoped preference storage | Named sets and automatic-set selection, without equipment or execution authority. |

`AttackModeNotice` currently records sequence, occurrence, time and own offense/personally experienced assault. It is not a hidden-enemy list. `PersonalEncounter` owns perceived pairs and observed action/projectile references; incomplete observations cannot determine mechanical opening eligibility.

At implementation startup map actual natural-strike, Punch, equipped-melee, ordinary/held-ranged, NPC, menu, point-fire and restoration callers through these owners in ECL01. This is an affected-caller check, not a new architecture catalogue. Native admission, current-format continuation and privacy retain the linked existing contracts unless this design expressly extends them.

## 2. State and configuration

### 2.1 Mechanical opening state

Add one **proposed `combatOpening`** to the existing body/actor combat record: current physical life, episode/first occurrence, policy pin, opening time, immutable sampled allowance/deadline, latest relevant occurrence time and pending quiet-rearm deadline. Absence means this life is eligible when its installed policy supports the rule; a spent episode remains spent until genuine quiet.

Reuse or maintain an exact target-life lookup from actual directed attack/target-bound-flight start/end/release/contact changes. Do not copy all attacks into each player or poll world entities. Rebuild the derived lookup from active work on load. Historical first occurrences need not remain active actions.

Each affected attack retains ordinary readiness separately from its admitted opening boundary. Re-publication, release, phase changes and restoration never add the same interval again. Changing a target cannot erase an already admitted preparation delay. The opening is mechanical state; neither it nor the derived lookup supplies character knowledge.

### 2.2 Emergency projection

Add a **proposed `EmergencyThreatView`** to the controlled player's permitted view: opaque occurrence binding, control/life scope, current/opening status, authorized assistance timing, safe description, optional currently targetable attacker, and native reaction availability. Omit hidden canonical IDs, coordinates, equipment, plans and all-world hostility.

Real physical attack lifecycle supplies anonymous assistance only when the world enables it. Independently permitted perception supplies any named attacker and direction. Do not call `emitPrivateObservation` merely because assistance appeared. Ordinary experienced assault retains its existing notice path; anonymous assistance alone does not auto-enter combat mode. A visible/recognized person is not an identified attacker without the permitted attack association, including under the selected received-pose extension.

Initial/reconnected views may show ongoing danger without creating a new occurrence, mode entry or allowance. Display time is distinct from native time; no browser acknowledgement gates contact. The indicator reports the extra opening allowance, not an exact time-to-hit or safety guarantee.

Prepare Defend and Retaliate from one shared read-only post-replacement context where their dependencies agree; reuse the existing equipped-source and action evaluators. Refresh on relevant equipment, work/recovery, control, threat or perception changes, not camera frames or unrelated inventory/world changes. Do not simulate an attack merely to populate the banner.

**Information tradeoff:** the physical delay is observable. In particular, point-fire gating can let a shooter infer that the ray threatened a player even though no identity or position is returned. This design does not claim timing-side-channel secrecy. Read-only aiming, inspection and previews must not allocate an opening, emit assistance, or expose its hidden-recipient-dependent delay. Only an otherwise admitted actual attempt reaches that gate. No new concealment, fake timing or universal projectile system is selected to disguise the tradeoff.

### 2.3 Loadout preference

A **proposed `EquipmentLoadout`** contains application-assigned ID, revision, name, exact individualized item IDs/definition pins and optional saved permitted labels. Derive ports, protection and availability from actual equipment/definitions. The installed equipped-action chooser remains the attack-source owner; no per-loadout primary-weapon or writable equipment mirror is introduced.

Scope presets and the optional automatic-set ID by account, world and character, using existing preference storage. There is **no feature-specific loadout-count cap**. Each saved set has no more distinct items than its compatible body's equipment ports because every item occupies at least one nonoverlapping port. Reuse existing label/request/storage admission; a storage rejection preserves the previous saved document and explains the failure. Do not claim unlimited storage, silently truncate sets, or add a preset service merely to paginate an ordinary personal list. [ECL-L04](../limits/emergency-combat-and-loadouts.md#ecl-l04--equipment-transition-and-preset-storage) records the growth boundary.

Save current equipment captures actual individualized attachments. Edit contents by explicitly replacing the preset from current equipment; rename/duplicate/delete changes no gear. Empty is valid. Changed definition meaning requires review/resave; ordinary item condition is read at execution and does not permanently invalidate the preset. Missing items remain unavailable, never replaced by name or recalled from elsewhere. Saved own labels do not disclose current hidden whereabouts. A different controlling account receives its own presets.

### 2.4 Client-only continuity

Retain one previous-workspace reference and at most one pending automatic-set intention within the existing client scope. Preserve mounted task owners and their existing drafts/receipts; retain panel arrangement and focus route, not another copy of inventory/trade state. Account/character/world/timeline/privacy changes clear affected private work normally.

Combat mode remains ASE input state, not a server hostility flag. One local off-to-on token records explicit selection, emergency reaction or automatic-notice entry under current control. Re-publication and On-while-On create no new entry. Reconnect consumes the normal baseline and never restores pending convenience or held input.

## 3. Opening-attack algorithm

### 3.1 Admission and timing

Use native simulation time and the installed normal-play conversion. At actual preparation/recipient-binding time `t`, let `R` be readiness from ordinary preparation **without any opening addition**, and `W` the recipient's sampled allowance.

1. Check ordinary permission, source, exact recipient life and prerequisites. Refused attacks, previews, approach alone and private intentions allocate nothing.
2. Settle due native state at `t`, including any genuinely completed quiet rearm.
3. For an eligible recipient, create `openedAt=t`, `openingUntil=t+W`. An existing active opening supplies `extra=max(0, openingUntil-t)`; a spent opening supplies zero.
4. For a previously unbound execution/recipient, compute `candidateReadyAt=max(R,t)+extra`. Retain the later of that boundary and any opening boundary already admitted for this execution. Never add `extra` to an already extended readiness or repeatedly apply it to the same binding.
5. Store the physical preparation boundary and publish assistance only after this transition commits. Native execution and animation use that actual preparation; no pre-applied damage or delayed health queue exists.

**Normal-speed example:** A begins at 0, has 0.5 seconds ordinary preparation and a two-second opening, and is ready at 2.5. B begins at 1 with the same ordinary preparation; the remaining allowance is one second, so B is also ready at 2.5. A faster B can complete earlier after the opening expires. Starting after the deadline receives ordinary timing, not a new two seconds.

Canceling A spends rather than refunds the opening. Long-held directed preparation and target-bound flight prevent quiet rearming even when unseen; that mechanical lookup grants no source disclosure. The current binding, readiness and recipient episode are sufficient: do not build a permanent history of every aim target solely to remember already elapsed waits.

### 3.2 Ranged and late-bound recipients

Target-bound ranged preparation applies its gate when physical preparation begins. Holding past readiness never charges the same recipient again. At the accepted final subject/point selection, ordinary exact review and the first-body/solid ray query determine a newly threatened player before launch. Empty-point preparation cannot prepay another player's opening; a solid stopping the ray before a player does not create a threat behind it.

Freeze that release choice through the existing pending-release owner. A new explicit release choice uses the ordinary new-binding/review rules; a stale pending request cannot silently retarget. At eventual launch, revalidate ordinary source/permission/subject-or-point prerequisites. Actual later movement and interception remain physical collateral; do not turn a held release into a recurring search for new recipients or repeatedly postpone it as bodies cross the ray. This is the declared preparation/selection boundary, not a guarantee for every person who may later enter the path.

Do not alter a released flight's speed, ray, ammunition, collision or source lifetime. No gating at health subtraction. A private ray query can affect physical delay, with the observable tradeoff in §2.2, but cannot return hidden candidate facts to review or UI.

Human pending release remains subject to existing input authority/expiry. Qualify the longest installed opening against that real lease/renewal path. Expiry disarms release rather than firing after control loss; surviving preparation uses ordinary explicit Release/Cancel recovery, never the old mouse-up.

### 3.3 Rearming and composition

Relevant incoming preparation/release/attempt/contact, own admitted offense and actual endings establish the quiet boundary. At its deadline check the current-life incoming/outgoing lookup. Continuing work waits for its owner's terminal/change notification, not a polling loop. Once empty and quiet for the installed duration, retire the spent opening. New life initializes separately; reconnect, menu, equipment and mode changes do not.

SUR evaluates actual preparedness at its own evidence cut. Assistance is not evidence; a physically ready chosen guard may qualify through SUR's existing rules. Opening allowance, surprise damage, startle and recovery remain separate. ECL can ship without the complete stealth/SUR project, but must compose correctly when it is installed. Generic consumers hardcode neither human eligibility, Focus, durations nor bundled action names.

## 4. Defense, protective outfit and ordinary attack composition

### 4.1 Shared guard

Extend contact defense to an explicit item-backed or body-backed source with its installed pin. A shield binds the actual equipped item; Brace binds a capability on the current life. No fake shield entity or parallel defense buff.

Both use one guard action for preparation/readiness/recovery, facing, deadlines, eligible contact families and one-interception consumption. Extend pure availability, ordinary discovery, emergency offering, status/protocol/current validation and impact callers together. Installed compatibility, not labels, distinguishes melee-only Brace from projectile-capable shielding.

Prospective replacement may end exact incompatible work, never committed recovery, spent inputs or released effects. Facing uses independently permitted direction or current body facing; it cannot track an unidentified source. Show meaningful limits, including that Brace does not stop arrows, rather than imply every enabled Defend protects against the current threat.

### 4.2 Protective equipment

Install the outfit port, ordinary recipe and passive physical-protection definition through current world composition. Attachments already have an owner; extend the shared injury contribution path, not collision geometry or each attack independently. Sample the actual exact attached garment at impact, never the pending preset.

Apply the world-owned order through shared natural/melee/projectile contact, once per item rather than occupied port, with existing final-health rounding and permitted attribution. Unrelated heat/wetness/starvation/status injury receives no invented protection. No durability, material repair, anatomy or full armor catalogue is required.

### 4.3 Reaction submission

Capture the displayed exact source, target reference/life, operation and prospective work replacement. Suspend the entry's unsubmitted equipment convenience while reaction/review is pending. Clear transient input, hide ordinary panels, enter mode and consume the activation so its release cannot become world input.

Submit **one existing native intention with checked replacement**, not Stop then Attack. Read-only preflight evaluates post-cancellation availability/resources. On refusal leave physical work/equipment intact. When required, lethal review remains read-only; confirmation admits replacement and action together. Decline/refusal clears pending convenience, while an unknown result keeps it nonexecutable until the original receipt resolves.

Replacement ends the exact work and continuing plan as required; it does not leave fishing queued to restart after defense. Independent outing/help consent is not blanket-canceled. Show actual agreement consequences through the owning prospective explanation.

Defend delegates to ordinary guard. Retaliate delegates to one neutral ordinary attack against its captured permitted attacker, without approach, repeats, synthetic timing input or model calls. **Require the captured source still to be the equipped source at admission.** Ordinary attack auto-equipping must not silently restore an old weapon after a concurrent loadout change. Reject and refresh instead. Ranged retaliation uses native subject aim, not the button's screen coordinates.

Resolve uncertain delivery through the original request/result owner; no new ID to repeat the action. A committed result stands despite a later cancellation. A required lethal review means Retaliate is not an unconditional instant attack: its blocker/consequence must be visible, and Defend/Return to world remain independent available choices. This design does not waive or duplicate that review policy.

## 5. Equipment-set transition

### 5.1 Preflight

One **proposed `prepareEquipmentSet`** read returns desired attachments, current items to stow, exact item/definition dependencies, affected ports/ancestors, claims and final net-capacity checks. The server preference owner resolves the preset; an NPC's equivalent explicit native set passes the same checks. Names never bind objects.

Check current authority/life, installed operation, compatible body, unique exact items, nonoverlapping ports, accessible personal custody and meaningful claims/work constraints. Multi-port items appear once. Stow omitted gear into the carried root; unchanged attachments need no rewrite. Use existing net-load/ancestor rules, not scans of unrelated bags or remembered former destinations.

Manual Equip, its shortcut and explicit combat entry with an enabled set permit prospective replacement. Display the stopped work; preflight released resources without mutating them, then admit replacement plus preparation together. No generic confirmation or Stop-then-Equip request. Automatic notice entry has no replacement authority. A matching-set no-op leaves current work alone.

Ordinary offers and Equip use the same prepared meaning. Bind relevant item/definition/work dependencies, not a global revision changed by unrelated movement. Changed meaning requires review/resave; empty explicitly means stow all. Saving or browsing a preset neither reserves gear nor grants execution.

### 5.2 Start and completion

One **proposed `equip-set`** uses the existing physical-action slot. Save actor life, installed operation, desired items, start/completion times and existing claim-envelope bindings for selected/displaced gear. Start moves nothing; old equipment remains effective.

At completion revalidate mutable access, claims, compatibility and exact items. In one existing domain/storage transaction, detach changes, stow omissions, attach desired items, release claims and record the actual result. Write changed items/ancestors plus ordinary action/outcome records. Failure leaves old attachments intact and releases this action's claims; no partial set or second writable equipment state. Actual attachment changes invalidate existing source-choice caches.

Deliberate defense/offense/walking can replace unfinished equipment work; cancellation changes no attachments. Completed changes are not rolled back. Equal-time contact/completion uses the existing native phase/order, which qualification must exercise explicitly, not a client timestamp rule. Switching during combat follows native availability, not a global combat lock, and never erases recovery. Movement remains incompatible in this first slice. NPCs may receive the same explicit operation without automatic NPC loadouts or compulsory choice.

### 5.3 Automatic entry coordination

One client coordinator resolves the opt-in set on a true off→on transition. Retain at most one pending selection with preset revision, entry token/cause, current scope/life and exact work/reaction it follows. Existing request states distinguish unsubmitted, submitted/unknown and terminal. No durable queue or periodic retry.

| Entry/event | Required behavior |
| --- | --- |
| Explicit mode selection | Submit deliberate replacement-and-equip. Failure preserves work/gear; mode may remain on. |
| Automatic assault/own-offense notice | Submit if idle; otherwise wait behind unchanged current work. Never cancel fishing or the player's newly chosen attack just because its notice arrived. |
| Emergency reaction with an unsubmitted set | React first with current gear. After confirmed admission, bind the same selection behind that action and recovery; another emergency may update the binding, not allocate another attempt. |
| Reaction after equipment admission | Checked replacement may cancel that unfinished equipment action; its entry attempt is spent, with no automatic retry. |
| New ordinary movement/attack, manual gear, mode exit or input/scope loss | Clear unsubmitted convenience before dispatch. Declined/refused reaction also clears it; review/unknown results block it. |
| Eligible idle boundary | Submit once without replacement authority, using captured equipment dependencies and the owner's exact expected idle/work revision. A stale convenience cannot displace newer work. |
| Refusal/cancellation/completion | Terminal for this entry; uncertainty uses the original receipt. Hits, refresh and reconnect create no replacement entry. |

The setting and waiting display explain this ordering and expose manual Equip. One short pending selection is the entire convenience, not a general activity queue. Mode exit cancels only its exact unfinished automatic equipment action, never a manual set or completed change. Native departure/control rules decide already admitted work; a local cancellation is not proof the server received it.

## 6. UI implementation

Compose one top-center region with shared buttons, availability explanations and native progress. It belongs to the permitted scope of the active gameplay overlay, including sheets/modals; do not disable modal isolation or allow background world input. Authentication, maintenance, disconnection and competing-tab blockers cannot be bypassed.

Use a single danger announcement per meaningful occurrence, optionally one existing UI-alert sound respecting volume/mute. This is interface feedback, not a fictional sound heard by residents. Use steady color-independent emphasis rather than strobing; reduced motion does not change native deadlines. Announce phase changes, not countdown frames.

The warning and retaliation target are distinct when several threats overlap. Explicitly name the permitted target on the button/detail; an unknown leading warning cannot silently make Retaliate attack some unrelated visible person. Keep source/target stable through held/focused activation. Invalid bindings disable/refresh rather than substitute; new threats can update the summary separately. Essential blockers remain reachable without relying on disabled-button hover.

Hide task panels through their existing owners and retain the last nonempty workspace. Repeated reactions with the scene already exposed do not erase it; a deliberately opened new workspace replaces it. Cancel transient drag/picker/held input separately and consume the triggering click/key. Ordinary Escape still closes one layer; explicit emergency action deliberately hides the stack.

The focused view reuses camera, condition, weapon, guard/recovery and quick actions. **Return to world** must remain reachable even when neither reaction is available; it hides panels without starting a native action. **Return to workspace** restores UI, not work, trade, gear or combat-mode state. Keep the mode indicator visible so the next world click remains predictable. Current access and receipt owners determine what is actionable after return. Do not auto-reopen panels when a timer ends.

New reaction/loadout shortcuts are named and remappable, initially unassigned. Bind preset IDs rather than row positions; suppress key repeat and honor text/IME, child overlays, camera and browser ownership. Visible keyboard-operable buttons remain the default route; touch uses the same buttons without an unverified controller-parity claim.

## 7. Persistence, privacy and lifecycle

| State | Treatment |
| --- | --- |
| Opening and admitted preparation | Existing body/action records retain life, policy, original deadlines and spent state; rebuild derived active-work lookup without renewed time. |
| Guard/Brace/recovery | Existing continuation plus explicit source/profile; no parallel buff or reset. |
| Attachments/equipment action | Existing object records and action/claims, bidirectionally validated. Pause preserves progress; actual departure/control/life rules decide cancellation. |
| Named sets/automatic selection | Account-scoped preference storage outside gameplay rewind. Missing items after restore remain unavailable; no replacement or permission is manufactured. |
| Pending convenience/held input/old click | Transient; discard on blur, pause, reconnect or scope/life/timeline change. |
| Drafts/submitted transactions | Existing same-owner UI continuity and original receipts; revoke private facts normally, never resubmit on reopen. |

Change current initialization, schemas, codecs, protocol and validation together. Development saves are disposable under root policy: no migrations, old-shape readers, compatibility aliases or feature-version system. Preserve same-format continuation, actual effects and current permissions. Exact identity and meaningful dependency checks belong at their owning boundaries, not repeatedly in every component. Anonymous assistance tokens cannot resolve hidden attackers; client timers, mode flags and equipped lists grant no effects.

## 8. Performance and failure scope

Use actual attack/recipient/lifecycle changes and native deadlines; no paid calls, polling agents, all-world inventory scans or independent scheduler. Work for a selected set is proportional to selected/displaced items, occupied ports and affected ancestors. Build shared reaction prerequisites once per compatible read and invalidate by their actual dependencies.

Preset storage/listing grows with the number of saved sets, with no feature-specific count cap. Read the personal list when its task opens/changes; prepare current availability only for the selected or visible task, never all presets every frame. Existing transport/storage bounds remain; record actual scanned work and bytes, not only the size of the displayed result. Add indexing or paging only for demonstrated growth in this owner, not a speculative service.

There is one pending convenience and one return-workspace reference per client scope. Emergency projection follows current relevant work and permitted evidence. A failed request does not claim success, an unreadable receipt does not claim failure, and rejection cannot destroy prior work before preflight. No rollback journal, generalized dressing concurrency or second threat/transaction service is needed.

## 9. Delivery and acceptance

[ECL](../maintainers/emergency-combat-and-loadouts.md) owns progress. Order: ECL01 → ECL02/ECL03 where shared writes permit → ECL04 → ECL05/ECL06 → ECL07 → ECL08. Integrate one useful guard journey early without treating that slice as whole-feature completion.

### Required functional cases

| Case | Required observable result |
| --- | --- |
| Inventory open, known melee opening | Warning precedes real extended preparation; Defend exposes the world, retains the draft and starts one defense while others continue. |
| Barter draft/pending settlement | Draft survives; committed trade stands; uncertainty is checkable; failed settlement moves neither side. |
| Busy fishing/crafting | Manual reaction/Equip/explicit mode entry uses one prospective replacement; refusal preserves work, inputs are not refunded, chores never auto-resume. |
| Automatic assault/own-offense entry | Notice leaves busy work intact; emergency can carry the same pending set; new ordinary movement/attack clears it. |
| Shield and Brace | Actual source, facing, phases, one interception and recovery; Brace does not stop projectiles and feedback says so. |
| Equipped-source retaliation | One neutral exact-target attack, no approach/free ammo/substitution; concurrent gear change refuses rather than auto-equipping the old weapon. |
| Lethal review | Required review precedes effects; decline cancels matching attempt/pending gear; Defend cannot later fire the old attack. |
| Unknown source | Anonymous assistance, no explicit source facts or targeting grant; unrelated visible people are not accused; actual timing inference is acknowledged. |
| Multiple attackers | Shared opening deadline; held button stays bound to its displayed attacker, even if another threat becomes earlier. |
| Mode/menu/gear toggles | No renewed opening, duplicate automatic set, recovery reset or repeat attack. |
| Cancel/miss/block/zero injury | Opening stays spent; defense consumes only an eligible connecting contact. |
| Long held aim/late subject | Same-recipient gate is not charged twice; a new explicit recipient uses its gate without summing already extended readiness. |
| Point fire at an existing player | Actual admitted pre-release threat gates; preview does not. Cover blocks normally; later crossing does not start a recurring recipient-search loop. |
| Released flight/collateral | No stopped/recalled flight, damage queue or retroactive immunity. |
| Positive/negative contribution | Real installed modifiers affect mechanics/explanation once; mid-opening changes do not resize it. |
| Quiet/reconnect/new life | Genuine quiet rearms; same-life reconnect does not; new life initializes normally. |
| Save/load mid-opening or switching | Same remaining work/results under the same next input; no duplicated objects or allowance. |
| Complete/empty/matching set | Atomic desired set, omissions stowed, empty stows all; matching is a no-op that does not stop work. |
| Missing/claimed/incompatible item | Entire switch refuses; old gear remains; no by-name substitution or partial result. |
| Reaction during equipment work | Cancel unfinished switch, react using old actual gear, do not automatically retry that spent attempt. |
| Entry/manual Off/reconnect | One opt-in attempt per entry; Off affects only its unfinished automatic work; no exit-set or reconnect replay. |
| Contact at equipment completion | Native phase/order determines one actual equipment state; no double protection or retroactive calculation. |
| Ordinary crafted outfit | Real recipe/materials/manufacture/custody/equip/protection; no free stock, healing or armor-class subsystem. |
| Alternate world/omission | Different timing/body/ports/defense and absent support work through the same owners without bundled fallback. |
| Keyboard/text/IME/modal/drag | Legal accessible emergency controls, no focus theft/click-through/old release; Return to world works when reactions are blocked. |
| Return after repeated reactions | Restore the last nonempty permitted task; no transaction/work/gear replay, mode remains visibly understandable. |

### Evidence requirements

Use focused existing checks and connected ad-hoc scenarios under repository verification policy; this design does not authorize a new automated test suite. Implementation must exercise real authenticated server/projection and current PostgreSQL continuation. Browser qualification covers normal desktop, narrow/short viewports, enlarged text and keyboard-only operation with actual inventory/trade overlays. Report untested assistive hardware/touch rather than infer acceptance from component use.

**Required measurement, not a preset capacity pass:** compare baseline/feature command-to-native-start, publication-to-warning and affected attack/equipment work in a representative scene. Include multiple attackers and large supported possessions/preset lists; report actual simulation progress, host/renderer cost, examined work and bytes. No population or millisecond promise is invented.

**Independent human acceptance:** observe an uncoached fishing/trading → danger → defend/fight/escape → return episode. Evaluate usable reaction time after delivery delay, clarity of actual equipment, whether ordinary life remains enjoyable, and whether the interruption adds excitement rather than frustration. A scripted mechanical pass is not enjoyment evidence. Reconcile tuning through its world/limits owners.

## 10. Decisions and non-goals

Selected: physical preparation, one encounter opportunity, anonymous assistance without targeting knowledge, ordinary reaction actions, current gear before automatic switching, atomic complete equipment sets, one useful outfit, and deliberate return to ordinary life.

Not selected: universal first-damage immunity, projectile freezing, automatic retaliation, hidden-target secrecy despite observable timing, a second hostility/controller system, compulsory Focus/stamina/armor-class systems, forced NPC defense, generalized action queues, shop/market implementation or compatibility support.

**Open implementation-blocking product decisions: None.** Agent-selected tuning and conveniences remain revisable. Particularly consequential choices are anonymous warning of unseen targeted attacks, one shared opening rather than per-attacker delay, reaction-first equipment ordering, unchanged lethal review, and the small Brace/outfit extensions. Their tradeoffs are explicit; balance and player preference require ECL08 evidence, not claims of flawless future implementation.

## Maintained records

- Feature: [Player experience](emergency-combat-and-loadouts-feature-spec.md).
- Implementation: [ECL00–ECL08](../maintainers/emergency-combat-and-loadouts.md).
- World policy: [Combat readiness](../worlds/base/combat-readiness.md).
- Limits: [ECL inventory](../limits/emergency-combat-and-loadouts.md).
- Selection: [Repertoire review](emergency-combat-and-loadouts-repertoire-review.md).
- Existing contracts: [Action availability](../action-capabilities.md#action-availability-and-temporary-execution), [identity](../identity-and-references.md#contract), [continuation](../save-and-load.md#continuation-and-identity), [native time](../simulation-time.md#native-interval-contract), [world boundaries](../engine-and-world-boundaries.md#design-principles-for-every-feature).
