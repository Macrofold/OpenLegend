# Base-world skilled execution and fitted containers

**Status: Selected ND38 design; not implemented.** This is the **bundled world's optional action-execution policy**, not an engine law, general real-time-combat module, mandatory Dexterity/Focus system or new craft recipe authority. [Feature specification](../../projects/action-execution-and-skill-expression-feature-spec.md), [technical design](../../projects/action-execution-and-skill-expression-tech-design.md), [ASE tasks](../../maintainers/action-execution-and-skill-expression.md) and [limits](../../limits/action-execution-and-skill-expression.md) own the complete build and qualification.

## Why this world installs it

Make actual hunting, confrontation and meaningful craftsmanship fun. A character's tool and experience influence what they can do, while a human has a reason to aim, move and choose a release moment. Physical events persist. One fine storage pouch can become someone's preferred travel kit, traded equipment or visible evidence of good work. The goal is not to hide a compulsory skill check inside every attempted action.

## Player movement and battle intent

- Normal selected-mode world interaction remains selection, walking, inspection and ordinary contextual actions. WASD supplies controlled ground movement while the camera stays a separate presentation choice.
- A visible, remappable **attack mode** makes a primary click attempt one admitted current weapon/strike action; a held primary press makes a **more deliberate version of that same chosen action**. Secondary menus and explicit target/work choices survive. The first proposed toggle is Shift+T, subject to actual shortcut and accessibility testing.
- Mode enters on the human's actual admitted attack or personally perceived directed assault/injury. It is not a universal aggro state; previous hostility grace does not continuously force it back on after deliberate manual Off. A fresh personally perceived assault may re-enter it.
- Moving during a held aim is supported for compatible bodies/tools, replacing the current selected ranged rule that movement cancels preparation. Chosen guard and unrelated physical work remain incompatible, and native injury can still interrupt.
- Moving the held cursor onto the player character cancels the unreleased attempt; walking under a stationary pointer does not. Escape and a reachable Cancel control are equivalent. A quick tap performs the ordinary attack after any required native windup; release after deliberate hold captures that final physical aim point and any permitted bounded timing quality. There is no auto-fire or guaranteed hit.

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

## Weapon-specific consequences (selected initial testing profiles)

All values below are **selected initial relative scaling for an excellent score**, still subject to actual playtesting and later authored retuning. These are not current live weapon bonuses, guaranteed outcomes or fixed balance after playtesting. Baseline native statistics (including existing sling practice, applicable bodily conditions and equipped item) are evaluated once before manual scaling.

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

