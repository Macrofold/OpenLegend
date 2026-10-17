# Source-to-topic assessment evidence

[Topic map](README.md) · [Game coverage](coverage.csv) · [World coverage](world-coverage.csv) · [Record requirements](progress.md) · [Structural source/goal review](source-and-goal-map.md).

The October 14, 2026 intelligence/simulation pass contributes 30 scoped NPC assessments below. The October 17 combat-response pass adds four scoped COMBAT assessments. Other source/topic cells remain unassessed, awaiting sources or historical coverage as recorded in their matrices. Earlier essays are not discarded or automatically credited. Reading sources for the framework's structural review remains distinct from substantive incorporation.

## Record structure for authorized work

Preserve game record identities as `<TOPIC>--<game_key>`. Use `<TOPIC>--world--<world_key>` for a fictional-world record so similarly named game and world sources remain distinct. Keep dated revision notes beneath the stable heading. These are formats, not allocated examples.

| Field | Required content |
| --- | --- |
| Identity | Source kind, stable game/world key and topic code; unambiguous roster label, edition or fictional continuity where applicable. |
| Assessment | Date and reviewer; actual inspected scope, not merely a located file or summary. |
| Source evidence | Dossier/chapter/supplement paths, exact commit/blob revisions, sections or ranges, underlying links and access limits; supporting essays may be cited alongside the actual source. |
| Evidence type | Distinguish documented rules, player testimony, literary interpretation, developer intent, product goals, runtime observations and economic estimates. Identify shared underlying sources rather than count summaries as independent corroboration. |
| Contribution | Concrete interaction or relevant fictional case, supporting and contrary material, possible explanation, confidence and applicability; a world scene alone does not prove a playable activity enjoyable. |
| Destination | Owning guide and stable lesson/section anchors; explain how the source supports, qualifies or contradicts the comparison rather than merely appearing in a bibliography. |
| Exclusion or blocker | Specific rationale for N, or exact missing evidence and next action for B/W/S. |
| Review and publication | Source-to-destination and diff checks actually performed; incorporation commit when known, without inventing a future/self hash. |

Do not duplicate current status here: the relevant game/world matrix owns it. Quoted passages without a contribution to the topic's comparisons do not qualify as I. Candidate reading routes and current-design lookup links are not assessment records.

A supporting essay may supply a clearly attributed interpretation, but reading it does not mark every underlying game or world incorporated. Preserve source-kind limits, disputed continuity, versions, incomplete access and contrary evidence. A product requirement can explain OpenLegend's intent without establishing that another game's approach succeeded.

## Assessments

### Shared provenance for the October 14, 2026 NPC pass

Reviewer: ChatGPT, conducting Mike's authorized research pass. Existing dossier sections below were read at `Macrofold/OpenLegend` commit `0c12398e32e7c9578e18de07bbe79d39b4827208`. The nine new focused dossiers and the [game implementation supplement](../references/game-ai-implementation-and-scale.md) are present at `6161e14a71099cdccecf7467f5270fdbfa5e1bf7`. That supplement supplies the underlying primary links and access scopes; it is not independent corroboration of those same sources. The main [NPC guide](characters-companions-and-relationships.md) incorporated the lessons at `a7968b228121356bcf1b1c1f43ca975b4ee86af9`.

The ranges below describe the portions actually returned and inspected, not a claim to have read every line of a long dossier. Where a long response was truncated, the narrower visible topic is stated instead of crediting the entire requested range. The [pass inventory](../research-progress-intelligent-simulation-2026-10-14.md) distinguishes new topic-only files, existing-dossier reassessments and unreviewed wider coverage.

Review performed: manually checked each contribution against its inspected evidence and the named destination; retained contrary cases, original versions and source-access limits. No gameplay, source-code execution, player study, paid inference or performance benchmark was performed. Strong confidence in a documented mechanism does not establish its quality or cost in OpenLegend. All applications in the main guide are research hypotheses, not accepted implementation.

### NPC--rimworld

