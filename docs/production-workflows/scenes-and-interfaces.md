# From a visual intention to a playable scene or interface

**Status:** proposed offline production procedures. Use the [shared production workflow](README.md) for briefs, handoffs and revision. The [creative brief](../../art-direction/final-board/creative-brief.md), [world presentation](../world-presentation.md), [UI brief](../ui-design-brief.md) and existing design system remain the decision owners.

The two routes here share a production method: establish what deserves attention, create a coherent visual family, connect it to real behavior, and inspect the complete result. A world scene organizes space, light and things the player can approach. An interface organizes information and actions around the player's decision. Richness is useful when it strengthens those purposes.

## Places, materials and lighting

**Route:** place/experience idea → spatial blockout → material and shape studies → reusable environment pieces → authored and procedural composition → lighting → playable scene → purposeful revision.

### 1. Describe the place through the experience it offers

**Consume:** the selected world/encounter purpose, current traversal and object facts, art direction, camera and required gameplay views.

**Produce:** a place brief and simple composition showing routes, landmarks, meaningful objects, likely approaches, focal areas and quiet regions. Identify what should feel inviting, threatening, mysterious, inhabited or changed by the player's activity.

A world-content author and environment contributor establish these choices together. A hypothetical sheltered camp might contrast a legible gathering area with darker trees and a visible departure route. Its usefulness as shelter, its supplies and the people who live there must come from the relevant world contracts. The composition is not evidence that those mechanics exist.

The [creative brief](../../art-direction/final-board/creative-brief.md) calls for layered nature, expressive people, meaningful detail and purposeful light, including warmth and daylight. Use density to reveal material, use and identity. Preserve negative space and contrast so every bush, item and spark does not compete for attention.

**Useful result:** the place fulfills its intended visual and player purpose, whether activity, discovery, orientation, atmosphere or a quiet interval. If that purpose is unclear or unrewarding, revise the situation or composition before multiplying decorative assets; [characters and play](characters-and-play.md) can help when the missing value is an encounter or activity.

### 2. Build a traversable blockout and review approaches

**Consume:** the place brief and authoritative surfaces, obstacles, openings, destinations and object positions available to the selected scenario.

**Produce:** a rough playable layout with recognizable landmarks and essential interaction locations. Use simple existing representations while exact art remains in development.

Inspect the actual path into, through and out of the place. Review sight lines, contact with slopes, entrances, interaction reach, relevant vertical layers and the camera's permitted orbit/pitch. Place important objects where a player can notice and approach them. A dramatic image from a single camera cannot establish those properties.

The [spatial world](../spatial-world.md) owns traversal, support and placement; [world presentation](../world-presentation.md) owns its depiction. Decorative distributions cannot become collision, harvestable resources or occlusion authority through an exporter side effect. Conversely, art for a real opening must agree with the current structure.

**Useful result:** the player can use the intended route and understand the main spatial relationships. Keep rough geometry visible enough to test the next stage rather than postponing all integration until final scenery exists.

### 3. Establish material and shape families

**Consume:** the composition, surface identities, selected asset forms, actual lighting treatment and the output channels supported by the game.

**Produce:** a small related family of editable materials and geometric components. For each material, preserve the source graph or painting, accepted settings, export maps and a representative use in the scene.

Substance Designer, Material Maker, Blender or existing native art tools can create reusable surface recipes when repetition justifies the setup. Substance Painter-style geometry-aware finishing can add wear and dirt consistently where the chosen application is available. Simple hand-authored or generated-and-edited textures remain sensible for unique surfaces. The [procedural-art research](../../archive/02-research/ai-game-development/03-procedural-art-and-animation.md) explains the production benefits and limits; [tooling research](../../archive/02-research/ai-game-development/04-skills-and-tooling.md) distinguishes working integrations from unfinished wrappers.

Separate large forms, color grouping and roughness from optional tiny noise. Define controls that an artist can use intentionally: broad stone scale, growth distribution, wood direction or restrained wear, rather than an unexplained parameter list. Show purposeful variants together, including values that expose tiling, repetition or overly noisy output.

