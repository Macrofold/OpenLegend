# Hades I — builds, obligations, and productive returns

**G22 · Completed research pass · September 26, 2026.** Original Hades, not Hades II. Research inspiration, not an accepted OpenLegend specification. No gameplay, performance measurement, source-code inspection or full video viewing was performed. The coverage and evidence limits are recorded in §11.

[Original chapter and field guide](../games/hades-and-hades-ii.md) · [Preserved granular study](../mechanics/hades-builds-character-callbacks-and-return-rhythm.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md)

## 1. Scope, identity, and the player's changing purpose

Supergiant's Hades is a single-player action roguelite starring Zagreus, an authored protagonist trying to leave his father's Underworld. Epic Early Access began December 6, 2018; Steam followed December 10, 2019; 1.0 launched September 17, 2020 on PC/Mac and Switch, with PlayStation/Xbox releases August 13, 2021. The Netflix iOS edition launched March 19, 2024 and left that service in July 2025. Do not mistake that historical subscription route for current availability. PC–Switch cross-save support does not imply equivalent PlayStation/Xbox cross-saves. [S1]

The initial fantasy is immediate: become good enough to escape. The established player's agenda can be much more specific: clear with a neglected weapon, assemble a particular interaction, earn an upgrade material, advance a relationship, finish a prophecy, or accept harder conditions. These motives share the same expedition-and-return structure rather than requiring separate games. The first successful escape is not the end of the complete narrative. [S2][S3]

**Boundary:** Zagreus is not a custom-created class or an open-ended life-simulation citizen. The customization is chiefly his loadout, permanent talents, run-specific powers and relationships. There is no general player-authored spell language, survival hunger loop, freely built settlement, loot-armor wardrobe or controllable adventuring party in this scope. The six weapons and their supported modifications supply much of the mechanical identity instead. [S1][S2][S7]

**Interpretation:** the interesting promise is not simply that death is cheap. It is that a failed objective need not invalidate every other intention the player brought into the attempt. That distinction is important for OpenLegend: preserving something meaningful is different from removing consequences.

## 2. The action and encounter vocabulary

The recurring sequence is **choose a loadout → enter chambers → read enemies and rewards → fight and adapt → confront a guardian → continue or return home**. Door symbols expose prospective reward categories without revealing every encounter. This gives the player partial planning information rather than either a fully known shopping list or blind randomness. [S3][S4]

| Player operation | Prerequisite, cost, feedback and consequence |
| --- | --- |
| Attack and special | The equipped weapon determines range, timing and handling. The shield can block and rush; the spear can be thrown and recalled; the Rail adds shooting and a launched explosive. These are different spatial tools, not merely damage skins. [S5][S7] |
| Dash and dash-strike | Reposition, pass through danger and combine movement with offense. Columns, traps, walls and enemy facing create opportunities for impact or back attacks. Timing remains important; a powerful build does not automatically perform the maneuver. [S5] |
| Cast | A separate ranged power uses Bloodstones; several configurations require their recovery. A cast can also participate in weapon-specific interactions rather than remaining a generic projectile. [S3][S8][S11] |
| Call | A god-granted action spends a filled gauge. Availability is both a mechanical and an interface issue: a player can overlook a useful power when its display competes with health and combat effects. [S5] |
| Summon | A separately equipped companion gives a limited intervention. It is not a permanent party member, and eligibility is encounter-dependent. [S14] |
| Select a reward or destination | Boons, immediate survival and persistent currencies can compete. Choosing a resource for a future upgrade may leave the current attempt weaker. [S2][S3] |
| Shop or trade | Charon's expedition purchases use current-run money; the household broker exchanges persistent resources. The two economies have different horizons. [S2][S15] |
| Talk, give gifts, commission work | Household interactions progress relationships, unlock rewards and change the hub or future opportunities. Not every interaction is an immediate combat improvement. [S4][S16][S17] |
| Fish or pursue a collection goal | An unlocked side activity and the prophecy list create narrower objectives inside or between attempts. They do not turn the game into a general crafting simulation. [S17][S18] |

The route's authored identity matters despite recombination: Tartarus, Asphodel, Elysium and the Temple of Styx have different presentation and encounter rhythms. Armor changes whether enemies can be interrupted; priority targets and scarce healing make indiscriminate button-mashing unreliable. Reviews disagree about the late areas: some enjoy their escalation, while others find repeated Elysium battles or Styx's poison-heavy tunnels wearisome. [S2][S3][S4]

### Optional encounters alter the bargain

A **Trial of the Gods** offers two divine rewards but makes Zagreus first choose which god to accept. The rejected god complicates the ensuing fight; surviving it earns the other reward. This is a local challenge, not a permanent faction-allegiance lock. Some Tartarus encounters instead ask the player to survive a timed onslaught rather than clear a finite ordinary wave. Skull-marked doors warn of harder encounters, and the blue/gold reward framing distinguishes persistent resources from current-run improvements. [S33]

