# Illustration, maps and visible mark-making

Original synthesis of the [Artist Toolkit](https://learn.marketwithmark.com/vault/pack/artist), related Animation examples and World Builder map/cutaway briefs. All 27 Artist prompt bodies were read in the authenticated library; their export was blocked, so these retained methods are particularly important. No source painting, franchise emblem or original prompt is reproduced here. [Coverage](coverage.md) separates substantive methods from short subject requests.

## Build an image in readable layers

1. Establish the composition and identity-bearing proportions with a simple drawing or large masses. Decide where the eye should go and which regions stay quiet. A detailed texture cannot recover an incorrect face, silhouette or map layout.
2. Establish broad light/dark groups and important negative spaces. Keep the defining contour and important gesture legible as detail develops.
3. Choose marks appropriate to the medium and surface: graphite hatching can follow plane direction and deepen through layered pressure; ink can distinguish line weight and filled shapes; paint can build broad colour masses with more selective opaque accents; soft transitions can blend neighbouring values without erasing structure.
4. Add material and identity detail selectively. Directional strokes should describe the form rather than become uniform decorative noise. Put sharper edges and stronger contrast where the subject needs them; use softer or less contrasted regions to preserve hierarchy.
5. Inspect at the intended display size. A convincing close-up may become an unreadable dark patch as an icon or map symbol. Preserve actual transparency and output requirements through the existing production profile.

These are available techniques, not a mandate to copy a famous painter or change the game's plain-3D look. Concepts may be painted; runtime materials and interface assets follow their separate owners.

## Keep the support material part of the design

A mark interacts with its support. Dark ink on pale paper, a pale emblem on dark cloth and a reflection on metal need different contrast and edge treatment. A banner's emblem should remain readable over folds without becoming a floating decal; cloth weave and aging should not erase it. A book page's margins, illustration and text need a shared composition. Decorative paper grain must remain quieter than the content.

For a map, establish the meaningful geography first: land/water, routes, settlements, landmarks and scale relationships. Then place labels where their actual paths and available space remain readable. A relief overview and a local view should retain the same geographic relationships. Translating a flat reference into volume requires deciding which layout and colour relationships are locked and which height/depth changes serve the selected presentation.

An attractive map or illustrated book is not a source of unrestricted player knowledge. If used in gameplay, disclosure, authorship, discovered information and accessibility belong to the existing journal/map/interface feature. This research neither invents hidden-information access nor creates a book feature.

## Animate the process honestly

Choose what the artifact represents before implementing it:

- **Actual incremental marks:** geometry or strokes accumulate to construct the image. Their order, shape and layering must produce a recognizable intermediate subject as well as the final picture.
- **A reveal of an existing image:** masks progressively uncover a prepared source. This may be the right presentation effect, but it does not demonstrate drawing or painting the image from scratch.
- **A hybrid:** broad marks establish the structure, then a controlled reveal or compositing step supplies finish. Identify the source and what the process actually does.

When a visible hand, brush or quill accompanies the process, its tip must meet the active mark. Orient the tool along the stroke tangent with a plausible contact angle; lift or travel without marking between strokes. Synchronize a mark's appearance with contact and distinguish a broad brush pass from a fine tip. A floating hand following an unrelated path undermines the intended impression of skill.

Develop the subject in meaningful stages: layout, structural drawing, broad values/colour, focused details and final accents. Preserve characteristic proportions throughout. Select diagnostic moments that reveal the transition; do not inspect only the last frame. A progress slider or replay must restore the correct mark state at the selected time rather than leave later strokes behind. The [motion reference](motion-and-visible-work.md#sequences-study-cameras-and-demonstrations) explains the study-time distinction.

For a selected procedural illustration or reveal, retain these implementation details:

- Build reproducible texture/mark inputs from explicit seeds before playback. Independent random streams keep a tool sprite from changing merely because the map used more random samples; avoid relying on accidental initialization order.
- Treat continuous ink coverage differently from translucent paint. Repeated alpha compositing at adjoining ink segments can create dark beads. Use a continuous opaque mark or a coverage mask composited once for that mark; preserve intentional layering for washes.
- Keep the reveal mask and subject in explicitly related coordinate frames. Separate transform and masking containers when that makes the relationship clear; check movement, zoom and replay for drift.
- Size curved label paths from the actual glyph advances and letter spacing, then inspect the endpoints. A fixed path-length multiplier is not portable. Reserve padding for blurred shadow falloff so a sprite's rectangular edge does not clip it.
- Build a map's rivers from the chosen drainage/source/outlet relationships, then derive dependent markers from the final geography. Neither an arbitrary high point nor a decorative stroke establishes a believable river. A generated illustration still does not define gameplay geography.

Wait for the relevant assets and construction work to be ready before capturing a completed stage. A fixed delay or a test-count badge is not evidence that the final image exists.

## Original reusable brief

> Create the approved subject as a layered illustration on the selected support. Establish its identifying proportions and large value groups before texture. Let stroke direction follow the forms, with sharper contrast reserved for the focal feature. Preserve the approved layout through intermediate stages. If showing a tool, align its tip and orientation with the marks it actually creates, lifting it between strokes. State whether the result is generated marks, a reveal of supplied art or a combination, and preserve the source and final artifact accordingly.

Use only the clauses relevant to the request. An ordinary illustration does not need animated production. A player-facing map does not need a simulated drawing hand. Keep this detailed reference available for concepts, books, banners, maps, instructional visuals and demonstrations when one is actually selected.
