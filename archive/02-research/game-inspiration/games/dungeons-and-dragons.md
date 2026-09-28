# Dungeons & Dragons research packet

Research date: **2026-09-27**. Branch: `codex/world-idea-repertoires`. This is additive reference research; no runtime mechanics, accepted architectural decisions, or existing game dossiers are replaced.

[Game library](../README.md) · [Dossier index](../dossiers/README.md) · [Game research requirements](../research-requirements.md) · [Worldbuilding library](../../worldbuilding/README.md).

## Read the packet

| Document | Scope and useful starting question |
|---|---|
| [Current tabletop D&D: 2024 revision / 5.5e](../dossiers/dungeons-and-dragons-2024.md) | How do the current rules combine broad intentions with checks, classes, action costs, weapons, tools, crafting, utility magic, exploration, and social interaction? Includes worked cases and reception. |
| [D&D v.3.5](../dossiers/dungeons-and-dragons-3-5.md) | What does a more explicit, granular framework reveal about competence, preparation, special materials, crafting productivity, character construction, and complexity? |
| [Adjudication as a simulation discipline](../mechanics/dungeons-and-dragons-adjudication.md) | Which jobs does a DM actually perform, what can be separated, and how could a persistent world adjudicate open-ended intentions without arbitrary outcomes? Includes 20 constructed scenarios, GM practices, failure patterns, and proposed evaluation questions. |
| [Complete-SRD systems synthesis](../mechanics/dungeons-and-dragons-srd-systems.md) | What becomes possible when knowledge, professional tools, inventions, stored actions, persistent magic, bodies, creatures, recovery, and regional effects interact? Based on the complete uploaded 364-page SRD, with source rules separated from OpenLegend proposals. |
| [D&D worldbuilding: representative settings](../../worldbuilding/worlds/29-dungeons-and-dragons.md) | How do magic, labor, institutions, faith, history, language, pleasure, and named people's differing choices make these settings inhabitable? Current Forgotten Realms orientation, deeper Eberron creator material, and contrasting Greyhawk, Planescape, and Ravenloft lenses. |
| [Local laws, inherited magic, and lived institutions](../../worldbuilding/dungeons-and-dragons-planes-and-lived-magic.md) | What do the Weave, mythals, Faerzress, portals, planar traits, the Feywild, Candlekeep, and Waterdeep reveal about local differences becoming professions, memories, pleasures, ambitions, and relationships? Eight substantive indexed wiki articles plus separately labeled publisher/creator material. |

**For the newest OpenLegend ideas, start with the complete-SRD synthesis.** The adjudication study owns the general resolution argument; the edition dossiers own their original broad game/reception passes. The two worldbuilding studies remain independent analysis rather than implementation specifications.

## Why these two editions?

