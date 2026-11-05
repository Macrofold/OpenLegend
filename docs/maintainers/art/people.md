# People built from parts

**Requirement (Mike, November 4, 2026):** every person, character or actor is built from separate parts: a body, a face, a hairstyle and clothing, each selected or generated from their character sheet. The body is the closest match from a canonical set covering every body type, or the step reports that no available body fits. Faces and hairstyles are adjustable. Clothes are worn and can be taken off; they are never part of the body. How each step works is designed first, and the [art workflow](../../production-workflows/art-flows/3d-models.md#step-1--choose-the-build-route) follows the accepted design.

**Status:** Not started. Selected for design on November 4, 2026; implementation is not authorized. The design need is [DG37](../needs-design.md#dg37--character-appearance-a-creator-and-varied-populations) (ND39–ND42). Until PPL03 lands, ask Mike before making a person, and never generate one whose clothes are part of the body. Until the cast is rebuilt ([AF10](../art-direction.md#art-flow-follow-through)), Ada and Mara Reed use the models generated from their sheets, with their clothes fused into the body, and the other people keep their MakeHuman bodies ([AF14](../art-direction.md#art-flow-follow-through)).

The [general workflow refinement](../../projects/art-workflow-feature-spec.md#37-repair-only-the-failed-dependency) settles selective generation, direct-mesh repair and prototype-to-polish handoffs. It supplies procedure for these tasks, not the missing body source/coverage, face-control, clothing or acceptance decisions; PPL01/PPL02 and ND39–ND42 remain open.

## Tasks

- [ ] **PPL01 — Design the parts: bodies, faces, hair and the character-sheet build** (ND39, ND40, ND42). Write the design with Mike's decisions, starting from the [people-family analysis](../../projects/art-workflow-feature-spec.md#11-people-families-a-character-creator-and-npc-variety); wrapping is one candidate method to assess, while AF07 proves whichever parts/family route Mike accepts. The design must settle:
  - **Body types:** which traits define one (sex, age, height, build, muscle) and how many there are. Every combination multiplies quickly, so decide which traits are separate bodies and which are sliders on a shared body.
  - **One skeleton:** every body, hairstyle and garment shares one skeleton, so clips, held items and attachment points work on all of them within the 64-joint budget, and clips suit each body's proportions.
  - **Where the bodies come from:** assess the Quaternius characters Mike preferred in the November 5 survey under [AD09](../art-direction.md#ad09--follow-through-on-the-grounded-stylized-direction), alongside generation, MPFB as a hidden base or hand authoring, with rights recorded. The kit preference does not waive canonical body coverage, adjustable faces or removable clothing; game preparation remains deferred. The stock MakeHuman look stays [rejected](../../../art-direction/decisions.md#how-the-current-look-changes-production).
  - **Faces:** sliders on one shared head layout, or a set of whole heads; how a generated face, such as Sela Tern's, joins that layout; brows, beards, eyes, skin tone and signs of age.
  - **Hair:** pieces fitted to the head, with their own bones for braids and long hair, and what hats and hoods do to hair.
  - **The sheet:** what a character sheet must show for each part to be picked or generated. For example: the body in plain underclothes, the person's height, the face from the front and side, the hair from several sides, each garment on its own, and colours.
  - **Matching:** how the closest body is measured from the sheet, what counts as close enough, and what happens when none fits. A new body type is Mike's call.
  - **Existing people:** whether the Peacock Mercenary and the five models from Mike's October 31 sheets are rebuilt from parts or kept as exceptions.
  - **Reuse:** the same parts can later serve a character creator and varied NPCs (DG37). Decide how much of that the design covers now.

  Exit: Mike accepts the design. Not authorized for implementation.

- [ ] **PPL02 — Design removable clothing** (ND41). Kept separate from PPL01, though it needs PPL01's skeleton and body types. The design must settle:
  - **Garments as things in the world:** each garment is an item with an owner, condition and wetness, as the [travel cloak](../../worlds/base/editable-shelters.md) already is, worn in the accepted [clothing slots](../../projects/character-and-map-additions-tech-design.md#equipment-slots): head, neck, hands, inner and outer torso, legs and feet.
  - **Wearing and taking off:** who can put on or remove what, the layering order (a shirt under a coat under a cloak), what wearing changes (warmth, armour), what other people do about clothing, and what a person wears with nothing else on.
  - **Fit:** every garment fits every body type it can meet, at the extremes, either through one version per body type or through shape targets that follow the body.
  - **Drawing:** a person drawn as their body plus what they are wearing, on one skeleton, with the skin under each garment hidden, no clipping between layers, cloth motion for capes and cloaks, and clean seams in the plain-3D presentation.
  - **Cost:** several skinned parts per person, against baking each combination offline. An offline combined export can inspect a selected outfit, but cannot satisfy removable clothing in play. Select the runtime representation from the required item behavior and measured scene cost; the renderer side remains [V3D05](../3d-pixel-art.md#v3d05--rigged-character-and-equipment-family).

  Exit: Mike accepts the design. Not authorized for implementation.

- [ ] **PPL03 — Update the art workflow from the accepted designs.** After PPL01 and PPL02 are accepted, rewrite the [3D page](../../production-workflows/art-flows/3d-models.md), the [tools page](../../production-workflows/art-flows/tools.md) and the [art skill](../../../.agents/skills/openlegend-art/SKILL.md). The new procedure builds each person part by part from their sheet: select or generate the body, the face, the hairstyle and the clothing, picking the closest available body or reporting that none fits. Exit: the pages describe the accepted procedure, and changed-file formatting and `pnpm guidance:check` pass.

Building the parts and rebuilding the first-playable people from them is [AF10](../art-direction.md#art-flow-follow-through), with batches in AF11.
