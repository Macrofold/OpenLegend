# Action and interaction repertoire

**Status: expandable design catalogue, not an implemented feature list or a promise to ship every example.** This document owns example intents and their cross-domain relationships. The [action capability design](../action-capabilities.md) owns translation and execution contracts. Implementation and acceptance belong to [the focused tracker](../maintainers/action-capabilities.md) and its existing AG/INV/SW/EPR/NC owners. Current runtime facts and evidence remain in [Architecture](../architecture.md) and [Verification](../verification.md).

The goal is not a menu containing every verb. It is a world in which an actor can express a precise attempt, choose a method, maintain an activity, coordinate with others, and adapt to real consequences. Ordinary use of an installed magical ability can need no invention; an apparently mundane request can require an entirely missing physical subsystem.

## Reading and extending the catalogue

There are **384 seed examples in 32 domains**. Rows are original OpenLegend design examples, not claims that the inspiration games implement those exact interactions. Most are not currently supported. Similar verbs sometimes have separate rows because their authority, participants, knowledge, persistence, or consequences differ.

| Route | Meaning when prerequisites are implemented, enabled and available to the actor                                                                                                                 |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F** | Foundation: a supplied, reusable grounding/control/agency operation. It needs no new definition, but still depends on compatible body, senses, topology and controller policy.                 |
| **U** | Use: invoke an existing world-specific capability or known technique. No new invention on this invocation; the supporting mechanic might itself be native, configured, or previously invented. |
| **C** | Compose: combine existing calls, scoped observations, constraints and ongoing activities. No new world rule is inherently needed. A missing constituent can still block execution.             |
| **D** | Define: intentionally propose, specialize, install, or change reusable mechanics/policies through the appropriate invention or owner-authoring route. Proposal is not admission or execution.  |

These are **resolution routes, not implementation status, permission levels, or G0–G3 replacements**. F/U/C generally use G0 action/plan semantics. D is classified by INV into its actual generation level. A reusable personal plan does not automatically become a world-definition change. Likewise, storing an accepted activity across saves is not invention.

The related-mechanics column uses stable **concept keys**, such as `M:combustion`, alongside object/participant nouns. Keys are cross-reference placeholders, not registered runtime family IDs, schemas, or existing files. They can later link to separate mechanics, objects, needs, traits, media and world-constitution repertoires. Do not create broken links to repositories that do not exist yet.

**Entry defaults:** maturity = idea; implementation evidence = none asserted here; priority = unassigned; applicable worlds = those satisfying the listed dependencies. The F rows are the selected reusable foundation; U/C rows are ordinary-use candidates, not a mandate to hard-code them all into the kernel. Refine priority and delivery in the owning tracker, not with hundreds of competing checkboxes here.

When adding or promoting an example, retain its ID and capture: aliases; initiator and participant roles; typed targets/parts/regions; quantities and units; preconditions; method restrictions; expected observations versus guaranteed effects; duration and interruption; failure/unknown cases; relevant mechanics, objects, needs and traits; world applicability; implementation owner; evidence/test links. Use the full entry template at the end for cases that outgrow one row. Never recycle an ID or quietly change its meaning.

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

| ID                        | Example intent                                    | Route | Related mechanics and entities             | Distinction to preserve                                                 |
| ------------------------- | ------------------------------------------------- | ----- | ------------------------------------------ | ----------------------------------------------------------------------- |
| <a id="nav-01"></a>NAV-01 | Go to the specified coordinates.                  | F     | M:topology, M:locomotion; point, support   | Bind coordinate frame and intended floor; do not teleport.              |
| <a id="nav-02"></a>NAV-02 | Walk two world units to my left.                  | F     | M:orientation, M:locomotion; actor         | Actor-relative is not camera-relative; units are explicit.              |
| <a id="nav-03"></a>NAV-03 | Return to the place where I saw Ada.              | F     | M:spatial-memory; observation, place       | Use the recorded place, not Ada's hidden current location.              |
| <a id="nav-04"></a>NAV-04 | Go onto the platform, not underneath it.          | F     | M:support, M:routes; ramp, deck            | Vertical destination identity matters.                                  |
| <a id="nav-05"></a>NAV-05 | Approach the campfire, but stop outside its heat. | C     | M:approach, M:thermal-exposure; fire       | A safe distance needs supported heat evidence or a conservative policy. |
| <a id="nav-06"></a>NAV-06 | Take the long route and avoid the bridge.         | F     | M:route-constraints; known region          | Preserve the exclusion; no hidden shortcuts.                            |
| <a id="nav-07"></a>NAV-07 | Retrace my last route.                            | F     | M:route-memory; waypoints                  | Retrace recorded travel; recheck changed physical conditions.           |
| <a id="nav-08"></a>NAV-08 | Find a path to the nearest exit I know.           | F     | M:spatial-knowledge, M:selection; exits    | Nearest among scoped candidates, not all exits in the database.         |
| <a id="nav-09"></a>NAV-09 | Climb this ladder to the roof.                    | U     | M:climbing, M:grip, M:support; ladder      | A graph edge alone does not implement climbing.                         |
| <a id="nav-10"></a>NAV-10 | Swim to the opposite bank.                        | U     | M:swimming, M:buoyancy, M:breathing; river | Swimming is not walking with a different animation.                     |
| <a id="nav-11"></a>NAV-11 | Jump across this gap.                             | U     | M:jumping, M:landing; ledge                | Arc, clearance and landing failure belong to the mechanic.              |
| <a id="nav-12"></a>NAV-12 | Enter the known portal to the library.            | U     | M:portal-traversal; portal, destination    | Use an admitted connector; do not infer unknown endpoints.              |

## REL: Relational and persistent movement

| ID                        | Example intent                                    | Route | Related mechanics and entities           | Distinction to preserve                                          |
| ------------------------- | ------------------------------------------------- | ----- | ---------------------------------------- | ---------------------------------------------------------------- |
| <a id="rel-01"></a>REL-01 | Follow the visible deer until I stop.             | F     | M:tracking-observation, M:locomotion     | Maintain an activity; no hidden-position tracking.               |
| <a id="rel-02"></a>REL-02 | Walk beside Ada rather than behind her.           | F     | M:relative-pose, M:locomotion            | Side/heading relation is distinct from scalar distance.          |
| <a id="rel-03"></a>REL-03 | Keep the cart within five world units.            | F     | M:proximity, M:locomotion; moving target | Separate desired relation from actual success.                   |
| <a id="rel-04"></a>REL-04 | Stay behind the guard without getting closer.     | F     | M:relative-pose, M:observation           | Behind needs observed heading; it does not guarantee stealth.    |
| <a id="rel-05"></a>REL-05 | Move away from the wolf until it is out of reach. | F     | M:retreat, M:reach; threat               | No claim that the wolf cannot pursue.                            |
| <a id="rel-06"></a>REL-06 | Circle this tree once.                            | F     | M:route-pattern; landmark                | Bounded route pattern, not teleportation around a target.        |
| <a id="rel-07"></a>REL-07 | Patrol the three marked lookout points.           | F     | M:waypoints, M:repeat                    | Persist cursor and stop policy; no model call per lap.           |
| <a id="rel-08"></a>REL-08 | Follow the exact path Ada walked.                 | C     | M:observed-trajectories, M:route-memory  | Requires remembered trajectory, not just her present position.   |
| <a id="rel-09"></a>REL-09 | Escort Ada, stopping when she falls behind.       | C     | M:cooperation, M:monitoring, M:movement  | Ada retains independent movement and participation.              |
| <a id="rel-10"></a>REL-10 | Intercept the runner at the gate.                 | C     | M:motion-estimation, M:routes            | Predicted interception is a hypothesis, not future-state access. |
| <a id="rel-11"></a>REL-11 | Follow the animal's scent after it vanishes.      | U     | M:scent-traces, M:sensing, M:tracking    | Needs an evidence-producing tracking mechanic.                   |
| <a id="rel-12"></a>REL-12 | Hide my approach using cover and the wind.        | C     | M:occlusion, M:noise, M:scent, M:stealth | Unsupported concealment clauses cannot be discarded.             |

## OBS: Perception and investigation

| ID                        | Example intent                                    | Route | Related mechanics and entities                 | Distinction to preserve                                                |
| ------------------------- | ------------------------------------------------- | ----- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| <a id="obs-01"></a>OBS-01 | Look more closely at this object.                 | F     | M:inspection, M:sense-detail                   | Inspection returns permitted evidence, not every component.            |
| <a id="obs-02"></a>OBS-02 | Listen for movement beyond the door.              | F     | M:hearing, M:occlusion; door                   | A sound may lack identity, exact position, or intelligible words.      |
| <a id="obs-03"></a>OBS-03 | Feel along the wall for an opening.               | C     | M:touch, M:locomotion; surface                 | Physical probing changes evidence; no visual substitution.             |
| <a id="obs-04"></a>OBS-04 | Scan this visible region for a red object.        | F     | M:scoped-selection, M:recognition              | Color must be available to this sense/observer.                        |
| <a id="obs-05"></a>OBS-05 | Watch the entrance and tell me who arrives.       | C     | M:monitoring, M:recognition, M:communication   | Watching occupies declared resources; unknown visitors stay unknown.   |
| <a id="obs-06"></a>OBS-06 | Search the room for my missing ring.              | C     | M:search-coverage, M:containment, M:inspection | Search only accessible places; record negative coverage.               |
| <a id="obs-07"></a>OBS-07 | Compare these two stones by weight.               | U     | M:measurement, M:manipulation; samples         | Needs a supported measurement or explicitly rough estimate.            |
| <a id="obs-08"></a>OBS-08 | Read the marks on this tablet.                    | U     | M:writing, M:language, M:sense-detail          | Seeing marks does not confer literacy or translation.                  |
| <a id="obs-09"></a>OBS-09 | Check whether this bridge is sound.               | C     | M:inspection, M:structures, M:inference        | Inspection can be inconclusive; no universal safety oracle.            |
| <a id="obs-10"></a>OBS-10 | Examine the tracks without disturbing them.       | C     | M:trace-evidence, M:contact-effects            | Preserve the non-disturbance constraint or explain uncertainty.        |
| <a id="obs-11"></a>OBS-11 | Test whether the object responds to a gentle tap. | C     | M:impact, M:acoustics, M:observation           | A hypothesis test produces actual evidence, not a narrated experiment. |
| <a id="obs-12"></a>OBS-12 | Investigate the last place I heard the bell.      | C     | M:auditory-memory, M:uncertainty, M:search     | A remembered sound region is not an exact hidden source.               |

## BOD: Posture and embodied expression

