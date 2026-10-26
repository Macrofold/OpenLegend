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

The rule covers supported direct melee, natural contact strikes and ranged preparation against the eligible recipient, regardless of who controls the attacker. For held ranged work, a newly selected recipient at release receives their own applicable opening gate; preparing at an empty point cannot prepay a later player's opening. A point-directed release performs the existing physical ray/first-body query before launch and applies the rule when a player is already its threatened recipient. The actual ray remains physical and may still miss after the longer preparation.

The assistance signal is **personal incoming danger**, without hidden identity or location. It is emitted at real physical preparation or a newly admitted pre-release threat, never at a private thought, proposed action, approach alone, model response or merely nearby fight. This deliberately sacrifices completely untelegraphed targeted player ambushes in favor of a first reaction opportunity. Ordinary sensing still determines what the character knows and whether the player can target the attacker. This UI-only assistance is not registered warning evidence for [preparedness](combat.md#selected-awareness-preparedness-and-surprise) and does not automatically remove surprise damage.

Seeing or recognizing a nearby person is not enough to name them as the attacker. The named warning and Retaliate require an independently permitted association between that person and the incoming attack, followed by current exact-body targeting eligibility. Under the accepted received-pose extension, use its acquired physical evidence rather than joining a visible person to the server's private target metadata. Without that association the assistance remains anonymous, even if the actual attacker happens to be visible. The assistance token cannot resolve a hidden source for inspection, memory, facing or execution.

A person unexpectedly entering an already released ray receives ordinary actual contact and harm; there is no retroactive first-damage guarantee. Burning, hunger, falling, traps with no supported attack preparation and accidental contact are not converted into this attack family. A new harmful action family must explicitly implement a pre-effect opening adapter before it is advertised as supporting this protection. These exclusions are visible design boundaries, not permission to omit an existing supported attack caller.

## Defense policy

Emergency Defend and ordinary Defend choose the same native action. An equipped compatible shield is preferred. Its existing profile remains authoritative: initial wooden shield 50% supported injury reduction, front 120-degree coverage, 0.25 normal-play-second preparation, at most three seconds ready, one connecting eligible interception, then one second of body-scoped recovery. A miss does not consume the interception. Movement or offense ends readiness under ordinary replacement rules; committed recovery remains.

The selected small extension supplies **Brace** to the initial person body profile when no eligible shield is equipped. It uses the same preparation, ready window, one-interception and recovery behavior, with **20% reduction of supported direct melee contact injury** in the front **120-degree sector**. It does not intercept projectiles, heat, starvation, ongoing status injury or attacks outside its coverage. An already-held two-handed tool is not silently dropped; the body-based brace is an authored defensive posture, not an equipment transfer or simulated anatomical maneuver.

The chosen known direction sets facing once. Without a permitted threat direction, keep the body's current facing; neither camera direction nor a hidden source becomes automatic target tracking. Native incapacity, physical-work interruption restrictions and recovery can prevent defense. There is no extra emergency exception to cooldown, no passive permanent guard and no new stamina system.

Profile selection and offered explanation share the same owner as impact resolution. Alternate bodies can omit brace entirely or install another supported defense profile. The ordinary shield remains materially stronger, especially against the supported stone/arrow families.

## Equipment-set policy

A complete set change takes **one normal-play second**, admitted once as 60 simulation seconds at the current normal rate. Size does not add a per-item timer. Current single-item equip behavior is not silently changed; the grouped action is a convenience with one readable commitment.

The old attachments remain effective throughout preparation. At completion, atomically stow currently equipped items absent from the desired set into the character's carried root and attach the exact desired objects. Validate final net capacities where the installed world defines them. No item is dropped, repaired, duplicated, granted new ownership or fetched remotely. Existing bag capacity is not a new global carried-weight limit.

Only accessible items in this character's current possession tree qualify. Attached assembly/shelter parts are not body equipment. A preset is the complete desired set of compatible body-equipment objects; an empty set deliberately stows all of them. A matching set completes as a no-op. Incompatible bodies, occupied ports, unavailable exact objects or blocked claims refuse the whole action.

Equipment work uses the ordinary physical-action slot. A deliberate manual set choice, or explicit combat-mode entry with the opt-in set enabled, may replace incompatible current work through the same checked transition as other deliberate actions. An automatic incoming-assault/own-offense mode notice supplies no such replacement authority. The [feature ordering](../../projects/emergency-combat-and-loadouts-feature-spec.md#optional-automatic-combat-set) owns those input meanings.

The change is interruptible by a deliberate replacement such as Defend, Retaliate or walking. Existing injury interruption applies; do not add a special damage threshold or invulnerable dressing animation. Cancel before completion changes no attachments. Already completed switching is not undone. Weapon/guard recovery and active status effects survive switching.

## One useful protective outfit

Current held equipment does not already implement armor. The selected first consumer adds one authored **outfit** port to applicable person bodies and one **Padded outfit** definition. It is a complete simple protective garment, not a promise of anatomical armor slots or a full armor catalogue.

| Property | Selected first profile |
| --- | --- |
| Equipment | Occupies the outfit port; grants no melee/ranged/gather/guard tool use. |
| Packing load | 3, using existing packing units. |
| Protection | Reduces the remaining supported direct physical contact/projectile injury by **20%**, sampled from the actually equipped exact outfit at impact. |
| Known ordinary method | Consume **12 prepared fiber and 4 cord**; produce one Padded outfit after **600 game seconds**. Reuse existing known manufacture, ingredient claims and output creation. |
| Initial access | Add the ordinary method to the applicable first-playable recipe grants; obtaining materials and crafting remain real actions. Do not spawn a free outfit or invent prior discovery. |

The trusted protective-equipment profile expresses an injury contribution, not a new armor-class, hit probability, body collision volume, durability meter or anatomy system. The contact path applies existing surprise contribution, then active defense, then outfit/body protection under the shared impact owner, and rounds the final health effect once under its existing rule. An ordinary ten-injury hit reduced by the wooden shield and outfit leaves four before any other independently applicable body rule. Display only values the observer is permitted to know.

Only the single outfit contribution is installed initially. Multiple overlapping passive protection sources need an explicit later composition policy; summing every equipment field or applying the same outfit per occupied port is prohibited. Different authored supported outfits may select a reduction in **0–0.4**, and qualification must use a genuinely different installed profile. The loader and UI must not infer protection from the words “armor,” “padded” or an icon.

The first complete loadout proof is river line alone versus knife, shield and padded outfit. A person can also create a social/working set or a ranged set. Other supported equipment ports are handled generically, but helmets, boots, heavy plate, socket systems, gear rarity and armor-wear economics are not added by this design.

## Control preferences are not world laws

The screen position of the notification, input mode, keybindings, saved loadout names, which set is automatic and the previous panel arrangement belong to client/account preference owners. The world owns whether a body can brace, which objects can attach, what protection does, how physical work is interrupted and how long preparation lasts. No UI flag grants combat authority or forces an NPC to consider someone hostile.

Automatic set selection is opt-in and only on a fresh combat-mode entry. A player's explicit emergency action has priority; any one not-yet-submitted deferred set follows the [feature's interruption contract](../../projects/emergency-combat-and-loadouts-feature-spec.md#optional-automatic-combat-set). A canceled or refused admitted set is not automatically attempted again for that entry. Leaving mode never changes equipment automatically.

## Maintained records

- Feature: [Emergency reactions and loadouts](../../projects/emergency-combat-and-loadouts-feature-spec.md).
- Technical design: [Native execution and UI integration](../../projects/emergency-combat-and-loadouts-tech-design.md).
- Delivery: [ECL01–ECL08](../../maintainers/emergency-combat-and-loadouts.md).
- Bounds, rationale and qualification: [ECL limits](../../limits/emergency-combat-and-loadouts.md).
- Existing owners: [Combat](combat.md), [shield defense](shield-defense.md), [item custody/equipment](items.md), [simulation clock](../../simulation-time.md).
