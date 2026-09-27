# G40–G60 coverage and correction audit

**In progress — September 26, 2026.** Requested after the range-close report. Baseline: `aee03ef430a915c39a6c1ccc640ce26262366767`, branch `docs/game-inspiration-games-40-60`. This is evidence for the [research progress ledger](../research-progress.md), not a competing task tracker or an OpenLegend implementation specification. [Requirements](../research-requirements.md) own R01–R14; [roster](../research-roster.md) owns the twenty-one subjects.

## Audit standard and limits

A completed label, filename, section heading or requirement map is not proof of substantive coverage. Inspect the mechanics, examples, production, commercial definitions, actual review summaries and source/access notes. Separate missing research from legitimately inaccessible evidence. Recheck material disputed/version-sensitive claims against external sources; do not describe selective source verification as a new playtest or an exhaustive reread of every source.

The previous range verification explicitly said it was not a fresh factual re-audit of G40–G58. This audit addresses that limitation. Previous completion commits and source qualifications remain historical evidence, not automatic passes. Findings below are preliminary until all twenty-one dossiers and relevant preservation/navigation owners have been inspected. Recording a correction here does not mean its canonical dossier has already been edited.

## Preliminary findings

### G40 — AI Dungeon

The dossier has substantive accounts of the action/editor vocabulary; scenario versus adventure ownership; plot/context, story cards, memory and scripting; multiplayer and creator publishing; absence of a universal native RPG state; monetization; presentation; production and provider changes; five written critical/player accounts; historical Steam samples; current player testimony; and constructed versus attributed interactions. This is not merely a table of R01–R14 headings.

Two documentary corrections are already necessary:

1. Section 16 still calls the already-written 2021 privacy/filter history “remaining checkpoint work,” although section 20 supplies that history. The sentence should refer to section 20 instead of implying unfinished work.
2. Section 29 refers to a deferred final integration gate **P04**, but the current canonical progress ledger does not define that ID and the library README now provides G40–G60 dossier routes. Preserve the still-open packet-wide reconciliation, but remove the orphaned gate reference and distinguish it from completed range navigation.

Targeted primary verification on September 26 confirmed that the membership page actually gives the cited standard prices and baseline context tiers. The model-specific page also shows that these are not universal per-model entitlements: Muse and DeepSeek V4 Flash have different allowances. The existing caveat is therefore important, not an error to remove. The model page additionally describes Optimized Context interactions with scripting; this deserves an explicit compatibility note rather than treating context tuning and scripting as independent capabilities.

