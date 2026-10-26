# Emergency reactions and equipment loadouts — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| Not started | Contracts and delivery breakdown are specified; executable integration and qualification remain open. | 2026-10-26 |

## 1. Scope, base and owners

Implements the selected [feature](emergency-combat-and-loadouts-feature-spec.md), including the scoped ND11/ND13 and related ND38 overlap. Design inspection used connected `Macrofold/OpenLegend` main at `beeb25179c6d772c4d3044c43e694265dd78c414`; later implementation must reconcile its actual base, not assume these source files are unchanged. Names marked **proposed** below identify new contracts, not existing runtime support.

| Meaning | Existing owner to extend | Required integration |
| --- | --- | --- |
| Actual attacks, personal encounter facts and recovery | `packages/domain/src/combat-encounters.ts`, existing combat execution and attack-family adapters | Add the mechanical opening state and lifecycle notifications here; keep it separate from perceived pair records and existing recovery. |
| Exact equipment and attachment validation | `packages/domain/src/equipment.ts`, `objects.ts`, `object-access.ts`, `resource-claims.ts` | One grouped preflight/commit path; retain placement as the only equipment authority. |
| Active defense and resulting injury | `packages/domain/src/contact-defense.ts`, `living.ts`, installed shield/body profiles | Extend the supported defense source to body or item; reuse one guard and impact owner. |
| Fictional configuration | Installed base-world composition, `packages/domain/src/worlds/base/body-policy.ts` and its definition/configuration consumers | Install the [world profile](../worlds/base/combat-readiness.md) once; generic code reads it. |
| Action command admission and current work | Existing command binder, native dispatcher, prospective work-transition and receipt owners | Guard/attack use their existing execution; add only the finite equipment-set action. No Stop-then-attack HTTP sequence. |
| Live client input and mode | Existing ASE scene/input/settings owner | Preserve Shift+T, WASD, exact gesture invalidation, mode-notice baseline and body-bound targeting. |
| Requests and public view | Existing `apps/server` WorldService/projection and `packages/protocol` contracts | Authenticated scoped commands, private emergency projection, current-format save/validation, actual receipts. |
| Panels, inventory and barter drafts | Existing App overlay/workspace and inventory/person-panel owners | Hide rather than reconstruct task state; no trade-state copy in the emergency component. |
| Saved user choices | Existing account/character-scoped preference repository and client settings | Named equipment sets and automatic-set selection; no effect authority in preferences. |

`AttackModeNotice` currently records a sequence, occurrence, time and one of own admitted offense/personally experienced assault. Do not convert it into a hidden-enemy list. `PersonalEncounter` currently owns perceived pairs and active observed action/projectile references. Mechanical opening eligibility must not be inferred from those possibly incomplete observations.

At implementation startup locate the actual current callers through these owners, including natural strikes, Punch, equipped melee, ordinary/held ranged, native NPC choice, menu actions, point fire and restoration. Record the caller map in ECL01. This is a concrete integration check, not permission to build a new architecture catalogue or rerun unrelated research.

## 2. State and configuration

### 2.1 Mechanical opening state

Add one **proposed `combatOpening`** value to the existing body/actor combat-state record. It contains current physical life, first actual occurrence/episode identity, installed policy pin, opening time, immutable sampled allowance, opening deadline, latest relevant hostile occurrence time and any pending quiet-rearm deadline. Absence means this life is eligible for an opening if the installed policy supports it. A spent episode remains spent until the defined quiet transition.

Actual active directed attacks/target-bound flights and own offensive work already own their source, target and lifetime. Maintain/reuse an exact target-life lookup from their start/end/release/contact changes; do not copy all active attacks into each player or poll every world entity per frame. Rebuild this derived lookup from current active work on load. A retained historical first occurrence need not remain an active action forever.

A qualifying attack stores its sampled opening contribution/deadline with its existing preparation continuation. It does not read the defender's changing bonus on every tick. Keep ordinary readiness and this minimum not-before contribution distinguishable so an early release cannot bypass either. A changed target at release is rechecked under §3, never treated as a new physical attack merely because the view refreshed.

### 2.2 Emergency projection

