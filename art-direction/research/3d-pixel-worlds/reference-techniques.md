# What the reference creators actually built

**Current art direction:** the [current visual requirements](../../decisions.md#current-visual-requirements--october-16-2026) pair beautiful dimensional pixel art with believable proportions and explicitly reject visibly low-poly, blocky, cutesy and big-head/small-body styles. Technique evidence below remains useful; Bitgem is a rejected style reference, not a recommended source family.

Reviewed October 14, 2026. **Confirmed** below means supported by a creator, official documentation or the supplied transcript. **Observed** means visible in the saved media. **Proposed** means an OpenLegend recommendation. A screenshot cannot establish mesh topology, texture resolution, shader code or performance.

## Garbage Country and Noio's Blender tools

**Mike's preference:** strongest environmental endorsement in this research set. [Steam reference](https://store.steampowered.com/app/2530870/GARBAGE_COUNTRY/) · [official press kit](https://www.noio.nl/garbage-country-presskit/) · [six saved screenshots](gallery.md#garbage-country).

**Confirmed:** the [2023 forest/bridge article](https://80.lv/articles/impressive-3d-voxel-environment-set-up-in-unity) identifies Thomas van den Berg / Noio, Unity and his Blender pixel-art workflow. Despite “voxel” in the URL, it does not establish that the commercial game's world consists of voxels. The current press kit credits a team including Thomas van den Berg, Rita Brederson, Maarten Boot and Elijah Cauley; it does not publish the complete renderer.

Noio's [Pixel Unwrapper, formerly PixPaint](https://github.com/noio/Pixel-Unwrapper), provides the stronger technical evidence. It arranges UVs—the mapping between a mesh and its texture—so pixel and mesh edges align, supports a pixels-per-unit target, and uses nearest/Closest sampling. Modeling and painting can be iterated together. Distorted faces can still distort pixels; the tool does not invent good texture art. Its MIT code license does not license game artwork. [Releases](https://github.com/noio/Pixel-Unwrapper/releases) · [creator demonstration](https://youtu.be/9ao1PM7GTS8).

**Observed:** large quiet ground shapes support detailed vegetation and industrial remains. Color and atmosphere separate distant layers; water edges and tree silhouettes contribute more than uniform texture noise.

**For OpenLegend:** investigate this authoring workflow before adding more cubes. Keep the distinction between a documented earlier Noio workflow and an unverified claim about every current Garbage Country asset. The [older Noio site/logbook](https://www.noio.nl/) is historical context, not current production documentation.

## EthrA

[Official studio](https://stonelabgames.com/) · [Steam](https://store.steampowered.com/app/2177510/EthrA/) · [requested Kickstarter](https://www.kickstarter.com/projects/ethra/ethra-by-stonelabstudio/description) · [saved environments and characters](gallery.md#ethra).

**Confirmed by the developer:** in a [2023 Unity discussion](https://www.reddit.com/r/Unity3D/comments/157dsnb/after_3_years_we_are_releasing_the_first_teaser/), `fikiy` describes a 3D world with pixel-art textures, 2D sprite characters, and some 3D weapons. In a [January 2026 explanation](https://www.reddit.com/r/EthrA/comments/1qktz70/how_is_that_possible_to_make_a_game_lookinn_like/), the same developer explains that separate sprites form body parts, those parts rotate horizontally and vertically, and the assembled character is animated like a 3D character. The developer also reports CPU optimization work; that is not an OpenLegend crowd benchmark.

Thus the supported description is **an articulated sprite character in a 3D scene**, not automatically a single billboard, cube figure or ordinary skinned mesh with a pixel filter. Exact part geometry, view counts, depth handling and orientation rules remain undisclosed. Later secondary descriptions of model rendering are insufficient to establish a pipeline change against these direct explanations.

**Proposed:** compare this option with a painted, skinned polygon character. Articulated sprites can preserve deliberate facial marks, but parts must join convincingly and survive camera pitch, rear views, equipment and changing light. Higher fidelity requires more usable source detail and screen area; it does not follow from copying EthrA's small characters. Mike endorsed the environments while explicitly requesting richer characters.

## The Last Night

[Official studio and animated scenes](https://oddtales.net/thelastnight/) · [Steam](https://store.steampowered.com/app/612400/The_Last_Night/) · [trailer](https://www.youtube.com/watch?v=louPNjfMy2E) · [making-of](https://www.youtube.com/watch?v=UJfeziEzSg4) · [saved scenes](gallery.md#the-last-night).

**Confirmed from Mike's supplied making-of transcript:** Tim Soret describes composing color, mood and space, building layered pixel artwork, using filmed movement to guide animation, and moving beyond flat parallax into 3D placement with realtime lighting and other effects. The trailer was carefully authored shot by shot. The [studio page](https://oddtales.net/thelastnight/) lists Unity, Aseprite, Blender and Amplify among its tools. This is deliberate asset art supported by a renderer, not evidence that a generic model filter produces the same result.

The [Retronator analysis](https://medium.com/retronator-magazine/the-future-of-pixel-art-with-the-last-night-a9a4eb61e824) distinguishes **big-pixel** presentation from a globally low-resolution image. Large source pixels can rotate and move on a higher-resolution screen. The article examines light, reflections, focus and depth; its visual analysis should not be mistaken for a complete studio shader specification.

**Proposed:** borrow directed light, layered depth, material-specific highlights and disciplined detail. Preserve a sharp playable subject while allowing distant bright points to fall out of focus. Our wilderness can use fire, moonlight and water instead of inheriting a neon-city setting. Free orbit still requires complete surfaces or carefully authored directional representations; a controlled side-view trailer does not qualify that requirement.

The [fan wiki](https://thelastnight.fandom.com/wiki/The_Last_Night_Wiki) provides supplementary visual navigation, not primary pipeline evidence. Historical promotional images are labeled as such; this research makes no release-status claim.

## REPLACED

[Requested fan discussion](https://www.reddit.com/r/videogames/comments/1szow09/appreciating_the_amazing_art_direction_of_replaced/) · [official Steam media](https://store.steampowered.com/app/1663850/REPLACED/) · [saved screenshots](gallery.md#replaced).

**Confirmed:** developer Yura Zhdanovich's [Xbox article](https://news.xbox.com/en-us/2026/04/14/replaced-combat/) describes painstaking frame-by-frame animation after experiments with 3D animation produced an unsuitable noisy result. Cinematic framing and lighting contribute to how motion reads.

**Observed:** warm/cool separation, atmospheric layers and relatively fine figures coexist with broad, quiet shapes. Small bright accents lead attention through complex scenes.

**For OpenLegend:** this is a benchmark for artistic finish, gestures and readability. It is not evidence that all actors are freely orbitable textured models, or that its animation labor disappears in a generative workflow. A side-view animation can exploit a silhouette that does not work from every overhead angle.

## Kingdom: New Lands

[Official store reference](https://store.steampowered.com/app/496300/Kingdom_New_Lands/) · [saved scenes](gallery.md#kingdom-new-lands).

**Observed:** side-view silhouettes remain readable against layered vegetation; reflections and a controlled palette make water and weather carry much of the atmosphere. This is an art/composition reference, not evidence of a freely orbitable 3D environment. No specific reflection shader or hidden geometry is established here.

**Proposed:** use broad value separation and restrained movement around detailed scenery. Do not require every leaf or ripple to be individually modeled, and do not infer a 3D production method merely because the scene has depth.

## BitGem's 3D Pixel Dungeon

**Style rejected by Mike, October 16, 2026.** Retain this section as historical evidence of modular construction and texture organization; it is not an art target or acquisition recommendation.

[Requested Sketchfab model](https://sketchfab.com/3d-models/3d-pixel-dungeon-10042e046a53424385a5170bf0cc8d3b) · [creator portfolio](https://bitgem.artstation.com/projects/4bXZk) · [current product description](https://shop.bitgem3d.com/products/low-poly-3d-pixel-dungeon-set) · [saved previews](gallery.md#bitgem-dungeon).

**Confirmed:** the creator documents low-poly, UV-mapped, textured modules and shared texture atlases. The portfolio describes an older roughly 148-piece starter set; the current product advertises over 500 pieces. Those are different package descriptions, not conflicting counts for an inspected download. Maya is named in the production information. No pack was purchased or its mesh downloaded in this research.

This is a strong example of **ordinary polygon construction plus pixel texture artwork**. Geometry makes stairs, arches, walls and props; an atlas supplies coordinated surface detail. It does not require one cube for every painted pixel.

**Proposed construction lesson:** establish module dimensions and shared texture density, paint compatible stone/wood/edge regions, build corners and transitions, then compose rooms and light them. For OpenLegend, use comparable methods on our own permitted assets. Appearance modules must still agree with real openings and obstacles. The product's stylized small characters are not the selected human-proportion reference.

## Mark Knight's illustrations

[First-person 80 Level interview](https://80.lv/articles/exploring-games-and-films-through-pixelart) · [creator site](https://markknight78.tumblr.com/) · [saved illustrations](gallery.md#mark-knight).

**Confirmed:** Knight describes Hexels and its triangular/isometric drawing grids, layered artwork and animated exports. These are constructed images; the apparent 3D volume comes from drawing, light and perspective. Layer animation or a sprite-sheet export does not make the image an orbitable mesh.

**For OpenLegend:** adopt his control of light, material marks, foreground framing and quiet versus detailed regions. A single illustration cannot supply the hidden sides of an object, correct collision shape or a complete animation rig. It is a valuable concept target, especially before deciding where geometry is actually needed.

## Pixelage's Godot demo

[Demo/project page](https://pixelagegames.itch.io/godot-3d-pixelart-demo) · [supplied transcript](transcripts/pixelage-godot-user-transcript.txt) · [saved comparison](gallery.md#tools-and-rendering).

**Confirmed from the supplied transcript:** render the 3D scene through a reduced-resolution viewport and enlarge it with nearest sampling. A fullscreen shader compares nearby depth and surface-normal samples, separates silhouette edges from internal changes, and uses masks/bias to avoid doubling some edges. Depth reconstruction uses the camera's projection. The downloadable demo targets Godot 4.4.1.

**For OpenLegend:** useful for learning buffer-based outlines and controlled low-resolution presentation. It still pixelates a rendered scene. By itself it does not author a face, create persistent surface pixels or solve arbitrary camera rotation. Engine-specific shader snippets need translation and testing, including depth conventions and transparency.

The [Godot post-processing guide](https://docs.godotengine.org/en/stable/tutorials/shaders/advanced_postprocessing.html) documents reversed depth introduced in 4.3 and backend-dependent depth reconstruction. Do not transplant old fullscreen-quad coordinates or depth comparisons without checking those conventions.

## aarthificial and the Unity rendering post

[aarthificial video](https://www.youtube.com/watch?v=jguyR4yJb1M) · [GitHub profile](https://github.com/aarthificial) · [Unity discussion by \_RedGiraffe](https://www.reddit.com/r/Unity3D/comments/1lj9wmc/feedback_on_3d_pixel_art_rendering/).

**Confirmed from Mike's inline transcript:** aarthificial snaps the rendering camera to the low-resolution grid, records the difference from the desired camera position, then offsets the enlarged image to recover smooth movement. Extra border coverage prevents gaps. Parallax layers receive their own adjustment, and selected content can bypass pixelation. This is a particularly useful solution for translated layers; it does not prove unchanged pixel patterns during arbitrary perspective orbit.

**Confirmed from \_RedGiraffe's comments:** the Unity experiment processes reduced color, depth and normal images, quantizes color and composites the enlarged output. Camera subpixel handling was still being developed in that discussion.

**For OpenLegend:** use camera compensation as an optional rendering experiment, not a reason to snap actual character positions or simulate on a pixel grid. The GitHub profile is a lead, not proof that a complete reusable renderer was located, licensed or tested. These sources do not remove the need for designed textures.

## David Holland: grass, water and lighting

[Technical article](https://www.davidhol.land/articles/3d-pixel-art-rendering/) · [developer's grass discussion](https://www.reddit.com/r/godot/comments/13rd7gj/wip_grass_3d_pixel_art/) · [developer's water discussion](https://www.reddit.com/r/godot/comments/14sxi4h/i_have_refined_my_water_shader/).

**Confirmed:** Holland explains depth/normal outlines, camera snapping with offset compensation, stylized lighting, billboards, atmospheric effects, and water combining refraction with a mirrored-camera planar reflection. The article describes a changing implementation; old custom-engine work should not automatically become a requirement for a new project.

The grass discussion describes many textured billboard blades with lighting evaluated consistently for a blade rather than independently at every height. Later comments identify `LIGHT_VERTEX` as a way to control the lighting position in current Godot. Wind and clustered silhouettes help the plants read as coherent forms instead of flickering fragments.

The water discussion confirms custom reflection/projection and lighting work. Its appearance is a combination of reflected scenery, refracted background and an authored animated surface—not one magic water texture. See the proposed [water breakdown](rendering-techniques.md#water-as-several-separate-effects) for an engine-independent construction order. No Holland media was saved where the host returned 403; the links remain available.

Additional primary implementation references: [Roystan's toon water](https://roystan.net/articles/toon-water/) explains depth-related color/foam and animated noise; [Catlike Coding's underwater view](https://catlikecoding.com/unity/tutorials/flow/looking-through-water/) explains depth, refraction and foreground rejection; [eldskald's planar reflections](https://github.com/eldskald/planar-reflections-unity) supplies a Unity implementation to study, not a PlayCanvas plugin.

## What the linked Godot proposals mean now

Status checked against the GitHub issues on October 14, 2026. An open proposal does not prove that every related effect is impossible through another mechanism.

| Proposal                                                                                        | Status at review                | Relevance                                                                                  |
| ----------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| [974 — writable lighting position](https://github.com/godotengine/godot-proposals/issues/974)   | Closed/completed; 4.3 milestone | Control where lighting is evaluated; useful for consistent blade/leaf lighting.            |
| [798 — access render buffers](https://github.com/godotengine/godot-proposals/issues/798)        | Open                            | Access needed by custom effects; investigate actual available buffers per renderer.        |
| [2935 — 32-bit viewport precision](https://github.com/godotengine/godot-proposals/issues/2935)  | Open                            | Precision for particular data/effects; not a general requirement for ordinary pixel color. |
| [1620 — nonphysical shading access](https://github.com/godotengine/godot-proposals/issues/1620) | Open                            | More control over custom lighting.                                                         |
| [7174 — stencil operations](https://github.com/godotengine/godot-proposals/issues/7174)         | Closed/completed; 4.5 milestone | Masking/compositing support, subject to the actual engine/backend interface.               |
| [2713 — custom projection](https://github.com/godotengine/godot-proposals/issues/2713)          | Open                            | Custom camera matrices, including reflection clipping techniques.                          |

The [current spatial-shader reference](https://docs.godotengine.org/en/stable/tutorials/shaders/shader_reference/spatial_shader.html) distinguishes changing `LIGHT_VERTEX` from moving rendered geometry. These issues explain historical constraints in Godot; they are not a migration checklist for OpenLegend.

## t3ssel8r and the resolution comparison

[Requested video](https://www.youtube.com/watch?v=_0PpBepvjFk) · [creator profile](https://www.reddit.com/user/t3ssel8r/) · [separate resolution discussion](https://www.reddit.com/r/Unity3D/comments/1b3rypx/which_resolution_is_better_for_my_3d_pixel_art/).

**Evidence limit:** the video was not available for full inspection here. Creator comments discuss orthographic camera snapping and controlling shading transitions; Holland also credits earlier outline work. This supports investigating those families of techniques, not claiming to have reconstructed the video's complete renderer.

The resolution-comparison discussion is a useful visual prompt. However, changing apparent scene framing and UI scale at the same time confounds a comparison of pixel density. Our test should hold subject framing, movement and UI presentation constant while varying one rendering choice. No screenshots from blocked Reddit media endpoints are included under misleading substitutes.

## Project Shadowglass

[Requested news report](https://www.tweaktown.com/news/108232/new-game-uses-custom-technology-to-create-pixel-art-worlds-that-you-can-fully-explore-in-3d/index.html) · [developer interview](https://80.lv/articles/interview-how-project-shadowglass-creates-its-impossible-fully-3d-pixel-art-look) · [saved official media](gallery.md#project-shadowglass).

**Confirmed by developer Dominick John in the interview:** conventional 3D rather than voxels, a custom Godot rendering approach, point-filtered pixel artwork, color lookup work and additional stabilization that is not fully disclosed. Blender, Affinity and Aseprite appear in the tool discussion.

**For OpenLegend:** freely explorable pixel-styled 3D is a credible visual target. This is not a published drop-in algorithm or evidence that point filtering alone prevents all shimmer. The unresolved parts should stay unresolved in our documentation; do not fill them with guesses about cubemaps, hidden voxels or a particular temporal algorithm. Its engine customization is a production choice, not proof that OpenLegend must fork or replace PlayCanvas.

## Realtime rendering and animation follow-up

The later supplied references revise the proposed production emphasis, not the evidence about these earlier creators. See [realtime rendering, lighting, grass and effects](realtime-pixel-rendering.md), [texel splatting and perspective stability](texel-splatting.md), [animation tools and techniques](animation-tools-and-techniques.md), and [tool/license notes](tool-and-license-notes.md). The [video library](video-library.md) preserves every new video link, exact attribution and evidence coverage; [transcript provenance](transcripts/README.md) distinguishes Eduardo Schildt’s showcase from Robin Seibold’s linked outline tutorial. No proprietary renderer is claimed to have been reconstructed.
