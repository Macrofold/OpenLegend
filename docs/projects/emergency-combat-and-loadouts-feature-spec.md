# Emergency reactions and equipment loadouts — feature specification

| Status | Current progress | Last updated |
| --- | --- | --- |
| Not started | The selected feature is specified; implementation and gameplay qualification remain open. | 2026-10-26 |

## 1. Purpose

Let someone enjoy fishing, making things, exploring and negotiating without treating every inventory visit as a dangerous loss of control. An attack should create an exciting decision, not a contest against obstructing windows. The world remains real-time: the player notices danger, chooses defense or retaliation, gets a readable physical response, and can return to the interrupted life afterward.

This is not a combat-first redesign. Escaping with a catch, protecting an exchange, refusing to escalate a misunderstanding, or getting back to work are successful outcomes. Equipment sets preserve a person's different pursuits rather than turning those pursuits into permanent classes. A favorite handmade shield remains the same object before, during and after a fight.

**Selected requirements from Mike:** top-center emergency notifications with **Defend** and **Retaliate**; both hide obstructing menus and enter combat mode; a short defense or one attack with the currently equipped weapon; extra time on an opening attack without slowing the shared world; stat/effect adjustment of that opportunity; rapid named equipment sets; one optional automatic combat-entry set; no automatic set on combat exit.

The [technical design](emergency-combat-and-loadouts-tech-design.md) owns execution and integration. The [world profile](../worlds/base/combat-readiness.md) owns fictional rules and numerical tuning. This document owns the player experience. All newly specified behavior is an accepted design target, not a claim that it already runs.

## 2. Existing foundations and selected extensions

The current game already has explicit combat mode, personal-assault-driven automatic entry, camera-relative movement, ordinary and optionally timed attacks, exact potentially lethal review, body-scoped recovery, one-contact shield guarding, exact equipment attachments, paired inventory views and reciprocal barter. Reuse them. [Combat input](action-execution-and-skill-expression-feature-spec.md), [shield defense](../worlds/base/shield-defense.md), [inventory](../ui-ux/inventory.md).

New work is the emergency surface and transition, the opening-attack allowance, grouped timed equipment changes, named loadout preferences, a modest body-based defensive fallback, and one small wearable-protection consumer needed to demonstrate an actual change from working gear to protective gear. No new combat engine, character controller, AI decision pipeline, transaction service or universal equipment-slot ontology is selected.

The separate [preparedness/surprise design](preparedness-and-surprise-feature-spec.md) concerns what a character actually anticipates and the consequences of being caught off guard. It is not the player's interface reaction allowance. Neither rule silently replaces the other.

## 3. A complete interruption journey

**Illustrative playable journey:** you are trading three ore for five berries while carrying a river line, a knife, a shield and a padded outfit. A real attacker begins an opening attack. A compact alert appears at the top center, above the trading workspace. The world and other people continue moving. The attack's actual preparation takes longer under the opening rule; its animation reflects that longer preparation.

You choose **Defend**. The trade workspace disappears without losing its draft, the old pointer gesture cannot fall through into the world, and the existing combat mode becomes visible. Current incompatible work is deliberately interrupted. The character starts the available native defense using equipment already held, or the body's supported brace. A compact display distinguishes preparing, defending and recovering. The defense is neither instant immunity nor a guaranteed successful block.

You may then move away, attack, speak, change equipment or continue defending when available. Your optional combat loadout waits behind an explicitly chosen emergency action rather than replacing its weapon or delaying it. Once there is a safe idle boundary, that one pending equipment request can start; another deliberate physical command supersedes it. Its short progress is visible and cancellable.

Afterward, **Return to workspace** restores the trade draft or inventory reading position. It does not replay a purchase, accept an offer, resume a fishing action or change equipment. If the other participant moved away or terms changed, the draft remains, with current facts refreshed before another commitment. Already completed transfers remain completed.

## 4. Emergency notification

### Placement and content

