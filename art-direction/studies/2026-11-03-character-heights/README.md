# Character heights — the cast at their own heights

## State

Created, checked and archived privately: 35 models of nine people at heights read from their stories, every variation included, and a character lineup in the art study. Not owner-selected. Not integrated: in the game every person still stands on the world's single 1.75 m body.

## Brief

- **Request (Mike, November 3, 2026):** "read the characters' backstories. Did you make them all the same height? They shouldn't be. Make them true to their characters. Then put together a character study page for me so i can view them and any variations you have, and animations, and such."
- **Corrections (Mike, the same day):** "Orin is supposed to be Maer Fen": the proof run's fifth sheet shows Maer Fen, not the base world's Orin, so its four models are his. "Are you sure Sela Tern shouldn't be taller?": she was first set at 1.67 m and is now tall (below).
- **What was the same:** every person model was 1.85 m, the look's single adult height. The [people recipe](../../../scripts/prepare-human-study.py) scales each fitted person to 1.85 m, and the [proof run](../2026-10-31-character-sheet-proof/README.md) rigged all five sheets at 1.85 m. Only the Peacock Mercenary differed, at 2.035 m.
- **Subjects:** the base world's Ada, Mara Reed, Tavin Vale, Kest, Orin and Mike (the player's body); Sela Tern, Ser Jessa Cairn and Maer Fen from the [medieval-survival proposal](../../../docs/repertoires/worlds/medieval-survival.md); the mercenary as the tall reference. The padded-armor study is a body for armour, not a character, and is left out.
- **Settings:** character profile, study finish, simple path; existing models only, no generation and no spending.

## Heights

No backstory states a height. Each height below is read from what is written (age, work, the build their design notes and sheets show, and the age, muscle and weight the people recipe gives each person) and is an interpretation for Mike to review.

| Person            | Height  | Why                                                                                                                                                                         |
| ----------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Peacock Mercenary | 2.035 m | Unchanged: the tall size Mike settled ([mercenary record](../../../docs/maintainers/art/mercenary.md)).                                                                     |
| Tavin Vale        | 1.82 m  | A young, lean traveller who works river landings: the tallest of the ordinary cast.                                                                                         |
| Ser Jessa Cairn   | 1.77 m  | 29, a knight and tournament victor who fights on foot with spear and shield: tall and strong.                                                                               |
| Sela Tern         | 1.76 m  | 51, the Witch of Nine Landings: a celebrated river captain who poles her own boats and leads their crews, drawn broad and commanding on her sheet: tall and strong.         |
| Mike              | 1.75 m  | The player's body has no backstory, so it keeps the world's own person height.                                                                                              |
| Kest              | 1.74 m  | Middle-aged, with the heaviest and most muscular build in the cast; a caravan hand with a shield: broad rather than tall.                                                   |
| Orin              | 1.69 m  | The youngest and lightest of the cast, a wiry archer.                                                                                                                       |
| Maer Fen          | 1.68 m  | 38, master of the Reed Knives. His [design notes](../../prompts/maer-fen-midjourney.md) make him compact and wiry, unlike the rangy Halven: below the cast's middle height. |
| Ada               | 1.63 m  | 24, an ordinary young woman raised near woodland.                                                                                                                           |
| Mara Reed         | 1.58 m  | A compact, middle-aged camp mender, shorter than Ada so the two no longer read as one person at play distance (proof run).                                                  |

## Variations

Each person's subject in the art study compares every version at that person's height:

- **Sheet model** (Sela, Jessa, Ada, Mara, Maer Fen): the proof run's rigged model from Mike's sheet, with the cast's eight clips from the [character motion study](../2026-10-31-character-motion/README.md). It is the one shown in the lineup.
- **Field tunic, work vest, travel coat** (Ada, Mara, Orin, Kest, Mike, Tavin): the prepared library outfits with the same eight clips. For Kest, Mike, Orin and Tavin the lineup shows the outfit the game uses.
- **Meshy candidate, Tripo candidate, Meshy from a cropped sheet**: the proof run's unrigged candidates, with its notes on each.

## Construction and sources

