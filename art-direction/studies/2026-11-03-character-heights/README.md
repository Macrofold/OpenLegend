# Character heights — the cast at their own heights

## State

Created and checked: 35 models of eight people at heights read from their stories, every variation included, and a character lineup in the art study. Not yet archived: publication waits for the AWS sign-in. Not owner-selected. Not integrated: in the game every person still stands on the world's single 1.75 m body.

## Brief

- **Request (Mike, November 3, 2026):** "read the characters' backstories. Did you make them all the same height? They shouldn't be. Make them true to their characters. Then put together a character study page for me so i can view them and any variations you have, and animations, and such."
- **What was the same:** every person model was 1.85 m, the look's single adult height. The [people recipe](../../../scripts/prepare-human-study.py) scales each fitted person to 1.85 m, and the [proof run](../2026-10-31-character-sheet-proof/README.md) rigged all five sheets at 1.85 m. Only the Peacock Mercenary differed, at 2.035 m.
- **Subjects:** the base world's Ada, Mara Reed, Tavin Vale, Kest, Orin and Mike (the player's body); Sela Tern and Ser Jessa Cairn from the [medieval-survival proposal](../../../docs/repertoires/worlds/medieval-survival.md); the mercenary as the tall reference. The padded-armor study is a body for armour, not a character, and is left out.
- **Settings:** character profile, study finish, simple path; existing models only, no generation and no spending.

## Heights

No backstory states a height or build. Each height below is read from what is written (age, work, and the age, muscle and weight the people recipe gives each person) and is an interpretation for Mike to review.

| Person            | Height  | Why                                                                                                                         |
| ----------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| Peacock Mercenary | 2.035 m | Unchanged: the tall size Mike settled ([mercenary record](../../../docs/maintainers/art/mercenary.md)).                     |
| Tavin Vale        | 1.82 m  | A young, lean traveller who works river landings: the tallest of the ordinary cast.                                         |
| Ser Jessa Cairn   | 1.77 m  | 29, a knight and tournament victor who fights on foot with spear and shield: tall and strong.                               |
| Mike              | 1.75 m  | The player's body has no backstory, so it keeps the world's own person height.                                              |
| Kest              | 1.74 m  | Middle-aged, with the heaviest and most muscular build in the cast; a caravan hand with a shield: broad rather than tall.    |
| Orin              | 1.69 m  | The youngest and lightest of the cast, a wiry archer.                                                                       |
| Sela Tern         | 1.67 m  | 51, a river captain who poles her own boats: strong and of ordinary height.                                                 |
| Ada               | 1.63 m  | 24, an ordinary young woman raised near woodland.                                                                           |
| Mara Reed         | 1.58 m  | A compact, middle-aged camp mender, shorter than Ada so the two no longer read as one person at play distance (proof run).   |

## Variations

Each person's subject in the art study compares every version at that person's height:

- **Sheet model** (Sela, Jessa, Ada, Mara, Orin): the proof run's rigged model from Mike's sheet, with the cast's eight clips from the [character motion study](../2026-10-31-character-motion/README.md). It is the one shown in the lineup.
- **Field tunic, work vest, travel coat** (Ada, Mara, Orin, Kest, Mike, Tavin): the prepared library outfits with the same eight clips. For Kest, Mike and Tavin the lineup shows the outfit the game uses.
- **Meshy candidate, Tripo candidate, Meshy from a cropped sheet**: the proof run's unrigged candidates, with its notes on each.

## Construction and sources

- **Method:** every source stands 1.85 m. Multiplying each file's single scene root by height ÷ 1.85 resizes the body, skeleton and every clip exactly, with the feet kept at 0; textures, weights and clip lengths are unchanged, and stride ground speeds scale by the same factor. The recipe is `work/recipes/scale-heights.py` with `plan.json`; `write-catalog.py` writes the catalog from the `report` measurements.
- **Sources:** the library people's published motion files (motion study `export/f07`–`f27`, the same bytes as the development runtime and public studies files), the proof run's five eight-clip files (motion study `export/f01`–`f06`), and the proof run's normalized candidates `m01`–`m12`.
- **Catalog:** [`study-characters/catalog.json`](../../../apps/client/src/props/art-study/study-characters/catalog.json), 35 files plus the mercenary's three study files. Catalog folders named `study-*` appear in the art study as current subjects and never enter the game's runtime catalogs.

## Review and remaining gaps

- `report` measured every output: heights within 1.5 mm of the targets, feet at 0, all eight clips on each rigged model.
- In the art study, **Character lineup · own heights** shows the nine people tallest first, Walk plays on the eight rigged ones, and each **Characters ·** subject compares all of a person's versions (Mara Reed has seven). This was checked in the in-app browser with a local server serving the staged files, before publication.
- **Fixed on the way:** the study page refused more than four models at once from a private collection, because its download queue counted only public files; it now counts every file in the selected release.
- **Limits:** one uniform scale keeps each body's proportions, so a short person keeps the 1.85 m figure's proportions; the mercenary's study files carry no clips (his motion loads separately); and in the game presentation stretches every person vertically to the world's single 1.75 m body ([art direction](../../decisions.md#how-the-current-look-changes-production)), so these heights show only in the study until each person has their own body height.

## Resume

- **Working folder:** `~/Documents/ChatGPT/OpenLegend-art/2026-11-03-character-heights/`: `study/` (exports, reports, recipes), `publish/` (the staged release, laid out at its manifest paths), `manifest.json` and `prepare.json`.
- **Private archive, pending:** a `study` revision in `art-studies` / `curated-private`, owner `collection/openlegend-curated`, asset `character-heights-2026-11-03`, evidence `owner-requested-character-heights-2026-11-03` (Mike's request above), revision `sha256-3cf8474705d06ea342640168d8d4f136e2f56afc3b7b0e3a66b106eb144697f5`, manifest SHA-256 `bcf761e2870c86e6ad43d042d6239382dd75fcb37d093800477b91c26929e72a`; 113 files, 155,272,836 bytes; exact list in [archive.index.json](archive.index.json). Prepared; approval and publication wait for the AWS sign-in. With `F` the working folder:
  - `pnpm assets approve --manifest "$F/manifest.json" --boundary art-studies --domain curated-private --use private-study,source,offline,recovery --evidence owner-requested-character-heights-2026-11-03`
  - `pnpm assets publish --manifest "$F/manifest.json" --boundary art-studies --domain curated-private --operation character-heights-2026-11-03-private --source-root "$F/publish"`
- **View** after publication: `pnpm assets serve --page /art-study.html --index art-direction/studies/2026-11-03-character-heights/archive.index.json`, then choose **Character lineup · own heights** or a **Characters ·** subject. This index serves only this collection, so other subjects do not load in that session.
- **Open decisions:** Mike's review of the heights; whether play uses them (each person's own body height in the world definitions, which also moves their eye and ear heights); whether the study joins the public hosted studies.
