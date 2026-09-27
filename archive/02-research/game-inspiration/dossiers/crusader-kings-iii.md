# G126 — Crusader Kings III

**Status: complete full-pass research dossier.** Research date: September 26, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

Crusader Kings III is unusually valuable because it treats political power as a **network of people with memories, traits, obligations, fears, families and legal claims** rather than as a state-shaped resource meter. The map matters, but the durable story unit is usually a relationship.

## R01 — identity, scope and current boundaries

Paradox Development Studio released Crusader Kings III on PC on September 1, 2020; console editions followed for PlayStation 5 and Xbox Series consoles. The base campaign begins in historical bookmarks and normally follows a **dynasty** through successive playable rulers until the medieval end date. Death usually changes the protagonist rather than ending the campaign.

The current PC game in September 2026 is substantially broader than launch. Important paid/free version boundaries include:
- **Royal Court** — rendered court, artifacts and major culture-system expansion.
- **Tours & Tournaments** — physical travel, grand tours, tournaments, weddings and accolades; its travel system also supports later content.
- **Legends of the Dead** — legends, legitimacy/plague-era systems and Black Death content.
- **Roads to Power** — landless Adventurers and Byzantine-inspired Administrative Government, influence, estates and appointment politics.
- **Wandering Nobles** — travel-focused events/lifestyle content.
- **Khans of the Steppe** — nomadic government, herds, migration, steppe seasons, tributaries and Great Khan play.
- **Coronations** — coronation activity/oaths, released September 9, 2025.
- **All Under Heaven** — released October 28, 2025; expands the map into China, Japan and Southeast Asia and adds regional government systems including Chinese Hegemony/Dynastic Cycle and Mandala play. [Paradox All Under Heaven](https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-all-under-heaven).

