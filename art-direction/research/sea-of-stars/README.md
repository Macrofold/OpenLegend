# Sea of Stars: expressive pixel art for a grounded OpenLegend

Sea of Stars is a reference for expressive pixels, environmental invention, rich natural color, and light that gives a scene atmosphere and depth. OpenLegend carries those qualities into believable bodies, practical construction, coherent materials, and a wilderness capable of warmth, beauty, danger, and hardship. Its character proportions and cheerful cartoon exaggeration are outside this reference's scope.

This study develops the [current visual requirements](../../decisions.md#current-visual-requirements--october-16-2026) and [creative brief](../../final-board/creative-brief.md). It establishes visual principles and review questions; renderer selection and gameplay implementation remain governed by their existing decisions. The [full Sea of Stars dossier](../../../archive/02-research/game-inspiration/dossiers/sea-of-stars.md) covers mechanics, narrative, production, business, and reception.

## Evidence and reading boundaries

The images below are official publicity/reference material inspected on **October 18, 2026**: seven Steam storefront screenshots and three frames from the game's official lighting demonstration. They are not captures from a research playthrough. Exact game builds and capture settings are unknown. The screenshot files are 1920 × 1080 JPEGs; the demonstration frames are 250 × 250 PNGs. These are supplied file dimensions, not evidence of the game's internal rendering resolution.

Image IDs link this study to the [metadata manifest](image-manifest.json), which records origin pages, exact URLs, retrieval date, dimensions, byte counts, and SHA-256 hashes verified against downloaded bytes. Copyright remains with Sabotage Studio and credited creators. Public reference availability does not establish permission to reuse these assets in OpenLegend. Images remain at their third-party origins; no image binaries are committed here.

The visual readings are OpenLegend's analysis of inspected still images. They do not establish hidden geometry, shader architecture, collision, material simulation, interaction affordances, animation quality, or behavior during camera movement.

## 1. A memorable route can also explain its environment

![S04: Orange-brown tree trunk crossing turquoise water, with the party on the trunk and leafy rock pillars around it.](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1244090/ss_e7ac3a6e5ebe5f4561fc46d116c33678cf4ba811.1920x1080.jpg?t=1780931183)

_S04 — Tree route over water. Official Steam screenshot; exact build unknown._

The large curved trunk organizes the scene before its small details are read. Warm wood separates from cool water, and the branch's broad sweep carries the eye toward the party and onward. Grain follows the trunk's length; knots, taper, moss, and smaller branches interrupt that direction without destroying it. Leaf groups occupy selected intervals. Open water gives the route room to register.

This is useful environmental novelty: one recognizable form supplies a landmark, a route, a sense of height, and a relationship between vegetation and water. The surrounding rock pillars and hanging growth repeat the place's materials while varying their silhouette. Detail gains meaning through that larger organization.

**OpenLegend application:** begin an unusual location with a plausible relationship between terrain, life, and use. A fallen tree could connect banks; roots could retain a collapsed edge; a repaired crossing could show how residents adapted to flooding. Ask where weight is carried, how the object grew or arrived, and what use would wear away. Fantasy can enlarge the possibilities while preserving visible causes. Maintain open gaps through foliage and broad trunk structure. Filling every branch with equally sharp leaves would weaken both the route and the tree.

## 2. Colorful light works when the scene answers it

![S02: Bright golden attack light beside a large creature, with warm nearby ground and cool purple-blue vegetation at the edges.](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1244090/ss_889d4ddea7d0884d9d370dd280878570824e68fe.1920x1080.jpg?t=1780931183)

_S02 — Golden attack light. Official Steam screenshot; exact build unknown._

The bright orb has a concentrated pale core and a larger gold-orange presence. Nearby ground, the adjacent figure, and part of the creature share that warm influence. Purple-blue surroundings hold a contrasting ambient character. Dark shapes beneath the figures and creature help describe contact and weight. The effect feels spatial because several neighboring surfaces participate in the same event.

The palette is broad without every color claiming equal attention. Turquoise and magenta details remain subordinate to the main gold light. An open central floor supports the encounter, while darker, denser vegetation encloses it. This is an authored hierarchy of light, color, and detail; the still alone cannot reveal how it was computed.

**OpenLegend application:** give each dominant light an intelligible cause and reach. Fire, sky, reflected water, and magic can produce distinct atmospheres, but their influence should agree across nearby forms. A damp stone, wool sleeve, and metal tool should retain different surface character under shared illumination. Favor coherent changes of value and hue over bright flecks sprinkled across unrelated surfaces. Magic can be vivid while remaining visually situated. This image does not make the creature's exaggerated face or the party's proportions a target for OpenLegend.

## 3. Rich environments need quiet areas

![S10: Turquoise coastal combat area with a relatively open center, dark rock edges, coral groups, and a waterfall at the left.](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1244090/ss_ac7d1a4a9fb207bc59637aeb24698758e4e847ad.1920x1080.jpg?t=1780931183)

_S10 — Coastal encounter space. Official Steam screenshot; exact build unknown._

Coral, sponges, rocks, water, and shoreline marks create substantial variety. Their arrangement matters more than the inventory. Concentrated coral groups animate the margins; darker rocks establish the boundary; the broad turquoise center gives figures a comparatively quiet background. Fine surface texture is present, but its contrast generally sits below that of the party, enemy, and interface symbols.

The scene therefore offers two readings: an immediate spatial reading and a slower material reading. Small details reward attention after the player can distinguish the central figures. The crisp symbols above the enemy belong to interface presentation; decorative crystals and colorful plants cannot be assumed to represent equivalent gameplay information.

**OpenLegend application:** budget contrast as carefully as detail. Reserve enough visual calm around bodies, tools, movement routes, and important changes of state. Group vegetation and objects where ecology or human use supports them, leaving other surfaces broad. A shoreline can vary through depth, sediment, wetness, and growth without outlining every stone or saturating every plant. Review the scene at its actual gameplay footprint: if environmental texture repeatedly overtakes a person's silhouette or hand action, simplify or reorganize the texture. Beauty should support the player's ability to understand the place.

## 4. Warmth gains strength from its surroundings

![S11: A campfire on a rocky ledge surrounded by cool night colors, with a large dialogue panel and smiling character portrait above.](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1244090/ss_6c1428488a9c2aeecea2afe5f5e906be488b4dc0.1920x1080.jpg?t=1780931183)

_S11 — Camp, surrounding darkness, and dialogue presentation. Official Steam screenshot; exact build unknown._

The fire gathers warmth into a limited place. Nearby grass, path, and stone share its orange influence; the surrounding cliffs and water retain cooler, darker colors. A separate lamp creates another small warm point along the route. Sparse plants, a ladder, and the ledge's edge keep the camp situated within a larger environment.

Comfort comes from this relationship between shelter and exposure. The whole image does not need to become bright or friendly for a human moment to feel welcoming. OpenLegend's sunshine, companionship, and relief can coexist with the wilderness's scale and danger.

The dialogue panel also makes a useful boundary visible. A large portrait can carry facial expression that the small world figure cannot communicate at the same resolution. Its smiling, cartoon treatment belongs to this game's presentation. It does not establish the anatomy or facial-detail budget for OpenLegend's bodies.

**OpenLegend application:** create warmth through gathering, useful objects, protective terrain, and shared light. At close views, preserve believable anatomy and expression; at small views, use posture, orientation, silhouette, and legible activity. Evaluate portraits and in-world figures separately. A successful enlarged face is insufficient evidence that the person remains recognizable at play scale.

## 5. An activity becomes legible through a few connected details

![S14: A character fishing from a small wooden dock into blue water, with a diagonal line, bobber, fish silhouettes, and vegetation around the margins.](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1244090/ss_2f011be3599c238ff5d240bdb2bb2879e27271f1.1920x1080.jpg?t=1780931183)

_S14 — Fishing and a largely open water surface. Official Steam screenshot; exact build unknown._

Most of the composition is water. A small dock anchors the figure, while the pole, fine diagonal line, and bobber connect the person to an activity farther away. Dark fish silhouettes and submerged bank shapes provide interest without filling the whole surface. Vegetation and reddish rock gather at the edges, making the open blue area feel intentional.

The recognizable relationship between a few objects does considerable work. Adding more unrelated props would not necessarily improve the scene. The dock supplies a place to stand; the line connects action to destination; water marks suggest a medium with depth and variation. The screenshot provides no evidence for visibility, detection, or fishing rules.

**OpenLegend application:** spend detail on relationships a person could notice and use. A rope should have an attachment; a tool should sit in a plausible grip; a working place should show access and support. Water should vary through readable depth, reflection, banks, and disturbance rather than uniform glitter. Displayed fish or tracks must obey the world's actual knowledge and visibility rules. Attractive decorative silhouettes cannot quietly reveal entities the player should not perceive. This is an art-direction constraint on presentation, not a new fishing-system requirement.

## 6. Danger can have color and readable structure

![S22: Dark coastal battle scene with a muted open central floor, jagged margins, bones, broken timber, and green lights.](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1244090/ss_edc55d230d64161bcbd2bed3195b260027d3b46e.1920x1080.jpg?t=1780931183)

_S22 — A darker environment. Official Steam screenshot; exact build unknown._

The desaturated center remains distinguishable from nearly black, jagged edges. Crooked vegetation, bones, tied poles, and broken timber make the place feel damaged or threatening. Green luminous accents give the darkness a specific character. Central figures and interface panels remain visible against the relatively broad floor.

The useful lesson is control over mood without surrendering all information. Threat arises through shapes, material condition, spacing, and selected light. Making every surface equally black would erase many of those cues. Equally, copying bones and wreckage into every region would make their meaning ordinary.

**OpenLegend application:** tie ominous details to a place's history and conditions. Flood damage, scavenging, abandoned work, hazardous footing, or unnatural growth can each support a distinct kind of danger. Preserve enough separation to read bodies and terrain at the intended visibility level. Do not make permanent gloom the game's identity: a bright day can expose hardship, and a dark shelter can offer relief. Strong emotional range depends on specific circumstances and contrasting experiences. UI legibility and world visibility require separate review; an interface can remain readable without illuminating hidden world facts.

## 7. Geographic variety should survive the change of scale

![S01: Stylized world map with layered cliffs, waterways, a miniature harbor settlement, clouds, routes, and a large red creature.](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1244090/ss_c250a7fd789b3cbab5ca8e99e3530cf933656ad1.1920x1080.jpg?t=1780931183)

_S01 — Geographic overview with compressed map scale. Official Steam screenshot; exact build unknown._

Layered cliffs, water, plateau routes, a harbor, cloud cover, and a large red creature establish several memorable shapes. Differences in elevation and shoreline give the eye an organizing structure. The image feels varied before individual roofs or plants receive attention.

This is visibly a compressed overview. Party symbols and buildings do not share plausible inhabitable scale. Its value as a reference lies in geographic identity and landmark relationships. It cannot justify tiny buildings, oversized people, or decorative terrain that fails at ground level.

**OpenLegend application:** give regions identities through terrain, climate, settlement practices, and materials. Carry those relationships into the place a person actually occupies: usable paths, workable doors, supported structures, believable banks, and meaningful distances. Landmarks should remain distinctive across the views the game supports. Novelty can arise from combinations—a settlement adapting to a steep wet slope, for example—while construction and anatomy stay grounded. A handsome overview is only one view of a world whose parts must remain coherent when approached.

## A lighting comparison, not a clock or motion test

These three official demonstration files show the same small terrace composition under visibly different lighting conditions. They are embedded at their supplied **250 × 250** dimensions; the frame numbers are source identifiers, not clock times.

| T003 — Warmer overall cast                                                                                          | T036 — Darker ambient surroundings                                                                                                                | T083 — Brighter ambient surroundings                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![T003: Terrace with a warm red-orange cast.](https://seaofstarsgame.co/wp-content/uploads/2024/03/tod2024-003.png) | ![T036: Same terrace with darker surroundings and a prominent warm window.](https://seaofstarsgame.co/wp-content/uploads/2024/03/tod2024-036.png) | ![T083: Same terrace in brighter ambient light with clearer wood and foliage.](https://seaofstarsgame.co/wp-content/uploads/2024/03/tod2024-083.png) |

Wooden boards, draped fabric, figures, foliage, and the left window keep their positions. Their relative prominence changes. In T036, the warm window has stronger contrast against the surroundings; in T083, more ambient surface information is readable and the window attracts less attention. T003 gives the whole small scene a warmer cast. Local light therefore participates in a larger ambient condition.

**OpenLegend application:** review a place across several authored lighting conditions while preserving its materials, structure, and identity. Ask which surfaces should reveal texture, which should simplify, and which light should command attention in each condition. A single universally bright highlight pattern would undermine these differences. These stills establish useful comparison questions; they do not verify smooth transitions, correct moving shadows, stable pixel edges, or camera behavior.

## Principles to carry into OpenLegend scene review

| Principle                         | Concrete direction and acceptance question                                                                                                                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purposeful pixel groups           | Organize pixels into planes, grain, folds, leaf groups, and readable silhouettes. At actual display size, can a reviewer identify what a detail describes? Remove unrelated speckle before increasing resolution.                                     |
| Varied natural color              | Build palettes from material, light, moisture, growth, and wear. Can the scene contain several greens and warm/cool shifts while retaining clear areas of emphasis and rest? Natural color includes lively sunlight and flowering growth.             |
| Light with a cause                | Give dominant illumination a source, direction, reach, and consistent effect across neighboring surfaces. Can a reviewer explain why the brightest areas are bright, and why nearby materials respond differently?                                    |
| Ecological and functional novelty | Make distinctive elements grow, accumulate, support weight, shelter life, or show use. Does the scene's memorable feature belong to its terrain and history, with enough surrounding evidence to make that relationship understandable?               |
| Quiet space and detail hierarchy  | Place dense information selectively. Can the player distinguish a body's silhouette, held tool, route, and relevant state change before inspecting surface texture? Leave open water, sky, ground, and foliage gaps where they improve comprehension. |
| Grounded anatomy and construction | Keep natural body proportions, plausible stance, usable tools, and practical building dimensions. Does the subject still work when decorative color and attractive lighting are mentally removed? Pixel treatment cannot repair distorted anatomy.    |
| Persistent physical identity      | Keep scars, missing parts, clothing closures, handed equipment, and other asymmetric traits on their correct sides across supported views. Can the same person or object be followed through a turn without their physical identity changing?         |
| Warmth and danger                 | Let mood arise from circumstances, condition, light, and human activity. Does a scene express a specific experience—relief, exposure, wonder, exhaustion—while belonging to a world capable of the other experiences too?                             |
| Scale and presentation honesty    | Judge the actual gameplay footprint and distinguish world figures, portraits, maps, and interface. Does each layer communicate what its scale can support without inventing detail, knowledge, or affordances?                                        |

These principles favor intentional selection over maximum detail. A plant may use a few broad masses and several carefully chosen gaps. A tool may receive a sharper handle or edge because that information explains its use. A person's identity may depend on a coat silhouette, stance, and correctly placed scar more than many tiny facial marks. Detail belongs where it serves perception and meaning.

## What production evidence supports—and what remains open

Sabotage describes a custom rendering pipeline supporting dynamic lighting.[^pipeline] Boulanger declined to disclose the amount of 3D and shader detail in Game Informer's interview.[^rendering] The reference establishes a visible result and a documented investment in rendering; it does not supply an implementation recipe for OpenLegend.

Boulanger identified frame-by-frame animation as the largest spending category and explained why equipment did not change characters' appearance.[^animation] OpenLegend should treat visual richness as a production commitment: prioritize reusable material and anatomy decisions, then spend additional authoring effort where the player can perceive its value.

Eric W. Brown described correctly sided Garl scar animations being changed to mirrored ones for a retro convention; some players reported the result as a bug.[^identity] OpenLegend's identity requirement takes precedence over that convention. A scar belongs to a physical side of a person, independent of screen direction.

The next scene review should use a representative environment and a naturally proportioned person with practical equipment. Inspect the normal gameplay size first, then closer views for material and anatomy problems. Compare a broad ambient condition, a localized light, and a darker condition. Record concrete failures such as a tool disappearing into ground texture, foliage becoming solid tiers, an unsupported beam, or an unexplained bright patch. An attractive enlarged still is insufficient acceptance evidence for those questions.

When an implementation is available, inspect motion separately: camera travel, changing orientations, repeated animation cycles, foliage gaps, thin equipment, cast shadows, and asymmetric identity details. Look for crawling edges, unstable density, flicker, disappearing forms, and highlights that appear attached to the screen. These are future checks; this reference study has performed no motion QA and establishes no technical pass.

[^pipeline]: Sabotage Studio, [Sea of Stars press kit](https://sabotagestudio.com/presskits/sea-of-stars/), undated; accessed October 18, 2026.

[^rendering]: Kyle Hilliard, [Sea Of Stars Cover Story — Nouveau Pastiche](https://gameinformer.com/feature/2023/07/10/sea-of-stars-cover-story-nouveau-pastiche), Game Informer, July 10, 2023; direct developer interviews, accessed October 18, 2026.

[^animation]: Ben Scott, [Sea of Stars Hands-off Demo & Developer Q&A](https://lordsofgaming.net/2022/03/sea-of-stars-hands-off-demo-developer-qa/), Lords of Gaming, March 1, 2022; direct developer Q&A, accessed October 18, 2026.

[^identity]: [Eric W. Brown interview](https://www.decibelmagazine.com/2025/05/07/kill-screen-062-eric-w-brown-of-nekrogoblikon-keeps-chiptune-trve/), Decibel, May 7, 2025; accessed October 18, 2026.
