# Dota 2 — full research dossier

**G09 · Full research pass completed September 25, 2026.** Major systems and R01–R14 are covered below. This is not a current optimal-build catalog, personal playthrough, proprietary-code audit or representative sentiment survey.

[Preserved paired chapter](../games/league-of-legends-and-dota-2.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Dota 2 is researched independently from League, the original Warcraft mod and custom Arcade games. Numerical tuning and historical rollout claims remain tied to their versions.

## 1. An accessible roster is not an easily mastered game

Valve distributes Dota 2 free through Steam and makes its hero roster available without champion purchases. Published options include bot matches and hero demonstrations alongside human matchmaking. Steam records July 9, 2013 as its release. Promotional claims of perfect matching or limitless possibilities are not independently measured outcomes. [DT01](#dt01)

Chris Thursten's 2018 re-review describes two five-hero teams contesting three lanes and trying to destroy the opposing **Ancient**. He emphasizes manipulating the match's economic and strategic tempo rather than treating it as a kill counter. [DT02](#dt02)

**Interpretation:** hero control, resource acquisition and team movement are interconnected activities. A kill creates time or access that must still be used. Someone can contribute through rescue, vision or controlling an area even when another teammate receives most of the gold. Early play concerns surviving and acquiring capabilities; later play concerns using those unequal capabilities to force a favorable commitment and reach the base.

### Version boundary

March 2026 patch **7.41 removed Facets**, the pre-match hero variants introduced in 7.36, while retaining and reworking innate abilities. It also changed neutral-item preparation and map objectives. [DT03](#dt03) The September 15 developer notice confirms the later **7.41f** balance patch. [DT04](#dt04)

**Interpretation:** adding choices is not the only direction of development. Removing a selection can leave some of its functions elsewhere in a kit. Neither an old guide nor the phrase complete rollback describes that transition accurately. The sources establish changes, not a controlled finding that they improved every player's experience.

## 2. Resources are contested through actions, not only time

A **deny** is a permitted last hit on a sufficiently weakened allied unit. It prevents the opponent receiving ordinary gold and changes the experience available to them, with unit-specific rules. Allied-hero denial has special eligibility; it is not unrestricted friendly killing. [DT05](#dt05)

**Worked situation:** choose between securing an enemy creep and denying one's own while staying outside an opponent's useful attack range. The lane's next resource distribution can change without a hero dying. Attacks that would be routine in an uncontested economy become judgments about timing and exposure.

The broader mechanics include lane creeps that advance automatically, neutral camps, player-controlled summons, item recipes and abilities with differing costs and cooldowns. Some items can be disassembled into components. [DT10](#dt10) **Interpretation:** controlling one hero does not always mean controlling only one unit, and a finished item need not always be an irreversible endpoint. What can be recombined matters as much as how many objects exist.

### A courier makes procurement a logistical activity

Each player has a courier that can deliver purchases. Its availability, carried inventory and vulnerability matter; a failed delivery or full destination inventory is not equivalent to the item never having been purchased. [DT11](#dt11)

**Worked choice:** stay in a productive area while equipment arrives, or return personally to safety and the shop. Attacking a courier can delay a rival's usable capability even if their gold already bought it. This separates affordability, ownership and possession. The old shared-courier arrangement described in historical discussions is not the present individual-courier rule.

## 3. Buyback makes saved money a recovery option

Death removes a hero from ordinary action until respawn and can lose unreliable gold. **Buyback** spends gold for immediate return at the fountain, with a cooldown and a longer subsequent death timer. Availability is visible to allies, while using it produces a public audiovisual cue. [DT06](#dt06)

**Worked decision:** spend the reserve on a stronger item or retain an emergency return during a critical defense. After dying, buyback may save the base but expose the player to a worse absence after another death. Wealth is equipment, insurance and opportunity cost, not one monotonically beneficial score.

**Interpretation:** recovery can be strategic without being free or erasing the mistake. The announcement changes what opponents know. A persistent world should not copy this exchange before deciding which resources and commitments may legitimately buy another chance.

## 4. Equipment supplies new verbs and important exclusions

A **Tango** heals by consuming a tree. It can be shared with an ally, and a tree planted through an Iron Branch supplies a different healing duration. [DT12](#dt12) **Worked interaction:** an ordinary recovery resource also changes a route or line of sight by removing an obstacle. A tree is simultaneously terrain, concealment and a possible ingredient. The useful lesson is overlapping roles, not simulating every botanical detail.

**Blink Dagger** moves its user to a target location, but recent qualifying enemy damage prevents activation. [DT13](#dt13) **Force Staff** instead pushes a unit in the direction it faces and has its own explicit exclusions. [DT14](#dt14)

**Worked comparison:** an initiation tool that was available before a fight may be unavailable when escaping it. A teammate's push may solve that problem, but only with a suitable orientation and permitted target state. Mobility is not one interchangeable statistic; destination selection, interruption, allegiance and timing define different actions.

**Black King Bar** provides a temporary defensive window, not universal invulnerability to every possible effect. [DT15](#dt15) **Interpretation:** a powerful item is interesting when opponents and allies can reason about what remains possible during and after it. A vague label such as immune is less useful than an explicit list of relevant boundaries.

## 5. Vision, terrain and neutral objectives reshape the map

Fog of war hides unobserved activity; ordinary sight and detecting invisibility are distinct. Terrain, trees, elevation and day/night conditions affect vision, with hero-specific exceptions. Team members share supported information. [DT16](#dt16) The later **7.41c** record specifically says flying vision no longer bypasses the Roshan pit boundary. [DT17](#dt17)

**Interpretation:** overhead presentation does not require universal knowledge. Conversely, Dota's team-shared vision is not evidence of separate private beliefs for each character. OpenLegend would need to choose whether a fact belongs to the human interface, the team or one embodied actor.

An **Observer Ward** is an expiring placed source of ground vision, not a guarantee of detecting every invisible enemy. [DT18](#dt18) **Worked plan:** establish observation before approaching an objective, then reconsider after the ward expires or is removed. The map is physically similar but the available evidence is not.

### A useful observation can interfere with production

**Stacking** pulls neutral creeps out of their camp before its spawn check so another group can appear. Objects or units inside the relevant area can prevent spawning; exact timings depend on the camp. [DT19](#dt19)

**Worked counterexample:** a ward creates useful vision but blocks a neutral camp's replenishment. Removing it can restore one opportunity while sacrificing another. A local benefit has a downstream cost through a shared spatial rule, without requiring a bespoke quest about the mistake. A stacked resource can also be taken by opponents: preparing it does not grant permanent exclusive ownership.

### An objective can reward coordination rather than one collector

**Tormentor** combines a regenerating barrier and reflected damage distributed among nearby heroes. Its Shard reward considers eligible lower-net-worth teammates rather than simply giving a physical prize to whoever dealt the last blow. [DT20](#dt20)

**Worked decision:** gather sufficient support to handle reflected damage or postpone the attempt. The reward may strengthen someone other than the strongest damage dealer. A team objective can therefore redistribute capability, while the encounter itself tests whether the group can coordinate safely.

**Roshan** and the **Aegis** create another preparation window: obtaining a return-after-death resource can make a dangerous siege more plausible. Its location and approach were revised in 7.41, so an old pit-route guide is not automatically current. [DT21](#dt21) **Interpretation:** the objective is useful because it changes the next decision. It is not merely an unrelated score awarded for defeating a neutral boss.

## 6. Rubick copies a capability, not an entire person

**Spell Steal** acquires an enemy hero's last eligible spell for a limited period or until death; item abilities are excluded. Rubick's own Shard determines the corresponding upgrade, while Scepter permits two stored spells and its supported upgrades. [DT07](#dt07) The detailed reference distinguishes this from acquiring an entire linked kit, passive identity or every innate trait. [DT08](#dt08)

**Worked situation:** wait until the desired action occurs, then acquire it before another cast changes the opportunity. The same spell can have a new value in Rubick's position and team. It can also depend on something he did not obtain.

**Interpretation:** portability needs a contract. A copied operation is not automatically a copied actor, resource system or privilege set. A reusable library should say what travels with the operation and what the destination must provide. More choices do not eliminate the need to select a capability that fits the actual scene.

## 7. Io links support, movement and a scheduled return

**Tether** connects Io to an ally, and **Overcharge** shares bonuses through it. **Relocate** transports Io and a tethered ally, then returns them after an interval. Enemies receive an arrival indicator; interruption can prevent departure. Breaking the tether changes whether the ally travels with it. [DT09](#dt09)

**Worked rescue:** move an endangered ally to safety, then consider breaking the connection so they do not return to danger. Io's own scheduled return remains a commitment. Rescue creates a new position/timing problem rather than simply removing the threatened character from the match.

**Interpretation:** a few explicit relationships support joining a fight, leaving one or acting briefly elsewhere. The destination and return must be desirable to the recipient; an animation of help does not establish that the outcome was helpful. These are bounded native mechanics, not autonomous conversational planning.

## 8. Neutral items separate an artifact from its enhancement

The current **Madstone** system presents artifact and enchantment choices, with tier progression and prerequisites rather than an unrestricted choice of everything at once. [DT22](#dt22) In 7.41, enchantment choices changed from the earlier random arrangement toward primary-attribute-dependent choices, with special treatment for Universal heroes. [DT03](#dt03)

**Interpretation:** a reusable effect and the statistics attached to it are different decisions. Preserving a useful operation while improving its supporting properties can be preferable to automatically discarding every earlier item for a higher-tier name.

The 7.41 developer notes also changed failed crafting with full inventory so it does not simply consume the attempt, and added clearer consumable-giving feedback. [DT23](#dt23) **Worked distinction:** a recipe can be valid while its result has nowhere to go. Capacity failure is not a mysterious refusal of the recipe. Feedback that identifies the failed stage helps the player fix the real problem.

## 9. Modes and creation put different activities around a familiar vocabulary

Valve's **Dueling Fates** release introduced **Turbo** with faster income/experience, weaker structures, shorter respawns and easier shopping. It also documented community-written guides carrying role and patch context, and purpose-specific pings such as attack, retreat and ward requests. [DT24](#dt24)

**Interpretation:** reducing preparation time can make experimenting with a hero easier without proving that a shorter match preserves every pleasure of the standard one. A guide also teaches a particular proposed method, not an authoritative optimum for every encounter.

**Ability Draft** recombines abilities rather than locking each character to its ordinary kit. The 7.41 notes explicitly update its innate-ability and drafting rules. [DT23](#dt23) **Worked comparison:** a familiar operation may be strong with one supporting resource or movement ability and awkward without it. The mode turns compatibility into part of play; it does not establish that all combinations are balanced or semantically complete.

### Arcade adds tools and finished examples

The 2015 **Reborn** custom-game account exposes Lua rules, events, NPC spawning and ability behavior, alongside Panorama interfaces. Valve supplies example games and source material, including **Overthrow**, rather than only a blank editor. [DT25](#dt25)

**Interpretation:** a designer can change the activity around a reusable cast and map. The presence of a scripting interface does not guarantee a discoverable, maintained game or a welcoming server. The original Warcraft custom-map lineage and Dota's own Arcade are related stages, not the same product or identical permission model.

A tutorial, a community guide, a recorded match and an editable example solve different learning problems. Good reference material should identify which question each answers instead of counting all four as equivalent evidence of easy onboarding.

## 10. Learning and social access are continuing product work

Valve's March 2021 onboarding update introduced staged tutorials for mechanics such as wards, couriers and teleportation, alongside newcomer-oriented matches that could use bots and tolerate departures. That is a dated support intervention, not proof that every current newcomer queue behaves identically. [DT26](#dt26)

**Interpretation:** knowing an ability's button is not yet understanding a team's plan. A safe learning space can teach controls while a human group teaches relevance and timing. The bot opponent is not evidence of the kind of private memory or open-ended character reasoning OpenLegend is pursuing.

The 2023 Summer Update separated behavior and communication scoring and expanded reporting/feedback, according to contemporaneous reporting of Valve's release. [DT27](#dt27) **Interpretation:** eligibility to speak, perceived sportsmanship, matchmaking and actual cooperation are different problems. An improved report interface does not prove that all bad behavior disappears, and a frustrating loss is not by itself evidence of misconduct.

Human continuity can nevertheless be substantial. A friend group learns a common vocabulary, preferred combinations and ways to recover from mistakes. Those relationships persist outside the match without requiring the game to model a fictional friendship between the selected heroes.

## 11. Visual and audio craft make complexity usable

Valve's character-art guidance emphasizes readable silhouettes and direction, clear weapons, restrained areas of detail, and stronger visual interest toward the upper body. It recommends value/contrast testing rather than relying only on saturated color. [DT28](#dt28)

**Interpretation:** the viewer needs to distinguish who is acting and what orientation or threat matters amid a busy scene. Adding more particles or more detailed clothing can undermine that job. A new creature's distinctiveness should not require hiding its usable silhouette.

Sound also marks a public state change: buyback's cue tells participants that a hero has returned, while ability feedback helps time responses. [DT06](#dt06) **Interpretation:** audio can provide evidence, not merely mood. A convincing invented effect needs a reliable relationship among visible reach, audible warning and actual consequence.

The official soundtrack is credited to the **Valve Studio Orchestra** and includes named pieces such as **Spoils of War**, **Call to Arms** and **Reborn**. [DT29](#dt29) These are verified listening routes, not a claim that this pass analyzed every composition or that each track plays in every mode. Music and character performances can give a competitive encounter a distinctive identity without creating a separate narrative campaign.

## 12. Authored lore and match stories have different authority

The **Crownfall** event followed **Dragonus** and **Shendelzare** through an authored adventure spanning Midgate, Druud, Icewrack and Skywrath, with comics and minigames. Valve extended that historical event to February 6, 2025; it is not represented as a currently open campaign. [DT30](#dt30)

**Interpretation:** named people and places give character identities another route to meaning beyond a normal match. A competitive team's composition or repeated deaths need not become permanent canonical events in that authored story. That boundary matters for a persistent world: a dramatic line about an event and an authoritative world-history change are separate outputs.

Within a match, a stolen spell, a costly return or a rescue with a dangerous scheduled journey back can become the story people tell. Their agency creates the causal episode. The game does not need to generate a new plot to make that particular combination memorable.

## 13. Production: inherited design, a new engine and changed priorities

The Steam release and historical re-review establish Valve's standalone continuation of a Warcraft-mod lineage rather than the invention of every rule in 2013. [DT01](#dt01) [DT02](#dt02) The **Reborn** account documents a 2015 public-beta transition to **Source 2**, including revised rendering, physics, audio tools and a custom-game pipeline. Source Filmmaker could use the same game assets for authored recordings. [DT31](#dt31)

**Interpretation:** a recorded cinematic camera is not the ordinary player's view, and an editable example is not a finished independent service. Reusable technical infrastructure helps several production activities while each still needs its own design and maintenance.

In June 2023, Valve explained moving effort away from a Battle Pass-centered release pattern. The reproduced statement says concentrated reward production had competed with broader game improvements and that most players did not buy a pass. The team pointed to **New Frontiers** as an alternative use of development effort. [DT32](#dt32)

**Interpretation:** a successful monetization cycle can shape which improvements receive staff attention. Revising that cycle is a production decision, not merely changing a shop price. Valve's favorable assessment of the change is its own account; it does not establish an independently measured welfare or retention improvement.

This research does not disclose a verified title budget, full team history or proprietary implementation of every interaction. The public engine and production accounts are substantive evidence without license to invent the missing private details.

## 14. Commercial context and cultural distribution

The basic roster is free. **Dota Plus** adds hero progression/challenges, statistical features, contextual recommendations and rewards; these account features are distinct from the hero's freshly earned gold and levels in a match. [DT33](#dt33)

**Interpretation:** immediate competitive resources, learned expertise, a personal record and purchased expression are different kinds of continuity. Access to all heroes does not mean every surrounding service is free, and a subscription does not establish permanent in-match equipment advantages. The precise benefit should be named rather than summarized as either entirely cosmetic or universally pay-to-win.

The original chapter preserves its Steam-only **1,295,114 all-time concurrent peak on March 6, 2016** and the dated September 2026 daily capture. They are not newly synchronized measurements, unique users or title profit. [Earlier metrics and qualifications](../games/league-of-legends-and-dota-2.md)

Esports, spectator tools, community guides, cosmetic creation, custom games and shared match stories offer different routes to discovery and return. The official tools and production records establish those routes; they do not quantify each one's contribution to spending. A spectacular professional combination may help someone understand a possibility while saying little about their first ordinary matchmaking experience.

No audited title-profit or private retention series was established. Prize pools, platform sales, marketplace activity and current concurrency should not be substituted for one another. A long-lived free game still has service, compatibility, community and content obligations.

## 15. Reception: mastery and social dependence remain separable

Thursten's **2018 92/100** re-review values depth and the relationships formed through learning. It also describes the steep learning burden, conduct problems and concern about useful role-selection features then sitting inside paid access. He finds contemporary Dota Plus suggestions less helpful than some free player guides. Those are historical judgments, not current claims that role queue remains behind that paywall. [DT02](#dt02)

| Direct account | Positive value | Friction / evidence limit |
| --- | --- | --- |
| nmlsDv, December 18, 2025 | Values the game's intellectual depth after extensive self-reported play. | Enthusiasm coexists with losing streaks; reported hours are not independently audited. |
| lostssq, January 5, 2026 | Their attempt to resolve a participation problem shows continued investment. | Reports that a required win was not recorded and support did not manually resolve it. A personal report, not a verified live bug or inspected support ticket. |
| RonaldRamirez95, February 15, 2026 | Discusses competitive play rather than evaluating an unrelated product. | Dislikes match quality and hostile teammates. Their theory that wins are deliberately punished is not adopted as fact. |

The named posts were inspected on a self-selected user-review page; they do not establish complaint prevalence. [DT34](#dt34)

**Interpretation:** a player may enjoy the underlying contest while disliking its social setting or the procedure required to return to ordinary play. Better balance, clearer failure feedback and a more compatible group address different problems. Neither a rave review nor an angry account should be made to answer all of them.

## 16. Transferable patterns and limits

**One thing can have several practical roles.** A tree supplies geometry and healing material; gold buys equipment and emergency return. Shared rules create interesting tradeoffs when those roles collide.

**Reusable operations require dependencies.** Rubick's spell copying is a useful counterexample to treating a named ability as a complete imported character. Specify the copied behavior, missing prerequisites and destination-provided resources.

**Assistance needs an outcome and a cost.** Io's rescue may leave a scheduled return problem. A support action is not successful merely because the helper says it was helpful.

**Observation is temporary and scoped.** Vision can enable a route while a ward blocks another process. A world model should preserve the actual source and limits of knowledge rather than narrate global certainty.

**Creation and participation are different products.** Arcade tools, examples, guides, matchmaking and sustained maintenance each supply a different part of the experience. None makes the others automatic.

Do not copy the full competitive contract into OpenLegend. Match resets, buyback, adversarial resource denial and human-team dependence serve this activity. Their transferable value is the legibility of consequences and meaningful composition, not a requirement to reproduce every punishment.

## 17. Reading routes, coverage and preservation

Start with the official product description and the historical re-review, then inspect Tango, Blink/Force Staff, Rubick and Io as contrasting compositions. Read the Reborn custom-game and engine accounts for production. The official soundtrack is a separate listening route. None of the linked footage, demonstrations or sound recordings is claimed watched or heard in full; written evidence supports the claims above.

| Requirement | Substantive coverage |
| --- | --- |
| R01 identity/promise | §1 and native/custom/version boundaries |
| R02 major actions | §§1–9: lanes, denial, procurement, recovery, objectives and modes |
| R03 items/entities | §§2, 4–8: recipes, tools, terrain, copying and delivery |
| R04 progression/time/economy | §§2–3, 8 and 14: match resources, resets, tiers and account systems |
| R05 concrete interactions | Worked situations in §§2–9, with limitations |
| R06 people/AI/multiplayer | §§5–7, 9–10 and 15: information, cooperation, bots and human groups |
| R07 art/audio/interface | §11 and feedback/capacity examples |
| R08 narrative | §12: authored event and player-created episodes |
| R09 production | §13 and documented system revisions |
| R10 distribution/promotion | §§9–10, 13–14: Steam, tools, spectators and return routes |
| R11 commercial context | §14 and retained dated metrics |
| R12 reception | §15: original criticism and direct contrasting testimony |
| R13 inspiration/limits | §16 and labeled interpretation throughout |
| R14 sources/preservation | This section and annotated evidence below |

**Per-game preservation:** the supplied master's League/Dota section and complete existing pair chapter were compared. Their Dota-only Steam measures, 2018 re-review, mod lineage, team-dependence and overhead-view cautions remain unchanged in `games/league-of-legends-and-dota-2.md`. This dossier supplements rather than overwrites them and does not reuse League-specific mechanics as Dota evidence. Original source/review/metric/viewing registers remain intact. Packet-wide reconciliation is still a separate pending gate.

**Limits:** several community pages were only retrievable as substantive indexed text. Exact formula tables, unverified bug claims and conflicting old guide values were excluded. No personal gameplay, private account inspection, complete-video claim, representative survey or private financial audit is supplied. These limits qualify completed research; they do not turn a feature announcement into proof of actual enjoyment.

## Annotated sources

<a id="dt01"></a>**DT01 — [Dota 2 on Steam](https://store.steampowered.com/app/570/Dota_2/).** Primary roster/access/release; promotional absolutes and dynamic counts not adopted as measured outcomes.

<a id="dt02"></a>**DT02 — [PC Gamer re-review](https://www.pcgamer.com/dota-2-review/), Chris Thursten, May 24, 2018.** Original written criticism inspected. Historical subscription and queue restrictions not asserted current.

<a id="dt03"></a>**DT03 — [7.41 record](https://liquipedia.net/dota2/Version_7.41), March 24, 2026; [Valve route](https://www.dota2.com/patches/7.41).** Indexed patch reproduction; Valve's JavaScript page exposed no body. [BLAST corroboration](https://blast.tv/dota/news/facets-removed-in-dota-2-patch-741-gameplay-update) separately confirms Facet removal. No invented motive.

<a id="dt04"></a>**DT04 — [7.41f notice](https://steamcommunity.com/games/dota2/announcements/detail/677383425371407610), September 15, 2026; [archive](https://steamdb.info/patchnotes/25329722/).** Named balance release, not every later unnumbered fix.

<a id="dt05"></a>**DT05 — [Denying](https://liquipedia.net/dota2/Denying).** Indexed community mechanics; unit-specific eligibility, not unrestricted allied damage.

<a id="dt06"></a>**DT06 — [Death/buyback](https://dota2.fandom.com/wiki/Death).** Indexed recovery/cost/feedback rules. Old exceptional-ability lists not treated as current exhaustive rules.

<a id="dt07"></a>**DT07 — [Rubick abilities](https://www.dotabuff.com/heroes/rubick/abilities) and [Spell Steal](https://www.dotafire.com/dota-2/skill/spell-steal-376).** Public ability text; old comments excluded, no independently tested build.

<a id="dt08"></a>**DT08 — [Rubick mechanics](https://dota2.fandom.com/wiki/Rubick).** Indexed copying boundaries. Corrupted/old entries are not a complete compatibility guarantee.

<a id="dt09"></a>**DT09 — [Io abilities](https://www.dotabuff.com/heroes/io/abilities).** Public ability text inspected. Rescue example is constructed from rules, not a reported session.

<a id="dt10"></a>**DT10 — [Mechanics overview](https://liquipedia.net/dota2/Mechanics).** Indexed system vocabulary. Its old neutral-item paragraph is superseded by DT03/DT22, not merged into current crafting.

<a id="dt11"></a>**DT11 — [Courier](https://dota2.fandom.com/wiki/Courier).** Indexed individual delivery and failure rules; no invented courier-management telemetry.

<a id="dt12"></a>**DT12 — [Tango](https://www.dotabuff.com/items/tango) and [detailed community entry](https://dota2.fandom.com/wiki/Tango).** Tree, sharing and healing interaction. Mod-specific Dota IMBA results excluded.

<a id="dt13"></a>**DT13 — [Blink Dagger](https://www.dotabuff.com/items/blink-dagger).** Public active/cooldown description; no universal optimal purchase order.

<a id="dt14"></a>**DT14 — [Force Staff](https://www.dotabuff.com/items/force-staff).** Public orientation and exclusion rules. Forced movement is not unrestricted teleportation.

<a id="dt15"></a>**DT15 — [Black King Bar](https://www.dotabuff.com/items/black-king-bar).** Public defensive effect description; not universal invulnerability or an exhaustive dispel reference.

<a id="dt16"></a>**DT16 — [Vision](https://liquipedia.net/dota2/Vision).** Indexed terrain, invisibility and shared-information distinctions.

<a id="dt17"></a>**DT17 — [Vision changelog](https://liquipedia.net/dota2/Vision/Changelogs), 7.41c, May 6, 2026.** Specific Roshan-boundary exception; general flying-vision descriptions are qualified.

<a id="dt18"></a>**DT18 — [Observer Ward](https://www.dotabuff.com/items/observer-ward).** Public temporary vision and sharing description, not True Sight.

<a id="dt19"></a>**DT19 — [Stacking](https://liquipedia.net/dota2/Stacking).** Indexed spawn-box and timing mechanics. Worked conflict is constructed, not a recorded match.

<a id="dt20"></a>**DT20 — [Tormentor](https://liquipedia.net/dota2/Tormentor).** Indexed barrier/reflection/reward system. Old exact values and location ambiguities excluded.

<a id="dt21"></a>**DT21 — [Roshan control guide](https://bo3.gg/dota2/articles/how-pro-teams-execute-roshan-control-timing-vision-and-coordination).** Retrieved 7.41-oriented practical account; objective role, not claimed optimal team strategy or a verified reproduction.

<a id="dt22"></a>**DT22 — [Madstone](https://liquipedia.net/dota2/Madstone).** Indexed current artifact/enchantment and tier relationship, qualified by 7.41 changes.

<a id="dt23"></a>**DT23 — [7.41 developer notes archive](https://steamdb.info/patchnotes/22503275/), March 24, 2026.** Reproduced Valve text inspected; inventory feedback and Ability Draft, not an independently run client test.

<a id="dt24"></a>**DT24 — [Dueling Fates](https://www.dota2.com/duelingfates), 2017.** Primary mode, guide and ping design. Old Ranked-season/rank-badge details excluded from current claims.

<a id="dt25"></a>**DT25 — [Reborn: Custom Games](https://www.dota2.com/reborn/part2), 2015.** Primary creation workflow and example availability; not every community mode's current rules or service status.

<a id="dt26"></a>**DT26 — [New-player update archive](https://steamdb.info/patchnotes/6435447/), March 25, 2021.** Reproduced Valve onboarding announcement, explicitly historical.

<a id="dt27"></a>**DT27 — [Summer Update reporting](https://www.pcgamesn.com/dota-2/summer-update), 2023.** Contemporary report of conduct/communication changes. No exact current thresholds or proof of universal enforcement success.

<a id="dt28"></a>**DT28 — [Valve character-art guidance](https://help.steampowered.com/en/faqs/view/0688-7692-4D5A-1935).** Primary HTML guidance inspected; no claim of analyzing an unseen PDF or every cosmetic.

<a id="dt29"></a>**DT29 — [Official soundtrack](https://store.steampowered.com/app/1241930/The_Dota_2_Official_Soundtrack/).** Primary credit/track metadata. Full listening not performed.

<a id="dt30"></a>**DT30 — [Crownfall extension](https://blast.tv/dota/news/valve-extends-crownfall-event), January 2025.** Contemporary Valve-announcement reporting; old campaign end, not current availability.

<a id="dt31"></a>**DT31 — [Reborn: Source 2](https://www.dota2.com/reborn/part3), 2015.** Primary engine/tool production account. Aspirations are not evidence every future feature shipped immediately.

<a id="dt32"></a>**DT32 — [Battle Pass production shift](https://www.pcgamer.com/dota-2-is-moving-away-from-the-battle-pass-model-as-valve-says-there-are-better-uses-of-dev-time-and-most-players-never-buy-one-anyway/), Joshua Wolens, June 20, 2023.** Retrieved report/reproduction of Valve's explanation. Self-assessed improvement is not measured causal attribution.

<a id="dt33"></a>**DT33 — [Dota Plus](https://www.dota2.com/plus).** Primary subscription feature distinction. No current purchase recommendation or claim of infallible advice.

<a id="dt34"></a>**DT34 — [Metacritic player bodies](https://www.metacritic.com/game/dota-2/user-reviews/).** Named dated accounts inspected. Unsupported hidden-algorithm theories and diagnostic claims excluded; not a representative survey.