| ID                        | Example intent                                     | Route | Related mechanics and entities         | Distinction to preserve                                        |
| ------------------------- | -------------------------------------------------- | ----- | -------------------------------------- | -------------------------------------------------------------- |
| <a id="bod-01"></a>BOD-01 | Face Ada.                                          | F     | M:orientation, M:observation           | Turning is not moving or guaranteed eye contact.               |
| <a id="bod-02"></a>BOD-02 | Sit on this bench.                                 | U     | M:posture, M:support, M:occupancy      | Requires suitable body and an available stance.                |
| <a id="bod-03"></a>BOD-03 | Lie down under the awning.                         | C     | M:posture, M:shelter, M:movement       | Lying down is distinct from falling asleep.                    |
| <a id="bod-04"></a>BOD-04 | Crouch while crossing the low passage.             | C     | M:posture, M:clearance                 | Reduced collision height must be real and admitted.            |
| <a id="bod-05"></a>BOD-05 | Crawl beneath the table.                           | U     | M:locomotion-modes, M:clearance        | A new animation does not grant a new body profile.             |
| <a id="bod-06"></a>BOD-06 | Point toward the smoke.                            | U     | M:gesture, M:reference, M:perception   | Observers may perceive direction without knowing the referent. |
| <a id="bod-07"></a>BOD-07 | Wave to the person across the river.               | U     | M:gesture, M:visibility                | Signaling does not guarantee recognition or response.          |
| <a id="bod-08"></a>BOD-08 | Brace myself against the railing.                  | U     | M:contact, M:force, M:balance          | Bracing needs physical effects; not an effect-free emote.      |
| <a id="bod-09"></a>BOD-09 | Hold my breath while passing through smoke.        | U     | M:breathing, M:exposure, M:duration    | Bounded capacity and involuntary consequences still apply.     |
| <a id="bod-10"></a>BOD-10 | Close my eyes and listen.                          | C     | M:sense-control, M:hearing             | Suppressing sight does not increase hearing automatically.     |
| <a id="bod-11"></a>BOD-11 | Lean out just far enough to see around the corner. | C     | M:pose, M:occlusion, M:exposure        | New viewpoint requires supported bodily motion.                |
| <a id="bod-12"></a>BOD-12 | Keep holding the door while speaking.              | C     | M:force, M:resource-channels, M:speech | Concurrency is capability-declared, not implied by prose.      |

## COM: Communication and signals

| ID                        | Example intent                                  | Route | Related mechanics and entities             | Distinction to preserve                                        |
| ------------------------- | ----------------------------------------------- | ----- | ------------------------------------------ | -------------------------------------------------------------- |
| <a id="com-01"></a>COM-01 | Tell Ada what I actually saw.                   | U     | M:speech, M:memory-provenance              | Report preserves observation versus inference.                 |
| <a id="com-02"></a>COM-02 | Ask the stranger their name.                    | U     | M:conversation, M:identity                 | The reply may be absent, false, or misunderstood.              |
| <a id="com-03"></a>COM-03 | Whisper this warning only to Ada.               | U     | M:acoustic-channel, M:privacy              | Do not downgrade to audible public speech.                     |
| <a id="com-04"></a>COM-04 | Shout for help.                                 | U     | M:vocalization, M:hearing                  | Audible range and actual listeners belong to perception.       |
| <a id="com-05"></a>COM-05 | Ask Ada to follow me.                           | U     | M:request, M:conversation, M:agency        | A request cannot directly start Ada's movement.                |
| <a id="com-06"></a>COM-06 | Join their conversation without interrupting.   | C     | M:conversation-membership, M:turn-taking   | Joining grants no earlier private transcript.                  |
| <a id="com-07"></a>COM-07 | Leave the conversation but stay nearby.         | U     | M:conversation-membership, M:proximity     | Leaving membership need not suppress overhearing.              |
| <a id="com-08"></a>COM-08 | Knock three times as our agreed signal.         | C     | M:impact, M:acoustics, M:shared-convention | Sound production and interpreting the convention are separate. |
| <a id="com-09"></a>COM-09 | Flash the lantern to signal the boat.           | C     | M:light, M:device-control, M:visibility    | No radio-like delivery guarantee.                              |
| <a id="com-10"></a>COM-10 | Write a note and leave it where Ada will look.  | C     | M:writing, M:placement, M:beliefs          | Her future attention is not known or controllable.             |
| <a id="com-11"></a>COM-11 | Relay the message without revealing its source. | C     | M:communication, M:disclosure              | Omit source intentionally; retain private provenance.          |
| <a id="com-12"></a>COM-12 | Warn everyone I can currently reach.            | C     | M:audience-selection, M:communication      | Scoped finite audience, not a global broadcast by wish.        |

## MND: Private cognition and intentions

| ID                        | Example intent                                    | Route | Related mechanics and entities    | Distinction to preserve                                            |
| ------------------------- | ------------------------------------------------- | ----- | --------------------------------- | ------------------------------------------------------------------ |
| <a id="mnd-01"></a>MND-01 | Do nothing new; continue my work.                 | F     | M:agency-continuation             | Empty output is not cancellation or a failed decision.             |
| <a id="mnd-02"></a>MND-02 | Make finding shelter my current goal.             | F     | M:operational-goals               | A goal is not a built shelter or mandatory plan.                   |
| <a id="mnd-03"></a>MND-03 | Pause my expedition and find food first.          | F     | M:goals, M:plans, M:interruption  | Suspend intent separately from cancelling physical work.           |
| <a id="mnd-04"></a>MND-04 | Abandon this plan but keep the larger goal.       | F     | M:plan-lifecycle                  | Do not erase consumed resources or prior commitments.              |
| <a id="mnd-05"></a>MND-05 | Reconsider whether I still trust that account.    | F     | M:reflection, M:belief-provenance | Revising belief does not rewrite historical events.                |
| <a id="mnd-06"></a>MND-06 | Remember where I left the basket.                 | F     | M:memory, M:spatial-evidence      | Record permitted evidence; no guaranteed perfect memory.           |
| <a id="mnd-07"></a>MND-07 | Imagine a safer way across the stream.            | F     | M:hypothesis, M:planning          | Imagining creates no bridge or successful test.                    |
| <a id="mnd-08"></a>MND-08 | Keep this suspicion private.                      | F     | M:private-thought, M:disclosure   | Private storage is distinct from deception of a listener.          |
| <a id="mnd-09"></a>MND-09 | Resume my interrupted work when it is safe.       | F     | M:resumption, M:guard             | Safety must bind a supported condition; revalidate resources.      |
| <a id="mnd-10"></a>MND-10 | Mark my personal goal satisfied.                  | F     | M:goal-assessment                 | Subjective completion is not engine-evidenced success.             |
| <a id="mnd-11"></a>MND-11 | Withdraw the unresolved attempt I no longer want. | F     | M:attempt-lifecycle               | Release pending intent without stopping unrelated actions.         |
| <a id="mnd-12"></a>MND-12 | Review this decision after sunrise.               | F     | M:review-cues, M:simulation-clock | A review cue permits reconsideration; it need not force inference. |

## INV: Possession, transfer and containment

| ID                        | Example intent                             | Route | Related mechanics and entities             | Distinction to preserve                                          |
| ------------------------- | ------------------------------------------ | ----- | ------------------------------------------ | ---------------------------------------------------------------- |
| <a id="inv-01"></a>INV-01 | Pick up this loose stone.                  | U     | M:grasp, M:inventory, M:mass               | Loose-item pickup is not gathering new material from a source.   |
| <a id="inv-02"></a>INV-02 | Put the stone exactly here.                | U     | M:placement, M:release, M:support          | Placement needs a real location and collision semantics.         |
| <a id="inv-03"></a>INV-03 | Give Ada two berries.                      | U     | M:transfer, M:quantity, M:participation    | Transfer is not eating, gifting sentiment, or forced possession. |
| <a id="inv-04"></a>INV-04 | Offer Ada a berry and wait for her answer. | C     | M:offer, M:consent, M:wait                 | An offer does not transfer ownership or consume food.            |
| <a id="inv-05"></a>INV-05 | Leave food beside Ada without waking her.  | C     | M:placement, M:noise, M:sleep              | Ground placement is not a forced handover or feeding.            |
| <a id="inv-06"></a>INV-06 | Take three logs from the open basket.      | U     | M:containment, M:transfer, M:quantity      | Accessibility, custody and in-world theft rules are distinct.    |
| <a id="inv-07"></a>INV-07 | Put dry tinder in the waterproof pouch.    | U     | M:containment, M:moisture, M:capacity      | A descriptive pouch name does not guarantee waterproofing.       |
| <a id="inv-08"></a>INV-08 | Split this stack evenly between our packs. | C     | M:stacking, M:integer-quantity, M:capacity | Handle indivisible remainder explicitly.                         |
| <a id="inv-09"></a>INV-09 | Keep one meal and donate the rest.         | C     | M:selection, M:reservation, M:transfer     | Recheck the retained amount at each transfer.                    |
| <a id="inv-10"></a>INV-10 | Carry the chest without opening it.        | U     | M:load, M:containment, M:locomotion        | Moving a container need not reveal its contents.                 |
| <a id="inv-11"></a>INV-11 | Sort these known items by material.        | C     | M:classification, M:placement              | Unknown material remains unknown; no hidden-property sort.       |
| <a id="inv-12"></a>INV-12 | Equip the launcher I just crafted.         | U     | M:equipment, M:typed-results               | Bind the actual produced item, not a guessed future ID.          |

## OBJ: Object operation and manipulation

| ID                        | Example intent                               | Route | Related mechanics and entities         | Distinction to preserve                                                   |
| ------------------------- | -------------------------------------------- | ----- | -------------------------------------- | ------------------------------------------------------------------------- |
| <a id="obj-01"></a>OBJ-01 | Open the door halfway.                       | U     | M:hinges, M:state-control, M:collision | Continuous opening needs support; binary doors cannot fake halfway.       |
| <a id="obj-02"></a>OBJ-02 | Close the gate behind me.                    | C     | M:traversal, M:device-control          | Close after actual crossing, not after command admission.                 |
| <a id="obj-03"></a>OBJ-03 | Unlock the box with this key.                | U     | M:locks, M:key-compatibility           | Exact instrument and lock must match.                                     |
| <a id="obj-04"></a>OBJ-04 | Turn the valve until the flow slows.         | C     | M:valves, M:fluid-flow, M:feedback     | Observe a supported quantity; do not assign the outcome.                  |
| <a id="obj-05"></a>OBJ-05 | Pull this lever once.                        | U     | M:mechanisms, M:actuation              | Actuation and downstream effects have separate receipts.                  |
| <a id="obj-06"></a>OBJ-06 | Push the crate away from the entrance.       | U     | M:force, M:friction, M:collision       | Not an unrestricted position setter.                                      |
| <a id="obj-07"></a>OBJ-07 | Wedge the door open with a stone.            | C     | M:contact, M:geometry, M:placement     | A working wedge requires physical or admitted coarse support.             |
| <a id="obj-08"></a>OBJ-08 | Tie this rope to the post.                   | U     | M:attachment, M:tension, M:knots       | Binding creates a typed relationship, not arbitrary parentage.            |
| <a id="obj-09"></a>OBJ-09 | Untie the boat without cutting the rope.     | U     | M:attachment, M:tool-use               | Preserve reusable rope and exact release method.                          |
| <a id="obj-10"></a>OBJ-10 | Cover the mirror with cloth.                 | U     | M:covering, M:optics, M:attachment     | Covering may alter visibility without changing mirror identity.           |
| <a id="obj-11"></a>OBJ-11 | Ring the cooking pot like a bell.            | C     | M:impact, M:acoustics; pot, striker    | Cross-use is allowed only through supported acoustic/material interfaces. |
| <a id="obj-12"></a>OBJ-12 | Balance the stick across these two supports. | U     | M:support, M:balance, M:placement      | A novel arrangement can use existing physics without a recipe invention.  |

