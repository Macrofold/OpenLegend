# Progressive 3D pixel art — appearance families and composition

**Status: proposed.** This is the appearance-composition detail of the [feature specification](3d-pixel-art-feature-spec.md), not a new mechanical ontology. Family examples are concrete design fixtures; their depiction does not claim that all corresponding gameplay mechanics exist.

## Maintained records

- Implementation: [V3D04–V3D06 and V3D09](../maintainers/3d-pixel-art.md).
- Limits: [A3D asset inventory](../limits/3d-pixel-art.md), with existing [object](../limits/objects.md), [state-effect](../limits/state-effects.md), and [spatial](../limits/spatial.md) owners.
- Contracts: [technical design](3d-pixel-art-tech-design.md); [persistent objects](completed/persistent-objects-feature-spec.md); [engine/world boundaries](../engine-and-world-boundaries.md).
- Generation: [asset pipeline](3d-pixel-art-asset-pipeline.md). Appearance reference: [creative brief](../../art-direction/final-board/creative-brief.md).

## 1. Compose variation at the correct level

Separate five dimensions rather than generating every combination:

| Dimension                | Examples                                                                     | Normal implementation                                                                             |
| ------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Stable identity          | Body proportions, facial/hair design, distinctive markings, maker's ornament | Persistent appearance revision and cosmetic seed; shared base geometry plus bounded customization |
| Reusable definition      | Axe shape, cloth weave, roof module, animal body family                      | Immutable library part, material, rig, or approved procedural family                              |
| Assembly and placement   | Helmet on head, bag on back, blade in handle, wall joined to frame           | Compatible visual attachments linked to real object/assembly state when applicable                |
| Committed changing state | Wetness, supported wound, death, open door, construction progress            | Native state mapping into material/pose/part selection; no generation per update                  |
| Presentation quality     | Near/far LOD, billboard fallback, shadow simplification, pixel density       | Client selection among approved compatible representations; no new mechanical version             |

A material variation should not generate a new skeleton. A corpse pose should not create a new animal identity. A mesh simplification should not create a new item definition. Persistent appearance changes are intentional revisions; transient illumination and pose are not.

The generic engine mechanism is small: registered visual family, immutable parts and materials, declared attachment/fit rules, finite state selectors, and exact version dependencies. Family-specific trusted code handles real new computation. Do not create a universal visual programming language, unbounded graph evaluator, or arbitrary generated shader system.

## 2. Visual parts are not automatically world objects

A cosmetic button, belt stitch, roof shingle detail, or leaf cluster can be baked geometry, a shared instance, or texture detail. It does not need persistent identity, an inventory row, or a simulation tick. A pickable detachable sword, container with contents, or independently repairable wall has a real semantic owner and its visual references that identity.

Represent a real held object once. Its equipped display, inventory icon, ground display, and inspection model are views of that object/definition, not separate copies with separate quantities. If a character drops a backpack, ordinary object placement changes first; presentation detaches it afterward. Removing a model node cannot destroy contents or change custody/title.

A visual assembly tree is not necessarily a mechanical containment tree. A bag worn on a back may contain items that are not visible, while a cape may visually overlap several body regions. A building's material detail may be batched into chunks even when its supported mechanical components have independent identities. Maintain explicit mapping where interaction needs it; do not mirror every decorative triangle in domain storage.

## 3. Family selection by useful dimensionality

| Family                                      | Recommended starting representation                                              | Important variations                                                 | Explicit limitation                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Ground, ramps, decks                        | Existing mechanical surfaces with styled materials and bounded decorative meshes | Material, moisture appearance, edge treatment, authored detail       | No terrain deformation or navigability from visual displacement alone           |
| Rigid tools, weapons, containers, furniture | Shared/procedural meshes, then generated rigid candidates                        | Dimensions within family fit, grip, material regions, ornament, wear | Decorative model cannot add damage, capacity, a moving joint, or usable opening |
| Humans and compatible humanoids             | Reviewed skinned body/rig with modular equipment; sprites remain available       | Body fit, skin/hair, garments, posture, carried objects              | No universal automatic rigging or unlimited body-proportion retargeting         |
| Animals                                     | Reviewed family rigs or compatible sprites                                       | Species silhouette, markings, proportions, life states               | A humanoid auto-rigger is not an animal pipeline                                |
| Articulated machines/constructs             | Rigid part hierarchy and reviewed joint controller; skin only if useful          | Joint ranges, gripper variants, visible charge/status                | Visual joints do not create mechanical actuators or senses                      |
| Buildings and constructions                 | Admitted structural modules plus decorative surface layers                       | Partial construction, openings, material, repair, damage             | Generated exterior shell is not a traversable, destructible interior            |
| Trees and rocks                             | Dimensional trunk/rock; mixed mesh/card canopy                                   | Shape family, bark/leaf material, growth state if supported          | Decorative branches/canopy cannot grant support or change sensing               |
| Grass, flowers, small foliage               | Cards or very simple shared geometry                                             | Palette, density, wind presentation                                  | No need for unique generated mesh per blade or flower                           |
| Fire, smoke, sparks, magic                  | Sprites/particles and approved effect primitives, optional local geometry        | Intensity appearance, palette, phase, supported emitted cues         | A glowing texture does not add illumination, combustion, or a spell             |
| Portraits and item icons                    | Approved 2D art or rendered views of a known model                               | Close-up detail and identity-consistent state                        | Portrait detail is not evidence of world-avatar readability                     |

