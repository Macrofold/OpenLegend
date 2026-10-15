# Game AI implementation, personal continuity and simulation scale

**Focused research pass, October 14, 2026.** This supplement deepens the existing dossiers without rewriting their historical whole-game coverage. It owns this pass's technical source qualifications; the [main NPC guide](../synthesis/characters-companions-and-relationships.md) owns cross-game lessons. [Pass inventory](../research-progress-intelligent-simulation-2026-10-14.md) records exactly which dossiers and sections were assessed.

This is not a code audit of every game. Developer papers, accessible source interfaces, interviews, talk abstracts and the existing mechanics dossiers supply different strengths of evidence. A video description is not a watched presentation. A remembered player story is not reverse-engineered scheduling logic. Historical architecture is not automatically the current executable.

## 1. Four questions hidden inside “how intelligent is the NPC?”

A useful comparison distinguishes **mechanical competence** at a chosen activity, **selection** among represented alternatives, **interpretation** of an unfamiliar situation, and **continuity** of identity and consequences. Player-perceived intelligence is another outcome: readable attention and follow-through may matter even when the underlying controller is simple. None of those observations proves consciousness.

Priority trees, utility scoring, planning and learned policies answer different parts of the problem. Their developers generally still specify sensors, actions, world rules and some objective or selection structure. A planner can compose new sequences from authored actions; a neural policy can change associations without inventing new executable physics. “Hardcoded” is therefore too coarse to describe either the capability or the authoring burden.

The comparison below attributes implementation only where the evidence supports it. The OpenLegend applications are our hypotheses, not claims made by the source games.

<a id="rimworld"></a>
## 2. RimWorld: separate the activity from the occasion to choose it

The [existing dossier](../dossiers/rimworld.md) describes player work priorities, bodily needs, traits, moods, social events and a separate storyteller. Those systems can produce personal incidents without an unrestricted language-based mind. A colony's selection rules and an activity's physical execution are different responsibilities.

**Source-access correction:** the previously used community decompilation was unavailable through GitHub in this pass following a repository takedown. We did not reconstruct a current implementation from memory or claim a fresh audit of its think-tree, job-driver or interruption code. Those historical names should not be used as proof that every current release has identical internals.

**New dated primary evidence:** Ludeon's October 12, 2026 announcement introduces the Waylith engine and update 1.7 as an unstable beta. Its performance gains are developer-reported and setup-dependent, not an independently reproduced NPC decision benchmark. An engine rewrite's total speedup does not reveal how much came from selection, execution, rendering or another subsystem. [G1]

**Our lesson:** maintain the distinction between a chosen activity, its progress and reasons it becomes inappropriate. Borrow reliable execution and failure reporting; do not automatically import a universal priority hierarchy as the mind of an independently authored person. Keep encounter/story pacing outside personal knowledge and action authority.

<a id="songs-of-syx"></a>
## 3. Songs of Syx: individual people and aggregate society are different scales

The creator describes individual population simulation with mundane activity automated. The [existing dossier](../dossiers/songs-of-syx.md) also distinguishes the capital's people and services from larger regional management. The public modding source guide identifies separate citizen-AI, executable-job and room code areas and describes obtaining the shipped source archive. That guide is community documentation, not a current controller audit. [G2, G3]

The precise citizen scheduler, interruption predicates and internal memory layout were not established here. In particular, we do not infer a specific utility formula, flat-array architecture or per-person cadence from the population count or from an inaccessible video.

**Our lesson:** a person can remain individually situated without reconsidering every concern each update. Shared services and discoverable work can reduce centralized authoring. But a large economic population is not evidence of equivalent open-ended cognition per resident. Profile candidate discovery, travel and resource contention as well as decisions. Preserve the distinction between population aggregates and particular people's lives.

<a id="the-sims"></a>
## 4. The Sims: opportunities can describe themselves

Forbus and Wright's original-game paper explains objects advertising available interactions and expected need effects, with distance and personality affecting evaluation. Object-supplied behaviors run through a cooperative virtual-machine arrangement; that is not an operating-system thread per Sim. The relevant object/behavior diagram was inspected. This is original Sims architecture, not a claim about every later Sims game. [G4]

The [series dossier](../dossiers/the-sims.md) supplies the broader distinction between personality, needs, relationships and daily activity across versions. We do not turn a historical “smart object” into evidence that modern Sims characters understand arbitrary significance.

**Our lesson:** expose supported affordances through their owners so a character need not contain a bespoke rule for every object. Yet advertised effects should describe possibilities, not universally determine their value. A chair can offer rest while a particular person avoids it because it belongs to someone else. Data-driven selection is still authored selection; moving hundreds of conditions into editable data does not remove maintenance cost.

<a id="dwarf-fortress"></a>
## 5. Dwarf Fortress: experiences matter after the immediate response