## RES: Gathering and material acquisition

| ID                        | Example intent                                        | Route | Related mechanics and entities        | Distinction to preserve                                      |
| ------------------------- | ----------------------------------------------------- | ----- | ------------------------------------- | ------------------------------------------------------------ |
| <a id="res-01"></a>RES-01 | Gather berries from this bush.                        | U     | M:gathering, M:finite-supply          | Native batch size and actual yield govern quantity.          |
| <a id="res-02"></a>RES-02 | Pick only the ripe berries.                           | U     | M:ripeness, M:selection, M:gathering  | Requires represented, observable ripeness.                   |
| <a id="res-03"></a>RES-03 | Gather enough reeds for this known recipe.            | C     | M:recipe-knowledge, M:quantities      | Known recipe prerequisites, not a hidden invention solution. |
| <a id="res-04"></a>RES-04 | Collect fallen branches without cutting living trees. | C     | M:resource-provenance, M:selection    | Preserve the source restriction.                             |
| <a id="res-05"></a>RES-05 | Cut a branch from this tree.                          | U     | M:cutting, M:plant-body, M:tools      | A branch removal may affect the living tree.                 |
| <a id="res-06"></a>RES-06 | Dig clay from the bank.                               | U     | M:excavation, M:terrain-material      | Resource debit and terrain change must be coherent.          |
| <a id="res-07"></a>RES-07 | Mine this exposed vein.                               | U     | M:mining, M:hardness, M:tools         | No extraction from an unseen vein chosen by global search.   |
| <a id="res-08"></a>RES-08 | Gather rainwater in this bowl.                        | U     | M:weather, M:collection, M:capacity   | Requires actual rain and an admitted collection surface.     |
| <a id="res-09"></a>RES-09 | Harvest the animal's remains.                         | U     | M:remains, M:tools, M:finite-yields   | Remains are not an inexhaustible inventory source.           |
| <a id="res-10"></a>RES-10 | Salvage usable parts from this wreck.                 | C     | M:disassembly, M:damage, M:inspection | Usable parts depend on actual surviving structure.           |
| <a id="res-11"></a>RES-11 | Collect shells until the basket is full.              | C     | M:capacity, M:repeat, M:selection     | Container fullness is a supported stop condition.            |
| <a id="res-12"></a>RES-12 | Leave enough seeds for the patch to recover.          | C     | M:ecology, M:forecast, M:harvesting   | Conservation intent may exceed known ecological prediction.  |

## MAK: Making, repair and disassembly

| ID                        | Example intent                                  | Route | Related mechanics and entities           | Distinction to preserve                                           |
| ------------------------- | ----------------------------------------------- | ----- | ---------------------------------------- | ----------------------------------------------------------------- |
| <a id="mak-01"></a>MAK-01 | Twist these prepared fibers into cord.          | U     | M:known-preparation, M:work              | Preserve input stage, amounts and real work.                      |
| <a id="mak-02"></a>MAK-02 | Craft the sling using the technique I know.     | U     | M:recipe, M:knowledge, M:crafting        | Knowing a recipe is not owning its output.                        |
| <a id="mak-03"></a>MAK-03 | Make three copies of the same tool.             | C     | M:repeat, M:crafting, M:resources        | Each copy consumes inputs and has distinct instance identity.     |
| <a id="mak-04"></a>MAK-04 | Repair only the broken handle.                  | U     | M:parts, M:repair, M:damage              | Part repair must not restore the entire object for free.          |
| <a id="mak-05"></a>MAK-05 | Sharpen this blade without changing its shape.  | U     | M:wear, M:abrasion, M:tool-state         | Supported maintenance effects, not arbitrary damage bonuses.      |
| <a id="mak-06"></a>MAK-06 | Patch the leaking seam with the known method.   | U     | M:repair, M:sealing, M:materials         | Effect depends on actual compatibility and work.                  |
| <a id="mak-07"></a>MAK-07 | Dismantle the trap and preserve its spring.     | U     | M:assembly, M:disassembly, M:parts       | Recovered yields need not equal original construction inputs.     |
| <a id="mak-08"></a>MAK-08 | Use the admitted larger version of this basket. | U     | M:definition-versions, M:capacity        | Choose a known version; do not edit dimensions during invocation. |
| <a id="mak-09"></a>MAK-09 | Substitute this known compatible binding.       | U     | M:typed-compatibility, M:recipe-ports    | Only substitutions permitted by the recipe's contract.            |
| <a id="mak-10"></a>MAK-10 | Test the prototype with one small load first.   | C     | M:experimentation, M:load, M:measurement | A test is real activity and can fail or damage the object.        |
| <a id="mak-11"></a>MAK-11 | Copy the visible pattern onto another pot.      | C     | M:mark-making, M:observation, M:media    | Observed pattern does not reveal hidden manufacturing knowledge.  |
| <a id="mak-12"></a>MAK-12 | Finish the accepted construction after I rest.  | C     | M:work-resumption, M:rest, M:plans       | Resume only supported retained progress; no refunds by narration. |

## BLD: Construction, terrain and placement

| ID                        | Example intent                                          | Route | Related mechanics and entities            | Distinction to preserve                                                 |
| ------------------------- | ------------------------------------------------------- | ----- | ----------------------------------------- | ----------------------------------------------------------------------- |
| <a id="bld-01"></a>BLD-01 | Place a plank across this narrow ditch.                 | U     | M:placement, M:support, M:traversal       | Existing support rules may make a bridge without a named bridge recipe. |
| <a id="bld-02"></a>BLD-02 | Stack stones into a low wall.                           | C     | M:placement, M:stability, M:collision     | Accumulated geometry must actually obstruct or support.                 |
| <a id="bld-03"></a>BLD-03 | Build this shelter from the known plan.                 | C     | M:construction, M:recipe, M:work          | Long work is staged; admission does not spawn a finished shelter.       |
| <a id="bld-04"></a>BLD-04 | Dig a drainage channel away from the house.             | C     | M:excavation, M:fluid-topology            | Drainage needs fluid consequences, not only trench visuals.             |
| <a id="bld-05"></a>BLD-05 | Brace the roof before removing that beam.               | C     | M:load-bearing, M:sequencing, M:support   | Enforce causal order and preserve collapse risk.                        |
| <a id="bld-06"></a>BLD-06 | Barricade the entrance using spare furniture.           | C     | M:placement, M:collision, M:access        | Requires actual obstruction, not a lock-state shortcut.                 |
| <a id="bld-07"></a>BLD-07 | Make a dry sleeping spot under this overhang.           | C     | M:shelter, M:bedding, M:moisture          | Dryness depends on exposure and materials.                              |
| <a id="bld-08"></a>BLD-08 | Hang a curtain for privacy.                             | C     | M:attachment, M:occlusion, M:acoustics    | Visual privacy is not automatically soundproofing.                      |
| <a id="bld-09"></a>BLD-09 | Build steps accessible to the small construct.          | C     | M:body-profiles, M:routes, M:construction | Accessibility is relative to an actual locomotion profile.              |
| <a id="bld-10"></a>BLD-10 | Move the hearth without destroying its keepsake stones. | C     | M:disassembly, M:identity, M:construction | Preserve specified instances, not merely equivalent material.           |
| <a id="bld-11"></a>BLD-11 | Mark out a garden before committing materials.          | U     | M:designation, M:marking, M:planning      | A proposal or marker does not alter terrain or reserve all resources.   |
| <a id="bld-12"></a>BLD-12 | Build around the tree rather than removing it.          | C     | M:geometry-constraints, M:ecology         | Preserve the protected object during all steps.                         |

## FIR: Fire, heat and energy

| ID                        | Example intent                                     | Route | Related mechanics and entities              | Distinction to preserve                                                  |
| ------------------------- | -------------------------------------------------- | ----- | ------------------------------------------- | ------------------------------------------------------------------------ |
| <a id="fir-01"></a>FIR-01 | Light this tinder from the existing flame.         | U     | M:ignition, M:combustion, M:heat-transfer   | Requires source, contact/exposure and eligible fuel.                     |
| <a id="fir-02"></a>FIR-02 | Add one dry log to the fire.                       | U     | M:finite-fuel, M:placement, M:moisture      | Adding fuel is not an arbitrary extension of fire lifetime.              |
| <a id="fir-03"></a>FIR-03 | Keep the fire burning until dawn.                  | C     | M:monitoring, M:refueling, M:time           | Sustained work and fuel consumption remain real.                         |
| <a id="fir-04"></a>FIR-04 | Smother the small flame with this damp cloth.      | C     | M:covering, M:oxygen, M:heat, M:materials   | No guaranteed extinguishing without an applicable mechanic.              |
| <a id="fir-05"></a>FIR-05 | Pour water on the burning branches.                | U     | M:fluid-transfer, M:thermal-effects         | Water amount and fire response are world-specific.                       |
| <a id="fir-06"></a>FIR-06 | Carry an ember to the other camp.                  | C     | M:containment, M:combustion, M:movement     | Ember cooling and exposure continue during travel.                       |
| <a id="fir-07"></a>FIR-07 | Warm my hands without touching the flame.          | U     | M:thermal-exposure, M:body                  | Temperature benefit and injury risk come from the body/world model.      |
| <a id="fir-08"></a>FIR-08 | Dry my clothes near the fire.                      | C     | M:evaporation, M:heat, M:placement          | Drying is not instant state assignment.                                  |
| <a id="fir-09"></a>FIR-09 | Remove nearby fuel to make a firebreak.            | C     | M:combustion-spread, M:terrain, M:gathering | A firebreak need not guarantee containment.                              |
| <a id="fir-10"></a>FIR-10 | Shade the ice so it melts more slowly.             | C     | M:radiation, M:phase-change, M:occlusion    | Shade has thermal effect only if the world models it.                    |
| <a id="fir-11"></a>FIR-11 | Recharge from this compatible capacitor.           | U     | M:reservoir-transfer, M:compatibility       | Finite source and compatible units; not necessarily electricity physics. |
| <a id="fir-12"></a>FIR-12 | Redirect available power to the greenhouse heater. | U     | M:energy-network, M:device-control          | Conservation/source policy and network capacity are explicit.            |

## FLU: Fluids, mixtures and environment

