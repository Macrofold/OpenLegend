# Combat readiness, emergency defense and quick equipment

**Selected design; not implemented.** This is the bundled world's sole policy owner for the new [emergency reactions/loadout feature](../../projects/emergency-combat-and-loadouts-feature-spec.md). Existing [combat](combat.md), [shield defense](shield-defense.md), [items](items.md) and [skilled execution](skilled-action-execution.md) remain current until the corresponding ECL tasks are implemented. These rules are not universal laws of the engine.

## Opening attack policy

| Choice | Selected value and meaning |
| --- | --- |
| Eligible recipient | A physically participating human-controlled character's current life, including its ordinary vulnerable departure interval. No dependency on an open menu, current input mode or current browser focus. |
| Base additional preparation | **2 normal-play seconds**. This is added to the opening attack's ordinary preparation, not substituted for it. |
| Effective allowance | `clamp(2 + reactionBonusSeconds, 0.5, 4)` normal-play seconds, sampled once at opening. |
| Default modifier | Zero. An omitted optional modifier is neutral; an absent opening capability means no opening rule, not an implicit base-world fallback. |
| Quiet rearming | **10 normal-play seconds** without a new relevant incoming attack occurrence or the player's own admitted offense, after ongoing relevant preparation/target-bound flight/own offense has ended. |
| Multi-attacker treatment | One opening deadline shared by the recipient's encounter. An attack begun before that deadline adds only the remaining opening allowance to its own ordinary preparation. No new full allowance per attacker. |
| Consumption | Actual physical preparation or a newly bound pre-release threat spends the opening. Cancellation, misses, blocks, zero injury, closing menus and mode toggles do not refund it. |
| Existing committed effects | Released projectiles, committed contacts and ongoing environmental injury are not slowed, recalled or made harmless. |

Convert normal-play seconds once through the installed normal clock. At the current 60:1 rate the base extra preparation is 120 simulation seconds, the clamp is 30–240, and quiet rearming is 600. These are explanatory conversions, not independent constants. Pausing freezes the native deadlines; faster creator playback consumes them faster. Host/network delay does not purchase additional mechanical time.

Reaction bonuses use the existing installed attribute/status contribution owners. The opening consumer reads one effective scalar in normal-play seconds and pins the contributing rule meaning at admission. A later Focus definition may map its own normalized value to that contribution; this feature does not introduce a mandatory Focus meter or invent a default psychological score. Qualification must install an actual positive and negative contribution, exercise their native effect, and show the same duration in the player's explanation. A value of +1 yields a three-second base opening; −1 yields one second. Later stat/effect changes do not resize an opening already underway.

The rule covers supported direct melee, natural contact strikes and ranged preparation against the eligible recipient, regardless of who controls the attacker. For held ranged work, a newly selected recipient receives their applicable gate; preparing at an empty point cannot prepay that player's opening. Point-directed release uses the existing physical ray/first-body query at the accepted choice and each actual native launch attempt. A newly threatened eligible player gets the applicable opening; a served recipient adds no new time. Cover stopping the ray first does not establish a threat behind it. Ordinary readiness stays separate from added delay, so rebinding cannot charge an already extended readiness again or erase an admitted wait. The selected shot may still miss.