**Chaos** offers a different temporal exchange: entry normally costs health, and an accepted curse imposes a temporary constraint before becoming a benefit. The player must survive the period in which the purchase has made the run worse. [S31]

**Erebus** is an optional no-hit challenge, unlocked through Contractor work and restricted by sufficient Heat. A single hit replaces its enhanced reward with a token healing item. A good damage build is not necessarily a good choice for this condition; control and safety can be more valuable. The room is optional, not a mandatory punishment for poor performance elsewhere. [S32]

The recurring guardians include the Furies, the Hydra, Theseus with Asterius, and Hades. Their return also sustains character continuity rather than introducing an unrelated cast each attempt. [S31]

A practical limitation follows: random ordering does not guarantee fresh decisions. Repeatedly meeting the same tactical problem can become repetitive even when the exact damage numbers or chamber sequence change.

## 3. Weapons, aspects, boons, and build composition

### Six weapon families, with distinct examples

Chthonic Keys unlock the base arsenal; Titan Blood develops aspects. Aspects are persistent loadout options, while a Daedalus Hammer's changes belong to the current escape. The following is a functional map, not a current balance ranking or an exhaustive numerical upgrade table. [S7][S15]

| Family | Basic identity and an aspect that changes a decision |
| --- | --- |
| **Stygius / Stygian Blade** | Close-range strikes and an area special. **Poseidon** makes special attacks dislodge lodged casts, allowing a cast-recovery loop; **Arthur** introduces a different heavy style and defensive ground. The useful distinction is delivery and recovery, not the mythological name. [S8] |
| **Varatha / Eternal Spear** | Reach, a spin and a thrown/returned spear. **Achilles** substitutes a rush toward the thrown spear and rewards follow-up attacks or casts. A retrieval operation becomes movement and a preparation step. [S9] |
| **Aegis / Shield of Chaos** | Blocking, Bull Rush and a thrown shield. **Zeus** makes the special a lingering disc that can be positioned and recalled while other attacks continue. Its value depends on controlling space, not simply firing once. [S10] |
| **Coronacht / Heart-Seeking Bow** | A charged attack and a fan-like special. **Chiron** directs the special toward the last target hit by the attack; **Hera** connects a loaded cast to an arrow. Marking, delivery and recovery can therefore matter more than nominal weapon category. [S11] |
| **Malphon / Twin Fists** | Fast close-range attacks and an uppercut-style special. **Talos** pulls a target toward the player; **Demeter** rewards accumulated attacks with an enhanced special. The question becomes when and on whom to spend a prepared burst. [S12] |
| **Exagryph / Adamant Rail** | Shooting, reloading and an explosive special. **Eris** rewards catching Zagreus in his own special's blast; **Hestia** rewards deliberate reloading with a stronger next shot. The same gun can invite quite different rhythms. [S13] |

These examples make a useful distinction between an **upgrade to a number**, an **alteration of a verb**, and an **alteration of the sequence that makes a verb useful**. OpenLegend's invention ideas should be evaluated at all three levels. A description saying “legendary” does not by itself create a new decision.

### Divine powers are a finite compositional vocabulary

Boons can modify attack, special, cast, dash, Call or supporting properties. Examples include Zeus's lightning, Poseidon's knockback, Dionysus's continuing Hangover damage, Athena's deflection, Artemis's critical-hit emphasis, Ares's delayed damage/blade effects, Aphrodite's weakening effects, Demeter's chill and Hermes's movement/action-speed benefits. These families need not be interchangeable even when they improve the same button. [S3][S4][S19]

A fast repeated hit, a large single strike, a returning projectile and a persistent area do not use an added effect in identical ways. **Interpretation:** a useful component catalogue specifies how an effect is delivered and sustained, not just its magnitude. Repetition, collision, timing and target coverage can create the combination's identity.

Boon rarity and Pom improvements are distinct from acquiring a new behavioral interaction. Duo and Legendary offers have eligibility conditions; a prerequisite can make a later opportunity possible without guaranteeing that it appears. The prior granular study preserves a historical Merciful End example and its fresh-file limitations. Supergiant's patches explicitly repaired offering conditions and effect combinations, including Sea Storm and Parting Shot. Those fixes support the existence of compatibility work, not an inferred implementation architecture. [S20][S21]

Do not import a guide author's “best god” or “useless aspect” verdict into the rules inventory. Several guide pages express strong personal preferences and contain editorial inconsistencies. This dossier uses broad, corroborated behaviors and avoids their unverified optimum-build claims or copied totals.

## 4. Persistence, resources, difficulty, and the long arc

