# Baldur's Gate 3 — rules that give authored people consequential choices

**G26 · Full research pass · September 26, 2026.** Research and interpretation, not an implementation specification. No gameplay session, source-code audit, accessibility-device test, or current performance benchmark was conducted. **Spoilers:** companion premises, Act I situations, broad later-act structure and optional equipment; major ending resolutions are not explained. Five independently authored written reviews were read. Steam's public review routes were attempted but returned errors or a content-preference gate; no unseen Steam review is represented as sampled.

[Original chapter](../games/baldur-s-gate-3.md) · [Preserved mechanics](../mechanics/baldurs-gate-3-utility-magic-identities-and-consequential-choice.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md)

## 1. Identity, version and the promise

Baldur's Gate 3 is Larian's party role-playing game in the Forgotten Realms, combining freely navigated three-dimensional spaces, turn-based encounters and cinematic conversations. The ordinary campaign is playable alone or cooperatively; a flexible overhead/third-person camera is not a first-person requirement. It is a finite, authored adventure with systemic interactions, not an unlimited tabletop referee or a continuously simulated online world. Its full PC release was August 3, 2023, after a multi-year Early Access period. The original chapter retains the earlier history and dated platform evidence. [B5][B8]

The verified version boundary is important. Larian's April 15, 2025 **Patch 8** was the final major content update: twelve subclasses, cross-play, photo mode and Xbox Series S split-screen support. **Hotfix 36, March 26, 2026**, subsequently addressed crashes, save-loading performance and platform-specific problems. “Final major patch” therefore does not mean that all maintenance ended in April 2025. Launch reviews below are evidence of those reviewers' 2023 experiences, not proof of September 2026 defects. [B1][B2]

**Interpretation of the central promise:** form an identity, encounter people who want incompatible things, and choose a method as well as an outcome. A player can enjoy the same place as a dialogue puzzle, tactical arena, stealth route, equipment opportunity or companion turning point. The pleasure is not merely that many buttons exist. Those buttons affect situations whose participants and stakes have been made recognizable.

## 2. Creating a person and assembling a build

Character creation distinguishes a custom protagonist, six playable companion Origins, and the customizable **Dark Urge**, whose authored past supplies a different internal conflict. Race, background and class do different jobs. The eleven race choices include elves, drow, humans, githyanki, dwarves, halflings, gnomes, tieflings, half-elves, half-orcs and dragonborn. Backgrounds such as Charlatan, Sage, Soldier and Guild Artisan supply skill proficiencies and Inspiration opportunities; they are not a freeform biography simulator. Appearance, voice and gender identity have separate controls. Race and body type are not later freely interchangeable through the Magic Mirror. [B9]

The six attributes are Strength, Dexterity, Constitution, Intelligence, Wisdom and Charisma. Starting allocation uses point buy rather than a randomly rolled biography. Skills make different aspects of a person useful: Athletics for physical contests, Sleight of Hand for manipulation, Stealth for concealment, Arcana for magical knowledge, Perception for noticing, Insight for reading a situation, and Persuasion/Deception/Intimidation for different social approaches. Proficiency improves relevant checks; Expertise is distinct from obtaining the same proficiency twice. [B9]

The twelve classes are **Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock and Wizard**. Subclasses substantially alter the role rather than merely its appearance: Battle Master versus Eldritch Knight, Thief versus Arcane Trickster, Circle of the Moon versus Circle of Spores, or an Evocation versus Necromancy wizard. Multiclassing splits a total character-level budget, capped at twelve, between classes. A dip can create a combination while delaying a stronger feature, a feat or higher spell access. Explorer mode restricts new multiclass choices; it should not be described as mechanically identical to the other presets. [B10]

Patch 8 adds Path of the Giant, College of Glamour, Death Domain, Circle of Stars, Arcane Archer, Way of the Drunken Master, Oath of the Crown, Swarmkeeper, Swashbuckler, Shadow Magic, Hexblade and Bladesinging. These are shipped subclasses, not fan mods or announced future additions. [B1]

**Feats are another decision layer.** Ability Improvement raises attributes; Alert changes initiative and surprise exposure; Actor improves social impersonation skills; Great Weapon Master trades hit probability for damage and can create a bonus-action attack opportunity; Defensive Duellist spends a reaction on defense. Feats normally arrive at class levels four, eight and twelve, with additional Fighter/Rogue opportunities. The distinction between character level and class level makes indiscriminate multiclassing costly. Withers permits class rebuilding at camp, while identity and narrative history are not equivalently reset. [B11][B12]

