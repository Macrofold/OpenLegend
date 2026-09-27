# G121–G130 requirements audit and repair evidence

[Library](README.md) · [Canonical progress](research-progress.md) · [Requirements](research-requirements.md) · [Roster](research-roster.md)

**Audit baseline:** `757bafba40efa875733aba635c3aec829d4c92ad`, branch `docs/game-inspiration-games-121-end`. **Requested audit:** Mike asked for a fresh requirements-and-corrections pass after the initial G121–G130 research was completed. This is research-only work; no runtime changes, merge, new branch, paid execution or gameplay testing is authorized by this record.

## Audit standard

Each subject is reread against all R01–R14 requirements **and** the explicit mechanics-inventory minimum in `research-requirements.md`. The audit checks substantive depth, current/version boundaries, five written reviews where available, Steam helpful/player evidence where applicable, worked interactions, source quality/access limits, preservation statements, and factual corrections. A previously marked Complete row is not treated as proof that every requirement was actually satisfied.

The audit proceeds one game at a time. Material corrections are committed to the dossier before the subject is marked Audited. If no substantive gap is found, the row records that result without manufacturing filler. The whole-library P01–P05 gates remain separate.

## Current audit state

**Audit complete: G121–G130.** Every game in this branch range has been reread against R01–R14 and the explicit mechanics inventory; all material gaps/corrections found in this pass have been repaired and committed. The separate whole-library P01–P05 gates remain pending.

| ID | Subject | Audit status | Audit commit / finding |
| --- | --- | --- | --- |
| G121 | Battle Brothers | **Audited** | `81fbb840f8a09c5e9deb6cb135d07633e5aeaaef` — R01–R14 and explicit mechanics inventory were already substantive. Audit replaced the latest-version dependency on a third-party GOG mirror with directly inspected June/July 2026 Steam primary announcements, explicitly pinning v1.5.2.3 as the newest published Steam patch found and preserving platform-parity limits. |
| G122 | Cataclysm: Dark Days Ahead | **Audited** | `a916e8e76b77f8808544728c797daaa0247e234c` — mechanics/reception coverage was already substantive; audit added a September 27 primary check that the official releases page still names 0.I Ito as latest stable while keeping experimental builds separate. |
| G123 | Rain World | **Audited** | `873ce900eb0739a6fc0c4e0c6bf0e0363d8c7bf2` — corrected Watcher-era Jolly scope and current patch chronology, added stealth/perception, then completed the explicit mechanics inventory with the five Downpour body identities, Gourmand crafting, and loot/faction/building/class-system boundaries. |
| G124 | Persona 5 Royal | **Audited** | `f5079ceb4d71b2243a407005985696f31135582d` — clarified Maruki Rank 9 by Nov. 17 as the mandatory third-semester gate, separated Akechi/Kasumi additional-content routes, and explicitly closed both dynamic-faction and building/settlement-management absences. |
| G125 | XCOM 2 | **Audited** | `284cd3bebd2f6bff7a7d9c69d48cdc86affe9de0` — all major mechanics were covered; corrected present-tense launcher-friction language because 2K removed the launcher from Steam/Epic in Nov. 2024, while preserving older complaints as dated reception. |
| G126 | Crusader Kings III | **Audited** | `c09d278ce86f7a00d7d1bc23ca35451ffef6eb99` — pinned By God Alone/Silk & Silver as future, added the current optional content subscription, and explicitly closed general crafting/avatar-stealth/adventuring-party absences plus the 1453/no-end-date campaign-return boundary. |
| G127 | Dragon's Dogma 2 | **Audited** | `16c8837cc5a6e5a7f4a389885050978dae19faea` — integrated the shipped Sept. 1 Title Update 3.2 into core mechanics: three Arisen save slots with Autosave/Interim/Inn Rest data, six skill slots, Dragonsplague cure/behavior changes and performance work. Added explicit stealth and dynamic-faction-system absences; Dark Arisen remains future Oct. 9 content. |
| G128 | Ultima VII: The Black Gate | **Audited** | `ec7110a1c676972bcd45cce4c40e1f1200c9fb3a` — verified Exult stable/snapshot preservation boundaries; added limited-crafting, no dedicated-stealth/base-building distinctions; added original name/gender character creation and diegetic Avatar/companion death-recovery coverage. |
| G129 | Oxygen Not Included | **Audited** | `be6d1466b5193ff94c8a964f0c96c6b70742e201` — rechecked the current DLC line through Aquatic and subsequent July maintenance updates; explicitly closed conventional combat, stealth and political-faction absences rather than relying on implication. |
| G130 | S.T.A.L.K.E.R. 2: Heart of Chornobyl | **Audited** | `a47b3d4520aa97f99fb6e3e56d5e5af2e312967c` — reconfirmed 2.0.6 as the newest gameplay patch visible Sept. 27; retained versioned A-Life evidence; explicitly closed fixed-protagonist/class-tree, crafting, party/romance, base-building and endgame/Cost of Hope return-route boundaries. |