Add a **proposed `EmergencyThreatView`** to the controlled player's permitted view. It carries an opaque occurrence binding, current scope/life, whether the opening/current attack is active, authorized timing for the assistance indicator, safe description, an optional currently targetable attacker reference, and exact native Defend/Retaliate availability summaries. Hidden canonical IDs, coordinates, source equipment, private plans and all-world hostility records are absent.

Construct this from real physical attack lifecycle plus independently permitted current perception. A generic opening cue is explicitly authorized by the installed player-assistance rule; it does not call `emitPrivateObservation` as though the character saw an attacker. Ordinary observed assault still uses the existing experience and attack-mode notice path. Anonymous cue alone does not automatically enter attack mode; choosing an emergency action or the normal mode toggle can.

The initial/reconnected snapshot can display ongoing danger without manufacturing a fresh occurrence, mode-entry event or opening. Subsequent actual occurrences update the same region. Distinguish native elapsed time from received/displayed time; no browser acknowledgement controls physical completion.

### 2.3 Loadout preference

A **proposed `EquipmentLoadout`** preference contains application-assigned ID, revision, name, exact individualized item IDs with definition pins, optional saved permitted display labels, and an optional primary attack item ID drawn from that same set. Occupied ports, protection and current availability are derived from current permitted definitions/possessions; do not persist a second writable equipment map.

Scope these preferences by account, world and character. Store the selected automatic-loadout ID beside them. Use the existing preference storage boundary, not a new service or inventory database. The initial interface permits **12 sets per scoped character**; each set has at most as many distinct items as the installed body's equipment ports because every equipped item occupies at least one nonoverlapping port. Names use the existing user-label validation. The finite preference payload is bounded by those counts and existing request-size checks. [ECL limits](../limits/emergency-combat-and-loadouts.md) owns this deliberate initial restriction.

Save current equipment captures only actual individualized equipment through the placement index. This avoids introducing a speculative choose-one-unit-from-an-unindividualized-stack editor. Editing contents means explicitly replacing the preset from current equipment; rename/duplicate/delete do not change physical gear. An empty set is valid. Definition changes require reviewing/resaving the affected set; ordinary item condition changes do not permanently stale a preset's identity.

Missing items do not delete the preset or resolve to same-name replacements. Saved own labels are descriptive memory, not permission to locate a now-hidden item. Another account taking control of the character receives its own preferences, not the prior person's private presets.

### 2.4 Client-only continuity

Keep one previous-workspace reference and at most one pending automatic-loadout intention in the existing client scope. Neither is durable world state. Preserve the mounted inventory/trade owners and their existing drafts/receipt state; save only which panels were exposed and their focus route. A changed account/character/world/timeline or revoked private scope clears the affected UI work under the existing contract.

Combat mode remains the ASE input state, not a new server combat flag. Automatic loadout entry uses one local transition token under current control. Re-publication and manual On while already On do not create another token. Reconnect starts from the existing mode baseline; it never resumes the convenience or held input.

## 3. Opening-attack algorithm

### 3.1 Admission and timing

All calculations below use native simulation time and the installed normal-play conversion. Let `t` be actual preparation/recipient-binding time, `W` the sampled opening duration, and `R` the attack's ordinary readiness under its real inputs.

1. Perform normal attack permission, source, target/life and prerequisite checks. A preview, refused attack, approach before preparation or private intention allocates nothing and warns nobody.
2. Settle due native state at `t`. If the recipient's last episode has genuinely satisfied quiet rearming, retire it before deciding eligibility.
3. For a newly eligible recipient, create the opening episode with `openedAt=t` and `openingUntil=t+W`. The first qualifying preparation receives extra `W`.
4. For an attack newly beginning/binding to that recipient while their opening remains active, its extra duration is `max(0, openingUntil-t)`. For an already spent opening, extra is zero.
5. Store the admitted readiness as `max(R,t) + extra`. Apply the extra once to that exact execution/recipient binding, not again at rendering, release, save/load or every preparation phase. Ordinary preparation and the shared remaining opportunity are both respected.
6. Publish the authorized cue after this native transition commits. The client interpolates the authoritative indicator; animation tracks actual preparation progress. No damage is pre-applied or stored for a later artificial flush.