When the representation supports it, keep surface color separate from lighting information. A normal map changes how light responds without adding the actual silhouette or opening of geometry. Review whether that detail survives the game's pixel sampling. A painted shadow may conflict with a changing sun or nearby fire; adding another map does not automatically repair that conflict.

**Useful result:** related surfaces remain readable under the intended camera and light, and a useful style revision can be made from their sources. If the family will not recur, retain the simpler one-off source instead of inventing a procedural system.

### 4. Produce modular geometry and controlled population

**Consume:** the accepted blockout, material family, meaningful components and designated decorative regions.

**Produce:** editable source pieces and, when useful, a placement recipe with stable inputs. Preserve enough information to revise density, clustering, scale, orientation and permitted regions without rebuilding the scene by hand.

Model or compose the important landmarks deliberately. Procedural placement works well for related rocks, vegetation and surface detail around those landmarks. Blender Geometry Nodes or a small trusted placement process can help; the resulting runtime export must actually support its geometry and repetition strategy. Authoring instances may be expanded during export, so inspect the delivered result before assuming a cheap runtime cost.

Use a separate reproducible visual choice where the existing visual owner requires it. Avoid placing noise uniformly across every available surface. Establish clusters, transitions and quiet areas that support navigation and identity. Keep entrances, likely interaction points, threatening silhouettes and valuable cues readable. For foliage, inspect leaf/card orientation, alpha edges and shadow behavior from relevant views rather than trusting a dense authoring preview.

**Useful result:** the scene feels particular and lived in while the route remains clear. If repetition is obvious, revise the composition or variation recipe; adding more unrelated assets can make coherence worse. If a generated plant only works from one view, repair its construction or select a representation compatible with the camera.

### 5. Compose light around the actual world

**Consume:** the established scene, actual supported light sources, material behavior and accepted presentation settings.

**Produce:** a recorded scene-light setup and controlled comparisons under relevant daylight, shadow and local-light conditions. Work with the existing renderer, supported quality choices and observer-relative source information.

Establish the main light direction and value structure before adding effects. Use contrast to lead attention and connect people to the ground. Check contact shadows, color relationships and whether the same materials remain recognizable as conditions change. Let luminous or warm moments feel special by retaining quieter surroundings.