The current official SRD page uses **5.5e** for the revised fifth-edition rules and lists **SRD 5.2.1** as its latest English reference. The core revision spans the 2024 Player's Handbook and Dungeon Master's Guide and the 2025 Monster Manual. “2024 rules” is therefore a useful lineage label, not a claim that every relevant book was published that year. [Official version reference](https://www.dndbeyond.com/srd).

**3.5e**, the 2003 revision of third edition, is selected for contrast rather than nostalgia or a claim to be the second-most-popular edition. Its ranks, modifiers, prerequisites, action interactions, prepared spell instances, and production procedures expose tradeoffs that the newer framework compresses. Older D&D is not uniformly more complicated: other editions made different choices.

No reliable census separating continuing 2014 and revised-rule tables was established. “Latest,” “most accessible for a particular group,” “most commercially visible,” and “most played” should not be treated as interchangeable claims. Reception in the dossiers is attributed to particular reviewers and players, not presented as a population survey.

## The central interpretation

The analogy with a DM is strong, but a world creator supplies only part of the role. A tabletop DM often combines **author, referee, NPC performer, narrator, facilitator, and pacing director**. A persistent simulation needs explicit boundaries between those responsibilities.

The proposed pattern is:

**Understand intention and approach → inspect actual state and knowledge → establish permission and feasibility → apply the specific rule or a bounded fallback → choose routine success, nonfulfillment, work, or uncertainty → resolve costs and effects → narrate what the actor can perceive → preserve the consequences.**

This is original design analysis, not a claim about code that already exists. It retains flexibility at the intention and presentation layers without giving an unconstrained narrator permission to invent items, capabilities, knowledge, or success.

The complete reading adds a more concrete conclusion: **a small number of dependable effects can support a large repertoire of player-created situations**. Objects can embody capabilities; knowledge can change feasible approaches; creatures can change terrain; magical construction can become infrastructure; a victory can leave a persistent dependency to resolve. Preserving those interactions is more valuable than reproducing every named spell or monster.

The worldbuilding counterpart is equally important: a spell list is not a society. The research examines who teaches a technique, who controls access, how specialists earn a living, which institutions rely on the result, and how inhabitants interpret their powers differently.

## New adaptation candidates from rules plus lore

These are **original proposals**, not D&D rules, accepted OpenLegend requirements, or implementation status. The linked studies supply the source evidence and limitations; the combinations below are ours.

| Candidate | What the player could actually do | Why it may be useful; what must remain explicit |
|---|---|---|
| Knowledge that earns access | Survey an unfamiliar route, write up a discovery, contribute it to an archive, and obtain advice or recognition. | Connects exploration, books, expertise, and institutions. Novelty, reliability, authorship, and access are separate judgments; not every invented claim is true. |
| Small inventions that other people use | Turn a learned effect into a lantern, signal, alarm, performance device, or stored emergency response. | Connects creative expression to equipment and trade. Effects, triggers, power, ownership, and lifetime need supported rules rather than arbitrary generated code. |
| Regional enchantments with a history | Discover what an inherited local effect does, repair it, negotiate a change, or create a new public benefit. | Connects magic to settlement, craft, memory, and conflict. A mythal is a lore reference, not an already-supported recipe or a universal engine feature. |
| Environments with coupled benefits and costs | Study a region that supports a local resource while interfering with a method of travel or observation. | Inspired by Faerzress; gives guides, residents, inventors, and visitors different practical interests. The resource and interference must actually be authored, not inferred from atmosphere alone. |
| Routes as discoveries and investments | Learn a portal's conditions, map its destination, recover lost instructions, or build a lasting connection. | Travel changes geography and opportunity. Destination knowledge, payload, direction, operating time, and return conditions matter; fictional passage is not platform authorization. |
| Creatures that create situations beyond combat | Follow a fresh tunnel, free a trapped ally, repair corroded equipment, or resolve the object sustaining a recurring threat. | Gives observation, craft, negotiation, and rescue useful roles alongside combat. The creature's specific traits, not its name or narrative convenience, produce the consequences. |
| A changed version of a familiar place | Revisit a settlement through another layer with different senses, access, or environmental behavior. | Makes planar exploration legible without requiring an enormous new map. The selected local laws and continuity need to be discoverable; not every Feywild-era trait is imported at once. |
| Lasting places worth enjoying | Establish a workshop, host a multilingual fair, cultivate a garden, or build a distinctive inn. | Gives mastery, beauty, company, profit, hospitality, and ambition concrete projects. Pleasure does not need to conceal a disaster to count as meaningful play. |

## Comparison routes

**Routine competence and retries:** compare the revised game's willingness-first social rule with 3.5's take 10/take 20 procedures, then read the adjudication study's probability examples. These solve different questions: whether agreement is possible, whether performance is uncertain, and whether repeated work has a cost.

**Equipment as a changed approach:** compare current weapon masteries, tools, crafting time, and utility spells with 3.5's material properties, armor tradeoffs, production progress, and prepared contingencies. The new synthesis adds knowledge-bearing objects, embodied effects, delegated power, and operation of unfamiliar machines. Neither an item name nor colorful narration grants unrestricted effects.

**People rather than resistance scores:** read the GM study's distinction between belief, liking, desire, and authority, then the worldbuilding character comparisons. Shared affiliation does not imply identical values, and friendliness does not grant political power or consent to every request. The new synthesis distinguishes independent allies, employment, magical compulsion, newly created people, and sentient objects rather than treating all companions as owned tools.

**What survives an encounter:** follow creature-made tunnels, summoned or animated bodies, lingering curses, restorative dependencies, information copied into books, and permanent construction. An encounter ending, an effect ending, a threat ending, and a region changing are different events.

**What to automate and what to leave optional:** prioritize stable facts, resource accounting, knowledge boundaries, meaningful costs, intelligible outcomes, and consistent adjudication. Treat d20s, six abilities, classes, hit points, spell slots, initiative, fixed cosmologies, and cinematic exceptions as possible game/world choices rather than universal engine requirements.

## Evidence and completion status

The six studies contain their own sources and scope qualifications. They distinguish published rules, creator commentary, community synthesis, reviews, constructed examples, and original proposals. Source-reading coverage, research acceptance gates, and implemented behavior are different claims.

| Area | Delivered | Remaining evidence boundary |
|---|---|---|
| Current edition, initial dossier | Broad mechanics and interaction dossier; five written critical pieces with independence qualifications. | Full paid core-book chapters were not accessed. No edition-specific active-player census. Its initial selected-SRD-reading note is superseded by the complete reading below, not by an invented paid-book audit. |
| Complete uploaded SRD | All 364 pages read, including the spell, magic-item, monster, and animal catalogues. [Coverage ledger and file hash](../mechanics/dungeons-and-dragons-srd-systems.md#16-source-coverage-limitations-and-corrections-to-the-earlier-pass); detailed source-page references and selective synthesis. | Not an exhaustive numerical audit, every-table visual check, playtest of every combination, or reading of the complete commercial books. Internal source inconsistencies remain explicit rather than silently corrected. |
| 3.5e | Broad contrasting mechanics dossier, direct-player discussion, five critical pieces. | The strict five-substantive-independent-review gate remains evidence-limited; the pieces vary in depth and type. Primary production-history evidence is incomplete. This follow-up does not recertify it. |
| GM study | Written techniques from Shea, Alexander, Ammann, Mulligan, and a narrowly sourced Iyengar point; playstyle/failure matrices; proposed resolution framework. | Mercer and Colville teaching series and the Exandria roundtable were located but not watched or represented as scene-level evidence. No empirical ranking of GMs. |
| Representative worlds | The maintained [world dossier](../../worldbuilding/worlds/29-dungeons-and-dragons.md) owns its current character, setting, worked-case, and production coverage. | Depth and source access vary by setting; its current evidence notes supersede earlier summary claims here. No complete fresh franchise rereading is claimed. |
| Wiki and supplementary lore pass | Substantial indexed bodies for eight Forgotten Realms Wiki articles; separate public planes appendix and publisher/creator readings. [Exact source/access register](../../worldbuilding/dungeons-and-dragons-planes-and-lived-magic.md#14-annotated-sources-and-exact-access-boundary). | The two supplied landing pages could not be retrieved directly. Neither whole wiki was read. Indexed content is not a current revision-history audit; cited books and videos were not automatically inspected. |
| Project changes | Research documents and navigation on the requested branch. | No implementation, gameplay experiment, runtime benchmark, or acceptance test was performed. Proposals have not been validated by play. |

The two tabletop subjects remain an additive D&D expansion alongside the existing numbered game roster. Existing IDs and unrelated completion records are not renumbered or certified by this packet. Worldbuilding entry 29 and its broader comparison are maintained by the [worldbuilding library](../../worldbuilding/README.md); the new lore essay supplements that work without replacing other contributors' revisions.

## Preservation and reuse

Baldur's Gate and Pathfinder are related comparison subjects, not substitutes for these tabletop passes. Existing titles, research chapters, and mechanics remain in place. Exact content ownership and access limitations are documented rather than silently merged across editions or settings.

The current-edition dossier and new SRD synthesis include the required SRD attribution. That license does not make all D&D lore, trademarks, commercial book text, wiki prose, or artwork reusable. The research uses paraphrase and original analysis rather than reproducing complete proprietary rulebooks or setting encyclopedias.
