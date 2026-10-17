# Video and source library

Reviewed October 14, 2026. This index preserves all ten videos from the realtime-rendering follow-up, the identified outline tutorial, and earlier supplied video links. Titles and authors in the first table were checked against YouTube’s public metadata. A saved URL or verified title does not mean the video was played or its full implementation inspected. Evidence coverage is stated per entry.

## Realtime rendering and animation follow-up

| Creator and video                                                                                                                   | Evidence reviewed / purpose                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| t3ssel8r — [Dynamic 3D Pixel Art Particle Lighting](https://www.youtube.com/watch?v=0xJqzUHJ2fI)                                    | Creator description reviewed: depth/normal light volumes and optional screen-space shadows. Exact renderer source unavailable. |
| IndividualKex — [Texel Splatting: Perspective-Stable 3D Pixel Art [paper, code, demo]](https://www.youtube.com/watch?v=SELiz9VRg5Q) | Paper, project page and pinned source reviewed; demonstration not run inside OpenLegend.                                       |
| t3ssel8r — [Making an Animation for my 3D Pixel Art Game](https://www.youtube.com/watch?v=1FrIBkuq0ZI)                              | Supplied animation transcript reviewed. Mike’s preferred character-quality reference; exact pixel shader undisclosed.          |
| Eduardo Schildt — [3D Pixel Art in Godot 4](https://www.youtube.com/watch?v=NNr7_fcJqWQ)                                            | Creator description and metadata reviewed; separate from the attached Robin Seibold outline transcript.                        |
| t3ssel8r — [Giving Personality to Procedural Animations using Math](https://www.youtube.com/watch?v=KPoeNZZ6H4s)                    | Supplied transcript and public Patreon follow-up reviewed; numerical caveat recorded in animation guide.                       |
| t3ssel8r — [Creating a Scene for my 3D Pixel Art Game](https://www.youtube.com/watch?v=ERA7-I5nPAU)                                 | Supplied inline scene-building transcript preserved; modeling-to-rendering workflow.                                           |
| Dylearn — [How I made grass better than 99% of games \| Stylized grass 3D pixel art](https://www.youtube.com/watch?v=OxsuWDtjuGw)   | Supplied transcript and pinned public shader/script source reviewed.                                                           |
| tristangamedev — [3D Pixel Art - Explosion/Fireworks VFX](https://www.youtube.com/watch?v=On5Jt7-G4ac)                              | Title and brief creator description verified; no implementation transcript or source supplied.                                 |
| tristangamedev — [3D Pixel Art Game - Fire Particle System](https://www.youtube.com/watch?v=HyRB-02cYFc)                            | Creator description confirms separate effects buffer and composition; exact blending/settings unpublished.                     |
| Red Giraffe — [How I solved my biggest pixel art problem \| Pixel Perfect](https://www.youtube.com/watch?v=Ua2EXkOmrpA)             | Supplied camera transcript and creator description reviewed; rotation remains a limitation.                                    |
| Robin Seibold — [Outlines - Devlog 2](https://www.youtube.com/watch?v=LMqio9NsqmM)                                                  | Additional source identified from the supplied outline transcript and creator repository; not Eduardo’s video.                 |

## Earlier supplied and supporting videos

| Link                                                                                                  | Relationship and coverage                                                                                       |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [aarthificial camera/rendering explanation](https://www.youtube.com/watch?v=jguyR4yJb1M)              | Earlier user-supplied inline transcript; camera snapping, compensation and separately rendered parallax layers. |
| [The Last Night trailer](https://www.youtube.com/watch?v=louPNjfMy2E)                                 | Earlier supplied trailer link; visual reference, distinct from the making-of transcript.                        |
| [The Making of The Last Night](https://www.youtube.com/watch?v=UJfeziEzSg4)                           | Studio-linked making-of source associated with the earlier supplied transcript.                                 |
| [Earlier t3ssel8r reference](https://www.youtube.com/watch?v=_0PpBepvjFk)                             | Earlier user-supplied Unity reference retained; no new full-video review claimed.                               |
| [Noio pixel UV tool demonstration](https://www.youtube.com/watch?v=9ao1PM7GTS8)                       | Earlier creator-tool evidence for deliberately arranged pixel textures.                                         |
| [t3ssel8r reference linked by the texel-splatting paper](https://www.youtube.com/watch?v=d6tp43wZqps) | Additional research lead; no separate full-video review claimed.                                                |

Red Giraffe’s description also links earlier episodes on [crisp 3D pixels](https://www.youtube.com/watch?v=Mp7eQsiZ_wA), [outlines](https://www.youtube.com/watch?v=TVYu3y2lzYc), [oceans](https://www.youtube.com/watch?v=RU3EReALbEU) and [episode 4](https://www.youtube.com/watch?v=fKp-Lg7vAn4). Retained as related leads, not independently verified implementations.

## Code, papers, tools and creator pages

- Texel splatting: [project](https://dylanebert.com/texel-splatting/), [paper PDF](https://arxiv.org/pdf/2603.14587), [code](https://github.com/dylanebert/texel-splatting). See the [method and feasibility review](texel-splatting.md).
- t3ssel8r: [Reddit](https://www.reddit.com/user/t3ssel8r/), [X](https://x.com/t3ssel8r), [public procedural-animation notes](https://www.patreon.com/t3ssel8r/posts/procedural-video-82487305), and the user’s [Google discovery search](https://www.google.com/search?q=t3ssel8r). The search is navigation, not evidence; X did not expose useful content during this review.
- Grass: [Dylearn project](https://github.com/DylearnDev/Dylearn-3D-Pixel-Art-Grass-Demo), [Flexible Toon Shader](https://godotshaders.com/shader/flexible-toon-shader-godot-4/).
- Outlines: [Robin Seibold source](https://github.com/Robinseibold/Unity-URP-Outlines).
- Critter: [toolkit bundle](https://assetstore.unity.com/packages/tools/game-toolkits/critter-3d-pixel-art-toolkit-asset-bundle-286677), [camera](https://assetstore.unity.com/packages/tools/camera/critter-3d-pixel-camera-263695). Source access and purchase questions are addressed in [tool/license notes](tool-and-license-notes.md).
- Animation beyond the supplied videos: [Cascadeur help](https://cascadeur.com/help), [official physics workflow](https://cascadeur.com/tutor/physicspipeline2025), [Blender glTF export](https://docs.blender.org/manual/en/5.1/addons/import_export/scene_gltf2.html), [spring mathematics](https://theorangeduck.com/page/spring-roll-call), [glTF interpolation specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#interpolation).

The [first reference ledger](reference-techniques.md) preserves the earlier games, articles, water/grass posts, Godot proposals and asset references. The [transcript index](transcripts/README.md) identifies supplied text and attribution. Videos are linked, not downloaded or redistributed; source code remained outside the repository during inspection.