These are recommendations, not hard-coded noun switches. A different world can install another supported family behind the same contracts. Exact library reuse and registered applicability should precede optional language classification.

## 4. Characters, identity, and body variation

Start with one authored humanoid rig and a small set of deliberately distinct bodies. Keep world-scale silhouette readable; do not rely on subpixel face detail to distinguish everyone. Head shape, posture, hair, clothing blocks, and carried items should survive normal zoom, while profiles offer richer faces.

Use reviewed geometry variations or bounded morphs for proportion ranges that preserve topology, skin quality, attachments, and animation. Beyond that envelope, select another compatible body family or retain the fallback. A height slider is not proof that a rig works at every height, limb ratio, or body shape. The mechanical body's dimensions remain independent and must be matched where contact/reach cues matter.

Record recognizable features once and preserve them across portrait, sprite, model, corpse, and future revisions. Provider-specific prompts may derive from this appearance brief; they are not the only durable identity record. A style refresh should not casually change skin tone, hairstyle, distinctive marks, body shape, or possessed gear.

Avoid one complete texture/model for every state combination. Keep shared skin/material atlases where privacy and technical fit permit, family-level masks, bounded per-instance parameters, and separable attachments. Distinct private markings must not be embedded in an atlas delivered to unauthorized viewers merely to improve batching.

## 5. Clothing, equipment, and compatibility

### Separate three attachment classes

A rigid item such as a sword, lantern housing, helmet, or pack can attach through a local transform. A deforming garment needs compatible skin weights, rest pose, body fit, and often region masks. A multi-contact object such as a long log or two-handed tool needs a primary pose and a bounded secondary contact solution. None of these is solved by a socket name alone.

A family-owned attachment contract includes semantic role, local axes/pivot, compatible host family/range, fit bounds, allowed scale, optional occupied visual regions, layering/occlusion policy, supported grips/poses, and state coverage. The physical equipment slot and item custody still come from their existing owner. An untrusted visual cannot claim a new free hand or replace a forbidden item.

### Fit and layering

Use explicit garment regions and order for skin, underlayer, outer clothing, armor, and decorative overlays. Hide covered body regions using reviewed masks or alternate geometry to prevent obvious clipping. Specify hair/helmet compatibility and fallback hair selection; do not silently erase a distinctive hairstyle from the identity record. A garment's palette can vary independently of its geometry.

Some combinations require authored fit variants rather than runtime collision-solving cloth. Unsupported fit must be visible in authoring validation. During ordinary play, a mechanically valid equipped item may use an honest alternate visual, but the player should not see gear vanish without explanation. Do not prohibit legitimate gameplay equipment merely because one renderer lacks a perfect model.

### Contact and carrying

Use an item's grip transform, handedness policy, body compatibility, and permitted activity to choose an animation. A second hand can follow a bounded IK target when available. Hand position is visual; native action range and object transfer remain authoritative. Heavy/large carry poses, sitting with a pack, and lying down while equipped require deliberate clips or declared fallbacks.

The first release should prove switching between ground, carried, equipped, and contained states for one real item. Inventory quantities do not need one rendered object per unit; a pile/container family can show a coarse permitted amount without disclosing exact hidden contents.

## 6. Animals, unfamiliar anatomy, and constructs

Do not route every creature through a human skeleton. A reviewed quadruped family needs its own limb roles, gait/contact behavior, head/neck range, rest/death states, and marking/scale constraints. Birds additionally require visual wing/perch states, but actual flight remains the native locomotion owner. An aquatic appearance does not install swimming.

For a new morphology, distinguish four outcomes: a supported mechanical body with an existing compatible rig; supported mechanics with sprite/procedural fallback but missing rig; a candidate new visual rig using existing trusted pose solvers; or genuinely missing mechanical/visual host computation. Only the first two should be routine initial runtime generation paths. New rig-family publication requires review and a usable coverage matrix before adoption.

Use an articulated machine as a nonhuman proof: a base, rotating joint, arm segments, and gripper can be rigid meshes under a bounded hierarchy. Its charge indicator is a state mapping, not blood/health behavior. A visually plausible gripper cannot grasp until a native action supports it. A touch-only entity does not acquire camera sight because it has an eye-like texture. This tests the engine/world boundary more meaningfully than adding another human shirt.

## 7. Buildings, modular objects, and invention