**Example at normal speed:** attack A begins at 0 with 0.5 seconds of ordinary preparation and a two-second opening: ready at 2.5. Attack B begins at 1 with 0.5 seconds of preparation: it adds the remaining one second, also ready at 2.5. A faster B can finish earlier than A after the shared opening expires. B does not create another two seconds starting at 1. An attack beginning after the opening deadline receives ordinary timing.

The first attacker may cancel; the opening remains spent. If there are no continuing relevant attacks, quiet rearming starts from the latest real hostile occurrence/end, not from a menu event. A long-held current attack or current target-bound flight prevents quiet rearming even when it temporarily leaves view. This mechanical fact does not disclose the hidden source to the player.

### 3.2 Ranged and late-bound recipients

For a target-bound ranged preparation, apply the recipient's gate when real preparation begins. Holding longer than required does not add another opening at release against that same life. At final subject/point selection, the ordinary exact review and native ray preparation identify whether the shot now threatens a different eligible player. A newly bound recipient gets its applicable gate before launch. Freeze the requested release choice through the existing pending-release owner; do not silently retarget it while waiting.

For point fire, reuse the existing first-body/solid ray query at the would-be release. A player already on that ray is eligible even without a named subject selection; private physics can determine delay without disclosing hidden identity to the shooter. Do not return hidden candidate details in the review/UI. Retain the existing collider ordering and cover behavior. A solid that would stop the shot first does not establish a player threat behind it.

After the gate, ordinary current-source/permission/target-or-point validation and collision apply. Do not repeatedly extend a consumed gate because another publication or query encounters the same recipient. A new explicit release choice is a new semantic binding under the existing input/review rules, not permission for a stale pending request to change target. Unforeseen later interception remains physical collateral, as specified in the feature.

Do not alter a released flight's speed, ray, ammunition accounting, collision or source lifetime. No delay at hit-point subtraction. Existing live-input expiry still applies to a human pending release: qualify the longest selected opening under the actual lease/renewal contract, and report expiration rather than firing after control loss. A held preparation that survives can expose its ordinary explicit Release/Cancel recovery; it does not replay the old button-up.

### 3.3 Rearming and composition

Advance the quiet deadline only from relevant admitted offense, incoming preparation/release/attempt/contact and actual end of continuing relevant work. At a quiet deadline, check the exact current-life incoming/outgoing work lookup. If anything relevant still continues, wait for that owner's next terminal/change notification; do not reschedule whole-world polling. Once empty and quiet for the world-owned duration, remove the spent opening. A new physical life initializes independently; reconnect or mode changes do not.

The SUR preparedness evaluator still samples its own actual evidence at its own specified cut. An assistance banner is not evidence. Guard becoming physically ready can contribute under the existing selected preparedness rules. Opening bonus, surprise damage, startle and native recovery remain distinct values/owners; none is multiplied into another merely because they concern danger.

Support omission and different installed timing through this same mechanism. Generic protocol/client code must not hardcode human eligibility, two seconds, the quiet interval, Focus or a bundled action name.

## 4. Defense, protective outfit and ordinary attack composition

### 4.1 Shared guard

Extend the current contact-defense source representation to an explicit item-backed or body-backed source with its exact installed definition pin. Item-backed shielding continues to bind the actual equipped shield; body-backed brace binds the installed capability on this physical life. Do not represent brace as a fabricated shield entity or a parallel status effect.

The same guard action owns preparing/ready/recovering phases, facing, readiness/expiry deadlines, eligible incoming families and one-interception consumption. Extend pure availability, ordinary action discovery, emergency offering, input, status descriptions, current validation and impact callers together. A profile can cover direct melee without covering projectiles. Resolve compatibility from the installed family, not English labels.

Current recovery cannot be canceled by mode/equipment changes or emergency submission. Starting defense uses prospective cancellation of the exact incompatible work; released effects and spent ingredients are retained. Direction must be supplied from currently permitted evidence or the character's existing facing. No hidden target lookup is allowed for choosing facing.

### 4.2 Protective equipment