This section owns the selected first-slice fitting defaults. They are a complete implementation/playtest proposal, not implemented behavior or measured proof that the exercise is enjoyable. The [camp-container family](camp-containers.md) continues to own material compatibility, quantities, binding, ordinary capacity, empty load and labor. The [technical design](../../projects/action-execution-and-skill-expression-tech-design.md#4-noncombat-proof-quality-sensitive-woven-container) owns action, exact-item, save and transfer integration.

### Ordinary material work and the optional finish

Only an already admitted and learned woven-container method with exact installed `pouch-fit` support exposes **Finish carefully**. It requires the family's real flexible material and binding; this initial family adds no tool or station requirement. Ordinary **Craft** produces its normal useful individual pouch automatically. The player selects ordinary or careful work before starting and sees that materials are consumed at the start. Cancel or genuine native interruption after that point retains the ordinary loss of those materials and produces no pouch.

Careful work accepts one placement while the normal labor proceeds. If labor ends first, that same action waits at **Ready to finish** for one placement, **Finish normally**, or Cancel. The actor stays occupied while the rest of the world continues. Finishing never charges materials twice or creates an item before both work and the selected finishing choice permit completion. Same-version restore retains that action when it has not been interrupted; genuine departure cannot leave a craft to resurrect on reconnect. There is no separate transferable unfinished workpiece.

### Exact visible fixture and score

Let `p` be the actual admitted quantity of pouch material, an integer from 2 through 8, and let `b = ceil(p/2)` be the binding quantity required by this family. Preparation takes these role quantities from the successful material selection before debit. The greatest supported recipe uses twelve input units, so its exact consumed-input snapshot needs at most twelve positive-quantity contributing lots. Material names or item IDs do not manufacture texture, grain or strength that the current material definitions do not possess.

Use a normalized square workpiece with coordinates in `[0,1]²`. Define:

\[
a=(p-2)/6,\qquad z=(b-1)/3,
\]

\[
A=(0.20+0.20a,\;0.25),\qquad B=(0.75,\;0.35+0.35z),
\]

\[
g=\bigl((2p+53)/120,\;(7b+29)/120\bigr)=(A+B)/2.
\]

Show seam reference marks `A` and `B` and the instruction **Place the shared fastening halfway between the two marks**. Show the player's marker, but no pre-drawn perfect-answer dot or continuously revealed score. Both marks and their relationship are disclosed; `g` is the server-derived midpoint, never a client-chosen target or hidden random answer. Equal admitted role quantities and material capabilities produce the same fixture despite different names or identities. A later material-specific fixture requires a real supported native material property and pinned rule.

Pointer, touch and keyboard routes position the same marker in these local coordinates; browser pixels and viewport scale do not change scoring. The marker starts at the frame center. Keyboard movement uses one 120th of the frame as its fine step and ten 120ths as its coarse step, clamps to the frame edges and commits through the same input owner. Retain integer step positions from the initial `(60,60)` and normalize by 120 when submitting, so every authored midpoint is reachable without floating-step drift or snapping to a winning point. Pointer/touch placement may use free finite local coordinates. Both routes permit the same maximum effective capacity without numeric coordinate entry. Accept one finite in-range `(u,v)`, and define:

\[
d=\operatorname{hypot}(u-g_u,\;v-g_v),\qquad
s(d)=
\begin{cases}
1-d/0.08 & 0\le d\le0.08,\\
0 & 0.08<d\le0.20,\\
-\min(1,(d-0.20)/0.50) & d>0.20.
\end{cases}
\]

The score is continuous and bounded in `[-1,1]`. The `0.50` constant is an authored penalty-tail width, not the square's maximum diagonal distance; the negative result saturates at `d ≥ 0.70`. **Finish normally** is exactly `s = 0` and carries no coordinates. The server evaluates the first accepted choice once under this pinned profile. The single visible alignment exercise is a trial of a distinct input family; its complete rules do not establish that repeating it will be meaningful to a player.

### Fit factor, integer capacity and initial bounds

The initial continuous factor and actual positive-integer capacity are:

\[
f=1+0.25\max(s,0)+0.10\min(s,0),\qquad
C=\lfloor 4p\,f+0.5\rfloor.
\]

The ordinary base is the family's existing `4p`. The factor is in `[0.90,1.25]` before integer rounding, and neutral work has factor one. Apply the rounding once to the product; do not round the score/factor first or clamp the result at the ordinary family's maximum capacity. The chosen family bounds yield actual fitted capacities from 7 through 40 packing-load units, compared with ordinary capacities from 8 through 32. These are derived bounds for this family, not a global item limit.

| Pouch-material units | Poor endpoint | Ordinary / Finish normally | Best endpoint |
| --- | --- | --- | --- |
| 2 | 7 | 8 | 10 |
| 3 | 11 | 12 | 15 |
| 4 | 14 | 16 | 20 |
| 5 | 18 | 20 | 25 |
| 6 | 22 | 24 | 30 |
| 7 | 25 | 28 | 35 |
| 8 | 29 | 32 | 40 |

For the six-unit pouch, `24 × 0.90 = 21.6` rounds to 22, and the best fit gives 30. The factor bound is not a promise of at most ten percent loss in the rounded capacity: an eight-unit capacity becoming seven loses one eighth. A small positive score may still give the ordinary integer capacity. **Select no categorical grade initially.** Show actual capacity; do not call an unchanged result an improvement merely because its unrounded score was positive. Optional future descriptive grades must have exact world-owned meanings tied to observable effective properties.

### Useful kit, lasting individual result and qualification

Stamp the admitted factor on the one completed individual pouch through the existing object owner. Every packing check, permitted inspection, item comparison and disclosed trade term uses that same effective capacity. Ordinary recipe facts continue to state the base result. Custody, nested storage, death-drop and same-version restore preserve the item and its capacity; two bags do not merge because their material or invented name matches. Public capacity does not disclose hidden contents, private performance or learned recipe knowledge.

Actors currently have no finite carrying-load limit. The intended benefit is a larger kit held and moved as one item, and acceptance must compare that use with an ordinary pouch and direct carrying. Nested storage still counts every contained item's load: a six-unit pouch fitted to 30 and filled to that capacity contributes 32 units, including its two-unit empty load, to an outer container. An ordinary eight-unit pouch with capacity 32 can contain that loaded inner pouch; an ordinary six-unit outer pouch with capacity 24 refuses it. Transfers preserve identities and either commit the full legal move or leave all objects in place.

The initial bundled world has no native clothworking competence modifier, so ordinary human and resident manufacture uses neutral fit. An actually installed future craftsmanship rule may affect both through the same native creation owner; residents never submit fabricated pointer input or receive an automatic perfect score. Ordinary shared-play trade preserves fitted goods under the technical design's bounded noncompetitive trust policy. That policy does not establish adversarial input authenticity or complete competitive fairness.

**Flexible option C remains selected:** families may supply useful continuous properties and optional derived grades, or a separately meaningful discrete property. There is no mandatory global quality tier, durability field or capacity effect on unrelated items. Qualify these defaults with an uncoached player making and moving a real kit. If the midpoint task becomes repetitive free capacity, or the extra room has no useful consequence, the playability/value gate fails and the first exercise needs revision before implementation acceptance.

## Residents, observers and inventions

Autonomous characters have real competence, material supplies and chosen motives. They can make and use fitted pouches or aim weapons through ordinary native actions, without fake pointer histories or automatic green rings. **In the initial bundled world, ordinary resident woven-container craftsmanship yields neutral fit** because there is no installed clothwork proficiency; later worlds may select a real craft-competence contribution for both human and autonomous makers through the same quality owner. The resulting real object may enter exchange, favor, learning, memory, a new invention's inputs and consequences visible to others through existing world rules. Neither a skill-score result nor a crafted item grants every observer the maker's private biography or hidden technique.

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