Sources actually reopened in this audit: [Memberships & Benefits](https://help.aidungeon.com/memberships-benefits), [AI model differences](https://help.aidungeon.com/ai-model-differences), [How to play](https://help.aidungeon.com/faq/how-to-play), [Story Cards](https://help.aidungeon.com/faq/story-cards). These checks do not constitute fresh model-quality measurements.

### G41 — Palworld

The dossier covers capture, work, needs, base production, breeding, technology, traversal, combat, multiplayer, current-versus-launch reception and dated commercial definitions. However, the following require correction or deeper evidence:

- **R14:** PAL-C ends at `/announcements/detail/` without an announcement identifier. That is not a stable citation to the specific 1.0 changelog supporting many detailed claims. Locale variation does not explain the missing identifier. Recover the actual announcement or a named, dated mirror and identify which body was inspected.
- **R02/R06/R08:** fishing is listed but not explained; PvP/trading remain vague; the story/faction sections lack named human protagonists, bosses or faction interactions and the causal mission structure. Compare the preserved chapter/mechanics owner before closing these gaps.
- **R12:** the fifth review summary is too generic. The newly reopened Andrea Shearon review gives much more useful evidence: she praises understandable work-suitability icons and role-specific breeding, dislikes restrictive oversized building pieces and tonal violence, values the paint/alignment tools, and describes using Jetragon against Panthalus after repeated failures. It also describes Surgery Table passive implants, an omitted capability worth checking against current official documentation. This is the reviewer's experience, not a researcher playtest. [PC Gamer, August 1, 2026](https://www.pcgamer.com/games/survival-crafting/palworld-review/).
- **R09/R14:** section 20's later GDC/human-cost statement points to the January 2024 producer interview. Recover the intended preserved GDC source instead of treating that citation as support for a later account.
- **Verification lead, not yet a confirmed error:** case B assumes furnace “fuel.” Verify the actual material/Kindling/electricity requirements before rewriting that example.

The fresh PC Gamer body confirms the July 10, 2026 1.0 date; it would be wrong to reject that edition merely from older model knowledge.

### G42 — Balatro

There is substantial coverage of scoring, modifier layers, shop economy, route skipping, counters, meta progression, production, distribution and five written reviews. Two concrete factual corrections were identified:

- **R02/R03, section 7:** Brainstorm copies the **leftmost Joker's ability when that target is compatible**. It does not search for the leftmost compatible Joker while skipping an incompatible first slot. The current wording gives the wrong selector semantics. [Game-card text and specialist reference](https://balatrogame.fandom.com/wiki/Brainstorm).
- **R01/R09, section 21:** the Steam listing has Windows and macOS requirements, not a native Linux release. Linux/Steam Deck compatibility is not evidence that Windows, macOS and Linux all launched together. Separate the original launch from later ports and compatibility. [Steam product record, inspected September 26](https://store.steampowered.com/app/2379780/Balatro/).

**R12:** the Nintendo Life byline/date are correct, but its summary substitutes a distribution editor's note for substantive criticism. Reynolds specifically praises input alternatives, labelled layout, handheld play and accessible combinations; his conclusion gives no substantive design objection, which should be stated rather than invented. [Original review, March 1, 2024](https://www.nintendolife.com/reviews/switch-eshop/balatro).

Section 25's generalized Steam sentiment has no traceable sample citation. The audit actually opened the English **Most Helpful (All Time)** positive/general and negative surfaces. Useful positive accounts include Quzga (March 10, 2024; interest and escalating run investment), jonche10 (September 2, 2024; changing understanding of decks/stakes/economy) and Zarok (November 24, 2024; initial poker aversion versus accessible score/shop play). The negative surface includes a December 27, 2025 Completionist++ account objecting to all-or-nothing blind losses, limited immediate recovery after a mistake and perceived strategy convergence. These are contrasting self-selected accounts, not proof of mathematical balance or prevalence. Preserve dates and distinguish displayed present hours from hours at publication. [Helpful surface](https://steamcommunity.com/app/2379780/reviews/?browsefilter=toprated&l=english) · [Negative surface](https://steamcommunity.com/app/2379780/negativereviews/?browsefilter=toprated&l=english).

### G43 — Slay the Spire

The full dossier was inspected. Deck construction, removal, rewards, routes, HP, intent, relic interactions, economy, modes, telemetry/development, five review summaries and contrasting helpful Steam accounts are substantive. Do not mark the entire review category absent merely because one source is a retrospective: the January 23, 2019 Destructoid body actually contains extended evaluative discussion of intent, deck size, tradeoffs and modes, and links the earlier review. [Reopened original](https://www.destructoid.com/slay-the-spire-has-left-early-access-and-its-still-one-of-the-best-games-ive-played-in-years/).

**Coverage leads requiring the linked mechanics-owner check:** the Defect's channel/passive/Evoke/Focus relationships and Watcher's stance/energy transitions are mostly named rather than operationally explained; the three keys are mentioned without their distinct costs. Those are major character/endgame systems, not a demand for every card statistic. The narrative account also needs to distinguish sparse authored framing from merely calling run progress a story. Section 28's “Rest/Smiting” is a typo for Rest/Smithing. No unverified current port or sequel rule should be introduced while fixing these.

### G44 — Vampire Survivors

The full dossier was inspected. Automatic targeting geometry, evolution dependencies, pickup pressure, meta progression, local/online ownership differences, presentation, engine migration and reviews are substantive. The content inventory nevertheless names Adventures, Arcana/Darkana and later modes without explaining several of their main operating rules. **R02/R04:** check Adventures' independent progression, Limit Break and Inverse/Endless modes, slot limits and ground-item exceptions against the preserved mechanics owner. **R01/R08:** the expansion section's “later packs/content” is not an exact inventory of the edition claimed at the top.

**R12/R14:** cited Steam routes are recent/default feeds, not a demonstrated top/helpful sample; check the legacy study before declaring the helpful-sampling requirement satisfied. **R14:** VS-B is a generic announcements index rather than the particular Bloodmoon release entry. Preserve the source limitation and obtain its exact date/identity rather than treating the index alone as reproducible evidence.

## Remaining audit scope

G45–G60 remain to be inspected. G40–G44 still need relevant legacy chapter/mechanics preservation and some targeted source checks before a final per-dimension verdict. The original packet's named Library files have been located, but locating them is not a preservation audit. The packet-provenance page explicitly does not certify line-by-line preservation. No new packet-wide certification is made here.
