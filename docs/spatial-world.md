# Spatial world: 3D simulation, tactical cameras, and mixed-dimensional art

## Renderer boundary

Physical data is renderer-independent. The current `WorldRenderer` boundary accepts the existing authorized `GameView` DTO and returns intentions; it does not expose PlayCanvas objects to React or the domain. This minimal implemented interface is smaller than the eventual rendering projection described in the [runtime contract](../archive/07-technical-architecture/spatial-world-runtime.md#10-playcanvas-isolation-and-hybrid-assets). [Architecture](architecture.md#spatial-world-foundation) identifies delivered behavior; the remaining target is not implicitly complete.

**Status: accepted target; a bounded native 3D foundation is implemented.** This specification establishes OpenLegend's intended spatial behavior. The [runtime contract](../archive/07-technical-architecture/spatial-world-runtime.md) owns technical representation and execution. The [SW tracker](maintainers/spatial-world.md) owns tasks, dependencies, and acceptance. [Architecture](architecture.md) continues to describe the running implementation.

## The decision

OpenLegend is fundamentally a **three-dimensional simulated world**. Positions, physical extents, movement, interaction distances, sight, and hearing account for height. Its initial control style is tactical rather than first-person: actors usually walk on surfaces, and flyers initially use supported aerial routes. A free rigid-body physics sandbox is not required.

Presentation is independent. A generated animal can be a two-dimensional sprite while its body occupies a three-dimensional position and volume. A humanoid can later use a rigged 3D model beside that animal without creating a different set of physical rules. Terrain, ramps, floors, and barriers need simple geometry that conveys their actual spatial shape; painted textures and sprite scenery can decorate that geometry.

The initial visual direction remains compatible with painted and procedural 2D art. “2.5D” describes that presentation, not a restriction that every actor must occupy the same plane. XCOM-like floor selection and an orbitable tactical camera are useful interaction references, not a commitment to XCOM's rules, turn system, assets, or engine internals. Research and access limitations are in the [research archive](../archive/02-research/three-dimensional-worlds-and-navigation.md).

## Ownership

This document owns dimensionality, spatial gameplay expectations, tactical camera behavior, floor selection, and the boundary between physical representation and artwork. The runtime document supplies geometry, navigation, spatial-query, renderer-adapter, and persistence contracts beneath it.

Existing owners retain their responsibilities:

- [Sensory evidence](../archive/07-technical-architecture/perception-and-attention.md): detection, recognition, intelligibility, permitted detail, and embodied visual parity. Spatial queries supply geometry; they do not replace these policies.
- [Events and reactions](events-perception-and-reactions.md), [memory](memory-architecture.md), and [agency](agent-agency.md): evidence identity, attention, decisions, goals, and plans. Moving into 3D does not introduce another event bus or cognition system.
- [Declarations](../archive/07-technical-architecture/declarations-and-evolution.md): admission of new mechanics. [Procedural art](../archive/03-design-proposals/procedural-art-and-animation.md): visual composition, rigs, and asset production. [Visual direction](../archive/03-design-proposals/visual-direction.md): style and asynchronous art publication.
- [Save/load](save-and-load.md), [performance](performance.md), and [narration](narration-and-conversations.md): their existing authority, operational, and presentation contracts.

## What a location means

The world uses a consistent right-handed, Y-up coordinate system. A point has `x`, `y`, and `z`; height is not inferred from a camera, a sprite's size, or a draw-order number. Spatial lengths are measured in world metres under a declared conversion for existing content. Time remains the game's simulation time, not rendering-frame time.

Being located at a point and being supported by a surface are different facts. A person standing on a bridge and another underneath it can have identical `x,z` coordinates but different `y` coordinates and different support surfaces. A surface has a stable identity independent of its floor label, rendered mesh, or navigation-library polygon.

A ground actor's position denotes its support anchor, normally the feet. Body extents and eye, ear, and interaction anchors are derived from admitted body profiles. A flying actor uses the same position convention; its body remains above that anchor according to its profile. “Altitude above ground” is a derived measurement relative to a specified surface below, not a second independently writable position.

Facing belongs to the actor, not the camera. Turning the view must not turn the person, change a sensory cone, redirect an attack, or alter an animal's intent. Initial ground actors can remain upright with one authoritative heading. Full arbitrary bodily rotation is an extension, not a prerequisite for 3D coordinates.

## Ground, structures, and levels

The world supports sloping terrain, ramps, raised platforms, stairs represented by supported traversal geometry, cliffs, walls, roofs, and stacked walkable surfaces. A ground heightfield is useful for landscape but cannot be the only spatial representation: bridges and interiors require more than one possible surface at the same horizontal location.

Walkability depends on the actor's body and locomotion capabilities. A small creature may fit through an opening that a person cannot. A grounded actor cannot walk through a ceiling, move straight up a wall, or cross a disconnected gap merely because a destination is close in Euclidean distance. Traversal links such as ladders, jumps, or lifts require an explicitly supported native behavior; a navigation connection does not itself implement that behavior.

The first useful environment includes a lower path, an elevated deck with a ramp, a passage underneath, an opaque barrier, and a landing/perching surface. This is enough to exercise genuine height and overlapping levels without requiring a complete building construction system.

Geometry changes preserve physical consequences. Removing support cannot leave an actor floating. Supported changes either lead to a bounded native fall/landing outcome or are rejected when the relevant recovery behavior is not available. Destruction, structural engineering, and falling debris are not implicitly implemented by permitting a platform to exist.

## Movement and action

A requested destination specifies which surface or air region is intended. Selecting the bridge must not silently select the ground beneath it. The engine may project a slightly imprecise click onto the chosen valid surface within a declared tolerance; it may not snap to a different floor or teleport through an obstacle.

Ground routes are sequences across traversable surfaces embedded in 3D. Their length, slope, clearance, and supported transitions matter. This is fully compatible with a 3D world even though a walking creature remains constrained to a surface. A dense grid of every cubic point in space is unnecessary.

The native simulation performs movement and work. A renderer, pathfinder, or animation cannot complete an action on its own. Navigation suggests a route; authoritative movement checks that the next segment is still valid. Work begins only when its actual prerequisites are satisfied, and consumption follows the owning action's rules.

The actor does not need a model call to follow a route or continue a valid plan. Native behavior can run with zero model calls. Jev can select a supplied feasible action through the existing level-1 design; higher-level generation remains available for new goals, changed plans, unlisted attempts, or invention. These routes all use the same spatial admission and execution rules.

“Within reach” is not just a center-distance test. A hand action needs compatible contact geometry, access, and a reachable stance. Ranged actions use the supported 3D range and obstruction rule. A bird high above someone cannot be punched because their horizontal coordinates coincide. An actor cannot harvest through a floor or cook at a fire on another inaccessible level.

A path that reaches only part of the destination is partial, not successful arrival. A temporarily unavailable navigation cache is a technical condition, not evidence that the character discovered an impassable landscape. Changes such as a closed door or an exhausted target can stop or invalidate future work; they do not erase the actor's longer-term goal.

## Flying creatures

Initial flight uses a **bounded graph of three-dimensional air corridors**, with explicit takeoff, vertical transition, cruising, descent, and landing connections. The corridors may be generated by trusted code from admitted geometry or authored as world data. They are not restricted to a single altitude, and each edge has real clearance rather than being an invisible teleport between points.

An initial flight profile can choose a few useful cruise heights and permitted perch/landing surfaces. The engine checks the swept body volume along an edge, overhead barriers, climb/descent limits, and the landing footprint. A route above a bridge and one below it are different routes. Aerial graph coverage being absent is a supported-capability or navigation-coverage limitation, not proof that the space is physically blocked.

Flight is a mechanical capability. An image of wings does not grant it. An invented creature needs an admitted body, locomotion profile, and sensory capabilities before it participates in these systems; its generated sprite can arrive later. One admitted animal family with a flight profile is enough to establish the path without implementing arbitrary biological invention.

Loss of flight, death, or a disappearing perch uses an explicit native recovery/falling policy. Bodies and carried items are not duplicated. Free aerial dogfighting, continuous six-degree-of-freedom control, aerodynamics, and a general volumetric navigation engine are later extensions.

## Seeing and hearing in 3D

Sight starts at an actor's permitted eye anchors and tests the world's physical occluders and the target's exposed extent. Floors, walls, elevation, and available openings matter. Looking down from a hill may create a real line of sight; rotating the player's camera around a wall cannot create one for the body.

Hearing uses three-dimensional source/listener positions and acoustic obstacles. It is not a copy of visual line of sight. A floor can attenuate a shout without making it completely inaudible. Detection, approximate direction, source identification, and understanding words remain separate sensory results. Audible evidence may describe “a muffled voice above” without exposing the speaker's exact position or identity.

Sounds retain their event-time origin even if their source later moves or disappears. Continuous emitters use their current admitted position. Muting browser audio does not make the actor deaf, and camera zoom must not change who can hear. Playback and accessible captions represent the same authorized sound evidence.

Spatial changes flow into the existing exposure and reaction pipeline. Native geometric calculations do not purchase semantic inference. A creature appearing overhead can create a new eligible exposure; unchanged flight frames do not create repeated thoughts.

## Tactical camera and perspective

The camera supports a 3D focus point, horizontal orbit/yaw, vertical viewing angle/pitch, pan, zoom, recenter, and explicit level focus. Orthographic projection is the default tactical view; perspective is supported as a presentation mode. Changing the viewing angle, switching projection, and changing the focus level are distinct operations.

The implementation supports rotation from the first camera slice. A presentation profile may lock yaw, constrain pitch, or offer snapped headings to suit sprite art. Locking rotation is configuration, not a return to a flat world or a different spatial schema. Initial sprite-friendly bounds should avoid grazing-ground and directly overhead views that make flat artwork unreadable; developer inspection may permit wider bounds.

Camera movement is usable while the simulation is paused. It does not advance time, move the actor, wake an NPC, or regenerate artwork. Keep deliberate player camera settings separate from world state. Restoration resets invalid target references and reauthorizes the embodied view before acquiring new visual evidence.

### Levels and cutaways

A level selector changes the focus and displayed slice, not the actor's position or the selected route's destination. Levels are named/grouped surfaces, not necessarily equally spaced horizontal planes. A sloped path can span several heights while remaining one connected surface.

When a roof or upper floor obscures the selected lower area, presentation can fade or cut away the covering geometry. Its collision, support, sight blocking, and acoustic effects remain intact. Concealed entities are not sent to the ordinary client merely because a roof has been faded. A separately authorized god view can inspect them without granting character knowledge.

The existing embodied-visual-parity policy remains: the active server-approved viewport narrows the character's bodily visual exposure; it does not replace the body with the camera. A camera-side wall may also hide a body-visible object from the displayed view; approved presentation cutaways can remove that camera obstruction, never the body's physical one. NPC vision remains independent of the player's viewport. The sensory owner retains the hidden-tab and multi-view policies and their unresolved details.

### Picking and controls

A compact bottom-right camera toolbar keeps zoom, recenter, follow-player, rotation, tilt, projection, rotation lock and floor selection visible. Icon controls have accessible names and hover/focus explanations; the information icon explains gestures and shortcuts. Follow is an explicit pressed toggle beside recenter, with a visible checkmark when active. It defaults on, persists as a local presentation preference and tracks the rendered player smoothly. Panning or selecting a floor disables follow; zoom, orbit and projection preserve it. Recenter is a one-time action and does not enable follow. Follow clears floor focus so the player's actual height remains centered.

A click intersects actual permitted spatial geometry, not an assumed `y=0` plane. Where several floors lie beneath the pointer, focus level and an explicit surface choice disambiguate them. Show the chosen floor and destination before submission. The server independently checks the submitted location and actor permissions.

Preserve existing click-to-act and contextual menus. Orbit and pan gestures must not accidentally submit movement on release. Provide keyboard and visible-button alternatives, touch controls, recenter, and reduced-motion behavior. Existing inventory/crafting/world-agent shortcuts must not be silently reused for camera controls.

Sprite silhouettes and 3D meshes can both be picked, but visual picking is only a proposal about a permitted object. Picking hidden transparent pixels, stale remembered art, or an occluded object's label cannot disclose live details or bypass action admission.

## Mixed sprites and models

Every visual attaches to a stable gameplay entity and an explicit world-space anchor. Its representation may be a single-view billboard, directional sprite set, modular 2D rig, procedural mesh, or imported rigged model. The same instance can switch representation without changing its body, position, inventory, abilities, support, or event identity.

Single-view sprites may face the camera as an acknowledged visual approximation. Directional sprites select a view from relative actor/camera orientation. A 2D image cannot reveal a correct previously unseen backside; missing directions use a declared fallback rather than silently generating art on every camera turn. Full mesh models naturally support more viewing directions, but art quality and animation coverage remain separate work.

A sprite's ground anchor follows the actual surface height. A flying sprite remains at its real altitude with an appropriate projected shadow or height indicator. Billboard tilt, animation bobbing, and painted perspective are presentation offsets only. Contact shadows follow a relevant surface below; they must not always appear on a fictitious global ground plane.

Static landscape and buildings may use simple 3D geometry with painted textures. A flat backdrop cannot remain geometrically correct under arbitrary orbit; identify such backgrounds as decorative and exclude them from interaction or constrain the associated camera profile. Interactable surfaces must be depicted consistently enough to make their height and boundaries understandable.

Generated assets are validated, versioned, cached, and loaded asynchronously through the existing art pipeline. Native fallback art appears immediately for an admitted entity. A late asset cannot resurrect a deleted creature, change its hitbox, or arrive into a discarded save timeline. Standard model and image formats remain portable; PlayCanvas-specific objects stay in the renderer adapter.

## Boundaries of the first substantial release

The first substantial release delivers meaningful elevation, overlapping surfaces, 3D ground navigation, height-aware interaction and senses, controllable tactical cameras, sprite anchoring and picking, a small demonstrated flight family, and same-version save/load. One simple test mesh proves mixed representation; bespoke 3D character production is not required.

It does not imply turn-based combat, a cover system, arbitrary destruction, swimming, ropes, vehicles, procedural skeletal animation for every invention, full atmospheric acoustics, or a new multiplayer architecture. The interfaces should admit these through later native families rather than pretending their mechanics already exist.

The key invariant is simple: **one spatial world, one source of physical truth, and several ways to draw it.**

## Physical contact

Entity contact means their physical body surfaces meet or their occupied volumes overlap, not that their position markers fall within a sensory radius. The current body representation uses upright cylinders: compare horizontal separation against the sum of body radii and require overlapping vertical height intervals, with the spatial provider's numerical tolerance. A character standing within a campfire's occupied volume or resting on its top counts as contact; a nearby character outside that volume does not. Height separation matters even at identical horizontal coordinates. A physical barrier must not become a sensed contact through a wall.

The optional body-contact detector uses this relation and existing barrier checks to produce private contact episodes for actors granted that sense. Its radius field is zero and grants no remote perception. Broad candidate lookup derives its search extent from physical body sizes, then checks exact contact. It does not grant sight, identity, deliberate examination or damage. Ordinary movement and collision checks do not depend on contact sensing. The current campfire uses the existing generic object body profile; detailed flame shapes, temperature exposure, burns and contact with map surfaces are separate mechanics.

Existing saved proximity-detector definitions upgrade in place to body contact with their authored bindings preserved. Obsolete active proximity contacts are cleared and actual contacts are reacquired; historical experiences remain historical evidence rather than current contact state. No world reset or replacement sense is introduced.
