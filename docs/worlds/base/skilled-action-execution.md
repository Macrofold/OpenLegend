# Base-world skilled execution and fitted containers

**Status: Selected ND38 design; not implemented.** This is the **bundled world's optional action-execution policy**, not an engine law, general real-time-combat module, mandatory Dexterity/Focus system or new craft recipe authority. [Feature specification](../../projects/action-execution-and-skill-expression-feature-spec.md), [technical design](../../projects/action-execution-and-skill-expression-tech-design.md), [ASE tasks](../../maintainers/action-execution-and-skill-expression.md) and [limits](../../limits/action-execution-and-skill-expression.md) own the complete build and qualification.

## Why this world installs it

Make actual hunting, confrontation and meaningful craftsmanship fun. A character's tool and experience influence what they can do, while a human has a reason to aim, move and choose a release moment. Physical events persist. One fine storage pouch can become someone's preferred travel kit, traded equipment or visible evidence of good work. The goal is not to hide a compulsory skill check inside every attempted action.

## Player movement and battle intent

- Normal selected-mode world interaction remains selection, walking, inspection and ordinary contextual actions. WASD supplies controlled ground movement while the camera stays a separate presentation choice.
- A visible, remappable **attack mode** makes a primary click attempt one admitted current weapon/strike action; a held primary press makes a **more deliberate version of that same chosen action**. Secondary menus and explicit target/work choices survive. The selected remappable toggle is exact Shift+T; plain T retains targeting, Shift+W opens the world-agent panel, and unmodified WASD moves. Shift+A/Shift+S retain Act/Speak. These defaults require actual device qualification.
- Mode enters on the human's actual admitted attack or personally experienced directed assault, established by typed native personal evidence. A health change, environmental injury, testimony or nearby fight alone does not qualify. It is not a universal aggro state; previous hostility grace does not continuously force it back on after deliberate manual Off. A fresh personally perceived assault may re-enter it.
- Moving during a held aim is supported for compatible bodies/tools, replacing the current selected ranged rule that movement cancels preparation. Chosen guard and unrelated physical work remain incompatible, and native injury can still interrupt.
- Moving the held cursor onto the player character cancels the unreleased attempt; walking under a stationary pointer does not. Escape and a reachable Cancel control are equivalent. A quick tap performs the ordinary attack after any required native windup; release after deliberate hold captures that final physical aim point and any permitted bounded timing quality. There is no auto-fire or guaranteed hit.

## Ranged point fire and intended subjects

**Selected for the bundled world's first usable attack-mode control:** a compatible ranged weapon may fire at a **visible 3D world point** under the mouse, even with no creature clicked. A recognized animal/person under the initial pointer can be recorded as the intended subject and receive exact attack/PvP review, but it is never a guaranteed shot target. The player may move the aim ahead of fleeing prey or aim into a formerly visible clearing without being given hidden animal coordinates; losing the creature's sight is not itself a reason to block a lawful point-directed shot. The actor's own weapon, source, permission, physical launch geometry, ready state and ammunition remain mandatory. An unresolvable floor or nonfinite/ambiguous ray is refused before material is spent; a melee attack still needs a currently eligible observed subject.