Tarn Adams's 2018 development records describe emotions, recollection, memory formation and lasting changes in values/personality, including concerns about repeated experiences crowding out variety. This is evidence of implemented historical systems and their development, not a current formula or memory-slot audit. [G5]

The [dossier](../dossiers/dwarf-fortress.md) distinguishes local fortress activity, adventure and generated historical context. Those layers must not be collapsed into a claim that every historical person performs an equally detailed simulation at every moment.

**Our lesson:** continuity can contribute more than frequent deliberation. A relevant experience should affect a later opportunity, while repetitive observations should not become independent corroboration. Precise event retention, a person's interpretation and a lasting personal change are different records. Do not prescribe a universal emotional response or copy a fixed numerical relationship model into OpenLegend merely because it is computationally convenient.

<a id="rain-world"></a>
## 6. Rain World: small embodied concerns can create an ecosystem

The developer's Unity interview describes shared AI foundations with creature-specific behavior and modules concerning threats, prey, friends and discomfort. The developers still tune priority conflicts; a creature's apparent ingenuity need not mean it discovered a new method independently. The [dossier](../dossiers/rain-world.md) preserves the broader perception, reputation and ecological interactions. [G6]

**Our lesson:** not every organism needs verbal thought. Distinct bodies, local perception, competing concerns and interaction with other creatures can produce a world not centered on the player. A native animal controller can be appropriate under an authored world policy without justifying a hidden survival script for reflective people.

Procedural motion may make a creature's effort and attention readable. That is not the same as memory or planning competence. A useful evaluation would separately inspect whether observers can read the behavior and whether the creature actually uses relevant evidence. We did not perform that player study.

<a id="factorio"></a>
## 7. Factorio: optimizing repeated physics is not the same as simplifying the world

The [dossier](../dossiers/factorio.md) already explains composition, persistent infrastructure and versioned changes in fluid representation. Three developer technical accounts add a useful distinction:

| Account | Implementation lesson | Qualification |
| --- | --- | --- |
| FFF-84 | Different systems admit different shortcuts, including accumulated effects and shared network calculations. | The same discussion also considers changing the simulated problem. Not every suggested shortcut preserves behavior. [G7] |
| FFF-176 | Belt item spacing can be represented so that unchanged relationships need not be recalculated individually. | A large kernel speedup is not the same as a proportionate whole-world speedup. [G8] |
| FFF-317 | A coarse connectivity abstraction guides detailed pathfinding without modeling every placed entity in that abstraction. | It is a hint to finer search, not final proof that an actual body can reach its destination. [G9] |

**Our lesson:** first seek repeated work that can be removed without changing meaning. Share immutable descriptions, retain valid calculations and invalidate only affected results. Separately evaluate changes to the world model or fidelity; do not market them as identical simulation at lower cost. A fast shortlist still needs actual action admission.

Factorio's factory does not establish a rich personal mind. Its value here is architectural: a solved local process can keep working while attention moves elsewhere, with visible dependencies when it fails.

<a id="kingdom-come-deliverance-ii"></a>
## 8. Kingdom Come: Deliverance II: scale the machinery beneath ordinary lives

Petr Smrček's GDC 2026 session description discusses nearly 2,400 NPCs, roughly half in one city, AI detail levels, hiding those differences from scripts, and moving common work toward native/threaded execution. Only the official description was accessible, not the full talk or executable. It does not establish exact update frequencies, distance thresholds or a reproduced frame-rate guarantee. [G10]

The [existing dossier](../dossiers/kingdom-come-deliverance-ii.md) supplies work/rest routines, practical social access and animal assistance as gameplay context. Those examples explain what the machinery supports; they do not prove open-ended personal deliberation.

**Our lesson:** behavioral authorship can be insulated from some scheduling details. But an abstraction that hides performance tiers from scripts must not hide semantic changes from the system designer. Offscreen activity that can affect another person's supplies, promises or witnesses still needs a compatible account of what happened.

<a id="other-existing-games"></a>
## 9. Other relevant existing dossiers: mechanism, experience and limits

These are scoped reassessments of the linked dossier sections, with new primary material identified where available. They are not fresh full-game reviews. Release claims outside the topic retain their original research date rather than being promoted to an October 14 status check.