Install the outfit port, one ordinary recipe and the supported passive physical-protection definition through the existing base-world definition/recipe sources. Equipment attachment is already generic; extend the injury contribution owner, not body collision geometry or every attack implementation separately. Source protection from the actual exact attached item at impact, not the pending set or the loadout preference.

Apply the selected order in the world profile through the shared contact/body effect path, including natural/melee/projectile callers. Prevent duplicate application per occupied port and round only through the existing final-health rule. Keep effect attribution private/perceived according to the normal outcome owner. Wetness, heat, starvation and unrelated conditions receive no invented armor benefit. The outfit does not repair or multiply its stored material.

### 4.3 Reaction submission

A UI reaction first captures the exact currently displayed source, target life/reference, offered operation and required prospective work transition. Clear pending automatic gear and transient input synchronously in the client. Hide ordinary panels and enter mode without using the old event as world input.

Submit **one ordinary native intention with an explicit replacement transition** through the current action owner. Extend that existing contract only where necessary; do not send Stop and then an independent attack, add an emergency executor or bypass the ordinary evaluator. The pure preflight checks the state after the proposed exact cancellation, including resources it releases. A refused new action must not first destroy the current task. Required lethal review remains read-only until confirmation; only then commit the admitted transition/action together.

Defend delegates to the same guard operation used in ordinary combat. Retaliate delegates to one ordinary neutral attack with the captured equipped source and exact currently targetable attacker. Disallow automatic approach on this emergency route. No new timed execution score, weapon choice, model call or repeat loop is selected. Ranged retaliation uses native subject aim, not the alert button's cursor position.

If a submitted result is unknown, retain the exact request and existing Check result semantics. UI closure, reconnect or another warning is not permission to retry with a new ID. A committed result wins over a later cancellation; expose what really occurred.

## 5. Equipment-set transition

### 5.1 Preflight

Create one shared read-only **proposed `prepareEquipmentSet`** operation returning the exact desired attachments, current attachments to stow, current item/definition pins, affected ports/custody ancestors, required claims and resulting capacity checks. Its inputs are exact item IDs and optional primary attack source; the preset is resolved by the server preference owner, or an equivalent explicitly supplied native set is validated for an NPC. Names never resolve objects.

Check current control/physical life, available installed operation, compatible body, unique items, one admitted port allocation per object, no overlapping occupied ports, current accessible personal custody and all required resource/active-work constraints. An individual item may occupy several ports but appears once. All items absent from the target equipment set are stowed; unchanged exact attachments need not be rewritten. Stow into the carried root, not guessed former bags. Preflight final net capacities through the existing object owner.

Ordinary offers and the Apply control consume this same prepared meaning. At admission capture the exact current dependency revisions and definition meaning, not a global world revision that changes on unrelated movement. A set with changed definition pins requires review/resave before an automatic request. The empty set is a valid explicit stow-all operation; an already matching set returns a no-op result without allocating timed work.

### 5.2 Start and completion

Add the finite **proposed `equip-set`** native action using the existing physical-action slot. It records actor life, installed operation pin, exact desired items/primary source, start/completion times and needed claims. Reuse the existing resource-claim envelope for selected and displaced equipment. No items move and no new equipment is active at Start.

At the native completion boundary, revalidate current mutable access, claims, compatibility and the exact selected objects. In one existing domain/storage transaction, detach changed attachments, stow displaced items, attach desired objects, set the existing primary-use preference if supported by that same actual set, release claims and record the actual outcome. Write only changed items/ancestors plus normal action/result records. On failure discard the equipment mutation as a whole, release this action's claims and retain old attachments.

A defensive/offensive/movement replacement may cancel this exact unfinished action. Cancellation releases only its claims and changes no attachments. An already completed switch is never rolled back. Attacks resolve against the equipment effective at their actual native ordering point. A contact and equipment completion with equal timestamps use the existing scheduler/transition order; do not add a client timestamp tie-breaker or rewrite earlier damage. Qualify that order explicitly with an equal-boundary case.

Manual switching is permitted during a fight when native prerequisites permit it, not prohibited by a global combat flag. It still cannot erase recovery. Physical movement is incompatible for this first slice. NPCs can use the same explicit equipment operation through ordinary action discovery where selected; there is no automatic NPC combat loadout or compulsory AI choice.