### What survives and what does not

| Resource or system | Main role and horizon |
| --- | --- |
| **Obols** | Spend during the attempt on current needs; not a general permanent bank balance. |
| **Darkness** | Develop Mirror talents; later spending can serve nonessential completion goals. |
| **Chthonic Keys** | Unlock weapons and Mirror access; can also support reassignment or exchanges. |
| **Gemstones / Diamonds** | Commission household and Underworld work, including practical improvements and decorative or narrative purchases. |
| **Nectar / Ambrosia** | Develop bonds and, at later stages, associated companion progression. |
| **Titan Blood** | Unlock or improve weapon aspects. |
| **Boons / Hammers / temporary purchases** | Shape this escape rather than permanently attaching to Zagreus. |
| **Knowledge / relationship progress / completed work** | Continue beyond the current attempt; their importance is not reducible to a combat statistic. |

This table summarizes the resource guide's categories and the independently described split between run and hub progression. It is not a currency exchange calculator. Boss rewards, prophecy completions, purchases, fishing and broker trades offer different acquisition routes; an already-earned reward is not an endlessly repeatable first-clear payout. [S2][S5][S15]

The **Mirror of Night** includes paired alternatives rather than one monotonic tree. Examples are Death Defiance's limited run-wide recovery versus Stubborn Defiance's chamber-oriented recovery; an additional dash versus a more conditional dodge-oriented benefit; and Privileged Status's multiple-status requirement versus Family Favorite's god diversity. Later choices affect reward rarity and rerolling a destination or an offered selection. Darkness investment, unlocks and the chosen configuration matter. These are examples of mutually exclusive priorities, not a recommendation that one setting is universally correct. [S22]

**Early play:** learn a readable weapon, recognize danger, unlock practical recovery and decide which persistent purchases matter. **Middle play:** explore aspects, improve boon steering and complete character favors. **Later play:** pursue further narrative resolution, more demanding clears, collection goals and optional prestige. These are interpretive phases, not fixed hour counts; a skilled player and a relationship-focused player may reach them differently. [S2][S3][S17]

The **Pact of Punishment** introduces selectable pressures and further reward goals. Tight Deadline changes time pressure; Extreme Measures changes boss encounters rather than only health. The official FAQ separately offers God Mode, whose resilience increases after deaths, and Hell Mode for additional challenge. These settings do not eliminate the need to understand their consequences, and accessibility should not be equated with a different player's achievement being illegitimate. [S1][S6][S23]

**Interpretation:** both difficulty and progression can redirect behavior. Requiring a different constraint, tool or route can teach something new. Merely increasing the number of repeat completions required risks turning a coherent aspiration into a toll.

## 5. People, relationships, story, and place

**Spoiler boundary:** this section reveals the main family arc, post-escape premise and some relationship outcomes.

Zagreus discovers that Nyx is his foster mother and seeks his biological mother, Persephone. Reaching her does not free him from the Underworld: he cannot remain on the surface indefinitely. Further successful escapes continue their conversations; the main resolution brings her home after ten escapes. Later attempts become sanctioned security tests, and the epilogue uses relationships with Olympus to arrange a family reconciliation. The same traversal can therefore mean defiance, reunion or an ongoing duty at different points in the story. [S31]

Hades supplies an authored household rather than autonomous general-purpose NPC society. Hades's authority, Nyx's support, Achilles's mentorship, Hypnos's comments, Skelly's training presence and the Olympians' differing interests help give encounters a stable identity. The prior study retains specific examples of Dionysus noticing nectar and Ares noticing weapons; not every person should notice every event. [S4][S5][S21]

Gift-giving, conversation and favors connect social investment to keepsakes and later companions. **Old Spiked Collar** offers health, **Lucky Tooth** another recovery opportunity, and **Evergreen Acorn** protection from a limited number of boss hits. Keepsakes improve with use and can be changed at permitted inter-region cabinets once the relevant facility is available; switching is not unrestricted mid-combat loadout editing. [S14][S16][S24]

Companions add different interventions: **Battie** is Megaera's attack, **Mort** invokes Thanatos, **Rib** provides Skelly as a distraction, **Shady** combines Sisyphus/Bouldy damage with supplies, **Fidi** draws on Dusa, and **Antos** on Achilles and Patroclus. The choice is made before the run; upgrades increase available uses. Some summons cannot be used against particular people or in particular situations. “Companion” therefore does not mean a follower with a general inventory, schedule or independent social life. [S14]

The Fated List and Contractor link personal matters to material work. Reuniting Orpheus and Eurydice, addressing Sisyphus's sentence, and reconnecting Achilles and Patroclus require more than selecting a friendly line once. They depend on progress and conditions across encounters; narrative advancement can be delayed by what becomes available next. Exact gift counts and complete dependency chains are deliberately left to a version-checked walkthrough. [S17]