- **Method:** every source stands 1.85 m. Multiplying each file's single scene root by height ÷ 1.85 resizes the body, skeleton and every clip exactly, with the feet kept at 0; textures, weights and clip lengths are unchanged, and stride ground speeds scale by the same factor. The recipe is `work/recipes/scale-heights.py` with `plan.json`; `write-catalog.py` writes the catalog from the `report` measurements.
- **Sources:** the library people's published motion files (motion study `export/f07`–`f27`, the same bytes as the development runtime and public studies files), the proof run's five eight-clip files (motion study `export/f01`–`f06`), and the proof run's normalized candidates `m01`–`m12`. Their files named `orin` are Maer Fen's.
- **Catalog:** [`study-characters/catalog.json`](../../../apps/client/src/props/art-study/study-characters/catalog.json), 35 files plus the mercenary's three study files. Catalog folders named `study-*` appear in the art study as current subjects and never enter the game's runtime catalogs.

## Review and remaining gaps

- `report` measured every output: heights within 1.5 mm of the targets, feet at 0, all eight clips on each rigged model.
- In the art study, **Character lineup · own heights** shows the ten people tallest first, Walk plays on the nine rigged ones, and each **Characters ·** subject compares all of a person's versions (Mara Reed has seven). This was checked in the in-app browser with a local server serving the staged files before publication, and the lineup was opened again after each publication with the view server under Resume.
- **Fixed on the way:** the study page refused more than four models at once from a private collection, because its download queue counted only public files; it now counts every file in the selected release.
- **Limits:** one uniform scale keeps each body's proportions, so a short person keeps the 1.85 m figure's proportions; the mercenary's study files carry no clips (his motion loads separately); and in the game presentation stretches every person vertically to the world's single 1.75 m body ([art direction](../../decisions.md#how-the-current-look-changes-production)), so these heights show only in the study until each person has their own body height.

## Resume

- **Working folder:** `~/Documents/ChatGPT/OpenLegend-art/2026-11-03-character-heights/`: `study/` (exports, reports, recipes, and `work/tools/view-server.config.mts`, the view server below), `publish/` (the published release, laid out at its manifest paths), `manifest.json`, `prepare.json`, `view.index.json`, and `superseded-003b0d7d/` (the first publication's manifest and indexes).
- **Private archive:** a `study` revision in `art-studies` / `curated-private`, owner `collection/openlegend-curated`, asset `character-heights-2026-11-03`, evidence `owner-requested-character-heights-2026-11-03` (Mike's request above), revision `sha256-7bdcf2abfb78fb7297806b56ef9f0e67d5d1eab545c46ad70967c5f5b27bfe60`, manifest SHA-256 `4a4e3f22e72f7a4228d3fbf7f5848d19bd7a8d03c53defcb31b7f045ec2376a3`, operation `character-heights-2026-11-03-maer-fen`; 111 files, 144,851,015 bytes, verified; exact list in [archive.index.json](archive.index.json). It includes the view server. The mercenary's three study files stay in the public studies release and are not copied.
  - **Fetch** with the main checkout's asset authority and the AWS sign-in: `pnpm assets workspace --index art-direction/studies/2026-11-03-character-heights/archive.index.json --all --output <new folder>`.
  - It supersedes revision `sha256-003b0d7d0ea5517e39b332cff437f2af5336e8c9d8e56a3449ac262d87ffd75b` (operation `character-heights-2026-11-03-archive`, 110 files), which named Maer Fen's models Orin and set Sela at 1.67 m; that revision stays in storage.
  - An earlier prepared revision, `sha256-e8142812af84175c095a1e7cbb7cfcdfab61d7afd4d437d596b9fed2f6cccb53`, depended on the public studies release; its rights were approved, but publication refused it because that release is approved only for public studies. It holds no files.
- **View:** `pnpm assets serve` serves one release, and this archive alone lacks the page's fonts and the mercenary, so use the working folder's view server. Write its index from the checkout with `jq -s '{release: .[1].release, files: (.[0].files + .[1].files)}' assets/locks/studies.json art-direction/studies/2026-11-03-character-heights/archive.index.json > <working folder>/view.index.json` (with the studies lock at revision `sha256-b789ebfd…`), run `node_modules/.bin/vite --config <working folder>/study/work/tools/view-server.config.mts`, and open `http://localhost:5199/art-study.html#subject=characters`. It answers the archive's files from `publish/` and passes the public studies files through from the public asset host, which refuses cross-origin page reads; the page checks every hash. Every other subject loads too.
- **Open decisions:** Mike's review of the heights; whether play uses them (each person's own body height in the world definitions, which also moves their eye and ear heights); whether the study joins the public hosted studies.