### 5.3 Automatic entry coordination

One client coordinator consumes existing mode transitions and current physical-work state. On off→on, resolve the opt-in set once. Keep at most one pending selection containing preset ID/revision, captured mode-entry token, current account/world/character/control/life and the exact reaction/work identity it is waiting behind.

- Idle entry may submit the equipment action immediately.
- Busy ordinary work is not stopped automatically. Wait for its unchanged legitimate completion, or the explicit emergency action that replaces it.
- Defend/Retaliate first cancels an unfinished automatic equipment action through the ordinary replacement owner, captures the still-equipped source, and takes priority. One deferred convenience may then wait for that exact reaction and owed recovery.
- A new deliberate physical command, manual equipment choice, mode exit or scope/input-authority loss clears the pending convenience before dispatch. It does not create another automatic request.
- At a matching eligible idle boundary, submit once with the expected current work/replacement identity and equipment dependencies. Reuse the existing work-generation contract to refuse a stale automatic request arriving after a newer intention. Do not add a general command queue or another global epoch.
- An admission refusal is terminal for that entry token. An uncertain request uses its existing receipt; never automatically reissue it. A visible manual Equip choice remains available when appropriate.

After the automatic action has started, mode exit requests cancellation of that exact unfinished automatic action only. It never restores prior gear or cancels an unrelated manual switch. Lost control/departure uses native continuation rules rather than a client promise that a late Cancel certainly arrived.

## 6. UI implementation

Compose a small emergency region from the existing design-system controls, action-availability explanations and shared native progress display. Give it one owner across normal HUD, sheet and modal layouts. Within a modal, register its emergency slot with the active overlay scope so both pointer and keyboard activation are legal; do not remove `aria-modal` or allow the rest of the world behind it to receive input.

Keep target/source binding stable from pointer-down or focused activation through command admission. If it becomes invalid, refuse/refresh that button rather than substituting a different target. New threats may update a non-interactive summary while the bound action remains stable. Essential blocker text stays reachable without a disabled-button tooltip.

Use the existing App/workspace close-or-hide mechanism to hide all ordinary task panels deliberately, preserving their mounted state. Separately cancel transient drag/picker/held-attack input through its own owner. One Escape still closes one relevant layer during ordinary use; the explicit emergency button is the dedicated all-panels transition. An old trade-confirmation click must never become an attack or acceptance after the transition.

The focused view adds no second renderer/camera or copied inventory. Use existing condition, weapon, guard/recovery and quick-action components, with compact automatic-loadout progress. Expose a clear ordinary way to close menus even when both reaction actions are unavailable. Return to workspace restores only UI; ordinary panel refresh/access and exact receipt owners decide what remains actionable.

Shortcuts are named remappable actions in the existing input/settings owner, initially unassigned for these new actions. Bind a specific loadout ID, not its current row number. Key repeats cannot create repeated reactions or equipment changes. Existing browser shortcuts, typing, IME, popups, camera controls and modality win according to their existing scopes. Touch activation uses the same buttons; no controller-parity claim is made without actual qualification.

## 7. Persistence, privacy and lifecycle

| State | Save/restore and loss behavior |
| --- | --- |
| Opening episode and admitted extra preparation | Save in existing body/action records with exact life, policy pin, original times and spent state. Rebuild active-work lookups. No new allowance on resume. |
| Active guard/brace and recovery | Existing guard/action/body continuation, with explicit source kind and profile. No parallel buff timer or recovery reset. |
| Actual attachments and active equipment transition | Existing object records plus one finite native action/claims. Current-format validation checks both ownership directions and exact desired items. Native pause preserves partial progress; actual departure/control/life rules may cancel. |
| Saved named sets and automatic selection | Existing account-scoped preference storage, outside gameplay rewind. Restore cannot recreate missing items or permissions. A rewind can leave a preset unavailable; it never manufactures a replacement. |
| Pending automatic convenience, held input and old click | Transient and discarded on blur, reconnect, pause/control transfer, life or timeline changes. No replay after return. |
| Inventory/trade draft and original submitted receipt | Existing same-owner UI continuity and native receipt lifetime. Hide/reopen is not another command. Revoke private content under its existing owner. |