## G130 — S.T.A.L.K.E.R. 2: Heart of Chornobyl closure evidence

The original dossier already had unusually strong versioned A-Life evidence: launch failures, Patch 1.1's explicit offline-simulation bug, 1.5 persistence, 1.7 territorial behavior and 2.0's current POI/off-screen-looting changes. The audit reconfirmed **2.0.6 (September 18)** as the newest gameplay patch visible on September 27; the September 24 official item is promotional rather than 2.0.7. It also closes the explicit mechanics inventory: Skif is fixed rather than a character-creation/class-tree build; technician upgrades are not a general crafting profession; there is no persistent recruitable party/romance or base-building system; and the dossier now explains endings plus Cost of Hope's Early/Advanced Start return routes rather than implying an unbounded postgame/NG+ loop.

## G129 — Oxygen Not Included closure evidence

The existing dossier already covered Duplicant traits/skills/morale/needs, priorities/schedules, gases/liquids/heat/germs, power/plumbing/automation, farming/ranching, research/industry, multi-world Spaced Out logistics, failure cascades, eight worked systems cases, five reviews and current player evidence. The audit reconfirmed Aquatic Planet Pack as the latest paid gameplay pack in Klei's current catalog, with later visible 2026 announcements representing maintenance updates. It also makes three useful absences explicit: ONI does not have a conventional tactical-combat campaign, avatar-scale stealth system or joinable political faction-reputation layer; its complexity is primarily physical, logistical and labor-oriented.

## G128 — Ultima VII: The Black Gate closure evidence

The original dossier already covered the signature world simulation—object manipulation, nested inventory, party equipment, schedules, conversation knowledge, spells/reagents, vehicles, hunger, economy/training, NPC social structure, eight situations and five historical/retrospective critical accounts. The audit adds the original manual's **name/gender Avatar creation** boundary and explicit death/recovery behavior for the Avatar and companions. It also closes three inventory edges: breadmaking/specific transformations are not inflated into a general crafting profession, theft/object access is not mislabeled as a dedicated stealth subsystem, and free object rearrangement is not base/settlement construction. Exult's current preservation boundary is verified as stable 1.12.1 (Windows 1.12.1-1 packaging reissue) versus separate 1.13.x snapshots.

## G127 — Dragon's Dogma 2 closure evidence

The audit found that the original dossier reduced a substantial shipped systems update to vague "performance and save/configuration" language. Title Update 3.2 is now represented in R01/R02/R04/R05/R07: three independent Arisen/Main Pawn playthrough slots, Autosave/Interim/Last Inn Rest recovery within each slot, six equipped weapon skills, revised Dragonsplague behavior and cure, Pawn/combat changes and current performance work. The audit also explicitly records that Thief is not a general stealth subsystem and Vermund/Battahl politics do not constitute a joinable dynamic faction-reputation simulation. The October 9 Dark Arisen expansion remains future and its announced systems are not counted as current.

## G126 — Crusader Kings III closure evidence

The initial dossier already covered ruler identity/skills, lifestyles, stress, schemes/hooks, dynasties, succession, titles, vassals/factions, culture/faith, warfare, travel, landless and nomadic modes, eight worked cases, multiplayer, production, commercial milestones and five reviews. The audit corrected the September 2026 roadmap boundary: By God Alone is scheduled for September 30 and therefore remains future, with Silk & Silver later still. It records the current optional released-content subscription and explicitly states that CK3 has no general material-crafting profession, avatar-scale stealth mode or controllable adventuring party; people instead occupy council/court/army/travel roles. The return loop now explicitly distinguishes the default 1453 end date from the no-end-date game rule and replay through different rulers/dynasties.

## G125 — XCOM 2 closure evidence

The dossier already covered the complete tactical/strategic inventory: classes, two-action combat, concealment, cover/destruction, equipment, research/engineering, facilities, injury/death, economy, bonds/fatigue, procedural identity, factions, retired Steam multiplayer, Workshop/mod boundaries and eight cross-layer cases. The audit corrected only current platform evidence: all-time player complaints about the 2K Launcher are now explicitly historical because 2K removed that launcher from XCOM 2 on Steam/Epic in November 2024. No review or original complaint was deleted.

