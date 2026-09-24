# World presentation

This specification owns motion presentation, mixed sprite/mesh depth, lighting, shadows, camera controls and player-controlled local read-through. [Spatial world](spatial-world.md) owns physical location, navigation and senses; [SW](maintainers/spatial-world.md) owns implementation and remaining acceptance. Visual approximations never become collision bodies, actor knowledge or permission to act.

## Camera and settings

Grounded motion and placement use continuous world coordinates. Neither camera orientation nor artwork imposes four/eight movement directions or tile snapping. Optional placement snapping is an authoring convenience, not a world law; the current default accepts fractional positions.

Right-button dragging changes yaw and pitch continuously, without snapping. Primary or middle dragging pans, the wheel zooms, and a stationary right-click retains the action menu. Preserve drag thresholds, pointer capture, cancellation, lost focus and Control-click/keyboard menu access. Release after dragging never issues a movement command. Pitch remains bounded above the ground and below a degenerate top-down view. Projection, floor focus, recentering and optional rotation lock remain independent. Camera control should help exploration, not be necessary to discover otherwise body-visible nearby details.

Local camera preferences persist separately from player-owned visibility preferences. In game settings, read-through has Off, Player only and Nearby visible objects modes, radius and strength. The current UI presets are 2/4/6/8/10/12 metres and subtle/balanced/strong; default Nearby, 6 m, 0.7 strength. Server input limits are radius 2–12 and strength 0.2–0.95. They are presentation presets, not biological sight ranges or arbitrary authored-world laws. The profile mutation and persistence owner validates them; no new preference store is introduced.

## Local read-through

Eligibility is the controlled player plus **currently character-visible** entities within the configured three-dimensional neighborhood, excluding stale remembered entities. Radius selects the protected target, not potential occluders: a tree outside the radius may hide a target inside it. Same XZ on another floor is not sufficient; body visibility still gates the result. The local neighborhood appears circular in plan, not a screen-wide X-ray mode. Changing radius never extends perception, interaction range or server disclosure. Targets outside the viewport are not brought onto the screen.

Make the target readable where intervening camera geometry obscures it, with a soft feathered boundary, mild stipple and smooth temporal onset/removal. The current implementation redraws only hidden fragments of the authorized target against retained world depth, blended over the obstruction. This is the local visual equivalent of fading the obstructing tree over that silhouette, **not** lowering the opacity of every tree or opening a hole through all background layers. It avoids exposing an unrelated unknown object behind the same tree and avoids a target-by-occluder raycast matrix. The colored/recognizable target, not a fabricated outline of an unseen actor, is protected. Depth still establishes which fragments are normally visible.

A target becoming unauthorized is removed immediately; only still-authorized presentation eases out. Picking must share target scope, alpha/feather eligibility and depth/reveal treatment, never a hidden rectangular hit area. Decorative canopy can obstruct the camera without acquiring physical collision or sight semantics. No artificial small count cap may silently hide eligible nearby details; GPU work scales with the eligible target meshes and screen coverage. Future mask batching/instancing is conditional on measurement. A more complete depth/mask cutaway is replaceable behind this presentation owner without changing knowledge rules.

The existing EPR acquisition-audience issue remains independent: this shader cannot sanitize information already exposed by an upstream event. It also does not implement server viewport leases, distant camera knowledge or multiple controlled views (D51).

## Motion and depth

Ordinary sprites use upright, ground-anchored Y-axis billboards, not a plane tilted to match camera pitch through nearby meshes. Opaque/cutout/dither depth and blended effects are separate material choices. Correct ordinary crate/character ordering must not depend on turning on read-through. Ghost art is remembered presentation only and never grants live picking, lights or animation facts.

Network snapshots may straddle ramp/ground or ramp/deck seams. Interpolate the displayed foot along the relevant physical supporting planes and their common seam; do not immediately bind the interpolated point to the destination's underlying terrain. Airborne display interpolates XYZ. When missing intermediate topology makes interpolation unsafe, snap to the latest authorized state rather than invent motion through a floor. Smooth arbitrary-angle authoritative segments remain the goal; presentation interpolation does not replace swept collision.

