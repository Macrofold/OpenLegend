# G110 — Star Wars: Knights of the Old Republic II: The Sith Lords

**Full research pass: September 26, 2026.** Scope: the original Obsidian game, with later ports and restoration explicitly separated. This is the final game authorized in the current continuation; stop after G110. Library integration and the completion commit are recorded in the [progress ledger](../research-progress.md).

[Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Library](../README.md) · [Original KOTOR dossier](star-wars-knights-of-the-old-republic.md)

**Spoilers:** the opening sections discuss recruitment and progression. The story section and examples reveal companion development, planet resolutions, party separation and the final opponent. This is reference research, not an accepted OpenLegend feature specification. Constructed examples below are rules-based illustrations, not claims of personally recorded play.

**September 27 audit:** all R01–R14 sections and the mechanics inventory were reread. The audit added the original 2005 Obsidian postmortem, the 2015 Aspyr desktop update, a directly reported US sales milestone, and all-time Steam helpful/negative material. It preserves the base-game / TSLRCM distinction rather than treating later restoration-heavy player testimony as launch reception.

## Identity and access boundaries

Obsidian Entertainment developed the original game and LucasArts published it; Aspyr handled later desktop work. Steam dates the Windows release February 8, 2005, identifies single-player play and sets the story five years after the original. Its protagonist rebuilds an exiled Jedi's connection to the Force, not the first protagonist's existing build. Workshop availability does not automatically install restoration. [S01](#s01)

| Studied layer | Boundary that matters |
| --- | --- |
| Original Xbox / Windows campaign | The 2004–2005 game is the baseline for the contemporary reviews and early mechanics guides. The 2009 Xbox review was played on Xbox 360 and must not be treated as a launch-hardware test. [S03](#s03), [S08](#s08), [S09](#s09) |
| Later desktop distribution | Storefront features establish a distribution layer, not proof that every old bug was eliminated. [S01](#s01) |
| Switch, June 2022 | The port's faults are distinct from the original's unfinished content. The July review reports the Basilisk progression bug already patched. [S04](#s04), [S05](#s05) |
| The Sith Lords Restored Content Mod, TSLRCM | The inspected 1.8.6 project credits Zbyl2, DarthStoney, Hassat Hunter and VarsityPuppet. Separately installed restoration and bug fixes are not an official director's cut. [S12](#s12) |
| Mobile and other later versions | The secondary release chronology lists iOS/Android ports in December 2020. This dossier does not transfer desktop installation instructions, performance or mod compatibility to those versions without a platform-specific source. [S31](#s31) |
| Promised Switch restoration DLC | Canceled in June 2023. Reviews anticipating it are historical expectations, not evidence that it remains forthcoming. Later reporting leads and their access limits appear below. [S07](#s07), [S31](#s31) |

**First session versus established play.** Create a Jedi; pause, select companions and queue combat actions. Explore through conversations and context-sensitive objects. [S02](#s02) Peragus makes this concrete: the player alternates between T3-M4 and the Exile, retrieves parts, opens a route for another character, and investigates an apparently helpful HK droid. [S25](#s25)

Once the Ebon Hawk becomes the travel hub after Telos, the player chooses among destinations including Dantooine, Nar Shaddaa, Korriban and Onderon, with Dxun reached through the Onderon route. The established rhythm is destination choice, party preparation, local investigations and fights, then shipboard conversations and equipment work. The order has flexibility; the campaign is not a seamless galaxy where every activity is available from the opening. [S13](#s13), [S23](#s23)

**Research interpretation.** The early loss of agency supplies a contrast for later power, but also creates a replay cost: a player returning for a different companion relationship must revisit substantial setup before the wider structure opens. A strong mystery can justify that delay for one audience without making it frictionless for another.

## Player actions and major systems

### Builds, skills and power selection

The six attributes support different capacities. Strength contributes to close-combat attack and damage; Dexterity supports ranged attacks and defense; Constitution supports vitality and implant eligibility. Intelligence increases skill-point resources. Wisdom and Charisma affect Force use, while Charisma also bears on Persuade and the cost penalty for opposing-alignment powers. These are distinct relationships, not one universal roll applied identically to all actions. Exact derived bonuses and exceptions should be checked in the selected build's UI rather than reconstructed from the first game. [S14](#s14)

Guardian favors vitality/feats, Consular Force reserves/power advancement, and Sentinel skills. [S02](#s02) Later prestige choices include Weapon Master, Watchman and Jedi Master on the light side and Marauder, Assassin and Sith Lord on the dark side. The contemporary FAQ describes the prestige conversation with Kreia at level 15 for a sufficiently committed alignment. That is an eligibility gate, not an automatic class conversion at a birthday-like world date. Equipment skill bonuses can qualify a character for recipes, making noncombat investment useful beyond a single locked door. [S13](#s13)

| Action family | Inputs and result | Important limit |
| --- | --- | --- |
| Computer Use | An Intelligence-linked skill spends computer spikes on supported terminal operations, such as disabling defenses. More skill can reduce the consumable requirement. [S15](#s15) | A terminal exposes authored operations; this is not arbitrary hacking of every object. |
| Repair | Intelligence-linked repair spends parts to reactivate suitable droids and improves a droid's repair-kit effectiveness. [S16](#s16) | Repair parts, workbench components and laboratory chemicals are not interchangeable names for one resource. |
| Security | The inspected KOTOR II tooltip makes this Intelligence-linked and requires training for the option; security spikes supplement opening supported locks. [S17](#s17) | Do not import a Dexterity association or assume an untrained character can use every door. Plot locks remain a different kind of restriction. |
| Stealth | With the relevant training/device or a separately provided ability, a character enters stealth and contests enemy Awareness. The tooltip permits mine work while hidden and changes party attack behavior. [S18](#s18) | Attacking is not indefinitely compatible with remaining undetected. This is not evidence of a general social-disguise simulation. |
| Awareness | Wisdom-linked detection checks reveal concealed enemies or mines; running imposes a five-point penalty. [S37](#s37) | Traveling faster can reduce information, even without a separate command to search. Detection is not the same as safely disabling a mine. |
| Demolitions | Training permits mine placement, disarming and recovery. [S02](#s02) | Recovery and disarming are different outcomes, not synonyms for collecting free loot. |
| Treat Injury | Improves medpac healing and laboratory breakdown yields. [S02](#s02) | Medical skill has both immediate and supply-management uses; it does not replace every scripted treatment requirement. |
| Dialogue and interpretation | Repair knowledge can expose an unfair droid price in dialogue. [S02](#s02) Persuasion can also resolve a specific code-gathering obstacle. [S25](#s25) | A displayed social skill does not guarantee every interlocutor can be persuaded or every branch reverses a quest outcome. |
| Power and feat choice | The catalog distinguishes lightsaber forms, neutral powers and light/dark powers: examples include Speed, Battle Meditation, Heal, Stun Droid, Force Lightning and Force Storm. [S30](#s30) | A catalog entry is not proof of availability to every class at every level; power selection, resource cost, armor restrictions and target resistance still matter. |

Attacks compare a d20-based total with Defense. Force abilities spend naturally recovering points; zero vitality means unconsciousness. [S02](#s02) **Combat interpretation:** the decision interval differs from the animation interval. The useful question is not simply whether the player can click quickly, but whether the party has the appropriate attack, defense, disabling effect or consumable before the next exchanges resolve. Queuing a plan creates a reason to interrupt it when targets or health change. A cinematic saber exchange is not direct aim-and-parry combat.

Forms add a situational choice within a weapon role. The actual Soresu tooltip gives two extra Defense against the current target and four extra blaster-bolt deflection, but reduces the weapon's critical-threat range by one. This is a tradeoff, not simply a universally stronger stance. [S35](#s35)

Kreia's Force Chain is a particularly important exception. The actual in-game description says **most beneficial powers affecting Kreia or the Exile also affect the other**, with Force Resistance as its example. It does not say all damage, all powers, or every companion are duplicated. GameBanshee's character overview overstates this; the inspected tooltip takes precedence for the rule. [S19](#s19), [S33](#s33)

### Objects, equipment and crafting

The useful equipment distinctions are weapon role, upgrade compatibility, protection and skill support, rather than a single item-level ladder. Lightsaber hardware uses cells, emitters and lenses alongside found crystals. The saber guide distinguishes craftable hardware from crystals that must be acquired, and documents tradeoffs such as deflection versus attack. As a concrete low-tier combination, it lists a Diatium Energy Cell at Computer Use 7, a Deflection Emitter at Repair 5, and a Dragite Lens at Awareness 7. Those thresholds illustrate distributed crafting expertise; they are not an exhaustive recommended build. [S20](#s20)

The workbench list also covers armor overlays/underlays, ranged upgrades and melee upgrades. For example, an Ion Charger Mk 1 requires Security 4 and two components, and adds ion damage against droids; Heat Shielding and Biorestorative underlays serve different defensive needs. Recipes sometimes exchange a benefit for a penalty, and later tiers demand more skill and materials. Manufacturing an upgrade and installing it are distinct operations. [S21](#s21), [S09](#s09)

Workbenches consume components; lab stations use chemicals. Both support dismantling and creation. [S02](#s02) The Ebon Hawk workbench also makes the crew's equipment accessible without requiring every owner to be in the active field party; a world-side bench has a narrower party context. [S23](#s23)

| Entity or resource | Practical life cycle | Analytical consequence |
| --- | --- | --- |
| Weapons and upgrade pieces | Find or purchase equipment, inspect compatibility, craft eligible parts, then install them. Crystals are a separate acquisition problem from craftable saber hardware. [S20](#s20), [S21](#s21) | A familiar weapon can remain meaningful through modification rather than constant replacement. |
| Armor and implants | Defensive equipment is constrained by build and compatibility; Constitution affects implant eligibility, while upgrade tables include both protection and penalties. [S14](#s14), [S21](#s21) | The largest displayed defense number need not be the best complete loadout. |
| Spikes, parts and consumables | Terminals and droid repairs spend their respective items. Named crew can supply limited categories when inventory is low: T3-M4 supplies computer spikes, for example. [S15](#s15), [S16](#s16), [S23](#s23) | Skills reduce future resource pressure; crew services are not an unlimited automated factory. |
| Loot and credits | The FAQ notes randomized container loot, so an exact item found by one guide author is not a universal guaranteed reward. [S13](#s13) | A walkthrough's lucky drop should not be promoted to a dependable progression dependency. |
| Quest objects | A sonic imprint sensor records evidence; airspeeder parts are installed into a specific repair project. [S24](#s24), [S25](#s25) | These objects have authored affordances, not unrestricted combinatorial physics. |

**Research interpretation.** Skills become more persuasive as role-playing choices when they operate in several contexts: accessing equipment, interpreting a situation and changing a battle before it begins. The risk is bookkeeping masquerading as depth. Switching characters or equipping a temporary skill bonus may create a meaningful preparation decision, but repeated menu work after the solution is already known can become pure overhead.

### Traversal, optional activities and absent systems

Local movement connects designed areas, doors and encounter spaces; the ship's map connects larger destinations. Nar Shaddaa also has an airspeeder repair project requiring navigation, mechanical and power components, followed by unlocking its controls. The walkthrough observes that its travel benefit is limited by the size and arrangement of the available areas. [S24](#s24) This is a useful distinction between the fantasy of owning transport and the actual navigation problem it solves.

Pazaak combines a drawn hand and chosen side deck around a target of twenty. [S02](#s02) The Nar Shaddaa den integrates it with characters: Atton can handle Dahnis through their flirtation, and a computer-capable party member can change the gambling droid's behavior. The Champ is reached by resolving the rival players, not solely through anonymous match grinding. The same area contains a dancing route involving the female Exile or Handmaiden, with Visas explicitly not accepting that role. [S34](#s34)

Swoop racing adds steering, acceleration pads, gear timing and obstacle-clearing jumps; collisions can ruin a run. Turret encounters instead require aiming and firing. [S02](#s02) Telos's cantina supplies practice runs and credit-paying races alongside cards and quest contacts. [S36](#s36) **Research interpretation:** these activities change the control demands and offer a break from party combat. They should not be described as autonomous vehicle simulation or as mechanically identical to the first game's races.

The studied campaign has no native co-op, PvP ladder, player auction house or shared persistent world. [S01](#s01) Likewise, Khoonda's preparation sequence is **not** a general base-building editor, farming economy or settlement simulation: it changes particular defenses and recruits through a quest. [S26](#s26) The sources do not establish a universal NPC work/sleep calendar or open-ended ecological simulation. Their supported model is authored placements, behaviors, reactions and quest-state changes; do not fill that absence with mechanisms from other RPGs.

## Progression, economy, failure and return

Levels unlock build choices; saves retain progress. Ordinary defeat requires recovery or reloading, not an account-level reset. [S02](#s02) The prestige transition adds a second build decision after the starting identity, and developing relationships opens further personal possibilities. [S13](#s13), [S22](#s22)

The relevant economy is credits plus distinct utility materials. Credits support purchases and some negotiated or informational routes; components and chemicals support manufacturing; spikes and parts support specific interventions. They solve different problems. An advanced player's effective wealth therefore includes skill coverage and usable equipment, not just cash. This is an interpretation of the documented crafting and terminal rules, not a claim that the game explicitly calculates such a combined wealth value. [S15](#s15), [S16](#s16), [S21](#s21)

**Early purpose:** survive with restricted options and make sense of Peragus. **Middle purpose:** choose destinations, develop the crew and resolve local crises. **Late purpose:** settle the search for the Jedi and move into the directed finale. The reconstructed Enclave is an important threshold: the walkthrough advises resolving remaining trade or fuel business before entering the endgame sequence. That warning is more useful than assuming indefinite free exploration after every major story beat. [S25](#s25), [S23](#s23), [S28](#s28)

Replay is supported by different builds, destination order, light/dark choices and mutually exclusive companions. Original recruitment rules distinguish Handmaiden for a male protagonist from Disciple for a female protagonist, and Mira from Hanharr according to the relevant alignment route. This is not a promise that one run can collect every possible crew member. [S13](#s13), [S23](#s23)

**Research interpretation.** Replay offers alternative relationships rather than an endlessly renewed seasonal economy. Its strengths are discovering overlooked people and reinterpreting earlier conversations; its costs include repeated travel, exposition and advancement through known gates. The contrasting reviews below show why “more possible branches” is not enough by itself to establish that players want another run.

Story-scripted companion outcomes must also be distinguished from ordinary combat incapacitation. Atton's survival-oriented traits are part of his individual combat identity, not a guarantee that every story branch protects him. Later restoration changes cannot be silently imported into the base game's outcome rules. [S32](#s32), [S12](#s12)

## People, relationships, factions and AI

Atton begins as a Peragus prisoner and Scoundrel, with a pilot/gambler persona, skill coverage and survival-oriented feats. His jacket and mining laser make his initial equipment identity specific. Kreia begins as a Consular mentor with an experience benefit and an unusually explicit mechanical bond to the Exile. These are different roles, not just interchangeable dialogue portraits attached to identical units. [S32](#s32), [S33](#s33)

The influence guide differentiates how companions respond. Atton values being respected and trusted; Bao-Dur's opportunities lean strongly on witnessed actions, whereas Disciple has substantial conversation-based opportunities. Hanharr's relationship rewards are not a Jedi-training path. The guide also warns that an event does not necessarily award influence to every eligible witness. Consequently, the active party can affect what is learned and developed, not merely who contributes the most damage. [S22](#s22)

The ship is a recurring conversation and service space rather than an independent colony-management layer. Companion service examples include grenades from Mira, stimulants from Mandalore and healing supplies from Disciple, under limited-inventory conditions. [S23](#s23) This supports a useful design interpretation: services can reinforce who a companion is, while return visits give relationships a repeatable setting. It does not prove that supplies alone make a character emotionally compelling.

Relationships mix confidence, argument, instruction and some attraction. The Pazaak encounter with Dahnis explicitly makes Atton's charm actionable, while the gender-dependent recruit routes alter which longer personal arcs are available. [S34](#s34), [S23](#s23) There is no evidence here for a general marriage, household or family simulation. Nor should influence be reduced to a universal affection score: the same broad idea of “improving a relationship” can mean very different responses from different companions.

Factions become legible through local interests. Nar Shaddaa's refugees live between the Exchange and Serroco; Dantooine's Khoonda administration and militia face Azkul's mercenaries. Helping one person, interfering with a coercive group or preparing a settlement affects the local quest, not an infinitely general diplomacy engine. [S24](#s24), [S26](#s26) Some apparent systemic coherence is authored: hostility around containers, particular recruit flags and set-piece preparations are deliberately placed rules.

**AI boundary.** Companion behavior settings and player control support party tactics, but they do not establish independent long-horizon personalities planning outside authored content. Tucker appreciates the additional behavior choices; Fable criticizes poor enemy coordination and thin environmental interaction. Both observations can be true: more player configuration does not automatically produce convincing opposition or a busier world. [S03](#s03), [S09](#s09)

## Story through play — substantial spoilers

The Exile returns to a galaxy damaged by war, with Jedi in hiding and the Republic struggling to maintain order. The premise joins a personal loss of connection with a larger damaged society. It is not simply amnesia: the protagonist's past and relationship to earlier conflicts are central to how other characters respond. [S04](#s04), [S11](#s11)

Peragus combines material clues, recording devices, locked routes and the HK droid's unsettling account of a dead miner. Its storytelling works through things the player must manipulate, not only exposition watched between fights. [S25](#s25) Nar Shaddaa then puts suspicion into a different register: two Twi'leks warn that Atton is not who he seems. That external observation becomes a reason to revisit a familiar companion rather than treating ship dialogue as a separate collectible. [S24](#s24)

Dantooine makes restoration contested at a local scale. Khoonda needs preparation and people, not just a protagonist who wins the last duel. Later, the Enclave brings the search for the surviving Jedi back into a confrontation with authority and with Kreia's intervention. The encounter depends on earlier survival choices as well as alignment; a dark-side character is not logically identical to a campaign in which every master was killed. [S26](#s26), [S28](#s28)

At Malachor V's Trayus Core, the mentor becomes the final opponent, Darth Traya. The confrontation combines a fight, a further phase with floating lightsabers and a final opportunity to ask about the future of affected worlds and companions. Those answers are authored closure, not a playable simulation of every predicted future. [S29](#s29)

**Research interpretation.** A mentor who is useful in combat but challenges the player's interpretation creates a productive tension: mechanical reliance and intellectual agreement need not coincide. The larger narrative repeatedly asks whether intervention repairs dependency or creates it. That reading is not an instruction to accept Kreia's opinions as the game's correct moral answer. The existing light/dark rules also remain more categorical than some conversations, leaving a genuine tension between philosophical ambiguity and reward classification.

The unfinished connective tissue matters precisely because the game encourages investment in unresolved personal histories. Restoration can change the experience of those promises, but a modded retrospective cannot retrospectively change what a launch buyer received. Nor does restoring more dialogue automatically solve pacing or every disagreement about the ending. [S12](#s12), [S03](#s03), [S04](#s04)

## Six constructed interactions

Each situation below is an illustration assembled from the cited rules and walkthrough evidence. It is not a verbatim play account, exact universal build prescription or observed reproduction. Conditions and outcomes are bounded to the supported campaign context.

### G110-I01 — A voice becomes a key on Peragus

**Intention:** open the airlock without treating the obstacle as another combat encounter. **Conditions:** the Exile reaches the fuel depot, encounters the HK droid and obtains the sonic imprint sensor. **Actions:** question the droid about the body and its voice mimicry, then try the supported Persuade route to make it speak the needed code. **Interaction:** dialogue proficiency changes the evidence-gathering workload; the recording device gives speech a mechanical use. **Result:** a successful recording can be used at the terminal. **Next decision:** prepare for the exterior route rather than continuing to search rooms already resolved. [S25](#s25)

**Limit / alternate route:** unsuccessful persuasion need not end the campaign. The player can assemble the code using holologs and the recorded miner material instead. The meaningful difference is how the problem is solved, not a promise that all spoken words anywhere can authenticate any machine. This illustrates an authored alternative that preserves skill identity without making one build mandatory.

### G110-I02 — Rebuild a weapon for the opponent rather than the headline number

**Intention:** improve a ranged loadout for a droid-heavy encounter. **Conditions:** possess an upgrade-compatible weapon, enough components and a character meeting the recipe's Security requirement. **Actions:** inspect the existing upgrades, create an Ion Charger Mk 1, and install it rather than assuming creation itself changes the gun. **Interaction:** a noncombat skill unlocks an enemy-specific combat improvement. **Result:** the documented upgrade adds damage against droids. **Next decision:** retain it for the current threat or choose a more general upgrade for the next destination. [S21](#s21)

**Limit / tradeoff:** this does not establish that ion specialization is optimal against every enemy, that every weapon accepts that upgrade, or that dismantling a rare item is reversible. The decision includes the opportunity cost of the components and the slot. In contrast, saber construction distributes hardware recipes across Computer Use, Repair and Awareness while leaving crystal acquisition separate; the same general crafting loop supports different dependency structures. [S20](#s20)

### G110-I03 — Knowledge of a companion becomes a progression opportunity

**Intention:** understand Atton rather than merely keeping him as a ranged attacker. **Conditions:** reach Nar Shaddaa's refugee area, hear the Twi'leks' warning and have developed the required relationship. **Actions:** return to Atton, pursue the relevant personal conversation and respond in ways that support that route. **Interaction:** an external information flag and a relationship gate combine; neither generic quest completion nor combat level alone is the whole prerequisite. **Result:** the supported personal path can open Jedi Sentinel training. **Next decision:** choose how to develop his new role alongside the skills and equipment he already contributes. [S24](#s24), [S22](#s22)

**Limit:** this is a documented high-influence route, not a proof that every unlock is exclusively high-influence or that every companion can become a Jedi. The guide is an early Xbox-era account hosted on a PC index; exploit reports and exact thresholds are not generalized across patched or modded versions. Analytically, the compelling connection is biography becoming capability, not approval grinding as an end in itself.

### G110-I04 — Defending Khoonda begins before the battle

**Intention:** improve the settlement's chances rather than compensate for every weakness with the Exile's personal damage. **Conditions:** advance the Vrook/Adare sequence and receive access to preparation tasks. **Actions:** repair defense droids, configure turrets, heal wounded militia and resolve selected recruitment opportunities before telling Zherron to begin. **Interaction:** mechanical skills, medical capability and prior social help become inputs to one set piece. **Result:** prepared defenses and additional people can make the confrontation easier. **Next decision:** start now or spend more attention and resources on remaining preparations. [S26](#s26)

**Limit / counterexample:** related equipment can also be sabotaged for the opposing side. This is a deliberately authored battle-preparation quest, not proof of a general player-run military economy. The reference's exact reward and opponent sequencing vary with preceding choices; “defended the base” is too vague to reconstruct a save. The useful pattern is several understandable local contributions converging on a later crisis, with visible ownership of what each contribution changes.

### G110-I05 — Send a capable team where the protagonist cannot go

**Intention:** get the Dxun team through the defended approach without relying on the Exile to solve everything. **Conditions:** the return-to-Dxun sequence splits the party; the Exile and Kreia are reserved for the other objective. **Actions:** choose a team with useful combat and technical coverage, inspect the perimeter and decide between disabling the turret generator and using the console's foothold option to turn defenses against the Sith. **Interaction:** earlier crew investment affects the options available in a protagonist-free section. **Result:** intervention changes the subsequent fight rather than replacing every fight. **Next decision:** advance, preserving sufficient healing and defensive resources for the tomb. [S27](#s27)

**Limit:** the walkthrough makes the turret alternatives mutually exclusive: destroying the supply is not also preserving the guns for your use. A stealth specialist and a repair specialist need not be the same person. Analytically, this sequence tests whether a party system produces a team or just accessories for one overpowered lead; it also risks punishing players who were never clearly told to maintain their reserves.

### G110-I06 — A narrative bond changes who should spend an action

**Intention:** protect both the Exile and Kreia from an appropriate Force threat while leaving another party member free to act. **Conditions:** both are present and one knows a qualifying beneficial power, such as the tooltip's Force Resistance example. **Actions:** have the eligible character activate that power, then allocate the other character's next action to an attack or another needed response. **Interaction:** Force Chain shares the qualifying benefit across this particular relationship. **Result:** two characters benefit from the one activation where the rule applies. **Next decision:** respond to the enemy rather than automatically repeating the same buff on both. [S19](#s19)

**Limit:** the rule does not spread every effect to a third companion, duplicate hostile damage or make the pair invulnerable. The exact qualifying power matters. As a research pattern, it makes a relationship mechanically legible without reducing it to a percentage damage bonus; as a design risk, an unclear tooltip can invite exactly the overgeneralization found in the secondary character summary. [S33](#s33)

## Art, audio, interface and feel

Bowling praises the score, voice work and atmosphere, but criticizes uneven visuals, awkward camera changes and fragmentary staging. [S04](#s04) **Research interpretation:** coherent audio identity can coexist with visibly incomplete staging. A later port's presentation should not be mistaken for evidence of a new recording or redesigned cinematic pipeline.

Avellone's retrospective supplies a concrete visual-development example: he connects Darth Nihilus's conception and Brian Menze's design work with No-Face from *Spirited Away*. He also describes how difficult in-engine cinematic setup could be, and why the Ebon Hawk's repeatable character positions were helpful for conversation staging. This is production evidence about constraints and choices, not an inferred shader, animation pipeline or proprietary scripting implementation. [S11](#s11)

The interface makes its abstract systems visible through portraits, queued actions, skill-tagged options and equipment descriptions. The inspected Security and Force Chain images are especially useful evidence because their text resolves ambiguities that a summary page introduces. [S17](#s17), [S19](#s19) **Research interpretation:** explicit rules can reduce uncertainty without eliminating role-playing, provided the player can connect the displayed rule to the situation. A long list of terms without clear application can instead become a lookup burden.

Tucker values fast weapon-set switching and more behavior choices. Fable objects to the separation between creating and installing an upgrade. Vogel reports crashes, audio problems and performance variation in the Switch release. These are three different friction classes: useful control improvements, an interaction-design cost, and port reliability. They should not be combined into a vague judgment that the game simply “aged badly.” [S03](#s03), [S09](#s09), [S05](#s05)

**Accessibility boundary.** Pausing offers time for deliberation, but this dossier has not performed a motor, low-vision, hearing or cognitive accessibility audit. It does not certify current font scaling, remapping, screen-reader support or controller behavior across every port. A reader evaluating access should distinguish the deliberative combat structure from the practical ability to read, navigate and reliably operate a particular release.

## Production: constrained continuity, not simply a publisher-blame story

Kevin Saunders's **April 2005 Game Developer postmortem** is the strongest contemporary production source recovered in this audit. He describes a **33-person development team**, with roughly one third hired during the final six months and about 70 percent of the design staff among those late hires. BioWare supplied the inherited engine/toolset; LucasArts supplied QA, audio, rendered cinematics and some art assistance. Saunders says that support made delivery possible in **little more than 14 months**. The schedule did not merely affect cut story material: companion dialogue arrived late enough that the influence system could not be thoroughly mapped or balanced, so late testing led the team to increase influence-shift magnitudes; a complete playthrough also arrived only shortly before gold, leaving too little time to tune auto-balancing, and the team deliberately erred toward making the game easier. He calls some final systems essentially rough drafts whose identified flaws could not be addressed. This primary postmortem makes “rushed” a documented production constraint while also identifying concrete internal planning, staffing and polish failures rather than reducing the outcome to a one-party blame story. [S40](#s40)

In a March 26, 2007 interview, Obsidian co-founder Feargus Urquhart describes choosing improvements around limited resources and a story-heavy design team. He reports that Chris Jones reunited the inherited PC and Xbox code/resource pipelines, which had diverged, so both versions could build together while retaining platform-specific asset resolutions. This is a specific developer account, not a reverse-engineered claim about all engine internals. Urquhart also acknowledges that Obsidian planned too much and shipped before the ending was sufficiently polished. His retrospective qualifies the simpler blame narratives in contemporary reviews. [S10](#s10)

In the December 2019 interview, Avellone says the studio began with seven people and grew to roughly thirty; this describes the studio/project ramp rather than contradicting Saunders's contemporary 33-person development-team count. It corrects the notion that seven people made the entire finished game. He describes pitching before access to the original, subsequently revising the plan, and choosing a new protagonist rather than arbitrarily stripping Revan of power. He accepts scope responsibility, identifies expensive features/cinematics, and describes LucasArts supplying QA help. His account should not be flattened into a one-party blame narrative. [S11](#s11)

**Research interpretation:** reuse reduces some production costs but does not remove integration work. Narrative scope also creates obligations: a companion secret introduced early needs an implemented reveal and resolution later. A familiar combat system can remain functional while these less visible content dependencies fail to close. This is a production lesson, not proof that any particular extra month or budget would have fixed every defect.

Restoration changes more than polish: TSLRCM's documentation covers the HK Factory, added Atton Pazaak material and repaired skill checks. It treats M4-78EP as a separate installation context. Old saves, installation paths and combined Workshop mods require care, and some instructions still name older versions. [S12](#s12) **Research interpretation:** restoration adds playable and conversational routes whose state dependencies then need maintenance; it is not merely a higher-resolution edition. Fixing a missing check can alter which build gains an option, while a newly available scene can change a critic's interpretation of a companion. These are reasons to identify the installed version before comparing play accounts.

## Distribution, promotion and commercial context

This is paid single-player distribution rather than a subscription campaign. Steam positions it around the setting, character development and consequential decisions. [S01](#s01) Those are observable choices; they do not establish channel conversion or acquisition cost.

Contemporary review publication, later port reviews and a long-lived mod distribution page document different routes through which people encounter the game: initial release criticism, rediscovery on another device, and community restoration. In **July 2015**, Aspyr and Disney/Lucas also shipped a substantial Mac/Linux/Windows update adding achievements, cloud saves, native widescreen and high-resolution support, broader controller support and Steam Workshop integration; Aspyr explicitly says it worked with the TSLRCM team so the restoration mod was available through Workshop at launch. This is a material distribution/preservation event, not evidence that TSLRCM became part of the unmodified campaign. [S41](#s41)

A recommendation to install a mod is itself a shareable instruction, visible in the sampled Steam accounts, but this dossier does not translate that observation into a viral coefficient or a claim that modding caused a particular sales total. [S08](#s08), [S04](#s04), [S06](#s06), [S12](#s12)

| Date / evidence | What can responsibly be said | What it does not establish |
| --- | --- | --- |
| February 8, 2005, Steam's Windows release field | A dated product-release milestone for that storefront's game record. [S01](#s01) | The date of every territory, port or later digital listing. |
| 2006 sales-history lead | The secondary chronology attributes an approximately 1.5-million worldwide sales figure to an early-2006 IGN developer profile. Direct retrieval of that profile failed in this pass; keep this as an attributed historical lead, not an independently verified, audited metric. [S31](#s31) | Current lifetime sales, sell-through definitions, region/platform split, revenue or profit. |
| October 2008 historical sales context | GameSpot reported **more than 1.275 million US units** across the Xbox and PC releases while introducing *The Old Republic*. This is a directly retrieved secondary unit snapshot with geography/platforms stated; it does not validate the separate 2006 worldwide figure or establish later lifetime sales. [S42](#s42) | Worldwide lifetime units, revenue, profit, active users or a 2026 installed base. |
| June 2022 / June 2023 | A released Switch port was followed by cancellation of its promised restoration DLC. [S04](#s04), [S07](#s07) | A quantified refund burden, lost sales, or the cost of continued support. |
| September 26, 2026, accessible Steam reviews | The sampled weekly-helpful surface provides named qualitative responses and visible helpful counts. [S06](#s06) | Population sentiment, ownership, active users, retention or market share. |

**Unknowns:** no verified development budget, marketing spend, platform net receipts, royalty amount, port profitability, current lifetime units or cohort retention was established. The existence of later releases and an active restoration page is not enough to calculate sustainability. Multiplying an unverified sales lead by today's price would also mix dates, regions, discounts and gross/net definitions. No such revenue estimate is made.

### Switch cancellation and the chronology of claims

Nintendo Life's June 3, 2023 report reproduces Aspyr's cancellation announcement; its June 5 update reports restoration contributor zbyl2 rejecting a rumor that failure to credit the modders caused it. GameSpot independently recorded Aspyr's cancellation and its offer of a free Star Wars game to people who had already purchased KOTOR II on Switch. **That 2023 evidence establishes cancellation and the remediation offer, but not the actual reason.** [S07](#s07) [S43](#s43)

The subsequently updated encyclopedia points to a December 9, 2025 GamesIndustry.biz report about contributor permissions and legal names. Attempts to retrieve that underlying article were blocked, so this pass does not claim an independent examination of its reporting or legal materials. The later lead must not be silently erased, but neither should it be conflated with the different 2023 missing-credit rumor. Cancellation itself is established; a definitive causal account is not established by the primary material inspected here. [S31](#s31)

## Five substantive written reviews

**John Tucker, RPGFan, August 27, 2009.** An Xbox-version retrospective played on Xbox 360, not a 2004 launch review. Tucker values quick weapon-set switching, additional behavior settings, forms and the expanded power selection. He finds the story ending disappointing and most companions less memorable than the first game's, while reporting compatibility glitches he does not recall on original hardware. Some exact character-power and influence descriptions need checking against dedicated references rather than being promoted to rules. [S03](#s03)

**Audra Bowling, RPGFan, July 26, 2022, Switch.** Bowling favors the cast, ethical complications and side stories, but finds late cutscenes fragmentary and combat-heavy closure drawn out. Her account separates the original's unfinished structure from Switch crashes. The review states the Basilisk progression bug had already been patched by publication. Its recommendation to wait for restored-content DLC is historical advice, not a valid assertion that such DLC remains forthcoming. [S04](#s04)

**Mitch Vogel, Nintendo Life, June 8, 2022, Switch.** Vogel values customizable builds, alternative puzzle solutions and deliberate combat, while criticizing crashes, audio failures and uneven performance. His review anticipated DLC but now includes a cancellation notice. Loose introductory claims—including amnesia, the whole production team being seven people, and treating all attributes/actions as generic rolls—are not adopted as independently verified rules or history. [S05](#s05)

**Suneel Ratan, WIRED, December 15, 2004, Xbox launch period.** Ratan finds the cast unpredictable and the moral story engaging, but describes excessive exposition, weak puzzles, technical interruptions and confusing closure. His shared play with his wife illustrates social enjoyment around a single-player game, not native co-op. He says these frustrations diminish his desire to replay. His speculation about publisher or George Lucas involvement is criticism, not verified production evidence. [S08](#s08)

**Fable, GameBanshee, August 11, 2005, PC.** The reviewer values expanded equipment customization, more useful skills and complex companion motives. Their objections are not confined to bugs: sparse interaction in large environments, obvious routes, undemanding puzzles and weak enemy coordination undermine the world for them. The crafting interface also separates making an upgrade from installing it. Their account of unfinished narrative payoffs is preserved, but assertions about the publisher's motives or intended audience are not adopted as established facts. [S09](#s09)

**Research interpretation:** disagreement extends beyond bugs. Tucker finds the cast and plot less compelling; Bowling and Fable value precisely their ethical and personal complexity. Ratan's reluctance to replay contrasts with the enthusiastic modded-player accounts below. A port can preserve meaningful writing while adding separate technical friction. Neither a later mod nor an anticipated patch should be silently included in what an earlier reviewer actually played.

## Helpful Steam material: restoration is part of the evidence boundary

The September 27 audit recovered Steam's English **Most Helpful (All Time)** surface. Its most visible long-form material repeatedly recommends TSLRCM or discusses the post-2015 desktop update. A November 25, 2013 review with 982 helpful marks begins by recommending restoration because it considers the standard game unfinished and bug-prone; **R2L3372** (October 30, 2014) recommends the game but criticizes vague questing/backtracking and also tells readers to install restoration; **KutarFOX** (July 21, 2015) mainly celebrates Aspyr's then-new desktop update and Workshop support; **Jean le Point** (February 15, 2015) praises the protagonist, crew and mystery while warning that the opening through Telos can feel linear and again recommends restoration. Helpful ordering and counts are dynamic snapshots. More importantly, this is **not clean evidence about the unmodified 2004–2005 release**: restoration itself has become part of how prominent Steam reviewers frame the product. [S38](#s38)

Contrasting Steam material exists. **Powerglove64**'s August 22, 2016 not-recommended review likes several ideas but treats the vanilla game as only middling because of bugs, missing content and unresolved story material, while saying restoration substantially improves it. A top-rated negative-review surface also contains players who call the underlying game worthwhile yet reject the Steam Windows package because of severe compatibility failures. These are player accounts about both design and presentational/compatibility state, not proof that every Windows configuration fails or that restoration fixes every problem. [S39](#s39)

The earlier **Most Helpful (Week), English** capture remains useful as a current-sentiment snapshot rather than an all-time ranking. **Jimmy D Spoofy** praises the writing and power-building while explicitly recommending restoration. **Chubbs_Karamozov** also endorses the story in a restored-content context. **_n0T3** reports enjoying team-building while using both TSLRCM and a save editor; that is not an unmodified-base-game test. **determinedidiot** likes the experience despite rough edges. [S06](#s06)

**Interpretation:** Steam reception cannot responsibly be summarized as though customers are all reviewing one stable artifact. The base campaign, Aspyr's 2015 compatibility/update layer and TSLRCM are separable states, yet prominent player reviews often evaluate them together. The professional launch/port reviews remain necessary counterweights when asking what Obsidian actually shipped.

## Transferable patterns and limits

These are research interpretations, not implementation commitments or instructions to copy copyrighted characters, names, dialogue or visual assets.

**Make personal history usable without making people vending machines.** Atton's externally prompted conversation can lead to a new development path. The opportunity is biography that changes what a companion can do; the failure mode is treating every conversation as a hidden-stat extraction puzzle. A less opaque alternative would let a companion state what trust or preparation is missing without exposing the entire future plot. See [G110-I03](#g110-i03--knowledge-of-a-companion-becomes-a-progression-opportunity).

**Let several kinds of preparation converge on one consequence.** Khoonda connects medicine, machines and local goodwill. It offers breadth without requiring every system to simulate the whole world. The cost is authoring and verifying each contribution's payoff; merely presenting many tasks while secretly ignoring them would undermine the pattern. See [G110-I04](#g110-i04--defending-khoonda-begins-before-the-battle).

**Use party separation to validate investment, but communicate the risk.** Dxun gives non-protagonists ownership of an objective. The dependency is a crew the player has had reason and opportunity to maintain. Forced separation without adequate preparation signals can feel like a surprise build exam rather than an earned ensemble moment. See [G110-I05](#g110-i05--send-a-capable-team-where-the-protagonist-cannot-go).

**Make a relationship change the action economy in a specific, readable way.** Force Chain is more concrete than generic friendship damage. Its dependency is precise scope: who shares which effect, when, and with what exclusions. The secondary-source error shows how quickly a meaningful exception becomes misinformation without that clarity. See [G110-I06](#g110-i06--a-narrative-bond-changes-who-should-spend-an-action).

**Give specialist skills alternative routes, not universal supremacy.** The sensor puzzle and weapon upgrade example connect social or technical ability to different workloads and encounters. An alternative route preserves campaign continuity; an opportunity cost prevents one specialization from solving everything. Do not generalize the authored examples into a claim of unlimited object combinations. See [G110-I01](#g110-i01--a-voice-becomes-a-key-on-peragus) and [G110-I02](#g110-i02--rebuild-a-weapon-for-the-opponent-rather-than-the-headline-number).

**Budget for resolutions, not just introductions.** The production accounts and critical disagreements suggest examining whether every compelling setup has an implemented consequence and a comprehensible conclusion. More characters, cinematics or branches are not automatically more depth. Community preservation can be valuable while remaining an unacceptable substitute for delivering a coherent purchased campaign.

## Reading and viewing routes

**Low-spoiler orientation:** start with the [storefront](#s01), then the official [manual](#s02). PDF pages 8, 13, 16 and 17 were visually inspected: printed spreads 14–15, 24–25, 30–31 and page 32. The [Security](#s17), [Force Chain](#s19), [Soresu](#s35) and [Awareness](#s37) tooltips provide direct visual checks.

**Mechanics route, encounter spoilers:** read [Fuel Depot](#s25), [Khoonda](#s26) and [Jungle Tomb](#s27) alongside the six examples. Read the [workbench table](#s21) as a compatibility/threshold reference, not a universal optimal-build prescription. The [influence guide](#s22) is a dated early-version guide and reveals companion development.

**Narrative route, major spoilers:** compare the [Enclave](#s28) and [Trayus Core](#s29) routes with the [restoration authors' page](#s12), then compare the five reviews by their actual played version. Do not use a modded ending video as evidence for what the original finale showed.

**Production route:** read the [Urquhart](#s10) and [Avellone](#s11) interviews together. Their retrospective self-assessments provide a better account of constraints than adopting an angry review's speculation about motives.

No gameplay session, video footage, timestamped sequence or soundtrack listening session is represented as personally observed. Linked screenshots were inspected where explicitly stated. Historical review bodies and the indicated guide passages were read; unrelated pages behind their indexes were not automatically treated as read.

## Sources and evidence limits

Initial access date: **September 26, 2026**; the original postmortem, all-time/negative Steam material, Aspyr's 2015 update, GameSpot sales history and cancellation/remediation report were freshly inspected September 27, 2026. Undated GameBanshee mechanics pages are early-campaign community references unless otherwise identified; their present crawl date is not their original publication date. Primary material includes the manual, actual game-tooltip images, developers' own interview answers and the restoration authors' documentation. Reviews are firsthand criticism, not authoritative specifications. Wikipedia is used only for explicitly bounded secondary chronology and inaccessible-source leads.

<a id="s01"></a> **S01 — [Steam storefront](https://store.steampowered.com/app/208580/STAR_WARS_Knights_of_the_Old_Republic_II__The_Sith_Lords/).** Primary credits, Windows release field, positioning and distribution features; dynamic prices and aggregates are not sales history.

<a id="s02"></a> **S02 — [Official Windows manual](https://store.steampowered.com/manual/208580).** Primary text and PDF pages 8, 13, 16 and 17 inspected. Manual descriptions do not guarantee bug-free implementation across ports.

<a id="s03"></a> **S03 — [RPGFan Xbox-version retrospective](https://www.rpgfan.com/review/star-wars-knights-of-the-old-republic-ii-the-sith-lords/).** John Tucker, August 27, 2009. Full main body read; tested by the reviewer on Xbox 360, with original-hardware comparisons based on his recollection.

<a id="s04"></a> **S04 — [RPGFan Switch review](https://www.rpgfan.com/review/star-wars-knights-of-the-old-republic-ii-the-sith-lords-2/).** Audra Bowling, July 26, 2022. Full main body read; historical DLC expectations and already-patched Basilisk bug kept distinct from later developments.

<a id="s05"></a> **S05 — [Nintendo Life Switch review](https://www.nintendolife.com/reviews/switch-eshop/star-wars-knights-of-the-old-republic-ii-the-sith-lords).** Mitch Vogel, June 8, 2022. Full main body read; later cancellation notice does not change what the original review anticipated.

<a id="s06"></a> **S06 — [Steam Community reviews](https://steamcommunity.com/app/208580/reviews/).** Weekly-helpful English display and selected bodies/names/counts inspected. Mod and save-editor use disclosed by players; dates lacking a displayed year are not silently assigned one.

<a id="s07"></a> **S07 — [Switch DLC cancellation report](https://www.nintendolife.com/news/2023/06/star-wars-kotor-ii-sith-lords-dlc-cancelled-for-nintendo-switch).** Liam Doolan, June 3, 2023, updated June 5. Secondary reporting reproducing Aspyr's announcement and a modder's rebuttal; not a determination of all later causal claims.

<a id="s08"></a> **S08 — [WIRED: Star Wars Sequel Lacks Force](https://www.wired.com/2004/12/star-wars-sequel-lacks-force/).** Suneel Ratan, December 15, 2004. Full review read; criticism, not a production investigation.

<a id="s09"></a> **S09 — [GameBanshee PC review, all three pages](https://www.gamebanshee.com/reviews/29347-star-wars-knights-of-the-old-republic-ii-the-sith-lords-pc-review/all-pages.html).** Fable, August 11, 2005. Entire combined body read. Specific interface/world criticism retained; assertions about motives or intended audience are not adopted as facts.

<a id="s10"></a> **S10 — [RPG Codex interview with Feargus Urquhart](https://rpgcodex.net/article.php?id=144).** Role-Player, March 26, 2007. KOTOR II production questions and answers read; primary retrospective covering scope and the cross-platform build pipeline. Later Neverwinter Nights 2 answers are not KOTOR II evidence.

<a id="s11"></a> **S11 — [Cinelinx interview with Chris Avellone](https://www.cinelinx.com/games/culture/knights-of-the-old-republic-ii-developer-chris-avellone-discusses-the-games-impact-15-years-later/).** Jordan Maison, December 6, 2019. Main interview read; a developer retrospective, not independently measured staffing or production telemetry.

<a id="s12"></a> **S12 — [TSLRCM author documentation](https://deadlystream.com/files/file/578-tsl-restored-content-mod/).** Primary 1.8.6 project page and relevant changelog/compatibility passages read; embedded older-version wording requires care.

<a id="s13"></a> **S13 — [GameBanshee walkthrough FAQ](https://www.gamebanshee.com/starwarskotorii/locations/walkthroughfaq.php).** Core FAQ read for prestige, recipe eligibility, planet access, recruitment and randomized loot. Its broad claim of no level cap is not used as a verified rule.

<a id="s14"></a> **S14 — [GameBanshee attributes](https://www.gamebanshee.com/starwarskotorii/attributes.php).** Complete attribute descriptions read; supports role distinctions, not an exhaustive derivation of every combat formula.

<a id="s15"></a> **S15 — [Computer Use in-game tooltip](https://www.gamebanshee.com/starwarskotorii/skills/images/computeruse.jpg).** Actual game UI image visually read; Intelligence, supported terminal operations, spike costs and skill-based reduction.

<a id="s16"></a> **S16 — [Repair in-game tooltip](https://www.gamebanshee.com/starwarskotorii/skills/images/repair.jpg).** Actual game UI image visually read; parts, droid reactivation and repair-kit effects.

<a id="s17"></a> **S17 — [Security in-game tooltip](https://www.gamebanshee.com/starwarskotorii/skills/images/security.jpg).** Actual game UI image visually read; Intelligence and trained-use requirement. Not interchangeable with a first-game recollection.

<a id="s18"></a> **S18 — [Stealth in-game tooltip](https://www.gamebanshee.com/starwarskotorii/skills/images/stealth.jpg).** Actual game UI image visually read; detection contest, device context, mine actions and party behavior. Separate powers may provide different access conditions.

<a id="s19"></a> **S19 — [Force Chain in-game tooltip](https://www.gamebanshee.com/starwarskotorii/feats/images/forcechain.jpg).** Actual game UI image visually read; supports the limited beneficial-effect sharing rule and corrects S33's overbroad prose.

<a id="s20"></a> **S20 — [GameBanshee saber-upgrade guide](https://www.gamebanshee.com/starwarskotorii/saberupgradeguide.php).** Main guide and recipe entries read. Hardware/crystal distinction and selected thresholds used; its conversion/exploit advice is not generalized into an economy claim.

<a id="s21"></a> **S21 — [GameFAQs workbench creation guide](https://gamefaqs.gamespot.com/pc/920601-star-wars-knights-of-the-old-republic-ii-the-sith-lords/faqs/36339).** Greg Ash / gbash, version 1.1; document dated April 29, 2005, page updated May 1. Introductory, armor and ranged recipe sections read. A PC-era table, not a claim to have retested every recipe on every port.

<a id="s22"></a> **S22 — [GameFAQs influence guide](https://gamefaqs.gamespot.com/pc/920601-star-wars-knights-of-the-old-republic-ii-the-sith-lords/faqs/34513).** Dan Simpson, version 2.3, March 11, 2005. Introduction and relevant companion sections read. The guide identifies Xbox despite its location under a PC index. Old exploit notes are not treated as durable current mechanics.

<a id="s23"></a> **S23 — [GameBanshee Ebon Hawk](https://www.gamebanshee.com/starwarskotorii/locations/ebonhawk.php).** Ship, travel, recruitment, service and workbench passages read; services have conditions and are not unlimited production.

<a id="s24"></a> **S24 — [GameBanshee Refugee Quad](https://www.gamebanshee.com/starwarskotorii/locations/refugeequad.php).** Main walkthrough read for Atton's warning, local faction context and airspeeder project. Some NPC names in its quest prose are inconsistent; those inconsistencies are not copied into a precise dialogue script.

<a id="s25"></a> **S25 — [GameBanshee Fuel Depot](https://www.gamebanshee.com/starwarskotorii/locations/fueldepot.php).** Main walkthrough read for T3/Exile route changes and the sensor/voice-code alternatives. Spoils the opening mystery.

<a id="s26"></a> **S26 — [GameBanshee Khoonda](https://www.gamebanshee.com/starwarskotorii/locations/khoonda.php).** Preparation and resolution passages read and rechecked during final review. Used for the distinct contributions and sabotage alternatives; exact rewards or fight order are not universalized across branches.

<a id="s27"></a> **S27 — [GameBanshee Jungle Tomb](https://www.gamebanshee.com/starwarskotorii/locations/jungletomb.php).** Main walkthrough read; party split, perimeter interventions, mutually exclusive turret routes and subsequent encounter. Late-midgame spoilers.

<a id="s28"></a> **S28 — [GameBanshee Rebuilt Jedi Enclave](https://www.gamebanshee.com/starwarskotorii/locations/rebuiltjedienclave.php).** Main passage read for the endgame threshold and branch context. Its broad description of Force Enlightenment is not used to infer the exact powers combined.

<a id="s29"></a> **S29 — [GameBanshee Trayus Core](https://www.gamebanshee.com/starwarskotorii/locations/trayuscore.php).** Main passage read for the final confrontation's phases and closing questions. Estimated boss vitality and the author's hoped-for sequel are not treated as verified specifications or release news.

<a id="s30"></a> **S30 — [GameBanshee Force-powers catalog](https://www.gamebanshee.com/starwarskotorii/forcepowers.php).** Catalog inspected for families and named examples. Individual spell pages were not all read; the index alone does not establish precise duration, saving throws or class prerequisites.

<a id="s31"></a> **S31 — [Secondary chronology and source leads](https://en.wikipedia.org/wiki/Star_Wars_Knights_of_the_Old_Republic_II:_The_Sith_Lords).** Relevant release, sales-reference and later-cancellation passages inspected. The cited early-2006 IGN profile and December 9, 2025 GamesIndustry.biz report could not be retrieved directly; those leads are explicitly not upgraded to independently verified original reporting. Composer-site and designer-diary retrieval attempts also failed, so no recording-session particulars are asserted.

<a id="s32"></a> **S32 — [GameBanshee Atton](https://www.gamebanshee.com/starwarskotorii/npcs/attonrand.php).** Character entry read. Starting role/equipment and survival-oriented identity used; its loose “cannot be knocked down” phrasing is not elevated to universal immunity.

<a id="s33"></a> **S33 — [GameBanshee Kreia](https://www.gamebanshee.com/starwarskotorii/npcs/kreia.php).** Character entry read for mentor role, starting class and experience benefit. Force Chain wording is explicitly corrected by S19.

<a id="s34"></a> **S34 — [GameBanshee Entertainment Promenade](https://www.gamebanshee.com/starwarskotorii/locations/entertainmentpromenade.php).** Main walkthrough read for Pazaak, character-specific alternatives and dancing. Its exploit-style combat advice is not adopted as a universal strategy or AI specification.

<a id="s35"></a> **S35 — [Soresu in-game tooltip](https://www.gamebanshee.com/starwarskotorii/forcepowers/images/resiliencesoresulightsaberform.jpg).** Actual game UI image visually read; three situational modifiers, not a universal ranking of forms.

<a id="s36"></a> **S36 — [GameBanshee Telos Cantina](https://www.gamebanshee.com/starwarskotorii/locations/cantina.php).** Main walkthrough read for practice racing, credit rewards and the mixture of recreation with quest contacts. Controls are checked against S02, not inferred from this location guide.

<a id="s37"></a> **S37 — [Awareness in-game tooltip](https://www.gamebanshee.com/starwarskotorii/skills/images/awareness.jpg).** Actual game UI image visually read. Separate Demolitions and Treat Injury image requests failed; those brief descriptions use the accessible manual instead.

<a id="s38"></a> **S38 — [Steam English Most Helpful (All Time)](https://steamcommunity.com/app/208580/reviews/?browsefilter=toprated).** Ranked surface freshly inspected September 27, 2026. Multiple high-helpful bodies were read, including restoration/update-heavy reviews; helpful order/counts are dynamic and are not prevalence measures.

<a id="s39"></a> **S39 — [Powerglove64 Steam review](https://steamcommunity.com/profiles/76561198127817295/recommended/208580/) and [top-rated negative review surface](https://steamcommunity.com/app/208580/negativereviews/?browsefilter=toprated&l=malay).** Contrasting not-recommended bodies freshly inspected September 27, 2026. Individual compatibility failures and ratings remain player reports; the localized negative surface exposed English review bodies but is not treated as a population survey.

<a id="s40"></a> **S40 — [Classic Postmortem: Obsidian's Knights of the Old Republic II: The Sith Lords](https://www.gamedeveloper.com/design/classic-postmortem-obsidian-s-i-knights-of-the-old-republic-ii-the-sith-lords-i-).** Kevin Saunders, originally April 2005 *Game Developer Magazine*, republished December 5, 2017. Primary contemporary postmortem freshly read via the indexed full article; used for team structure, inherited technology/support, ~14-month schedule, late influence implementation, incomplete balancing and the team's own assessment of rough-draft systems.

<a id="s41"></a> **S41 — [Introducing an updated KOTOR II for Mac, Linux, and Windows](https://steamcommunity.com/app/208580/allnews/).** Aspyr, July 21, 2015. Primary update announcement freshly inspected; establishes Mac/Linux availability, achievements, cloud saves, widescreen/high-resolution and controller support, Steam Workshop, and explicit launch collaboration with the TSLRCM team.

<a id="s42"></a> **S42 — [Star Wars: The Old Republic revealed](https://www.gamespot.com/articles/star-wars-the-old-republic-revealed/1100-6199726/).** GameSpot, October 21, 2008. Historical reporting freshly retrieved; states KOTOR II had sold more than 1.275 million units in the US across Xbox and PC. Kept separate from the inaccessible early-2006 worldwide-sales source.

<a id="s43"></a> **S43 — [Star Wars KOTOR 2 Restored Content DLC Canceled On Switch](https://www.gamespot.com/articles/star-wars-kotor-2-restored-content-dlc-canceled-on-switch/1100-6514788/).** Demi Williams, GameSpot, June 5, 2023. Confirms the cancellation and Aspyr's free-Star-Wars-game remediation offer; explicitly notes that Aspyr did not give a reason, so it does not support a causal claim.

## Requirement map and preservation

| Requirement | Substantive owner in this dossier |
| --- | --- |
| R01 | Identity and access boundaries; first-session/established-play comparison |
| R02 | Player actions and major systems; skills, combat/forms, minigames and six interactions |
| R03 | Objects, equipment and crafting; resource life-cycle table |
| R04 | Progression, economy, failure and return |
| R05 | G110-I01 through G110-I06, each with conditions, result, next decision and limit |
| R06 | People, relationships, factions and AI; explicit absent multiplayer/settlement systems |
| R07 | Art, audio, interface and feel; inspected tooltip images and production staging evidence |
| R08 | Story through play; named locations, companion development and spoiler-marked conclusion |
| R09 | Original 2005 postmortem plus two developer retrospectives; staffing/schedule, influence/balance iteration and restoration-maintenance boundaries |
| R10 | Original/later distribution, 2015 desktop preservation/update, Workshop/restoration route and observable channels separated from causal hypotheses |
| R11 | Dated commercial-context table including directly retrieved 1.275M+ US snapshot, monetization structure and explicit unavailable financial data |
| R12 | Five complete written-review bodies across four outlets; all-time helpful, negative and weekly Steam samples with restoration/version boundaries |
| R13 | Six transferable patterns with dependencies, alternatives and failure modes |
| R14 | Adjacent S01–S43 references, annotated access limits, reading/viewing routes and preservation statement |

**Preservation:** this is an additive owner. The inherited `games/` and `mechanics/` inventories contained no dedicated KOTOR II chapter to replace. The original KOTOR dossier remains a separate G109 owner; sequel rules do not silently overwrite it. The partial G110 draft's five reviews, player sample, production account, PDF-inspection record and cancellation caveat remain present, with the latter explicitly extended by the later-source access boundary. Earlier chapters, packet references, examples and viewing routes are unchanged.

The scoped G101–G110 navigation/evidence check is separate from the library-wide seven-file packet reconciliation. This dossier does not certify completion of that global audit, recover unseen earlier conversation passages or authorize G111 work.
