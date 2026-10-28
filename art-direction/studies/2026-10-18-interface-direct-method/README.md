# Interface overhaul — direct method study and Gildmoss production

Study ID `2026-10-18-interface-direct-method`. Standard flow (the "direct AI method"): Claude Design for composition and critique, the OpenAI Images API for artwork, and an agent coordinating. Recorded 2026-10-26.

**State:** study complete. **Gildmoss** (row Q) was owner-selected on 2026-10-25 and made final on 2026-10-26. Its production package is exported, technically checked for the named consumer and archived with verified retrieval. It is **not selected** for the game's runtime release and **not integrated**. The [project plan](../../../docs/projects/interface-art-direction-overhaul-plan.md) owns status, decisions and remaining work; the [Gildmoss design system](../../../apps/client/src/design-system/gildmoss/README.md) is the accepted specification; Mike's preferences are in the [art-direction decisions](../../decisions.md#interface-look-and-feel--accepted-october-26-2026).

## Brief

- **Purpose:** Mike's request for a complete overhaul of the running game's interface — research, art direction, artwork, design system, implementation, review — through the direct method, compared later with an independent Higgsfield method on `codex/ui-overhaul-higgsfield-2026-10-18`. Neither method copies the other's designs, artwork or implementation.
- **Goal:** an original identity that makes people, possessions, discoveries and consequential choices compelling while the world stays the visual focus. Restyle and re-compose existing surfaces without changing actions, permissions, knowledge, recovery or world rules.
- **Profiles and finish:** UI style, then UI system; study through round 8n, with round 8o completing the icon family; **production** on 2026-10-26 ("Make this entire UI asset set production-ready … Stop before integrating it into the game").
- **Viewing conditions:** 1920 × 1080 at 100 % interface scale over a real capture of the starting world by day and at night.
- **Shared inputs:** the frozen comparison inputs (reference board of 80 screenshots from 38 games, captures of the original interface, sample content, surface/state map, evaluation tasks), frozen 2026-10-19 20:49:51 UTC. Third-party screenshots are reference-only.
- **Selection authority:** Mike. **Budget:** an $80 cap for image generation, of which **$1.903922** was spent (36 requests to `gpt-image-2.5-sunburst-2026-09-08`); Claude Design ran under Mike's claude.ai plan (weekly usage reached about 81 %); the only other cost is ordinary S3 storage and transfer for the archives below (about 1.4 GB stored), not separately measured.

## Candidates

| ID / name                      | Round      | Direction                                                                                                      | Selection                                       |
| ------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| A Waxed Canvas                 | 1–2        | Closest to the current flat dark panels; one primary decision per screen, tabbed panel titles                  | Unselected                                      |
| B Field Herbarium              | 1–2        | Reading-first ink-and-wash illustration on paper surfaces                                                      | Finalist; rejected — "a 2000s website"          |
| C Ember Night                  | 1–2        | A dark, firelit HUD in the world's own pixel craft                                                             | Finalist; Mike continued from it                |
| D Hearthlight                  | 3          | C painted (lacquer, brush strokes, painted gold, orb launchers)                                                | Rejected — "an old isometric game"              |
| E Lashing · F Flint · G Riverglass | 4      | Modern versions: cord lashings with Newsreader; 45° chamfers and ember brackets; a firelight top edge         | E chosen                                        |
| H Flaxlight                    | 5          | Lashing, cozy, with every layout rethought                                                                     | Kept as the base for variations                 |
| I Emberwood · J Moonford · K Dawnstitch | 6 | Walnut and amber; moonlit teal; light linen                                                                  | Parts kept (dark green, glow, menus)            |
| L Wealdcrest · M Mistfen · N Inkfern · O Lanternmoss | 7 | Wealdcrest menus and buttons; Mistfen metal gold and silver; ink and brush; lantern light and Gelasio | Parts combined into round 8                     |
| P Brassbrook · Q Gildmoss · R Bronzereach | 8 | Brass; pale champagne gold with Gelasio; bronze with gleaming rims                                          | **Q Gildmoss owner-selected (2026-10-25)**      |
| Q Gildmoss, rounds 8b–8o       | 8b–8o      | Warmer gold, borderless glass, night firelight, Cobalt pigments, narrator caption, Events quick view, corner minimap, day-and-night dial; round 8o completed the icon family | **Final (2026-10-26); production source is canvas version 41 (`1792999021-8ee1`)** |

The full per-round record — requests, Claude Design's replies with every value, renders, measurements, review pages and Mike's words — is in the study bundle below (`status/STATUS.md`, `design/owner-preferences.md`, `design/round-*`, `design/*-review/`).

## Production package

**Consumer (proposed until integration):** the game's web client design system — CSS custom properties, the existing semantic icon catalog (`apps/client/src/design-system/icons/catalog.ts`), self-hosted WOFF2 fonts and raster art served by the asset system. Frames, glass, lantern light, buttons, bars, statuses, the minimap rim and the dial face are native CSS/SVG drawing, so no image slicing is required.

**Members:** tokens and a generated stylesheet; the boards' reference stylesheet with the reserved special shine; a 117-key icon catalog in the client's existing format (the 108-icon family, three example status glyphs and six current keys that reuse a glyph) with its finishes stylesheet, shared metal gradients, a merge plan for the current catalog and standalone one-colour, gold, silver and ivory SVGs (plus ink and green where the boards use them); HUD glyphs (the dial's sun, moon and sunrise and sunset markers, and your minimap marker); status-frame references; Gelasio and Figtree variable WOFF2 with OFL licenses; the campfire seal (master and 28/32 px at 1×–3×); the parchment map of the starting land; the item, structure and sample-character art the screens show; the final Claude Design sources with every picture they use; board renders; the specimen and its captures; and the build recipes. Every file is in the package's `inventory.json` with role, owner, size and SHA-256.

**Construction:** icons were extracted from the component sheet's own vector paths (each icon's gold and silver geometry checked identical; the converter refuses any style it cannot convert exactly); status frames rebuilt from the sheet's construction; fonts copied unchanged from pinned `@fontsource-variable/gelasio` and `@fontsource-variable/figtree` 5.3.0; the seal and full-body figure resized with premultiplied-alpha Lanczos; stylesheets formatted with the repository's Prettier 3.6.2. Item sprites keep their native pixels and are drawn at whole-number scales. Generation provenance (model, settings, prompts, exact input and output hashes) is kept without billing receipts; the receipts stay in the private study bundle.

**Checks** (package revision `2026-10-26.1`): all 496 SVGs parse; the catalog's 117 keys match the consumer's shape; a specimen page reading only the exports loaded all 89 pictures and every other file with no missing file, broken image or console error at 1× and 2× in headless Chrome, and its captures were inspected at full size; Gelasio regular and italic and Figtree loaded; pixel sprites contain only fully clear or fully solid pixels, and the resized seal keeps its gold colour to its edges; need-bar colours measure 3.6, 6.8, 4.7 and 3.4 : 1 against their near-black track; the special shine shows its two glints; every inventory hash matches its file.

**Critique and fixes:** an independent critique of the first build found problems that were all fixed before publication: spacing variables whose names collided; sunrise and sunset markers with a zero-height box, the wrong shading and no shadow; three icons from the screens and the green finish missing from the catalog; one-off components without a specification; the icons and the stylesheet naming the engraved-mark colour differently, with no finishes stylesheet; no plan for the current catalog keys Gildmoss does not draw; gaps in the inventory (captures, owners, the campfire's role, the picture map); and a specimen grid that overflowed and showed the wrong Events icons. Round 8o then drew 24 more icons so that every key of the current catalog has a recorded outcome: 38 are replaced by Gildmoss icons, 6 reuse an existing Gildmoss glyph, 8 camera controls retire with the camera toolbar the design removes, 8 that nothing uses retire, and 12 world things (resources, animals, a person) keep their current artwork until the world's own sprites replace them.

**Limits:** viewer and file checks only — the game's focus, hit testing, responsive layout, themes and performance belong to integration. The picture behind each screen and inside the minimap are mockup stand-ins. Item art covers what the screens show; the bundled world defines more items. Status names in the designs are examples. The parchment map is 1536 × 1024 and fills 1104 × 736 on the Map screen, so 2× displays enlarge it 1.44×; a sharper map needs a larger generation. The top-left HUD here is the boards' plate; an elaborate corner piece is being chosen separately in the Higgsfield material study. Gameplay drawn but not built (Spirit, stats, extra slots, map markers, nicknames) awaits the decisions in the project plan.

## Archive

All payloads are outside Git in private S3 storage of the OpenLegend project, recorded in the asset authority database named by the main checkout (`openlegend_dev_20261016_repaired`). The exact indexes beside this record let any authenticated checkout fetch and verify the files.

| Collection                                   | Boundary / access      | Files | Bytes | Manifest SHA-256 | Index |
| -------------------------------------------- | ---------------------- | ----- | ----- | ---------------- | ----- |
| Gildmoss production package `2026-10-26.1`   | art-library / private  | 654 | 72,686,592 | `0779d508d63a5d6d572e945f886401cc4e6b723e647df534ee37a75ae0874b75` | [production.index.json](production.index.json) |
| Direct-method study material, all rounds     | art-studies / private  | 2,017 | 984,328,909 | `f2a930ffb7497a59584d3d6ab287b1442a0002dd256e7df1b08b2089dcbb60ae` | [study.index.json](study.index.json) |
| Shared comparison inputs (frozen)            | art-studies / private  | 446 | 371,120,966 | `06800d5b2a7e5e552e2d31b9b0cc3bc5f10e28fb369540e8a7f05b3381c82a4c` | [shared-inputs.index.json](shared-inputs.index.json) |

Each collection was downloaded back after publication and every file's SHA-256 matched. The study material is stored as three parts, each small enough for one record in the asset database, plus a parent revision that pins all three exactly; its index lists every file under the parent. They are private: publishing any of them as a public study needs Mike's separate permission. The study bundle excludes the private world backups, which stay in their owner-only folder.

Claude Design canvas: <https://claude.ai/artifact/c5b4c0bd-a432-4cbb-842c-3f9aeb0bbc4f> (page "Round 8", row Q). Latest review page: <https://claude.ai/artifact/EeupKknqg2fSm2HMPQEPtc> (version 10). These links are Mike's private claude.ai pages, not the archive.

## Resume

Fetch an exact copy into a new folder from the repository root, with the OpenLegend AWS session signed in and `OPEN_LEGEND_DATABASE_URL` naming the asset authority database:

```sh
pnpm assets workspace --index art-direction/studies/2026-10-18-interface-direct-method/production.index.json --all --output /private/tmp/gildmoss-production
pnpm assets verify --index art-direction/studies/2026-10-18-interface-direct-method/study.index.json --all
```

The design system's [`assets.json`](../../../apps/client/src/design-system/gildmoss/assets.json) fetches only the 555 files integration uses: icons, HUD glyphs, status frames, fonts and art.

The package's `README.md` explains its folders and how each file is meant to be used; `recipes/` rebuilds it from the study bundle's saved canvas revision. The next stage is integration through the existing component owners, which needs Mike's explicit go-ahead.