| ID                        | Example intent                                      | Route | Related mechanics and entities         | Distinction to preserve                                                |
| ------------------------- | --------------------------------------------------- | ----- | -------------------------------------- | ---------------------------------------------------------------------- |
| <a id="flu-01"></a>FLU-01 | Fill the cup halfway from the jug.                  | U     | M:fluid-transfer, M:capacity, M:units  | Preserve source amount, mixture identity and requested fill.           |
| <a id="flu-02"></a>FLU-02 | Pour the remaining water into the shared tank.      | U     | M:transfer, M:containment              | Track actual transferred quantity and overflow.                        |
| <a id="flu-03"></a>FLU-03 | Mix these known ingredients in the bowl.            | U     | M:mixtures, M:compatibility            | Mixing does not imply a useful or safe product.                        |
| <a id="flu-04"></a>FLU-04 | Filter muddy water with this admitted filter.       | U     | M:filtration, M:material-selectivity   | Clarifying appearance does not prove potability.                       |
| <a id="flu-05"></a>FLU-05 | Use cloth as a coarse sieve.                        | U     | M:permeability, M:particle-size        | Cross-use works through supported interfaces, not a new noun shortcut. |
| <a id="flu-06"></a>FLU-06 | Stop the leak with the known plug.                  | U     | M:sealing, M:pressure, M:contact       | A plug must match the opening and load conditions.                     |
| <a id="flu-07"></a>FLU-07 | Open the vents to clear the smoke.                  | C     | M:ventilation, M:gas-flow, M:devices   | Opening is direct; smoke clearing is a process outcome.                |
| <a id="flu-08"></a>FLU-08 | Divert the stream into this irrigation channel.     | C     | M:flow, M:terrain, M:gate-control      | Downstream effects persist independently of actor attention.           |
| <a id="flu-09"></a>FLU-09 | Skim the floating debris without emptying the pond. | U     | M:buoyancy, M:selection, M:tools       | Preserve water volume and the selective-removal method.                |
| <a id="flu-10"></a>FLU-10 | Wait for the sediment to settle, then decant.       | C     | M:settling, M:observation, M:transfer  | Observation/deadline, not fictitious guaranteed completion time.       |
| <a id="flu-11"></a>FLU-11 | Collect a sample without contaminating the source.  | U     | M:sampling, M:contamination            | Contamination constraint needs mechanic support.                       |
| <a id="flu-12"></a>FLU-12 | Melt the frozen latch using existing heat.          | C     | M:phase-change, M:heat, M:device-state | Thawing can damage the object; no unconditional unlock.                |

## FOD: Food, consumption and domestic care

| ID                        | Example intent                                     | Route | Related mechanics and entities                  | Distinction to preserve                                           |
| ------------------------- | -------------------------------------------------- | ----- | ----------------------------------------------- | ----------------------------------------------------------------- |
| <a id="fod-01"></a>FOD-01 | Eat one berry from my pack.                        | U     | M:consumption, M:nutrition                      | Native execution needs no thought, goal, or invention.            |
| <a id="fod-02"></a>FOD-02 | Drink from this known safe supply.                 | U     | M:consumption, M:hydration, M:water             | Safe is evidence/policy-dependent, not a model certification.     |
| <a id="fod-03"></a>FOD-03 | Cook the raw food at the lit fire.                 | U     | M:cooking, M:heat, M:work                       | Bind actual output; no eating a future imaginary item.            |
| <a id="fod-04"></a>FOD-04 | Share the meal equally but save Ada's portion.     | C     | M:portioning, M:reservation, M:transfer         | Exact quantity and ownership/custody remain separate.             |
| <a id="fod-05"></a>FOD-05 | Prepare a meal using only plants.                  | C     | M:recipe-knowledge, M:ingredient-classification | Preserve ingredient restriction; unknown provenance may block.    |
| <a id="fod-06"></a>FOD-06 | Preserve the surplus with the technique I learned. | U     | M:preservation, M:spoilage, M:work              | Method-specific costs and actual shelf-life effects.              |
| <a id="fod-07"></a>FOD-07 | Serve the oldest suitable food first.              | C     | M:age-evidence, M:selection, M:serving          | No unseen spoilage knowledge; suitability can be uncertain.       |
| <a id="fod-08"></a>FOD-08 | Wash this bowl before reusing it.                  | C     | M:cleaning, M:water, M:residue                  | A cosmetic clean texture is not contamination removal.            |
| <a id="fod-09"></a>FOD-09 | Sweep the broken pottery away from the path.       | C     | M:debris, M:tools, M:placement                  | Debris goes somewhere; it does not disappear without a sink rule. |
| <a id="fod-10"></a>FOD-10 | Rest by the fire until I feel recovered.           | C     | M:rest, M:body-feedback, M:exposure             | Uses actual body feedback, not wall-clock model latency.          |
| <a id="fod-11"></a>FOD-11 | Mend and dry the bedding before sleeping.          | C     | M:repair, M:moisture, M:sleep                   | Multiple real steps; failure blocks dependent sleep setup.        |
| <a id="fod-12"></a>FOD-12 | Make the room welcoming for our guest.             | C     | M:placement, M:cleaning, M:social-appraisal     | An open goal needs a chosen method; welcome is not guaranteed.    |

## AGR: Plants, cultivation and ecology

| ID                        | Example intent                                    | Route | Related mechanics and entities                   | Distinction to preserve                                         |
| ------------------------- | ------------------------------------------------- | ----- | ------------------------------------------------ | --------------------------------------------------------------- |
| <a id="agr-01"></a>AGR-01 | Plant these seeds in the prepared patch.          | U     | M:planting, M:soil, M:finite-seeds               | Planting is not instant crop growth.                            |
| <a id="agr-02"></a>AGR-02 | Water only the dry beds.                          | C     | M:soil-moisture, M:selection, M:water            | Moisture must be observable or measured.                        |
| <a id="agr-03"></a>AGR-03 | Weed around the seedlings without uprooting them. | U     | M:plant-recognition, M:selective-removal         | Identification can be uncertain; care constraint persists.      |
| <a id="agr-04"></a>AGR-04 | Prune this branch to let more light through.      | C     | M:plant-body, M:light, M:tools                   | Light change requires real geometry or coarse canopy mechanics. |
| <a id="agr-05"></a>AGR-05 | Transplant the sapling with its roots intact.     | U     | M:roots, M:excavation, M:plant-health            | Handling damage and survival remain possible.                   |
| <a id="agr-06"></a>AGR-06 | Protect the plants from tonight's expected frost. | C     | M:weather-knowledge, M:covering, M:thermal       | Forecast is uncertain; no access to future weather RNG.         |
| <a id="agr-07"></a>AGR-07 | Harvest each crop when it becomes ripe.           | C     | M:growth, M:monitoring, M:repeat                 | Persistent scoped job, not a global endless entity scan.        |
| <a id="agr-08"></a>AGR-08 | Compost the compatible scraps.                    | U     | M:decomposition, M:mixtures, M:process           | A process continues with its own conditions and limits.         |
| <a id="agr-09"></a>AGR-09 | Pollinate this flower using the known technique.  | U     | M:reproduction, M:plant-compatibility            | Contact does not guarantee fertilization.                       |
| <a id="agr-10"></a>AGR-10 | Save seeds from the healthiest observed plants.   | C     | M:selection, M:traits, M:harvesting              | Observed phenotype is not perfect genetic knowledge.            |
| <a id="agr-11"></a>AGR-11 | Restore the damaged riverbank with native plants. | C     | M:ecology, M:planting, M:erosion                 | Long-term ecosystem outcome is a goal, not direct mutation.     |
| <a id="agr-12"></a>AGR-12 | Leave this patch untouched as a refuge.           | C     | M:designation, M:personal-policy, M:institutions | A designation does not force others to comply.                  |

## ANI: Animals and organism behavior

| ID                        | Example intent                                               | Route | Related mechanics and entities               | Distinction to preserve                                         |
| ------------------------- | ------------------------------------------------------------ | ----- | -------------------------------------------- | --------------------------------------------------------------- |
| <a id="ani-01"></a>ANI-01 | Approach the deer slowly and offer food.                     | C     | M:movement-modes, M:offer, M:animal-response | No guaranteed taming or friendliness.                           |
| <a id="ani-02"></a>ANI-02 | Lead the trained animal to its pen.                          | C     | M:training, M:signals, M:movement            | The animal's controller responds under its own rules.           |
| <a id="ani-03"></a>ANI-03 | Herd the flock away from the road.                           | C     | M:herding, M:collective-motion, M:signals    | May require several agents and bounded target groups.           |
| <a id="ani-04"></a>ANI-04 | Remove the thorn from the animal's paw.                      | U     | M:body-parts, M:care, M:cooperation          | Handling acceptance, tools and injury mechanics matter.         |
| <a id="ani-05"></a>ANI-05 | Groom the animal and check for injuries.                     | C     | M:grooming, M:inspection, M:trust            | Grooming and diagnostic evidence are separate results.          |
| <a id="ani-06"></a>ANI-06 | Release the trapped creature.                                | C     | M:trap-state, M:restraint, M:access          | Release does not guarantee it stays, thanks, or forgives.       |
| <a id="ani-07"></a>ANI-07 | Teach the dog our return signal.                             | U     | M:animal-learning, M:signals, M:practice     | A session is not instant mastery.                               |
| <a id="ani-08"></a>ANI-08 | As a deer, browse nearby leaves while staying near the herd. | C     | M:species-diet, M:proximity, M:consumption   | No human hands, inventory, or verbal goal requirement.          |
| <a id="ani-09"></a>ANI-09 | As a bird, perch above the disturbance.                      | U     | M:flight, M:perching, M:support              | Actual altitude and landing capacity are required.              |
| <a id="ani-10"></a>ANI-10 | As a predator, stalk and wait for an opening.                | C     | M:stealth, M:observation, M:hunting          | Prediction and attack success are not known in advance.         |
| <a id="ani-11"></a>ANI-11 | Build a nest from the available fibers.                      | C     | M:species-manipulation, M:construction       | Uses the organism's supported body, not a human craft shortcut. |
| <a id="ani-12"></a>ANI-12 | Migrate with the group when the season changes.              | C     | M:seasons, M:group-signals, M:routes         | Group membership does not create a shared omniscient mind.      |

## CARE: Bodily care and rescue

These are fictional simulation interactions, not real-world medical instructions.