Use one compact top-center danger region in the existing HUD/overlay system, with safe margins for small viewports and enlarged text. It must remain readable above an inventory, trade sheet or ordinary gameplay dialog. It is not a fullscreen takeover or a modal confirmation.

Show the permitted threat description, **Defend**, **Retaliate**, and any immediately relevant blocker. Examples are **“Someone is attacking you”**, **“Ada is attacking you”**, **“You can't see the attacker”**, or **“Recovering — defend when ready.”** The label must distinguish an attack being prepared from an injury that already happened. Unknown identity stays unknown.

The initial opportunity has a restrained progress indicator only when its authoritative timing is available. Its meaning is **the extra opening preparation**, not a promise that damage happens at zero or that the player is safe until then. A miss, cancellation, cover, ordinary preparation or projectile travel can change the outcome. The interface must never invent an exact unseen enemy position or attack path to draw this indicator.

An anonymous opening cue is an explicit bundled-world **player assistance signal**, emitted only after a real physical attack begins against the player's current life. It exposes imminent personal danger, not the attacker's identity, location, thoughts or proposed future plan. It does not by itself become character memory, registered preparedness, an NPC reaction, or the existing personal-assault notice. Ordinary sight/hearing/contact can independently supply those facts. Worlds may omit this assistance rule.

### Attention and multiple threats

The alert does not automatically close a menu, move focus, choose a reaction, speak, attack or accept a transaction. Repeated hits update the existing alert rather than repeatedly taking over the interface. A newly meaningful threat can announce once; no per-frame announcements, strobing or stacked full-size banners.

Use the earliest currently actionable, personally identified threat for a suggested retaliation target. An unknown threat can still lead the warning while Retaliate is unavailable. A compact additional-threat count includes only threats disclosed to this player. Once the pointer or keyboard focus is on a reaction button, keep its exact action/source/target binding stable. A newly urgent opponent must not turn a held click into an attack on someone else.

A current attack keeps the warning present. After the opening and current incoming actions end, ordinary combat feedback replaces the expanded alert; a later fresh threat may expand it again without granting another opening allowance. There is no dismiss-to-disable-danger or menu-toggle exploit.

### Input and accessibility

The alert's buttons are real keyboard-operable controls. When a gameplay modal is active, its overlay owner provides an emergency-action region inside that permitted interaction scope; do not place clickable controls behind an inert modal or add a global listener that bypasses focus rules. Text entry and IME remain text entry. An announcement may report danger without stealing typing focus.

Activating either reaction deliberately clears the ordinary gameplay overlay stack in one transition, preserves drafts, cancels transient drags/aim gestures, consumes the activating event, and returns focus to the world controls. No mouse-up, held key or old confirmation fires afterward. Authentication, maintenance, disconnected-state and competing-tab blockers remain blocking; the emergency region cannot bypass them.

Preserve existing right-click/context and right-drag camera behavior. The suggestion “right click or something” is not a decision to replace those bindings. Combat mode gains a visible **Defend** control and a named remappable action in the existing shortcut settings. Loadout switching also uses named actions/visible controls. Do not invent conflicting default keyboard combinations; unassigned new shortcuts are an intentional initial default, while existing Shift+T and WASD retain their meanings.

## 5. Defend and Retaliate

| Choice | Native intention | Important limits |
| --- | --- | --- |
| **Defend** | Hide ordinary menus, enter existing combat mode, stop/replace incompatible current work through its owner, and start one finite supported guard/brace. | Uses current equipment. Native preparation, facing, coverage, one-contact consumption, interruption and recovery still apply. No damage immunity or automatic pursuit. |
| **Retaliate** | Hide ordinary menus, enter existing combat mode, and request one ordinary attack with the exact currently equipped attack-capable weapon against the bound attacker. | No automatic repeat, weapon substitution, hidden tracking or unannounced approach. Existing permission, range, ammunition, recovery and lethal review remain. |

