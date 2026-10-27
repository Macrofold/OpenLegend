# Gildmoss design system

**Status:** accepted on 2026-10-26 as the final design of the [interface overhaul](../../../../../docs/projects/interface-art-direction-overhaul-plan.md); **not yet integrated**. The running game still uses the [current design system](../README.md). This folder holds the accepted design so integration can map it onto the existing components; nothing imports it yet.

Gildmoss is row Q of the overhaul's Claude Design canvas at version 41 (`1792999021-8ee1`): eleven screens and a component sheet, chosen and refined by Mike over rounds 8–8n, with the icon family completed in round 8o. The [study record](../../../../../art-direction/studies/2026-10-18-interface-direct-method/README.md) holds the history, alternatives and decisions; the production package holds the artwork, fonts and sources.

## The look

The world stays the main view. Panels are deep olive glass with no border: a soft 12 px blur of the world behind them, the strongest lantern light at their top edge and a shadow beneath. Pale champagne gold is metal that reflects rather than glows. It appears only on what is chosen — the selected tab, row, slot and toggle — and on rims and gold labels. Everything unselected is silver. The single primary action in a panel, and the quantity slider, are a solid, slightly warmer gold so they stand out. Gelasio sets names and titles, and in italic the narrator's voice; Figtree sets everything you read and act on. By day nothing glows; at dusk the lantern light turns amber and chosen elements gain a soft, wide firelight glow. Nothing is cartoony, neon or extreme.

## Files

| File                                                   | What it is                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`tokens.json`](tokens.json)                           | The authored values: every colour, metal finish, surface, shadow, type role, size, radius, spacing step, night glow and the layout of the HUD pieces, each with what it is for. Role names reuse the current tokens where the meaning is the same (`canvas`, `surface`, `ink`, `highlight`, …), so they can become a theme of the existing token set. |
| [`components.reference.css`](components.reference.css) | The final boards' own stylesheet plus the reserved special shine: the exact construction of panels, buttons, fields, tabs, rows, menus, slots, meters, statuses, hotbar, tooltips, events, narrator and night. Class names are the boards'; integration maps them onto the existing components.                                                       |
| [`assets.json`](assets.json)                           | An exact index of the package files integration will use — icons, HUD glyphs, status frames, fonts and art — for `pnpm assets workspace --index`. The whole package and the study material are indexed beside the [study record](../../../../../art-direction/studies/2026-10-18-interface-direct-method/README.md).                                  |

The production package is stored outside Git, as the [asset workflow](../../../../../docs/asset-workflow.md) requires. It contains the icon catalog in this client's existing icon format (117 keys: the 108-icon family, three example status glyphs and six keys that reuse a glyph), its finishes stylesheet and metal gradients, standalone SVGs, the HUD glyphs, status-frame references, a merge plan for the current catalog, the Gelasio and Figtree variable WOFF2 fonts with their OFL licenses, the logo seal and other raster art, the final Claude Design sources with every picture they use, full-size renders, a specimen page with its captures, an inventory with hashes, and the build recipe. `assets.json` fetches the files integration needs; the study record fetches everything.

## Colour and metal

The canonical values and their uses are in `tokens.json`. The ones that define the feel:

- **Ground and glass:** canvas `#0C110B`; panel glass `rgba(20, 28, 17, 0.86)` falling to `rgba(12, 17, 11, 0.86)`, HUD plates and the Say and Act bars at 84 %.
- **Chosen and hover:** chosen rows, tabs, toggles and tiles `#2C2E1D` under a 1 px gold metal edge (2 px on a selected slot); button hover `#1F2A1A`.
- **Text:** ivory `#EFE8D2`, secondary `#C3BDA5`, muted `#9A967E`, unselected silver `#B9BDB3`. Text is at least 4.5 : 1.
- **Gold:** the highlight `#DBBE7C` (rims, the narrator's timer line); gold label text from `#F9EFD8` to `#D0B47B`; the primary button `#E9C264` with dark ink `#211A0B`, hover `#F0CD77`, pressed `#D8AA46`.
- **Need bars, Cobalt pigments:** Health `#B43A31`, Food `#C1872B`, Energy `#268843`, Spirit `#2E5FB6`, on a near-black track; each is at least 3 : 1 against it. Food stays an amber, clear of the selection gold.
- **Status tones:** good `#50915E`, bad `#B0564C`, neutral `#4E74B5`, special `#A68E5B`.
- **Coral and leaf:** `#F08A76` marks something missing, an unavailable reason or damage over the world; `#A9CB8B` marks a net gain or having everything.

Metal is never a panel border or a button fill. Gradients are copied exactly from the boards: the chosen edge (135°), the tab underline and hotbar dividers, the round rims (conic, from 210°), gold label text, and the icon metals.

## Type

| Role       | Font                                   | Used for                                     |
| ---------- | -------------------------------------- | -------------------------------------------- |
| title-xl   | Gelasio 600 28/32                      | Big-panel and window titles                  |
| title-lg   | Gelasio 600 24/28                      | Selected recipe, section titles              |
| title-md   | Gelasio 600 20/24                      | Column titles, the game menu                 |
| title-sm   | Gelasio 600 17/22                      | Menu headers, small windows                  |
| narrator   | Gelasio italic 400 20/28               | The narrator's captions                      |
| world-name | Gelasio 600 16/20, light gold          | Names over the world, tooltip titles         |
| tab        | Figtree 600 15/20                      | Main panel tabs                              |
| body       | Figtree 500 14/20 (buttons at 600)     | Body text and rows                           |
| detail     | Figtree 500 13/18                      | Descriptions and status lines                |
| label      | Figtree 700 12/16, +8 % tracking, caps | Labels in capitals and counts; never smaller |

Gelasio italic is the narrator's voice; it is never used for people's speech.

## Spacing, sizes and corners

Spacing uses only 4, 8, 12, 16, 24 and 32. Each surface has one left edge, equal paddings and aligned trailing columns; nothing is clipped or wraps by accident. Controls are 32 high (28 compact); rows 32, list rows 56; slots 48; hotbar tiles 52, its panel buttons 40; status icons 32; icons 16–20 (24–26 on the hotbar); every target at least 28 × 28. Corners: panel 10, window 8, control 6, slot 4.

## Icons

One family of 108 soft filled glyphs on a 24 grid: a metal-filled shape, metal lines and a dark engraved mark (`--icon-mark`). The package's `icons.css` gives each finish: gold when chosen, silver otherwise, ivory inside status frames, dark ink (with a lighter mark) on the gold primary button, and green for Crafting's Have everything checks. The catalog uses this client's existing format, so a key keeps one meaning. Gildmoss supplies new artwork for 38 of the current catalog's 72 keys and gives six more an existing glyph (fire uses the campfire, cognition the mind, In view the eye, back and next the submenu chevron, the star the sparkles). The package's `catalog-merge.json` lists every current key's outcome. Eight camera-control icons retire with the camera buttons the design removes; eight are unused; twelve name world things (resources, animals, a person) and keep their current artwork until the world's pixel-art sprites replace them. Events marks speech, actions and observations with the Speak, Act and Overview (eye) icons. Main hand and Melee weapons share one sword glyph.

Icons for things a world defines — needs (`meter.*`), statuses (`status.*`), body regions (`body.*`), recipe categories (`category.*`), the campfire and cooking — are artwork only. The installed world chooses which key its presentation data uses; interface code never names world needs, statuses, slots or categories itself. The status icons in the designs (Well fed, Winded, Stiff leg, Trail legs, Smells of smoke, Damp, Inspired, Promise kept) are examples; the bundled world defines its own statuses. Spirit appears only where a world defines it; the bundled world's Spirit is specified in [Character and map additions](../../../../../docs/projects/character-and-map-additions-feature-spec.md).

## Components

`components.reference.css` is the exact construction. In words:

- **Panels, windows, menus and tooltips:** glass with lantern light and shadow, no border. Panel dividers are silver at 22 %. Names and status lines over the world never show through a panel.
- **Buttons:** primary solid gold; secondary raised olive with a faint gold inset edge; quiet buttons have no fill. Hover lightens and pressed darkens; focus is a 2 px ivory outline 2 px outside. Unavailable controls keep a reachable explanation.
- **Fields:** a dark well with a faint gold inset edge; focus adds an ivory edge and a soft halo.
- **Tabs:** the chosen tab's label is gold with a 2 px metal underline; the rest are silver. Segmented groups use the chosen fill.
- **Right-click menu:** 8 px top and bottom; rows 32 high, 4 from the panel's side, content 12 from its edge; an 18 icon in a 24 column or the item's sprite at 1× in a 40 column; the header shows the object's art in a 64 × 52 well, its name in Gelasio 17 and its state in Figtree 13. The hovered row looks like the open row: the chosen fill with a gold edge. Unavailable rows are muted, art at 45 %, with the reason in coral on one line beneath. Submenus open 4 px to the right, their first row level with the parent (left only at the screen edge).
- **Slots:** silver edges at rest, a 2 px gold ring when chosen, the count at the bottom right, a hand for what you hold, a red tint and red number when something is missing; 4 px apart in a grid.
- **Need bars:** 6 high, rounded, on the near-black track, with the exact number beside each.
- **Statuses:** timed statuses are round and the ring is the timer — a 2 px arc of the time left over a faint 1 px track, running down clockwise from 12 o'clock; lasting effects are square with a steady 2 px border.
- **Progress:** a smooth champagne fill on a dark track, 6 high, no tick marks; 112 wide over a working character.
- **Over the world:** text with a drop shadow only — names in Gelasio light gold, status in Figtree, changes in coral rising and fading over a second.
- **Special shine (reserved):** a 2 px champagne border that gleams in two bright spots on opposite sides. Only for rewards, awards, achievements and special items; no screen uses it yet.
- **Pieces drawn once:** the Have everything switch; the round quantity slider in primary gold; stat tiles 56 high, tinted green with a green edge when gear or a condition raises the stat (and, per Mike, red when it lowers it); the Weight bar in silver-green and a bag's Packing load bar in gold; map markers (24 round dark chips with a gold edge and dark-ink labels with a light halo), the selected-place pin and your portrait in a 48 gold ring; World Agent messages (yours on the chosen fill, its replies beside a round World avatar, proposed changes on a darker card waiting for review); the game menu's header with the seal in a 40 gold ring. `tokens.json` (`component`) has their exact values.

## The HUD

- **Top left:** a 284-wide HUD plate, 24 from the top and left edges: your 64 portrait (it opens Character), then each need's icon, bar and number, and your timed statuses and lasting effects beneath. Its frame will be the elaborate corner piece from the Higgsfield material study, which Mike reconciles with Gildmoss; the boards show the plain plate.
- **Top right:** the minimap fully in the corner — a 200 map in a 206 champagne rim, 24 from the right and top edges, with a North mark and zoom in/out buttons (round, 28, 4 apart) at its lower left. The place name sits under it in Gelasio.
- **Day-and-night dial:** a 72 round dial in the gap at the minimap's upper left — not a clock. Sunrise is on the left and sunset on the right; by day a small sun crosses the top half and by night a crescent moon crosses the bottom half, both clockwise. The face is shaded by daylight with soft fades. The left point is the world's dawn and the right its dusk, each half spread evenly over its own length, so the dial fits any world's hours. "Day 1 · Year 1" and the time sit centred beneath it; the day number changes at midnight. Year is an example value until a world defines years.
- **Hotbar:** no panel behind it — ten slots, then Speak, Act and Combat mode (main's attack mode), then Character, Journal, Crafting, Build and the game menu, with thin gold metal dividers between the groups. The game-menu button is the Open Legend campfire seal in a champagne rim and opens the game menu, as Esc does. 986 wide, centred, 24 above the bottom edge; the Say and Act bars share its edges.
- **Events quick view:** a button at the bottom left, level with the hotbar, opens a quick view of what you perceived — speech, actions and notable observations, newest at the bottom. While open it replaces the button and has its own minimize button.
- **Narrator:** a caption at the top centre, like a film subtitle: the line in Gelasio italic on dark glass, up to three lines, with a thin gold timer line beneath that shortens toward the centre. The X appears only on hover. The line appears word by word, holds, then fades; with reduced motion it simply appears and disappears.

## Screens

The production package's renders show every composition: the screen at rest with a status tooltip; Character · Condition; Character · Attributes; the right-click menu and the Say bar; Mara Reed and the Act bar; Crafting; Journal · Events; the Map (the starting land hand-drawn on parchment); trading with Mara Reed; the World Agent; and the component sheet, including the night screen.

## Night

At dusk the lantern light at the top of every surface turns amber and wider, and the primary button, chosen tab, open and hovered rows, chosen hotbar tiles, the selected slot and focused fields gain a soft, wide firelight glow. By day there is no glow. The minimap picture dims with the night light; its rim, North mark, the dial and the text keep their colours. `tokens.json` (`night`) has the exact values.

## Integrating it

Integration is a separate, not yet authorized stage. It follows the [interface production route](../../../../../docs/production-workflows/scenes-and-interfaces.md#art-directed-working-interfaces), the [UI rules](../../../../../.agents/rules/ui-ux.md) and the [current component owners](../README.md):

1. Add Gildmoss as a theme of its own beside Wilderness, fantasy and sci-fi: its values join the shared semantic roles in [`tokens/tokens.json`](../tokens/tokens.json), selected with `data-theme="gildmoss"`, with night as a lighting state of that theme. Players can switch themes. Components keep referencing roles, never Gildmoss values directly.
2. Publish the package's icon catalog, metal gradients, fonts and art to runtime storage through the asset workflow, replacing artwork under existing keys and adding the new keys.
3. Restyle the existing React/React Aria components; keep their behaviour, accessible names, focus handling and authority boundaries.
4. Move the HUD pieces to the Gildmoss layout, drive the night look and the dial from the installed world's daylight, dawn and dusk, change the day number at midnight, and give main's attack-mode controls the Gildmoss treatment.
5. Verify in the running game with the [UI verification matrix](../../../../../docs/ui-ux/verification.md).

The design also needs behavior the game lacks today. [Character and map additions](../../../../../docs/projects/character-and-map-additions-feature-spec.md) covers Spirit, stats, equipment slots, the map and minimap, markers and nicknames. Integration itself adds the lock-perspective toggle, game-written observations in a person's window, several World Agent conversations, and negotiating in the trade window with more than one kind of item per side.

Known limits: the parchment map is 1536 × 1024 and is enlarged 1.44× on 2× displays; the screens' world backdrops and the picture inside the minimap are mockup stand-ins; item art covers what the screens show.

Decided for integration ([plan decision 20](../../../../../docs/projects/interface-art-direction-overhaul-plan.md#decisions)): only the world owner and the admins they authorize can pause a world, and the composer has Say and Act with no "Try" mode.
