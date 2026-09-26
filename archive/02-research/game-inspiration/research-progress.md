# Game-inspiration research progress

Read with the [canonical roster](research-roster.md) and [full requirements](research-requirements.md). The roster owns IDs and filenames; this ledger owns completion and resume state.

## Resume state

- **Branch / scope:** `docs/game-inspiration-games-40-60`, canonical G40–G60. Do not create another branch.
- **Last completed numbered subject:** **G55 — Pillars of Eternity II: Deadfire**, `6271fdfaae80c158acfce40141d69c5a9120643b`.
- **Active:** **G56 — Divinity: Original Sin**. Its target dossier and same-named `games/` chapter were absent when checked. Research the 2014 original and 2015 Enhanced Edition separately, especially dual protagonists, cooperative disagreement, surfaces, crafting, progression, companions, authoring and reception; do not import DOS2 mechanics.
- **Next:** G57, G58, G59, G60 in canonical order, one independent completed pass at a time.
- **Dragon Age family supplement:** [complete](dossiers/dragon-age-series.md), `1eaf76df27c6af52ecafb35f077eae986f0708e9`; includes Journeys, Legends/Remix, The Last Court, Heroes and Keep.
- **Commit cadence:** after each game or at least every five minutes. Substantive checkpoints remain explicitly incomplete until the full pass is reviewed and committed.
- **Evidence date:** September 26, 2026, America/New_York.

## Canonical G40–G60

| ID | Subject | State | Output / commit |
| --- | --- | --- | --- |
| G40 | AI Dungeon | Existing completed dossier | [Dossier](dossiers/ai-dungeon.md), present at `2e1c136` |
| G41 | Palworld | Existing completed dossier | [Dossier](dossiers/palworld.md), present at `2e1c136` |
| G42 | Balatro | Existing completed dossier | [Dossier](dossiers/balatro.md), present at `2e1c136` |
| G43 | Slay the Spire | Existing completed dossier | [Dossier](dossiers/slay-the-spire.md), present at `2e1c136` |
| G44 | Vampire Survivors | Existing completed dossier | [Dossier](dossiers/vampire-survivors.md), present at `2e1c136` |
| G45 | Against the Storm | Existing completed dossier | [Dossier](dossiers/against-the-storm.md), present at `2e1c136` |
| G46 | Core Keeper | Existing completed dossier | [Dossier](dossiers/core-keeper.md), present at `2e1c136` |
| G47 | PEAK | Existing completed dossier | [Dossier](dossiers/peak.md), present at `2e1c136` |
| G48 | RuneScape / RS3 | Existing completed dossier | [Dossier](dossiers/runescape.md), `684145c` |
| G49 | Old School RuneScape | Existing completed dossier | [Dossier](dossiers/old-school-runescape.md), `1a5ac92` |
| G50 | RuneScape: Dragonwilds | Existing completed dossier | [Dossier](dossiers/runescape-dragonwilds.md), `43ab792` |
| G51 | Dragon Age: Origins | Committed | [Dossier](dossiers/dragon-age-origins.md), `5e333da` |
| G52 | Dragon Age II | Committed | [Dossier](dossiers/dragon-age-ii.md), `345c773` |
| G53 | Dragon Age: Inquisition | Committed | [Dossier](dossiers/dragon-age-inquisition.md), `66c0a61` |
| G54 | Dragon Age: The Veilguard | Committed | [Dossier](dossiers/dragon-age-the-veilguard.md), `b91dcc2` |
| G55 | Pillars of Eternity II: Deadfire | Committed | [Dossier](dossiers/pillars-of-eternity-ii-deadfire.md), `6271fdf`; checkpoint `1fd2a4a` incorporated |
| G56 | Divinity: Original Sin | In progress | Target `dossiers/divinity-original-sin.md` |
| G57 | Divinity: Original Sin II | Not started | Target `dossiers/divinity-original-sin-ii.md` |
| G58 | Pathfinder: Kingmaker | Not started | Target `dossiers/pathfinder-kingmaker.md` |
| G59 | Pathfinder: Wrath of the Righteous | Not started | Target `dossiers/pathfinder-wrath-of-the-righteous.md` |
| G60 | Fire Emblem: The Blazing Blade | Not started | Target `dossiers/fire-emblem-the-blazing-blade.md` |

## Numbering reconciliation and preservation

The incoming ledger used a different ordering for G40–G50 and G55–G60. The canonical roster contains **130 subjects**. The G40–G47 dossier headers were checked at baseline `2e1c136c0caa08f2529cdc0069d2571a342e0c26bc`; this confirms their existing completed-pass labels, not a fresh factual re-audit of all their research. Previously written Spore, No Man's Sky, Dreams, Project Spark, Worlds Adrift, EverQuest Next, Ultima Online and Among Us remain intact under their actual canonical IDs.

The corrected continuation is Inquisition → Veilguard → Deadfire → Original Sin → Original Sin II → Kingmaker → Wrath → The Blazing Blade. Pillars I, Disco Elysium, Crusader Kings III, Skyrim and The Witcher 3 are not substitutes for this range. The superseded ledger is preserved in Git history and the [fork baseline](references/games-40-60-fork-baseline.md).

G53 preserves eighteen mechanics, ten cases, three expansion analyses, five inherited independent critic assessments and eight video routes. G54 supplies twelve mechanic analyses, nine causal cases, five newly read critics and six routes. Both explicitly document inaccessible helpful Steam review bodies rather than fabricating samples. G55 includes the complete mechanics/party/ship/faction inventory, ten causal cases, three independently researched expansions, five full independent reviews, an **actually inspected helpful Steam sample**, negative alternative testimony, primary development records and defined commercial evidence. Its 2019 mode is not conflated with the first Pillars game's 2026 update.

Do not claim gameplay, watched footage, authenticated service tests, a local checkout, runtime/build tests or repository-wide link checks that did not occur. Keep every prior chapter, mechanics study, source qualification and packet-provenance owner. A completed G40–G60 branch is not a completed 130-subject roster or a passed packet-wide reconciliation. Each new dossier must map R01–R14 and distinguish sourced observations, interpretations and proposed adaptations.

<details>
<summary>Earlier committed research history, preserved by title</summary>

The fork audit's 19 complete, 7 partial and 34 unstarted totals are historical, not current. Spore (`cbbbefa`) preserves five stages, creation/sharing, nineteen worked systems and twelve combinations. No Man's Sky (`c56b5d0`) distinguishes launch/recovery with twenty-two mechanics and twelve combinations. Dreams (`512b544`), Project Spark (`de4c1ee`), Worlds Adrift (`d3c9cbd`) and EverQuest Next (`6d0c5cd`) retain their source, closure and portability qualifications.

Ultima Online (`d3e2e0a`) includes virtual ecology and player-pressure failure. RuneScape (`684145c`) and OSRS (`1a5ac92`) are independent economy/rules/development studies; Dragonwilds (`43ab792`) retains its researched version boundary. Among Us (`0930511`) contains seventeen mechanics, twelve interactions, eighteen reception patterns, ten videos and the meeting/autonomy distinction.

Origins (`5e333da`) contains eighteen mechanics, twelve interactions and sixteen reception patterns; Dragon Age II (`345c773`) contains eighteen mechanics, twelve interactions, eighteen reception patterns and ten video routes with its dated Steam-access qualification. All source-game observations, proposed adaptations, prior videos, named examples and evidence limitations remain in those dossiers.

</details>