**Defend selection:** prefer the currently equipped eligible shield; otherwise use the body's installed brace capability. The initial brace is intentionally weaker and protects only supported direct melee contact; a shield remains useful against supported projectiles. It is not a new universal ability of every body. If the body cannot defend, keep the reason visible and still offer the separate ordinary route to expose the world and move away.

A known current attack direction can supply a deliberate initial facing. With no permitted direction, defend toward the current body facing and say that the attacker is unseen. Do not turn toward hidden coordinates. The existing native ready duration is retained rather than adding a second emergency-only guard timer. An emergency defense and the ordinary combat Defend button invoke the same action.

**Retaliate selection:** use the exact equipped supported attack source shown with the button. When genuinely unarmed, the existing supported unarmed attack may be shown explicitly as **Retaliate · Punch**. An unusable held tool does not silently become a knife or free ammunition. If the attacker is unidentified, no longer perceived, dead, out of the immediate attack's range, or otherwise unavailable, Retaliate is disabled with its actual reason. Normal contextual approach-and-attack remains a separate deliberate choice.

Retaliate uses the ordinary neutral execution path, not the optional hold/release timing challenge and not a synthetic click at the alert's screen location. For ranged tools, bind the actual permitted attacker through native subject targeting; the existing physical release, collision and exact-review rules still apply. A button starts an attempt, not an instant hit.

Neither reaction erases committed recovery, spent materials, an already released projectile, or the consequences of interrupting work. When exact potentially lethal review is required, Retaliate opens that existing review instead of silently approving it. Defend remains an available alternative subject to native eligibility. Declining the review cannot later release an old attack.

## 6. One opening reaction opportunity

The initial attack against a participating player receives additional **physical preparation time**. The world clock, other people, movement, crafting, projectiles already released and other unrelated attacks keep advancing. Everyone observing the attack sees the same longer preparation; this is not client-only animation or delayed health application.

The opportunity is shared across the defender's encounter, not renewed for every attacker, every hit, every menu, every weapon change or every combat-mode toggle. An opening is spent by actual attack preparation even if the attacker later cancels, misses or is blocked. Fresh attackers entering an ongoing fight do not each purchase another full delay. The [world profile](../worlds/base/combat-readiness.md#opening-attack-policy) defines initial duration, modifiers and quiet rearming; the [technical algorithm](emergency-combat-and-loadouts-tech-design.md#3-opening-attack-algorithm) defines ordering.

This applies whether inventory is open or not and whether combat mode is already on or off. It is not a penalty for using menus and is not removed merely because the player struck first. Own continued offense does prevent farming a quiet encounter reset.

**Physical boundary:** target-directed melee, natural strikes and ranged preparation are included. A point-directed shot whose release ray already threatens a player uses the same pre-release check, so choosing a point on a visible person is not a bypass. Once a projectile is released, it is not recalled, stopped or made harmless. A person unexpectedly stepping into an already released projectile, an environmental hazard, or ongoing burning does not acquire a retroactive opening delay. This is a first-attack preparation rule, not a universal first-damage immunity rule. This qualification deliberately preserves physical collateral and avoids a second projectile/time system.

An attack from an unseen source can provide the anonymous player assistance cue, but cannot enable identified retaliation. A player's successful deliberate defense may subsequently make them prepared under the separate surprise rules; merely displaying an alert or selecting combat mode does not. Surprise and player counterplay can therefore coexist without granting a hidden-attacker locator.

Reaction modifiers are sampled once when the opening is admitted. Their authored inputs can come from traits, stats or effects; no mandatory new Focus meter, upkeep routine or second fear formula is introduced. The same admitted duration drives mechanics and display. Normal-play seconds use the existing simulation clock: accelerated creator playback consumes the window faster; network/publication delay does not extend it. No client-acknowledgement wait grants immunity.

## 7. Equipment loadouts

### Create, edit and understand a set

