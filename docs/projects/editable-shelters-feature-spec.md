# Editable shelters, rain and home use — product and behavior specification

| Status      | Current progress                                                                                                             | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | DG13's concrete build, use, edit and reclaim journey is designed; review, technical design and runtime delivery remain open. | 2026-10-05   |

**Status: proposed detailed behavior, October 3, 2026, expanded for DG13 on October 5.** This develops ND07 and the rain/exposure portion of ND08 under INV-6.4. It does not claim current modular buildings, weather, moisture, drying or household behavior is implemented. Technical design remains deferred; the existing object, spatial, state, work and world-policy owners retain authority.

[PX05 in batch 04](../maintainers/parallel-batch-04-expeditions-and-exchange.md#px05--editable-shelter-technical-design) assigns the missing technical counterpart and delivery breakdown. Its design completion will not establish construction runtime acceptance.

## 1. The experience and its purpose

A player stretches a cloak over supports, gains a real dry patch beneath it, extends the shelter, replaces a damaged section and eventually makes a place people use as home. The cloak remains that particular cloak. When taken down, it retains its wear and moisture and can be carried or worn again. A person sheltered by it is protected by the actual arrangement, not by the word house in its name.

The recommendation is **a small ground-level assembly that players can shape, use and change**, with independently editable parts, local rain coverage and persistent material condition followed by coarse drying. Its first value is making an intention real: a place to stop, keep something, work, meet or return to. Support ordinary construction and renovation before broad architectural freedom. The long-term home grows through actual changes and use; it does not require a sequence of unrelated prefab upgrades that erase its history.

This gives Open Legend a concrete test of its larger promise: invented uses compose with persistent objects, characters recognize useful changes, and quiet-world effects continue without constant generative interpretation. It also creates everyday choices about shelter, supplies, cooperation and care. Those choices should be understandable and manageable without turning every absent hour into a repair bill.

A complete first experience has a visible payoff. The player chooses a spot for a purpose, turns their own cloak into cover, sees what fits beneath it and brings an activity or belonging there. Later they extend it for company, move the covering to a better view, or reclaim the cloak and continue traveling. A resident may accept an invitation, compete for the dry space, dislike the arrangement or prefer somewhere else. Actual use and response make the place matter; neither a compulsory friendly household story nor a new comfort statistic is required.

This is an expansion of the [accepted first playable](../../archive/05-project/first-playable-mvp.md), whose one-NPC live invention and hunting loop remains the initial proof. Building a home and managing damp tinder must not become prerequisites for that experience or replace it with a maintenance demonstration.

## 2. Existing commitments and initial scope

The accepted [materials and construction direction](../../archive/03-design-proposals/evolving-materials-and-construction.md) separates material properties, part geometry/connections, changing state, derived shelter and social meaning. [INV-6.4](../maintainers/inventions-and-world-evolution.md#inv-6--composable-materials-assemblies-and-passive-world-processes) calls for one shelter/rain example, with drying and combustion as separately supported consumers. The [object foundation](../maintainers/persistent-objects.md) already owns identity, custody, quantities, individual equipment and lineage; a new building must consume those owners.

### 2.1 Recommended first family

Begin with a single ground-level modular bay that can become a lean-to: light timber supports, admitted ground anchors/bindings and one flexible roof section. Neighboring bays can extend it. The selected plan states its dimensions and usable area using the actual supported body and material sizes. Do not promise that any cloak covers any number of people.

Use a simple layout grid for bays, roof areas and edge panels, with a few supported orientations and connections. The grid is a construction aid and a bounded geometric approximation, not a universal lattice for the whole world. A player selects a place, orientation and intended size through a visible preview or ordinary-language request; they need not place every twig.

The grid and precise placement controls are optional aids. Propose a sensible arrangement from the player's purpose and known materials, and show its actual appearance and usable space. Leave room for meaningful choices of location, covering, openings and connected bays without asking the player to manage the underlying support relationships. A novel supported use can still go through invention; ordinary variations of a known design should not require another paid authoring session.

The first building is single-story, ground-supported and non-walkable on top. Unsupported multistory buildings, arbitrary cantilevers, moving structures, underground excavation, full stress analysis and freely shaped load-bearing meshes remain explicit later families. Light walls and a usable doorway/door are the next extension of this same design, not a prerequisite for rain cover.

### 2.2 Rain first, recovery before punitive consumers

The first mechanical proof supplies local vertical rainfall, actual roof transmission/coverage and persistent moisture on selected exposed materials. It introduces no automatic rot, body injury, item destruction or productivity penalty solely from wetness. This keeps the wetting-only proof from imposing damage that players have no supported way to reverse. It is an engineering proof within the feature, not sufficient evidence that the feature is worth playing.

The recommended first complete player release adds a **separately admitted coarse ambient-drying rule**, understandable ordinary building/editing, and chosen use of the resulting space through supported activities. The player can make something visibly their own, try a different arrangement and use it without managing every fastening. Wetting and drying give the material continuity; an added penalty is not required to justify that continuity. A resting, storage or conversation use claims only the behavior its existing family actually supplies.

Keeping compatible tinder dry enough for the campfire-lighting method remains an **optional authored survival challenge after the positive shelter experience is qualified**. It would explicitly revise that family's currently unconditional success after its existing prerequisites; it is not current fire behavior or a requirement for the first useful shelter release. Select it when preparation, alternatives and consequences make that world's play more interesting, not merely to make players need a roof. Qualify wetting, protection, drying and use together before enabling it, and preserve the complete recovery contract below. A shared world's selected material law applies coherently; optional here means an authored-world choice, not immunity for a preferred player.

Broader combustion, flame spread, body temperature, smoke, insulation, wind-driven rain, runoff, flooding and decay remain distinct extensions. A warm-looking hut or a burning campfire does not supply those effects. Existing world clocks and human protection remain controlling. No new universal damage or offline-property immunity is selected here.

## 3. What a shelter consists of

### 3.1 Parts and connections

Each meaningful editable part has an actual material, size, placement, condition and relationship to supporting parts. An intact roof section, a post, a light wall panel and a door can be selected separately. Do not create one entity per fiber, nail or raindrop when the admitted behavior does not need that distinction.

Connections explain what the arrangement can do: holding a cover above a bay, supporting a panel or allowing a door to move. Adjacency alone is insufficient. A cloak dropped beside a frame is not installed roofing; a beam leaning nearby does not count as a support. Conversely, a usable cover need not be a permanently consumed ingredient if it can be tied and untied.

First-family support rules are deliberately simple. A roof arrangement remains supported only while its declared required anchors/supports are attached, intact enough and connected to valid ground support within its allowed span. An unsupported candidate is shown as such before work begins. More expensive or unusual materials use their qualified load/span family; renaming a thin stick as a steel column does not grant strength.

### 3.2 Material condition stays with the material

Distinguish shared material characteristics, such as supported permeability, from the particular object's current moisture and damage. The same cloak can be worn, carried, installed, removed and repaired without acquiring a fresh default condition at each transition. A construction label does not reset age, wetness, ownership or existing damage.

Prepared pieces made from consumed stock retain a truthful account of the material transformation. Cutting a cloth into panels can create new pieces while consuming the corresponding original portion; the intact cloak cannot remain available too. Splitting or combining compatible material preserves quantities and relevant state through the existing object rules. Incompatible wet/dry or differently damaged material must not merge into an unexplained pristine stack.

Unknown properties remain unknown. A creator can author and admit a material approximation through existing invention, but the shelter tool cannot treat an unspecified material as waterproof, indestructible, noncombustible or free. Cosmetic material variation need not create a new mechanical definition when the same admitted behavior applies.

### 3.3 Useful places and meaningful homes

A dry patch, a usable resting area, a room, an owned structure and a home are separate things. Coverage derives from the actual overhead arrangement. Access derives from actual geometry. A sleeping place requires a suitable reachable space under the selected rest rules. Ownership follows actual claims and permissions. Calling it home expresses a person or household's use and attachment.

The place can retain its identity as parts change, rooms split or the roof is replaced. Preserve meaningful histories and relationships to the place without forcing every renovation to be the birth of a new home. The physical footprint and usable area still change honestly. A remembered old wall is not still present because the home kept its name.

## 4. Building through ordinary play

### 4.1 From an intention to a concrete plan

“Make a little shelter here” should select a compatible available plan and infer routine details. Show the footprint, roof extent, opening, selected materials, approximate work and intended use before committing consequential work. If the request implies a larger household or complete enclosure than the plan provides, say what it supplies and what remains missing.

Use current knowledge, actual accessible resources and permissions. The plan cannot use a neighbor's cloak or hidden stock just because it would be convenient. Offer a scoped materials choice when it matters: use the player's own cloak now or prepare a dedicated covering at additional work/material cost. Preserve a chosen treasured item rather than automatically cutting it because a cheaper recipe uses cloth scraps.

Ask when the ambiguity changes a meaningful consequence, such as which occupied wall to remove, whose resources to use or whether cutting a garment is acceptable. Routine orientation within the selected clear site need not produce a chain of confirmations. The player can inspect, adjust or cancel the plan using keyboard or pointer, with a readable description equivalent to the visual preview.

Treat the preview as help with that choice, not another compulsory planning mode. When the intention, materials and consequences are already clear, one ordinary build/edit action can begin the work. Show the meaningful cost or blocker and infer routine details. Offer manual control for people who want it; do not repeatedly ask them to approve each support, fastening or unchanged step. Inspecting, rotating or comparing already supported arrangements should not itself trigger fresh paid invention.

### 4.2 What work does over time

Construction is an ordinary admitted activity with actual approach, tools, materials, stages and interruptions. Recommended stages for the initial bay are preparing the site within supported operations, placing supports, fastening the covering and checking the usable result. Do not include digging, leveling or tree removal merely because the plan says prepare site; those need their own supported actions.

Reserve only the material and work scope the admitted activity actually needs. The plan explains which resources remain loose, which are held for work, which become installed reusable parts and which are consumed. A drawing does not reserve the whole forest indefinitely. Existing resource-hold and action lifetime limits remain controlling.

Useful partial work remains real. Installed posts can stand before a roof is added; an unfinished bay has no completed-cover benefit. A completed roof section can protect its actual footprint even while a neighboring bay is unfinished. Canceling the whole project does not erase completed posts, grant finished cover or refund consumed bindings as new stock.

### 4.3 Interruption and cooperation

When rain starts, a tool breaks, someone needs help or a required material moves, the builder responds through actual evidence and agency. Completed work and consumed resources remain. Unstarted work can stop or be revised. Provider latency is not labor, and provider failure cannot be narrated as a dropped beam or ruined cloth.

Several people may work on distinct compatible parts. They must actually choose or accept the work. A shared construction project does not conscript nearby residents or convert a human's silence into agreement. They share the physical result but can have different motives, knowledge and claims.

For conflicting edits, only a still-valid operation can take effect. Two workers cannot both consume the last cord or replace the same roof from an obsolete plan. The later action sees the changed situation and explains whether it can adapt or needs a new choice. Preserve valid partial work; do not duplicate resources to make both animations finish successfully.

### 4.4 Placement and occupied space

Check actual space, access and support before a part becomes real. A new wall cannot appear through a person, seal them into an unsupported collision arrangement or move their possessions to an invented location. A blocked installation waits only within its admitted work conditions or returns a clear refusal; it does not hold resources and workers forever.

Opening and closing a supported door requires actual reach and clearance. A person cannot use a bed, storage object or work surface through a wall merely because it is within a radius. Removing a wall can open a route; adding it can invalidate future movement. Current movement and already engaged interactions must reconcile with the new geometry rather than continue through it.

## 5. Rain cover that follows the actual arrangement

### 5.1 Local exposure

The first weather rule supplies a local incident rain condition and intensity over a declared area. The initial direction is vertical. It needs no simulation of individual droplets. The same rainfall affects equivalent exposed objects under the same rules whether a player is watching, an NPC is reasoning or a model service is unavailable.

An intact admitted roof intercepts or transmits rain according to its material, installed coverage, gaps and current damage. A person partly outside its footprint can still get wet. Walls alone do not stop vertical rain. A supported awning can provide real cover without four enclosing walls, a bed or an ownership flag.

Only supported physical cover participates. A decorative mesh is not automatically waterproof; a terrain overhang or tree canopy needs its own admitted exposure behavior before it protects anything. Show meaningful discrepancies before a player relies on a structure, and keep representation faithful to the supported footprint.

### 5.2 Gaps, layers and damage

A missing roof section exposes that area. A patched section changes the local transmission; it does not repair unrelated sections. Damage must have a legible effect consistent with its admitted form, such as an actual opening or increased leakage. An invisible whole-building protection percentage is a poor substitute for a gap the player can locate and fix.

Overlapping covers act on the rain that remains after the earlier layer. For example, two hypothetical layers transmitting 50% each leave 25% of the original incident rain, not zero and not negative rain. These numbers illustrate composition, not measured cloth performance. The upper layer can become wet while reducing the lower layer's incident exposure. Do not let each layer subtract the full original rainfall again.

The first model does not route runoff into puddles or simulate wind blowing rain under an overhang. Explain that approximation in creator rules; ordinary play can simply show direct cover and leakage. Future water collection needs an explicit admitted source/collection rule so stacked roofs cannot multiply captured water. A rendering of drips creates no inventory resource.

### 5.3 A useful answer to “am I sheltered?”

Use clear local descriptions: covered from the current rain, exposed at this edge, leaking above this spot, or cover unavailable because a support failed. The answer is specific to the relevant activity/body extent. A tiny dry point under a patch does not mean an entire reclining person or work area fits there.

When a player previews a sleeping or work position, show its actual usable extent and the relevant cover. Do not require invisible pixel-perfect placement to gain a binary shelter flag. Use a stable readable footprint and honest partial exposure when a body or object crosses the edge. Exact placement tolerances remain a qualified spatial limit.

Cover is not automatically warmth, sound isolation, privacy, protection from attacks or an ownership right. Each additional claim needs the corresponding supported behavior. A closed door can block sight/movement where the spatial family says so without becoming a universal acoustic seal.

## 6. Moisture, drying and a practical reason to maintain cover

### 6.1 Wetness is persistent state

Selected materials accumulate moisture from actual exposure up to their authored capacity. A cover can stop new wetting without removing water already held. A soaked cloak taken under a roof remains soaked until a supported process changes it. A dry replacement roof can protect wet belongings while itself gradually becoming wet.

Use understandable condition descriptions such as dry, damp, wet and saturated where the material supports them. These are presentations of one changing state, not separate inventories of water and independent condition flags that can contradict each other. Exact capacity/rates and meaningful boundaries belong to the authored material family and its limits, not universal engine constants.

Initial applicability is deliberately narrow: the admitted covering materials, exposed compatible fibers/tinder, and their supported carried or worn forms. A stone, body, metal weapon or arbitrary container does not acquire an invented moisture behavior by proximity. Extending exposure into a bag requires its own permeability and contents-exposure contract; neither “all bags are waterproof” nor “every nested item receives full rain independently” is a valid implicit default.

If an initial scenario relies on keeping tinder dry, it must use an admitted storage arrangement: a covered exposed stock location or a container whose water transmission is actually supported. A wicker-container graphic alone is not a dry-storage promise. Larger inventories require bounded exposure of relevant contents through the existing container owner before that scope is enabled.

### 6.2 Coarse ambient drying

The separate drying family removes moisture according to the admitted material, current exposure and selected ambient conditions. It can be deliberately simple: no full humidity field, airflow simulation or per-thread water movement is necessary. It must still preserve elapsed time, current moisture and the distinction between stopping rain and drying material.

A material can dry after rain stops, or under cover while rain continues, according to the selected rates. Moving it into shelter does not instantly reset it. Folding, wearing or installing the same item does not create a new dry copy. Material/arrangement changes can alter the admitted rate only when that relationship is actually supported and disclosed.

Give a useful coarse indication when practical: drying, still getting wetter, or no supported drying in the current conditions. Avoid false exact countdowns when weather or placement may change. Let players deliberately place materials in a suitable accessible spot and return later through continuing work; drying should not require repeated model calls or a player staring at the object.

### 6.3 Initial consumer: usable tinder

If the world deliberately enables this challenge after the drying path and positive shelter experience are qualified, the proposed bundled-world consumer distinguishes compatible tinder that is dry enough for the campfire-lighting method from material too wet for that method. It adds a reason to prepare protected stock and plan around weather. This is a scoped authored material requirement, not a full fire simulation, a new random roll or a prerequisite for enjoying construction. Preserve the current lighting behavior until this change is explicitly selected and delivered.

The proposed light-fire action retains its existing tool, time, material and fuel requirements. The dry-enough test joins the current checks at admission, work start and completion. If the selected tinder becomes too wet before completion, the attempt does not light the fire, consume tinder or newly spend fire fuel; the tinder remains that wet item and elapsed effort is not reversed. Preserve any independently committed change to the fire, rather than resetting a fire someone else already lit. Recovery is drying this material or selecting actually authorized usable tinder, then beginning another attempt. The action cannot silently substitute someone else's dry stock.

Perceived material condition informs the actor's available knowledge. A creator's exact moisture inspection must not leak into every NPC's decisions. A character can inspect, learn or be told about suitable tinder, and can maintain a supported supply through its own choices. If the wetness criterion cannot yet be evaluated or explained coherently, keep the current campfire behavior until the complete consumer is delivered.

Do not add ongoing wetness damage, rot, illness, sleep penalties or automatic destruction as hidden consequences of this first consumer. Future consumers can add meaningful tradeoffs when they have explicit causes, recovery and qualification. The first shelter should solve a problem more effectively than it creates an endless new chore.

## 7. Editing, damage and recovery

### 7.1 Add and extend

Extending a shelter creates actual new supports/cover where needed and connects them through the supported rules. The old covered space remains useful while work occurs unless the selected method truly affects it. A new bay does not reset the entire building's integrity or make existing wet parts dry.

Show what extra use the extension enables: more covered area, another reachable resting place, better protection at an edge or a separate work area. More roof panels do not automatically grant a global comfort multiplier. A completely overlapping panel can legitimately improve rain transmission if admitted, but does not create extra floor area or sleeping capacity.

### 7.2 Replace without unintended exposure

Replacing a covering can mean remove-then-install, or install temporary support/overlap before removing the old part when that method is supported. Present the meaningful difference in materials, time and exposure. A request to repair the roof while keeping sleepers covered should preserve that constraint or stop for a revised plan; it must not silently expose them because the shortest method did so.

At completion, the old part is either detached intact, transformed into declared salvage, or consumed by the chosen method. The new part has its own actual state. A cosmetic replacement cannot erase the old part's damage and also return it as pristine material. Replacing one wall with a heavier material requires a compatible support/span rule; the shelter's name cannot certify that the frame can carry it.

### 7.3 Remove and dismantle

Show local consequences before consequential removal: this section loses cover, this opening becomes passable, or these attached parts lose support. If the user clearly asked to dismantle the whole shelter, do not ask again for every predictable part. If a request is ambiguous about a dangerous or occupied dependency, make that consequence concrete before proceeding.

Do not forbid every edit that changes support. The player may deliberately take a shelter down. Provide a supported staged dismantling method and distinguish it from damage. A safe edit can refuse an invalid intermediate arrangement while offering a valid sequence, such as lowering the flexible roof before removing its posts.

Reusable intact parts return as those same objects where an actual authorized actor can receive or place them. Detachment may cost work without destroying the item. Destructive dismantling yields only the selected method's bounded salvage from actual remaining material; it can yield none for consumed bindings. No material is refunded merely because a plan was canceled or a structure lost its name.

### 7.4 Simple, explicit support failure

For the initial light flexible-roof family, losing a required support ends its overhead coverage and leaves the actual covering in a supported lowered/draped state. The first approximation treats that lightweight fabric failure as non-injurious and non-obstructing for every supported occupant posture and activity, including reclining sleepers. The material remains recoverable at the site; it is not automatically equipped, moved into an inventory or allowed to block a previously valid occupant or exit. This rule does not extend to timber beams, stone roofs or heavy stored loads. Preserve the covering's condition and placement history.

Only enable configurations whose failed state is representable under those rules. A heavy roof, walkable upper floor or load that could crush occupants needs a separately qualified failure family before construction. This deliberate scope is preferable to pretending full collapse physics exists or granting every unsupported building permanent immunity.

When actual damage removes support, the change takes effect from that occurrence, including without observers. It is not postponed until a player returns and cannot be repaired by reloading. Two simultaneous removals affecting the same roof must produce one coherent resulting arrangement, even if they targeted different posts. Individual edit validity does not imply joint structural validity.

### 7.5 Damage and repair have real causes

The first family supports explicit local part damage and visible failed connections through admitted actions/conditions. Rain changes moisture; it does not automatically rot the frame. More elaborate deterioration, hostile structure attacks or fire damage require their own actual families and participation policy. Current actor combat does not automatically imply complete building combat.

A repair uses actual materials and work appropriate to the part. A patch can reduce a specific leak while retaining its material and the history of earlier damage. Repair cannot exceed the part's admitted intact state, create spare material, erase moisture by resetting the object or repair every connected building. Renaming, picking up, reconnecting and changing detail level are not repairs.

## 8. From shelter to a place people use

### 8.1 Usable area and occupancy

Usable covered area depends on actual footprint, body dimensions, access, obstructions and exposure. A resting place needs sufficient reachable space for its user; a storage pile or support can occupy part of it. Display a practical estimate of what fits and the reasons for a shortfall. It is an estimate for the authored use, not a universal building-safety certificate.

Comfortable occupancy, physical occupancy, permitted access and household membership remain separate. People can crowd under a roof in an emergency even if it is not a comfortable long-term home, within actual physical rules. Owning a bed does not make an unreachable spot usable. An empty room does not automatically reserve itself for the person who named it.

The first home-use model records meaningful chosen uses: a person returns here to rest, stores permitted belongings here or associates this place with a household. NPCs still choose based on their needs, relationships and actual knowledge. They can prefer an open dry awning over a leaking enclosed room. A human is not assigned a household or moved home without their action.

Simple chosen use need not wait for full room or household machinery. If existing rest, placement and conversation already work in this space, let the player use them and let a resident recognize the observed change. An invitation can be declined and a claimed favorite spot can be contested. Do not require a bed score, ownership certificate or automatic friendship reward before a small open shelter can become memorable.

### 8.2 Walls, doors and privacy

Light walls and doors can create enclosure and separate usable spaces after their geometry/interaction paths are qualified. They do not change vertical-rain cover where the roof is unchanged. A doorway remains an access path when open; a closed door affects routes and supported sight as its actual geometry requires.

Hearing follows the [hearing owner](../hearing-and-speech.md). Visual opacity is not a guarantee of silence. A household's wish for privacy does not hide an otherwise audible conversation, while protected private channels remain protected independently. Avoid advertising a private room until the relevant sensory and access rules support that claim.

Locks, legal property protection, tenancy and automatic punishment are separate institutional features. The initial building can consume existing authorized access/edit rules and record permitted claims. It does not create a universal deed system or turn an NPC's belief that a home is theirs into engine authority over every object inside.

### 8.3 Continuing place identity

Adding an extension, removing an internal wall or replacing selected panels preserves the named place and its history where that is still the intended place. Connected geometry alone does not merge two households' identities, inventories or private histories. Likewise, dividing one room does not automatically divorce a household or create a new owner.

When the use genuinely changes, allow the relevant people to rename, relocate or abandon their association with the place through supported actions. Preserve past references as history rather than redirecting every old memory to a newly built object. The first scope need not infer sophisticated household law from topology.

### 8.4 Absence and care

Weather and admitted material processes continue according to actual world time and funded operation, including when nobody watches. Human body protection after exit does not protect the roof, tools or property automatically. Existing [lifecycle/property policy](../worlds/base/lifecycle-and-protection.md) retains that distinction; broader domain protection remains separate.

No new recurring durability loss or automatic abandonment deletion is introduced simply because an owner is absent. A player should not have to log in to repair arbitrary wear added to make buildings a resource sink. If a later world chooses decay, show its actual causes, rates, protection and recovery before people rely on it, and qualify the unattended consequences.

NPC care can be a chosen bounded task or accepted obligation using available materials and knowledge. Calling a resident the caretaker does not promise infinite labor or compute. An unattended roof should not receive free repairs from imaginary household activity, nor should reducing optional model work suppress a real rain event.

## 9. Economics, performance and overload

### 9.1 Meaningful cost without mandatory upkeep grind

Construction costs scarce material, useful tool access, work time and the opportunity to do something else. Reusing a cloak trades its current clothing use for shelter and risks its actual material condition. A larger covered area requires actual additional coverage/support, not merely a new label. These costs can create decisions without a periodic fee that deletes the building.

The reference world should favor reversible early experimentation: intact detachable parts remain reusable, the plan exposes likely work and irreversible cutting, and an ordinary mistake does not erase every supplied resource. Real consumed bindings and destructive salvage remain honest. Greater permanence can use more committed materials when a future family supports the tradeoff.

Maintenance should respond to real condition and use. The first release does not need background decay as a sink for surplus materials. A later economy can evaluate repair demand, resource renewal and land availability together; adding decay alone can punish absence without solving spatial or service growth. Resource abundance or efficient legitimate construction is not automatically an exploit. Duplication through detach/repair/reload is.

Building should remain a choice among viable ways to live in the selected world. A mobile player might use an existing permitted shelter, protect a small stock, rely on a supported maintained heat source or use a food route that does not require new ignition. Supply only alternatives that actually exist and work; do not invent shelter from a decorative tree or replenish resources to rescue every choice. A deliberately harsh start may narrow the options explicitly. In the ordinary bundled opening, preserve the dependable food-preparation route and leave room for invention, exploration and conversation instead of making everyone maintain a home.

### 9.2 Keep routine physical work inexpensive

Once a shelter/material rule is admitted, rain exposure, moisture progression, drying and coverage changes use that rule without authoring a new answer for every moment. Fresh model work is useful for an unusual plan, a character's new choice or a meaningful explanation. It is unnecessary for every unchanged roof, droplet, stored item or second of drying.

Use local affected relationships to revise coverage, support and routes after an edit. Do not repeatedly describe or inspect every part in every house. Reuse common physical facts while preserving each observer's evidence. A storm can be a regional occurrence with local effects, not a mandatory private generated sentence for every resident and every wet object.

Cost still grows with active exposed surfaces, material diversity, meaningful edits, overlapping cover, nested storage consumers and affected activities. A convenient bay representation does not make an arbitrarily large settlement free. Qualify the complete mixed workload: builders, weather changes, moving users, interrupted work, damage, old state and several observers.

### 9.3 Bound new complexity before reliance

Plans and additions must fit the supported part, overlap, connection, neighborhood and work envelopes. Show when a proposed span or structure exceeds that scope and offer a smaller supported arrangement. A creator cannot bypass the bound by calling a thousand parts one object, or by splitting one expensive project into many simultaneous requests.

No universal building-size, total-world-home or household-member maximum is selected here. Those need actual capacity and product evidence. This absence of new numbers does not mean unlimited construction: current work, storage, spatial, action and world admission limits remain controlling, and new family bounds must be qualified before release.

If required physical work cannot be sustained, use the coherent service boundary from [continuing lives](continuing-lives-feature-spec.md), not selective dry roofs or ignored collapse. Stop optional new proposals, repeated explanations and unsupported additions first. Retain current state and useful drafts; technical failure must not create fictional damage or free repairs.

Repeatedly toggling a door, moving a covering or issuing equivalent plans must not trigger unlimited new authoring or NPC reaction cascades. Actual geometry, elapsed exposure and consequential events still occur. Suppressing redundant descriptions cannot make repeated real exposure disappear or erase a new important hazard.

### 9.4 Continuity over absence and restoration

Advance passive effects using actual supported simulation time and the weather/arrangement history required by those effects. A real host pause or outage does not invent an elapsed storm. Arriving after a long quiet interval should materialize the same current material state, not replay every rain observation into memory or reset every item to dry.

Save and restore preserve installed parts, connections, loose salvage, current moisture, damage, committed work and remaining resources. If a newly introduced moisture rule lacks historical evidence, use an explicit authorized initialization approximation; do not fabricate exact past rainfall. Changes to a shared material law follow its version/migration owner and apply coherently to affected existing and unattended objects.

## 10. Concrete journeys and failure cases

### SH-J01 — A cloak becomes a roof and becomes clothing again

The player chooses a place to stop and selects their own cloak as a reusable covering. A sensible preview makes the new space understandable, with optional adjustment of its location and orientation. It stops being worn when installed and protects only its actual bay. The player can bring an existing supported activity or belonging beneath it, then extend the arrangement or take it down when they want to travel. Rain wets the cloak. Taking it down ends that cover and returns the same wet, possibly worn item. Equipping it does not dry or repair it, and it cannot simultaneously shelter the former spot. The meaningful choice is how to use a valued object and place, not whether the player can pass a construction form.

### SH-J02 — Stop halfway through construction

The builder installs supports, then leaves before fastening the roof. The supports and consumed work remain, loose materials follow their actual custody, and the bay gives no finished-roof protection. Resuming uses the current site and remaining resources. Canceling releases only unused holds and does not manufacture a refund for completed work.

### SH-J03 — Rain finds a missing section

Two roof sections protect adjacent areas and a third is missing. Rain affects the gap and any partly exposed body or object. Adding the third section changes that local area. The home name, bed assignment and other intact sections never supplied phantom coverage to the gap.

### SH-J04 — Two layers and one source of rain

A player adds a supported second cover over a leaking section. It reduces remaining transmission according to both actual layers and their damage. Each material receives its supported exposure. No layer subtracts the original rain twice, creates floor area or generates collectible water without a separately admitted collector.

### SH-J05 — Replace a roof above a sleeper

The requested method keeps a reclining resident covered. If a supported overlap or temporary support makes that possible, the plan uses actual extra material/work. If the available method requires exposure, it explains the conflict before continuing. The system does not move the sleeper, invent their consent or pretend the removed roof still works.

### SH-J06 — Two people remove different supports

Each begins from an arrangement that appears stable. Their completed effects are reconciled against the resulting shared roof. It either remains supported or enters its admitted failed state once. A stale second action cannot preserve phantom support or duplicate the covering's salvage.

### SH-J07 — The dry store is in a wet bag

A player places tinder in a container whose weather-transmission behavior is unsupported. The game does not promise dry storage from its appearance. A covered accessible stock location provides the first supported alternative. When a container family is admitted later, outer and inner exposure compose under one actual material account.

### SH-J08 — Wet tinder can recover

In a world that has deliberately enabled the optional tinder challenge, rain makes selected tinder unsuitable for that lighting method. The character can use permitted evidence to find protected stock or place the same material where it dries, and may pursue another actually supported activity or food route meanwhile. The material later becomes usable according to actual state. Reopening inventory and resubmitting the action do not reroll or reset wetness. The ordinary first shelter release need not enable this challenge; when enabled, it must add interesting preparation rather than repeatedly interrupting more interesting play.

### SH-J09 — An awning is useful without becoming a private room

People may choose to gather beneath an open roof during rain. The covered footprint is useful and may be crowded; someone can invite company, claim space, decline to join or prefer another place. Existing conversation and ordinary activities give the arrangement purpose without requiring a new comfort reward. Speech remains subject to actual hearing, and possession of the shelter does not confer access to everyone's belongings or private knowledge. Adding walls later changes the effects those walls actually support.

### SH-J10 — A home grows around its history

A household adds another bay and later removes an interior wall. Covered usable area and routes change while the place's meaningful history persists. An adjacent household does not automatically merge inventories or membership merely because the structures become connected. A new comfortable place can affect NPC preferences without forcing a relationship.

### SH-J11 — A heavier roof is proposed

The player requests stone over the light frame. If that load/span family is unsupported, the plan says so before consuming stock. A richer appearance cannot grant support. A separately qualified plan can require new supports and explain the actual work; it cannot quietly substitute light cloth while calling the result stone.

### SH-J12 — Return after rain during absence

The player returns to the actual roof, moisture and supplies after admitted world time. Their inactive body's protection did not freeze property. No new decay was invented because they were away, no fictitious caretaker repaired the roof, and no return-triggered replay gives everyone detailed memories of an unobserved storm.

### SH-J13 — A repair overlaps a resource conflict

One worker reserves compatible patch material while another tries to use it. Existing claim rules choose what can proceed. If a different part breaks before the repair commits, the old repair cannot silently widen to it or take extra material. The result identifies the actual section repaired and useful work remaining.

### SH-J14 — Service fails during a real storm

Optional plan generation becomes unavailable. Already admitted rain and material behavior continue within the supported operation envelope; no model call is needed for each roof. If required service itself fails, use a disclosed coherent pause/recovery boundary. A timeout cannot be narrated as a gust destroying the shelter.

### SH-J15 — Save a damaged shelter, then load it

The same gaps, supports, wet fabric, salvage and work state return under current-format restoration. Loading does not cause extra structural damage while terrain is unavailable or make unsupported roof parts briefly act as cover. External charges and current permissions do not rewind with the fiction.

## 11. Delivery stages and acceptance

**Stage 1: one editable cover and passive rain proof.** Build, stop, resume, extend, detach and reuse one light flexible-roof family. Supply truthful local coverage, material moisture, support failure and observer-correct feedback. Keep wetness free of new punitive consumers. Qualify cloak identity, gaps/layers, conflicts, passive operation without a model and restoration. This establishes the physical example; it does not yet prove that players enjoy using it.

**Stage 2: expressive useful cover with material recovery.** Add the separate coarse drying family, straightforward intention-to-build interaction, optional placement control and actual chosen use through supported resting, storage, work or conversation. Qualify a complete scene in which a player makes, uses and then adapts the space for a purpose. Provide an actual way to protect and dry applicable belongings. Establish whether people choose to build or modify without a new punishment forcing the choice. This is the recommended minimum complete player release; dry-tinder failure is not required. It follows the accepted playable invention loop rather than replacing it.

**Stage 3: room and home use.** Add qualified light walls, doorways/doors, reachable resting/storage spaces and chosen household use. Qualify dynamic navigation, occupancy, safe renovation, household boundaries and hearing distinctions. Expand geometry only when the first family remains legible and economical.

**Stage 4: selected challenges and richer materials.** Consider the optional dry-tinder challenge when its preparation, alternatives and recovery improve the chosen world's play; qualify the full lighting interaction before changing it. Introduce heavier support/failure families, more material transformations and selected weather/thermal consumers through their own designs and admission. Full combustion, wind, runoff, decay and legal property systems are not implicitly included. Each new family needs actual scenario, resource, background and workload qualification. Greater realism is not sufficient reason to add recurring work that overwhelms the activity it was meant to enrich.

After Stage 2, these are independent expansion choices: a useful tinder challenge does not require a complete room/household system, and richer rooms do not require new weather penalties. Select the next addition for the experience it enables.

Acceptance examines the complete result: does the player understand the space gained, use it for a chosen purpose and want to adapt or revisit it? Can they predict where cover exists, identify a leak, reuse a material without duplication, recover wet supplies, complete interrupted work, understand occupancy and preserve a home's continuity? Include someone who prefers to travel or use an existing place instead of building. Test keyboard, text descriptions, color-independent cues, enlarged UI and ordinary building-scale camera views. A geometry fixture is not sufficient evidence that construction is understandable or enjoyable.

**Simplify or defer when the feature becomes a chore.** If routine construction needs repeated explanations or approvals, improve defaults and direct manipulation before adding parts. If players build only to escape repeated fire failures, defer the new tinder prerequisite and evaluate the expressive cover experience on its own. If drying and repair dominate sessions, revisit the authored exposure, supplies and work balance rather than reward compulsory upkeep. If a larger structural family adds little freedom people actually use, keep the smaller family and spend effort on a clearer useful result. Apply the package's [playability gates](five-product-feature-specs.md#playability-gates); these are reasons to revise a proposal, not permission to silently change a live world's laws.

Compare total work and perceived usefulness for one shelter, a small settlement, concentrated renovations, overlapping roofs, rain transitions, nested-stock extensions and long absence. Measure parts/relationships considered as well as visible output, required physical work, new model decisions and retained history. No performance figures or unrun gameplay results are claimed here.

## 12. Research and the resulting choices

Research accessed October 3, 2026. Historical game patch notes establish their named releases and the developers' reported problems; they are not claims about every current rule or measured player satisfaction. Physical studies inform distinctions, not real-world construction instructions or universal game constants. The product conclusions below are design inferences.

| Reference and primary source                                                                                                                                                                                                                                                                                         | Evidence and limits                                                                                                                                                                                              | Consequence for this design                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SH-R01 — [Straube, BSD-013: Rain Control in Buildings](https://buildingscience.com/documents/digests/bsd-013-rain-control-in-buildings), August 22, 2011                                                                                                                                                             | The expert digest distinguishes deflection, drainage/storage/exclusion and drying, with geometry and wind affecting exposure. It is not a measurement of improvised cloak roofs.                                 | Separate interception from stored moisture and later drying. Declare vertical-rain scope without implying complete weather protection.                   |
| SH-R02 — [Heinisch, Bajzík and Hes, fabric drying experiment](https://journals.sagepub.com/doi/full/10.1177/1558925019873482), September 5, 2019                                                                                                                                                                     | Controlled tests found airflow affected drying of the tested fabric constructions. Small flat samples do not establish a universal cloak timer or fiber ranking.                                                 | Retain material moisture and use an admitted contextual drying process instead of an instant dry flag.                                                   |
| SH-R03 — [Wu et al., wet-state fabric thermal resistance](https://www.mdpi.com/2227-9717/11/6/1630), May 26, 2023; [publisher-provided readable copy](https://www.researchgate.net/publication/371112647_Modification_and_Validation_of_a_Dynamic_Thermal_Resistance_Model_for_Wet-State_Fabrics)                    | Ten fabric samples showed changing thermal resistance with saturation. Sealed samples excluded evaporation; the model excludes convection and radiation. This is not whole-person warmth or health evidence.     | Treat thermal behavior as a separate later consumer of wetness. The first moisture state grants no automatic cold damage or shelter bonus.               |
| SH-R04 — [EnergyPlus HAMT reference](https://bigladdersoftware.com/epx/docs/22-2/engineering-reference/combined-heat-and-moisture-transfer-hamt.html), version 22.2                                                                                                                                                  | Aggregate material layers/cells track moisture with explicit initial conditions. It is specialist modeling documentation, not a game benchmark or the proposed algorithm.                                        | Coarse persistent state is useful; individual droplets are unnecessary to preserve meaningful wetting and drying.                                        |
| SH-R05 — [NVIDIA Blast overview](https://github.com/NVIDIAGameWorks/Blast/blob/master/docs/index.rst) and [support model](https://github.com/NVIDIAGameWorks/Blast/blob/master/docs/api/introduction.rst), accessed October 3, 2026                                                                                  | Connected pieces/bonds track damage and separation. The core explicitly omits physics, collision and rendering.                                                                                                  | Start with explicit supported connections and failure consequences; a support graph alone does not implement realistic collapse.                         |
| SH-R06 — [Wallace, Figma multiplayer account](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/), October 16, 2019                                                                                                                                                                                 | The editor preserves identity during reparenting and describes problems with undo overwriting collaborators' work. Document-edit merging does not establish conserved physical construction.                     | Preserve parts and shared history; two different support edits can still conflict through one roof.                                                      |
| SH-R07 — [Autodesk Revit element editing](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-Collaborate/files/GUID-D1C070F9-FBDD-49F1-95E4-18E56A0A613D.htm) and [worksets](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-Collaborate/files/GUID-FDAA51E3-7703-4965-B09E-E61A92CD0E5A.htm), 2026 documentation | Borrowing, visible edit control and stale-element refresh are separate workflow concepts. Its ownership means edit control, not fictional title or custody.                                                      | Explain relevant active work and changed assumptions without converting a temporary reservation into property ownership.                                 |
| SH-R08 — [Valheim 0.214.2, official March 13 release text](https://store.steampowered.com/news/posts/?appids=892970&enddate=1679490947&feed=steam_community_announcements), 2023                                                                                                                                     | A particular roof-corner correction connects visible geometry, support and rain protection. The feed also contains a public-test post; this claim concerns the released heading.                                 | Qualify joints, corners and mixed pieces. Do not rely on an unexplained piece label for cover.                                                           |
| SH-R09 — [Valheim 0.150.3, official release text](https://store.steampowered.com/news/posts/?appids=892970&enddate=1620814144&feed=steam_community_announcements), April 19, 2021                                                                                                                                    | The release changes terrain loading and fixes building/ship damage during load. Reported optimization is specific to that release.                                                                               | Restoration and visibility must not cause structural damage or temporarily remove necessary support.                                                     |
| SH-R10 — [Enshrouded: Souls of the Frozen Frontier](https://enshrouded.com/en-US/news/enshrouded-souls-of-the-frozen-frontier-update), November 5, 2024                                                                                                                                                              | Dynamic weather and NPC home qualification coexist; a roaming NPC's shelter status is checked at its assigned bed.                                                                                               | Distinguish having a usable home from being physically covered at the current position.                                                                  |
| SH-R11 — [Enshrouded Patch 5](https://enshrouded.com/en-US/news/changelog-for-patch-5-v0741), November 21, 2024                                                                                                                                                                                                      | Corrections address roofs, drying, beds, navigation and interaction through walls. Removing NPC doorway blockage is a particular game concession.                                                                | Test entering, using and editing the whole place; preserve actual occupancy rather than silently adopting collision exemptions.                          |
| SH-R12 — [Grounded 1.2 Super Duper Update](https://grounded.obsidian.net/news/grounded/update-1-2), April 25, 2023                                                                                                                                                                                                   | Moving a structure is restricted when it is another's sole support; repeated furnishings give reduced comfort benefit. Coziness remains an authored reward system.                                               | Explain support dependencies and avoid making decorative repetition the main way to obtain useful shelter.                                               |
| SH-R13 — [Rust Devblog 189](https://rust.facepunch.com/news/devblog-189), December 7, 2017                                                                                                                                                                                                                           | Developers explain abandoned-building accumulation, material upkeep and clearer placement errors. The historical PvP tuning is not an appropriate default by itself.                                             | Keep fictional maintenance, land use and real operating cost separate; show meaningful invalid-placement reasons.                                        |
| SH-R14 — [Rust Devblog 198](https://rust.facepunch.com/news/devblog-198), March 1, 2018                                                                                                                                                                                                                              | Cupboard destruction created severe upkeep griefing, prompting bounded protection from existing resources. Separate conditional presentation changes reduce repeated checks; item repair economics were revised. | Avoid one marker controlling a home's disappearance. Favor useful repair while measuring the actual physical workload independently of presentation.     |
| SH-R15 — [V Rising: Secrets of Gloomrot](https://blog.stunlock.com/update-1-secrets-of-gloomrot-patch-notes/), May 17, 2023                                                                                                                                                                                          | The update addresses territorial obstruction and makes revision cheaper; automatic roofs, full dismantling returns and abandonment rules are game-specific choices.                                              | Make rearrangement affordable without inventing material or treating an intended private transfer as a public ownership race.                            |
| SH-R16 — [Eco: A Little Place to Call Home](https://store.steampowered.com/news/posts/?appids=382310&enddate=1611820234&feed=steam_community_announcements), December 12, 2020                                                                                                                                       | The developer's 9.2/9.3 plans distinguish residence, use and modification. Predicted cooperation is not measured evidence; resident access to stored contents is broader than this proposal.                     | Separate visiting, resting, household membership, storage rights and construction permission. Do not inherit universal access to residents' inventories. |

The physical evidence supports distinct processes and honest simplification. The game evidence shows that ordinary edge cases—corners, beds, doors, loading and maintenance markers—can undermine an otherwise attractive building feature. Together they favor one complete, legible shelter loop before elaborate structures. None supplies Open Legend's span limits, capacity, drying rates, repair prices or a proven maintenance schedule.

## 13. Recommended decisions and remaining choices

Adopt the light ground-supported modular bay, editable persistent parts, local vertical-rain coverage and coarse moisture/drying as the initial proposal, with a complete expressive use scene and easy ordinary editing. Keep the lightweight failure approximation explicit. Preserve part state and place history through modification, and let home use emerge from actual activities and choices. Retain dry-tinder failure as a separately selected authored challenge after the positive experience is qualified, revising the earlier proposal that made it part of the minimum player release.

The key tradeoff is physical expressiveness against understandable scope. Full structural simulation would broaden valid shapes and hazards, but would add cost and obscure the first practical loop. A small family with clear spans and failure behavior can already support borrowing a cloak, patching a leak, extending a home and working together. It must decline unsupported heavy construction rather than imply that all geometry follows those simplified rules.

Another tradeoff is repairability against resource demand. Recovering an intact part reduces punishment for experimentation; consuming actual bindings, spending work and preserving damage prevents free duplication. Maintenance should have a purpose beyond producing recurring engagement. A material-efficient player can be successful without the game inventing decay to defeat them.

The October 5 DG13 expansion below selects the initial material set, two arrangements, work and moisture proposals in the [base-world shelter owner](../worlds/base/editable-shelters.md). It also specifies ordinary use, permissions and failure recovery. These are proposed values to qualify through the complete scenes, not measured runtime support. Choose usable-tinder boundaries only if that later challenge is selected. Broader structure harm, protected property, heavy collapse and thermal/fire laws remain separate product decisions.

## 14. DG13 expansion — make a place, use it and change it

### 14.1 The smallest experience worth delivering

The first attraction is the player's control over a small place. After an outing, the player chooses a site near a view or useful route, makes cover from a valued garment, brings a belonging beneath it and decides whether to stay, invite company or reclaim the garment and travel. The player has changed the world in a way that remains visible and useful on return.

The recommendation is a **flat open canopy followed by an adjacent two-bay awning**, with real detachable parts and one authorized builder. The two arrangements use the same rules and differ in actual usable space. They do not require a decorative-room score, textile industry, daily repair, hired household or new survival penalty. This explicitly narrows the earlier lean-to example for the first release: a sloping roof follows when its shape is qualified and gives the player a worthwhile choice. The accepted longer-term modular-home direction remains.

The [base-world proposal](../worlds/base/editable-shelters.md) is the single owner for the initial cloak, spare cloth, posts, bindings, dimensions, work and moisture tuning. The starting kit is a deliberate finite scenario endowment. It is not an invisible free construction resource, and the current starter's supple branches are not structural timber. Current equipment does not yet support wearing a cloak. That new consumer is required for the complete cloak-to-roof-to-clothing story.

The first scene does not require live invention to rediscover an already admitted canopy plan. The ordinary build route must work directly once that plan is known and supported. A genuinely new material or arrangement may use the existing invention route; it must return a supported proposal with the same physical consequences. This feature is a consumer of world authoring, not a replacement for the game's initial live invention proof.

### 14.2 The player's first ten minutes, without a required script

This is an illustrative play sequence, not a timed tutorial or an NPC script.

1. **Notice an opportunity.** The player is near an open patch after doing something worthwhile. The scene shows their carried cloak and supplies. If they inspect the cloak or ask about making cover, the known plan is available. No urgent wetness warning forces a building lesson.
2. **Choose the spot and use.** The player selects a clear ground position and can see the proposed cover in the scene. They may orient toward the view, a path or their companion. The preview distinguishes the whole roof from the clear area beneath it and from the space occupied by posts.
3. **Start one ordinary activity.** The player sees the actual chosen cloak, required supports and cords, known work, and any decisive blocker. A single Build action begins the supported sequence. A separate modal approval of every post and knot would add no useful choice.
4. **See the result become real.** Completed posts persist. The cloak leaves its previous wearing/carrying location when the covering is committed. Coverage begins only when the required attachment is complete. The finished shelter can be selected in the world.
5. **Do something ordinary there.** The player drops an exposed belonging in a valid spot, rests if their actual body and the current sleep rules allow it, or speaks with someone nearby. No extra rest bonus is needed to make that a real use.
6. **Make one meaningful revision.** The player decides that belongings crowd their resting space or that there is insufficient room for company. The adjacent bay uses the actual spare cloth and additional parts. The first bay remains useful while the extension is incomplete.
7. **Leave or return on purpose.** The player can keep the assembly, carry the same reclaimed cloak away, or come back through ordinary movement. The place neither summons them with maintenance notifications nor changes their recovery destination.

No step requires the NPC to praise the construction, join the household or accept the invitation. If the NPC is busy or declines, the building still provides the player's chosen place. Solo quiet use is a complete outcome.

### 14.3 What each arrangement honestly supplies

The first bay is a snug candidate for one person **or** a useful supply spot. Its nominal floor area is not an occupancy promise. The preview must use the selected person's supported standing/resting footprint and a readable clearance margin. If a resting body does not fit naturally, the authored dimensions and covering must be enlarged before that use is offered. The player should not solve a collision puzzle to lie down.

The two-bay arrangement separates uses: one side for the player, the other for belongings or company. Shared posts are still physical obstacles. A missing section leaves a wet/open area; the assembly's name does not fill it. Roof overlap must fit the actual material and attachment rules rather than an artist's silhouette. These cases follow the practical warning in building-game corrections: convenient placement controls are valuable, but occupancy and support remain consequential. [SH-R17](#sh-r17), [SH-R21](#sh-r21), [SH-R24](#sh-r24)

The first ordinary uses are deliberately literal:

| Player intention                 | Result supplied                                                                           | Relevant boundary                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Put these fibers under cover     | Actual exposed material at a valid covered location follows the admitted rain/drying rule | The stock remains reachable under its real access rules; the canopy is not a private vault |
| Rest here                        | The existing eligible sleep/rest action runs in a location that fits                      | No new restoration multiplier, compulsory bed or shelter-only sleep restriction            |
| Wait and talk out of the rain    | Actual people stand where they fit and exchange speech through ordinary hearing           | The roof supplies neither confidential sound nor automatic friendship                      |
| Make room for company            | An actual second bay gives more covered space                                             | An invitation is separate from construction; occupants choose their actions                |
| Take my cloak on the next outing | The same reclaimed garment becomes available for its admitted wearing/carrying action     | Its former patch loses that cover, and wetness/damage remain                               |

Dry-looking decoration cannot stand in for the first row. A sit/lie animation alone does not prove rest mechanics, just as the specific furnishings and visiting permissions described in Palia are not general evidence of a sleeping or property system. [SH-R23](#sh-r23)

### 14.4 Selection and ordinary editing

Selecting a shelter shows its ordinary name, visible extent, whether the selected area is covered, and relevant available actions. Selecting a visible part shows that part's condition, its actual role and meaningful consequences of changing it. The default surface should answer “What can I do with this roof?” without requiring the player to inspect a graph of dependencies.

The ordinary vocabulary is **Inspect, Extend, Replace covering, Take down covering, and Dismantle**. A permitted direct action and an equivalent ordinary-language intention lead to the same plan and effect. The selected scope stays visible. An action reviewed for the left covering must not silently switch to the right one because selection changed.

Before work, the player can move or rotate the preview, compare a compatible cover and cancel. That changes no material or physical history. After work, a change of mind uses real disassembly and rebuilding. The word Undo must not claim that it can reverse another person's movement, elapsed rain or completed consumption. Grounded's separate Design/Play editor and its restoration of an unplayed design are useful evidence for reversible drafts; they do not authorize rewinding a shared living world. [SH-R19](#sh-r19)

An ordinary replacement preserves the intended location and compatible attachments when possible. The interface names the outgoing and incoming objects and the actual extra work. No Man's Sky's in-place replacements support this interaction choice, while its navigation corrections show why matching placement must still account for occupants. Open Legend must additionally conserve its particular material objects. [SH-R21](#sh-r21)

Use a concise explanation when an action is blocked: the missing support, occupied work area, absent permission, unsupported material, unavailable destination or active conflicting work. Keep the proposed layout and material choice so the player can correct that issue. Do not erase the entire design after a failed attempt or substitute repeated generative suggestions for a native reason.

Overlapping parts have a readable selection list with the same permitted facts as the world view. Keyboard users can choose location/orientation and each action without precise dragging. Reduced rain particles, reduced motion and a calmer weather presentation preserve the mechanical exposure and textual condition cues. A camera cutaway may reveal the selected geometry only within permitted presentation; it is not new sight of hidden occupants. The historical indoor-rain feedback from Project Zomboid motivates presentation alternatives, not weather immunity. [SH-R22](#sh-r22)

### 14.5 Work, interruption and the affordability of trying again

The initial reversible method installs actual cords and returns them intact when untied. It does not consume a cord every time the player turns the canopy or changes a roof. There is real work and a real opportunity cost to having the cloak installed, but experimentation does not need a recurring material tax.

That choice revises any reading of the earlier discussion that implied all bindings are consumed. A destructive cutting method can consume material under its own declared rules, and manufacturing replacement cord retains its current cost. This first method has no such cutting requirement. A full-refund building mode in another game is not proof that Open Legend should restore destroyed material; the intended lesson is to keep ordinary revision affordable while preserving the actual method's consequences. [SH-R18](#sh-r18), SH-R15

Each completed phase is real. If the actor stops after placing two posts, those two posts remain; the roof and unused bindings have not become a completed shelter. An interruption may leave the actor somewhere different, supplies unavailable or permission changed. Resuming starts from that current situation. It should offer the remaining valid work instead of rerunning completed phases or forgetting their material.

The first profile admits one active construction edit on an assembly. A second builder's unsupported edit is refused with the existing activity identified where permitted; it is not invisibly queued to run later. Ordinary movement, rest, conversation and unrelated inventory actions remain available when their own conditions permit them. An interrupted builder does not own the site indefinitely through a stale hold.

If a body enters the affected location after preview, the pending phase stops before an invalid physical change. It explains the actual obstruction without pushing that body away or narrating their consent. Removing an unused post is different from removing one supporting two roofs. Dismantle proposes the cover-first sequence and identifies any use that will lose coverage. This keeps the deliberate action legible even though the initial light-roof failure approximation is harmless.

### 14.6 Reclaiming and moving possessions

The player chooses a valid destination for reclaimed materials: their eligible carrying location or a reachable supported ground location. The plan accounts for the actual number of items and any capacity/access restrictions. If the selected destination becomes unusable before the phase commits, that phase stops and offers another destination.

If material has already been detached by a completed phase or external event, it remains in its actual recoverable location. A later pickup failure does not put the roof back, destroy the material or also create an inventory copy. The game reports “the cloth is down here; carrying it is blocked” in ordinary terms and retains the ordinary pickup route.

A covering and its surviving bindings can be reclaimed separately when their actual placements permit it. The item condition is continuous. The player does not gain a fresh dry cloak by reinstalling it or by transferring it between a pile and inventory. A spare tarp remains a tarp after reclaiming.

Moving an entire occupied assembly is not supplied by the first family. The player can move their materials through actual disassembly, transport and rebuilding. “Move this over there” can prepare that supported sequence and explain occupied or inaccessible parts; it cannot teleport a sleeping person or their belongings with a selected roof.

### 14.7 A home name is not a permission system

The first construction scene explicitly authorizes one builder for its site and assembly, and limits construction inputs to that builder's eligible carried material. A different person's cloak reaches that builder through a real accepted offer or a later qualified material grant. The product does not assume that current declared ownership already prevents every use of a shared pile.

This distinction is necessary because current [world-pile/container access](../worlds/base/items.md#shared-containers-and-active-work) is shared by default unless actual restrictions apply. A future collaborative build may use accessible shared materials under an explicit construction grant, but standing nearby, saying “our home,” having editor status somewhere else or being invited to rest is not that grant.

| Relationship to the place    | What it means                                                                    | What it does not grant                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Authorized builder           | May perform the specifically granted construction actions with eligible material | Access to private carried inventories or authority over unrelated assemblies           |
| Visitor                      | Can use ordinary reachable space and available actions                           | Reclaiming the host's installed cloak or changing their shelter                        |
| Person who treats it as home | Has an attributed personal association grounded in their choices/use             | Legal title, construction authority, household-wide storage access or a guaranteed bed |
| Recipient of shared supplies | Has the access or accepted transfer actually granted for those supplies          | Authority to read the owner's thoughts or take other possessions                       |
| World creator                | Has the existing explicit creator controls for that world                        | A fictional statement that every resident consented                                    |

Ordinary friction should be clear and local. When the player lacks alteration permission, explain that fact without disclosing a private owner list or the contents of another character's possessions. Source games' separate visitor/editor controls and documented silent denials reinforce the need for readable outcomes, not their exact permission categories. [SH-R23](#sh-r23), [SH-R24](#sh-r24)

### 14.8 Returning and inviting someone

First return works through the actual recognizable place and ordinary movement. The camera may focus on a currently permitted known location; that does not move the character or update what they know is there. No new teleport, respawn, logout-return anchor or Recover destination is part of marking a shelter as home.

A later small home-association extension may let a person remember a visited place under their own label and choose one preferred return-place reference. It is a private navigation/meaning record until deliberately shared, not an exclusive land claim or a limit of one owned building. Its remembered location can become stale. Changing distant geometry does not secretly update a character's knowledge. Removing the label removes that association, not the actual structure, its other users or its history.

The initial shelter must remain worthwhile without that new record. Do not delay the ordinary build/use/edit loop to ship a property browser, map system or household membership manager. Familiar visible landmarks and the actual place are sufficient for its first return scene.

“Would you like to sit here?” is an ordinary social invitation. The resident hears only what the conversation permits, forms an actual response and chooses any subsequent movement/activity through their own cognition and capabilities. Accepting does not instantly move them, teach the whole construction plan or turn them into a repair worker. An acceptance followed by a blocked route is not a fulfilled visit. A resident who declines, is busy, cannot find a route or prefers another place should remain distinguishable where the player can actually learn the reason.

The player can bring supplies closer or extend cover in response to real use. The design should not repeatedly generate a resident's opinion every time a part moves. Meaningful observed changes and actual conversations can influence later choices using existing identity, memory and commitment owners; all required evidence remains intact. No home-comfort score is allowed to replace those motivations.

### 14.9 Walls and a door are a later usable-space extension

The next useful extension adds light side panels and one ordinary door only after the open canopy works. This is still one ground-level family. It does not grant stone walls, upstairs bedrooms, locks, acoustic privacy or heat retention.

A proposed first door opens from both sides without a lock. A reachable actor requests Open or Close; the action uses actual clearance and the door's supported movement. A person, reclining body or object in that movement area blocks the change rather than being displaced. A doorway must remain a valid entry and exit for the supported body and activity. If closing the only exit would make an occupied enclosure inoperable under the admitted rules, the action is refused before the enclosure becomes a trap.

The action surface remains available from an accessible part of the actual door/frame when the usual point is visually obscured. It never reaches through a solid barrier. A wall can limit movement or sight only after those consumers are supported; it does not make speech private. These are deliberate product requirements for later qualification, informed by repeated door, route and survivor corrections in Enshrouded. [SH-R11](#12-research-and-lessons), [SH-R26](#sh-r26)

A closed-looking room that nobody can enter or use is not a home milestone. Do not make furnishing count or decorative trophies compensate for broken ordinary access. Enshrouded's April 2026 comfort changes are an example of a separate reward economy, not evidence that a comfort score is required here. [SH-R26](#sh-r26)

### 14.10 Operating cost and credible scale

The design spends its simulation detail on changed parts, relevant coverage and admitted exposed material. It does not need one simulation object per fiber or raindrop, a model judgment for every shower, or a full reconstruction of every building whenever a player opens inventory.

Ordinary inspect, compare, rotate, build a known arrangement, untie, view moisture and resume valid work should use already supported game behavior with **no new model call**. Interpretation of an unusual request can use the existing funded authoring/character channels where needed. Failure does not schedule an automatic paid retry. An expensive generated picture never establishes actual support or coverage.

The first profile has explicit local part/layer/edit allowances, inventoried with its other limits. These bound the first proof while leaving the engine/world seam open. They do not claim that a village containing many profiles has been measured. The acceptance work must include nearby assemblies, a changed shared support, overlapping covers, interrupted work and return after elapsed rain. Concentrated building activity is a distinct load case; another game's reported large-base improvements cannot establish Open Legend's capacity. [SH-R17](#sh-r17)

If the system cannot safely admit another supported arrangement within real storage/spatial/work capacity, say so before taking materials. Preserve the existing place. Do not fund hosting by inventing fictional rot, delete an absent player's home, or keep every renovation as a full duplicate world. Real archival/storage limits belong to their existing product owners and must be explicit before reliance.

### 14.11 Complete acceptance stories for the expansion

These are product acceptance criteria for future implementation, not reports of executed tests. They add concrete first-release cases to SH-J01–SH-J13 above.

| Story                                                 | Required observable outcome                                                                                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A new builder has the finite kit and one clear patch  | They understand a proposed use, select a site, build without a material-production chain, and see only completed cover take effect                            |
| The chosen garment is currently worn                  | It becomes the actual installed covering once, and later returns as the same conditioned garment; the spare tarp never acquires clothing capability           |
| The first bay is too crowded for rest                 | The player sees the actual occupied footprint, moves their own bundle normally or extends the shelter; there is no hidden sleep placement or extra floor area |
| The player prefers traveling                          | They reclaim their surviving material and leave without a maintenance debt, lost identity or story penalty                                                    |
| One post is shared by both roofs                      | The plan identifies both dependencies; actual removal/failure updates both without duplicated salvage                                                         |
| A destination fills while cloth is being taken down   | Uncommitted transfer blocks, or already detached material remains at its real location; no vanished roof and vanished cloth                                   |
| A visitor asks to change a covering                   | Ordinary use remains available, while ungranted alteration fails clearly and reveals no private contents                                                      |
| The builder says a neighbor's cloth belongs to them   | The statement grants no construction input; a real transfer/grant is needed                                                                                   |
| The NPC accepts an invitation but cannot reach it     | Their visit remains incomplete, their private reasoning is not exposed, and the player can learn a permitted practical blocker                                |
| Rain ends while the player is away                    | The same applicable material reflects actual wetting/drying on return, without invented host-outage time or hundreds of repeated memory entries               |
| A player reduces rain effects and uses keyboard input | They can choose and inspect the same space, read the same exposure facts and complete the same supported work                                                 |
| Later, a person lies across a door's movement area    | Closing waits/fails before moving the door through them; the only usable exit is not removed                                                                  |

### 14.12 Recommended delivery order

1. **One usable open bay:** finite authored materials, actual part and garment continuity, direct build/reclaim, real coverage, coarse drying and one ordinary chosen use. A wetting-only demonstration remains an intermediate engineering proof.
2. **Revision and a second bay:** actual shared supports, affordable reversible bindings, swap/detach destinations, occupancy interruption and return. Include a voluntary resident-use scene; do not require cooperative editing.
3. **Only the next useful home extension:** choose walls/door, a private remembered-place association or explicitly granted cooperative editing according to observed player friction. Each has its own concrete consumer; they need not ship together.
4. **Richer material and survival choices:** qualify new spans, production, repair, climate or wet-tinder challenge only when they improve an already playable building feature.

DG12 world transfer is not required to build the first shelter; DG14 competence is not required to make tying reliable; DG15 story perspectives are not required to notice a resident using the place. A pile of dependencies must not turn a modest canopy into the last feature to become playable.

## 15. Additional research for DG13

The earlier SH-R01–SH-R16 evidence remains above. The sources below were checked on **October 5, 2026**. Release notes establish the stated product behavior or the developer's correction at that date. They are not measured evidence that every player enjoyed the feature, that an issue remains unfixed, or that Open Legend can use the same scale.

| Source                                                                                                                                                        | Finding and evidence limit                                                                                                                                                                                         | Decision for this proposal                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="sh-r17"></a>SH-R17 — [Grounded: Hot and Hazy](https://www.obsidian.net/news/grounded/time-for-the-backyard-to-get-hotter-and-hazier), October 20, 2021 | The release records building-placement/support corrections and large-base CPU/network improvements. These are specific game and release observations, not a portable capacity benchmark.                           | Test occupied edits, supports and concentrated construction; explain invalid placement and measure our actual first profile.                      |
| <a id="sh-r18"></a>SH-R18 — [Grounded: A Holiday Treat](https://grounded.obsidian.net/news/grounded/a-holiday-treat), December 8, 2022                        | The update improves building convenience, nearby storage use and recycling returns. Its access and refund rules belong to Grounded's economy.                                                                      | Make selecting/reusing materials easy, but use only authorized stock and conserve actual surviving parts.                                         |
| <a id="sh-r19"></a>SH-R19 — [Grounded 1.3: Make It and Break It](https://grounded.obsidian.net/news/grounded/update-1-3), November 13, 2023                   | The playground editor separates design and play, with undo and restoration of an unplayed design. This is an editor contract, not conservation of ordinary shared-world work.                                      | Let previews be freely reversible; distinguish them from completed construction and others' subsequent actions.                                   |
| <a id="sh-r20"></a>SH-R20 — [No Man's Sky: Frontiers](https://www.nomanssky.com/frontiers-update/), September 1, 2021                                         | Direct selection, editing and duplication accompany a more flexible placement interface. Free placement may ignore constraints Open Legend still needs.                                                            | Offer direct part editing and useful orientation aids; a duplicate preview still needs real material and valid support.                           |
| <a id="sh-r21"></a>SH-R21 — [No Man's Sky: Endurance](https://www.nomanssky.com/endurance-update/), July 20, 2022                                             | Matching parts can replace existing parts in place. The same release strengthens navigation checks on room deletion after players could fall out of freighters.                                                    | Preserve a player's intended placement while checking actual occupancy and route consequences; replacement is not automatic material restoration. |
| <a id="sh-r22"></a>SH-R22 — [Project Zomboid: A Good Day](https://projectzomboid.com/blog/news/2020/01/a-good-day/), January 2020                             | The development post reports tester discomfort with indoor precipitation visuals and discusses an off option. It does not establish a currently shipped universal setting.                                         | Offer calm, legible weather presentation with equivalent mechanical facts; avoid visually intrusive rain as the only protection cue.              |
| <a id="sh-r23"></a>SH-R23 — [Palia 0.196](https://palia.com/news/patch-196), October 7, 2025                                                                  | Barn visitor/editor/owner permissions and furniture sitting/lying actions are distinct product behaviors. Those ranching permissions do not define all housing access, and posture does not prove a rest bonus.    | Separate visiting, changing a place, accessing supplies and actual rest.                                                                          |
| <a id="sh-r24"></a>SH-R24 — [Palia 0.202](https://palia.com/news/patch-202), May 11, 2026                                                                     | Known issues include unexplained Copy Tint permission denial and building/placement obstructions. This is evidence of recorded failure cases at that release, not a claim they remain unresolved.                  | Explain the precise blocked action and validate occupied placement; do not silently accept an unusable structure.                                 |
| <a id="sh-r25"></a>SH-R25 — [Palia 0.182: Summer Serenade](https://palia.com/news/patch-182), July 30, 2024                                                   | Home Tours use submitted plots, visits, reactions and a weekly event/reward structure. The page does not establish an immutable copy guarantee.                                                                    | Keep ordinary home value independent of ratings, tour submission and a recurring calendar; social display can be a separate future choice.        |
| <a id="sh-r26"></a>SH-R26 — [Enshrouded: Forging the Path](https://enshrouded.com/en-US/news/enshrouded-forging-the-path-is-live), April 21, 2026             | The release addresses survivor/door interactions, navigation and building usability, and changes comfort accumulation while planning clearer explanation. Improvements and future intentions must remain distinct. | Qualify actual access/use before interpreting a resident's behavior. Do not introduce an opaque comfort economy to make shelters count.           |

## 16. DG13 critique and resulting choices

**The original risk was a maintenance system looking for a reason to exist.** Wetness, drying, fire failure, repair, households and buildings could become a long chain before the player got a pleasant place. The revised first release uses ordinary rest, belongings and company, with visible material continuity and no new penalty. A shelter can be useful even when a player sensibly spends the next session exploring.

**The next risk was attractive geometry that did not fit real use.** The proposal now calls its single bay snug, requires a real reclining/approach margin, distinguishes shared posts from empty floor, and supplies the second bay for a concrete space tradeoff. A visual roof or a nominal metre count cannot pass the usability gate.

**The material economy should encourage expression.** Finite starting stock makes the first choice possible. Reversible cords make revision affordable. The garment's alternative use, physical work, actual space and eventual broader material sources provide tradeoffs without destroying supplies after every experiment. No full-refund rule recreates damaged or consumed material.

**Home meaning must follow play.** A resident can visit without becoming a labor source. A name does not grant title, privacy or entry. Optional remembered-place navigation follows the ordinary return scene, and walls/doors follow the open canopy. Quiet solo use and declining to build remain legitimate play.

**The technical assignment is still necessary.** These proposals resolve product inputs for PX05; they do not supply a support algorithm, new equipment implementation, permission enforcement or measured capacity. Its technical counterpart and the existing construction/runtime tasks remain open. No prototype, provider call, UI playtest or construction benchmark has run for this documentation task.

## Maintained records

- Package and sequence: [five product specifications](five-product-feature-specs.md).
- October 5 batch and review: [DG11–DG15](product-design-groups-11-15.md).
- Initial authored materials, arrangements and tuning: [base-world light canopies](../worlds/base/editable-shelters.md).
- Design/delivery: [ND07 and ND08](../maintainers/needs-design.md#nd07--editable-buildings-that-become-usable-homes), [INV-6.4](../maintainers/inventions-and-world-evolution.md#inv-6--composable-materials-assemblies-and-passive-world-processes), with [spatial](../maintainers/spatial-world.md), [persistent objects](../maintainers/persistent-objects.md) and [state contributions](../maintainers/state-contributions.md) retaining their consumers.
- Proposed scope and tuning: [editable-shelter limits](../limits/editable-shelters.md). Existing [object](../limits/objects.md), [spatial](../limits/spatial.md), [state-effect](../limits/state-effects.md) and [invention](../limits/inventions.md) inventories retain shared limits.
- Current campfire behavior: [bundled survival](../worlds/base/survival.md#tending-the-campfire); the proposed dry-tinder consumer must explicitly revise and qualify that family before changing its behavior.
- Related contracts: [construction direction](../../archive/03-design-proposals/evolving-materials-and-construction.md), [hearing](../hearing-and-speech.md), [lifecycle/property](../worlds/base/lifecycle-and-protection.md), [continuing lives](continuing-lives-feature-spec.md) and [attention/scenes](attention-and-scenes-feature-spec.md).
- Technical design, implementation and measured capacity remain open. Product documentation does not close INV-6.4, implement arbitrary weather or authorize new property damage rules.