G21. Read the opening dossier mechanics concerning work, needs, social incidents and storyteller separation. New primary evidence is the October 12 Waylith/1.7 unstable announcement; the community decompilation was unavailable, so no current controller audit is claimed. [Evidence](../references/game-ai-implementation-and-scale.md#rimworld). Supports [NPC-L002](characters-companions-and-relationships.md#npc-l002) on activity continuity and [L010](characters-companions-and-relationships.md#npc-l010) on workload units. Developer speedups qualify rather than prove decision performance; exact current interruption code remains unknown.

### NPC--songs-of-syx

G149. Read dossier lines 1–115, creator population description and community source-organization guide. No current citizen-controller implementation was inspected. [Evidence](../references/game-ai-implementation-and-scale.md#songs-of-syx). Supports [NPC-L010](characters-companions-and-relationships.md#npc-l010) and [L011](characters-companions-and-relationships.md#npc-l011): individual economic activity is not equivalent to continuous deep deliberation. Useful population contrast; insufficient evidence for a precise scheduler, utility formula or memory layout.

### NPC--the-sims

G24, series dossier with original-game implementation evidence. Read visible opening autonomy/needs/personality sections; Forbus and Wright's 2001 object-advertisement and execution discussion, including its diagram. [Evidence](../references/game-ai-implementation-and-scale.md#the-sims). Supports [NPC-L001](characters-companions-and-relationships.md#npc-l001) and [L003](characters-companions-and-relationships.md#npc-l003): discoverable affordances reduce centralized authoring without assigning universal values. Strong original-architecture evidence; not a source audit of every sequel.

### NPC--dwarf-fortress

G23. Read visible opening dossier mechanics and Tarn Adams's 2018 memory/emotion/personality development records. [Evidence](../references/game-ai-implementation-and-scale.md#dwarf-fortress). Supports [NPC-L006](characters-companions-and-relationships.md#npc-l006) and [L007](characters-companions-and-relationships.md#npc-l007): later consequences and recollection can supply continuity. Repetition and interpretation need care; historical notes do not establish a current numerical memory algorithm or all historical people being simulated at equal detail.

### NPC--rain-world

G123. Read dossier lines 1–105 and the developer's creature/AI discussion in the Unity interview. [Evidence](../references/game-ai-implementation-and-scale.md#rain-world). Supports [NPC-L009](characters-companions-and-relationships.md#npc-l009) and [L011](characters-companions-and-relationships.md#npc-l011): embodied local concerns and shared foundations can support distinctive creatures. Author-tuned priorities remain authored; visible ingenuity is not evidence of unrestricted learning or a measured player-perception effect.

### NPC--factorio

G27. Read dossier lines 1–85 and developer FFF-84, FFF-176 and FFF-317 technical accounts. [Evidence](../references/game-ai-implementation-and-scale.md#factorio). Supports [NPC-L003](characters-companions-and-relationships.md#npc-l003), [L010](characters-companions-and-relationships.md#npc-l010) and [L011](characters-companions-and-relationships.md#npc-l011): reuse unchanged structure and distinguish local speedups from altered rules. This is simulation architecture evidence, not evidence that factory entities possess rich personal cognition.

### NPC--kingdom-come-deliverance-ii

G114. Read dossier lines 80–155 and the GDC 2026 scaling session description. The full talk was not viewed. [Evidence](../references/game-ai-implementation-and-scale.md#kingdom-come-deliverance-ii). Supports [NPC-L011](characters-companions-and-relationships.md#npc-l011) and [L012](characters-companions-and-relationships.md#npc-l012): authorship can be separated from execution detail. Nearly 2,400 NPCs is the developer's reported scope, not a reproduced throughput result or verified update cadence.

### NPC--oxygen-not-included

G129. Read dossier lines 65–130 on labor, bodily constraints and environmental dependencies. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L010](characters-companions-and-relationships.md#npc-l010) and [L015](characters-companions-and-relationships.md#npc-l015): useful work includes travel and infrastructure, and bodily pressure need not be a universal person's policy. Mechanics interpretation only; no new scheduler audit or claim of deep social understanding.

### NPC--noita

G32. Read dossier lines 100–165 and Purho's official GDC 2019 session description, not the full presentation. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L003](characters-companions-and-relationships.md#npc-l003) and [L011](characters-companions-and-relationships.md#npc-l011): composed physical effects create exploitable opportunities. The abstract does not establish an exact chunk size, dirty-region algorithm or threading implementation.

### NPC--kenshi

G36. Read dossier lines 35–120 on delegation, injuries and conditional world consequences. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L002](characters-companions-and-relationships.md#npc-l002) and [L007](characters-companions-and-relationships.md#npc-l007): continuing work and consequential rescue can produce group history. Conditional town changes are not evidence of fully simulated unseen conquest; no new technical source audit.

### NPC--project-zomboid

G37. Read dossier lines 1–100 on preparation, bodies, elapsed time and persistent consequences. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L002](characters-companions-and-relationships.md#npc-l002) and [L006](characters-companions-and-relationships.md#npc-l006): an encounter's injury and logistical effects survive its immediate end. Archived human-NPC ambitions are not credited as shipped cognition or a freshly verified release status.

### NPC--cataclysm-dark-days-ahead

G122. Read dossier lines 1–100 and official NPC/effect-on-condition documentation. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L002](characters-companions-and-relationships.md#npc-l002) and [L003](characters-companions-and-relationships.md#npc-l003): known methods, retained partial work and explicit effects distinguish choice from execution. Configuration interfaces do not establish the complete selection or offscreen simulation implementation.

### NPC--caves-of-qud

G33. Read dossier lines 85–165 on procedural evidence, knowledge and relationships. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L003](characters-companions-and-relationships.md#npc-l003) and [L006](characters-companions-and-relationships.md#npc-l006): knowledge should change actual options, and generated evidence should remain stable. This mechanics comparison is not a proof that every described historical incident was physically simulated.

### NPC--the-elder-scrolls-v-skyrim

G71. Read dossier lines 1–90 on role, recurring places and daily-life framing. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L007](characters-companions-and-relationships.md#npc-l007): ordinary continuity makes deviation and return meaningful. No exact package scheduler, interruption priority or current source implementation was verified; familiar routine is not automatically self-authored intention.

### NPC--middle-earth-shadow-of-war

G116. Read dossier lines 1–120 and Hoge's GDC Nemesis session description, not the full talk. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L007](characters-companions-and-relationships.md#npc-l007) and [L015](characters-companions-and-relationships.md#npc-l015): recognizable return and retained encounters can support attachment. Conditional adversarial relationships are not a general domestic life, and continuing significance need not require endless conflict. No legal/patent conclusion is drawn.

### NPC--final-fantasy-xii

G89. Read dossier lines 1–110, including the Gambit premise and version boundaries. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L001](characters-companions-and-relationships.md#npc-l001) and [L002](characters-companions-and-relationships.md#npc-l002): explicit delegation can be understandable and revisable. Player-authored party programming is a useful counterexample, not evidence of independent character-authored values.

### NPC--red-dead-redemption-2

G70. Read dossier lines 1–100 on embodiment, camp life and authored mission contrast. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L009](characters-companions-and-relationships.md#npc-l009): ordinary action and care can make an individual legible. No population-controller source audit or quantified player-intelligence effect; free-roam opportunities and mission restrictions remain distinct.

### NPC--dragons-dogma-2

G127. Read dossier lines 1–85 on Pawns, inclinations and experience. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L007](characters-companions-and-relationships.md#npc-l007) and [L008](characters-companions-and-relationships.md#npc-l008): useful knowledge can matter beyond a biography. Inclination policies and borrowed experience are not unrestricted learning or direct multiplayer; no new release/expansion claim.

### NPC--wildermyth

G25. Read dossier lines 45–105 on role casting, relationships, transformations and Legacy. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L007](characters-companions-and-relationships.md#npc-l007) and [L015](characters-companions-and-relationships.md#npc-l015): body/capability changes make identity operational and meaningful return need not be repetitive conflict. Authored conditional scenes are not autonomous interpretation; Legacy preserves selected continuity rather than every prior fact.

### NPC--stalker-2-heart-of-chornobyl

G130. Read dossier lines 1–60 and 70–130, retaining release/perception boundaries. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L010](characters-companions-and-relationships.md#npc-l010) and [L012](characters-companions-and-relationships.md#npc-l012): a living-world promise must survive changes of detail. This is not a newly verified current A-Life algorithm or evidence that every advertised capability worked at launch.

### NPC--crusader-kings-iii

G126. Read dossier lines 1–100 on traits, stress, obligations and succession. [Comparison](../references/game-ai-implementation-and-scale.md#other-existing-games). Supports [NPC-L001](characters-companions-and-relationships.md#npc-l001) and [L008](characters-companions-and-relationships.md#npc-l008): people and commitments can be durable simulation units; acting against disposition can remain possible. Stress/opinion mechanics are authored abstractions, not a psychological model imposed on OpenLegend.

### NPC--fear

Unnumbered, original F.E.A.R.; topic-only dossier read/written in this pass. [Dossier and Orkin source](../dossiers/fear.md). Planning, working memory and squad sections were inspected, including diagrams. Supports [NPC-L002](characters-companions-and-relationships.md#npc-l002) and [L003](characters-companions-and-relationships.md#npc-l003): dynamically compose known means without authoring every transition. Squad coordination includes explicit authored direction; not all behavior is emergent or personally reflective.

### NPC--left-4-dead

Unnumbered, original game; topic-only. [Dossier and Valve source](../dossiers/left-4-dead.md). Action transitions, companion constraints and Director sections/selected slides inspected. Supports [NPC-L002](characters-companions-and-relationships.md#npc-l002), [L009](characters-companions-and-relationships.md#npc-l009) and [L015](characters-companions-and-relationships.md#npc-l015): readable continuation is distinct from deliberately player-serving assistance. No wholesale import of teleporting helpers, compulsory cooperation or encounter pacing.

### NPC--halo-2

Unnumbered; topic-only. [Dossier and Isla source](../dossiers/halo-2.md). Behavior selection, impulses, tagging and memory sections inspected. Supports [NPC-L006](characters-companions-and-relationships.md#npc-l006) and [L011](characters-companions-and-relationships.md#npc-l011): separate shared behavior definitions, temporary execution and personal knowledge. Historical memory figures are not modern NPC throughput; limited perception is a causal boundary, not a claim of full human understanding.

### NPC--hitman-absolution

Unnumbered; topic-only. [Dossier and two GDC sources](../dossiers/hitman-absolution.md). Official 2012 crowd and 2013 learned-locomotion descriptions only; full videos not viewed. Supports [NPC-L010](characters-companions-and-relationships.md#npc-l010), [L012](characters-companions-and-relationships.md#npc-l012) and [L014](characters-companions-and-relationships.md#npc-l014): crowd scale and learned movement are not equivalent to deep minds. Exact scheduling and individual memory persistence remain unverified.

### NPC--watch-dogs-legion

Unnumbered; topic-only. [Dossier and Ubisoft sources](../dossiers/watch-dogs-legion.md). Developer Census/generation/simulation and conference descriptions inspected. Supports [NPC-L007](characters-companions-and-relationships.md#npc-l007) and [L008](characters-companions-and-relationships.md#npc-l008): profiles become valuable through continuing schedules and social connections. Potential generated profiles are not concurrently active minds, and plausible routines do not establish independent deliberation.

### NPC--alien-isolation

Unnumbered; topic-only. [Dossier and 2024 developer interview](../dossiers/alien-isolation.md). Learning, persistence and multi-Alien production discussion inspected. Supports [NPC-L006](characters-companions-and-relationships.md#npc-l006) and [L014](characters-companions-and-relationships.md#npc-l014): saved authored adaptation is distinct from online machine learning. Experience can change behavior without inventing a new method; difficulty-driven unlocks must not be mistaken for personal observations.

### NPC--creatures-1996

Unnumbered, original Creatures, not G164/G165 sequels; topic-only. [Dossier and 1997 author manuscript](../dossiers/creatures-1996.md). Architecture, perception, neural control, biochemistry and limitations inspected. Supports [NPC-L001](characters-companions-and-relationships.md#npc-l001) and [L014](characters-companions-and-relationships.md#npc-l014): learned selection coexists with authored sensors and executable abilities. Historical active population is small; no universal reward model or sequel implementation is inferred.

### NPC--versu

Unnumbered; topic-only. [Dossier and creator papers](../dossiers/versu.md). Architecture, social practices, selection, limits and conversation implementation inspected; selected PDF pages visually checked. Supports [NPC-L006](characters-companions-and-relationships.md#npc-l006) and [L008](characters-companions-and-relationships.md#npc-l008): shared context can offer actions without deciding individual consent. Shared practice knowledge and extensive desire tuning are explicit limitations, not solved divergent beliefs or rule-free authoring.

### NPC--shadows-of-doubt

G159, previously queued; topic-only, not a completed whole-game pass. [Dossier and complete 2018 prototype devblog](../dossiers/shadows-of-doubt.md). Supports [NPC-L002](characters-companions-and-relationships.md#npc-l002), [L006](characters-companions-and-relationships.md#npc-l006) and [L012](characters-companions-and-relationships.md#npc-l012): batched routines, exceptional replanning and witness evidence connect efficiency to discoverable history. The later shipped controller was not verified; lying was future work in the inspected prototype.

## COMBAT pass — October 17, 2026

Reviewer: ChatGPT, conducting Mike's authorized combat-design and repertoire review. The four existing dossiers below were inspected at `Macrofold/OpenLegend` commit `0eb7358f251d1ab706592ccb6e9829e98c729fe9`; each blob and actual scope is recorded separately. Named official webpages were retrieved on October 17, 2026. Dossier summaries and their underlying reports are one evidence chain, not independent confirmation.

This is a scoped four-source comparison of creature escape, tactical pursuit, targeting displays and attack defaults. It is not a whole-game re-review or complete COMBAT survey. The [COMBAT guide](combat-and-encounters.md) remains In progress. Matrix status is maintained only in [coverage.csv](coverage.csv). No gameplay, proprietary controller inspection, live character decision, latency benchmark or player study was performed.

### COMBAT--rain-world

**Identity and scope:** G123, Rain World, developer-described creature systems in the September 25, 2025 interview. [Dossier](../dossiers/rain-world.md), blob `bf30fd9c24638b0ee2dee7dda479a61bbd45cc8e`: combat/evasion and stealth/perception subsections, worked cases 1–8, and the creature-AI portion of R06. The separate full-version, population, DLC and commercial claims were not requalified.

**Evidence and contribution:** The [Unity developer interview](https://unity.com/blog/exploring-procedural-design-rain-world) describes configurable creature relationship/priority modules and deliberate intervention when emergent outcomes undermined intended behavior. This supports [COMBAT-L002](combat-and-encounters.md#combat-l002): modest native policies can produce varied encounters without model cognition. The broad food web is a contrasting larger system, not a prerequisite for OpenLegend escape.

**Limits and review:** Native modular behavior does not prove our destination scoring, species speeds, bounded cost or player enjoyment. Dossier tales about creature interactions are context, not new measurements. The contribution was checked against the inspected developer account and the guide's bounded inference; no claim of every animal acting realistically is made.

### COMBAT--kenshi

**Identity and scope:** G36, Kenshi. [Dossier](../dossiers/kenshi.md), blob `9cb529e1f2d0574398a9dc42aa1e52063af59233`: individual capability/group control, people/factions and animals, and worked case H about escape amid other groups. The [official February 27, 2018 experimental 0.98.0 notes](https://lofigames.com/2100-2/) were read specifically for Hold, sight-limited participation and the friendly-fire shooting-skill entry.

**Evidence and contribution:** The historical notes distinguish fighting within reach from pursuing away from a post. They support [COMBAT-L003](combat-and-encounters.md#combat-l003) and the comparison of physical firing risk with tactical intention. The dossier qualifies optimistic third-party rescue as uncertain, reinforcing that nearby other actors are not guaranteed safety.

**Limits and review:** The guide explicitly labels the patch experimental and historical. The dossier's later behavior-control vocabulary is not treated as a current implementation of every old label; no present AI algorithm, retaliation timer or universal projectile rule was inferred. The scoped contribution and that qualification were checked together.

### COMBAT--final-fantasy-xiv

**Identity and scope:** G91, Final Fantasy XIV. [Dossier](../dossiers/final-fantasy-xiv.md), blob `b55c902686a71ad63ce90ceabb4dff72fe0ef656`: everyday action vocabulary, roles/combat structure and presentation/interface. The [official HUD guide](https://na.finalfantasyxiv.com/uiguide/know/know-hud/hud-name.html) was read for target, target's interaction partner, focus, action progress and enmity displays.

**Evidence and contribution:** These are distinct documented interface meanings, supporting [COMBAT-L001](combat-and-encounters.md#combat-l001). The guide's enmity explanation is retained as the source game's mechanic, while OpenLegend's per-opponent evidence and own offensive intention are explicitly our proposed composition.

**Limits and review:** No FFXIV hidden AI, current numerical formula, complete encounter or proprietary source code was audited. Borrowing separable presentation does not justify exposing private NPC intentions or installing an enmity score. The destination was checked for this distinction and its source link.

### COMBAT--old-school-runescape

**Identity and scope:** G49, Old School RuneScape. [Dossier](../dossiers/old-school-runescape.md), blob `b9c0b8fc11781e90f3ec6f943cb7342c77604464`: §§3–5 (interaction, inventory and combat) and §15 (interface). The [October 22, 2025 official defaults announcement](https://secure.runescape.com/m=news/grid-master-rewards-poll--new-player-improvements?oldschool=1) was read for its player-attack and NPC-attack defaults.

**Evidence and contribution:** Deliberately different default interaction access supports [COMBAT-L004](combat-and-encounters.md#combat-l004). The source is a counterexample to copying the entire category rule: OpenLegend's independently acting resident is also a normal conversation partner, so being an NPC is not sufficient grounds for a default attack.

**Limits and review:** The dated announcement does not prove a present account's settings, universal auto-retaliation behavior or a particular grace period. Broader OSRS combat details were context and were not independently rechecked as new current facts. The guide preserves the release date and bounds the inference to input design.