| Game / source scope | Useful evidence and transfer hypothesis | Important limit |
| --- | --- | --- |
| [Oxygen Not Included](../dossiers/oxygen-not-included.md), needs/labor and time | Travel, access, skills, morale and shared infrastructure can dominate useful work. Body and environment provide consequential constraints. | Physical complexity does not establish equally deep social cognition; no current scheduler source audit. |
| [Noita](../dossiers/noita.md), worked material/equipment interactions; Purho's GDC abstract | Small rules compose into consequences that an intelligent actor can exploit or suffer. The developer presentation concerns scaling falling-sand simulation and integrating destructible rigid bodies. | Abstract only for internals; no invented chunk size, checkerboard algorithm or concurrency claim. [G11] |
| [Kenshi](../dossiers/kenshi.md), delegation and world consequences | Continuing jobs expose access/storage dependencies; bodily harm can create rescues and lasting group history. | Conditional town changes are not proof of a physically simulated offscreen conquest. |
| [Project Zomboid](../dossiers/project-zomboid.md), bodily preparation and delayed consequences | Preparation can remain useful across activities; a won fight does not erase its injury or logistical consequences. | The dossier's human-NPC ambitions are distinct from delivered animals and human multiplayer. No new current-release audit. |
| [Cataclysm: Dark Days Ahead](../dossiers/cataclysm-dark-days-ahead.md), action time and interrupted projects; official NPC data documentation | Activity duration, known recipes, retained partial work and explicit dialogue/effect operations separate choice from consequences. | Current rolling data documentation does not prove the entire priority/selection implementation or all offscreen simulation. [G12] |
| [Caves of Qud](../dossiers/caves-of-qud.md), personal/faction knowledge and generated evidence | A discovered relationship or method matters when it changes a real option. Fixed generated evidence is different from resampling a mystery on demand. | This is a mechanics comparison, not an audit of NPC intelligence or a universal simulation of the crime. |
| [Skyrim](../dossiers/the-elder-scrolls-v-skyrim.md), action-shaped identity and daily-life framing | Familiar places and routines can make deviation and later return meaningful. | No exact current package-selection or interruption algorithm was verified in this pass. |
| [Middle-earth: Shadow of War](../dossiers/middle-earth-shadow-of-war.md), Nemesis and memory; Hoge's GDC description | Recognizable return, changed appearance, remembered encounters and distinct vulnerabilities can support personal attachment. | Authored, conditional conflict relationships are not a complete domestic life or an LLM; no patent/legal conclusion is drawn. [G13] |
| [Final Fantasy XII](../dossiers/final-fantasy-xii.md), Gambit premise and version boundaries | Explicit conditional delegation makes routine choices inspectable and revisable. | Player-authored party programming is not independent character-authored values. |
| [Red Dead Redemption 2](../dossiers/red-dead-redemption-2.md), body/camp and mission contrast | Embodied care and socially situated ordinary actions can make people legible without additional dialogue. | Authored missions can constrain conduct differently from free roam; no population-controller audit. |
| [Dragon's Dogma 2](../dossiers/dragons-dogma-2.md), Pawns, inclinations and experience | A companion's useful knowledge and action can matter beyond a biography. | Inclination policies and borrowed experience are not unrestricted learning or direct multiplayer; no new expansion/release claims. |
| [Wildermyth](../dossiers/wildermyth.md), roles, relationships and Legacy | Authored scenes can bind to continuing individuals; changes in body and capability make history operational. | Conditional casting is not autonomous interpretation. Legacy preserves selected identity, not every prior world fact. |
| [S.T.A.L.K.E.R. 2](../dossiers/stalker-2-heart-of-chornobyl.md), version/perception boundaries | A living-world promise must survive transitions between detailed encounters and broader activity. | The archived release history is not a freshly verified current A-Life algorithm or a guarantee that every promised system worked at launch. |
| [Crusader Kings III](../dossiers/crusader-kings-iii.md), traits, stress, commitments and succession | People, obligations and social connections can be the durable unit of simulation; personality need not make contrary action physically impossible. | The game's stress/opinion rules are authored abstractions, not a psychological model OpenLegend must adopt. |

The wider library contains other relevant candidates, including authored RPG companions, strategy opponents, older Ultima/Elder Scrolls games and queued social simulations. Their coverage is not silently marked complete by this focused sample. The [inventory](../research-progress-intelligent-simulation-2026-10-14.md) distinguishes assessed evidence from remaining broad-library coverage.

<a id="new-dossiers"></a>
## 10. Focused additions: complementary mechanisms, not nine versions of the same idea

| Topic-only dossier | Distinct contribution to the comparison |
| --- | --- |
| [F.E.A.R.](../dossiers/fear.md) | Dynamic composition of known means; explicit squad coordination. |
| [Left 4 Dead](../dossiers/left-4-dead.md) | Activity suspension/resumption, readable reasons, and the boundary between reliable companions and player-centered assistance. |
| [Halo 2](../dossiers/halo-2.md) | Shared behavior definitions, transient execution memory, personal knowledge and limited perception. |
| [Hitman: Absolution](../dossiers/hitman-absolution.md) | Crowd scale and learned locomotion are not equivalent to deep minds. |
| [Watch Dogs: Legion](../dossiers/watch-dogs-legion.md) | Procedural identity becomes valuable through persistent schedules and relationships. |
| [Alien: Isolation](../dossiers/alien-isolation.md) | Saved experience-dependent adaptation can be authored rather than online machine learning. |
| [Creatures (1996)](../dossiers/creatures-1996.md) | Historically learned neural selection coexists with authored sensors, body rules and executable abilities. |
| [Versu](../dossiers/versu.md) | Shared social practices offer context while individuals choose; rule tuning and shared-knowledge assumptions have costs. |
| [Shadows of Doubt](../dossiers/shadows-of-doubt.md) | Precomputed routines, exceptional replanning and witness evidence in an explicitly historical prototype. |

The first eight are unnumbered additions; Shadows of Doubt retains G159. Original Creatures is not a completion of the queued Creatures 3 or Docking Station research.

## 11. What this changes about the OpenLegend hypothesis

The strongest commonality is not “use a behavior tree” or “use a utility model.” It is a separation between selecting an activity, competently carrying it out, retaining consequences and noticing when the selection no longer suffices. Different games deliberately economize on different parts.

For OpenLegend, retain broad interpretation and choice where personal meaning matters. Reduce repeated bookkeeping, repeated preparation and repeated authorization of unchanged means. A particular person should be able to adopt a routine without being reduced to it. A capability description should help discover possible action without deciding that it outranks a promise. A memory should carry consequences without becoming compulsory dramatic narration.

The main unresolved risk is semantic attention: a cheap observer may miss the quiet detail that changes everything for this person. Neither a large behavior library nor a frequent LLM loop automatically solves that. The [academic/industrial evidence](language-model-societies-and-simile.md) and [architecture study](efficient-individual-simulation.md) examine calibration, concurrency, fidelity and complete-episode evaluation.

## Primary sources and access register

Accessed October 14, 2026. Historical dates identify the inspected implementation rather than an asserted current build. Existing dossier citations remain in their owners; the new sources below support only the specific claims above.

- **G1:** Ludeon, [Announcing the Waylith engine and update 1.7](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/), October 12, 2026. Announcement read; unstable/beta and developer performance qualifications retained.
- **G2:** Songs of Syx, [creator's game description](https://www.songsofsyx.com/). Product scope, not internal scheduling evidence.
- **G3:** [Songs of Syx community source-access guide](https://github.com/4rg0n/songs-of-syx-mod-example/blob/master/doc/howto/game_code.md). Source organization/access only; current citizen controller not audited.
- **G4:** Kenneth Forbus and Will Wright, [Programming Objects in The Sims](https://www.qrg.northwestern.edu/papers/Files/Programming_Objects_in_The_Sims.pdf), 2001. Interaction advertisements, execution and threading sections read; relevant diagram inspected.
- **G5:** Tarn Adams, [2018 development log](https://www.bay12games.com/dwarves/dev_2018.html). Memory/emotion/personality development and release notes inspected; not every later implementation version.
- **G6:** Unity / Videocult, [Exploring procedural design in Rain World](https://unity.com/blog/exploring-procedural-design-rain-world), September 2025. Developer AI and creature-behavior discussion read.
- **G7:** Wube, [Friday Facts 84 — First optimisations](https://factorio.com/blog/post/fff-84), 2015. Developer technical account.
- **G8:** Wube, [Friday Facts 176 — Belts optimization](https://factorio.com/blog/post/fff-176), 2017. Representation and measured-scope distinctions reviewed.
- **G9:** Wube, [Friday Facts 317 — New pathfinding algorithm](https://factorio.com/blog/post/fff-317), 2019. Coarse abstraction and detailed search relationship reviewed.
- **G10:** Petr Smrček, [Supporting Thousands of NPCs in Kingdom Come: Deliverance & Kingdom Come: Deliverance II](https://gdcvault.com/play/1035718/), GDC 2026. Official session description only; full talk not viewed.
- **G11:** Petri Purho, [Exploring the Tech and Design of Noita](https://www.gdcvault.com/play/1025695/Exploring-the-), GDC 2019. Official session description only.
- **G12:** Cataclysm: Dark Days Ahead, [NPC documentation](https://docs.cataclysmdda.org/JSON/NPCs.html) and [Effect on Condition](https://docs.cataclysmdda.org/JSON/EFFECT_ON_CONDITION.html). Current rolling configuration interfaces, not a full scheduler source audit.
- **G13:** Chris Hoge, [Helping Players Hate (or Love) Their Nemesis](https://gdcvault.com/play/1025150/Helping-Players-Hate-%28or-Love%29), GDC 2018. Official developer-session description only.

No gameplay, profiler run, code execution or paid model call was performed for this supplement. Source-access limitations are research findings, not measurements of the games or proof that their undocumented mechanisms do not exist.
