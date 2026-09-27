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

- **R02/R03, section 7:** Brainstorm copies the **leftmost Joker's ability when that target is compatible**. It does not search for the leftmost compatible Joker while skipping an incompatible first slot. The current wording gives the wrong selector semantics. [Game-card text and specialist reference](https://balatrogame.fandom.com/wiki/Brainstorm), accessible indexed text; full wiki retrieval failed.
- **R01/R09, section 21:** the Steam listing has Windows and macOS requirements, not a native Linux release. Linux/Steam Deck compatibility is not evidence that Windows, macOS and Linux all launched together. Separate the original launch from later ports and compatibility. [Steam product record, inspected September 26](https://store.steampowered.com/app/2379780/Balatro/).

**R12:** the Nintendo Life byline/date are correct, but its summary substitutes a distribution editor's note for substantive criticism. Reynolds specifically praises input alternatives, labelled layout, handheld play and accessible combinations; his conclusion gives no substantive design objection, which should be stated rather than invented. [Original review, March 1, 2024](https://www.nintendolife.com/reviews/switch-eshop/balatro).

Section 25's generalized Steam sentiment has no traceable sample citation. The audit actually opened the English **Most Helpful (All Time)** positive/general and negative surfaces. Useful positive accounts include Quzga (March 10, 2024; interest and escalating run investment), jonche10 (September 2, 2024; changing understanding of decks/stakes/economy) and Zarok (November 24, 2024; initial poker aversion versus accessible score/shop play). The negative surface includes a December 27, 2025 Completionist++ account objecting to all-or-nothing blind losses, limited immediate recovery after a mistake and perceived strategy convergence. These are contrasting self-selected accounts, not proof of mathematical balance or prevalence. Preserve dates and distinguish displayed present hours from hours at publication. [Helpful surface](https://steamcommunity.com/app/2379780/reviews/?browsefilter=toprated&l=english) · [Negative surface](https://steamcommunity.com/app/2379780/negativereviews/?browsefilter=toprated&l=english).

### G43 — Slay the Spire

The full dossier and linked deck-ecology study were inspected. Deck construction, removal, rewards, routes, HP, intent, relic interactions, economy, modes, telemetry/development, five review summaries and contrasting helpful Steam accounts are substantive. Do not mark the entire review category absent merely because one source is a retrospective: the January 23, 2019 Destructoid body actually contains extended evaluative discussion of intent, deck size, tradeoffs and modes, and links the earlier review. [Reopened original](https://www.destructoid.com/slay-the-spire-has-left-early-access-and-its-still-one-of-the-best-games-ive-played-in-years/).

**R02–R04 coverage gaps:** the Defect's channel/passive/Evoke/Focus relationships and Watcher's stance/energy transitions are mostly named rather than operationally explained; the three keys are mentioned without their distinct costs. The selective mechanics study does not supply those missing explanations. These are major character/endgame systems, not a demand for every card statistic. **R08:** add the sparse authored framing and its named actors rather than relying only on run-progress stories. Section 28's “Rest/Smiting” is a typo for Rest/Smithing. No unverified current port or sequel rule should be introduced while fixing these.

### G44 — Vampire Survivors

The full dossier and linked automation/co-op study were inspected. Automatic targeting geometry, evolution dependencies, pickup pressure, meta progression, local/online ownership differences, presentation, engine migration and reviews are substantive. The content inventory nevertheless names Adventures, Arcana/Darkana and later modes without explaining several of their main operating rules. **R02/R04:** explain Adventures' independent progression, Limit Break and Inverse/Endless modes, slot limits and ground-item exceptions. The selective study does not fill these gaps. **R01/R08:** the expansion section's “later packs/content” is not an exact inventory of the edition claimed at the top.

**R06:** the [official online FAQ](https://poncle.games/vs-online-faq), newly read, adds material group-access qualifications: crossplay is restricted to the documented platform ecosystems; participants need the relevant DLC; couch and online cannot be mixed; mobile was excluded at online launch. It also distinguishes host termination, client departure and inability to rejoin mid-run. The dossier should carry these constraints beside its positive online features rather than imply universal compatibility. The FAQ itself is dated evidence, not an eternal platform guarantee.

**R12/R14:** cited Steam routes are recent/default feeds, not a demonstrated top/helpful sample; the legacy study also lacks that sample. **R14:** VS-B is a generic announcements index rather than the particular Bloodmoon release entry. Obtain its exact date/identity rather than treating the index alone as reproducible evidence.

### G45 — Against the Storm

The full dossier and linked substitution/pressure study were inspected. Blueprints, bounded recipes, Resolve/Hostility, settlement cycles, Rainpunk, world-map direction and production redesigns have real explanatory depth. **R02–R04:** Cornerstones—the settlement-level perk/build choices—are not substantively explained. Trade-route/provisions/standing decisions and hearth development also need operational treatment rather than only lists of buildings and resources. The existing selective study is not a substitute for those major systems.

**R12:** five full independent reviews are not established. ATS-L points to a Metacritic index for Eurogamer; ATS-M and ATS-N explicitly qualify indexed access for Destructoid and Rock Paper Shotgun. Their short summaries mostly identify positive verdicts. The linked older study supplies one substantive PC Gamer account, not three missing full reviews. Retrieve genuine bodies or use other available independent reviews; an inaccessible original is not permission to count its aggregate blurb. The helpful-positive Steam sample also needs an actual identified surface/account instead of aggregate sentiment.

**R07 qualification:** the dossier's art/audio section is mostly visuals/UI, but the linked study does preserve dated sound-effect and Sealed Forest music evidence. Therefore do not incorrectly report audio as wholly absent. Deepen or route to the existing evidence.

The current official [Keepers of the Stone](https://store.steampowered.com/app/3075500/) and [Nightwatchers](https://store.steampowered.com/app/3725110/Against_the_Storm__Nightwatchers/) bodies were newly read. Both Coastal Grove and Ashen Thicket are in the currently advertised Keepers scope; do not reject the latter from launch-era memory. Separate that present package from its original launch inventory. The pages also provide much more concrete mechanics than the dossier: Cornerstone forging; resource-limited Black Market trade; and Fluffbeak care linking water/food/warmth to fertility. Generic announcement/news-feed citations for 1.10/1.11 and sales milestones should be replaced with the exact entries.

### G46 — Core Keeper

The full dossier was inspected. The base/expedition loop, mining infrastructure, cooking composition, authored scenes, lighting and production history are substantive. **R02–R04/R06:** several equally important systems remain category lists: actual magic/summoning resources, repair/upgrading, fishing operation, pet progression, standard versus hardcore death losses, merchant recruitment/trade and character-versus-world multiplayer progress. Compare the selective resource-circuits study before assigning final gaps; a mention of “recoverable death” does not explain what is retained and what must be recovered.

**R12:** the fifth review, TechRaptor, is explicitly an indexed route rather than demonstrated full-body reading; the extra Gamereactor note comes from an aggregate and does not solve that minimum. **Temporal correction:** a merely “September 2026” review cannot be labelled post-1.3 when the update date is September 21. Establish the review's exact date/version or leave its relationship to the patch unresolved.

The [GameGrin review](https://www.gamegrin.com/reviews/core-keeper-review/) was newly opened. Its January 27, 2026 dateline and discussion of Void & Voltage require a prerelease/updated-text qualification against the independently dated February 25 public launch, not an automatic claim that the release date is wrong. It explicitly says the reviewer received a high-level save for late-game content; retain this limitation when discussing endgame progression and difficulty. Do not adopt its casual “you and up to eight friends” wording as a nine-player native limit.

### G47 — PEAK

The full substantive dossier was inspected. Shared climbing, tools, weight, proximity communication, social context, bounded production and support expectations are strong. **R02/R04:** biome hazards, food identification/cooking, downed-versus-dead recovery and difficulty progression need more specific operating rules; the current text often says only that hazards and difficulty change. Compare the linked detailed study before finalizing individual omissions.

**R12:** the five-written-review heading is unsupported by its own annotations. PC Gamer is a substantive original; Checkpoint, Game8 and Final Weapon are summarized through PK-N's Metacritic index, and Games.cz through another critic index. The explicit limitation says original bodies were not retrievable. Those are research leads, not four completed review reads. Keep the critics' prior attributed snippets while retrieving full originals or suitable independent alternatives. The existence of real helpful Steam accounts does not replace the separate five-review gate.

**R14:** the final-update citation uses a generic all-games Steam news feed. Recover a title-specific announcement/FAQ identity and retain the distinction between final major content and continued maintenance.

### G48 — RuneScape / RS3

The complete dossier was inspected. It clearly separates modern RuneScape, OSRS and Dragonwilds; covers classless identity, skills, material chains, Revolution, player economy, housing, current monetization changes, production and long-term return. **R02–R04:** travel networks are effectively missing; Prayer, Summoning, spellbook/utility magic, equipment charges/augmentation details, and the current Wilderness risk contract are too thin. Several management activities are named rather than explained. This is not a request to reproduce thousands of recipes: it is the missing action/resource/recovery structure of major systems.

**R07/R08:** presentation concentrates on graphics/UI; audio and named, worked narrative examples need more than the broad tone list and two current quest titles. **R05:** several situations are design analogies without a concrete game-specific cost, limit or next choice; expand a small selection rather than adding more generic examples.

**R12:** the fifth slot is an unidentified App Store “corpus,” not one attributable substantive review with its text, date and limits. The requirements permit direct player criticism, but it must be an actual inspected account rather than an unspecified pool. The dossier itself identifies additional historical reviews; historical scope can be retained while meeting the five-text requirement. Two modern essays are appropriately labelled and need not be discarded merely because they are unscored.

### G49 — Old School RuneScape

The complete dossier and all source annotations were inspected. No major missing R01–R13 dimension was identified in this content pass. Unlike G48, it explains inventory/banknotes, spellbooks/prayer, travel networks, Sailing/crew, farming/house utility, named quests, activity-specific group roles, tax/sinks, account variants, soundtrack and actual dated helpful Steam accounts. Five attributable written assessments are present, with the retrospective's type and historical rules clearly qualified.

**R14 verification lead:** M21 uses the visibly misspelled URL `Quest_requirementts`; M16 uses an unusual worn-equipment alias. Verify redirects and repair failed targets rather than assume the description proves the URL works. Mechanics often rely on indexed wiki text with explicit robots-access limitations; this is not evidence that the full pages were read. No fresh reread of every cited source or complete packet certification is claimed.

### G50 — RuneScape: Dragonwilds

The complete dossier and source annotations were inspected. No major missing R01–R13 dimension was identified in this pass. The work differentiates ordinary four-person sessions from six-person dedicated hosting, crossplay from save portability, launch from future Prayer/Luminance, storage operations, workstations, farming/fishing, spell inputs, combat control changes, region hazards, character/world ownership, named quests and endgame activities. It has seven causal examples, production/audio evidence, five attributable assessments and dated contrasting Steam testimony.

Several especially important corrections are already handled correctly: nearby-chest crafting predates 1.0; a disconnection complaint is not permanent always-online dependence; a scripted housing quest is not autonomous household simulation; and an impressions essay is not a completed-campaign review. Preserve these qualifications. Source accessibility and current-release claims still receive selective checks rather than a new playtest.

## Remaining audit scope

G51–G60 remain to be inspected. Relevant legacy chapter/mechanics preservation and targeted source checks remain for earlier rows as specified above. The original packet's named Library files have been located, but locating them is not a preservation audit. The packet-provenance page explicitly does not certify line-by-line preservation. No new packet-wide certification is made here.
