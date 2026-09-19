# World systems and the player's experience

Status: **design proposals** expanding the user's baseline, updated for accepted wilderness starting direction. Requirements: F04, F08, F17–F29, F35–F39. Exact mechanics and staging remain proposals; [U02](../00-source/design-followups.md) records the accepted correction.

## The first place worth visiting

Begin with a primitive group in a wilderness clearing before a village exists. There are accessible resources, natural cover, some possessions and some survival knowledge. People need to gather food, rest, work and respond to the environment. Shelter, shared routines and social order can develop through play. NPCs can fail and die; resource availability creates opportunity rather than guaranteed survival. The concrete initial package is proposed in the [survival baseline](survival-baseline.md).

A proposed first ten minutes:

1. Arrive, inspect one's own needs, observe the daylight and meet nearby people.
2. Learn where someone has found food, which possessions they have, and what they intend to do before night.
3. Gather, carry, eat or rest using built-in mechanics; offer help or negotiate sharing a tool.
4. Suggest an improved carrying bundle or another small technique composed from supported effects.
5. Complete the work, share or withhold food, and see obligations and relationships change.
6. Observe unfinished work, exposure, fatigue or illness as time advances; outcomes need not be favorable.

This is a test scenario, not a mandatory quest. The player can wander, refuse, ask different questions, or invent another approach. It combines autonomy, memory, needs, open interaction, and consequence in a compact experience.

World days, needs, work and environmental processes use a shared accelerated clock. The one-real-hour day is the current candidate; creator controls can change the rate during play. Exact aging and human interaction accommodations remain open. [Time and simulation speed](time-and-simulation-speed.md)

The accepted presentation direction is beautiful grounded pixel art in a spatial 3D scene, rendered in the browser with PlayCanvas. The proposed clearing should be compelling to watch through texture, natural proportions, atmospheric lighting and subtle environmental motion, while people, resources and actions remain readable. A controlled elevated camera is the initial test, not a final decision on camera freedom. See the [visual brief](visual-direction.md) for the first scene and production checks.

## Player controls