Inventory's existing equipment view gains **Loadouts**. **Save current equipment** creates a named set from exact individualized equipped objects. The first editor is deliberately simple: equip the desired items using ordinary controls, then save or explicitly replace the set. Rename, delete, duplicate and inspect are ordinary preference operations; none equips anything. A set may be empty to deliberately stow equipment.

Each set shows its named items, occupied body ports, current availability and its selected primary attack source when several supported weapons can coexist. The existing world-selected preference supplies the initial primary; changing it is deliberate. No invented universal body-slot grid, class, rarity or gear score is required.

The set describes the **complete desired equipment**, not merely additions. Items currently equipped but absent from the set will be stowed; show that consequence before a manual switch. Saving references does not reserve, duplicate, protect, repair or recall the objects. Missing, traded, destroyed or inaccessible items remain named as unavailable from permitted saved information, with no live hidden whereabouts. Updating a missing entry means deliberately resaving a valid equipment set, not silently substituting another item with the same name.

### Switch

Choose a set by its visible **Equip** button or its named remappable shortcut. A short native equipment action begins; the old equipment remains in effect until one atomic completion installs the entire target set. The progress label names the set. There is no half-equipped or temporarily naked intermediate frame.

Only currently carried, accessible exact objects qualify, including eligible nested possessions through the existing access rules. No remote chest, bank, merchant stock, other character's inventory or account collection is implicitly available. Recheck current custody, compatible ports, active claims and required capacity. An unavailable member refuses the whole change and identifies the problem; do not apply a convenient subset.

The change is interruptible. A fresh explicit emergency action cancels an unfinished change and uses the still-equipped gear. An attack or injury uses the ordinary interruption rules; harm is calculated with whichever set has actually committed at that point. Cancellation never restores an earlier set after a completed change. Equipping already-matching contents is a no-op, not a new timer or recovery reset.

A switch never heals, clears status effects, refills ammunition, creates a new physical life or clears combat recovery. Ordinary compatible movement during equipment change is not selected for this first slice; walking deliberately replaces it. This keeps one physical-work owner and makes a one-second opening understandable rather than building a general concurrent dressing system.

### Optional automatic combat set

The player may select **Equip this loadout when entering combat mode**, or None. This setting is off initially. It is scoped to this controlled character in this world, not every future character.

On a fresh off-to-on mode transition, try that exact set once. Do not re-equip it on every incoming hit, every view update, reopening a menu, reconnecting, or clicking Defend while already in combat mode. An already matching set needs no work. An unavailable set leaves existing equipment intact and reports one compact reason.

**Explicit reaction wins:** bind Defend/Retaliate to currently equipped gear before processing the automatic request. Keep at most one pending automatic set while that chosen reaction and its owed recovery finish. Start it only at the next eligible idle boundary, with the same foreground character and mode still active. A newer deliberate physical command, manual gear selection, mode exit, blur/disconnection or control/life/timeline change cancels that pending convenience. There is no hidden retry queue or interruption of repeated deliberate fighting to force the set on. Show **Combat gear waiting** with **Equip now** when it is eligible, rather than suggesting it already changed.

A visible personal-assault notice may already have activated the existing mode while a menu is open. The opt-in automatic request may then begin only if physical work is idle; it does not discard a busy fishing/crafting action on its own. The emergency buttons provide the explicit authority to interrupt that work. If an equipment change is already underway when a reaction is clicked, cancel it and react with the old equipment; retain only the one permitted pending automatic selection afterward.

Leaving combat mode cancels an unfinished automatic transition/pending convenience, but never restores fishing gear or undoes a completed change. Switching back to work equipment is a deliberate one-button choice.

### Actual protective gear, not an empty promise

Current equipment supplies held tools and shields, not a finished armor catalogue. The selected first proof includes one simple padded protective outfit through an authored outfit port and the existing attachment/body-impact owners. Its precise recipe and protection are in the world profile. It permits **river line → knife + shield + protective outfit** with real carried objects. Additional helmets, armor classes, durability, layering, anatomical hit locations and elaborate donning animations are not prerequisites. The loadout operation nevertheless consumes all supported ports/items rather than hard-coding that example.

