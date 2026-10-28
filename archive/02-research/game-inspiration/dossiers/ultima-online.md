# Ultima Online — full research dossier

**G19 · Complete refresh, October 28, 2026.** Ordinary production shards and **New Legacy** have distinct progression, property and continuity contracts; Season 2 launched October 15 (see §24). Historical September captures are preserved with their access dates, alongside the current primary evidence and independent reviews. [Preserved ecology case](../games/ultima-online-s-ecology.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

**Reading route:** §§1/9 cover persistence and payment; §§2–22 explain play, housing and six worked situations; §§23–26 cover presentation, seasonal scope and reception; §§27–28 cover production, commercial evidence and the ecology correction; the external-creation section documents R15; §29 routes the findings into existing design and qualification.

Ultima Online is one of OpenLegend's most important precedents because it treats a game world less as a sequence of combat encounters and more as a place where players can become **blacksmiths, thieves, animal tamers, shopkeepers, homeowners, murderers, guildmates, treasure hunters, mages, fishermen and politicians of informal player society**. Its strongest systems interlock because ordinary actions change ownership, reputation, scarcity and relationships. Its original ecology's computational and resource-circulation problems are equally valuable, with distinct participant explanations preserved in §§16/28.

## 1. Identity, release and current status

Origin Systems launched Ultima Online on **September 24, 1997** as a persistent online version of Britannia/Sosaria. The official team marked its 29th anniversary on September 24, 2026, explicitly describing the project as an internet experiment expected to last only a few years that instead endured for 29. [UO01](#uo01)

The preserved September 2026 production snapshot records:

- **Publish 124** rolled worldwide in August 2026;
- anniversary rewards began September 24;
- current live events include Shardfall / Echoes of Mondain and weekend events;
- Publish 125 and further client work are publicly planned. [UO01](#uo01) [UO02](#uo02)

The modern service can be accessed through:

- subscription accounts;
- **Endless Journey**, a free-access mode with restrictions;
- special ruleset shards such as Siege Perilous/Mugen;
- the seasonal **New Legacy** shard. [UO03](#uo03)

This matters because “Ultima Online mechanics” are not one frozen 1997 ruleset.

### Persistent places, bounded custody and seasonal renewal

Ultima Online's ordinary production shards support durable public settlements and possessions. This does not mean one global character economy, universal safety, or the absence of encounter instances. The Trammel/Felucca distinction (§17) separates consent rules by facet; Siege/Mugen have separate rules. The historical analysis of that split remains relevant independently of New Legacy.

| Boundary                  | What continues, changes or ends                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shard movement            | Paid character transfer moves permitted character state, carried/banked items and pets. Houses, vendors and guild affiliation do not move; the house stays with its account. Shard-bound items cannot transfer, and Siege/Mugen are excluded destinations. This is a relocation service, not unrestricted world hopping. [E26-06](#e26-06)                                                                                                                                                                                     |
| Encounters                | UO introduced queued, party-specific Medusa/Stygian Dragon arenas in 2009. Their bounded lifetime was separate from the persistent shard; the original detailed timer schedule is historical, not a newly verified 2026 rule. [S26-09](#s26-09)                                                                                                                                                                                                                                                                                |
| Ordinary house absence    | An unpaid account receives a **90-day grace period**, then its house begins decay. Reactivation before the final decay stages refreshes it at the next server startup. Remaining subscribed and merely not visiting are different conditions. [UO18](#uo18)                                                                                                                                                                                                                                                                    |
| Collapse                  | Condemnation removes house access and friend/co-owner lists. Collapse makes surviving contents contestable loot; listed categories, including account-bound items and veteran rewards, are deleted. There is no general private asset-recovery guarantee. The existing 2026 post-collapse placement raffle is a separate land-allocation step. [E26-03](#e26-03) [UO21](#uo21)                                                                                                                                                 |
| Returning account         | Endless Journey becomes available after **120 days inactive** and retains access to pre-existing characters. Its bank restrictions and lack of house ownership mean returning for free is not preservation of the former property's custody contract. [UO03](#uo03)                                                                                                                                                                                                                                                            |
| New Legacy lifecycle      | Season 2 **launched October 15, 2026** and is planned to run through **June 2027**. Seasonal closure/renewal must not be presented as an ordinary production-shard wipe. [S26-01](#s26-01) [E26-01](#e26-01)                                                                                                                                                                                                                                                                                                                   |
| Seasonal exit and housing | Transfers into New Legacy are prohibited; exit opens during the Shattering. Subscribers receive a complimentary transfer, subject to destination slots and excluding Siege/Mugen; Endless Journey accounts must subscribe or buy a token. Skills/stats and eligible item categories can leave, not the whole seasonal world. Paid accounts can own seasonal houses, maintained by quest objectives under a **28-day decay cycle**. Exact final transferable items remain subject to the season's published list. [UO35](#uo35) |

## 2. Character creation: no class lock, just a starting configuration

The main game is fundamentally **classless**. Production character creation also selects a race: humans favor carrying, recovery and baseline versatility; Heartwood elves favor mana, perception and unusual resources; Ter Mur gargoyles use wings instead of mounts and have affinities for Throwing, Mysticism and Imbuing. These are capability differences alongside appearance, not separate mandatory classes. [S26-06](#s26-06)

A character has:

- **Strength, Dexterity, Intelligence**;
- derived Hit Points, Stamina and Mana;
- dozens of trainable skills;
- equipment;
- reputation and social state.

The modern default skill cap is **720 real skill points** across the character's skills. Individual skills can normally reach 100, with later systems such as Power Scrolls allowing selected skills to reach higher mastery levels. The modern stat cap begins at 225 for new accounts and can rise through account age/other systems. [UO04](#uo04)

The important design is not today's exact cap. It is the **budgeted identity model**:

> You are allowed to become very capable, but not equally masterful at everything on one character.

A player can choose combinations such as:

- swords + tactics + healing + anatomy;
- magery + evaluate intelligence + meditation + inscription;
- animal taming + animal lore + veterinary;
- mining + blacksmithing + arms lore + tinkering;
- hiding + stealth + stealing + snooping;
- fishing + cooking + cartography + treasure hunting.

These are community “templates,” not engine-enforced classes.

### Skill atrophy makes identity editable

Skills can be set to:

- **Raise**;
- **Lock**;
- **Lower**.

When a capped character gains a skill, points can be pulled from skills set to Lower. [UO04](#uo04)

So changing profession is not a respec token that erases the character. It is **learning one capability while allowing another to decay**.

OpenLegend could use the same idea for:

- practiced skills;
- forgotten expertise;
- physical conditioning;
- language fluency;
- institutional knowledge.

The character remains the same person while their usable competence changes over time.

## 3. Skill progression is use-based

UO's core skill-gain system is explicitly **use based**:

- successfully use a skill;
- receive a chance to gain that skill;
- increasingly difficult practice is required as skill rises.

The Guaranteed Gain System later added a backstop so unlucky/infrequent players eventually receive a gain after sufficient successful uses without one. [UO05](#uo05)

Examples:

- cast spells to improve Magery;
- fight with swords to improve Swordsmanship;
- tame increasingly difficult animals to improve Animal Taming;
- craft appropriate-difficulty goods to improve crafting;
- stealth under increasingly difficult armor burden to improve Stealth. [UO06](#uo06) [UO07](#uo07)

NPC trainers can teach the initial portion of many skills for gold. [UO08](#uo08)

### Why this is different from XP

A player does not kill ten wolves and spend abstract XP on tailoring.

The action itself supplies the learning context.

That gives the world causal legibility:

- practice blacksmithing → become a blacksmith;
- practice hiding → become better at hiding.

**OpenLegend lesson:** when a capability has a natural practice action, use that action as progression evidence rather than routing everything through generic XP.

### Grinding danger

Use-based progression also encourages players to optimize repetitive training loops and macro-like behavior. UO repeatedly revised skill-gain rules to limit degenerate training and make high-end gains less arbitrary. [UO05](#uo05)

The lesson is not “use-based is always better.” The learning loop must remain an interesting activity rather than a macro tax.

## 4. Stats and bodily capability

Strength, Dexterity and Intelligence feed into:

- hit points;
- stamina;
- mana.

Stat gain is linked to skill usage and can also be set to Raise/Lower/Lock. [UO04](#uo04)

This creates an interdependence between:

- what you practice;
- what your body/mind becomes good at;
- what equipment/combat/magic you can sustain.

UO is not a full body simulation; it is still an RPG stat model. But the system is more embodied than a completely separate “character level.”

## 5. Combat: skill, equipment and positioning rather than level-gated roles

Combat has evolved enormously since 1997, but the persistent structure is:

- weapon skill determines chance/effectiveness;
- tactics/anatomy and other skills modify combat;
- armor/resistances and equipment matter;
- stamina affects attack cadence;
- active weapon moves/masteries exist in the modern game;
- healing can be physical, magical or ability-based;
- players can mix combat with noncombat skills.

There is no universal tank/healer/DPS class lock.

A blacksmith can also be a capable warrior if they invest the skill budget.

### Melee

Weapon families include:

- swords;
- fencing;
- macing;
- archery;
- throwing in later expansions.

Related skills and item properties create build synergies. [UO09](#uo09)

### PvE and PvP use the same world-facing capabilities

The same skills used against monsters can be used against other players where the ruleset allows it.

That makes capability feel **world-valid**, not mode-specific.

The cost is balance complexity: an ability useful in PvE can become oppressive in PvP, and a virtual-world ruleset must manage consent/criminality as well as combat numbers.

### Bards change the encounter

Musicianship and an actual, wearing instrument support **Peacemaking** (interrupt or pacify), **Discordance** (weaken creatures), and **Provocation** (make creatures fight). These require range and successful checks; failed provocation can turn both targets against the musician. PvP Discordance has different effects from the creature debuff. [S26-03](#s26-03)

## 6. Magery and the broader spell ecosystem

Classic **Magery** remains one of UO's most expressive systems.

It has **64 spells across eight circles**, with progressively greater:

- skill requirements;
- mana cost;
- cast time;
- reagent requirements. [UO10](#uo10)

The spell vocabulary includes:

- direct damage;
- healing/cure;
- poison;
- buffs/debuffs;
- summoned creatures;
- fields;
- telekinesis;
- lock/unlock;
- invisibility/reveal;
- travel;
- resurrection.

This matters because magic does more than damage.

A mage can:

- unlock a chest;
- create food;
- teleport;
- open a gate;
- cure poison;
- resurrect a ghost;
- summon helpers;
- manipulate encounters.

UO later added additional schools such as:

- Necromancy;
- Chivalry;
- Bushido;
- Ninjitsu;
- Spellweaving;
- Mysticism.

Different schools use different costs/requirements: Magery, Necromancy and Mysticism use reagents; Chivalry uses tithing; some others do not require reagents. [UO11](#uo11)

### OpenLegend lesson

A “magic system” is richer when spells interact with:

- travel;
- containers;
- death;
- creatures;
- reputation;
- information;
- environment.

The engine should expose world capabilities that magic can invoke rather than building a second disconnected “magic combat” reality.

## 7. Items, weapons, armor and property composition

UO has accumulated decades of item systems:

- mundane crafted equipment;
- magical/random-property equipment;
- artifacts;
- named rewards;
- slayer properties;
- runic crafted gear;
- imbued properties;
- expansion/event items;
- blessed/insured/cursed state.

The important pattern is that **items remain transferable world objects**:

- carried;
- dropped;
- placed in containers;
- locked down in homes;
- sold by players;
- looted;
- stolen where allowed;
- repaired;
- crafted;
- insured.

Modern item insurance changes death risk:

- insured items return to the player after resurrection;
- uninsured items remain on the corpse and can be lost;
- in Felucca other players may loot those items;
- Siege Perilous does not use item insurance. [UO12](#uo12)

That creates configurable loss without making the object system purely account-bound.

**Upgrading is also a resource transformation.** At a soulforge an artificer unravels unwanted magical equipment, destroying it for ingredients, then combines these with gems and sometimes rarer materials to add or overwrite allowed properties. The menu exposes cost, intensity and success chance; failure consumes some ingredients. Controlled Imbuing and more random Runic Reforging offer different tradeoffs, rather than a single universal upgrade level. [S26-04](#s26-04)

## 8. Crafting is an actual profession

Crafting is one of UO's foundational strengths because crafted goods enter the same world used by adventurers.

### Blacksmithing

Blacksmiths can:

- craft/repair metal weapons and armor;
- use different ingot/material types;
- create exceptional items;
- put a maker's mark on qualifying work;
- salvage;
- combine with Arms Lore, Mining, Tinkering and Imbuing. [UO13](#uo13)

### Tailoring

Tailors can:

- shear sheep;
- collect wool;
- spin material;
- use looms;
- make clothing/leather armor;
- mark exceptional work;
- combine with other craft skills. [UO14](#uo14)

### Carpentry

Carpenters turn lumber into:

- furniture;
- containers;
- lockable objects;
- house add-ons;
- forges;
- looms;
- beds and social/decorative infrastructure. [UO15](#uo15)

### Bulk Order Deeds

Later crafting progression includes bulk-order jobs:

- fill requested orders;
- earn reward points/items;
- store/trade orders in Bulk Order Books;
- sell individual orders through player vendors. [UO16](#uo16)

### Why this matters for OpenLegend

A profession becomes meaningful when:

- it has inputs from the world;
- its products persist;
- someone else wants those products;
- maker identity can remain attached;
- the product participates in other systems.

“Craft 10 swords for XP, then vendor-trash them” is weaker than a sword entering another person's life.

## 9. Player economy: homes become stores and infrastructure

UO's economy is not merely an auction UI layered over combat loot.

Players can place **NPC vendors in player houses**:

- stock items;
- set individual prices/descriptions;
- pay the vendor's wages;
- lease vendor locations to another player;
- operate shops from real player property.

Modern Vendor Search can locate items by property/price and produce a map or paid teleport route to the actual vendor. [UO17](#uo17)

This retains an important spatial fact:

> The item is for sale **somewhere in the world**, at someone's shop.

Search improves usability without fully deleting place.

### OpenLegend lesson

Markets can preserve:

- seller identity;
- location;
- logistics;
- reputation;
- local specialization

while still offering search tools.

An abstract global market is convenient but erases many social/economic hooks.

### What payment changes

**Endless Journey** is a substantial free mode, with the same ordinary 720 skill cap and access through Stygian Abyss. Its bank holds 20 items, expandable to 28; an over-cap legacy bank is viewable but withdrawals require resolving account restrictions. It cannot own/co-own houses, operate vendors, launch boats, harvest advanced ores/woods or create guilds. Thus subscription changes production, storage and social roles, not just appearance. High Seas and Time of Legends require separate purchases under either account mode. [UO03](#uo03)

**Sovereigns** buy in-game store items; expansions, boosters and game-time entitlements use account-applied purchases. Most store items are not account-bound, with item-specific exceptions. Currency itself cannot move between master wallets. [E26-04](#e26-04) Current inventory includes a token granting five chosen skills at 90, extra stable capacity, merchant-fee reductions and event-point boosters: money can buy progression shortcuts, throughput and convenience as well as decoration. This is not evidence that payment guarantees competitive victory. [E26-05](#e26-05)

New Legacy also restricts advanced builds/major hybridization to subscribers. [UO35](#uo35) Its store opened October 20, superseding the launch article's later planned opening. Season 2's paid fortune potion doubles specified boss/event rewards within stated caps and doubles house-refresh objective credit; ordinary-store effects should not be copied wholesale onto the seasonal shard. [E26-01](#e26-01) [E26-02](#e26-02)

## 10. Housing: property creates durable place

Housing places a player-authored building in eligible shared world space; it can become a shop, workshop, guild hall, museum or home. [UO18](#uo18)

**Author and revise.** After acquiring a customizable plot, use its sign to enter Customize. Choose and place floors, walls, doors, stairs or teleporters; illegal supports turn orange. The draft persists between sessions while visitors see the last committed building. Backup/Restore preserve a draft; Revert returns to the committed version. Commit charges or refunds the value difference and makes the revision visible and usable. Affected possessions move into an owner-accessible moving crate, whose contents must be recovered; it is not a portable house-export container. A nonempty crate blocks demolition. [UO19, building](#uo19)

**Use and share.** Public admission does not grant every interior permission. Doors, teleporters and containers have separate access levels; co-ownership is account-wide, friendship character-specific. Secure containers allow permitted withdrawals; locked-down displays can be viewable without surrendering their contents. Owners can admit or ban visitors, place vendors/barkeeps, lease vendor space, trade the house or demolish it. Moving a container can remove its secure state, requiring it to be secured again. [UO19, managing](#uo19)

This is a documented in-world creation lifecycle, not an executed editor test or proof of a portable invention-package format. The important opportunity is useful shared space; update, access and custody costs belong in the same workflow as attractive construction.

### Scarcity is physical

Housing plots occupy world space and historically created severe land pressure.

Third Dawn's 2001 review specifically praised the new Ilshenar landmass for forbidding player housing because the older world had become visually choked with houses. [UO20](#uo20)

In February 2026 the production game added a **raffle-style plot process** after decayed houses collapse, specifically to make newly available scarce land contestable without an immediate click-race. [UO21](#uo21)

This is a rich design tension:

- persistent property creates attachment;
- permanent scarce property can crowd the world and entrench incumbents.

OpenLegend should distinguish:

- private instanced property;
- scarce public land;
- creator/admin land;
- temporary leases.

## 11. Death, ghosts, corpses and resurrection

Death in UO historically created a striking world-state transition.

A dead player becomes a **ghost** and must seek resurrection through:

- healers;
- shrines/ankhs;
- other players capable of resurrection;
- specialized virtues/spells/items.

The current enhanced-client map can even show resurrection points and the location of the corpse. [UO22](#uo22)

The corpse remains a world object containing uninsured possessions. After resurrection, the player can return to recover it.

This creates a sequence:

1. lose body;
2. persist as ghost;
3. navigate socially/spatially for revival;
4. return for possessions;
5. risk further loss while doing so.

Modern insurance softens item consequences, but the underlying death-state model is unusually diegetic.

### OpenLegend lesson

Death does not have to be:

> screen fades → reload checkpoint.

It can be a **state with capabilities, dependencies and social rescue opportunities**.

## 12. Theft and snooping are real player verbs

UO implements stealing as a normal skill family.

A thief can:

- steal from world containers;
- steal special PvE items;
- in Felucca/ruleset areas, steal from other players;
- use **Snooping** to inspect another player's backpack and target particular items;
- join the Thieves Guild under the relevant rules. [UO23](#uo23) [UO24](#uo24)

Restrictions matter:

- insured/blessed/container/heavy items cannot always be stolen;
- stealing from a player is a hostile/criminal act;
- ruleset determines whether the action is allowed.

This is systemically powerful because **the item and property model actually allows theft** rather than treating inventory as metaphysically private.

OpenLegend should borrow the principle only with clear consent/safety design:

- capability;
- permission/ruleset;
- witnesses;
- ownership transfer;
- consequence.

## 13. Crime and murder: PvP is a social/legal state

In Felucca-style rulesets, attacking an innocent player can make the attacker criminal.

If the victim dies and reports the murder:

- murder counts accumulate;
- at five or more successive reported murders the player becomes a red murderer;
- murderers face travel/NPC/virtue restrictions;
- they become valid targets in ways ordinary innocents are not. [UO25](#uo25)

This is more interesting than simply enabling PvP damage.

The system connects:

- attack;
- victim;
- reporting;
- reputation/legal status;
- NPC services;
- travel permissions;
- future combat vulnerability.

### OpenLegend inspiration

Crime should be **an interpreted event**:

- who had jurisdiction?
- was the target protected?
- who observed/reported it?
- what does the institution know?
- what sanctions follow?

UO's implementation is still mostly global/ruleset-based, but it points toward the right causal chain.

## 14. Fame, karma and virtues

UO also tracks broader reputation.

Modern **Fame and Karma** derive from:

- monster killing;
- industry/rewards;
- good/evil acts.

They affect titles and some systems such as Chivalry/Necromancy. [UO26](#uo26)

The **Virtue System** layers Ultima's eight virtues into gameplay. [UO27](#uo27)

This is a more abstract morality layer than OpenLegend's intended observer-specific knowledge/reputation.

The lesson is mixed:

- broad moral identity is readable;
- one global karma number can erase disagreement/context.

OpenLegend should prefer:

- per-person/faction beliefs;
- evidence/provenance;
- institutional law

while using global reputations only when the fiction genuinely supports them.

## 15. Animal taming: a creature can become a persistent partner

Animal Taming allows characters to tame animals and monsters. Control depends on:

- Animal Taming;
- Animal Lore;
- creature difficulty. [UO28](#uo28)

Pets can:

- follow;
- fight;
- transfer between owners;
- be stabled;
- develop through later **Animal Training**.

Modern Animal Training can customize:

- stats/resists;
- skill caps;
- magic schools;
- special abilities;
- special moves;
- area effects

within explicit capacity constraints. Choices are final. [UO29](#uo29)

The official wiki itself notes the irrational-seeming affection players form for favorite “bunches of pixels.” [UO28](#uo28)

### Why pets acquire meaning

A tamed creature is:

- a persistent named object/actor;
- useful;
- trained over time;
- vulnerable enough to care about;
- customized.

OpenLegend can deepen this by adding:

- memory;
- personality;
- needs;
- changing trust;
- independent goals.

The underlying attachment loop already existed without an LLM.

## 16. The failed ecology experiment

<a id="what-actually-failed"></a>

Lead designer Raph Koster's 2024 retrospective separates costly radial searches/pathfinding, which helped remove ecology AI during beta, from a finite resource loop clogged by players turning sheep into wool, making shirts for advancement and retaining the output. Disabling ecology AI did not eliminate all resource mechanics. This qualifies Garriott's harvesting account; neither retrospective supplies complete contemporaneous measurements. Test computational cost and resource circulation under actual incentives. [P26-01](#p26-01)

### OpenLegend application

Any simulated resource/ecology must be stress-tested against:

- maximum harvesting;
- hoarding;
- automation;
- resale;
- extinction;
- monopolization;
- griefing.

Do not rely on players to voluntarily preserve a system whose incentives reward exhausting it.

## 17. Trammel and Felucca: one world split by consent philosophy

**Ultima Online: Renaissance (2000)** created a famous ruleset split:

- **Felucca** retained freeform hostile PvP/theft and harsher interaction;
- **Trammel** mirrored much of the geography but prevented ordinary non-consensual harmful player interaction except in specific consensual structures such as guild wars. [UO31](#uo31)

The change made UO much more accessible to players who did not want constant predation.

It also became one of MMO design's enduring arguments:

- supporters valued safety and broader participation;
- critics believed separating risk reduced the density/meaning of player dependence and organic lawlessness.

A GameFAQs Renaissance review from one player specifically argues the split damaged player towns/community; that is **one player interpretation**, not an established population-wide outcome. [UO32](#uo32)

### OpenLegend lesson

Consent modes change the _social ecology_, not just damage flags.

If players can:

- rob;
- murder;
- destroy;
- betray

then:

- guards;
- trust;
- escorts;
- safe settlements;
- reputation

matter differently.

OpenLegend can support worlds with different governance/violence contracts instead of assuming one universal risk model.

## 18. Guilds, factions and player society

Players can form/join guilds, organize wars and create durable social identity.

Over the game's history players also produced:

- roleplay towns;
- shops;
- guild halls;
- PvP communities;
- crafting businesses;
- events;
- alliances/rivalries.

PC Gamer's retrospective identifies this as the core historical leap: UO was a world to **exist in**, where other players became the strongest friends and enemies and adventures were self-determined rather than a sequence to beat. [UO33](#uo33)

The system did not need every institution to be hard-coded.

Housing + trade + guild identity + PvP + speech + persistent names already allowed players to invent:

- social norms;
- markets;
- territorial identity;
- reputational knowledge.

### OpenLegend opportunity

A hypothesis for OpenLegend is that inhabitants could sustain meaningful councils, guild roles, shops, laws, family obligations or religious organizations with one human participant. UO establishes the human social precedent; independently chosen, useful conduct by OpenLegend's inhabitants still needs qualification.

**Vice versus Virtue** replaced the older faction system. Guild-based participants contest cities through occupation, kills, stolen sigils and altars, earning silver for rewards. Its rules also warn approaching nonparticipants: remaining in an active battle or assisting combatants can expose them to attack. This is a specific regional consent contract, not blanket safety from declining enrollment. [S26-10](#s26-10)

### Connected history, cultures and motives — spoilers

The shattered **Gem of Immortality** supplies a cosmological explanation for servers: shards share an origin, then develop different inhabitants and histories. This makes local player institutions compatible with a common world premise rather than requiring every shard to be the same canonical present. [S26-06](#s26-06)

The official _Voices_ fiction connects Mondain's defeat to rebuilding Britannia and displaced peoples: survivors of Rondorin gather at Zento in Tokuno, while other lands fall into war. Later, **Minax** wants Shadowguard to move through time so she can deploy armies against any era. Her servant **Anon** uses sacrifice and demonic magic; **Hawkwind**, the Time Lord, attempts to protect the continuity of time. Their conflicting spells, reinforced by voices across the shards, entangle Shadowguard with **Eodon**. Blackthorn warns that Minax remains dangerous: she has lost her protected retreat, leaving the people of Sosaria to confront her. This is the story bridge into _Time of Legends_, not a claim that every player's quest permanently ends the shared threat. [S26-07](#s26-07)

Britannia's moral geography connects **Truth, Love and Courage** to Moonglow's Lycaeum, Yew's Empath Abbey and Serpent's Hold, then to eight virtues and their shrines. Compassion has a practical expression: escorting or rescuing NPCs builds the ability to restore more health when resurrecting another player. Geography, ethical identity and a useful social capability reinforce one another. [UO27](#uo27)

Ter Mur is also a society rather than merely a race-selection screen. In _The Oracle and the Bard_, mage **Mariah** visits seer **Naxatilor** to share pastries, local food and scholarship. When a vision injures him, **Queen Zhah** protects the elder and sends a warning to Britannia's king. These authored relationships make mutual care and diplomacy legible; they do not establish autonomous NPC memory. [S26-08](#s26-08) The 2009 _Stygian Abyss_ rules gave service to the Queen material consequences: loyalty earned through quests and fighting opened privileged housing and soulforge access. Its tombs and passages join ancestral history, puzzles, monsters and settlement privileges. [S26-09](#s26-09)

## 19. NPCs and AI

UO NPCs include:

- merchants;
- trainers;
- bankers;
- healers;
- guards;
- quest/event characters.

Players historically interact through:

- speech keywords;
- context menus;
- vendor/trainer services.

Current player-owned vendor NPCs have highly bounded functions; they are not autonomous merchants. [UO17](#uo17)

The world feels social primarily because of **other human players**, not because NPCs possess deep cognition.

## 20. World map, travel and dungeons

The game's geography grew across expansions:

- Britannia;
- The Lost Lands;
- Trammel/Felucca facets;
- Ilshenar;
- Malas;
- Tokuno Islands;
- Ter Mur;
- later expansion regions/dungeons.

Travel systems include:

- walking/riding;
- ships;
- moongates;
- Magery Recall/Gate Travel;
- runebooks/runic atlases;
- expansion-specific constraints.

Third Dawn's Ilshenar deliberately disabled Mark/Recall/Gate travel in its reviewed rules, creating a different relationship to exploration. [UO20](#uo20)

This is a useful pattern:

- **the same engine can give regions different mobility laws**.

OpenLegend world packages can similarly define:

- teleport prohibited;
- flight impossible;
- magic unstable;
- roads privileged

as world law rather than hardcoded universal game rules.

**Ships are working property.** Launch a deed at unobstructed water, board by plank or rope, then steer with tillerman commands, plotted map pins or the wheel. Ships support fishing, cargo, mining and piracy; galleon permissions distinguish passenger, crew and officer responsibilities. Cannons, damage and wood/cloth repairs connect fighting to production. Severe damage changes boarding access according to the facet's rules; emergency repair and returning ashore are different decisions. Unrefreshed vessels can decay with cargo. [S26-05](#s26-05)

## 21. Quests, events and activities

UO was never defined by a single main quest.

Combat, dungeons/champion encounters and treasure hunting coexist with crafting/bulk orders, fishing, taming, stealing, gathering, decorating, shopping, guild life, PvP and authored quests/events.

This variety makes the game closer to a **world activity platform** than a campaign RPG.

Current 2026 publishes continue that model with:

- Shardfall;
- Echoes of Mondain;
- weekend events;
- anniversary rewards;
- continuing housing/combat/system changes. [UO02](#uo02)

**Treasure hunting combines professions.** Obtain a map from loot or quests, decode it with Cartography, compare landmarks, dig, defeat the guardians, unlock and disarm the chest. Cartography affects the search; Lockpicking or eligible magic and Remove Trap solve different barriers. Since the 2019 redesign, triggering the old trap with Telekinesis is not a substitute for disarming it. [S26-02](#s26-02)

**Mature combat has progression stakes.** Champion areas advance through monster stages to a boss; Valor can start or advance that encounter. [UO27](#uo27) Felucca champion rewards include tradable skill-cap scrolls, while some professions obtain their scrolls through jobs or quests. Consuming a scroll raises a ceiling rather than granting the missing expertise. The distinction preserves reasons both to pursue dangerous rewards and to continue practicing. [S26-11](#s26-11)

### Six worked situations

These are constructed examples of documented rules, not claimed play sessions or guaranteed economic outcomes.

| Goal and starting conditions                                   | Actions, interaction and next decision                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A crafter wants a public workshop with private stock.          | Build an accessible working floor and restricted upstairs storage; commit, then check the separate door/container permissions with a visitor. If a renovation displaces the vendor, recover it before expecting customers to shop. The next choice is who needs co-ownership rather than simple admission. [UO19](#uo19)                    |
| A bard cannot safely defeat two creatures directly.            | Select an instrument, attempt Provocation on the pair and remain within range. Success redirects their attacks and grants the bard appropriate credit; failure makes the musician the target. The player must decide whether to maintain position, recover control or retreat. [S26-03](#s26-03)                                            |
| A hunter finds a difficult treasure map.                       | Decode and locate it, recruit combat help, then dig. Guardians prevent opening; disarming can bring further threats. The chest's roughly hour-long lifetime makes preparation valuable. After success, divide profession-themed supplies and decide whether the group can handle a harder map. [S26-02](#s26-02)                            |
| An artificer has unwanted magical loot and an incomplete suit. | Unravel the surplus, choose an eligible item/property and inspect cost and success chance. Attempting the improvement trades ingredients for a controlled benefit; failure leaves fewer inputs. The next choice is another attempt, gathering missing materials or buying a suitable finished piece. [S26-04](#s26-04)                      |
| An adventurer dies near dangerous creatures.                   | The ghost seeks a capable friend; that friend's prior Compassion work can improve resurrection health. Recovery still requires confronting the corpse's location and item rules. The pair can retrieve possessions together or postpone a risky return, making rescue capability useful beyond damage output. [UO22](#uo22) [UO27](#uo27)   |
| A cargo captain must cross obstructed water.                   | Plot a route, let the tillerman follow it, then take manual control when an obstacle blocks progress. Crew permissions support shared operation without automatically sharing the hold. If fighting disables the vessel, repair and boarding rules change the risk; decide whether to finish delivery or return to shore. [S26-05](#s26-05) |

The common mechanism is a capability meeting another system's need. Requiring several capabilities can create a useful relationship; it can also become an opaque prerequisite chain. OpenLegend should validate whether participants understand the need and can find a satisfying role before adding more interdependence.

## 22. Loot and reward loops

Loot comes from:

- monsters/bosses;
- treasure maps;
- dungeons;
- crafting rewards;
- bulk orders;
- events;
- stealing;
- player commerce.

Because items remain tradable/worldly, one player's loot can become:

- another player's equipment;
- a shop's inventory;
- a house decoration;
- a crafting input;
- a collector's artifact.

That makes acquisition socially reusable.

The long-running downside is item/economy complexity and inflation:

- decades of property tiers;
- legacy items;
- event rewards;
- gold accumulation.

A virtual economy becomes **history-bearing technical debt** as well as content.

## 23. UI, art and feel

Classic UO uses:

- isometric 2D world art;
- freely movable UI “gumps”;
- drag/drop physical item manipulation;
- backpacks represented as containers;
- targeting cursors;
- text speech above characters.

The official getting-started guide distinguishes the original client from the Enhanced Client's revised graphics, radar, visible macro bar and configurable interface. Client choice changes interaction presentation without making it a different world. [S26-06](#s26-06)

The original interface can feel opaque and archaic to modern players, but it reinforces object identity:

- a bag is a bag you open;
- an item can be dragged into another container;
- a corpse is a container in the world.

GameSpot's historical reviews repeatedly praised the unusual virtual-world depth while criticizing:

- dated visuals;
- choppy animation;
- newcomer hostility;
- technical/UI friction. [UO34](#uo34) [UO20](#uo20)

A concrete information cue is treasure digging: the official guide describes audible digging followed by a growing dirt patch and an emerging chest, allowing a prepared hunter to anticipate its guardians. [S26-02](#s26-02) In his **2005 Samurai Empire-era** review, Hubbard heard Far Eastern musical themes reinforcing Tokuno's setting, while criticizing uneven effects and tiny inventory targets that caused accidental bag dragging. These are source observations, not a fresh audiovisual playtest. [UO39](#uo39)

## 24. New Legacy: current seasonal reinterpretation, not the main ruleset

**New Legacy** began in 2024 as a seasonal reinterpretation of UO. Narrative and job-board progress can award skill advancement distributed at trainers, rather than only the production game's use-based training. Guild levels/resource banks and housing prerequisites connect that progression to settlement. Its exit and property contracts are in §1. [UO36](#uo36) [UO37](#uo37)

### September 26, 2026 status

The earlier research recorded Season 1's September 28 transfer deadline and planned October 1 soft launch, October 13 wipe and October 15 Season 2 opening. These are preserved historical plans. [UO35](#uo35)

### October 28, 2026 update

Season 2 **launched on October 15**. Its delivered additions include contextual onboarding, a Paladin of Trinsic path through Chivalry, player-specific family heirlooms, and crafting that reuses scrap and improves equipment. These belong to this seasonal interpretation, rather than retroactively describing every production shard. The September plans above remain historical evidence of its transition. [S26-01](#s26-01)

### OpenLegend comparison

New Legacy demonstrates:

- same underlying world/content;
- alternate progression/persistence contract.

OpenLegend can support:

- persistent main worlds;
- seasonal scenario worlds;
- challenge worlds

without forcing one ruleset onto every authored reality.

## 25. Five written reviews / retrospectives

The September capture's five historical reviews remain below. On October 28, the full GameRevolution, Renaissance and two-page Hubbard reviews were reread; the 1997 GameSpot and Third Dawn bodies were inaccessible, so their earlier attributed findings are preserved rather than presented as new verification. Two further substantial firsthand accounts add the 2018 free-player opening and a 2026 return to Great Lakes. Together these supply five freshly read independent assessments, with different purposes and eras rather than five interchangeable scores.

### 1. GameSpot — Desslock, December 1997

**Liked / recognized:** extraordinary ambition, unprecedented complexity, thousands of players in a persistent dynamic fantasy world.

**Disliked:** severe lag/technical problems, design frustration, enormous patience/time requirement and the sense of playing a game still being finished after release. The review gave a harsh 4.9 despite recognizing the concept's importance. [UO34](#uo34)

This is a useful reminder that historical influence does not make a bad launch acceptable.

### 2. Game Revolution — February 1998

**Liked:** called the experience revolutionary, brilliant and addictive; repeatedly returned because the combination of fantasy RPG and real human population felt unlike prior games.

**Disliked:** unpolished, buggy, confusing and frustrating.

The reviewer also regularly adventured with school friends living abroad whom they otherwise rarely saw. This is observed continued play and renewed relationships, not a retention estimate. The account weights the unprecedented social world differently from GameSpot's launch criticism. [UO38](#uo38)

### 3. GameSpot — Renaissance, 2000

**Liked:** by 2000 the game had substantially improved, still offered unusual long-term freedom, and Trammel broadened safe participation.

**Disliked / qualification:** old graphics/animation and onboarding made it hard for newcomers to recognize what veteran players loved.

The review ultimately described Renaissance as rewarding across player types despite dated presentation. [UO31](#uo31)

### 4. GameSpot — Third Dawn, 2001

**Liked:** new Ilshenar content and updated presentation; existing UO remained a distinctive mature online world.

**Disliked:** the new 3D client was not enough to make the game newcomer-friendly; housing had visibly overwhelmed older landscapes; newer competitors made its age obvious. [UO20](#uo20)

### 5. MMORPG.com — Reed Hubbard, 2005

**Liked:** Samurai Empire offered complementary samurai/ninja approaches, creatures to tame, and Japanese house tiles for gardens and dojos. Hubbard judged these satisfying additions for veterans.

**Disliked / qualification:** by the Samurai Empire era the aged engine/interface and complexity created a substantial barrier; the Japanese-theme expansion added professions/content but remained built on an old system. [UO39](#uo39)

### Additional long-view criticism — Lord Blackthorn's Revenge

GameSpot's later review framed UO's biggest enduring strength as something competitors still did poorly: characters could become adept at meaningful occupations other than killing fauna. Its critique was that this unique world was increasingly buried under dated presentation and complexity. [UO40](#uo40)

### Further independent firsthand assessments

**Eliot Lefebvre, MassivelyOP, April–May 2018 — Endless Journey newcomer, Enhanced Client.** His attempt to play a paladin stalled on finding abilities, closing windows, paying a tithe and understanding spell feedback. He eventually killed a small creature but died again without a clear grasp of recovery. These are his experienced failures of explanation, not a current mechanics guide. [R26-01](#r26-01) He then ended the UO column early, citing onboarding, interface and technical friction. His statement that he would have left earlier outside paid work is counterfactual; the shortened series is the documented stopping behavior. He explicitly declined to treat that experience as an evaluation of everything veteran UO players enjoyed. [R26-02](#r26-02)

**Arturo V Bauermeister, May 22, 2026 — personal return essay, Great Lakes.** After about 25 years away, he actually returned at a childhood friend's invitation. He found maintained houses, stocked vendors, bank gatherings and practical generosity, including receiving a high-level skill scroll. He describes a community remembering a deceased player through stories and a planned memorial. The appeal was continuity with people and places, extending beyond replaying childhood adventures. This is a substantial firsthand account of return and social meaning, not a systematic game review, measured retention result or population survey; it does not establish how long he subsequently stayed. [R26-03](#r26-03)

## 26. Player testimony and community preferences

### Historical freedom stories

PC Gamer's retrospective describes the writer being chased down, killed and robbed of essentially everything they owned—and remembering it as extraordinary precisely because the game allowed societies/stories beyond authored quests. [UO33](#uo33)

That is not evidence everyone enjoys full-loot danger. It is evidence that **consequence can produce durable memory for the audience that opts into it**.

### Trammel disagreement

Historical player commentary remains divided:

- one audience valued the ability to play without involuntary theft/murder;
- some veteran sandbox players believed the split weakened player towns/dependence/community. [UO32](#uo32)

That conflict is valuable; there is no need to pick a universal winner. The ruleset determines what social institutions become necessary.

### Housing

Long-running community attachment to:

- houses;
- vendors;
- decorations;
- rare land

is visible even in current 2026 development, where the team continues updating house-placement rules and explicitly cites player homes/shops/gathering places as core to the world's life. [UO21](#uo21) [UO41](#uo41)

### Synthesis and sampling boundary

The accounts describe different access to the same promise: established friends and useful places supported continued participation, while an unassisted newcomer struggled to reach meaningful activity. For OpenLegend, let an early practical interaction reveal why a place or person matters, then observe whether players voluntarily return to it. Persistent storage and named inhabitants supply possibilities; believable usefulness, relationships and player choice must supply the motivation. The Great Lakes story also concerns real human relationships, so it cannot establish that AI inhabitants will produce the same attachment.

Steam sampling remains inapplicable: official access was checked through UO's account/client route, and no official Steam store listing was found in this check. There are consequently no Steam hours, votes or sentiment proportions to report. [R26-04](#r26-04)

## 27. Production history and major evolution

Major milestones include:

- **1997 — Ultima Online**
- **1998 — The Second Age** adds Lost Lands/content
- **2000 — Renaissance** creates Trammel/Felucca split
- **2001 — Third Dawn** adds new client/Ilshenar
- **2002 — Lord Blackthorn's Revenge**
- **2003 — Age of Shadows** adds major item/housing/class-system changes
- **2004 — Samurai Empire**
- **2005 — Mondain's Legacy**
- **2009 — Stygian Abyss**
- **2010 — High Seas**
- **2015 — Time of Legends**
- **2018 — Endless Journey** free-access mode
- **2024 — New Legacy Season 1**
- **2026 — Publish 124, 29th anniversary; New Legacy Season 2 launched October 15** (current boundary in §24). [UO42](#uo42)

The game repeatedly changed foundational assumptions:

- PvP consent;
- item properties;
- insurance;
- housing;
- clients;
- expansions;
- onboarding;
- account model.

This chronology demonstrates continued adaptation. That adaptation contributed to longevity is a plausible inference, not something the chronology alone proves.

### Production practice and actual promotion

Participant interviews in Wes Locher's _Braving Britannia_ excerpt describe a prototype using the Ultima VI engine while the new engine was unfinished; scripts written before their language existed then required rewriting. Designers also supplied art when specialist capacity was scarce. Chris Mayer recalls joining the live team in 1998 after original programmers had been reassigned, inheriting fragile dependencies and frequent outages. Separate development, QA and live branches helped stabilize delivery. These are recollections of particular production conditions, not an audited universal explanation for every launch problem. The positive surprise was equally concrete: players turned clothing and shared places into guild identity, weddings and social performances. [P26-02](#p26-02)

Actual promotion included an October 2024 veteran preview weekend for the ClassicUO web client around New Legacy's launch, with a feedback channel and a subsequent free-access rollout announced. This demonstrates an access-and-return campaign; no attributable conversion or retention result was found. [P26-03](#p26-03)

### Commercial evidence and limits

| Date and scope                                        | Evidence                                                                                                                              | Limit                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1997 original development; June 2026 recollection     | Raph Koster put UO's development cost at **US$2 million** in a participant interview. [E26-07](#e26-07)                               | Retrospective estimate; accounting inclusions unspecified, not lifetime development/operations spending.                                                                                                                               |
| FY2001 and March 31, 2002; title subscribers          | EA reported about **200,000 average paying customers in FY2001**, and **207,000 at March 31, 2002**. [E26-08](#e26-08)                | Historical paying-customer measures; neither a verified lifetime peak nor current activity.                                                                                                                                            |
| FY2005; publisher assessment                          | EA explicitly described UO as successful while discussing mixed results from its persistent-world products. [E26-09](#e26-09)         | Attributed qualitative outcome; no standalone margin.                                                                                                                                                                                  |
| Historical/current title revenue and continuing costs | No reliably isolated annual/current or lifetime UO receipts and complete operating/marketing totals established in this bounded pass. | EA.com combines several services; parent/company figures cannot be assigned to UO.                                                                                                                                                     |
| Title profit and ROI                                  | **Not estimable** from the inspected evidence.                                                                                        | Need realized subscription/store/expansion receipts, regional pricing/mix, operating costs, development amortization and publishing allocations. A subscriber snapshot multiplied by today's price cannot reconstruct lifetime profit. |

**Outcome inference:** the historical paid audience, publisher assessment and continuing service support treating UO as a durable commercial precedent. They do not establish present growth or prove that its loss rules caused that durability. Its positive opportunity for OpenLegend is legible, useful participation—making goods, hosting places and helping others recover—whose history remains meaningful. The transfer question is which authored worlds benefit from shared scarcity and upkeep, with clear consent and absence rules, not whether every OpenLegend world should inherit land competition or subscription-linked decay.

## 28. The virtual ecology failure, preserved

The [focused ecology case](../games/ultima-online-s-ecology.md) remains the detailed historical owner. Garriott's account describes the planned grass/prey/predator chain, unexpectedly intense player harvesting, collapse and replacement of the original design. [UO30](#uo30) Section 16 distinguishes Koster's account of computational cost from resource circulation. Continued success after an abandoned subsystem does not establish that any one replacement mechanism caused the game's longevity.

## External creation — R15: yes, distinct from official housing

**An established external ecosystem exists.** ServUO's maintained C# server-emulator repository and its public resource catalogue document custom worlds, server scripts, maps and distribution tools. This is stronger evidence of sustained creation than a few visual presets; repository activity and downloads still do not measure active players. ModernUO provides a separate documented framework. Their components cannot be assumed interchangeable. [M26-01](#m26-01) [M26-02](#m26-02)

The official-service boundary is narrower: UO sanctions its integrated **ClassicUO web client**, while its policy explicitly withholds sanction from the modifiable desktop client on official servers. An emulator or independent-shard tutorial does not establish publisher approval or permission to redistribute Ultima assets. [M26-03](#m26-03)

### Named creations, motives and earning evidence

| Creation                                            | What its author makes and why                                                                                                                            | Distribution and practical limits                                                                                                                                                                                                                                                                      |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Finaltwist and collaborators' Ultima Adventures** | A fork of Ultima Odyssey, motivated by additional roleplaying, multiplayer and high-level content without taking over the original project.              | September 2026 catalogue revision offers an offline/online world package. Its instructions require a separate installation and matching custom maps/client files; overwriting Odyssey can produce conflicts. Creator earnings were not established. [M26-04](#m26-04)                                  |
| **MrRiots' UO Region Editor**                       | An offline HTML tool the author built for personal use and shared: load local map data or a demo, draw named rectangles, then export server-region data. | TXT/XML, configuration, CSV and JSON outputs are data, not a replacement server engine. Browser sessions do not retain work automatically; export matters. The author promises no ongoing updates. Polygon mode serves personal needs and is not supported by the servers described. [M26-05](#m26-05) |
| **Voxpire's Installer, Patcher, Launcher (IPL)**    | A packaged recipient path that configures a shard's client files and connection settings.                                                                | A site account upgrade gates the download; that establishes an access charge, not the author's income or a universal paid-mod market. Windows/.NET requirements differ from the server's platform support. [M26-06](#m26-06)                                                                           |

### Representative author-to-player lifecycle

1. **Author the behavior.** In ModernUO, a creator writes a C# item or creature under the content project. Its example magic lantern connects graphic identity, charges, light, backpack-use checks, interaction and timers. Configuration JSON selects settings and expansion/maps; region/map files supply data. These are different authoring layers, not one all-purpose visual editor. [M26-07](#m26-07) [M26-08](#m26-08)
2. **Build and preview.** The documented Windows/macOS/Linux build path checks prerequisites and publishes a server distribution. Its current requirements include .NET 10 and platform libraries. First launch asks for locally supplied UO data, a listener, expansion/maps and an owner account. A client pointed to the local address provides a playable test environment. GM commands `[add` and `[Props` create an instance and inspect its properties. [M26-12](#m26-12) These steps were documented, not reproduced in this research. [M26-09](#m26-09) [M26-10](#m26-10) [M26-11](#m26-11)
3. **Test behavior and saved state.** For the lantern, test permission, charge consumption and timer cleanup, then save/reload to check restoration. ModernUO's serialization documentation connects persisted fields, version changes and explicit migration methods. That makes saved custom instances part of an update's compatibility problem; a successful compile alone is insufficient. This is a proposed test derived from the documented example. [M26-07](#m26-07) [M26-12](#m26-12)
4. **Package and share the supported combination.** ModernUO's portable distribution can be deployed to a host; recipients need compatible client data and the correct address. IPL illustrates a separate delivery tool: build its patch/server/client parts, configure the shard, generate a versioned manifest, and distribute the launcher. Its manifest is regenerated when packaged files change; special handling preserves local settings or deletes selected files. [M26-06](#m26-06) [M26-13](#m26-13)
5. **Play, update and remove deliberately.** A recipient launches the matching client and connects to that particular shard. A world package's maps, code and saved instances can conflict with another version; this is not a standardized drag-and-drop load order. The reviewed material establishes neither a universal safe uninstaller nor automatic preservation when a custom type is removed. The operator must decide how affected instances and files are handled before withdrawing the component. ModernUO's GPLv3 code license does not itself license Ultima's art or maps. [M26-04](#m26-04) [M26-11](#m26-11) [M26-12](#m26-12) [M26-14](#m26-14)

**OpenLegend implication:** useful creation includes the recipient's ability to obtain, understand, try and revise a coherent package. Route that observation to existing pack provenance/dependency and creator workflow owners. ModernUO's migration burden does not impose legacy-development-save compatibility on OpenLegend. No emulator, client policy or distribution business model is adopted by this comparison.

## 29. Transferable inspiration for OpenLegend

### A. Make professions own real world capability

The chain **sheep → wool → spin → loom → cloth → marked item → vendor → another player** links practice to someone else's need. The same question applies to medicine, construction, farming, research, law, teaching, religion and logistics: what useful world capability does this profession provide?

### B. Use a bounded skill budget instead of mandatory classes

A world may choose a skill budget, classes, uncapped expertise or another cost of changing profession. None is an engine-wide mandate. Distinct competence can reflect a person's practiced work, history, hobbies, injuries and teaching.

### C. Ownership/access should be mechanics, not lore

House owners, co-owners, friends, tenants and visitors have different rights. OpenLegend's custody and place permissions should make such distinctions usable in homes, shops, laboratories, guild halls and other authored institutions, without treating admission as shared ownership.

### D. Markets are more alive when the seller/place still exists

Retain situated sellers, reputation and logistics when they make the authored world's market more useful or interesting.

### E. Death can create a social recovery state

Ghost → resurrection → corpse recovery illustrates one world-specific way to create vulnerability, rescue and memory.

### F. Crime requires ownership + witnesses/knowledge + institutions

Represent the actor, victim, property, observer, evidence and jurisdiction before assigning a legal consequence. A global morality score cannot substitute for who knows what or why institutions disagree.

### G. Pets become meaningful through useful persistence

Memory, personality, needs, trust and independent goals should deepen a companion's useful persistent relationship rather than substitute for it.

### H. Public housing creates society and scarcity at once

Choose how homes become neighborhoods, shops, landmarks and identities without automatically inheriting scarce plots, sprawl or inactive-owner problems.

### I. Let worlds choose their risk contract

Choose protected spaces, consensual conflict, full consequences, recoverable losses or solitary play according to the authored world's experience.

### J. Simulations must survive optimizing humans

Examine the incentives and runtime cost of a simulated commons, including harvesting, hoarding and automation. Its appealing fictional explanation does not qualify the implementation.

### K. Long-lived worlds accumulate rules debt

Make invention provenance, versions and dependencies visible. Any continuity/replacement promise for a published pack must be explicit and scoped to supported use. This does **not** impose legacy-development-save compatibility, automatic migration or deprecation infrastructure on experimental worlds.

### Application through existing design and qualification

The opportunity is a world where making, caring for, discovering or hosting something changes what another person can do. Preserve that ambition without copying UO's full skill catalogue, land scarcity, mandatory upkeep or PvP rules. Human social continuity is evidence to investigate, not proof that OpenLegend's inhabitants will produce equivalent attachment.

| Research implication                                            | Existing route and concrete question                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Useful practice should become a recognizable role.              | [DG14](../../../../docs/maintainers/needs-design.md#dg14--useful-competence-and-practice) and [FPV06–08](../../../../docs/maintainers/first-playable-validation.md): can a new player complete a useful material/action chain, explain its payoff and choose a next activity without repetitive coaching?                                                                                                          |
| Complementary capabilities should create voluntary cooperation. | [CP10](../../../../docs/maintainers/first-playable-cooperation.md) and [CE05](../../../../docs/maintainers/character-experience.md): observe useful independent aid, refusal, stopping and a later choice shaped by the shared occurrence. A scripted rescue or an agreement alone does not qualify this.                                                                                                          |
| Building should yield a useful, revisable place.                | [SH12 / DG13](../../../../docs/maintainers/needs-design.md#dg13--editable-shelter-and-useful-places): assess the complete construction, access, alteration and recovery effort against the benefit of inhabiting it; do not adopt public land competition by analogy.                                                                                                                                              |
| Persistent worlds need an understandable consequence contract.  | [DG29](../../../../docs/maintainers/needs-design.md#dg29--more-participants-and-travel-between-worlds) and FPV07: distinguish saved identity, property custody, absence, local danger and scenario reset under the selected world's rules.                                                                                                                                                                         |
| Creator success includes later use and maintenance.             | [ND12](../../../../docs/maintainers/needs-design.md#nd12--cross-world-invention-libraries-and-usable-pack-publishing) and [ND23 / PACK](../../../../docs/maintainers/needs-design.md#nd23--creator-revenue-allocation-and-marketplace-operation): expose authorship, permissions, dependencies, revision/removal consequences and any published-use promise, without adding development-save compatibility duties. |
| Payment can alter practical participation.                      | [CO01–03](../../../../docs/maintainers/commercial-offers.md): compare the actual paid/free roles, capacity, time and custody effects of an offer. UO's terms do not replace accepted finite free and paid authoring or establish OpenLegend demand.                                                                                                                                                                |

These are qualification questions for existing owners. The research does not close their implementation/player-evidence checks or require a new feature specification or needs-design item.

## 30. Requirement and preservation check

### September 27 requirements-and-corrections audit

The September 27 audit covered classless attributes and editable skill budgets; acquisition, containers, equipment, crafting and upgrading; magic and virtues; travel, stealth, crime and object interaction; death and recovery; player trade, housing and pet training; guilds, NPC services, quests and long-term activities. Its key scope limits remain: native pets are not deep cognitive companions, authored events are not universal player-driven history, housing is not population simulation, and ordinary production rules differ from the 1997 launch and seasonal New Legacy.

The October refresh strengthens the actual activity chains, six causal situations, native housing lifecycle, connected lore, current service/payment boundaries and firsthand reception. Production, ecology and external creation are integrated; independent core/reception and commercial reviews passed, with their concrete corrections applied. Original examples and dated contrary accounts are retained rather than replaced by the newest update.

**September 27 boundary check (historical):** the prior audit recorded Publish 124, the 29th anniversary and future client/publish work. [UO01](#uo01) [UO02](#uo02) Its New Legacy forecast is retained in §24 alongside the subsequently verified launch.

| Requirement                                     | Coverage                                                                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| R01 identity / scope / promise                  | §§1–3, 24, 27                                                                                                    |
| R02 player actions / mechanics                  | §§3–23                                                                                                           |
| R03 items / entities / composition              | §§7–10, 15, 22                                                                                                   |
| R04 progression / economy / time                | §§2–3, 8–10, 24                                                                                                  |
| R05 interactions / concrete situations          | §§8–18 and §21 six worked situations                                                                             |
| R06 people / AI / social / multiplayer          | §§9–19                                                                                                           |
| R07 art / audio / interface / feel              | §23                                                                                                              |
| R08 story / narrative                           | §§18, 21, 24                                                                                                     |
| R09 production / development                    | §§27–28                                                                                                          |
| R10 marketing / distribution / virality         | §§1, 24, 27                                                                                                      |
| R11 commercial / participation                  | §§1/9 service and payment; §27 compact commercial table with dated evidence, scoped unknown revenue/profit/ROI   |
| R12 reviews / player feedback                   | §§25–26                                                                                                          |
| R13 transferable inspiration / limits           | §§28–29                                                                                                          |
| R14 sources / preservation / navigation         | this section + sources                                                                                           |
| R15 popular modifications / practical authoring | Yes: external creation section; named examples and documented author-to-player lifecycle. Native housing in §10. |

**Preservation check:** the [focused ecology case](../games/ultima-online-s-ecology.md) and [G19 fun/engagement evidence](../references/fun-and-engagement-dossier-evidence.md) remain distinct owners. [Packet provenance](../references/packet-provenance.md) retains the broader reading route. Original numbered headings, source anchors, skill atrophy, the wool-to-vendor chain, ghost recovery, region-specific travel and differing Trammel judgments remain available. Garriott's attributed harvesting account remains; Koster's computational/resource-circulation distinction qualifies the diagnosis without turning either retrospective into telemetry or a verdict that simulation cannot work. Historical Trammel/Felucca opinions are attributed rather than resolved as one objective community verdict.

## Sources

Original UO01–UO42 annotations record September 26–27, 2026 captures unless a specific October reread is stated. S26, E26, R26, P26 and M26 entries record this refresh. New primary bodies and firsthand accounts were read as annotated; no client or editor was executed.

<a id="s26-01"></a> **S26-01 — [New Legacy Season 2 — Now Available!](https://uo.com/2026/10/15/new-legacy-season-2-now-available/)**, UO Dev Team, October 15, 2026. Full primary announcement read October 28; establishes delivered launch and selected seasonal changes.

<a id="s26-02"></a> **S26-02 — [Treasure Maps](https://uo.com/wiki/ultima-online-wiki/gameplay/treasure-maps/)**, official guide. Relevant primary body read October 28, 2026; post-2019 map, digging, guardians, trap and reward sequence.

<a id="s26-03"></a> **S26-03 — [Bardic Skills](https://uo.com/wiki/ultima-online-wiki/skills/bardic-skills/)**, official guide. Full relevant body read October 28; instrument wear, control checks and creature/PvP differences.

<a id="s26-04"></a> **S26-04 — [Imbuing](https://uo.com/wiki/ultima-online-wiki/skills/imbuing/)**, official guide. Relevant body read October 28; destructive unravelling, ingredients, controlled properties and failure.

<a id="s26-05"></a> **S26-05 — [Ships Guide](https://uo.com/wiki/ultima-online-wiki/gameplay/ships-guide/)**, official guide. Full body read October 28; navigation, cargo/access, combat, repairs and decay.

<a id="s26-06"></a> **S26-06 — [Getting Started](https://uo.com/getting-started/)**, official guide. Full body read October 28; race capabilities, client distinctions and shards' fictional common origin.

<a id="s26-07"></a> **S26-07 — [Voices](https://uo.com/wiki/ultima-online-wiki/fiction/the-silver-gate/voices/)**, EM Malachi. Full primary fiction read October 28; motives and the _Time of Legends_ bridge, not live simulation evidence.

<a id="s26-08"></a> **S26-08 — [The Oracle and the Bard](https://uo.com/wiki/ultima-online-wiki/fiction/the-shattered-obelisk/the-oracle-and-the-bard/)**, EM Malachi. Full primary fiction read October 28; Mariah, Naxatilor and Zhah's relationships.

<a id="s26-09"></a> **S26-09 — [Publish 60: Stygian Abyss](https://uo.com/wiki/ultima-online-wiki/technical/previous-publishes/2009-2/publish-60-8th-september-stygian-abyss/)**, September 8, 2009. Relevant primary lands, loyalty and instancing sections read October 28; historical expansion design, not current timer verification.

<a id="e26-01"></a> **E26-01 — [New Legacy Season 2 notes](https://uo.com/wiki/new-legacy-publish-notes/new-legacy-season-2/)**. Official primary body read October 28, 2026; planned June 2027 end and scoped potion effects.

<a id="e26-02"></a> **E26-02 — [New Legacy Ultima Store Now Open](https://uo.com/2026/10/20/new-legacy-ultima-store-now-open/)**. October 20, 2026. Full primary announcement read; delivered opening supersedes the earlier forecast.

<a id="e26-03"></a> **E26-03 — [Condemned Houses](https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/condemned-houses-idoc/)**. Primary body read October 28; access loss, collapse loot and deleted-item exceptions.

<a id="e26-04"></a> **E26-04 — [Ultima Store guide](https://uo.com/ultima-store/)**. Primary body read October 28; Sovereigns, entitlement purchases, wallets and binding exceptions.

<a id="e26-05"></a> **E26-05 — [Ultima Store inventory](https://uo.com/wiki/ultima-online-wiki/items/ultima-store-inventory/)**. Relevant primary inventory read October 28; concrete progression, capacity and convenience effects.

<a id="e26-06"></a> **E26-06 — [Character Transfer Token](https://uo.com/wiki/ultima-online-wiki/player/character-transfer-token/)**. Primary body read October 28; moved character possessions versus immobile property and restricted destinations.

<a id="e26-07"></a> **E26-07 — [Koster interview](https://www.pcgamer.com/games/mmo/ultima-online-and-star-wars-galaxies-vet-tells-me-the-theme-park-assembly-line-mmo-just-isnt-viable-anymore-especially-as-dev-costs-spike-we-hit-the-wall/)**. PC Gamer, June 14, 2026. Relevant participant account read; retrospective cost estimate with unspecified accounting scope.

<a id="e26-08"></a> **E26-08 — [EA FY2002 annual report](https://www.annualreports.com/HostedData/AnnualReportArchive/e/NASDAQ_ERTS_2002.pdf)**. Relevant primary pages 23/33 read; title customers separated from aggregate EA.com finances.

<a id="e26-09"></a> **E26-09 — [EA FY2005 annual report](https://www.annualreports.com/HostedData/AnnualReportArchive/e/NASDAQ_ERTS_2005.pdf)**. Primary Online Games section read, page 62; qualitative title success, not standalone profit.

<a id="r26-01"></a> **R26-01 — [And now, Ultima Online, sooner or later](https://massivelyop.com/2018/04/20/choose-my-adventure-and-now-ultima-online-sooner-or-later/)**. Eliot Lefebvre, April 20, 2018. Full firsthand opening account read October 28; experienced confusion, not current mechanics.

<a id="r26-02"></a> **R26-02 — [Ultima Online, we didn’t need to do this](https://massivelyop.com/2018/05/11/choose-my-adventure-ultima-online-we-didnt-need-to-do-this/)**. Eliot Lefebvre, May 11, 2018. Full closing column read; actual early series ending versus hypothetical earlier abandonment.

<a id="r26-03"></a> **R26-03 — [The Shard Remembers](https://arturovbauermeister.substack.com/p/the-shard-remembers)**. Arturo V Bauermeister, May 22, 2026. Full Great Lakes return essay read; firsthand social meaning, not population measurement.

<a id="r26-04"></a> **R26-04 — [Client Download](https://uo.com/client-download/)**. Official access body checked October 28; bounded Steam search found no official store listing.

<a id="s26-10"></a> **S26-10 — [Vice versus Virtue](https://uo.com/wiki/ultima-online-wiki/combat/virtue-versus-vice/)**. Official guide, relevant body read October 28; city objectives, rewards and exposure of nonparticipants.

<a id="s26-11"></a> **S26-11 — [Scrolls of Power](https://uo.com/wiki/ultima-online-wiki/items/scrolls-of-power/)**. Official guide, full relevant body read October 28; mastery ceilings, reward routes, trading and consumption.

<a id="p26-01"></a>**P26-01 — [Did players destroy the UO ecology?](https://www.raphkoster.com/games/snippets/did-players-destroy-the-uo-ecology/).** Raph Koster, updated August 28, 2024. Full participant account read; distinguishes AI cost and resource circulation.

<a id="p26-02"></a>**P26-02 — [A behind-the-scenes look at building Ultima Online](https://www.gamedeveloper.com/design/book-excerpt-a-behind-the-scenes-look-at-building-i-ultima-online-i-).** Wes Locher, July 13, 2018. Full relevant interview excerpt read; prototype, staffing, stabilization and player appropriation recollections, not audited production accounts.

<a id="p26-03"></a>**P26-03 — [ClassicUO Web Client Veteran Preview Weekend](https://uo.com/2024/10/11/classicuo-web-client-veteran-preview-weekend/).** UO, October 11, 2024. Full announcement read; historical campaign, not current entitlement rules.

<a id="m26-01"></a>**M26-01 — [ServUO repository](https://github.com/ServUO/ServUO).** Maintainer README and repository metadata read October 28, 2026; C# emulator and public development evidence.

<a id="m26-02"></a>**M26-02 — [ServUO resource catalogue](https://www.servuo.dev/archive/).** Current catalogue and relevant resource bodies read; ecosystem evidence without inferring players from downloads.

<a id="m26-03"></a>**M26-03 — [ClassicUO Web Client policy](https://uo.com/wiki/classicuo-web-client/).** UO, October 2024 revision. Full policy read; official web/desktop sanction distinction.

<a id="m26-04"></a>**M26-04 — [Ultima Adventures](https://www.servuo.dev/archive/ultima-adventures-a-full-featured-content-packed-offline-online-server.1374/).** Finaltwist, September 15, 2026 revision. Full public author description read; motives and package requirements, not reproduced features or verified earnings.

<a id="m26-05"></a>**M26-05 — [UO Region Editor](https://www.servuo.dev/archive/uo-region-editor.2631/).** MrRiots, May 25, 2026. Full public description read; data authoring, export and support limits.

<a id="m26-06"></a>**M26-06 — [Installer, Patcher, Launcher](https://www.servuo.dev/archive/all-in-one-installer-patcher-launcher-ipl.1724/).** Voxpire, version 3.1 revision March 2026. Public build/configuration/deployment instructions read. Download was gated and not obtained; no income estimate.

<a id="m26-07"></a>**M26-07 — [Items and Mobiles](https://modernuo.com/docs/development/items-and-mobiles/).** ModernUO. Full author tutorial read; behavior and persistence example. No execution.

<a id="m26-08"></a>**M26-08 — [Configuration](https://modernuo.com/docs/getting-started/configuration/).** ModernUO. Foundation sections read; JSON settings and expansion selection.

<a id="m26-09"></a>**M26-09 — [Creating a Build](https://modernuo.com/docs/getting-started/building/).** ModernUO. Full guide read; build/publish and target platforms.

<a id="m26-10"></a>**M26-10 — [Installation](https://modernuo.com/docs/getting-started/installation/).** ModernUO. Full guide read; current prerequisites.

<a id="m26-11"></a>**M26-11 — [Starting the Server](https://modernuo.com/docs/getting-started/starting/).** ModernUO. Full setup/connection and relevant troubleshooting read; separately supplied game files and local preview route.

<a id="m26-12"></a>**M26-12 — [Serialization](https://modernuo.com/docs/development/serialization/).** ModernUO. Field, version, restoration and cleanup sections read; documents this framework's save coupling.

<a id="m26-13"></a>**M26-13 — [ModernUO README](https://github.com/modernuo/ModernUO/blob/main/README.md).** Full body fetched through GitHub October 28, 2026; portable deployment and requirements.

<a id="m26-14"></a>**M26-14 — [ModernUO license](https://github.com/modernuo/ModernUO/blob/main/LICENSE).** GPLv3 text fetched; code licensing only, not an asset-rights grant.

<a id="uo01"></a>**UO01 — [Celebrating 29 years / Ultima Online home](https://uo.com/).** UO Team, 2026-09-24 snapshot. Primary current-service/anniversary evidence.

<a id="uo02"></a>**UO02 — [Publish 124 World Wide](https://uo.com/2026/08/24/publish-124-world-wide/) and [September 2026 archive](https://uo.com/2026/09/).** UO Team. Current publish/events state.

<a id="uo03"></a>**UO03 — [Endless Journey](https://uo.com/wiki/ultima-online-wiki/beginning-the-adventure/endless-journey/).** Primary restrictions body reread October 28, 2026; explicit bank table used where older narrative wording conflicts.

<a id="uo04"></a>**UO04 — [Skills, Stats and Attributes](https://uo.com/wiki/ultima-online-wiki/player/stats/skills-stats-and-attributes/).** Official/current mechanics reference for stat/skill caps and Raise/Lower/Lock behavior.

<a id="uo05"></a>**UO05 — [Skill Gain Systems](https://uo.com/wiki/ultima-online-wiki/technical/skill-gain-systems/).** Official mechanics/history copied from EA docs; use-based progression and Guaranteed Gain System.

<a id="uo06"></a>**UO06 — [Animal Taming](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/).** Official/current skill reference.

<a id="uo07"></a>**UO07 — [Stealth](https://uo.com/wiki/ultima-online-wiki/skills/stealth/).** Official/current skill progression/armor-difficulty reference.

<a id="uo08"></a>**UO08 — [Skill Titles & Order](https://uo.com/wiki/ultima-online-wiki/player/skill-titles-order/).** Official/current NPC training and mastery-title reference.

<a id="uo09"></a>**UO09 — [Melee Fighting](https://uo.com/wiki/ultima-online-wiki/skills/melee-fighting/).** Official/current melee-skill interaction and training reference.

<a id="uo10"></a>**UO10 — [Magery](https://uo.com/wiki/ultima-online-wiki/skills/magery/) and [Magery Spells](https://uo.com/wiki/ultima-online-wiki/skills/magery/magery-spells/).** Official/current 64-spell/eight-circle and effect/cost reference.

<a id="uo11"></a>**UO11 — [An Introduction to Spellcasting](https://uo.com/wiki/ultima-online-wiki/skills/an-introduction-to-spellcasting/).** Official/current spell-school, mana and reagent differences.

<a id="uo12"></a>**UO12 — [Insurance](https://uo.com/wiki/ultima-online-wiki/player/insurance/).** Official/current death-item-risk rules; Siege Perilous difference explicit.

<a id="uo13"></a>**UO13 — [Blacksmithing](https://uo.com/wiki/ultima-online-wiki/skills/blacksmithing/) and [Blacksmith Craftables](https://uo.com/wiki/ultima-online-wiki/skills/blacksmithing/blacksmith-craftables/).** Official/current craft profession reference.

<a id="uo14"></a>**UO14 — [Tailoring](https://uo.com/wiki/ultima-online-wiki/skills/tailoring/).** Official/current wool/spinning/loom/crafting chain and complementary skills.

<a id="uo15"></a>**UO15 — [Carpentry](https://uo.com/wiki/ultima-online-wiki/skills/carpentry/) and [House Add-ons](https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/house-ownership-7-house-add-ons/).** Official/current craft-to-housing connection.

<a id="uo16"></a>**UO16 — [Bulk Orders](https://uo.com/wiki/ultima-online-wiki/gameplay/crafting/bulk-orders/).** Official/current crafter job/reward/tradable-order mechanics.

<a id="uo17"></a>**UO17 — [Player-owned NPCs](https://uo.com/wiki/ultima-online-wiki/gameplay/npc-commercial-transactions/npcs-player-owned/) and [Vendor Search](https://uo.com/wiki/ultima-online-wiki/gameplay/npc-commercial-transactions/vendor-search/).** Official/current player-shop, rental, wages and search logistics.

<a id="uo18"></a>**UO18 — [Placing a House](https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/).** Primary body reread October 28, 2026; placement, ownership and unpaid-account grace/decay.

<a id="uo19"></a>**UO19 — [Building a Custom House](https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/house-owning-2-building-a-custom-house/) and [Managing Your Home](https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/house-ownership-4-managing-your-home/).** Full primary building and management bodies reread October 28, 2026; draft/commit, moving-crate, access and removal workflow.

<a id="uo20"></a>**UO20 — [Ultima Online: Third Dawn Review](https://www.gamespot.com/reviews/ultima-online-third-dawn-review/1900-2703752/).** GameSpot, 2001-04-02. September capture retained; October body blocked. Ilshenar, housing-sprawl, client and newcomer friction.

<a id="uo21"></a>**UO21 — [Post-IDOC House Placement](https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/post-idoc-house-placement/).** Official/current 2026 collapsed-plot raffle system.

<a id="uo22"></a>**UO22 — [Death and Resurrection in the Enhanced Client](https://uo.com/wiki/ultima-online-wiki/combat/death-and-resurrection-in-the-enhanced-client/).** Official/current ghost/corpse/resurrection navigation reference.

<a id="uo23"></a>**UO23 — [Stealing](https://uo.com/wiki/ultima-online-wiki/skills/stealing/).** Official/current stealing/PvP rules.

<a id="uo24"></a>**UO24 — [Snooping](https://uo.com/wiki/ultima-online-wiki/skills/snooping/).** Official/current targeted inventory-inspection skill.

<a id="uo25"></a>**UO25 — [The Murder System](https://uo.com/wiki/ultima-online-wiki/player/the-murder-system/).** Official/current attempted murder, victim reporting, murderer status and sanctions.

<a id="uo26"></a>**UO26 — [Fame and Karma](https://uo.com/wiki/ultima-online-wiki/player/fame-and-karma/).** Official/current broad reputation system.

<a id="uo27"></a>**UO27 — [The Virtues](https://uo.com/wiki/ultima-online-wiki/gameplay/the-virtues/).** Primary principles and Compassion sections reread October 28, 2026; moral geography and resurrection consequences.

<a id="uo28"></a>**UO28 — [Animal Taming](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/).** Official/current tame/control/attachment description.

<a id="uo29"></a>**UO29 — [Animal Training](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/animal-training/) and [Discovering Animal Training](https://uo.com/wiki/ultima-online-wiki/gameplay/quests/discovering-animal-training/).** Official/current pet customization limits and irreversible training.

<a id="uo30"></a>**UO30 — [War Stories: Ultima Online — the virtual ecology](https://arstechnica.com/video/watch/war-stories-ultima-online-the-virtual-ecology/).** Ars Technica / Richard Garriott. Original developer-interview transcript used by the preserved ecology case; attributed retrospective, not telemetry.

<a id="uo31"></a>**UO31 — [Ultima Online: Renaissance Review](https://www.gamespot.com/reviews/ultima-online-renaissance-review/1900-2593371/).** Michael E., Renaissance-era body; page renders May 17, 2006. Full reread October 28; historical split, not a 2006 state audit.

<a id="uo32"></a>**UO32 — [Ultima Online: Renaissance — GameFAQs player review](https://gamefaqs.gamespot.com/pc/258374-ultima-online-renaissance/reviews/58541).** Historical self-selected player critique of the Trammel/Felucca social split; one person's interpretation. September capture retained; October body blocked.

<a id="uo33"></a>**UO33 — [The most important PC games — Ultima Online](https://www.pcgamer.com/most-important-pc-games/6/).** PC Gamer retrospective / Chris Thursten. September capture; UO-specific entry reread through indexed text in October, while direct rendering omitted it. Not a fresh full-feature read.

<a id="uo34"></a>**UO34 — [Ultima Online Review](https://www.gamespot.com/reviews/ultima-online-review/1900-2531690/).** Desslock, GameSpot, 1997-12-17. Full launch-era September capture retained; October body blocked.

<a id="uo35"></a>**UO35 — [Ultima Online: New Legacy](https://uo.com/ultima-online-new-legacy/).** UO Team, FAQ updated 2026-09-09. Full FAQ reread October 28; seasonal rights and exit categories. Final transferable-item list remains prospective.

<a id="uo36"></a>**UO36 — [New Legacy — Houses](https://uo.com/wiki/ultima-online-wiki/new-legacy-an-overview/new-legacy-houses/).** Official/current seasonal housing, guild and upkeep mechanics.

<a id="uo37"></a>**UO37 — [New Legacy, An Overview](https://uo.com/wiki/ultima-online-wiki/new-legacy-an-overview/).** Official seasonal narrative/job-board skill progression.

<a id="uo38"></a>**UO38 — [Ultima Ongoing Review](https://www.gamerevolution.com/review/33084-ultima-online-review).** GR Staff (current byline), February 5, 1998. Full reread October 28; actual continued social play despite friction.

<a id="uo39"></a>**UO39 — [Ultima Online Review](https://www.mmorpg.com/reviews/ultima-online-review-2000055015).** Reed Hubbard, January 18, 2005. Both pages reread October 28; Samurai Empire, presentation and veteran/newcomer differences.

<a id="uo40"></a>**UO40 — [Ultima Online: Lord Blackthorn's Revenge Review](https://www.gamespot.com/reviews/ultima-online-lord-blackthorns-revenge-review/1900-2858324/).** GameSpot / Desslock. Historical review emphasizing UO's unusual noncombat lives and dated presentation.

<a id="uo41"></a>**UO41 — [Ultima Online 2026 Roadmap Update](https://uo.com/?page=44).** UO Team, 2026-01-15. Primary current statement highlighting player-run events, roleplay, homes, shops and gathering places.

<a id="uo42"></a>**UO42 — [Ultima Online GameSpot archive](https://www.gamespot.com/games/ultima-online/reviews/) and official [technical/publish archive](https://uo.com/wiki/ultima-online-wiki/technical/).** Used to cross-check major expansion/release chronology; exact systems are cited to dedicated sources where relevant.
