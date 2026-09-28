# Dungeons & Dragons research packet

Research date: **2026-09-27**. Branch: `codex/world-idea-repertoires`. This is additive reference research; no runtime mechanics, accepted architectural decisions, or existing game dossiers are replaced.

[Game library](../README.md) · [Dossier index](../dossiers/README.md) · [Game research requirements](../research-requirements.md) · [Worldbuilding library](../../worldbuilding/README.md).

## Read the packet

| Document | Scope and useful starting question |
|---|---|
| [Current tabletop D&D: 2024 revision / 5.5e](../dossiers/dungeons-and-dragons-2024.md) | How do the current rules combine broad intentions with checks, classes, action costs, weapons, tools, crafting, utility magic, exploration, and social interaction? Includes worked cases and reception. |
| [D&D v.3.5](../dossiers/dungeons-and-dragons-3-5.md) | What does a more explicit, granular framework reveal about competence, preparation, special materials, crafting productivity, character construction, and complexity? |
| [Adjudication as a simulation discipline](../mechanics/dungeons-and-dragons-adjudication.md) | Which jobs does a DM actually perform, what can be separated, and how could a persistent world adjudicate open-ended intentions without arbitrary outcomes? Includes 20 constructed scenarios, GM practices, failure patterns, and proposed evaluation questions. |
| [D&D worldbuilding: representative settings](../../worldbuilding/worlds/29-dungeons-and-dragons.md) | How do magic, labor, institutions, faith, history, language, pleasure, and named people's differing choices make these settings inhabitable? Current Forgotten Realms orientation, deeper Eberron creator material, and contrasting Greyhawk, Planescape, and Ravenloft lenses. |

Start with the adjudication study for the OpenLegend question. Read the edition dossiers before adopting an exact mechanic. The worldbuilding document is deliberately independent of implementation recommendations; its observations should remain useful as a study of fictional worlds.

## Why these two editions?

The current official SRD page uses **5.5e** for the revised fifth-edition rules and lists **SRD 5.2.1** as its latest English reference. The core revision spans the 2024 Player's Handbook and Dungeon Master's Guide and the 2025 Monster Manual. “2024 rules” is therefore a useful lineage label, not a claim that every relevant book was published that year. [Official version reference](https://www.dndbeyond.com/srd).

**3.5e**, the 2003 revision of third edition, is selected for contrast rather than nostalgia or a claim to be the second-most-popular edition. Its ranks, modifiers, prerequisites, action interactions, prepared spell instances, and production procedures expose tradeoffs that the newer framework compresses. Older D&D is not uniformly more complicated: other editions made different choices.

No reliable census separating continuing 2014 and revised-rule tables was established. “Latest,” “most accessible for a particular group,” “most commercially visible,” and “most played” should not be treated as interchangeable claims. Reception in the dossiers is attributed to particular reviewers and players, not presented as a population survey.

## The central interpretation

The analogy with a DM is strong, but a world creator supplies only part of the role. A tabletop DM often combines **author, referee, NPC performer, narrator, facilitator, and pacing director**. A persistent simulation needs explicit boundaries between those responsibilities.

The proposed pattern is:

**Understand intention and approach → inspect actual state and knowledge → establish permission and feasibility → apply the specific rule or a bounded fallback → choose routine success, nonfulfillment, work, or uncertainty → resolve costs and effects → narrate what the actor can perceive → preserve the consequences.**

This is original design analysis, not a claim about code that already exists. It retains flexibility at the intention and presentation layers without giving an unconstrained narrator permission to invent items, capabilities, knowledge, or success.

The worldbuilding counterpart is equally important: a spell list is not a society. The research examines who teaches a technique, who controls access, how specialists earn a living, which institutions rely on the result, and how inhabitants interpret their powers differently.

## Comparison routes

**Routine competence and retries:** compare the revised game's willingness-first social rule with 3.5's take 10/take 20 procedures, then read the adjudication study's probability examples. These solve different questions: whether agreement is possible, whether performance is uncertain, and whether repeated work has a cost.

**Equipment as a changed approach:** compare current weapon masteries, tools, crafting time, and utility spells with 3.5's material properties, armor tradeoffs, production progress, and prepared contingencies. Neither an item name nor colorful narration grants unrestricted effects.

**People rather than resistance scores:** read the GM study's distinction between belief, liking, desire, and authority, then the worldbuilding character comparisons. Shared affiliation does not imply identical values, and friendliness does not grant political power or consent to every request.

**What to automate and what to leave optional:** prioritize stable facts, resource accounting, knowledge boundaries, meaningful costs, intelligible outcomes, and consistent adjudication. Treat d20s, six abilities, classes, hit points, spell slots, initiative, and cinematic exceptions as possible game/world choices rather than universal engine requirements.

## Evidence and completion status

The four documents contain their own source registers and requirement maps. They distinguish published rules, creator commentary, reviews, constructed examples, and original proposals. They are substantial research passes, **not a claim that every acceptance gate or the complete franchise has been exhaustively audited**.

| Area | Delivered | Remaining evidence boundary |
|---|---|---|
| Current edition | Broad mechanics and interaction dossier; five written critical pieces with independence qualifications. | Full paid core-book chapters were not accessed; SRD/public rules are narrower than the commercial books. No edition-specific active-player census. |
| 3.5e | Broad contrasting mechanics dossier, direct-player discussion, five critical pieces. | The strict five-substantive-independent-review gate remains evidence-limited; the pieces vary in depth and type. Primary production-history evidence is incomplete. |
| GM study | Written techniques from Shea, Alexander, Ammann, Mulligan, and a narrowly sourced Iyengar point; playstyle/failure matrices; proposed resolution framework. | Mercer and Colville teaching series and the Exandria roundtable were located but not watched or represented as scene-level evidence. No empirical ranking of GMs. |
| Worldbuilding | Requested dimensions mapped; representative settings; named character comparisons; three explicit constructed sequences. | Current paid setting books were primarily available as contents, not full chapters. Depth is strongest in Eberron creator essays. A fresh full novel/adventure scene audit remains a gap; constructed sequences are not passed off as published scenes. |
| Project changes | Research documents and navigation only, on the requested branch. | No implementation, gameplay experiment, runtime benchmark, or acceptance test was performed. |

This packet is an **additive D&D expansion** alongside the existing numbered game roster. The existing roster's IDs and unrelated completion records are not renumbered or certified by its presence; the dossier index links both new tabletop entries explicitly. Worldbuilding entry 29 is added to that library's navigation, while its earlier comparative essays and 28-world matrix retain their original scope.

## Preservation and reuse

Baldur's Gate and Pathfinder are related comparison subjects, not substitutes for these tabletop passes. Existing titles, research chapters, and mechanics remain in place. Exact content ownership and access limitations are documented rather than silently merged across editions or settings.

The current-edition dossier includes the required SRD attribution. That license does not make all D&D lore, trademarks, commercial book text, or artwork reusable. The research uses paraphrase and original analysis rather than reproducing complete proprietary rulebooks or setting encyclopedias.
