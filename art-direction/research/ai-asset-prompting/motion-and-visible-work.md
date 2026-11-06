# Motion, contact and visible work

Original synthesis from the [Animation pack](https://learn.marketwithmark.com/vault/pack/animation), [Game Character Kit](https://learn.marketwithmark.com/vault/skills/game-character-kit), [FPS Kit](https://learn.marketwithmark.com/vault/skills/fps-kit) and Voxel World/Doom examples. [Coverage](coverage.md) identifies the source families. These are authoring and diagnostic options. Existing [art profiles](../../../docs/production-workflows/art-flows/profiles.md), [3D production](../../../docs/production-workflows/art-flows/3d-models.md), game-state contracts and accepted rigs own actual delivery.

## Turn an action into readable motion

1. Identify the actor/body, tool or object, support surface, start state and intended end state. Separate the visible action from the actual game consequence. A film can stage a result; a game animation must depict the result admitted by its owning system.
2. Name the meaningful phases: approach or preparation, contact, effort/change, release, and settling. Choose the phases this action needs. A pause, glance or hesitation may communicate intention more effectively than continuous movement.
3. Establish the key poses and contacts before adding small motion. Identify which feet stay planted, which hand carries the object, what supports the weight and when the support changes. For a repeated action, define the loop seam as well as the central pose.
4. Reuse a compatible clip where it solves the problem. Correct it on the selected body; author a specific gesture or mechanism where no suitable clip exists. Do not ask for a replacement character when only motion is missing.
5. Coordinate the body, prop and visible result. A hand reaches before taking an object, holds it during the load-bearing phase, and releases it before the object follows an independent path. Do not make a mark appear before the tool arrives or make material float into place while the worker gestures elsewhere.
6. Inspect the whole action and entry/exit transitions in motion. A sampled filmstrip helps locate a defect but can miss it between frames. Review the intended camera and an angle exposing contacts. Check the action at normal speed; slow inspection is diagnostic, not evidence that it reads during play.
7. Add restrained secondary motion only after the action reads: settling cloth, hair, a carried load, appropriate recoil or a small reaction. Preserve the purposeful contact rather than letting a decorative spring shake it loose.

An ordinary prototype retains its existing scope and candidate count. These steps do not require a cinematic, new motion system or repeated quality campaign.

## Contacts and pose correction

The source character system layers a clip, prop-directed arm/foot correction and secondary motion. The transferable lesson is to give each layer a defined job and inspect their composition; it is not to copy the source's logical/render skeleton split.

- **Feet and locomotion:** relate stride phase and playback to actual displayed travel. Check planted feet, turns, starts/stops and changes of support. A clip's original crouch or forward lean may be inappropriate for an upright resident. Correct the pose and re-establish support; do not merely lift the whole person or shorten the legs.
- **Two-handed holds:** solve around the real prop and both hands' reachable positions. If one hand cannot reach, revisit prop placement, grip or whole-body posture instead of stretching the limb. The palm/finger fit belongs to the actual mesh, as described in [props](props-and-materials.md#fit-hands-to-the-actual-object).
- **Orientation:** a symmetric staff or handle may permit more than one grip orientation. Choose from a stable body/prop frame and maintain continuity during the action. Choosing orientation from the solver's own changing forearm result can create a flip-flop.
- **Elbows:** preserve a plausible bend direction as the wrist crosses alignment with the shoulder. A discontinuous elbow target can make the arm snap even when the hand follows a smooth path.
- **Operation order:** smoothing a hand target before inverse kinematics can preserve contact; applying an unrelated wrist smoothing after the arm has been solved can pull the hand off the object. Inspect the complete sequence rather than tuning each layer alone.
- **Changing grips:** distinguish release, transit and regrip. Blend contact pose and approach direction together. Re-author socket-relative offsets when the socket moves; otherwise an apparently local edit can make the hand jump during the transition.
- **Seating and riding:** use the actual seat/support height and body contact, not an ambiguous floor origin. A mounted person needs a root offset derived from the saddle/seat and body proportions. Check the feet, knees and carried equipment as well as the hips.

For a visible pop, inspect whether it originates in the prop path, clip transition, grip orientation or arm solver. Per-frame angular changes and contact distance can locate the moment; they do not replace looking at the result. Retargeting by bind-relative rotations is a possible technique, but skeleton agreement alone does not prove good proportions, contact or deformation.

When blending locomotion clips, align the same contact event—such as a particular foot's landing—before mixing walk and run poses. Relate playback to the clip's observed travel/stance motion and the actor's actual speed; do not copy source speed constants. On a transition, blend from the pose currently displayed, including an interrupted transition, rather than jumping back to a nominal start. Give arms explicit ownership: a free arm may follow the clip while a carrying arm follows its prop target. Avoid applying a procedural root flip or crouch again when the selected clip already contains it. After an uprightness correction, re-establish the feet against their actual support.

## Cloth and carried motion

For hanging cloth, define attachment points, length, rest shape and the body/surface it must clear. A few authored bones or a compatible clip may be enough. Use simulation only when the requested motion needs it and its cost/fit are justified.

If a particle-panel method is selected later, preserve these source lessons:

1. Carry each attachment region with its own motion. Averaging movement across a rotating body can fling side panels into an unrelated flag shape.
2. Account for the moving support frame on vehicles or other carriers. Treating carrier translation as a fresh teleport every frame can repeatedly disturb the cloth.
3. Update the actual support/floor context when the person changes support. A stale floor constraint can crush or stretch the cloth into an implausible shape.
4. Check spin, start/stop, seated/standing transitions and the relevant collision surfaces. A good still drape does not establish motion quality.
5. Keep material readability separate from dynamics. Black fabric losing form or becoming a bright rim is a lighting/material problem, not a reason to add more particles.

A soft rest-shape influence can keep a skirt panel near a plausible hang while allowing local motion. Use only the body/carrier collision shapes needed for the visible clearance; an irrelevant narrow attachment can snag an entire cape. Prepare a settled starting drape when necessary instead of displaying a flared reset pose. These are alternatives to investigate within a selected cloth method, not reasons to add simulation to every garment.

PPL02 owns the choice of cloth method and its garment/body integration; no cloth simulator is selected here.

## Mechanisms and travel

Use a shared meaningful driver for linked motion. A wheel's rotation follows distance travelled and its radius; rods, cranks and linked wheels must retain their phase relationship. A clock's hands depict its actual chosen clock. Reversing an input-driven mechanism should return its parts through coherent positions instead of replaying disconnected flourishes.

Author pivots at real hinges and check the full travel range. Smooth interpolation can overshoot a mechanical stop; constrain a channel when the physical mechanism requires it. An exploded view can separate components for understanding, but should retain their relationships and avoid labels or parts obscuring the operation.

Derive the moving part and its contact target from the same parent transform. During a handoff, preserve the object's world pose while changing attachment, then move toward the new supported pose. A tipped object needs its pivot at the intended ground contact; rotating about an arbitrary base origin can bury half the model. For illustration controls, keep zoom, exploded separation and mechanism phase independent so changing one does not unexpectedly reset another.

For a curved travel route, distinguish distance along the route from a curve parameter: equal parameter increments need not represent equal distance. An arc-length lookup is a candidate when controlled travel speed is needed. A long vehicle can orient from two support points along the route instead of treating the entire body as a point; check curvature, coupling and clearance. Wheels, supports, passenger seats, attachment motion and camera should agree on the vehicle's position. These are retained techniques, not authorization to add transport.

Relative speed must explain passing or pursuit. A moving camera can exaggerate speed but cannot demonstrate that one subject overtook another. An anchored view helps establish actual travel. Bridges and route approaches need continuous support; a correct path curve does not prevent the model from floating above its road or intersecting terrain.

When physical motion is selected, distinguish integrated velocity from corrections that place a body back on its support; deriving velocity from a snapped position can create a false launch. Choose support from surfaces valid for that body's current movement, rather than taking an unrelated highest roof. Keep contact height and surface normal distinct. Before blending steering inputs, establish whether each represents a unit direction, a weighted preference or a force with meaningful magnitude. The source's unconditional normalization, buoyancy-order and air-speed prescriptions are specific to its controllers, not portable physics laws.

## Work that makes OpenLegend rewarding to watch

The strongest opportunity is understandable effort and consequence: a person picks up a material, positions it, uses a tool, inspects the result and leaves an actual changed object behind. A recognizable gesture, a moment of care or a small response from another person can give ordinary work personality. Constant busy motion is not a substitute for intention.

For an already-selected construction or crafting feature, map the visible phases to its real prerequisites and committed outcomes. A wall cannot appear before its supporting work is complete merely because a time-lapse looks better. Changing liquid, furrows, stacked goods or an opened mechanism should correspond to the feature's actual state. Repeated work benefits from variation in meaningful context and outcome, not a compulsory minigame or random animation noise.

For a threat, make preparation, direction and recovery readable through pose and movement. Different tactics can be more interesting than a larger indistinct crowd, but source claims about combat feel are genre-specific hypotheses. OpenLegend's tactical choices, action timing and injury rules must be designed through their existing owners; this guide does not add attack tokens, hit-stop, invulnerability, magnetism, resource drops or cancellation windows.

## Sequences, study cameras and demonstrations

For an authorized sequence, establish the place and participants, show the meaningful interaction, then give the consequence time to register. A wide view can establish scale; a closer view can reveal a contact or reaction. Use cuts, pauses and light changes to serve those beats, rather than treating continuous camera motion as cinematic quality. Keep subject identity, handedness and spatial relationships coherent across views.

Use subject-relative cameras when following motion, with a stable horizon and a deliberate view of the action. Check foreground occlusion, near clipping, frame edges and the full path. A camera cut cannot qualify a hidden defect. Demo captures should distinguish genuine play from authored cinematic staging and should not imply implemented functionality from concept animation.

For a scrubbed offline study, define pose and visible state consistently at a given time, including particles, build stages and discrete events. Deriving state from absolute study time or resetting before replay can make seeking reproducible; incremental effects alone may accumulate on repeated seeks. Bound staggered phases so the sequence actually reaches its intended final state. Keep presentation slow motion distinct from simulation time and synchronize the layers intentionally. These are study requirements only; they do not change the game's authoritative clock or event execution.