The separate **illithid-power tree** turns collected parasite specimens into another progression resource. It is tied to the infection premise rather than ordinary class experience. Companions differ in willingness to adopt it, and uninfected characters are not automatically eligible. This creates a useful contrast between optimizing a capability and deciding whether that capability fits the imagined person. The tree is implemented content, not proof that every promised narrative danger is a continuously accumulating hidden punishment. [B13]

## 3. Moment-to-moment actions, combat and information

Exploration is normally real-time, with optional turn-based control. Players select and separate party members, examine actors and objects, interact, talk, loot, move equipment, jump, hide, shove, throw, attack and use abilities. Combat separates movement, an action, a bonus action and a reaction; individual features can modify that budget. Initiative uses a d4 plus relevant modifiers rather than importing tabletop d20 initiative unchanged. Adjacent allied initiative can allow coordinated ordering. Attack rolls against Armor Class, saving throws against effects, and skill checks are different tests. Advantage/disadvantage changes the roll procedure, not simply a flat damage bonus. [B14]

This matters because a tactical turn is an allocation problem. Reaching a target, keeping a reaction available, delivering a potion or maintaining a spell can compete with dealing damage. The combat log, target examination and visible probabilities are explanatory tools, not decorations. A failure becomes interesting when the player can discover whether it came from range, line of sight, resistance, an unsuitable saving throw, concentration loss or a resource already spent. [B14]

**Magic has several acquisition and payment routes.** Cantrips generally do not spend slots; leveled spells normally consume a sufficiently high slot; scrolls are consumed instead; some equipment supplies spell use. Wizards can learn appropriate spells from scrolls, but a multiclass character does not cast every spell using their highest attribute. Learned spells retain the relevant class's casting ability, while item casting has its own rules. Range, target type, area, duration, casting time and saves limit individual effects. Silence and Counterspell are ways an intended cast can fail before producing its desired result. [B15]

The practical repertoire spans damage, protection, healing, control, movement and information. Fireball and Misty Step appear in Hart's account of tactical improvisation. The earlier study preserves **Speak with Dead**, **Disguise Self**, **Gaseous Form**, potion delivery and **Haste/concentration** interactions in greater detail. Those utility cases are not fringe exceptions to an otherwise exclusively combat game: they change reachable places, available evidence and recognizable identity. They are also finite supported rules, not permission to assume any evocative spell name can accomplish anything. [B4][B16][B17][B18][B19]

**Stealth is not a single invisibility number.** Sight cones, illumination, proximity, obscurity and the observer's special vision determine whether hiding is possible or tested. Minor Illusion can redirect attention. A high Stealth bonus does not make a person standing in clear sight universally undetectable. The wiki distinguishes regular hiding, ranged attacks from outside observation and Greater Invisibility checks, and labels several edge behaviors as possible bugs. Those bug notes are not adopted here as intended universal rules. [B20]

**Nonlethal intent has an execution boundary.** The toggle applies to supported unarmed/melee finishing attacks, not arbitrary spell or ranged damage; some creature categories are ineligible. Thus choosing “spare this person” is not enough if the delivered effect is still lethal. A knocked-out state should also not be assumed to preserve every quest as though no confrontation occurred. The documented mechanic is narrower than a universal pacifist campaign switch. [B21]

## 4. Items, crafting, carrying and exchange

Equipment includes weapons, armor, shields, clothing, headwear, cloaks, gloves, boots, amulets, rings, light sources and instruments. Weapon handling distinguishes melee/ranged, simple/martial and one-/two-handed or versatile forms. Armor proficiency matters: a nominally stronger piece can interfere with a character's capabilities. Magic equipment can grant actions, defenses or conditional effects rather than only larger numerical values; two ring slots invite combination, but do not make all items mutually compatible. [B22]

Three named families illustrate different reasons to explore. **The Blood of Lathander** is a mace with light, protection against reaching zero health, a Sunbeam use and a conditional effect against nearby fiends/undead. Its granted Sunbeam is not identical in all recasting behavior to every other source of the spell. **The Amulet of Lost Voices** makes corpse questioning available through an item. **Adamantine equipment** comes from a discovered production site and scarce inputs, not an infinitely repeatable crafting profession. Item ownership can therefore grant a new method, improve an existing one, or memorialize solving a particular place. [B23][B16][B24]

