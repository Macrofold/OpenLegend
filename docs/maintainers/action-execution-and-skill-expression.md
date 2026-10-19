# Action execution and skilled input — ASE01–ASE12

**Status: Design complete; implementation and independent player qualification not started (October 18, 2026).** This focused tracker owns the finite deliverable for [ND38 — Player skill during action execution](needs-design.md#nd38--player-skill-during-action-execution). The [feature specification](../projects/action-execution-and-skill-expression-feature-spec.md) owns gameplay; the [technical design](../projects/action-execution-and-skill-expression-tech-design.md) owns mechanisms; the [world profile](../worlds/base/skilled-action-execution.md) owns base-world chosen consequences; [ASE limits](../limits/action-execution-and-skill-expression.md) owns bounds/tuning. A researched suggestion and a designed interface are not executable behavior.

## Intended player outcome and implementation boundary

A person can run with WASD, deliberately switch to attack mode (also entering on actual observed attack), tap for a useful ordinary blow or hold and release a weapon-specific skillfully timed blow while following a moving animal with their cursor. Their projectile travels where they actually aim. A good release improves *applicable* attack odds/power without forcing an impact; a local bodily duck can cause a real miss without a full positional step. Evasion and actual shielding/armor/contact remain causal native outcomes. The same reusable optional-execution mechanism supports **carefully fitting an existing manufactured woven container** using a distinct point-placement challenge, producing a genuinely different, capacity-bearing individual item through the ordinary craft/item owner. Neither path makes human reflex mandatory for competent basic play or turns NPCs into fake mouse users.

Current status must not be read as delivery. Today aim and walking are incompatible, shots may deviate randomly, and items lack a general per-instance authored fit; all require an actual implementation against existing owners. Design review includes the previously selected but partially pending [CTR](combat-and-threat-responses.md) collateral/observed threat and [CF](parallel-batch-06-rivals-and-contested-ground.md) defensive owners.

## Dependency sequence / task checklists

### ASE01 — One admitted execution profile and family-specific score

- [ ] Extend the *existing* action/install descriptor authority with finite optional input styles (`timed-release`, `point-placement`), pinned parameters, relevant world status/competence contributions, bounds and permission to use named supported effect channels. No second mod registry, trusted generated code or universal skill stat.
- [ ] Implement one deterministic pure score evaluator and public-safe projection from a selected installed profile; ordinary tap or skipped challenge is neutral, while an accessible skilled alternative retains the same possible excellent score; unknown profile/missing applicability refuses the optional gesture while normal action remains available.
- [ ] The only first supported effects are native ranged contact, melee contact/injury, and selected woven-container fit; world name, tool appearance and arbitrary `statPath` cannot install a writer. Same mechanics work in a contrasting registered world with no bonus or no profile.
- [ ] Preserve exact version/digest pins and selected world resolution through menus, requested actions, actor decisions and restoration.

**Exit:** one profile's identical normalized input yields identical bounded output through the same evaluator in UI preview and authoritative family; different world omits it without fallback; no stored player gesture is a native effect.

### ASE02 — Controllable world and explicit attack mode

- [ ] Implement camera-relative 3D WASD movement through the existing spatial/nav/mutation owner and server-authenticated intent; normalize diagonals, preserve slope/support/collision, stop safely on blur/reconnect/lost keys/life switch. Keep camera orbit independent.
- [ ] Implement visible attack-mode on/off with remapping and reachable toggle; propose Shift+T only if the actual hotkey registry has no collision. Ordinary click retains existing select/walk outside mode; right-click menus, Command shortcuts, text focus, IME and construction picking continue working.
- [ ] Auto-enter mode after actual own admitted attack or personally delivered present hostile/hurt evidence, never a private plan, general nearby fight or retained threat expiry; deliberate Off is not overridden until fresh qualifying evidence.
- [ ] In attack mode, capture exact attack/tool and either an intended **recognized subject** or a visible **point-only** ranged shot on pointer-down. Start **one native preparation at pointer-down** for both tap and hold; a quick release commits its ordinary score-zero aim, not a separate attack path. Disabled/cooling-down capabilities do not queue/auto-switch to another target.

**Exit:** ordinary navigation remains playable, keys never trigger while typing or in conflicting UI, camera heading doesn't become body heading, mode remains predictable after two people fight nearby and after one actual directed hit.

### ASE03 — Gesture, scoped commitment and receipt continuity

- [ ] Add finite client hold/tap/cancel state with one captured pointer ID and one exact server-selected action. **Begin native windup at pointer-down**; the ring only starts locally after the 150 ms hold threshold. If mouse-up precedes native readiness or admission reply, retain exactly one captured release for later native ready/admission; a subsequent cancel revokes it. Drag-to-track is not a camera drag. Holding never autofires.
- [ ] Begin/prepare an actual native action once, then submit one release/finish with the final pointer world aim or workpiece-local placement; attach authenticated actor/life, tool/target/method profile pins, control epoch, world/load epoch and stable request identity at the existing command owner.
- [ ] Use current admission and receipts for invalid target, lost sight, bad range, no equipment/ammo, stale tool/recipe/definition, current actor work, recovery, lethal review, denied source and paused world; previews must not debit/draw randomness.
- [ ] Cancel cursor-over-self, Escape, visible Cancel, modal takeover, pointercancel, disconnection and control loss without stray release. Late HTTP responses, duplicate releases and save/reopen cannot spend twice or complete somebody else's attempt.

**Exit:** one source of truth for action/result, meaningful refusal and idempotent replay; stage admission never mutates a world during a read-only preview.

### ASE04 — Move while preparing without a second physical executor

- [ ] Reconcile the current 'moving cancels aim' rule with a narrow resource-claim compatibility: movement intent uses the existing spatial movement owner while one allowed combat preparation occupies handling, not extra actor actions. No generic multi-hand runtime assumed.
- [ ] Native handling still rejects simultaneous chosen guard, another attack, crafting or incompatible tool/body. Damage, reach, body condition and equipment interruptions are world-owned.
- [ ] Apply authoritative body/terrain collision, moving observer evidence and actual physical target changes while holding; movement and aim survive native saved continuation only where both are valid. Stops and cancellations release claims correctly.

**Exit:** freely move/track when allowed, cannot attack through a wall or guard at the same time, no position desync/ghost aim or double writer.

### ASE05 — Exact mouse-directed flight and genuine local evasion

- [ ] Replace the bundled shot-direction error law for this installed family: capture the **release pointer's physical world aim point** and actual launch anchor, fix one straight finite ray, never aim at the target's unseen center or randomly divert it. **Admit selected point-only shots on visible ground/scenery without an entity**, and retain an optional observed intended subject separately for attack review. Lost target sight does not secretly grant hidden position or invalidate an already legal point-directed shot. Ordinary tap uses the clicked point.
- [ ] Extend existing ranged/body-contact evaluation to permit a real, one-per-flight/body-life local posture or reactive avoidance when there is a genuine swept capsule contact candidate, using world native conditions, observed/unknown awareness and saved RNG. A body need not take a navigation step; don't label an unaware flinch a chosen dodge.
- [ ] A successful local avoidance creates a truthful evasion event and continues the *same* ray past that life to eligible later solid/body contacts. Preserve first actual stopping collision, material shield/armor consequences, canonical ties, stationary obstacles and actual body/target identity.
- [ ] Integrate with [CTR01 collateral/release](combat-and-threat-responses.md#ctr01--world-permission-and-actual-contact) rather than reinstating target-only immunity. Injury/contact/observer state are committed once before publication; source death does not unshoot a released arrow.

**Exit:** moving deer misses physically, a stationary body may dodge at true crossing, an unintended second body can be hit after the first evades, a wall truly stops, replay/save and privacy remain consistent.

### ASE06 — Timed melee without new combat damage executor

- [ ] Apply a family-specific permitted score to real native strike contact/chance/injury through existing body/strike/defense/recovery owners, with source weapon/proficiency computed once.
- [ ] Implement selected bow/spear/hammer contrast through **world-authored** profiles (not hardcoded weapon name branches), ordinary tap unchanged and poor timing weak but potentially successful.
- [ ] Keep reach, supported facing, windup, interruption, guard conflict and cooldown; if release precedes native ready, one captured release request applies at actual readiness subject to fresh admission, never free immediate damage or a queued burst.

**Exit:** hammer and spear visibly differ under matched native setup, no 'green through wall', tool loss/interruption/recovery cannot be escaped by cursor gymnastics.

### ASE07 — Readable input feedback and accessible alternatives

- [ ] Create a reusable input presentation over the exact pointer point: fading green/yellow rings with white moving radius; score/color/pattern/label derive from one installed profile and evaluator. Provide mode/status/ready/cooldown/blocked reason and explicit timing versus **actual observed** contact feedback.
- [ ] Reuse design-system events, focus order, keyboard/one-handed release/cancel, color-independent markings, reduced motion and high-contrast text. Give an explicitly neutral **Skip** and an accessible alternate skill-control route that can earn the **same maximum possible bonus** in noncompetitive play; do not impose worse craftsmanship on someone who cannot use precise mouse movements.
- [ ] Preserve action-menu/speech/read-through/private sight boundary, focus/popup hierarchy, narrow-screen legibility, zoom/floor picking, scaled HUD, loading/reconnect preservation and actual effect receipts.

**Exit:** no accidental actions during text entry, modal dismissal or drag; a player can distinguish green release with actual miss from bad timing with actual hit.

### ASE08 — Real quality-producing noncombat proof

- [ ] In the existing admitted woven-container family, add an optional **one finite seam-alignment point-placement finish** as part of real work. **Choose ordinary craft or careful finishing at action start**; normal craft auto-completes, while a selected careful finish captures at most one input and waits at an explicit **Ready to finish** action state if material work ends before that input. Expose Finish carefully, Finish normally and Cancel without a second crafting executor or timer. Normal craft remains complete, spend/cost/known method are unchanged, and manual work does not fabricate a second craft or reroll on completion.
- [ ] Store only an exact finite **per-individual-item** admitted fit contribution on the ordinary item owner. Effective container capacity uses one owning accessor; no global definition mutation, independent grade stat, fabricated inventory or general durability system. Preserve recipe's original `4p` material-size relationship.
- [ ] Apply selected candidate quality to a 24-capacity bag (ordinary 24, best up to 30, worst approximately 22) within installed limits; label/grade is a derived optional view. Verify actual nested contents, overflow prevention, capacity after **gift/trade to another player**, output provenance, **save/reconnect during Ready to finish**, native interruption and cancellation while waiting, current-format restore and incompatible/stacking rules; no transfer-related downgrade.
- [ ] World without admitted finishing option offers ordinary recipe only. NPCs make usable bags using native applicable skill/materials, never simulated mouse accuracy or constant legendary output. Observers learn only permitted item quality.

**Exit:** quality makes a *practical difference* to the same existing object through native inventory, not a cosmetic quality score; a second installed profile can omit or vary the feature without engine fallback.

### ASE09 — NPC parity, world variation and knowledge boundaries

- [ ] NPC/offered/native/AI chosen action executes through the same installed weapon/craft definitions, world capability and real outcomes, without a fake human gesture score or extra model decision on each animation frame.
- [ ] Existing character competence, statuses, selected conditions and real evidence drive NPC attack/craft result. Different resident, unconscious body, hidden threat and omitted-stats/world counterexamples must have truthful behavior.
- [ ] Use existing observed event/history and memory owners: no automatic knowledge of the release point, hidden target, unseen evasion, producer secrets or material provenance from a remote event.
- [ ] Reconcile all direct command, menu, Command, text activity, invented compatible recipe and paused/restored callers with one selected world rule.

**Exit:** same world law for human/NPC effects, different choosing surface, and no observer-private leak or duplicate action registry.

### ASE10 — Time, latency and competitive safety

- [ ] Keep real-time gesture display independent of simulated duration, and weapon native windup/recovery/movement independent of ring speed. Verify speed 0.5×/1×/3×/8×, paused world, model delay, reconnect and browser render variation.
- [ ] Prevent raw browser timestamps/perfect phase/effect claims from becoming a **human-PvP advantage at the actual contacted body**, including collateral impact. For an ordinary crafted bag, the server recalculates bounded fit from real method/input; sharing or trading never strips that genuine quality. An explicitly high-stakes ranked crafting contest uses a neutral creation route until separately approved trust design; keep ordinary PvP admissible under current world policy.
- [ ] Make the human-PvP competitive-skill restriction visible, classify rejected/late/conflicted submissions and retain stable receipt identity and authoritative world randomness. Do not claim anti-cheat verification from clamped inputs.

**Exit:** no silent competitive advantage from untrusted input, no extra work during pause/timeout, no missed native cooldown from faster clicks.

### ASE11 — Full integration, installed meaning and preservation

- [ ] Reconcile the existing selected [CTR](combat-and-threat-responses.md) target/hostility and [CF](parallel-batch-06-rivals-and-contested-ground.md) shield/collateral rules before editing shared source; no blanket overrides of work lanes or attack permissions.
- [ ] Update all selected rule consumers: public catalogue and tooltips, equipped shortcuts, player attack controls, NPC admissible actions, native effects/history, material/quality inspection, generated technique validation, current-format save/schema/restore and truthful player messages.
- [ ] Preserve the standard starting world's useful union when changing authored starting definitions. Test different installed world, omitted profile, changed pinned recipe/tool and source removal.
- [ ] Document actual behavior in `docs/architecture.md` **only after delivered**; reconcile task checkboxes, affected limits, selected world profile and verification reports based on what really ran.

**Exit:** the same installed rule drives normal and assisted options, actual execution, NPCs, current-world history and restore; no stale duplicate world constants.

### ASE12 — Integrated verification, performance and player enjoyment

- [ ] Existing focused native check with genuine projectile body contact, evasion, shield/armor, line-of-fire, source removal, malformed claim, exact point/camera/floor, normal/green/poor hit/miss and duplicate release.
- [ ] Actual browser interaction with WASD+mouse held tracking while deer moves or leaves sight, **point-only shot into permitted scenery**, mode toggling and surprise auto mode, safe nearby conversation, rapidly moving targets, different frame rates, reduced motion, keyboard skilled alternative with equal potential reward, text-field focus and explicit cancel.
- [ ] Full native craft before/after/failed/skipped/**accessible skilled** completion, material stock, one resultant bag, effective capacity across real player-to-player transfer and nested inventory, NPC producing usable equipment, saving/reopening, remembered observation rather than remote truth.
- [ ] Browser/server performance measurement through complete input-to-physical-effect path: local rendered frames, API/native admission, collision candidate count, 100/500 nearby actors, idle world and one held aim, menu burst with many tools, 3×/8× game pace and actual network delay.
- [ ] Uncoached player usefulness: observe whether normal tap remains viable, whether deliberate attacks feel worthwhile rather than compulsory, whether tracking an actual animal provides tension, whether changes after mastery remain interesting, and whether someone prefers/gifts/trades the better pouch *because* its capacity matters. Compare real experience against doing the same activity without handwork.
- [ ] Review complete task diff, reconcile all docs/limits/assumptions, execute required relevant checks and commit the entire task before declaring implementation complete.

**Exit:** a complete genuine first-playable demonstration, ordinary/negative paths and evidence limits reported separately. Scripted tests and arithmetic alone do not prove that players enjoy it.

## Cross-project ownership / current implementation reality

- **CTR01, CTR02, CTR09–CTR10:** actual collateral/projectile and personally perceived attack cues, stable contextual actions, independent opponent behavior. ASE adds timing/controls, not a new physical-combat authority.
- **CF02/CF03 and ranged:** actual flight, shield/guard/evade; current first-contact and human review remain until their selected revision is integrated. ASE changes the *source* of flight direction and body-local avoid chance under those owners.
- **AC/AG/AE:** installed action admission, one physical activity lane, resource holds, exact action/plan experience, source/target/produced output identity.
- **PO/INV/BW:** retained item/output identity, woven-container compiler, typed exact fit property and real native capacity. No global new item-grade ladder.
- **SW/UIUX/time:** 3D cursor ray, navigation, keyboard interactions, input scope, truthful target knowledge, elapsed server/native work and responsive renderer.

## Delivery and acceptance

All **ASE01–ASE12** are **Open**. They can be implemented and committed incrementally, but the agreed feature is ready for merge only when the full selected slice is integrated and its required checks passed. If previously selected CTR work is unfinished, satisfy the affected integration requirement rather than faking it or weakening the accepted contract. Implementation owners can reuse verified earlier checks on their unchanged paths; changed projectile/contact semantics demand new actual end-to-end evidence.

**Designed and closed:** ND38 (player execution, two distinct examples and world/engine ownership) is **Done — designed**; no functionality or playability acceptance is completed by that disposition. [ND13](needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization) still owns generic key-remapping and other controls beyond this concrete attack-mode slice, while selected CTR retains already designed contextual combat choices. Other ND entries for general world-authored stats, crafting/composition, broader bodies or clock policy remain open outside this feature.

**Explicit later decision:** human-PvP and separately ranked/high-stakes production input authenticity, acceptable latency, server challenge verification and fairness. Do not enable manually claimed human-PvP advantages until chosen and qualified. Ordinary bounded fitted goods can be exchanged in shared play without retroactively changing their physical properties. Later critical effects, generic forging minigames, item wear/repair, fully general authored effects and new platform clients remain separate candidate projects.

## Maintained records

- [Feature specification](../projects/action-execution-and-skill-expression-feature-spec.md) and [technical design](../projects/action-execution-and-skill-expression-tech-design.md).
- [World-authored skilled execution](../worlds/base/skilled-action-execution.md); [limits](../limits/action-execution-and-skill-expression.md).
- [Gameplay priorities](../repertoires/gameplay-priorities.md); [the original research design need](needs-design.md#nd38--player-skill-during-action-execution).
