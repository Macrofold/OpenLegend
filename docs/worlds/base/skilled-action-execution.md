# Base-world skilled execution and fitted containers

**Status: Selected ND38 design; not implemented.** This is the **bundled world's optional action-execution policy**, not an engine law, general real-time-combat module, mandatory Dexterity/Focus system or new craft recipe authority. [Feature specification](../../projects/action-execution-and-skill-expression-feature-spec.md), [technical design](../../projects/action-execution-and-skill-expression-tech-design.md), [ASE tasks](../../maintainers/action-execution-and-skill-expression.md) and [limits](../../limits/action-execution-and-skill-expression.md) own the complete build and qualification.

## Why this world installs it

Make actual hunting, confrontation and meaningful craftsmanship fun. A character's tool and experience influence what they can do, while a human has a reason to aim, move and choose a release moment. Physical events persist. One fine storage pouch can become someone's preferred travel kit, traded equipment or visible evidence of good work. The goal is not to hide a compulsory skill check inside every attempted action.

## Player movement and battle intent

- Normal selected-mode world interaction remains selection, walking, inspection and ordinary contextual actions. WASD supplies controlled ground movement while the camera stays a separate presentation choice.
- A visible, remappable **attack mode** makes a primary click attempt one admitted current weapon/strike action; a held primary press makes a **more deliberate version of that same chosen action**. Secondary menus and explicit target/work choices survive. The first proposed toggle is Shift+T, subject to actual shortcut and accessibility testing.
- Mode enters on the human's actual admitted attack or personally perceived directed assault/injury. It is not a universal aggro state; previous hostility grace does not continuously force it back on after deliberate manual Off. A fresh personally perceived assault may re-enter it.
- Moving during a held aim is supported for compatible bodies/tools, replacing the current selected ranged rule that movement cancels preparation. Chosen guard and unrelated physical work remain incompatible, and native injury can still interrupt.
- Moving the held cursor to the player's own character cancels the unreleased attempt. Escape and a reachable Cancel control are equivalent. A quick tap performs the ordinary attack after any required native windup; release after deliberate hold captures that final physical aim point and any permitted bounded timing quality. There is no auto-fire or guaranteed hit.

## Ranged point fire and intended subjects

**Selected for the bundled world's first usable attack-mode control:** a compatible ranged weapon may fire at a **visible 3D world point** under the mouse, even with no creature clicked. A recognized animal/person under the initial pointer can be recorded as the intended subject and receive exact attack/PvP review, but it is never a guaranteed shot target. The player may move the aim ahead of fleeing prey or aim into a formerly visible clearing without being given hidden animal coordinates; losing the creature's sight is not itself a reason to block a lawful point-directed shot. The actor's own weapon, source, permission, physical launch geometry, ready state and ammunition remain mandatory. An unresolvable floor or nonfinite/ambiguous ray is refused before material is spent; a melee attack still needs a currently eligible observed subject.