Console content cadence lags PC in places; for example Roads to Power/Wandering Nobles reached current-generation consoles in May 2026. The dossier therefore avoids treating "current PC" and "current console" as identical. [Paradox console release](https://www.paradoxinteractive.com/media/press-releases/paradox-interactive/crusader-kings-iii-on-console-gets-major-expansion-and-event-pack).

**Future boundary as of this audit:** **By God Alone** is announced for **September 30, 2026**, three days after this September 27 audit. It is a Chapter V core expansion focused on playable theocracies, church politics, cardinals, dynamic holy sites and related religious systems. It is **not yet released** here and none of those announced mechanics are counted as current behavior. Paradox's April 2026 Chapter V announcement also names a later **Silk & Silver** expansion; that roadmap item is likewise future scope, not current mechanics. [By God Alone announcement](https://www.paradoxinteractive.com/media/press-releases/paradox-interactive/keep-the-faith-in-upcoming-crusader-kings-iii-expansion) · [Chapter V announcement](https://www.paradoxinteractive.com/media/press-releases/paradox-interactive/paradox-launches-new-expansion-pass-for-crusader-kings-iii).

## R02 — player actions and major mechanics

### Character role-play

Every ruler has core skills—Diplomacy, Martial, Stewardship, Intrigue, Learning and later-system contextual modifiers—plus personality and other traits. The player appoints councilors, chooses a spouse/education, develops a Lifestyle, manages holdings, negotiates marriages/alliances, wages war, schemes, judges prisoners, manages religion/culture and responds to events.

The distinctive constraint is that actions are evaluated through **who this person is**. Personality traits alter opinions, event options and stress consequences. A compassionate ruler can still execute prisoners, but acting against personality may generate Stress.

### Stress and coping

Stress accumulates when choices conflict with traits or through adverse life events. Thresholds trigger mental breaks with coping choices that can create traits/behaviors. Hunts, feasts and other actions can reduce stress for suitable characters. This turns role-play from pure self-imposed fiction into costed decision-making.

### Schemes, secrets and hooks

Personal schemes include relationship-building such as Sway and hostile schemes such as Murder. Agents, secrecy, skill and target defenses affect success. Secrets discovered by spymasters or events can become **hooks**, which can compel political cooperation, contract changes or marriage acceptance depending on context.

The design value is that information can become power without ever moving an army.

### Titles, vassals and factions

Power is layered through counties, duchies, kingdoms, empires and later government-specific structures. A ruler directly holds some domain while delegating much of the realm to vassals. Vassals owe taxes/levies according to law/contract/government, but their opinion and military strength matter.

Discontented vassals can form factions demanding independence, lower authority or a claimant. Succession can split titles among heirs. Thus expansion increases both power and the number of political actors able to threaten the ruler.

### Culture and faith

Cultures and faiths define traditions, innovations, doctrines, marriage/crime rules and social expectations. Players can convert, reform/create faiths, hybridize/diverge cultures with appropriate systems, and use religion/culture as both identity and political structure.

### Warfare

War requires valid cause/claims under relevant rules. Players raise levies and Men-at-Arms, appoint knights/commanders, siege holdings and fight armies. War score resolves the political claim rather than rewarding unbounded annihilation. Gold, supply/attrition and military quality constrain campaigns.

### Useful absences: crafting, stealth and an adventuring party

CK3 has extensive **construction**—holdings, buildings, special structures, monuments through content—and artifact acquisition/management, but it does **not** use a general player-controlled material-crafting profession where the ruler personally gathers ingredients and forges ordinary equipment. Artifact creation is event/court/content mediated rather than a survival-crafting loop.

Likewise, hostile schemes use secrecy, agents, intrigue skill and discovery risk, but there is no avatar-scale crouch/line-of-sight stealth mode. Calling Murder or Abduction "stealth gameplay" would import an action-game concept the interface does not implement.

The ruler also has **no persistent controllable adventuring/combat party**. Councilors, courtiers, knights, travel entourages, spouses and family are persistent people with roles, but warfare is issued through armies/commanders and social life through character interactions rather than a four-to-six-person RPG squad. These absences are useful because CK3 places hidden action and "party composition" at the **social/institutional** layer instead.

## R03 — entities, resources and composition

Crusader Kings III's important "inventory" is mostly political rather than loot-centric:

- **Characters** — spouses, heirs, children, siblings, vassals, courtiers, knights, councilors, rivals, lovers, friends and guests.
- **Claims/titles** — legal-political objects that can pass through inheritance, grant, revocation or conquest.
- **Gold** — construction, Men-at-Arms, mercenaries, gifts, activities and many events.
- **Prestige/Fame** — secular status and action currency.
- **Piety/Devotion** — religious status/action currency.
- **Renown** — dynasty-wide resource used for legacies and dynastic actions.
- **Hooks/secrets** — leverage over characters.
- **Artifacts** (Royal Court era systems) — equip/display objects with history/modifiers.
- **Men-at-Arms, knights and holdings** — military/economic composition.
- **Legitimacy, influence, herds, merit, etc.** — later version/DLC systems specific to government/content.

Composition emerges from dependencies: marrying for an alliance may damage genetic/claim plans; granting a powerful vassal a council seat may sacrifice competence for stability; a high-skill spymaster who hates the ruler can be more dangerous than a mediocre loyalist.

## R04 — progression, economy and time

### A life is one progression arc

A ruler gains Lifestyle experience/perks, skill changes, relationships, titles and reputation, then ages and dies. Much of that personal progression disappears at succession. The new heir inherits some structures but not the prior ruler's personality or social network.

### Dynasty is the metaprogression

Renown and Dynasty Legacies persist across the family. Marriages spread the dynasty into other realms. A campaign's long-form achievement is therefore often not keeping one perfect character alive but **making a family resilient to bad heirs and political shocks**.

### Succession

Succession law is one of the game's strongest anti-snowball mechanics. Early partition systems can divide a realm among heirs. The player may respond by creating/avoiding titles, managing heirs, conquering compensating land, changing law over time or accepting fragmentation and rebuilding relationships afterward.

### Economy

Counties and holdings generate taxes/levies; buildings specialize development/economy/military output. Gold is continuously consumed by armies, construction, activities, gifts and events. Prestige/piety/renown constrain different action classes rather than collapsing all power into money.

### Time and endgame / return loop

Time runs continuously at adjustable speed, pausing for events or player choice. Pregnancy, education, travel, schemes, truces, construction and cultural innovation unfold over months/years. The game therefore makes delayed consequences normal: a marriage made today may decide a succession crisis decades later.

There is no single "win the campaign" objective analogous to a strategy-game score victory. The default historical campaign has a **1453 end date**, while a pre-game **No End Date** rule can remove that clock on supported versions/configurations. A run can also end earlier if the player's dynasty no longer has a valid playable continuation. Return value instead comes from choosing another historical ruler/bookmark, dynasty, government, religion/culture or self-imposed objective and watching the same social systems produce a different history. [Current extracted game-rule reference](https://github.com/kimo1000g-cell/ck3-text-files/blob/main/Game%20rules.txt).

## R05 — worked situations

### Case 1 — compassionate ruler, politically useful execution
**Intention:** remove a dangerous rebel. **Conditions:** prisoner is legally executable; ruler has a compassionate trait. **Action:** execute. **Interaction:** political threat decreases, but acting against personality raises Stress. **Result:** state optimization harms character stability. **Next decision:** accept stress or spend time/resources on relief.

### Case 2 — a marriage creates tomorrow's claimant
**Intention:** secure an alliance. **Conditions:** marry a child into another dynasty. **Action:** accept advantageous match. **Interaction:** children inherit claims and family ties. **Result:** decades later a descendant may become ally, heir, or rival claimant. **Limit:** the exact inheritance depends on title/law/marriage context.

### Case 3 — succession turns one realm into sibling politics
**Intention:** leave a strong kingdom. **Conditions:** partition succession and multiple eligible heirs. **Action:** ruler dies. **Interaction:** titles divide among children. **Result:** player continues as primary heir with siblings now holding meaningful power/claims. **Next decision:** ally, placate, revoke, conquer or accept the new balance.

### Case 4 — secret becomes law-changing leverage
**Intention:** alter a powerful vassal's obligations. **Conditions:** spymaster discovers a usable secret. **Action:** blackmail for hook, then use leverage in negotiation. **Interaction:** private behavior becomes institutional power. **Result:** contract/political cooperation changes without war. **Counterexample:** exposure or weak hooks may not grant desired action.

### Case 5 — faction changes council appointments
**Intention:** maximize council skill. **Conditions:** strongest vassal dislikes ruler and joins a dangerous faction. **Action:** appoint that vassal to a council seat despite lower competence, send gift/sway, negotiate. **Interaction:** relationship management competes with optimization. **Result:** lower administrative output may buy political stability.

### Case 6 — travel creates physical vulnerability
**Intention:** hold a grand tournament or visit vassals. **Conditions:** Tours & Tournaments-era travel system. **Action:** choose route/entourage. **Interaction:** safer roads cost time; dangerous terrain shortens route but raises event risk. **Result:** an activity becomes a spatial expedition rather than a menu click. [Tours & Tournaments](https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-tours-and-tournaments).

### Case 7 — landless contract becomes a dynasty origin
**Intention:** rise without inherited land. **Conditions:** Roads to Power Adventurer start. **Action:** travel, take contracts, recruit followers and build reputation/wealth. **Interaction:** character progression operates without normal feudal domain. **Result:** eventually settle or claim land, converting mobile social capital into territorial power. [Roads to Power](https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-roads-to-power).

### Case 8 — steppe ecology forces political movement
**Intention:** preserve nomadic wealth. **Conditions:** Khans of the Steppe nomadic government; seasonal pasture quality changes. **Action:** migrate toward better pasture and manage herd/dominance/obedience. **Interaction:** environmental fertility changes where political power is sustainable. **Result:** "realm management" becomes movement instead of static building optimization. [Khans of the Steppe](https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-khans-of-the-steppe).

## R06 — people, AI, relationships, factions and multiplayer

Characters are both actors and resources. They have opinions toward one another, family relations, traits, skills, claims, secrets, memories/event states and goals. The AI chooses marriages, schemes, wars and faction participation within game rules; it is not free-form psychological simulation, but the density of overlapping state makes plausible personal causality emerge.

Relationships include spouse, parent/child, sibling, friend, rival, lover, soulmate, guardian/ward, liege/vassal and house/dynasty structures. Later systems add travel companions, court positions and administrative/family-estate relationships.

**Factions** are mechanically concrete coalitions rather than flavor labels. Their military threshold and discontent can produce ultimatums/civil war. Internal politics therefore has legible escalation.

**Multiplayer** allows multiple human rulers in the same evolving world. Players can ally, marry, war, plot and coordinate through the same systemic vocabulary as AI rulers. It is not separate match-based gameplay; human agency is injected into the persistent campaign simulation.

## R07 — art, audio, interface and feel

Launch CK3 made a major accessibility investment. 3D characters visibly age and inherit family resemblance; traits/disease can alter appearance. The world map shifts between parchment-like strategic views and terrain/political layers.

Its most influential interface pattern is **nested tooltips**: hover a concept, lock the tooltip, then hover terms inside it. NME and TheSixthAxis specifically praise this as a way to make a very dense strategy game learnable. The interface exposes why opinions, income and probabilities change rather than expecting players to memorize an external manual.

The audio/visual tone balances serious medieval ritual with absurd personal events. Royal Court literalizes the throne room; travel/events/Tours add location and spectacle. Later regional expansions add distinct clothing, throne rooms, monuments and music rather than treating every culture as a palette swap.

The limits remain density and notification overload. Reviews note busy screens, tutorial text and edge cases where explanation is technically available but cognitively expensive.

## R08 — narrative and its connection to play

CK3 has no single authored protagonist arc. Historical start states provide people and political conditions; simulation writes the campaign.

Narrative strength comes from **mechanical causality across generations**:
- a neglected child becomes an incompetent heir;
- an affair produces a secret/bastard/claim;
- a murder removes one succession obstacle but creates rivalry/stress;
- a marriage intended for alliance changes inheritance;
- a plague kills the "safe" heir;
- a faction revolt becomes a family civil war.

NME's launch review gives a representative firsthand example: the reviewer forms Ireland, dies, and discovers neglected children/factions turn succession into collapse. GameSpot opens with uncertainty over whether an oddly presented naked councillor is bug or simulation—capturing how CK3 trains players to read anomalies as possible character stories.

Authored event text is therefore not the story by itself; the story is how an event changes relationships/resources and what later systems do with that change.

## R09 — production and development

Paradox announced CK3 at PDXCON 2019 with an explicit goal of broadening accessibility while deepening ruler role-play. Game director Henrik Fåhraeus said the predecessor's popularity had grown despite user-friendliness not being a primary original goal; CK3 was a chance to address a larger audience. [Announcement coverage with director quote](https://www.shacknews.com/article/114561/crusader-kings-3-announced-at-pdxcon-2019).

The sequel rebuilt presentation around 3D characters, lifestyles, stress, unified schemes and nested explanations rather than shipping as a graphical CK2. Reviewers repeatedly describe it as retaining mature systems while avoiding a total return to a bare launch state.

Post-launch production uses Paradox's long-tail model: major free updates accompany paid expansions, while platform ports are handled with partners. Room 8 Group currently develops major console adaptation/content work in partnership with Paradox for parts of the console roadmap. [May 2026 console release](https://www.paradoxinteractive.com/media/press-releases/paradox-interactive/crusader-kings-iii-on-console-gets-major-expansion-and-event-pack).

All Under Heaven illustrates the scale of ongoing production: Paradox calls it the largest CK expansion to date and says it added thousands of provinces/characters across East and Southeast Asia. [Release announcement](https://www.paradoxinteractive.com/media/press-releases/press-release/establish-a-new-hegemony-in-all-under-heaven).

## R10 — marketing, distribution, promotion and virality

The launch positioning emphasized "real strategy requires cunning" and ruler fantasy rather than conventional map conquest. That framing made the game's anecdotal systems central marketing material.

Distribution began on PC storefronts including Steam/Microsoft/Paradox routes and expanded to PS5/Xbox Series. Game Pass access, later console releases and Paradox's current **Crusader Kings III Subscription** widen entry through different payment models. The current subscription advertises access to released expansion/flavor/event/cosmetic content rather than ownership; future Chapter V releases remain separately date-bounded. The title also supports mods, which amplify historical conversions, total conversions and role-play. [CK3 overview/subscription](https://www.paradoxinteractive.com/games/crusader-kings-iii/about).

Its most powerful organic unit is the **story anecdote**: "I murdered my uncle after a feast," "my neglected son lost Ireland," or a dynasty ruined by plague is compact, surprising and mechanically plausible. Current Steam reviews still use mini dynastic narratives as recommendation copy. This is evidence that the game generates shareable stories, not measured proof of a specific virality coefficient.

Paradox also markets expansions as new fantasy modes—royal court, travel, landless adventurer, steppe khan, East Asian imperial politics—making each content pack legible as a new storytelling engine rather than only "more events."

## R11 — commercial and participation context

Paradox reported **3 million base-game copies sold** by September 1, 2023, explicitly excluding expansion/cosmetic packs. On April 23, 2025, Paradox announced **4 million copies across computer, PlayStation 5 and Xbox Series platforms**. [3m release](https://www.paradoxinteractive.com/media/press-releases/press-release/crusader-kings-iii-hits-3-million-sales) · [4m release](https://www.paradoxinteractive.com/media/press-releases/press-release/crusader-kings-iii-passes-four-million-sales).

The business model is premium base game plus a long sequence of paid major/core/flavor/event/cosmetic packs, usually paired with free updates, **plus an optional subscription that grants access to already released add-ons without conveying ownership**. This distinction matters when discussing current price/access and support obligations. It is also the dominant current criticism in Steam samples: some long-time positive players praise the simulation while objecting to aggregate DLC cost.

Launch participation reached a reported Steam peak around 97,000 concurrent players in its first days; that is a Steam concurrency observation, not unit sales or retention. [PCGamesN launch report](https://www.pcgamesn.com/crusader-kings-3/steam-charts).

## R12 — reception and player feedback

### Five substantive written reviews read

**Fraser Brown — PC Gamer, August 31, 2020.** Praises CK3 as both grand strategy and RPG, especially interlocking family/plot systems and accessibility; the core appeal is becoming entangled in characters rather than executing a fixed victory plan. [Review](https://www.pcgamer.com/crusader-kings-3-review/).

**David Wildgoose — GameSpot, September 2020.** Calls it a storytelling device operating simultaneously at huge strategic scale and awkward personal intimacy, praising emergent narratives while noting looseness can make long engagement uneven. [Review](https://www.gamespot.com/reviews/crusader-kings-3-review-pass-the-duchy/1900-6417551/).

**Ian Boudreau — PCGamesN, August 31, 2020.** Praises the modernized interface, map, role-play and thematic coherence while arguing some progression/difficulty/combat structures remain conservative or imperfect. [Review](https://www.pcgamesn.com/crusader-kings-3/review-ck3).

**Stefan L — TheSixthAxis, August 31, 2020.** Highlights lifestyles, stress, schemes/hooks, religion/culture breadth and nested tooltips. Criticizes edge-case tuning, stress rigidity for some personalities and an info-heavy tutorial. [Review](https://www.thesixthaxis.com/2020/08/31/crusader-kings-iii-review/).

**Jordan Oloman — NME, September 3, 2020.** Praises 3D characters, role-play, tooltip accessibility and near-infinite story generation while identifying balance, cultural-innovation and interface-overload issues. The review's failed succession anecdote directly illustrates generational consequence. [Review](https://www.nme.com/reviews/crusader-kings-iii-review-a-superb-sequel-that-welcomes-new-players-to-the-joys-of-grand-strategy-2744117).

### Steam helpful/player sampling

Current helpful-week Steam reviews include players recounting multi-generation campaigns where wars, inheritance, adultery, plague and peasant revolt combine into unique dynastic stories. Positive long-hour reviews praise freedom, modding and emergent narrative. [Current reviews](https://steamcommunity.com/app/1158310/reviews/).

Current negative reviews prominently criticize paid-DLC accumulation and situations where new mechanics feel incomplete without buying associated content. One long-hour negative review argues updates, mods and DLC dependencies create ongoing friction. [Current negative sample](https://steamcommunity.com/profiles/76561198020161142/recommended/1158310).

All-time helpful reviews also show a recurring learning curve: some players report only enjoying the game after reframing realm loss/partition as story rather than failure. [All-time helpful](https://steamcommunity.com/app/1158310/reviews/?browsefilter=toprated&l=english).

**Sampling limit:** Steam sorting is qualitative, not representative. Current hours and current DLC state should not be projected backward onto launch reviews.

### Synthesis

Strongest praise: character-centered emergent narrative, accessible tooltips relative to genre complexity, role-play freedom, dynastic continuity and modding. Strongest criticism: DLC economics, uneven expansion value, cognitive/UI overload, balance exploits/edge cases and some systems feeling shallower outside favored regions/governments.

## R13 — transferable inspiration and limits

1. **Model power through relationships.** A realm is more interesting when people own pieces of it and have demands.
2. **Make personality constrain optimization.** Stress gives role-play mechanical teeth.
3. **Treat secrets as resources.** Information can alter contracts, marriages and loyalty without combat.
4. **Make death a protagonist transition.** Generational play preserves world consequences while refreshing goals.
5. **Let inheritance create drama instead of merely deleting progress.** Partition turns family structure into geography.
6. **Use nested explanations for systemic complexity.** Tooltip chains reduce the need for external manuals.
7. **Allow the same system to generate comedy and tragedy.** Relationships, traits and events need not be authored for one emotional tone.
8. **Tie activities to physical travel when location matters.** Tours/Tournaments turn previously abstract interactions into risky journeys.
9. **Support radically different political fantasies.** Roads to Power, nomadic play and All Under Heaven change what "having power" means rather than only adding modifiers.

**Limits:** numeric opinion can make people feel transactional; trait-driven stress can become a straightjacket; inheritance frustration can read as arbitrary punishment to players seeking empire-building; expansion-dependent depth fragments the audience; emergent narratives need enough readable causality that randomness feels like consequence rather than noise.

The transferable principle is **persistent people + constrained motives + inherited institutions**. The map becomes meaningful because relationships survive long enough to change it.

## R14 — sources, preservation and requirement map

### Primary/developer sources
- [Paradox CK3 overview](https://www.paradoxinteractive.com/games/crusader-kings-iii/about) — dynasty/character/map positioning.
- [Tours & Tournaments](https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-tours-and-tournaments) — travel/tours/tournaments.
- [Roads to Power](https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-roads-to-power) — administrative government, estates, influence and landless Adventurers.
- [Khans of the Steppe](https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-khans-of-the-steppe) — nomadic/herd/migration/tributary systems.
- [Coronations](https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-coronations) — coronation/oath activity.
- [All Under Heaven](https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-all-under-heaven) — East/Southeast Asian map/governments.
- [By God Alone announcement](https://www.paradoxinteractive.com/media/press-releases/paradox-interactive/keep-the-faith-in-upcoming-crusader-kings-iii-expansion) and [Chapter V announcement](https://www.paradoxinteractive.com/media/press-releases/paradox-interactive/paradox-launches-new-expansion-pass-for-crusader-kings-iii) — inspected September 27, 2026 to pin Sept. 30 By God Alone and later Silk & Silver as future rather than released systems.
- [CK3 overview](https://www.paradoxinteractive.com/games/crusader-kings-iii/about) — current storefront/platform positioning and optional content-subscription route.
- Paradox 3m/4m press releases in R11 — defined sales milestones.

### Critical/player sources
Five independent launch review bodies are summarized in R12: PC Gamer, GameSpot, PCGamesN, TheSixthAxis and NME. Current/all-time Steam pages supply contrasting player evidence.

### Preservation
G126 is a newly curated subject. Direct branch-path checks found no prior dedicated CK3 dossier or game chapter. This dossier does not treat CK2 mechanics as automatically present. DLC/current-PC/current-console differences are explicit. Packet-wide P01–P05 gates remain separate.

### Requirement map

| Requirement | Coverage |
| --- | --- |
| R01 | launch/current PC, console and expansion boundaries |
| R02 | traits/stress, schemes/hooks, vassals/factions, culture/faith, war, plus explicit crafting/stealth absences |
| R03 | people, titles, claims, currencies, artifacts and political composition |
| R04 | life/dynasty progression, succession, economy, long time horizons and 1453/no-end-date return loop |
| R05 | eight worked dynastic/political/travel examples |
| R06 | relationship graph, factions, AI, explicit no-adventuring-party boundary and shared-campaign multiplayer |
| R07 | 3D characters, nested UI, cultural presentation and friction |
| R08 | procedural dynastic narrative and mechanical causality |
| R09 | accessibility-focused sequel and long-tail production |
| R10 | ruler-fantasy positioning, expansions, mods and anecdote sharing |
| R11 | 3m/4m sales milestones and business-model distinction |
| R12 | five independent reviews plus current Steam evidence |
| R13 | transferable social/inheritance/personality patterns and limits |
| R14 | sources, preservation, version limits and map |

**Completion review:** R01–R14 are substantively covered; current expansion boundaries are dated; eight worked situations span personality, secrets, succession, factions, travel, landless and nomadic play; five independent review bodies and Steam samples were read; base sales are separated from DLC revenue; no pre-existing CK3 owner was overwritten.