Future long-gap smoothing should use authorized **recent past** motion segments, not expose another actor's future route. Turn smoothing is visual, must not change bodily heading/senses, and should avoid excessive inertia or repeated destination corrections. Model articulation, directional artwork, transform replacement and richer steering remain separate capabilities. Existing ground motion already uses an arrival tolerance, exact displacement limits and bounded replanning rather than chasing tiny alternating grid waypoints.

## Sprite lighting

Ordinary world imagery is lit by default, including a newly generated image without normal/depth maps. Ambient illumination, local light color and distance falloff must affect it. Only intentionally emissive effects (fire, glow), markers and appropriate UI use unlit materials. Do not treat a flat sprite as self-emissive just because it lacks geometry.

The current fallback supplies a forgiving rounded virtual normal field and wrapped diffuse response with two-sided material support. This gives a useful lighting response on simple pixel artwork; it is not inferred anatomy, correct hidden geometry, foliage self-occlusion or a guaranteed commercial game's visual fidelity. Camera-facing artwork, world heading and shadow orientation must remain conceptually separate. Normal/depth maps, cylinder/trunk versus canopy profiles, foliage translucency, per-asset surface roughness and real meshes are progressive improvements, not requirements for basic illumination. Existing painted shadows may need art adjustment to avoid conflicting light directions.

Use PlayCanvas's materials, lights, shadow maps and camera post-processing rather than a second renderer. The initial budget is one principal sun, ambient day/night shading, up to eight closest currently observed fire lights, only one of those local lights shadow-casting, restrained bloom and ACES/color grading. A shadowed point light is six views: do not make every new torch shadow-casting. Emission and illumination are different; a bright image alone does not light its neighbors. Unsupported/remembered sources do not create ghost lights.

The appearance target includes readable stylized 2.5D night scenes, torch-lit foliage and strong atmospheric contrast. This does not require ray tracing, ubiquitous dynamic GI or high-fidelity rigged models. Baked environment lighting may supplement stable scenery, but must not bake a constructed/destroyed object's permanent shadow into an otherwise editable world. Ambient occlusion, environment probes, tone/quality presets, reduced-motion behavior and antialiasing need visual/performance qualification. TAA is not enabled by assumption: it can smear pixel art or moving dither.

## Continuous shadows

Use actual dynamic light projection onto rendered receiving geometry for terrain, ramps, decks and substantial meshes. Simple world-anchored rounded shadow-only proxies represent sprite bodies/canopies without becoming gameplay colliders; meshes can cast their own shadows. A footprint can cover the ground and ramp at once because receivers are per rendered fragment, not one centroid-selected support. Do not move a whole blob between floor heights as an actor/bird crosses a receiver edge. Do not double-darken the same contact with an equally strong blob and proxy shadow.

A disconnected deck naturally intercepts part of a shadow and leaves other parts below; real geometric discontinuity is not a bug to erase by interpolating through empty space. Geometry-aware positioning and receiver geometry must nevertheless agree. Floor cutaways retain shadow casting, collision and acoustic effects; hiding the camera-facing roof must not open physical sunlight or sound through it. Generated shadow proxies must remain simple, reusable and stable under camera rotation.

A clipped multi-receiver blob/decal is a fallback for low-end quality or art that rejects a proxy, not an additional mandatory shadow engine. Qualify bias/acne, thin floors, foliage, low sun, lit backsides, many nearby receivers and point-light cost before expanding quality budgets.

## Boundaries and extension

The renderer consumes authorized plain views and presentation settings. PlayCanvas classes, GPU handles and shaders stay in the client. Recast and Rapier do not solve lighting, alpha depth or this reveal policy. Current sprites and simple meshes coexist; arbitrary generated GLB loading, skinning/normal generation, late-asset fencing and full representation swaps remain SW-owned future work. No image generation is needed for camera rotation or native movement.

Current facts are in [Architecture](architecture.md#spatial-world-foundation); current evidence is in [Recast integration](verification/recast-integration.md). The [maintainer tracker](maintainers/spatial-world.md#sw18--world-presentation-delivery) distinguishes implemented approximations from unqualified graphics behavior and future features.