## 8. Focused emergency combat view and return

The focused view is the existing world scene with obstructing task panels hidden. Keep the player's camera position, current floor and useful orientation; no forced zoom, cinematic camera, new tactical instance or global time control.

Retain essential condition/health, the exact current weapon, defense/preparation/recovery feedback, compact threat information and immediately useful movement/Defend/ordinary attack controls. Inventory and loadout access remain reachable, and the player may reopen inventory during combat. A later minor hit does not forcibly close it again. Optional long descriptions, trade detail and lore remain tucked away rather than destroyed.

Keep a quiet **Return to workspace** control when a recoverable prior workspace exists. It restores panels in their prior arrangement and retains selection, amount drafts, search and scroll where still permitted. Revalidate external container reach and trade facts before enabling changes. If the original subject is gone or private access is lost, show the ordinary unavailable state rather than cached protected contents. Never automatically reopen a large menu because a combat timer expired; the player decides when to return.

## 9. Trade, other menus and physical safety

Looking at an interface is distinct from performing physical work. An attack alone does not execute, cancel or roll back a trade. A draft is recoverable local work; a submitted command has its original authoritative result. If settlement already completed, the exchange stands. If delivery is uncertain, retain **Check result**. If current prerequisites fail before settlement, the exchange refuses atomically. Reopening is read-only, not another purchase.

NPCs can choose to flee, fight, finish talking or refuse further exchange through their existing behavior. This design does not script every merchant to run or force a companion to defend the player. A player closing a trade window does not speak a withdrawal on their behalf.

The same emergency region works while viewing equipment, an ordinary map, character information or settings. World pause remains a separately authorized control; no menu grants a shared-world pause or immunity. Safe-feeling settlements, shelters, companions and guarded trading locations must provide their safety through actual world capabilities. Their broader design remains with existing world/encounter owners.

## 10. Stages, acceptance and open decisions

Deliver one complete ordinary journey first: known attacker → top-center alert → Defend from inventory → real guard/contact → deliberate return to the same draft. Then add opening timing across melee/natural/ranged, exact equipment switching and the opt-in ordering, followed by actual barter, unknown-source and multi-attacker journeys. The full agreed feature is not complete until all selected paths pass; stages are not permission to silently omit the difficult ones.

[The implementation tracker](../maintainers/emergency-combat-and-loadouts.md) owns dependencies and exit criteria. The technical design contains concrete acceptance cases and required measurement versus human-play evidence. No provider call is required for the alert, defense, retaliation or equipment operation.

**Product decisions are settled for this design.** Initial durations, brace effectiveness and outfit protection are explicit tuning hypotheses, not scientifically established reaction times or measured balance. Independent playtesting must assess whether peaceful activity feels safe enough to enjoy, whether the opening remains exciting, whether automatic equipment behavior is understandable, and whether defense/escape are worthwhile. Those empirical questions are not missing technical specifications.

The [repertoire review](emergency-combat-and-loadouts-repertoire-review.md) records whole-catalogue-area implications, selected connected scenes and deliberately unselected expansions. ND11, ND13 and the related ND38 interface slice are covered only to this scope; existing broad design, implementation and acceptance obligations remain open in their owners.

## Maintained records

- Implementation and acceptance: [ECL00–ECL08](../maintainers/emergency-combat-and-loadouts.md).
- Technical design: [Emergency reactions and loadouts](emergency-combat-and-loadouts-tech-design.md).
- World rules: [Combat readiness](../worlds/base/combat-readiness.md).
- Limits and constraints: [ECL limits](../limits/emergency-combat-and-loadouts.md).
- Existing integration: [ASE input](action-execution-and-skill-expression-feature-spec.md), [CTR combat](combat-and-threat-responses-feature-spec.md), [SUR preparedness](preparedness-and-surprise-feature-spec.md), [inventory and barter](../ui-ux/inventory.md).