**Alchemy** converts gathered or purchased ingredients into extracts and then consumables. Three matching ingredients produce an extract; recipes combine a specific extract with another category. Examples include healing from Rogue's Morsel salts, speed from Hyena Ear ashes, animal speaking from Acorn Truffle essence, and a Web Grenade using Spider Silk suspension. Generic recipe slots create substitution but can consume an extract wanted for another purpose. Harvested overworld ingredients are not a universal renewable farm. Crafting here complements adventuring rather than establishing a player-run manufacturing economy. [B25]

At the **Adamantine Forge**, an appropriate mould, mithral ore, lava and the forge mechanism produce selected weapons, armor or a shield. Only two mithral ore pieces are available in the documented ordinary playthrough. The location couples discovery, instructions, traversal, an encounter and a durable equipment decision. “Crafting exists” should not flatten this authored machine and alchemy into the same system. [B24]

Gold buys equipment and consumables and supports camp services. Trade prices depend on the speaking character's Persuasion, merchant attitude and difficulty. Gifts can alter a merchant relationship; the character who initiates trading matters. This is a localized pricing system, not a market-clearing simulation of regional supply and demand. The pricing reference contains complex edge cases, so this dossier deliberately does not reproduce a universal discount formula. [B26]

The Traveller's Chest is a durable storage route. Dropping possessions into scenery is not equivalent to storing them there: changing camps or crossing story boundaries can make loose items inaccessible, and the wiki qualifies some collection behavior as experimental rather than definitive. Camp is a social and logistical hub, not an unrestricted settlement-construction mode. No native farming business, player housing market, competitive auction house or survival thirst/temperature simulation is inferred from its existence. [B12]

## 5. Progression, rest, failure and the end of a campaign

The early experience emphasizes assembling a party and learning an initially scarce repertoire. Later class levels, equipment and knowledge broaden combinations; level twelve limits vertical growth, leaving high-level decisions about composition and quests rather than endless leveling. A new Origin, Dark Urge, different alliances, cooperative group or difficulty can substantially change a replay. This is not a seasonal endgame treadmill with indefinitely renewable loot tiers. [B10][B5]

Rest is both a resource cycle and a storytelling interface. Two ordinary short rests are available between long rests; they restore half maximum health and selected class resources. A normal full long rest costs forty camp supplies, doubled under Tactician/Honour, and restores broader resources. A partial rest provides less recovery but can still progress camp scenes. Some timed situations and until-rest effects make resting consequential. There is no justified inference that every ominous line starts an identical global countdown. [B27]

At zero HP, a playable character can become Downed, with death-saving successes stabilizing them and failures leading to death. Healing or Help can remove the downed condition. Temporary HP is a separate buffer, not ordinary healing, and does not itself rescue a downed character. Withers provides a camp revival route for eligible fallen companions. The differing states matter: damage, unconsciousness, stabilization, revival and a story-specific irreversible loss are not interchangeable. [B28][B29][B12]

Explorer, Balanced and Tactician change challenge; Custom exposes more settings. Honour adds a single-save commitment, boss Legendary Actions and stricter combinations. A party wipe can end the Honour attempt while allowing continuation outside that status. It therefore changes the stakes of experimentation, not just enemy health. Custom settings can also alter information and recovery rules, so a claim about one player's difficulty should retain that context. [B30]

**Interpretation:** respec, save/load, resurrection, rest and harder modes give the player several ways to negotiate uncertainty. The design tension is that a person trying to inhabit a flawed character may welcome failed rolls, while a person fearing unseen content loss may repeatedly reload. More branching increases the importance of communicating commitment boundaries.

## 6. People, factions, quests and the shape of the world

The infection creates a practical reason for otherwise incompatible people to travel together. Astarion seeks freedom from a former master; Shadowheart's mission conflicts with missing memories; Gale's ambition and dangerous magical burden complicate usefulness; Lae'zel's loyalties establish forceful expectations; Wyll's heroic identity coexists with a pact; Karlach wants relief from her infernal engine and a life beyond service. These are authored motives and arcs, not dynamically inferred psychological models. [B8]

Broadly, Act I establishes local conflicts and competing paths, Act II changes the environmental and historical problem, and Act III concentrates quests in and around Baldur's Gate. The druid grove, tiefling refugees and goblin camp create overlapping loyalties rather than three interchangeable quest dispensers. Later recurring people can carry an earlier decision into another context. The prior chapter's goblin-camp account specifically preserves an initially conversational infiltration redirected by the commitment to rescue a druid. [B5][B3][P1]

