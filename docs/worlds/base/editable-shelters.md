# Light canopies and useful shelter in the base world

**Flat canopy/two-bay delivered October 6; corrected contact and the single-bay sloping cloak delivered October 7, 2026. Broader homes remain proposed.** This document owns the initial materials, arrangements, work and moisture tuning for the [editable-shelter product specification](../../projects/editable-shelters-feature-spec.md). Its [technical counterpart](../../projects/editable-shelters-tech-design.md) completes PX05's design and source mapping; [SH01–SH06](../../maintainers/editable-shelters.md) retain runtime delivery beneath INV-6.4 and the existing object, spatial, state and base-world owners. [AV04 evidence](../../verification/editable-shelters.md) records actual construction, cloak attachment, finite rain/drying and unchanged sleep/fire/health rules. Runtime content is authored once in `packages/domain/src/worlds/base/canopies.ts` and `canopy-scene.ts`.

## The first playable building choice

Offer a flat, open, ground-supported canopy, with a second adjoining bay as its first extension. A player can choose a view, stop beside useful resources, shelter an exposed belonging, rest where their body fits or invite someone to the covered space. The arrangement is not an enclosed room, a new healing station or a requirement for adventuring.

This selects a flat canopy before the earlier illustrative lean-to. Under the selected vertical-rain approximation, a slope adds no runoff, snow or wind benefit. Supporting that extra shape before ordinary building works would add choices without a corresponding use. The separately authorized single-bay leaning roof now qualifies under the same family. It offers a visual/layout choice without an extra weather or body benefit.

The introductory shelter scene supplies actual finite construction materials once. It is a finite new-world endowment in the first clearing; opening controls or restoring a world supplies no additional kit. A player in an existing world receives no retroactive free stock merely because the feature is installed. A creator may explicitly instantiate the kit through the existing authorized world-creation tools. Broader gathering or manufacturing of posts and cloth can follow a useful construction experience.

## Initial materials and quantities

| Material              | Admitted role                                                                                                  | Introductory quantity | Conservation and limits                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Large travel cloak    | One flexible covering; also wearable through a qualified back attachment through the existing equipment action | 1                     | The same individual item is worn, carried or installed in one location. Wearing it does not add armor, warmth, healing or immunity. |
| Spare weather cloth   | A second flexible covering with the same initial coverage properties                                           | 1                     | It is a tarp, not automatically a garment. It cannot be equipped merely because the cloak can.                                      |
| Light canopy post     | One 2.30-metre ground-supported upright suitable for this family's span and height                             | 6                     | A new authored part. Existing supple branches and finished weapons do not become structural posts through their names or wood tags. |
| Reusable cord binding | One intact cord assigned to one cover corner                                                                   | 8                     | Each binding remains an actual material item while installed. A shared post can hold two distinct bindings for adjacent covers.     |

The new scene separately grants exactly two tall 2.40-metre posts to its builder for the lean-to. Its two short posts come from the unchanged six-post kit. Installed tall stock must be reclaimed before another lean-to can use it; restart or restoration never supplies another pair.

The coverings begin intact and dry. Each has an actual usable rectangle of **1.8 × 2.4 metres**. This is a large cloak selected for the scene, not the size of every garment or fabric item. Folding it for wear does not change its available material, and unfolding it does not duplicate it. The cloak uses AV02's equipment owner and its qualified back port; the tarp is not wearable.

An exact-pinned material condition is intact or unusable for this first family. Only intact certified posts, cloth and cords qualify. Initial stock is intact; rain changes moisture without producing damage. This categorical check is not a delivered damage/repair process or a detailed strength model.