| ID                          | Example intent                                            | Route | Related mechanics and entities                 | Distinction to preserve                                         |
| --------------------------- | --------------------------------------------------------- | ----- | ---------------------------------------------- | --------------------------------------------------------------- |
| <a id="care-01"></a>CARE-01 | Ask whether Ada wants help with her injury.               | U     | M:conversation, M:consent                      | Asking is not treatment or a diagnosis.                         |
| <a id="care-02"></a>CARE-02 | Apply the known bandaging treatment.                      | U     | M:wounds, M:treatment, M:supplies              | Method, body part and finite materials are explicit.            |
| <a id="care-03"></a>CARE-03 | Carry the unconscious person out of danger.               | U     | M:carrying, M:load, M:body, M:emergency-policy | Inability to consent and emergency authority are world rules.   |
| <a id="care-04"></a>CARE-04 | Drag the injured construct to its charger.                | C     | M:dragging, M:body, M:reservoir                | Robot care does not assume biological healing.                  |
| <a id="care-05"></a>CARE-05 | Bring water rather than trying to treat the wound.        | C     | M:delivery, M:requested-method                 | Do not substitute an unsolicited medical intervention.          |
| <a id="care-06"></a>CARE-06 | Keep watch over the sleeping child.                       | C     | M:monitoring, M:caregiving, M:attention        | Watching is ongoing work, not guaranteed protection.            |
| <a id="care-07"></a>CARE-07 | Wake Ada gently when the meal is ready.                   | C     | M:sleep, M:signals, M:wait                     | A wake attempt may fail; no direct consciousness setter.        |
| <a id="care-08"></a>CARE-08 | Guide the disoriented traveler to a familiar place.       | C     | M:cooperation, M:spatial-memory                | The traveler keeps their own agency and knowledge.              |
| <a id="care-09"></a>CARE-09 | Replace the damaged module with a compatible spare.       | U     | M:repair, M:body-modules, M:compatibility      | Identity continuity and disabled functions need explicit rules. |
| <a id="care-10"></a>CARE-10 | Recover the body and arrange a burial.                    | C     | M:remains, M:carrying, M:ritual, M:terrain     | Physical burial and social meaning are distinct.                |
| <a id="care-11"></a>CARE-11 | Comfort the grieving person without demanding a response. | U     | M:speech, M:appraisal, M:relationship          | Comfort is attempted; grief cannot be set to zero.              |
| <a id="care-12"></a>CARE-12 | Stay with the patient until another caregiver takes over. | C     | M:handoff, M:monitoring, M:participation       | Handoff requires actual acceptance, not a named absent helper.  |

## SOC: Relationships and social attempts

| ID                        | Example intent                                            | Route | Related mechanics and entities                 | Distinction to preserve                                    |
| ------------------------- | --------------------------------------------------------- | ----- | ---------------------------------------------- | ---------------------------------------------------------- |
| <a id="soc-01"></a>SOC-01 | Apologize for what I did.                                 | U     | M:speech, M:memory, M:appraisal                | Apology does not imply forgiveness.                        |
| <a id="soc-02"></a>SOC-02 | Compliment the craftwork sincerely.                       | U     | M:speech, M:belief, M:relationship             | Expressed sincerity is not a target-state guarantee.       |
| <a id="soc-03"></a>SOC-03 | Challenge Ada's account using the evidence I saw.         | U     | M:argument, M:evidence-provenance              | Neither agreement nor objective truth is forced.           |
| <a id="soc-04"></a>SOC-04 | Tell a lie about where I was.                             | U     | M:speech, M:belief-provenance                  | A false claim cannot rewrite location history.             |
| <a id="soc-05"></a>SOC-05 | Refuse the invitation politely.                           | U     | M:conversation, M:participation                | Refusal should not create a hidden social contract.        |
| <a id="soc-06"></a>SOC-06 | Ask permission before entering their home.                | C     | M:request, M:access, M:institutions            | Social permission and platform authorization are separate. |
| <a id="soc-07"></a>SOC-07 | Invite the lonely traveler to share dinner.               | U     | M:invitation, M:appraisal                      | Loneliness must be known or inferred, not read privately.  |
| <a id="soc-08"></a>SOC-08 | Ask for a hug and respect a refusal.                      | C     | M:consent, M:contact, M:gesture                | Contact waits for the applicable participation rule.       |
| <a id="soc-09"></a>SOC-09 | Court another consenting adult through shared activities. | C     | M:adult-relationships, M:consent, M:activities | Affection and reciprocity remain independently authored.   |
| <a id="soc-10"></a>SOC-10 | Introduce two people who have not met.                    | U     | M:identity-disclosure, M:conversation          | Introduction shares only allowed identity information.     |
| <a id="soc-11"></a>SOC-11 | Mediate their disagreement without choosing for them.     | C     | M:conversation, M:turn-taking, M:agreements    | No direct edit to either participant's intentions.         |
| <a id="soc-12"></a>SOC-12 | Rebuild trust by consistently keeping my promises.        | C     | M:goals, M:commitments, M:appraisal            | A long pursuit, not a relationship-score command.          |

## COOP: Cooperation and shared activities

| ID                          | Example intent                                               | Route | Related mechanics and entities                | Distinction to preserve                                         |
| --------------------------- | ------------------------------------------------------------ | ----- | --------------------------------------------- | --------------------------------------------------------------- |
| <a id="coop-01"></a>COOP-01 | Ask Ada to hold the beam while I fasten it.                  | C     | M:joint-work, M:roles, M:attachments          | Both participants must actually be ready and active.            |
| <a id="coop-02"></a>COOP-02 | Carry this heavy object together.                            | U     | M:joint-load, M:movement, M:participation     | Two separate carries cannot duplicate the object.               |
| <a id="coop-03"></a>COOP-03 | Count down, then lift at the same time.                      | C     | M:signals, M:barriers, M:joint-work           | Synchronization uses a shared simulation boundary.              |
| <a id="coop-04"></a>COOP-04 | Take over the task when Ada gets tired.                      | C     | M:handoff, M:observed-needs, M:work           | Retained work belongs to the actual work site or action family. |
| <a id="coop-05"></a>COOP-05 | Search different parts of the clearing and compare findings. | C     | M:task-allocation, M:search, M:communication  | Shared reports are not shared private perception.               |
| <a id="coop-06"></a>COOP-06 | Form a bucket line to fight the fire.                        | C     | M:roles, M:fluid-transfer, M:logistics        | Each transfer, source and participant is real.                  |
| <a id="coop-07"></a>COOP-07 | Guard Ada while she repairs the gate.                        | C     | M:monitoring, M:defense, M:joint-purpose      | Guarding does not guarantee every threat is intercepted.        |
| <a id="coop-08"></a>COOP-08 | Agree to alternate night watch.                              | C     | M:commitments, M:schedules, M:handoff         | An agreement is not permission to control another actor.        |
| <a id="coop-09"></a>COOP-09 | Build the shelter together using different tools.            | C     | M:shared-work, M:tool-roles, M:resources      | Combined work rate follows an admitted rule.                    |
| <a id="coop-10"></a>COOP-10 | Abort our crossing if either of us signals danger.           | C     | M:signals, M:joint-cancellation, M:traversal  | Cancellation respects each participant's safe boundary.         |
| <a id="coop-11"></a>COOP-11 | Let the slower member set our pace.                          | C     | M:formation, M:observed-motion, M:cooperation | No private speed-stat disclosure is required.                   |
| <a id="coop-12"></a>COOP-12 | Request a replacement before leaving my post.                | C     | M:handoff, M:commitments                      | Request sent is not replacement arrived.                        |

## ECO: Exchange, services and logistics

| ID                        | Example intent                                        | Route | Related mechanics and entities                | Distinction to preserve                                                |
| ------------------------- | ----------------------------------------------------- | ----- | --------------------------------------------- | ---------------------------------------------------------------------- |
| <a id="eco-01"></a>ECO-01 | Offer this tool in exchange for three meals.          | U     | M:barter, M:offers, M:valuation               | Offer, acceptance and settlement are distinct.                         |
| <a id="eco-02"></a>ECO-02 | Accept the exact trade Ada offered.                   | U     | M:trade-settlement, M:offer-version           | Recheck both sides' items; no partial unilateral exchange by accident. |
| <a id="eco-03"></a>ECO-03 | Lend the basket until tomorrow.                       | U     | M:loans, M:custody, M:commitments             | Possession transfer does not erase ownership.                          |
| <a id="eco-04"></a>ECO-04 | Return the very same borrowed knife.                  | U     | M:instance-identity, M:transfer               | Equivalent replacement is not silently accepted.                       |
| <a id="eco-05"></a>ECO-05 | Deliver this sealed package without opening it.       | C     | M:logistics, M:containment, M:privacy         | Delivery does not require knowledge of contents.                       |
| <a id="eco-06"></a>ECO-06 | Restock the stall when inventory falls below five.    | C     | M:monitoring, M:inventory, M:transport        | Scoped recurring activity with finite supplies.                        |
| <a id="eco-07"></a>ECO-07 | Reserve these materials for our accepted repair.      | U     | M:reservations, M:worksites                   | Reservation has an owner and lifetime; not permanent global exclusion. |
| <a id="eco-08"></a>ECO-08 | Hire a willing courier for this delivery.             | C     | M:contracts, M:payment, M:agency              | Hiring needs agreement and cannot seize another controller.            |
| <a id="eco-09"></a>ECO-09 | Pay only after the agreed delivery is evidenced.      | C     | M:escrow, M:receipts, M:commitments           | A chat claim is not necessarily settlement evidence.                   |
| <a id="eco-10"></a>ECO-10 | Donate tools anonymously.                             | C     | M:transfer, M:attribution, M:disclosure       | Public anonymity must not erase authoritative provenance.              |
| <a id="eco-11"></a>ECO-11 | Organize a caravan with supplies for the known route. | C     | M:group-travel, M:load, M:planning            | Forecast needs and actual capacity can differ.                         |
| <a id="eco-12"></a>ECO-12 | Recover my belongings without taking anyone else's.   | C     | M:ownership-evidence, M:selection, M:transfer | Unknown ownership cannot be silently classified.                       |

## LAW: Fictional institutions and obligations

These rows describe in-world fictional practices, not real-world political recommendations or legal advice.

| ID                        | Example intent                                   | Route | Related mechanics and entities              | Distinction to preserve                                            |
| ------------------------- | ------------------------------------------------ | ----- | ------------------------------------------- | ------------------------------------------------------------------ |
| <a id="law-01"></a>LAW-01 | Make a promise with an explicit deadline.        | U     | M:commitments, M:communication              | Utterance, understood terms and obligation creation can differ.    |
| <a id="law-02"></a>LAW-02 | Ask to renegotiate the promise.                  | U     | M:agreements, M:versions                    | One party cannot erase the other's accepted terms.                 |
| <a id="law-03"></a>LAW-03 | Record our mutually accepted agreement.          | U     | M:records, M:signatures, M:consent          | A record may evidence an agreement without enforcing it magically. |
| <a id="law-04"></a>LAW-04 | Witness an exchange and later report it.         | C     | M:observation, M:testimony                  | Witness knowledge is limited to what was perceived.                |
| <a id="law-05"></a>LAW-05 | Request membership in the existing guild.        | U     | M:membership, M:roles                       | Request is not acceptance or a permission grant.                   |
| <a id="law-06"></a>LAW-06 | Perform the duty attached to my accepted role.   | C     | M:roles, M:tasks, M:obligations             | Role authority is specific and revocable.                          |
| <a id="law-07"></a>LAW-07 | Use the community's existing dispute process.    | C     | M:institutions, M:procedure                 | Procedure does not guarantee a preferred judgment.                 |
| <a id="law-08"></a>LAW-08 | Claim this abandoned building under local rules. | U     | M:property, M:jurisdiction                  | A declaration alone need not create valid ownership.               |
| <a id="law-09"></a>LAW-09 | Post a public request for bridge repairs.        | U     | M:noticeboard, M:work-orders                | Posting does not assign workers or create materials.               |
| <a id="law-10"></a>LAW-10 | Release someone from an obligation I can waive.  | U     | M:authority, M:commitments                  | The actor must control the relevant claim.                         |
| <a id="law-11"></a>LAW-11 | Honor the deceased using our known ceremony.     | C     | M:ritual, M:shared-meaning, M:participation | Ceremony is not resurrection or forced emotional closure.          |
| <a id="law-12"></a>LAW-12 | Propose a new sharing custom to the group.       | U     | M:speech, M:collective-agreement            | Proposing a custom is speech; installing enforcement is DEF work.  |