Point fire is **not a bypass for consequential violence**. A shooter directing the initial press toward an observed person gets the same selected exact lethal review as a subject attack. An unselected shot carries the visible world-authored warning that **any actual physical interceptor may be injured**, without previewing hidden identities. After release, [CTR01](ranged-counterplay.md#selected-contact-consequences) owns genuine first-impact injury/collateral, and the world does not 'undo' an unintended fatality after a shot commits. Other installed worlds can disable point fire entirely.


## Concentric release interaction

The first bundled manual timing cue places a green/yellow shaded annular target at the current pointer-aim location and a contrasting white concentric moving radius. The user continues following a moving target with the pointer. The ring may expand and contract repeatedly while held. Green represents a potentially strong release; yellow a normal one; outside yellow a weaker release. **'Missed timing' is not an automatic physical miss.** The native projectile/strike result is a separate later event.

**Selected initial implementation tuning for playtests (not implemented, not verified as optimal):**

| Selectable input/display policy | Proposed initial value or rule | Why / adjustment evidence |
| --- | --- | --- |
| Tap/hold boundary | 150 real milliseconds | A tap remains responsive; accidental tiny holds should not summon a challenge |
| Ring cycle | 900 real milliseconds for one full expansion/contraction | A player can respond without making a weapon's native cooldown depend on ring speed |
| Green/yellow space | Normalized target radius 0.5; green within ±0.06, ordinary yellow through ±0.15; pure signed score as in the technical design | Dexterity-like coordination may widen tolerances; do not force a universal base stat |
| High focus/steadiness | Slower visible ring only where a declared applicable skill/status contribution supports it | Changes how controllable holding feels, not native cooldown or game clock |
| Low focus/drunkenness | Faster or more difficult *displayed* interaction where installed status mechanics actually exist | No hardcoded alcohol status in the engine and no hidden unreported penalty |
| Poor/ordinary/good | Normal score 0; poor release bounded negative; green positive normalized [-1, 1] | No forced contact, free action, guarantee or automatic miss |

The player controls **when** to release; on pointer-down the same native preparation starts whether the player ultimately taps or holds. Releasing before native readiness retains only one captured release intention that resolves at earliest legal readiness; cancel stops it. These are first implementation values to test and retune through the single world owner. The world may install different timing profiles per weapon or another authorized noncombat family. The renderer reads this profile; it must not invent a second set of band widths, speed constants or weapon rules. Weapon expertise and conditions contribute only where supported; a world without these scores simply retains ordinary execution.

## Weapon-specific consequences (candidate authoring envelope)

All values below are **proposed initial relative scaling for an excellent score**. These are not current live weapon bonuses, guaranteed outcomes or fixed balance after playtesting. Baseline native statistics (including existing sling practice, applicable bodily conditions and equipped item) are evaluated once before manual scaling.

| Supported installed tool/technique | Excellent release could improve | Poor release could reduce | Unchanged reality |
| --- | --- | --- | --- |
| Sling or other qualifying launched projectile | Base conditional body-contact/evasion resolution by **up to +25% relative** | That same conditional chance by **up to -10% relative** | Mouse-defined exact straight trajectory, finite stock, range, speed, shield, cover and recovery |
| Other authored bow-like launcher | Base conditional body-contact chance by **up to +20%** | Conditional chance by **up to -10%** | No leading a moving victim for free; shot never turns in flight |
| Spear/contact thrust | Conditional contact chance by **up to +15%** and resulting injury by **up to +10%** where both are supported | Each selected benefit can be impaired; no blanket all-stats penalty | Real reach, current target and injury susceptibility; avoid permanent critical formula |
| Hammer/heavy contact strike | Actual pre-defense injury factor by **up to +25%** | Pre-defense injury factor by **up to -10%** | Actual native connection, armor/shield/guard and recovery; aim isn't a damage button |
| Tool/family without selected interaction | Nothing | Nothing | Ordinary existing action and outcomes unchanged |

Individual channels are clamped to their installed valid range. The 25% figure is a **barometer for optional skilled expression**, not a universal value for every weapon or a blanket increase to damage, crit and accuracy simultaneously. An authored future critical channel requires an actual supported world combat-crit rule and own unit/trigger; do not add arbitrary critical multipliers from a weapon's visual description.

### Physical arrow and local evasion

Replace the current bundling that randomly deviates a released projectile from its intended physical ray for this installed family. Whether a human makes a quick or carefully timed shot, the projectile goes **exactly along the ray from its actual admitted launch anchor toward the pointer's captured 3D world point**. If the deer runs out of the ray, no roll rescues the miss. If a body is on the ray, the world can resolve a genuine **local avoidance/posture outcome** at that physical crossing: an alert person might duck/twist without walking a whole map step; someone not aware may incidentally lean or remain vulnerable according to the installed reaction policy. Do not claim an unconscious, immobilized or unaware person deliberately dodged when no such reaction occurred. A real effective body contact resolves shield, armor, injury and actual first-contact stop under [ranged/counterplay](ranged-counterplay.md) and [combat/threat design](../../projects/combat-and-threat-responses-feature-spec.md). A successful avoidance permits the same projectile to continue and potentially contact the next real solid/body; it does not make the projectile harmless.

Do not use a hidden client 'hit=true', retargeting, automatic prediction, extra fleeing multiplier or visual sprite overlap as injury authority. Native bodily evasion uses actual skills, awareness/condition and accepted contact law; the player sees **Miss** only when appropriately observable. The original target's identity/life and original attack permission stay bound to the selected intent; a bystander is affected only through the admitted physical collateral rule. A defending target's identity and private condition are not revealed by the ring.

## The chosen noncombat proof: fitted woven container

The [existing woven-container recipe family](camp-containers.md) makes a real individual pouch/bag with capacity **four packing-load units per compatible pouch-material unit**; it also requires actual binding material and the family's actual labor. A current six-unit pouch yields a normal base **24** capacity. Recipe, input quantities, stock, knowledge and native work are still ordinary prerequisites.

**Normal craft remains fully functional.** An admitted known woven method can optionally expose **Finish carefully**. During the same finite craft the player sees a workpiece guide and chooses an alignment point for a seam/fastening location. This is **a placement/fit exercise**, rather than the combat concentric release ring. Actual material/recipe and possible setup determine the visible fitting problem; the selected world accepts one finite committed choice. The native craft still produces one bag, only at ordinary successful work completion; no input grants an extra bag, saves resources, cancels work costs or upgrades an already manufactured bag.

The world's initially proposed continuous property is **fit**, whose actual supported effect is a change to the *individual container's effective carrying capacity*. Candidates for playtest:

| Finish quality | Proposed relative fit | Base 24 pouch example |
| --- | --- | --- |
| Normal craft / accessible neutral | 1.00 | 24 units |
| Excellent optional fit | Up to 1.25 | Up to 30 units |
| Poor optional fit | Not below 0.90 | At least 22 units, using `round` |
| Selected categorical display | Optional `roughly fitted` / `ordinary` / `well fitted` derived from effective fit | Grade isn't separately stored or authoritative |

The numerical factor is captured **on that individual finished object** through the object/containment owner. Its actual permitted capacity, occupied load, available space and inventory interactions use the same effective value. It survives ordinary custody, storage, repair limitations, transfer, death-drop and same-version restore, with exact provenance and current perception. An invented bag of another admitted size still uses its own `4p` base. Two pouches do not merge simply because their invented names and material families match. A player must be able to inspect the real effect and decide whether six extra units are useful for a trip; without that payoff, hand-finishing is not a required game feature.

**Flexible option C is selected:** world families may express meaningful **continuous qualities and optional derived grades**, or deliberately use discrete family-owned qualities. There is **no required universal quality tier, durability or scalar on all items**. A future sharper sword, watertight container or ornamental finish needs a separately supported native property/consumer, not copying this pouch's capacity rule into generic infrastructure.

## Residents, observers and inventions

Autonomous characters have real competence, material supplies and chosen motives. They can make and use fitted pouches or aim weapons through ordinary native action/quality decisions, without fake pointer histories or automatic green rings. The resulting real object may enter exchange, favor, learning, memory, a new invention's inputs and consequences visible to others through existing world rules. Neither a skill-score result nor a crafted item grants every observer the maker's private biography or hidden technique.

A player may invent a compatible woven-container method under the existing finite family; it inherits only the family's admitted optional fitting interface if the installed definition/parameters actually support it. Arbitrary generated effect names, labels like 'legendary' or unrestricted player-authored `+25% accuracy` do not create mechanics or bypass native review. Other installed worlds can omit the input family entirely, use other possible senses/body profiles or substitute their own quality meaning through qualified native operators.

## Game pace, accessibility and trust

The **human ring and optional placement input are measured in real interactive time**. The physical world still advances under its selected 60-game-seconds-per-real-second baseline and available multipliers. Weapon windup/recovery and actual animals' movements obey simulation time; a faster world can be harder to track, but no tool's native cooldown is bypassed, and manual input is not artificially sped 8×. Qualify 0.5×/1×/3×/8×; no silent slowdown of NPCs, physics or committed objects.

Handwork is optional. Include the regular quick and ordinary craft route, reduced-motion/non-color cues, accessible manual alternatives and a neutral assist path without hidden disclosure or impossible input demands. Skipping remains an ordinary neutral action; **accessible skilled variants can earn the same maximum benefit** through keyboard/toggle or a more legible precision interaction, rather than being forcibly neutral. The initial objective is a *chosen advantage*, not an inaccessible mandatory quality gate. No artificial loss or failure is added to ordinary basic survival crafting.

The initial optional combat bonus is neutral **when the real contacted body belongs to a human-controlled player**, including incidental contact on an animal-directed shot, until a separately approved PvP fairness contract exists. Existing ordinary PvP, collision, lethal review and baseline manufacturing remain functional. **A normally made quality-bearing bag can be traded or gifted without losing its genuine fitted capacity.** Its server-derived bounded fit, real inputs, provenance and single output are enforced at crafting; modified clients may optimize an unranked manual input, so high-stakes competitive manufacture still needs a separate trust policy. No later transfer silently downgrades an already finished bag.

## Human interaction scoring and meaningfulness

Use the [technical design's chosen initial evaluator](../../projects/action-execution-and-skill-expression-tech-design.md#selected-initial-timing-curve-and-accessible-parity): for a green release the normalized ring's difference from 0.5 is at most 0.06, yellow extends to 0.15, and outside yellow the score decreases smoothly toward -1. This is a visible release-quality measure, **not** a collision verdict or guaranteed damage. Normal taps and explicitly skipped handwork use score zero; accessible variants may reach the same allowed excellent score.

For the pouch's distinct input, the first guide is a visible workpiece-local fastening position; accepted selected placement uses a **single** `(u,v)` with values 0–1 and an installed guide. Its world-specific initial radius score is defined [once](../../projects/action-execution-and-skill-expression-tech-design.md#selected-initial-placement-profile), then turned into a fitted **property of the one real produced bag**. The initial guide must have enough meaningful variation that uncoached people can demonstrate the choice; a trivial always-perfect click is a failed **fun criterion**, even if the mathematics and persistence pass. Do not impose this workpiece guide on every craft or build a speculative full sewing simulator.


## Qualification and ownership

Complete play scenarios: deer moving after aim; stationary practice target; two bodies on one arrow ray, including locally avoided first body; shield/cover; skilled weapon contrast; active WASD and cancellation during aim; unpredictable target disappearance; player entering combat mode after personally observed assault and choosing Speak; one valid ordinary and fine/rough six-unit bag, real packing, overflow, later transfer and restored quality; NPC use; an installed contrasting world that disables timing and fitted items. Include bad timing with a good physical hit and green timing with a true miss.

Source and limits: [technical contract](../../projects/action-execution-and-skill-expression-tech-design.md), [ASE tasks](../../maintainers/action-execution-and-skill-expression.md), [limits](../../limits/action-execution-and-skill-expression.md), [original item family](camp-containers.md), [current ranged profile](ranged-counterplay.md), [competence](practical-competence.md) and [player feedback](../../ui-ux/world-interaction.md).