Romance also has boundaries: Megaera and Thanatos can be pursued without forcing exclusivity, whereas Dusa's arc can culminate in a valued platonic relationship rather than a compulsory romance reward. That distinction matters more for inspiration than copying a gift ladder: another character's wishes need not be a failed player optimization. [S25]

**Interpretation:** an authored cast can feel responsive because the game selects appropriate acknowledgements and preserves recognizable interests. That is not proof that a large language model with a long memory would automatically produce the same effect. Selection, sequencing, voice and restraint remain separate design problems.

## 6. Worked situations and counterexamples

These are **constructed explanatory scenarios based on documented mechanics**, except the explicitly attributed spear example. They are not claimed playtest observations or guaranteed random offers.

### A. The spear's return is a second aiming decision

The preserved PC Gamer example is to throw the spear, move, then recall it through a different set of enemies. The intention is not simply to press an attack twice; the intervening movement changes the attack path. A player who recalls immediately gives up that spatial opportunity. This remains in the original field guide and is not replaced by the Achilles-aspect example. [S5]

**Transfer hypothesis:** reusable operations can have a meaningful interval between initiation and completion. Give the player an opportunity to change the world during that interval.

### B. A persistent projectile changes where the player wants to stand

With the Zeus shield aspect unlocked, launch the disc toward an enemy cluster, keep fighting, and reposition so that enemies remain exposed to it or encounter its return. The condition is that the disc's path and timing can actually intersect the targets; an enemy that moves away can make a theoretically strong effect accomplish little. The next choice is whether to reposition, recall or abandon that setup. [S10]

**Transfer hypothesis:** one object can create a temporary tactical place. A generic invented machine or spell should be evaluated by the situations it creates, not merely its damage output.

### C. A prepared burst can be wasted on the wrong target

Using the Demeter fists, build the condition that empowers the special. A nearly defeated weak enemy is immediately available, but a tougher foe is approaching. Spending the prepared action now may end the small threat efficiently while squandering much of its value; holding it preserves the burst but prolongs present risk. The decision depends on enemy arrangement and current safety, not only an optimal rotation. [S12]

**Transfer hypothesis:** stored readiness creates a legible resource without needing another currency icon. The game must still communicate when readiness exists and what consumes it.

### D. Friendship offers help with a cost and a limit

A player who has earned and equipped Shady reaches a difficult room low on health. Summoning supplies may be more valuable than the larger damage of another companion, but the use cannot be spent again indefinitely. Conversely, a summon can fail to solve a problem if it is ineligible in the chosen encounter. The long-term relationship has created an immediate tactical option without making the ally a permanently obedient party unit. [S14]

**Transfer hypothesis:** trust can unlock a specific kind of help, not universal ownership of another person. Availability and the helper's identity should remain visible.

### E. An apparently decorative project has a social purpose

The player wants a household subplot to move, has money earmarked for another upgrade, and discovers that a Contractor work order addresses a person's predicament. Choosing that order trades immediate combat development for a changed relationship situation. A missing conversation or prerequisite can delay the payoff; buying an unrelated decoration is not guaranteed to advance any bond. [S16][S17]

**Transfer hypothesis:** construction can express an obligation or care for someone, not just expand production capacity. The causal connection must be real rather than a generated compliment attached to any purchase.

### F. A small diversion joins the expedition to the household

After unlocking fishing, notice a fishing spot, wait for the actual bite rather than the preliminary bobs, and react. A catch can be brought to the Head Chef for resources. Missing the timing loses that opportunity. This changes attention and pace briefly, without opening a separate survival economy or making fish the main combat progression system. [S18]

**Transfer hypothesis:** a secondary activity can create texture and a reason to inspect a place. It becomes intrusive when the optimal strategy requires repeating it beyond the player's interest.

### G. More power does not cure a mismatched motivation

A story-focused player enjoys the household but tires of repeated bosses. Another upgrade can make the next run easier without making that activity more enjoyable for that player. God Mode can reduce one barrier, but it does not replace the core combat loop with another route. The negative Steam accounts and the differing written reviews are evidence of this preference conflict, not proof that either audience is playing incorrectly. [S3][S6][S27]

**Transfer hypothesis:** before increasing rewards, ask whether the intervening activity is itself the problem. A persistent game should not make every desired social outcome contingent on the same unrelated grind.

## 7. Presentation, interface, and production craft

The illustrated portraits, distinctive god-associated effects, voiced exchanges and music help players attach continuity to particular people. A callback is easier to recognize when the character's presentation remains stable. Combat animation and sound also carry practical information: which hit connected, where danger is forming, and whether an action is ready. [S3][S5][S6]

