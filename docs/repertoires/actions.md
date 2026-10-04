# Action and interaction repertoire

**Status: expandable design catalogue, not an implemented feature list or a promise to ship every example.** This document owns example intents and their cross-domain relationships. The [action capability design](../action-capabilities.md) owns translation and execution contracts. Implementation and acceptance belong to [the focused tracker](../maintainers/action-capabilities.md) and its existing AG/INV/SW/EPR/NC owners. Current runtime facts and evidence remain in [Architecture](../architecture.md) and [Verification](../verification.md).

The goal is not a menu containing every verb. It is a world in which an actor can express a precise attempt, choose a method, maintain an activity, coordinate with others, and adapt to real consequences. Ordinary use of an installed magical ability can need no invention; an apparently mundane request can require an entirely missing physical subsystem.

**Scope:** Rows here are concrete attempts. [Objects](objects.md) owns the hunting bow or firearm; [Combat](combat-rescue.md) owns the rules for aiming, firing, reloading and resolving a hit; [Abilities](abilities-progression.md) owns a learned technique that changes what the actor can do. The same distinction applies to other domains under [category ownership](README.md#category-ownership-and-cross-references). A mechanics reference can point to its domain catalogue; it need not have a duplicate entry in `mechanics.md`.

## Reading and extending the catalogue

There are **385 seed examples in 32 domains**. Rows are original OpenLegend design examples, not claims that the inspiration games implement those exact interactions. Most are not currently supported. Similar verbs sometimes have separate rows because their authority, participants, knowledge, persistence, or consequences differ.

The shared library defines [seed worlds](README.md#four-possible-world-families), [Priority](README.md#priority) and [Level](README.md#level). Each domain is sorted by **Priority, then stable ID**. These are proposed roadmap priorities, not delivery commitments. The IDs and existing F/U/C/D classifications are preserved; their numerical order no longer determines display order.

For an action, **Level classifies how the stated intent resolves once its prerequisites exist**. F/U/C generally use G0 action/plan semantics. D is classified by INV into its actual generation level. A reusable personal plan does not automatically become a world-definition change. Likewise, storing an accepted activity across saves is not invention. Foundational does not mean already implemented or cheap; an ordinary U action can depend on an ambitious subsystem.

In **Related mechanics and entities**, concept keys before a semicolon name mechanics; nouns after it name objects or participants. A cell without a semicolon lists mechanics only. These are cross-reference vocabulary, not registered runtime family IDs, schemas, or existing files. The [companion catalogues](README.md#catalogue-map) group useful design ideas without registering runtime families.

**Entry defaults:** maturity = idea; implementation evidence = none asserted here. Seed worlds recommend natural fits; Priority follows the whole current game rather than importance inside a single domain, not a requirement to include every variant in all four worlds. The F rows are the selected reusable foundation; U/C rows are ordinary-use candidates, not a mandate to hard-code them all into the kernel. Refine selected scope and delivery in the owning tracker, not with hundreds of competing checkboxes here.

When adding or promoting an example, retain its ID and capture: aliases; initiator and participant roles; typed targets/parts/regions; quantities and units; preconditions; method restrictions; expected observations versus guaranteed effects; duration and interruption; failure/unknown cases; relevant mechanics, objects, needs and traits; world applicability; implementation owner; evidence/test links. Use the full entry template at the end for cases that outgrow one row. Never recycle an ID or quietly change its meaning. IDs are plain text: cite an ID and link to its native domain heading, as in [NAV-01](#nav-destinations-and-traversal), rather than adding HTML row anchors.

## Domain index

| Domains                                                            | Domains                                                                 | Domains                                                             | Domains                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [NAV — Destinations](#nav-destinations-and-traversal)              | [REL — Relational movement](#rel-relational-and-persistent-movement)    | [OBS — Observation](#obs-perception-and-investigation)              | [BOD — Embodiment](#bod-posture-and-embodied-expression)         |
| [COM — Communication](#com-communication-and-signals)              | [MND — Private agency](#mnd-private-cognition-and-intentions)           | [INV — Possessions](#inv-possession-transfer-and-containment)       | [OBJ — Object operation](#obj-object-operation-and-manipulation) |
| [RES — Resources](#res-gathering-and-material-acquisition)         | [MAK — Making](#mak-making-repair-and-disassembly)                      | [BLD — Construction](#bld-construction-terrain-and-placement)       | [FIR — Fire and energy](#fir-fire-heat-and-energy)               |
| [FLU — Fluids](#flu-fluids-mixtures-and-environment)               | [FOD — Food and domestic care](#fod-food-consumption-and-domestic-care) | [AGR — Cultivation](#agr-plants-cultivation-and-ecology)            | [ANI — Animals](#ani-animals-and-organism-behavior)              |
| [CARE — Bodily care](#care-bodily-care-and-rescue)                 | [SOC — Relationships](#soc-relationships-and-social-attempts)           | [COOP — Joint work](#coop-cooperation-and-shared-activities)        | [ECO — Exchange](#eco-exchange-services-and-logistics)           |
| [LAW — Institutions](#law-fictional-institutions-and-obligations)  | [SEC — Security](#sec-property-secrecy-and-infiltration)                | [CBT — Conflict](#cbt-conflict-defense-and-tactical-action)         | [VEH — Transport](#veh-vehicles-mounts-and-transport)            |
| [ART — Art and play](#art-art-performance-and-play)                | [KNO — Knowledge](#kno-records-teaching-and-discovery)                  | [AUT — Routines](#aut-routines-monitoring-and-automation)           | [MAG — Magic](#mag-actions-under-magical-constitutions)          |
| [SYN — Machines and space](#syn-machines-space-and-synthetic-life) | [COL — Unusual bodies](#col-collectives-and-unusual-bodies)             | [TMP — Unusual realities](#tmp-time-identity-and-unusual-realities) | [DEF — Authoring](#def-deliberate-invention-and-owner-authoring) |

## NAV: Destinations and traversal

| ID     | Example intent                                    | Seed worlds | Priority     | Level | Related mechanics and entities        | Distinction to preserve                                                 |
| ------ | ------------------------------------------------- | ----------- | ------------ | ----- | ------------------------------------- | ----------------------------------------------------------------------- |
| NAV-01 | Go to the specified coordinates.                  | ALL         | 1 Core       | F     | topology, locomotion; point, support  | Bind coordinate frame and intended floor; do not teleport.              |
| NAV-02 | Walk two world units to my left.                  | ALL         | 1 Core       | F     | orientation, locomotion; actor        | Actor-relative is not camera-relative; units are explicit.              |
| NAV-04 | Go onto the platform, not underneath it.          | ALL         | 1 Core       | F     | support, routes; ramp, deck           | Vertical destination identity matters.                                  |
| NAV-03 | Return to the place where I saw Ada.              | ALL         | 2 Complete   | F     | spatial-memory; observation, place    | Use the recorded place, not Ada's hidden current location.              |
| NAV-06 | Take the long route and avoid the bridge.         | ALL         | 2 Complete   | F     | route-constraints; known region       | Preserve the exclusion; no hidden shortcuts.                            |
| NAV-08 | Find a path to the nearest exit I know.           | ALL         | 2 Complete   | F     | spatial-knowledge, selection; exits   | Nearest among scoped candidates, not all exits in the database.         |
| NAV-09 | Climb this ladder to the roof.                    | ALL         | 2 Complete   | U     | climbing, grip, support; ladder       | A graph edge alone does not implement climbing.                         |
| NAV-10 | Swim to the opposite bank.                        | ALL         | 2 Complete   | U     | swimming, buoyancy, breathing; river  | Swimming is not walking with a different animation.                     |
| NAV-11 | Jump across this gap.                             | ALL         | 2 Complete   | U     | jumping, landing; ledge               | Arc, clearance and landing failure belong to the mechanic.              |
| NAV-05 | Approach the campfire, but stop outside its heat. | MD FA       | 3 Depth      | C     | approach, thermal-exposure; fire      | A safe distance needs supported heat evidence or a conservative policy. |
| NAV-07 | Retrace my last route.                            | ALL         | 3 Depth      | F     | route-memory; waypoints               | Retrace recorded travel; recheck changed physical conditions.           |
| NAV-12 | Enter the known portal to the library.            | SC FA       | 5 Specialist | U     | portal-traversal; portal, destination | Use an admitted connector; do not infer unknown endpoints.              |

## REL: Relational and persistent movement

| ID     | Example intent                                    | Seed worlds | Priority   | Level | Related mechanics and entities       | Distinction to preserve                                          |
| ------ | ------------------------------------------------- | ----------- | ---------- | ----- | ------------------------------------ | ---------------------------------------------------------------- |
| REL-05 | Move away from the wolf until it is out of reach. | MD FA       | 1 Core     | F     | retreat, reach; threat               | No claim that the wolf cannot pursue.                            |
| REL-01 | Follow the visible deer until I stop.             | MD MO FA    | 2 Complete | F     | tracking-observation, locomotion     | Maintain an activity; no hidden-position tracking.               |
| REL-09 | Escort Ada, stopping when she falls behind.       | ALL         | 2 Complete | C     | cooperation, monitoring, movement    | Ada retains independent movement and participation.              |
| REL-03 | Keep the cart within five world units.            | MD MO FA    | 3 Depth    | F     | proximity, locomotion; moving target | Separate desired relation from actual success.                   |
| REL-04 | Stay behind the guard without getting closer.     | ALL         | 3 Depth    | F     | relative-pose, observation           | Behind needs observed heading; it does not guarantee stealth.    |
| REL-07 | Patrol the three marked lookout points.           | ALL         | 3 Depth    | F     | waypoints, repeat                    | Persist cursor and stop policy; no model call per lap.           |
| REL-10 | Intercept the runner at the gate.                 | ALL         | 3 Depth    | C     | motion-estimation, routes            | Predicted interception is a hypothesis, not future-state access. |
| REL-11 | Follow the animal's scent after it vanishes.      | MD SC FA    | 3 Depth    | U     | scent-traces, sensing, tracking      | Needs an evidence-producing tracking mechanic.                   |
| REL-12 | Hide my approach using cover and the wind.        | MD SC FA    | 3 Depth    | C     | occlusion, noise, scent, stealth     | Unsupported concealment clauses cannot be discarded.             |
| REL-02 | Walk beside Ada rather than behind her.           | ALL         | 4 Detail   | F     | relative-pose, locomotion            | Side/heading relation is distinct from scalar distance.          |
| REL-06 | Circle this tree once.                            | ALL         | 4 Detail   | F     | route-pattern; landmark              | Bounded route pattern, not teleportation around a target.        |
| REL-08 | Follow the exact path Ada walked.                 | ALL         | 4 Detail   | C     | observed-trajectories, route-memory  | Requires remembered trajectory, not just her present position.   |

## OBS: Perception and investigation

| ID     | Example intent                                    | Seed worlds | Priority   | Level | Related mechanics and entities           | Distinction to preserve                                                |
| ------ | ------------------------------------------------- | ----------- | ---------- | ----- | ---------------------------------------- | ---------------------------------------------------------------------- |
| OBS-01 | Look more closely at this object.                 | ALL         | 1 Core     | F     | inspection, sense-detail                 | Inspection returns permitted evidence, not every component.            |
| OBS-02 | Listen for movement beyond the door.              | ALL         | 2 Complete | F     | hearing, occlusion; door                 | A sound may lack identity, exact position, or intelligible words.      |
| OBS-04 | Scan this visible region for a red object.        | ALL         | 2 Complete | F     | scoped-selection, recognition            | Color must be available to this sense/observer.                        |
| OBS-06 | Search the room for my missing ring.              | ALL         | 2 Complete | C     | search-coverage, containment, inspection | Search only accessible places; record negative coverage.               |
| OBS-08 | Read the marks on this tablet.                    | ALL         | 2 Complete | U     | writing, language, sense-detail          | Seeing marks does not confer literacy or translation.                  |
| OBS-12 | Investigate the last place I heard the bell.      | ALL         | 2 Complete | C     | auditory-memory, uncertainty, search     | A remembered sound region is not an exact hidden source.               |
| OBS-03 | Feel along the wall for an opening.               | ALL         | 3 Depth    | C     | touch, locomotion; surface               | Physical probing changes evidence; no visual substitution.             |
| OBS-05 | Watch the entrance and tell me who arrives.       | ALL         | 3 Depth    | C     | monitoring, recognition, communication   | Watching occupies declared resources; unknown visitors stay unknown.   |
| OBS-09 | Check whether this bridge is sound.               | ALL         | 3 Depth    | C     | inspection, structures, inference        | Inspection can be inconclusive; no universal safety oracle.            |
| OBS-10 | Examine the tracks without disturbing them.       | ALL         | 3 Depth    | C     | trace-evidence, contact-effects          | Preserve the non-disturbance constraint or explain uncertainty.        |
| OBS-07 | Compare these two stones by weight.               | ALL         | 4 Detail   | U     | measurement, manipulation; samples       | Needs a supported measurement or explicitly rough estimate.            |
| OBS-11 | Test whether the object responds to a gentle tap. | ALL         | 4 Detail   | C     | impact, acoustics, observation           | A hypothesis test produces actual evidence, not a narrated experiment. |

## BOD: Posture and embodied expression

| ID     | Example intent                                     | Seed worlds | Priority   | Level | Related mechanics and entities   | Distinction to preserve                                        |
| ------ | -------------------------------------------------- | ----------- | ---------- | ----- | -------------------------------- | -------------------------------------------------------------- |
| BOD-01 | Face Ada.                                          | ALL         | 1 Core     | F     | orientation, observation         | Turning is not moving or guaranteed eye contact.               |
| BOD-04 | Crouch while crossing the low passage.             | ALL         | 2 Complete | C     | posture, clearance               | Reduced collision height must be real and admitted.            |
| BOD-05 | Crawl beneath the table.                           | ALL         | 3 Depth    | U     | locomotion-modes, clearance      | A new animation does not grant a new body profile.             |
| BOD-06 | Point toward the smoke.                            | ALL         | 3 Depth    | U     | gesture, reference, perception   | Observers may perceive direction without knowing the referent. |
| BOD-07 | Wave to the person across the river.               | ALL         | 3 Depth    | U     | gesture, visibility              | Signaling does not guarantee recognition or response.          |
| BOD-08 | Brace myself against the railing.                  | ALL         | 3 Depth    | U     | contact, force, balance          | Bracing needs physical effects; not an effect-free emote.      |
| BOD-09 | Hold my breath while passing through smoke.        | ALL         | 3 Depth    | U     | breathing, exposure, duration    | Bounded capacity and involuntary consequences still apply.     |
| BOD-11 | Lean out just far enough to see around the corner. | ALL         | 3 Depth    | C     | pose, occlusion, exposure        | New viewpoint requires supported bodily motion.                |
| BOD-02 | Sit on this bench.                                 | ALL         | 4 Detail   | U     | posture, support, occupancy      | Requires suitable body and an available stance.                |
| BOD-03 | Lie down under the awning.                         | ALL         | 4 Detail   | C     | posture, shelter, movement       | Lying down is distinct from falling asleep.                    |
| BOD-10 | Close my eyes and listen.                          | ALL         | 4 Detail   | C     | sense-control, hearing           | Suppressing sight does not increase hearing automatically.     |
| BOD-12 | Keep holding the door while speaking.              | ALL         | 4 Detail   | C     | force, resource-channels, speech | Concurrency is capability-declared, not implied by prose.      |

## COM: Communication and signals

| ID     | Example intent                                  | Seed worlds | Priority   | Level | Related mechanics and entities       | Distinction to preserve                                        |
| ------ | ----------------------------------------------- | ----------- | ---------- | ----- | ------------------------------------ | -------------------------------------------------------------- |
| COM-07 | Leave the conversation but stay nearby.         | ALL         | 1 Core     | U     | conversation-membership, proximity   | Leaving membership need not suppress overhearing.              |
| COM-01 | Tell Ada what I actually saw.                   | ALL         | 2 Complete | U     | speech, memory-provenance            | Report preserves observation versus inference.                 |
| COM-02 | Ask the stranger their name.                    | ALL         | 2 Complete | U     | conversation, identity               | The reply may be absent, false, or misunderstood.              |
| COM-04 | Shout for help.                                 | ALL         | 2 Complete | U     | vocalization, hearing                | Audible range and actual listeners belong to perception.       |
| COM-05 | Ask Ada to follow me.                           | ALL         | 2 Complete | U     | request, conversation, agency        | A request cannot directly start Ada's movement.                |
| COM-12 | Warn everyone I can currently reach.            | ALL         | 2 Complete | C     | audience-selection, communication    | Scoped finite audience, not a global broadcast by wish.        |
| COM-03 | Whisper this warning only to Ada.               | ALL         | 3 Depth    | U     | acoustic-channel, privacy            | Do not downgrade to audible public speech.                     |
| COM-06 | Join their conversation without interrupting.   | ALL         | 3 Depth    | C     | conversation-membership, turn-taking | Joining grants no earlier private transcript.                  |
| COM-09 | Flash the lantern to signal the boat.           | MD MO FA    | 3 Depth    | C     | light, device-control, visibility    | No radio-like delivery guarantee.                              |
| COM-10 | Write a note and leave it where Ada will look.  | ALL         | 3 Depth    | C     | writing, placement, beliefs          | Her future attention is not known or controllable.             |
| COM-08 | Knock three times as our agreed signal.         | ALL         | 4 Detail   | C     | impact, acoustics, shared-convention | Sound production and interpreting the convention are separate. |
| COM-11 | Relay the message without revealing its source. | ALL         | 4 Detail   | C     | communication, disclosure            | Omit source intentionally; retain private provenance.          |

## MND: Private cognition and intentions

| ID     | Example intent                                    | Seed worlds | Priority   | Level | Related mechanics and entities | Distinction to preserve                                            |
| ------ | ------------------------------------------------- | ----------- | ---------- | ----- | ------------------------------ | ------------------------------------------------------------------ |
| MND-04 | Abandon this plan but keep the larger goal.       | ALL         | 1 Core     | F     | plan-lifecycle                 | Do not erase consumed resources or prior commitments.              |
| MND-11 | Withdraw the unresolved attempt I no longer want. | ALL         | 1 Core     | F     | attempt-lifecycle              | Release pending intent without stopping unrelated actions.         |
| MND-01 | Do nothing new; continue my work.                 | ALL         | 2 Complete | F     | agency-continuation            | Empty output is not cancellation or a failed decision.             |
| MND-02 | Make finding shelter my current goal.             | ALL         | 2 Complete | F     | operational-goals              | A goal is not a built shelter or mandatory plan.                   |
| MND-03 | Pause my expedition and find food first.          | ALL         | 2 Complete | F     | goals, plans, interruption     | Suspend intent separately from cancelling physical work.           |
| MND-06 | Remember where I left the basket.                 | ALL         | 2 Complete | F     | memory, spatial-evidence       | Record permitted evidence; no guaranteed perfect memory.           |
| MND-09 | Resume my interrupted work when it is safe.       | ALL         | 2 Complete | F     | resumption, guard              | Safety must bind a supported condition; revalidate resources.      |
| MND-10 | Mark my personal goal satisfied.                  | ALL         | 2 Complete | F     | goal-assessment                | Subjective completion is not engine-evidenced success.             |
| MND-05 | Reconsider whether I still trust that account.    | ALL         | 3 Depth    | F     | reflection, belief-provenance  | Revising belief does not rewrite historical events.                |
| MND-07 | Imagine a safer way across the stream.            | ALL         | 3 Depth    | F     | hypothesis, planning           | Imagining creates no bridge or successful test.                    |
| MND-08 | Keep this suspicion private.                      | ALL         | 4 Detail   | F     | private-thought, disclosure    | Private storage is distinct from deception of a listener.          |
| MND-12 | Review this decision after sunrise.               | ALL         | 4 Detail   | F     | review-cues, simulation-clock  | A review cue permits reconsideration; it need not force inference. |

## INV: Possession, transfer and containment

| ID     | Example intent                             | Seed worlds | Priority   | Level | Related mechanics and entities       | Distinction to preserve                                          |
| ------ | ------------------------------------------ | ----------- | ---------- | ----- | ------------------------------------ | ---------------------------------------------------------------- |
| INV-01 | Pick up this loose stone.                  | ALL         | 1 Core     | U     | grasp, inventory, mass               | Loose-item pickup is not gathering new material from a source.   |
| INV-02 | Put the stone exactly here.                | ALL         | 1 Core     | U     | placement, release, support          | Placement needs a real location and collision semantics.         |
| INV-06 | Take three logs from the open basket.      | ALL         | 1 Core     | U     | containment, transfer, quantity      | Accessibility, custody and in-world theft rules are distinct.    |
| INV-12 | Equip the launcher I just crafted.         | ALL         | 1 Core     | U     | equipment, typed-results             | Bind the actual produced item, not a guessed future ID.          |
| INV-03 | Give Ada two berries.                      | ALL         | 2 Complete | U     | transfer, quantity, participation    | Transfer is not eating, gifting sentiment, or forced possession. |
| INV-08 | Split this stack evenly between our packs. | ALL         | 2 Complete | C     | stacking, integer-quantity, capacity | Handle indivisible remainder explicitly.                         |
| INV-10 | Carry the chest without opening it.        | ALL         | 2 Complete | U     | load, containment, locomotion        | Moving a container need not reveal its contents.                 |
| INV-04 | Offer Ada a berry and wait for her answer. | ALL         | 3 Depth    | C     | offer, consent, wait                 | An offer does not transfer ownership or consume food.            |
| INV-07 | Put dry tinder in the waterproof pouch.    | MD FA       | 3 Depth    | U     | containment, moisture, capacity      | A descriptive pouch name does not guarantee waterproofing.       |
| INV-05 | Leave food beside Ada without waking her.  | ALL         | 4 Detail   | C     | placement, noise, sleep              | Ground placement is not a forced handover or feeding.            |
| INV-09 | Keep one meal and donate the rest.         | ALL         | 4 Detail   | C     | selection, reservation, transfer     | Recheck the retained amount at each transfer.                    |
| INV-11 | Sort these known items by material.        | ALL         | 4 Detail   | C     | classification, placement            | Unknown material remains unknown; no hidden-property sort.       |

## OBJ: Object operation and manipulation

| ID     | Example intent                               | Seed worlds | Priority   | Level | Related mechanics and entities   | Distinction to preserve                                                   |
| ------ | -------------------------------------------- | ----------- | ---------- | ----- | -------------------------------- | ------------------------------------------------------------------------- |
| OBJ-02 | Close the gate behind me.                    | ALL         | 1 Core     | C     | traversal, device-control        | Close after actual crossing, not after command admission.                 |
| OBJ-03 | Unlock the box with this key.                | ALL         | 2 Complete | U     | locks, key-compatibility         | Exact instrument and lock must match.                                     |
| OBJ-05 | Pull this lever once.                        | ALL         | 2 Complete | U     | mechanisms, actuation            | Actuation and downstream effects have separate receipts.                  |
| OBJ-06 | Push the crate away from the entrance.       | ALL         | 2 Complete | U     | force, friction, collision       | Not an unrestricted position setter.                                      |
| OBJ-08 | Tie this rope to the post.                   | ALL         | 2 Complete | U     | attachment, tension, knots       | Binding creates a typed relationship, not arbitrary parentage.            |
| OBJ-04 | Turn the valve until the flow slows.         | ALL         | 3 Depth    | C     | valves, fluid-flow, feedback     | Observe a supported quantity; do not assign the outcome.                  |
| OBJ-07 | Wedge the door open with a stone.            | ALL         | 3 Depth    | C     | contact, geometry, placement     | A working wedge requires physical or admitted coarse support.             |
| OBJ-09 | Untie the boat without cutting the rope.     | MD MO FA    | 3 Depth    | U     | attachment, tool-use             | Preserve reusable rope and exact release method.                          |
| OBJ-12 | Balance the stick across these two supports. | ALL         | 3 Depth    | U     | support, balance, placement      | A novel arrangement can use existing physics without a recipe invention.  |
| OBJ-01 | Open the door halfway.                       | ALL         | 4 Detail   | U     | hinges, state-control, collision | Continuous opening needs support; binary doors cannot fake halfway.       |
| OBJ-10 | Cover the mirror with cloth.                 | ALL         | 4 Detail   | U     | covering, optics, attachment     | Covering may alter visibility without changing mirror identity.           |
| OBJ-11 | Ring the cooking pot like a bell.            | MD FA       | 4 Detail   | C     | impact, acoustics; pot, striker  | Cross-use is allowed only through supported acoustic/material interfaces. |

## RES: Gathering and material acquisition

| ID     | Example intent                                        | Seed worlds | Priority     | Level | Related mechanics and entities  | Distinction to preserve                                      |
| ------ | ----------------------------------------------------- | ----------- | ------------ | ----- | ------------------------------- | ------------------------------------------------------------ |
| RES-01 | Gather berries from this bush.                        | MD MO FA    | 1 Core       | U     | gathering, finite-supply        | Native batch size and actual yield govern quantity.          |
| RES-05 | Cut a branch from this tree.                          | MD MO FA    | 1 Core       | U     | cutting, plant-body, tools      | A branch removal may affect the living tree.                 |
| RES-09 | Harvest the animal's remains.                         | MD SC FA    | 1 Core       | U     | remains, tools, finite-yields   | Remains are not an inexhaustible inventory source.           |
| RES-03 | Gather enough reeds for this known recipe.            | MD FA       | 2 Complete   | C     | recipe-knowledge, quantities    | Known recipe prerequisites, not a hidden invention solution. |
| RES-06 | Dig clay from the bank.                               | MD MO FA    | 2 Complete   | U     | excavation, terrain-material    | Resource debit and terrain change must be coherent.          |
| RES-07 | Mine this exposed vein.                               | MD SC FA    | 2 Complete   | U     | mining, hardness, tools         | No extraction from an unseen vein chosen by global search.   |
| RES-08 | Gather rainwater in this bowl.                        | ALL         | 2 Complete   | U     | weather, collection, capacity   | Requires actual rain and an admitted collection surface.     |
| RES-02 | Pick only the ripe berries.                           | MD MO FA    | 3 Depth      | U     | ripeness, selection, gathering  | Requires represented, observable ripeness.                   |
| RES-04 | Collect fallen branches without cutting living trees. | MD MO FA    | 4 Detail     | C     | resource-provenance, selection  | Preserve the source restriction.                             |
| RES-11 | Collect shells until the basket is full.              | MD MO FA    | 4 Detail     | C     | capacity, repeat, selection     | Container fullness is a supported stop condition.            |
| RES-12 | Leave enough seeds for the patch to recover.          | MD MO FA    | 4 Detail     | C     | ecology, forecast, harvesting   | Conservation intent may exceed known ecological prediction.  |
| RES-10 | Salvage usable parts from this wreck.                 | MO SC       | 5 Specialist | C     | disassembly, damage, inspection | Usable parts depend on actual surviving structure.           |

## MAK: Making, repair and disassembly

| ID     | Example intent                                  | Seed worlds | Priority   | Level | Related mechanics and entities     | Distinction to preserve                                           |
| ------ | ----------------------------------------------- | ----------- | ---------- | ----- | ---------------------------------- | ----------------------------------------------------------------- |
| MAK-02 | Craft the sling using the technique I know.     | MD FA       | 1 Core     | U     | recipe, knowledge, crafting        | Knowing a recipe is not owning its output.                        |
| MAK-01 | Twist these prepared fibers into cord.          | MD FA       | 2 Complete | U     | known-preparation, work            | Preserve input stage, amounts and real work.                      |
| MAK-03 | Make three copies of the same tool.             | ALL         | 2 Complete | C     | repeat, crafting, resources        | Each copy consumes inputs and has distinct instance identity.     |
| MAK-08 | Use the admitted larger version of this basket. | MD MO FA    | 2 Complete | U     | definition-versions, capacity      | Choose a known version; do not edit dimensions during invocation. |
| MAK-12 | Finish the accepted construction after I rest.  | ALL         | 2 Complete | C     | work-resumption, rest, plans       | Resume only supported retained progress; no refunds by narration. |
| MAK-07 | Dismantle the trap and preserve its spring.     | ALL         | 3 Depth    | U     | assembly, disassembly, parts       | Recovered yields need not equal original construction inputs.     |
| MAK-09 | Substitute this known compatible binding.       | ALL         | 3 Depth    | U     | typed-compatibility, recipe-ports  | Only substitutions permitted by the recipe's contract.            |
| MAK-10 | Test the prototype with one small load first.   | ALL         | 3 Depth    | C     | experimentation, load, measurement | A test is real activity and can fail or damage the object.        |
| MAK-04 | Repair only the broken handle.                  | ALL         | 4 Detail   | U     | parts, repair, damage              | Part repair must not restore the entire object for free.          |
| MAK-05 | Sharpen this blade without changing its shape.  | MD MO FA    | 4 Detail   | U     | wear, abrasion, tool-state         | Supported maintenance effects, not arbitrary damage bonuses.      |
| MAK-06 | Patch the leaking seam with the known method.   | ALL         | 4 Detail   | U     | repair, sealing, materials         | Effect depends on actual compatibility and work.                  |
| MAK-11 | Copy the visible pattern onto another pot.      | MD MO FA    | 4 Detail   | C     | mark-making, observation, media    | Observed pattern does not reveal hidden manufacturing knowledge.  |

## BLD: Construction, terrain and placement

| ID     | Example intent                                          | Seed worlds | Priority     | Level | Related mechanics and entities      | Distinction to preserve                                                 |
| ------ | ------------------------------------------------------- | ----------- | ------------ | ----- | ----------------------------------- | ----------------------------------------------------------------------- |
| BLD-03 | Build this shelter from the known plan.                 | MD SC FA    | 1 Core       | C     | construction, recipe, work          | Long work is staged; admission does not spawn a finished shelter.       |
| BLD-01 | Place a plank across this narrow ditch.                 | MD MO FA    | 2 Complete   | U     | placement, support, traversal       | Existing support rules may make a bridge without a named bridge recipe. |
| BLD-02 | Stack stones into a low wall.                           | MD MO FA    | 2 Complete   | C     | placement, stability, collision     | Accumulated geometry must actually obstruct or support.                 |
| BLD-06 | Barricade the entrance using spare furniture.           | ALL         | 2 Complete   | C     | placement, collision, access        | Requires actual obstruction, not a lock-state shortcut.                 |
| BLD-04 | Dig a drainage channel away from the house.             | MD MO FA    | 3 Depth      | C     | excavation, fluid-topology          | Drainage needs fluid consequences, not only trench visuals.             |
| BLD-05 | Brace the roof before removing that beam.               | ALL         | 3 Depth      | C     | load-bearing, sequencing, support   | Enforce causal order and preserve collapse risk.                        |
| BLD-11 | Mark out a garden before committing materials.          | MD MO FA    | 3 Depth      | U     | designation, marking, planning      | A proposal or marker does not alter terrain or reserve all resources.   |
| BLD-12 | Build around the tree rather than removing it.          | MD MO FA    | 3 Depth      | C     | geometry-constraints, ecology       | Preserve the protected object during all steps.                         |
| BLD-07 | Make a dry sleeping spot under this overhang.           | MD SC FA    | 4 Detail     | C     | shelter, bedding, moisture          | Dryness depends on exposure and materials.                              |
| BLD-08 | Hang a curtain for privacy.                             | ALL         | 4 Detail     | C     | attachment, occlusion, acoustics    | Visual privacy is not automatically soundproofing.                      |
| BLD-10 | Move the hearth without destroying its keepsake stones. | MD FA       | 4 Detail     | C     | disassembly, identity, construction | Preserve specified instances, not merely equivalent material.           |
| BLD-09 | Build steps accessible to the small construct.          | SC FA       | 5 Specialist | C     | body-profiles, routes, construction | Accessibility is relative to an actual locomotion profile.              |

## FIR: Fire, heat and energy

| ID     | Example intent                                     | Seed worlds | Priority     | Level | Related mechanics and entities        | Distinction to preserve                                                  |
| ------ | -------------------------------------------------- | ----------- | ------------ | ----- | ------------------------------------- | ------------------------------------------------------------------------ |
| FIR-01 | Light this tinder from the existing flame.         | MD FA       | 1 Core       | U     | ignition, combustion, heat-transfer   | Requires source, contact/exposure and eligible fuel.                     |
| FIR-02 | Add one dry log to the fire.                       | MD FA       | 1 Core       | U     | finite-fuel, placement, moisture      | Adding fuel is not an arbitrary extension of fire lifetime.              |
| FIR-05 | Pour water on the burning branches.                | MD MO FA    | 2 Complete   | U     | fluid-transfer, thermal-effects       | Water amount and fire response are world-specific.                       |
| FIR-04 | Smother the small flame with this damp cloth.      | MD MO FA    | 3 Depth      | C     | covering, oxygen, heat, materials     | No guaranteed extinguishing without an applicable mechanic.              |
| FIR-06 | Carry an ember to the other camp.                  | MD FA       | 3 Depth      | C     | containment, combustion, movement     | Ember cooling and exposure continue during travel.                       |
| FIR-09 | Remove nearby fuel to make a firebreak.            | MD MO FA    | 3 Depth      | C     | combustion-spread, terrain, gathering | A firebreak need not guarantee containment.                              |
| FIR-03 | Keep the fire burning until dawn.                  | MD FA       | 4 Detail     | C     | monitoring, refueling, time           | Sustained work and fuel consumption remain real.                         |
| FIR-07 | Warm my hands without touching the flame.          | MD FA       | 4 Detail     | U     | thermal-exposure, body                | Temperature benefit and injury risk come from the body/world model.      |
| FIR-08 | Dry my clothes near the fire.                      | MD FA       | 4 Detail     | C     | evaporation, heat, placement          | Drying is not instant state assignment.                                  |
| FIR-10 | Shade the ice so it melts more slowly.             | MD FA       | 4 Detail     | C     | radiation, phase-change, occlusion    | Shade has thermal effect only if the world models it.                    |
| FIR-11 | Recharge from this compatible capacitor.           | SC          | 5 Specialist | U     | reservoir-transfer, compatibility     | Finite source and compatible units; not necessarily electricity physics. |
| FIR-12 | Redirect available power to the greenhouse heater. | MO SC       | 5 Specialist | U     | energy-network, device-control        | Conservation/source policy and network capacity are explicit.            |

## FLU: Fluids, mixtures and environment

| ID     | Example intent                                      | Seed worlds | Priority     | Level | Related mechanics and entities   | Distinction to preserve                                                |
| ------ | --------------------------------------------------- | ----------- | ------------ | ----- | -------------------------------- | ---------------------------------------------------------------------- |
| FLU-02 | Pour the remaining water into the shared tank.      | ALL         | 2 Complete   | U     | transfer, containment            | Track actual transferred quantity and overflow.                        |
| FLU-03 | Mix these known ingredients in the bowl.            | ALL         | 2 Complete   | U     | mixtures, compatibility          | Mixing does not imply a useful or safe product.                        |
| FLU-04 | Filter muddy water with this admitted filter.       | MD SC FA    | 2 Complete   | U     | filtration, material-selectivity | Clarifying appearance does not prove potability.                       |
| FLU-08 | Divert the stream into this irrigation channel.     | MD MO FA    | 3 Depth      | C     | flow, terrain, gate-control      | Downstream effects persist independently of actor attention.           |
| FLU-12 | Melt the frozen latch using existing heat.          | ALL         | 3 Depth      | C     | phase-change, heat, device-state | Thawing can damage the object; no unconditional unlock.                |
| FLU-01 | Fill the cup halfway from the jug.                  | ALL         | 4 Detail     | U     | fluid-transfer, capacity, units  | Preserve source amount, mixture identity and requested fill.           |
| FLU-05 | Use cloth as a coarse sieve.                        | MD MO FA    | 4 Detail     | U     | permeability, particle-size      | Cross-use works through supported interfaces, not a new noun shortcut. |
| FLU-06 | Stop the leak with the known plug.                  | ALL         | 4 Detail     | U     | sealing, pressure, contact       | A plug must match the opening and load conditions.                     |
| FLU-09 | Skim the floating debris without emptying the pond. | MD MO FA    | 4 Detail     | U     | buoyancy, selection, tools       | Preserve water volume and the selective-removal method.                |
| FLU-10 | Wait for the sediment to settle, then decant.       | ALL         | 4 Detail     | C     | settling, observation, transfer  | Observation/deadline, not fictitious guaranteed completion time.       |
| FLU-11 | Collect a sample without contaminating the source.  | MO SC FA    | 4 Detail     | U     | sampling, contamination          | Contamination constraint needs mechanic support.                       |
| FLU-07 | Open the vents to clear the smoke.                  | MO SC       | 5 Specialist | C     | ventilation, gas-flow, devices   | Opening is direct; smoke clearing is a process outcome.                |

## FOD: Food, consumption and domestic care

| ID     | Example intent                                     | Seed worlds | Priority | Level | Related mechanics and entities              | Distinction to preserve                                           |
| ------ | -------------------------------------------------- | ----------- | -------- | ----- | ------------------------------------------- | ----------------------------------------------------------------- |
| FOD-01 | Eat one berry from my pack.                        | ALL         | 1 Core   | U     | consumption, nutrition                      | Native execution needs no thought, goal, or invention.            |
| FOD-02 | Drink from this known safe supply.                 | ALL         | 1 Core   | U     | consumption, hydration, water               | Safe is evidence/policy-dependent, not a model certification.     |
| FOD-03 | Cook the raw food at the lit fire.                 | MD FA       | 1 Core   | U     | cooking, heat, work                         | Bind actual output; no eating a future imaginary item.            |
| FOD-10 | Rest by the fire until I feel recovered.           | MD FA       | 1 Core   | C     | rest, body-feedback, exposure               | Uses actual body feedback, not wall-clock model latency.          |
| FOD-05 | Prepare a meal using only plants.                  | ALL         | 3 Depth  | C     | recipe-knowledge, ingredient-classification | Preserve ingredient restriction; unknown provenance may block.    |
| FOD-06 | Preserve the surplus with the technique I learned. | ALL         | 3 Depth  | U     | preservation, spoilage, work                | Method-specific costs and actual shelf-life effects.              |
| FOD-04 | Share the meal equally but save Ada's portion.     | ALL         | 4 Detail | C     | portioning, reservation, transfer           | Exact quantity and ownership/custody remain separate.             |
| FOD-07 | Serve the oldest suitable food first.              | ALL         | 4 Detail | C     | age-evidence, selection, serving            | No unseen spoilage knowledge; suitability can be uncertain.       |
| FOD-08 | Wash this bowl before reusing it.                  | ALL         | 4 Detail | C     | cleaning, water, residue                    | A cosmetic clean texture is not contamination removal.            |
| FOD-09 | Sweep the broken pottery away from the path.       | ALL         | 4 Detail | C     | debris, tools, placement                    | Debris goes somewhere; it does not disappear without a sink rule. |
| FOD-11 | Mend and dry the bedding before sleeping.          | MD FA       | 4 Detail | C     | repair, moisture, sleep                     | Multiple real steps; failure blocks dependent sleep setup.        |
| FOD-12 | Make the room welcoming for our guest.             | ALL         | 4 Detail | C     | placement, cleaning, social-appraisal       | An open goal needs a chosen method; welcome is not guaranteed.    |

## AGR: Plants, cultivation and ecology

| ID     | Example intent                                    | Seed worlds | Priority   | Level | Related mechanics and entities             | Distinction to preserve                                         |
| ------ | ------------------------------------------------- | ----------- | ---------- | ----- | ------------------------------------------ | --------------------------------------------------------------- |
| AGR-01 | Plant these seeds in the prepared patch.          | ALL         | 2 Complete | U     | planting, soil, finite-seeds               | Planting is not instant crop growth.                            |
| AGR-07 | Harvest each crop when it becomes ripe.           | ALL         | 2 Complete | C     | growth, monitoring, repeat                 | Persistent scoped job, not a global endless entity scan.        |
| AGR-02 | Water only the dry beds.                          | ALL         | 3 Depth    | C     | soil-moisture, selection, water            | Moisture must be observable or measured.                        |
| AGR-05 | Transplant the sapling with its roots intact.     | ALL         | 3 Depth    | U     | roots, excavation, plant-health            | Handling damage and survival remain possible.                   |
| AGR-06 | Protect the plants from tonight's expected frost. | MD MO FA    | 3 Depth    | C     | weather-knowledge, covering, thermal       | Forecast is uncertain; no access to future weather RNG.         |
| AGR-08 | Compost the compatible scraps.                    | ALL         | 3 Depth    | U     | decomposition, mixtures, process           | A process continues with its own conditions and limits.         |
| AGR-10 | Save seeds from the healthiest observed plants.   | ALL         | 3 Depth    | C     | selection, traits, harvesting              | Observed phenotype is not perfect genetic knowledge.            |
| AGR-11 | Restore the damaged riverbank with native plants. | ALL         | 3 Depth    | C     | ecology, planting, erosion                 | Long-term ecosystem outcome is a goal, not direct mutation.     |
| AGR-03 | Weed around the seedlings without uprooting them. | ALL         | 4 Detail   | U     | plant-recognition, selective-removal       | Identification can be uncertain; care constraint persists.      |
| AGR-04 | Prune this branch to let more light through.      | ALL         | 4 Detail   | C     | plant-body, light, tools                   | Light change requires real geometry or coarse canopy mechanics. |
| AGR-09 | Pollinate this flower using the known technique.  | ALL         | 4 Detail   | U     | reproduction, plant-compatibility          | Contact does not guarantee fertilization.                       |
| AGR-12 | Leave this patch untouched as a refuge.           | ALL         | 4 Detail   | C     | designation, personal-policy, institutions | A designation does not force others to comply.                  |

## ANI: Animals and organism behavior

| ID     | Example intent                                               | Seed worlds | Priority   | Level | Related mechanics and entities         | Distinction to preserve                                         |
| ------ | ------------------------------------------------------------ | ----------- | ---------- | ----- | -------------------------------------- | --------------------------------------------------------------- |
| ANI-10 | As a predator, stalk and wait for an opening.                | ALL         | 1 Core     | C     | stealth, observation, hunting          | Prediction and attack success are not known in advance.         |
| ANI-02 | Lead the trained animal to its pen.                          | ALL         | 2 Complete | C     | training, signals, movement            | The animal's controller responds under its own rules.           |
| ANI-06 | Release the trapped creature.                                | ALL         | 2 Complete | C     | trap-state, restraint, access          | Release does not guarantee it stays, thanks, or forgives.       |
| ANI-07 | Teach the dog our return signal.                             | MD MO FA    | 2 Complete | U     | animal-learning, signals, practice     | A session is not instant mastery.                               |
| ANI-01 | Approach the deer slowly and offer food.                     | MD MO FA    | 3 Depth    | C     | movement-modes, offer, animal-response | No guaranteed taming or friendliness.                           |
| ANI-03 | Herd the flock away from the road.                           | MD MO FA    | 3 Depth    | C     | herding, collective-motion, signals    | May require several agents and bounded target groups.           |
| ANI-08 | As a deer, browse nearby leaves while staying near the herd. | MD MO FA    | 3 Depth    | C     | species-diet, proximity, consumption   | No human hands, inventory, or verbal goal requirement.          |
| ANI-09 | As a bird, perch above the disturbance.                      | MD MO FA    | 3 Depth    | U     | flight, perching, support              | Actual altitude and landing capacity are required.              |
| ANI-12 | Migrate with the group when the season changes.              | MD MO FA    | 3 Depth    | C     | seasons, group-signals, routes         | Group membership does not create a shared omniscient mind.      |
| ANI-04 | Remove the thorn from the animal's paw.                      | ALL         | 4 Detail   | U     | body-parts, care, cooperation          | Handling acceptance, tools and injury mechanics matter.         |
| ANI-05 | Groom the animal and check for injuries.                     | ALL         | 4 Detail   | C     | grooming, inspection, trust            | Grooming and diagnostic evidence are separate results.          |
| ANI-11 | Build a nest from the available fibers.                      | ALL         | 4 Detail   | C     | species-manipulation, construction     | Uses the organism's supported body, not a human craft shortcut. |

## CARE: Bodily care and rescue

These are fictional simulation interactions, not real-world medical instructions.

| ID      | Example intent                                            | Seed worlds | Priority     | Level | Related mechanics and entities         | Distinction to preserve                                         |
| ------- | --------------------------------------------------------- | ----------- | ------------ | ----- | -------------------------------------- | --------------------------------------------------------------- |
| CARE-02 | Apply the known bandaging treatment.                      | ALL         | 1 Core       | U     | wounds, treatment, supplies            | Method, body part and finite materials are explicit.            |
| CARE-01 | Ask whether Ada wants help with her injury.               | ALL         | 2 Complete   | U     | conversation, consent                  | Asking is not treatment or a diagnosis.                         |
| CARE-03 | Carry the unconscious person out of danger.               | ALL         | 2 Complete   | U     | carrying, load, body, emergency-policy | Inability to consent and emergency authority are world rules.   |
| CARE-05 | Bring water rather than trying to treat the wound.        | ALL         | 2 Complete   | C     | delivery, requested-method             | Do not substitute an unsolicited medical intervention.          |
| CARE-08 | Guide the disoriented traveler to a familiar place.       | ALL         | 3 Depth      | C     | cooperation, spatial-memory            | The traveler keeps their own agency and knowledge.              |
| CARE-10 | Recover the body and arrange a burial.                    | ALL         | 3 Depth      | C     | remains, carrying, ritual, terrain     | Physical burial and social meaning are distinct.                |
| CARE-11 | Comfort the grieving person without demanding a response. | ALL         | 3 Depth      | U     | speech, appraisal, relationship        | Comfort is attempted; grief cannot be set to zero.              |
| CARE-06 | Keep watch over the sleeping child.                       | ALL         | 4 Detail     | C     | monitoring, caregiving, attention      | Watching is ongoing work, not guaranteed protection.            |
| CARE-07 | Wake Ada gently when the meal is ready.                   | ALL         | 4 Detail     | C     | sleep, signals, wait                   | A wake attempt may fail; no direct consciousness setter.        |
| CARE-12 | Stay with the patient until another caregiver takes over. | ALL         | 4 Detail     | C     | handoff, monitoring, participation     | Handoff requires actual acceptance, not a named absent helper.  |
| CARE-04 | Drag the injured construct to its charger.                | SC FA       | 5 Specialist | C     | dragging, body, reservoir              | Robot care does not assume biological healing.                  |
| CARE-09 | Replace the damaged module with a compatible spare.       | SC FA       | 5 Specialist | U     | repair, body-modules, compatibility    | Identity continuity and disabled functions need explicit rules. |

## SOC: Relationships and social attempts

| ID     | Example intent                                            | Seed worlds | Priority   | Level | Related mechanics and entities           | Distinction to preserve                                    |
| ------ | --------------------------------------------------------- | ----------- | ---------- | ----- | ---------------------------------------- | ---------------------------------------------------------- |
| SOC-05 | Refuse the invitation politely.                           | ALL         | 2 Complete | U     | conversation, participation              | Refusal should not create a hidden social contract.        |
| SOC-01 | Apologize for what I did.                                 | ALL         | 3 Depth    | U     | speech, memory, appraisal                | Apology does not imply forgiveness.                        |
| SOC-03 | Challenge Ada's account using the evidence I saw.         | ALL         | 3 Depth    | U     | argument, evidence-provenance            | Neither agreement nor objective truth is forced.           |
| SOC-04 | Tell a lie about where I was.                             | ALL         | 3 Depth    | U     | speech, belief-provenance                | A false claim cannot rewrite location history.             |
| SOC-06 | Ask permission before entering their home.                | ALL         | 3 Depth    | C     | request, access, institutions            | Social permission and platform authorization are separate. |
| SOC-07 | Invite the lonely traveler to share dinner.               | ALL         | 3 Depth    | U     | invitation, appraisal                    | Loneliness must be known or inferred, not read privately.  |
| SOC-09 | Court another consenting adult through shared activities. | ALL         | 3 Depth    | C     | adult-relationships, consent, activities | Affection and reciprocity remain independently authored.   |
| SOC-10 | Introduce two people who have not met.                    | ALL         | 3 Depth    | U     | identity-disclosure, conversation        | Introduction shares only allowed identity information.     |
| SOC-11 | Mediate their disagreement without choosing for them.     | ALL         | 3 Depth    | C     | conversation, turn-taking, agreements    | No direct edit to either participant's intentions.         |
| SOC-12 | Rebuild trust by consistently keeping my promises.        | ALL         | 3 Depth    | C     | goals, commitments, appraisal            | A long pursuit, not a relationship-score command.          |
| SOC-02 | Compliment the craftwork sincerely.                       | ALL         | 4 Detail   | U     | speech, belief, relationship             | Expressed sincerity is not a target-state guarantee.       |
| SOC-08 | Ask for a hug and respect a refusal.                      | ALL         | 4 Detail   | C     | consent, contact, gesture                | Contact waits for the applicable participation rule.       |

## COOP: Cooperation and shared activities

| ID      | Example intent                                               | Seed worlds | Priority   | Level | Related mechanics and entities          | Distinction to preserve                                         |
| ------- | ------------------------------------------------------------ | ----------- | ---------- | ----- | --------------------------------------- | --------------------------------------------------------------- |
| COOP-02 | Carry this heavy object together.                            | ALL         | 2 Complete | U     | joint-load, movement, participation     | Two separate carries cannot duplicate the object.               |
| COOP-07 | Guard Ada while she repairs the gate.                        | MD SC FA    | 2 Complete | C     | monitoring, defense, joint-purpose      | Guarding does not guarantee every threat is intercepted.        |
| COOP-09 | Build the shelter together using different tools.            | MD SC FA    | 2 Complete | C     | shared-work, tool-roles, resources      | Combined work rate follows an admitted rule.                    |
| COOP-01 | Ask Ada to hold the beam while I fasten it.                  | ALL         | 3 Depth    | C     | joint-work, roles, attachments          | Both participants must actually be ready and active.            |
| COOP-05 | Search different parts of the clearing and compare findings. | ALL         | 3 Depth    | C     | task-allocation, search, communication  | Shared reports are not shared private perception.               |
| COOP-06 | Form a bucket line to fight the fire.                        | MD FA       | 3 Depth    | C     | roles, fluid-transfer, logistics        | Each transfer, source and participant is real.                  |
| COOP-10 | Abort our crossing if either of us signals danger.           | ALL         | 3 Depth    | C     | signals, joint-cancellation, traversal  | Cancellation respects each participant's safe boundary.         |
| COOP-11 | Let the slower member set our pace.                          | ALL         | 3 Depth    | C     | formation, observed-motion, cooperation | No private speed-stat disclosure is required.                   |
| COOP-03 | Count down, then lift at the same time.                      | ALL         | 4 Detail   | C     | signals, barriers, joint-work           | Synchronization uses a shared simulation boundary.              |
| COOP-04 | Take over the task when Ada gets tired.                      | ALL         | 4 Detail   | C     | handoff, observed-needs, work           | Retained work belongs to the actual work site or action family. |
| COOP-08 | Agree to alternate night watch.                              | MD SC FA    | 4 Detail   | C     | commitments, schedules, handoff         | An agreement is not permission to control another actor.        |
| COOP-12 | Request a replacement before leaving my post.                | ALL         | 4 Detail   | C     | handoff, commitments                    | Request sent is not replacement arrived.                        |

## ECO: Exchange, services and logistics

| ID     | Example intent                                        | Seed worlds | Priority   | Level | Related mechanics and entities          | Distinction to preserve                                                |
| ------ | ----------------------------------------------------- | ----------- | ---------- | ----- | --------------------------------------- | ---------------------------------------------------------------------- |
| ECO-01 | Offer this tool in exchange for three meals.          | MD FA       | 2 Complete | U     | barter, offers, valuation               | Offer, acceptance and settlement are distinct.                         |
| ECO-02 | Accept the exact trade Ada offered.                   | ALL         | 2 Complete | U     | trade-settlement, offer-version         | Recheck both sides' items; no partial unilateral exchange by accident. |
| ECO-05 | Deliver this sealed package without opening it.       | ALL         | 2 Complete | C     | logistics, containment, privacy         | Delivery does not require knowledge of contents.                       |
| ECO-12 | Recover my belongings without taking anyone else's.   | ALL         | 2 Complete | C     | ownership-evidence, selection, transfer | Unknown ownership cannot be silently classified.                       |
| ECO-04 | Return the very same borrowed knife.                  | ALL         | 3 Depth    | U     | instance-identity, transfer             | Equivalent replacement is not silently accepted.                       |
| ECO-06 | Restock the stall when inventory falls below five.    | ALL         | 3 Depth    | C     | monitoring, inventory, transport        | Scoped recurring activity with finite supplies.                        |
| ECO-08 | Hire a willing courier for this delivery.             | ALL         | 3 Depth    | C     | contracts, payment, agency              | Hiring needs agreement and cannot seize another controller.            |
| ECO-11 | Organize a caravan with supplies for the known route. | MD SC FA    | 3 Depth    | C     | group-travel, load, planning            | Forecast needs and actual capacity can differ.                         |
| ECO-03 | Lend the basket until tomorrow.                       | ALL         | 4 Detail   | U     | loans, custody, commitments             | Possession transfer does not erase ownership.                          |
| ECO-07 | Reserve these materials for our accepted repair.      | ALL         | 4 Detail   | U     | reservations, worksites                 | Reservation has an owner and lifetime; not permanent global exclusion. |
| ECO-09 | Pay only after the agreed delivery is evidenced.      | ALL         | 4 Detail   | C     | escrow, receipts, commitments           | A chat claim is not necessarily settlement evidence.                   |
| ECO-10 | Donate tools anonymously.                             | ALL         | 4 Detail   | C     | transfer, attribution, disclosure       | Public anonymity must not erase authoritative provenance.              |

## LAW: Fictional institutions and obligations

These rows describe in-world fictional practices, not real-world political recommendations or legal advice.

| ID     | Example intent                                   | Seed worlds | Priority | Level | Related mechanics and entities        | Distinction to preserve                                            |
| ------ | ------------------------------------------------ | ----------- | -------- | ----- | ------------------------------------- | ------------------------------------------------------------------ |
| LAW-04 | Witness an exchange and later report it.         | ALL         | 3 Depth  | C     | observation, testimony                | Witness knowledge is limited to what was perceived.                |
| LAW-05 | Request membership in the existing guild.        | MD FA       | 3 Depth  | U     | membership, roles                     | Request is not acceptance or a permission grant.                   |
| LAW-06 | Perform the duty attached to my accepted role.   | ALL         | 3 Depth  | C     | roles, tasks, obligations             | Role authority is specific and revocable.                          |
| LAW-07 | Use the community's existing dispute process.    | ALL         | 3 Depth  | C     | institutions, procedure               | Procedure does not guarantee a preferred judgment.                 |
| LAW-08 | Claim this abandoned building under local rules. | ALL         | 3 Depth  | U     | property, jurisdiction                | A declaration alone need not create valid ownership.               |
| LAW-09 | Post a public request for bridge repairs.        | ALL         | 3 Depth  | U     | noticeboard, work-orders              | Posting does not assign workers or create materials.               |
| LAW-01 | Make a promise with an explicit deadline.        | ALL         | 4 Detail | U     | commitments, communication            | Utterance, understood terms and obligation creation can differ.    |
| LAW-02 | Ask to renegotiate the promise.                  | ALL         | 4 Detail | U     | agreements, versions                  | One party cannot erase the other's accepted terms.                 |
| LAW-03 | Record our mutually accepted agreement.          | ALL         | 4 Detail | U     | records, signatures, consent          | A record may evidence an agreement without enforcing it magically. |
| LAW-10 | Release someone from an obligation I can waive.  | ALL         | 4 Detail | U     | authority, commitments                | The actor must control the relevant claim.                         |
| LAW-11 | Honor the deceased using our known ceremony.     | ALL         | 4 Detail | C     | ritual, shared-meaning, participation | Ceremony is not resurrection or forced emotional closure.          |
| LAW-12 | Propose a new sharing custom to the group.       | ALL         | 4 Detail | U     | speech, collective-agreement          | Proposing a custom is speech; installing enforcement is DEF work.  |

## SEC: Property, secrecy and infiltration

| ID     | Example intent                                      | Seed worlds | Priority   | Level | Related mechanics and entities        | Distinction to preserve                                                    |
| ------ | --------------------------------------------------- | ----------- | ---------- | ----- | ------------------------------------- | -------------------------------------------------------------------------- |
| SEC-02 | Lock the chest and keep the key.                    | ALL         | 2 Complete | C     | locks, possession                     | Locking does not make contents indestructible.                             |
| SEC-03 | Try the known lock-opening technique.               | ALL         | 2 Complete | U     | lockpicking, tools, skill             | Fictional attempt with bounded noise/time/outcomes, not guaranteed access. |
| SEC-04 | Slip past the guard without being seen.             | ALL         | 2 Complete | C     | stealth, occlusion, movement          | The engine cannot guarantee another observer misses the actor.             |
| SEC-05 | Distract the guard by ringing the distant bell.     | MD FA       | 2 Complete | C     | device-control, hearing, agency       | The guard decides whether to investigate.                                  |
| SEC-06 | Take the unattended purse.                          | ALL         | 2 Complete | U     | pickup, ownership, witnesses          | In-world theft may be allowed; platform access control is not bypassed.    |
| SEC-11 | Remove the known alarm without triggering it.       | ALL         | 2 Complete | U     | device-state, tools, triggers         | Safe removal must be supported; uncertainty remains meaningful.            |
| SEC-01 | Hide the letter beneath the loose floorboard.       | ALL         | 3 Depth    | C     | containment, placement, occlusion     | Hidden placement must have real discovery/access semantics.                |
| SEC-07 | Check whether someone tampered with the seal.       | ALL         | 3 Depth    | U     | trace-evidence, inspection            | No omniscient historical audit disguised as inspection.                    |
| SEC-08 | Conceal my footprints after leaving camp.           | MD SC FA    | 3 Depth    | U     | traces, terrain, work                 | Trace removal requires a real trace model.                                 |
| SEC-09 | Wear the costume to impersonate a messenger.        | ALL         | 3 Depth    | C     | equipment, recognition, deception     | Costume cannot directly assign others' beliefs.                            |
| SEC-12 | Follow at a distance, but stop if noticed.          | ALL         | 3 Depth    | C     | movement, recognition-evidence, guard | Noticed must be evidenced or admitted by a specific detection model.       |
| SEC-10 | Inspect my own records for an unexplained transfer. | ALL         | 4 Detail   | C     | records, audit-scope                  | Actor-visible records are not server/god logs.                             |

## CBT: Conflict, defense and tactical action

| ID     | Example intent                                            | Seed worlds | Priority   | Level | Related mechanics and entities                                   | Distinction to preserve                                                                                                    |
| ------ | --------------------------------------------------------- | ----------- | ---------- | ----- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| CBT-01 | Hunt this visible animal using my equipped launcher.      | MD SC FA    | 1 Core     | U     | ranged-action, ammunition, body                                  | Consume actual ammunition; hit and injury are native outcomes.                                                             |
| CBT-02 | Aim but do not fire yet.                                  | MD SC FA    | 1 Core     | U     | aiming, attention, weapons                                       | Preparatory stance is not an attack or damage event.                                                                       |
| CBT-05 | Block the incoming blow with this shield.                 | MD FA       | 1 Core     | U     | defense, timing, equipment                                       | Defense can fail; requires actual compatible timing rules.                                                                 |
| CBT-06 | Dodge into the open space to my right.                    | MD SC FA    | 1 Core     | U     | evasive-motion, clearance                                        | Invulnerability frames are a world rule, not implied.                                                                      |
| CBT-08 | Retreat while keeping the enemy in sight.                 | MD SC FA    | 1 Core     | C     | orientation, movement, perception                                | May be impossible around a corner; do not drop the sight constraint.                                                       |
| CBT-13 | Strike the nearby opponent with my equipped melee weapon. | ALL         | 1 Core     | U     | melee-action, reach, commitment, damage; equipped weapon, target | Requires actual reach, a compatible weapon and supported timing; naming a hit does not guarantee damage or bypass defense. |
| CBT-03 | Stop attacking when the opponent surrenders.              | ALL         | 2 Complete | C     | combat, observed-signal, interrupt                               | Stop depends on perceived surrender and safe interruption.                                                                 |
| CBT-04 | Push the attacker away without striking them.             | ALL         | 2 Complete | U     | contact-force, balance, collision                                | Push is not a renamed arbitrary health decrement.                                                                          |
| CBT-07 | Stay between the threat and my companion.                 | MD SC FA    | 2 Complete | C     | relative-position, body-blocking                                 | Geometric interposition may not block every attack type.                                                                   |
| CBT-11 | Guard this doorway without pursuing beyond it.            | ALL         | 2 Complete | C     | monitoring, combat, region-constraint                            | Activity boundaries prevent unintended world-wide pursuit.                                                                 |
| CBT-12 | Spar under our agreed nonlethal rules.                    | ALL         | 2 Complete | C     | joint-activity, combat-policy, consent                           | Rules require an admitted safe mode or honest risk disclosure.                                                             |
| CBT-09 | Disarm rather than kill.                                  | ALL         | 3 Depth    | U     | disarming, grip, combat                                          | Requires a supported method; nonlethality is not always guaranteeable.                                                     |
| CBT-10 | Surrender and put my weapon down.                         | ALL         | 3 Depth    | C     | speech, equipment, placement                                     | Surrender does not force mercy.                                                                                            |

## VEH: Vehicles, mounts and transport

| ID     | Example intent                                          | Seed worlds | Priority     | Level | Related mechanics and entities          | Distinction to preserve                                          |
| ------ | ------------------------------------------------------- | ----------- | ------------ | ----- | --------------------------------------- | ---------------------------------------------------------------- |
| VEH-01 | Board the boat and take an empty seat.                  | ALL         | 2 Complete   | U     | boarding, occupancy, moving-support     | Actor location becomes related to a moving platform.             |
| VEH-02 | Row to the opposite dock.                               | MD MO FA    | 2 Complete   | U     | vehicle-control, water-navigation, work | Vehicle movement is not ordinary actor walking.                  |
| VEH-06 | Mount the willing horse.                                | MD MO FA    | 2 Complete   | U     | mounting, consent, body                 | Mounting grants only the admitted control relation.              |
| VEH-10 | Dismount at the next safe stopping place.               | MD MO FA    | 2 Complete   | C     | monitoring, vehicle-motion, landing     | Do not place the rider at an arbitrary convenient point.         |
| VEH-03 | Sail using the observed wind.                           | MD MO FA    | 3 Depth      | U     | sailing, weather, controls              | Unsupported aerodynamics cannot be inferred from sail art.       |
| VEH-04 | Stop the wagon before unloading it.                     | MD FA       | 3 Depth      | C     | vehicle-motion, braking, transfer       | Stop must actually complete before dependent work.               |
| VEH-05 | Hitch the cart to the trained animal.                   | MD FA       | 3 Depth      | U     | attachments, animal-participation, load | Animal agency and load compatibility remain real.                |
| VEH-07 | Give the passenger a ride to the location they named.   | ALL         | 3 Depth      | C     | communication, vehicle-control, service | Resolve their destination; do not read their private goal state. |
| VEH-12 | Wait for the ferry rather than swimming.                | ALL         | 3 Depth      | C     | schedule-evidence, wait, boarding       | Preserve method restriction and uncertain arrival.               |
| VEH-11 | Load fragile cargo separately from heavy stones.        | ALL         | 4 Detail     | C     | cargo, capacity, damage                 | Arrangement must matter through supported load/damage rules.     |
| VEH-08 | Drive the known route and obey its posted restrictions. | ALL         | 5 Specialist | C     | vehicle-routes, signs, local-rules      | In-world rules are not platform permissions.                     |
| VEH-09 | Tow the disabled vehicle to the workshop.               | MO SC       | 5 Specialist | U     | towing, force, attachments              | Coupled movement and additional load are required.               |

## ART: Art, performance and play

| ID     | Example intent                                      | Seed worlds | Priority   | Level | Related mechanics and entities         | Distinction to preserve                                                 |
| ------ | --------------------------------------------------- | ----------- | ---------- | ----- | -------------------------------------- | ----------------------------------------------------------------------- |
| ART-03 | Draw a map of the places I explored.                | ALL         | 2 Complete | C     | writing, spatial-memory, materials     | No unexplored details from world truth.                                 |
| ART-09 | Race to the old tree without pushing anyone.        | ALL         | 2 Complete | C     | shared-goal, movement, constraints     | Racing does not grant extra movement speed.                             |
| ART-01 | Sing a song for the people nearby.                  | ALL         | 3 Depth    | U     | vocal-performance, hearing, media      | Performance, audience reception and enjoyment differ.                   |
| ART-02 | Tell a story inspired by our expedition.            | ALL         | 3 Depth    | U     | speech, memory, fiction                | A fictional retelling does not become historical truth.                 |
| ART-07 | Dance with a consenting partner.                    | ALL         | 3 Depth    | U     | joint-motion, music, consent           | Two bodies, compatible poses and independent withdrawal.                |
| ART-08 | Play hide-and-seek using the rules we know.         | ALL         | 3 Depth    | C     | shared-rules, search, concealment      | The seeker cannot query all participant positions.                      |
| ART-10 | Play the existing ball game with Ada.               | ALL         | 3 Depth    | U     | game-rules, ball-physics, joint-work   | Rules, scoring and equipment must exist.                                |
| ART-04 | Carve a memorial into this stone.                   | ALL         | 4 Detail   | U     | mark-making, tools, work               | Persistent marks and generated art are distinct from verbal intention.  |
| ART-05 | Arrange flowers to resemble a bird.                 | ALL         | 4 Detail   | C     | placement, visual-composition          | A novel visual arrangement need not change mechanics.                   |
| ART-06 | Play a rhythm on the pot and invite others to join. | ALL         | 4 Detail   | C     | acoustics, timing, participation       | Shared timing requires actual signals/coordination.                     |
| ART-11 | Create a trail of harmless surprises for my friend. | ALL         | 4 Detail   | C     | placement, signals, personal-knowledge | Harmlessness is bounded by known mechanics, not guaranteed universally. |
| ART-12 | Stage a pretend duel without actual attacks.        | ALL         | 4 Detail   | C     | performance, gesture, participation    | Pretend action must never route into consequential combat.              |

## KNO: Records, teaching and discovery

| ID     | Example intent                                        | Seed worlds | Priority   | Level | Related mechanics and entities     | Distinction to preserve                                               |
| ------ | ----------------------------------------------------- | ----------- | ---------- | ----- | ---------------------------------- | --------------------------------------------------------------------- |
| KNO-01 | Teach Ada the cord-making technique I know.           | ALL         | 1 Core     | U     | teaching, knowledge, communication | Learning follows its own rules; no hidden registry dump.              |
| KNO-04 | Ask how the unfamiliar tool works.                    | ALL         | 1 Core     | U     | conversation, knowledge            | A description is not automatically a usable technique grant.          |
| KNO-03 | Practice the known technique on spare material.       | ALL         | 2 Complete | U     | practice, skill, resources         | Skill gains require an installed learning mechanic.                   |
| KNO-10 | Test whether this existing tool can serve as a lever. | ALL         | 2 Complete | C     | force, geometry, experimentation   | Cross-use needs mechanics, not a registered finished-object name.     |
| KNO-02 | Demonstrate the technique slowly while Ada watches.   | ALL         | 3 Depth    | C     | work, observation, learning        | A real demonstration consumes actual time/materials where applicable. |
| KNO-09 | Compare my notes with Ada's volunteered observations. | ALL         | 3 Depth    | C     | sharing, provenance, inference     | Agreement does not prove truth; private notes stay private.           |
| KNO-11 | Preserve an unknown sample for later study.           | ALL         | 3 Depth    | C     | containment, degradation, records  | Unknown properties remain unknown during passive exposure.            |
| KNO-12 | Publish my own known procedure for others to learn.   | ALL         | 3 Depth    | U     | publication, knowledge, rights     | Publication of knowledge is not installation of a new world rule.     |
| KNO-05 | Record the result of this experiment.                 | ALL         | 4 Detail   | U     | records, evidence, writing         | Preserve inconclusive or negative results.                            |
| KNO-06 | Repeat the experiment changing only this variable.    | ALL         | 4 Detail   | C     | experiments, parameter-binding     | All controlled variables must be supported and revalidated.           |
| KNO-07 | Label the jars using what I actually know.            | ALL         | 4 Detail   | U     | marking, identity, uncertainty     | Labels may be beliefs, not authoritative contents.                    |
| KNO-08 | Copy the public record while preserving attribution.  | ALL         | 4 Detail   | U     | records, copying, disclosure       | A copy has its own identity and access policy.                        |

## AUT: Routines, monitoring and automation

| ID     | Example intent                                              | Seed worlds | Priority     | Level | Related mechanics and entities         | Distinction to preserve                                                 |
| ------ | ----------------------------------------------------------- | ----------- | ------------ | ----- | -------------------------------------- | ----------------------------------------------------------------------- |
| AUT-11 | Halt the routine, preserving completed deliveries.          | ALL         | 1 Core       | F     | activity-lifecycle, receipts           | Cancellation removes future authority, not committed history.           |
| AUT-12 | Inspect why my activity stopped before choosing a new plan. | ALL         | 1 Core       | F     | outcome-projection, agency             | Actor-visible reason is not privileged debug state.                     |
| AUT-01 | Wait here for ten game minutes.                             | ALL         | 2 Complete   | F     | wait, simulation-clock                 | Waiting is explicit; world time and interruption still apply.           |
| AUT-03 | Gather twice, then rest.                                    | ALL         | 2 Complete   | F     | sequence, repeat, known-actions        | Each invocation has its own cost and terminal receipt.                  |
| AUT-02 | Wait until I hear Ada's agreed signal.                      | ALL         | 3 Depth      | F     | observed-events, wait                  | Hidden or undelivered signals cannot satisfy the condition.             |
| AUT-04 | Stop this work if the nearby fire spreads.                  | ALL         | 3 Depth      | F     | observed-predicate, interrupt          | Reaction depends on actual permitted evidence and family cancellation.  |
| AUT-05 | If the gate is open, pass through; otherwise knock.         | ALL         | 3 Depth      | F     | branch, three-valued-evidence          | Unknown gate state is not automatically open or closed.                 |
| AUT-07 | Tend this garden each morning until I withdraw the routine. | ALL         | 3 Depth      | C     | calendar, standing-activity, resources | Persistent authority, scope and review policy; no permanent free labor. |
| AUT-06 | Keep bringing water until the cistern reaches its mark.     | ALL         | 4 Detail     | C     | logistics, measurement, repeat         | Bounded iterations and finite source; no magical pumping.               |
| AUT-08 | Use the existing thermostat to maintain warmth.             | MO SC       | 5 Specialist | U     | device-control, feedback-process       | Machine-owned process differs from actor-owned tending.                 |
| AUT-09 | Activate the known irrigation timer.                        | MO SC       | 5 Specialist | U     | automation, configuration, water       | Configuring within an admitted envelope needs no invention.             |
| AUT-10 | Sort arriving items using this known sorting mechanism.     | MO SC       | 5 Specialist | U     | automation, selectors, transfer        | New arrivals require bounded subscription scope and capacity.           |

## MAG: Actions under magical constitutions

These are ordinary uses **only in worlds with the relevant admitted capabilities**. Their existence is not assumed by the capability layer.

| ID     | Example intent                                       | Seed worlds | Priority     | Level | Related mechanics and entities                   | Distinction to preserve                                                                  |
| ------ | ---------------------------------------------------- | ----------- | ------------ | ----- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| MAG-01 | Cast the light spell I know on this lantern.         | FA          | 3 Depth      | U     | spellcasting, light, cost                        | Known ability, valid target and actual resource policy.                                  |
| MAG-02 | Sustain the ward while Ada crosses.                  | FA          | 3 Depth      | C     | sustained-effect, cost, cooperation              | Continued effect may consume attention or energy.                                        |
| MAG-03 | Lift the stone with admitted telekinesis.            | FA          | 3 Depth      | U     | telekinesis, force, mass                         | Not unrestricted object mutation or collision bypass.                                    |
| MAG-04 | Use the known freezing spell to make a crossing.     | FA          | 3 Depth      | C     | spell, phase-change, support                     | Frozen water is walkable only under compatible load rules.                               |
| MAG-06 | Dispel only the enchantment I can identify.          | FA          | 3 Depth      | U     | effect-identity, dispel, recognition             | Do not remove unrelated hidden effects.                                                  |
| MAG-07 | Shape-shift using my known form.                     | FA          | 3 Depth      | U     | transformation, body, identity                   | Reconcile equipment, movement and active work.                                           |
| MAG-09 | Create an illusion of a bird to draw attention.      | FA          | 3 Depth      | C     | illusion, perception, agency                     | Illusion is not a physical bird; distraction is not guaranteed.                          |
| MAG-10 | Store this spell in an existing charged rune.        | FA          | 3 Depth      | U     | effect-storage, capacity, trigger                | Stored effect and later trigger need pinned definitions.                                 |
| MAG-11 | End my own sustained spell without dispelling Ada's. | FA          | 3 Depth      | U     | effect-ownership, cancellation                   | Exact effect instance and authority matter.                                              |
| MAG-05 | Speak with a consenting spirit through this ritual.  | FA          | 5 Specialist | U     | spirit-channel, ritual, identity                 | New channel does not expose arbitrary dead actors' private data.                         |
| MAG-08 | Send a thought through our admitted telepathic bond. | FA          | 5 Specialist | U     | mental-channel, disclosure                       | Only explicitly shared fictional content crosses the boundary.                           |
| MAG-12 | Invoke the world's admitted compulsion effect.       | FA          | 5 Specialist | U     | fictional-mental-effects, target-owner-operation | Only explicitly enabled game effects; never platform privilege or human account control. |

## SYN: Machines, space and synthetic life

For SC, SYN-01 covers crew-operated contact, seals and pressure equalization after an abstract arrival; it adds no playable piloting or orbital navigation. SYN-03 retains a different world's orbital-motion possibility and is marked **—** because it falls outside all four seed-world proposals.

| ID     | Example intent                                               | Seed worlds | Priority     | Level | Related mechanics and entities         | Distinction to preserve                                          |
| ------ | ------------------------------------------------------------ | ----------- | ------------ | ----- | -------------------------------------- | ---------------------------------------------------------------- |
| SYN-01 | Dock with the station and equalize pressure.                 | SC          | 5 Specialist | C     | docking, pressure, airlocks            | Contact, seal and equalization are separate stages.              |
| SYN-02 | Orient my solar panels toward the observed star.             | MO SC       | 5 Specialist | U     | orientation, radiation, power          | Pointing does not guarantee sufficient generated energy.         |
| SYN-03 | Coast to the rendezvous rather than walking there.           | —           | 5 Specialist | U     | orbital-motion, propulsion, planning   | Different topology/dynamics require their own movement provider. |
| SYN-04 | Recharge before resuming the repair.                         | SC          | 5 Specialist | C     | reservoir, repair, plans               | Charge replaces hunger only for compatible bodies.               |
| SYN-05 | Swap to the gripper needed for this task.                    | MO SC       | 5 Specialist | U     | tool-interfaces, body-modules          | Changing a tool changes only its admitted capabilities.          |
| SYN-06 | Send a packet through the in-world relay network.            | MO SC       | 5 Specialist | U     | fictional-network, communication       | No actual Internet or host networking is implied.                |
| SYN-07 | Move my digital avatar to an accessible graph node.          | MO SC       | 5 Specialist | U     | graph-topology, virtual-location       | Location need not be Euclidean or rendered in 3D.                |
| SYN-08 | Run the known diagnostic on my damaged actuator.             | MO SC       | 5 Specialist | U     | diagnostics, body-state, observability | Diagnosis is scoped evidence, not repair.                        |
| SYN-09 | Delegate inspection to my authorized remote body.            | SC          | 5 Specialist | U     | controller-leases, remote-senses       | Same mind does not imply permission over every body.             |
| SYN-10 | Enter low-power mode until the beacon arrives.               | MO SC       | 5 Specialist | U     | power-state, wake-channel              | Only enabled wake senses operate during dormancy.                |
| SYN-11 | Fabricate a known replacement using available feedstock.     | MO SC       | 5 Specialist | U     | fabrication, recipes, energy           | No matter creation unless an explicit world source allows it.    |
| SYN-12 | Isolate the failing subsystem while preserving life support. | SC          | 5 Specialist | C     | dependency-network, device-control     | Hard constraints require supported dependency evidence.          |

## COL: Collectives and unusual bodies

| ID     | Example intent                                                | Seed worlds | Priority     | Level | Related mechanics and entities       | Distinction to preserve                                                |
| ------ | ------------------------------------------------------------- | ----------- | ------------ | ----- | ------------------------------------ | ---------------------------------------------------------------------- |
| COL-01 | As a fungus, grow toward the moisture gradient.               | SC FA       | 5 Specialist | U     | growth, gradient-sense, resources    | Growth is not locomotion of an unchanged body.                         |
| COL-02 | As a root network, share nutrients with this connected plant. | SC FA       | 5 Specialist | U     | network-transfer, compatibility      | Connectedness and transfer limits are real.                            |
| COL-03 | As a slime, squeeze through the opening.                      | SC FA       | 5 Specialist | U     | deformation, volume, clearance       | A soft-looking sprite is not a deformable body.                        |
| COL-04 | As a swarm, split into two search groups.                     | SC FA       | 5 Specialist | U     | collective-identity, task-allocation | Define whether agents, knowledge and resources split or remain shared. |
| COL-05 | Rejoin the swarm and share only my observed findings.         | SC FA       | 5 Specialist | U     | collective-memory, disclosure        | Merge mechanics preserve provenance and privacy.                       |
| COL-06 | Form a living bridge with willing colony members.             | SC FA       | 5 Specialist | C     | joint-body, support, participation   | Aggregate shape and load require an admitted model.                    |
| COL-07 | Change color to signal my colony.                             | SC FA       | 5 Specialist | U     | body-display, visual-channel         | Color has communication effects only for perceiving interpreters.      |
| COL-08 | Release the admitted scent signal at this junction.           | SC FA       | 5 Specialist | U     | chemical-signals, diffusion, cost    | Persistent field and observers are independently simulated.            |
| COL-09 | As a living building, open a passage for the guest.           | SC FA       | 5 Specialist | U     | morphology, geometry, access         | Geometry change must reconcile support and occupants.                  |
| COL-10 | Coordinate my limbs to hold three objects.                    | SC FA       | 5 Specialist | U     | body-resources, grasp, concurrency   | Additional limbs need explicit capacity; prose cannot add channels.    |
| COL-11 | Detach a damaged segment and survive as the remainder.        | SC FA       | 5 Specialist | U     | body-topology, lifecycle, identity   | Survival and lost resources follow the body's rules.                   |
| COL-12 | As an endowed storm, move toward an observed heat source.     | FA          | 5 Specialist | U     | field-body, weather, controller      | Passive storms do not require an LLM or invented desires.              |

## TMP: Time, identity and unusual realities

| ID     | Example intent                                           | Seed worlds | Priority     | Level | Related mechanics and entities               | Distinction to preserve                                                |
| ------ | -------------------------------------------------------- | ----------- | ------------ | ----- | -------------------------------------------- | ---------------------------------------------------------------------- |
| TMP-01 | Enter the admitted dream realm while my body sleeps.     | FA          | 5 Specialist | U     | dream-topology, body-lifecycle               | Dream events are not automatically waking-world effects.               |
| TMP-02 | Share this dream through the world's consent-based link. | FA          | 5 Specialist | U     | dream-sharing, disclosure                    | No access to unshared private cognition.                               |
| TMP-03 | Slow this object using the known local-time effect.      | SC FA       | 5 Specialist | U     | local-time, effect-scope                     | Explicit simulation semantics; no change to billing or host deadlines. |
| TMP-04 | Revisit the admitted echo of yesterday's conversation.   | FA          | 5 Specialist | U     | historical-echo, perception                  | Echo access is a world capability, not unrestricted event-log access.  |
| TMP-05 | Create a temporary copy under the world's cloning rule.  | SC FA       | 5 Specialist | U     | identity-creation, resource-source, lifetime | Duplicate delivery cannot produce extra copies.                        |
| TMP-06 | Reunite with my copy under our admitted merge rule.      | SC FA       | 5 Specialist | U     | identity-merge, memory, ownership            | Conflicting memories/resources need explicit reconciliation.           |
| TMP-07 | Travel through the same doorway into its alternate room. | FA          | 5 Specialist | U     | non-Euclidean-topology, connector-state      | A supported topology provider must define the relationship.            |
| TMP-08 | Exchange my shadow with a consenting character.          | FA          | 5 Specialist | U     | fictional-traits, exchange, consent          | Aesthetic description alone does not define mechanical effects.        |
| TMP-09 | Spend an admitted memory-token to power the device.      | FA          | 5 Specialist | U     | fictional-resource, memory-owner, transfer   | Fictional sacrifice cannot erase actual audit/privacy records.         |
| TMP-10 | Ask the oracle a question through its known ritual.      | FA          | 5 Specialist | U     | oracle-policy, knowledge-disclosure          | The oracle's access and uncertainty must be explicitly bounded.        |
| TMP-11 | Invoke the world's bounded fictional rewind.             | SC FA       | 5 Specialist | U     | fictional-time, causality, receipts          | No rewind of real charges, revocation, or external operations.         |
| TMP-12 | Renounce my accepted magical title and its powers.       | FA          | 5 Specialist | U     | roles, capability-revocation                 | In-flight actions and sustained effects must observe revocation.       |

## DEF: Deliberate invention and owner-authoring

These requests may originate from an actor or an authorized creator, but they are **not ordinary effectful gameplay invocations**. INV and owner-control services determine eligibility. Listing a request grants no new authority.

| ID     | Example intent                                                  | Seed worlds | Priority     | Level | Related mechanics and entities            | Distinction to preserve                                              |
| ------ | --------------------------------------------------------------- | ----------- | ------------ | ----- | ----------------------------------------- | -------------------------------------------------------------------- |
| DEF-01 | Propose a new tool using my own described mechanism.            | ALL         | 1 Core       | D     | invention, materials, admission           | Actor-authored method is validated, not replaced by a secret answer. |
| DEF-02 | Define a reusable version of my successful technique.           | ALL         | 2 Complete   | D     | definition-lifecycle, knowledge           | Reuse/publication and mechanical definition are separate choices.    |
| DEF-03 | Specialize the admitted trap template for this target class.    | ALL         | 3 Depth      | D     | typed-ports, selectors, effects           | Template contract and aggregate bounds still apply.                  |
| DEF-05 | Introduce a combustion rule for this new material.              | ALL         | 3 Depth      | D     | properties, passive-processes             | Must specify effects under ordinary exposure, not just on use.       |
| DEF-06 | Author a new autonomous sorting mechanism.                      | ALL         | 3 Depth      | D     | process-definitions, selectors, transfers | A machine-owned process is not a free actor routine.                 |
| DEF-11 | As an authorized owner, conjure an instance of this definition. | ALL         | 3 Depth      | D     | owner-control, instance-creation          | Conjuring uses separate authority; never an NPC gameplay loophole.   |
| DEF-04 | Invent a way to sense nearby heat through walls.                | MO SC FA    | 5 Specialist | D     | senses, propagation, disclosure           | Needs supported sensing operators or an explicit host gap.           |
| DEF-07 | Establish a mechanically enforced guild charter.                | ALL         | 5 Specialist | D     | institutions, authority, policy           | Social proposal alone is COM/LAW; enforcement changes rules.         |
| DEF-08 | Define a touch-only species with no hunger.                     | SC FA       | 5 Specialist | D     | bodies, senses, needs                     | Creator permission and supported replacement interfaces required.    |
| DEF-09 | Add a spell that exchanges two objects' gravity.                | SC FA       | 5 Specialist | D     | effects, gravity, composition             | A novel description cannot install an absent evaluator.              |
| DEF-10 | Package my admitted inventions for another world.               | ALL         | 5 Specialist | D     | distribution, dependencies, rights        | Packaging does not activate them or grant knowledge there.           |
| DEF-12 | Add a genuinely new execution primitive to the engine.          | ALL         | 5 Specialist | D     | host-capabilities, engineering            | G3 engineering, not a generated script or model assertion.           |

## Cross-domain scenes that test expressiveness

These are compositions of rows, not additional required native verbs. Their purpose is to expose missing semantics and dependency contracts.

| Scene                                                                                                       | Relevant entries                       | What makes it interesting                                                           |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| Feed the deer without trapping it, then follow only while it remains visible.                               | ANI-01, INV-04, REL-01                 | Offer, independent response, movement persistence and loss of evidence.             |
| Make a bridge by placing an existing plank, without inventing a bridge recipe.                              | BLD-01, OBJ-12, NAV-04                 | New useful arrangement can emerge from existing support mechanics.                  |
| Use a cooking pot as a dinner bell, but not as a guaranteed NPC summons.                                    | OBJ-11, COM-08, FOD-04                 | Object repurposing, actual sound, independent interpretation.                       |
| Rescue Ada with a jointly carried stretcher while a third actor opens doors.                                | CARE-03, COOP-02, OBJ-02               | N-ary roles, load, collision, barriers, participation withdrawal.                   |
| Preserve a borrowed keepsake while using equivalent expendable materials.                                   | ECO-04, INV-11, MAK-09                 | Instance identity, provenance and hard method constraints.                          |
| Search for lost property, record checked locations, and ask a witness rather than inspecting hidden state.  | OBS-06, KNO-09, ECO-12                 | Negative search evidence, private knowledge and testimony.                          |
| Promise a meal, learn a recipe, gather ingredients, cook and deliver the actual output.                     | LAW-01, KNO-01, RES-03, FOD-03, INV-03 | Social commitment, learning, resource dependencies and typed receipts.              |
| Keep a fire alive personally, then replace that labor with an existing fuel feeder.                         | FIR-03, AUT-08, DEF-06                 | Actor-owned activity versus installed process; configuration versus new definition. |
| Host a game of hide-and-seek where participants can misunderstand or renegotiate the rules.                 | ART-08, LAW-02, COM-11                 | Shared practice without omniscient positions or forced compliance.                  |
| Follow footprints to the last reliable trace, admit uncertainty, then search a bounded region.              | REL-11, OBS-10, OBS-06                 | Tracking evidence is not a hidden-target GPS capability.                            |
| Use an existing freezing spell to create a crossing, then test whether the ice bears weight.                | MAG-04, MAK-10, NAV-01                 | Cross-family composition can fail despite individually valid actions.               |
| A touch-only construct delivers a sealed package along a known tactile route.                               | OBS-03, SYN-04, ECO-05                 | Different body, needs and senses; no fallback to human vision.                      |
| A collective splits to search, communicates partial evidence and rejoins with conflicting accounts.         | COL-04, COL-05, KNO-09                 | Group identity, limited knowledge and merge semantics.                              |
| A living building makes room for a visitor without collapsing occupied supports.                            | COL-09, BLD-05, NAV-04                 | Geometry change, simultaneous occupants and native safety boundaries.               |
| A digital citizen travels through a permitted network, rents storage and sends an in-world message.         | SYN-06, SYN-07, ECO-08                 | No assumption of feet, Euclidean space or real network privileges.                  |
| An oracle refuses a question outside its granted knowledge, while a character investigates normally.        | TMP-10, OBS-12, KNO-05                 | Fictional powers cannot launder unrestricted database access.                       |
| Two friends stage a fake argument to entertain an audience.                                                 | ART-12, SOC-04, COM-01                 | Performance and claims must not emit real combat or fabricated history.             |
| Establish a voluntary watch rotation before any institution-enforcement mechanic exists.                    | COOP-08, LAW-01, AUT-07                | Communication and individual plans can create social practice without new physics.  |
| Stop a perpetual escort, return borrowed equipment and retain the expedition goal.                          | REL-09, AUT-11, ECO-04, MND-04         | Cancellation is not rollback; goals outlive current means.                          |
| A fictional rewind changes a scene but cannot duplicate a real generation charge or restore revoked access. | TMP-11, DEF-10                         | In-world causal imagination remains below platform authority.                       |

## Related-concept index

This is navigation vocabulary, not a second mechanics specification. The [companion catalogue map](README.md#catalogue-map) groups these concepts into browsable proposals while preserving every action ID. Use [mechanics](mechanics.md), [objects](objects.md), [needs](needs.md), [traits](traits.md), [bodies](bodies-species.md), [ecology](ecology-weather.md), [institutions](institutions-politics.md), [magic](magic.md) and [creator tools](automation-creators.md) for ideas; the design owners below still own execution contracts.

| Concept cluster               | Example keys                                                     | Representative action families | Existing design owner                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Space and bodies              | topology, support, locomotion, relative-pose, clearance          | NAV, REL, BOD, VEH             | [Spatial world](../spatial-world.md)                                                                                                                                    |
| Evidence and senses           | inspection, recognition, hearing, trace-evidence, spatial-memory | OBS, COM, SEC, KNO             | [Events/perception](../events-perception-and-reactions.md), [memory](../memory-architecture.md)                                                                         |
| Agency and control            | goals, plans, repeat, wait, interrupt, handoff                   | MND, AUT, COOP                 | [Agency](../agent-agency.md), [capabilities](../action-capabilities.md)                                                                                                 |
| Matter and work               | transfer, containment, capacity, crafting, repair                | INV, OBJ, RES, MAK             | [World boundaries](../engine-and-world-boundaries.md), [module runtime](../../archive/07-technical-architecture/world-module-runtime.md)                                |
| Passive environment           | combustion, heat-transfer, fluid-flow, weather, growth           | FIR, FLU, AGR                  | [Declarations](../../archive/07-technical-architecture/declarations-and-evolution.md)                                                                                   |
| Living and synthetic needs    | body, sleep, nutrition, reservoir, injury                        | FOD, CARE, ANI, SYN            | [World boundaries](../engine-and-world-boundaries.md)                                                                                                                   |
| Social meaning and rights     | conversation, appraisal, consent, commitments, ownership         | SOC, COM, ECO, LAW             | [Conversation](../narration-and-conversations.md), [agency](../agent-agency.md)                                                                                         |
| Art and information artifacts | writing, mark-making, media, publication                         | ART, KNO                       | [Runtime art](../../archive/03-design-proposals/procedural-art-and-animation.md), [declarations](../../archive/07-technical-architecture/declarations-and-evolution.md) |
| Alternative constitutions     | spellcasting, collective-identity, local-time, graph-topology    | MAG, SYN, COL, TMP             | [Engine/world boundaries](../engine-and-world-boundaries.md)                                                                                                            |
| Authoring and installation    | invention, typed-ports, host-capabilities, definition-lifecycle  | DEF                            | [INV](../maintainers/inventions-and-world-evolution.md)                                                                                                                 |

## Inspiration and source discipline

The features below are grounded in primary developer/publisher material accessed on September 23, 2026. The design implications are our synthesis. No release-status, popularity, performance, or completeness claims are needed for this catalogue.

| Inspiration                                                                                                                                                  | Documented seed                                                                                       | OpenLegend design implication                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [RimWorld official overview](https://rimworldgame.com/)                                                                                                      | Colony work, wounds, relationships, animal training and caravans.                                     | Include bodily care, shared labor, personal motives and long pursuits, not only combat commands.                                                                                           |
| [Stardew Valley official overview](https://www.stardewvalley.net/about/)                                                                                     | Farming, fishing, crafting, community relationships, festivals and collections.                       | Include maintenance, gifts, ordinary pleasures, seasonal routines and learning.                                                                                                            |
| [Project Zomboid developer-authored Steam page](https://store.steampowered.com/app/108600/Project_Zomboid/)                                                  | Survival, crafting, barricading, cooking, farming, fishing and vehicles.                              | Tie mundane verbs to material, environmental and long-lived process consequences.                                                                                                          |
| [Minecraft official beginner guide](https://www.minecraft.net/en-us/minecraft-tips-for-beginners)                                                            | Building, farming, animal interactions, exploration and repair.                                       | Object manipulation and world alteration should compose, not require a special quest verb.                                                                                                 |
| [Minecraft developer redstone introduction](https://www.minecraft.net/en-us/creator/article/redstone)                                                        | Components can form circuits and automatic machines.                                                  | Distinguish using/configuring a mechanism from installing a genuinely new process definition.                                                                                              |
| [Valheim official overview](https://www.valheimgame.com/)                                                                                                    | Building, material gathering, ships, cultivation, environmental survival and cooperation.             | Support transport, work sites, exposure, shared expeditions and tactical movement.                                                                                                         |
| [The Sims 4 official features](https://www.ea.com/games/the-sims/the-sims-4/features)                                                                        | Personalities, aspirations, homes, visits and parties.                                                | Everyday social and expressive activity deserves first-class treatment alongside survival.                                                                                                 |
| [Ultima Online official skill index](https://uo.com/wiki/ultima-online-wiki/skills/) and [tracking](https://uo.com/wiki/ultima-online-wiki/skills/tracking/) | Broad craft/social/wilderness skills; tracking has its own target and loss rules.                     | Distinguish a new information channel from merely following visible motion.                                                                                                                |
| [GTA Online official awards listing](https://socialclub.rockstargames.com/games/gtav/pc/career/awards)                                                       | The retrieved official search excerpt names golf and tennis activities; the full page did not render. | Urban worlds should include recreation and structured activities, not only confrontation. Vehicle/service examples above are OpenLegend proposals, not claims from this inaccessible page. |

## Full entry template

Use this as an expansion record beneath the relevant domain, or split a detailed example into its own file while retaining a link from its row. Do not duplicate the runtime specification in each record.

```yaml
id: OBJ-11
label: Use an object as a sound-producing instrument
aliases: [ring the pot, tap the pot as a bell]
maturity: idea
seed_worlds: [MD, FA]
priority: 4 # Detail; this specific pot-as-bell example, not all communication
level: C
intent_examples:
  - Ring this cooking pot with this spoon to signal dinner.
participants:
  initiator: self
  instrument: spoon_ref
  target: pot_ref
  audience: currently_perceiving_receivers
world_requirements: [impact, material_acoustics, sound_propagation]
knowledge_requirements: [permitted_object_and_instrument_refs]
method_constraints: [use_this_instrument, one_signal]
related:
  mechanics: [impact, acoustics, communication]
  objects: [pot, spoon]
  needs: [social_contact]
  traits: [playfulness]
  media: [sound]
expected_observation: a sound may be perceived by receivers
not_guaranteed: [audience_hears, audience_understands, audience_approaches]
lifecycle: refer_to_capability_definition
failure_examples: [object_unreachable, incompatible_instrument, unsupported_acoustics]
implementation_owner: unassigned
evidence: []
related_actions: [COM-08, ART-06]
```

The catalogue should grow through new meanings, unusual counterexamples and useful combinations—not by treating every synonym as a new engine primitive.

## Selection guidance

DEF-01 is Core: a useful actor-proposed mechanism is part of the first OpenLegend experience, not a general physics project. KNO-01 is a Core representative of passing useful knowledge to another person; it does not guarantee learning or loyalty. DEF-02 and KNO-10 are Complete: make a successful technique reusable and test another practical use for a supported object. Known actions remain dependable alternatives, and proposal, admission and use remain distinct.

The exact intent matters. FLU-01's precise halfway fill is optional granularity; basic water collection, carrying and drinking remain foundational coverage. BLD-03's usable shelter is Core; BLD-07's specially dry bedding setup is Detail. MAK-02's useful weapon crafting is Core; MAK-04/05/06's handle repair, sharpening and patching are Detail with a small bounded scope once their prerequisites exist. Basic following and guarding can support enjoyable companionship; COOP-08's watch agreement and COOP-12's replacement administration do not precede that activity.

Existing inventory, bags, equipment and consumables are the starting point for expedition supplies. No additional “prepare supplies” feature is implied by this ranking. Preservation is Depth, not a reason to delay enemies, rewards or simple water access. CBT-13 supplies an ordinary melee-strike example. Its catalogue presence does not establish runtime support, a complete encounter or closed acceptance; use the action tracker and actual player-path evidence.

Low priority never weakens privacy, authority, consent, resource accounting, safe interruption or persistence requirements when a feature is enabled. Alternate-world entries are not forbidden; Specialist means a different world or product commitment needs an explicit contextual rerank. These scores assert no new implementation or playtest evidence.