The [sprite-lighting contract](../world-presentation.md#sprite-lighting) already distinguishes ordinary lit imagery, emissive presentation, actual illumination and remembered sources. Preserve it. A bright texture does not create a native light source; a new shadow recipe must not reveal an unobserved change. Baked lighting can serve sufficiently stable surfaces but must not permanently encode a constructed or removed object's shadow into an editable world.

Use the inspected [PlayCanvas lighting guidance](../../archive/02-research/ai-game-development/04-skills-and-tooling.md) at compatible versions. New effects, extra lights, global illumination or a second renderer are not required to pursue the chosen aesthetic. Measure the specific cost when a real scene reveals a problem; existing [presentation limits](../limits/interface.md) own the current tradeoffs.

**Useful result:** purposeful light improves depth, identity and legibility under the intended conditions. If the scene only looks appealing from a promotional angle, return to value grouping, light placement, material response or composition according to the cause.

### 6. Inspect the whole moving scene

**Consume:** the actual exported assets, game build, chosen scene state and representative moving people/objects.

**Produce:** an observed scene result and a short ordered list of concrete revisions. Inspect at normal gameplay scale as well as close enough to diagnose problems.

Walk the route, rotate/tilt/zoom where relevant, use important interactions and observe the place under its meaningful light states. Check people against the background, directional and contact cues, particles over UI, nearby foliage, depth/cutaways, shadows and repeated assets. Dense detail should not obscure the thing that currently matters.

Distinguish problems in authoring, exporting and runtime consumption. Profile changed work when warranted: transparent layers, shadows, unique materials, skinning, texture residency or scene rebuilding can have different costs. Reduce the observed cause while retaining the place's distinctive features. A cheaper scene that loses its focal landmark or conceals an interaction is not an equivalent improvement.

**Useful result:** the place works in motion, invites the intended activity and retains its character across relevant views. Record actual device/build limits and unperformed human qualification through the existing [verification](../verification.md) and [art-study](../maintainers/art-direction.md) owners.

### 7. Preserve the recipe and one meaningful transformation

Retain the source layout, important authored placements, material graphs, procedural inputs, export settings and accepted context. When the selected game supports a meaningful changed state, use the same sources to portray it coherently. Otherwise a purposeful artistic revision or another needed location can test reuse.

The goal is controlled expansion: recognizable regional materials, distinctive landmarks and variation that reflects use or story. Changing every texture independently produces output volume without establishing a believable place. Mechanical transformations, such as actual restoration, damage or new construction, require their existing world owners; decorative variation alone proves only its visual route.

## Art-directed working interfaces

**Route:** player decision → information/interaction sketch → visual alternatives → complete-screen exemplar and art kit → shared components → live states → game integration → visual and interaction review.

OpenLegend already has a design system and a recent world-first interface redesign. Begin with the actual current screen and owner, not an old screenshot or an assumption that the theme is missing. The [UI research](../../archive/02-research/ai-game-development/08-ui-quality-and-production.md) separates plausible causes of a weak result; it does not claim to have diagnosed today's running interface.

### 1. Define the player's task and capture its current state

**Consume:** the actual interaction, data and state owner, current UI brief/components, and a reproducible running screen.

**Produce:** a brief naming the player, selected object, decision, meaningful facts, next action and surrounding world context. Record the current viewport/UI scale, relevant game state and visible defects where comparison is the task.

A designer or agent should be able to explain what the player is choosing without quoting implementation field names. For inventory, actual items and quantities matter; unsupported rarity, equipment slots, bonuses or crafting mechanics must not be invented to fill an attractive layout.

**Useful result:** the required information and interaction are clear, with optional details distinguished from essential costs, blockers and consequences. If the task itself is confusing, resolve that structure before decorating it.

### 2. Explore composition with real content

**Consume:** the task brief, existing interaction patterns, representative real names/descriptions and available art.

**Produce:** a small set of visual alternatives where a meaningful composition decision is unresolved, followed by one representative complete-screen exemplar. Use a rough interaction sketch before expensive illustration when layout or flow is still uncertain.

The design stage may use an AI design tool, direct drawing, HTML/CSS or existing components. The chosen tool should make the result easy to inspect and revise. A screenshot from another game is useful for hierarchy or craftsmanship but is not the production design and does not supply rights to its art.

Inspect the screen over representative scenery. Decide the relative weight of the world, item imagery, title, primary action and optional details. Use ornament deliberately; quiet regions should support reading and decision-making. Follow the existing color and type roles rather than letting each agent invent a parallel theme.

**Useful result:** a coherent composition that can be implemented against a stable visual target. An early alternative may deliberately use placeholders, but label them and define which artwork still needs production.

### 3. Produce a coherent art kit

**Consume:** the chosen composition, actual item identities, existing design tokens and the required small-size treatments.

**Produce:** the needed editable illustrations, frame/surface elements and implementation-ready exports, with a contact sheet or representative component view. Reuse existing artwork before adding a new family.

For item art, establish perspective, silhouette emphasis, edge treatment, padding and the relationship to world/equipped views. A specialist image generator can produce or edit candidates; a controlled drawing or procedural route may be simpler for frames and repeated geometry. The [asset dossier](../../archive/02-research/ai-game-development/07-image-3d-and-audio-models.md) supplies dated image options, while [tooling research](../../archive/02-research/ai-game-development/04-skills-and-tooling.md) includes repeatable editing and graph-based candidates.

Test at actual slot size, including the smallest intended use. Preserve text, quantities, focus, pressed/selected states and actual availability as live UI content. Ornamental border images or vector/CSS shapes should resize without distorting corners or stealing text space. The [UI research](../../archive/02-research/ai-game-development/08-ui-quality-and-production.md) explains the available browser techniques; none requires turning a complete generated screenshot into an interactive panel background.

**Useful result:** a related family of assets that strengthens recognition and the existing visual identity. If items are individually attractive but inconsistent together, revise shared references, composition or finishing before producing more.

### 4. Implement through the existing component owners

**Consume:** the approved exemplar, art kit, real data/actions and current [design-system production guide](../../apps/client/src/design-system/README.md).

**Produce:** a working screen using shared tokens and semantic components. React Aria's interaction primitives can retain correct labels, keyboard behavior and focus while OpenLegend supplies appearance. The implementation agent should have the visual target and a way to inspect the actual result.

Where a genuinely new shared role is needed, add it to the existing component/token owner. Avoid copying palette values or creating a one-off component family that makes later screens diverge. Preserve object identity and the same native action route when an operation is reachable from multiple views.

**Useful result:** a real populated screen close to its visual target, with live controls and data. A visually faithful static mockup remains an intermediate artifact.

### 5. Complete the relevant states and surrounding interactions

**Consume:** actual state transitions, permitted refresh behavior and relevant scenarios in the [UI verification chapter](../ui-ux/verification.md).

**Produce:** the working states required by this task: selected, focused, unavailable, empty, loading, failed, pending, completed or changed while open, as applicable. These states must remain visibly distinct without inventing new game semantics.

Use representative long content and narrow/short layouts, preserve accessible focus and essential explanations, and retain drafts or selection under the existing contract. Exercise opening and closing the view, nested controls, return to world movement, pointer/keyboard behavior and relevant asynchronous changes. A beautiful panel that triggers an accidental world action or shows stale success has not completed the route.

For inventory, test the actual supported equipment or transfer action and its rejection; check that the world and equipment view show the authoritative result. For another surface, choose its equivalent consequential interaction. The [inventory](../ui-ux/inventory.md), [world-interaction](../ui-ux/world-interaction.md), [chat/invention](../ui-ux/chat-and-invention.md) and [system-feedback](../ui-ux/system-feedback.md) chapters own their details.

**Useful result:** the screen remains coherent through ordinary use and relevant failure, with the game available at the appropriate times. A component screenshot or successful build does not establish complete input or accessibility qualification.

### 6. Review, repair and preserve the useful design

Compare the intended and actual full-screen result at equivalent size and state. Prioritize defects that affect hierarchy, recognition, decision-making or the game's atmosphere. Route weak artwork back to its source; route spacing or hierarchy to composition/components; route stale information or incorrect behavior to its semantic owner.

Inspect the packaged result when changes to assets, fonts, CSS or delivery can differ from development. Reuse relevant checks and add work only to resolve a concrete remaining risk. Preserve the exemplar, accepted source art, component changes, useful state fixture and concise repair notes in their established locations.

When comparing models, keep the question explicit. Fixed-design implementation holds the approved layout, artwork and interaction specification constant to test fidelity and working behavior. Brief-to-composition tests design judgment using the same supplied content and art. A separate image comparison tests artwork supply. The [research evaluation plan](../../archive/02-research/ai-game-development/11-evaluation-and-adoption.md) defines the distinction; changing all inputs at once cannot establish which model caused improvement.

## Parallelism and revision across both routes

Once the scene's composition and meaningful geometry are stable enough, related materials and decorative components can be produced independently. Lighting studies can begin on rough geometry; final shadow/contact review waits for the actual source and runtime result. A material change should refresh its affected exports and scene review, while a new opening also requires revisiting spatial depiction and interaction.

Once a UI's task and composition are clear, art families and component behavior can develop in parallel against explicit sizes, states and identities. One integrator owns the whole screen. Do not let simultaneous contributors change the shared palette, hierarchy and native action flow independently.

In both cases, capture the cause of a failed result before regenerating everything. The next useful variation should become easier while the scene or interface retains its identity. This is the production payoff of shared sources and controlled choices described in the [case studies](../../archive/02-research/ai-game-development/02-developer-case-studies.md).

## Maintained records

- **Implementation and artistic review:** [art direction](../maintainers/art-direction.md), [3D appearances](../maintainers/3d-pixel-art.md), [spatial presentation](../maintainers/spatial-world.md), [UIUX](../maintainers/ui-ux.md) and the selected content/project tracker.
- **Limits and constraints:** [3D art](../limits/3d-pixel-art.md), [interface/presentation](../limits/interface.md), [UI](../limits/ui-ux.md) and [spatial](../limits/spatial.md). No new renderer budget, UI dimensions or supported-device claims are introduced here.
- **Contract and evidence:** [world presentation](../world-presentation.md), [UI handbook](../ui-ux/README.md), [verification index](../verification.md), and the [AI production research](../../archive/02-research/ai-game-development/README.md).