The relevant criticism is specific rather than a blanket “good graphics” verdict. PC Gamer found the Call gauge easy to miss. Xbox Tavern found some money-bearing urns hard to distinguish against detailed environments and considered audio cues especially useful in busy fights. Nintendo Life's launch Switch review reported mostly steady performance with occasional drops in hectic scenes; that historical observation is not a 2026 benchmark on every device. [S4][S5][S6]

The prior granular owner preserves the reported collaboration between Kasavin and art director Jen Zee: visual character ideas and writing informed each other. It also retains the importance of voice and sound. This is a production account, not proof that the script alone produces the resulting attachment. [S21]

**Interpretation:** visual simplicity of viewpoint is not simplicity of craft. For OpenLegend, a generated actor that remembers everything but changes silhouette, tone or values unpredictably may feel less continuous than a smaller authored cast with fewer, better-placed responses.

## 8. Development, distribution, marketing, and economics

Supergiant's FAQ describes a deliberately Early Access-compatible project, developed after Pyre, with a modular structure able to grow through feedback. Kasavin's published interview excerpts describe the central narrative idea as giving the character the continuity of knowledge that the player already retains between roguelike attempts. His account also treats difficulty barriers to story access as a design problem worth mitigating. [S1][S28]

The early-access Edge report describes an expansion from four-week to eight-week major-update intervals as allowing more coherent work. That is a historical creator account, not a controlled experiment proving an optimal release cadence. Post-launch patches document repairs to boon prerequisites, combat interactions and dialogue priorities: continued quality work included making eligible content appear in the right situation, not only adding more content. [S20][S23]

**Dated commercial evidence:** Supergiant reported more than **1,000,000 copies sold on September 20, 2020**, of which **700,000 were sold during Early Access**. The inspected contemporary article embeds the developer's statement; the original tweet itself did not load. These are reported unit sales, not Steam concurrency, unique viewers, revenue or profit. No current cumulative sales total, cost breakdown or profit estimate is established here. [S29]

The commercial model is a premium game, with soundtrack and merchandise as separately presented products. The platform timeline shows successive distribution opportunities rather than one simultaneous launch everywhere. The official page packages a concise action-and-character pitch, critic endorsements and launch/gameplay trailers. [S1][S30]

**Marketing interpretation, not attribution:** striking characters, build discoveries, repeatable run stories, developer feedback visibility and later platform launches all give people reasons to discuss or revisit the game. The evidence does not isolate how many purchases came from a trailer, streaming, awards, word of mouth or any one storefront. Nor does later low concurrency necessarily indicate failure for a purchased finite game.

## 9. Reception: five written reviews and a contrasting Steam sample

The reviews below are independent original criticism whose substantive bodies were inspected, not five score excerpts copied from an aggregator. Their versions and preferences differ.

| Review | What this reviewer valued | Friction, qualification or disagreement |
| --- | --- | --- |
| **Jordan Devore, Destructoid, September 20, 2020, PC** [S2] | Fast, readable combat, worthwhile weapon variety and short contextual conversations that make another attempt desirable. | Multiple persistent currencies can overwhelm initially; Elysium's repeated enemy work affects pace. His enjoyment is not a claim that every player wants that amount of repetition. |
| **Gaming Gideon, January 21, 2021, PC; later page update** [S3] | Few core inputs produce meaningful decisions through enemy armor, build interactions, rewards and positioning. He values the integration of relationships and repeated runs. | He wanted more enemy/boss variety for the required repetition and disliked the fourth region's poison-oriented fights. His enthusiasm does not erase those criticisms. |
| **PJ O'Reilly, Nintendo Life, September 20, 2020, Switch** [S4] | Strong action/narrative integration, flexible routing, expressive characters and a highly readable portable presentation. | Reports occasional performance drops in busy scenes. Finds the interface unusually manageable, contrasting with Devore's currency-onboarding concern. Launch-day cross-save unavailability in this review is historical, not the current feature state. |
| **Jody Macgregor, PC Gamer, September 18, 2020, PC** [S5] | Distinct weapon handling, movement, character voice and the emotional downshift of returning home. | Calls attention to a Call gauge that is easy to overlook. This narrow UI criticism should not be inflated into general dissatisfaction with combat. |
| **Jake Plant, Xbox Tavern, August 20, 2021, Xbox One** [S6] | Build experimentation, music, voice and strong moment-to-moment action; appreciates the alternative difficulty support. | Repeated environments/bosses, sometimes tedious relationship pacing and hard-to-spot urns. His 2021 Game Pass context is not evidence of present subscription availability. |

### Steam: helpful does not mean representative