Extend current initialization, validation, codecs, command/protocol consumers and current-format restoration together. There are no real users: do not build migrations, old-shape fallback readers, compatibility aliases or a second feature version. Do preserve current-format integrity, exact outcomes, financial/permission boundaries and unrelated authored starting content.

Validate source/target/actor life, exact IDs and meaningful dependencies at owning boundaries. Do not tie loadout identity to names or delimiter concatenation. An anonymous alert token cannot be used to query a hidden attacker. A client-supplied timer, equipped list or “in combat” flag grants no permission and supplies no actual protection.

## 8. Performance and failure scope

No new paid calls, polling agents, all-world inventory scans, per-frame action preparation or independent scheduler. Opening work is driven by actual attack/recipient/lifecycle changes and native deadlines. Exact-loadout work is proportional to selected/displaced items, occupied ports and existing affected containment ancestors; inspect via existing indexes. At most one pending auto intention and one previous workspace are retained per current client scope.

The selected 12-set preference allowance makes initial list preparation finite. Validate current availability only for the selected/visible task when relevant body/equipment/claim/access facts change, not every world frame. Public emergency projection uses the recipient's actual relevant active work and existing permitted references. Count actual work examined as well as output size during qualification; a one-banner output alone is not a bound on preparation.

A failed request never claims success; an unreadable receipt never claims failure. Native refusal leaves prior physical work/equipment unchanged unless a separately committed operation already changed it. Report actual scope and reason. Do not build speculative rollback logs, a transaction orchestration framework, generalized concurrent dressing or an omniscient threat service for this feature.

## 9. Delivery and acceptance

[ECL](../maintainers/emergency-combat-and-loadouts.md) owns task progress. The dependency order is ECL01 → ECL02/ECL03 in parallel where owners permit → ECL04 → ECL05/ECL06 → ECL07 → ECL08. A usable initial guard journey can integrate before all equipment UI is finished, but that is not completion of the whole feature.

### Required functional cases

| Case | Required observable result |
| --- | --- |
| Inventory open, known melee opening | Top-center warning; ordinary world runs; actual extra preparation; Defend exposes world, preserves draft and starts one real defense. |
| Barter draft and pending settlement | Draft survives hiding; settled exchange stands; unknown result remains checkable; failed settlement moves neither side. |
| Busy fishing/crafting | Explicit reaction performs one valid prospective replacement; invalid reaction does not first destroy work; spent inputs are not refunded. |
| Shield and body brace | Correct source/profile, facing, preparation, one interception and recovery; brace does not intercept a projectile. |
| Equipped weapon retaliation | Exactly one neutral attack against the bound attacker, no mouse-location shot, no hidden approach, no free ammo or substitute source. |
| Lethal review | Review precedes effects; decline cancels the matching attempt; emergency defense does not later fire the reviewed attack. |
| Unknown source | Anonymous assistance, no name/position leak, no enabled hidden-target retaliation; current-facing defense and ordinary escape remain possible. |
| Multiple attackers | One shared opening deadline; later attackers get remaining allowance only; held button cannot retarget. |
| Mode/menu/equipment toggles | No opening reset, duplicate automatic set, cooldown reset or repeated attack. |
| Cancel, miss, block, zero injury | Opening remains spent until genuine quiet; defense consumes only its supported connecting contact. |
| Long held aim and late subject | Already-served same-recipient gate is not repeated; newly selected player receives their own applicable pre-release gate. |
| Point fire at an existing player | Pre-release first-body query applies the same opening rule without revealing hidden identity; ordinary cover remains. |
| Released flight and unexpected collateral | Flight is not frozen or recalled; no retroactive invulnerability or post-contact damage queue. |
| Positive/negative reaction contribution | Actual installed modifier changes native delay and truthful explanation once; changes during an opening do not resize it. |
| Quiet, reconnect and new life | Genuine quiet rearms; same-life reconnect does not; new life follows its own ordinary initialization. |
| Save/load during opening or equipment action | Same remaining native work and effects under identical next input; no duplicated transfer or granted time. |
| Complete loadout and empty loadout | All desired attachments commit together; omitted equipment stows; empty set stows all; already matching set is a no-op. |
| Missing item, blocked claim, incompatible ports | Whole switch refuses with actual reason; old equipment remains; no name-based substitution or partial application. |
| Reaction during equipment preparation | Unfinished switch cancels; reaction uses old actual gear; later automatic request cannot interrupt a newer chosen action. |
| Auto entry, manual Off and reconnect | One opt-in attempt per true entry; Off cancels only its unfinished automatic work; no auto-return set or reconnect replay. |
| Injury at equipment completion boundary | Existing native ordering chooses one actual equipment state; no double protection, partial outfit or retroactive recalculation. |
| Padded outfit via ordinary play | Method, actual materials, crafting, carrying, exact equip and contact protection work; no free stock, armor-class or healing side effect. |
| Alternate installed world and omission | Different duration/body ports/defense profile works through same owners; missing capabilities remain absent without bundled fallback. |
| Keyboard, text, IME, modal and drag | No focus theft, background shortcut, click-through, accidental trade confirmation or stale release. Buttons remain accessible in the actual overlay. |
| Return to ordinary life | Same permitted inventory/trade task restored; no automatic work restart, new transaction or gear reversal. |