## SEC: Property, secrecy and infiltration

| ID                        | Example intent                                      | Route | Related mechanics and entities              | Distinction to preserve                                                    |
| ------------------------- | --------------------------------------------------- | ----- | ------------------------------------------- | -------------------------------------------------------------------------- |
| <a id="sec-01"></a>SEC-01 | Hide the letter beneath the loose floorboard.       | C     | M:containment, M:placement, M:occlusion     | Hidden placement must have real discovery/access semantics.                |
| <a id="sec-02"></a>SEC-02 | Lock the chest and keep the key.                    | C     | M:locks, M:possession                       | Locking does not make contents indestructible.                             |
| <a id="sec-03"></a>SEC-03 | Try the known lock-opening technique.               | U     | M:lockpicking, M:tools, M:skill             | Fictional attempt with bounded noise/time/outcomes, not guaranteed access. |
| <a id="sec-04"></a>SEC-04 | Slip past the guard without being seen.             | C     | M:stealth, M:occlusion, M:movement          | The engine cannot guarantee another observer misses the actor.             |
| <a id="sec-05"></a>SEC-05 | Distract the guard by ringing the distant bell.     | C     | M:device-control, M:hearing, M:agency       | The guard decides whether to investigate.                                  |
| <a id="sec-06"></a>SEC-06 | Take the unattended purse.                          | U     | M:pickup, M:ownership, M:witnesses          | In-world theft may be allowed; platform access control is not bypassed.    |
| <a id="sec-07"></a>SEC-07 | Check whether someone tampered with the seal.       | U     | M:trace-evidence, M:inspection              | No omniscient historical audit disguised as inspection.                    |
| <a id="sec-08"></a>SEC-08 | Conceal my footprints after leaving camp.           | U     | M:traces, M:terrain, M:work                 | Trace removal requires a real trace model.                                 |
| <a id="sec-09"></a>SEC-09 | Wear the costume to impersonate a messenger.        | C     | M:equipment, M:recognition, M:deception     | Costume cannot directly assign others' beliefs.                            |
| <a id="sec-10"></a>SEC-10 | Inspect my own records for an unexplained transfer. | C     | M:records, M:audit-scope                    | Actor-visible records are not server/god logs.                             |
| <a id="sec-11"></a>SEC-11 | Remove the known alarm without triggering it.       | U     | M:device-state, M:tools, M:triggers         | Safe removal must be supported; uncertainty remains meaningful.            |
| <a id="sec-12"></a>SEC-12 | Follow at a distance, but stop if noticed.          | C     | M:movement, M:recognition-evidence, M:guard | Noticed must be evidenced or admitted by a specific detection model.       |

## CBT: Conflict, defense and tactical action

| ID                        | Example intent                                       | Route | Related mechanics and entities               | Distinction to preserve                                                |
| ------------------------- | ---------------------------------------------------- | ----- | -------------------------------------------- | ---------------------------------------------------------------------- |
| <a id="cbt-01"></a>CBT-01 | Hunt this visible animal using my equipped launcher. | U     | M:ranged-action, M:ammunition, M:body        | Consume actual ammunition; hit and injury are native outcomes.         |
| <a id="cbt-02"></a>CBT-02 | Aim but do not fire yet.                             | U     | M:aiming, M:attention, M:weapons             | Preparatory stance is not an attack or damage event.                   |
| <a id="cbt-03"></a>CBT-03 | Stop attacking when the opponent surrenders.         | C     | M:combat, M:observed-signal, M:interrupt     | Stop depends on perceived surrender and safe interruption.             |
| <a id="cbt-04"></a>CBT-04 | Push the attacker away without striking them.        | U     | M:contact-force, M:balance, M:collision      | Push is not a renamed arbitrary health decrement.                      |
| <a id="cbt-05"></a>CBT-05 | Block the incoming blow with this shield.            | U     | M:defense, M:timing, M:equipment             | Defense can fail; requires actual compatible timing rules.             |
| <a id="cbt-06"></a>CBT-06 | Dodge into the open space to my right.               | U     | M:evasive-motion, M:clearance                | Invulnerability frames are a world rule, not implied.                  |
| <a id="cbt-07"></a>CBT-07 | Stay between the threat and my companion.            | C     | M:relative-position, M:body-blocking         | Geometric interposition may not block every attack type.               |
| <a id="cbt-08"></a>CBT-08 | Retreat while keeping the enemy in sight.            | C     | M:orientation, M:movement, M:perception      | May be impossible around a corner; do not drop the sight constraint.   |
| <a id="cbt-09"></a>CBT-09 | Disarm rather than kill.                             | U     | M:disarming, M:grip, M:combat                | Requires a supported method; nonlethality is not always guaranteeable. |
| <a id="cbt-10"></a>CBT-10 | Surrender and put my weapon down.                    | C     | M:speech, M:equipment, M:placement           | Surrender does not force mercy.                                        |
| <a id="cbt-11"></a>CBT-11 | Guard this doorway without pursuing beyond it.       | C     | M:monitoring, M:combat, M:region-constraint  | Activity boundaries prevent unintended world-wide pursuit.             |
| <a id="cbt-12"></a>CBT-12 | Spar under our agreed nonlethal rules.               | C     | M:joint-activity, M:combat-policy, M:consent | Rules require an admitted safe mode or honest risk disclosure.         |

## VEH: Vehicles, mounts and transport

| ID                        | Example intent                                          | Route | Related mechanics and entities                | Distinction to preserve                                          |
| ------------------------- | ------------------------------------------------------- | ----- | --------------------------------------------- | ---------------------------------------------------------------- |
| <a id="veh-01"></a>VEH-01 | Board the boat and take an empty seat.                  | U     | M:boarding, M:occupancy, M:moving-support     | Actor location becomes related to a moving platform.             |
| <a id="veh-02"></a>VEH-02 | Row to the opposite dock.                               | U     | M:vehicle-control, M:water-navigation, M:work | Vehicle movement is not ordinary actor walking.                  |
| <a id="veh-03"></a>VEH-03 | Sail using the observed wind.                           | U     | M:sailing, M:weather, M:controls              | Unsupported aerodynamics cannot be inferred from sail art.       |
| <a id="veh-04"></a>VEH-04 | Stop the wagon before unloading it.                     | C     | M:vehicle-motion, M:braking, M:transfer       | Stop must actually complete before dependent work.               |
| <a id="veh-05"></a>VEH-05 | Hitch the cart to the trained animal.                   | U     | M:attachments, M:animal-participation, M:load | Animal agency and load compatibility remain real.                |
| <a id="veh-06"></a>VEH-06 | Mount the willing horse.                                | U     | M:mounting, M:consent, M:body                 | Mounting grants only the admitted control relation.              |
| <a id="veh-07"></a>VEH-07 | Give the passenger a ride to the location they named.   | C     | M:communication, M:vehicle-control, M:service | Resolve their destination; do not read their private goal state. |
| <a id="veh-08"></a>VEH-08 | Drive the known route and obey its posted restrictions. | C     | M:vehicle-routes, M:signs, M:local-rules      | In-world rules are not platform permissions.                     |
| <a id="veh-09"></a>VEH-09 | Tow the disabled vehicle to the workshop.               | U     | M:towing, M:force, M:attachments              | Coupled movement and additional load are required.               |
| <a id="veh-10"></a>VEH-10 | Dismount at the next safe stopping place.               | C     | M:monitoring, M:vehicle-motion, M:landing     | Do not place the rider at an arbitrary convenient point.         |
| <a id="veh-11"></a>VEH-11 | Load fragile cargo separately from heavy stones.        | C     | M:cargo, M:capacity, M:damage                 | Arrangement must matter through supported load/damage rules.     |
| <a id="veh-12"></a>VEH-12 | Wait for the ferry rather than swimming.                | C     | M:schedule-evidence, M:wait, M:boarding       | Preserve method restriction and uncertain arrival.               |

## ART: Art, performance and play

| ID                        | Example intent                                      | Route | Related mechanics and entities               | Distinction to preserve                                                 |
| ------------------------- | --------------------------------------------------- | ----- | -------------------------------------------- | ----------------------------------------------------------------------- |
| <a id="art-01"></a>ART-01 | Sing a song for the people nearby.                  | U     | M:vocal-performance, M:hearing, M:media      | Performance, audience reception and enjoyment differ.                   |
| <a id="art-02"></a>ART-02 | Tell a story inspired by our expedition.            | U     | M:speech, M:memory, M:fiction                | A fictional retelling does not become historical truth.                 |
| <a id="art-03"></a>ART-03 | Draw a map of the places I explored.                | C     | M:writing, M:spatial-memory, M:materials     | No unexplored details from world truth.                                 |
| <a id="art-04"></a>ART-04 | Carve a memorial into this stone.                   | U     | M:mark-making, M:tools, M:work               | Persistent marks and generated art are distinct from verbal intention.  |
| <a id="art-05"></a>ART-05 | Arrange flowers to resemble a bird.                 | C     | M:placement, M:visual-composition            | A novel visual arrangement need not change mechanics.                   |
| <a id="art-06"></a>ART-06 | Play a rhythm on the pot and invite others to join. | C     | M:acoustics, M:timing, M:participation       | Shared timing requires actual signals/coordination.                     |
| <a id="art-07"></a>ART-07 | Dance with a consenting partner.                    | U     | M:joint-motion, M:music, M:consent           | Two bodies, compatible poses and independent withdrawal.                |
| <a id="art-08"></a>ART-08 | Play hide-and-seek using the rules we know.         | C     | M:shared-rules, M:search, M:concealment      | The seeker cannot query all participant positions.                      |
| <a id="art-09"></a>ART-09 | Race to the old tree without pushing anyone.        | C     | M:shared-goal, M:movement, M:constraints     | Racing does not grant extra movement speed.                             |
| <a id="art-10"></a>ART-10 | Play the existing ball game with Ada.               | U     | M:game-rules, M:ball-physics, M:joint-work   | Rules, scoring and equipment must exist.                                |
| <a id="art-11"></a>ART-11 | Create a trail of harmless surprises for my friend. | C     | M:placement, M:signals, M:personal-knowledge | Harmlessness is bounded by known mechanics, not guaranteed universally. |
| <a id="art-12"></a>ART-12 | Stage a pretend duel without actual attacks.        | C     | M:performance, M:gesture, M:participation    | Pretend action must never route into consequential combat.              |