The parameterized top-rated URLs failed initially. The accessible positive and negative listings explicitly rendered **“Most Helpful (Week), English”** on September 26, 2026. They were not verified all-time rankings. These small, dynamic samples select for recent visibility and helpfulness; they cannot establish prevalence, purchaser demographics or feature-level causal satisfaction. Displayed playtime is not necessarily playtime at posting. [S26][S27]

**Positive examples:** LoKi, posted September 19, described rewards after losses as reducing wasted effort and praised the presentation; alytenb, posted September 24, remained interested in further runs after reaching a main-story milestone. These accounts support the possibility that repeated attempts remain rewarding, not a universal retention claim. Non-substantive jokes were not treated as mechanics evidence. [S26]

**Negative examples:** vima297297, posted September 20, liked the colorful art but found repeated death and return monotonous. PIZZA TRAYtor, posted September 21, described build choices as constraining and combat repetition as obstructing story interest. These are attributed perceptions, not verified proof that the game has only one viable build. Unsupported accusations in other reviews were excluded rather than repeated as facts. [S27]

**Synthesis:** the disagreement is not whether progression exists. It is whether the activity between the progress beats remains pleasurable. A design can successfully reward failure and still lose someone who does not enjoy repeating the central action.

## 10. Transferable patterns for OpenLegend

These are research hypotheses, not newly accepted engine requirements.

**Separate the layers of persistence.** An unsuccessful expedition can change knowledge, relationships, obligations or the home while still costing a particular tool or opportunity. The dependency is that the surviving change must matter to a later choice. A generic “you learned something” message would not reproduce this structure.

**Make modifiers change use, not only labels.** The weapon examples suggest several reusable patterns: recall after movement, prepare an enhanced action, leave an active object in space, or combine recovery with offense. Their usefulness depends on reliable geometry, timing and feedback. Arbitrary prose inventing an effect after the fact would destroy the player's ability to plan.

**Let people notice selectively.** Distinct interests and correctly ordered acknowledgements can give a small number of comments disproportionate value. The dependency is evidence of the relevant event and a decision about whether this person would care now. Memory storage alone does not solve topic selection.

**Make a home contain unfinished intentions.** A place can hold practical improvements, relationships, decoration and promises. These need not all be mandatory chores. The risk is turning every return into a queue of low-value interactions before the player can resume what they actually enjoy.

**Preserve consent and limits in social rewards.** A character may offer specific assistance, remain unavailable, or value a friendship without becoming a romance partner. The useful pattern is meaningful agency and an intelligible relationship, not converting gifts into guaranteed compliance.

**Test motivation mismatch rather than paying through it.** Ask whether the player wants another attempt for its own decisions, for a particular person, or only to get past the gate. More generated content will not necessarily help when the obstacle is the repeated activity itself.

## 11. Preservation, coverage, and evidence limits

The original chapter and its embedded field guide were read and remain unchanged. The granular study was read and remains unchanged. Preserved material includes the spear throw/reposition/recall situation, failed escape followed by a meaningful return, boon-altered weapons, selective Dionysus/Ares callbacks, historical Merciful End challenge-run discussion, prerequisite/description fixes, dialogue-priority corrections and contrasting Quarter To Three testimony. Hades II's ending disputes and commercial figures remain in the sequel's scope; they are not relabeled as original-Hades evidence.

The [packet reading map](../references/packet-provenance.md) remains the provenance owner. This pass supplements those preserved owners; it does not claim a fresh byte-level or line-by-line audit of all seven original packets. Earlier unsuccessful wiki retrieval remains historical evidence. Most detailed Fandom/wiki.gg pages and the attempted TrueAchievements walkthroughs did not load in this pass; the accessible indexed Chambers and Encounters text is identified separately as S33 rather than implying the other pages were read.

| Requirement | Coverage in this dossier and preserved owners |
| --- | --- |
| R01 | §1: original-game identity, solo scope, edition and retired-service boundaries. |
| R02 | §2: action/interaction vocabulary, gates, costs, feedback, guardians and optional encounters. |
| R03 | §3–5: six weapon families, aspects, boons, talents, keepsakes, companions and constraints. |
| R04 | §4: temporary/permanent resources, progression phases and difficulty. |
| R05 | §6: seven concrete situations with prerequisites, consequences and limitations. |
| R06 | §5: authored NPCs, bonds, specific help, romance boundaries and no native multiplayer. |
| R07 | §7 and review evidence: presentation, voice, music, readability and historical performance limits. |
| R08 | §1 and §5: premise, post-escape family arc, side stories, places and spoiler warning. |
| R09 | §8: creator rationale, Early Access, update cadence and post-launch corrections. |
| R10 | §8: storefront/platform rollout and clearly labeled marketing inference. |
| R11 | §8: dated units sold, premium model and unknown financials. |
| R12 | §9: five substantive independent written reviews and both helpful-week Steam surfaces. |
| R13 | §10: concrete patterns, dependencies and failure modes; no implementation authority. |
| R14 | This section and source register: preserved owners, annotations and access/verification limits. |