Prefer an assembly brief that names supported functional components and their interfaces before generating ornament or surface detail. A shelter might include real posts, a roof, and an admitted opening, with decorative bindings and thatch. Native construction stage selects which functional components exist or are completed; the renderer can depict incomplete work without inventing weather protection.

Preserve mechanical coordinates, opening clearances, supported surfaces, hinge/contact anchors, and component identities. Attach generated details around those constraints. A generated one-piece exterior can be useful for a non-enterable decorative object or preview, but should not be the production representation of a building whose interior, door, repair, and partial destruction matter.

Represent opened doors and removed walls through supported state and geometry changes. Their render meshes, shadow participation, picking, navigation, and acoustic consequences have different owners; a visual update cannot stand in for all of them. Cosmetic cracks/scorch can precede structural damage only when the supported visual-state contract permits that distinction.

For efficient repeated walls/roof modules, use shared meshes/materials and local chunking after measurement. Keep enough semantic mapping for permitted component selection. Changing one wall should not regenerate the entire building or rebuild unrelated world visuals. Do not require a fixed grid: use admitted dimensions and transforms, with optional authored snapping for convenience.

## 8. State effects and conflict resolution

State mappings consume committed and disclosed facts. Suggested layers are base identity, assembly/equipment, lifecycle pose, supported material condition, local damage/detail, and transient effects. The selected family explicitly determines which layers can combine and which override others. Avoid one global priority list pretending to cover every world.

For the bundled living-actor family, death/incapacitation should override a voluntary walk pose; held-object visibility follows actual object placement; a lingering stain can remain after active bleeding stops; a burned appearance must not create combustion. Wetness, frost, disease, age, growth, wounds, missing parts, or magical transformations are only available where their native state and perception contract exist. An image of a wound is not an injury update.

Each representation declares a minimum state set and fallbacks. An art upgrade that lacks the current required state is ineligible for that state. A valid alive mesh need not be discarded because the corpse representation is still a sprite, but switching between them must preserve identity and obey safe publication. Keep generated variants keyed to the relevant identity and state contract, not every simulation timestamp.

Bound simultaneously active layers, decals, particle work, and animation channels under the family profile and [A3D limits](../limits/3d-pixel-art.md). When cosmetic capacity is exhausted, merge or simplify decorative effects while retaining the important disclosed state through an established cue or detail panel. Never interpret dropped particles as stopping damage or healing the body.

## 9. Material and style composition

Use a small approved material vocabulary with explicit meaning: base color/material region, roughness or stylized response, opacity class, normal detail where useful, emission appearance, palette grouping, and applicable condition masks. Render materials do not assign mass, heat capacity, flammability, conductivity, or illumination authority.

A common wooden handle can reuse its geometry with different approved wood treatments. Material changes that also change real properties require the existing mechanical definition workflow. A generated texture should not paint a hole, extra blade, or visibly active fire that contradicts the accepted shape/state. Texture validation includes semantic fit, not merely dimensions and file type.

Keep source artistic detail separate from device simplification. Distant LODs preserve strong color groups, critical silhouettes, equipped objects, and state readability while dropping fine ornament. Near detail should not require paid regeneration on zoom. Portrait and inventory icon generation are optional derivatives of the same identity, not automatic extra stages for every new object.

## 10. Authoring, generation granularity, and extension seam

A natural-language appearance request resolves to an existing definition/family where possible. The workshop shows which part is changing, supported assumptions, the appearance-versus-mechanics distinction, reference rights, exact revision, and optional generation stages. Cosmetic edits can publish under the configured review policy without teaching characters or editing the mechanical definition.

Choose the smallest useful generation unit. Generate a novel tool head rather than its handle, every user's body, and all animations. For a materially new silhouette, a complete rigid-object candidate may be simpler than forcing poor modularity. For unique character art, reuse a reviewed rig and clothing families where possible rather than generating an unrelated skeleton each time. Do not let a model automatically invent the family validator it must pass.

Each v1-specific family records its owner, supported inputs/states, restrictions, intended expansion seam, and trigger. A new trusted solver or topology family is justified by a concrete unsupported case, not by adding arbitrary fields. Reusable invention packs can pin the compatible mechanical and visual dependencies without copying private authoring history; pack delivery remains [INV-8](../maintainers/inventions-and-world-evolution.md#inv-8--portable-inventions-and-later-algorithm-extensions) work.

## 11. Required evidence

The first family qualification must include distinct bodies/outfits at gameplay scale, a held item through turns and a supported activity, equipment appearing on the ground after a real drop, a dead/removed animal with delayed art, a partial modular construction fixture, and a nonhuman articulated object. Include incompatible fits, missing required poses, concealed contents, material changes, and repeated instancing.

Measure both rendering and production effort: creation/correction time, number of separately authored variants, reuse rate, failures, retained bytes, and crowd cost. An attractive human turntable does not qualify clothing combinations, animal rigs, structural modularity, or novel generated art. Detailed evidence requirements remain in [validation](3d-pixel-art-validation.md).
