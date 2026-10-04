# Shadow quality

| Status      | Current progress                                                                                                                                   | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Shadow improvements and scoped PG04 preview optimization are delivered; reliable sustained tails and physical lower-end qualification remain open. | 2026-10-04   |

Approved for implementation in chat on 2026-09-27. Scope: improve the existing PlayCanvas lighting/shadow system and qualify the result without requiring metadata for every image. [Technical design](shadow-quality-tech-design.md) owns the implementation plan. [World presentation](../world-presentation.md) remains the current behavior owner.

## Player experience

People, animals, birds and trees cast their current artwork's silhouette onto ground, ramps and decks, with thin details and contact matching the displayed image. Animation, facing flips and horizontal poses follow the artwork automatically. Sprites share one upright virtual body for casting, depth and picking, with shallow depth derived from alpha behind the unchanged front image; other objects can still shade them. Existing meshes cast from their geometry. Transparency supplies contact padding across animation frames, without required authored limb/profile metadata. Single-view sprite shadows follow the camera-facing image; directional artwork or meshes are needed for matching camera-independent volume. This replaces the initial compound-proxy approach after the user's close-up exposed self-occlusion and misplaced feet.

Daylight fades out at night. Restrained cool ambient illumination preserves surface detail against warm firelight without inventing a nighttime sun. Sun shadows use contact-hardening softness where supported; local fires use PlayCanvas's supported filtered shadows. Different source geometry may produce different shadows within the same system. All selected nearby fires (up to eight in Detailed or two in Economy) cast into the existing shared atlas, so secondary lights respect obstruction. This supersedes the earlier one-shadowed-fire budget and its retention margin, with quality-dependent local-light coverage and additional shadow views as the tradeoff. Selection retains admitted lights through small distance crossovers; losing observation or extinguishing a source revokes it immediately.

Replacing supported artwork replaces its associated shadow representation and resources together. Changing to a mesh replaces the silhouette caster with mesh geometry. Disappeared or remembered entities and extinguished fires provide no live shadows/lights. Camera cutaways keep casting onto real receivers.

The delivered sun-path follow-up moves sunlight continuously from the east side in the morning to the west side in the evening, higher at noon. Shadows change direction and shorten as the sun rises; intensity and direction share the world clock. Pause, speed changes and restored times remain consistent without a second client clock. This is a localized daily presentation preset, without latitude, seasons or required artwork metadata.

## Eight-fire 3× follow-up

The owner now authorizes optimization to support eight simultaneously illuminating and shadow-casting nearby fires at actual 3× game progress, targeting sustained 60 FPS at full 1080p on the available hardware. This supersedes the intermediate four-source Detailed limit; eight/two is implemented with compatible sprite shadow instancing and unchanged filtering. [Eight-fire evidence](../verification/eight-fire-three-times.md) records the achieved native 3×/1080p throughput target on the M1 Pro and its remaining frame-time/hardware limits. Preserve full-resolution artwork, current contacts, moving/animated casters, real receivers and immediate public-view revocation. [Technical plan](shadow-quality-tech-design.md#follow-up-eight-shadowed-fires-at-3) and SW18.15 own experiments and acceptance; the separately delivered [mercenary pilot](completed/mercenary-scene-pilot.md) closes the earlier missing-asset prerequisite, not the combined model/eight-fire performance gate.

## Command/frame spikes and physical hardware follow-up

The owner authorized further reduction of command/frame spikes and testing on physical lower-end hardware. [Recorded route-query work](../verification/command-frame-spikes.md) reduces isolated native preview cost, but the contended whole-game sample and unavailable second device do not close either broader acceptance target. Preserve the eight-fire/3×/1080p workload, gameplay admission and durable command ordering. Measure complete-path latency against a matched baseline; physical-device qualification needs a recorded device/browser/driver run and cannot be closed by throttling or software rendering. [Technical plan](shadow-quality-tech-design.md#follow-up-commandframe-spikes-and-physical-lower-end-hardware), PF05 and SW18.10/SW18.13 own the remaining work.

The scoped PG04 preview reduction and bounded larger-scene checks are [delivered with evidence](../verification/command-frame-spikes.md#pg04-preview-work-and-larger-load-follow-up--october-4-2026). They preserve the renderer and actual command effects; the original sustained shadow workload, comparable complete-path tails and physical hardware requirement remain open.

## Acceptance and scope

Approved full-HD follow-up: render a 1920×1080 canvas at 1920×1080 in both quality settings, removing the implicit 80% scale. Qualify sustained movement, animation, camera controls, UI, local lights and stacked receiving geometry at this resolution, and fix demonstrated depth/shadow/performance defects. Exact camera-independent sprite anatomy remains an asset limitation. The supplied mercenary is now integrated under SW18.14, with [scoped model evidence](../verification/mercenary-default.md). Its later delivery does not extend the older sprite-only eight-fire throughput result: combined model/eight-fire/3×, low-end hardware, arbitrary importing and final art acceptance remain separate qualification.

Constrained-graphics follow-up: measure the existing shadows and expose a device-local Economy option when the matched result demonstrates useful savings. Detailed remains the default. Both settings retain the same object contacts and sun clock; Economy trades shadow filtering, map resolution and local-light coverage for lower graphics cost while preserving full output resolution. The selected geometry approach preserves the 2D appearance and derives a shallow volume from alpha, with no return of unrelated invisible body proxies or per-artwork metadata. Thin features stay shallow; existing frames, contact and appearance ownership supply replacement/invalidation. This is an inferred relief, not true anatomy or a new 3D art pipeline.

- Compare a person, animal, bird, tree and mesh in daytime, dusk and firelit night; shadows retain contact and recognizable shape without color-pass proxy geometry.
- Exercise orbit, pitch, movement/pose, ramp/deck receivers, source switching/removal, sprite/mesh replacement, world reset and disposal.
- Run focused existing camera/spatial browser checks, TypeScript/build/format checks, and a bounded matched renderer workload. Report device/backend and visual/performance limits honestly.
- Keep current authorized DTOs and gameplay/collision/sense authority unchanged. No provider work or new required protocol/save metadata.

Exact anatomy from arbitrary single images, directional artwork generation, arbitrary model loading, full global illumination, new moon/weather simulation, more than the selected quality’s local-light budget and custom local-light PCSS are outside this pass. They remain possible asset or renderer improvements, not prerequisites for useful fallback art.

## Maintained records

- Implementation: [SW18](../maintainers/spatial-world.md#sw18--world-presentation-delivery), especially SW18.6–SW18.7 and SW18.10.
- Limits and constraints: [VP01](../limits/interface.md#vp01).
- Related contract/design: [World presentation](../world-presentation.md), [technical design](shadow-quality-tech-design.md).