The current [cordage method](items.md#cordage-manufacture-and-reuse) can provide replacement cords from real prepared fiber. Its manufacture consumes fiber under its existing rules. Using a finished cord as a reversible shelter binding is a separate construction consumer: installation places that actual cord in the assembly rather than consuming it as an abstract recipe ingredient. Only the admitted cord interface and this binding method qualify; a flexible-looking item is not sufficient.

No kit material replenishes when the player opens a panel, restarts, dismantles the shelter, changes its name or returns after an absence. The player may recover surviving parts and use ordinary available supplies. Repeated rest or conversation creates no building materials.

## Flat and sloping arrangements using the same rules

| Arrangement             | Clear floor between the inner post faces                                                                          | Required actual parts      | Intended use                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| One open bay            | **1.5 × 2.0 metres**                                                                                              | 4 posts, 1 cover, 4 cords  | One person's snug shelter or a small exposed supply spot; advertise only the use that actually fits |
| Two adjoining open bays | Two adjacent **1.5 × 2.0 metre clear bays**; the combined footprint follows the actual shared posts and coverings | 6 posts, 2 covers, 8 cords | Separate a person's use from supplies, or provide more standing space for company                   |

The single-bay lean-to uses the same clear floor, one actual covering/four cords and two actual short/two actual tall posts. Its length is measured in the cloth plane, including lower overhang. The finite panel has normal thickness; its conservative minimum underside is not its bounding-box upper height or a flat roof.

The usable height is at least **2.2 metres beneath the admitted cover**, not merely at the highest post. All posts stand on one qualified ground patch; the initial method does not excavate, level terrain or remove obstacles. A bay can face any of **four orthogonal orientations**. During placement preview, the entire footprint may be moved to a valid chosen ground position; the orientation aid does not force the world's terrain onto a universal grid. Moving an installed assembly requires real disassembly, transport and rebuilding.

These flat dimensions are now exercised with the current person's actual 1.75 × 0.56 reclining envelope and 0.10 margin on each side. The ordinary rest action approaches a checked position; arrival rechecks physical clearance and occupied space. The existing global sleeping collision remains upright, while the displayed sleeping person uses that horizontal envelope. Future bodies still need this fit check before advertising rest. Do not make the player find a diagonal or pixel-perfect placement. If that body does not fit, enlarge the clear bay and its actual covering together and reconcile the limits before release. Do not keep an attractive nominal size while falsely claiming usable shelter. A supply bundle in the necessary resting footprint can prevent rest until it is moved normally.

The shared edge of the two-bay layout has no invented third covering. Actual covering extents, joint overlap and post positions determine whether there is a dry seam. A visible gap leaks. If the selected covers cannot span their declared supports with the selected overhang, the arrangement is unavailable until the material/layout is corrected. A third bay and unqualified body/layout variants remain outside this profile; the selected slope is single bay only.

Separately supplied shelters may use different orthogonal headings when separated. Overlapping perpendicular slopes are outside the current exact rain calculation and refuse during preview/work and current-format validation. This closes an admission defect that previously accepted the individual panels and failed during later exposure; it does not change sheet dimensions, grants or starting stock. Align their slopes or separate their actual extents. General diagonal relative-height clipping needs its own qualified extension.

The initial profile permits at most **two connected bays, 32 protected material parts per assembly, including installed parts and unreclaimed lowered salvage, two covering layers over any point and one active construction edit per assembly**. The first kit uses fewer than 32 parts. This tightens PX05's installed-only count so repeatedly failing and replacing covers cannot leave an unbounded protected-material set on one root. Reclaim actual salvage before exceeding the allowance; no material is deleted to make space. These bounds leave space for a temporary replacement cover and its bindings; they are not a promised settlement capacity or a universal limit on homes. A temporary cover consumes real spare material. More complexity requires a qualified extension, not silently dropped parts or ignored lower layers.

## Qualified geometry for PX05

These are the implemented flat and single-bay sloping inputs exercised through the existing native owners. Lengths are metres; local plan axes become the existing world's horizontal axes through one root transform.

| Parameter                     | Authored value and consequence                                                                                                                                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Post section and flat heights | Square section 0.10 × 0.10; six kit posts have actual height 2.30. Ground contact must qualify on one flat support patch using spatial-owner tolerances, without digging or leveling.                                                                                                            |
| First bay post centers        | `(u,v) = (±0.80, ±1.05)`, yielding 1.50 × 2.00 clear floor between inner faces.                                                                                                                                                                                                                  |
| Cover and edge allowance      | Actual rectangle 1.80 × 2.40 along its plane; admitted collision thickness 0.02; minimum unused edge beyond each anchor line 0.10 along the plane. A flat cover has 0.10/0.15 actual overhang. The entire overhang counts for geometry and exposure.                                             |
| Shared support                | Each qualified post admits two distinct cover-binding sockets. Each full cover needs four distinct grounded posts and four actual binding cords. This is a lightweight family's qualified tie, not a universal stress law or one cord counted twice.                                             |
| Adjoining bay                 | Post center columns `u = -0.80, 0.80, 2.40`, both rows `v = ±1.05`; roof centers at `u = 0, 1.60`. Actual cloth overlap at the seam is 0.20. Shared posts remain obstacles.                                                                                                                      |
| Single-bay cloak lean-to      | Same family/clear floor, with two actual 2.30 posts and two actual 2.40 posts at the opposite edge. The tall stock is a separate finite new-scene grant of exactly two 2.40-metre posts; the six-post kit is unchanged and no post is resized or replenished.                                    |
| Rest preview margin           | Add 0.10 on each horizontal side of the actual displayed resting extent. At the inspected person profile, the conservative displayed envelope is 1.75 × 0.56, padded to 1.95 × 0.76. Current physical sleep collision remains upright; both shapes must fit before advertising this shelter use. |

**Binding contact and work points (implemented and qualified):** each joint's own cover, actual binding and supporting post may touch only inside the post's upper 0.05-metre band, bounded horizontally by its actual section. The complete finite intersection must fit that band, and the actual joint must bind those exact parts. This accommodates the flat and qualified sloping sheet's thickness and its real tie without permitting cloth through an unrelated post or a lower part of its support. Bodies, belongings and other obstacles retain their ordinary collision checks.

For tying, use the exposed exterior face at 0.05 metres below the post top, distinct from the cloth corner above it. A binding can be worked from a clear face; this does not create additional binding sockets. The first person profile has up to four face-aligned stance candidates, each 0.35 metres horizontally from the post center, using the actual support height. These fractional-coordinate positions must pass body/skin clearance, reach, line-of-effect and route checks. An obstructed face is unavailable; if no face qualifies, refuse rather than ignoring the post or moving an occupant. Different bodies/heights require qualification under the same checks.

The flat and sloping calculations are in [technical §7](../../projects/editable-shelters-tech-design.md#7-worked-arrangements-and-contrasting-traces). A slope must fit the real in-plane material and its lower overhang must retain at least 2.20 underside clearance. Work stances must reach the actual joint under the actor's admitted handling reach; taller stock does not imply longer arms. No new runoff, wind or heat benefit is attached to the slope. Another admitted material set can change its dimensions/transmission through the same mechanism; labels alone supply neither span nor permission.

The two-bay seam already has two material layers and each shared post already hosts two bindings. Installing a replacement over both original roofs would exceed those allowances. An overlap replacement that preserves cover is available for a single bay with actual spare cloth/cords and free sockets; the two-bay case may require lowering the neighboring cover and disclosing its temporary exposure, or removing the old cover first. A requirement to keep both bays covered can be unsupported. Do not ignore coincident layers, invent a third socket or quietly increase the profile to make the preview green.

Flexible sheets may coincide at the admitted overlap seam/replacement layer without a rigid-solid penetration refusal. Each still counts as a real layer. Equal-height transmission uses stable material identity order as a coarse family approximation; posts, people and rigid material retain their physical collision checks. This permits the admitted seam without inventing extra vertical post height or a general interpenetration law.

## Ordinary work and rearrangement

The delivered method uses placement and tying rather than a new mandatory construction tool. The actor must possess the admitted handling/body capability and be able to reach the relevant site and materials. Work does not invent clearing, cutting or leveling.

| Completed phase                                             | Game time        | Material result                                                                                                                |
| ----------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Place one post in a valid site                              | 120 game seconds | That post becomes installed on the selected support                                                                            |
| Fasten one cover at its four valid corners                  | 240 game seconds | That cover and four actual cords become installed together; useful coverage begins only with the complete supported attachment |
| Untie and lower one cover by the ordinary reversible method | 120 game seconds | The same cover and surviving cords become reclaimable at the selected valid destination                                        |
| Remove one unloaded post                                    | 60 game seconds  | The same post becomes reclaimable; required dependent cover must first be handled                                              |

Reclaiming already-lowered salvage adds no tying labor; the builder still approaches its actual location and uses an admitted destination.

These are authored balance choices, not measured wall-clock latency or real construction estimates. The ordinary action view translates them through the world's active clock and includes approach separately. No enforced real-time countdown is added to make a small building feel expensive.

Place the posts as useful completed phases; fasten a cover only when its supports, actual material and permission still hold. Canceling before a phase's effect leaves that phase's uncommitted resources available under the normal hold rules. Completed phases remain. The method must not show partial cover as fully protective, refund completed work, or hold the unused second bay indefinitely.

Reorientation before work is a free preview. After installation, moving the roof or frame requires the applicable detach, carry and rebuild work. Intact ordinary tying is reversible with **no automatic material loss**. This deliberately makes experimenting with a modest shelter affordable. Cutting a binding or a covering is a different destructive method and is not supplied by this first kit merely to manufacture a sink. A later admitted repair or cutting method must state its actual input and salvage.

Replace a covering by choosing the incoming material and the outgoing material's destination. If the actor has a spare qualified cover and the supported method can overlap it, the old cover can remain effective until the new one is fastened. Otherwise the plan states the actual temporary exposure. An occupied space is never silently cleared or teleported. Removing a shared support identifies every cover that depends on it.

## Rain and drying for the first scene

Use one authored local vertical-rain input. A controlled comparison scene starts with a **20-game-minute shower**, followed by dry weather while supported world time advances. This finite weather scene is enough to demonstrate cover and recovery; it is not a general seasonal-weather or forecasting system and does not repeat to force maintenance.

The intact selected covering transmits **zero** vertical rain through its actual covered area. It does not protect a gap or a part of an item outside that area. Its outer surface can become wet while its underside protects what lies below. This is an authored weather-cloth approximation, not evidence that all real cloth is waterproof. A damaged or different material needs an admitted transmission rule; the first ordinary scene does not spontaneously damage cloth.

The selected cloth and exposed prepared-fiber lots retain a coarse moisture amount from **0 to 1**. For the first scene, full incident rain takes a dry, fully exposed eligible item to saturation in **30 game minutes**. The absence of incident rain takes a saturated eligible item to dry in **90 game minutes**. Partly transmitted/exposed rain scales the wetting contribution. This simplified profile uses wetting while rain reaches the material and drying when none does; it does not simulate simultaneous evaporation, wind or heat.

The object owner must preserve quantity and relevant material condition when lots split or combine. Ordinary inspection can report dry, damp or wet and whether the selected rule is currently wetting or drying the item; the precise saved amount is not a compulsory meter. Do not display an exact finish prediction when future rain is unknown.

Only the named admitted cloth and exposed prepared-fiber forms participate initially. Worn/carrying exposure of the cloak must qualify with its actual attachment. Moisture inside nested bags is unsupported until the container has a real transmission rule; appearance does not supply waterproof storage. No rule applies to every inventory item, body or fire by default.

### Initial exposed forms and condition labels

The coarse material law uses these selected forms. Their dimensions describe exposure, not packing load, armor or universal item geometry:

- Installed intact cloth uses its entire actual plane and receives rain remaining after higher sheets, before its own transmission.
- Directly carried folded cloth uses a 0.30 × 0.40 horizontal footprint at the carrier's actual handling anchor. The worn cloak uses a conservative 0.56 × 0.56 horizontal footprint at the supported person's body-top height across the outer garment. A different attachment/body needs an admitted profile; wearing the cloak protects no body meter by default.
- Reclaimed or involuntarily lowered cloth uses a non-solid 0.30 × 0.40 ground footprint, 0.05 above its actual support. It supplies no overhead cover and retains the same moisture. This is the first family's harmless folded/draped approximation, not simulated folding or collision-free cloth in every world.
- An exposed homogeneous prepared-fiber lot uses a coarse 0.40 × 0.40 footprint, 0.05 above its actual pile support. The lot retains one average material-moisture value across its quantity; this is not a per-fiber spatial simulation. Partial coverage scales incident wetting over that footprint.
- Directly carried eligible fiber uses the same 0.40 × 0.40 coarse footprint at the carrier's handling anchor, preserving its value while transported between exposed ground locations.

Moisture labels are **dry** at zero, **damp** above zero and below 0.5, **wet** from 0.5 to below one, and **saturated** at one. The thresholds are readable authored categories with no new mechanical penalty. The technical design owns interval integration and exact state-copy/equivalent-merge operations; it supplies no second moisture value.

Until nested exposure is admitted, an active eligible shelter-process material cannot be placed in an unsupported nested form: offer directly carrying it or a supported exposed ground location instead. This restriction prevents silently freezing an active wetting/drying law. It does not change unrelated existing bag contents or retroactively enable moisture on every fiber in an old world. A future bag consumer must explicitly qualify outer-to-inner transmission, relevant contents and retained state before this restriction can be removed. The first shelter's usefulness remains ordinary chosen place/use, not punishment for storing supplies.

This initial moisture changes readable material condition and demonstrates coherent protection/recovery. It does **not** reduce existing crafting yield, make the current campfire fail, injure a body or penalize sleep. A future wet-tinder challenge requires its separately selected world rule and a full alternative/recovery route. The first shelter does not need that challenge to justify its existence.

## Builder permission and ordinary use

The first scene has one explicitly authorized builder. A **construction permission**, supplied through the existing operational authority owner, lets the creator select that builder and eligible site/assembly. Current creator, spatial and container access alone does not grant construction. The initial builder grant separately names its permitted ground patch, operations and eligible physical material origins. It covers the specified building and alteration actions with material eligible for this use. It does not make a spoken ownership claim enforceable throughout the world or grant access to someone else's inventory.

The first method uses the designated kit and qualifying material the builder legitimately produces from inputs they may use. An additional person's material requires an actual transfer permitting this construction use, or a separately selected contribution workflow through the object and permission owners. Ordinary accepted handover currently changes custody; it does not by itself prove a new construction-use grant or change declared title. Until the additional grant is supported, the first material picker declines that input and offers the eligible kit/produced stock.

Material must be carried and authorized for the selected use. Picking another person's identified cloak up from a shared pile supplies custody alone; it does not meet this rule. Checking only the carrier or only the declared owner would be incorrect. Installed parts retain the same alteration/reclaim protection through every ordinary action route, including pickup and inventory manipulation. This is a narrow new construction rule, not a general theft, deed or land-law system.

Visitors use ordinary movement, hearing, conversation and eligible resting actions. Permission to visit is not permission to alter the assembly, take carried belongings or read private notes. World piles and containers retain their actual [physical-access rules](items.md#shared-containers-and-active-work); a canopy does not lock them. Cooperative construction requires a qualified grant/edit extension and is not smuggled into the one-builder proof.

## Failure and absence

When an initial flexible cover loses required support through a committed outside event, it stops protecting its former footprint and becomes a recoverable lowered/draped material at the site. The selected light-family failure causes no injury and cannot obstruct any supported occupant posture or exit. It grants no falling-roof protection to heavy beams, stone, upper floors or unsupported loads.

Ordinary requested dismantling should explain and avoid that failure by offering the proper cover-first sequence. If the player explicitly selects an available consequential action, it must still follow actual authority and occupant safety rules. Invalid new construction blocks before effects; already completed parts remain real.

The shelter stays in its actual place while its player is absent. Current-format restoration preserves the parts and material condition. A host pause is not a new storm. Existing human-body protection does not turn the shelter into invulnerable property, and this profile adds no abandonment deletion, rent timer or automatic deterioration.

## Maintained records

- Product behavior and complete journeys: [editable shelters](../../projects/editable-shelters-feature-spec.md), especially its DG13 expansion.
- Technical contracts/source mapping and contrasting traces: [technical design](../../projects/editable-shelters-tech-design.md).
- Numerical scope, reason and expansion triggers: [SH-L01–SH-L13](../../limits/editable-shelters.md).
- Existing material/custody behavior: [items](items.md). Existing rest and return remain with [sleep](sleep.md) and [lifecycle](lifecycle-and-protection.md).
- Delivery: [SH01–SH06](../../maintainers/editable-shelters.md) under [INV-6.4](../../maintainers/inventions-and-world-evolution.md#inv-6--composable-materials-assemblies-and-passive-world-processes); [PX05](../../maintainers/parallel-batch-04-expeditions-and-exchange.md#px05--editable-shelter-technical-design) completes design only. Existing object, spatial, state and base-world consumers retain authority.
