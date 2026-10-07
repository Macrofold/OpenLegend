# Spatial world: 3D simulation, tactical cameras, and mixed-dimensional art

## Presentation contract

[World presentation](world-presentation.md) is the canonical owner for default-lit sprite/mesh artwork, multi-receiver dynamic shadows, depth/read-through behavior, configurable player visibility settings and smooth right-drag camera controls. These never change physical sight, sound, support or action authority.

## Renderer boundary

Physical data is renderer-independent. The current `WorldRenderer` boundary accepts the existing authorized `GameView` DTO and returns intentions; it does not expose PlayCanvas objects to React or the domain. This minimal implemented interface is smaller than the eventual rendering projection described in the [runtime contract](../archive/07-technical-architecture/spatial-world-runtime.md#10-playcanvas-isolation-and-hybrid-assets). [Architecture](architecture.md#spatial-world-foundation) identifies delivered behavior; the remaining target is not implicitly complete.

**Status: accepted target; a bounded native 3D foundation is implemented.** This specification establishes OpenLegend's intended spatial behavior. The [runtime contract](../archive/07-technical-architecture/spatial-world-runtime.md) owns technical representation and execution. The [SW tracker](maintainers/spatial-world.md) owns tasks, dependencies, and acceptance. [Architecture](architecture.md) continues to describe the running implementation.

## Client replacement path

The renderer boundary preserves a future choice of presentation technology; it is not a completed portable-client SDK or a promise of cheap migration. [Engine and distribution tradeoffs](../archive/02-research/engines-art-and-audio.md#distribution-and-engine-tradeoffs) own the rationale and reconsideration criteria. The narrow interface exists today, but a dedicated authorized rendering projection and complete input extraction remain [SW10.1–SW10.2](maintainers/spatial-world.md#sw10--renderer-boundary-and-mixed-representation).

Two changes have different scope. Replacing the browser renderer can retain React and the surrounding web application. Building a native Unreal client would also require substantial UI, input and client lifecycle work; the TypeScript `WorldRenderer` interface is a design seam, not something C++ or Blueprints can directly implement without adaptation.

| Part                                                            | Expected treatment in a future native client                                                                                                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted simulation, inventions, cognition, persistence and saves | Retain server-side authority and storage; replacing presentation alone should not require migrating world data                                                                                            |
| Authorized views and player intentions                          | Preserve their meaning and server validation; implement serialization, transport and lifecycle handling in the new client rather than assuming TypeScript types are a cross-language SDK                  |
| PlayCanvas scene, materials, effects, picking and animation     | Reimplement using the new engine; preserve semantic entity/surface IDs and presentation-only effects                                                                                                      |
| React UI, accessibility, text entry and camera/input controls   | Rebuild or deliberately integrate an appropriate UI solution; qualify controller/TV interaction separately                                                                                                |
| Art and asset metadata                                          | Reuse licensed source assets and semantic IDs where compatible; convert import settings, shaders, rigs and generated-asset loading as needed. Standard file formats do not guarantee identical appearance |
| Accounts, reconnection and platform lifecycle                   | Adapt and qualify for the target platform without moving authorization into the client                                                                                                                    |

A future migration should proceed through one playable slice:

1. Identify the concrete product or production blocker and define equivalent visual, interaction and device acceptance criteria before selecting another engine.
2. Complete the relevant SW10 separation work only as needed by that slice. Consume scoped public contracts, never database access or raw world state. Do not create a universal graphics wrapper in advance.
3. Connect the candidate client to the same server. Demonstrate movement, inspection, conversation and invention with existing admission, plus representative art and animation.
4. Check differing player knowledge, stale/removed targets, reconnect and save/load timeline changes. Client physics, lighting, visibility and animation must not become a second authority for movement, perception or consequences.
5. Compare production effort, frame times, memory, startup/download, input usability and deployment cost. Commit to a full replacement only when the evidence warrants its migration and maintenance cost.

An installed client can still depend on hosted simulation and AI. Offline play would be a separate architecture decision: the current TypeScript server/domain would need a local host or a deliberate port, and provider-dependent behavior needs its own offline policy. A renderer change does not deliver that capability.

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

## Movement

A requested destination identifies its intended support. Projecting an imprecise click may not select another floor. Native simulation owns movement, prerequisites and consumption; navigation or animation cannot complete work. Routes and existing plans continue without model calls through the same admission rules used by player and generated intentions. Route invalidation does not erase the actor's longer-term goal.

Reach requires compatible physical contact, access and a reachable stance; ranged actions use their supported 3D range and obstruction rule. Horizontal proximity cannot permit punching a high bird, harvesting through a floor or cooking at an inaccessible fire. Current route and geometry bounds are recorded in [spatial limits](limits/spatial.md).

Placement and locomotion use continuous world coordinates and arbitrary angles. Grid snapping may be offered for construction but is not mandatory; 8-direction graph search is not a gameplay target. Travel directly when clear, otherwise follow a Recast corridor with full-body-checked simplification. Preserve exact support seams so a shorter-looking line cannot cut through a ramp crest, floor or wall. Walking bodies have circular footprints (upright capsules or suitable short cylinders) from a shared movement profile.

Straight steering and direct destination requests can cross coincident rectangular support edges without requesting a detour. The shared helper checks each segment and support transition with ordinary body admission, retaining exact slope heights and seam points. It queries seam-touching supports through the existing spatial index and bounds work by admitted surfaces. It cannot bridge a gap or select another floor. Destination requests first try physically checked support changes at either endpoint, preserving direct ramp entry where its foot lies inside a larger ground patch. The longer support walk then validates its final segment against the exact destination without repeating that waypoint, retaining the existing route-point bound; a refused full motion prediction remains subject to the existing sampled travel bound. This avoids rejecting physically connected ground merely because approximate mesh heights exceed the projection tolerance. [PX01 evidence](verification/first-threat-encounter.md#px01-integrated-encounter--october-6-2026) records the reproduced escape and corrected path; [review measurements](verification/first-threat-encounter.md#px01-navigation-review--october-6-2026) cover ramps and current surface/obstacle limits.

Navigation approximates walkable space; physical support and collision decide the accepted result. A 1.5 cm support comparison is not placement fidelity. The [calibration contract](../archive/07-technical-architecture/spatial-world-runtime.md#movement-calibration) permits practical Recast raster resolution while retaining storey identity and continuous feet. A returned partial route is not success. Stop safely and replan within a small bound when geometry changes; do not alternate between small waypoints, overshoot an endpoint, smooth through obstacles or retry forever.

Required route preparation is a technical hold outside the mutation lane, not paid deliberation or extra world time. The current world stops native time until admitted required data is ready, with cancellation/read/pause/restore still available. CPU speed must not change how hungry an actor becomes while planning the same route. Saved pending work can resume after load by reconstructing derived navigation data.

Special traversals require their own native actions and capabilities. Teleporting to a known valid destination does not need a walking route; planning an itinerary that uses portals belongs above ordinary ground navigation. Flight remains a separate constrained native family.

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

## Perception range guides

**Implemented display feature.** Two independent bottom-right **Sight** and **Hearing** icon toggles save device-local preferences through the existing preference helper; both start off. Hover/focus explanations identify the complete regions and reference. The same controls remain available below an open narrow conversation sheet. They change only graphics: character senses, observations, recognition, descriptions, memories, AI information, actions and spending admission are unchanged.

Sight uses continuous teal outlines with short hover labels **Clear sight** and **Within sight**. The inner division reuses the existing presentation-only focus fraction; it adds no observation or description tier. The outer limit uses the character's actual sight range. Native line-of-sight queries from the character's eye to the same-sized reference person's exposed body clip both areas against physical geometry. Camera floor focus, cutaways and read-through do not change that geometry.

Hearing uses dashed amber outlines with short hover labels **Clear speech**, **Some words** and **Faint sound**. The reference is **normal-volume speech from someone the controlled character's size**, using their body/ear anchors. Native acoustic thresholds, hearing sensitivity and background sound determine the radii; native barrier transmission adjusts the sampled reach. This is a possible-speaker guide, not a map of actual people or sound sources. Sound can cross a sight-blocking barrier when the authored transmission permits it. Existing hearing, intelligibility and speech-volume rules are unchanged.

Each sense has a very faint tint across its outer displayed area; inner bands do not stack extra tint. Sight and hearing use the same surface mesh for their fill and outline. Boundary cores are thinner with one faint halo; successive bands still dim. Depth testing keeps the fills and lines behind objects. There are no persistent line labels or pick targets. Boundary hover text appears only over a displayed line when no world object or HUD has priority, is pointer-transparent, and stays beneath other labels/UI. Color is supplemented by solid/dashed lines, eye/ear icons, accessible toggle names and explicit tooltip region names. The effect has no decorative animation, including under reduced motion.

### Display approximation and updates

The guide samples **only already-public map geometry**, never actor/sound-source lists or undiscovered topology. Geometry without public disclosure suppresses the field. Samples use the controlled character's XYZ position and sensory anchors, independently of camera position. Grounded characters prefer their own support surface, then the declared surface nearest their height, with the native ground plane as the remaining candidate. Airborne characters use a horizontal cross-section at their current foot height. This is a surface guide, not the complete three-dimensional volume or every stacked floor simultaneously.

Bounded angular/radial sampling retains separate visible patches, including ground visible farther beyond a deck edge. Sampled triangles are clipped to each sensory band; native checks at their centers and edge midpoints reject hidden interiors, while support-height checks reject bridges between discontinuous surfaces. Their remaining exterior edges form closed outlines, including around excluded patches. Small conservative holes can remain, but their outlines are connected rather than dropping ambiguous border pieces. Map extents clip and close the displayed area; those edges describe the mapped area, not a new sensory threshold.

Thin obstructions or narrow openings can fall between the checked samples. Interpolated triangles, the reference person's size and surface selection are display approximations, not complete exact visibility volumes. A closed outline does not imply continuous visibility across every point inside an approximate triangle; actual gameplay queries remain exact to their existing model. Do not interpret an omitted display patch as a new gameplay refusal.

Only pose/support, sensory parameters, map revision/extents/disclosure, world/timeline/access and display choices invalidate the cached field. Rebuilds are coalesced outside rendered frames with at least 100ms after each completed build. Between builds, the cached graphics follow the character’s interpolated displayed foot each frame, instead of jumping between network positions. A new field samples that displayed foot; obstacle clipping and topology may still change at a rebuild. This display approximation does not alter actual sensing. Calculation yields between small batches with a nominal 4ms slice budget, retaining previous graphics until the complete replacement is ready. Map/disclosure, support/sense and world/timeline/access changes cancel old calculation and clear its graphics immediately. The budget cannot interrupt an individual geometry query, garbage collection or graphics replacement; it is not a hard frame deadline. Camera motion reprojects cached points; unrelated entity motion or speech does not recalculate it. Turning both guides off clears graphics/hints immediately and performs no field calculation. Meshes/materials/timers are scene-owned and released on replacement or teardown. [RG01](limits/interface.md#rg01--perception-range-guide-display) owns the chosen visual threshold, sampling and rendering bounds; [earlier verification](verification/perception-overlays.md) and [current walking evidence](verification/embodied-feedback.md#guide-and-escape-costs) record native/browser checks and their limits. Broader viewport-aware gameplay and sight-blur qualification remain separate SW09 work.

## Tactical camera and perspective

The camera supports a 3D focus point, horizontal orbit/yaw, vertical viewing angle/pitch, pan, zoom, recenter, and explicit level focus. Orthographic projection is the default tactical view; perspective is supported as a presentation mode. Changing the viewing angle, switching projection, and changing the focus level are distinct operations.

The implementation supports rotation from the first camera slice. A presentation profile may lock yaw, constrain pitch, or offer snapped headings to suit sprite art. Locking rotation is configuration, not a return to a flat world or a different spatial schema. Initial sprite-friendly bounds should avoid grazing-ground and directly overhead views that make flat artwork unreadable; developer inspection may permit wider bounds.

Camera movement is usable while the simulation is paused. It does not advance time, move the actor, wake an NPC, or regenerate artwork. Keep deliberate player camera settings separate from world state. Restoration resets invalid target references and reauthorizes the embodied view before acquiring new visual evidence.

### Levels and cutaways

A level selector changes the focus and displayed slice, not the actor's position or the selected route's destination. Levels are named/grouped surfaces, not necessarily equally spaced horizontal planes. A sloped path can span several heights while remaining one connected surface.

When a roof or upper floor obscures the selected lower area, presentation can fade or cut away the covering geometry. Its collision, support, sight blocking, and acoustic effects remain intact. Concealed entities are not sent to the ordinary client merely because a roof has been faded. A separately authorized god view can inspect them without granting character knowledge.

The existing embodied-visual-parity policy remains: the active server-approved viewport narrows the character's bodily visual exposure; it does not replace the body with the camera. A camera-side wall may also hide a body-visible object from the displayed view; approved presentation cutaways can remove that camera obstruction, never the body's physical one. NPC vision remains independent of the player's viewport. The [sensory owner](../archive/07-technical-architecture/perception-and-attention.md#embodied-visual-parity) specifies the accepted connected-background body-sensing exception and one foreground embodied view; creator inspection remains separate. Toggleable sight blur/detail and hearing indicators follow that owner.

Current presentation adds profile-configurable local read-through for already body-authorized targets. Viewport validation remains unimplemented; read-through does not supersede the accepted parity/background policy. See [World presentation](world-presentation.md#local-read-through).

### Picking and controls

A compact bottom-right camera toolbar keeps zoom, recenter, follow-player, rotation, tilt, projection, rotation lock and floor selection visible. Icon controls have accessible names and hover/focus explanations; the information icon explains gestures and shortcuts. Follow is an explicit pressed toggle beside recenter, with a visible checkmark when active. It defaults on, persists as a local presentation preference and tracks the rendered player smoothly. Panning or selecting a floor disables follow; zoom, orbit and projection preserve it. Recenter is a one-time action and does not enable follow. Follow clears floor focus so the player's actual height remains centered.

A click intersects actual permitted spatial geometry, not an assumed `y=0` plane. Where several floors lie beneath the pointer, focus level and an explicit surface choice disambiguate them. Show the chosen floor and destination before submission. The server independently checks the submitted location and actor permissions.

Preserve existing click-to-act and contextual menus. Orbit and pan gestures must not accidentally submit movement on release. Provide keyboard and visible-button alternatives, touch controls, recenter, and reduced-motion behavior. Existing inventory/crafting/world-agent shortcuts must not be silently reused for camera controls.

Sprite silhouettes and 3D meshes can both be picked, but visual picking is only a proposal about a permitted object. Picking hidden transparent pixels, stale remembered art, or an occluded object's label cannot disclose live details or bypass action admission.

## Mixed sprites and models

Every visual attaches to a stable gameplay entity and an explicit world-space anchor. Its representation may be a single-view billboard, directional sprite set, modular 2D rig, procedural mesh, or imported rigged model. The same instance can switch representation without changing its body, position, inventory, abilities, support, or event identity.

Single-view sprites may face the camera as an acknowledged visual approximation. Directional sprites select a view from relative actor/camera orientation. A 2D image cannot reveal a correct previously unseen backside; missing directions use a declared fallback rather than silently generating art on every camera turn. Full mesh models naturally support more viewing directions, but art quality and animation coverage remain separate work.

A sprite's ground anchor follows the actual surface height. A flying sprite remains at its real altitude with an appropriate projected shadow or height indicator. Billboard tilt, animation bobbing, and painted perspective are presentation offsets only. Dynamic shadows project onto actual receiving surfaces, including multiple receivers beneath one footprint; they do not snap wholesale between centroid-selected floors. [World presentation](world-presentation.md#continuous-shadows) owns lighting and shadow policy.

Static landscape and buildings may use simple 3D geometry with painted textures. A flat backdrop cannot remain geometrically correct under arbitrary orbit; identify such backgrounds as decorative and exclude them from interaction or constrain the associated camera profile. Interactable surfaces must be depicted consistently enough to make their height and boundaries understandable.

Generated assets are validated, versioned, cached, and loaded asynchronously through the existing art pipeline. Native fallback art appears immediately for an admitted entity. A late asset cannot resurrect a deleted creature, change its hitbox, or arrive into a discarded save timeline. Standard model and image formats remain portable; PlayCanvas-specific objects stay in the renderer adapter.

## Static scenery

Public spatial layout may declare static artwork with stable identity, a trusted appearance key, seed, XYZ foot, width/height and shadow choice. It grants no native support, collision, sensing obstruction, actions or actor knowledge. Worlds can omit artwork entirely. Current validation bounds finite placement/size, keys and collection growth; [SP07](limits/spatial.md#sp07--public-static-scenery) owns the rendering budget. Records persist independently with geometry and unchanged maps reuse the existing public projection/transport comparison. Authored density, shapes and population belong to [the bundled landscape](worlds/base/landscape.md), not the engine or client placement loops.

## Boundaries of the first substantial release

The first substantial release delivers meaningful elevation, overlapping surfaces, 3D ground navigation, height-aware interaction and senses, controllable tactical cameras, sprite anchoring and picking, a small demonstrated flight family, and same-version save/load. One simple test mesh proves mixed representation; bespoke 3D character production is not required.

It does not imply turn-based combat, a cover system, arbitrary destruction, swimming, ropes, vehicles, procedural skeletal animation for every invention, full atmospheric acoustics, or a new multiplayer architecture. The interfaces should admit these through later native families rather than pretending their mechanics already exist.

The key invariant is simple: **one spatial world, one source of physical truth, and several ways to draw it.**

## Physical contact

Entity contact means their physical body surfaces meet or their occupied volumes overlap, not that their position markers fall within a sensory radius. The current body representation uses upright cylinders: compare horizontal separation against the sum of body radii and require overlapping vertical height intervals, with the spatial provider's numerical tolerance. A character standing within a campfire's occupied volume or resting on its top counts as contact; a nearby character outside that volume does not. Height separation matters even at identical horizontal coordinates. A physical barrier must not become a sensed contact through a wall.

The optional body-contact detector uses this relation and existing barrier checks to produce private contact episodes for actors granted that sense. Its radius field is zero and grants no remote perception. Broad candidate lookup derives its search extent from physical body sizes, then checks exact contact. It does not grant sight, identity, deliberate examination or damage. Ordinary movement and collision checks do not depend on contact sensing. The current campfire uses the existing generic object body profile; detailed flame shapes, temperature exposure, burns and contact with map surfaces are separate mechanics.

Existing saved proximity-detector definitions upgrade in place to body contact with their authored bindings preserved. Obsolete active proximity contacts are cleared and actual contacts are reacquired; historical experiences remain historical evidence rather than current contact state. No world reset or replacement sense is introduced.

## Maintained records

- Implementation: [Feature tasks](maintainers/spatial-world.md).
- Limits and constraints: [Space, movement and perception inventory](limits/spatial.md); [range-guide presentation](limits/interface.md#rg01--perception-range-guide-display).