### Evidence requirements

Run focused existing static/native checks and small ad-hoc downstream scenarios under repository verification policy; no new automated test suite is authorized by this design task. Implementation must exercise actual authenticated server/projection and current PostgreSQL continuation, not just isolated helpers. Browser qualification covers a normal desktop, a narrow/short viewport and enlarged text with real open inventory/trade overlays, plus keyboard-only operation. Report actual assistive-device and touch limits rather than inferring compliance from component use.

**Required measurement, not a preset capacity pass:** compare baseline versus feature-enabled command-to-native-start, publication-to-visible warning, and the affected attack/equipment preparation work in a representative existing scene; include multi-attacker overlap and large-but-supported carried inventories. Report native time actually advanced, host/renderer cost, work examined, and ordinary versus worst selected paths. No new millisecond or population promise is selected before measurement.

**Human acceptance remains distinct:** observe an uncoached player fishing/trading, receiving an attack, choosing a reaction, understanding actual equipment, escaping or fighting, and returning to their task. Record whether they understood what happened, whether they felt cheated or repeatedly interrupted, and whether the encounter added excitement without making everyday activity unpleasant. Tuning changes must preserve the selected causal rules and reconcile the world/limits owners.

## 10. Decisions and non-goals

Selected: physical preparation rather than global slowdown; one encounter opportunity rather than per-enemy grace; anonymous player assistance rather than hidden targeting; ordinary actions rather than an emergency executor; current-equipment reaction before automatic loadout; one atomic set change rather than per-slot dressing; small real armor consumer rather than an empty UI promise; explicit return rather than reopening menus mid-fight.

Not selected: first-damage immunity, late-hit rollback, projectile freezing, automatic retaliation, a second hostility state, universal Focus/stamina/armor-class systems, compulsory NPC defense, generalized concurrent actions, market/vendor implementation, offline combat automation, compatibility support or a new data/queue service.

**Open product decisions: None for the specified slice.** Balance and uncoached enjoyment remain empirical acceptance, and the physical collateral limitation is explicit rather than an unresolved algorithm. An implementing agent must not reinterpret those limits silently.

## Maintained records

- Feature: [Player experience](emergency-combat-and-loadouts-feature-spec.md).
- Implementation: [ECL00–ECL08](../maintainers/emergency-combat-and-loadouts.md).
- Policy and tuning: [Bundled combat readiness](../worlds/base/combat-readiness.md).
- Limits: [ECL inventory](../limits/emergency-combat-and-loadouts.md).
- Selection: [Repertoire review](emergency-combat-and-loadouts-repertoire-review.md).
- Existing contracts: [Action availability](../action-capabilities.md#action-availability-and-temporary-execution), [identity](../identity-and-references.md#contract), [continuation](../save-and-load.md#continuation-and-identity), [native time](../simulation-time.md#native-interval-contract), [world boundaries](../engine-and-world-boundaries.md#design-principles-for-every-feature).