Point fire is **not a bypass for consequential violence**. Review covers both an originally intended person and a newly recognized person indicated by the final frozen release ray. Ground-down/person-up input or an omitted subject ID cannot bypass the existing exact lethal review. A changed indicated person or source/permission dependency needs renewed review; the preview checks only permitted recognized bodies and reveals no hidden bystander. An unselected shot carries the visible world-authored warning that **any actual physical interceptor may be injured**, without previewing hidden identities. After release, [CTR01](ranged-counterplay.md#selected-contact-consequences) owns genuine first-impact injury/collateral, and the world does not 'undo' an unintended fatality after a shot commits. Other installed worlds can disable point fire entirely.

## Concentric release interaction

The green/yellow annular target follows the current physical aim pointer while a white concentric radius expands and contracts. Continue tracking moving prey manually. Green means a positive release contribution, yellow ordinary, and outside yellow weaker. A poor score does not guarantee a physical miss, and green cannot create contact.

**This table owns the selected initial input defaults.** They are complete implementation/playtest parameters, not installed behavior or measured optimal values. Other documents refer to this owner; renderers do not install independent constants.

| Input/display rule                      | Selected initial value                                                  | Meaning and qualification                                                                                                                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tap/hold threshold                      | 150 real milliseconds                                                   | Below the threshold is ordinary. At/above it, score only after the exact admitted profile has been displayed; start phase at that later boundary.                                                                           |
| Full ring cycle                         | 900 real milliseconds                                                   | One expansion and contraction using the triangle radius `r = 1 - abs(2 × phase - 1)`, with `0 ≤ phase < 1`.                                                                                                                 |
| Target radius and bands                 | Center `0.5`; green half-width `0.06`; ordinary outer half-width `0.15` | The [generic evaluator](../../projects/action-execution-and-skill-expression-tech-design.md#22-deterministic-evaluation-and-presentation) gives signed score. At a zero boundary show ordinary, not a promised improvement. |
| Ordinary / skip                         | Exact score `0`                                                         | Normal attacks remain useful, including a release before the profile was visible.                                                                                                                                           |
| Installed character challenge modifiers | None added in this first slice                                          | Existing native competence remains real. Later supported coordination/focus/status rules may change displayed bands/tempo under exact admitted pins; no new mandatory stat is inferred.                                     |
| Active-input renewal / expiry           | Renewal target `100` real ms; server lost-input expiry `250` real ms    | Renew only while steering or an early release is still armed. At most ten routine renewals per real second; stop/change messages remain meaningful boundaries. Test latency and loss before accepting these values.         |
| Keyboard physical aim                   | Arrow movement `16` CSS pixels; Shift+arrow `1` CSS pixel               | Reticle is projected through the same physical picker, with no automatic target following.                                                                                                                                  |
| Step timing                             | Phase increments `0.01`; Home `0`; End `0.99`                           | Freeze only local display phase. Explicit Release is required; world movement and native preparation continue.                                                                                                              |
| Keyboard pouch marker                   | Center start `(60,60)` on indices `0..120`; coarse `10`, fine `1`       | Normalize once by `120`; exact fixture midpoints are reachable. See the [fitting rule](#exact-visible-fixture-and-score).                                                                                                   |

Pointer-down requests native preparation before a tap/hold distinction is known. If the existing exact lethal review is required first, no preparation is admitted yet: end the old gesture, discard its queued release, and let explicit **Prepare attack** confirmation admit only the reviewed preparation. Continue with deliberate controls. A release review preserves one frozen point/sample only in its own valid dialog; explicit **Release attack** confirmation uses fresh current authority. Closing or declining cancels the matching uncommitted attempt and never fires it. An early release retains one immutable intention and waits for legal native readiness only while current foreground input authorization remains valid. Cancel, pause, blur, detected disconnect and control loss disarm automatic release. Restart/Resume never recreates old held input; explicit native Release/Cancel uses the surviving action and current permission. No additional total hold timeout is selected: native interruption, vulnerability, resource claims and cancellation remain effective.

The first green center is `225` real ms after ring origin, so an immediately admitted held gesture first reaches it `375` real ms after pointer-down. That arithmetic describes this curve, not a reaction-time guarantee: network admission may delay the visible origin. Slowing a future ring also changes the real wait for its next center, so qualify both ease and opportunity cost. Native preparation/recovery remains independent.

## Weapon-specific consequences (selected initial testing profiles)

All values below are **selected initial relative scaling for an excellent score**, still subject to actual playtesting and later authored retuning. These are not current live weapon bonuses, guaranteed outcomes or fixed balance after playtesting. Baseline native statistics (including existing sling practice, applicable bodily conditions and equipped item) are evaluated once before manual scaling.

| Supported installed tool/technique       | Excellent release could improve                                                                              | Poor release could reduce                                                         | Unchanged reality                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Swing launcher / sling                   | Base conditional body-contact/evasion resolution by **up to +25% relative**                                  | That same conditional chance by **up to -10% relative**                           | Mouse-defined exact straight trajectory, finite stock, range, speed, shield, cover and recovery |
| Flex launcher / bow                      | Base conditional body-contact chance by **up to +20%**                                                       | Conditional chance by **up to -10%**                                              | No leading a moving victim for free; shot never turns in flight                                 |
| Spear/contact thrust                     | Conditional contact chance by **up to +15%** and resulting injury by **up to +10%** where both are supported | Both selected channels by up to -10% relative; no penalty on unrelated statistics | Real reach, current target and injury susceptibility; avoid permanent critical formula          |
| Hammer/heavy contact strike              | Actual pre-defense injury factor by **up to +25%**                                                           | Pre-defense injury factor by **up to -10%**                                       | Actual native connection, armor/shield/guard and recovery; aim isn't a damage button            |
| Tool/family without selected interaction | Nothing                                                                                                      | Nothing                                                                           | Ordinary existing action and outcomes unchanged                                                 |

Individual channels are clamped to their installed valid range. The 25% figure is a **barometer for optional skilled expression**, not a universal value for every weapon or a blanket increase to damage, crit and accuracy simultaneously. An authored future critical channel requires an actual supported world combat-crit rule and own unit/trigger; do not add arbitrary critical multipliers from a weapon's visual description.

## Native weapon baselines and recovery

The following table distinguishes current ordinary melee definitions from selected additions. Existing knife and spear values are preserved. The current bundled launcher has native shot preparation but **no separate post-release recovery**; this slice adds that missing authored field and integrates it with the existing body-scoped `combatReadyAt` used by strikes and guard. The manual ring never supplies or replaces a native duration.

| Native family/item     | Ordinary contact baseline                                                                                | Native work/windup                                              | Recovery                         | First-slice status                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| Knife                  | Damage `8`, accuracy `.75`, reach `1.3 m`, ordinary approach `0.8 m`                                     | `6` game seconds                                                | Existing `18` game seconds       | Preserve ordinary native item/action; no timed profile selected                        |
| Lookout spear          | Damage `10`, accuracy `.8`, reach `2.2 m`, ordinary approach `1.8 m`                                     | `18` game seconds                                               | Existing `36` game seconds       | Preserve native baseline; admit the spear timing contribution in the consequence table |
| Camp hammer            | Damage `14`, accuracy `.75`, reach `1.4 m`, ordinary approach `1.0 m`                                    | `24` game seconds                                               | `48` game seconds                | New finite authored item below; optional impact contribution only                      |
| Swing launcher / sling | Existing installed launcher/ammunition range, speed, injury and handling; preserve applicable competence | Existing applicable shot preparation, default `18` game seconds | **New `18` game seconds**        | One selected shot law/recovery for ordinary, manual, practice/hunt and NPC routes      |
| Flex launcher / bow    | Existing installed launcher/ammunition range, speed, injury and handling                                 | Existing applicable shot preparation, default `18` game seconds | **New `24` game seconds**        | Same shared shot/recovery owner; no manual bypass                                      |
| Ordinary Punch         | Existing native damage `5`, reach `1.3 m`, biped requirement and ordinary auto-approach                  | Existing `30` game seconds of unphased work                     | No separate Punch recovery added | Preserve current native contact action; no timed Punch profile in this slice           |

All durations are game seconds. The launcher preparation entry describes the existing default, not a replacement for a genuinely installed competence/action override. Authored launcher recovery must be admitted and exposed from its exact definition/family, including invented compatible launchers and current-format recompilation; it must not be a hidden browser delay. On actual shot release at time `T`, the existing body owner sets `combatReadyAt = max(existingDeadline, T + launcher.recoverySeconds)` while ammunition debit and flight creation commit once. Strike/guard recovery continues through the same body owner.

Every subsequent strike, Punch, aim/shot or guard checks the shared deadline. Compatible WASD steering remains legal during weapon recovery so the player can retreat; it neither clears the deadline nor adds another physical action. Stop, walking, equipping a different weapon, action replacement and coherent save/reopen preserve it. A cancelled preparation that never releases creates no shot recovery. A committed miss keeps recovery. Flight duration is independent: an arrow still in the air does not prevent the next otherwise lawful shot, and an early impact does not refund recovery.

The new hammer is a first-proof ordinary item through the existing native item and held-equipment contract, with these exact initial authored fields:

| Item field                    | Selected definition                                                                                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity                      | `id: hammer`, `version: 1`, name **Camp hammer**                                                                                                                                                                        |
| Description                   | A heavy hammer for close contact strikes. It prepares and recovers slowly; a carefully released blow can improve its impact.                                                                                            |
| Portability and load          | `portable: true`, `packingLoad: 3`                                                                                                                                                                                      |
| Material/interface properties | `properties: [rigid]`; no invented point, shaft, recipe or general critical capability                                                                                                                                  |
| Held equipment                | Main hand plus off hand, native use `melee`, through the existing equipment admission contract                                                                                                                          |
| Melee profile                 | The hammer row above owns its exact damage/accuracy/reach/approach/windup/recovery values                                                                                                                               |
| Disclosed characteristics     | Existing native contact characteristics for damage, reach, accuracy, preparation and recovery                                                                                                                           |
| Optional execution            | Installed timed-release profile; only the hammer pre-defense injury channel in the consequence table, no added contact bonus or critical channel                                                                        |
| Obtainable proof              | Seed one ordinary physical hammer object beside the existing accessible spear through normal world initialization, with its usual spatial placement and custody; it is picked up/equipped/used through ordinary actions |

The hammer is not currently installed. Its definition, ordinary world instance, equipment availability, inspection and ordinary attack route belong to the implementation gate before the hammer/spear experience can be claimed. This task does not require a hammer recipe or an unrestricted melee generator. The knife and ordinary Punch remain usable native baselines: with no optional descriptor, primary input captures the exact ordinary choice on down and invokes it once on up, with no held-ready phase, timing score or repeated action. Supported timed techniques are explicitly advertised rather than inferred from a weapon's name.

At `1×`, the selected default sling release-to-release floor is `(18 + 18) / 60 = 0.6` real seconds and bow floor is `(18 + 24) / 60 = 0.7` real seconds, assuming the next preparation begins immediately when recovery ends. Using the timing profile's first green center instead gives idealized `0.675` and `0.775` seconds. These are arithmetic consequences of the selected laws, not measured player cadence or balance evidence. Native deadlines scale at other world speeds while the human ring does not.

The spear's excellent maxima combine: reachable ordinary pre-defense expected injury is `.8 × 10 = 8`; the selected `.15` contact and `.10` injury contributions give `(.8 × 1.15) × (10 × 1.10) = 10.12`, a `26.5%` relative increase before defense and any other legitimate clamp. Qualification must assess that combined benefit and complete native cadence. It must not describe this as only a ten- or fifteen-percent outcome change.

### Physical arrow and local evasion

For this installed shot family, replace the current random heading deviation with one exact straight ray from the actual release anchor toward the admitted final aim point. This applies to ordinary taps/menu actions, held shots, hunting/practice and NPC actions; NPC aim comes from the actor's permitted evidence. The source's applicable native handling is captured once at release. It influences a qualified physical response at a real crossing, not random steering. A deer that moves outside the ray receives no contact roll. The first actual stopping body, shield/contact defense or solid is resolved through [ranged counterplay](ranged-counterplay.md) and the [technical collision owner](../../projects/action-execution-and-skill-expression-tech-design.md#33-chronological-collision-one-conditional-contest-and-existing-defense).

**The selected first response is one actual duck/tuck, not a cosmetic dodge over an unchanged capsule.** Install it for the bundled grounded person and deer tall-capsule profiles only. Other bodies require an explicitly supported response; inert targets, airborne birds and unselected shapes receive no automatic one. Broader leaning, twisting, anatomical parts and continuous skeleton animation are outside this first slice.

This section owns the complete initial response tuning. All values are selected implementation/playtest defaults, not implemented behavior or physiological measurements.

| Response input or rule   | Selected initial value                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary shape           | The body's current ordinary radius `r` and height `h`; require a supported grounded tall capsule                                                                                            |
| Duck shape               | `hDuck = max(2 × r + ε, 0.45 × h)`, with the shared spatial numerical tolerance `ε`; require `hDuck < h`                                                                                    |
| Feet, radius and anchors | Same feet/support placement and radius; multiply ordinary eye, ear and interaction heights by `hDuck / h`                                                                                   |
| Transition               | One atomic native posture contraction at the genuine candidate boundary, admitted only when the new capsule actually clears that crossing and has legal support/clearance                   |
| Hold                     | `12` game seconds from successful pose commitment                                                                                                                                           |
| Response cooldown        | `60` game seconds from each qualified feasible response attempt, whether that contest succeeds or fails; unavailable responses start none                                                   |
| Return                   | At the hold deadline, restore only with full ordinary-body support/solid/body clearance; otherwise retain the small actual shape as `restore-blocked` and retry on a relevant native change |
| Travel during pose       | Current actual small body for contact/senses; conservative ordinary-body clearance for movement, so this does not grant low-tunnel travel                                                   |
| Candidate context `C`    | Exactly `1` in the initial bundled rule; no extra fleeing penalty or undefined avoidance statistic                                                                                          |

A response requires an alive participating body with native awareness of the actual incoming threat, supported ability and no restraint/unresponsiveness or incompatible chosen guard, attack/craft work or combat recovery. Idle and ordinary ground locomotion may qualify. For this first response, awareness is concretely established by the existing current `visionQuery` seeing the actual incoming point projectile at its candidate position, using the defender's current senses/eye anchor and real solid clearance. The bundled response treats that sensed incoming motion as recognizable danger; it does not require a preexisting generic danger flag, a recognized shooter or combat mode. If that sense test fails, the body cannot react from private collision coordinates. This is the current coarse vision law, not new physiological reflex/FOV modeling. This slice adds no universal Dexterity, Focus or hidden defender proficiency. A body with no feasible useful clearance is an actual interceptor even when the shot's source has low handling. In particular, a low ray can strike a crouched person, and an inert target cannot become intangible through a poor accuracy roll.

For a **qualified physically feasible response only**, use the source's captured native handling `H` and the selected contact-channel factor from the weapon table. Let `s* = 0` when the actual candidate body is human owned, including disconnected/fading bodies, otherwise the admitted score. This reads native ownership rather than connection presence. Then `p = clamp01(H × Fcontact(s*) × C)` is the chance that this available response fails. For `0 < p < 1`, take exactly one saved-world draw `u`; contact follows when `u < p`, otherwise the actual duck commits. At `p=1`, contact follows without a draw; at `p=0`, the qualified pose commits without a draw. No release deviation, off-ray roll, broad-bound roll or second miss after injury remains. Existing base `conditionAdjustment: none` stays neutral; its inactive `.85` coefficient is not an extra live penalty.

The ordinary body profile remains canonical. One saved native pose record derives the actual shorter capsule and anchors for every world query; it is not a renderer-only flag or a changed navigational location. The response changes the shape atomically, then all relevant same-time candidates are recomputed before any remaining world time advances. A current guard uses the existing directional shield/contact-defense owner and is incompatible with this automatic duck. If independent physical shield geometry is later installed, its earlier real collision cannot be skipped because the carrier could evade.

No arrow retains a permanently ignored body life. A ducked body is still hit wherever its actual shape intersects; after leaving one crossing, the same moving body may reenter that flight and be hit. Its pose/cooldown prevent repeated response attempts, not collision. The same ray can continue into another body, a wall or its source after the source's initial launch-overlap escape. A pending observed-miss cue is tied only to one continuous crossing and never suppresses later geometry. Show **Miss** only after actual clearance where the observer could perceive it; a pose occurrence alone does not prove the rest of the flight will miss.

The pose hold, return and response cooldown use game time and survive coherent saves with their exact body life/profile and the random sequence. At `1×` the hold is `0.2` real seconds and the cooldown is `1` real second; at `0.5×/3×/8×` they scale with the simulation just like native movement and attacks. The human ring continues in real interactive time. If standing restoration is obstructed, the character remains visibly and physically ducked; the renderer cannot make it stand by animation alone. Actual injury/collateral, private defender facts and personally observed evidence retain their native owners.

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

Pointer, touch and keyboard routes position the same marker in these local coordinates; browser pixels and viewport scale do not change scoring. The marker starts at the frame center. Keyboard movement uses one 120th of the frame as its fine step and ten 120ths as its coarse step, clamps to the frame edges and commits through the same input owner. Retain integer step positions from the initial `(60,60)` and normalize by 120 when submitting, so every authored midpoint is reachable without floating-step drift or snapping to a winning point. Pointer/touch placement may use free finite local coordinates. When keyboard control takes over, round each current coordinate multiplied by 120 to the nearest integer with half-up ties, then apply the selected step; do not reset the marker to center or old keyboard indices. Both routes permit the same maximum effective capacity without numeric coordinate entry. Accept one finite in-range `(u,v)`, and define:

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
| -------------------- | ------------- | -------------------------- | ------------- |
| 2                    | 7             | 8                          | 10            |
| 3                    | 11            | 12                         | 15            |
| 4                    | 14            | 16                         | 20            |
| 5                    | 18            | 20                         | 25            |
| 6                    | 22            | 24                         | 30            |
| 7                    | 25            | 28                         | 35            |
| 8                    | 29            | 32                         | 40            |

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

Human input uses real interactive time. Native movement, work, flight, windup and recovery retain the existing 60 game seconds per real second at 1× and the selected speed multiplier. Neither a held ring nor Ready to finish pauses other actors. Step timing freezes only its displayed phase; it does not give a stationary target or halt physical consequences.

| Selected speed | Game seconds per real second | An 18-game-second preparation | A 36-game-second recovery | A six-unit pouch's 216-game-second work |
| -------------- | ---------------------------- | ----------------------------- | ------------------------- | --------------------------------------- |
| 0.5×           | 30                           | 600 ms                        | 1,200 ms                  | 7,200 ms                                |
| 1×             | 60                           | 300 ms                        | 600 ms                    | 3,600 ms                                |
| 3×             | 180                          | 100 ms                        | 200 ms                    | 1,200 ms                                |
| 8×             | 480                          | 37.5 ms                       | 75 ms                     | 450 ms                                  |

These are direct clock conversions before latency or extra handling; the specific weapon table owns its actual values. The ring remains a 900-ms real cycle at all these speeds. At 8× a target may move substantially during a single human choice; that is an explicit acceptance risk to measure, not permission to hide a slowdown or change world time. A different combat/calendar clock would require a separate product decision.

Use the [selected accessible controls](../../projects/action-execution-and-skill-expression-tech-design.md#62-a-complete-finite-accessible-attack-route): ordinary Attack/Craft, Prepare/Release buttons, keyboard reticle, Step timing, non-color cues and keyboard pouch placement. Ordinary skip is neutral. Skilled assistance can attain the same noncompetitive maximum, with current native costs and physical consequences. This desktop slice does not claim console/touch parity without evidence.

The **proposed first-slice trust safeguard** makes the entire optional human score zero at an actual human-owned body, including penalties and temporarily disconnected bodies. Native competence, geometry, review, injury and recovery still apply; this does not disclose hidden ownership. Mike has deferred complete PvP fairness, and this proposal is not anti-cheat certification. Ordinary shared-play fitting uses exact native work and bounded recomputation, and its item remains useful after trade. A separately designated ranked production mode needs a qualified policy or neutral creation; it cannot downgrade a previously created item on transfer.

## Human interaction scoring and meaningfulness

Combat's [generic deterministic evaluator](../../projects/action-execution-and-skill-expression-tech-design.md#22-deterministic-evaluation-and-presentation) consumes the admitted [timing profile](#concentric-release-interaction). Pouch placement has its own complete [fixture and score](#exact-visible-fixture-and-score). Neither is a collision verdict or evidence of human input authenticity. Do not copy either formula into another authority or impose one interface on every craft.

The proof needs actual uncoached use: a deliberate shot should offer a worthwhile choice against a moving threat, and a fitted pouch should make a useful kit easier to carry as one object. The midpoint task is an explicitly modest first exercise. Repetitive free capacity, a trivially optimal extra click, an irrelevant storage advantage or a compulsory survival chore fails the playability/value gate even when every data and receipt test passes.

## Qualification and ownership

Complete play scenarios: deer moving after aim; stationary practice target; two bodies on one arrow ray, including locally avoided first body; shield/cover; skilled weapon contrast; active WASD and cancellation during aim; unpredictable target disappearance; player entering combat mode after personally observed assault and choosing Speak; one valid ordinary and fine/rough six-unit bag, real packing, overflow, later transfer and restored quality; NPC use; an installed contrasting world that disables timing and fitted items. Include bad timing with a good physical hit and green timing with a true miss.

Source and limits: [technical contract](../../projects/action-execution-and-skill-expression-tech-design.md), [ASE tasks](../../maintainers/action-execution-and-skill-expression.md), [limits](../../limits/action-execution-and-skill-expression.md), [original item family](camp-containers.md), [current ranged profile](ranged-counterplay.md), [competence](practical-competence.md) and [player feedback](../../ui-ux/world-interaction.md).
