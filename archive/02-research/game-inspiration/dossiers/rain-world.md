# G123 — Rain World

**Status: complete full-pass research dossier.** Research date: September 26, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

Rain World is most useful as a study of a world that is *not centered on the player*. The player-character is expressive and capable, but most memorable texture comes from systemic creatures, environmental pressure, partial information, and progression in which learned behavior matters at least as much as formal upgrades.

## R01 — identity, scope, editions, and player promise

**Base game.** Videocult's Rain World released on Windows and PlayStation 4 on March 28, 2017. Its central fantasy is surviving as a small "slugcat" in the ruins of an immense industrial ecosystem: travel room by room, find enough food to hibernate, reach shelter before lethal rain, learn animal behavior, and gradually discover a larger cosmological story. Akupara's current base-game page describes more than 1,600 rooms across 12 regions, limited resources, procedural creature behavior, Monk and Hunter alternatives, and up-to-four-player Arena modes. [Publisher page](https://www.akuparagames.com/game/rain-world/).

**Downpour / More Slugcats Expansion.** Rain World: Downpour released on Steam January 19, 2023. It adds five campaign protagonists—Gourmand, Artificer, Rivulet, Spearmaster and Saint—whose abilities substantially alter traversal, combat and survival. It also adds new regions and creatures plus Challenge, Expedition and Jolly Co-Op. The original Downpour store description limited Jolly to the base campaigns, but that is no longer the complete current boundary: **Watcher 1.5, released September 25, 2025, retroactively added official Jolly Co-Op support to all five More Slugcats campaigns and added Jolly support to The Watcher campaign.** This is local co-op, not a persistent online shared world. [Steam Downpour page](https://store.steampowered.com/app/1933390/Rain_World_Downpour/) · [Watcher 1.5 announcement](https://store.steampowered.com/news/posts/?appgroupname=Rain+World&appids=312520&enddate=1760029407&feed=steam_community_announcements).

**Remix.** The free Rain World Remix update accompanied the Downpour era. Videocult described it as accessibility/customization work with bug fixes, extra tutorials and individually toggleable options; this matters because launch-era reviews often criticize opacity that later players can soften without replacing the underlying simulation. [Remix announcement](https://store.steampowered.com/news/posts/?appids=312520&enddate=1666295457&feed=steam_community_announcements).

**The Watcher.** The second DLC released on PC storefronts March 28, 2025 and on major consoles September 25, 2025 according to Akupara's current page. Watcher 1.5 on September 25 added new regions, creatures/items, endings, Arena support and the broader Jolly boundary above. The 2026 patch line continued afterward: **1.11.7 (March 31, 2026)** added Watcher Safari support and extensive ripple/ecology fixes, and **1.11.8 (April 14, 2026)** fixed Watcher ending/region/key-item and Expedition issues. September 2026 announcements are merchandising/community news rather than a newer gameplay patch in the inspected official stream. The publisher advertises more than 2,500 screens across 30 new/updated regions and 27 bespoke creatures; a September 2025 Unity interview describes 25 new creatures, so those dated scope descriptions remain explicitly unreconciled rather than averaged into an invented exact count. [Watcher page](https://www.akuparagames.com/game/rain-world-the-watcher/) · [Steam announcement stream](https://store.steampowered.com/oldnews/?appgroupname=Rain+World&appids=312520&feed=steam_community_announcements&headlines=1) · [Unity interview](https://unity.com/blog/exploring-procedural-design-rain-world).

**Player promise.** First-session play is intentionally vulnerable: move, jump, climb poles, pick up and throw objects, hunt small prey, hide, and follow minimal directional nudges. Established play is dramatically richer because players learn hidden movement, predator tells, social behavior, room topology, item functions and routes. Player knowledge becomes progression even when the avatar's base verbs barely change.

## R02 — player actions and major mechanics

### Traversal and movement

The basic vocabulary is small—crawl, run, jump/pounce, climb poles, squeeze through pipes, swim, grab, carry and throw—but its physics permit a larger advanced vocabulary. Players learn momentum-preserving slides, rolls, backflips, longer pounces and other minimally tutorialized techniques. Reviewers repeatedly disagree on whether this opacity creates rewarding embodiment or needless friction.

Spear use crosses combat and traversal. A thrown spear can kill or distract, but some surfaces also allow a spear to become a temporary climbing foothold. The same object changes geometry as well as threat state.

### Food, hibernation, cycles and rain

Most campaigns divide play into cycles. The player gathers a required amount of food, reaches a shelter, and hibernates to save progress. Waiting too long exposes the player to cycle-ending rain, which escalates from warning to overwhelming environmental lethality. Food therefore performs three jobs at once: survival resource, save admission cost and route-planning pressure.

A player with enough food may still explore farther, but every extra room consumes time and increases the chance of failing to return to shelter. The result is not merely a timer; it is a pressure field making map knowledge, creature knowledge and resource knowledge interact.

### Karma, gates and failure

Successful hibernation generally raises karma and death lowers it. Region gates display a required karma symbol. Repeated deaths can block immediate onward travel even after the player physically reaches a gate, while several successful cycles can restore access. The system gives survival meaning but can turn exploration failure into repetition; GameSpot and Nintendo World Report identify precisely that tension.

Death usually returns the slugcat to its last hibernation shelter rather than permanently removing the campaign. Lost time, lost carried objects, reduced karma and changed creature circumstances make a failed excursion consequential.

### Combat, evasion and ecological manipulation

Rain World is not built around clearing rooms. The player can throw rocks to stun or flip some creatures, stab with spears, use explosives and exploit terrain, but running, hiding, baiting one predator into another, or waiting are equally legitimate. A vulture may interrupt a lizard chase; a predator distracted by prey may open a route; scavengers may help or endanger the slugcat.

The player is often choosing among **fight, flee, redirect, bribe, wait, hide, or reroute**, not merely choosing which attack to execute.

### Stealth, concealment and perception

Rain World has no universal crouch-stealth skill or detection meter, but concealment is still a real systemic verb. Pipes, darkness, room geometry, distance and creature attention can break pursuit or let the slugcat wait for a safer route. Creature AI explicitly tracks threats, prey, friends and discomfort rather than treating the player as an always-known target. The Watcher extends this more directly with camouflage/ripple abilities described by the developers, making concealment an avatar capability in addition to ordinary hiding and route manipulation. The important boundary is that stealth emerges through creature perception and world geometry, not a generic RPG stealth statistic. [Unity interview](https://unity.com/blog/exploring-procedural-design-rain-world).

### Downpour bodies are authored playstyles, not a class tree

Downpour's five slugcats are separate campaign bodies with different verbs and constraints, not classes chosen from a shared character creator:

- **Rivulet** is built around speed, swimming and extended underwater breathing.
- **Gourmand** is heavier and object-focused. The developers describe an explicit **crafting mechanic** added after playtesting showed that Gourmand's original random stomach-item ability was too uncontrollable; crafting lets otherwise poor pulls be repurposed into more useful objects.
- **Artificer** is a combat-oriented pyrotechnics/explosives specialist.
- **Spearmaster** has no mouth and produces needle-like spears from its body for combat/feeding.
- **Saint** forgoes ordinary weapon use and instead uses a long tongue to grip distant objects/platforms.

These are campaign-specific identities with authored stories/world states; they are not a permanent skill tree layered onto Survivor. [Downpour Steam page](https://store.steampowered.com/app/1933390/Rain_World_Downpour/) · [Game Developer Downpour interview](https://www.gamedeveloper.com/design/channeling-the-calm-and-the-co-op-in-rain-world-downpour).

### Modes

Base Arena provides competitive and sandbox play for up to four local players. Downpour adds Challenge, Expedition and Jolly Co-Op. Expedition randomizes context and assigns challenge goals; Challenge uses fixed test scenarios. Jolly's original base-campaign scope was expanded by Watcher 1.5 to the five More Slugcats campaigns and The Watcher campaign. These modes reuse the creature/world grammar under different goals rather than becoming a separate online progression game.

### Useful absences and equivalents

Base Rain World has no blank-slate character creator, attribute allocation, conventional level/perk tree or equipment paper doll. Downpour's bodies supply different authored capabilities instead. Gourmand has real crafting, but crafting is **not** a universal base-game progression profession shared by every slugcat.

There is also no conventional loot-rarity treadmill: food, spears, rocks, pearls, masks and other objects matter because of immediate affordances, social value and survival context. Rewards are often knowledge, route access, karma/passages, narrative discovery or a useful carried object rather than tiered drops.

Scavenger reputation creates a substantial social relationship, but the player does not join and manage a general political-faction/territory system. There is no romance layer or settlement/base-building loop. Shelter use is survival infrastructure the player finds rather than construction they own. Supernatural/campaign abilities exist, especially in later bodies, but Rain World has no general spellbook/mana-school system.

## R03 — items, entities, and composition

Rain World has no conventional equipment paper doll. Its "inventory" is embodied: the slugcat holds objects in its hands, can swallow/store certain small objects, and campaign variants modify carrying. That scarcity makes each held object a commitment.

Important families include:

- **Spears:** offense, deterrence and occasional traversal anchors; variants include explosive/electric or campaign-specific forms.
- **Rocks/debris:** cheap stun/interrupt tools whose value often comes from opening a spear hit or escape.
- **Pearls:** portable objects with social/economic and lore significance; scavengers value them and story characters can interpret some colored pearls.
- **Food objects and prey:** batflies, fruits and other organisms feed protagonists differently.
- **Light sources:** lanterns and luminous organisms trade a hand slot for safer navigation in darkness.
- **Temporary-state utility:** mushrooms and mobility/survival organisms can change traversal decisions.
- **Vulture masks:** carried trophies that influence some predator behavior.
- **Explosives and specialist tools:** powerful, situational and dangerous around allies.

Composition comes from situation, not stat stacking. A rock plus spear is stronger than either alone in many encounters because the rock creates an opening; a pearl may be more valuable than a weapon near a toll; a light source may justify sacrificing offense in darkness.

## R04 — progression, economy, and time

### Knowledge progression

Rain World has unusually little conventional vertical progression in its base form. The greatest persistent gains are the player's mental models: route memory, shelter locations, creature tells, item uses, movement techniques and social rules. Repeated travel can be materially different while avatar numbers remain unchanged.

### Karma and passages

Karma is short-cycle progression tied to surviving and moving through gates. Passage achievements provide longer-form milestones associated with behavior patterns and, in applicable versions/campaigns, travel utility. Campaign-specific rules matter: Hunter has different passage constraints and a harsher time structure than Survivor/Monk.

### Economy without coins

There is no universal currency economy. Scavengers create a social/object economy: they assign object values, accept toll payment, trade goods, remember treatment and respond to theft. The official community wiki documents global/regional and individual reputation variation; sufficient reputation can produce protection and toll privileges, while sustained hostility can produce kill squads. [Scavenger reference](https://rainworld.miraheze.org/wiki/Scavenger).

### Early, middle and late purpose

Early play is about food, shelters and a survivable route. Midgame broadens into region traversal, world cues and contact with major entities. Late play becomes more explicitly narrative/cosmological. Downpour and The Watcher extend return loops by giving players new bodies, rules and world states instead of simply raising a level cap.

## R05 — worked interactions and concrete situations

These are rules-based illustrations unless explicitly attributed.

### Case 1 — risk another room or bank the cycle
**Intention:** explore beyond a known shelter. **Conditions:** enough food to hibernate; rain timer advancing. **Actions:** leave the safe route and inspect an unfamiliar branch. **Interaction:** a predator delays traversal until rain is dominant. **Result:** push forward hoping for shelter or retreat and bank the cycle. **Lesson:** curiosity is priced against survival without an explicit quest timer.

### Case 2 — rock, spear, escape
**Intention:** pass a lizard guarding a narrow route. **Conditions:** carry rock and spear. **Actions:** throw the rock first to disrupt/flip/stun, then spear or run. **Interaction:** item order changes the encounter. **Result:** two mundane objects create a tactical combo. **Limit:** bad geometry or a third creature can invalidate it.

### Case 3 — predator versus predator
**Intention:** cross a room without fighting a pursuing lizard. **Conditions:** another large creature enters or can be attracted. **Actions:** reposition so threats notice one another. **Interaction:** AI relationships redirect attention. **Result:** escape while the ecosystem resolves its own conflict. **Limit:** the second predator may choose the slugcat. A 2017 creator interview explicitly accepts autonomous interactions can create unwinnable states. [Creator interview](https://www.gamedeveloper.com/design/crafting-the-complex-chaotic-ecosystem-of-i-rain-world-i-).

### Case 4 — pay a scavenger toll
**Intention:** cross peacefully. **Conditions:** neutral enough relations and valuable object such as a pearl. **Actions:** approach non-aggressively and relinquish payment. **Interaction:** scavengers evaluate offering and social history. **Result:** passage opens and reputation can improve. **Tradeoff:** immediate route access consumes an object with other uses.

### Case 5 — friendship becomes battlefield chaos
**Intention:** benefit from friendly scavengers. **Conditions:** high enough reputation. **Actions:** travel with/near allies while predator approaches. **Interaction:** scavengers attack. **Result:** they may save the player. **Counterexample:** crossfire, explosives or body-blocking can kill or trap the slugcat; the community reference explicitly notes that friendly groups can hinder or kill the player.

### Case 6 — spear as geometry
**Intention:** reach a ledge outside ordinary jump height. **Conditions:** suitable surface and spear. **Actions:** throw spear into wall and use it as foothold. **Interaction:** weapon becomes terrain. **Result:** a carried object creates a route. **Limit:** it is no longer immediately available as a weapon.

### Case 7 — learn rather than unlock
**Intention:** cross a familiar region reliably. **Conditions:** no new avatar upgrade. **Actions:** apply learned predator tells, movement and shelter knowledge. **Interaction:** identical nominal capabilities produce a different practical outcome. **Result:** mastery becomes progression without stat gain.

### Case 8 — Downpour body changes world grammar
**Intention:** revisit familiar geography as a new slugcat. **Conditions:** a Downpour campaign such as Artificer, Rivulet or Saint. **Actions:** use protagonist-specific mobility/combat. **Interaction:** old rooms gain new affordances and threats reweight. **Result:** replay value comes from changing the body's verbs as well as content. **Limit:** campaign/story/world-state differences mean this is not simply New Game+.

## R06 — people, creature AI, relationships, and multiplayer

The September 2025 Unity developer interview describes creature relationship tables and modular AI including **PreyTracker, ThreatTracker, FriendTracker, ItemTracker, DenFinder and DiscomfortTracker**. Creatures can prioritize prey, danger, friends, objects, dens or aversive spaces, producing behavior that is locally understandable but globally unpredictable. [Unity interview](https://unity.com/blog/exploring-procedural-design-rain-world).

The ecosystem is not a literal unconstrained food-chain simulation in every room. The 2017 creator account describes authored terrain, room attractiveness and deliberate constraints alongside self-directed actors. "Emergent" means actors have enough independent priorities to produce unscripted outcomes, not that design disappears.

**Scavengers** are the richest social example. They communicate through body language, trade, guard tolls, form group judgments and retain reputation. High standing can lead to following/protection and free-toll treatment; hostility can lead to attacks and kill squads. Individual variation prevents reputation from collapsing every encounter into a binary faction flag.

Players can also discover forms of creature trust/taming with some species, most famously lizards, through repeated beneficial interactions. The useful pattern is repeated behavior changing a creature relationship without a dialogue menu.

**Multiplayer is local, mode-specific and version-dependent.** Base Arena is competitive/sandbox. Downpour originally described Jolly Co-Op for base campaigns; Watcher 1.5 later added official Jolly support to all five More Slugcats campaigns and The Watcher campaign. This is still local cooperative campaign play, not conventional persistent online multiplayer.

## R07 — art, audio, interface, and feel

Rain World combines low-resolution/pixel-art presentation with highly fluid procedural animation. Joar Jakobsson's early concept was a character able to tumble, crawl and move as an animal rather than an upright platform avatar. A 2018 developer interview says the game is C# in a custom engine layer inside Unity, with custom level/visual/audio tools—direct production evidence, not reverse engineering. [IGF interview](https://www.gamedeveloper.com/business/road-to-the-igf-videocult-s-i-rain-world-i-).

Silhouettes and color make many creatures readable at distance, but the game withholds rule explanation. Environmental readability can be strong while rule readability remains deliberately weak.

Audio reinforces ecology. James Therrien describes regional **Threat Music** built from multiple layers that fade in as danger increases. Rain itself uses intensifying rain layers plus distorted/gritty elements and pitched organ-like material so weather becomes an audible existential threat. [IGF audio interview](https://www.gamedeveloper.com/business/road-to-the-igf-videocult-s-i-rain-world-i-).

Remix matters because it acknowledges original opacity/friction was not untouchable. Loading tips, tutorials and configurable assists preserve the ecosystem while reducing particular pain points.

## R08 — story, narrative, and play

**Spoiler-light framing:** the slugcat is separated from family and travels ruins of a civilization that is largely absent. Story initially arrives as architecture, symbols, strange machinery and encounters whose significance is unclear.

**Major spoilers:** the animal-survival story sits inside a civilization obsessed with escaping cycles of death and rebirth. The ancient Iterators—including Five Pebbles and Looks to the Moon—are vast artificial intelligences/structures central to both physical world and cosmology. Contact with them reframes rain, infrastructure and the journey.

Discovery is embodied: players cross dangerous systems before learning what those systems mean. Colored pearls, ruins and iterator dialogue convert carried objects and places into history. Downpour's protagonist-specific campaigns further attach different mechanics to different chronological world states.

The weakness is the same mechanism: players unwilling to decode routes, karma gates, hidden interactions or sparse guidance may experience the story as inaccessible rather than mysterious.

## R09 — production and development

Rain World began as Joar Jakobsson's experimental work around 2011 and developed for roughly six years before release. The slugcat emerged from an animation/physics experiment rather than a conventional character pitch. Jakobsson and James Therrien/James Primate describe a small-team process in which custom tools, procedural animation and adaptive audio were deeply entangled with design. [2018 creator interview](https://www.gamedeveloper.com/business/road-to-the-igf-videocult-s-i-rain-world-i-).

The 2014 Kickstarter asked for $25,000 and raised **$63,255 from 3,030 backers**. Its pitch already foregrounded alien ruins, survival, deadly rain and a closed ecosystem. [Kickstarter](https://www.kickstarter.com/projects/rain-world/project-rain-world).

Later development is unusually shaped by community/mod lineage. Downpour formalized and expanded work associated with the More Slugcats community project. A 2023 Game Developer interview explains that new slugcat abilities evolved over years and that the team deliberately added calmer ways to experience the flora/fauna. [Downpour interview](https://www.gamedeveloper.com/design/channeling-the-calm-and-the-co-op-in-rain-world-downpour).

The Watcher continued the long-tail model with new ecology, world rules and campaign material rather than replacing the original game.

## R10 — marketing, distribution, promotion, and virality

The 2014 Kickstarter was both financing and audience formation. Development footage—especially procedural animation and strange creature behavior—was naturally shareable because short clips communicated novelty without explaining the plot.

The original released through Adult Swim Games; later ports/support involve Akupara. Current Akupara pages list Steam, PlayStation, Switch, Xbox and additional PC storefront routes, with dates varying by platform/region. [Publisher page](https://www.akuparagames.com/game/rain-world/).

Downpour created a documented long-tail release event: an existing cult audience, community expertise, new characters, co-op, new regions and free Remix changes gave old owners reasons to return while making onboarding more configurable. It is reasonable to call that an expansion-driven revival; attributing precise acquisition to any one channel would be speculation.

The Watcher repeated the event model with PC launch in March 2025 followed by console release/content updates in September 2025.

## R11 — commercial and participation context

The strongest primary financing milestone is the Kickstarter: $63,255 from 3,030 backers against a $25,000 goal.

Reliable public lifetime revenue/profit totals were not found in primary sources read here. Third-party trackers estimate Steam ownership/revenue, but those are modeled figures and are not presented as official results.

Steam participation shows a meaningful Downpour-era increase. Steam Charts records average concurrent players rising from roughly 264 in December 2022 to roughly 1,472 in January 2023 and 1,944 in February 2023. These are **concurrent-player observations, not sales**. [Steam Charts](https://steamcharts.com/app/312520).

The model is premium base game plus paid expansions, alongside free baseline improvements such as Remix.

## R12 — reviews and player feedback

### Five read independent written reviews

**Shaun Prescott — PC Gamer, March 27, 2017; Windows.** Prescott finds the industrial world and hard-earned survival unforgettable for a patient audience. He sees some awkwardness as consistent with vulnerability but still identifies frustrating movement and repeated setbacks. His review's launch-era "no multiplayer" metadata does not describe later editions. [Review](https://www.pcgamer.com/rain-world-review/).

**Miguel Concepcion — GameSpot, 2017; PS4.** Concepcion appreciates improvisation—predators against one another, spear as climbing point, luminous wildlife as utility—but finds hibernation/karma repetition undermines exploration. His criticism combines platforming, boundary readability and repeated time loss rather than merely rejecting difficulty. [Review](https://www.gamespot.com/reviews/rain-world-review/1900-6416648/).

**Jonathan Holmes — Destructoid, December 20, 2018; Switch.** Holmes finds the revised game compelling after earlier negative launch coverage. He values movement mastery, observation and creatures that do not exist solely to attack the player, while noting unpredictable losses and slowdown in crowded optional modes. That 2018 performance report is not a current-build benchmark. [Report](https://www.destructoid.com/switch-port-report-rain-world/).

**Matthew Olivo — Nintendo World Report, January 17, 2019; Switch.** Olivo praises melancholy art and roaming enemies but experiences traversal as punitive when a failed input erases long travel. His central conflict is wanting to see more while distrusting the platforming. [Review](https://www.nintendoworldreport.com/review/49394/rain-world-switch-review).

**Nathanial Eker — Nintendo Life, republished August 22, 2024; Switch mini-review.** Eker praises wordless art/music and discovery while warning about random-seeming difficulty spikes, repetition and required patience. The page republishes earlier Nindie Round Up impressions; it is not evidence of fresh 2024 testing. [Mini-review](https://www.nintendolife.com/reviews/switch-eshop/rain-world).

### Steam helpful/player sampling

A current helpful positive account praises simple controls, deep hidden movement, complex AI relationships, open exploration and rain pressure while noting scavenger congestion and one gravity section as annoyances. [Current community page](https://steamcommunity.com/app/312520).

A September 2026 negative review says the art, music and world are excellent but finds one-shot danger, off-screen threats, poorly explained mechanics and karma gating too frustrating for a blind first playthrough. Another current negative-rated account reports that sparse story/direction failed to create enjoyment. [Current reviews](https://steamcommunity.com/app/312520/reviews/).

The all-time helpful surface includes players describing an initial period of frustration before community help, Remix assists or mastery changed their experience. [All-time helpful](https://steamcommunity.com/app/312520/reviews/?browsefilter=toprated&l=english&p=1).

**Sampling limit:** these are qualitative visible samples chosen by Steam's surfaces, not random sampling or prevalence estimates. Present-day displayed playtime is not assumed to be playtime at original posting unless Steam explicitly states it.

### Synthesis

Supporters experience opacity as ecological learning, vulnerability and discovery. Detractors experience the same opacity as clunky controls, insufficient teaching and punishment disconnected from informed choice. Both groups often praise art/world; later Remix/Downpour options mean launch criticism should not be flattened into a claim about every current configuration.

## R13 — transferable inspiration and limits

1. **Let the world pursue its own goals.** Predators can be hungry, frightened, distracted or interested in something other than the player.
2. **Let social systems be enacted.** Scavenger reputation changes tolls, body language, trading and combat support.
3. **Use one object across systems.** Spears bridge combat/traversal; pearls bridge lore/trade/route access.
4. **Make knowledge a progression axis.** Players can become dramatically more capable without numeric upgrades.
5. **Tie environmental pressure to route choice.** Rain turns exploration into a temporal decision without quest pop-ups.
6. **Let systemic danger generate stories.** A memorable unit is often what three creatures did in one room, not a cutscene.
7. **Refresh simulation by changing bodies.** Downpour changes the avatar's verbs, making old geometry newly legible.

**Limits:** autonomy can create unwinnable or unreadable states; sparse teaching selects for experimentation or external lookup; runbacks plus karma loss compound frustration; rich AI needs readable posture/sound/spatial feedback; co-op can add congestion; Rain World's punishment works because vulnerability is core to its premise.

The transferable principle is not "make everything brutally hard." It is **give entities independent motives, expose enough signals for learning, and let player knowledge turn apparent chaos into legible ecology**.

## R14 — sources, preservation, navigation, and requirement map

### Primary/developer/storefront sources read
- [Akupara — Rain World](https://www.akuparagames.com/game/rain-world/) — current product/port scope; promotional.
- [Steam — Downpour](https://store.steampowered.com/app/1933390/Rain_World_Downpour/) — expansion protagonists and modes.
- [Akupara — The Watcher](https://www.akuparagames.com/game/rain-world-the-watcher/) — current dates and advertised scope.
- [Steam Community Announcements — Rain World](https://store.steampowered.com/oldnews/?appgroupname=Rain+World&appids=312520&feed=steam_community_announcements&headlines=1) — primary current update chronology inspected in the September 27 audit: Watcher 1.5 co-op/content expansion, 1.11.7 and 1.11.8 patches, and no later gameplay patch in the visible 2026 stream.
- [Akupara — Watcher PC launch](https://www.akuparagames.com/2025/03/28/rain-world-the-watcher-out-now-on-pc/) — March 28, 2025 PC launch.
- [Akupara — Watcher consoles](https://www.akuparagames.com/2025/09/11/the-watcher-releases-on-consoles-on-september-25th/) — September 25, 2025 console announcement/update.
- [Unity developer interview, 2025](https://unity.com/blog/exploring-procedural-design-rain-world) — modular creature AI and Watcher production; its 25-creature statement differs from current publisher's 27.
- [Game Developer — ecosystem interview](https://www.gamedeveloper.com/design/crafting-the-complex-chaotic-ecosystem-of-i-rain-world-i-) — autonomy, terrain mediation, unwinnable outcomes.
- [Game Developer — IGF interview](https://www.gamedeveloper.com/business/road-to-the-igf-videocult-s-i-rain-world-i-) — origins, tooling, audio and development duration.
- [Game Developer — Downpour interview](https://www.gamedeveloper.com/design/channeling-the-calm-and-the-co-op-in-rain-world-downpour) — expansion design, calmer modes and direct developer account of Gourmand's crafting redesign after playtesting.
- [Steam — Downpour](https://store.steampowered.com/app/1933390/Rain_World_Downpour/) — official/storefront descriptions of the five campaign bodies and their high-level ability identities.
- [Steam — Remix announcement](https://store.steampowered.com/news/posts/?appids=312520&enddate=1666295457&feed=steam_community_announcements) — accessibility/customization/tutorial intent.
- [Kickstarter](https://www.kickstarter.com/projects/rain-world/project-rain-world) — funding and original pitch.

### Community/participation sources read
- [Official Rain World Wiki — Scavenger](https://rainworld.miraheze.org/wiki/Scavenger) — community-maintained mechanics reference for reputation/trading.
- [Steam Charts](https://steamcharts.com/app/312520) — third-party concurrency history; not sales.
- [Steam current reviews](https://steamcommunity.com/app/312520/reviews/) and [all-time helpful](https://steamcommunity.com/app/312520/reviews/?browsefilter=toprated&l=english&p=1) — qualitative player sampling only.

### Critical sources read
Five independent review bodies summarized in R12 were read substantively: PC Gamer, GameSpot, Destructoid, Nintendo World Report and Nintendo Life. Store blurbs were not counted as criticism.

### Viewing routes
Developer pages link videos/GDC material about animation and audio. They are useful follow-up routes, but this dossier does **not** claim footage was watched or transcribed where the written page supplied the evidence.

### Preservation check
G123 is newly curated in the G111–G130 expansion. Direct path checks found no dedicated inherited Rain World game chapter or mechanics study on this branch. This dossier therefore does not supersede a prior Rain World owner. Existing packet/cross-game owners remain unchanged. The separate packet-wide P01–P05 audit remains pending.

### Requirement map

| Requirement | Coverage |
| --- | --- |
| R01 | Base/Downpour/Remix/Watcher identity and boundaries |
| R02 | Traversal, cycles, karma, combat/evasion, stealth/perception, Downpour body verbs, modes and useful absences |
| R03 | Objects, carrying, Gourmand crafting and non-loot-treadmill composition |
| R04 | Knowledge, karma/passages, reputation economy and return loops |
| R05 | Eight worked interactions |
| R06 | Modular creature AI, reputation/taming and multiplayer |
| R07 | Procedural animation, readability, threat audio, assists |
| R08 | Environmental/iterator narrative tied to exploration |
| R09 | Origins, tooling, Kickstarter and expansion lineage |
| R10 | Crowdfunding, distribution, expansion-driven long tail |
| R11 | Financing/concurrency evidence and limits |
| R12 | Five written reviews plus Steam positive/negative samples |
| R13 | Transferable patterns and failure modes |
| R14 | Annotated sources, evidence limits, preservation and map |

**Completion review:** R01–R14 are substantively covered; current product/expansion boundaries are separated; eight worked situations are present; five independent written reviews and current Steam positive/negative samples were read; production claims use direct evidence where available; modeled commercial estimates are not presented as audited sales; no prior Rain World owner was overwritten; unwatched video is not represented as inspected.