Companions can approve, object or leave. A personal quest can intersect with the route the party wants to take; the player's preferred optimization is not automatically the character's preference. The earlier study retains Brown's changing appreciation of Wyll and his quiet date with Karlach because attachment is built through time and particular moments, not just spectacular combat. Those are attributed critic experiences, not new playtesting. [B3][B6][P2]

Romance is optional and includes different relationship structures, prerequisites and boundaries. The core Origin companions and Halsin/Minthara are possibilities; Jaheira and Minsc are not. Companion romance can exist in multiplayer, but player characters do not become a native player-to-player romance system. Characters' approaches to exclusivity differ. Reducing this to an approval meter misses the event timing and specific commitments; treating every proposition as believable intimacy misses the reception disagreement below. [B31]

Camp scenes can queue behind other events and resolve in priority order. Their cinematic presentation should not be mistaken for the whole camp running a day-by-day autonomous social economy. In the field, enemies use implemented tactical behavior and can pursue vulnerable targets more aggressively on harder settings. These are meaningful forms of responsiveness, but they do not demonstrate unrestricted planning, invented quests or language-model cognition. [B12][B30]

## 7. Eight worked situations

These are **worked implications of documented rules** except where a critic account is explicitly identified. They are not outcomes observed in a new research play session.

**1 — Recover information after killing its owner.** Intention: learn something from a scene whose witness is dead. Preconditions: an eligible corpse and Speak with Dead, possibly supplied by the Amulet of Lost Voices. Attempt: question it. Complication: the corpse can refuse its killer. A supported disguise may change the recognition check and reopen questioning. Result: a combat aftermath becomes an investigation, but only if authored corpse dialogue exists. Next decision: use the information rather than assuming the spell reveals everything the character ever knew. [B16][B17]

**2 — Rescue through a different delivery route.** Intention: heal someone without walking the potion into their hand. Preconditions: a throwable healing potion, eligible recipient and enough action budget. Throw instead of drinking; the delivery can affect nearby creatures, while drinking ordinarily uses a bonus action and throwing an action. The resource is the same but geometry and timing differ. Not all potions supply their effect when thrown—Animal Speaking is the earlier study's counterexample. Next decision: whether this rescue is worth the lost attack or another delivery is safer. [B18]

**3 — Replace a maintained effect, then discover that ending it matters.** Intention: improve the next turn by changing spells. Preconditions: self-maintained Haste and a proposed replacement requiring concentration. Replacing concentration ends Haste first; its ending penalty can prevent the intended subsequent cast. Result: two individually understood effects compose badly at their transition. Next decision: finish the maintained benefit, protect its caster, or accept the ending cost before planning another spell. This is not a general prohibition on all spell chaining. [B19]

**4 — Solve access rather than win a fight.** Intention: pass a guarded or geometrically constrained route. A supported smaller form, disguise interaction or Gaseous Form may change eligible passage; a movable box may supply elevation or block a vent. Brown's review supplies the boxes and gaseous-route examples. Result: traversal and object placement replace direct force. Limit: physical access, appearance and social recognition are distinct, and not every visible opening or structure accepts the same operation. [B6][B17]

**5 — Make a forge into a finite team decision.** Intention: obtain durable equipment. Discover the forge, read its instructions, collect an appropriate mould and mithral, and operate its heating/hammer sequence while dealing with its protector. The output is selected rather than a random endless drop. With two ore pieces, making one option excludes another unless the party changes its allocation. Next decision: which party member benefits most from the limited production, not how to industrialize an inexhaustible source. [B24]

**6 — Hide by changing observation.** Intention: pass a watching creature. Observe its sight cone and available obscurity, then redirect attention or choose a route outside observation before hiding through a vulnerable stretch. Result: geometry and perception participate in the attempt; a high skill alone is insufficient. Next decision: remain unseen, launch an attack or open access for the rest of the group. Observer vision and lighting can invalidate a superficially identical plan elsewhere. [B20]

**7 — Spend time without treating it as free.** Intention: recover resources and speak with companions. Determine whether the situation permits resting, whether supplies justify a full rest, and whether an unresolved local event makes delay risky. Full/partial rest and queued camp scenes have different purposes. Result: preparation and relationship development share an interface. Next decision: resume exploration with a changed loadout or pursue a new personal lead. This is a constructed decision sequence, not a claim that every quest advances with every rest. [B27][B12]

