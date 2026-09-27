# Final Fantasy IX — full research dossier

**G86 · Research pass and corrective coverage review, September 26, 2026.** Primary mechanics baseline: the 2000 PlayStation *Final Fantasy IX*. Later mobile/PC/PS4/Switch/Xbox releases are separated where UI, autosave, boosters, graphics or technical behavior differ. The roster focus is equipment-taught abilities, fixed character identities, ATB/Trance, synthesis, exploration, minigames and narrative. [Requirements](../research-requirements.md) · [Progress](../research-progress.md) · [Coverage audit](../coverage-audit-g81-g100.md).

No personal playthrough is claimed. Mechanics examples are reconstructed from the original manual, developer interviews, written reviews and version-specific reference material. **Spoilers:** section 17 discusses character origins and mortality; the Mognet subsection and worked situations disclose optional-quest solutions. The corrective pass preserves the original research and sources while expanding the previously incomplete side-system and interaction coverage.

## 1. Identity, scope and player promise

*Final Fantasy IX* is Square's 2000 PlayStation swan song for the classic-era series: a deliberately medieval-fantasy world of kingdoms, airships, mages, knights, summoners, thieves and crystals, filtered through the production experience of the PS1 era.

Its player promise is deliberately different from FFVII and VIII:

- **character roles are authored again** rather than freely rebuilt through Materia/Junction;
- equipment teaches active and support abilities through AP;
- synthesis turns old equipment into new equipment;
- the world is full of optional vignettes through **Active Time Events (ATEs)**;
- Chocobo Hot & Cold becomes a game-spanning treasure/traversal side system;
- many classic Final Fantasy jobs return as *people* rather than switchable classes.

Zidane is a thief, Vivi a Black Mage, Steiner a knight, Garnet/Eiko summoners and white-magic users, Freya a Dragoon, Quina a Blue-Magic-style gourmand, Amarant a monk-like fighter, etc.

The result is a particularly legible model of identity:

> **who you are determines which abilities you can learn; what you own determines which of those abilities you can learn now.**

## 2. “Return to roots” without literally remaking Final Fantasy I

Square Enix's 20th-anniversary interviews confirm that “returning to roots” and “return of the crystal” were explicit slogans from the beginning, but director Hiroyuki Ito later described the phrase as intentionally ambiguous rather than “make FFI again.” [FFIX01](#ffix01) [FFIX02](#ffix02)

