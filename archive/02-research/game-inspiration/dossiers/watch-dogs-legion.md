# Watch Dogs: Legion — procedural people that remain connected to the world

**Coverage: procedural identity, schedules, social simulation and AI architecture only. Reviewed October 14, 2026.** This is not a full-game dossier or a current source-code audit.

[Topic synthesis](../synthesis/characters-companions-and-relationships.md) · [Crowd comparison](hitman-absolution.md)

## What is documented

Ubisoft's developer interview describes Census as a procedural character-generation layer paired with a simulation layer. Profiles are intended to be internally consistent and appropriate to a person's role; the system supplies relationships and schedules, while simulation makes characters persistent. The article gives the example of a character leaving work for the gym according to that schedule. It does not disclose an exact cost per character or establish that every possible London resident is fully simulated simultaneously. [WD1]

The studio's GDC announcement separately identifies mission technology that connects procedural characters to authored missions and describes Census as the backbone of Play As Anyone. That is evidence of integration scope, not an independently reproduced performance result. [WD2]

## The useful architectural question

Generating an interesting person once is different from preserving that person through later interactions. For OpenLegend, a generated profile should not be the only place where identity appears. Possessions, relationships, observations and accepted intentions need to refer to the same continuing character.

Conversely, procedural consistency is not cognition. A plausible schedule can provide context and opportunities without proving that the person chose its priorities. A rule-generated social connection can create a starting condition; it does not establish what either participant currently feels or remembers.

## Hypothetical complete situation

A player repeatedly visits a particular worker. Their usual workplace and ordinary activity make them findable. One day, the worker chooses to help an injured friend instead. Their absence matters because there was continuity to depart from; it should be discoverable through permitted observation or communication, not a global explanation automatically given to the player.

The useful remembered consequences are concrete: an unfinished task, a missed appointment, help actually given and each witness's partial account. A later generated conversation may interpret those events. It must not create a retroactive act of assistance solely to make the absence sound plausible.

Returning to the ordinary routine can be a meaningful choice rather than a failure to generate novelty. A stable relationship or satisfying job need not be disrupted just because a narrative generator seeks more incidents.

## Transfer hypotheses and limits

**Generate initial consistency; preserve subsequent causality.** A generated backstory can establish authored starting conditions. Once play begins, actual actions and observations should determine subsequent history. Do not regenerate a person's relationships or past merely because another subsystem needs a convenient mission participant.

**Make routines revisable context.** A routine can cheaply guide ordinary activity where the character has adopted it. Availability, personality or occupation alone should not automatically authorize a compulsory life schedule. A change of plan can express identity rather than constitute an AI defect.

**Coordinate population and encounter systems without omniscience.** Shared identity references and actual availability can help select relevant participants. That does not grant a mission system permission to dictate their private motives or expose those motives to another character.

**Do not count potential generated profiles as concurrently active minds.** The practical scaling question is how many identities are retained, how many activities are advancing, how often choices are reconsidered and how much information each update touches.

A simpler authored cast may deliver stronger continuity than a much larger generated population. Procedural variety is useful only where the resulting distinctions affect choices, relationships or what a participant can discover. The cited material does not quantify that tradeoff for OpenLegend.

## Sources and remaining boundary

**WD1.** Ubisoft, developer interview with Jurie Horneman and Christopher Dragert, *Watch Dogs: Legion — The Tools That Built London*, 2021. [Article](https://news.ubisoft.com/en-ca/article/4po3S9Pwp1YcgBmGPmQxAh/watch-dogs-legion-the-tools-that-built-london).

**WD2.** Ubisoft Toronto, *Top Ubisoft Toronto programmers presenting at the 2021 Game Developers Conference*, 2021. [Studio announcement](https://toronto.ubisoft.com/ubisoft-toronto-programmers-2021-game-developers-conference/).

Only the accessible primary descriptions were assessed. Exact offscreen update rules, current implementation performance, player reception, full mission mechanics and modding were not established by this topic-only pass. No new engine policy or implementation project is approved.