**Viewing route:** the preserved [Hades v1.0 Gameplay Showcase](https://www.youtube.com/watch?v=YZZFlcE0fWE) is a useful launch-era route for inspecting movement, impact, reward choices and character encounters. Its identity and placement are retained from the field guide; no complete playback, transcript analysis or scene timestamps are claimed here. The official game page also links launch material. [S30]

**Review record:** the expanded dossier diff, source-reference definitions and requirement map were inspected. Relative links point to the previously read chapter, mechanics study, requirements, progress and provenance owners; those owners were not rewritten. This pass's commits modify only this dossier before the separate ledger advance. This is a documentation review, not an executed gameplay or automated test. Packet-wide reconciliation and the remaining roster remain separate gates.

## Annotated sources

All web sources were accessed September 26, 2026 unless identified as a preserved earlier owner. Ordinary guide judgments are not independent balance tests. No source's recommendation is silently promoted to a game rule.

- **S1 — Supergiant Games, Hades FAQ**, updated July 16, 2025. Primary release/mode/service history; do not infer unannounced future support. [S1]
- **S2 — Jordan Devore, Destructoid, Review: Hades**, September 20, 2020. Substantive PC launch criticism; systems, currencies and pacing. [S2]
- **S3 — Gaming Gideon, Hades Review: A Herculean Feat**, January 21, 2021, with a later page-update date. Firsthand PC criticism, including enemy variety and Styx complaints. [S3]
- **S4 — PJ O'Reilly, Nintendo Life, Hades Review**, September 20, 2020. Original Switch criticism; its performance and feature-availability statements are version-specific. Later accessibility widgets are not treated as launch-review observations. [S4]
- **S5 — Jody Macgregor, PC Gamer, Hades review**, September 18, 2020. Original play criticism, including the spear-recall example and Call-gauge issue. [S5]
- **S6 — Jake Plant, Xbox Tavern, Hades Review**, August 20, 2021. Original Xbox One review; historical subscription context and hardware only. [S6]
- **S7 — Johnny Salib, Basically Average, Weapons / Infernal Arms**, January 27, 2022. Broad arsenal guide. Its opening bounty totals conflict with its linked resource guide; those totals and personal rankings are not reproduced. [S7]
- **S8 — Basically Average, Stygian Blade guide.** Inspected Poseidon/Arthur mechanics; exact costs and superiority claims omitted. [S8]
- **S9 — Basically Average, Eternal Spear guide.** Inspected Achilles retrieval/rush and follow-up behavior; page spelling is not used to rename Varatha. [S9]
- **S10 — Basically Average, Shield of Chaos guide.** Inspected Zeus disc behavior; subjective ease-of-use judgments remain the author's. [S10]
- **S11 — Basically Average, Heart-Seeking Bow guide.** Inspected Chiron targeting and Hera loading concept. Blanket claims about incompatible or inferior casts are not adopted. [S11]
- **S12 — Basically Average, Twin Fists guide.** Inspected Talos and Demeter behaviors; inconsistent copied table labels and exact balance claims omitted. [S12]
- **S13 — Basically Average, Adamant Rail guide.** Inspected Eris and Hestia behavior; no universal optimal rotation asserted. [S13]
- **S14 — Basically Average, Companions**, November 29, 2021. Summon identities, loadout/usage limits and examples; not a complete verified encounter-exception matrix. [S14]
- **S15 — Basically Average, Artifacts**, January 27, 2022. Resource uses, acquisition routes and run-persistence distinctions; no conversion-profit model. [S15]
- **S16 — Basically Average, House Contractor**, January 27, 2022. Practical, cosmetic and story-linked work orders; exact global purchasing totals omitted. [S16]
- **S17 — Basically Average, Fated List of Minor Prophecies**, February 4, 2022. Inspected relationship/work-order and collection sections. Obvious reward-label inconsistencies mean this is not an authoritative numerical checklist. [S17]
- **S18 — Basically Average, Head Chef & Fishing**, January 27, 2022. Bite/reaction loop and turn-in purpose; exact spawn probabilities and reaction thresholds omitted. [S18]
- **S19 — Basically Average, Boons Guide.** Broad named effect families only; personal tier list and asserted universal invulnerability are not adopted. [S19]
- **S20 — Supergiant Games, Hades Updates.** Primary 2020–2021 patch notes for conditional offers, combat interactions and dialogue sequencing. [S20]
- **S21 — Preserved granular study**, researched September 25, 2026. Canonical local owner of earlier creator-reporting, Speedrun and Quarter To Three annotations; not a newly independent source. [S21]
- **S22 — Basically Average, Mirror of Night**, December 3, 2021. Paired talents and reroll distinction; no author's preferred configuration presented as universally best. [S22]
- **S23 — Edge, Hands-on with Hades**, January 23, 2020. Early-access play and creator interview, including difficulty conditions and update cadence; not a current balance guide. [S23]
- **S24 — Basically Average, Keepsakes**, November 16, 2021. Gift/use progression and selected examples; unlock facilities and ordinary versus legendary keepsakes distinguished. [S24]
- **S25 — Gabriel Aikins, WIRED, Hades Nails Its Depictions of Polyamory and Kink**, May 30, 2022. Original cultural criticism of specific relationship outcomes, not audience-demographic measurement. [S25]
- **S26 / S27 — Steam Community positive and negative review listings**, captured September 26, 2026. Displayed English helpful-week samples; parameterized all-time requests failed. Accounts, dates and opinions are attributed in §9. [S26][S27]
- **S28 — Kris Graft / Greg Kasavin, Game Developer**, January 28, 2021. Published podcast interview excerpts; full recording not listened to. [S28]
- **S29 — ActuGaming, Hades atteint le million de ventes**, September 21, 2020. Contemporary secondary report reproducing Supergiant's September 20 sales statement. Original tweet retrieval failed; no independent financial audit. [S29]
- **S30 — Supergiant Games, Hades product page.** Primary product framing and links to promotional footage/storefronts; pull quotes are not additional independently read reviews. [S30]
- **S31 — Kevin Ghouchandra, Stories in Play, Hades**, November 24, 2022. Firsthand research entry declaring its Switch version; story and Chaos sections inspected, not a verified engine-technology source. [S31]
- **S32 — GamesRadar+, Hades Erebus chambers guide**, 2020-era guide. Optional challenge, entry conditions and failure reward; no current optimum-build inference. [S32]
- **S33 — Community Hades Wiki, Chambers and Encounters.** Substantive indexed text was accessible despite other wiki retrieval failures; encounter/reward structure only, not a newly audited complete wiki. [S33]

[S1]: https://www.supergiantgames.com/blog/hades-faq/
[S2]: https://www.destructoid.com/reviews/review-hades/
[S3]: https://gideonsgaming.com/hades-review-a-herculean-feat/
[S4]: https://www.nintendolife.com/reviews/switch-eshop/hades
[S5]: https://www.pcgamer.com/hades-review/
[S6]: https://www.xboxtavern.com/hades-review/
[S7]: https://basicallyaverage.com/weapons-infernal-arms-hades-guide/
[S8]: https://basicallyaverage.com/stygius-stygian-blade-hades-guide/
[S9]: https://basicallyaverage.com/vartha-eternal-spear-hades-guide/
[S10]: https://basicallyaverage.com/aegis-shield-of-chaos-hades-guide/
[S11]: https://basicallyaverage.com/coronacht-heart-seeking-bow-hades-guide/
[S12]: https://basicallyaverage.com/malphon-twin-fists-of-malphon-hades-guide/
[S13]: https://basicallyaverage.com/exagryph-adamant-rail-hades-guide/
[S14]: https://basicallyaverage.com/companions-hades-guide/
[S15]: https://basicallyaverage.com/artifacts-hades-guide/
[S16]: https://basicallyaverage.com/house-contractor-hades-guide/
[S17]: https://basicallyaverage.com/fated-list-of-minor-prophecies-hades-guide/
[S18]: https://basicallyaverage.com/head-chef-fishing-hades-guide/
[S19]: https://basicallyaverage.com/boons-guide-hades/
[S20]: https://www.supergiantgames.com/blog/hades-updates/
[S21]: ../mechanics/hades-builds-character-callbacks-and-return-rhythm.md
[S22]: https://basicallyaverage.com/mirror-of-night-hades-guide/
[S23]: https://www.gamesradar.com/hands-on-with-hades-supergiants-devilishly-stylish-underworld-dungeon-crawler/
[S24]: https://basicallyaverage.com/keepsakes-hades-guide/
[S25]: https://www.wired.com/story/hades-inclusivity-polyamory-kink/
[S26]: https://steamcommunity.com/app/1145360/reviews/
[S27]: https://steamcommunity.com/app/1145360/negativereviews/
[S28]: https://www.gamedeveloper.com/design/roguelikes-and-narrative-design-with-i-hades-i-creative-director-greg-kasavin
[S29]: https://www.actugaming.net/hades-million-de-ventes-version-complete-359696/
[S30]: https://www.supergiantgames.com/games/hades/
[S31]: https://storiesinplay.com/2022/11/24/hades/
[S32]: https://www.gamesradar.com/hades-erebus-chambers/
[S33]: https://hades.fandom.com/wiki/Chambers_and_Encounters