## G124 — Persona 5 Royal closure evidence

The audit found one important endgame-gate ambiguity and two explicit-inventory omissions. The dossier now states that Maruki's Councillor Rank 9 by November 17 is the mandatory third-semester unlock, while Akechi/Kasumi deadlines preserve additional scenes/content rather than opening the semester themselves. It explicitly says Royal has no general dynamic faction-reputation/territory system and no building/settlement-management loop; Thieves Den is a collection/activity space rather than a base builder. Calendar, combat, Personas, infiltration-tool crafting, social stats, Confidants, Mementos, multiplayer/network absence, eight situations and five reviews remain intact.

## G123 — Rain World closure evidence

The audit first found a substantive version error: the dossier repeated the original Downpour wording that Jolly Co-Op was limited to base campaigns. Watcher 1.5 added official Jolly support to all five More Slugcats campaigns and The Watcher; the dossier now records that current boundary and the 2026 patch line through 1.11.8. A second mechanics-inventory pass then found that Downpour's actual body diversity was too compressed. The repaired dossier now covers Rivulet, Gourmand, Artificer, Spearmaster and Saint as distinct authored playstyles, includes the developers' account of **Gourmand crafting**, and explicitly distinguishes Rain World's lack of conventional classes/attribute trees, loot treadmill, political faction management, romance and base-building from its real equivalents. Original reviews, eight worked cases, Steam sampling and source limits remain.

## G122 — Cataclysm: Dark Days Ahead closure evidence

The dossier already covered the explicit inventory deeply: creation/professions/attributes, skills and proficiencies, pockets/layered armor, crafting and interrupted work, vehicles/boats/electricity, mutations/bionics, traversal, needs and disease, NPC/faction state, trade, construction, single-player/co-op-fork boundaries and late self-directed play. Eight worked situations and five written accounts plus positive/negative Steam evidence were retained.

The audit's only material change was current-version certification. The project's current September 27 Releases page independently confirms 0.I Ito is still the latest stable while experimental builds continue separately. No historical Steam-distribution criticism or evidence limit was erased.

## G121 — Battle Brothers closure evidence

The original dossier already contained the required mechanics-inventory closure: generated identities/backgrounds/traits, attributes and perks, items/equipment, taxidermy and armor attachments, supernatural-but-not-player-spellcasting boundaries, strategic/tactical traversal, contracts/ambitions/arena, combat and map avoidance, salvage/rewards, permanent death/injuries/ironman recovery, economy/payroll, company mood/reputation, enemy behavioral distinctions, crises/factions, single-player/mod boundary and late-game replay/origin loops. Eight worked situations and five independent written reviews plus Steam player evidence were retained.

The one audit correction was evidentiary/current-version quality rather than missing mechanics. The dossier now uses the directly readable Steam update stream for v1.5.2.2/v1.5.2.3 rather than treating the GOGDB mirror as the primary authority. No prior examples, reviews, limitations or source identities were removed.

## Cross-game mechanics-inventory verification

After the game-by-game repairs, the audit reran a second-pass matrix across all ten dossiers for every explicit mechanics-inventory category named by the assignment: identity/creation/classes, attributes/skills, progression/perks/tech, items/inventory/equipment, crafting/upgrading, magic/powers or useful absence, traversal, environmental/object interaction, activities, combat, stealth, looting/rewards, death/failure/recovery, economy/trading, story, relationships/romance/reputation, party/companions, NPC/AI/schedules, factions, world/environment, quests/events, building/settlement/management, multiplayer/social systems and endgame/return loops.

**Result after repair: no category is unaddressed for G121–G130.** Where a category is inapplicable, the dossier now states the useful absence instead of borrowing a superficially similar mechanic. G121 and G122 intentionally combine R10 and R11 into one substantive `R10–R11` section; both distribution/marketing and commercial/participation requirements are present, so this is a heading shape rather than missing coverage. Every other dossier has explicit R01 through R14 sections. Five-written-review minimums and Steam/player sampling (or the documented non-Steam substitute for Ultima VII) remain present.

## Verification boundary

This file records the scoped document audit and actual corrective commits. It does not claim gameplay execution, a full external-link crawler, or the global seven-file packet reconciliation. Sources described as read were actually retrieved as substantive text; inaccessible evidence remains a limitation rather than a completion claim.
