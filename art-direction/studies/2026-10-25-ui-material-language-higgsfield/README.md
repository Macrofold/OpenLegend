# UI material language — Higgsfield study, October 25, 2026

**State:** Five rounds, all on 2026-10-25.

- **Round 1:** 12 directions. Mike named **HIG-10 Gildmoss Crest** "the best one by far".
- **Round 2:** five variations of HIG-10 and five one-off top-left HUDs. From the
  variations, Mike prefers **10A Bare** for panels in general, **HIG-10 Crest** for buttons,
  and **10E Filigree** for special panels such as the narration background or special
  notifications.
- **Round 3:** ten organic, realistic one-off corner HUDs in response to his round 2 HUD
  feedback (see [Round 3](#round-3--organic-epic-corner-huds)). Mike likes **Jade
  Medallion, Verde Antico, Mossbound Ruin, Rootbound and River Nacre**.
- **Round 4:** five corner-embedded HUDs that vary those picks or follow his new ideas
  (see [Round 4](#round-4--corner-embedded-huds-with-gildmoss-gold)). Mike called **Jade
  Lode** "perfect" and **Overgrown Relic** and **Nacre Shore** solid. He disliked Rampart
  and Marble Frieze because they cover so much of the corner and are not organic.
- **Round 5:** eight variations of Jade Lode, four of the gold ring and four of the corner
  material (see [Round 5](#round-5--jade-lode-ring-and-corner-variations)). On 2026-10-26
  Mike called these good: **Jade Lode, Laurel Ring, Jade-set Band, Star Iron, Malachite,
  River Granite and Gold-Quartz Slate**. That leaves out only Reed Ring and Rooted Ring,
  and includes Star Iron despite the agent's caution about its faceted pattern.

On 2026-10-26 Mike asked for every liked design to be made production-ready: the Gildmoss
kit "exactly as shown" and all 14 liked corner-panel styles, which players will be able to
switch between. The [production package](#production-package--october-26-2026) is exported,
technically checked and archived privately; on 2026-10-27 it was revised so the kit keeps the
study's textures, and Mike chose the kit for every Gildmoss panel
([plan decision 21](../../../docs/projects/interface-art-direction-overhaul-plan.md#decisions)).
It is not integrated or selected for the game;
[UIUX22](../../../docs/maintainers/ui-ux.md#uiux22) tracks integration. All rounds are
**archived privately** in S3, with retrieval verified (see [Resume](#resume)). Nothing is
published publicly.

## Brief

- **Request (Mike, 2026-10-25):** explore OpenLegend's UI materials and construction: textured
  panels, borders, corners, inset frames, title rails, ornamental joints and scaffolding-like
  elements connecting panels. The top-left character panel matters most. It should be "stylized
  for the vibe of the game", a grounded medieval survival world. Show the pieces individually
  and assembled, with readable sample text, and generate a **wide variety** of high-quality
  styles. Whole-screen layouts and item icons are out of scope.
- **Flow / profile / finish:** [Higgsfield](../../../docs/production-workflows/art-flows/higgsfield.md),
  [UI style](../../../docs/production-workflows/art-flows/profiles.md#ui-style), study.
- **References and their roles:**
  - Mike's 24 game-UI screenshots (local folder `Downloads/UIs`; filenames overlap the
    [surface-language brief](../ui-surface-language/brief.md)). These illustrate what
    "stylized to the game's theme" means. Mike asked that they **not** serve as models, so
    none was uploaded to the generator.
  - Mike's 12 concept images (local folder `Downloads/Open Legend - Concept Art`). These set
    the mood: weathered wool cloaks, quilted gambesons, mail, embroidered heraldic cloth,
    reed marshes at dawn, firelight and lanterns. They are described in the prompts, not
    uploaded.
  - Current taste:
    owner preferences from the open UI-overhaul sessions (the Gildmoss base was chosen
    2026-10-25). They are recorded in the local workspace file
    `OpenLegend-ui-comparison-2026-10-18/methods/manual/design/owner-preferences.md`, which is
    outside Git. The prompts
    therefore keep a very dark green ground, ivory text, champagne metallic gold that never
    glows by day, and serif titles with a sans body. They exclude feathered edges, brush
    strokes, ripped paper, rope or cord, glowing icons and text, neon, sci-fi, cute styling,
    pixelated chrome and walnut wood grain.
  - Also applied: the [visual requirements](../../decisions.md#current-visual-requirements--october-16-2026)
    and the [UI brief](../../../docs/ui-design-brief.md#project-and-atmosphere).
- **Budget:** $10 ceiling per task. Usage is measured from the Plus-plan credit balance.
  - Round 1: **68.75 credits** (1,096.25 → 1,027.5), 25 images at 2.75 credits each,
    including one regeneration.
  - Round 2: **41.25 credits** (1,027.5 → 986.25), 15 images.
  - Round 3: **33 credits** (986.25 → 953.25), 12 images: two specimens and ten final
    designs.
  - Round 4: **13.75 credits** (953.25 → 939.5), 5 images.
  - Round 5: **22 credits** (939.5 → 917.5), 8 images.
  - Dollar value: Higgsfield's pricing page (checked 2026-10-25) lists Plus at 1,200
    credits a month for $47 billed annually or $59 monthly, about $0.039–0.049 per credit.
    That values round 1 at about $2.70–3.40, round 2 at about $1.60–2.00, round 3 at about
    $1.30–1.60, round 4 at about $0.55–0.70 and round 5 at about $0.85–1.10: 178.75
    credits in all, about $7.00–8.80.
  - These credits come out of the existing subscription allowance; no separate purchase or
    top-up was made.

## Method

The run used one model, **GPT Image 2.5** (`gpt_image_2_5`, variant `flare`), at quality
`high`, resolution `2k` and aspect 16:9, producing 2688 × 1520 PNGs. No image references were
used. Each direction got two plates built from the same templates, so the comparisons are
equivalent:

- **Kit:** the parts shown separately: Main/Raised/Recessed surfaces, corner, edge, ornament,
  the small/wide/tall frame family, a title rail ("Condition"), connectors (straight, bend,
  T-junction, end cap, bracket, divider), and a "Rest" button in four states.
- **Assembled:** the same top-left HUD on a split screen, bright midday on one side and a
  firelit night on the other. It shows a portrait, the name "Mara Reed", Health, Food, Energy
  and Spirit bars, square lasting effects, circular timed statuses, and a Journal panel
  joined below by that direction's connector.

Each prompt is `_kit.txt` or `_assembled.txt` with `{NAME}` replaced, followed by the
direction file and then `_shared.txt`. All of these are in [prompts/](prompts/).

## Candidates

The order is the order of generation. Full per-direction notes are in
[candidates.json](candidates.json), and output hashes are in [outputs.sha256](outputs.sha256).

| ID     | Direction      | Construction in one line                                                         | Agent assessment                                                                              |
| ------ | -------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| HIG-01 | Forgewright    | Riveted forged-iron straps with a gold inlay around smoked green glass            | Strongest blacksmith identity and clearest joints; heaviest frame                              |
| HIG-02 | Riverstone     | Honed slate, bronze channel, keystone corners, stone corbels as joints           | Quietest and most legible over a bright scene; can feel static                                 |
| HIG-03 | Bannercloth    | Gold-embroidered green wool hanging from iron rods                               | Most tied to the concept-art cloaks and banners; busy at small size                            |
| HIG-04 | Reliquary      | Champlevé enamel in gilt beaded frames with cabochons                            | Most refined, but royal rather than survival; suits rewards and rare items                     |
| HIG-05 | Lanternhorn    | Horn panes in pierced wrought-iron lantern cames                                 | Fits the lantern-light preference; pane texture too mottled behind text                        |
| HIG-06 | Cartographer   | Engraved double rules, scale ticks and compass roundels on smooth green          | Lightest and most modern; fits the drawn-map idea; least tactile                               |
| HIG-07 | Fieldworks     | Oilcloth in ash-pole frames with iron clamps, hung from one post                 | Most literal scaffolding; visible timber grain and an implausible bent pole                    |
| HIG-08 | Gambeson       | Quilted linen, mail bands, lamellar corners, buckled straps                      | Armour craft and original buckle joints; mail is noisy at small size                           |
| HIG-09 | Antlerwork     | Carved bone and antler strips with tine corners and toggles                      | Most original wilderness identity; may read as tribal                                          |
| HIG-10 | Gildmoss Crest | Glass panels, a single champagne hairline, roundels only at joints               | Closest to the chosen Gildmoss direction; Mike's clear favourite of round 1                     |
| HIG-11 | Brooch & Band  | Tablet-woven bands, with bronze penannular brooches pinning panels together      | Most charming connector; corners drift toward knotwork                                         |
| HIG-12 | Verdigris      | Copper repoussé reed-and-wave bands with patina                                  | Most specific to the riverside; copper reads brown                                             |

`d11-tabletweave-kit.r0-title-bug.png` is kept as an earlier revision of HIG-11's kit. A
substitution bug in the generation script printed its heading as "Brooch {NAME} Band".

**Agent recommendation (not owner selection):** to keep the chosen Gildmoss base and add
craft only at structure, pair **HIG-10**'s glass panels with the joint and title-rail hardware
of **HIG-01**, **HIG-11** or **HIG-02**. To push the theme further, **HIG-03** and **HIG-08**
carry the concept art's material world most directly. Keep **HIG-04** in mind for the
reserved "special" treatment for rewards.

## Review and gaps

- **Inspected:** every output at full resolution, plus a compact sheet with each HUD scaled
  to about 320 px wide, roughly its size on a 1920-wide screen. At that size the small bar
  labels fall to about 7 px and stop being comfortably readable in every direction. The
  heavy frames (HIG-03, HIG-11, HIG-12) take a large share of the panel width. These are
  findings about the mock-ups' proportions; they are not runtime measurements.
- **No independent critique** was obtained; all assessments above are the coordinating
  agent's.
- **Text, portraits and states** are rendered into the images, not live text. The portraits
  are painted or semi-pixel, while project preferences put portraits in world pixel art.
  Status colours, button states and night lantern light follow the prompts only loosely.
- **Not production:** no alpha, nine-slice construction, seamless edges or separated parts
  were made or checked.

## Round 2 — Gildmoss Crest variations and one-off corner HUDs

**Request (Mike, 2026-10-25):** five variations of HIG-10, plus five more elaborate designs
for the top-left character HUD that are not plain square borders. The portrait appears only
once in the game, so its frame can be completely unique rather than reusable. It could look
built into the screen frame, for example with gilded metal around the corner. Mike pointed
to the craftsmanship of AAA fantasy RPGs, especially Larian's (Baldur's Gate 3, Divinity),
as examples of the approach, not as designs to copy.

**What the references show (studied, not uploaded):** in the Baldur's Gate 3 and Divinity
screenshots, the portrait is the hub of a one-off piece. A round medallion carries a thick
cast ring, and other parts (a weapon slot, the hotbar housing, a medallion button) dock onto
it. Party portraits sit in shaped tabs, and the minimap has a ring with sockets docked
around it. Ornament gathers at junctions, so these parts read as cast objects rather than
framed boxes.

**Method:** the same model and settings as round 1, at quality `high` and resolution `2k`.

- **Variations (HIG-10A to 10E):** each kit and assembled plate was generated with HIG-10's
  own plate of the same kind as an image reference. The prompt asked for exactly one
  deliberate change, so all five keep HIG-10's specimen layout.
- **One-off HUDs (HIG-H1 to H5):** these use the current HUD contents: portrait, four need
  gauges with numbers, one lasting effect, two timed statuses and the perspective-lock
  toggle. Each was generated alone at 3:2 on a transparent background (checked: 75–85% of
  pixels are fully transparent).
  - `composite.py`, in the archived workspace, places each HUD on a real 1920 × 1080 game
    capture with a blur under its footprint to stand in for glass.
  - Every HUD is scaled to cover the same opaque screen area, about 65,000 px (3% of the
    screen). The current Gildmoss HUD covers about 57,000 px.
  - The board shows each HUD in the full scene, as the 1:1 corner a player sees, and close
    up.

Prompts are in [prompts/r2/](prompts/r2/), and per-candidate notes are in
[candidates-r2.json](candidates-r2.json).

| ID      | Name              | The change or construction                                                               | Agent assessment                                                                      |
| ------- | ----------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| HIG-10A | Gildmoss Bare     | No gold rim: polished glass bevel edges, small corner caps, a clasp between panels         | Tests the "panels without a gold border" idea; lightest; edges soften on bright scenes |
| HIG-10B | Gildmoss Etched   | Faint frosted reed-and-leaf band etched just inside the rim                               | Adds a riverside motif with no extra metal; must stay this faint                      |
| HIG-10C | Gildmoss Notched  | Angled corner plates and a slim spine with a roundel between joined panels               | More game-like corners and the clearest joint; the "notch" came out subtle             |
| HIG-10D | Gildmoss Lantern  | A lantern-bracket crest on each panel's top edge, with the light spreading from it        | Gives the lantern light a source; crest appeared on the HUD only, plus a light leak    |
| HIG-10E | Gildmoss Filigree | Pierced leaf-scroll filigree at the corners, a double hairline rim, a filigree clasp      | Richest yet calm; corner-weighted ornament was a rejected look in earlier UI rounds    |
| HIG-H1  | Corner Mount      | A sculpted corner piece with gilded rails along the top and left screen edges            | Most literally built into the screen; the left rail runs about 43% of screen height    |
| HIG-H2  | Ringed Dial       | Needs as concentric arcs around a large portrait ring, astrolabe-like                    | Most distinctive silhouette; curved bars are harder to compare at a glance             |
| HIG-H3  | Escutcheon        | Portrait in a crested heraldic shield, with needs on rigid glass pennants                | Unmistakably medieval; leans noble or knightly rather than survival camp               |
| HIG-H4  | Lantern Window    | Portrait in a pointed-arch lantern pane hanging from a bracket on the top screen edge    | Ties to the lantern light; the plates beside it are the least unique part              |
| HIG-H5  | Reedscroll        | One continuous cast housing with reed-and-leaf flourishes along the screen edges         | Reads most as one crafted object; compact; leaves spill down the left edge             |

**Agent recommendation (not owner selection):** for the HUD, **H1 Corner Mount** answers
"embedded into the frame of the screen" most directly, and **H5 Reedscroll** is the most
original single object. A promising refinement would mount H5's continuous housing into H1's
corner, with the left rail stopped much higher. For ordinary panels, keep them quiet so the
HUD stays the special piece: **10A Bare** or **10B Etched**, with **10C**'s spine where
panels join.

**Review and gaps (round 2):**

- **Inspected:** every output at full resolution, plus each HUD at 1:1 on the game capture.
  The HUD numbers are larger and clearer than in the current HUD.
- **Placement:** the in-game views are composites on a static capture. They are not running
  game UI, and the glass blur is an approximation.
- **Baked-in content:** the HUD art has text, numbers, bars and icons baked in, and
  soft-shadow alpha around the metal. Production would need the metal separated from live
  content.
- **Not followed exactly:** some icons and colours drift from the prompt. H2's gauge icons
  are gold rather than need-coloured. The variation portraits are painted rather than pixel
  art.
- **No independent critique** was obtained.

## Round 3 — organic, epic corner HUDs

**Mike's feedback on round 2 (2026-10-25):**

- **Panel styles:** Gildmoss Bare is the best in general and for panels, Gildmoss Crest
  for buttons, and Gildmoss Filigree for special panels such as the narration background or
  special notifications.
- **The one-off HUDs:** right direction, but too "cartoony" for the realistic world. Try
  organic elements, not only gold and metal, and keep them closer to the Gildmoss panels:
  for example "an ornate portrait embedded in jade, rock or stone".
- **Status capacity:** the status area must hold **10–15** icons.
- **Shapes to avoid:** Ringed Dial's curved need bars are hated, though its portrait ring
  is liked. Lantern Window's and Escutcheon's signage or flag look is disliked.
- **Mood:** the HUD should feel **epic and legendary**.

**Method:**

- **Same settings:** the same model and settings as round 2's HUDs: 3:2, 2k, quality
  `high`, transparent background.
- **The prompt:** fills in the current HUD contents, now with a status tray showing
  **13 statuses** in two wrapping rows (four square lasting effects, nine round timers) and
  built for up to 15.
  - Need bars are required to be straight.
  - Bars and the tray sit on **Gildmoss Bare** glass.
  - It asks for realistic, physically based materials and bans signs, flags, pennants,
    hanging pieces, thick outlines and cartoon shading.
  - Each design describes only its unique portrait setting.
- **Panel reference:** two jade specimens, one with and one without a crop of the 10A
  panel attached as a material reference, showed the reference version matching
  Gildmoss Bare more closely. All ten designs therefore used it.
  - The reference version had painted the portrait rather than drawing pixel art and had
    dropped one status. The prompt was tightened for both before the final batch.
  - Both specimens are kept as `r3-v01-jade-*.r0`.
- **Presentation cleanup:** the generator left faint speckle in the empty transparent
  canvas, up to about 23% opacity, which would have dirtied the game view.
  `clean_alpha.py` writes `-clean` copies that zero alpha more than about 12 px from the
  art. The originals are archived unchanged.
- **Comparison:** each cleaned HUD is composited on the same 1920 × 1080 game capture at
  an equal footprint of about 110,000 opaque px, which puts it about 450–510 px wide.
  That is larger than the current HUD because it holds 13 statuses instead of 3.

Prompts are in [prompts/r3/](prompts/r3/), and per-design notes are in
[candidates-r3.json](candidates-r3.json).

| ID        | Name           | Portrait setting                                                                  | Agent assessment                                                             |
| --------- | -------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| HIG-R3-01 | Jade Medallion | Carved translucent nephrite jade boulder with low-relief reeds                    | Mike's jade idea; reads as real stone; boulder is large and busy when small  |
| HIG-R3-02 | Verde Antico   | Oval cameo in dark green veined marble, with a gilded stone laurel wreath          | Most classical and legendary; carries over the liked portrait ring            |
| HIG-R3-03 | Kintsugi Stone | Dark river stone cracked and mended with gold seams                               | Organic gold with a story; simplest silhouette; shows 12 of the 13 statuses  |
| HIG-R3-04 | Geode Hollow   | Split geode with banded agate and a ring of dark green crystals                   | Most striking natural object; busiest texture                                |
| HIG-R3-05 | Gold in Quartz | Dark smoky quartz threaded with natural gold veins                                | Gold as found in nature; the eye toggle floats outside the tray               |
| HIG-R3-06 | Mossbound Ruin | Weathered fragment of an ancient granite ring with moss, fern and lichen          | Strongest "legendary ruin" mood; letter-like carvings could read as writing  |
| HIG-R3-07 | Rootbound      | Stone medallion gripped by ancient grey roots along the screen edges              | Feels grown into the corner; roots add weight down the left edge             |
| HIG-R3-08 | Stag Crown     | Dark stone ring with real weathered stag antlers rising behind it                 | Noble wilderness silhouette; tallest, and may read as a trophy                |
| HIG-R3-09 | Obsidian Edge  | Volcanic obsidian with flaked edges around a polished face                         | Dramatic, but the flakes came out as flat facets, close to the rejected look |
| HIG-R3-10 | River Nacre    | River mother-of-pearl ring with freshwater pearls, in dark river stone            | Most precious and river-specific; may read as jewellery                       |

**Agent recommendation (not owner selection):** **Verde Antico** best combines the
epic-legendary mood with the portrait ring Mike liked. **Jade Medallion** and **Kintsugi
Stone** are the most direct answers to "embedded in jade, rock or stone". **Mossbound Ruin**
has the strongest sense of an ancient place. Avoid Obsidian Edge, because its facets echo
the rejected faceted look.

**Review and gaps (round 3):**

- **Inspected:** every original output, the cleaned alpha maps, and all ten at 1:1 on the
  game capture.
- **Statuses:** all ten fit 13 statuses in two rows (Kintsugi shows 12), at about
  22–26 px each on a 1920 × 1080 screen, with room for 15.
- **Bars:** straight in every design.
- **Shared layout:** the ten designs share one layout (setting, then bar panel, then status
  tray) because the prompt fixed it. Their variety is in the portrait setting. Layout
  variations can follow once a material is chosen.
- **Other drift:**
  - The need-bar colours are somewhat brighter than the "muted, bordering on dark"
    preference.
  - The eye toggle sticks out of the tray in Verde Antico, Gold in Quartz and River Nacre.
  - Geode's water-droplet status came out red.
- **Not running UI:** these are still static composites with text, numbers and icons
  baked in. No independent critique was obtained.

## Round 4 — corner-embedded HUDs with Gildmoss gold

**Mike's feedback on round 3 (2026-10-25):**

- **Picks:** he likes Jade Medallion, Verde Antico, Mossbound Ruin, Rootbound and River
  Nacre.
- **Gold:** ornate gold was not meant to go away entirely. It should fit Gildmoss's
  colours and visuals.
- **Corner embedding:** one idea is gold embedded in jade, with the jade rock taking up the
  whole corner and appearing to run off-screen. The panel then looks embedded in a corner of
  mountainous rock or ore, the way Rootbound connects to the corner.
- **Castle idea:** one design could look castle-like or like part of a rampart, but not
  tacky or cartoony.
- **Eye toggle:** it belongs to the right of the need bars, loosely connected to the panel.
  It can sit in a small outcrop styled like the portrait setting, for example a little jade
  outcrop for Jade Medallion: subtle and natural, but clearly a button.

**Method:**

- **Same base:** the same model and settings as round 3 (3:2, 2k, quality `high`,
  transparent background, Gildmoss Bare panels, straight muted bars with the round 8f
  colours, 13 statuses).
- **Placement and gold:** the prompt now places the eye button in a small outcrop to the
  right of the bars. It welcomes ornate gold in the Gildmoss style and lets the corner
  setting run off the top and left edges, but no further right than the eye button.
- **References:** each variation attached the round 3 design it varies as a reference.
  Overgrown Relic attached both Mossbound Ruin and Rootbound. Rampart attached the
  Gildmoss Bare panel crop. All five attached a crop of the Gildmoss Filigree ornament
  pieces as the style for the gold. The prompt names each reference by its attachment order.
- **Specimen first:** Jade Lode was generated first as a specimen and kept unchanged.
- **Cleanup and comparison:** each HUD gets the same `-clean` alpha cleanup. Because the
  settings now run off-screen by different amounts, each is composited at an equal width
  of 500 px rather than an equal area.

Prompts are in [prompts/r4/](prompts/r4/), and per-design notes are in
[candidates-r4.json](candidates-r4.json).

| ID        | Name            | What changed                                                                         | Agent assessment                                                            |
| --------- | --------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| HIG-R4-01 | Jade Lode       | Jade Medallion as a jade ore mass filling the corner, gold veins, ornate gold bezel  | Closest to Mike's idea; the rock is modest at this size; gold veins faint   |
| HIG-R4-02 | Rampart         | New: weathered ashlar rampart with low merlons, a gold-framed stone oculus, corbels   | Monumental, not a toy; the wall runs 47% down the left edge; 12 of 13       |
| HIG-R4-03 | Marble Frieze   | Verde Antico as a temple cornice, with the laurel wreath in ornate champagne gold    | Most regal; the marble border runs 40% down the left edge                   |
| HIG-R4-04 | Overgrown Relic | Mossbound Ruin and Rootbound blended, with a worn ornate gold ring                   | Natural blend of two picks; compact; busy texture at the corner             |
| HIG-R4-05 | Nacre Shore     | River Nacre set in a slate riverbank outcrop with nacre seams and a gold setting     | Keeps River Nacre's character; the corner embedding is subtle at this size  |

The eye button sits to the right of the bars in all five, in an outcrop of the setting's
material.

**Agent recommendation (not owner selection):**

- **Mike's two ideas:** Jade Lode and Overgrown Relic deliver "embedded in a corner of
  rock" most directly while staying compact.
- **Most regal:** Marble Frieze, if its left border is stopped just below the status
  tray.
- **Rampart:** convincingly realistic, but its height and merlons make it the riskiest for
  a HUD.

**Review and gaps (round 4):**

- **Inspected:** every original output, the cleaned alpha and all five at 1:1.
- **Statuses:** all five keep straight bars and Gildmoss Bare panels. Four show all 13
  statuses; Rampart shows 12.
- **Bar colours:** closer to the muted target than round 3, though Health is still a
  medium red.
- **Vertical runs:** the wall and marble border running down the left edge came from the
  "may run off the top and left edges" instruction. A refinement can stop them below the
  tray.
- **Not running UI:** still static composites with baked-in text and numbers. No
  independent critique was obtained.

## Round 5 — Jade Lode ring and corner variations

**Mike's feedback on round 4 (2026-10-25):**

- **Picks:** Jade Lode is "perfect"; Overgrown Relic and Nacre Shore are solid.
- **Dislikes:** Rampart and Marble Frieze, because they cover so much of the corner and are
  not organic.
- **Next:** more variations with stone, rock or metal corner segments, and more variations
  of the gold ring. Some rings can be thicker, like the Ringed Dial ring from round 2.

**Method:**

- **Template:** round 4's, with the corner setting now required to stay compact like
  Jade Lode's. It fills only the corner around the portrait and never runs down the left
  edge below the status tray. It also never runs along the top edge past the start of the
  bar panel. Architecture, walls, columns, cornices and borders along the screen edges are
  excluded.
- **References:** every design attaches Jade Lode as its first reference, which keeps the
  layout, panels, status tray and eye-button outcrop.
  - Designs that ask for a thick laurel ring also attach a masked crop of the round 2
    Ringed Dial ring (`refs/ringed-dial-ring-ref.png`), described as a guide to the ring's
    weight and engraving only.
  - Without the Filigree crop, the gold still came out in the champagne Gildmoss tone.
- **Two sets:** four **ring** variations keep the jade corner and change only the gold
  around the portrait. Four **corner material** variations keep a thick laurel ring and
  change only the material.
- **Specimens:** one of each set (Laurel Ring and River Granite) was generated first and
  kept unchanged. Before the batch, I checked that each corner stayed compact.
- **Comparison:** each design gets the same `-clean` alpha cleanup and is composited at an
  equal width of 500 px. The board shows it beside Jade Lode.

Prompts are in [prompts/r5/](prompts/r5/), and per-design notes are in
[candidates-r5.json](candidates-r5.json).

| ID        | Name              | What changed from Jade Lode                                                    | Agent assessment                                                          |
| --------- | ----------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| HIG-R5-X1 | Laurel Ring       | Thick cast gold ring with an engraved laurel face, like the Ringed Dial ring   | Weighty and legendary; reads cleanly at 1:1; plainer than the leaf scrolls |
| HIG-R5-X2 | Reed Ring         | Gold ring wrapped in overlapping river reeds and leaves                        | Most organic gold; came out as an open wreath, slightly over the tray     |
| HIG-R5-X3 | Jade-set Band     | Thick smooth band with four jade cabochons and a beaded inner rim              | Ties gold and jade together; reads a little like a porthole               |
| HIG-R5-X4 | Rooted Ring       | Gold ring whose lower half breaks into gold roots gripping the jade            | Most original idea; the ring came out thin and the roots are busy         |
| HIG-R5-Y1 | River Granite     | Water-worn grey granite with moss, thick laurel ring                           | Calmest and most natural; grey steps away from the green palette         |
| HIG-R5-Y2 | Gold-Quartz Slate | Dark slate with white quartz seams carrying native gold, thick laurel ring     | Most convincing ore; the white seams compete with the portrait            |
| HIG-R5-Y3 | Star Iron         | Meteoritic iron with its crystal pattern and pitted crust, thick laurel ring   | The metal option; pattern looks manufactured and close to faceted         |
| HIG-R5-Y4 | Malachite         | Banded polished malachite with a raw edge, thick laurel ring                   | Stays green and precious; brighter emerald than the Gildmoss greens       |

**Agent recommendation (not owner selection):**

- **Ring:** for the thicker ring Mike asked for, **Laurel Ring** carries the Ringed Dial
  weight into Jade Lode most cleanly. **Reed Ring** is the most organic alternative.
- **Corner:** the jade stays the strongest material. **Gold-Quartz Slate** is the best
  alternative ore if its white seams are toned down, and **River Granite** if a calmer
  rock is wanted.
- **Avoid:** **Star Iron**, whose pattern echoes the rejected faceted look.

**Review and gaps (round 5):**

- **Checks:**
  - Every original output inspected.
  - Cleaned alpha checked.
  - All eight compared at 1:1 beside Jade Lode.
- **What held:** all eight corners stay compact, the need bars are straight, all 13
  statuses show, and the eye button sits in an outcrop to the right of the bars.
- **Prompt drift:** the Reed Ring and Rooted Ring rings came out thinner than asked. Reed
  Ring's leaves reach onto the tray's top-left corner. Health is still a medium red.
- **Not running UI:** still static composites with baked-in text and numbers. No
  independent critique was obtained.

## Production package — October 26, 2026

**Request:** make everything Mike liked production-ready, including earlier rounds, for an
in-game option that switches the character panel's style. Deliver the Gildmoss UI exactly as
shown for all panels, with the panel textures and bezels. Preserve the selected designs,
produce usable files with metadata, verify the exports, archive them in S3, and stop before
integration.

**Consumer contract (proposed; no importer exists yet):** the web client's design system.
Exports use the repository paths they would take, `apps/client/src/design-system/art/…`, at
@1x and @2x PNG with straight alpha. Live content stays native: text, numbers, bars, icons,
statuses, portraits and button states.

- **Gildmoss kit:** 41 parts in `gildmoss.json`.
  - **Bare:** a nine-slice frame with transparent centre, tileable main, raised and recessed
    glass fills (translucent, with the study glass's colour and faint texture), matching
    lantern-light overlays and the bevel glint, rails, dividers, edges and connectors.
  - **Crest:** nine-slice buttons in normal, hover, pressed and unavailable states, plus the
    label ornament.
  - **Filigree:** frame, rails, dividers, edges, connectors and ornaments.
  - **Assembly metadata:** in CSS px, with @2x exactly twice @1x. It covers slices,
    outsets, minimum sizes, button design size and corner scaling, glint and lantern
    placement, connector anchors, and the shared need-track style.
- **Character panels:** 14 styles in `styles.json`: Jade Medallion, Verde Antico, Mossbound
  Ruin, Rootbound, River Nacre, Jade Lode, Overgrown Relic, Nacre Shore, Laurel Ring, Jade-set
  Band, River Granite, Gold-Quartz Slate, Star Iron and Malachite.
  - Each is one plate anchored at the screen corner, with the portrait opening, need and
    status glass, and the lock-button face or glyph cut out.
  - Each has its own glass tile, in its design's tray colour.
  - Each `layout.json` gives, in CSS px, the portrait ellipse, glass rects, need-row
    track/icon/value boxes, the status grid and the lock button.
  - Status cells are 30 px in every style, with capacity 16–18. Bars, numbers and portraits
    follow each design's proportions, varying by up to about a third. Numbers use the UI's
    value text size, so switching styles keeps them readable.

**Method:**

- **Recipe:** reproducible Python scripts derive every export from the study images. Kit
  parts are keyed from the kit sheets' flat background. Corners, caps, ornaments and fixed
  pieces are the study's pixels. A part that resizes repeats a real span of its edge, with
  the study's surface texture, using `border-image-repeat: round`. Dividers taper along their
  length, so they scale whole under their centre ornament. Lantern light is rebuilt from the
  measured falloff; the glint keeps its own colours.
- **Glass:** 90% opaque under a backdrop blur, about what the study's day and night screens
  imply. The kit glass shows the assembled Bare screen's glass colour (`#1d261c`) over the
  game's average scene, with that glass's faint cloudy texture synthesised from its measured
  statistics. The kit sheet's swatches have a painted forest behind the glass, so they are
  not used for colour. Each style's glass is its own design's darker tray colour, without
  lantern light, since the designs show the trays evenly lit. 13 of 14 styles are within
  about 5% of their design's glass brightness; Mossbound Ruin is 15% darker.
- **Plates:** the study images with live areas cut. A lock button's face is either cut as
  glass or rebuilt from its own radial profile.
- **Inspection:** previews from the final exports assemble every part and style at both
  densities over bright and dark game captures, with live stand-in content and 15 statuses.
- **Validation:** `recipe/validate.py` checks the exported bytes. All checks pass.
- **Independent review:** a fresh reviewer compared the first exports with the designs and
  found no defects in the plates. It did report several problems:
  - buttons that turned into capsules at smaller sizes;
  - glass darker than the designs;
  - a glint spilling past narrow panels;
  - contradictory value-column metadata, and a status cell touching Rootbound's lock button;
  - mixed units and @2x files that were not exactly double their @1x size;
  - missing connector anchors and track style.

  All were fixed, and the validator now checks for each of them.
- **Fidelity revision, October 27:** Mike asked whether the Gildmoss elements matched the study
  exactly, with the same texture and fidelity. They did not.
  - **What had drifted:** stretching edges, rail middles and button faces had been averaged
    into flat profiles, losing the study's texture. The glass was a flat tint matched to the
    corner-panel trays, about 60% of the study glass's brightness. The lantern was a wide grey
    haze, and the divider tapers were stretched into steps. The button ornament carried a faint
    box.
  - **Method:** matched-scale fidelity sheets now draw every kit part as the consumer would,
    beside the study part, and a Journal panel beside the assembled screen.
  - **Result:** the exports were rebuilt to the method above, and the validator checks that
    repeating middles join without seams at both densities.
- **Package documentation:** the package `README.md` gives assembly order, CSS mapping and
  reproduction steps.

**Limits:**

- **No editable masters:** these are raster images from generated concepts, with no layered
  or vector masters.
- **Lock buttons:** the round 3 styles keep their designed lock-button positions; three have
  the button inside the status tray.
- **Condition rows:** the plates assume the designed four condition rows.
- **Kit sheet or assembled screen:** where the assembled screens draw a part slightly
  differently from its kit sheet, the exports follow the kit sheet. Examples are pyramid corner
  guards instead of diamond studs, a wider bevel, light along the glass edges and smaller
  title-rail diamonds.
- **Scale:** the kit's 1x is half the study pixels, about 0.7× the assembled screens'
  proportions on a 1920-wide screen; a UI scale of 1.4 reproduces them.
- **Preview stand-ins:** previews substitute Georgia and Helvetica for Gelasio and Figtree.
- **Not checked yet:** browser rendering, focus, resizing and real game data belong to
  integration.

## Resume

- **Private archive:** a `study` revision in the existing private library domain
  (`art-library` / `curated-private`). That is the domain earlier private preservation used;
  no private study domain exists yet. The rights evidence is
  `owner-authorized-private-study-archive-2026-10-25` (Mike's chat request), with the uses
  `private-study`, `source`, `offline` and `recovery`.
  - Owner `collection/openlegend-curated`, asset
    `ui-material-language-higgsfield-2026-10-25`.
  - Revision `sha256-1b73bfdfccb59d38f3edfe097582d8c5e9a39eb5092b519c2ab34e07ce78688a`,
    manifest SHA-256 `a55eda1b9ce81d6319ae7504b2ace35d4c3ce3bd119c217f42a6a30314cb67af`.
  - Publication operation `ui-material-language-higgsfield-2026-10-25-private`.
  - 97 files, 152,981,032 bytes: the 25 PNGs (including HIG-11's `r0` kit), each with its
    full prompt, the `prompts/` sources, `directions.json`, the comparison board
    (`boards/index.html` with `boards/img/`, plus the self-contained `boards/board.html`), the
    overview sheets, `gen.sh` and `build_board.py`. The exact file list is
    [archive.index.json](archive.index.json).
  - An authenticated `pnpm assets verify --index … --all` re-downloaded every file and matched
    its hash.
  - Provider job records and error logs were deliberately left out as private operational
    receipts. They remain only in the workstation folder below.
- **Round 2 private archive:** a second `study` revision in the same domain, with the same
  evidence and uses. It holds only the new files and lists the round 1 revision as a
  dependency instead of copying it.
  - Asset `ui-material-language-higgsfield-2026-10-25-round-2`.
  - Revision `sha256-1826c4f8661a914094c1ab29c2cbbc8cc2b21ddf2ba91fe7ce4199321ea30f34`,
    manifest SHA-256 `df6ad00314b7d22c1c502d206c1d763aa58b1d7eeebabafe4425380d17b1ef21`.
  - Publication operation `ui-material-language-higgsfield-2026-10-25-round-2-private`.
  - 92 files, 72,354,190 bytes: the 15 generated PNGs with prompts, the in-game composites,
    1:1 corners and close-ups, the game capture used for compositing, `prompts/r2/`, the
    round 2 board (`boards/round2.html` and its new `boards/img/` files),
    `directions-r2.json`, `gen2.sh`, `composite.py`, `hud_views.py` and `build_board2.py`.
    The exact file list is [archive-round-2.index.json](archive-round-2.index.json).
  - The publish logged one transient upload warning mid-transfer and completed. An
    authenticated `pnpm assets verify --index … --all` then re-downloaded all 92 files and
    matched every hash.
- **Round 3 private archive:** a third `study` revision in the same domain, with the same
  evidence and uses, depending on round 2.
  - Asset `ui-material-language-higgsfield-2026-10-25-round-3`.
  - Revision `sha256-fb48e77282b19e2d69830ae1afcbb4b033a52f715c2399c8222104258d74ac85`,
    manifest SHA-256 `00ed9aae790af6a4f913e90d59638237a601a0b6984ef0027b9c83a67610fcb4`.
  - Publication operation `ui-material-language-higgsfield-2026-10-25-round-3-private`.
  - 114 files, 74,186,197 bytes: the 12 original PNGs with prompts (including the two `r0`
    specimens), their `-clean` copies and views, the Gildmoss Bare panel reference crop,
    `prompts/r3/`, the round 3 board (`boards/round3.html` and its new `boards/img/` files),
    `directions-r3.json`, `gen3.sh`, `clean_alpha.py`, `build_board3.py` and the updated
    `hud_views.py`. The exact file list is
    [archive-round-3.index.json](archive-round-3.index.json).
  - The publish logged the same transient upload warning and completed. An authenticated
    verify re-downloaded all 114 files and matched every hash.
- **Round 4 private archive:** a fourth `study` revision in the same domain, with the same
  evidence and uses, depending on round 3.
  - Asset `ui-material-language-higgsfield-2026-10-25-round-4`.
  - Revision `sha256-c988b7604b5bd16258ac859c1f145c8fe1128ee571205bda6806c1da693e871c`,
    manifest SHA-256 `11a2871ff75f5d9cc607daab15c3620e5b513e5bfcd9934ff95f7c4e5216cc0a`.
  - Publication operation `ui-material-language-higgsfield-2026-10-25-round-4-private`.
  - 64 files, 52,942,903 bytes: the five original PNGs with prompts, their `-clean` copies
    and views, the Gildmoss Filigree ornament reference crop, `prompts/r4/`, the round 4
    board (`boards/round4.html` and its new `boards/img/` files), `directions-r4.json`,
    `gen4.sh` and the generalized `build_board3.py`. The exact file list is
    [archive-round-4.index.json](archive-round-4.index.json).
  - An authenticated verify re-downloaded all 64 files and matched every hash.
- **Round 5 private archive:** a fifth `study` revision in the same domain, with the same
  evidence and uses, depending on round 4.
  - Asset `ui-material-language-higgsfield-2026-10-25-round-5`.
  - Revision `sha256-e5b84799f386cc2d737040d9bca897356a147dc421e89cff493d201fa9592879`,
    manifest SHA-256 `f23f0cd1c5d7c46628245e94669b2b828fc1a77e68b0276d2a84adc6d5ed5630`.
  - Publication operation `ui-material-language-higgsfield-2026-10-25-round-5-private`.
  - 100 files, 85,072,374 bytes: the eight original PNGs with prompts, their `-clean`
    copies and views, the Ringed Dial ring reference crop, `prompts/r5/`, the round 5 board
    (`boards/round5.html` and its new `boards/img/` files), `directions-r5.json`, and the
    updated `gen4.sh` and `build_board3.py`. The exact file list is
    [archive-round-5.index.json](archive-round-5.index.json).
  - The publish logged the same transient upload warning and completed. An authenticated
    verify re-downloaded all 100 files and matched every hash.
- **Production package archive:** two revisions in the same private library domain, rights
  evidence `owner-requested-ui-production-package-2026-10-26`, uses `source`,
  `private-study`, `offline` and `recovery` (runtime use is decided at integration).
  - Sources: asset `ui-gildmoss-character-panels-production-sources`, revision
    `sha256-cbfaa7e00ed6f7229b7cb3604862897bfa04c9108265d0e3f775a07ba884babd`, manifest
    SHA-256 `976192c30c0696ee5314f16d7a4b333e6d75b80d6f266d0d28eb67d837e26d8f`
    (operation `ui-gildmoss-character-panels-production-sources-2026-10-26-r3`, published
    October 27). 94 files, 57,418,500 bytes: plate masters, game capture, recipe, inspection
    and the package README. It depends on the round 5 study revision.
  - Exports: asset `ui-gildmoss-character-panels`, revision
    `sha256-706414807c04c61e786f9391f98bbea499fc37dd90d0f6313786fb88bd02668a`, manifest
    SHA-256 `1248c8bd240de70e85431d75883a5f00d908a332b3bc4dce64d07a49ba432af3`
    (operation `ui-gildmoss-character-panels-2026-10-26-r3`). 154 files, 8,605,375 bytes.
    It depends on the sources revision.
  - Superseded revisions stay archived; do not integrate them.
    - October 26 second revisions, before the fidelity revision, with flattened textures and
      darker glass: sources `sha256-54ee92b6…`, exports `sha256-c549ac8e…`.
    - October 26 first revisions, from before the review fixes, with lighter glass,
      fractional @1x slices and button scaling not yet defined: sources `sha256-8eb3e53d…`,
      exports `sha256-5d35925d…`.
  - File lists: [production-sources.index.json](production-sources.index.json) and
    [production-exports.index.json](production-exports.index.json). The sources publish
    logged a transient upload warning and completed. An authenticated verify re-downloaded
    every file of both revisions and matched every hash.
- **Retrieve:** sign in with `"$HOME/.local/bin/aws" login --profile openlegend`, then from
  the repository root run
  `pnpm assets workspace --index art-direction/studies/2026-10-25-ui-material-language-higgsfield/archive.index.json --prefix outputs --output /new/external/folder`.
  Use `--prefix boards` or `--prefix prompts` for the other parts. The command creates the
  output folder and refuses to write into an existing one, so use a fresh folder for each
  run. For rounds 2 to 5, use `archive-round-2.index.json` through
  `archive-round-5.index.json`. Each board page is complete on its own; only the links back
  to earlier rounds at the top need those rounds' `boards/` copied beside it.
- **Workstation copy:** `/Users/mzw/Documents/ChatGPT/OpenLegend-studies/2026-10-25-ui-material-language-higgsfield/`.
  This is a convenience copy, not the archive.
- **Viewing the boards:** open `boards/index.html` (round 1) or `boards/round2.html` to
  `boards/round5.html` in a normal web browser. The Claude app's preview pane shows a local page as a snapshot without
  its neighbouring image files.
- **Next stage:** the production kit is complete; [UIUX22](../../../docs/maintainers/ui-ux.md#uiux22)
  tracks runtime publication and integration of the selected kit and switchable character-panel
  styles. Public publication needs Mike's separate approval.