**8 — Keep someone alive through the actual finishing action.** Intention: subdue rather than kill. Enable nonlethal attacks, then ensure an eligible target receives a supported melee/unarmed final blow rather than lethal spell or ranged damage. Result: a knocked-out state can be produced, but the semantic wish to spare someone does not override the effect delivered. Next decision: inspect the actual outcome and quest consequences rather than assuming universal forgiveness or later recruitment. [B21]

## 8. Cooperative authorship, mods and return loops

Native cooperation supports up to four players. Players occupy the same four-person party budget as companions; four humans therefore change the available authored-companion experience. The host owns the campaign save and must host subsequent sessions. Absent players' characters can be handled through Withers' Wardrobe, while connected players retain control of their own characters. Companion approval can differ between players. This is a shared campaign, not automatic export of everyone's progress into independent personal worlds. [B32]

**Interpretation:** splitting attention lets one player pursue a clever approach while another encounters a conversation, but it also lets one person's haste determine another's story. Agreement about dialogue participation, irreversible actions, looting and tone is part of the experience. Co-op is not simply the solo campaign with extra damage sources.

Official mod support and the Toolkit are distinct from base-game mechanics. Patch 8 explicitly expands authoring controls; platform compatibility and differing installed mods remain relevant. The second-anniversary update reports more than 8,500 uploaded mod.io mods and 265 million downloads by August 4, 2025. These are downloads, not unique modders, buyers, retained players or revenue. The community Modathon, photo sharing and developer streams provide documented participation routes; their existence does not establish acquisition conversion rates. [B1][B33]

## 9. Presentation, interface and production

The flexible camera communicates positions; close conversations communicate faces, performance and character stakes. Hart praises inclusive customization and acting, while Van Allen values controller play and music. Their experiences do not erase other reviewers' camera and onboarding complaints. A readable tactical interface and intimate presentation solve different problems; neither alone explains the game's attachment. [B4][B5][B7]

Turn-based control reduces continuous aiming pressure, while the density of vocabulary, inventory, targeting and branching information creates another accessibility burden. Difficulty settings, reaction prompting and visible/hidden information options change that burden. This pass did not test screen readers, low-vision settings, motor-access hardware or every platform's subtitle controls; it does not certify comprehensive accessibility merely because controller support exists. [B30]

Composer **Borislav Slavov** describes music production as collaboration with narrative, gameplay and cinematic teams, sometimes before those other parts were finished. He identifies *Down by the River* as an early organizing theme and describes *The Power* as a synthesis of themes. His account of *Weeping Dawn* explains how a writer's request became a performed scene; the optional Raphael musical number illustrates the score participating in character identity. These are creator accounts of intentional production, not proof that generated dialogue would automatically carry the same dramatic structure. The interview page displays December 16, 2024 despite a `/2024/05/` URL path; the displayed date is retained. [B34]

Adam Smith's June 19, 2021 interview describes collaborating with the existing Forgotten Realms history, finding unusual lore combinations, writing choice-specific dialogue and making it real through voice and cinematics. Early players supplied new ideas and exposed desired branches. His goal was to acknowledge choices, not to supply an unconstrained text interface. This is a pre-release process account; the later shipped systems and maintenance notes are separate evidence. [B35]

Larian's established Divinity work and multi-year Early Access are relevant production context. The sources here do not independently establish a total project budget, exact all-in staffing, proprietary engine internals or title-level net profit. Those unknowns should remain unknown rather than be reverse-engineered from cinematic scope or sales. [B5][P1]

## 10. Distribution, visibility and commercial evidence

The original chapter retains its dated Steam peak of **875,343 concurrent players on August 13, 2023** and its September 2026 review-count capture. Those are inherited measurements, not newly synchronized measurements or sales counts. A December 16, 2025 VGChartz report attributes **more than twenty million copies** to Swen Vincke's Bloomberg interview. The report's text was retrievable in search, but its full page failed to open and the underlying interview was not independently read here. Treat this as an attributed reported milestone, not an audited platform breakdown. [P1][B36]

The official product site lists PC/Mac and console routes, standard/digital/physical editions and an offline single-player option, and states that there are no in-game purchases. Van Allen's launch review records a US PC MSRP of $59.99. This historical price is not a current store quote. A premium sale plus continued maintenance/modding differs from a recurring consumable monetization loop, but neither unit sales nor one entity's annual accounts directly reveal this title's profit. [B8][B5]

