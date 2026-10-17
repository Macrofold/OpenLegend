# Combat, enemies and encounter design

**Status: In progress — focused combat-response synthesis incorporated October 17, 2026. Topic: COMBAT.** Four source-to-topic assessments support the selected questions below. This is not a completed survey of combat, bosses, weapons, rescue or all 176 game/case sources.

[Topic map](README.md) · [Coverage tracker](coverage.csv) · [Assessment records](assessment-records.md#combat-pass--october-17-2026) · [Selected OpenLegend design](../../../../docs/projects/combat-and-threat-responses-feature-spec.md)

## Scope and questions

This pass asks how opponents notice danger, choose what continued aggression is for, escape plausibly and remain understandable through a small interaction surface. It compares efficient coded creature behavior, explicit tactical participation limits, separate targeting displays and deliberate click defaults. It does not infer a universal enemy controller from any one game.

The useful OpenLegend result is an encounter in which physical actions have consequences, animals can escape through the terrain, and a particular person can defend themselves for intelligible personal reasons. A player should learn from what actually happens and have room to fight, avoid, reposition or stop. A full ecological simulation, every combat technique and a new set of psychological bars are not prerequisites.

## Ownership boundary

COMBAT owns confrontations, opponents, tactical purposes and counterplay. [TRAVEL](movement-and-travel.md) owns movement; [BODY](bodies-creatures-and-life-cycles.md) owns physical capabilities; [SYSTEMS](ecology-and-systemic-emergence.md) owns interacting populations; [NPC](characters-companions-and-relationships.md) owns personal interpretation; [UX](onboarding-interface-and-accessibility.md) owns general controls; [LOSS](failure-recovery-and-persistence.md) owns defeat and recovery. Link shared lessons without claiming those other guides have been assessed.

Research supports comparisons. The paired project, selected world profiles and focused tracker own accepted OpenLegend behavior and implementation. The source games do not authorize a product choice, prove our timing values or establish that our proposed behavior is fun.

## Cross-game evidence and counterexamples

Sources were inspected on October 17, 2026. Dossier revisions, actual read scope and limitations are in the [assessment records](assessment-records.md#combat-pass--october-17-2026).

| Source and evidence type                                                                                                                                                                                         | Relevant documented behavior                                                                                                                                                                                                          | Transfer and limit                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Rain World dossier](../dossiers/rain-world.md); [September 25, 2025 developer interview](https://unity.com/blog/exploring-procedural-design-rain-world)                                                         | Configurable creature modules consider prey, threats, companions, objects, dens and discomfort. The developers also describe deliberate tuning when interactions undermined intended encounters.                                      | Native choices can combine into varied encounters. This supports modest world-owned animal policies; it does not require every module, a complete food web or model-generated animal thoughts.                                           |
| [Kenshi dossier](../dossiers/kenshi.md); [February 27, 2018 experimental 0.98.0 notes](https://lofigames.com/2100-2/)                                                                                            | The historical Hold control kept fighters in position while allowing attacks within reach. The same notes describe line-of-sight restrictions intended to reduce distant unwanted pursuit and a friendly-fire-related shooting skill. | Defending, pursuing and firing safely are different decisions. These are dated feature examples, not an audit of the current Kenshi controller or a template for OpenLegend personalities.                                               |
| [Final Fantasy XIV dossier](../dossiers/final-fantasy-xiv.md); [official HUD guide](https://na.finalfantasyxiv.com/uiguide/know/know-hud/hud-name.html)                                                          | The interface distinguishes a selected target, the target's interaction partner, focus target, action progress and enmity displays. Enmity is its own combat mechanic.                                                                | Keep distinct meanings legible. We can borrow the distinction without importing threat points, tank roles or an omniscient display of an opponent's intentions.                                                                          |
| [Old School RuneScape dossier](../dossiers/old-school-runescape.md); [October 22, 2025 defaults announcement](https://secure.runescape.com/m=news/grid-master-rewards-poll--new-player-improvements?oldschool=1) | The dated update specifies always-right-click player attacks and left-click NPC attacks where available. The dossier separates simple interaction input from combat's timing and positional demands.                                  | Default actions can deliberately reflect consequence. In OpenLegend, “NPC” alone is insufficient to make attacking the default: an ordinary resident is also someone to speak with. This pass does not certify present account settings. |

## Consolidated lessons and tradeoffs

### COMBAT-L001

**Keep selection, observable threat, chosen attack and ongoing hostility distinct.** FFXIV demonstrates that several targeting-related meanings can coexist in a readable interface. OpenLegend's inference is narrower: harmless inspection should create no hostile event; a visible raised fist or aimed weapon can supply evidence; the player's own attack preference can remain convenient after one swing. None of these is a universal statement about an opponent's private motive.

A recent-hostility grace period is useful interface continuity. It does not prescribe how long fear lasts, whom a person dislikes or whether pursuit continues. Its duration belongs to the selected world design and its actual clock, not to a borrowed MMO number.

### COMBAT-L002

**Give a fleeing animal a worthwhile destination and enough local awareness to reach it.** Rain World's developer account supports composing modest native priorities. For OpenLegend's selected slice, one attacker vector is insufficient when a second human blocks the escape. Route and endpoint should account for perceived potential dangers, clearance and the animal's actual locomotion. Keep an acceptable destination stable until changed evidence makes it unsuitable; varied routes need not mean arbitrary zigzags.

This is a design inference, not a zoological model validated by the source. Territorial defense, offspring, herd cohesion, predator hunger, remembered dens, scent and learned avoidance remain distinct additions. The first safe-escape controller can be worthwhile without simulating them.

### COMBAT-L003

**Aggression needs a purpose and a stopping point.** Kenshi's historical Hold behavior illustrates a useful distinction between defending a position and chasing an opponent. A person protecting a doorway can succeed when the attacker leaves; a person recovering a stolen item may have reason to pursue. An observed change of range, lost contact or changed objective should let the character reconsider, while invisible movement supplies no fresh coordinates.

OpenLegend's independent people should choose their purpose and means using permitted context. A cheap relevance decision can narrow authored options before the person chooses among them; prewritten options need not prewrite the outcome. Current work must not hide all alternatives when danger arrives. Automatic routines remain appropriate for explicitly chosen execution and for the separately selected native animal policy.

### COMBAT-L004

**A convenient default must preserve the meaning the player saw.** OSRS's dated defaults demonstrate deliberate differentiation of attack access; its NPC/player distinction is not the right entire rule for OpenLegend. Speak can be the ordinary resident default, with a clear counterattack when that particular person is threatening the player or the player has deliberately selected an offensive intention toward them.

A hovered preview should name the actual action and target. A status change must not silently turn the same click from speaking into attacking, choose a different weapon or create an undisclosed continuing pursuit. This is our interaction requirement, not a claim that the source games implement those exact safeguards.

## Current OpenLegend baseline and existing design owners

The selected project was designed against `Macrofold/OpenLegend` main `0eb7358f251d1ab706592ccb6e9829e98c729fe9`. Its [feature specification](../../../../docs/projects/combat-and-threat-responses-feature-spec.md) records the current-versus-target distinction; its [technical design](../../../../docs/projects/combat-and-threat-responses-tech-design.md) maps owners and delivery modules. [CTR01–CTR10](../../../../docs/maintainers/combat-and-threat-responses.md) own runtime work and acceptance.

This pass selects no new universal combat model. Mike's base-world decisions allow player-versus-player attacks and consequential projectile contacts. They replace the selected world's earlier protection from human-issued player attacks and harmless unintended projectile interceptions. A contacted body cannot be protected merely because it was not the declared target; material consequences and projectile termination remain explicit world rules. This is an authored decision, not a conclusion that all researched games behave that way.

The animal target is efficient native escape. The human target is context- and personality-grounded defense, including actual retaliation in the ordinary Ada assault case, complete relevant action choices while busy, generalized private appraisal and two-stage relevance/choice. Model latency continues to consume ordinary world time; documentation neither measures that latency nor guarantees timely action merely by specifying another trigger. [Existing character design](../../../../docs/projects/compelling-characters-feature-spec.md) retains independent choice and evidence boundaries.

## Complete situations and cross-topic consequences

| Hypothetical situation                                             | Knowledge, choice and resistance                                                                                                                                                                                                              | Useful outcome and continuation                                                                                                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A wounded deer encounters a second human on its escape route.      | Its native controller uses locally perceived dangers, a reachable destination and actual body movement. It cannot read every human's private intention or move through an obstacle.                                                           | It changes route or destination and settles only after sustained clearance. The player can understand escape without reading animal thoughts. Population ecology is not required.                                |
| Ada is punched while working, then the attacker runs.              | She receives the perceived assault, her condition, current work and feasible interruption/defense choices. She independently chooses a purpose and means; the subsequent observed retreat can invalidate that plan or prompt reconsideration. | She actually fights back in the specified baseline, then can make a fresh choice about pursuit, holding ground or stopping. Her physical actions remain authoritative evidence; narration alone is insufficient. |
| A third body crosses a released shot.                              | The projectile's physical travel continues. A prior target choice, changed mind or friendly relationship does not make the intervening body intangible.                                                                                       | The selected world's contact law resolves actual harm and stopping. Choosing a safer shot before release remains meaningful; long-term relationship consequences are deferred.                                   |
| The player previews Speak just before an opponent begins a strike. | The observed threat can change the next available default, but it cannot rewrite the action already displayed for the current gesture.                                                                                                        | The player sees a clear renewed choice. A later counterattack can remain convenient through recovery without silently becoming another action or an unlimited queue.                                             |

A successful escape, protected place or stopped assault can remain successful. A different challenge can invite another session without resurrecting the same conflict automatically. Richer social aftermath can build on recorded events later; it is not needed to make this first encounter responsive.

## Open questions and missing evidence

The current project owns exact values, modes, failure behavior and acceptance. This research does not leave its selected values to an implementer to guess. Native path quality and scale, the observed two-call latency, Ada's independent behavior, player comprehension and enjoyment require actual implementation evidence. Source descriptions and scripted fixtures cannot supply that evidence.

Broader weapon balance, boss composition, tactical-group coordination, stealth/hearing extensions, morale systems, rescue/capture, PvP service fairness and long-term relationships are outside this focused pass. Candidate routes such as [Hades](../dossiers/hades.md), [Elden Ring](../dossiers/elden-ring.md), [XCOM 2](../dossiers/xcom-2.md) and [Battle Brothers](../dossiers/battle-brothers.md) remain unassessed for this guide; linking them grants no incorporation status.

Retain the wider guide's research questions for later passes:

- How do tells, positioning, timing, resources, initiative and teamwork differ across real-time and turn-based encounters, ordinary enemies and bosses? Distinguish demanding mastery from unclear hits, excessive durability, dominant tactics and punishment without a usable response.
- How do stealth, ambush, hunting, morale, coordinated opposition and NPC-to-NPC hostility create motives and counterplay beyond repeated damage exchanges?
- Where a studied world supports them, how do killing, restraint, surrender, capture, escape, intimidation and negotiated peace change costs and results? Keep melee/ranged distinctions, useful defense and clear victories visible. An opponent need not accept peace or be redeemable.
- How do raids, war and contested places connect encounter outcomes to SOCIETY, KNOW and LOSS? ACTION owns general improvisation and SPEECH owns negotiation; COMBAT owns how those attempts meet active opposition. The consequences of defeat and a satisfying stopping point remain distinct questions.

## Design subtopics

Reuse existing ND identities; these scoped mappings do not close their wider registered work. Design disposition stays in [Future work needing design](../../../../docs/maintainers/needs-design.md), and implementation stays with CTR.

### ND11 — Responsive conflict in the selected base world

Includes player participation in the selected world's combat, actual projectile contact, native animal escape and independently chosen immediate human threat responses. Richer rescue/incapacitation, additional return modes, unattended protection, population ecology and long-term relationship change remain outside this project.

### ND13 — Predictable opponent-specific quick actions

Includes the requested modifier-plus-click journey, harmless selection, per-opponent recent threat and own offensive intention, exact previews and gesture stability. General recommendation learning, key remapping and unrelated nearby-control families remain separate.

| Subtopic ID | Intended experience and scope                                                                     | Research lesson / evidence                             | Design register entry                                                                                                       | Feature specification                                                                                | Technical design                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ND11        | Responsive, consequential conflict with feasible animal escape and independent human retaliation. | COMBAT-L001–L003; explicit base-world owner decisions. | [ND11](../../../../docs/maintainers/needs-design.md#nd11--human-conflictrecovery-and-npc-ghost-continuity)                  | [Combat and threat responses](../../../../docs/projects/combat-and-threat-responses-feature-spec.md) | [Combat and threat responses](../../../../docs/projects/combat-and-threat-responses-tech-design.md) |
| ND13        | Predictable combat-sensitive quick action for the exact hovered person.                           | COMBAT-L001 and L004; requested input journey.         | [ND13](../../../../docs/maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization) | [Combat and threat responses](../../../../docs/projects/combat-and-threat-responses-feature-spec.md) | [Combat and threat responses](../../../../docs/projects/combat-and-threat-responses-tech-design.md) |