## KNO: Records, teaching and discovery

| ID                        | Example intent                                        | Route | Related mechanics and entities           | Distinction to preserve                                               |
| ------------------------- | ----------------------------------------------------- | ----- | ---------------------------------------- | --------------------------------------------------------------------- |
| <a id="kno-01"></a>KNO-01 | Teach Ada the cord-making technique I know.           | U     | M:teaching, M:knowledge, M:communication | Learning follows its own rules; no hidden registry dump.              |
| <a id="kno-02"></a>KNO-02 | Demonstrate the technique slowly while Ada watches.   | C     | M:work, M:observation, M:learning        | A real demonstration consumes actual time/materials where applicable. |
| <a id="kno-03"></a>KNO-03 | Practice the known technique on spare material.       | U     | M:practice, M:skill, M:resources         | Skill gains require an installed learning mechanic.                   |
| <a id="kno-04"></a>KNO-04 | Ask how the unfamiliar tool works.                    | U     | M:conversation, M:knowledge              | A description is not automatically a usable technique grant.          |
| <a id="kno-05"></a>KNO-05 | Record the result of this experiment.                 | U     | M:records, M:evidence, M:writing         | Preserve inconclusive or negative results.                            |
| <a id="kno-06"></a>KNO-06 | Repeat the experiment changing only this variable.    | C     | M:experiments, M:parameter-binding       | All controlled variables must be supported and revalidated.           |
| <a id="kno-07"></a>KNO-07 | Label the jars using what I actually know.            | U     | M:marking, M:identity, M:uncertainty     | Labels may be beliefs, not authoritative contents.                    |
| <a id="kno-08"></a>KNO-08 | Copy the public record while preserving attribution.  | U     | M:records, M:copying, M:disclosure       | A copy has its own identity and access policy.                        |
| <a id="kno-09"></a>KNO-09 | Compare my notes with Ada's volunteered observations. | C     | M:sharing, M:provenance, M:inference     | Agreement does not prove truth; private notes stay private.           |
| <a id="kno-10"></a>KNO-10 | Test whether this existing tool can serve as a lever. | C     | M:force, M:geometry, M:experimentation   | Cross-use needs mechanics, not a registered finished-object name.     |
| <a id="kno-11"></a>KNO-11 | Preserve an unknown sample for later study.           | C     | M:containment, M:degradation, M:records  | Unknown properties remain unknown during passive exposure.            |
| <a id="kno-12"></a>KNO-12 | Publish my own known procedure for others to learn.   | U     | M:publication, M:knowledge, M:rights     | Publication of knowledge is not installation of a new world rule.     |

## AUT: Routines, monitoring and automation

| ID                        | Example intent                                              | Route | Related mechanics and entities               | Distinction to preserve                                                 |
| ------------------------- | ----------------------------------------------------------- | ----- | -------------------------------------------- | ----------------------------------------------------------------------- |
| <a id="aut-01"></a>AUT-01 | Wait here for ten game minutes.                             | F     | M:wait, M:simulation-clock                   | Waiting is explicit; world time and interruption still apply.           |
| <a id="aut-02"></a>AUT-02 | Wait until I hear Ada's agreed signal.                      | F     | M:observed-events, M:wait                    | Hidden or undelivered signals cannot satisfy the condition.             |
| <a id="aut-03"></a>AUT-03 | Gather twice, then rest.                                    | F     | M:sequence, M:repeat, M:known-actions        | Each invocation has its own cost and terminal receipt.                  |
| <a id="aut-04"></a>AUT-04 | Stop this work if the nearby fire spreads.                  | F     | M:observed-predicate, M:interrupt            | Reaction depends on actual permitted evidence and family cancellation.  |
| <a id="aut-05"></a>AUT-05 | If the gate is open, pass through; otherwise knock.         | F     | M:branch, M:three-valued-evidence            | Unknown gate state is not automatically open or closed.                 |
| <a id="aut-06"></a>AUT-06 | Keep bringing water until the cistern reaches its mark.     | C     | M:logistics, M:measurement, M:repeat         | Bounded iterations and finite source; no magical pumping.               |
| <a id="aut-07"></a>AUT-07 | Tend this garden each morning until I withdraw the routine. | C     | M:calendar, M:standing-activity, M:resources | Persistent authority, scope and review policy; no permanent free labor. |
| <a id="aut-08"></a>AUT-08 | Use the existing thermostat to maintain warmth.             | U     | M:device-control, M:feedback-process         | Machine-owned process differs from actor-owned tending.                 |
| <a id="aut-09"></a>AUT-09 | Activate the known irrigation timer.                        | U     | M:automation, M:configuration, M:water       | Configuring within an admitted envelope needs no invention.             |
| <a id="aut-10"></a>AUT-10 | Sort arriving items using this known sorting mechanism.     | U     | M:automation, M:selectors, M:transfer        | New arrivals require bounded subscription scope and capacity.           |
| <a id="aut-11"></a>AUT-11 | Halt the routine, preserving completed deliveries.          | F     | M:activity-lifecycle, M:receipts             | Cancellation removes future authority, not committed history.           |
| <a id="aut-12"></a>AUT-12 | Inspect why my activity stopped before choosing a new plan. | F     | M:outcome-projection, M:agency               | Actor-visible reason is not privileged debug state.                     |

## MAG: Actions under magical constitutions

These are ordinary uses **only in worlds with the relevant admitted capabilities**. Their existence is not assumed by the capability layer.

| ID                        | Example intent                                       | Route | Related mechanics and entities                       | Distinction to preserve                                                                  |
| ------------------------- | ---------------------------------------------------- | ----- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| <a id="mag-01"></a>MAG-01 | Cast the light spell I know on this lantern.         | U     | M:spellcasting, M:light, M:cost                      | Known ability, valid target and actual resource policy.                                  |
| <a id="mag-02"></a>MAG-02 | Sustain the ward while Ada crosses.                  | C     | M:sustained-effect, M:cost, M:cooperation            | Continued effect may consume attention or energy.                                        |
| <a id="mag-03"></a>MAG-03 | Lift the stone with admitted telekinesis.            | U     | M:telekinesis, M:force, M:mass                       | Not unrestricted object mutation or collision bypass.                                    |
| <a id="mag-04"></a>MAG-04 | Use the known freezing spell to make a crossing.     | C     | M:spell, M:phase-change, M:support                   | Frozen water is walkable only under compatible load rules.                               |
| <a id="mag-05"></a>MAG-05 | Speak with a consenting spirit through this ritual.  | U     | M:spirit-channel, M:ritual, M:identity               | New channel does not expose arbitrary dead actors' private data.                         |
| <a id="mag-06"></a>MAG-06 | Dispel only the enchantment I can identify.          | U     | M:effect-identity, M:dispel, M:recognition           | Do not remove unrelated hidden effects.                                                  |
| <a id="mag-07"></a>MAG-07 | Shape-shift using my known form.                     | U     | M:transformation, M:body, M:identity                 | Reconcile equipment, movement and active work.                                           |
| <a id="mag-08"></a>MAG-08 | Send a thought through our admitted telepathic bond. | U     | M:mental-channel, M:disclosure                       | Only explicitly shared fictional content crosses the boundary.                           |
| <a id="mag-09"></a>MAG-09 | Create an illusion of a bird to draw attention.      | C     | M:illusion, M:perception, M:agency                   | Illusion is not a physical bird; distraction is not guaranteed.                          |
| <a id="mag-10"></a>MAG-10 | Store this spell in an existing charged rune.        | U     | M:effect-storage, M:capacity, M:trigger              | Stored effect and later trigger need pinned definitions.                                 |
| <a id="mag-11"></a>MAG-11 | End my own sustained spell without dispelling Ada's. | U     | M:effect-ownership, M:cancellation                   | Exact effect instance and authority matter.                                              |
| <a id="mag-12"></a>MAG-12 | Invoke the world's admitted compulsion effect.       | U     | M:fictional-mental-effects, M:target-owner-operation | Only explicitly enabled game effects; never platform privilege or human account control. |

## SYN: Machines, space and synthetic life

| ID                        | Example intent                                               | Route | Related mechanics and entities               | Distinction to preserve                                          |
| ------------------------- | ------------------------------------------------------------ | ----- | -------------------------------------------- | ---------------------------------------------------------------- |
| <a id="syn-01"></a>SYN-01 | Dock with the station and equalize pressure.                 | C     | M:docking, M:pressure, M:airlocks            | Contact, seal and equalization are separate stages.              |
| <a id="syn-02"></a>SYN-02 | Orient my solar panels toward the observed star.             | U     | M:orientation, M:radiation, M:power          | Pointing does not guarantee sufficient generated energy.         |
| <a id="syn-03"></a>SYN-03 | Coast to the rendezvous rather than walking there.           | U     | M:orbital-motion, M:propulsion, M:planning   | Different topology/dynamics require their own movement provider. |
| <a id="syn-04"></a>SYN-04 | Recharge before resuming the repair.                         | C     | M:reservoir, M:repair, M:plans               | Charge replaces hunger only for compatible bodies.               |
| <a id="syn-05"></a>SYN-05 | Swap to the gripper needed for this task.                    | U     | M:tool-interfaces, M:body-modules            | Changing a tool changes only its admitted capabilities.          |
| <a id="syn-06"></a>SYN-06 | Send a packet through the in-world relay network.            | U     | M:fictional-network, M:communication         | No actual Internet or host networking is implied.                |
| <a id="syn-07"></a>SYN-07 | Move my digital avatar to an accessible graph node.          | U     | M:graph-topology, M:virtual-location         | Location need not be Euclidean or rendered in 3D.                |
| <a id="syn-08"></a>SYN-08 | Run the known diagnostic on my damaged actuator.             | U     | M:diagnostics, M:body-state, M:observability | Diagnosis is scoped evidence, not repair.                        |
| <a id="syn-09"></a>SYN-09 | Delegate inspection to my authorized remote body.            | U     | M:controller-leases, M:remote-senses         | Same mind does not imply permission over every body.             |
| <a id="syn-10"></a>SYN-10 | Enter low-power mode until the beacon arrives.               | U     | M:power-state, M:wake-channel                | Only enabled wake senses operate during dormancy.                |
| <a id="syn-11"></a>SYN-11 | Fabricate a known replacement using available feedstock.     | U     | M:fabrication, M:recipes, M:energy           | No matter creation unless an explicit world source allows it.    |
| <a id="syn-12"></a>SYN-12 | Isolate the failing subsystem while preserving life support. | C     | M:dependency-network, M:device-control       | Hard constraints require supported dependency evidence.          |

## COL: Collectives and unusual bodies

