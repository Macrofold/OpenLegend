# G59 — Pathfinder: Wrath of the Righteous

**Original R01–R14 research September 26, 2026; identified path/battle gaps addressed September 27.** [Roster](../research-roster.md) · [Progress and resume ledger](../research-progress.md) · [Requirements](../research-requirements.md) · [Library](../README.md) · [Mythic paths and crusade battles](../mechanics/wrath-mythic-paths-and-crusade-battles.md).

Research, not an OpenLegend implementation proposal. Historical observations, shipped rules, publisher promises and this dossier's interpretations are distinguished below. Mechanics are scoped to the unmodded computer game and its identified additions, not automatically to tabletop Pathfinder, Kingmaker or every console patch. Story/path spoilers appear in §§3–6 and the worked situations.

## 1. Identity, promise and preservation

Owlcat's single-player party CRPG adapts Pathfinder First Edition and the Worldwound crusade setting. PC release was September 2, 2021. The player moves from the disaster in Kenabres into the role of Knight Commander, developing an ordinary class build alongside extraordinary mythic identity. The store emphasizes character options, consequential choices, companions and commanding armies. Steam Cloud or remote-play support is not cooperative multiplayer. [S01]

**Interpretation:** the unusual promise is not merely “become stronger.” It is “become a different kind of being, and make that change matter to friends, institutions and the campaign.” This creates two tests for the design: whether character construction supports the imagined identity, and whether the authored world notices it. A mathematically powerful build and a satisfying role-play are related but not identical outcomes.

This is an independent sequel study. The target dossier and same-named legacy `games/` chapter were absent at the G59 resume point. The [Kingmaker dossier](pathfinder-kingmaker.md), existing chapters, thematic studies, sources and fork-baseline evidence remain unchanged by this dossier's creation. This document incorporates the earlier G59 checkpoint, including its specific reception examples and edition corrections; it does not replace unique pre-existing research with a short summary. The later [operational supplement](../mechanics/wrath-mythic-paths-and-crusade-battles.md) extends the audited path and battle explanations while preserving the original ten cases, six expansions and review evidence below.

## 2. Release and edition boundaries

| Boundary | What it actually changes | Research caution |
| --- | --- | --- |
| Original PC release, September 2, 2021 | Base campaign with native real-time-with-pause and turn-based presentation. | Launch reviews are not tests of every later patch. [S01; C01] |
| Enhanced Edition, September 29, 2022 | Free PC update; console release included the Enhanced edition. PC additions included controller support, inventory search, improved combat log, pet UI, appearance customization, photo mode and expanded late-path/epilogue material. | This was not a new edition first released in 2026. Nintendo Switch was explicitly a cloud-streaming version. The announcement's temporary discounts and future console-photo-mode promise are not current availability guarantees. [S02] |
| PS4/PS5 storefront listing | The inspected US listing identifies both platforms and gives March 28, 2024 as its release date. | Do not turn that combined listing into a claim that the original PS4 game first released in 2024, or resolve all regional date differences from it. [S10] |
| Paid additions, 2022–2024 | Six substantially different expansions, treated separately in §6. | Base-game class counts and early reviews predate later archetypes and the Shifter class. [D01–D06] |
| Late content and maintenance | November 18, 2024 update 2.5.0y revised Gold Dragon mechanics, visuals, religions and redemption opportunities. May 15, 2025 update 2.7.0x fixed a specific Dance of Masks progression blocker associated with Ember's quest outcome. | These are dated patch milestones, not a fresh playtest or an assertion that no later update can exist. Official Steam article bodies were not exposed by the browser; their release-note text was inspected through SteamDB mirrors. [S08–S09] |

The inspected Steam page also offers a Game of the Year bundle. Bundle labels and cosmetic/free additions must not be confused with seven new campaigns: the actual six premium additions have their own scopes below. Existing free Faces of War, Love Beyond Death, Paint of War and A Visitor from Distant Lands were included in the 2022 console announcement. [S01–S02]

## 3. Character construction and mythic identity

### 3.1 Ordinary advancement

Creation combines ancestry/heritage, background, appearance, deity/alignment, ability scores and class/archetype choices. Strength, Dexterity, Constitution, Intelligence, Wisdom and Charisma feed different combat and skill roles. Character level is not class level: experience from encounters, quests and skill use advances a character who can distribute levels among classes. Normal advancement caps at 20; multiclassing can delay the defining features of a chosen class. [M02]

The base store's advertised 25 classes and 12 races describe its marketing baseline, not an immutable all-DLC total. Later additions expand the selection. Fighter, Rogue, Wizard, Cleric, Paladin, Ranger and their more specialized counterparts are not interchangeable labels: their progression, equipment access, spells and prerequisites produce different opportunities. Archetypes trade features rather than merely adding a cosmetic subclass name. [S01; M02]

**Interpretation:** this is a dependency graph presented as a sequence of choices. Early freedom is meaningful only when the player can understand delayed costs. A tempting single-level detour can be a clever composition or postpone the capability the character was meant to have. The design question is therefore not “How many classes?” but “Can a player predict what this combination will actually do?”

### 3.2 Feats, prerequisites and coordination

Feats create both individual and shared dependencies. Precise Shot addresses the penalty for ranged attacks into melee. Outflank requires sufficient base attack bonus and compatible allies: when two holders flank a creature, their improved attack bonus and critical-triggered opportunity attack reward coordinated investment. Animal-companion intelligence and feat prerequisites also matter; a pet is not simply an extra unconfigurable damage number. [M03]

**Interpretation:** teamwork creates party-level builds. Its attraction is that two familiar people become better together. Its cost is that replacing a companion can break more than the visible role slot. A UI that shows only individual damage obscures the value of the relationship between builds.

### 3.3 Mythic progression is a separate clock

Mythic ranks arrive at authored story milestones rather than from ordinary grinding. The initial ranks do not themselves irrevocably select the later path; rank 3 commits to an available early path. Angel and Demon are automatically available there, while Aeon, Azata, Lich and Trickster require unlocking. Later choices and transformations have their own prerequisites. The guide's recommended character levels at these milestones are not mandatory level gates. [M05]