Event/scenario designer Kazuhiko Aoki says the medieval-fantasy setting followed from that direction, while many individual references and ideas emerged from creators during production rather than from one complete nostalgia checklist. [FFIX01](#ffix01)

This matters because FFIX does not simply undo VII/VIII:
- it keeps ATB;
- uses sophisticated pre-rendered/CG production;
- adds Active Time Events;
- builds a substantial equipment-learning system;
- includes unusually dense side content;
- retains a modern, character-driven narrative about identity and mortality.

It is better understood as **classic vocabulary with contemporary production/design techniques**.

## 3. Version boundaries

### 3.1 2000 PlayStation original

The PS1 release is the mechanics baseline:
- four-character active party;
- ATB;
- equipment-taught abilities;
- Support Ability stone budgets;
- Trance;
- synthesis;
- ATEs;
- Chocobo Hot & Cold/Chocographs;
- Tetra Master;
- four-disc story progression.

### 3.2 2016 mobile/PC adaptation

FFIX had no original 2000 PC port. The 2016 mobile/PC adaptation rebuilt UI and added:
- autosave/continue convenience;
- high-speed mode;
- encounter disabling;
- additional boosters;
- higher-resolution character models/UI assets;
- touch controls on mobile. [FFIX03](#ffix03) [FFIX04](#ffix04)

The original pre-rendered backgrounds remain a preservation problem: later models/UI can appear much sharper than the backgrounds.

### 3.3 PS4 / Switch / Xbox modern ports

The later console releases derive from the modern adaptation and carry similar booster/QoL choices. Push Square and Nintendo Life both praise the underlying game while noting blurry backgrounds, stiff field navigation and port/UI compromises. [FFIX05](#ffix05) [FFIX06](#ffix06)

The modern ports therefore change **friction**, not the core character/ability architecture.

## 4. Equipment teaches abilities

FFIX's most important progression system ties abilities to equipment.

When a character equips an item that teaches one of their compatible abilities:
- the ability is usable while that item remains equipped;
- battle AP accumulates toward mastery;
- once the AP threshold is reached, the character permanently retains that ability after unequipping the item. [FFIX07](#ffix07)

This produces a recurring equipment decision:

> **Do I equip the item with better stats, or keep the weaker item long enough to finish learning its ability?**

A modern GameFAQs strategy guide explicitly describes ability repertoire as often more important than the raw stats of one equipment piece. [FFIX08](#ffix08)

That tension makes loot meaningful for longer than a conventional “replace old sword with +4 sword” curve.

## 5. Action abilities and support abilities are separate layers

FFIX distinguishes two kinds of learned ability.

### Action abilities

These are commands/spells tied to the character's authored role:
- Zidane: thief skills;
- Vivi: Black Magic;
- Garnet/Eiko: White Magic/Summons with different repertoires;
- Steiner: sword techniques and Sword Magic when Vivi is present;
- Freya: Dragoon/dragon skills;
- Quina: Blue Magic learned from enemies;
- Amarant: monk/throw/support-style techniques. [FFIX09](#ffix09)

Once mastered, action abilities remain available subject to MP/command rules.

### Support abilities

Support abilities cost **Magic Stones** to activate.

Examples include:
- Antibody;
- Jelly;
- Auto-Potion;
- Ability Up;
- killer-type bonuses;
- Cover;
- Alert;
- Auto-Haste;
- status immunity;
- counter/defensive modifiers. [FFIX09](#ffix09)

A character may know many support abilities but can only activate a subset within their current stone budget.

This is a strong architecture because it separates:
- **learned knowledge**;
- **currently active build policy**.

OpenLegend could use a similar distinction between what a person *knows* and what they can *actively maintain/prepare* under attention, equipment, physiological or social constraints.

## 6. Character identity remains hard-bounded

Unlike FFV's job mixing or FFVII's Materia portability, equipment does **not** erase class identity.

The original manual states that characters can only extract abilities matching their own dormant abilities. [FFIX07](#ffix07)

So:
- a sword can teach Steiner a knight ability;
- a rod can teach Garnet/Eiko relevant magic;
- a piece of gear may teach different compatible abilities to different characters;
- owning the item does not automatically make every character capable of learning every embedded ability.

This is an elegant compromise:
- **objects are teachers**;
- **people are not interchangeable students**.

The limitation is rigidity: a player cannot causally retrain Vivi into a Dragoon or Steiner into a Black Mage even if fiction might theoretically allow it.

## 7. Synthesis makes obsolete gear into production input

Synthesis shops combine existing items plus gil into new equipment. [FFIX10](#ffix10)

Example recipes include combinations such as:
- Dagger + Mage Masher → Butterfly Sword;
- multiple lower items → stronger weapons/add-ons.

This has several effects:
- old equipment retains future value;
- shopping becomes planning rather than pure replacement;
- treasure duplicates can become recipe inputs;
- ability-learning choices interact with crafting because consuming an item may remove a teaching source.

The item lifecycle is therefore:

**acquire → equip → learn → perhaps retain/duplicate → synthesize into new equipment → learn new abilities**

That is far more interesting than a linear vendor-trash pipeline.

The named Butterfly Sword recipe additionally costs **300 gil** at a shop offering it. Its teaching repertoire includes **What's That!?** and **Protect Girls**, so synthesizing it changes both the weapon and future learning opportunities. A recipe becoming affordable does not imply the consumed teaching items have finished their educational role. [FFIX10](#ffix10) [FFIX31](#ffix31)

## 8. Steal reinforces Zidane's social/role identity

Zidane's thief role is mechanically persistent.

Many bosses carry multiple stealable items, often including gear earlier than it becomes normally available. The original manual explicitly notes that multiple distinct items can be stolen from one enemy. [FFIX07](#ffix07)

That makes Steal:
- an economic action;
- a progression shortcut;
- a collection behavior;
- an expression of protagonist identity.

The downside is repeated failure. Current Steam criticism and older reviews often note that long steal attempts can stall boss pacing.

**OpenLegend lesson:** profession-specific verbs should be valuable outside damage, but chance-based repetition can turn role expression into tedium.

## 9. Trance: identity-specific temporary transformation

As characters take damage, a Trance gauge fills. When full:
- the character enters Trance automatically;
- appearance changes;
- a role-specific command is upgraded or replaced;
- the state lasts temporarily. [FFIX11](#ffix11)

Examples:
- Zidane gains Dyne skills;
- Vivi gains Double Black;
- Steiner gains enhanced physical output;
- Garnet gains Eidolon, changing her summoning behavior;
- **Eiko gains Double White**, allowing two White Magic spells in one turn; her equipment-dependent changes to some summons are a separate system, not her Trance effect. [FFIX23](#ffix23)
- other characters receive role-specific upgrades.

The key distinction from FFVII/VIII Limit Breaks is control.

In FFIX, Trance often triggers automatically when the gauge fills. A random encounter can consume a nearly full gauge before a boss.

RPGFan's original review specifically criticizes this unpredictability. [FFIX12](#ffix12)

The design lesson is clear:
- involuntary transformation can feel dramatic;
- if the player cannot bank it for meaningful situations, it may feel like the system steals agency.

## 10. Steiner + Vivi: abilities can depend on another person being present

Steiner's Sword Magic becomes available when Vivi is in the active party, allowing Vivi's black magic to modify Steiner's sword techniques.

Presence alone is insufficient: Vivi must have the corresponding spell available through mastery or currently equipped teaching gear, and conditions such as Silence or incapacitation can prevent his participation. **Steiner pays the Sword Magic MP cost; Vivi does not pay a second casting charge.** The dependency is a usable repertoire and state, not simply a party-slot check. [FFIX30](#ffix30)

This is a small but important composition rule.

The ability is not:
- Steiner's alone;
- Vivi's alone;
- a generic party spell.

It exists because **two particular people with compatible capabilities are present together**.

This is highly relevant to OpenLegend:
- cooperative capabilities can emerge from relationships/skill complementarity;
- “party composition” can change the available action graph, not only aggregate stats.

## 11. ATB, four-person parties and role legibility

FFIX uses Active Time Battle with up to four active party members.

Compared with FFVII/VIII:
- character roles are much more fixed;
- the party can cover more roles simultaneously because there are four slots;
- MP returns as the standard spell resource;
- equipment/support-ability choices customize *within* roles rather than replacing them.

This makes party composition immediately legible:
- need physical front line?
- healing/summoning?
- black magic?
- stealing?
- Jump/dragon utility?
- Blue Magic?

The benefit is clarity. The cost is lower build fluidity.

## 12. Quina: learning from the ecosystem through Eat

Quina's Blue Magic-style progression is one of FFIX's most OpenLegend-like mechanics.

Quina can learn abilities by **Eating certain weakened enemies**.

That means a creature can be:
- threat;
- ecological entity;
- consumable target;
- teacher of a persistent capability.

The specific ability learned depends on the species.

This is a highly causal learning loop:

**encounter species → weaken it → consume it → acquire species-associated technique**

The mechanic is fantastical/comedic, but the general principle is powerful:
- learning can come from interacting with the world rather than opening a skill menu.

### Frog catching: harvesting now changes a later visit

With Quina present, the marsh offers a catching activity: approach frogs when they are on land rather than treating them as ordinary battle targets. The cumulative catch count survives leaving. Emptying the population delays another useful harvest; leaving a male and female supports regrowth, with a golden frog providing another growth benefit. Regeneration occurs while outside the catching area, so repeatedly watching an empty marsh is not the same as doing another activity and returning. [FFIX26](#ffix26)

This count has two separate payoffs. **Frog Drop**, learned by eating a suitable Gigan Toad, uses Quina's level multiplied by the accumulated frog count for its ordinary damage calculation. Quale also awards milestone prizes. At 99 catches, the next reward is a **battle with Quale**; winning that confrontation earns the Gastro Fork. Reaching a collection threshold and winning its unlocked encounter are different accomplishments. [FFIX27](#ffix27)

**Interpretation:** a seemingly self-contained pastime becomes persistent combat development, equipment and a reason to revisit a place. Its small population rules create a harvest-versus-replenishment decision, not evidence of a general ecosystem simulation. The possibility of maximizing a counter should not erase the player's choice to pursue another activity instead.

## 13. Active Time Events make off-screen people visible

Active Time Events (ATEs) allow the player to watch short scenes happening elsewhere while Zidane/another controlled character is in a different place.

The original manual explains that:
- optional ATE prompts appear while exploring;
- some are mandatory;
- optional ATEs can be skipped;
- available ATEs can change based on prior ATEs/actions;
- conversations/events may change after viewing one. [FFIX13](#ffix13)

ATEs serve several purposes:
- show party members acting independently;
- develop NPCs;
- reveal character interiority;
- make towns feel simultaneous rather than protagonist-centered;
- occasionally grant items or alter later scene availability.

This is a major OpenLegend inspiration.

> A world feels alive when other people appear to have lives while the player is elsewhere.

FFIX scripts these moments. OpenLegend can generalize the principle with actual autonomous actors and selective observation surfaces.

## 14. Chocobo Hot & Cold becomes world-scale exploration

Aoki says Chocobo Hot & Cold began from the director wanting content that would encourage travel around the whole world. [FFIX01](#ffix01)

The resulting loop spans much of the game:

1. acquire Choco;
2. play Hot & Cold to dig for treasure;
3. find **Chocographs**;
4. interpret image/text clues on the world map;
5. dig up world treasures;
6. evolve Choco's traversal abilities;
7. reach new kinds of terrain;
8. unlock new Hot & Cold sites/hidden treasures;
9. eventually access high-end equipment and optional areas. [FFIX14](#ffix14) [FFIX15](#ffix15)

The sidequest therefore combines:
- timed digging minigame;
- map-reading;
- progression;
- traversal unlocks;
- world revisitation;
- ultimate equipment.

This is exactly the kind of side system OpenLegend should value: it gives a hobby **world consequences**.

## 15. Tetra Master: weaker core integration than Triple Triad

FFIX replaces Triple Triad with Tetra Master.

Cards have:
- directional arrows;
- attack values/types;
- physical/magic defense;
- probabilistic battle resolution. [FFIX16](#ffix16)

### Placement, contests and material stakes

Choose five owned cards, then place them alternately with the opponent on a **4×4 board** whose blocked spaces constrain placement. An arrow aimed at an adjacent opposing card captures it without a contest if no arrow points back. Opposed arrows instead produce a stat-dependent, uncertain card battle. Winning that battle can turn further neighboring cards through the defeated card's arrows; an unopposed capture does not trigger that combo. More arrows can consequently become a liability when a card is lost. [FFIX24](#ffix24)

The end-of-board ownership count determines the winner, not how many captures were made earlier. Normally the winner takes one of the opponent's cards they ended up controlling; a Perfect takes the entire opposing hand. A draw does not automatically award a new card. The inventory cap makes keeping duplicates compete with collecting different types. Cards persist between games and can also be found or won from monsters; ordinary matches do not transform them into RPG materials through an equivalent of Card Mod. The story tournament is a separate exception to a claim that card play never supplies a main-game reward. [FFIX25](#ffix25)

The system is more opaque and less directly integrated into character progression than FFVIII's Card Mod economy.

This is an instructive contrast.

Triple Triad:
- card play → cards → items → magic → stats.

Tetra Master:
- largely collection/minigame prestige with limited main-system impact.

Even though Tetra Master is mechanically richer in some local ways, it is less valuable to the core RPG loop.

**OpenLegend lesson:** system complexity alone does not create systemic relevance. Connections to other world loops matter.

## 16. World traversal and environmental progression

FFIX's world progression uses:
- walking;
- early airship travel as story transport;
- boats/ships;
- Choco and evolving Chocobo traversal;
- Blue Narciss;
- Hilda Garde airships;
- late-game broad flight.

The world also distinguishes:
- Mist Continent;
- Outer/other continents;
- kingdoms/cities with strong architectural identity;
- Qu's Marshes;
- hidden islands/locations;
- Chocograph-only discovery sites.

Choco's upgrades convert old terrain barriers into later routes, giving side progression geographic meaning.

### Mognet: a delivery network becomes a repair investigation

**Optional-quest spoilers.** Ordinary moogle conversations let the player accept letters and deliver them to named recipients, revealing other characters' travels and concerns. The late repair chain runs **Kupo → Atla → Mogryo → Kumool → Mois → Noggy → Kupo**, connecting Alexandria, Burmecia, the Black Mage Village, Ipsen's Castle, the Fossil Roo entrance and Daguerreo. Quina is needed to reach the relevant Fossil Roo contact. These are authored delivery flags, not a procedurally routed postal economy. [FFIX28](#ffix28)

The relay identifies **Superslick**, obtained from Ruby in Alexandria and delivered to Artemicion at Mognet Central to repair the machinery and receive a Protect Ring. Reaching Central involves a mountain crack, a Dead Pepper and suitable Choco traversal. Guide shorthand disagrees about the minimum chocobo form, so a convenient ocean route is not asserted to be the only route. Kupo Nut exchanges are supplementary, not mandatory trips between every repair letter. [FFIX28](#ffix28) [FFIX29](#ffix29)

**Interpretation:** a service first encountered as incidental conversation becomes a world-sized problem with particular participants and a material solution. It connects familiar places instead of inventing an unrelated dungeon solely for the reward. The limitation is repeated delivery travel: a meaningful network can still feel like a checklist when the next contact is only a destination marker.

## 17. Story themes: identity, mortality and chosen life

**Major character and identity spoilers follow.**

FFIX begins with theatrical comedy and a planned kidnapping, then steadily moves into:
- war;
- genocide;
- manufactured life;
- mortality;
- inherited identity;
- what makes a life meaningful.

Vivi's arc is the clearest embodiment:
- he resembles mass-produced Black Mages;
- learns they have limited lifespans;
- confronts fear of death;
- builds relationships that give life meaning.

Zidane faces a different version:
- origin does not dictate personhood;
- chosen relationships matter more than intended function.

Director Hiroyuki Ito's anniversary reflection says concepts such as “what it really means to be human,” circumstances, kindness, and hatred became central to his understanding of the game's “return to roots.” [FFIX02](#ffix02)

This is highly aligned with OpenLegend's broader goal: personhood should be expressed by behavior, memory, relationship and choice, not only by origin metadata.

## 18. NPCs and authored world-life

FFIX's NPCs are unusually dense for a scripted RPG.

Aoki says he did not conceptually separate main and sub-characters strongly while writing; once scenes came alive, he wanted to develop even minor characters further. [FFIX01](#ffix01)

The game reinforces this through:
- ATEs;
- recurring Moogles;
- town-specific characters;
- changing dialogue after events;
- environmental scenes;
- local customs and mini-events.

This is still authored, not autonomous simulation. NPCs generally do not:
- maintain persistent schedules;
- form independent long-horizon goals;
- remember arbitrary player actions;
- create emergent social networks.

But FFIX shows how **attention to minor people** can make a world feel populated even without general simulation.

## 19. Production: split development and data constraints

Aoki recalls:
- development divided between Japan and Hawaii;
- roughly 300 people at the completion party;
- a multi-month polishing phase after major elements were implemented;
- late-stage data pressure deciding how story content fit across four discs;
- some character backstory being cut for time/data constraints. [FFIX01](#ffix01)

This is relevant to the game's density:
- many small NPC moments;
- ATEs;
- side activities;
- visually bespoke environments.

The creative process was not purely top-down. Aoki describes a small foundational direction with much of the final texture coming from individual creators adding ideas and craft. [FFIX01](#ffix01)

## 20. Art, audio and interface

FFIX intentionally departs from VII/VIII's more realistic human proportions.

Characters are shorter/stylized; cities and machines lean toward storybook/medieval fantasy.

Aoki notes that the cutscene team had to adapt rather than simply reuse FFVIII production know-how because of the new proportions/style. [FFIX01](#ffix01)

The pre-rendered backgrounds allow dense, painterly locations, but modern high-resolution models expose the low resolution of those original backgrounds. Modern reviews repeatedly identify this as the port's biggest visual weakness. [FFIX05](#ffix05) [FFIX17](#ffix17)

Nobuo Uematsu's score strongly differentiates places and characters; Aoki specifically recalls “You're Not Alone” influencing story thinking during production. [FFIX01](#ffix01)

## 21. Distribution and commercial context

FFIX released:
- Japan: July 7, 2000;
- North America: November 13, 2000;
- Europe: February 16, 2001. [FFIX18](#ffix18)

It arrived late in the PlayStation lifecycle as Square was already announcing FFX and FFXI for new directions/hardware.

RPGFan's 2000 review records substantial marketing around the title, including:
- US commercials;
- a Coca-Cola partnership;
- PlayOnline strategy-guide promotion. [FFIX12](#ffix12)

The current Steam product says FFIX has sold **over five million copies since its 2000 release**. [FFIX19](#ffix19)

That store claim does not disclose platform/territory breakdowns or current active users.

## 22. Five independent written reviews

| Source | Version | Praised | Criticized / tradeoff |
| --- | --- | --- | --- |
| GameSpot | PlayStation, 2000 | synthesis of series strengths, cast/world/battles/presentation | less revolutionary than VII/VIII by design |
| RPGFan | PlayStation, 2000 | characters, secrets, traditional ATB/ability play | Trance unpredictability, some sound/story reservations |
| Push Square | PS4, 2017 | story/world/music/ATB longevity | stiff field movement, blurry backgrounds, oversized battle UI |
| Nintendo Life | Switch, 2019 | charm, characters, customization, environments | pacing/plot focus, aged pre-rendered navigation/presentation |
| Pocket Gamer | mobile, 2016 | underlying game and mobile adaptation | low-resolution backgrounds, premium-price/port compromises |

[FFIX20](#ffix20) [FFIX12](#ffix12) [FFIX05](#ffix05) [FFIX06](#ffix06) [FFIX17](#ffix17)

### Reception synthesis

**FFIX is praised for cohesion more than radical novelty.** It recombines known Final Fantasy language into a very deliberate character/world structure.

**Equipment learning has aged well.** It gives every piece of gear a second function and keeps progression understandable.

**Trance has not aged as well.** Automatic activation undermines planning.

**Modern ports expose preservation limits.** Cleaner characters/UI make unchanged backgrounds more obvious; many current PC players recommend community visual mods.

**Its emotional reputation is unusually durable.** Current player testimony still centers Vivi, the cast and themes of mortality/belonging.

## 23. Current Steam player evidence

As of September 26, 2026:
- **94% of 7,090 English-language Steam reviews** are positive;
- **94% of ~106 recent reviews** are positive. [FFIX19](#ffix19)

Helpful/current positive themes:
- story/characters;
- art direction/music;
- equipment ability system;
- nostalgia without needing VII/VIII's experimental mechanics;
- community mods such as Moguri/Memoria improving background presentation. [FFIX21](#ffix21)

Helpful negative evidence shows two different complaint classes:
1. **port quality** — blurry backgrounds, missing/changed effects, modern adaptation shortcomings;
2. **game design** — slow battle pacing, repeated Steal attempts, resource friction and some opaque systems. [FFIX22](#ffix22)

Those are qualitative examples, not prevalence estimates.

## Worked cross-system situations

**Constructed rules-based illustrations, not personal play reports.** The earlier explanations remain above; these cases make their conditions, consequences and limitations explicit.

### A. A new weapon can consume an unfinished lesson

**Intention:** improve Zidane without losing access to something still being learned. **Conditions:** a shop offers Butterfly Sword, and the party owns Dagger, Mage Masher and 300 gil. **Actions:** inspect the old items' teaching progress, finish relevant mastery or retain another teaching source, then synthesize. **Interaction:** upgrading consumes possessions that also enable learning. **Result:** the new weapon opens its own repertoire without automatically preserving every unmastered old ability. **Next choice:** use it for immediate strength or train its abilities. **Limit:** being able to pay is not proof that now is the best moment to consume the inputs. [FFIX07](#ffix07) [FFIX10](#ffix10) [FFIX31](#ffix31)

### B. A silent partner can remove someone else's action

**Intention:** have Steiner use Fire Sword against a suitable target. **Conditions:** Vivi has Fire available, both are participating, and Steiner can pay the cost. **Actions:** select the cooperative attack; if Vivi is Silenced first, remove that condition or choose another action. **Interaction:** one person's condition changes another's available repertoire. **Result:** curing Vivi can restore two participants' options, not only his next spell. **Next choice:** spend the recovery turn or exploit a different attack. **Limit:** more MP on Steiner cannot solve his partner's inability to participate. [FFIX30](#ffix30)

### C. Leave something behind to make the next harvest useful

**Intention:** increase Quina's long-term frog count. **Conditions:** a marsh contains catchable frogs and a potential breeding pair. **Actions:** catch a portion, retain the useful population and leave for another objective before revisiting. **Interaction:** immediate collection competes with replenishment and travel scheduling. **Result:** the existing count is retained while another visit can become productive. **Next choice:** pursue the next Quale milestone or use the improved Frog Drop if learned. **Limit:** clearing everything for one more immediate catch can slow the later goal; possessing many catches does not itself teach the spell. [FFIX26](#ffix26) [FFIX27](#ffix27)

### D. Avoid a duel rather than trusting a stronger number

**Intention:** capture a useful Tetra Master position with less uncertainty. **Conditions:** a neighboring enemy card has an unguarded side. **Actions:** aim an arrow into that side instead of forcing opposed arrows. **Interaction:** placement can bypass the uncertain card battle. **Result:** the card flips without a battle-driven combo. **Next choice:** protect the new position or prepare another capture. **Limit:** the safer local flip may leave an unfavorable final board; winning this placement is not winning the match. [FFIX24](#ffix24)

### E. Finish the delivery chain, then finish the repair

**Intention:** restore Mognet Central. **Conditions:** the late relay is available and the party can reach its contacts. **Actions:** carry the requested letters, bring Quina for the Fossil Roo contact, obtain Ruby's Superslick and take it to Artemicion. **Interaction:** information, party composition, travel and a material object jointly resolve the problem. **Result:** a network investigated across several places receives its repair and reward. **Next choice:** return to other unfinished exploration. **Limit:** identifying or obtaining the missing material does not complete the final hand-in. [FFIX28](#ffix28) [FFIX29](#ffix29)

### F. A learned defense is not an active defense

**Intention:** prepare for an enemy known to inflict a dangerous status. **Conditions:** the character has mastered the relevant protective support ability but has spent the available Magic Stones elsewhere. **Actions:** inspect the active set, disable a less relevant effect and allocate the required stones. **Interaction:** permanent knowledge and current capacity are distinct. **Result:** equipment can change while the mastered defense remains selectable, but only the enabled set governs the encounter. **Next choice:** keep the defensive plan or restore the previous setup afterward. **Limit:** a full mastery bar does not prove that the protection was switched on. [FFIX09](#ffix09)

## 24. Comprehensive mechanics inventory

| Category | FFIX implementation / absence |
| --- | --- |
| Character creation | No avatar creator; authored fixed cast |
| Classes/jobs | Fixed identity roles (thief, knight, black mage, summoner, dragoon, etc.) |
| Leveling | EXP/levels plus AP ability mastery |
| Ability learning | Equipment teaches compatible Action/Support abilities; mastery persists |
| Build activation | Support abilities consume finite Magic Stones |
| Equipment | Character-compatible weapons/armor/add-ons; each can teach abilities and alter elements/stats |
| Crafting | Synthesis combines equipment + gil into new equipment; old teaching sources can be consumed |
| Items | Consumables, key items, synthesis inputs, equipment, cards, Chocographs and delivered letters |
| Magic | MP-based, character-role-specific; summons and Blue Magic variants; Eiko's Double White differs from Garnet's Eidolon |
| Combat | Four-person ATB, Trance, role-specific commands, status/elemental rules |
| Cooperative capability | Steiner Sword Magic depends on Vivi's available repertoire and condition; Steiner pays the MP |
| Enemy interaction | Steal; Quina Eat/Blue Magic; status/element exploitation |
| Traversal | Ships/airships, Choco, Chocobo ability upgrades |
| Minigames | Hot & Cold, Tetra Master placement/card stakes, frog catching, jump rope, racing, auctions, hunts and others |
| Persistent side systems | Frog count and marsh replenishment; Mognet letter/repair flags; card collection distinct from combat equipment |
| Economy | Gil, shops, synthesis costs, auction systems, minigame points |
| Death/failure | KO/revival and save/modern autosave recovery; card losses have their own stakes |
| Story | Authored journey with strong identity/mortality themes |
| Relationships | Authored interpersonal development; no generic affinity simulation |
| Off-screen world | Active Time Events expose parallel scripted character/NPC scenes |
| NPCs/factions | Dense authored NPCs/kingdoms, no general autonomous simulation |
| Multiplayer | The studied modern ports are single-player; Tetra Master NPC matches are not a native online card service |
| Building/settlements | No player construction/management |
| Endgame/optional | Chocograph chain, ultimate gear, Ozma/Hades, Friendly Monsters, Stellazzio, Mognet repair, Quale and Excalibur II challenge |

## 25. OpenLegend transferable lessons and limits

### A. Equipment can be a teacher

FFIX gives gear persistent educational value.

**Borrow:** tools, books, uniforms, artifacts and machines can expose techniques while used.

**Limit:** learning should make causal sense; not every hat should teach arbitrary magic.

### B. Separate knowledge from active capacity

A character may know a support ability but lack enough stones to activate every one simultaneously.

**Borrow:** attention, preparation slots, physiological capacity or active loadout can constrain simultaneous expertise without deleting learned knowledge.

### C. Keep people distinct even when objects teach

FFIX lets gear teach only compatible dormant abilities.

**Borrow:** prior training/body/culture can determine what an artifact teaches easily.

**Limit:** OpenLegend should allow retraining/change where fiction supports it rather than hard-coded immutable classes.

### D. Let people do things off-screen

ATEs show that the world does not pause around the protagonist.

**Borrow:** autonomous actors should continue goals/routines, while the UI selectively surfaces relevant distant events.

### E. Side progression should change geography

Chocobo Hot & Cold evolves into new traversal abilities and hidden places.

**Borrow:** hobbies can unlock movement, maps, relationships and world knowledge.

### F. Old items should have second lives

Synthesis keeps “obsolete” gear relevant.

**Borrow:** repair, inheritance, disassembly, teaching, crafting or sentimental/social meaning can prevent infinite trash churn.

### G. Cooperative abilities can belong to relationships

Steiner + Vivi create a capability neither has alone.

**Borrow:** trust/familiarity/complementary expertise can enable joint actions.

### H. World population benefits from attention to minor people

FFIX invests writing in non-protagonists.

**Borrow:** agents should have enough local intention/personality that incidental encounters feel like meetings with people, not content dispensers.

## 26. Preservation and requirement audit

No FFIX-specific prior game/mechanics/dossier owner existed on this branch before G86, so this dossier is additive. The corrective pass retains all FFIX01–22 sources and the original examples, corrects the Eiko/Garnet conflation, adds side-system operations and six complete situations, and makes meaningful spoilers explicit. Recommendations remain research interpretations, not adopted OpenLegend requirements.

| Requirement | Coverage |
| --- | --- |
| R01 identity/scope/promise | §§1–3 |
| R02 actions/major mechanics | §§4–18, 24; expanded frog, card and Mognet operations |
| R03 items/entities/composition | §§4–10, 12, 14–16; named synthesis and letter chains |
| R04 progression/economy/time | §§4–9, 12, 14–16, 21; collection, replenishment and card stakes |
| R05 concrete interactions | [Six fully worked situations](#worked-cross-system-situations), retaining §§4–10, 13–15 examples |
| R06 people/AI/social/multiplayer | §§10, 13, 16–18, 24 |
| R07 art/audio/interface/feel | §§3, 20, 22–23 |
| R08 story/narrative/play | §§13, 16–18, with spoiler boundaries |
| R09 production/development | §§19–20 |
| R10 marketing/distribution/virality | §21 |
| R11 commercial/participation | §§21, 23 |
| R12 reviews/player feedback | §§22–23 |
| R13 transferable inspiration/limits | §25 and labeled interpretation beside the added systems |
| R14 sources/viewing/preservation/navigation | §§2–3, 26 + annotated sources; original headings retained |

### Evidence limits

- Original PlayStation and modern mobile/PC/console ports are separated where relevant.
- Five independent written reviews were inspected in the original pass; that inherited reading is not falsely presented as repeated by this corrective pass.
- Steam evidence is self-selected and the current port/mod ecosystem affects it; the prior snapshot is retained, not refreshed here.
- The “over five million” figure is the original pass's Steam/Square Enix product claim and does not expose a detailed sales breakdown.
- New guide passages were inspected for the named rules. They are not a current-mod audit or a personally reproduced playthrough.
- No claim depends on unwatched footage. Useful viewing targets include a Tetra Master opposed-arrow combo, marsh harvesting and return, the synthesis/AP interface, and Sword Magic becoming unavailable after a partner's status changes. The linked guides provide reading routes; no invented playback timestamps are supplied.
- The separate seven-file packet audit and 130-subject integration remain open; untouched original owners are not proof of a completed packet comparison.

## 27. Completion conclusion

FFIX's strongest design contribution is a clean three-way relationship between **person, possession and learning**.

Characters have durable identities. Equipment does more than raise stats: it teaches. AP turns repeated use into permanent competence. Support-stone capacity separates what someone knows from what they can actively sustain. Synthesis gives old gear future purpose.

ATEs and Chocobo Hot & Cold extend the same philosophy outside battle: other people have lives elsewhere, and optional activities can become world-travel systems.

For OpenLegend, the most useful principle is:

> **Make abilities emerge from who someone is, what they have used, what they have learned, and who they are with—while letting those histories persist after the immediate item or encounter is gone.**

## Sources — annotated set

<a id="ffix01"></a>**FFIX01 — [FINAL FANTASY IX 20th Anniversary Special Interview Vol. 1](https://na.finalfantasy.com/topics/191).** Square Enix / Final Fantasy Portal, 2020-07-07. Primary Kazuhiko Aoki retrospective on return-to-roots direction, NPC/character development, Chocobo Hot & Cold origin, team structure and disc/data constraints.

<a id="ffix02"></a>**FFIX02 — [FINAL FANTASY IX 20th Anniversary Special Interview Vol. 3](https://na.finalfantasy.com/topics/196).** Square Enix / Final Fantasy Portal, 2020-07-21. Primary director Hiroyuki Ito retrospective on the ambiguity/meaning of “returning to roots” and themes of humanity/circumstance/kindness/hatred.

<a id="ffix03"></a>**FFIX03 — [Final Fantasy IX worldwide mobile release](https://toucharcade.com/2016/02/09/final-fantasy-ix-is-now-available-worldwide/).** TouchArcade, 2016-02-09. Mobile booster/release evidence.

<a id="ffix04"></a>**FFIX04 — [Final Fantasy IX port analysis](https://www.pcgamer.com/final-fantasy-ix-port-analysis/).** PC Gamer, 2016. PC adaptation features and preservation/asset constraints.

<a id="ffix05"></a>**FFIX05 — [Final Fantasy IX Review (PS4)](https://www.pushsquare.com/reviews/ps4/final_fantasy_ix).** Robert Ramsey, Push Square, 2017-09-27. Full independent review; story/world/music/ATB and port-visual/UI criticism.

<a id="ffix06"></a>**FFIX06 — [Final Fantasy IX Review (Switch)](https://www.nintendolife.com/reviews/switch-eshop/final_fantasy_ix).** Mitch Vogel, Nintendo Life, 2019-02-21. Full independent review; charm/customization and aging navigation/presentation evidence.

<a id="ffix07"></a>**FFIX07 — [Final Fantasy IX North American manual](https://finalfantasy.fandom.com/wiki/Final_Fantasy_IX/Manual/North_America).** Manual transcription used for official ability-learning/AP rules, multiple Steal items and ATE behavior.

<a id="ffix08"></a>**FFIX08 — [Final Fantasy IX Learning Abilities guide](https://gamefaqs.gamespot.com/ps/197338-final-fantasy-ix/faqs/71891/learning-abilities).** Community mechanics/strategy reference on equipment-versus-ability-learning tradeoffs.

<a id="ffix09"></a>**FFIX09 — [Final Fantasy IX Abilities](https://strategywiki.org/wiki/Final_Fantasy_IX/Abilities).** StrategyWiki. Character action/support abilities and stone costs.

<a id="ffix10"></a>**FFIX10 — [Final Fantasy IX Synthesis](https://strategywiki.org/wiki/Final_Fantasy_IX/Synthesis).** StrategyWiki. Recipe/input/cost evidence for equipment-production loops.

<a id="ffix11"></a>**FFIX11 — [Final Fantasy IX abilities overview](https://finalfantasy.fandom.com/wiki/Final_Fantasy_IX_abilities).** Community mechanics reference for equipment learning and Trance command changes.

<a id="ffix12"></a>**FFIX12 — [Final Fantasy IX Review](https://www.rpgfan.com/review/final-fantasy-ix/).** Damian Thomas, RPGFan, 2000-12-09. Full written review; ATB, Trance unpredictability, secrets, marketing and presentation.

<a id="ffix13"></a>**FFIX13 — [Final Fantasy IX manual — Active Time Events](https://finalfantasy.fandom.com/wiki/Final_Fantasy_IX/Manual/North_America).** Manual transcription describing optional/mandatory ATEs and how viewed events/actions can change later options.

<a id="ffix14"></a>**FFIX14 — [Final Fantasy IX Chocobo Hot & Cold](https://strategywiki.org/wiki/Final_Fantasy_IX/Chocobo_Hot_%26_Cold).** StrategyWiki. Digging/points/reward loop and late high-value rewards.

<a id="ffix15"></a>**FFIX15 — [Final Fantasy IX Treasure Hunting](https://strategywiki.org/wiki/Final_Fantasy_IX/Treasure_Hunting).** StrategyWiki. Chocographs, clues, traversal requirements and world-map treasure loop.

<a id="ffix16"></a>**FFIX16 — [Final Fantasy IX Tetra Master](https://strategywiki.org/wiki/Final_Fantasy_IX/Tetra_Master).** StrategyWiki. Card arrows, attack/defense values and battle rules.

<a id="ffix17"></a>**FFIX17 — [Final Fantasy IX mobile review](https://www.pocketgamer.com/final-fantasy-ix/review/).** Harry Slater, Pocket Gamer, 2016-02-11. Full independent review; port quality, touch controls and low-resolution background criticism.

<a id="ffix18"></a>**FFIX18 — [Final Fantasy IX game overview](https://www.rpgfan.com/game/final-fantasy-ix/).** RPGFan. Regional original release dates.

<a id="ffix19"></a>**FFIX19 — [FINAL FANTASY IX on Steam](https://store.steampowered.com/app/377840//?l=english).** Valve/Square Enix, retrieved 2026-09-26. Current product, >5m sales claim, release date and dynamic review aggregate.

<a id="ffix20"></a>**FFIX20 — [Final Fantasy IX Review](https://www.gamespot.com/reviews/final-fantasy-ix-review/1900-2605459/).** Andrew Vestal, GameSpot, 2000-07-19. Full independent contemporary review; one of five review publications.

<a id="ffix21"></a>**FFIX21 — [FINAL FANTASY IX most-helpful Steam reviews](https://steamcommunity.com/app/377840/reviews/?browsefilter=toprated&l=english).** Steam users, inspected 2026-09-26. Qualitative current/long-tail player evidence.

<a id="ffix22"></a>**FFIX22 — [Helpful negative FINAL FANTASY IX Steam review](https://steamcommunity.com/profiles/76561197983399633/recommended/377840) and [top helpful review surface](https://steamcommunity.com/app/377840/reviews/?browsefilter=toprated&l=english&snr=1_5_9_).** Individual player testimony on battle/Steal/resource friction and port-quality criticism; self-selected, not prevalence evidence.

### Corrective-pass sources

The following passages were inspected September 26, 2026. Community guides establish their documented rules, not proprietary implementation or personally tested behavior. Original source IDs above are preserved.

<a id="ffix23"></a>**FFIX23 — [Eiko Carol](https://www.gamerguides.com/final-fantasy-ix/guide/introduction/characters/eiko-carol).** Gamer Guides, authored character reference. Double White and equipment-dependent summon passages read; the writer's character ranking is not adopted. Corrects the original conflation with Garnet.

<a id="ffix24"></a>**FFIX24 — [Tetra Master](https://gamefaqs.gamespot.com/ps/197338-final-fantasy-ix/faqs/71891/tetra-master).** bover_87, guide v2.01, June 20, 2023. Placement, contested capture, combos and result rules read; no exact probability simulation claimed.

<a id="ffix25"></a>**FFIX25 — [Introduction to Tetra Master](https://www.gamerguides.com/final-fantasy-ix/guide/side-quests/tetra-master/introduction-to-tetra-master).** Gamer Guides. Entry, collection limit and card-stakes passages read; normal matches are distinguished from the story tournament. Numerical shorthand is not treated as a complete internal formula.

<a id="ffix26"></a>**FFIX26 — [Journey to Burmecia: frog-catching section](https://www.gamerguides.com/final-fantasy-ix/guide/walkthrough/disc-1/burmecia).** Gamer Guides. Quina, land catches, retained breeding population and outside-area regrowth inspected. Other walkthrough sections are not represented as played.

<a id="ffix27"></a>**FFIX27 — [Frog Catching](https://www.hellandheavennet.com/final-fantasy-9/side-quests/frog-catching.php).** Hell and Heaven Net, community guide. Named learning source, Frog Drop relationship and Quale reward sequence read. Exact growth-time formulas are not certified.

<a id="ffix28"></a>**FFIX28 — [Moogle FAQ](https://gamefaqs.gamespot.com/ps/197338-final-fantasy-ix/faqs/23306).** Ornitier, authored original-game guide. Mognet repair route, Quina access and material hand-in passages read. Conflicting minimum-chocobo shorthand is not adopted; optional Kupo Nut detours are not mandatory prerequisites.

<a id="ffix29"></a>**FFIX29 — [Side Questing Finale](https://www.gamerguides.com/final-fantasy-ix/guide/walkthrough/disc-4/side-questing-finale).** Gamer Guides. Substantive indexed Superslick/Ruby/Artemicion and reward text inspected. Its convenient ocean route is not asserted as the only route to Central.

<a id="ffix30"></a>**FFIX30 — [Abilities: Sword Magic](https://gamefaqs.gamespot.com/ps/197338-final-fantasy-ix/faqs/71891/abilities).** bover_87, v2.01. Substantive Sword Magic repertoire, partner-condition and MP rules inspected; exact current mod behavior is outside scope.

<a id="ffix31"></a>**FFIX31 — [Butterfly Sword](https://finalfantasy.fandom.com/wiki/Butterfly_Sword_%28Final_Fantasy_IX%29).** Community item reference. Recipe, cost and teaching properties inspected and recipe cross-checked against FFIX10. No arbitrary recipe invention or inventory duplication implied.