| ID                        | Example intent                                                | Route | Related mechanics and entities           | Distinction to preserve                                                |
| ------------------------- | ------------------------------------------------------------- | ----- | ---------------------------------------- | ---------------------------------------------------------------------- |
| <a id="col-01"></a>COL-01 | As a fungus, grow toward the moisture gradient.               | U     | M:growth, M:gradient-sense, M:resources  | Growth is not locomotion of an unchanged body.                         |
| <a id="col-02"></a>COL-02 | As a root network, share nutrients with this connected plant. | U     | M:network-transfer, M:compatibility      | Connectedness and transfer limits are real.                            |
| <a id="col-03"></a>COL-03 | As a slime, squeeze through the opening.                      | U     | M:deformation, M:volume, M:clearance     | A soft-looking sprite is not a deformable body.                        |
| <a id="col-04"></a>COL-04 | As a swarm, split into two search groups.                     | U     | M:collective-identity, M:task-allocation | Define whether agents, knowledge and resources split or remain shared. |
| <a id="col-05"></a>COL-05 | Rejoin the swarm and share only my observed findings.         | U     | M:collective-memory, M:disclosure        | Merge mechanics preserve provenance and privacy.                       |
| <a id="col-06"></a>COL-06 | Form a living bridge with willing colony members.             | C     | M:joint-body, M:support, M:participation | Aggregate shape and load require an admitted model.                    |
| <a id="col-07"></a>COL-07 | Change color to signal my colony.                             | U     | M:body-display, M:visual-channel         | Color has communication effects only for perceiving interpreters.      |
| <a id="col-08"></a>COL-08 | Release the admitted scent signal at this junction.           | U     | M:chemical-signals, M:diffusion, M:cost  | Persistent field and observers are independently simulated.            |
| <a id="col-09"></a>COL-09 | As a living building, open a passage for the guest.           | U     | M:morphology, M:geometry, M:access       | Geometry change must reconcile support and occupants.                  |
| <a id="col-10"></a>COL-10 | Coordinate my limbs to hold three objects.                    | U     | M:body-resources, M:grasp, M:concurrency | Additional limbs need explicit capacity; prose cannot add channels.    |
| <a id="col-11"></a>COL-11 | Detach a damaged segment and survive as the remainder.        | U     | M:body-topology, M:lifecycle, M:identity | Survival and lost resources follow the body's rules.                   |
| <a id="col-12"></a>COL-12 | As an endowed storm, move toward an observed heat source.     | U     | M:field-body, M:weather, M:controller    | Passive storms do not require an LLM or invented desires.              |

## TMP: Time, identity and unusual realities

| ID                        | Example intent                                           | Route | Related mechanics and entities                     | Distinction to preserve                                                |
| ------------------------- | -------------------------------------------------------- | ----- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| <a id="tmp-01"></a>TMP-01 | Enter the admitted dream realm while my body sleeps.     | U     | M:dream-topology, M:body-lifecycle                 | Dream events are not automatically waking-world effects.               |
| <a id="tmp-02"></a>TMP-02 | Share this dream through the world's consent-based link. | U     | M:dream-sharing, M:disclosure                      | No access to unshared private cognition.                               |
| <a id="tmp-03"></a>TMP-03 | Slow this object using the known local-time effect.      | U     | M:local-time, M:effect-scope                       | Explicit simulation semantics; no change to billing or host deadlines. |
| <a id="tmp-04"></a>TMP-04 | Revisit the admitted echo of yesterday's conversation.   | U     | M:historical-echo, M:perception                    | Echo access is a world capability, not unrestricted event-log access.  |
| <a id="tmp-05"></a>TMP-05 | Create a temporary copy under the world's cloning rule.  | U     | M:identity-creation, M:resource-source, M:lifetime | Duplicate delivery cannot produce extra copies.                        |
| <a id="tmp-06"></a>TMP-06 | Reunite with my copy under our admitted merge rule.      | U     | M:identity-merge, M:memory, M:ownership            | Conflicting memories/resources need explicit reconciliation.           |
| <a id="tmp-07"></a>TMP-07 | Travel through the same doorway into its alternate room. | U     | M:non-Euclidean-topology, M:connector-state        | A supported topology provider must define the relationship.            |
| <a id="tmp-08"></a>TMP-08 | Exchange my shadow with a consenting character.          | U     | M:fictional-traits, M:exchange, M:consent          | Aesthetic description alone does not define mechanical effects.        |
| <a id="tmp-09"></a>TMP-09 | Spend an admitted memory-token to power the device.      | U     | M:fictional-resource, M:memory-owner, M:transfer   | Fictional sacrifice cannot erase actual audit/privacy records.         |
| <a id="tmp-10"></a>TMP-10 | Ask the oracle a question through its known ritual.      | U     | M:oracle-policy, M:knowledge-disclosure            | The oracle's access and uncertainty must be explicitly bounded.        |
| <a id="tmp-11"></a>TMP-11 | Invoke the world's bounded fictional rewind.             | U     | M:fictional-time, M:causality, M:receipts          | No rewind of real charges, revocation, or external operations.         |
| <a id="tmp-12"></a>TMP-12 | Renounce my accepted magical title and its powers.       | U     | M:roles, M:capability-revocation                   | In-flight actions and sustained effects must observe revocation.       |

## DEF: Deliberate invention and owner-authoring

These requests may originate from an actor or an authorized creator, but they are **not ordinary effectful gameplay invocations**. INV and owner-control services determine eligibility. Listing a request grants no new authority.

| ID                        | Example intent                                                  | Route | Related mechanics and entities                  | Distinction to preserve                                              |
| ------------------------- | --------------------------------------------------------------- | ----- | ----------------------------------------------- | -------------------------------------------------------------------- |
| <a id="def-01"></a>DEF-01 | Propose a new tool using my own described mechanism.            | D     | M:invention, M:materials, M:admission           | Actor-authored method is validated, not replaced by a secret answer. |
| <a id="def-02"></a>DEF-02 | Define a reusable version of my successful technique.           | D     | M:definition-lifecycle, M:knowledge             | Reuse/publication and mechanical definition are separate choices.    |
| <a id="def-03"></a>DEF-03 | Specialize the admitted trap template for this target class.    | D     | M:typed-ports, M:selectors, M:effects           | Template contract and aggregate bounds still apply.                  |
| <a id="def-04"></a>DEF-04 | Invent a way to sense nearby heat through walls.                | D     | M:senses, M:propagation, M:disclosure           | Needs supported sensing operators or an explicit host gap.           |
| <a id="def-05"></a>DEF-05 | Introduce a combustion rule for this new material.              | D     | M:properties, M:passive-processes               | Must specify effects under ordinary exposure, not just on use.       |
| <a id="def-06"></a>DEF-06 | Author a new autonomous sorting mechanism.                      | D     | M:process-definitions, M:selectors, M:transfers | A machine-owned process is not a free actor routine.                 |
| <a id="def-07"></a>DEF-07 | Establish a mechanically enforced guild charter.                | D     | M:institutions, M:authority, M:policy           | Social proposal alone is COM/LAW; enforcement changes rules.         |
| <a id="def-08"></a>DEF-08 | Define a touch-only species with no hunger.                     | D     | M:bodies, M:senses, M:needs                     | Creator permission and supported replacement interfaces required.    |
| <a id="def-09"></a>DEF-09 | Add a spell that exchanges two objects' gravity.                | D     | M:effects, M:gravity, M:composition             | A novel description cannot install an absent evaluator.              |
| <a id="def-10"></a>DEF-10 | Package my admitted inventions for another world.               | D     | M:distribution, M:dependencies, M:rights        | Packaging does not activate them or grant knowledge there.           |
| <a id="def-11"></a>DEF-11 | As an authorized owner, conjure an instance of this definition. | D     | M:owner-control, M:instance-creation            | Conjuring uses separate authority; never an NPC gameplay loophole.   |
| <a id="def-12"></a>DEF-12 | Add a genuinely new execution primitive to the engine.          | D     | M:host-capabilities, M:engineering              | G3 engineering, not a generated script or model assertion.           |

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

This is navigation vocabulary for future companion repertoires, not a second mechanics specification. Each key can acquire a real catalogue link later without changing action IDs.

| Concept cluster               | Example keys                                                               | Representative action families | Existing design owner                                                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Space and bodies              | M:topology, M:support, M:locomotion, M:relative-pose, M:clearance          | NAV, REL, BOD, VEH             | [Spatial world](../spatial-world.md)                                                                                                                                    |
| Evidence and senses           | M:inspection, M:recognition, M:hearing, M:trace-evidence, M:spatial-memory | OBS, COM, SEC, KNO             | [Events/perception](../events-perception-and-reactions.md), [memory](../memory-architecture.md)                                                                         |
| Agency and control            | M:goals, M:plans, M:repeat, M:wait, M:interrupt, M:handoff                 | MND, AUT, COOP                 | [Agency](../agent-agency.md), [capabilities](../action-capabilities.md)                                                                                                 |
| Matter and work               | M:transfer, M:containment, M:capacity, M:crafting, M:repair                | INV, OBJ, RES, MAK             | [World boundaries](../engine-and-world-boundaries.md), [module runtime](../../archive/07-technical-architecture/world-module-runtime.md)                                |
| Passive environment           | M:combustion, M:heat-transfer, M:fluid-flow, M:weather, M:growth           | FIR, FLU, AGR                  | [Declarations](../../archive/07-technical-architecture/declarations-and-evolution.md)                                                                                   |
| Living and synthetic needs    | M:body, M:sleep, M:nutrition, M:reservoir, M:injury                        | FOD, CARE, ANI, SYN            | [World boundaries](../engine-and-world-boundaries.md)                                                                                                                   |
| Social meaning and rights     | M:conversation, M:appraisal, M:consent, M:commitments, M:ownership         | SOC, COM, ECO, LAW             | [Conversation](../narration-and-conversations.md), [agency](../agent-agency.md)                                                                                         |
| Art and information artifacts | M:writing, M:mark-making, M:media, M:publication                           | ART, KNO                       | [Runtime art](../../archive/03-design-proposals/procedural-art-and-animation.md), [declarations](../../archive/07-technical-architecture/declarations-and-evolution.md) |
| Alternative constitutions     | M:spellcasting, M:collective-identity, M:local-time, M:graph-topology      | MAG, SYN, COL, TMP             | [Engine/world boundaries](../engine-and-world-boundaries.md)                                                                                                            |
| Authoring and installation    | M:invention, M:typed-ports, M:host-capabilities, M:definition-lifecycle    | DEF                            | [INV](../maintainers/inventions-and-world-evolution.md)                                                                                                                 |

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
route: C
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
  mechanics: [M:impact, M:acoustics, M:communication]
  objects: [pot, spoon]
  needs: [social_contact]
  traits: [playfulness]
  media: [sound]
expected_observation: a sound may be perceived by receivers
not_guaranteed: [audience_hears, audience_understands, audience_approaches]
lifecycle: refer_to_capability_definition
failure_examples: [object_unreachable, incompatible_instrument, unsupported_acoustics]
implementation_owner: unassigned
priority: unassigned
evidence: []
related_actions: [COM-08, ART-06]
```

The catalogue should grow through new meanings, unusual counterexamples and useful combinations—not by treating every synonym as a new engine primitive.