| Path family | Distinctive fantasy and gameplay relationship |
| --- | --- |
| Angel | Celestial protection and command; compatible full divine casters can merge spellbooks, while an unmerged Angel remains possible. [S11; M12] |
| Demon | Rage and abyssal power rather than merely a different colored holy spell. [S11] |
| Azata | Freedom, restoration and the dragon companion Aivu; the companion also provides social recognition of the transformation. [S11; C02] |
| Aeon | Cosmic adjudication and interventions in the timeline; “law” has authored consequences beyond a dialogue label. [S11] |
| Lich | Necromancy and an undead transformation that can replace ordinary companions with undead followers. [S11] |
| Trickster | Rule-bending and comic disruption; its tone can delight or clash with the war story. [S11; C01] |
| Gold Dragon | A late transformation concerned with power and redemption; use the 2024 revision boundary rather than assuming the launch implementation stayed fixed. [S08] |
| Legend | Renounces much of mythic progression in exchange for extraordinary mortal development, raising the character cap to 40; individual classes still have their own caps. [M06] |
| Devil | A conditional late route from Aeon or Azata, not an equally available starting option. Moving from Azata also loses Aivu. [M06] |
| Swarm That Walks | A late, isolating route that loses companions and grows through consumption; clones are not the return of the previous social party. [M06] |

**Interpretation:** “ten paths” does not mean ten equally long parallel games. Some reshape much of the campaign, some transform its final stretch, and some exchange relationships for power. Comparing only the number of exclusive abilities conceals those very different costs. A late identity should also be evaluated by how much meaningful time remains to inhabit it.

