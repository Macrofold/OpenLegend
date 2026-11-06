# Buildings, landscapes and world styles

Original synthesis from [Voxel World](https://learn.marketwithmark.com/vault/skills/voxel-world), [Dark Crawler Kit](https://learn.marketwithmark.com/vault/skills/dark-crawler-kit), [Retro VGA RPG](https://learn.marketwithmark.com/vault/skills/retro-vga-rpg) and the [World Builder pack](https://learn.marketwithmark.com/vault/pack/worldbuilder). The [coverage record](coverage.md) identifies the relevant sections. These methods support the current [scene workflow](../../../docs/production-workflows/scenes-and-interfaces.md) and [art direction](../../decisions.md#current-direction-at-a-glance); they do not select a new setting, renderer or building system.

## Construct a building from its use

1. Establish the site, human scale and intended views. Mark the approach, entrance, occupied floor levels, ground slope and connections to nearby paths. Use a local frontage/depth frame when authoring repeated buildings so a rotated instance retains coherent doors, stairs and furnishings.
2. Block the plan and circulation before the façade. Put the door where a person can reach it; connect it to the room or work area it serves. Reserve space for furniture use, door swing, stair landings and headroom. An attractive door texture is not an opening.
3. Choose the large construction forms: wall mass, roof type, attached wing, porch, tower or courtyard. Establish the ridge/eaves and the supporting wall or posts. Check the outline from the approach and game camera before detailing it.
4. Build thickness where it changes the read: foundations and plinths, wall returns, window recesses, sills, lintels, roof overhangs, door frames and steps. Add columns, braces or masonry openings where they explain support. Align adjoining walls, roofs and vaults; surface texture cannot conceal gaps from a moving camera.
5. Complete the visible construction family: corners, roof-to-wall joins, chimney/flue, drainage where appropriate, and consistent window/door proportions. Keep exact dimensions and fitting modules in the hand-authoring route when generation cannot preserve them.
6. Furnish only the interior scope that matters. Start with the activity's main surface or object, its access and storage; add a few signs of use. A repair space needs a work surface, tool arrangement and room to handle the object, not shelves filled with interchangeable book shapes. A sleeping space, kitchen and shop should not use the same generic clutter kit.
7. Continue the building into its site: threshold, steps, path, yard edge, service access and relevant outdoor work. Inspect the contact with terrain from low angles. Never raise the terrain through a bridge opening merely to make the deck look supported.
8. Inspect the requested experience: approach, entry, relevant interior, return outside and the actual overhead view if used. If the feature promises traversal, its existing implementation owner must verify passage using the real actor/body; this research supplies no collision or navigation implementation.

Not every structure needs an enterable upper floor or furnished hidden room. State the requested scope, and avoid art that promises an accessible route the game does not provide. For a cutaway, keep the intact building coherent first; the reveal should explain the same rooms and floor levels rather than show an unrelated miniature.

## A compact construction vocabulary

These are alternatives to choose from according to a verified design, not a required ornament checklist:

| Form or part                                    | What it contributes                               | What to inspect                                                                             |
| ----------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Gable, cross-gable, hip or gambrel roof         | Distinct mass and believable coverage of the plan | Ridge continuity, end walls, eaves, dormer clearance and interior headroom                  |
| Porch, arcade, veranda or recessed entry        | Transition between public approach and interior   | Supporting posts, threshold, usable depth and opening clearance                             |
| Bay, dormer or projecting upper storey          | Varied frontage and useful interior volume        | Its floor/support relationship; roof trim must not cover the glass                          |
| Turret, tower, dome or cupola                   | A recognizable landmark                           | Base/support, silhouette from several sides and whether its interior is actually in scope   |
| Masonry arch or timber span                     | An opening with a visible structural idea         | Arch ring and side support, or deck/stringers/bracing; foundations meet the banks or ground |
| Cornice, parapet, sill, lintel and corner trim  | Scale and depth at important edges                | Coherent thickness, material and joins; avoid uniformly ornate surfaces                     |
| Shopfront, sign band, canopy and display window | Distinguishes a public activity from a house      | Sign attached to the actual façade, visible entrance, stock appropriate to the trade        |

A reusable building grammar should vary connected choices rather than scatter unrelated ornaments. A low, broad roof with deep eaves and substantial porch supports forms one coherent family; a narrow steep-roofed dwelling with projecting upper floors forms another. Materials, openings and supporting members should reinforce the selected family. The library's historical labels and measurements are examples, not historical verification.

## Compose a place at several scales

Start with a small number of large relationships: terrain, water, access route, settlement masses and a landmark. The landmark can be a distinctive tree, rock or ordinary workshop; a castle is not compulsory. Connect destinations visibly through paths, bridges, thresholds or clear terrain rather than placing isolated attractions on an empty plane.

Use district or neighbourhood differences in block size, orientation, building height, roof form and use, alongside colour. Repetition creates a readable family; a deliberate interruption makes a focal point. Reserve quieter areas around a complicated object or activity. At overhead distance roofs may dominate the image; at eye level walls, ground and openings dominate. Inspect the actual visible area before deciding which palette or detailing change will matter.

A settlement has surroundings. Continue paths and terrain into fields, woodland, shoreline or distant land so it feels situated. Distant silhouettes and atmosphere should agree at the boundary. A decorative horizon may serve composition, but must not imply reachable content or supply the authoritative terrain. Do not replace a playable world with a platform visible only from one flattering angle.

For a workshop by water, for example: place the workshop where access and its approved activity make sense, compose the approach around the roof and water crossing, and distinguish the working threshold with a small purposeful arrangement of objects. If a wheel is only concept art, label it as such. If a feature promises useful water-powered work, the mechanism, supply and results belong to that feature's design before presentation depicts them.

## Ground, vegetation, water and weather

- **Terrain:** establish landform and watercourse before surface scatter. Use broad material regions explained by slope, exposure or moisture. Strata should describe geology rather than arbitrary alternating stripes. Reserve the real clearances needed by paths, entrances and spans.
- **Trees:** establish root flare, trunk taper, branching and species-specific crown before leaf clusters. Leave meaningful gaps and visible branching; do not translate the voxel source's block clusters into the rejected ball-on-stick look. Vary size, lean and grouping within plausible growth. Keep a few deliberate framing trees distinct from background distribution.
- **Ground plants:** place reeds near suitable water, open-ground plants where light and space permit, and litter or moss where the authored setting supports them. Organize patches and bare areas instead of evenly scattering every species. Check the ground at normal viewing distance: high-contrast speckles that look rich overhead can read as confetti close up.
- **Water:** distinguish bank, shallow edge, deeper area and contact with built structures. Align visible flow with the chosen watercourse; place foam or mist where a fall or disturbance explains it. Reflections, transparency and surface motion are material/presentation decisions, not proof of fluid simulation.
- **Season and weather:** coordinate foliage, ground, sky, exposure, particles and relevant material response. Changing only a global tint rarely communicates a coherent season. Static authored patina is allowed; changing wetness, snow, smoke, animal activity or resources must follow the actual world facts when represented as gameplay.

## Develop a different setting without merely recolouring it

Keep the engine's generic mechanisms separate from world-specific materials, building forms, plants, object vocabulary, clothing and authored activities. A setting brief can choose a coherent combination from the following study directions. These are original compositional examples, not accepted OpenLegend worlds or authenticated reconstructions:

| Study direction                       | Construction and landscape choices to investigate                                                                                                   | Distinctive experience to seek                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Timber settlement in a cold landscape | Steep or turf-covered roofs as appropriate to references, deep thresholds, substantial timber joints, protected storage and weathered exposed faces | An understandable transition from exposed travel to shelter and shared work        |
| Warm courtyard settlement             | Shaded circulation, masonry thickness, courtyards, water access and a clear public/private sequence                                                 | Cool refuge, visible social space and light shaped by architecture                 |
| Hillside settlement                   | Stepped terraces, retaining walls, changing roof levels, switchback paths and bridge connections                                                    | Discovering relationships between familiar places from different elevations        |
| River workshop or industrial quarter  | Service approaches, work yards, channels, coherent machinery, deposits around the processes that cause them                                         | The pleasure of understanding how useful objects are made and moved                |
| Raised timber/veranda architecture    | Platform-to-ground transitions, deep eaves, repeated structural bays and material-specific openings                                                 | Layered thresholds and views through connected spaces                              |
| Monumental stone precinct             | Processional routes, large supporting masses, courts and restrained repeated relief                                                                 | A memorable approach and clear hierarchy without filling every surface with detail |
| Overgrown or damaged place            | Legible original construction, selective failures, regrowth tied to cracks and exposure, remaining usable routes                                    | Reading what changed and finding practical opportunities in it                     |
| Coastal or unusual environment        | Shore access, hull/deck/rigging construction where relevant, material exposure, visibility and fauna suited to the premise                          | A coherent place whose conditions change how it is inhabited                       |

For each selected direction, gather appropriate references, name the construction and surface relationships to preserve, author a small representative place, and inspect it under the intended camera. Source references to Roman, Norse, Japanese, Egyptian, Mesoamerican, Renaissance or modern settings are prompts for research, not a license to flatten real cultures into interchangeable props. Retain the method and verify specifics when a world actually selects them.

## Light that describes the place

Choose a visible or understandable light source and a focal relationship, then enough fill to read the remaining forms. Depth at openings and edges gives light something useful to reveal. Avoid equally bright boxes, hidden black rooms, clipped lamps and fog that removes the intended landmark. An interior/exterior contrast can communicate shelter, but every interior need not be warm or dark.

Inspect daylight, firelight or night only when relevant to the deliverable. Night emissions must remain readable close up as well as from afar. A window glow, nearby light and post-processing bloom are different contributors; solve the offending one rather than darkening the entire scene. Style comes from this coordinated construction, palette, materials and light, not a compulsory retro shader or miniature blur.