Accepted first-version direction: complete mouse controls using click-to-move and contextual interaction. WASD/arrow-key movement and action shortcuts are planned additions. This is a documented design, not implemented functionality. [User approval](../00-source/design-followups.md#u08--player-controls)

| Input | Behavior |
|---|---|
| Left-click ground | Walk to the clicked location. |
| Left-click an object or person | Select the target and show its name and available actions. Selection alone does not perform an action. |
| Right-click an object, person or ground location | Open a contextual action menu for that target or location. |
| Choose an action | Approach to the required range if necessary, then perform the action when its conditions are satisfied. |
| Escape | Close an open menu first; otherwise cancel the current movement or action according to its interruption rules. |
| Tap ground or a target | Move or select using the same distinction as left-click. Selected-target actions are available through visible on-screen controls. |

A selected-target panel also exposes the contextual actions, so touchscreens and trackpads do not depend on right-click. A berry bush might offer **Gather**, **Inspect** and **Try something…**; a person might offer **Talk**, **Give item** and **Try something…**. The free-form option accepts a request about the selected target or location. Clicking a UI control must not also issue a movement command to the ground behind it.

Choosing Gather handles the walk to the bush automatically; the player does not need to position the character precisely. Navigation must handle obstacles and clearly report unreachable destinations. On arrival, recheck the target and action conditions: walking toward a bush does not guarantee that berries will still be available. Cancellation stops future work without undoing effects that already occurred.

Click-to-move simplifies the initial control scheme but still requires pathfinding. Player and NPC navigation should share the underlying movement rules and navigation service. Ordinary movement, selection and built-in actions use game mechanics without an LLM call. Free-form requests enter the [interaction protocol](interaction-protocol.md); the UI acknowledges processing without claiming that an action has already happened.

### Planned keyboard additions

| Input | Planned behavior |
|---|---|
| WASD or arrow keys | Direct movement; manual movement cancels an existing walking destination. |
| E | Open interaction actions for the highlighted eligible nearby target. |
| Remappable action shortcuts | Open inventory and other frequent controls; exact additional bindings remain to be chosen. |

Nearby interaction should visibly highlight its candidate before E is pressed. An explicitly selected eligible nearby object takes priority; otherwise use facing direction and distance to choose a reachable candidate. Avoid silently switching to whichever object happens to be closest. Movement and gameplay shortcuts must not fire while the player types into dialogue or a free-form request.

Make mouse controls complete first. Bring direct keyboard movement forward if playtesting makes dodging, chasing or precise positioning central. Exact targeting thresholds and camera controls remain open; this choice does not settle them.

## Interaction design

Use the controls above with obvious available actions, a free-form interaction field, and a conversation affordance. Provide keyboard navigation of the interface, readable captions, adjustable text size, and distinct non-color cues for hazards and needs. Interface keyboard access is separate from the later direct character-movement bindings.

Known actions feel immediate. Novel actions acknowledge quickly, show an attempt or planning state, and return a clear result or limitation. Avoid presenting a generated paragraph as if something physically happened when no state changed. The event feed and visual effects must agree with authoritative outcomes.

Inspection shows observed properties: a tree looks wet, a person appears upset, a tool is visibly damaged. It does not display another character's exact grief, hidden illness, inventory, or private memories. The player can ask “Why are you upset?” and receive an answer conditioned on what the NPC knows and wants to reveal.

Players can inspect their own needs and conditions in more detail. Proposed compact UI: a few physical-state indicators, current action, nearby dialogue captions, selected-object actions, inventory, and a collapsible local history. Creator mode has separate diagnostic views; ordinary accounts never receive its private-state payloads.

## Reaction time and player fairness

Consequential NPC actions use phases: intent/anticipation → execution → recovery. A resident moving to strike can turn, gesture, speak, or raise a hand before contact. A visible ignition attempt takes time. The target can move or intervene; interruption rules determine whether resources are consumed.

Start by testing a roughly 0.75–2-second reaction interval for conspicuous consequential actions; this is a tuning hypothesis, not a universal delay on every footstep or greeting. Account for network latency and accessibility settings. Immediate environmental hazards may still apply over time, but should have readable warning cues.

Player revival is an explicit game rule. A possible first version is a recovery state followed by a choice of return at a safe place with modest time or inventory consequences. An angelic rescue can be its visual fiction. Keep identity, social history, and recovery events consistent; NPCs may remember the incident. The exact cost, cooldown, and effect on competitive fairness remain open.

## Local explanations without omniscience

Every consequential event includes an internal causal record and a separate observer-facing explanation. A player who saw a burning tree can read that it lost integrity while burning. A player who did not see who ignited it should not receive the culprit's identity in the log.

Use readable entries such as “The wet branches failed to catch” or “Your hand struck the helmet's hard shell,” with optional “what changed” details for one's own state. Distinguish an observed event from an NPC's interpretation. Filters, replayable recent context, and reportable event IDs help debug odd results without exposing model prompts.

## Resources, crafting, and construction

Seed a small material vocabulary: wood, stone, concrete fiber sources such as suitable plants or bark strips, water, food, and a few useful tools. Fiber is a category; prepared fibers and finished cord are distinct from the raw plant. Define meaningful properties such as edible, combustible, flexible, rigid, absorbent, and workable, with units and valid ranges where numeric. A material description enriches interaction but cannot override resource accounting. [Materials and native survival package](survival-baseline.md)

Generic transformations create opportunity: gather, cut, bind, assemble, consume, repair, ignite, extinguish. Seed the fundamental survival variants rather than waiting for first-use generation to make survival possible. A tree yields a bounded amount of wood, with waste and regrowth policy. A shelter consumes material and work; construction stages are defined work/progress states with replaceable art. Start with approved footprints and staged visuals. Arbitrary topology, player-drawn architecture, structural collapse, and terrain deformation can follow separately.

An emergent technology graph records dependencies that arise from discoveries: suitable fiber → cord → bow/trap → improved food access. This is different from promising unconstrained reinvention of modern industrial civilization. Tooling, materials, energy, and knowledge remain real prerequisites in the game. A proposed capability can add a new node after validation; its existence does not teach it to every actor.

## Economy and negotiation

Let actors negotiate terms in ordinary language, then convert a mutually accepted offer into a structured contract: parties, item IDs/quantities, price if any, delivery timing, and expiration. Natural-language assent alone should not accidentally sell unrelated items. Show players a clear offer before commitment.

Sharing and direct barter fit the initial primitive setting. Currency remains requested in the long-term baseline, with introduction tracked by D11; an established currency economy is not a starting-world assumption. Decide issuance, sinks, destruction, theft, and offline ownership before a public economy. Infinite generated resources would undermine both survival and trading.

Immediate exchanges commit both sides atomically. Deferred obligations need delivery records and social consequences; escrow, interest, formal enforcement, and market stalls can come later. A promise is not enforceable through mind control. Agents can forget nonprotected details, lie, disagree, and choose differently, but durable contracts remain part of world state.

## Institutions without a mandatory government system

Seed no predefined polity if the creator wants anarchy, but provide the affordances for organization: communication, shared projects, permissioned storage, promises, membership, delegation, and public notices. Pure dialogue without persistent obligations or access rules will struggle to produce institutions that matter mechanically.

A group can initially be a named membership set, shared goals, agreements, and records of cooperation. A “business” can begin as a recurring trade arrangement. Later, if actors need persistent ownership, delegated authority, wages, inventories, and accounting, introduce formal organization entities. Do not assume all of these emerge automatically from an LLM using the word “company.”

Distinguish in-world law from platform authority. Residents can invent norms or governments; they cannot change account privileges, billing, or creator permissions. Institutions should have explainable effects and room for disputes, rather than universal agreement whenever one agent writes a constitution.

## Ecology, aging, families, and absence

Animals need only a lightweight utility controller initially; not every deer needs a full language-model autobiography. Plants can use simple growth/regrowth timers. Predation, hunting, traps, disease, and weather should enter only with enough replenishment and observation tools to diagnose collapse.

Aging should advance with the world clock. Whether life stages have an additional multiplier or a shorter calendar is still open; the first comparison should use the proposed uniform clock. For later PG family simulation, use adult relationship states, non-explicit intimacy transitions, pregnancy/caregiving processes, birth, dependent children, and gradual maturation. Do not generate sexual behavior for children. Population changes also affect food, housing, social workload, and model budget, so births require ecological and computational capacity policies. [Time model and lifespan arithmetic](time-and-simulation-speed.md)

Distinguish consequential NPC mortality from player characters suffering during absence. Proposed human policy remains safe offline rest and forgiving recovery; the user's acceptance of NPC death does not remove those player requirements. NPCs can live or die during active or explicitly supported background simulation. Catch-up retains elapsed-time debt and causal thresholds; a work limit cannot silently stop hunger while advancing the day. Exact unattended-world rules remain open.

Run distant or unobserved regions at a coarser simulation level, preserving resources and consequential events. Do not claim high-detail conversations occurred unless they were actually simulated or deliberately generated as marked summaries. Catch-up can process time boundaries and aggregate rates instead of replaying every frame.

## Sound, light, fire, and destruction

Use logical fields first: a sound has origin, intensity, duration, category, and intelligibility; a light has reach and occlusion rules; fire has fuel/rates; destruction has integrity and stage transitions. Presentation can be visually richer than these rules, but must not suggest barriers or affordances the authority ignores.

Later sophistication can be introduced independently: walls attenuate sound; doors change navigation and hearing; nighttime modifies detection; smoke impairs perception; fire spreads across bounded neighbor queries; damaged structures replace parts. Full acoustic simulation, deformable geometry, or rigid-body rubble are distinct optional investments. [Engine and art comparison](../02-research/engines-art-and-audio.md)

## Phones and spatial conversation

A phone is a later in-world communication affordance backed by identity and messaging permissions. It is not assumed among the primitive group's initial possessions; how it enters the world remains open. Start with contacts and asynchronous text after local conversation works. Add calls, missed calls, NPC schedules, and availability later. A call delivers only its intended participants' audio; it should not automatically grant hearing of remote private conversations.

Spatial voice needs proximity-based subscription permissions, playback positioning, captions, mute/block/report controls, and push-to-talk or explicit voice activation. An NPC speech pipeline is transcription → addressed-turn detection → grounded response → voice synthesis → scoped playback. Budget each stage separately, limit overlapping speakers, and use short responses. Text remains a complete route to play.

## Bounded sectors and a growing world

World sectors can begin as discrete areas with visible transitions. A destination at capacity places the traveler in a cancellable queue while preserving their current location. Border crossing should feel like travel rather than a mysterious connection error. Friend invitations and parties need a policy when sectors are full.

Add biomes and scenarios only when existing residents can use them meaningfully. A zombie outbreak or dragon can be a creator-introduced event package with scope, duration, rules, spawning limits, and recovery plan. A scenario director is separate from resident cognition: it creates circumstances; residents decide how to respond.

## Product boundaries for the first release

The first loop combines survival, social choices and discovery. Built-in gathering/eating/resting, meaningful needs and NPC death, and an explicit accelerated clock belong in the initial foundation. Combat depth, inheritance, intensive farming, extensive anatomy, businesses, advanced lifecycle simulation, phones, and spatial voice can follow. Quota exhaustion should leave movement, known interactions, basic needs management, and social continuity playable. The archive's [roadmap](../05-project/roadmap.md) proposes concrete gates for adding each layer.