**Operational extension:** [supplement §1](../mechanics/wrath-mythic-paths-and-crusade-battles.md#1-early-paths-change-the-activity-not-just-its-name) explains Demonic Rage/Charge/aspects, Aeon gazes and Bane, Azata superpowers/Aivu, Trickster's tiered skill exceptions, and Lich powers/skeleton/repertoire. It supplies the audited gap between the fantasy labels above and the actions those paths actually change. The existing Angel and late-path distinctions remain substantive owners, not replaced by another count of path names.

### 3.4 Magic is layered rather than a single damage contest

Wizard spell access depends on Intelligence, spellbook progression and preparation; a spell level is not a character level. Prepared resources make advance information valuable. School specialization and archetypes further change access and tradeoffs. [M11]

Angel's merged/unmerged distinction changes the timing and organization of spell access. Its repertoire includes protection, condition relief and direct offense, so class/path synergy can change encounter preparation rather than merely improve damage. [M12]

Ascendant Element bypasses the selected damage type's resistance or immunity. That is a specific exception, not a promise to defeat every defense: attack resolution, saving throws and spell resistance are separate questions. [M05; M01]

**Interpretation:** apparent failure needs a causal explanation. “The spell did nothing” can mean the attack missed, a resistance check failed, the target resisted a status or damage was absorbed. Build repair is far less frustrating when these failure types are visible separately.

## 4. Full action and system inventory

This is a coverage inventory of substantive action families, not a reproduction of every spell description or an optimal-build guide. Sources give lookup depth; examples in §7 show their intersections.

| Action family | Inputs, decisions and resulting state | Constraint or friction |
| --- | --- | --- |
| Inspect, position, attack, cast | Select units, read the combat log, choose targets and spend the available action types. Standard, move, swift and full-round actions have different costs; staying in position can preserve a full attack. | Real time changes the control rhythm, not the underlying rules. A high displayed damage number does not explain whether an attack connects. [M01] |
| Switch combat presentation | Use native RTwP for flow or turn-based control for precise sequencing, including changing mode during a fight. | Reviewers found this useful, but repetitive encounters can remain repetitive in either mode. [C01; C04] |
| Build defensive coverage | Ordinary, touch and flat-footed defenses answer different threats; spells, equipment and positioning contribute differently. | Most same-type bonuses do not stack. More status icons need not mean more actual protection. [M01] |
| Coordinate party attacks | Teamwork feats, ranged-into-melee penalties and opportunity attacks make ally placement and build compatibility matter. | Synergy must be acquired by the relevant participants; it is not a universal adjacency bonus. [M03] |
| Learn and prepare magic | Choose spells, prepare appropriate resources, then decide between damage, disabling, protection and recovery. | Class, spell level, daily resources and target defenses remain distinct restrictions. [M11–M12] |
| Equip, trade and loot | Compare proficiency, physical damage type, reach/range, handedness, critical properties and magical effects; use potions, scrolls, wands and charged items. | A weapon's largest printed damage die is not enough to establish suitability. Carrying a specialized item does not grant proficiency. [M04] |
| Develop persistent named equipment | Finnean is a talking item that can assume usable weapon forms and gains upgrades through his story; Radiance also has staged development. | Quest progression and identity matter alongside loot replacement. Finnean is not an arbitrary weapon-enchantment editor. [M04] |
| Apply exploration skills | Athletics and Mobility handle authored obstacles; Trickery handles locks/traps; Perception detects; knowledge/lore interpret; Persuasion and Use Magic Device support different interactions. | Skill coverage is a party-composition problem. These checks are not unrestricted physics or a free-form natural-language action system. [M02] |
| Scout and conceal | Stealth supports approaches and camp concealment; Perception and encounter inspection reveal dangers. | Concealment is conditional, not guaranteed invisibility or a complete alternate campaign avoiding combat. [M10] |
| Rest and recover | Assign protective rituals, camouflage and watches; recover resources while time advances. Field resting accumulates Abyssal corruption; sanctified rest or appropriate relics can clear it. | Recovering spell resources has a strategic cost; elapsed days may also matter to events. [M10] |
| Cook and craft consumables | Recipes/ingredients support cooking; potion and scroll production require the relevant feats, known spells, kits and checks. | This is bounded consumable preparation, not an open-ended manufacturing economy. [M10] |
| Develop and mount animals | Eligible animals can be named, equipped and advanced; riding depends on a mount being large enough for the rider. | A mount is an additional development dependency and spatial participant, not simply a travel-speed cosmetic. [S05] |
| Recruit and accompany | Select five companions alongside the Commander; cover front-line, ranged, magical, healing and utility needs. | Bringing someone changes the available skills and conversations as well as combat coverage. [S01; M07] |
| Converse, pursue quests and relationships | Dialogue, individual quests and conditional romance scenes develop named people; decisions can change recruitment and departures. | There is no basis here for claiming all companions romance every protagonist or remain despite every path choice. [M07; D04; D06] |
| Travel between authored areas | Choose destinations, resolve encounters, explore local spaces, return to bases and cross campaign boundaries. | The world map is not one seamless simulated continent. Journey costs coexist with quest pacing and party preparation. [C02; C05] |
| Manage the crusade | Recruit stacks, assign generals, fight separate tactical battles, issue decrees and raise Leadership, Military, Logistics and Diplomacy. | This is a second ruleset, not large-scale resolution of the party's normal attacks. [M08] |
| Construct and defend infrastructure | Spend Finance, Materials and Energy on outposts, recruitment and support buildings; placement can matter, and construction takes days. | Enemy armies can threaten settlements. A Shelter creates a protected-rest option, linking the strategic and expedition layers. [M09] |
| Adjust difficulty or automate | Granular settings and optional assistance let players reduce particular burdens. | Automation should not be described as preserving all manual-mode decisions, rewards or achievements; verify the exact option before treating it as equivalent. [C04; S06] |

**Army rules added after audit:** [supplement §§2–5](../mechanics/wrath-mythic-paths-and-crusade-battles.md#2-the-army-is-not-the-adventuring-party-at-larger-scale) explains recruitment versus stack capacity, map travel, initiative and unit commands, general intervention/Energy, battlefield healing, infirmary losses, Hospitals and the campaign-versus-combat morale distinction. It gives operational depth to the strategic rows without conflating them with the six-person party.

### 4.1 Economy, time and failure

The player is managing several currencies of opportunity: party experience, spell/ability uses, equipment and consumables, campaign time, crusade resources and access to people or path content. **Interpretation:** a unified “power score” would hide why these resources are not substitutes. An army improvement may open a route without improving the Commander's sword, while an extra prepared spell may save a rest without changing the war economy.

Loss likewise occurs at several scales: a failed encounter, spent resources, a companion or quest outcome foreclosed, an army weakened, or a build that does not satisfy its intended role. Reviewers describe reloading both ordinary fights and crusade encounters. These are their reported responses, not a claim that every player reloads or that all failures must be erased. [C02; C04–C05]

**Interpretation:** long-form games must distinguish consequence from correction cost. When a visible risk produces a sacrifice, loss can strengthen the story. When the player discovers an undocumented interaction after hours of play, the same loss feels like a bill for missing information. Difficulty controls do not substitute for explaining causality.

## 5. Companions, institutions and story

The companion roster supplies contrasting roles and temperaments: Seelah's paladin identity, Regill's Hellknight discipline, Ember's compassion, Nenio's detached curiosity, Daeran's manner and magical role, and Arueshalae's struggle with identity are recurring reference points in the inspected criticism. The diversity is not simply a menu of combat classes. [C01; C03; C05]

The mechanical roster also includes Camellia, Lann/Wenduag, Woljif, Sosiel, Greybor and conditional later recruits; Ulbrig belongs to The Last Sarkorians. Early Lann/Wenduag choices and later recruitment conditions mean a roster listing is not a promise that every listed person is present together on an ordinary route. Arueshalae's quest chain, for example, includes an additional imprisonment scene when pursuing her romance. [M07]

**Interpretation:** party construction creates a productive collision between attachment and optimization. The player may prefer a character who duplicates a role, or keep someone whose beliefs conflict with the Commander. A living-feeling party needs enough recognition of those tensions that its members do not become interchangeable spell containers.

Crusade councils turn named companions into advisers. For example, a Staff Council promotion decision can favor infirmary capacity, general experience, army-unit capacity or morale. This makes policy an exchange among different kinds of benefit rather than always selecting one universally better number. [M08]

**Story spoilers, structural only:** the authored trajectory moves from Kenabres and Drezen through the crusade and an Abyss chapter toward a return, mythic culmination and endgame. The main plot and path-specific stories intersect rather than every mission being independent of identity. The GOG developer interview explicitly describes parallel path stories and distinct culminations; the guide separates path quests because merging them into one walkthrough would obscure the branches. [S05; M01]

This pass does not claim autonomous NPC cognition, a simulated political economy or a general-purpose narrative director. **Interpretation:** authored responsiveness can feel socially rich without simulating everything. The relevant distinction is not “scripted versus real,” but whether consequences are specific, coherent and remembered at the moments that matter.

## 6. Expansions as different design experiments

### 6.1 Inevitable Excess — March 3, 2022

A high-level side adventure situated near the base story's climax. Players can import their character and companions or create an appropriate high-level party. Valmallos calls them to a planar problem involving Axis; completion also supplies benefits to the main campaign. The publisher's 7–8-hour estimate is marketing, not measured duration in this pass. [D01]

**Interpretation:** this supplies immediate access to a mature build's complete toolkit, but sacrifices the learning curve that made each ability legible. For research, compare the pleasure of “finally using the whole build” with the cognitive cost of beginning with every button unlocked.

### 6.2 Through the Ashes — April 21, 2022

A separate low-level perspective on the attack on Kenabres. A small group must protect noncombatant survivors, value scarce equipment and exploit the battlefield rather than rely on the Commander's mythic power. Saved people and a reward can connect back into the main campaign. [D02]

**Interpretation:** changing whose vulnerability matters can refresh the same setting more effectively than adding another stronger demon. The civilians also change the objective from personal combat success to stewardship. The risk is that players attracted by spectacular builds may experience the narrower toolbox as deprivation rather than variety.

### 6.3 The Treasure of the Midnight Isles — August 30, 2022

An archipelago adventure supports both an integrated campaign form and a standalone roguelike mode. The store emphasizes repeated party/build experiments, gear acquisition and some persistence of benefit after a party dies. Do not transfer the standalone restart loop wholesale to the normal campaign. [D03]

**Interpretation:** a shorter experimentation cycle makes complex builds testable without replaying an entire story. Conversely, removing narrative context exposes whether encounter variety alone carries the combat. Its value is therefore particularly dependent on whether the player enjoys systems experimentation for its own sake.

### 6.4 The Last Sarkorians — March 7, 2023

Adds the Shifter class with six advertised archetype variations, the griffon-transforming Sarkorian companion Ulbrig Olesk, a new area and spells. Ulbrig has an optional romance available to male and female protagonists. This is substantive main-campaign integration, not merely a portrait pack. [D04]

**Interpretation:** a new companion can function as a witness to a lost civilization. The destroyed nation becomes a person's history rather than background exposition, and transformation ties visual identity directly to combat. The downside is content timing: a new participant must fit a party and narrative already in progress.

### 6.5 The Lord of Nothing — November 21, 2023

Continues Sendri and Rekarth's story from Through the Ashes; importing that protagonist or creating a new one is supported. Frozen lands, other planes and additional allies expand the separate campaign. A fifth-chapter quest/dungeon connects to the Commander, while fifteen new archetypes, spells and feats also affect the base game's character options. The advertised multiple endings are not an independent audit of every branch. [D05]

**Interpretation:** continuity rewards attachment to smaller-scale protagonists. Cross-campaign consequences make parallel stories feel like parts of one world, but require unusually clear communication about which save, character and purchase owns which content.

### 6.6 A Dance of Masks — June 13, 2024

The sixth and final premium DLC returns the party to rebuilt Kenabres for celebration, companion events and romance scenes, then adds threats and an arena. It also advertises eleven archetypes, another weapon type, grip switching and fully voiced dialogue within this addition. That last claim must not be generalized to every conversation in the base game. [D06]

**Interpretation:** a day off can complete characterization that battlefield banter cannot. Celebration shows what the victory was for. An arena serves a different desire—testing mature builds—and should not be mistaken for the emotional point of the companion festivities.

## 7. Worked cross-system situations

Except the two explicitly attributed incidents, these are **constructed analytical examples**, not claimed play sessions. They demonstrate documented interactions without guaranteeing a particular encounter outcome or prescribing an optimal build. [Five additional path/army cases](../mechanics/wrath-mythic-paths-and-crusade-battles.md#6-five-additional-constructed-situations) extend the original ten below rather than replacing them.

### A. Win the fight by changing the question

**Intention:** defeat a heavily armored enemy. **Conditions:** the party has both weapon attacks and spells. **Actions:** inspect defenses, then compare a normal attack with an option resolving against another defense. **Interaction:** armor, touch defenses and spell-specific checks are not one number. **Result:** a different attack channel may be more promising than another weapon bonus. **Next decision:** whether its resource cost is justified. **Limit:** a low touch defense does not cancel spell resistance or an applicable saving throw. [M01; M11]

### B. Turn two builds into one tactic

**Intention:** make two front-liners support each other. **Conditions:** both qualify for and possess Outflank. **Actions:** coordinate them against the same foe. **Interaction:** the teamwork benefit changes attack reliability and critical-hit follow-up opportunities. **Result:** equipment choice now has a party consequence. **Next decision:** retain this pairing or rotate in a different companion. **Limit:** the feat's conditions matter; any two adjacent characters do not automatically receive it. [M03]

### C. Preserve identity while changing equipment

**Intention:** keep a favored weapon companion useful when the build's needs change. **Conditions:** Finnean is available and the wielder has the relevant proficiency. **Actions:** select a compatible form and pursue his associated progression. **Interaction:** inventory function and an item's personal story stay connected. **Result:** utility need not require discarding the named relationship. **Next decision:** compare his current properties with another situational weapon. **Limit:** form flexibility is not unrestricted creation of enchantments. [M04]

### D. Stop treating resting as a free reset

**Intention:** continue an expedition with refreshed spells. **Conditions:** corruption is accumulating and a protected base is distant. **Actions:** assess another field rest against returning or using protected infrastructure. **Interaction:** party skills, expedition resources, travel and crusade construction meet. **Result:** infrastructure has immediate adventuring value. **Next decision:** extend the route or withdraw earlier. **Limit:** a safer rest does not make elapsed campaign time disappear. [M09–M10]

### E. Commit to an elemental identity without misunderstanding it

**Intention:** continue using a favored damage type against resistant foes. **Conditions:** a mythic ability choice is available. **Actions:** choose Ascendant Element for that type and examine the next failed spell in the log. **Interaction:** one defense is bypassed, while other resolution stages remain. **Result:** the build becomes more reliable without every spell becoming guaranteed. **Next decision:** invest in another weakness or broaden the spell list. **Limit:** the ability is not universal accuracy. [M05]

### F. Accept the social cost of a late transformation

**Intention:** exchange an existing supernatural identity for a different one. **Conditions:** a late path and its prerequisites are available. **Actions:** compare the future toolkit with what will be lost. **Interaction:** Devil can cost an Azata Aivu; Swarm removes companions; Legend changes the advancement structure. **Result:** a transformation is a change in relationships and development, not a free respec. **Next decision:** live with the new identity or preserve the current one. **Limit:** these alternatives are not equally available at character creation. [M06]

### G. Choose officers for the expedition you intend to lead

**Intention:** reduce strategic attrition. **Conditions:** the Staff Council offers a promotion decision. **Actions:** compare infirmary improvement with the competing army-capacity, experience or morale benefits. **Interaction:** an adviser conversation changes later battle economics. **Result:** role-playing counsel becomes mechanically legible. **Next decision:** adjust which battles are worth taking. **Limit:** the choice is not a universal endorsement of that adviser's position in every future scene. [M08]

### H. Turn reputation into a visible identity — attributed incident

Gamesear's reviewer reports NPC acknowledgement of an Azata protagonist and Aivu. **Observed interaction:** transformation is reflected in social exchanges, not only a new combat ability. **Analytical next question:** does recognition remain specific across later scenes and other paths? **Limit:** one reviewed route is not evidence of uniform reactivity everywhere. [C02]

### I. Let personality inconvenience the party — attributed incident

RPGFan describes Nenio's experimental eating leaving her sick before a later fight. **Observed interaction:** characterization produces a gameplay condition. **Analytical next question:** when does this sort of interruption make a person memorable, and when does it become unwanted punishment? **Limit:** this is the reviewer's reported incident, not a new reproduction or a general rule that every companion independently consumes objects. [C03]

### J. Reframe the war through civilians

**Intention:** get a survivor group to safety. **Conditions:** Through the Ashes, limited equipment and noncombatants. **Actions:** choose whom to help and how to use environmental advantages. **Interaction:** scarcity changes the value of actions that a mythic party might ignore. **Result:** heroism becomes protection rather than spectacular damage. **Next decision:** spend scarce resources now or reserve them for the group. **Limit:** the smaller campaign's constraints are not the base Commander's resource model. [D02]

## 8. Presentation, interface and feel

The art direction juxtaposes ruined settlements, military organization and demonic spaces; portraits and named companions supply a readable human-scale layer within the epic setting. Reviewers praised atmosphere and spectacle while also describing visual crowding and camera friction. This is reception evidence, not a frame-rate benchmark. [C03–C04]

The launch GOG interview gives a particularly concrete audio rationale: Sergey Eybog describes crusader music using brass and choral force, while the Abyss allows unusual timbres, electric guitar and Latin choral elements. **Interpretation:** contrasting musical vocabularies can tell the player what kind of place they occupy before another exposition scene. The point is world differentiation, not a general claim that orchestration alone caused immersion. [S05]

The Enhanced Edition's inventory search, richer battle log and revised pet display address the cost of managing abundant information. **Interpretation:** an interface improvement can unlock existing depth without adding another rule. Searching for a scroll faster does not make the game simpler; it reduces time spent remembering where a known option was hidden. [S02]

There is also a tension between legibility and spectacle. **Interpretation:** overlapping bodies, spell effects and small targets are especially costly when a misclick spends an action rather than merely moving a cursor. The proper test is whether the player can identify actor, target, cost and result at the moment of commitment—not just whether a screenshot looks rich.

## 9. Production, influences and iteration

Owlcat and Paizo's established Pathfinder material provide a rule vocabulary and setting, while the computer adaptation selects what to emphasize. In the GOG interview, Alexander Mishulin connects choosing this adventure to mythic progression, and Alexander Komzolov describes the additional path-specific narrative structure. This is direct developer explanation, not an inference from similarities to other CRPGs. [S05]

Peter Brown's February 4, 2020 GameSpot interview records the intent to address Kingmaker's difficulty and flexibility problems, and an initial June 2021 release projection. The eventual September launch is separately established. The interview contains pre-release descriptions—and even a confusing repeated Aeon label—so its illustrative powers are not treated as an exact shipped rules manual. [S06; S01]

Owlcat's February 2, 2021 announcement documents a backer beta and an interactive community quest. These are evidence of testing and community contact, not proof that the final release was polished: the five reviews below separately assess their encountered builds. The inspected evidence does not establish exact project budget, internal staffing allocation, asset-production throughput or a complete authoring-tool architecture. Those remain unknown rather than reconstructed from genre convention. [S07]

**Interpretation:** mythic branches multiply more than writing. They affect abilities, companions, visuals, late-game scenes, saves and rewards. A bug conditioned on a particular companion outcome and DLC event, such as the one addressed by 2.7.0x, illustrates the interaction surface that maintenance must cover. This is an inference about testing demands, not a claim about Owlcat's internal test suite. [S09]

## 10. Marketing, distribution and commercial evidence

| Evidence | Dated, defined observation | What it does not establish |
| --- | --- | --- |
| Kickstarter | February 4–March 11, 2020 campaign; **35,092 backers pledged $2,054,339** against a $300,000 goal. [S04] | Development budget, profit, fulfilled physical rewards or total buyers. |
| Launch/community campaign | Owlcat's 2021 beta announcement invited participants into a five-choice community story affecting a trailer; the first event used Twitch voting. [S07] | A measured viral coefficient, attribution of sales to Twitch, or universal audience participation. |
| Unit-sales milestone | Owlcat announced international sales exceeding **one million units** on January 23, 2023. [S03] | Current lifetime sales, active players, revenue or profitability. |
| Distribution | Inspected pages identify Steam, GOG, console distribution and the Switch cloud boundary; later bundles package existing content. [S01–S02; S10; U01] | Equivalent ownership rights, performance or prices across storefronts and regions. |

Do not transfer Kingmaker's separately reported two-million-copy milestone to Wrath. Similarly, a Kickstarter total plus copies multiplied by list price would not be a defensible revenue estimate: discounts, bundles, regional prices, taxes, platform shares and timing are not supplied by these sources.

**Interpretation:** the public-facing pitch makes a large ruleset approachable by leading with identities—angel, demon, lich, trickster—rather than a spreadsheet of feats. Backer play and an interactive story let some prospective players rehearse that identity before release. These are observable campaign mechanisms; their relative contribution to commercial success is not measured here.

## 11. Five independent written reviews

The bodies of the following five substantive reviews were read in the original pass. They are not five aggregate scores or syndicated copies. Their different dates and playthrough limits matter more than averaging their ratings. The September 27 supplement adds rules research, not a claim of five new review readings.

### C01. PC Gamer — Jody Macgregor, September 13, 2021

Macgregor values the transformation arc, character variety and mid-fight mode switching, but describes creation decisions that reveal their cost only hours later. He finds crusade administration clearer than Kingmaker's while still disliking prolonged battles whose outcome feels settled. Path writing is uneven for him, and his late-game review experience includes an ending-blocking crash. **Scope:** launch-era PC criticism, not proof that the same crash persists. **Design reading:** ambitious expression and avoidable friction can coexist; praising breadth does not erase the cost of making it understandable.

### C02. Gamesear — Ash, September 1, 2021

The reviewer especially values the Azata route's recognition, exploration and customization. Concrete criticisms include uneven crusade units, repeated reloads to avoid severe losses and an archer-related progression problem subsequently fixed during the review period. Despite those problems, advancing the crusade felt more purposeful to this reviewer than waiting on kingdom timers. **Scope:** more than fifty hours played, but the reviewer explicitly had not completed the story. **Design reading:** perceived forward motion can make a management layer preferable even when its individual battles remain unsatisfying.

### C03. RPGFan — Abraham Kobylanski, February 22, 2022

Kobylanski praises consequential interactions, morally complicated companions and the way their interruptions establish personality. He also finds combat repetitive and describes interface errors in crowded fights, including an intended selection turning into risky movement. The Nenio incident in §7 comes from this review. **Scope:** a later PC review, not a September launch account; historical extra-game allegations in the article are not adopted as independently established facts by this dossier. **Design reading:** character texture can carry a long campaign, but action clarity remains important even for a strongly narrative player.

### C04. Tom's Guide — Alex Wawro, September 13, 2021

Wawro appreciates tutorials, configurable difficulty, tabletop-like presentation and flexible combat control. He finds parts of the prose dull, early evil choices simplistic, and crusade battles lengthy and potentially punishing when losses reduce future strength. Camera closeness also creates friction. **Scope:** over thirty hours, midway through the second chapter, on Normal; the review cannot stand in for assessment of every later mythic branch. **Design reading:** an enormous amount of choice is not the same as compelling choices for a particular player, and a forgiving tutorial does not guarantee sustained engagement.

### C05. Worthplaying — Rhi “StormyDawn” Mitera, September 1, 2021

Mitera strongly values the sense of a solo tabletop adventure, distinct companions, character construction and rules information in the interface. The review connects mythic identity with changing story opportunities, while criticizing world-map interruptions and strategic tedium. **Scope:** the article describes extensive early play, including nearly forty hours in the prologue and first act; no completed-all-paths claim is inferred. Some casual class descriptions are not used as mechanical authority. **Design reading:** for this reviewer the richness around encounters offsets interruption costs more than it does for the more critical reviewers.

### Agreements and disagreements

**Synthesis:** the inspected set repeatedly values construction breadth and some form of companion/world responsiveness, and repeatedly objects to friction around combat, travel or the crusade. It does not agree on the quality of the writing or the attractiveness of epic escalation. The disagreement is meaningful: a player seeking dense tabletop mastery may welcome a game that another player experiences as too laborious or too grandiose. Different progress depths also mean apparent disagreements can concern different stretches of the campaign. [C01–C05]

## 12. Player reception and sampling limits

On September 26, 2026 the requested Steam helpful-review route was attempted with `browsefilter=toprated` and language variants. One returned a content-preference gate and the others failed to expose review bodies. **No Steam helpful-review sample or invented recommendation distribution is claimed.** [U02]

The accessible GOG most-helpful surface supplied these contrasting observations. **masterinsan0, March 23, 2022**, objects to the then-read EULA; the author says they bought elsewhere and refunded. **deathgiant, March 12, 2022**, says a newly encountered agreement led them to stop playing despite prior enjoyment. **jakub.959, September 4, 2021**, praises systems, quests and presentation but finds the rapid escalation to exceptional status personally unearned. [U01]

These are historical reactions, not confirmation of spyware, a current legal interpretation or a security audit. Helpful ordering favors particular enduring disputes; it is not a random sample, and the visible negative emphasis cannot establish the prevalence of those views. The last review is particularly useful because it separates admiration for execution from dislike of the underlying fantasy. **Interpretation:** player trust and fantasy fit can dominate satisfaction even when the tactical systems work as intended.

## 13. Lessons and counter-lessons for OpenLegend

These are research hypotheses, not accepted product requirements or claims that the two games should share an architecture.

| Hypothesis | Why this dossier motivates it | Prerequisite and failure mode | Alternative to copying the feature |
| --- | --- | --- | --- |
| Make identity changes socially legible. | Path-specific acknowledgement distinguishes becoming an Azata from equipping a buff. | Named observers must respond coherently; generic repeated recognition becomes a slogan. | A few deeply reactive communities rather than many full mythic routes. |
| Explain interacting causes before expanding option count. | Builds involve class, equipment, feat, ally and defense dependencies. | Players need a causal account of failure; an exhaustive tooltip library alone may not help them diagnose it. | Fewer primitives with explicit combination previews. |
| Let items retain a relationship across utility changes. | Finnean connects mechanical flexibility with a persistent identity. | Flexibility must preserve meaningful constraints or make other equipment pointless. | Repair, adaptation or apprenticeship attached to a small set of personal objects. |
| Couple strategic choices to ordinary experience. | Protected rest and officer choices make administration consequential for expeditions. | The second layer must improve meaningful decisions, not interrupt them with mandatory chores. | Locally visible logistical consequences without a separate army game. |
| Give companions scenes outside their combat jobs. | Nenio's incident and Dance of Masks expose different sides of party members. | Consequences need proportion and consent-sensitive framing; constant forced inconvenience erodes attachment. | Optional downtime with later, specific acknowledgement. |
| Test mature builds without repeating the whole campaign. | Midnight Isles isolates construction and combat experimentation. | A shortened loop must still teach dependencies; disconnected optimization can flatten the world. | Training spaces or reversible previews before committing a long-lived character. |
| Separate epic status from earned credibility. | The GOG grandiosity critique conflicts with the intended mythic promise. | Social recognition should track the fantasy the player opted into. | Several scales of meaningful achievement, including ordinary competence and local trust. |

**Central counter-lesson:** Wrath's appeal is partly its density and extremity. Extracting every mechanic into another project would not preserve that appeal automatically. The more portable idea is to make a player's chosen identity concrete across rules, presentation, relationships and consequences, with enough legibility to understand the price.

## 14. Annotated source map and study routes

Original sources below were accessed September 26, 2026. The September 27 [operational supplement](../mechanics/wrath-mythic-paths-and-crusade-battles.md#7-annotated-evidence-and-resolution) independently annotates its newly read path, army and building evidence. Original full review bodies were read; long mechanical references were inspected at relevant sections, not exhaustively copied. Developer/store statements establish advertised or released scope, not independent quality. Community references describe observed rules and can contain patch-specific errors; exact edge cases should be reproduced before becoming implementation requirements. No video below is claimed watched, no timestamps were fabricated, and no original art assets are copied into this repository.

### Primary identity, production and commercial sources

- **S01 — [Steam base product](https://store.steampowered.com/app/1184370/Pathfinder_Wrath_of_the_Righteous__Enhanced_Edition/).** Release, modes, marketed construction breadth and bundle navigation. Dynamic prices/counts are deliberately not converted into historical totals.
- **S02 — [Owlcat: Enhanced Edition release](https://owlcat.games/news/75), September 29, 2022.** Best first read for the free PC update, console/cloud distinction and specific interface additions; includes a trailer as a viewing route.
- **S03 — [Owlcat: one-million-unit announcement](https://owlcat.games/zh/news/78), January 23, 2023.** English announcement text on a localized company page; a defined international sales milestone.
- **S04 — [Original Kickstarter campaign](https://www.kickstarter.com/projects/owlcatgames/pathfinder-wrath-of-the-righteous).** Campaign dates, goal, pledged total and backer count were exposed directly. Embedded project video is a pitch-analysis route, not gameplay verification.
- **S05 — [GOG interview with Owlcat's creators](https://www.gog.com/en/news/interview_creators_from_owlcat_games_tell_us_more_about_their_epic_rpg_pathfinder_wrath_of_the_righteous).** Launch-period primary statements on adventure selection, mythic narrative, mounts and audio. Read the named contributor sections rather than treating the interviewer as the developer.
- **S06 — [GameSpot pre-release interview](https://www.gamespot.com/articles/pathfinder-wrath-of-the-righteous-wont-repeat-king/1100-6473350/), Peter Brown, February 4, 2020.** Useful for intent, difficulty lessons and the original release projection; prototype descriptions and editorial errors are not shipped-rule evidence.
- **S07 — [Owlcat: beta and community quest](https://owlcat.games/news/62), February 2, 2021.** Direct evidence of beta/community activity and the Twitch choice campaign. Embedded combat and community-story videos offer distinct viewing routes: mechanics presentation versus participation marketing.
- **S08 — [2.5.0y release notes, SteamDB mirror](https://steamdb.info/patchnotes/16446789/), November 18, 2024.** Developer-authored patch text reproduced by a third-party archive; [official Gold Dragon article](https://store.steampowered.com/news/app/1184370/view/6564653885911203913) was located but did not expose its body.
- **S09 — [2.7.0x release notes, SteamDB mirror](https://steamdb.info/patchnotes/18475305/), May 15, 2025.** Specific progression fix; [official announcement](https://steamcommunity.com/games/1184370/announcements/detail/822580849468768448) was followed but did not expose its body. This is not a claim to have audited the newest executable.
- **S10 — [US PlayStation product listing](https://store.playstation.com/en-us/concept/10003238/).** Platform/region-specific date and distribution evidence; nine-path marketing omits the hidden Devil route and is not an exhaustive mechanics inventory.
- **S11 — [Official game site](https://wrath.owlcat.games/).** Concise path fantasies, setting and promotional media; useful for comparing the advertised identity promise with the review evidence.

### Expansion sources

Each page's release metadata and content description were inspected; each also provides promotional media for a later visual comparison, not a substitute for play.

- **D01 — [Inevitable Excess](https://store.steampowered.com/app/1889980/Pathfinder_Wrath_of_the_Righteous__Inevitable_Excess/), March 3, 2022.** High-level/import structure and main-campaign rewards.
- **D02 — [Through the Ashes](https://store.steampowered.com/app/1889981/Pathfinder_Wrath_of_the_Righteous__Through_the_Ashes/), April 21, 2022.** Low-level survivors, scarcity and cross-campaign connection.
- **D03 — [The Treasure of the Midnight Isles](https://store.steampowered.com/app/2064590/Pathfinder_Wrath_of_the_Righteous__The_Treasure_of_the_Midnight_Isles/), August 30, 2022.** Standalone versus integrated structure; build experimentation.
- **D04 — [The Last Sarkorians](https://store.steampowered.com/app/2266770/Pathfinder_Wrath_of_the_Righteous__The_Last_Sarkorians/), March 7, 2023.** Shifter, Ulbrig, new region/spells and explicit romance boundary.
- **D05 — [The Lord of Nothing](https://store.steampowered.com/app/2564570/Pathfinder_Wrath_of_the_Righteous__The_Lord_of_Nothing/), November 21, 2023.** Sequel/import structure, base-campaign intersection and expanded construction options.
- **D06 — [A Dance of Masks](https://store.steampowered.com/app/2564580/Pathfinder_Wrath_of_the_Righteous__A_Dance_of_Masks/), June 13, 2024.** Companion events, arena, archetypes, weapons and scoped voice-work claim.

### Mechanics references

M01–M08 and M11–M12 are separately navigable sections of **chris-williams's GameFAQs guide**, version 2.2, displayed update August 18, 2026. This is one community author, not twelve independent reviewers. Recommendations/rankings in it are not adopted as universal optima; the source is used for the identified rule and quest details.

- **M01 — [Introduction/rules](https://gamefaqs.gamespot.com/ps4/324475-pathfinder-wrath-of-the-righteous/faqs/80843/introduction).** Action economy, attack resolution and campaign navigation; the source discloses its own walkthrough priorities.
- **M02 — [Character creation](https://gamefaqs.gamespot.com/ps4/324475-pathfinder-wrath-of-the-righteous/faqs/80843/character-creation).** Levels, attributes and skill coverage. Do not confuse ordinary caps with Legend's exception.
- **M03 — [Feats](https://gamefaqs.gamespot.com/ps4/324475-pathfinder-wrath-of-the-righteous/faqs/80843/feats).** Prerequisites, Precise Shot and Outflank; lookup rather than a copied feat catalog.
- **M04 — [Items](https://gamefaqs.gamespot.com/ps4/324475-pathfinder-wrath-of-the-righteous/faqs/80843/items).** Equipment dimensions and the Finnean/Radiance progression sections; contains spoilers.
- **M05 — [Mythic paths and abilities](https://gamefaqs.gamespot.com/ps4/324475-pathfinder-wrath-of-the-righteous/faqs/80843/mythic-paths).** Story-rank separation, unlock structure and specific exception abilities.
- **M06 — [Other mythic paths](https://gamefaqs.gamespot.com/ps4/324475-pathfinder-wrath-of-the-righteous/faqs/80843/other-mythic-paths).** Legend, Devil and Swarm costs; extensive late-game spoilers.
- **M07 — [Companions](https://gamefaqs.gamespot.com/ps4/324475-pathfinder-wrath-of-the-righteous/faqs/80843/companions).** Recruitment/role and quest lookup; build preferences are the author's opinions.
- **M08 — [Crusade mode](https://gamefaqs.gamespot.com/ps4/324475-pathfinder-wrath-of-the-righteous/faqs/80843/crusade-mode).** Stats, councils, event and decree consequences. Not every numerical entry was independently reproduced.
- **M09 — [Crusade management guide](https://primagames.com/gaming/pathfinder-wrath-of-the-righteous-crusade-management-guide), Jason Rodriguez, September 2021.** Contemporary PC Invasion material now hosted by Prima; inspected for buildings, costs, elapsed time and protected rest. Not treated as a current balance benchmark.
- **M10 — [Community new-player guide, fundamentals and adventuring](https://www.reddit.com/r/Pathfinder_Kingmaker/comments/14r1roy/comment/14r1roy/), 2023.** Inspected rest, crafting, skill and stealth sections; its stated patch context is 2.1.4w. The [DevTrackers mirror](https://devtrackers.gg/pathfinder/p/830eca8f-spoiler-free-new-player-guide-to-wrath-of-the-righteous-part-1-fundamentals-mechanics-and-adventuring) is not evidence that the community author is an Owlcat developer.
- **M11 — [Wizard](https://gamefaqs.gamespot.com/ps4/324475-pathfinder-wrath-of-the-righteous/faqs/80843/wizard).** Preparation and class progression; not a claim that all casters use Wizard rules.
- **M12 — [Angel](https://gamefaqs.gamespot.com/ps4/324475-pathfinder-wrath-of-the-righteous/faqs/80843/angel).** Merged/unmerged access and protective/offensive repertoire; authorial power rankings are excluded.

### Criticism and player evidence

- **C01 — [PC Gamer](https://www.pcgamer.com/pathfinder-wrath-of-the-righteous-review/).** Full written review read; a useful mixed assessment of promise, grind and launch technical failures.
- **C02 — [Gamesear](https://www.gamesear.com/reviews/pathfinder-wrath-of-the-righteous-review-bigger-better-bolder-and-buggier).** Full body read; useful concrete Azata and crusade incidents. Its embedded video version is an additional viewing route, not another independent review.
- **C03 — [RPGFan](https://www.rpgfan.com/review/pathfinder-wrath-of-the-righteous/).** Full gameplay/presentation criticism read, with the article's date and historical extra-game material kept distinct from verified facts.
- **C04 — [Tom's Guide](https://www.tomsguide.com/reviews/pathfinder-wrath-of-the-righteous-review).** Full body read; comparatively critical narrative response with an explicit early-campaign limit.
- **C05 — [Worthplaying](https://worthplaying.com/article/2021/9/1/reviews/128206-pc-review-pathfinder-wrath-of-the-righteous/).** Full body read; enthusiastic tabletop/character response tempered by interruption and management criticism.
- **U01 — [GOG product and visible helpful reviews](https://www.gog.com/en/game/pathfinder_wrath_of_the_righteous).** Actual displayed user-review text was read, not just the aggregate. Historical trust complaints and a fantasy-fit critique are analyzed with sampling limits in §12.
- **U02 — [Steam helpful-review route](https://steamcommunity.com/app/1184370/reviews/?browsefilter=toprated).** Attempted; returned a content-preference gate. Language-filter attempts also failed to expose bodies; not counted as sampled reviews.

**Reading route:** identity/editions → §3 plus M02/M05 → [supplement's early-path and army operations](../mechanics/wrath-mythic-paths-and-crusade-battles.md) → §7 cases → contrasting C01/C04/C05 → S05 production interview → §6 expansion comparisons. **Viewing route:** official site's path media → S07 combat trailer and community-story trailer → S02 Enhanced trailer → one survivor-DLC and one mythic-DLC product trailer. Look for what the camera/UI communicates about power, vulnerability and party membership. No conclusion in this dossier depends on unviewed footage.

## 15. Completion and evidence audit

| Requirement | Canonical coverage in this dossier and linked supplement |
| --- | --- |
| R01 identity and scope | §§1–2; base, Enhanced, console/cloud and expansion boundaries |
| R02 mechanics breadth | §§3–4; supplement §§1–5 supplies early-path and army-battle operations |
| R03 entities/items/composition | §§3–5; supplement's path operators, general/stack capacity and recovery infrastructure |
| R04 progression/economy/time/failure | §§3.1–3.4, 4.1 and supplement §§2–5: recruitment, commands, losses and two morale scales |
| R05 worked situations | §7 A–J plus five additional constructed path/army cases in supplement §6 |
| R06 social/AI/relationships | §5 and path/party boundaries; no invented simulation or multiplayer |
| R07 presentation/UI/audio | §8, with specific developer and critic evidence |
| R08 story/play | §§3, 5–7; spoilers marked, path/ordinary-survivor contrasts |
| R09 production/iteration | §9; direct interviews, beta, dated changes and declared unknowns |
| R10 marketing/distribution | §10; observable campaign mechanisms, no invented virality attribution |
| R11 commercial evidence | §10; defined Kickstarter and unit milestones, explicit financial limits |
| R12 critical/player reception | §§11–12; five independent written bodies, Steam attempt, actual GOG sample and biases |
| R13 lessons/counter-lessons | §13 and supplementary interpretations; hypotheses, prerequisites, failure modes and alternatives |
| R14 evidence/navigation/preservation | §14 and supplement's dated annotations; §1 preservation; canonical ledger records commits |

**Verification boundary:** source-backed documentary research and the identified operational remedies are complete; no original game playthrough, benchmark, source-code inspection, asset reproduction or runtime tests claimed. The remaining possibilities—testing exact mod/patch interactions, watching linked footage, or a new platform performance comparison—are optional deeper research, not silently completed evidence. This closes G59's identified manuscript gaps, not the packet-wide cross-game reconciliation or all 130 roster entries. Inaccessible and indexed-only sources remain explicitly classified, and inherited review readings are not claimed as newly repeated.