Larian's anniversary account recalls its Panel From Hell presentation and the attention surrounding its druid romance material; it also documents streams, community creations and PAX participation. These are visible channels and events, not measured channel contribution. **Growth hypothesis:** recognizable tabletop fantasy, prior studio trust, a participatory prelaunch period, strong criticism and shareable personal/systemic stories reinforced one another. A surprising clip may communicate permission quickly, but reducing the outcome to one viral scene ignores the sustained authored experience those new players then encountered. [B33][B35]

## 11. Reception: five written reviews and player disagreement

All five substantive article bodies below were read through their conclusions. Scores are not averaged, and the outlets' praise is not turned into a representative player survey.

**Andrew Thornton, Hey Poor Player, August 16, 2023.** He values alternate routes, noncombat solutions and companions whose principles can make them reject the player. His main reservation is instruction: a game offering many ways to act still leaves newcomers learning important rules poorly. His favorable controller/Steam Deck and stability account is a personal tested configuration, not a universal launch outcome. This review makes freedom legible as a relationship between options and instruction, rather than an unqualified good. [B3]

**Aimee Hart, Gayming, September 8, 2023.** Hart praises customization, performance and tactical improvisation, including turning positioning and available spells into an escape from a bad situation. She also describes an initially demanding learning period. Her criticism of fantasy prejudice is specifically about what the game's racialized situations let a player challenge; it should remain attributed rather than be converted into a general audience verdict. The review supplies a useful tension between freedom in constructing a person and limits in the responses an authored world permits. [B4]

**Eric Van Allen, Destructoid, August 29, 2023.** He values linked character quests, recurring supporting characters, environmental approaches and memorable tactical objectives. He finds some later companions less integrated and reports Act III performance, clipping, camera and dialogue-state problems. The especially relevant failure is a character acknowledging a decision the player had not made: the presentation can be fluent while continuity is wrong. His very positive overall judgment coexists with these concrete complaints. [B5]

**Fraser Brown, PC Gamer, August 16, 2023.** Brown's long play account joins affection for companions to enthusiasm for utility magic and ordinary objects. His criticism concerns daunting rules and confusing timing/point-of-no-return signals, not merely combat difficulty. His relatively clean technical experience contrasts with other launch reviewers, and its hardware context matters. The earlier Wyll and Karlach examples remain valuable because they show attachment changing through play rather than all characters being instantly appealing. [B6]

**Ali Jones, GamesRadar+, August 14, 2023.** Jones emphasizes interconnected personal/main quests, varied encounters and parties whose members can contribute outside combat. His reservations include anxiety about missed opportunities, some intimacy that felt less nuanced than expected, and later technical/camera friction. This differs from a claim that the game lacks choices: too many consequential possibilities can create uncertainty about what the player is committing to or accidentally abandoning. [B7]

**Player perspective and Steam access.** The preserved November 2024 patientgamers account by Zehnpae praises role inhabitation and alternative solutions but finds later combat increasingly repetitive and romantic attention intrusive; replies disagree about late-game quality and returning characters. This is selected qualitative testimony, not a prevalence estimate. It adds a meaningful counterpoint: a broad action vocabulary can narrow around a dominant strategy, and frequent social initiative need not feel like convincing affection. [B37]

Public Steam top-rated positive/all-review and negative-review routes, plus the review JSON endpoint, were attempted on September 26, 2026. Filtered routes failed; the bare community pages returned a mature-content preference gate rather than review bodies. No account preference was changed. **No new helpful-ranked Steam positive/negative sample was obtained for G26.** The links below document the intended routes; the five professional reviews and named player discussion are not falsely relabeled as Steam sampling. This evidence limitation remains visible in the ledger. [B38][B39]

## 12. Interpretation for a reusable mechanics library

**Carry over the relationship between permission and resistance.** A useful action should have genuine effects, but other people should remain capable of refusing, pursuing their own concerns or interpreting an action differently. A finite interaction that changes an important relationship can feel more consequential than unlimited conversation without durable consequences.

**Treat identity, embodiment and knowledge separately.** The corpse/disguise case is interesting precisely because appearance can affect recognition without implying every biological capability changed. The potion case separates effect from delivery. The concentration case separates activation from maintenance and ending. These are analytical distinctions, not a mandate to reproduce BG3's rules or nouns.

