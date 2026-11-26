# Open Legend title motion atlas

**State:** 48 candidates created and checked in the standalone browser gallery; native drawing source preserved in this study. No individual treatment is owner-selected or integrated into the game.

Study ID: `2026-11-26-title-motion`. Preservation date: November 26, 2026 (America/New_York).

## Brief and decisions

Explore how the **OPEN LEGEND** title could feel alive on a game menu. Mike requested an initially restrained collection inspired by the flickering DREDGE menu, then visible mist that reveals and hides the letters, and finally a much broader winter, dark-fantasy and high-fantasy exploration: “go broad and deep and really go nuts with it.” Game of Thrones and The Lord of the Rings were mood references; no franchise artwork, typefaces or logos are included.

The original twelve remain intact, including the revised turbulent passing mist. The expansion adds 36 alternatives with frost growth, displaced shards, flowing metal, spectral silhouettes, living plants, portals, lightning and celestial light. These are exploratory departures requested for this comparison, not changes to the [accepted art direction](../../decisions.md#current-direction-at-a-glance).

Mike liked the earlier collection and requested these additional directions. Preservation of the expanded set does not select a production treatment. Georgia/system serif typography is a browser-study choice, not a proposed replacement for the game's production typography.

## Open the gallery

[Hosted convenience preview](https://open-legend-title-effects-mike.cladcarol8.chatgpt.site/) — owner-private and may require ChatGPT sign-in. That URL can change as the study evolves; the source at a specific Git commit is the reproducible archive.

From the repository root, run:

```sh
node art-direction/studies/2026-11-26-title-motion/build.mjs
```

Open `art-direction/studies/2026-11-26-title-motion/dist/index.html` in a browser. No dependency installation, development server, game startup or network access is required. The build uses Node's standard library and resolves files relative to the script, so it also works from another working directory.

The build writes three files into the ignored `dist/` directory: the full gallery, its standalone HTML download, and the original twelve-effect collection. The earlier collection is preserved verbatim in [src/originals.html](src/originals.html) and copied during every build so the gallery's original-collection link works from a fresh checkout.

Use category filters, tap a preview to enlarge it, and use Previous/Next to browse the selected category. Stars save favorites in that browser. Play explicitly opts into animation when Reduce Motion is enabled; Pause and Replay remain available. Phone landscape orientation gives the enlarged preview more room.

## Candidates and source

| Gallery numbers | Family                                                    | Count | Source                                                                          |
| --------------- | --------------------------------------------------------- | ----: | ------------------------------------------------------------------------------- |
| 01–12           | Original light, mist, water, dust and inscription studies |    12 | [Original effects](src/original-effects.js), [styles](src/original-effects.css) |
| 13–20           | Winter                                                    |     8 | [Winter pack](src/winter-pack.js)                                               |
| 21–28           | Dark fantasy                                              |     8 | [Dark pack](src/dark-pack.js)                                                   |
| 29–32           | Royal metalwork                                           |     4 | [Dark pack](src/dark-pack.js)                                                   |
| 33–38           | High fantasy                                              |     6 | [Mythic pack](src/mythic-pack.js)                                               |
| 39–44           | Arcane spectacle                                          |     6 | [Mythic pack](src/mythic-pack.js)                                               |
| 45–48           | Celestial                                                 |     4 | [Winter pack](src/winter-pack.js)                                               |

The gallery shows each candidate's stable number, name, visible behavior and mood; the pack entries retain their stable IDs and loop durations. All 48 are preserved and unselected. Agent suggestions from the comparison were #16 Glacial Fracture, #21 The Hollow Choir, #30 Auric Descent, #34 Starwritten Oath, #35 Living Silver and #40 Portal Inversion; these are recommendations, not owner decisions.

[engine.js](src/engine.js) owns tracked title drawing, masks and deterministic particles. [gallery.js](src/gallery.js) owns filtering, playback, favorites, large previews and offscreen rendering. [gallery.css](src/gallery.css) and [shell.html](src/shell.html) own the study interface. New effects draw in a shared 1000 × 500 coordinate space. No external libraries, images, fonts, video, SVG payloads or generated geometry are embedded or fetched.

This is native drawing code under the [repository asset policy](../../../docs/asset-workflow.md#where-files-belong), not a bundle of media payloads. Contributions follow the repository's AGPL-3.0-only license. Hosting configuration, credentials, private reference uploads and browser favorites are excluded.

## Evidence and limits

The delivered gallery was manually exercised in Chrome before this import: all 48 previews rendered without reported effect exceptions; category filtering, enlarged Previous/Next navigation, pause, replay and favorites were checked. Layout was inspected at desktop size and in 390px and 320px browser frames. Those frames demonstrate responsive layout, not physical iPhone/Safari performance or assistive-technology qualification.

The repository package preserves the authored effect/interface sources byte-for-byte and reproduces the delivered gallery and original collection. Import checks cover JavaScript syntax, build output equality, complete candidate counts and relative output links. Browser checks are reused because the effects and interface are unchanged. Automated test suites were not run, in accordance with repository policy.

No paid generation service or additional asset purchase is required to build or use the study. There is no game-engine implementation or production-performance claim. A later selection would need a separately scoped implementation in the actual title menu; that is outside this preservation task.