The assistance signal is **personal incoming danger**, without explicit hidden identity or location. It is emitted at real physical preparation or an admitted pre-release threat, never at a private thought, proposed action, approach alone, preview or merely nearby fight. This deliberately sacrifices completely untelegraphed targeted player ambushes in favor of a first reaction opportunity. Ordinary sensing still determines what the character knows and whether the player can target the attacker. Assistance is not registered warning evidence for [preparedness](combat.md#selected-awareness-preparedness-and-surprise) and does not automatically remove surprise damage.

Seeing or recognizing a nearby person is insufficient to name them as the attacker. Naming and Retaliate require an independently permitted attack association followed by current exact-body targeting eligibility. Under the received-pose extension use acquired physical evidence, not private target metadata. Assistance tokens cannot resolve a hidden source for inspection, memory, facing or execution. The longer physical attack is nevertheless observable: a shooter can potentially infer a player on a point-fire ray from its delay. This is an explicit assistance tradeoff, not a promise of timing secrecy or permission to expose the queried body. Read-only previews must not provide that hidden-recipient-dependent timing signal.

A player crossing into a pending shot's ray before launch is checked at the next actual launch boundary. Any new delay uses existing readiness scheduling, not per-frame ray polling, a recursive launch loop or changing the selected target to the collider. Once launched, ordinary physical collision is final: a person entering that flight receives actual contact and harm without retroactive first-damage protection. Burning, hunger, falling, traps with no supported attack preparation and accidental contact are not converted into this family. A new harmful family needs its own supported pre-effect adapter before advertising opening protection. These declared boundaries do not permit omitting an existing supported attack caller.

## Defense policy

Emergency Defend and ordinary Defend choose the same native action. An equipped compatible shield is preferred. Its [existing profile](shield-defense.md#guard-one-incoming-contact) remains authoritative: initial wooden shield 50% supported injury reduction, front 120-degree coverage, 0.25 normal-play-second preparation, at most three seconds ready, one connecting eligible interception, then one second of body-scoped recovery. A miss does not consume the interception. Movement or offense ends readiness under ordinary replacement rules; committed recovery remains.

The selected small extension supplies **Brace** to the initial person body profile when no eligible shield is equipped. It uses the same preparation, ready window, one-interception and recovery behavior, with **20% reduction of supported direct melee contact injury** in the front **120-degree sector**. It does not intercept projectiles, heat, starvation, ongoing status injury or attacks outside its coverage. An already-held two-handed tool is not silently dropped; the body-based brace is an authored defensive posture, not an equipment transfer or simulated anatomical maneuver.

The chosen known direction sets facing once. Without a permitted threat direction, keep the body's current facing; neither camera direction nor a hidden source becomes automatic tracking. Native incapacity, work interruption restrictions and recovery can prevent defense. No emergency cooldown exception, passive permanent guard or new stamina system is selected. Explain the actual chosen defense, including Brace's inability to stop arrows.

Profile selection and offered explanation share the impact owner. Alternate bodies can omit Brace or install another supported profile. Shielding remains materially stronger, particularly against supported stone/arrow families.

## Equipment-set policy

A complete set change takes **one normal-play second**, admitted once as 60 simulation seconds at the current normal rate. Size does not add a per-item timer. Current single-item equip behavior is not silently changed; the grouped action is a convenience with one readable commitment.

Old attachments remain effective throughout preparation. At completion atomically stow omitted equipment in the character's carried root and attach exact desired objects. Validate final net capacities where installed. No item is dropped, repaired, duplicated, granted ownership or fetched remotely. Existing bag capacity is not a new global weight law. Reuse the same placement/conflict checks as ordinary Equip and the separately deferred [IWB02 equip/stow](../../projects/item-and-building-workflows-tech-design.md#5-compound-equip-and-stow-at-the-custody-owner); its chosen-bag destination UI is not required here.

Only accessible items in the character's possession tree qualify. Attached shelter/assembly parts are not body equipment. A preset is the complete desired compatible set; empty stows all and matching is a no-op. Incompatible bodies/ports, missing objects or blocked claims refuse the whole action.

Equipment uses the ordinary physical-work slot. Deliberate Equip or explicit combat-mode entry with the opt-in set may replace incompatible work through the checked transition. Automatic assault/own-offense notices carry no such authority. The [feature ordering](../../projects/emergency-combat-and-loadouts-feature-spec.md#optional-automatic-combat-set) owns those input meanings.

Defend, Retaliate or walking can replace an unfinished switch; existing injury interruption also applies. Cancel before completion changes no attachments, while completed switching stands. Recovery and status effects survive. Retaliate must still find its displayed source actually equipped at admission; it cannot silently auto-equip a stale weapon after a competing switch.

## One useful protective outfit

Current held equipment does not already implement armor. This first consumer adds one authored **outfit** port to applicable people and one **Padded outfit** definition, not an anatomy-slot system or full armor catalogue.

| Property | Selected first profile |
| --- | --- |
| Equipment | Occupies the outfit port; grants no melee/ranged/gather/guard tool use. |
| Packing load | 3, using existing packing units. |
| Protection | Reduces remaining supported direct physical contact/projectile injury by **20%**, from the actually equipped exact outfit at impact. |
| Known ordinary method | Consume **12 prepared fiber and 4 cord**; produce one Padded outfit after **600 game seconds**, through existing manufacture/claims/output owners. |
| Initial access | Add its ordinary method to applicable first-playable recipe grants; actual materials and crafting remain required, without free stock or invented discovery. |

The trusted protective-equipment profile contributes injury reduction, not armor class, hit probability, collision volume, durability or anatomy. Shared contact applies surprise, active defense, then outfit/body protection, rounding final health effects once under the existing rule. A ten-injury hit reduced by wooden shield and outfit leaves four before other independent body rules. Reveal only permitted outcome values.

Only one outfit contribution is installed initially. Multiple overlapping passive sources need a separately selected composition law; summing every equipment field or applying an outfit per occupied port is prohibited. Supported alternate outfits may choose reduction in **0–0.4**; qualification uses a genuinely different installed profile. Names and artwork do not grant protection.

The complete proof is river line versus knife, shield and padded outfit. Working/social/ranged sets remain equally legitimate. The operation handles other supported ports generically, but helmets, boots, heavy plate, sockets, rarity and wear economics are not selected.

## Control preferences are not world laws

Notification position, mode, keybindings, preset names, automatic-set selection and panel arrangement belong to client/account owners. The world owns bodily defense, attachment, protection, work interruption and physical duration. A UI flag grants neither combat authority nor NPC hostility.

Automatic selection is opt-in on fresh entry only. Explicit emergency actions win; the single unsubmitted set follows the [feature contract](../../projects/emergency-combat-and-loadouts-feature-spec.md#optional-automatic-combat-set). Canceled/refused admitted changes are not retried for that entry. Exit never chooses another set. Preset storage constraints belong to [ECL-L04](../../limits/emergency-combat-and-loadouts.md#ecl-l04--equipment-transition-and-preset-storage), not the world's equipment laws.

## Maintained records

- Feature: [Emergency reactions and loadouts](../../projects/emergency-combat-and-loadouts-feature-spec.md).
- Technical design: [Native execution and UI integration](../../projects/emergency-combat-and-loadouts-tech-design.md).
- Delivery: [ECL01–ECL08](../../maintainers/emergency-combat-and-loadouts.md).
- Constraints and qualification: [ECL limits](../../limits/emergency-combat-and-loadouts.md).
- Existing owners: [Combat](combat.md), [shield defense](shield-defense.md), [item custody/equipment](items.md), [simulation clock](../../simulation-time.md).