**Make recovery compatible with experimentation.** The interesting comparison is not simply “allow failure.” It is which failures players can understand, repair, accept as story, or distinguish from a continuity defect. The combination of respec, saves, camp recovery and optional commitment modes suggests several different contracts, not one universal punishment curve.

**Do not use breadth as a substitute for curation.** The research does not establish that adding twelve classes or cinematic dialogue would benefit another game. BG3's expensive cast, branching coverage, licensed setting and presentation carry substantial production commitments. A smaller set of particular people, a few composable capabilities and reliable acknowledgement may be a more meaningful experiment than copying the surface inventory.

**Test the failure cases as well as the spectacular ones.** A spared NPC who is still treated as dead, a disguise that unexpectedly changes physical access, an ability whose ending prevents the next action, or an unseen point of no return can expose the exact boundary between understandable consequence and arbitrary software behavior. The lesson is to communicate the actual supported contract, not to promise that every plausible sentence is implementable.

## 13. Coverage and preservation audit

| Requirement | Where addressed |
| --- | --- |
| R01 identity/version | §1; final-major-update versus hotfix boundary |
| R02 full actions/mechanics | §§2–6; character, combat, stealth, magic, movement, information and native absences |
| R03 items/composition | §4 and worked situations 1–5, 8 |
| R04 progression/economy/time/failure | §§2, 4–5, 10 |
| R05 concrete situations | Eight sequences in §7, with intentions, prerequisites, outcomes and limitations |
| R06 people/AI/social/multiplayer | §§6, 8; authored behavior and shared-save boundaries |
| R07 presentation/UI/accessibility | §9, with explicit untested accessibility scope |
| R08 story and play | §§1, 6–7; spoiler scope stated |
| R09 production | §9; primary writer/composer accounts and unknown budget/staffing |
| R10 visibility/distribution | §§8, 10; observed channels separated from growth hypotheses |
| R11 commercial evidence | §10; dated inherited concurrency, attributed sales, historical price and metric limits |
| R12 reception | §11; five complete written reviews, player disagreement and failed Steam access explicitly separated |
| R13 transfer/limitations | §12; research hypotheses, not accepted OpenLegend work |
| R14 evidence/preservation | This section and annotated sources below |

The original chapter and granular mechanics study were read and are **not edited by this pass**. They retain their longer corpse/disguise, potion, concentration/Haste, box/vent/support, gaseous traversal, goblin-camp, Wyll/Karlach, player-disagreement and writing-interview passages, along with their source annotations. Their original Game Informer video route remains in the chapter; it was **not watched** here and no timestamps are invented. This is preservation of the two relevant repository owners, not certification of the separate seven-file packet-wide P01 gate. The roster and progress links provide the continuation route; later subjects and global integration gates remain open.

## Annotated sources and access limits

All new source retrievals: **September 26, 2026**. Wiki entries are community-maintained mechanics documentation, not an independent runtime audit. Review descriptions concern the versions and configurations their authors played. Repeated aliases do not count as independent reviews.

- **B1 — Larian, Patch 8, April 15, 2025.** Primary delivered features, subclass names and Toolkit boundaries; not a promise of further narrative expansions.
- **B2 — Larian, Hotfix 36, March 26, 2026.** Primary maintenance and platform fixes; not a fresh performance benchmark.
- **B3–B7 — Thornton / Hart / Van Allen / Brown / Jones.** Five independent full written reviews, dated above; subjective accounts with contrasting technical experiences.
- **B8 — Official game site/FAQ.** Product, character premises, platform and purchasing structure; promotional material is not reception evidence.
- **B9–B15 — Character creation, classes, feats, camp, illithid powers, general mechanics and spells.** Community rules and constraints; complex edge cases remain version-sensitive.
- **B16–B19 — Speak with Dead, Disguise Self, Potions, Concentration.** Detailed rules already preserved in the prior granular study; its evidentiary and bug qualifications remain authoritative for those inherited examples.
- **B20–B22 — Stealth, Non-Lethal Attacks, Equipment.** Read mechanics documentation; bugs and reported irregularities are not generalized into intended rules.
- **B23–B29 — Named relic, forge, alchemy, trade, resting, downed state and hit points.** Specific acquisition, resource and recovery boundaries. Exact balance tables are not reproduced.
- **B30–B32 — Difficulty, romance and multiplayer.** Separate player-selected contracts and companion/player distinctions, not claims of universal emergent social simulation.
- **B33 — Larian second-anniversary update, August 4, 2025.** Primary dated mod counts, community activity and presentation history; downloads are not unique users.
- **B34 — Chris White interviews Borislav Slavov, God is a Geek.** Full primary interview; displayed date December 16, 2024 differs from URL path. Creator statements about process and score, not watched footage.
- **B35 — Brendan Frye interviews Adam Smith, CGMagazine, June 19, 2021.** Full primary pre-release writing/iteration account; later delivery established separately.
- **B36 — William D'Angelo, VGChartz, December 16, 2025.** Search-retrieved report attributes twenty-million-plus sales to a Bloomberg interview. Full-page access failed; underlying interview not newly read. No revenue/profit extrapolation.
- **B37 — Zehnpae and commenters, patientgamers, November 2024.** Original player account and disagreement, not representative polling or helpful-ranked Steam evidence.
- **B38–B39 — Steam community review routes.** Attempted retrieval only; mature-content gate/errors prevented body sampling. Not counted as read reviews.
- **P1–P2 — Existing repository owners.** Prior research retained without changing its original dates, economic metrics, source annotations or viewing claims.

