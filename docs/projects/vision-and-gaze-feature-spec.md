# Physically coherent vision and independent gaze — feature specification

| Status      | Current progress                                                                                                | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Design complete and reviewed; VG01–VG08 implementation, runtime qualification and playtesting have not started. | 2026-10-24   |

## Purpose and ownership

A character can walk toward home while looking at the animal beside the path, watch an entrance without staring at their feet, lose a face in shadow while still seeing a silhouette, or notice a spear protruding beyond cover without seeing its carrier. Their body, surroundings and actual visual exposure determine the available information. The player camera does not.

This is **module B — vision and orientation** in the [shared stealth contracts](stealth-awareness-tech-design.md#physical-orientation-posture-and-senses). The [technical design](vision-and-gaze-tech-design.md) specifies the producer and integration; [VG00–VG08](../maintainers/vision-and-gaze.md) own design and future delivery. The selected scope completes the visual/physical-orientation portion of [ND13](../maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization), with sensory/body/stat/light connections to ND03, ND05, ND06, ND08 and ND16; it does not close those broader programmes.

A owns noticing, evidence accumulation and storage, recognition, names, independent fact freshness and remembered knowledge. B supplies actual visible opportunities, detail and physical orientation. C owns posture, locomotion/contact policy and sound. E chooses whether and where to look, inspect, watch or investigate. F decides preparedness and surprise. G owns controls, camera privacy and presentation using A's permitted results.

The existing `docs/projects/stealth-awareness-tech-design.md` remains unchanged and authoritative. This feature creates no second action channel, knowledge store, attention scheduler, awareness flag or hidden/visible switch on an actor.

## Current behavior and selected target

The inspected code is `Macrofold/OpenLegend` at contracts tip `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e`. Current vision checks a finite radius and obstruction along several body-height rays. The actual body and support already exist; movement currently turns body heading toward movement, guards depend on that heading, and client lighting is presentation. Predicted motion handles some fleeting sight/contact intervals, while other movement remains sampled.

Independent head/eye orientation, directional fields, material transmission, world-authoritative light, part-specific visual fidelity and complete temporal coverage are **selected design targets**, not delivered runtime features. The current experimental four-metre setting limits movement between sensing evaluations; it is not a four-metre sight range. The bundled sight range is currently 28 metres. This design retains finite range and the existing clock, and replaces reliance on that displacement approximation for the visual events promised here.

All acceptance below is future acceptance. Source inspection and paper scenarios establish a design, not measured performance, successful gameplay or player enjoyment. No runtime code or executable tests belong to this assignment.

## What should be enjoyable

The useful choice is often where to stand, what to expose, whom to help or what to learn. Ordinary movement and conversation remain sufficient for ordinary encounters; independent gaze should make them richer without adding a vigilance chore.

- **Keep a relationship in view.** Back away from an unfamiliar animal while watching it, carry supplies beside a companion, or glance behind during a retreat. The useful information and the movement cost depend on the actual body. A wide-eyed grazer and a forward-looking person offer different opportunities.
- **Make a place easier to use.** Clear one view through camp vegetation, place a screen beside a work area, or move a lamp so a helper can see the task. These alter the same geometry and light used for encounters. They require the ordinary supported building, manipulation or harvesting action; a menu label cannot create an aperture.
- **Trade exposure for information.** A lookout can see over a barrier and be silhouetted against the sky. A viewing slit can admit sight while blocking a hand or spear. Seeing the other side does not imply safe passage or a clear shot.
- **Use light socially.** A lantern can guide a lost companion and expose its carrier. Lighting a doorway can reveal crossings while leaving faces beyond it uncertain. Extinguishing light can help departure but also make work, navigation and identifying a friend harder.
- **Learn through different views.** One person sees a face; another sees a tool; a third sees only movement. Sharing those accounts can support rescue, trade, cooperation or suspicion without anyone receiving a complete hidden portrait.
- **Invent with reliable consequences.** Screens, shutters, lamps and openings are valuable because their material and placement work consistently. Success does not require a special stealth tag, a scripted distraction or a universal crouching bonus.

These are opportunities, not compulsory NPC reactions or additional craft recipes. The first release must remain useful when someone simply walks up, speaks and continues their work. It should not require constant camera dragging, repeated look commands, a mandatory suspicion meter or perfect management of blind spots.

## Physical looking

### Body, movement, head, eyes and camera

Body heading describes the physical torso/root orientation. Movement direction describes actual displacement, including sideways or backward travel. Supported head joints and eye/receptor directions describe where visual sensing is aimed. Camera direction describes the viewer's presentation. None substitutes for the others.

Looking begins through an ordinary admitted intention. A compatible moving action can carry an orientation instruction inside that same action; an idle character can perform an ordinary look/turn action. Turning takes simulation time. The visible result reflects the accepted physical pose, including a pending or limited turn, rather than immediately snapping to the requested direction.

A body can have fixed receptors, movable eyes, one head, several supported heads or broad lateral fields. Its installed numeric policy defines the allowed angles, speed, physical mounts and available detail. There is no universal human neck, forward cone or ability to look behind. The first supported mechanism is upright body heading with bounded yaw/pitch receptor joints; arbitrary whole-body tumbling, independently simulated eyeball anatomy and a general animation skeleton are outside this slice.

When a requested look cannot coexist with a shield stance, required working view, body restriction or supported movement, the ordinary action owner refuses it or performs the explicitly requested replacement. It does not quietly abandon the task, turn the shield with the eyes, twist through an impossible angle, spend resources on a refused action or take a second physical turn in parallel. A sound creates evidence and possible choices; it does not force a reasoning person or controlled player to look.

### Deliberate watching and ordinary movement

A held doorway direction may be part of E's finite watch activity or a compatible movement activity. B provides the achieved physical direction and whether the relevant region remains in the field. E owns purpose, duration, scanning choices and what to do when the watcher notices something. A watch request alone grants no wider vision, extra evidence, preparation or automatic body tracking.

An observed person's movement can guide tracking only while A supplies current permitted location. On actual loss, the directive stops following hidden coordinates. It can retain the last permitted point if that was the admitted loss rule. Continuing a search, guessing a route or following a sound is a new choice through its existing owner.

Sideways/backward movement uses the world's admitted locomotion policy and any actual speed/clearance limits. Independent head movement alone adds no arbitrary stamina tax. The bundled policy selects slower side/back travel where the body turns away from its path; the technical and world documents keep those units and rules in one place.

## What is visible

### Field, distance and detail

An eligible receptor has a finite range, an authored angular field and different resolving quality across that field. Central vision can supply fine detail that peripheral exposure cannot. A wide-field creature may detect movement to the side while needing a deliberate turn for fine inspection. Receptor coverage is three-dimensional, including elevation and target extent; it is not just a flat wedge around the target's feet.

High Perception improves useful detection and resolving quality in supported challenging conditions. It cannot make an absent receptor work, create light in complete darkness, extend the installed maximum range, see through an opaque wall, reveal a covered face or identify an unobserved item. Ability changes affect future evaluation; they do not improve old observations retroactively. A's recognition policy remains separate from this physical detection use of the attribute.

Evidence has independently supported facets: a signal, surface or body; a bearing/region/point at appropriate precision; coarse shape or motion; exposed appearance; a carried item and its observed relation; observable pose or movement; and actually available identifying features. Missing detail is unknown. Seeing a sleeve is not seeing the entire inventory. Seeing an attacking motion is not knowing intention before that motion became available.

### Shape, pose, cover and concealment

The world uses numeric bodies, exposed parts, attachments and material regions. Eye height and target height matter on slopes, beneath platforms and around a low barrier. An object protruding from behind cover can be seen independently of its concealed owner. Crouching changes actual eye/part heights only after C admits the resulting body; it never switches on invisibility.

Solid walls block sight and light according to their material and geometry. Bushes can transmit some light and fragments of a view while allowing movement. Thin or sparse foliage can reveal a silhouette or motion; denser foliage can obscure it. The amount traversed, target motion, contrast and actual exposed extent matter. Moving through vegetation does not automatically delete that vegetation, reveal the whole mover or grant sound evidence. Any rustle belongs to C's actual contact/emission rules.

Visual concealment, collision and attack obstruction are separate material responses on the same geometry. A transparent solid can block walking while admitting a view; foliage can conceal without being a wall; a slit can admit a ray while refusing a weapon's swept volume. No subsystem infers those responses from a name, sprite alpha or a boolean called hidden.

## Light, shadow and silhouette

The installed world owns daylight, ambient skylight, admitted light sources and their occlusion. Server/native sensing evaluates these fields without GPU readback or rendered pixels. Walls and roofs block applicable direct and sky paths; local fire/light falls off with distance and cannot illuminate through opaque geometry merely because the renderer can see the flame.

The initial model is intentionally simpler than photorealistic lighting: direct sky/sun and finite local sources, material transmission, sampled physical surfaces and local background contrast. It excludes general indirect bounce, mirrors and refraction. Those missing mechanisms cannot be imitated by giving observers hidden information. Materials or worlds requiring an unsupported optical family must declare that gap.

A bright background can make a dark crossing body detectable without illuminating its face. A luminous object can itself be visible beyond the distance at which it usefully illuminates another object, still within the receptor's finite sight range. A hidden fire can illuminate an observed wall or doorway without revealing the fire's exact position, owner or equipment.

The client consumes the same world-owned clock/light meanings and only authorized current surface/source information. Artistic color, exposure and shadow quality may vary, but they must preserve the gameplay distinction between a well-lit visible feature, a silhouette and insufficient detail. Remembering a fire does not keep it burning or lighting a current scene. Accessibility and reduced graphics cannot increase the character's evidence. G decides how these limits appear in controls, highlights, tooltips and historical views.

## Time, weak evidence and fair failure

An immediately obvious exposure is offered at its actual native visibility boundary. Weaker supported exposure supplies a rate over its real duration for A to accumulate once. Camera refresh, repeated network publication and duplicate queries cannot strengthen it. Turning away, darkness, obstruction and loss of a particular part end that part's current support at the correct time even if A retains a correlated episode or a memory.

The same rules apply to a moving observer and moving target, a stationary observer turning their head, a source being lit or extinguished, and a brief opening between otherwise coarse movement checks. The engine must evaluate the actual path and meaningful crossing times before passing a dependent outcome. A short crossing can be truly below the selected detection threshold; it cannot be missed merely because neither coarse endpoint showed it.

All rates and turn durations use the shared simulation clock. Pause freezes them; 3×/8× changes elapsed wall time without changing the outcome for the same simulated inputs. Saving halfway through a turn or weak exposure resumes that same progress. Incomplete required geometry or light calculation holds the dependent transition through the existing work owner; it is not darkness, invisibility, empty space or a surprise bonus.

## Required gameplay scenarios

These are proposed acceptance journeys, with source truth kept separate from each observer's evidence. Exact numerical expectations and timing cuts are in the technical design; VG08 owns later execution and player qualification.

| ID     | Setup and useful choice                                                                                                                | Required visual result and meaningful failure                                                                                                                                                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VG-S01 | Two people meet face to face in clear daylight and ordinary range. They may speak and continue ordinary work.                          | An obvious body is promptly available; face/equipment facets depend on actual exposed parts. A can recognize or learn an individual and separately learn a name. No compulsory inspection action delays an ordinary encounter.                                          |
| VG-S02 | Someone approaches from directly behind a forward-looking person. The person may choose a glance or respond to a separately heard cue. | No ordinary rear visual grant. A permitted head/body turn exposes the approach progressively. Hearing remains independent; B never awards surprise merely because the approach was unseen.                                                                              |
| VG-S03 | A person walks sideways or backs away while watching an animal.                                                                        | Motion, torso and gaze remain distinct. Compatible tracking follows current evidence; unsupported neck/body limits or a conflicting action produce a truthful refusal/limit. Side/back speed comes from locomotion policy. A grazer can have a different lateral field. |
| VG-S04 | A masked figure walks through light, with a visible coat and a partly concealed hand.                                                  | Body and coat may be visible, hidden facial features and hand contents are absent. A may have an uncertain contextual identity hypothesis; B supplies no canonical identity or complete inventory.                                                                      |
| VG-S05 | A fire lights one side of an entrance at night; a figure crosses a bright opening and then moves behind a wall.                        | Flame, lit surface, silhouette and face quality differ. The wall blocks applicable light/sight. Current detail ends at loss; an unseen source's illumination does not disclose its coordinates. Moving/extinguishing the light changes future evidence.                 |
| VG-S06 | A person passes through bushes, then behind a solid wall; a spear projects beyond each.                                                | Foliage transmission and moving silhouette can expose fragments. The wall blocks intersecting rays. The spear can be its own visible object without identifying its carrier. Movement/projectile checks use their own material response.                                |
| VG-S07 | A moving target crosses a narrow gap while both coarse endpoints are occluded, including at 8×.                                        | Complete path/crossing evaluation supplies the actual open interval and any A threshold crossing. An unresolved calculation holds required progress; it never publishes absence. Restore or smaller time chunks produce the same evidence.                              |
| VG-S08 | An observer turns just as another actor prepares and releases a strike.                                                                | F receives only visual evidence actually acquired by its own immutable pre-outcome cut. A completed turn can expose preparation in time; a pending turn or later impact cannot backfill warning. Seeing a trusted visitor alone does not decide preparedness.           |
| VG-S09 | An observer saw a familiar person carrying a spear, then loses sight and later hears the person's voice.                               | B reports the actual end of support for spear/body facets independently; A ends the corresponding current grants at those times. A retains the old sighting; fresh hearing cannot refresh equipment or position. Looking back supplies only newly visible detail.       |
| VG-S10 | A helper moves a lamp/screen while another examines a visible mark or searches for a companion.                                        | Actual light and view can improve usable detail; the operation does not announce hidden truth, grant a new recipe or compel a social reaction. Ordinary manipulation remains usable when vision is already sufficient.                                                  |
| VG-S11 | A person looks through a small aperture, under a low roof or across a slope; a lateral-eyed animal occupies the same place.            | Eye anchors, target extent, terrain and receptor policy produce distinct results. Seeing through the aperture grants neither body clearance nor an attack path. Unsupported leaning or bodily shapes remain unavailable.                                                |
| VG-S12 | The camera or graphics setting changes while physical gaze stays fixed; save/control transfer occurs during a turn.                    | Physical evidence is unchanged by camera/graphics. Current accepted pose and action ownership survive valid restore; revoked/old-life work cannot resume. G's privacy path removes unsupported current presentation.                                                    |

## Delivery stages and scope boundaries

First deliver one safe end-to-end slice: admitted orientation, physical visual exposure and light, A's supported evidence, and G's authorized presentation. A pure native sensor whose ordinary client still reveals hidden actors is not a playable release. C's shared posture admission and F's later combat use must consume the same physical meaning.

The existing action owner needs a narrow composition extension, not a general concurrent activity engine. The current range/three-ray query and temporal predictor both require changes. The body/definition validators need real receptor/optical data; the renderer needs world-owned light inputs and facet-safe appearance. World authoring can select supported values and families only after those capabilities exist. A text description of an animal, generated mesh or arbitrary new sense name installs none of them.

The release does not require general smoke simulation, disguise authoring, mirror optics, free leaning, binocular equipment, magical sight, a day/night survival rebalance or a new stealth UI. Existing repertoire examples for those capabilities remain extension opportunities. A supported blind or nonvisual creature continues through its own senses; no visual fallback is invented.

## Fit with the broader game

Vision supports the existing priorities of survival, a defensible home, differentiated inhabitants, cooperation and practical invention. Related [repertoire entries](../repertoires/README.md) remain proposals at their existing priorities; they do not automatically enlarge this release. [VG00's coverage record](../maintainers/vision-and-gaze.md#complete-repertoire-review-coverage) owns review scope and shared integration responsibilities.

## Decisions and handoff

No new player-product decision is required to specify module B. The world's numeric defaults are authored provisional choices for implementation and later playtesting, not biological measurements or demonstrated balance. Shared-contract conflicts and any upstream proposal are recorded explicitly in the technical design and tracker; the shared interface is not silently redefined.

E receives physical goals, achieved/limited pose, current supported regions, action compatibility and exact ending/loss semantics, and chooses watch/investigation behavior. F receives A's acquired evidence and accepted orientation/work at its own cut, and owns eligibility. G receives safe physical/presentation facts through A, and owns inputs, camera/privacy and accessibility. Detailed matching, storage and freshness stay with A; actual posture and sound stay with C.

## Maintained records

- Mechanisms, source audit, data shapes and algorithmic acceptance: [Technical design](vision-and-gaze-tech-design.md).
- Design status, future implementation and qualification: [VG00–VG08](../maintainers/vision-and-gaze.md).
- Selected bundled-world laws: [Base vision and gaze](../worlds/base/vision-and-gaze.md).
- Limits and supported capability envelope: [Vision and gaze inventory](../limits/vision-and-gaze.md).
- Shared ownership and integration: [Stealth contracts](stealth-awareness-tech-design.md) and [SA tracker](../maintainers/stealth-awareness.md).