[B1]: https://baldursgate3.game/news/the-final-patch-new-subclasses-photo-mode-and-cross-play_138
[B2]: https://baldursgate3.game/news/hotfix-36-now-live_149
[B3]: https://www.heypoorplayer.com/2023/08/16/baldurs-gate-3-review-pc/
[B4]: https://gaymingmag.com/2023/09/baldurs-gate-3-review-larian-rolls-a-critical-success/
[B5]: https://www.destructoid.com/reviews/review-baldurs-gate-3/
[B6]: https://www.pcgamer.com/baldurs-gate-3-review/
[B7]: https://www.gamesradar.com/baldurs-gate-3-review/
[B8]: https://baldursgate3.game/
[B9]: https://bg3.wiki/wiki/Character_creation
[B10]: https://bg3.wiki/wiki/Classes
[B11]: https://bg3.wiki/wiki/Feats
[B12]: https://bg3.wiki/wiki/Campsite
[B13]: https://bg3.wiki/wiki/Illithid_powers
[B14]: https://bg3.wiki/wiki/Gameplay_mechanics
[B15]: https://bg3.wiki/wiki/Spells
[B16]: https://bg3.wiki/wiki/Speak_with_Dead
[B17]: https://bg3.wiki/wiki/Disguise_Self
[B18]: https://bg3.wiki/wiki/Potions
[B19]: https://bg3.wiki/wiki/Concentration
[B20]: https://bg3.wiki/wiki/Stealth
[B21]: https://bg3.wiki/wiki/Toggle_Non-Lethal_Attacks
[B22]: https://bg3.wiki/wiki/Equipment
[B23]: https://bg3.wiki/wiki/Blood_of_Lathander
[B24]: https://bg3.wiki/wiki/Adamantine_Forge
[B25]: https://bg3.wiki/wiki/Alchemy
[B26]: https://bg3.wiki/wiki/Trading_and_item_pricing
[B27]: https://bg3.wiki/wiki/Resting
[B28]: https://bg3.wiki/wiki/Downed_(Condition)
[B29]: https://bg3.wiki/wiki/Hit_points
[B30]: https://bg3.wiki/wiki/Difficulty
[B31]: https://bg3.wiki/wiki/Romance
[B32]: https://bg3.wiki/wiki/Multiplayer
[B33]: https://baldursgate3.game/news/community-update-35-baldur-s-gate-3-turns-two_143
[B34]: https://godisageek.com/2024/05/it-was-a-long-journey-with-tons-of-special-moments-interview-with-baldurs-gate-3-composer-borislav-slavov/
[B35]: https://www.cgmagonline.com/interviews/writing-the-future-of-baldurs-gate/
[B36]: https://www.vgchartz.com/article/466573/baldurs-gate-3-has-sold-over-20-million-units/
[B37]: https://www.reddit.com/r/patientgamers/comments/1gmj2hu/baldurs_gate_3_the_good_the_bad_the_ugly/
[B38]: https://steamcommunity.com/app/1086940/reviews/?browsefilter=toprated&filterLanguage=english
[B39]: https://steamcommunity.com/app/1086940/negativereviews/?browsefilter=toprated&filterLanguage=english
[P1]: ../games/baldur-s-gate-3.md
[P2]: ../mechanics/baldurs-gate-3-utility-magic-identities-and-consequential-choice.md
